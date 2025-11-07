// Orders Module
const Orders = {
    currentPage: 1,
    limit: 50,
    totalPages: 1,
    filters: {
        search: '',
        status: '',
        side: ''
    },
    selectedFile: null,

    init() {
        this.setupEventListeners();
        this.setupUploadModal();
        this.setupErrorDetailsPage();
        
        // Load orders when page is shown
        window.addEventListener('pageLoad', (e) => {
            if (e.detail.page === 'orders') {
                this.loadOrders();
            }
        });
    },

    setupEventListeners() {
        // Download template button
        const downloadBtn = document.getElementById('download-template-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadTemplate());
        }

        // Upload button
        const uploadBtn = document.getElementById('upload-orders-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.openUploadModal());
        }

        // Search and filters
        const searchInput = document.getElementById('order-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.filters.search = e.target.value;
                this.currentPage = 1;
                this.loadOrders();
            }, 500));
        }

        const statusFilter = document.getElementById('filter-status');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.currentPage = 1;
                this.loadOrders();
            });
        }

        const sideFilter = document.getElementById('filter-side');
        if (sideFilter) {
            sideFilter.addEventListener('change', (e) => {
                this.filters.side = e.target.value;
                this.currentPage = 1;
                this.loadOrders();
            });
        }

        // Pagination
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadOrders();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.loadOrders();
                }
            });
        }
    },

    async downloadTemplate() {
        try {
            await API.downloadFile('/orders/template', 'order_template.xlsx');
        } catch (error) {
            alert('Failed to download template: ' + error.message);
        }
    },

    setupUploadModal() {
        const modal = document.getElementById('upload-modal');
        const closeBtn = modal?.querySelector('.modal-close');
        const cancelBtn = document.getElementById('cancel-upload-btn');
        const submitBtn = document.getElementById('submit-upload-btn');

        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                
                // Update active tab button
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update active tab content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(`${tabName}-tab`).classList.add('active');
            });
        });

        // File upload handling
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const fileInfo = document.getElementById('file-info');
        const fileName = document.getElementById('file-name');
        const changeFileBtn = document.getElementById('change-file-btn');

        if (dropZone) {
            dropZone.addEventListener('click', () => fileInput.click());
            
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.style.borderColor = 'var(--primary-color)';
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.style.borderColor = 'var(--gray-300)';
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.style.borderColor = 'var(--gray-300)';
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileSelect(files[0]);
                }
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileSelect(e.target.files[0]);
                }
            });
        }

        if (changeFileBtn) {
            changeFileBtn.addEventListener('click', () => {
                fileInput.click();
            });
        }

        // Close modal
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeUploadModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeUploadModal());
        }

        // Submit upload
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.handleUpload());
        }

        // Close modal on outside click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeUploadModal();
                }
            });
        }
    },

    setupErrorDetailsPage() {
        // Back button handler
        const backBtn = document.getElementById('back-from-errors-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                // Hide error details page
                document.getElementById('error-details-page')?.classList.remove('active');
                // Show orders page
                document.getElementById('orders-page')?.classList.add('active');
                // Reopen upload modal
                this.openUploadModal();
            });
        }

        // Copy JSON button handler
        const copyJsonBtn = document.getElementById('copy-json-btn');
        if (copyJsonBtn) {
            copyJsonBtn.addEventListener('click', () => {
                const jsonDisplay = document.getElementById('error-json-display');
                if (jsonDisplay && jsonDisplay.textContent) {
                    navigator.clipboard.writeText(jsonDisplay.textContent)
                        .then(() => {
                            // Show success feedback
                            const originalText = copyJsonBtn.innerHTML;
                            copyJsonBtn.innerHTML = `
                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                                </svg>
                                Copied!
                            `;
                            setTimeout(() => {
                                copyJsonBtn.innerHTML = originalText;
                            }, 2000);
                        })
                        .catch(err => {
                            console.error('Failed to copy:', err);
                            alert('Failed to copy JSON to clipboard');
                        });
                }
            });
        }
    },

    handleFileSelect(file) {
        this.selectedFile = file;
        const fileInfo = document.getElementById('file-info');
        const fileName = document.getElementById('file-name');
        const dropZone = document.getElementById('drop-zone');

        if (fileName) {
            fileName.textContent = file.name;
        }

        if (fileInfo) {
            fileInfo.style.display = 'block';
        }

        if (dropZone) {
            dropZone.style.display = 'none';
        }
    },

    openUploadModal() {
        const modal = document.getElementById('upload-modal');
        if (modal) {
            modal.classList.add('active');
            this.resetUploadForm();
        }
    },

    closeUploadModal() {
        const modal = document.getElementById('upload-modal');
        if (modal) {
            modal.classList.remove('active');
            this.resetUploadForm();
        }
    },

    resetUploadForm() {
        this.selectedFile = null;
        const fileInput = document.getElementById('file-input');
        const fileInfo = document.getElementById('file-info');
        const dropZone = document.getElementById('drop-zone');
        const jsonInput = document.getElementById('json-input');

        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.style.display = 'none';
        if (dropZone) dropZone.style.display = 'block';
        if (jsonInput) jsonInput.value = '';

        Utils.hideMessage('upload-error');
        Utils.hideMessage('upload-success');
    },

    async handleUpload() {
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        const submitBtn = document.getElementById('submit-upload-btn');

        Utils.hideMessage('upload-error');
        Utils.hideMessage('upload-success');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';

        try {
            let response;

            if (activeTab === 'excel') {
                if (!this.selectedFile) {
                    throw new Error('Please select a file to upload');
                }

                const formData = new FormData();
                formData.append('file', this.selectedFile);
                response = await API.upload('/orders/upload', formData);
            } else {
                const jsonInput = document.getElementById('json-input');
                const jsonData = jsonInput.value.trim();

                if (!jsonData) {
                    throw new Error('Please enter JSON data');
                }

                let parsedData;
                try {
                    parsedData = JSON.parse(jsonData);
                } catch (e) {
                    throw new Error('Invalid JSON format');
                }

                // Store the uploaded JSON for error display
                this.lastUploadedJson = parsedData;

                response = await API.post('/orders/upload', parsedData);
            }

            Utils.showMessage('upload-success', 
                `Successfully uploaded! Batch ID: ${response.batchId}, Imported: ${response.imported} orders`);

            setTimeout(() => {
                this.closeUploadModal();
                this.loadOrders();
            }, 2000);

        } catch (error) {
            console.log('Upload error:', error);
            console.log('Error errorData:', error.errorData);
            this.displayUploadError(error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Upload';
        }
    },

    displayUploadError(error) {
        const errorElement = document.getElementById('upload-error');
        if (!errorElement) return;

        let errorMessage = '';

        // Check if error has errorData attached (from API client)
        if (error.errorData && error.errorData.errors && Array.isArray(error.errorData.errors)) {
            const errorData = error.errorData;
            const errors = errorData.errors;
            
            // If more than 3 errors, show first 3 with "Show More" button
            if (errors.length > 3) {
                const firstThreeErrors = errors.slice(0, 3);
                
                errorMessage = `
                    <div>
                        ${firstThreeErrors.map((err) => `
                            <div style="margin-bottom: 8px; padding: 8px; background-color: rgba(255, 255, 255, 0.5); border-radius: 4px; border-left: 3px solid #991b1b;">
                                <div style="font-size: 14px; color: #991b1b;">
                                    <strong>Index ${err.index !== undefined ? err.index : 'N/A'}</strong> - ${err.orderId || 'Unknown'} - ${err.error || err.message || JSON.stringify(err)}
                                </div>
                            </div>
                        `).join('')}
                        <div style="text-align: center; margin-top: 12px;">
                            <button 
                                id="show-more-errors-btn" 
                                style="padding: 8px 16px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;"
                            >
                                Show More (${errors.length - 3} more errors)
                            </button>
                        </div>
                    </div>
                `;
                errorElement.innerHTML = errorMessage;
                
                // Store error data for the error details page
                this.lastUploadErrors = {
                    errors: errors,
                    uploadedJson: this.lastUploadedJson
                };
                
                // Add click handler for "Show More" button
                document.getElementById('show-more-errors-btn')?.addEventListener('click', () => {
                    this.closeUploadModal();
                    this.showErrorDetailsPage();
                });
            } else {
                // Show all errors if 3 or fewer
                errorMessage = `
                    <div>
                        ${errors.map((err) => `
                            <div style="margin-bottom: 8px; padding: 8px; background-color: rgba(255, 255, 255, 0.5); border-radius: 4px; border-left: 3px solid #991b1b;">
                                <div style="font-size: 14px; color: #991b1b;">
                                    <strong>Index ${err.index !== undefined ? err.index : 'N/A'}</strong> - ${err.orderId || 'Unknown'} - ${err.error || err.message || JSON.stringify(err)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                errorElement.innerHTML = errorMessage;
            }
        } else {
            // Simple error message
            errorMessage = error.message || 'Upload failed. Please try again.';
            errorElement.innerHTML = errorMessage;
        }

        errorElement.classList.add('show');
    },

    showErrorDetailsPage() {
        if (!this.lastUploadErrors) return;

        const errorDetailsPage = document.getElementById('error-details-page');
        if (!errorDetailsPage) {
            console.error('Error details page not found');
            return;
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        
        // Show error details page
        errorDetailsPage.classList.add('active');

        // Populate error count badge
        const errorCountBadge = document.getElementById('error-count-badge');
        if (errorCountBadge) {
            errorCountBadge.textContent = `${this.lastUploadErrors.errors.length} Error${this.lastUploadErrors.errors.length !== 1 ? 's' : ''}`;
        }

        // Populate JSON section
        const jsonDisplay = document.getElementById('error-json-display');
        if (jsonDisplay && this.lastUploadErrors.uploadedJson) {
            jsonDisplay.textContent = JSON.stringify(this.lastUploadErrors.uploadedJson, null, 2);
        }

        // Populate errors list
        const errorsList = document.getElementById('errors-list-display');
        if (errorsList) {
            errorsList.innerHTML = this.lastUploadErrors.errors.map((err) => `
                <div style="margin-bottom: 12px; padding: 16px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="font-size: 15px; color: #991b1b; font-weight: 600; margin-bottom: 6px;">
                        Index ${err.index !== undefined ? err.index : 'N/A'} - Order ID: ${err.orderId || 'Unknown'}
                    </div>
                    <div style="font-size: 14px; color: #dc2626; line-height: 1.5;">
                        ${err.error || err.message || JSON.stringify(err)}
                    </div>
                </div>
            `).join('');
        }
    },

    async loadOrders() {
        Utils.showLoading('orders-loading');
        Utils.hideEmptyState('orders-empty');

        const tbody = document.getElementById('orders-tbody');
        if (tbody) {
            tbody.innerHTML = '';
        }

        try {
            // Build query params
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.limit
            });

            if (this.filters.search) {
                params.append('search', this.filters.search);
            }
            if (this.filters.status) {
                params.append('status', this.filters.status);
            }
            if (this.filters.side) {
                params.append('side', this.filters.side);
            }

            const response = await API.get(`/orders?${params.toString()}`);
            
            if (response.orders && response.orders.length > 0) {
                this.renderOrders(response.orders);
                this.updatePagination(response.pagination);
                Utils.hideEmptyState('orders-empty');
            } else {
                Utils.showEmptyState('orders-empty');
            }
        } catch (error) {
            console.error('Failed to load orders:', error);
            Utils.showEmptyState('orders-empty');
        } finally {
            Utils.hideLoading('orders-loading');
        }
    },

    renderOrders(orders) {
        const tbody = document.getElementById('orders-tbody');
        if (!tbody) return;

        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>${order.orderId || '-'}</td>
                <td>${order.orderSymbol || '-'}</td>
                <td>${order.orderSide || '-'}</td>
                <td>${Utils.formatNumber(order.orderQuantity)}</td>
                <td>${Utils.formatNumber(order.orderPrice)}</td>
                <td>${Utils.getStatusBadge(order.orderStatus)}</td>
                <td>${order.orderType || '-'}</td>
                <td>${Utils.formatDate(order.createdAt)}</td>
            </tr>
        `).join('');
    },

    updatePagination(pagination) {
        if (!pagination) return;

        this.totalPages = pagination.totalPages || 1;
        this.currentPage = pagination.page || 1;

        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        if (pageInfo) {
            pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        }

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= this.totalPages;
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    Orders.init();
});
