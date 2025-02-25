// step-tools.js
import Store from './store.js';
import Core from './core.js';
import Renderer from './renderer.js';

export default {
  enableStepReordering() {
    const steps = Store.guideContent.querySelectorAll('.step');
    
    steps.forEach(step => {
      const stepHeader = step.querySelector('.step-header');
      const dragHandle = document.createElement('div');
      dragHandle.className = 'drag-handle';
      dragHandle.innerHTML = '⋮⋮';
      dragHandle.title = 'Drag to reorder';
      stepHeader.prepend(dragHandle);
    });
  },

  handleDragStart(e) {
    Store.draggedStep = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.stepIndex);
  },

  handleDragEnd() {
    this.classList.remove('dragging');
    document.querySelectorAll('.step').forEach(step => {
      step.classList.remove('drag-over');
    });
  },

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
  },

  handleDragEnter() {
    this.classList.add('drag-over');
  },

  handleDragLeave() {
    this.classList.remove('drag-over');
  },

  handleDrop(e) {
    e.stopPropagation();
    
    if (Store.draggedStep !== this) {
      const sourceIndex = parseInt(Store.draggedStep.dataset.stepIndex);
      const targetIndex = parseInt(this.dataset.stepIndex);
      StepTools.reorderSteps(sourceIndex, targetIndex);
    }
    
    return false;
  },

  reorderSteps(sourceIndex, targetIndex) {
    if (sourceIndex === targetIndex) return;
    
    const stepsArray = Store.currentGuide.steps;
    const [movedStep] = stepsArray.splice(sourceIndex, 1);
    stepsArray.splice(targetIndex, 0, movedStep);
    
    Core.saveGuideData(() => {
      Swal.fire({
        title: 'Steps Reordered',
        text: 'Guide steps have been reordered successfully',
        icon: 'success',
        timer: 1500
      });
      
      Renderer.renderGuide(Store.currentGuide);
    });
  },

  copyDescription(stepIndex) {
    const descElement = document.getElementById(`step-desc-${stepIndex}`);
    const textToCopy = descElement.innerText || descElement.textContent;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      const btn = document.querySelector(`.copy-description[data-step="${stepIndex}"]`);
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      
      setTimeout(() => {
        btn.textContent = originalText;
      }, 1500);
    }).catch(err => {
      console.error('Failed to copy text:', err);
      alert('Failed to copy text. Please try again.');
    });
  },

  makeDescriptionEditable(stepIndex) {
    const descElement = document.getElementById(`step-desc-${stepIndex}`);
    descElement.dataset.originalText = descElement.innerHTML;
    
    descElement.contentEditable = true;
    descElement.classList.add('editable');
    descElement.focus();
    
    document.getElementById(`editing-controls-${stepIndex}`).style.display = 'block';
    document.querySelector(`.step-actions`).style.display = 'none';
  },

  saveDescription(stepIndex) {
    const descElement = document.getElementById(`step-desc-${stepIndex}`);
    Store.currentGuide.steps[stepIndex].customDescription = descElement.innerHTML;
    
    Core.saveGuideData(() => {
      Swal.fire({
        title: 'Saved!',
        text: 'Step description updated',
        icon: 'success',
        timer: 1500
      });
    });
    
    descElement.contentEditable = false;
    descElement.classList.remove('editable');
    document.getElementById(`editing-controls-${stepIndex}`).style.display = 'none';
    document.querySelector(`.step-actions`).style.display = 'flex';
  },

  cancelEdit(stepIndex) {
    const descElement = document.getElementById(`step-desc-${stepIndex}`);
    descElement.innerHTML = descElement.dataset.originalText;
    
    descElement.contentEditable = false;
    descElement.classList.remove('editable');
    document.getElementById(`editing-controls-${stepIndex}`).style.display = 'none';
    document.querySelector(`.step-actions`).style.display = 'flex';
  }
};