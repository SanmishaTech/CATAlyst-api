// Auth Module
const Auth = {
    init() {
        this.setupLoginForm();
        this.setupLogoutButton();
        this.updateUserDisplay();
    },

    setupLoginForm() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }
    },

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = document.getElementById('login-submit');
        const errorElement = document.getElementById('login-error');

        // Hide previous errors
        Utils.hideMessage('login-error');

        // Disable button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';

        try {
            const response = await API.post('/auth/login', {
                email,
                password
            });

            // Store auth data
            AuthStorage.setAuth(response);

            // Update UI
            this.updateUserDisplay();

            // Redirect to orders page
            window.location.hash = '#orders';
            
            // Reset form
            document.getElementById('login-form').reset();
        } catch (error) {
            Utils.showMessage('login-error', error.message || 'Login failed. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    },

    setupLogoutButton() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
    },

    handleLogout() {
        AuthStorage.clearAuth();
        window.location.hash = '#login';
        this.updateUserDisplay();
    },

    updateUserDisplay() {
        const user = AuthStorage.getUser();
        const userNameElement = document.getElementById('user-name');
        
        if (user && userNameElement) {
            userNameElement.textContent = user.name || user.email;
        }
    }
};

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});
