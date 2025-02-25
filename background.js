// Background script
let isRecording = false;
let currentGuideId = null;
let stepCount = 0;

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "startRecording") {
    isRecording = true;
    currentGuideId = request.guideId;
    stepCount = 0;

    // Notify all tabs that recording has started
    chrome.tabs.query({}, function (tabs) {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, {
          action: "recordingStarted",
          guideId: currentGuideId,
        });
      });
    });

    sendResponse({ success: true });
    return true;
  }

  if (request.action === "stopRecording") {
    isRecording = false;

    // Notify all tabs that recording has stopped
    chrome.tabs.query({}, function (tabs) {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, {
          action: "recordingStopped",
        });
      });
    });

    sendResponse({ success: true });
    return true;
  }

  if (request.action === "recordStep") {
    if (isRecording && currentGuideId) {
      stepCount++;

      // Get the current guide data
      chrome.storage.local.get([currentGuideId], function (data) {
        if (data[currentGuideId]) {
          const guideData = data[currentGuideId];
          guideData.steps.push(request.stepData);

          // Save updated guide data
          chrome.storage.local.set(
            {
              [currentGuideId]: guideData,
              stepCount: stepCount,
            },
            function () {
              // Notify popup of step count update
              chrome.runtime.sendMessage({
                action: "updateStepCount",
                count: stepCount,
              });
            }
          );
        }
      });
    }

    sendResponse({ success: true });
    return true;
  }

  if (request.action === "captureVisibleTab") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, function (dataUrl) {
      sendResponse({ screenshot: dataUrl });
    });
    return true;
  }
});

// Listen for tab changes to inject content script into new pages during recording
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (isRecording && changeInfo.status === "complete") {
    chrome.tabs.sendMessage(tabId, {
      action: "recordingStarted",
      guideId: currentGuideId,
    });
  }
});
