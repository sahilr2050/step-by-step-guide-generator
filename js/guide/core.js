import Store from './store.js';
import Renderer from './renderer.js';
import ImageTools from './image-tools.js';
import ExportTools from './export-tools.js';

export default {
  init() {
    Store.initElements();
    this.setupDeleteListeners();

    const urlParams = new URLSearchParams(window.location.search);
    Store.guideId = urlParams.get('id');

    if (!Store.guideId) {
      Store.guideContent.innerHTML = '<div class="error">Guide ID not provided</div>';
      return;
    }

    this.setupModalListeners();
    this.loadGuideData();
    this.setupExportListeners();
  },

  setupExportListeners() {
    document.getElementById('exportMarkdown').addEventListener('click', () => {
      ExportTools.downloadMarkdown(Store.currentGuide);
    });

    document.getElementById('exportConfluence').addEventListener('click', () => {
      ExportTools.exportToConfluence(Store.currentGuide);
    });

    document.getElementById('exportNotion').addEventListener('click', () => {
      ExportTools.exportToNotion(Store.currentGuide);
    });

    // PDF Export
    document.getElementById('exportPDF').addEventListener('click', () => {
      ExportTools.exportToPDF(Store.currentGuide);
    });

    document.getElementById('exportMarkdownWithImages').addEventListener('click', () => {
      ExportTools.exportToMarkdownWithImages(Store.currentGuide);
    });
  },
  
  setupModalListeners() {
    Store.modalClose.addEventListener('click', () => {
      Store.imageModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
      if (event.target === Store.imageModal) {
        Store.imageModal.style.display = 'none';
      }
    });

    Store.addBlurBtn.addEventListener('click', () => ImageTools.addBlurRegion());
    Store.removeBlurBtn.addEventListener('click', () => ImageTools.removeAllBlurRegions());
    Store.saveBlurredImageBtn.addEventListener('click', () => ImageTools.saveBlurredImage());
    Store.detectSensitiveBtn.addEventListener('click', () => ImageTools.detectSensitiveInfo());
    document.querySelectorAll('.preset-blur').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const preset = e.target.dataset.preset;
        ImageTools.applyPresetBlur(preset);
      });
    });

    document.addEventListener('mousemove', (e) => ImageTools.handleMouseMove(e));
    document.addEventListener('mouseup', () => ImageTools.handleMouseUp());
  },

  loadGuideData() {
    chrome.storage.local.get([Store.guideId], (data) => {
      if (!data[Store.guideId]) {
        Store.guideContent.innerHTML = '<div class="error">Guide not found</div>';
        return;
      }

      Store.currentGuide = data[Store.guideId];
      Store.guideTitle.textContent = Store.currentGuide.name;
      Renderer.renderGuide(Store.currentGuide);
      Renderer.renderSidebar(Store.currentGuide.steps);
    });
  },

  saveGuideData(callback) {
    chrome.storage.local.set({ [Store.guideId]: Store.currentGuide }, () => {
      if (callback) callback();
    });
  },

  setupDeleteListeners() {
    document.addEventListener('click', (event) => {
      if (event.target.classList.contains('delete-step-btn')) {
        const index = parseInt(event.target.dataset.index, 10);
        this.deleteStep(index);
      }
    });
  },

  deleteStep(index) {
    if (index >= 0 && index < Store.currentGuide.steps.length) {
      Store.currentGuide.steps.splice(index, 1);
      this.saveGuideData(() => {
        Renderer.renderGuide(Store.currentGuide);
      });
    }
  }
};