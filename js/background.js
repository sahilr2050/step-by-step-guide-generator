import StorageManager from './storage-manager.js';

let isRecording = false;
let currentGuideId = null;
let stepCount = 0;

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log(`Received message: ${request.action}`);
  console.log(`Recording step for guide ID: ${currentGuideId}`);

  if (request.action === "startRecording") {
    isRecording = true;
    currentGuideId = request.guideId;
    stepCount = 0;
    console.log(`Started recording for guide ID: ${currentGuideId}`);

    // Notify all tabs that recording has started
    chrome.tabs.query({}, function (tabs) {
      tabs.forEach((tab) => {
        if (tab.status === 'complete' && tab.url.startsWith('http')) {
          chrome.tabs.sendMessage(tab.id, {
            action: "recordingStarted",
            guideId: currentGuideId,
          }, function(response) {
            if (chrome.runtime.lastError) {
              console.log(`Error sending message to tab ${tab.id}: ${chrome.runtime.lastError.message}`, 'error');
            } else {
              console.log(`Message sent to tab ${tab.id}: ${response}`);
            }
          });
        }
      });
    });

    sendResponse({ success: true });
    return true;
  }

  if (request.action === "stopRecording") {
    isRecording = false;
    console.log('Stopped recording.');

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
      console.log(`Recorded step ${stepCount} for guide ID: ${currentGuideId}`);
  
      // Get the current guide data
      chrome.storage.local.get([currentGuideId], function (data) {
        if (data[currentGuideId]) {
          const guideData = data[currentGuideId];
          
          // Create a unique key for this screenshot
          const screenshotKey = `${currentGuideId}_${guideData.steps.length}`;
          
          // Create a copy of step data without the large screenshot
          const stepDataWithoutScreenshot = { ...request.stepData };
          const screenshot = stepDataWithoutScreenshot.screenshot;
          stepDataWithoutScreenshot.screenshot = null;
          
          // Store reference to screenshot in IndexedDB
          stepDataWithoutScreenshot.screenshotKey = screenshotKey;
          
          // Add the step data to the guide
          guideData.steps.push(stepDataWithoutScreenshot);
  
          // Save updated guide data to chrome.storage
          chrome.storage.local.set(
            {
              [currentGuideId]: guideData,
              stepCount: stepCount,
            },
            function () {
              if (chrome.runtime.lastError) {
                console.log(`Error saving step data: ${JSON.stringify(chrome.runtime.lastError)}`, 'error');
                return;
              }
              
              // Save the screenshot to IndexedDB
              if (screenshot) {
                StorageManager.saveScreenshot(screenshotKey, screenshot)
                  .then(() => {
                    console.log(`Screenshot saved to IndexedDB with key: ${screenshotKey}`);
                  })
                  .catch(error => {
                    console.error(`Failed to save screenshot to IndexedDB: ${error}`);
                  });
              }
              
              console.log(`Step data saved. Total steps: ${stepCount}`);
              
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

  if (request.action === "openPopupToResume") {
    chrome.storage.local.set({
      resumeGuideId: request.guideId
    }, function() {
      // Open the popup
      chrome.action.openPopup();
    });
    
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === "getScreenshot") {
    StorageManager.getScreenshot(request.key)
      .then(screenshot => sendResponse({screenshot}))
      .catch(error => sendResponse({error: error.message}));
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
