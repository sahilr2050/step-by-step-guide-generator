// step-tools.js
import Store from './store.js';
import Core from './core.js';

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