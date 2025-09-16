/*
 * Minimal Markdown editor (textarea + preview) for step descriptions
 */
import { createEasyMDEEditor } from './easymde-loader.js';

export function createMarkdownEditor(initialValue = '', onChange) {
  const container = document.createElement('div');
  container.className = 'markdown-editor';

  const textarea = document.createElement('textarea');
  textarea.value = initialValue;
  textarea.placeholder = 'Write step description in Markdown...';
  textarea.rows = 6;
  textarea.className = 'markdown-input';
  container.appendChild(textarea);

  // Attach EasyMDE
  const easyMDE = createEasyMDEEditor(textarea, {
    initialValue,
    toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "link", "preview", "guide"],
    autofocus: true,
    placeholder: 'Write step description in Markdown...'
  });

  easyMDE.codemirror.on('change', () => {
    if (onChange) onChange(easyMDE.value());
  });

  // Provide a way to get the value
  container.getValue = () => easyMDE.value();
  container.setValue = (val) => easyMDE.value(val);

  return container;
}

