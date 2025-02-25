document.addEventListener('DOMContentLoaded', function() {
    const guideTitle = document.getElementById('guide-title');
    const guideContent = document.getElementById('guide-content');
    const exportPdfBtn = document.getElementById('export-pdf');
    const exportHtmlBtn = document.getElementById('export-html');
    
    // Get guide ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const guideId = urlParams.get('id');
    
    if (!guideId) {
      guideContent.innerHTML = '<div class="error">Guide ID not provided</div>';
      return;
    }
    
    // Load guide data
    chrome.storage.local.get([guideId], function(data) {
      if (!data[guideId]) {
        guideContent.innerHTML = '<div class="error">Guide not found</div>';
        return;
      }
      
      const guide = data[guideId];
      
      // Update title
      guideTitle.textContent = guide.name;
      
      // Render steps
      renderGuide(guide);
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
        
        const stepNumber = index + 1;
        
        // Format URL for display
        const url = new URL(step.url);
        const displayUrl = `${url.hostname}${url.pathname}`;
        
        stepElement.innerHTML = `
          <div class="step-header">
            <div class="step-number">Step ${stepNumber}</div>
            <div class="step-location">${step.title} (${displayUrl})</div>
          </div>
          <div class="step-content">
            <div class="step-details">
              <div class="step-description">
                ${getStepDescription(step, stepNumber)}
              </div>
              <div class="step-element-info">
                <strong>Element:</strong> ${step.elementInfo.tagName}
                ${step.elementInfo.attributes.id ? `<br><strong>ID:</strong> ${step.elementInfo.attributes.id}` : ''}
                ${step.elementInfo.attributes.class ? `<br><strong>Class:</strong> ${step.elementInfo.attributes.class}` : ''}
                ${step.elementInfo.text ? `<br><strong>Text:</strong> "${step.elementInfo.text.substring(0, 100)}${step.elementInfo.text.length > 100 ? '...' : ''}"` : ''}
              </div>
            </div>
            ${step.screenshot ? `
              <div class="step-screenshot">
                <img src="${step.screenshot}" alt="Screenshot of step ${stepNumber}">
              </div>
            ` : ''}
          </div>
        `;
        
        guideContent.appendChild(stepElement);
      });
    }
    
    function getStepDescription(step, stepNumber) {
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
    
    // Logger utility
    function log(message, level = 'info') {
      console[level](`[Guide] ${message}`);
    }
    
    // Export as PDF
    exportPdfBtn.addEventListener('click', function() {
      log('Exporting guide as PDF.');
      window.print();
    });
    
    // Export as HTML
    exportHtmlBtn.addEventListener('click', function() {
      // Get guide data
      chrome.storage.local.get([guideId], function(data) {
        if (!data[guideId]) return;
        
        const guide = data[guideId];
        
        // Create HTML content
        const htmlContent = generateHtmlContent(guide);
        
        // Create download link
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${guide.name.replace(/\s+/g, '-').toLowerCase()}.html`;
        a.click();
        
        // Clean up
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);
      });
    });
    
    function generateHtmlContent(guide) {
      let stepsHtml = '';
      
      guide.steps.forEach((step, index) => {
        const stepNumber = index + 1;
        
        // Format URL for display
        const url = new URL(step.url);
        const displayUrl = `${url.hostname}${url.pathname}`;
        
        stepsHtml += `
          <div class="step">
            <div class="step-header">
              <div class="step-number">Step ${stepNumber}</div>
              <div class="step-location">${step.title} (${displayUrl})</div>
            </div>
            <div class="step-content">
              <div class="step-details">
                <div class="step-description">
                  ${getStepDescription(step, stepNumber)}
                </div>
                <div class="step-element-info">
                  <strong>Element:</strong> ${step.elementInfo.tagName}
                  ${step.elementInfo.attributes.id ? `<br><strong>ID:</strong> ${step.elementInfo.attributes.id}` : ''}
                  ${step.elementInfo.attributes.class ? `<br><strong>Class:</strong> ${step.elementInfo.attributes.class}` : ''}
                  ${step.elementInfo.text ? `<br><strong>Text:</strong> "${step.elementInfo.text.substring(0, 100)}${step.elementInfo.text.length > 100 ? '...' : ''}"` : ''}
                </div>
              </div>
              ${step.screenshot ? `
                <div class="step-screenshot">
                  <img src="${step.screenshot}" alt="Screenshot of step ${stepNumber}">
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