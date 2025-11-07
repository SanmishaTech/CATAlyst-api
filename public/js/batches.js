// Batches Module
const Batches = {
    currentPage: 1,
    limit: 20,
    totalPages: 1,
    statusFilter: '',

    init() {
        this.setupEventListeners();
        this.setupValidationModal();
        
        // Load batches when page is shown
        window.addEventListener('pageLoad', (e) => {
            if (e.detail.page === 'batches') {
                this.loadBatches();
                this.loadBatchStats();
            }
        });
    },

    setupEventListeners() {
        // Status filter
        const statusFilter = document.getElementById('batch-filter-status');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.currentPage = 1;
                this.loadBatches();
            });
        }

        // Pagination
        const prevBtn = document.getElementById('batch-prev-page');
        const nextBtn = document.getElementById('batch-next-page');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadBatches();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.loadBatches();
                }
            });
        }
    },

    async loadBatchStats() {
        try {
            const response = await API.get('/batches/stats');
            this.renderStats(response);
        } catch (error) {
            console.error('Failed to load batch stats:', error);
        }
    },

    renderStats(stats) {
        const elements = {
            'stat-total-batches': stats.totalBatches || 0,
            'stat-completed-batches': stats.completedBatches || 0,
            'stat-processing-batches': stats.processingBatches || 0,
            'stat-total-orders': stats.totalOrdersImported || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = Utils.formatNumber(value);
            }
        });
    },

    async loadBatches() {
        Utils.showLoading('batches-loading');
        Utils.hideEmptyState('batches-empty');

        const tbody = document.getElementById('batches-tbody');
        if (tbody) {
            tbody.innerHTML = '';
        }

        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.limit
            });

            if (this.statusFilter) {
                params.append('status', this.statusFilter);
            }

            const response = await API.get(`/batches?${params.toString()}`);
            
            if (response.batches && response.batches.length > 0) {
                this.renderBatches(response.batches);
                this.updatePagination(response.pagination);
                Utils.hideEmptyState('batches-empty');
            } else {
                Utils.showEmptyState('batches-empty');
            }
        } catch (error) {
            console.error('Failed to load batches:', error);
            Utils.showEmptyState('batches-empty');
        } finally {
            Utils.hideLoading('batches-loading');
        }
    },

    renderBatches(batches) {
        const tbody = document.getElementById('batches-tbody');
        if (!tbody) return;

        tbody.innerHTML = batches.map(batch => `
            <tr>
                <td>${batch.id}</td>
                <td>${batch.fileName || 'N/A'}</td>
                <td>${Utils.getStatusBadge(batch.status)}</td>
                <td>${Utils.formatNumber(batch.totalOrders)}</td>
                <td>${Utils.formatNumber(batch.successfulOrders)}</td>
                <td>${Utils.formatNumber(batch.failedOrders)}</td>
                <td>${this.getSuccessRate(batch)}</td>
                <td>${this.getValidationStatus(batch)}</td>
                <td>${Utils.formatDate(batch.importedAt)}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="Batches.viewBatchDetails(${batch.id})">
                        View
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="Batches.deleteBatch(${batch.id})">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    },

    getSuccessRate(batch) {
        if (!batch.totalOrders || batch.totalOrders === 0) {
            return '-';
        }
        const rate = (batch.successfulOrders / batch.totalOrders * 100).toFixed(1);
        return `${rate}%`;
    },

    getValidationStatus(batch) {
        // null = not validated yet, true/1 = passed, false/0 = failed
        if (batch.validation_1 === null || batch.validation_1 === undefined) {
            return `
                <div class="validation-status">
                    <svg class="validation-icon" fill="#9ca3af" viewBox="0 0 16 16">
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                    </svg>
                    <span style="color: var(--gray-600); font-size: 13px;">Pending validation</span>
                </div>
            `;
        } else if (batch.validation_1 === true || batch.validation_1 === 1) {
            return `
                <div class="validation-status">
                    <svg class="validation-icon" fill="#10b981" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                    </svg>
                    <span style="color: #10b981; font-size: 13px; font-weight: 500;">Passed</span>
                </div>
            `;
        } else {
            return `
                <div class="validation-status">
                    <svg class="validation-icon" fill="#ef4444" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
                    </svg>
                    <button class="btn btn-sm btn-outline" onclick="Batches.viewValidationErrors(${batch.id})" style="margin-left: 4px;">
                        View Errors
                    </button>
                </div>
            `;
        }
    },

    async viewBatchDetails(batchId) {
        try {
            const batch = await API.get(`/batches/${batchId}`);
            const orders = await API.get(`/batches/${batchId}/orders?limit=10`);
            
            alert(`Batch Details:
ID: ${batch.id}
File: ${batch.fileName || 'N/A'}
Status: ${batch.status}
Total Orders: ${batch.totalOrders}
Successful: ${batch.successfulOrders}
Failed: ${batch.failedOrders}
Success Rate: ${this.getSuccessRate(batch)}
Duration: ${batch.duration ? batch.duration + 's' : 'N/A'}

First 10 Orders:
${orders.orders?.slice(0, 10).map(o => o.orderId).join(', ') || 'None'}`);
        } catch (error) {
            alert('Failed to load batch details: ' + error.message);
        }
    },

    async deleteBatch(batchId) {
        if (!confirm('Are you sure you want to delete this batch? This will also delete all associated orders.')) {
            return;
        }

        try {
            await API.delete(`/batches/${batchId}`);
            alert('Batch deleted successfully');
            this.loadBatches();
            this.loadBatchStats();
        } catch (error) {
            alert('Failed to delete batch: ' + error.message);
        }
    },

    updatePagination(pagination) {
        if (!pagination) return;

        this.totalPages = pagination.totalPages || 1;
        this.currentPage = pagination.page || 1;

        const pageInfo = document.getElementById('batch-page-info');
        const prevBtn = document.getElementById('batch-prev-page');
        const nextBtn = document.getElementById('batch-next-page');

        if (pageInfo) {
            pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        }

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= this.totalPages;
        }
    },

    setupValidationModal() {
        const modal = document.getElementById('validation-modal');
        const closeBtn = document.getElementById('validation-modal-close');
        const closeModalBtn = document.getElementById('close-validation-btn');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeValidationModal());
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeValidationModal());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeValidationModal();
                }
            });
        }
    },

    async viewValidationErrors(batchId) {
        try {
            // Fetch validation errors for the batch
            const response = await API.get(`/batches/${batchId}`);
            const batch = response;

            // Fetch orders with validation data
            const ordersResponse = await API.get(`/batches/${batchId}/orders?limit=100`);
            const orders = ordersResponse.orders || [];

            // Filter orders that have validations
            const ordersWithValidations = orders.filter(order => 
                order.validations && order.validations.length > 0
            );

            this.displayValidationErrors(batch, ordersWithValidations);
            this.openValidationModal();
        } catch (error) {
            alert('Failed to load validation errors: ' + error.message);
        }
    },

    displayValidationErrors(batch, orders) {
        const container = document.getElementById('validation-content');
        if (!container) return;

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No validation errors found for this batch.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="margin-bottom: 16px;">
                <h4 style="font-size: 14px; color: var(--gray-700);">Batch ID: ${batch.id}</h4>
                <p style="font-size: 13px; color: var(--gray-600);">Total Orders with Errors: ${orders.length}</p>
            </div>
            ${orders.map(order => `
                <div class="validation-error-item">
                    <h4>Order ID: ${order.orderId}</h4>
                    ${order.validations.map(validation => `
                        <div style="margin-top: 8px;">
                            ${validation.validation ? `
                                <pre>${JSON.stringify(validation.validation, null, 2)}</pre>
                            ` : '<p style="color: var(--gray-500);">No validation details available</p>'}
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        `;
    },

    openValidationModal() {
        const modal = document.getElementById('validation-modal');
        if (modal) {
            modal.classList.add('active');
        }
    },

    closeValidationModal() {
        const modal = document.getElementById('validation-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    Batches.init();
});
