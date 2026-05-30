document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const backButton = document.getElementById('backButton');
    const helpBtn = document.getElementById('helpBtn');
    const addItemBtn = document.getElementById('add-item-btn');
    const itemsContainer = document.getElementById('items-container');
    const taxInput = document.getElementById('tax');
    const subtotalElement = document.getElementById('subtotal');
    const totalElement = document.getElementById('total');
    const balanceElement = document.getElementById('balance');
    const amountPaidInput = document.getElementById('amount_paid');
    const saveInvoiceBtn = document.getElementById('saveInvoiceBtn');
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const deleteDraftBtn = document.getElementById('deleteDraftBtn');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const confirmModal = document.getElementById('confirmModal');
    const particlesContainer = document.getElementById('particles');
    const draftId = document.getElementById('draftId')?.value || '123';
    
    // Initialize
    createParticles();
    calculateTotals();
    calculateBalance();
    
    // Event Listeners
    backButton.addEventListener('click', () => {
        backButton.classList.add('haptic-feedback');
        setTimeout(() => {
            backButton.classList.remove('haptic-feedback');
            window.location.href = '/dashboard/invoices/drafts';
        }, 200);
    });
    
    helpBtn.addEventListener('click', () => {
        helpBtn.classList.add('haptic-feedback');
        setTimeout(() => {
            helpBtn.classList.remove('haptic-feedback');
            window.location.href = '/support';
        }, 200);
    });
    
    addItemBtn.addEventListener('click', () => {
        addItemBtn.classList.add('haptic-feedback');
        setTimeout(() => {
            addItemBtn.classList.remove('haptic-feedback');
        }, 200);
        
        addItemRow();
        calculateTotals();
    });
    
    itemsContainer.addEventListener('click', (e) => {
        if (e.target.closest('.remove-item-btn')) {
            const button = e.target.closest('.remove-item-btn');
            const row = button.closest('.item-row');
            
            if (itemsContainer.children.length > 1) {
                row.classList.add('haptic-feedback');
                setTimeout(() => {
                    row.classList.remove('haptic-feedback');
                    row.remove();
                    calculateTotals();
                    calculateBalance();
                }, 200);
            } else {
                showToast('At least one item is required', 'danger');
            }
        }
    });
    
    // Input event listeners for calculations
    itemsContainer.addEventListener('input', () => {
        calculateTotals();
        calculateBalance();
    });
    
    taxInput.addEventListener('input', () => {
        calculateTotals();
        calculateBalance();
    });
    
    amountPaidInput.addEventListener('input', calculateBalance);
    
    // Save as Invoice functionality
    saveInvoiceBtn.addEventListener('click', submitInvoice);
    
    // Save as Draft functionality
    saveDraftBtn.addEventListener('click', saveDraftInvoice);
    
    // Delete draft with confirmation
    deleteDraftBtn.addEventListener('click', () => {
        deleteDraftBtn.classList.add('haptic-feedback');
        setTimeout(() => {
            deleteDraftBtn.classList.remove('haptic-feedback');
        }, 200);
        
        confirmModal.classList.add('active');
    });
    
    cancelDeleteBtn.addEventListener('click', () => {
        cancelDeleteBtn.classList.add('haptic-feedback');
        setTimeout(() => {
            cancelDeleteBtn.classList.remove('haptic-feedback');
        }, 200);
        
        confirmModal.classList.remove('active');
    });
    
    confirmDeleteBtn.addEventListener('click', deleteInvoice);
    
    // Close modal when clicking outside
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            confirmModal.classList.remove('active');
        }
    });
    
    // Functions
    function addItemRow() {
        const newRow = document.createElement('div');
        newRow.className = 'item-row';
        newRow.innerHTML = `
            <input type="text" name="item_desc[]" placeholder="Item description" required>
            <input type="number" name="item_qty[]" placeholder="Qty" min="1" required value="1">
            <input type="number" name="item_price[]" placeholder="Price" min="0" step="0.01" required value="0.00">
            <button type="button" class="remove-item-btn">
                <svg viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <line x1="6" y1="6" x2="18" y2="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        `;
        itemsContainer.appendChild(newRow);
        
        // Animate the new row
        setTimeout(() => {
            newRow.style.opacity = '0';
            newRow.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                newRow.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                newRow.style.opacity = '1';
                newRow.style.transform = 'translateX(0)';
            }, 10);
        }, 0);
        
        // Re-attach event listeners
        newRow.querySelector('.remove-item-btn').addEventListener('click', (e) => {
            if (itemsContainer.children.length > 1) {
                newRow.remove();
                calculateTotals();
                calculateBalance();
            } else {
                showToast('At least one item is required', 'danger');
            }
        });
        
        newRow.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                calculateTotals();
                calculateBalance();
            });
        });
    }
    
    function calculateTotals() {
        const currencySymbol = getCurrencySymbol();
        let subtotal = 0;
        
        // Calculate subtotal from items
        const itemRows = itemsContainer.querySelectorAll('.item-row');
        itemRows.forEach(row => {
            const qty = parseFloat(row.querySelector('[name="item_qty[]"]').value) || 0;
            const price = parseFloat(row.querySelector('[name="item_price[]"]').value) || 0;
            subtotal += qty * price;
        });
        
        // Calculate tax and total
        const taxRate = parseFloat(taxInput.value) || 0;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;
        
        // Update UI
        subtotalElement.textContent = formatCurrency(subtotal, currencySymbol);
        totalElement.textContent = formatCurrency(total, currencySymbol);
    }
    
    function calculateBalance() {
        const currencySymbol = getCurrencySymbol();
        const totalText = totalElement.textContent.replace(/[^0-9.]/g, '');
        const total = parseFloat(totalText) || 0;
        const amountPaid = parseFloat(amountPaidInput.value) || 0;
        const balance = total - amountPaid;
        
        balanceElement.textContent = formatCurrency(balance, currencySymbol);
        
        // Update balance color based on status
        if (balance < 0) {
            balanceElement.style.color = '#2ecc71'; // Green for overpaid
        } else if (balance > 0) {
            balanceElement.style.color = '#f39c12'; // Orange for unpaid
        } else {
            balanceElement.style.color = '#4361ee'; // Blue for paid
        }
    }
    
    function getCurrencySymbol() {
        const currency = document.getElementById('currency').value;
        switch(currency) {
            case 'USD': return '$';
            case 'EUR': return '€';
            case 'GBP': return '£';
            case 'NGN': return '₦';
            default: return '$';
        }
    }
    
    function formatCurrency(amount, symbol) {
        return `${symbol}${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
    }
    
    function validateForm() {
        const clientName = document.getElementById('client_name').value.trim();
        const clientEmail = document.getElementById('client_email').value.trim();
        const invoiceDate = document.getElementById('invoice_date').value;
        const dueDate = document.getElementById('due_date').value;
        
        if (!clientName) {
            showToast('Please enter a client name', 'danger');
            document.getElementById('client_name').focus();
            return false;
        }
        
        if (!clientEmail || !isValidEmail(clientEmail)) {
            showToast('Please enter a valid email address', 'danger');
            document.getElementById('client_email').focus();
            return false;
        }
        
        if (!invoiceDate) {
            showToast('Please select an invoice date', 'danger');
            document.getElementById('invoice_date').focus();
            return false;
        }
        
        if (!dueDate) {
            showToast('Please select a due date', 'danger');
            document.getElementById('due_date').focus();
            return false;
        }
        
        // Check if at least one item exists
        const itemRows = itemsContainer.querySelectorAll('.item-row');
        if (itemRows.length === 0) {
            showToast('Please add at least one invoice item', 'danger');
            return false;
        }
        
        // Validate each item
        for (let row of itemRows) {
            const desc = row.querySelector('[name="item_desc[]"]').value.trim();
            const qty = parseFloat(row.querySelector('[name="item_qty[]"]').value) || 0;
            const price = parseFloat(row.querySelector('[name="item_price[]"]').value) || 0;
            
            if (!desc) {
                showToast('Please enter an item description', 'danger');
                row.querySelector('[name="item_desc[]"]').focus();
                return false;
            }
            
            if (qty < 1) {
                showToast('Quantity must be at least 1', 'danger');
                row.querySelector('[name="item_qty[]"]').focus();
                return false;
            }
            
            if (price < 0) {
                showToast('Price cannot be negative', 'danger');
                row.querySelector('[name="item_price[]"]').focus();
                return false;
            }
        }
        
        return true;
    }
    
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    function createParticles() {
        const particleCount = window.innerWidth > 768 ? 30 : 15;
        
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
    
    function showToast(message, type = 'info') {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create new toast
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'success' || type === 'danger' ? type : ''}`;
        toast.innerHTML = `
            ${type === 'success' ? `
            <svg viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ` : type === 'danger' ? `
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
    
    async function submitInvoice(e) {
    e.preventDefault();

    const invoiceForm = document.getElementById('invoiceForm');

    const formData = new FormData(invoiceForm);
    const invoiceData = Object.fromEntries(formData.entries());

    if (!validateForm(invoiceData)) {
        return;
    }

    const btn = document.getElementById('saveInvoiceBtn');

    setLoading(btn, "Creating Invoice...");

    const items = [];
    const descs = formData.getAll("item_desc[]");
    const qtys = formData.getAll("item_qty[]");
    const prices = formData.getAll("item_price[]");

    for (let i = 0; i < descs.length; i++) {
        items.push({
            description: descs[i],
            quantity: parseFloat(qtys[i]) || 0,
            price: parseFloat(prices[i]) || 0
        });
    }

    let subtotal = 0;
    items.forEach(item => {
        subtotal += item.quantity * item.price;
    });

    const taxPercent = parseFloat(formData.get("tax")) || 0;
    const total = subtotal + (subtotal * taxPercent / 100);
    const amountPaid = parseFloat(formData.get("amount_paid")) || 0;

    const payload = {
        invoice_number: formData.get("invoice_number"),
        client_name: formData.get("client_name"),
        client_email: formData.get("client_email"),
        invoice_date: formData.get("invoice_date"),
        due_date: formData.get("due_date"),
        currency: formData.get("currency"),
        subtotal,
        tax: taxPercent,
        total,
        amount_paid: amountPaid,
        items,
        notes: formData.get("notes")
    };

    try {
        const res = await fetch("/create_invoice", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "credentials": "include"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        clearLoading(btn);

        if (data.status === "success") {
            showToast( "Draft saved as Invoice successfully","success");
        } else {
            showToast( data.message || "Failed","error");
        }

    } catch (err) {
        console.error(err);
        clearLoading(btn);
        showToast( "Server error","error");
    }
}

    async function saveDraftInvoice(e) {
    e.preventDefault();


    const invoiceForm = document.getElementById('invoiceForm');
    const saveDraftBtn = document.getElementById('save-draft');

    setLoading(saveDraftBtn, "Saving Draft...");

    const formData = new FormData(invoiceForm);

    const items = [];
    const descs = formData.getAll("item_desc[]");
    const qtys = formData.getAll("item_qty[]");
    const prices = formData.getAll("item_price[]");

    for (let i = 0; i < descs.length; i++) {
        items.push({
            description: descs[i],
            quantity: parseFloat(qtys[i]) || 0,
            price: parseFloat(prices[i]) || 0
        });
    }

    let subtotal = 0;

    items.forEach(item => {
        subtotal += item.quantity * item.price;
    });

    const taxPercent = parseFloat(formData.get("tax")) || 0;
    const total = subtotal + (subtotal * taxPercent / 100);

    const payload = {
        user_id: formData.get("user_id"),
        invoice_number: formData.get("invoice_number"),
        client_name: formData.get("client_name"),
        client_email: formData.get("client_email"),
        invoice_date: formData.get("invoice_date"),
        due_date: formData.get("due_date"),
        currency: formData.get("currency"),
        subtotal,
        tax: taxPercent,
        total,
        items,
        notes: formData.get("notes"),
        draft_id: formData.get("draft_id"),
        amount_paid: parseFloat(formData.get("amount_paid")) || 0,
        balance: parseFloat(formData.get("balance")) || 0
    };

    try {
        const res = await fetch("/invoice/draft/update-edit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "credentials": "include"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        clearLoading(saveDraftBtn);

        if (data.status === "success") {
            showToast("Draft updated successfully", "success");
        } else {
            showToast(data.message || "Draft failed", "error");
        }

    } catch (err) {
        console.error(err);
        clearLoading(saveDraftBtn);
        showToast("Server error", "error");
    }
}



    async function deleteInvoice(e) {
    e.preventDefault();
    const deleteBtn = document.getElementById('confirmDelete');

    setLoading(deleteBtn, "Deleting...");
    const invoiceId = document.getElementById('invoiceId').value;
    try {
        const res = await fetch(`/invoices/draft/delete/${invoiceId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        });
        const data = await res.json();
        clearLoading(deleteBtn);
        if (data.status === "success") {
            showToast("Draft deleted successfully", "success");
            setTimeout(() => {
                window.location.href = '/invoice/drafts/list';
            }, 1500);
        } else {
            showToast(data.message || "Failed to delete draft", "error");
        }
    } catch (err) {
        console.error(err);
        clearLoading(deleteBtn);
        showToast("Server error", "error");
    }
}

    function setLoading(button, text) {
    if (!button) return;

    button.disabled = true;

    button.dataset.originalText = button.innerHTML;

    button.innerHTML = `
        <span class="spinner"></span>
        ${text}
    `;
}

function clearLoading(button) {
    if (!button) return;

    button.disabled = false;

    if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
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
        .toast.danger {
            background: rgba(231, 76, 60, 0.95);
            color: white;
        }
        .toast.danger svg {
            fill: white;
        }
    `;
    document.head.appendChild(style);
    
    // Add entrance animations
    setTimeout(() => {
        document.querySelectorAll('.form-group').forEach((group, index) => {
            group.style.opacity = '0';
            group.style.transform = 'translateY(10px)';
            setTimeout(() => {
                group.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                group.style.opacity = '1';
                group.style.transform = 'translateY(0)';
            }, 300 + index * 80);
        });
        
        document.querySelector('.items-section').style.opacity = '0';
        document.querySelector('.items-section').style.transform = 'translateY(10px)';
        setTimeout(() => {
            document.querySelector('.items-section').style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            document.querySelector('.items-section').style.opacity = '1';
            document.querySelector('.items-section').style.transform = 'translateY(0)';
        }, 700);
        
        document.querySelector('.invoice-summary').style.opacity = '0';
        document.querySelector('.invoice-summary').style.transform = 'translateY(10px)';
        setTimeout(() => {
            document.querySelector('.invoice-summary').style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            document.querySelector('.invoice-summary').style.opacity = '1';
            document.querySelector('.invoice-summary').style.transform = 'translateY(0)';
        }, 800);
        
        document.querySelector('.form-actions').style.opacity = '0';
        document.querySelector('.form-actions').style.transform = 'translateY(10px)';
        setTimeout(() => {
            document.querySelector('.form-actions').style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            document.querySelector('.form-actions').style.opacity = '1';
            document.querySelector('.form-actions').style.transform = 'translateY(0)';
        }, 900);
    }, 300);
});