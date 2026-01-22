// Main application
class PropertyFormApp {
    constructor() {
        this.propertyForm = new PropertyForm();
        this.apiClient = new APIClient();
        this.init();
    }

    init() {
        // Check if user is using Edge browser
        this.checkBrowserCompatibility();
        this.propertyForm.init(this.apiClient);
    }

    /**
     * Check browser compatibility and show warning for Edge
     */
    checkBrowserCompatibility() {
        // More comprehensive Edge detection
        const userAgent = navigator.userAgent;
        const isEdge = /Edg/.test(userAgent) || /Edge/.test(userAgent);
        
        console.log('Browser check:', {
            userAgent: userAgent,
            isEdge: isEdge
        });
        
        if (isEdge) {
            // Show warning banner for Edge users
            this.showEdgeWarning();
        }
    }

    /**
     * Show warning banner for Edge browser users
     */
    showEdgeWarning() {
        const banner = document.createElement('div');
        banner.className = 'browser-warning';
        banner.innerHTML = `
            <div class="browser-warning-content">
                <strong>⚠️ ブラウザの互換性について</strong>
                <p>Microsoft Edgeでは、セキュリティ設定により正常に動作しない場合があります。</p>
                <p><strong>Google Chromeのご利用を推奨いたします。</strong></p>
                <button onclick="this.parentElement.parentElement.remove()" class="close-warning">閉じる</button>
            </div>
        `;
        
        // Insert at the top of the container
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(banner, container.firstChild);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PropertyFormApp();
});
