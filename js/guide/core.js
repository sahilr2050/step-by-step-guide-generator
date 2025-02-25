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
      this.exportToConfluence();
    });

    document.getElementById('exportNotion').addEventListener('click', () => {
      this.exportToNotion();
    });
  },

  exportToConfluence() {
    // In a real implementation, this would show a dialog to configure space, etc.
    Swal.fire({
      title: 'Confluence Export',
      html: `
        <form id="confluenceForm">
          <div class="mb-3">
            <label for="confluenceUrl" class="form-label">Confluence URL</label>
            <input type="url" class="form-control" id="confluenceUrl" placeholder="https://yourcompany.atlassian.net">
          </div>
          <div class="mb-3">
            <label for="confluenceSpace" class="form-label">Space Key</label>
            <input type="text" class="form-control" id="confluenceSpace" placeholder="DOC">
          </div>
          <div class="mb-3">
            <label for="confluenceToken" class="form-label">API Token</label>
            <input type="password" class="form-control" id="confluenceToken">
          </div>
        </form>
      `,
      showCancelButton: true,
      confirmButtonText: 'Export',
      preConfirm: () => {
        // Get form values
        const url = document.getElementById('confluenceUrl').value;
        const space = document.getElementById('confluenceSpace').value;
        const token = document.getElementById('confluenceToken').value;

        if (!url || !space || !token) {
          Swal.showValidationMessage('Please fill in all fields');
          return false;
        }

        return { url, space, token };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        // Show a "preparing export" message
        Swal.fire({
          title: 'Preparing Export',
          text: 'Generating Confluence data...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Simulate API call
        setTimeout(() => {
          Swal.fire({
            title: 'Export Successful',
            text: 'The guide has been exported to Confluence.',
            icon: 'success'
          });
        }, 1500);
      }
    });
  },

  exportToNotion() {
    // Similar implementation to Confluence export
    Swal.fire({
      title: 'Notion Export',
      html: `
        <form id="notionForm">
          <div class="mb-3">
            <label for="notionToken" class="form-label">Notion Integration Token</label>
            <input type="password" class="form-control" id="notionToken">
          </div>
          <div class="mb-3">
            <label for="notionDatabase" class="form-label">Database ID (optional)</label>
            <input type="text" class="form-control" id="notionDatabase" placeholder="Optional">
          </div>
        </form>
      `,
      showCancelButton: true,
      confirmButtonText: 'Export',
      preConfirm: () => {
        const token = document.getElementById('notionToken').value;
        const database = document.getElementById('notionDatabase').value;

        if (!token) {
          Swal.showValidationMessage('API token is required');
          return false;
        }

        return { token, database };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Preparing Export',
          text: 'Generating Notion data...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Simulate API call
        setTimeout(() => {
          Swal.fire({
            title: 'Export Successful',
            text: 'The guide has been exported to Notion.',
            icon: 'success'
          });
        }, 1500);
      }
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