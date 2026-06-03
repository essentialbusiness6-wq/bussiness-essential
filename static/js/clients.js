document.addEventListener('DOMContentLoaded', function() {
    // Initialize particles background
    createParticles();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load sample clients
    loadSampleClients();
    
    // Animate clients on load
    setTimeout(() => {
        animateClients();
    }, 300);
});

let clients = [];

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
    const goBack = document.getElementById('goBack');
    if (goBack) {
        goBack.addEventListener('click', () => {
            showHapticFeedback(goBack);
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
    
    // Add client button
    const addClientBtn = document.getElementById('addClientBtn');
    const addFirstClient = document.getElementById('addFirstClient');
    
    if (addClientBtn) {
        addClientBtn.addEventListener('click', () => {
            showHapticFeedback(addClientBtn);
            showAddClientModal();
        });
    }
    
    if (addFirstClient) {
        addFirstClient.addEventListener('click', () => {
            showHapticFeedback(addFirstClient);
            showAddClientModal();
        });
    }
    
    // Search functionality
    const clientSearch = document.getElementById('clientSearch');
    if (clientSearch) {
        clientSearch.addEventListener('input', (e) => {
            filterClients(e.target.value);
        });
    }
    
    // Add client modal
    const closeAddClientModal = document.getElementById('closeAddClientModal');
    const cancelAddClient = document.getElementById('cancelAddClient');
    const addClientModal = document.getElementById('addClientModal');
    const addClientForm = document.getElementById('addClientForm');
    
    if (closeAddClientModal) closeAddClientModal.addEventListener('click', hideAddClientModal);
    if (cancelAddClient) cancelAddClient.addEventListener('click', hideAddClientModal);
    
    if (addClientModal) {
        addClientModal.addEventListener('click', (e) => {
            if (e.target === addClientModal) hideAddClientModal();
        });
    }
    
    if (addClientForm) {
        addClientForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleAddClient(e);
        });
    }
    
    // Client preview modal
    const closeClientPreview = document.getElementById('closeClientPreview');
    const closePreview = document.getElementById('closePreview');
    const clientPreviewModal = document.getElementById('clientPreviewModal');
    const createInvoiceForClient = document.getElementById('createInvoiceForClient');
    
    if (closeClientPreview) closeClientPreview.addEventListener('click', hideClientPreview);
    if (closePreview) closePreview.addEventListener('click', hideClientPreview);
    
    if (clientPreviewModal) {
        clientPreviewModal.addEventListener('click', (e) => {
            if (e.target === clientPreviewModal) hideClientPreview();
        });
    }
    
    if (createInvoiceForClient) {
        createInvoiceForClient.addEventListener('click', () => {
            const clientId = createInvoiceForClient.dataset.clientId;
            hideClientPreview();
            showToast(`Creating invoice for client ${clientId}...`);
            // window.location.href = `/invoices/create?client=${clientId}`;
        });
    }
    
    // Delete modal
    const closeDeleteModal = document.getElementById('closeDeleteModal');
    const cancelDelete = document.getElementById('cancelDelete');
    const confirmDelete = document.getElementById('confirmDelete');
    const deleteModal = document.getElementById('deleteModal');
    
    if (closeDeleteModal) closeDeleteModal.addEventListener('click', hideDeleteModal);
    if (cancelDelete) cancelDelete.addEventListener('click', hideDeleteModal);
    
    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) hideDeleteModal();
        });
    }
    
    if (confirmDelete) {
        confirmDelete.addEventListener('click', () => {
            handleDeleteClient();
        });
    }

    
    
    // Delegate event listeners for dynamically created elements
    document.addEventListener('click', (e) => {
        // View client button (desktop)
        if (e.target.closest('.view-client')) {
            const button = e.target.closest('.view-client');
            const clientId = button.dataset.clientId;
            viewClient(clientId);
        }
        
        // Create invoice button (desktop)
        if (e.target.closest('.create-invoice')) {
            const button = e.target.closest('.create-invoice');
            const clientId = button.dataset.clientId;
            createInvoice(clientId);
        }

        // Edit client button (desktop)
        if (e.target.closest('.edit-client')) {
            const button = e.target.closest('.edit-client');
            const clientId = button.dataset.clientId;
            editClient(clientId);
        }
        
        // Delete client button (desktop)
        if (e.target.closest('.delete-client')) {
            const button = e.target.closest('.delete-client');
            const clientId = button.dataset.clientId;
            showDeleteConfirmation(clientId);
        }
    });
}



// Function to load sample clients
let clients = [];

async function loadSampleClients(forceRefresh = false) {

    try {

        const url = forceRefresh
            ? `/dashboard/clients/data?t=${Date.now()}`
            : "/dashboard/clients/data";

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error(
                `Server returned ${response.status}`
            );
        }

        const data = await response.json();

        console.log("Received clients data:", data);

        if (data.status !== "success") {
            throw new Error(
                data.message || "Failed to load clients"
            );
        }

        clients = Array.isArray(data.clients)
            ? data.clients
            : [];

        populateClientsTable(clients);

        populateClientsCards(clients);

        if (typeof applyTheme === "function") {
            applyTheme(
                data.theme || "light"
            );
        }

        checkEmptyState(clients.length);

    } catch (error) {

        console.error(
            "Error loading clients:",
            error
        );

        if (
            typeof showToast === "function"
        ) {
            showToast(
                error.message ||
                "Failed to load clients",
                "error"
            );
        }

        const tableBody =
            document.querySelector(
                "#clientsTable tbody"
            );

        const cardsContainer =
            document.getElementById(
                "clientCards"
            );

        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="100%">
                        Failed to load clients.
                    </td>
                </tr>
            `;
        }

        if (cardsContainer) {
            cardsContainer.innerHTML = `
                <div class="error-state">
                    Failed to load clients.
                    <br><br>
                    <button
                        class="btn primary"
                        onclick="loadSampleClients(true)"
                    >
                        Retry
                    </button>
                </div>
            `;
        }
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

// Function to populate clients table
function populateClientsTable(clients) {
    const tableBody = document.getElementById('clientsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    clients.forEach(client => {
        const row = document.createElement('tr');
        row.dataset.clientId = client.id;
        
        const formattedOutstanding = formatCurrency(client.outstanding);
        
        row.innerHTML = `
            <td>
                <div class="client-info">
                    <div class="avatar">${client.initials}</div>
                    <span>${client.name}</span>
                </div>
            </td>
            <td>${client.email}</td>
            <td>${client.totalInvoices}</td>
            <td>
                <span class="amount ${client.outstanding > 0 ? 'danger' : 'success'}">
                    ${client.outstanding > 0 ? formattedOutstanding : '$0.00'}
                </span>
            </td>
            <td><span class="status ${client.status}">${client.status.charAt(0).toUpperCase() + client.status.slice(1)}</span></td>
            <td class="actions">
                <button class="icon view-client" data-client-id="${client.id}" title="View">
                    <svg viewBox="0 0 24 24">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
                <button class="icon edit create-invoice" data-client-id="${client.id}" title="Create Invoice">
                    <svg viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <line x1="16" y1="13" x2="8" y2="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="16" y1="17" x2="8" y2="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <polyline points="10 9 9 9 8 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="icon edit edit-client" data-client-id="${client.id}" title="Edit">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 20h9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="icon danger delete-client" data-client-id="${client.id}" title="Delete">
                    <svg viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Function to populate client cards (mobile)
function populateClientsCards(clients) {
    const cardsContainer = document.getElementById('clientCardsContainer');
    if (!cardsContainer) return;
    
    cardsContainer.innerHTML = '';

    console.log('Populating client cards with clients:', clients);
    
    clients.forEach(client => {
        const card = document.createElement('div');
        card.className = 'client-card';
        card.dataset.clientId = client.id;
        
        const formattedOutstanding = formatCurrency(client.outstanding);
        
        card.innerHTML = `
            <div class="client-card-header">
                <div class="client-card-info">
                    <div class="avatar">${client.initials}</div>
                    <div>
                        <div class="client-card-name">${client.name}</div>
                        <div class="client-card-email">${client.email}</div>
                    </div>
                </div>
                <span class="client-card-status ${client.status}">${client.status.charAt(0).toUpperCase() + client.status.slice(1)}</span>
            </div>
            <div class="client-card-stats">
                <div class="client-card-stat">
                    <span class="client-card-stat-label">Invoices</span>
                    <span class="client-card-stat-value">${client.totalInvoices}</span>
                </div>
                <div class="client-card-stat">
                    <span class="client-card-stat-label">Outstanding</span>
                    <span class="client-card-stat-value ${client.outstanding > 0 ? 'danger' : 'success'}">
                        ${client.outstanding > 0 ? formattedOutstanding : '$0.00'}
                    </span>
                </div>
            </div>
            <div class="client-card-actions">
                <button class="btn secondary view-client" data-client-id="${client.id}">
                    <svg viewBox="0 0 24 24" style="width: 16px; height: 16px;">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    View
                </button>
                <button class="btn secondary create-invoice" data-client-id="${client.id}">
                    <svg viewBox="0 0 24 24" style="width: 16px; height: 16px;">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <line x1="16" y1="13" x2="8" y2="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="16" y1="17" x2="8" y2="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <polyline points="10 9 9 9 8 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Invoice
                </button>
                <button class="btn edit edit-client" data-client-id="${client.id}">
                    <svg viewBox="0 0 24 24" style="width: 16px; height: 16px;">
                        <path d="M12 20h9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Edit
                </button>
                <button class="btn danger delete-client" data-client-id="${client.id}">
                    <svg viewBox="0 0 24 24" style="width: 16px; height: 16px;">
                        <polyline points="3 6 5 6 21 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>   
                    </svg>
                    Delete
                </button>     
            </div>
        `;
        
        card.classList.add('visible');
        cardsContainer.appendChild(card);
    });
}

// Function to check and show/hide empty state
function checkEmptyState(clientCount) {
    const emptyState = document.getElementById('emptyState');
    const clientsTable = document.querySelector('.clients-card');
    const clientCards = document.querySelector('.client-cards');

    console.log('Checking empty state with client count:', clientCount);

    if (clientCount <= 0) {
        if (emptyState) emptyState.style.display = 'block';

        if (clientsTable) clientsTable.style.display = 'none';

        if (clientCards) {
            clientCards.style.display = 'none';
        }
    } else {
        if (emptyState) emptyState.style.display = 'none';

        if (clientsTable) {
            clientsTable.style.display = '';
        }

        if (clientCards) {
            clientCards.style.display = '';
        }
    }
}

// Function to animate clients
function animateClients() {
    const tableRows = document.querySelectorAll('.clients-table tbody tr');
    const clientCards = document.querySelectorAll('.client-card');
    
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
    
    // Animate client cards
    clientCards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('visible');
        }, 100 * index);
    });
}

// Function to filter clients
function filterClients(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const tableRows = document.querySelectorAll('.clients-table tbody tr');
    const clientCards = document.querySelectorAll('.client-card');
    
    let visibleCount = 0;
    
    // Filter table rows
    tableRows.forEach(row => {
        const clientName = row.querySelector('.client-info span')?.textContent.toLowerCase() || '';
        const clientEmail = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
        
        if (clientName.includes(term) || clientEmail.includes(term)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Filter client cards
    clientCards.forEach(card => {
        const clientName = card.querySelector('.client-card-name')?.textContent.toLowerCase() || '';
        const clientEmail = card.querySelector('.client-card-email')?.textContent.toLowerCase() || '';
        
        if (clientName.includes(term) || clientEmail.includes(term)) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Update empty state
    checkEmptyState(visibleCount);
}

// Function to show add client modal
function showAddClientModal() {
    const modal = document.getElementById('addClientModal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Function to hide add client modal
function hideAddClientModal() {
    const modal = document.getElementById('addClientModal');
    if (modal) {
        modal.classList.remove('show');
    }
    
    // Reset form
    const form = document.getElementById('addClientForm');
    if (form) {
        form.reset();
    }
}

// Function to handle add client form submission
async function handleAddClient(e) {
    e.preventDefault();
    
    const clientName = document.getElementById('clientName').value.trim();
    const clientEmail = document.getElementById('clientEmail').value.trim();
    const clientPhone = document.getElementById('clientPhone').value.trim();
    const clientCompany = document.getElementById('clientCompany').value.trim();
    const clientNotes = document.getElementById('clientNotes').value.trim();
    
    // Validate
    if (!clientName || !clientEmail) {
        showToast('Please fill in all required fields', 'danger');
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg viewBox="0 0 24 24" style="animation: spin 1s linear infinite;">
            <path d="M12 2v6m0 10v6M4.93 4.93l4.24 4.24m8.49-8.49l4.24 4.24M1.5 12h6m10 0h6M4.93 19.07l4.24-4.24m8.49 8.49l4.24-4.24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Adding...
    `;


    const newClient = {
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        company: clientCompany,
        notes: clientNotes
    };

    try {
        const response = await fetch("/clients/add", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(newClient)
        });
        const data = await response.json();
        console.log("Add client response:", data);
        if (data.status === "success") {
            hideAddClientModal();
            showToast( data.message || 'Client added successfully!', 'success');
            setTimeout(() => {
                animateClients();
            }, 300);
        } else {
            showToast( data.message || 'Failed to add client. Please try again.', 'danger');
        }

    } catch (error) {
        console.error("Error adding client:", error);
        showToast('An error occurred while adding the client. Please try again.', 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
        
}

// Function to get initials from name
function getInitials(name) {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

// Function to add client to UI
function addClientToUI(client) {
    // Add to table
    const tableBody = document.getElementById('clientsTableBody');
    if (tableBody) {
        const row = document.createElement('tr');
        row.dataset.clientId = client.id;
        
        const formattedOutstanding = formatCurrency(client.outstanding);
        
        row.innerHTML = `
            <td>
                <div class="client-info">
                    <div class="avatar">${client.initials}</div>
                    <span>${client.name}</span>
                </div>
            </td>
            <td>${client.email}</td>
            <td>${client.totalInvoices}</td>
            <td>
                <span class="amount ${client.outstanding > 0 ? 'danger' : 'success'}">
                    ${client.outstanding > 0 ? formattedOutstanding : '$0.00'}
                </span>
            </td>
            <td><span class="status ${client.status}">${client.status.charAt(0).toUpperCase() + client.status.slice(1)}</span></td>
            <td class="actions">
                <button class="icon view-client" data-client-id="${client.id}" title="View">
                    <svg viewBox="0 0 24 24">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
                <button class="icon edit create-invoice" data-client-id="${client.id}" title="Create Invoice">
                    <svg viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <line x1="16" y1="13" x2="8" y2="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="16" y1="17" x2="8" y2="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <polyline points="10 9 9 9 8 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="icon danger delete-client" data-client-id="${client.id}" title="Delete">
                    <svg viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    }
    
    // Add to cards
    const cardsContainer = document.getElementById('clientCardsContainer');
    if (cardsContainer) {
        const card = document.createElement('div');
        card.className = 'client-card';
        card.dataset.clientId = client.id;
        
        const formattedOutstanding = formatCurrency(client.outstanding);
        
        card.innerHTML = `
            <div class="client-card-header">
                <div class="client-card-info">
                    <div class="avatar">${client.initials}</div>
                    <div>
                        <div class="client-card-name">${client.name}</div>
                        <div class="client-card-email">${client.email}</div>
                    </div>
                </div>
                <span class="client-card-status ${client.status}">${client.status.charAt(0).toUpperCase() + client.status.slice(1)}</span>
            </div>
            <div class="client-card-stats">
                <div class="client-card-stat">
                    <span class="client-card-stat-label">Invoices</span>
                    <span class="client-card-stat-value">${client.totalInvoices}</span>
                </div>
                <div class="client-card-stat">
                    <span class="client-card-stat-label">Outstanding</span>
                    <span class="client-card-stat-value ${client.outstanding > 0 ? 'danger' : 'success'}">
                        ${client.outstanding > 0 ? formattedOutstanding : '$0.00'}
                    </span>
                </div>
            </div>
            <div class="client-card-actions">
                <button class="btn secondary view-client" data-client-id="${client.id}">
                    <svg viewBox="0 0 24 24" style="width: 16px; height: 16px;">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    View
                </button>
                <button class="btn secondary create-invoice" data-client-id="${client.id}">
                    <svg viewBox="0 0 24 24" style="width: 16px; height: 16px;">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <line x1="16" y1="13" x2="8" y2="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="16" y1="17" x2="8" y2="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <polyline points="10 9 9 9 8 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Invoice
                </button>
            </div>
        `;
        
        cardsContainer.appendChild(card);
    }
    
    // Update empty state
    const allClients = document.querySelectorAll('.clients-table tbody tr, .client-card');
    checkEmptyState(allClients.length);
}

// Function to view client
function viewClient(clientId) {
   showHapticFeedback(
    document.querySelector(
        `.view-client[data-client-id="${clientId}"]`
    )
);
    

    const client = clients.find(
    c => String(c.id) === String(clientId)
);
    if (!client) return;
    
    // Populate preview modal
    document.getElementById('previewClientName').textContent = client.name;
    document.getElementById('previewClientDetails').innerHTML = `
        <p><strong>Email:</strong> ${client.email}</p>
        <p><strong>Phone:</strong> ${client.phone || 'Not provided'}</p>
        <p><strong>Company:</strong> ${client.company || 'Not provided'}</p>
        <p><strong>Total Invoices:</strong> ${client.totalInvoices}</p>
        <p><strong>Outstanding:</strong> <span class="${client.outstanding > 0 ? 'danger' : 'success'}">${formatCurrency(client.outstanding)}</span></p>
        <p><strong>Status:</strong> <span class="status ${client.status}">${client.status.charAt(0).toUpperCase() + client.status.slice(1)}</span></p>
        ${client.address ? `<p><strong>Address:</strong> ${client.address}</p>` : ''}
        ${client.notes ? `<p><strong>Notes:</strong> ${client.notes}</p>` : ''}
    `;
    
    // Set client ID for create invoice button
    const createInvoiceBtn = document.getElementById('createInvoiceForClient');
    if (createInvoiceBtn) {
        createInvoiceBtn.dataset.clientId = clientId;
    }
    
    // Show modal
    const modal = document.getElementById('clientPreviewModal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Function to hide client preview
function hideClientPreview() {
    const modal = document.getElementById('clientPreviewModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Function to create invoice for client
function createInvoice(clientId) {
    showHapticFeedback(document.querySelector(`[data-client-id="${clientId}"] .create-invoice`));
    showToast(`Creating invoice for client ${clientId}...`);
    window.location.href = `/create-invoice?client=${clientId}`;
}

function editClient(clientId) {
    showHapticFeedback(document.querySelector(`[data-client-id="${clientId}"] .edit-client`));
    showToast(`Editing client ${clientId}...`);
    window.location.href = `/clients/edit/${clientId}`;
}

// Function to show delete confirmation
function showDeleteConfirmation(clientId) {
    showHapticFeedback(document.querySelector(`[data-client-id="${clientId}"] .delete-client`));
    
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.add('show');
        confirmDelete.dataset.clientId = clientId;
    }
}

// Function to hide delete modal
function hideDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Function to handle delete client
async function handleDeleteClient() {
    const clientId = confirmDelete.dataset.clientId;
    if (!clientId) return;
    
    // Show loading state
    confirmDelete.disabled = true;
    confirmDelete.innerHTML = `
        <svg viewBox="0 0 24 24" style="animation: spin 1s linear infinite;">
            <path d="M12 2v6m0 10v6M4.93 4.93l4.24 4.24m8.49-8.49l4.24 4.24M1.5 12h6m10 0h6M4.93 19.07l4.24-4.24m8.49 8.49l4.24-4.24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Deleting...
    `;
    
    try{
        const response = await fetch(`/client/delete/${clientId}`, {
            method: "DELETE",
            headers: {  
                "Content-Type": "application/json"
            },
            credentials: "include"
        });
        const data = await response.json();
        console.log("Delete client response:", data);
        if (data.status == "success") {
            showToast(data.message || 'Client deleted successfully', 'success');
              const allClients = document.querySelectorAll('.clients-table tbody tr, .client-card');
        checkEmptyState(allClients.length);
        } else {
            throw new Error(data.message || 'Failed to delete client. Please try again.');
        }
    } catch (error) {
        console.error("Error deleting client:", error);
        showToast(error.message || 'An error occurred while deleting the client. Please try again.', 'danger');

    } finally {
        confirmDelete.disabled = false;
        confirmDelete.innerHTML = 'Delete Client';
        hideDeleteModal();
    }

}

// Function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
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
