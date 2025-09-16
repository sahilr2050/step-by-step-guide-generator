// Logger utility
function log(message, level = 'info') {
  console[level](`[Popup] ${message}`);
}

document.addEventListener('DOMContentLoaded', function () {
  const startPanel = document.getElementById('start-panel');
  const recordingPanel = document.getElementById('recording-panel');
  const resultPanel = document.getElementById('result-panel');
  const guideNameInput = document.getElementById('guide-name');
  const guideTagsInput = document.getElementById('guide-tags');
  const startRecordingBtn = document.getElementById('start-recording');
  const stopRecordingBtn = document.getElementById('stop-recording');
  const stepCounter = document.getElementById('step-counter');
  const finalStepCount = document.getElementById('final-step-count');
  const viewGuideBtn = document.getElementById('view-guide');
  const newRecordingBtn = document.getElementById('new-recording');
  const viewCreatedGuidesBtn = document.getElementById('view-created-guides');

  let currentGuideId = null;

  // Check if we're already recording
  chrome.storage.local.get(['isRecording', 'resumeGuideId', 'currentGuideId', 'stepCount'], function (data) {
    if (chrome.runtime.lastError) {
      log(`Error retrieving storage data: ${chrome.runtime.lastError}`, 'error');
      return;
    }

    // Handle resume guide separately from ongoing recording
    if (data.resumeGuideId) {
      // Get the guide info
      chrome.storage.local.get([data.resumeGuideId], function (guideData) {
        const guide = guideData[data.resumeGuideId];

        if (guide) {
          // Fill in the guide name
          guideNameInput.value = guide.name;

          // Mark guide as being resumed
          currentGuideId = data.resumeGuideId;

          // Update UI to show we're resuming
          startRecordingBtn.textContent = 'Resume Recording';

          // Clear the resumeGuideId flag so it doesn't persist
          chrome.storage.local.remove('resumeGuideId');
        }
      });
    }

    if (data.isRecording) {
      startPanel.classList.add('hidden');
      recordingPanel.classList.remove('hidden');
      stepCounter.textContent = data.stepCount || 0;
      currentGuideId = data.currentGuideId;
      log('Resumed recording session.');

      // Display guide tags if available
      chrome.storage.local.get([currentGuideId], function (guideData) {
        const guide = guideData[currentGuideId];
        if (guide && guide.tags) {
          guideTagsDisplay.textContent = `Tags: ${guide.tags.join(', ')}`;
          guideTagsDisplay.classList.remove('hidden');
        }
      });
    }

  });

  // Start recording
  startRecordingBtn.addEventListener('click', function () {
    const guideName = guideNameInput.value.trim();
    const guideTags = guideTagsInput.value.trim();

    if (!guideName) {
      alert('Please enter a guide name');
      return;
    }

    let isResuming = false;

    // If currentGuideId is already set, we're resuming
    if (!currentGuideId) {
      currentGuideId = Date.now().toString();
    } else {
      isResuming = true;
    }

    // Set up storage for new guide or get existing data
    if (!isResuming) {
      // This is a new guide
      const guideData = {
        id: currentGuideId,
        name: guideName,
        tags: guideTags.split(',').map(t => t.trim()).filter(Boolean),
        steps: [],
        dateCreated: new Date().toISOString()
      };

      chrome.storage.local.set({
        isRecording: true,
        currentGuideId: currentGuideId,
        stepCount: 0,
        [currentGuideId]: guideData
      }, startRecordingProcess);
    } else {
      // This is resuming an existing guide - get current step count
      chrome.storage.local.get([currentGuideId], function (data) {
        const existingGuide = data[currentGuideId];
        const currentStepCount = existingGuide.steps ? existingGuide.steps.length : 0;

        // Just update the recording state
        chrome.storage.local.set({
          isRecording: true,
          currentGuideId: currentGuideId,
          stepCount: currentStepCount
        }, startRecordingProcess);
      });
    }

    function startRecordingProcess() {
      startPanel.classList.add('hidden');
      recordingPanel.classList.remove('hidden');

      // Get the current step count to display
      chrome.storage.local.get(['stepCount'], function (data) {
        stepCounter.textContent = data.stepCount || 0;
      });

      // Send message to background script to start recording
      chrome.runtime.sendMessage({
        action: 'startRecording',
        guideId: currentGuideId
      });
    }
  });

  // Stop recording
  stopRecordingBtn.addEventListener('click', function () {
    chrome.runtime.sendMessage({
      action: 'stopRecording',
      guideId: currentGuideId
    }, function (response) {
      chrome.storage.local.set({
        isRecording: false
      }, function () {
        recordingPanel.classList.add('hidden');
        resultPanel.classList.remove('hidden');

        chrome.storage.local.get(['stepCount'], function (data) {
          finalStepCount.textContent = data.stepCount || 0;
        });
      });
    });
  });

  // View Guide button
  viewGuideBtn.addEventListener('click', function () {
    chrome.tabs.create({
      url: `guide.html?id=${currentGuideId}`
    });
  });

  // New Recording button
  newRecordingBtn.addEventListener('click', function () {
    resultPanel.classList.add('hidden');
    startPanel.classList.remove('hidden');
    guideNameInput.value = '';
  });

  // View Created Guides button
  viewCreatedGuidesBtn.addEventListener('click', function () {
    chrome.storage.local.get(null, function (data) {
      const guideIds = Object.keys(data).filter(key => data[key].id);
      if (guideIds.length === 0) {
        alert('No guides found.');
        return;
      }
      window.open('guideList.html', '_blank');
    });
  });

  // Listen for step count updates
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'updateStepCount') {
      stepCounter.textContent = request.count;
    }
  });
});
