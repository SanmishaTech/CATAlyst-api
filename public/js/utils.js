// API Configuration
const API_BASE_URL = window.location.origin + '/api';

// Auth Storage
const AuthStorage = {
    setAuth(data) {
        localStorage.setItem('apiKey', data.apiKey);
        localStorage.setItem('user', JSON.stringify(data.user));
    },
    
    getApiKey() {
        return localStorage.getItem('apiKey');
    },
    
    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },
    
    clearAuth() {
        localStorage.removeItem('apiKey');
        localStorage.removeItem('user');
    },
    
    isAuthenticated() {
        return !!this.getApiKey();
    }
};

// API Client
const API = {
    async request(endpoint, options = {}) {
        const apiKey = AuthStorage.getApiKey();
        const headers = {
            'Content-Type': 'application/json',
            ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
            ...options.headers
        };

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });

            if (response.status === 401) {
                AuthStorage.clearAuth();
                window.location.hash = '#login';
                throw new Error('Unauthorized. Please login again.');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || errorData.message || 'Request failed');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },

    async upload(endpoint, formData) {
        const apiKey = AuthStorage.getApiKey();
        const headers = {
            ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        };

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData
        });

        if (response.status === 401) {
            AuthStorage.clearAuth();
            window.location.hash = '#login';
            throw new Error('Unauthorized. Please login again.');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || errorData.message || 'Upload failed');
        }

        return await response.json();
    },

    async downloadFile(endpoint, filename) {
        const apiKey = AuthStorage.getApiKey();
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
            }
        });

        if (!response.ok) {
            throw new Error('Download failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
};

// Utility Functions
const Utils = {
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    },

    formatNumber(num) {
        if (num === null || num === undefined) return '-';
        return new Intl.NumberFormat().format(num);
    },

    formatCurrency(amount) {
        if (amount === null || amount === undefined) return '-';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    },

    getStatusBadge(status) {
        if (!status) return '';
        
        const statusLower = status.toLowerCase();
        let badgeClass = 'badge-secondary';
        
        if (statusLower === 'completed' || statusLower === 'filled' || statusLower === 'active') {
            badgeClass = 'badge-success';
        } else if (statusLower === 'processing' || statusLower === 'pending') {
            badgeClass = 'badge-warning';
        } else if (statusLower === 'failed' || statusLower === 'cancelled' || statusLower === 'rejected') {
            badgeClass = 'badge-danger';
        } else if (statusLower === 'partial' || statusLower === 'partially_filled') {
            badgeClass = 'badge-info';
        }
        
        return `<span class="badge ${badgeClass}">${status}</span>`;
    },

    showMessage(elementId, message, isError = false) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.classList.add('show');
            setTimeout(() => element.classList.remove('show'), 5000);
        }
    },

    hideMessage(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('show');
        }
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'block';
        }
    },

    hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    },

    showEmptyState(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'block';
        }
    },

    hideEmptyState(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    }
};

// Router
const Router = {
    currentPage: 'login',

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    },

    handleRoute() {
        const hash = window.location.hash.slice(1) || 'login';
        this.navigateTo(hash);
    },

    navigateTo(pageName) {
        // Check auth for protected pages
        if (pageName !== 'login' && !AuthStorage.isAuthenticated()) {
            window.location.hash = '#login';
            return;
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show requested page
        const page = document.getElementById(`${pageName}-page`);
        if (page) {
            page.classList.add('active');
            this.currentPage = pageName;

            // Update nav
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                if (link.dataset.page === pageName) {
                    link.classList.add('active');
                }
            });

            // Show/hide navbar
            const navbar = document.getElementById('navbar');
            if (pageName === 'login') {
                navbar.style.display = 'none';
            } else {
                navbar.style.display = 'block';
            }

            // Trigger page load event
            window.dispatchEvent(new CustomEvent('pageLoad', { detail: { page: pageName } }));
        }
    }
};
