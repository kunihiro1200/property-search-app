/**
 * PropertyForm Component
 * Manages the property search form UI and interactions
 */
class PropertyForm {
    constructor() {
        this.elements = {
            propertyNumber: null,
            propertyLocation: null,
            propertyContent: null,
            errorMessage: null,
            loadingIndicator: null,
            googleFormBtn: null
        };
        this.apiClient = null;
        this.debounceTimer = null;
        this.currentPropertyNumber = null;
    }

    /**
     * Initialize the form component
     * @param {APIClient} apiClient - API client instance
     */
    init(apiClient) {
        this.apiClient = apiClient;
        this.cacheElements();
        this.attachEventListeners();
        this.renderInstructions();
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements.propertyNumber = document.getElementById('propertyNumber');
        this.elements.propertyLocation = document.getElementById('propertyLocation');
        this.elements.propertyContent = document.getElementById('propertyContent');
        this.elements.errorMessage = document.getElementById('errorMessage');
        this.elements.loadingIndicator = document.getElementById('loadingIndicator');
        this.elements.googleFormBtn = document.getElementById('openGoogleFormBtn');
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        if (this.elements.propertyNumber) {
            // Store the handler so we can remove/re-add it later
            this.inputHandler = (e) => {
                this.handlePropertyNumberInput(e.target.value);
            };
            this.elements.propertyNumber.addEventListener('input', this.inputHandler);
        }
        
        if (this.elements.googleFormBtn) {
            this.elements.googleFormBtn.addEventListener('click', () => {
                this.openGoogleFormWithPropertyNumber();
            });
        }
    }

    /**
     * Render instruction text (already in HTML)
     */
    renderInstructions() {
        // Instructions are already rendered in HTML
        // This method exists for consistency with the design
    }

    /**
     * Handle property number input
     * @param {string} value - Input value
     */
    handlePropertyNumberInput(value) {
        // Clear previous error
        this.clearError();

        // Sanitize input (remove unwanted characters)
        value = sanitizeInput(value);

        // Convert to half-width
        const halfWidthValue = convertToHalfWidth(value);
        
        // Trim whitespace
        value = halfWidthValue.trim();
        
        // Update input field if value changed (prevent input event re-trigger)
        if (this.elements.propertyNumber.value !== value) {
            // Temporarily remove event listener to prevent recursive call
            this.elements.propertyNumber.removeEventListener('input', this.inputHandler);
            
            // Update the value
            this.elements.propertyNumber.value = value;
            
            // Restore event listener after a short delay
            setTimeout(() => {
                this.elements.propertyNumber.addEventListener('input', this.inputHandler);
            }, 0);
        }

        // Clear previous debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // If empty, clear fields and return
        if (!value) {
            this.clearPropertyData();
            this.disableFormButton();
            this.currentPropertyNumber = null;
            return;
        }

        // Validate format
        if (!validatePropertyNumber(value)) {
            this.showError('物件番号の形式が正しくありません（AA、BB、CCから始まる番号を入力してください）');
            this.clearPropertyData();
            this.disableFormButton();
            this.currentPropertyNumber = null;
            return;
        }

        // Store current property number for Google Form
        this.currentPropertyNumber = value;

        // Debounce API call
        this.debounceTimer = setTimeout(() => {
            this.fetchPropertyData(value);
        }, CONFIG.DEBOUNCE_DELAY);
    }

    /**
     * Fetch property data from API
     * @param {string} propertyNumber - Property number to search
     */
    async fetchPropertyData(propertyNumber) {
        try {
            this.showLoading();
            const data = await this.apiClient.fetchPropertyData(propertyNumber);
            this.displayPropertyData(data);
        } catch (error) {
            this.handleError(error);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Display property data
     * @param {Object} data - Property data
     */
    displayPropertyData(data) {
        if (data && data.location && data.content) {
            // Display location (escape HTML)
            this.elements.propertyLocation.value = escapeHtml(data.location);
            
            // Display content with linkified URLs
            this.displayContentWithLinks(data.content);
            
            // Enable Google Form button
            this.enableFormButton();
        }
    }

    /**
     * Display content with clickable links
     * @param {string} content - Content text
     */
    displayContentWithLinks(content) {
        // Escape HTML first
        const escapedContent = escapeHtml(content);
        
        // Convert URLs to clickable links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const linkedContent = escapedContent.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Set innerHTML to display links
        this.elements.propertyContent.innerHTML = linkedContent;
    }

    /**
     * Clear property data fields
     */
    clearPropertyData() {
        this.elements.propertyLocation.value = '';
        this.elements.propertyContent.innerHTML = '';
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
        }
    }

    /**
     * Clear error message
     */
    clearError() {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = '';
        }
    }

    /**
     * Handle API errors
     * @param {Error} error - Error object
     */
    handleError(error) {
        this.clearPropertyData();
        
        if (error.code === 'NOT_FOUND') {
            this.showError('該当する物件が見つかりません');
        } else if (error.code === 'CONNECTION_ERROR') {
            this.showError('スプレッドシートに接続できません。しばらくしてから再度お試しください');
        } else if (error.code === 'AUTH_ERROR') {
            this.showError('認証に失敗しました。管理者にお問い合わせください');
        } else {
            this.showError('エラーが発生しました。しばらくしてから再度お試しください');
        }
    }

    /**
     * Show loading indicator
     */
    showLoading() {
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.style.display = 'flex';
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.style.display = 'none';
        }
    }

    /**
     * Enable Google Form button
     */
    enableFormButton() {
        if (this.elements.googleFormBtn && this.currentPropertyNumber) {
            this.elements.googleFormBtn.disabled = false;
        }
    }

    /**
     * Disable Google Form button
     */
    disableFormButton() {
        if (this.elements.googleFormBtn) {
            this.elements.googleFormBtn.disabled = true;
        }
    }

    /**
     * Open Google Form with pre-filled property number
     */
    openGoogleFormWithPropertyNumber() {
        if (!this.currentPropertyNumber) {
            this.showError('有効な物件番号を入力してください');
            return;
        }

        try {
            const formUrl = buildGoogleFormURL(this.currentPropertyNumber);
            
            // Debug: Log the URL
            console.log('Opening Google Form with URL:', formUrl);
            
            // Try to open in new window
            const newWindow = window.open(formUrl, '_blank');
            
            // Check if popup was blocked
            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                // Fallback: show link to user
                const message = `ポップアップがブロックされました。<a href="${formUrl}" target="_blank" style="color: #2196f3; text-decoration: underline;">こちらをクリック</a>してGoogleフォームを開いてください。`;
                this.elements.errorMessage.innerHTML = message;
            }
        } catch (error) {
            console.error('Error opening Google Form:', error);
            this.showError('Googleフォームを開く際にエラーが発生しました');
        }
    }
}

// Export for Node.js environment (for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PropertyForm;
}
