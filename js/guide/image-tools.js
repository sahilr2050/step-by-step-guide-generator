// image-tools.js
import Store from './store.js';
import Core from './core.js';

export default {
  openImageModal(imgSrc, stepIndex) {
    Store.currentStepIndex = stepIndex;
    Store.originalImage = new Image();
    
    Store.originalImage.onload = () => {
      this.setupImageEditor(Store.originalImage, stepIndex);
    };
    
    Store.originalImage.src = imgSrc;
    Store.imageModal.style.display = 'block';
  },

  setupImageEditor(img, stepIndex) {
    const oldCanvas = document.getElementById('blurCanvas');
    if (oldCanvas) oldCanvas.remove();
    
    const oldContainer = document.querySelector('.canvas-container');
    if (oldContainer) oldContainer.remove();
    
    const container = document.createElement('div');
    container.className = 'canvas-container';
    container.style.position = 'relative';
    container.style.margin = '0 auto';
    
    const modalContent = Store.imageModal.querySelector('.modal-content');
    const maxWidth = modalContent.clientWidth - 40;
    
    let canvasWidth = img.width;
    let canvasHeight = img.height;
    const aspectRatio = img.width / img.height;
    
    if (canvasWidth > maxWidth) {
      canvasWidth = maxWidth;
      canvasHeight = canvasWidth / aspectRatio;
    }
    
    container.style.width = canvasWidth + 'px';
    container.style.height = canvasHeight + 'px';
    
    const canvas = document.createElement('canvas');
    canvas.id = 'blurCanvas';
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    
    canvas.dataset.scaleX = canvasWidth / img.width;
    canvas.dataset.scaleY = canvasHeight / img.height;
    
    container.appendChild(canvas);
    
    const blurControls = modalContent.querySelector('.blur-controls');
    modalContent.insertBefore(container, blurControls);
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    Store.blurRegions = [];
    
    if (Store.currentGuide.steps[stepIndex].blurRegions) {
      Store.currentGuide.steps[stepIndex].blurRegions.forEach(region => {
        this.createBlurRegion(region.x, region.y, region.width, region.height);
      });
    }
  },

  addBlurRegion() {
    const canvas = document.getElementById('blurCanvas');
    if (!canvas) return;
    
    const width = 100;
    const height = 100;
    
    this.createBlurRegion(
      (canvas.width / 2) - (width / 2),
      (canvas.height / 2) - (height / 2),
      width, height
    );
  },

  createBlurRegion(x, y, width, height) {
    const canvas = document.getElementById('blurCanvas');
    if (!canvas) return;
    
    const container = canvas.parentNode;
    const scaleX = parseFloat(canvas.dataset.scaleX);
    const scaleY = parseFloat(canvas.dataset.scaleY);
    
    const region = document.createElement('div');
    region.className = 'blur-region';
    region.style.position = 'absolute';
    region.style.width = (width * scaleX) + 'px';
    region.style.height = (height * scaleY) + 'px';
    region.style.left = (x * scaleX) + 'px';
    region.style.top = (y * scaleY) + 'px';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'blur-delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Remove this blur region';
    
    const handle = document.createElement('div');
    handle.className = 'blur-handle';
    
    region.appendChild(deleteBtn);
    region.appendChild(handle);
    container.appendChild(region);
    
    const blurRegion = {
      element: region,
      x, y, width, height
    };
    
    Store.blurRegions.push(blurRegion);
    this.setupBlurRegionEvents(region, handle, deleteBtn, canvas, blurRegion);
    this.applyBlursToCanvas(canvas.getContext('2d'));
    
    return blurRegion;
  },

  setupBlurRegionEvents(region, handle, deleteBtn, canvas, blurRegion) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      if (region.parentNode) {
        region.parentNode.removeChild(region);
      }
      
      const index = Store.blurRegions.findIndex(r => r === blurRegion);
      if (index !== -1) {
        Store.blurRegions.splice(index, 1);
      }
      
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(Store.originalImage, 0, 0);
      this.applyBlursToCanvas(ctx);
    });
    
    region.addEventListener('mousedown', (e) => {
      if (e.target === handle || e.target === deleteBtn) return;
      
      Store.isDragging = true;
      Store.currentBlurRegion = blurRegion;
      
      const rect = region.getBoundingClientRect();
      Store.startX = e.clientX - rect.left;
      Store.startY = e.clientY - rect.top;
      
      e.preventDefault();
    });
    
    handle.addEventListener('mousedown', (e) => {
      Store.isResizing = true;
      Store.currentBlurRegion = blurRegion;
      
      Store.startWidth = parseFloat(region.style.width);
      Store.startHeight = parseFloat(region.style.height);
      Store.startX = e.clientX;
      Store.startY = e.clientY;
      
      e.preventDefault();
      e.stopPropagation();
    });
  },

  handleMouseMove(e) {
    const canvas = document.getElementById('blurCanvas');
    if (!canvas || !Store.currentBlurRegion) return;
    
    const scaleX = parseFloat(canvas.dataset.scaleX);
    const scaleY = parseFloat(canvas.dataset.scaleY);
    
    const container = canvas.parentNode;
    const containerRect = container.getBoundingClientRect();
    
    if (Store.isDragging) {
      let newDisplayX = e.clientX - containerRect.left - Store.startX;
      let newDisplayY = e.clientY - containerRect.top - Store.startY;
      
      newDisplayX = Math.max(0, Math.min(newDisplayX, container.clientWidth - parseFloat(Store.currentBlurRegion.element.style.width)));
      newDisplayY = Math.max(0, Math.min(newDisplayY, container.clientHeight - parseFloat(Store.currentBlurRegion.element.style.height)));
      
      Store.currentBlurRegion.element.style.left = newDisplayX + 'px';
      Store.currentBlurRegion.element.style.top = newDisplayY + 'px';
      
      Store.currentBlurRegion.x = newDisplayX / scaleX;
      Store.currentBlurRegion.y = newDisplayY / scaleY;
      
      this.applyBlursToCanvas(canvas.getContext('2d'));
    }
    
    if (Store.isResizing) {
      const newDisplayWidth = Math.max(20, Store.startWidth + (e.clientX - Store.startX));
      const newDisplayHeight = Math.max(20, Store.startHeight + (e.clientY - Store.startY));
      
      const maxDisplayWidth = container.clientWidth - parseFloat(Store.currentBlurRegion.element.style.left);
      const maxDisplayHeight = container.clientHeight - parseFloat(Store.currentBlurRegion.element.style.top);
      
      const constrainedDisplayWidth = Math.min(newDisplayWidth, maxDisplayWidth);
      const constrainedDisplayHeight = Math.min(newDisplayHeight, maxDisplayHeight);
      
      Store.currentBlurRegion.element.style.width = constrainedDisplayWidth + 'px';
      Store.currentBlurRegion.element.style.height = constrainedDisplayHeight + 'px';
      
      Store.currentBlurRegion.width = constrainedDisplayWidth / scaleX;
      Store.currentBlurRegion.height = constrainedDisplayHeight / scaleY;
      
      this.applyBlursToCanvas(canvas.getContext('2d'));
    }
  },

  handleMouseUp() {
    if ((Store.isDragging || Store.isResizing) && Store.currentBlurRegion) {
      const canvas = document.getElementById('blurCanvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(Store.originalImage, 0, 0);
        this.applyBlursToCanvas(ctx);
      }
    }
    
    Store.isDragging = false;
    Store.isResizing = false;
    Store.currentBlurRegion = null;
  },

  removeAllBlurRegions() {
    Store.blurRegions.forEach(region => {
      if (region.element && region.element.parentNode) {
        region.element.parentNode.removeChild(region.element);
      }
    });
    Store.blurRegions = [];
    
    const canvas = document.getElementById('blurCanvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(Store.originalImage, 0, 0);
    }
  },

  applyBlursToCanvas(ctx) {
    if (!ctx || Store.blurRegions.length === 0) return;
    
    const canvas = ctx.canvas;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(Store.originalImage, 0, 0);
    
    Store.blurRegions.forEach(region => {
      const imageData = ctx.getImageData(region.x, region.y, region.width, region.height);
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = region.width;
      tempCanvas.height = region.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      tempCtx.putImageData(imageData, 0, 0);
      
      for (let i = 0; i < 3; i++) {
        tempCtx.filter = 'blur(5px)';
        tempCtx.drawImage(tempCanvas, 0, 0);
      }
      
      ctx.filter = 'none';
      ctx.drawImage(tempCanvas, region.x, region.y);
    });
  },

  saveBlurredImage() {
    const canvas = document.getElementById('blurCanvas');
    if (!canvas || Store.currentStepIndex === null) return;
    
    try {
      const regionsData = Store.blurRegions.map(region => ({
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height
      }));
      
      const blurredImageDataUrl = canvas.toDataURL('image/png');
      
      Store.currentGuide.steps[Store.currentStepIndex].blurRegions = regionsData;
      Store.currentGuide.steps[Store.currentStepIndex].blurredScreenshot = blurredImageDataUrl;
      
      Core.saveGuideData(() => {
        const stepImage = document.querySelector(`.step-image[data-step="${Store.currentStepIndex}"]`);
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
  },

  downloadImage(stepIndex) {
    const step = Store.currentGuide.steps[stepIndex];
    const imageSrc = step.blurredScreenshot || step.screenshot;
    
    if (!imageSrc) {
      alert('No image available to download');
      return;
    }
    
    const a = document.createElement('a');
    a.href = imageSrc;
    a.download = `step-${stepIndex + 1}-${Store.currentGuide.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};