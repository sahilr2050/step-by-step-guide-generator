export default {
    // Export the current guide to Markdown
    exportToMarkdown(guide) {
      let markdown = `# ${guide.name}\n\n`;
      markdown += `*Created: ${new Date(guide.dateCreated).toLocaleDateString()}*\n\n`;
      
      if (!guide.steps || guide.steps.length === 0) {
        markdown += "*No steps recorded in this guide*\n";
        return markdown;
      }
      
      guide.steps.forEach((step, index) => {
        markdown += `## Step ${index + 1}\n\n`;
        
        // Add description
        if (step.customDescription) {
          markdown += `${step.customDescription}\n\n`;
        } else {
          // Generate description from element info
          const elementInfo = step.elementInfo;
          let description = '';
          
          if (elementInfo.tagName === 'a') {
            description = `Click on the link "${elementInfo.text || elementInfo.attributes.href}"`;
          } else if (elementInfo.tagName === 'button') {
            description = `Click on the button "${elementInfo.text || 'Button'}"`;
          } else if (elementInfo.text) {
            description = `Click on "${elementInfo.text.substring(0, 50)}${elementInfo.text.length > 50 ? '...' : ''}"`;
          } else {
            description = `Click on the ${elementInfo.tagName} element`;
          }
          
          markdown += `${description}\n\n`;
        }
        
        // Add URL and page title
        if (step.url) {
          markdown += `**URL:** ${step.url}\n\n`;
        }
        
        if (step.title) {
          markdown += `**Page Title:** ${step.title}\n\n`;
        }
        
        // Add screenshot if available
        const imageSrc = step.blurredScreenshot || step.screenshot;
        if (imageSrc) {
          const imgName = `step-${index + 1}-screenshot.png`;
          markdown += `![Screenshot for Step ${index + 1}](${imgName})\n\n`;
        }
        
        markdown += "---\n\n";
      });
      
      return markdown;
    },
    
    // Export to Confluence
    exportToConfluence(guide) {
      // This would be implemented using Confluence's REST API
      // For now, we'll just show how to construct the data for export
      
      const confluenceData = {
        title: guide.name,
        space: { key: 'DOC' }, // This would be configurable
        content: this.exportToMarkdown(guide), // Convert to Confluence storage format
        metadata: {
          properties: {
            'content-appearance-draft': {
              value: 'full-width'
            }
          }
        }
      };
      
      // In a real implementation, you would make an API call to Confluence
      console.log('Confluence export data prepared:', confluenceData);
      return confluenceData;
    },
    
    // Export to Notion
    exportToNotion(guide) {
      // This would use Notion's API to create a new page
      // For now, we'll just prepare the data structure
      
      const notionBlocks = [];
      
      // Add title
      notionBlocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: {
          text: [{ type: 'text', text: { content: guide.name } }]
        }
      });
      
      // Add creation date
      notionBlocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          text: [{ 
            type: 'text', 
            text: { content: `Created: ${new Date(guide.dateCreated).toLocaleDateString()}` },
            annotations: { italic: true }
          }]
        }
      });
      
      // Add steps
      if (guide.steps && guide.steps.length > 0) {
        guide.steps.forEach((step, index) => {
          // Step header
          notionBlocks.push({
            object: 'block',
            type: 'heading_2',
            heading_2: {
              text: [{ type: 'text', text: { content: `Step ${index + 1}` } }]
            }
          });
          
          // Step description
          const description = step.customDescription || this.generateStepDescription(step);
          notionBlocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              text: [{ type: 'text', text: { content: description } }]
            }
          });
          
          // Add URL and title
          if (step.url || step.title) {
            const details = [];
            if (step.url) details.push(`URL: ${step.url}`);
            if (step.title) details.push(`Page Title: ${step.title}`);
            
            notionBlocks.push({
              object: 'block',
              type: 'paragraph',
              paragraph: {
                text: [{ 
                  type: 'text', 
                  text: { content: details.join('\n') },
                  annotations: { code: true }
                }]
              }
            });
          }
          
          // Add image if available
          const imageSrc = step.blurredScreenshot || step.screenshot;
          if (imageSrc) {
            // In a real implementation, you would upload this image to Notion
            notionBlocks.push({
              object: 'block',
              type: 'image',
              image: {
                type: 'external',
                external: {
                  url: 'https://placeholder.com/400x300' // Placeholder since we can't upload in this mock
                }
              }
            });
          }
          
          // Add divider
          notionBlocks.push({
            object: 'block',
            type: 'divider',
            divider: {}
          });
        });
      } else {
        notionBlocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            text: [{ 
              type: 'text', 
              text: { content: 'No steps recorded in this guide' },
              annotations: { italic: true }
            }]
          }
        });
      }
      
      // In a real implementation, you would make an API call to Notion
      console.log('Notion export data prepared:', notionBlocks);
      return notionBlocks;
    },
    
    // Helper method to generate step description from element info
    generateStepDescription(step) {
      const elementInfo = step.elementInfo;
      
      if (elementInfo.tagName === 'a') {
        return `Click on the link "${elementInfo.text || elementInfo.attributes.href}"`;
      } else if (elementInfo.tagName === 'button') {
        return `Click on the button "${elementInfo.text || 'Button'}"`;
      } else if (elementInfo.tagName === 'input') {
        if (elementInfo.attributes.type === 'submit') {
          return `Click the submit button "${elementInfo.attributes.value || 'Submit'}"`;
        } else if (elementInfo.attributes.type === 'button') {
          return `Click the button "${elementInfo.attributes.value || 'Button'}"`;
        } else {
          return `Click on the ${elementInfo.attributes.type || 'input'} field`;
        }
      } else if (elementInfo.text) {
        return `Click on "${elementInfo.text.substring(0, 50)}${elementInfo.text.length > 50 ? '...' : ''}"`;
      } else {
        return `Click on the ${elementInfo.tagName} element`;
      }
    },
    
    // Download the markdown as a file
    downloadMarkdown(guide) {
      const markdown = this.exportToMarkdown(guide);
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${guide.name.replace(/\s+/g, '-').toLowerCase()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };