// utils.js
export default {
    getStepDescription(step, stepNumber) {
      if (step.customDescription) return step.customDescription;
  
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
  };