document.addEventListener('DOMContentLoaded', function () {
  const guideTitle = document.getElementById('guide-title');
  const guideContent = document.getElementById('guide-content');
  const exportPdfBtn = document.getElementById('export-pdf');
  const exportHtmlBtn = document.getElementById('export-html');

  // Modal elements
  const imageModal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  const modalClose = document.querySelector('.modal-close');
  const addBlurBtn = document.getElementById('addBlurRegion');
  const removeBlurBtn = document.getElementById('removeBlurRegion');
  const saveBlurredImageBtn = document.getElementById('saveBlurredImage');

  // State variables
  let currentGuide = null;
  let currentStepIndex = null;
  let blurRegions = [];
  let isDragging = false;
  let isResizing = false;
  let currentBlurRegion = null;
  let startX, startY, startWidth, startHeight;
  let originalImage = null;

  // Get guide ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const guideId = urlParams.get('id');

  if (!guideId) {
    guideContent.innerHTML = '<div class="error">Guide ID not provided</div>';
    return;
  }

  // Load guide data
  chrome.storage.local.get([guideId], function (data) {
    if (!data[guideId]) {
      guideContent.innerHTML = '<div class="error">Guide not found</div>';
      return;
    }

    currentGuide = data[guideId];

    // Update title
    guideTitle.textContent = currentGuide.name;

    // Render steps
    renderGuide(currentGuide);
  });

  function renderGuide(guide) {
    guideContent.innerHTML = '';

    if (!guide.steps || guide.steps.length === 0) {
      guideContent.innerHTML = '<div class="notice">No steps recorded in this guide</div>';
      return;
    }

    // Render each step
    guide.steps.forEach((step, index) => {
      const stepElement = document.createElement('div');
      stepElement.className = 'step';
      stepElement.dataset.stepIndex = index;

      const stepNumber = index + 1;

      // Format URL for display
      const url = new URL(step.url);
      const displayUrl = `${url.hostname}${url.pathname}`;

      // Generate unique IDs for this step
      const descriptionId = `step-desc-${index}`;

      // Use the blurred image if available, otherwise the original
      const imageSrc = step.blurredScreenshot || step.screenshot;

      stepElement.innerHTML = `
        <div class="step-header">
          <div class="step-number">Step ${stepNumber}</div>
          <div class="step-location">${step.title} (${displayUrl})</div>
        </div>
        <div class="step-content">
          <div class="step-details">
            <div class="step-description">
              <div id="${descriptionId}" class="step-desc-content">${getStepDescription(step, stepNumber)}</div>
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

      guideContent.appendChild(stepElement);
    });

    // Add event listeners after rendering
    addEventListeners();
  }

  function addEventListeners() {
    // Image click event for modal
    document.querySelectorAll('.step-image').forEach(img => {
      img.addEventListener('click', function () {
        const stepIndex = parseInt(this.dataset.step);
        // Always use the original image in the modal for editing
        const originalSrc = currentGuide.steps[stepIndex].screenshot;
        openImageModal(originalSrc, stepIndex);
      });
    });

    // Edit description buttons
    document.querySelectorAll('.edit-description').forEach(btn => {
      btn.addEventListener('click', function () {
        const stepIndex = parseInt(this.dataset.step);
        makeDescriptionEditable(stepIndex);
      });
    });

    // Save description buttons
    document.querySelectorAll('.save-description').forEach(btn => {
      btn.addEventListener('click', function () {
        const stepIndex = parseInt(this.dataset.step);
        saveDescription(stepIndex);
      });
    });

    // Cancel edit buttons
    document.querySelectorAll('.cancel-edit').forEach(btn => {
      btn.addEventListener('click', function () {
        const stepIndex = parseInt(this.dataset.step);
        cancelEdit(stepIndex);
      });
    });

    // Copy description buttons
    document.querySelectorAll('.copy-description').forEach(btn => {
      btn.addEventListener('click', function() {
        const stepIndex = parseInt(this.dataset.step);
        copyDescription(stepIndex);
      });
    });

    // Download image buttons
    document.querySelectorAll('.download-image').forEach(btn => {
      btn.addEventListener('click', function() {
        const stepIndex = parseInt(this.dataset.step);
        downloadImage(stepIndex);
      });
    });
  }

  // Copy description function
  function copyDescription(stepIndex) {
    const descElement = document.getElementById(`step-desc-${stepIndex}`);
    const textToCopy = descElement.innerText || descElement.textContent;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      // Show success feedback
      const btn = document.querySelector(`.copy-description[data-step="${stepIndex}"]`);
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      
      setTimeout(() => {
        btn.textContent = originalText;
      }, 1500);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy text. Please try again.');
    });
  }

  // Download image function
  function downloadImage(stepIndex) {
    const step = currentGuide.steps[stepIndex];
    const imageSrc = step.blurredScreenshot || step.screenshot;
    
    if (!imageSrc) {
      alert('No image available to download');
      return;
    }

    // Create a temporary link to download the image
    const a = document.createElement('a');
    a.href = imageSrc;
    a.download = `step-${stepIndex + 1}-${currentGuide.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Description editing functions
  function makeDescriptionEditable(stepIndex) {
    const descElement = document.getElementById(`step-desc-${stepIndex}`);
    const originalText = descElement.innerHTML;

    // Store original text for cancel function
    descElement.dataset.originalText = originalText;

    // Make content editable
    descElement.contentEditable = true;
    descElement.classList.add('editable');
    descElement.focus();

    // Show editing controls
    document.getElementById(`editing-controls-${stepIndex}`).style.display = 'block';
    document.querySelector(`.step-actions[data-step="${stepIndex}"]`).style.display = 'none';
  }

  function saveDescription(stepIndex) {
    const descElement = document.getElementById(`step-desc-${stepIndex}`);
    const newText = descElement.innerHTML;

    // Update the description in the guide object
    currentGuide.steps[stepIndex].customDescription = newText;

    // Save to storage
    chrome.storage.local.set({ [guideId]: currentGuide }, function () {
      Swal.fire({
        title: 'Saved!',
        text: 'Step description updated',
        icon: 'success',
        timer: 1500
      });
    });

    // Exit edit mode
    descElement.contentEditable = false;
    descElement.classList.remove('editable');
    document.getElementById(`editing-controls-${stepIndex}`).style.display = 'none';
    document.querySelector(`.step-actions[data-step="${stepIndex}"]`).style.display = 'flex';
  }

  function cancelEdit(stepIndex) {
    const descElement = document.getElementById(`step-desc-${stepIndex}`);

    // Restore original text
    descElement.innerHTML = descElement.dataset.originalText;

    // Exit edit mode
    descElement.contentEditable = false;
    descElement.classList.remove('editable');
    document.getElementById(`editing-controls-${stepIndex}`).style.display = 'none';
    document.querySelector(`.step-actions[data-step="${stepIndex}"]`).style.display = 'flex';
  }

  // Image modal functions
  function openImageModal(imgSrc, stepIndex) {
    currentStepIndex = stepIndex;
    originalImage = new Image();

    // Wait for image to load before setting up canvas
    originalImage.onload = function () {
      // Create canvas for editing
      setupImageEditor(originalImage, stepIndex);
    };

    originalImage.src = imgSrc;
    imageModal.style.display = 'block';
  }

  // Revised image editor setup with responsive sizing
  function setupImageEditor(img, stepIndex) {
    // Remove old canvas and container
    const oldCanvas = document.getElementById('blurCanvas');
    if (oldCanvas) oldCanvas.remove();

    const oldContainer = document.querySelector('.canvas-container');
    if (oldContainer) oldContainer.remove();

    // Create container
    const container = document.createElement('div');
    container.className = 'canvas-container';
    container.style.position = 'relative';
    container.style.margin = '0 auto';

    // Get modal content dimensions
    const modalContent = imageModal.querySelector('.modal-content');
    const maxWidth = modalContent.clientWidth - 40; // 40px for padding

    // Calculate responsive dimensions
    let canvasWidth = img.width;
    let canvasHeight = img.height;
    const aspectRatio = img.width / img.height;

    // Scale down if larger than available space
    if (canvasWidth > maxWidth) {
      canvasWidth = maxWidth;
      canvasHeight = canvasWidth / aspectRatio;
    }

    // Set container dimensions
    container.style.width = canvasWidth + 'px';
    container.style.height = canvasHeight + 'px';

    // Create canvas with original image dimensions (for accurate data)
    const canvas = document.createElement('canvas');
    canvas.id = 'blurCanvas';
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    // Store scale factors as data attributes
    canvas.dataset.scaleX = canvasWidth / img.width;
    canvas.dataset.scaleY = canvasHeight / img.height;

    // Add to DOM
    container.appendChild(canvas);

    const blurControls = modalContent.querySelector('.blur-controls');
    modalContent.insertBefore(container, blurControls);

    // Draw image to canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Clear existing blur regions
    blurRegions = [];

    // Load existing blur regions if any
    if (currentGuide.steps[stepIndex].blurRegions) {
      currentGuide.steps[stepIndex].blurRegions.forEach(region => {
        createBlurRegion(
          region.x,
          region.y,
          region.width,
          region.height
        );
      });
    }
  }

  modalClose.addEventListener('click', function () {
    imageModal.style.display = 'none';
  });

  // Close modal when clicking outside
  window.addEventListener('click', function (event) {
    if (event.target === imageModal) {
      imageModal.style.display = 'none';
    }
  });

  // Blur functionality
  addBlurBtn.addEventListener('click', function () {
    const canvas = document.getElementById('blurCanvas');
    if (!canvas) return;

    // Create a blur region in the center
    const width = 100;
    const height = 100;

    createBlurRegion(
      (canvas.width / 2) - (width / 2),
      (canvas.height / 2) - (height / 2),
      width,
      height
    );

    // Apply blur to canvas
    applyBlursToCanvas(canvas.getContext('2d'));
  });

  removeBlurBtn.addEventListener('click', function () {
    removeAllBlurRegions();

    // Redraw canvas with original image
    const canvas = document.getElementById('blurCanvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImage, 0, 0);
    }
  });

  // Create blur region with proper scaling
  function createBlurRegion(x, y, width, height) {
    const canvas = document.getElementById('blurCanvas');
    if (!canvas) return;

    const container = canvas.parentNode;

    // Get scale factors
    const scaleX = parseFloat(canvas.dataset.scaleX);
    const scaleY = parseFloat(canvas.dataset.scaleY);

    // Create blur region element
    const region = document.createElement('div');
    region.className = 'blur-region';
    region.style.position = 'absolute';

    // Apply scaled dimensions for display
    region.style.width = (width * scaleX) + 'px';
    region.style.height = (height * scaleY) + 'px';
    region.style.left = (x * scaleX) + 'px';
    region.style.top = (y * scaleY) + 'px';

    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'blur-delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Remove this blur region';

    // Create resize handle
    const handle = document.createElement('div');
    handle.className = 'blur-handle';

    region.appendChild(deleteBtn);
    region.appendChild(handle);
    container.appendChild(region);

    // Store original canvas coordinates
    const blurRegion = {
      element: region,
      x: x,
      y: y,
      width: width,
      height: height
    };

    blurRegions.push(blurRegion);

    // Set up event handlers
    setupBlurRegionEvents(region, handle, deleteBtn, canvas, blurRegion);

    // Apply blur to canvas
    applyBlursToCanvas(canvas.getContext('2d'));

    return blurRegion;
  }

  // Updated event handlers for responsive positioning
  function setupBlurRegionEvents(region, handle, deleteBtn, canvas, blurRegion) {
    // Delete button click handler
    deleteBtn.addEventListener('click', function (e) {
      e.stopPropagation();

      // Remove from DOM
      if (region.parentNode) {
        region.parentNode.removeChild(region);
      }

      // Remove from array
      const index = blurRegions.findIndex(r => r === blurRegion);
      if (index !== -1) {
        blurRegions.splice(index, 1);
      }

      // Redraw canvas
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImage, 0, 0);
      applyBlursToCanvas(ctx);
    });

    // Drag functionality
    region.addEventListener('mousedown', function (e) {
      if (e.target === handle || e.target === deleteBtn) return;

      isDragging = true;
      currentBlurRegion = blurRegion;

      const rect = region.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;

      e.preventDefault();
    });

    // Resize functionality
    handle.addEventListener('mousedown', function (e) {
      isResizing = true;
      currentBlurRegion = blurRegion;

      startWidth = parseFloat(region.style.width);
      startHeight = parseFloat(region.style.height);
      startX = e.clientX;
      startY = e.clientY;

      e.preventDefault();
      e.stopPropagation();
    });
  }

  // Mouse move and up events for dragging and resizing
  document.addEventListener('mousemove', function (e) {
    const canvas = document.getElementById('blurCanvas');
    if (!canvas || !currentBlurRegion) return;

    // Get scale factors
    const scaleX = parseFloat(canvas.dataset.scaleX);
    const scaleY = parseFloat(canvas.dataset.scaleY);

    const container = canvas.parentNode;
    const containerRect = container.getBoundingClientRect();

    if (isDragging) {
      // Calculate new position in display coordinates
      let newDisplayX = e.clientX - containerRect.left - startX;
      let newDisplayY = e.clientY - containerRect.top - startY;

      // Constrain to container boundaries
      newDisplayX = Math.max(0, Math.min(newDisplayX, container.clientWidth - parseFloat(currentBlurRegion.element.style.width)));
      newDisplayY = Math.max(0, Math.min(newDisplayY, container.clientHeight - parseFloat(currentBlurRegion.element.style.height)));

      // Update element position (display coordinates)
      currentBlurRegion.element.style.left = newDisplayX + 'px';
      currentBlurRegion.element.style.top = newDisplayY + 'px';

      // Convert to canvas coordinates and update data
      currentBlurRegion.x = newDisplayX / scaleX;
      currentBlurRegion.y = newDisplayY / scaleY;

      // Apply blur in real-time
      applyBlursToCanvas(canvas.getContext('2d'));
    }

    if (isResizing) {
      // Calculate new size in display coordinates
      const newDisplayWidth = Math.max(20, startWidth + (e.clientX - startX));
      const newDisplayHeight = Math.max(20, startHeight + (e.clientY - startY));

      // Constrain to container boundaries
      const maxDisplayWidth = container.clientWidth - parseFloat(currentBlurRegion.element.style.left);
      const maxDisplayHeight = container.clientHeight - parseFloat(currentBlurRegion.element.style.top);

      const constrainedDisplayWidth = Math.min(newDisplayWidth, maxDisplayWidth);
      const constrainedDisplayHeight = Math.min(newDisplayHeight, maxDisplayHeight);

      // Update element size (display coordinates)
      currentBlurRegion.element.style.width = constrainedDisplayWidth + 'px';
      currentBlurRegion.element.style.height = constrainedDisplayHeight + 'px';

      // Convert to canvas coordinates and update data
      currentBlurRegion.width = constrainedDisplayWidth / scaleX;
      currentBlurRegion.height = constrainedDisplayHeight / scaleY;

      // Apply blur in real-time
      applyBlursToCanvas(canvas.getContext('2d'));
    }
  });

  document.addEventListener('mouseup', function () {
    if ((isDragging || isResizing) && currentBlurRegion) {
      // Redraw canvas with updated blur regions
      const canvas = document.getElementById('blurCanvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Redraw original image
        ctx.drawImage(originalImage, 0, 0);
        // Apply blurs
        applyBlursToCanvas(ctx);
      }
    }

    isDragging = false;
    isResizing = false;
    currentBlurRegion = null;
  });

  // Fix blur region positioning
  function createBlurRegion(x, y, width, height) {
    const canvas = document.getElementById('blurCanvas');
    if (!canvas) return;

    // Create canvas container if not exists
    let container = document.querySelector('.canvas-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'canvas-container';
      container.style.position = 'relative';
      canvas.parentNode.insertBefore(container, canvas);
      container.appendChild(canvas);
    }

    // Create visual representation of blur region
    const region = document.createElement('div');
    region.className = 'blur-region';

    // Position relative to the canvas - position directly with pixel values
    region.style.position = 'absolute';
    region.style.width = width + 'px';
    region.style.height = height + 'px';
    region.style.left = x + 'px';
    region.style.top = y + 'px';

    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'blur-delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Remove this blur region';

    // Create resize handle
    const handle = document.createElement('div');
    handle.className = 'blur-handle';

    region.appendChild(deleteBtn);
    region.appendChild(handle);
    container.appendChild(region);

    // Store actual canvas coordinates in the blur regions array
    const blurRegion = {
      element: region,
      x: x,
      y: y,
      width: width,
      height: height
    };

    blurRegions.push(blurRegion);

    // Set up event handlers
    setupBlurRegionEvents(region, handle, deleteBtn, canvas, blurRegion);

    // Apply blur to canvas immediately
    applyBlursToCanvas(canvas.getContext('2d'));

    return blurRegion;
  }

  function removeAllBlurRegions() {
    blurRegions.forEach(region => {
      if (region.element && region.element.parentNode) {
        region.element.parentNode.removeChild(region.element);
      }
    });
    blurRegions = [];
  }

  // Apply blurs to canvas
  function applyBlursToCanvas(ctx) {
    if (!ctx || blurRegions.length === 0) return;

    const canvas = ctx.canvas;

    // First clear and redraw original image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImage, 0, 0);

    // For each blur region, apply a blur filter
    blurRegions.forEach(region => {
      // Get the image data for this region using original coordinates
      const imageData = ctx.getImageData(region.x, region.y, region.width, region.height);

      // Create a temporary canvas for blurring
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = region.width;
      tempCanvas.height = region.height;
      const tempCtx = tempCanvas.getContext('2d');

      // Draw the region to the temp canvas
      tempCtx.putImageData(imageData, 0, 0);

      // Apply blur using a multi-pass box blur
      for (let i = 0; i < 3; i++) {
        tempCtx.filter = 'blur(5px)';
        tempCtx.drawImage(tempCanvas, 0, 0);
      }

      // Draw the blurred region back to the main canvas
      ctx.filter = 'none';
      ctx.drawImage(tempCanvas, region.x, region.y);
    });
  }

  // Save blurred image
  saveBlurredImageBtn.addEventListener('click', function () {
    const canvas = document.getElementById('blurCanvas');
    if (!canvas || currentStepIndex === null) return;

    try {
      // Save blur regions data
      const regionsData = blurRegions.map(region => ({
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height
      }));

      // Save the blurred image as data URL
      const blurredImageDataUrl = canvas.toDataURL('image/png');

      // Update guide with blur regions and blurred image
      currentGuide.steps[currentStepIndex].blurRegions = regionsData;
      currentGuide.steps[currentStepIndex].blurredScreenshot = blurredImageDataUrl;

      // Save to storage
      chrome.storage.local.set({ [guideId]: currentGuide }, function () {
        // Update the image in the guide view
        const stepImage = document.querySelector(`.step-image[data-step="${currentStepIndex}"]`);
        if (stepImage) {
          stepImage.src = blurredImageDataUrl;
        }

        Swal.fire({
          title: 'Saved!',
          text: 'Blur Regions Applied Successfully',
          icon: 'success',
        });
      });
    } catch (error) {
      console.error('Error saving blurred image:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to save blurred image. Error: ' + error.message,
        icon: 'error'
      });
    }
  });

  function getStepDescription(step, stepNumber) {
    // Use custom description if available
    if (step.customDescription) {
      return step.customDescription;
    }

    const element = step.elementInfo;
    let description = '';

    if (element.tagName === 'a') {
      description = `Click on the link "${element.text || element.attributes.href}"`;
    } else if (element.tagName === 'button') {
      description = `Click on the button "${element.text || 'Button'}"`;
    } else if (element.tagName === 'input') {
      if (element.attributes.type === 'submit') {
        description = `Click the submit button "${element.attributes.value || 'Submit'}"`;
      } else if (element.attributes.type === 'button') {
        description = `Click the button "${element.attributes.value || 'Button'}"`;
      } else {
        description = `Click on the ${element.attributes.type || 'input'} field`;
      }
    } else if (element.tagName === 'select') {
      description = `Click on the dropdown menu`;
    } else if (element.tagName === 'option') {
      description = `Select the option "${element.text}"`;
    } else if (element.tagName === 'img') {
      description = `Click on the image${element.attributes.alt ? ` (${element.attributes.alt})` : ''}`;
    } else if (element.text) {
      description = `Click on "${element.text.substring(0, 50)}${element.text.length > 50 ? '...' : ''}"`;
    } else {
      description = `Click on the ${element.tagName} element`;
    }

    return description;
  }

  // Export as PDF
  exportPdfBtn.addEventListener('click', function () {
    window.print();
  });

  // Export as HTML
  exportHtmlBtn.addEventListener('click', function () {
    // Get guide data and generate HTML
    const htmlContent = generateHtmlContent(currentGuide);

    // Create download link
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentGuide.name.replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();

    // Clean up
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  });

  function generateHtmlContent(guide) {
    let stepsHtml = '';

    guide.steps.forEach((step, index) => {
      const stepNumber = index + 1;

      // Format URL for display
      const url = new URL(step.url);
      const displayUrl = `${url.hostname}${url.pathname}`;

      // Use custom description if available
      const description = step.customDescription || getStepDescription(step, stepNumber);

      // Use blurred image if available
      const imageSrc = step.blurredScreenshot || step.screenshot;

      stepsHtml += `
        <div class="step">
          <div class="step-header">
            <div class="step-number">Step ${stepNumber}</div>
            <div class="step-location">${step.title} (${displayUrl})</div>
          </div>
          <div class="step-content">
            <div class="step-details">
              <div class="step-description">
                ${description}
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
                <img src="${imageSrc}" alt="Screenshot of step ${stepNumber}">
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${guide.name}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
          }
          
          .container {
            max-width: 900px;
            margin: 0 auto;
          }
          
          h1 {
            color: #1a73e8;
            margin-bottom: 30px;
          }
          
          .step {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          }
          
          .step-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
          }
          
          .step-number {
            font-size: 18px;
            font-weight: bold;
            color: #1a73e8;
          }
          
          .step-location {
            font-size: 14px;
            color: #666;
          }
          
          .step-content {
            display: flex;
            gap: 20px;
            align-items: flex-start;
          }
          
          .step-details {
            flex: 1;
          }
          
          .step-description {
            margin-bottom: 10px;
            font-size: 16px;
          }
          
          .step-element-info {
            background-color: #f8f8f8;
            padding: 10px;
            border-radius: 4px;
            font-size: 14px;
          }
          
          .step-screenshot {
            flex: 1;
            max-width: 50%;
          }
          
          .step-screenshot img {
            max-width: 100%;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          
          @media print {
            body {
              background-color: white;
            }
            
            .step {
              break-inside: avoid;
              box-shadow: none;
              border: 1px solid #eee;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${guide.name}</h1>
          ${stepsHtml}
        </div>
      </body>
      </html>
    `;
  }
});