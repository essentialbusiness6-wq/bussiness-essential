document.addEventListener('DOMContentLoaded', function() {

    // Initialize particles background
    createParticles();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load sample invoices
    loadSampleInvoices();
    
    // Animate invoices on load
    setTimeout(() => {
        animateInvoices();
    }, 300);
});

// Function to create floating particles in the background
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    const particleCount = window.innerWidth > 768 ? 40 : 25;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        // Random size between 3px and 10px
        const size = Math.random() * 7 + 3;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // Random position
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        // Random animation duration and delay
        const duration = Math.random() * 10 + 15;
        const delay = Math.random() * 5;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${delay}s`;
        
        // Random opacity
        particle.style.opacity = `${Math.random() * 0.5 + 0.1}`;
        
        particlesContainer.appendChild(particle);
    }
}

// Function to set up all event listeners
function setupEventListeners() {
    // Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showHapticFeedback(backBtn);
            // In a real app, this would navigate back
            window.history.back();
        });
    }
    
    // Help button
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            showHapticFeedback(helpBtn);
            window.location.href = '/support';
        });
    }
    
    // Create invoice button
    const createInvoiceBtn = document.getElementById('createInvoiceBtn');
    if (createInvoiceBtn) {
        createInvoiceBtn.addEventListener('click', () => {
            showHapticFeedback(createInvoiceBtn);
            // In a real app, this would navigate to create invoice page
            window.location.href = '/dashboard/create-invoice';
        });
    }
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            showHapticFeedback(button);
            
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Get selected status
            const status = button.dataset.status;
            
            // Filter invoices (in a real app, this would fetch from API)
            filterInvoices(status);
        });
    });
    
    // Close modal button
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', hideModal);
    }
    
    // Modal overlay click to close
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                hideModal();
            }
        });
    }
    
    // Modal action button
    const modalActionBtn = document.getElementById('modalActionBtn');
    if (modalActionBtn) {
        modalActionBtn.addEventListener('click', () => {
            const redirectUrl = modalActionBtn.dataset.redirect;
            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                hideModal();
            }
        });
    }
    
    // Delete confirmation modal
    const closeDeleteModal = document.getElementById('closeDeleteModal');
    const cancelDelete = document.getElementById('cancelDelete');
    const deleteModal = document.getElementById('deleteModal');
    
    if (closeDeleteModal) {
        closeDeleteModal.addEventListener('click', () => {
            hideDeleteModal();
        });
    }
    
    if (cancelDelete) {
        cancelDelete.addEventListener('click', () => {
            hideDeleteModal();
        });
    }
    
    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                hideDeleteModal();
            }
        });
    }
    
    // Delegate event listeners for dynamically created elements
    document.addEventListener('click', (e) => {
        // View invoice button
        if (e.target.closest('.action-btn.view')) {
            const button = e.target.closest('.action-btn.view');
            const invoiceId = button.dataset.invoiceId;
            viewInvoice(invoiceId);
        }
        
        // Edit invoice button
        if (e.target.closest('.action-btn.edit')) {
            const button = e.target.closest('.action-btn.edit');
            const invoiceId = button.dataset.invoiceId;
            editInvoice(invoiceId);
        }
        
        // Delete invoice button
        if (e.target.closest('.action-btn.delete')) {
            const button = e.target.closest('.action-btn.delete');
            const invoiceId = button.dataset.invoiceId;
            showDeleteConfirmation(invoiceId);
        }
        
        // View invoice footer
        if (e.target.closest('.invoice-footer')) {
            const footer = e.target.closest('.invoice-footer');
            const invoiceCard = footer.closest('.invoice-card');
            const invoiceId = invoiceCard.dataset.invoiceId;
            viewInvoice(invoiceId);
        }
    });
}

// Function to load sample invoices
async function loadSampleInvoices() {
    const invoicesGrid = document.getElementById('invoicesGrid');


    try {
        const response = await fetch('/dashboard/invoices/list/data', {
            method: "GET",
            credentials: "include"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to fetch invoices");
        }


        if (data.status !== "success") {
            throw new Error(data.message || "Failed to load invoices");
        }

        invoicesGrid.innerHTML = '';

        const invoices = data.invoices || [];
        const currencySymbol = data.currency_symbol || '$';
        applyTheme(data.theme)

        if (invoices.length === 0) {
            invoicesGrid.innerHTML = `
                <div class="empty-state">
                    <h3>No invoices found</h3>
                    <p>Create your first invoice to get started.</p>
                </div>
            `;
            return;
        }

        invoices.forEach(invoice => {
            const card = createInvoiceCard(invoice, currencySymbol);
            invoicesGrid.appendChild(card);
        });

        animateInvoices();

    } catch (error) {
        console.error(error);

        showToast(
            "Failed to load invoices",
            "error"
        );
    }
}


function applyTheme(theme) {
    const body = document.body;

    if (theme === "dark") {
        body.classList.add("dark");
        body.classList.remove("light");
    } else {
        body.classList.remove("dark");
        body.classList.add("light");
    }

    // optional: persist it
    localStorage.setItem("theme", theme);
}

// Function to create an invoice card element
function createInvoiceCard(invoice, currencySymbol) {

    const card = document.createElement('div');

    card.className = `invoice-card ${invoice.status}`;
    card.dataset.invoiceId = invoice.id;

    const formattedAmount =
        `${currencySymbol}${Number(invoice.amount).toLocaleString()}`;

    card.innerHTML = `
        <div class="invoice-header">
            <div>
                <h4 class="invoice-id">
                    ${invoice.invoice_number}
                </h4>

                <span class="invoice-date">
                    ${invoice.invoice_date}
                </span>
            </div>

            <span class="status ${invoice.status}">
                ${invoice.status.charAt(0).toUpperCase() +
                  invoice.status.slice(1)}
            </span>
        </div>

        <div class="invoice-body">
            <div class="invoice-row">
                <span>Client</span>
                <strong>${invoice.client}</strong>
            </div>

            <div class="invoice-row">
                <span>Total</span>

                <strong class="invoice-amount ${invoice.status}">
                    ${formattedAmount}
                </strong>
            </div>

            <div class="invoice-row">
                <span>Due Date</span>
                <strong>${invoice.due_date}</strong>
            </div>
        </div>

        <div class="invoice-footer">
            <span>View invoice</span>

            <svg viewBox="0 0 24 24">
                <path
                    d="M5 12h14"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                />
                <path
                    d="m12 5 7 7-7 7"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
        </div>

        <div class="invoice-actions">

            <button
                class="action-btn view"
                data-invoice-id="${invoice.id}"
                title="View"
            >
                <svg viewBox="0 0 24 24">
                    <path
                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    />
                    <circle
                        cx="12"
                        cy="12"
                        r="3"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    />
                </svg>
            </button>

            <button
                class="action-btn edit"
                data-invoice-id="${invoice.id}"
                title="Edit"
            >
                <svg viewBox="0 0 24 24">
                    <path
                        d="M12 20h9"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    />
                    <path
                        d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    />
                </svg>
            </button>

            <button
                class="action-btn delete"
                data-invoice-id="${invoice.id}"
                title="Delete"
            >
                <svg viewBox="0 0 24 24">
                    <path
                        d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    />
                </svg>
            </button>

        </div>
    `;

    return card;
}
// Function to filter invoices by status
function filterInvoices(status) {
    const invoicesGrid = document.getElementById('invoicesGrid');
    if (!invoicesGrid) return;
    
    // In a real app, this would fetch filtered data from API
    // For now, we'll just simulate by hiding/showing cards
    
    const invoiceCards = invoicesGrid.querySelectorAll('.invoice-card');
    invoiceCards.forEach(card => {
        if (status === 'all' || card.classList.contains(status)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
    
    showToast(`Showing ${status === 'all' ? 'all' : status} invoices`);
}

// Function to animate invoices
function animateInvoices() {
    const invoiceCards = document.querySelectorAll('.invoice-card');
    invoiceCards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('visible');
        }, 100 * index);
    });
}

// Function to handle view invoice
function viewInvoice(invoiceId) {
    showHapticFeedback(document.querySelector(`[data-invoice-id="${invoiceId}"] .view`));
    // In a real app, this would navigate to the invoice view page
    window.location.href = `/dashboard/view-invoices/full/${invoiceId}`;
}

// Function to handle edit invoice
function editInvoice(invoiceId) {
    showHapticFeedback(document.querySelector(`[data-invoice-id="${invoiceId}"] .edit`));
    // In a real app, this would navigate to the edit invoice page
    window.location.href = `/invoice/edit/${invoiceId}`;
}

// Function to show delete confirmation
function showDeleteConfirmation(invoiceId) {
    showHapticFeedback(document.querySelector(`[data-invoice-id="${invoiceId}"] .delete`));
    
    // Show delete confirmation modal
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) {
        deleteModal.classList.add('show');
        
        // Set up confirm delete button
        const confirmDelete = document.getElementById('confirmDelete');
        if (confirmDelete) {
            // Store the invoice ID for deletion
            confirmDelete.dataset.invoiceId = invoiceId;
            
            confirmDelete.onclick = () => {
                deleteInvoice(invoiceId);
            };
        }
    }
}

// Function to handle delete invoice
async function deleteInvoice(invoiceId) {
    e.preventDefault();
    const deleteBtn = document.getElementById('confirmDelete');

    setLoading(deleteBtn, "Deleting...");
    try {
        const res = await fetch(`/invoice/delete/${invoiceId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "credentials": "include"
            }
        });
        const data = await res.json();
        clearLoading(deleteBtn);
        if (data.status === "success") {
            showToast("Invoice deleted successfully", "success");
            setTimeout(() => {
                window.location.href = '/dashboard/invoices/list';
            }, 1500);
        } else {
            showToast(data.message || "Failed to delete invoice", "error");
        }
    } catch (err) {
        console.error(err);
        clearLoading(deleteBtn);
        showToast("Server error", "error");
    }
}

// Function to hide delete modal
function hideDeleteModal() {
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) {
        deleteModal.classList.remove('show');
    }
    
    const confirmDelete = document.getElementById('confirmDelete');
    if (confirmDelete) {
        confirmDelete.disabled = false;
        confirmDelete.textContent = 'Delete Invoice';
    }
}

// Function to show haptic feedback animation
function showHapticFeedback(element) {
    if (!element) return;
    
    element.classList.add('haptic-feedback');
    setTimeout(() => {
        element.classList.remove('haptic-feedback');
    }, 200);
}

// Function to show toast notification
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' || type === 'error' ? type : ''}`;
    toast.innerHTML = `
        ${type === 'success' ? `
        <svg viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ` : type === 'error' ? `
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
            <line x1="15" y1="9" x2="9" y2="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="9" y1="9" x2="15" y2="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ` : `
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="12" y1="17" x2="12.01" y2="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        `}
        ${message}
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
    
    // Animate out and remove
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(100px)';
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2800);
}

// Function to show modal
function showModal(type, message, redirectUrl = null) {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalIcon = document.querySelector('.modal-icon');
    const modalBtn = document.getElementById('modalActionBtn');
    
    if (!modalOverlay || !modalTitle || !modalMessage || !modalIcon || !modalBtn) return;
    
    // Set modal content based on type
    if (type === 'error') {
        modalOverlay.querySelector('.modal-card').classList.add('error');
        modalTitle.textContent = 'Error';
        modalIcon.innerHTML = `
            <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="currentColor"/>
                <line x1="15" y1="9" x2="9" y2="15" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="9" y1="9" x2="15" y2="15" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    } else {
        modalOverlay.querySelector('.modal-card').classList.remove('error');
        modalTitle.textContent = 'Notification';
        modalIcon.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" fill="currentColor"/>
                <path d="M12 16v-4" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <circle cx="12" cy="8" r="0.5" fill="white"/>
            </svg>
        `;
    }
    
    modalMessage.textContent = message;
    
    // Set redirect URL if provided
    if (redirectUrl) {
        modalBtn.textContent = 'Go to Login';
        modalBtn.dataset.redirect = redirectUrl;
    } else {
        modalBtn.textContent = 'OK';
        modalBtn.dataset.redirect = '';
    }
    
    // Show modal
    modalOverlay.classList.add('show');
}

// Function to hide modal
function hideModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('show');
    }
}

// Add CSS animations
const style = document.createElement('style');
style.innerHTML = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    @keyframes haptic {
        0% { transform: translateX(0); }
        25% { transform: translateX(-2px); }
        50% { transform: translateX(2px); }
        75% { transform: translateX(-2px); }
        100% { transform: translateX(0); }
    }
    .haptic-feedback {
        animation: haptic 0.15s ease-in-out;
    }
    .toast {
        position: fixed;
        bottom: calc(20px + var(--safe-area-bottom));
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: rgba(255, 255, 255, 0.95);
        color: var(--dark);
        padding: 14px 24px;
        border-radius: 50px;
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        font-weight: 500;
        transition: transform 0.3s ease, opacity 0.3s ease;
        max-width: 85%;
        text-align: center;
        backdrop-filter: blur(12px);
        border: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .toast svg {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        fill: var(--primary);
    }
    .toast.success {
        background: rgba(46, 204, 113, 0.95);
        color: white;
    }
    .toast.success svg {
        fill: white;
    }
    .toast.error {
        background: rgba(231, 76, 60, 0.95);
        color: white;
    }
    .toast.error svg {
        fill: white;
    }
`;
document.head.appendChild(style);
