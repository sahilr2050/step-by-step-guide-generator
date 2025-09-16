/*
 * Simple rich text toolbar (bold, italic, underline, link, list)
 * Used for step description editing
 */
export function createRichTextToolbar(targetElement, onCommand) {
  const toolbar = document.createElement('div');
  toolbar.className = 'rich-text-toolbar';
  toolbar.innerHTML = `
    <button type="button" data-cmd="bold" title="Bold"><b>B</b></button>
    <button type="button" data-cmd="italic" title="Italic"><i>I</i></button>
    <button type="button" data-cmd="underline" title="Underline"><u>U</u></button>
    <button type="button" data-cmd="insertUnorderedList" title="Bullet List">• List</button>
    <button type="button" data-cmd="insertOrderedList" title="Numbered List">1. List</button>
    <button type="button" data-cmd="createLink" title="Insert Link">🔗</button>
    <button type="button" data-cmd="undo" title="Undo">⎌</button>
    <button type="button" data-cmd="redo" title="Redo">↻</button>
  `;
  toolbar.querySelectorAll('button').forEach(btn => {
    btn.onclick = (e) => {
      const cmd = btn.getAttribute('data-cmd');
      if (cmd === 'createLink') {
        const url = prompt('Enter URL:');
        if (url) document.execCommand('createLink', false, url);
      } else {
        document.execCommand(cmd, false, null);
      }
      if (onCommand) onCommand(cmd);
      targetElement.focus();
    };
  });
  return toolbar;
}
