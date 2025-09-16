// step-tools.js
import Store from './store.js';
import Core from './core.js';
import { createMarkdownEditor } from './markdown-editor.js';

export default {
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

  getStep(stepIndex) {
    return Store.currentGuide.steps[stepIndex];
  },

  makeDescriptionEditable(stepIndex) {
    const step = this.getStep(stepIndex);
    const stepElement = document.querySelector(`.step[data-step-index="${stepIndex}"]`);
    const descElement = document.getElementById(`step-desc-${stepIndex}`);
    const titleElement = document.getElementById(`step-title-${stepIndex}`);
    
    // Get the description, falling back to element info text if no custom description exists
    const originalDesc = step.customDescription || 
                        (step.elementInfo && step.elementInfo.text) || '';
    const originalTitle = titleElement.textContent.trim();

    // Clear and create container for editor
    descElement.innerHTML = '';
    
    // Create markdown editor
    const mdEditor = createMarkdownEditor(originalDesc, (newValue) => {
      // Update preview as user types
      descElement._getMarkdownValue = () => newValue;
    });
    
    // Store the editor instance for cleanup
    descElement._editor = mdEditor;
    descElement._getMarkdownValue = () => mdEditor.getValue();
    
    // Add editor to DOM
    descElement.appendChild(mdEditor);

    // Title input
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = step.title || '';
    titleInput.className = 'step-title-input';
    titleElement.innerHTML = ''; // Clear any existing content first
    titleElement.appendChild(titleInput);

    // Toggle UI elements
    document.getElementById(`editing-controls-${stepIndex}`).style.display = 'block';
    document.querySelector(`.step[data-step-index="${stepIndex}"] .step-actions`).style.display = 'none';
    descElement._getTitleValue = () => titleInput.value;
  },

  saveDescription(stepIndex) {
    const descElement = document.getElementById(`step-desc-${stepIndex}`);
    const titleElement = document.getElementById(`step-title-${stepIndex}`);
    const step = this.getStep(stepIndex);
    
    if (descElement._getMarkdownValue) {
      step.customDescription = descElement._getMarkdownValue();
    }
    if (descElement._getTitleValue) {
      step.title = descElement._getTitleValue();
    }
    
    // Render the markdown content
    const descHtml = step.customDescription ? 
      (window.marked ? window.marked.parse(step.customDescription) : step.customDescription) :
      '';
      
    descElement.innerHTML = `<div class="step-description markdown-body">${descHtml}</div>`;
    titleElement.innerHTML = step.title || '';

    Core.saveGuideData(() => {
      Swal.fire({
        title: 'Saved!',
        text: 'Step updated',
        icon: 'success',
        timer: 1500
      });
    });
    document.getElementById(`editing-controls-${stepIndex}`).style.display = 'none';
    document.querySelector(`.step[data-step-index="${stepIndex}"] .step-actions`).style.display = 'flex';
  },

  cancelEdit(stepIndex) {
    const descElement = document.getElementById(`step-desc-${stepIndex}`);
    const titleElement = document.getElementById(`step-title-${stepIndex}`);
    const step = Store.currentGuide.steps[stepIndex];
    
    // Restore the description with proper markdown rendering
    const description = step.customDescription || (step.elementInfo && step.elementInfo.text) || '';
    const descHtml = window.marked ? window.marked.parse(description) : description;
    descElement.innerHTML = `<div class="step-description markdown-body">${descHtml}</div>`;
    
    // Restore the title
    titleElement.innerHTML = step.title || '';
    
    // Toggle UI elements
    document.getElementById(`editing-controls-${stepIndex}`).style.display = 'none';
    document.querySelector(`.step[data-step-index="${stepIndex}"] .step-actions`).style.display = 'flex';
  }
};