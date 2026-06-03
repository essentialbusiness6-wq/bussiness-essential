document.addEventListener('DOMContentLoaded', function() {
    // Initialize particles background
    createParticles();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load sample drafts
    loadSampleDrafts();
    
    // Animate drafts on load
    setTimeout(() => {
        animateDrafts();
    }, 300);
});
let allDrafts = [];
let currencySymbol = "$";
let selectedDraftId = null;

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
    const showInvoiceBtn = document.getElementById('show-invoice-btn');
    if (showInvoiceBtn) {
        showInvoiceBtn.addEventListener('click', () => {
            showHapticFeedback(showInvoiceBtn);
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
            
            // Get selected filter
            const filter = button.dataset.status;
            
            // Filter drafts (in a real app, this would fetch from API)
            filterDrafts(filter);
        });
    });
    
    // Close modal button
    const closeModal = document.querySelector('.close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', hideDraftModal);
    }
    
    // Save invoice button
    const saveInvoice = document.getElementById('saveInvoice');
    if (saveInvoice) {
        saveInvoice.addEventListener('click', () => {
            showHapticFeedback(saveInvoice);
            showToast("✓ Draft saved as invoice!", "success");
            hideDraftModal();
        });
    }
    
    // Edit draft button
    const editDraft = document.getElementById('editDraft');
    if (editDraft) {
        editDraft.addEventListener('click', () => {
            showHapticFeedback(editDraft);
            // In a real app, this would navigate to edit draft page
            window.location.href = `/invoice/draft/edit/${selectedDraftId}`;
        });
    }
    
    // Delete draft button
    const deleteDraft = document.getElementById('deleteDraft');
    if (deleteDraft) {
        deleteDraft.addEventListener('click', () => {
            showHapticFeedback(deleteDraft);
            showConfirmModal();
        });
    }
    
    // Cancel delete button
    const cancelDelete = document.getElementById('cancelDelete');
    if (cancelDelete) {
        cancelDelete.addEventListener('click', hideConfirmModal);
    }
    
    // Confirm delete button

const confirmDelete = document.getElementById('confirmDelete');

if (confirmDelete) {
    confirmDelete.addEventListener('click', async (e) => {
        e.preventDefault();

        if (!selectedDraftId) {
            showToast("No draft selected", "error");
            return;
        }

        showHapticFeedback(confirmDelete);

        confirmDelete.disabled = true;

        try {

            const response = await fetch(`/invoices/draft/delete/${selectedDraftId}`,{
                method: "DELETE",
                credentials: "include"
            });

            const data = await response.json();
            console.log("DELETE RESPONSE:", data);

            if (!response.ok) {
                throw new Error(
                    data.message || "Delete failed"
                );
            }

            if (data.status == "success") {
                showToast(
                    data.message || "✓ Draft deleted successfully",
                     "success"
                );

                     allDrafts = allDrafts.filter(
                draft =>
                    String(draft.id) !==
                    String(selectedDraftId)
            );

            const draftCard = document.querySelector(
                `.invoice-card[data-draft-id="${selectedDraftId}"]`
            );

            if (draftCard) {
                draftCard.remove();
            }

            hideConfirmModal();
            hideDraftModal();

            selectedDraftId = null;

            if (allDrafts.length === 0) {
                document.getElementById("draftsGrid").innerHTML = `
                    <div class="empty-state">
                        <h3>No Drafts Found</h3>
                        <p>You haven't created any invoice drafts yet.</p>
                    </div>
                `;
            }

            } else {
                   throw new Error(
                    data.message || "Failed to delete draft"
                );
            }


       
        } catch (error) {

            console.error(error);

            showToast(
                error.message || "Failed to delete draft",
                "error"
            );

        } finally {

            confirmDelete.disabled = false;

        }
    });
}
    
    // Delegate event listeners for dynamically created elements
    document.addEventListener('click', (e) => {
        // View draft button
        if (e.target.closest('.view-draft')) {
            const button = e.target.closest('.view-draft');
            const draftId = button.dataset.draftId;
            viewDraft(draftId);
        }
        
        // Edit draft button
        if (e.target.closest('.edit-draft')) {
            const button = e.target.closest('.edit-draft');
            const draftId = button.dataset.draftId;
            editDraftById(draftId);
        }
        
        // Delete draft button
        if (e.target.closest('.delete-draft')) {
            const button = e.target.closest('.delete-draft');
            const draftId = button.dataset.draftId;
            deleteDraftById(draftId);
        }
    });
}

// Function to load sample drafts

async function loadSampleDrafts(forceRefresh = false) {
    const draftsGrid = document.getElementById("draftsGrid");

    if (!draftsGrid) return;

    draftsGrid.innerHTML = `
        <div class="loading">
            Loading drafts...
        </div>
    `;

    try {
        const url = forceRefresh
            ? `/invoice/drafts/list/data?t=${Date.now()}`
            : "/invoice/drafts/list/data";

        const response = await fetch(url, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(
                `Server returned ${response.status}`
            );
        }

        const data = await response.json();

        if (data.status !== "success") {
            throw new Error(
                data.message || "Failed to load drafts"
            );
        }

        draftsGrid.innerHTML = "";

        allDrafts = Array.isArray(data.drafts)
            ? data.drafts
            : [];

        currencySymbol =
            data.currency_symbol || "$";

        if (typeof applyTheme === "function") {
            applyTheme(data.theme || "light");
        }

        if (allDrafts.length === 0) {
            draftsGrid.innerHTML = `
                <div class="empty-state">
                    <h3>No Drafts Found</h3>
                    <p>
                        You haven't created any invoice drafts yet.
                    </p>
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();

        allDrafts.forEach(draft => {
            fragment.appendChild(
                createDraftCard(
                    draft,
                    currencySymbol
                )
            );
        });

        draftsGrid.appendChild(fragment);

        if (typeof animateDrafts === "function") {
            requestAnimationFrame(() => {
                animateDrafts();
            });
        }

    } catch (error) {

        console.error(
            "Draft loading error:",
            error
        );

        draftsGrid.innerHTML = `
            <div class="error-state">
                <h3>Unable to load drafts</h3>
                <p>
                    ${error.message || "Something went wrong"}
                </p>

                <button
                    class="btn primary"
                    onclick="loadSampleDrafts(true)"
                >
                    Retry
                </button>
            </div>
        `;

        if (typeof showToast === "function") {
            showToast(
                error.message || "Failed to load drafts",
                "error"
            );
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


// Function to create a draft card element
function createDraftCard(draft, currencySymbol = "$") {
    const card = document.createElement('div');

    card.className = 'invoice-card';
    card.dataset.draftId = draft.id;

    card.innerHTML = `
        <div class="card-header">
            <span class="invoice-number">
                Draft #${draft.id}
            </span>

            <span class="badge draft">
                ${draft.status}
            </span>
        </div>

        <div class="card-body">
            <p class="client-name">
                ${draft.client_name}
            </p>

            <p class="invoice-amount">
                ${currencySymbol}${Number(draft.total).toFixed(2)}
            </p>

            <p class="invoice-date">
                Created: ${draft.invoice_date}
            </p>
        </div>

        <div class="card-actions">
        <button
                class="btn ghost view-draft"
                data-draft-id="${draft.id}"
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
                class="btn ghost edit-draft"
                data-draft-id="${draft.id}"
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
                class="btn ghost danger delete-draft"
                data-draft-id="${draft.id}"
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

// Function to filter drafts
function filterDrafts(filter) {
    const draftsGrid = document.getElementById('draftsGrid');
    if (!draftsGrid) return;
    
    // In a real app, this would fetch filtered data from API
    // For now, we'll just simulate by hiding/showing cards
    
    const draftCards = draftsGrid.querySelectorAll('.invoice-card');
    draftCards.forEach(card => {
        // For simplicity, we'll show all drafts for any filter
        // In a real app, you'd implement actual filtering logic
        card.style.display = 'block';
    });
    
    showToast(`Showing ${filter === 'all' ? 'all' : filter} drafts`);
}

// Function to animate drafts
function animateDrafts() {
    const draftCards = document.querySelectorAll('.invoice-card');
    draftCards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('visible');
        }, 100 * index);
    });
}

// Function to view a draft
function viewDraft(draftId) {

    console.log("Viewing draft with ID:", draftId);
    const draft = allDrafts.find(
        d => String(d.id) === String(draftId)
    );

    if (!draft) {
        showToast("Draft not found", "error");
        return;
    }

    document.getElementById('draft-number').textContent =
        `INV-${draft.id}`;

    document.getElementById('draft-client').textContent =
        draft.client_name;

    document.getElementById('draft-date').textContent =
        draft.invoice_date;

    document.getElementById('draft-due').textContent =
        draft.due_date;

    document.getElementById('draft-id').textContent =
        draft.id;

    selectedDraftId = draftId
  
    document.getElementById('draft-notes').textContent =
        draft.note || '';

    document.getElementById('draft-subtotal').textContent =
        `${currencySymbol}${Number(draft.subtotal).toFixed(2)}`;

    document.getElementById('draft-tax').textContent =
        `${currencySymbol}${Number(draft.taxAmount).toFixed(2)}`;

    document.getElementById('draft-total').textContent =
        `${currencySymbol}${Number(draft.total).toFixed(2)}`;

    const itemsTable = document.getElementById('draft-items');

    itemsTable.innerHTML = `
        <tr>
            <td>${draft.items.desc}</td>
            <td>${draft.items.qty}</td>
            <td>${currencySymbol}${Number(draft.items.price).toFixed(2)}</td>
            <td>
                ${currencySymbol}${(
                    draft.items.qty * draft.items.price
                ).toFixed(2)}
            </td>
        </tr>
    `;

    document.getElementById('draftModal')
        .classList.add('show');
}
// Function to edit a draft
function editDraftById(draftId) {
    showHapticFeedback(document.querySelector(`[data-draft-id="${draftId}"] .edit-draft`));
    // In a real app, this would navigate to edit draft page
    window.location.href = `/invoice/draft/edit/${draftId}`;
}

// Function to delete a draft
function deleteDraftById(draftId) {

    selectedDraftId = draftId;

    const btn = document.querySelector(
        `[data-draft-id="${draftId}"] .delete-draft`
    );

    showHapticFeedback(btn);

    showConfirmModal();
}

// Function to show draft modal
function showDraftModal() {
    const draftModal = document.getElementById('draftModal');
    draftModal.classList.add('show');
}

// Function to hide draft modal
function hideDraftModal() {
    const draftModal = document.getElementById('draftModal');
    draftModal.classList.remove('show');
}

// Function to show confirm modal
function showConfirmModal() {
    const confirmModal = document.getElementById('confirmModal');
    confirmModal.classList.add('show');
}

// Function to hide confirm modal
function hideConfirmModal() {

    selectedDraftId = null;

    const confirmModal =
        document.getElementById('confirmModal');

    confirmModal.classList.remove('show');
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
