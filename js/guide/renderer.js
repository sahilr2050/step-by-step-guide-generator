// renderer.js
import Store from './store.js';
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
    StepTools.enableStepReordering();
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
    const imageSrc = step.blurredScreenshot || step.screenshot;
    
    stepElement.innerHTML = `
      <div class="step-header">
        <div class="step-number">Step ${stepNumber}</div>
        <div class="step-location">${step.title} (${displayUrl})</div>
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
          </div>
        </div>
        ${imageSrc ? `
          <div class="step-screenshot">
            <img src="${imageSrc}" alt="Screenshot of step ${stepNumber}" class="step-image" data-step="${index}">
            <button class="btn btn-primary btn-sm download-image mt-2" data-step="${index}">Download Image</button>
          </div>
        ` : ''}
      </div>
    `;
    
    return stepElement;
  },
  
  addEventListeners() {
    document.querySelectorAll('.step-image').forEach(img => {
      img.addEventListener('click', function() {
        const stepIndex = parseInt(this.dataset.step);
        const originalSrc = Store.currentGuide.steps[stepIndex].screenshot;
        ImageTools.openImageModal(originalSrc, stepIndex);
      });
    });
    
    document.querySelectorAll('.edit-description').forEach(btn => {
      btn.addEventListener('click', function() {
        const stepIndex = parseInt(this.dataset.step);
        StepTools.makeDescriptionEditable(stepIndex);
      });
    });
    
    document.querySelectorAll('.save-description').forEach(btn => {
      btn.addEventListener('click', function() {
        const stepIndex = parseInt(this.dataset.step);
        StepTools.saveDescription(stepIndex);
      });
    });
    
    document.querySelectorAll('.cancel-edit').forEach(btn => {
      btn.addEventListener('click', function() {
        const stepIndex = parseInt(this.dataset.step);
        StepTools.cancelEdit(stepIndex);
      });
    });
    
    document.querySelectorAll('.copy-description').forEach(btn => {
      btn.addEventListener('click', function() {
        const stepIndex = parseInt(this.dataset.step);
        StepTools.copyDescription(stepIndex);
      });
    });
    
    document.querySelectorAll('.download-image').forEach(btn => {
      btn.addEventListener('click', function() {
        const stepIndex = parseInt(this.dataset.step);
        ImageTools.downloadImage(stepIndex);
      });
    });
    
    document.querySelectorAll('.step').forEach(step => {
      step.setAttribute('draggable', 'true');
      step.addEventListener('dragstart', StepTools.handleDragStart);
      step.addEventListener('dragend', StepTools.handleDragEnd);
      step.addEventListener('dragover', StepTools.handleDragOver);
      step.addEventListener('dragenter', StepTools.handleDragEnter);
      step.addEventListener('dragleave', StepTools.handleDragLeave);
      step.addEventListener('drop', StepTools.handleDrop);
    });
  }
};