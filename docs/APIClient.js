/**
 * APIClient Component
 * Handles communication with the backend API using JSONP (CORS-free)
 */
class APIClient {
    constructor() {
        this.cache = new Map();
        this.requestCount = 0;
        this.requestTimestamps = [];
        this.callbackCounter = 0;
    }

    /**
     * Fetch property data from API using JSONP
     * @param {string} propertyNumber - Property number to search
     * @returns {Promise<Object>} Property data
     */
    async fetchPropertyData(propertyNumber) {
        // Check cache first
        if (this.cache.has(propertyNumber)) {
            return this.cache.get(propertyNumber);
        }

        // Check rate limit
        if (!this.checkRateLimit()) {
            throw {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'リクエスト数が上限に達しました。しばらくしてから再度お試しください'
            };
        }

        try {
            // Try JSONP first
            const result = await this.jsonpRequest(propertyNumber);
            console.log('API response:', result);

            if (result.success) {
                // Cache the result
                this.cache.set(propertyNumber, result.data);
                return result.data;
            } else {
                throw {
                    code: result.error.code,
                    message: result.error.message
                };
            }
        } catch (error) {
            console.error('JSONP request failed:', error);
            
            // If JSONP fails (likely on Edge), try fetch API with CORS
            try {
                console.log('Trying fetch API as fallback...');
                const result = await this.fetchRequest(propertyNumber);
                console.log('Fetch API response:', result);
                
                if (result.success) {
                    // Cache the result
                    this.cache.set(propertyNumber, result.data);
                    return result.data;
                } else {
                    throw {
                        code: result.error.code,
                        message: result.error.message
                    };
                }
            } catch (fetchError) {
                console.error('Fetch API also failed:', fetchError);
                this.handleAPIError(error);
            }
        }
    }

    /**
     * Make fetch request with CORS (fallback for Edge)
     * @param {string} propertyNumber - Property number to search
     * @returns {Promise<Object>} API response
     */
    async fetchRequest(propertyNumber) {
        const url = `${CONFIG.API_ENDPOINT}?number=${encodeURIComponent(propertyNumber)}`;
        
        console.log('Fetch request to:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    /**
     * Make JSONP request (bypasses CORS)
     * @param {string} propertyNumber - Property number to search
     * @returns {Promise<Object>} API response
     */
    jsonpRequest(propertyNumber) {
        return new Promise((resolve, reject) => {
            // Create unique callback name
            const callbackName = `jsonpCallback_${Date.now()}_${this.callbackCounter++}`;
            
            // Create script element
            const script = document.createElement('script');
            const url = `${CONFIG.API_ENDPOINT}?number=${encodeURIComponent(propertyNumber)}&callback=${callbackName}`;
            
            console.log('JSONP request to:', url);
            console.log('Callback name:', callbackName);
            console.log('Browser:', navigator.userAgent);
            
            // Set timeout (20秒 - より長めに設定)
            const timeout = setTimeout(() => {
                console.error('JSONP request timeout');
                cleanup();
                reject({
                    code: 'TIMEOUT',
                    message: 'リクエストがタイムアウトしました。もう一度お試しください'
                });
            }, 20000);
            
            // Define global callback
            window[callbackName] = (response) => {
                console.log('JSONP callback received:', response);
                cleanup();
                resolve(response);
            };
            
            // Cleanup function
            const cleanup = () => {
                clearTimeout(timeout);
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
            };
            
            // Handle script load success
            script.onload = () => {
                console.log('JSONP script loaded successfully');
            };
            
            // Handle script errors
            script.onerror = (event) => {
                console.error('JSONP script error:', event);
                console.error('Failed URL:', url);
                cleanup();
                reject({
                    code: 'NETWORK_ERROR',
                    message: 'ネットワークエラーが発生しました。インターネット接続を確認してください'
                });
            };
            
            // Set script attributes for better compatibility
            script.type = 'text/javascript';
            script.async = true;
            
            // Add script to document
            script.src = url;
            document.head.appendChild(script);
            
            console.log('JSONP script added to document');
        });
    }

    /**
     * Check if request is within rate limit
     * @returns {boolean} True if within limit
     */
    checkRateLimit() {
        const now = Date.now();
        const windowStart = now - CONFIG.RATE_LIMIT_WINDOW;

        // Remove timestamps outside the window
        this.requestTimestamps = this.requestTimestamps.filter(
            timestamp => timestamp > windowStart
        );

        // Check if we're at the limit
        if (this.requestTimestamps.length >= CONFIG.RATE_LIMIT_MAX) {
            return false;
        }

        // Add current timestamp
        this.requestTimestamps.push(now);
        return true;
    }

    /**
     * Handle API errors
     * @param {Error} error - Error object
     * @throws {Object} Formatted error object
     */
    handleAPIError(error) {
        if (error.code) {
            // Already formatted error
            throw error;
        }

        // Network or other errors
        if (error.message && error.message.includes('fetch')) {
            throw {
                code: 'CONNECTION_ERROR',
                message: 'スプレッドシートに接続できません。しばらくしてから再度お試しください'
            };
        }

        // Generic error
        throw {
            code: 'UNKNOWN_ERROR',
            message: 'エラーが発生しました。しばらくしてから再度お試しください'
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
}

// Export for Node.js environment (for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIClient;
}
