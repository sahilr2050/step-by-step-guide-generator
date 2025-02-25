import StorageManager from '../storage-manager.js';
import Store from './store.js';
import Core from './core.js';
import Utils from './utils.js';
import StepTools from './step-tools.js';
import ImageTools from './image-tools.js';

export default {
  renderGuide(guide) {
    Store.guideContent.innerHTML = '';

    if (!guide.steps || guide.steps.length === 0) {
      Store.guideContent.innerHTML = '<div class="notice">No steps recorded in this guide</div>';
      return;
    }

    guide.steps.forEach((step, index) => {
      const stepElement = this.createStepElement(step, index);
      Store.guideContent.appendChild(stepElement);
    });

    this.addEventListeners();
  },

  createStepElement(step, index) {
    const stepElement = document.createElement('div');
    stepElement.className = 'step';
    stepElement.dataset.stepIndex = index;
    stepElement.dataset.stepId = step.id || step.timestamp;
  
    const stepNumber = index + 1;
    const url = new URL(step.url);
    const displayUrl = `${url.hostname}${url.pathname}`;
    const descriptionId = `step-desc-${index}`;
    
    // Basic HTML without screenshot first (we'll add it later)
    stepElement.innerHTML = `
      <div class="step-header">
        <div class="step-number">Step ${stepNumber}</div>
        <button class="btn btn-danger btn-sm delete-step-btn" data-index="${index}">Delete</button>
      </div>
      <div class="step-content">
        <div class="step-details">
          <div class="step-description">
            <div id="${descriptionId}" class="step-desc-content">${Utils.getStepDescription(step, stepNumber)}</div>
            <div class="step-actions">
              <button class="btn btn-primary btn-sm edit-description mt-2" data-step="${index}">Edit</button>
              <button class="btn btn-secondary btn-sm copy-description mt-2" data-step="${index}">Copy</button>
            </div>
            <div class="editing-controls" id="editing-controls-${index}">
              <button class="btn btn-sm btn-success save-btn save-description" data-step="${index}">Save</button>
              <button class="btn btn-sm btn-danger cancel-btn cancel-edit" data-step="${index}">Cancel</button>
            </div>
          </div>
          <div class="step-element-info">
            <strong>Element:</strong> ${step.elementInfo.tagName}
            ${step.elementInfo.attributes.id ? `<br><strong>ID:</strong> ${step.elementInfo.attributes.id}` : ''}
            ${step.elementInfo.attributes.class ? `<br><strong>Class:</strong> ${step.elementInfo.attributes.class}` : ''}
            ${step.elementInfo.text ? `<br><strong>Text:</strong> "${step.elementInfo.text.substring(0, 100)}${step.elementInfo.text.length > 100 ? '...' : ''}"` : ''}
            ${step.title ? `<br><strong>Title:</strong> ${step.title}` : ''}
            ${step.url ? `<br><strong>URL:</strong> ${displayUrl}` : ''}
          </div>
        </div>
        <div class="step-screenshot">
          <div class="screenshot-loading-placeholder" data-step="${index}">Loading screenshot...</div>
        </div>
      </div>
    `;
    
    // Create a container for the screenshot that we'll fill later
    const screenshotContainer = stepElement.querySelector('.step-screenshot');
    
    // Load the screenshot from IndexedDB if we have a key
    if (step.screenshotKey) {
      StorageManager.getScreenshot(step.screenshotKey)
        .then(screenshot => {
          if (screenshot) {
            // Replace the placeholder with the actual image
            const imgHTML = `
              <img src="${screenshot}" alt="Screenshot of step ${stepNumber}" class="step-image" data-step="${index}">
              <button class="btn btn-primary btn-sm download-image mt-2" data-step="${index}">Download Image</button>
            `;
            screenshotContainer.innerHTML = imgHTML;
            
            // Add event listeners to the new image
            const img = screenshotContainer.querySelector('.step-image');
            img.addEventListener('click', function() {
              const stepIndex = parseInt(this.dataset.step);
              ImageTools.openImageModal(screenshot, stepIndex);
            });
            
            const downloadBtn = screenshotContainer.querySelector('.download-image');
            downloadBtn.addEventListener('click', function() {
              const stepIndex = parseInt(this.dataset.step);
              ImageTools.downloadImage(stepIndex);
            });
          } else {
            // No screenshot found
            screenshotContainer.innerHTML = '<div class="no-screenshot">No screenshot available</div>';
          }
        })
        .catch(error => {
          console.error(`Error loading screenshot for step ${index}:`, error);
          screenshotContainer.innerHTML = '<div class="screenshot-error">Failed to load screenshot</div>';
        });
    } else if (step.screenshot) {
      // For backward compatibility - if the screenshot is stored in the step
      const imgHTML = `
        <img src="${step.screenshot}" alt="Screenshot of step ${stepNumber}" class="step-image" data-step="${index}">
        <button class="btn btn-primary btn-sm download-image mt-2" data-step="${index}">Download Image</button>
      `;
      screenshotContainer.innerHTML = imgHTML;
    } else {
      screenshotContainer.innerHTML = '<div class="no-screenshot">No screenshot available</div>';
    }
    
    return stepElement;
  },

  addEventListeners() {
    document.querySelectorAll('.step-image').forEach(img => {
      img.addEventListener('click', function () {
        const stepIndex = parseInt(this.dataset.step);
        const originalSrc = Store.currentGuide.steps[stepIndex].screenshot;
        ImageTools.openImageModal(originalSrc, stepIndex);
      });
    });

    document.querySelectorAll('.edit-description').forEach(btn => {
      btn.addEventListener('click', function () {
        const stepIndex = parseInt(this.dataset.step);
        StepTools.makeDescriptionEditable(stepIndex);
      });
    });

    document.querySelectorAll('.save-description').forEach(btn => {
      btn.addEventListener('click', function () {
        const stepIndex = parseInt(this.dataset.step);
        StepTools.saveDescription(stepIndex);
      });
    });

    document.querySelectorAll('.cancel-edit').forEach(btn => {
      btn.addEventListener('click', function () {
        const stepIndex = parseInt(this.dataset.step);
        StepTools.cancelEdit(stepIndex);
      });
    });

    document.querySelectorAll('.copy-description').forEach(btn => {
      btn.addEventListener('click', function () {
        const stepIndex = parseInt(this.dataset.step);
        StepTools.copyDescription(stepIndex);
      });
    });

    document.querySelectorAll('.download-image').forEach(btn => {
      btn.addEventListener('click', function () {
        const stepIndex = parseInt(this.dataset.step);
        ImageTools.downloadImage(stepIndex);
      });
    });
  },

  renderSidebar(steps) {
    const stepList = document.getElementById('step-list');
    stepList.innerHTML = ''; // Clear existing steps

    steps.forEach((step, index) => {
      const li = document.createElement('li');
      li.textContent = `⋮⋮ Step ${index + 1}`;
      li.draggable = true;
      li.dataset.index = index;
      li.classList.add('clickable-step'); // Add class for styling
      
      // Add click handler to navigate to the step
      li.addEventListener('click', () => {
        const stepElement = document.querySelector(`.step[data-step-index="${index}"]`);
        if (stepElement) {
          stepElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the step briefly
          stepElement.classList.add('highlight-step');
          setTimeout(() => stepElement.classList.remove('highlight-step'), 1500);
        }
      });
  
      // Existing drag event handlers
      li.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', index);
        li.classList.add('dragging');
      });
  
      li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
      });
  
      stepList.appendChild(li);
    });

    stepList.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingItem = document.querySelector('.dragging');
      const afterElement = this.getDragAfterElement(stepList, e.clientY);
      if (afterElement == null) {
        stepList.appendChild(draggingItem);
      } else {
        stepList.insertBefore(draggingItem, afterElement);
      }
    });

    stepList.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggingIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const newIndex = Array.from(stepList.children).indexOf(document.querySelector('.dragging'));
      if (draggingIndex !== newIndex) {
        const [movedStep] = steps.splice(draggingIndex, 1);
        steps.splice(newIndex, 0, movedStep);
        Core.saveGuideData(() => {
          this.renderSidebar(steps);
          this.renderGuide(Store.currentGuide);
        });
      }
    });
  },

  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
};
