// Logger utility
function log(message, level = 'info') {
  console[level](`[Popup] ${message}`);
}

document.addEventListener('DOMContentLoaded', function() {
  const startPanel = document.getElementById('start-panel');
  const recordingPanel = document.getElementById('recording-panel');
  const resultPanel = document.getElementById('result-panel');
  const guideNameInput = document.getElementById('guide-name');
  const startRecordingBtn = document.getElementById('start-recording');
  const stopRecordingBtn = document.getElementById('stop-recording');
  const stepCounter = document.getElementById('step-counter');
  const finalStepCount = document.getElementById('final-step-count');
  const viewGuideBtn = document.getElementById('view-guide');
  const newRecordingBtn = document.getElementById('new-recording');
  
  let currentGuideId = null;
  
  // Check if we're already recording
  chrome.storage.local.get(['isRecording', 'currentGuideId', 'stepCount'], function(data) {
    if (chrome.runtime.lastError) {
      log(`Error retrieving storage data: ${chrome.runtime.lastError}`, 'error');
      return;
    }
    if (data.isRecording) {
      startPanel.classList.add('hidden');
      recordingPanel.classList.remove('hidden');
      stepCounter.textContent = data.stepCount || 0;
      currentGuideId = data.currentGuideId;
      log('Resumed recording session.');
    }
  });
  
  // Start recording
  startRecordingBtn.addEventListener('click', function() {
    const guideName = guideNameInput.value.trim();
    
    if (!guideName) {
      alert('Please enter a guide name');
      return;
    }
    
    currentGuideId = Date.now().toString();
    const guideData = {
      id: currentGuideId,
      name: guideName,
      steps: [],
      dateCreated: new Date().toISOString()
    };
    
    chrome.storage.local.set({
      isRecording: true,
      currentGuideId: currentGuideId,
      stepCount: 0,
      [currentGuideId]: guideData
    }, function() {
      startPanel.classList.add('hidden');
      recordingPanel.classList.remove('hidden');
      
      // Send message to background script to start recording
      chrome.runtime.sendMessage({
        action: 'startRecording',
        guideId: currentGuideId
      });
    });
  });
  
  // Stop recording
  stopRecordingBtn.addEventListener('click', function() {
    chrome.runtime.sendMessage({
      action: 'stopRecording',
      guideId: currentGuideId
    }, function(response) {
      chrome.storage.local.set({
        isRecording: false
      }, function() {
        recordingPanel.classList.add('hidden');
        resultPanel.classList.remove('hidden');
        
        chrome.storage.local.get(['stepCount'], function(data) {
          finalStepCount.textContent = data.stepCount || 0;
        });
      });
    });
  });
  
  // View Guide button
  viewGuideBtn.addEventListener('click', function() {
    chrome.tabs.create({
      url: `guide.html?id=${currentGuideId}`
    });
  });
  
  // New Recording button
  newRecordingBtn.addEventListener('click', function() {
    resultPanel.classList.add('hidden');
    startPanel.classList.remove('hidden');
    guideNameInput.value = '';
  });
  
  // Listen for step count updates
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateStepCount') {
      stepCounter.textContent = request.count;
    }
  });
});
