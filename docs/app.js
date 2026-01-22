// Main application
class PropertyFormApp {
    constructor() {
        this.propertyForm = new PropertyForm();
        this.apiClient = new APIClient();
        this.init();
    }

    init() {
        this.propertyForm.init(this.apiClient);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PropertyFormApp();
});
