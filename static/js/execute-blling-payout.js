// billing-payout.js - Business Essential Billing & Payout Control

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const openSidebar = document.getElementById('openSidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    const refreshBtn = document.getElementById('refreshBtn');
    const exportReportBtn = document.getElementById('exportReportBtn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Transactions
    const transTable = document.getElementById('transTable').querySelector('tbody');
    const transSearch = document.getElementById('transSearch');
    const transStatus = document.getElementById('transStatus');
    const transDate = document.getElementById('transDate');
    const transCount = document.getElementById('transCount');
    const transPrev = document.getElementById('transPrev');
    const transNext = document.getElementById('transNext');
    const transPage = document.getElementById('transPage');
    
    // Payouts
    const payoutTable = document.getElementById('payoutTable').querySelector('tbody');
    const payoutSelectAll = document.getElementById('payoutSelectAll');
    const runPayoutBtn = document.getElementById('runPayoutBtn');
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    const bulkApprove = document.getElementById('bulkApprove');
    const bulkReject = document.getElementById('bulkReject');
    
    // Tax
    const saveTaxBtn = document.getElementById('saveTaxBtn');
    
    // Modals & Toast
    const refundModal = document.getElementById('refundModal');
    const closeRefundModal = document.getElementById('closeRefundModal');
    const refundForm = document.getElementById('refundForm');
    const cancelRefund = document.getElementById('cancelRefund');
    
    const payoutConfirmModal = document.getElementById('payoutConfirmModal');
    const closePayoutModal = document.getElementById('closePayoutModal');
    const cancelPayoutAction = document.getElementById('cancelPayoutAction');
    const confirmPayoutAction = document.getElementById('confirmPayoutAction');
    
    const toastContainer = document.getElementById('toastContainer');

    // State
    let transactions = [];
    let payouts = [];
    let currentTransPage = 1;
    const pageSize = 8;
    let selectedPayouts = new Set();
    let currentPayoutAction = null;
    let currentPayoutId = null;

    // Mock Data
    const mockTransactions = Array.from({ length: 45 }, (_, i) => ({
        id: `TXN-${1000 + i}`,
        customer: ['Jane Doe', 'Mike K.', 'Sarah L.', 'Alex T.', 'Emily R.', 'David W.'][Math.floor(Math.random() * 6)],
        type: ['Subscription', 'Invoice Payment', 'Top-up'][Math.floor(Math.random() * 3)],
        amount: (Math.random() * 500 + 20).toFixed(2),
        gateway: Math.random() > 0.3 ? 'Stripe' : 'PayPal',
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: ['completed', 'completed', 'completed', 'pending', 'failed', 'refunded'][Math.floor(Math.random() * 6)]
    }));

    const mockPayouts = [
        { id: 'PAYOUT-881', recipient: 'Partner Agency A', amount: '4,250.00', method: 'Bank Transfer', scheduled: '2024-05-31', status: 'pending' },
        { id: 'PAYOUT-882', recipient: 'Freelancer Group B', amount: '1,840.50', method: 'PayPal', scheduled: '2024-05-31', status: 'pending' },
        { id: 'PAYOUT-883', recipient: 'Vendor Services C', amount: '3,100.00', method: 'Stripe Connect', scheduled: '2024-06-07', status: 'pending' },
        { id: 'PAYOUT-880', recipient: 'Partner Agency D', amount: '2,950.00', method: 'Bank Transfer', scheduled: '2024-05-24', status: 'processed' },
    ];

    // Initialize
    setupEventListeners();
    loadTransactions();
    loadPayouts();
    
    function setupEventListeners() {
        // Sidebar
        openSidebar.addEventListener('click', () => { sidebar.classList.add('active'); sidebarOverlay.classList.add('active'); });
        closeSidebar.addEventListener('click', closeSidebarFn);
        sidebarOverlay.addEventListener('click', closeSidebarFn);
        function closeSidebarFn() { sidebar.classList.remove('active'); sidebarOverlay.classList.remove('active'); }

        // Tabs
        tabBtns.forEach(btn => btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        }));

        // Refresh
        refreshBtn.addEventListener('click', () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = `<svg viewBox="0 0 24 24" style="animation: spin 1s linear infinite; width:16px; height:16px;"><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 3v5h5" fill="none" stroke="currentColor" stroke-width="2"/></svg> Loading...`;
            setTimeout(() => {
                loadTransactions(); loadPayouts();
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 3v5h5" fill="none" stroke="currentColor" stroke-width="2"/></svg> Refresh`;
                showToast('✓ Data refreshed', 'success');
            }, 800);
        });

        // Export
        exportReportBtn.addEventListener('click', () => {
            exportReportBtn.disabled = true; exportReportBtn.textContent = 'Generating...';
            setTimeout(() => { showToast('📥 Financial report downloaded', 'success'); exportReportBtn.disabled = false; exportReportBtn.textContent = 'Export Report'; }, 1200);
        });

        // Transactions Filters
        transSearch.addEventListener('input', () => { currentTransPage = 1; renderTransactions(); });
        transStatus.addEventListener('change', () => { currentTransPage = 1; renderTransactions(); });
        transDate.addEventListener('change', () => { currentTransPage = 1; renderTransactions(); });
        transPrev.addEventListener('click', () => changePage(currentTransPage - 1));
        transNext.addEventListener('click', () => changePage(currentTransPage + 1));

        // Payouts
        payoutSelectAll.addEventListener('change', (e) => {
            const checkboxes = payoutTable.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => { cb.checked = e.target.checked; togglePayoutSelection(cb); });
        });
        runPayoutBtn.addEventListener('click', () => {
            const pending = payouts.filter(p => p.status === 'pending');
            if (pending.length === 0) return showToast('⚠️ No pending payouts', 'warning');
            showToast(`🚀 Processing ${pending.length} batch(es)...`, 'info');
            setTimeout(() => showToast(`✓ Payouts queued for processing`, 'success'), 1500);
        });
        bulkApprove.addEventListener('click', () => executeBulkAction('approve'));
        bulkReject.addEventListener('click', () => executeBulkAction('reject'));
        payoutTable.addEventListener('change', (e) => { if(e.target.type === 'checkbox') togglePayoutSelection(e.target); });
        payoutTable.addEventListener('click', (e) => {
            if(e.target.closest('.action-btn')) handlePayoutAction(e.target.closest('.action-btn'));
        });

        // Tax
        saveTaxBtn.addEventListener('click', () => {
            saveTaxBtn.disabled = true; saveTaxBtn.textContent = 'Saving...';
            setTimeout(() => { saveTaxBtn.disabled = false; saveTaxBtn.textContent = 'Update Rate'; showToast('✓ Tax rate updated successfully', 'success'); }, 1000);
        });

        // Refund Modal
        refundModal.addEventListener('click', (e) => { if(e.target === refundModal) refundModal.classList.remove('active'); });
        closeRefundModal.addEventListener('click', () => refundModal.classList.remove('active'));
        cancelRefund.addEventListener('click', () => refundModal.classList.remove('active'));
        refundForm.addEventListener('submit', handleRefundSubmit);

        // Payout Confirm Modal
        payoutConfirmModal.addEventListener('click', (e) => { if(e.target === payoutConfirmModal) payoutConfirmModal.classList.remove('active'); });
        closePayoutModal.addEventListener('click', () => payoutConfirmModal.classList.remove('active'));
        cancelPayoutAction.addEventListener('click', () => payoutConfirmModal.classList.remove('active'));
        confirmPayoutAction.addEventListener('click', confirmPayoutExecution);

        // Copy buttons
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.previousElementSibling;
                navigator.clipboard.writeText(input.value).then(() => showToast('📋 Copied to clipboard', 'success'));
            });
        });
    }

    function loadTransactions() {
        transactions = mockTransactions;
        renderTransactions();
    }

    function loadPayouts() {
        payouts = mockPayouts;
        renderPayouts();
    }

    function renderTransactions() {
        const query = transSearch.value.toLowerCase();
        const status = transStatus.value;
        const date = transDate.value;

        let filtered = transactions.filter(t => {
            const matchQuery = t.customer.toLowerCase().includes(query) || t.id.toLowerCase().includes(query);
            const matchStatus = status === 'all' || t.status === status;
            const matchDate = !date || t.date === date;
            return matchQuery && matchStatus && matchDate;
        });

        const start = (currentTransPage - 1) * pageSize;
        const pageData = filtered.slice(start, start + pageSize);

        transTable.innerHTML = pageData.map(t => `
            <tr>
                <td><code>${t.id}</code></td>
                <td>${t.customer}</td>
                <td>${t.type}</td>
                <td class="amount-cell">$${t.amount}</td>
                <td>${t.gateway}</td>
                <td>${t.date}</td>
                <td><span class="status-badge ${t.status}">${t.status.charAt(0).toUpperCase() + t.status.slice(1)}</span></td>
                <td><button class="action-btn" data-action="refund" data-id="${t.id}" ${t.status !== 'completed' ? 'disabled' : ''}>Refund</button></td>
            </tr>
        `).join('');

        transCount.textContent = filtered.length;
        transPage.textContent = currentTransPage;
        transPrev.disabled = currentTransPage === 1;
        transNext.disabled = currentTransPage >= Math.ceil(filtered.length / pageSize);
        
        // Refund button listeners
        transTable.querySelectorAll('.action-btn[data-action="refund"]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('refundTxId').value = btn.dataset.id;
                document.getElementById('refundAmount').value = parseFloat(document.getElementById('refundAmount').value || 0);
                refundModal.classList.add('active');
            });
        });
    }

    function changePage(page) {
        if (page < 1) return;
        const status = transStatus.value;
        const maxPage = Math.ceil(transactions.filter(t => status === 'all' || t.status === status).length / pageSize);
        if (page > maxPage) return;
        currentTransPage = page;
        renderTransactions();
    }

    function renderPayouts() {
        payoutTable.innerHTML = payouts.map(p => `
            <tr>
                <td><input type="checkbox" data-id="${p.id}" ${p.status !== 'pending' ? 'disabled' : ''}></td>
                <td><code>${p.id}</code></td>
                <td>${p.recipient}</td>
                <td class="amount-cell">$${p.amount}</td>
                <td>${p.method}</td>
                <td>${p.scheduled}</td>
                <td><span class="status-badge ${p.status === 'pending' ? 'pending' : 'completed'}">${p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span></td>
                <td>
                    ${p.status === 'pending' ? `
                    <button class="action-btn approve" data-action="approve" data-id="${p.id}">Approve</button>
                    <button class="action-btn reject" data-action="reject" data-id="${p.id}">Reject</button>
                    ` : '<span style="color:var(--gray); font-size:0.8rem;">Processed</span>'}
                </td>
            </tr>
        `).join('');
    }

    function togglePayoutSelection(checkbox) {
        const id = checkbox.dataset.id;
        if (checkbox.checked) selectedPayouts.add(id); else selectedPayouts.delete(id);
        selectedCount.textContent = selectedPayouts.size;
        bulkActions.style.display = selectedPayouts.size > 0 ? 'flex' : 'none';
    }

    function handlePayoutAction(btn) {
        currentPayoutAction = btn.dataset.action;
        currentPayoutId = btn.dataset.id;
        const payout = payouts.find(p => p.id === currentPayoutId);
        
        document.getElementById('payoutModalTitle').textContent = `${currentPayoutAction === 'approve' ? 'Approve' : 'Reject'} Payout?`;
        document.getElementById('payoutModalMessage').textContent = `${currentPayoutAction === 'approve' ? 'Process' : 'Cancel'} payout to ${payout.recipient} for $${payout.amount}? This action is irreversible.`;
        payoutConfirmModal.classList.add('active');
    }

    function confirmPayoutExecution() {
        const btnText = confirmPayoutAction.textContent;
        confirmPayoutAction.disabled = true;
        confirmPayoutAction.textContent = 'Processing...';
        
        setTimeout(() => {
            const idx = payouts.findIndex(p => p.id === currentPayoutId);
            if (idx !== -1) payouts[idx].status = currentPayoutAction === 'approve' ? 'processed' : 'rejected';
            renderPayouts();
            payoutConfirmModal.classList.remove('active');
            confirmPayoutAction.disabled = false;
            confirmPayoutAction.textContent = btnText;
            showToast(`✓ Payout ${currentPayoutAction === 'approve' ? 'approved' : 'rejected'} successfully`, 'success');
        }, 1000);
    }

    function executeBulkAction(action) {
        if (selectedPayouts.size === 0) return;
        payouts.forEach(p => {
            if (selectedPayouts.has(p.id) && p.status === 'pending') p.status = action === 'approve' ? 'processed' : 'rejected';
        });
        selectedPayouts.clear();
        bulkActions.style.display = 'none';
        payoutSelectAll.checked = false;
        renderPayouts();
        showToast(`✓ Bulk ${action} completed for selected payouts`, 'success');
    }

    function handleRefundSubmit(e) {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('refundAmount').value);
        if (!amount || amount <= 0) return showToast('⚠️ Enter a valid amount', 'error');
        
        document.getElementById('submitRefund').disabled = true;
        document.getElementById('submitRefund').textContent = 'Processing...';
        
        setTimeout(() => {
            const txId = document.getElementById('refundTxId').value;
            const tx = transactions.find(t => t.id === txId);
            if (tx) tx.status = 'refunded';
            refundModal.classList.remove('active');
            renderTransactions();
            document.getElementById('submitRefund').disabled = false;
            document.getElementById('submitRefund').textContent = 'Confirm Refund';
            document.getElementById('refundForm').reset();
            showToast(`✓ Refund of $${amount} processed for ${txId}`, 'success');
        }, 1200);
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // Inject spin animation
    const style = document.createElement('style');
    style.innerHTML = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
});