import StorageManager from '../storage-manager.js';

// Export markdown with co-located images (downloads images as files and references them locally)
async function exportToMarkdownWithImages(guide) {
  // Ensure JSZip is available
  const JSZip = window.JSZip;
  if (!JSZip) {
    Swal.fire({ title: 'Zip Export Unavailable', text: 'JSZip is not loaded. Please add jszip.min.js to the extension.', icon: 'error' });
    return;
  }
  let markdown = `# ${guide.name}\n\n`;
  markdown += `*Created: ${new Date(guide.dateCreated).toLocaleDateString()}*\n\n`;
  const images = [];
  if (!guide.steps || guide.steps.length === 0) {
    markdown += "*No steps recorded in this guide*\n";
  } else {
    for (let index = 0; index < guide.steps.length; index++) {
      const step = guide.steps[index];
      markdown += `## Step ${index + 1}\n\n`;
      if (step.customDescription) {
        markdown += `${step.customDescription}\n\n`;
      } else {
        const elementInfo = step.elementInfo;
        let description = "";
        if (elementInfo.tagName === "a") {
          description = `Click on the link \"${elementInfo.text || elementInfo.attributes.href}\"`;
        } else if (elementInfo.tagName === "button") {
          description = `Click on the button \"${elementInfo.text || "Button"}\"`;
        } else if (elementInfo.text) {
          description = `Click on \"${elementInfo.text.substring(0, 50)}${elementInfo.text.length > 50 ? "..." : ""}\"`;
        } else {
          description = `Click on the ${elementInfo.tagName} element`;
        }
        markdown += `${description}\n\n`;
      }
      if (step.title) {
        markdown += `**Page Title:** ${step.title}\n\n`;
      }
      let imageSrc = step.blurredScreenshot || step.screenshot;
      if (!imageSrc && (step.blurredScreenshotKey || step.screenshotKey)) {
        imageSrc = await StorageManager.getScreenshot(step.blurredScreenshotKey || step.screenshotKey);
      }
      if (imageSrc) {
        const imgName = `step-${index + 1}-screenshot.png`;
        markdown += `![Screenshot for Step ${index + 1}](images/${imgName})\n\n`;
        images.push({ name: imgName, dataUrl: imageSrc });
      }
      markdown += "---\n\n";
    }
  }
  // Create zip
  const zip = new JSZip();
  zip.file(`${guide.name.replace(/\s+/g, "-").toLowerCase()}.md`, markdown);
  const imgFolder = zip.folder('images');
  for (const img of images) {
    // Convert dataUrl to base64
    const base64 = img.dataUrl.split(',')[1];
    imgFolder.file(img.name, base64, { base64: true });
  }
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${guide.name.replace(/\s+/g, "-").toLowerCase()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default {
  exportToMarkdownWithImages,
  // Export the current guide to PDF
  async exportToPDF(guide) {
    // Create a temporary container for rendering the guide as HTML
    const container = document.createElement('div');
    container.style.padding = '24px';
    container.style.fontFamily = 'Arial, sans-serif';
    // Add global CSS to avoid page breaks inside any block
    const style = document.createElement('style');
    style.innerHTML = `
      h1, h2, h3, p, div, img {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      hr { page-break-after: avoid !important; break-after: avoid !important; }
      .pdf-page-break { page-break-before: always !important; break-before: always !important; }
    `;
    container.appendChild(style);
    container.innerHTML += `<h1 style="page-break-inside:avoid;">${guide.name}</h1><p style="page-break-inside:avoid;"><em>Created: ${new Date(guide.dateCreated).toLocaleDateString()}</em></p>`;
    if (!guide.steps || guide.steps.length === 0) {
      container.innerHTML += '<p><em>No steps recorded in this guide</em></p>';
    } else {
      for (let index = 0; index < guide.steps.length; index++) {
        const step = guide.steps[index];
        if (index !== 0) {
          container.innerHTML += '<div class="pdf-page-break"></div>';
        }
        container.innerHTML += `<h2>Step ${index + 1}</h2>`;
        const desc = step.customDescription || (step.elementInfo && step.elementInfo.text) || '';
        container.innerHTML += `<p>${desc}</p>`;
          if (step.title) container.innerHTML += `<p><strong>Page Title:</strong> ${step.title}</p>`;
        let imageSrc = step.blurredScreenshot || step.screenshot;
        // Try to fetch from IndexedDB if only keys are present
        if (!imageSrc && (step.blurredScreenshotKey || step.screenshotKey)) {
          imageSrc = await this._getImageFromIndexedDB(step.blurredScreenshotKey || step.screenshotKey);
        }
        if (imageSrc) {
          container.innerHTML += `<div style="page-break-inside:avoid; break-inside:avoid; text-align:center;"><img src="${imageSrc}" alt="Step ${index + 1} Screenshot" style="max-width:100%;margin:12px 0;display:block;page-break-inside:avoid;break-inside:avoid;"/></div>`;
        }
        container.innerHTML += '<hr style="page-break-after:avoid;break-after:avoid;"/>';
      }
    }
    this.downloadPDF(container, guide);
  },

  // Helper to fetch image from IndexedDB for PDF/Confluence
  async _getImageFromIndexedDB(key) {
    if (!key) return null;
    try {
      return await StorageManager.getScreenshot(key);
    } catch (e) {
      return null;
    }
  },

  // Helper to convert any image to PNG base64
  async _convertToPngBase64(dataUrl) {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'Anonymous';
      img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.src = dataUrl;
    });
  },

  // Download the rendered HTML as PDF
  downloadPDF(container, guide) {
    // Use html2pdf.js (should be included in the extension libs)
    // If not available, show error
    if (typeof html2pdf === 'undefined') {
      Swal.fire({
        title: 'PDF Export Unavailable',
        text: 'html2pdf.js is not loaded. Please add html2pdf.js to the extension.',
        icon: 'error'
      });
      return;
    }
    document.body.appendChild(container);
    html2pdf()
      .from(container)
      .set({
        margin: 0.5,
        filename: `${guide.name.replace(/\s+/g, "-").toLowerCase()}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'avoid-all'], before: '.pdf-page-break' }
      })
      .save()
      .then(() => {
        document.body.removeChild(container);
      })
      .catch((err) => {
        document.body.removeChild(container);
        Swal.fire({ title: 'PDF Export Failed', text: err.message, icon: 'error' });
      });
  },

  // Export the current guide to Markdown
  exportToMarkdown(guide) {
    let markdown = `# ${guide.name}\n\n`;
    markdown += `*Created: ${new Date(
      guide.dateCreated
    ).toLocaleDateString()}*\n\n`;

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
        let description = "";

        if (elementInfo.tagName === "a") {
          description = `Click on the link "${
            elementInfo.text || elementInfo.attributes.href
          }"`;
        } else if (elementInfo.tagName === "button") {
          description = `Click on the button "${elementInfo.text || "Button"}"`;
        } else if (elementInfo.text) {
          description = `Click on "${elementInfo.text.substring(0, 50)}${
            elementInfo.text.length > 50 ? "..." : ""
          }"`;
        } else {
          description = `Click on the ${elementInfo.tagName} element`;
        }

        markdown += `${description}\n\n`;
      }

      // Add URL and page title

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

  // Export to Confluence (with attachment upload and proper XHTML storage format)
  async exportToConfluence(guide) {
    return new Promise(async (resolve, reject) => {
      // First, we need to convert the markdown to Confluence's storage format
      const markdown = this.exportToMarkdown(guide);

      // Show configuration modal to get Confluence details
      Swal.fire({
        title: "Configure Confluence Export",
        html: `
        <div class="swal2-input-group">
          <input id="confluence-url" class="swal2-input" placeholder="Confluence URL (e.g., https://your-domain.atlassian.net/wiki)" value="https://fake-url.atlassian.net/wiki">
          <input id="confluence-username" class="swal2-input" placeholder="Email/Username" value="fakeuser@example.com">
          <input id="confluence-api-token" class="swal2-input" type="password" placeholder="API Token" value="fake-api-token">
          <input id="confluence-space-key" class="swal2-input" placeholder="Space Key (e.g., DOC)" value="FAKEKEY">
        </div>
      `,
        showCancelButton: true,
        confirmButtonText: "Export",
        showLoaderOnConfirm: true,
        preConfirm: () => {
          const url = document.getElementById("confluence-url").value;
          const username = document.getElementById("confluence-username").value;
          const apiToken = document.getElementById(
            "confluence-api-token"
          ).value;
          const spaceKey = document.getElementById(
            "confluence-space-key"
          ).value;

          if (!url || !username || !apiToken || !spaceKey) {
            Swal.showValidationMessage("All fields are required");
            return false;
          }

          return { url, username, apiToken, spaceKey };
        },
      }).then(async (result) => {
        if (result.isConfirmed) {
          const { url, username, apiToken, spaceKey } = result.value;

          // Step 1: Gather images to upload as attachments
          const imagesToUpload = [];
          for (let idx = 0; idx < (guide.steps || []).length; idx++) {
            const step = guide.steps[idx];
            let imageSrc = step.blurredScreenshot || step.screenshot;
            // Try to fetch from IndexedDB if only keys are present
            if (!imageSrc && (step.blurredScreenshotKey || step.screenshotKey)) {
              imageSrc = await this._getImageFromIndexedDB(step.blurredScreenshotKey || step.screenshotKey);
            }
            if (imageSrc && imageSrc.startsWith('data:image/')) {
              // Always use PNG for Confluence
              let base64data = imageSrc.split(',')[1];
              let mime = 'image/png';
              let name = `step-${idx + 1}-screenshot.png`;
              // If not PNG, convert to PNG via canvas
              if (!imageSrc.startsWith('data:image/png')) {
                base64data = await this._convertToPngBase64(imageSrc);
              }
              imagesToUpload.push({
                name,
                data: base64data,
                mime
              });
            }
          }

          // Step 2: Upload images as attachments (after page creation)
          // We'll create the page first, then upload attachments and update the page body
          const confluenceContent = this.markdownToConfluenceXHTML(guide, imagesToUpload.map(img => img.name));
          const confluenceData = {
            type: "page",
            title: guide.name + "_" + Date.now(),
            space: { key: spaceKey },
            body: {
              storage: {
                value: confluenceContent,
                representation: "storage",
              },
            },
            metadata: {
              properties: {
                "content-appearance-draft": {
                  value: "full-width",
                },
              },
            },
          };
          const authHeader = "Basic " + btoa(`${username}:${apiToken}`);
          const apiUrl = `${url}/rest/api/content`;

          fetch(apiUrl, {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(confluenceData),
          })
            .then((response) => {
              if (!response.ok) {
                return response.text().then((text) => {
                  throw new Error(
                    `Confluence API error: ${response.status} - ${text}`
                  );
                });
              }
              return response.json();
            })
            .then(async (data) => {
              // Step 3: Upload all images as attachments
              if (imagesToUpload.length > 0 && data.id) {
                for (const img of imagesToUpload) {
                  try {
                    await fetch(`${url}/rest/api/content/${data.id}/child/attachment`, {
                      method: "POST",
                      headers: {
                        Authorization: authHeader,
                        "X-Atlassian-Token": "no-check"
                      },
                      body: this._makeAttachmentForm(img)
                    });
                  } catch (err) {
                    console.error('Attachment upload failed:', err);
                  }
                }
                // Step 4: Update the page body with images (since they are now uploaded)
                const updatedBody = this.markdownToConfluenceXHTML(guide, imagesToUpload.map(img => img.name));
                await fetch(`${url}/rest/api/content/${data.id}`, {
                  method: "PUT",
                  headers: {
                    Authorization: authHeader,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                  },
                  body: JSON.stringify({
                    id: data.id,
                    type: "page",
                    title: confluenceData.title,
                    version: { number: data.version.number + 1 },
                    body: { storage: { value: updatedBody, representation: "storage" } }
                  })
                });
              }
              Swal.fire({
                title: "Guide Exported!",
                html: `Your guide has been exported to Confluence.<br><a href="${data._links.base}${data._links.webui}" target="_blank">View in Confluence</a>`,
                icon: "success",
              });
              resolve(data);
            })
            .catch((error) => {
              console.error("Error exporting to Confluence:", error);
              Swal.fire({
                title: "Export Failed",
                text:
                  error.message ||
                  "Failed to export to Confluence. Check your credentials and try again.",
                icon: "error",
              });
              reject(error);
            });
        } else {
          // User cancelled the dialog
          resolve(null);
        }
      });
    });
  },

  // Helper method to convert markdown to Confluence XHTML storage format (with image references)
  markdownToConfluenceXHTML(guide, imageNames) {
    let content = `<h1>${guide.name}</h1>`;
    content += `<p><em>Created: ${new Date(guide.dateCreated).toLocaleDateString()}</em></p>`;
    if (!guide.steps || guide.steps.length === 0) {
      content += '<p><em>No steps recorded in this guide</em></p>';
    } else {
      guide.steps.forEach((step, idx) => {
        content += `<h2>Step ${idx + 1}</h2>`;
        const desc = step.customDescription || (step.elementInfo && step.elementInfo.text) || '';
        content += `<p>${desc}</p>`;
          if (step.title) content += `<p><strong>Page Title:</strong> ${step.title}</p>`;
        if (imageNames && imageNames[idx]) {
          content += `<p><ac:image><ri:attachment ri:filename="${imageNames[idx]}" /></ac:image></p>`;
        }
        content += '<hr/>';
      });
    }
    return content;
  },
  markdownToConfluenceFormat(markdown) {
    // This is a simplified conversion - a real implementation would be more comprehensive
    let confluenceContent =
      '<ac:structured-macro ac:name="html"><ac:plain-text-body><![CDATA[';

    // Convert markdown headers
    confluenceContent += markdown
      // Convert headers
      .replace(/^# (.*$)/gm, "<h1>$1</h1>")
      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
      .replace(/^### (.*$)/gm, "<h3>$1</h3>")

      // Convert bold and italic text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")

      // Convert lists
      .replace(/^\* (.*$)/gm, "<ul><li>$1</li></ul>")
      .replace(/^- (.*$)/gm, "<ul><li>$1</li></ul>")
      .replace(/^\d+\. (.*$)/gm, "<ol><li>$1</li></ol>")

      // Convert links
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')

      // Convert images with special Confluence macro for better display
      .replace(
        /!\[(.*?)\]\((.*?)\)/g,
        '<ac:image><ri:attachment ri:filename="$2" /></ac:image>'
      );

    // Close the HTML macro
    confluenceContent += "]]></ac:plain-text-body></ac:structured-macro>";

    return confluenceContent;
  },

  // Export to Notion
  exportToNotion(guide) {
    // This would use Notion's API to create a new page
    // For now, we'll just prepare the data structure

    const notionBlocks = [];

    // Add title
    notionBlocks.push({
      object: "block",
      type: "heading_1",
      heading_1: {
        text: [{ type: "text", text: { content: guide.name } }],
      },
    });

    // Add creation date
    notionBlocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        text: [
          {
            type: "text",
            text: {
              content: `Created: ${new Date(
                guide.dateCreated
              ).toLocaleDateString()}`,
            },
            annotations: { italic: true },
          },
        ],
      },
    });

    // Add steps
    if (guide.steps && guide.steps.length > 0) {
      guide.steps.forEach((step, index) => {
        // Step header
        notionBlocks.push({
          object: "block",
          type: "heading_2",
          heading_2: {
            text: [{ type: "text", text: { content: `Step ${index + 1}` } }],
          },
        });

        // Step description
        const description =
          step.customDescription || this.generateStepDescription(step);
        notionBlocks.push({
          object: "block",
          type: "paragraph",
          paragraph: {
            text: [{ type: "text", text: { content: description } }],
          },
        });

        // Add title
        if (step.title) {
          const details = [];
          if (step.title) details.push(`Page Title: ${step.title}`);

          notionBlocks.push({
            object: "block",
            type: "paragraph",
            paragraph: {
              text: [
                {
                  type: "text",
                  text: { content: details.join("\n") },
                  annotations: { code: true },
                },
              ],
            },
          });
        }

        // Add image if available
        const imageSrc = step.blurredScreenshot || step.screenshot;
        if (imageSrc) {
          // In a real implementation, you would upload this image to Notion
          notionBlocks.push({
            object: "block",
            type: "image",
            image: {
              type: "external",
              external: {
                url: "https://placeholder.com/400x300", // Placeholder since we can't upload in this mock
              },
            },
          });
        }

        // Add divider
        notionBlocks.push({
          object: "block",
          type: "divider",
          divider: {},
        });
      });
    } else {
      notionBlocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          text: [
            {
              type: "text",
              text: { content: "No steps recorded in this guide" },
              annotations: { italic: true },
            },
          ],
        },
      });
    }

    // In a real implementation, you would make an API call to Notion
    console.log("Notion export data prepared:", notionBlocks);
    return notionBlocks;
  },

  // Helper method to generate step description from element info
  generateStepDescription(step) {
    const elementInfo = step.elementInfo;

    if (elementInfo.tagName === "a") {
      return `Click on the link "${
        elementInfo.text || elementInfo.attributes.href
      }"`;
    } else if (elementInfo.tagName === "button") {
      return `Click on the button "${elementInfo.text || "Button"}"`;
    } else if (elementInfo.tagName === "input") {
      if (elementInfo.attributes.type === "submit") {
        return `Click the submit button "${
          elementInfo.attributes.value || "Submit"
        }"`;
      } else if (elementInfo.attributes.type === "button") {
        return `Click the button "${elementInfo.attributes.value || "Button"}"`;
      } else {
        return `Click on the ${elementInfo.attributes.type || "input"} field`;
      }
    } else if (elementInfo.text) {
      return `Click on "${elementInfo.text.substring(0, 50)}${
        elementInfo.text.length > 50 ? "..." : ""
      }"`;
    } else {
      return `Click on the ${elementInfo.tagName} element`;
    }
  },

  // Download the markdown as a file
  downloadMarkdown(guide) {
    const markdown = this.exportToMarkdown(guide);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${guide.name.replace(/\s+/g, "-").toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
