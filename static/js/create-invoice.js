document.addEventListener('DOMContentLoaded', function() {
    // Initialize particles background
    createParticles();
    
    // Set up event listeners
    setupEventListeners();
    
    // Calculate initial totals
    calculateTotals();
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
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', () => {
            showHapticFeedback(backButton);
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
    
    // Add item button
    const addItemBtn = document.getElementById('add-item-btn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', addItemRow);
    }
    
    // Remove item buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.remove-item-btn')) {
            const removeBtn = e.target.closest('.remove-item-btn');
            const itemRow = removeBtn.closest('.item-row');
            if (itemRow) {
                itemRow.remove();
                calculateTotals();
            }
        }
    });
    
    // Form inputs for real-time calculation
    document.addEventListener('input', (e) => {
        const target = e.target;
        if (target.name && (
            target.name.startsWith('item_qty') || 
            target.name.startsWith('item_price') ||
            target.id === 'tax' ||
            target.id === 'amount_paid'
        )) {
            calculateTotals();
        }
    });
    
    // Form submission
    const invoiceForm = document.getElementById('invoiceForm');

    if (invoiceForm) {
        invoiceForm.onsubmit = submitInvoice;
    }
    
    // Save draft button
    const saveDraftBtn = document.getElementById('save-draft');

    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', saveDraftInvoice);
    }
    
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
}

// Function to add a new item row
function addItemRow() {
    const itemsContainer = document.getElementById('items-container');
    if (!itemsContainer) return;
    
    const newItemRow = document.createElement('div');
    newItemRow.className = 'item-row';
    newItemRow.innerHTML = `
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
    
    itemsContainer.appendChild(newItemRow);
    showHapticFeedback(document.getElementById('add-item-btn'));
}

// Function to calculate invoice totals
function calculateTotals() {
    const itemsContainer = document.getElementById('items-container');
    if (!itemsContainer) return;
    
    let subtotal = 0;
    const itemRows = itemsContainer.querySelectorAll('.item-row');
    
    itemRows.forEach(row => {
        const qtyInput = row.querySelector('input[name="item_qty[]"]');
        const priceInput = row.querySelector('input[name="item_price[]"]');
        
        if (qtyInput && priceInput) {
            const qty = parseFloat(qtyInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            subtotal += qty * price;
        }
    });
    
    // Update subtotal
    const subtotalEl = document.getElementById('subtotal');
    if (subtotalEl) {
        subtotalEl.textContent = formatCurrency(subtotal);
    }
    
    // Calculate tax
    const taxInput = document.getElementById('tax');
    const taxRate = parseFloat(taxInput?.value) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    
    // Calculate total
    const total = subtotal + taxAmount;
    const totalEl = document.getElementById('total');
    if (totalEl) {
        totalEl.textContent = formatCurrency(total);
    }
    
    // Calculate balance
    const amountPaidInput = document.getElementById('amount_paid');
    const amountPaid = parseFloat(amountPaidInput?.value) || 0;
    const balance = total - amountPaid;
    const balanceEl = document.getElementById('balance');
    if (balanceEl) {
        balanceEl.textContent = formatCurrency(balance);
        balanceEl.className = 'balance';
        if (balance < 0) {
            balanceEl.style.color = '#2ecc71';
        } else if (balance > 0) {
            balanceEl.style.color = '#f39c12';
        } else {
            balanceEl.style.color = '#4361ee';
        }
    }
}

// Function to format currency
async function submitInvoice(e) {
    e.preventDefault();

    const invoiceForm = document.getElementById('invoiceForm');

    const formData = new FormData(invoiceForm);
    const invoiceData = Object.fromEntries(formData.entries());

    if (!validateForm(invoiceData)) {
        return;
    }

    const btn = invoiceForm.querySelector('button[type="submit"]');

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
            showModal("success", "Invoice created successfully");
            sessionStorage.removeItem(
                "dashboard_data"
            );

            sessionStorage.removeItem(
                "dashboard_data_time"
            );
        } else {
            showModal("error", data.message || "Failed");
        }

    } catch (err) {
        console.error(err);
        clearLoading(btn);
        showModal("error", "Server error");
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
        notes: formData.get("notes")
    };

    try {
        const res = await fetch("/invoice/drafts", {
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
            showModal("success", "Draft saved successfully");
            sessionStorage.removeItem(
                "dashboard_data"
            );

            sessionStorage.removeItem(
                "dashboard_data_time"
            );
        } else {
            showModal("error", data.message || "Draft failed");
        }

    } catch (err) {
        console.error(err);
        clearLoading(saveDraftBtn);
        showModal("error", "Server error");
    }
}

// Function to validate form
function validateForm(data) {
    // Check required fields
    if (!data.client_name.trim()) {
        showModal("error", "Please enter a client name.");
        return false;
    }
    
    if (!data.client_email.trim()) {
        showModal("error", "Please enter a client email.");
        return false;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.client_email)) {
        showModal("error", "Please enter a valid email address.");
        return false;
    }
    
    // Check if there are items
    const itemDescs = document.querySelectorAll('input[name="item_desc[]"]');
    if (itemDescs.length === 0 || !itemDescs[0].value.trim()) {
        showModal("error", "Please add at least one invoice item.");
        return false;
    }
    
    return true;
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
function showToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="12" y1="17" x2="12.01" y2="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
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

function  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
