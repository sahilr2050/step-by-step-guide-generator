// store.js
export default {
  // DOM elements
  guideTitle: null,
  guideContent: null,
  imageModal: null,
  modalImage: null,
  modalClose: null,
  addBlurBtn: null,
  removeBlurBtn: null,
  saveBlurredImageBtn: null,

  // State variables
  currentGuide: null,
  guideId: null,
  currentStepIndex: null,
  blurRegions: [],
  isDragging: false,
  isResizing: false,
  currentBlurRegion: null,
  startX: 0, startY: 0,
  startWidth: 0, startHeight: 0,
  originalImage: null,
  draggedStep: null,

  initElements() {
    this.guideTitle = document.getElementById('guide-title');
    this.guideContent = document.getElementById('guide-content');
    this.imageModal = document.getElementById('imageModal');
    this.modalImage = document.getElementById('modalImage');
    this.modalClose = document.querySelector('.modal-close');
    this.addBlurBtn = document.getElementById('addBlurRegion');
    this.removeBlurBtn = document.getElementById('removeBlurRegion');
    this.saveBlurredImageBtn = document.getElementById('saveBlurredImage');
    this.detectSensitiveBtn = document.getElementById('detectSensitiveInfo');
    this.blurPresetsBtn = document.getElementById('blurPresets');

  }
};