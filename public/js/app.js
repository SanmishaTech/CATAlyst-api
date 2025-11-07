// Main Application
const App = {
    init() {
        // Initialize router
        Router.init();

        // Check if user is authenticated
        if (AuthStorage.isAuthenticated()) {
            // If already authenticated and on login page, redirect to orders
            if (window.location.hash === '' || window.location.hash === '#login') {
                window.location.hash = '#orders';
            }
        } else {
            // Not authenticated, show login
            window.location.hash = '#login';
        }
    }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Add global error handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
