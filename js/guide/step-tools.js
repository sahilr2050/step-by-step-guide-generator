// step-tools.js
import Store from './store.js';
import Core from './core.js';
import { createRichTextToolbar } from './rich-text-toolbar.js';

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

    // Undo/redo stack
    let undoStack = [descElement.innerHTML];
    let redoStack = [];
    let lastValue = descElement.innerHTML;
    descElement.addEventListener('input', onInput);
    descElement.addEventListener('keydown', onKeyDown);

    function onInput() {
      if (descElement.innerHTML !== lastValue) {
        undoStack.push(descElement.innerHTML);
        redoStack = [];
        lastValue = descElement.innerHTML;
      }
    }
    function onKeyDown(e) {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        if (undoStack.length > 1) {
          redoStack.push(undoStack.pop());
          descElement.innerHTML = undoStack[undoStack.length - 1];
          lastValue = descElement.innerHTML;
        }
      } else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        if (redoStack.length > 0) {
          const value = redoStack.pop();
          undoStack.push(value);
          descElement.innerHTML = value;
          lastValue = descElement.innerHTML;
        }
      }
    }

    // Inject rich text toolbar
    let toolbar = document.getElementById(`rich-toolbar-${stepIndex}`);
    if (!toolbar) {
      toolbar = createRichTextToolbar(descElement);
      toolbar.id = `rich-toolbar-${stepIndex}`;
      descElement.parentNode.insertBefore(toolbar, descElement);
    }

    document.getElementById(`editing-controls-${stepIndex}`).style.display = 'block';
    document.querySelector(`.step-actions`).style.display = 'none';

    // Remove listeners on save/cancel
    descElement._removeUndoRedoListeners = function () {
      descElement.removeEventListener('input', onInput);
      descElement.removeEventListener('keydown', onKeyDown);
      delete descElement._removeUndoRedoListeners;
    };
  },

  saveDescription(stepIndex) {
    const descElement = document.getElementById(`step-desc-${stepIndex}`);
    Store.currentGuide.steps[stepIndex].customDescription = descElement.innerHTML;
    
    // Remove rich text toolbar
    const toolbar = document.getElementById(`rich-toolbar-${stepIndex}`);
    if (toolbar) {
      toolbar.parentNode.removeChild(toolbar);
    }
    if (descElement._removeUndoRedoListeners) descElement._removeUndoRedoListeners();

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
    // Remove rich text toolbar
    const toolbar = document.getElementById(`rich-toolbar-${stepIndex}`);
    if (toolbar) {
      toolbar.parentNode.removeChild(toolbar);
    }
    if (descElement._removeUndoRedoListeners) descElement._removeUndoRedoListeners();
    document.getElementById(`editing-controls-${stepIndex}`).style.display = 'none';
    document.querySelector(`.step-actions`).style.display = 'flex';
  }
};