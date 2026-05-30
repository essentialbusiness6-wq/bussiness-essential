document.addEventListener('DOMContentLoaded', function() {
    // Initialize particles background
    createParticles();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load sample payments
    loadSamplePayments();
    
    // Animate payments on load
    setTimeout(() => {
        animatePayments();
    }, 300);
});
let payments = []; // This will hold the payment data fetched from the server
let currency = "USD"; // Default currency, will be updated from server data
let currencySymbol = "$";
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
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', () => {
            showHapticFeedback(backButton);
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
    
    // Search functionality
    const paymentSearch = document.getElementById('paymentSearch');
    if (paymentSearch) {
        paymentSearch.addEventListener('input', (e) => {
            filterPayments(e.target.value);
        });
    }
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            showHapticFeedback(button);
            
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const status = button.dataset.status;
            filterPaymentsByStatus(status);
        });
    });
    
    // Create first invoice button
    const createFirstInvoice = document.getElementById('createFirstInvoice');
    if (createFirstInvoice) {
        createFirstInvoice.addEventListener('click', () => {
            showHapticFeedback(createFirstInvoice);
            showToast("Redirecting to create invoice...");
            // window.location.href = '/invoices/create';
        });
    }
    
    // Payment preview modal
    const closePaymentModal = document.getElementById('closePaymentModal');
    const modalClose = document.getElementById('modalClose');
    const paymentModal = document.getElementById('paymentModal');
    const modalViewInvoice = document.getElementById('modalViewInvoice');
    
    if (closePaymentModal) closePaymentModal.addEventListener('click', hidePaymentModal);
    if (modalClose) modalClose.addEventListener('click', hidePaymentModal);
    
    if (paymentModal) {
        paymentModal.addEventListener('click', (e) => {
            if (e.target === paymentModal) hidePaymentModal();
        });
    }
    
    if (modalViewInvoice) {
        modalViewInvoice.addEventListener('click', () => {
            const invoiceId = modalViewInvoice.dataset.invoiceId;
            hidePaymentModal();
            showToast(`Opening invoice ${invoiceId}...`);
            // window.location.href = `/invoices/view/${invoiceId}`;
        });
    }
    
    // Delegate event listeners for dynamically created elements
    document.addEventListener('click', (e) => {
        // View payment button
        if (e.target.closest('.view-payment')) {
            const button = e.target.closest('.view-payment');
            const invoiceId = button.dataset.invoiceId;
            viewPayment(invoiceId);
        }
    });
}


// Function to load sample payments
function loadSamplePayments() {
    fetch("/dashboard/payment/data", {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include"
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "success") {

            payments = data.payments;
            currency = data.currency || "NGN";
            currencySymbol = data.currencySymbol || "$";
            // After loading payments, populate the UI
            populatePaymentsTable(payments);
            populatePaymentCards(payments);
            checkEmptyState(payments.length);

                // Calculate summary values
    const totalReceived = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);
    
    const outstanding = payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0);
    
    const overdue = payments
        .filter(p => p.status === 'overdue')
        .reduce((sum, p) => sum + p.amount, 0);
    
    // Update summary cards
    document.getElementById('totalReceived').textContent = formatCurrency(totalReceived);
    document.getElementById('outstanding').textContent = formatCurrency(outstanding);
    document.getElementById('overdue').textContent = formatCurrency(overdue);
            
        } else {
            showToast("Failed to load payments. Please try again later.", "error");
        }
    })  
    

    

}

// Function to populate payments table
function populatePaymentsTable(payments) {
    const tableBody = document.getElementById('paymentsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    payments.forEach(payment => {
        const row = document.createElement('tr');
        row.dataset.paymentId = payment.id;
        
        row.innerHTML = `
            <td>${payment.id}</td>
            <td>${payment.client}</td>
            <td>${payment.date}</td>
            <td>${formatCurrency(payment.amount)}</td>
            <td><span class="status ${payment.status}">${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span></td>
            <td>
                <button class="action-btn view-payment" data-invoice-id="${payment.id}" title="View">
                    <svg viewBox="0 0 24 24">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Function to populate payment cards (mobile)
function populatePaymentCards(payments) {
    const cardsContainer = document.getElementById('paymentCardsContainer');
    if (!cardsContainer) return;
    
    cardsContainer.innerHTML = '';
    
    payments.forEach(payment => {
        const card = document.createElement('div');
        card.className = 'payment-card';
        card.dataset.paymentId = payment.id;
        
        card.innerHTML = `
            <div class="payment-card-header">
                <div>
                    <div class="invoice-id">${payment.id}</div>
                    <div class="payment-card-client">${payment.client}</div>
                </div>
                <span class="status ${payment.status}">${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span>
            </div>
            <div class="payment-card-body">
                <div class="payment-card-row">
                    <span class="payment-card-label">Date</span>
                    <span class="payment-card-value">${payment.date}</span>
                </div>
                <div class="payment-card-row">
                    <span class="payment-card-label">Amount</span>
                    <span class="payment-card-value payment-card-amount ${payment.status}">${formatCurrency(payment.amount)}</span>
                </div>
            </div>
            <div class="payment-card-footer">
                <button class="action-btn view-payment" data-invoice-id="${payment.id}">
                    <svg viewBox="0 0 24 24">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            </div>
        `;
        
        cardsContainer.appendChild(card);
    });
}

// Function to check and show/hide empty state
function checkEmptyState(paymentCount) {
    const emptyState = document.getElementById('emptyState');
    const paymentsTable = document.querySelector('.payments-table');
    const paymentCards = document.querySelector('.payment-cards');
    
    if (paymentCount === 0) {
        if (emptyState) emptyState.style.display = 'block';
        if (paymentsTable) paymentsTable.style.display = 'none';
        if (paymentCards) paymentCards.style.display = 'none';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        if (paymentsTable) paymentsTable.style.display = 'block';
        if (paymentCards) paymentCards.style.display = 'flex';
    }
}

// Function to animate payments
function animatePayments() {
    const tableRows = document.querySelectorAll('.payments-table tbody tr');
    const paymentCards = document.querySelectorAll('.payment-card');
    
    // Animate table rows
    tableRows.forEach((row, index) => {
        setTimeout(() => {
            row.style.opacity = '0';
            row.style.transform = 'translateY(10px)';
            setTimeout(() => {
                row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, 10);
        }, 100 * index);
    });
    
    // Animate payment cards
    paymentCards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('visible');
        }, 100 * index);
    });
}

// Function to filter payments by search term
function filterPayments(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const tableRows = document.querySelectorAll('.payments-table tbody tr');
    const paymentCards = document.querySelectorAll('.payment-card');
    
    let visibleCount = 0;
    
    // Filter table rows
    tableRows.forEach(row => {
        const invoiceId = row.querySelector('td:first-child')?.textContent.toLowerCase() || '';
        const clientName = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
        
        if (invoiceId.includes(term) || clientName.includes(term)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Filter payment cards
    paymentCards.forEach(card => {
        const invoiceId = card.querySelector('.invoice-id')?.textContent.toLowerCase() || '';
        const clientName = card.querySelector('.payment-card-client')?.textContent.toLowerCase() || '';
        
        if (invoiceId.includes(term) || clientName.includes(term)) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Update empty state
    checkEmptyState(visibleCount);
}

// Function to filter payments by status
function filterPaymentsByStatus(status) {
    const tableRows = document.querySelectorAll('.payments-table tbody tr');
    const paymentCards = document.querySelectorAll('.payment-card');
    
    let visibleCount = 0;
    
    // Filter table rows
    tableRows.forEach(row => {
        const paymentStatus = row.querySelector('.status')?.classList[1] || '';
        
        if (status === 'all' || paymentStatus === status) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Filter payment cards
    paymentCards.forEach(card => {
        const paymentStatus = card.querySelector('.status')?.classList[1] || '';
        
        if (status === 'all' || paymentStatus === status) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Update empty state
    checkEmptyState(visibleCount);
    
    if (status !== 'all') {
        showToast(`Showing ${status} payments`);
    }
}

// Function to view payment details
function viewPayment(paymentId) {
    showHapticFeedback(document.querySelector(`[data-invoice-id="${paymentId}"] .view-payment`));
    
    // Find payment data
    const payments = [
        {
            id: 'INV-2024-001',
            client: 'TechSolutions Inc.',
            email: 'billing@techsolutions.com',
            date: 'Feb 1, 2024',
            dueDate: 'Mar 1, 2024',
            amount: 1250.00,
            status: 'paid',
            items: [
                { desc: 'Website Development', qty: 1, price: 1000.00 },
                { desc: 'UI/UX Design', qty: 1, price: 250.00 }
            ],
            notes: 'Thank you for your business! Payment received via bank transfer.'
        },
        {
            id: 'INV-2024-002',
            client: 'DesignHub Studio',
            email: 'hello@designhub.com',
            date: 'Jan 28, 2024',
            dueDate: 'Feb 28, 2024',
            amount: 875.50,
            status: 'paid',
            items: [
                { desc: 'Logo Design', qty: 1, price: 350.00 },
                { desc: 'Brand Guidelines', qty: 1, price: 525.50 }
            ],
            notes: 'Payment received via PayPal. Includes 3 rounds of revisions.'
        },
        {
            id: 'INV-2023-089',
            client: 'Global Innovations',
            email: 'accounts@globalinnovations.com',
            date: 'Dec 5, 2023',
            dueDate: 'Jan 5, 2024',
            amount: 2450.00,
            status: 'overdue',
            items: [
                { desc: 'Mobile App Development', qty: 1, price: 2000.00 },
                { desc: 'App Store Submission', qty: 1, price: 450.00 }
            ],
            notes: 'Payment overdue. Follow-up email sent on Jan 10, 2024.'
        }
    ];
    
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;
    
    // Populate modal
    document.getElementById('modalInvoiceTitle').textContent = payment.id;
    document.getElementById('modalPaymentDetails').innerHTML = `
        <p><strong>Client:</strong> ${payment.client}</p>
        <p><strong>Email:</strong> ${payment.email}</p>
        <p><strong>Invoice Date:</strong> ${payment.date}</p>
        <p><strong>Due Date:</strong> ${payment.dueDate}</p>
        <p><strong>Amount:</strong> <span class="${payment.status}">${formatCurrency(payment.amount)}</span></p>
        <p><strong>Status:</strong> <span class="status ${payment.status}">${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span></p>
        <p><strong>Items:</strong></p>
        <ul style="padding-left: 20px; margin-bottom: 12px;">
            ${payment.items.map(item => `<li>${item.desc}: ${formatCurrency(item.price)}</li>`).join('')}
        </ul>
        ${payment.notes ? `<p><strong>Notes:</strong> ${payment.notes}</p>` : ''}
    `;
    
    // Set invoice ID for view button
    const viewInvoiceBtn = document.getElementById('modalViewInvoice');
    if (viewInvoiceBtn) {
        viewInvoiceBtn.dataset.invoiceId = paymentId;
    }
    
    // Show modal
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Function to hide payment modal
function hidePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function formatCurrency(amount) {
    return `${currencySymbol}${amount}.00`;
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