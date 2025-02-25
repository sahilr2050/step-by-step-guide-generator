// Content script
let isRecording = false;
let currentGuideId = null;
let highlightElement = null;

// Logger utility
function log(message, level = 'info') {
  console[level](`[Content] ${message}`);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'recordingStarted') {
    isRecording = true;
    currentGuideId = request.guideId;
    addClickListeners();
    sendResponse({ success: true });
  }

  if (request.action === 'recordingStopped') {
    isRecording = false;
    removeClickListeners();
    sendResponse({ success: true });
  }

  return true;
});

// Check if we're already recording
chrome.storage.local.get(['isRecording', 'currentGuideId'], function (data) {
  if (data.isRecording) {
    isRecording = true;
    currentGuideId = data.currentGuideId;
    addClickListeners();
  }
});

function addClickListeners() {
  document.addEventListener('click', handleClick, true);
}

function removeClickListeners() {
  document.removeEventListener('click', handleClick, true);
  if (highlightElement) {
    document.body.removeChild(highlightElement);
    highlightElement = null;
  }
}

// Add a processing flag and debounce mechanism
let isProcessingClick = false;
let lastClickTime = 0;
const CLICK_DEBOUNCE_TIME = 1000; // 1 second debounce

function handleClick(event) {
  if (!isRecording || isProcessingClick) return;

  // Implement debounce to prevent multiple rapid captures
  const now = Date.now();
  if (now - lastClickTime < CLICK_DEBOUNCE_TIME) {
    return;
  }
  lastClickTime = now;

  // Set processing flag to prevent multiple captures
  isProcessingClick = true;

  // Prevent default action to capture the click
  event.preventDefault();
  event.stopPropagation();

  const element = event.target;

  // Create highlight effect
  highlightElement = createHighlight(element);
  document.body.appendChild(highlightElement);

  // Get element information
  const elementInfo = getElementInfo(element);

  // Delay to allow the highlight to be visible in the screenshot
  setTimeout(() => {
    // Take screenshot
    chrome.runtime.sendMessage({ action: 'captureVisibleTab' }, function (response) {
      const screenshot = response?.screenshot || null;

      // Record step
      const stepData = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        title: document.title,
        elementInfo: elementInfo,
        screenshot: screenshot
      };

      // Send step data to background script
      chrome.runtime.sendMessage({
        action: 'recordStep',
        stepData: stepData
      });

      // Remove highlight after a short delay
      setTimeout(() => {
        if (highlightElement) {
          document.body.removeChild(highlightElement);
          highlightElement = null;
        }

        // Reset processing flag before executing the click
        isProcessingClick = false;

        // Now execute the original click
        simulateClick(element);
      }, 200);
    });
  }, 300);
}

function getElementInfo(element) {
  // Get text content
  let text = element.textContent?.trim() || '';

  // Get element attributes
  const attributes = {};
  Array.from(element.attributes).forEach(attr => {
    attributes[attr.name] = attr.value;
  });

  // Get element path
  const path = getElementPath(element);

  return {
    tagName: element.tagName.toLowerCase(),
    text: text,
    attributes: attributes,
    path: path
  };
}

function getElementPath(element) {
  let path = [];
  while (element && element.nodeType === Node.ELEMENT_NODE) {
    let selector = element.nodeName.toLowerCase();
    if (element.id) {
      selector += `#${element.id}`;
    } else {
      let siblings = element.parentNode ? Array.from(element.parentNode.children) : [];
      if (siblings.length > 1) {
        const index = siblings.indexOf(element) + 1;
        selector += `:nth-child(${index})`;
      }
    }
    path.unshift(selector);
    element = element.parentNode;
  }
  return path.join(' > ');
}

function createHighlight(element) {
  const rect = element.getBoundingClientRect();
  const highlight = document.createElement('div');

  highlight.className = 'step-highlight';
  highlight.style.position = 'fixed';
  highlight.style.left = `${rect.left}px`;
  highlight.style.top = `${rect.top}px`;
  highlight.style.width = `${rect.width}px`;
  highlight.style.height = `${rect.height}px`;
  highlight.style.border = '3px solid red';
  highlight.style.borderRadius = '3px';
  highlight.style.boxShadow = '0 0 0 2000px rgba(0, 0, 0, 0.3)';
  highlight.style.zIndex = '9999999';
  highlight.style.pointerEvents = 'none';

  return highlight;
}

function simulateClick(element) {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  element.dispatchEvent(event);
}