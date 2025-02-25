export default {
    // Regular expressions for common sensitive data patterns
    patterns: {
        email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        phone: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
        ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
        creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
        name: /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g
    },

    // Preset regions for common UI elements
    presets: {
        header: { top: 0, left: 0, width: 1, height: 0.1, name: 'Header' },
        footer: { top: 0.9, left: 0, width: 1, height: 0.1, name: 'Footer' },
        sidebar: { top: 0.1, left: 0, width: 0.2, height: 0.8, name: 'Sidebar' },
        profileArea: { top: 0, left: 0.8, width: 0.2, height: 0.1, name: 'Profile Area' }
    },

    // Detect text in the canvas
    async detectSensitiveInfo(canvas) {
        const results = [];

        // Use canvas OCR library to extract text
        // For a real implementation, you'd need to include Tesseract.js or a similar library
        // This is a placeholder where actual OCR would happen
        const extractedText = await this.extractTextFromCanvas(canvas);

        // Search for patterns in the extracted text
        for (const [type, pattern] of Object.entries(this.patterns)) {
            const matches = extractedText.match(pattern);
            if (matches) {
                for (const match of matches) {
                    // Locate position of the match in the text and convert to canvas coordinates
                    const position = this.findTextPositionInCanvas(canvas, match);
                    if (position) {
                        results.push({
                            type,
                            text: match,
                            ...position
                        });
                    }
                }
            }
        }

        return results;
    },

    // This is a placeholder for actual OCR implementation
    extractTextFromCanvas(canvas) {
        // In a real implementation, this would use Tesseract.js or similar
        // For now, just returning empty string as this requires external libraries
        console.log('Text extraction would happen here in a real implementation');
        return '';
    },

    // Placeholder for finding text position in canvas
    findTextPositionInCanvas(canvas, text) {
        // This would use the OCR result positions in a real implementation
        return null;
    },

    // Apply preset blur regions
    applyPreset(canvas, presetName) {
        const preset = this.presets[presetName];
        if (!preset) return null;

        // Convert relative dimensions to canvas dimensions
        return {
            x: preset.left * canvas.width,
            y: preset.top * canvas.height,
            width: preset.width * canvas.width,
            height: preset.height * canvas.height,
            name: preset.name
        };
    }
};