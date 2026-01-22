/**
 * Convert full-width characters to half-width characters
 * @param {string} text - Input text with potential full-width characters
 * @returns {string} Text with all full-width alphanumeric characters converted to half-width
 */
function convertToHalfWidth(text) {
    if (!text) return '';
    
    return text.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(char) {
        return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    });
}

/**
 * Validate property number format
 * @param {string} number - Property number to validate
 * @returns {boolean} True if valid format (AA/BB/CC followed by digits and optional hyphen)
 */
function validatePropertyNumber(number) {
    if (!number) return false;
    
    // Allow hyphens in property numbers (e.g., AA9862-2)
    const pattern = /^(AA|BB|CC)[\d\-]+$/;
    return pattern.test(number);
}

/**
 * Sanitize input to prevent XSS attacks
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
function sanitizeInput(input) {
    if (!input) return '';
    
    // For property numbers, only allow alphanumeric characters and hyphens
    // This prevents any potential XSS while keeping valid property number characters
    return input.replace(/[^A-Za-z0-9\-]/g, '');
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, function(char) {
        return map[char];
    });
}

/**
 * Build Google Form URL with pre-filled property number
 * @param {string} propertyNumber - Property number to pre-fill
 * @returns {string} Complete Google Form URL with property number parameter
 */
function buildGoogleFormURL(propertyNumber) {
    if (!propertyNumber) {
        throw new Error('Property number is required');
    }
    
    const baseUrl = CONFIG.GOOGLE_FORM.BASE_URL;
    const entryId = CONFIG.GOOGLE_FORM.PROPERTY_NUMBER_ENTRY_ID;
    const encodedPropertyNumber = encodeURIComponent(propertyNumber);
    
    return `${baseUrl}?${entryId}=${encodedPropertyNumber}`;
}

// Export for Node.js environment (for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        convertToHalfWidth,
        validatePropertyNumber,
        sanitizeInput,
        escapeHtml,
        buildGoogleFormURL
    };
}
