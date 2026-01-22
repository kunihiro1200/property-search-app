// Configuration
// Set your Google Apps Script Web App URL here

const CONFIG = {
    // Google Apps Script Web App URL (Edge対応版)
    API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbyVMO1Cml9vp6lK_FEdzfAiom2OK275IDMfxFPZDqmVgi-pKfAiw4JKV3uXFzDZeE9E7g/exec',
    
    // Debounce delay in milliseconds (increased for stability)
    DEBOUNCE_DELAY: 500,
    
    // Rate limiting settings
    RATE_LIMIT_MAX: 30,
    RATE_LIMIT_WINDOW: 60000, // 1 minute
    
    // Google Form settings
    GOOGLE_FORM: {
        BASE_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSevsSa2uKNPJ1yE212fRyGupkOsixWPcnJc8OFY7PT06UfWOg/viewform',
        PROPERTY_NUMBER_ENTRY_ID: 'entry.267319544'
    }
};
