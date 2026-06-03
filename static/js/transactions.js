document.addEventListener('DOMContentLoaded', function() {
    // Initialize particles background
    createParticles();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load sample transactions
    loadSampleTransactions();
    
    // Animate transactions on load
    setTimeout(() => {
        animateTransactions();
    }, 300);
});

let transactionsData = [];
let currrencySymbol = '$';

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
    
    // Download button
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            showHapticFeedback(downloadBtn);
            showToast('Downloading transaction report...');
            // In a real app: trigger download
            setTimeout(() => {
                showToast('✓ Report downloaded successfully!', 'success');
            }, 1500);
        });
    }
    
    // Date selectors
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (monthSelect) {
        monthSelect.addEventListener('change', () => {
            showHapticFeedback(monthSelect);
            filterTransactionsByDate();
        });
    }
    
    if (yearSelect) {
        yearSelect.addEventListener('change', () => {
            showHapticFeedback(yearSelect);
            filterTransactionsByDate();
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
            filterTransactionsByStatus(status);
        });
    });
    
    // Create first invoice button
    const createFirstInvoice = document.getElementById('createFirstInvoice');
    if (createFirstInvoice) {
        createFirstInvoice.addEventListener('click', () => {
            showHapticFeedback(createFirstInvoice);
            showToast('Redirecting to create invoice...');
            window.location.href = '/dashboard/create-invoice';
        });
    }
    
    // Transaction detail modal
    const closeTransactionModal = document.getElementById('closeTransactionModal');
    const modalClose = document.getElementById('modalClose');
    const transactionModal = document.getElementById('transactionModal');
    const modalViewInvoice = document.getElementById('modalViewInvoice');
    
    if (closeTransactionModal) closeTransactionModal.addEventListener('click', hideTransactionModal);
    if (modalClose) modalClose.addEventListener('click', hideTransactionModal);
    
    if (transactionModal) {
        transactionModal.addEventListener('click', (e) => {
            if (e.target === transactionModal) hideTransactionModal();
        });
    }
    
    if (modalViewInvoice) {
        modalViewInvoice.addEventListener('click', () => {
            const invoiceId = modalViewInvoice.dataset.invoiceId;
            hideTransactionModal();
            showToast(`Opening transaction ${invoiceId}...`);
            // window.location.href = `/transactions/view/${invoiceId}`;
        });
    }
    
    // Delegate event listeners for dynamically created elements
    document.addEventListener('click', (e) => {
        // View transaction card
        if (e.target.closest('.transaction-card')) {
            const card = e.target.closest('.transaction-card');
            const invoiceId = card.dataset.invoiceId;
            viewTransaction(invoiceId);
        }
    });
}

// Function to load sample transactions

function loadSampleTransactions(forceRefresh = false) {

    const cached = sessionStorage.getItem("transactions_data");

    // ========================
    // USE CACHE FIRST
    // ========================
    if (!forceRefresh && cached) {
        const data = JSON.parse(cached);
        handleTransactionsResponse(data);
        return;
    }

    fetch("/transactions/data", {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include"
    })
    .then(async (response) => {

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        return response.json();
    })
    .then(data => {

        if (data.status !== "success") {
            throw new Error(data.message || "Failed to load transactions");
        }

        // ========================
        // CACHE RESULT
        // ========================
        sessionStorage.setItem(
            "transactions_data",
            JSON.stringify(data)
        );

        handleTransactionsResponse(data);
    })
    .catch(error => {

        console.error("Error fetching transactions:", error);

        const cached = sessionStorage.getItem("transactions_data");

        if (cached) {
            handleTransactionsResponse(JSON.parse(cached));
            showToast("Using cached data", "info");
            return;
        }

        showToast(
            "Failed to load transactions. Please try again later.",
            "error"
        );
    });
}

function handleTransactionsResponse(data) {

    const transactions = data.transactions_by_month || {};
    transactionsData = data.transactions || [];
    currencySymbol = data.currencySymbol || "$";

    console.log("Fetched transactions:", transactions);

    // ========================
    // FLATTEN SAFELY
    // ========================
    const allTransactions = Object.values(transactions).flat() || [];

    const total = allTransactions.length;
    const paid = allTransactions.filter(t => t.status === "paid").length;
    const pending = allTransactions.filter(t => t.status === "pending").length;
    const overdue = allTransactions.filter(t => t.status === "overdue").length;

    // ========================
    // SAFE DOM UPDATES
    // ========================
    const totalEl = document.getElementById("totalTransactions");
    const paidEl = document.getElementById("paidCount");
    const pendingEl = document.getElementById("pendingCount");
    const overdueEl = document.getElementById("overdueCount");

    if (totalEl) totalEl.textContent = total;
    if (paidEl) paidEl.textContent = paid;
    if (pendingEl) pendingEl.textContent = pending;
    if (overdueEl) overdueEl.textContent = overdue;

    // ========================
    // RENDER LIST
    // ========================
    populateTransactions(transactions);

    // ========================
    // EMPTY STATE
    // ========================
    checkEmptyState(total);

    // OPTIONAL: theme support if backend sends it
    if (data.theme) {
        applyTheme(data.theme);
        sessionStorage.setItem("theme", data.theme);
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
// Function to populate transactions
function populateTransactions(transactions) {
    const container = document.getElementById('transactionsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.entries(transactions).forEach(([month, txs]) => {
        const section = document.createElement('section');
        section.className = 'transaction-group';
        
        section.innerHTML = `
            <h3 class="group-title">
                <svg viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="16" y1="2" x2="16" y2="6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="8" y1="2" x2="8" y2="6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="3" y1="10" x2="21" y2="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                ${month}
            </h3>
        `;
        
        txs.forEach(tx => {
            const card = document.createElement('div');
            card.className = `transaction-card visible ${tx.status}`;
            card.dataset.invoiceId = tx.id;
            card.dataset.status = tx.status;
            card.dataset.date = tx.date;
            card.dataset.type = tx.type;
            
            // Format currency
            const formattedAmount = formatCurrency(tx.amount);
            
            card.innerHTML = `
                <div class="left">
                    <div class="status-icon ${tx.status}">
                        ${getStatusIcon(tx.status)}
                    </div>
                    <div class="details">
                        <span class="type-badge ${tx.type}">${tx.type}</span>
                        <p class="title">${tx.id} • ${tx.client || 'Unknown Client'}</p>
                        <span class="date">${tx.date}</span>
                    </div>
                </div>
                <div class="right">
                    <p class="amount">${formattedAmount}</p>
                    <span class="status ${tx.status}">${tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}</span>
                </div>
            `;
            
            section.appendChild(card);
        });
        
        container.appendChild(section);
    });
}

// Function to get status icon SVG
function getStatusIcon(status) {
    switch(status) {
        case 'paid':
            return `
                <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                    <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
        case 'pending':
            return `
                <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                    <polyline points="12 6 12 12 16 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
        case 'overdue':
            return `
                <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                    <line x1="12" y1="8" x2="12" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <line x1="12" y1="16" x2="12.01" y2="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `;
        case 'unpaid':
                return `
                <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                    <line x1="15" y1="9" x2="9" y2="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
        default:
            return `
                <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                </svg>
            `;
    }
}

// Function to check and show/hide empty state
function checkEmptyState(transactionCount) {
    const emptyState = document.getElementById('emptyState');
    const transactionsContainer = document.getElementById('transactionsContainer');
    
    if (transactionCount === 0) {
        if (emptyState) emptyState.style.display = 'block';
        if (transactionsContainer) transactionsContainer.style.display = 'none';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        if (transactionsContainer) transactionsContainer.style.display = 'block';
    }
}

// Function to animate transactions
function animateTransactions() {
    const cards = document.querySelectorAll('.transaction-card');
    
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('visible');
        }, 100 * index);
    });
}

// Function to filter transactions by date
function filterTransactionsByDate() {
    const month = document.getElementById('monthSelect').value;
    const year = document.getElementById('yearSelect').value;
    
    // In a real app, this would fetch from API
    // For now, we'll just show a message
    showToast(`Filtering transactions for ${getMonthName(month)} ${year}`);
    
    // Re-apply status filter if active
    const activeFilter = document.querySelector('.filter.active');
    if (activeFilter) {
        filterTransactionsByStatus(activeFilter.dataset.status);
    }
}

// Function to get month name from index
function getMonthName(monthIndex) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[parseInt(monthIndex)] || 'Unknown';
}

// Function to filter transactions by status
function filterTransactionsByStatus(status) {
    const cards = document.querySelectorAll('.transaction-card');
    
    let visibleCount = 0;
    
    cards.forEach(card => {
        const cardStatus = card.dataset.status;
        
        if (status === 'all' || cardStatus === status) {
            card.style.display = 'flex';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Update empty state
    checkEmptyState(visibleCount);
    
    if (status !== 'all') {
        showToast(`Showing ${status} transactions`);
    }
}

// Function to view transaction details
function viewTransaction(invoiceId) {
    showHapticFeedback(document.querySelector(`[data-invoice-id="${invoiceId}"]`));
    
    // Sample transaction data with type

    
    const transaction = transactionsData.find(t => t.id === invoiceId);
    if (!transaction) return;
    
    // Get type badge HTML
    const typeBadge = `<span class="type-badge ${transaction.type}">${transaction.type}</span>`;
    
    // Populate modal
    document.getElementById('modalInvoiceTitle').textContent = `${transaction.type.toUpperCase()}: ${transaction.id}`;
    document.getElementById('modalTransactionDetails').innerHTML = `
        ${typeBadge}
        <p><strong>Client:</strong> ${transaction.client}</p>
        <p><strong>Email:</strong> ${transaction.email}</p>
        <p><strong>Date:</strong> ${transaction.date}</p>
        ${transaction.dueDate !== 'N/A' ? `<p><strong>Due Date:</strong> ${transaction.dueDate}</p>` : ''}
        <p><strong>Amount:</strong> <span class="${transaction.status}">${formatCurrency(transaction.amount)}</span></p>
        <p><strong>Status:</strong> <span class="status ${transaction.status}">${transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}</span></p>
        ${transaction.notes ? `<p><strong>Notes:</strong> ${transaction.notes}</p>` : ''}
    `;
    
    // Set invoice ID for view button
    const viewInvoiceBtn = document.getElementById('modalViewInvoice');
    if (viewInvoiceBtn) {
        viewInvoiceBtn.dataset.invoiceId = invoiceId;
    }
    
    // Show modal
    const modal = document.getElementById('transactionModal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Function to hide transaction modal
function hideTransactionModal() {
    const modal = document.getElementById('transactionModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Function to format currency
function formatCurrency(amount) {
    return `${currencySymbol}${amount.toLocaleString()}.00`;           
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
`;
document.head.appendChild(style);
