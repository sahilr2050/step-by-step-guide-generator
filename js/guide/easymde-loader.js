/*
 * EasyMDE loader for vanilla JS usage in Chrome extension
 * Usage: createEasyMDEEditor(textareaElement, options)
 */
export function createEasyMDEEditor(textarea, options = {}) {
  if (!window.EasyMDE) {
    throw new Error('EasyMDE is not loaded.');
  }
  return new window.EasyMDE(Object.assign({
    element: textarea,
    autoDownloadFontAwesome: false,
    spellChecker: false,
    status: false,
    minHeight: '120px',
    ...options
  }));
}
