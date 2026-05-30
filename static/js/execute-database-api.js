// database-api.js - Business Essential Database & Access Management

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const openSidebar = document.getElementById('openSidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    const refreshDbBtn = document.getElementById('refreshDbBtn');
    const optimizeDbBtn = document.getElementById('optimizeDbBtn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const dbTablesTable = document.getElementById('dbTablesTable').querySelector('tbody');
    const exportForm = document.getElementById('exportForm');
    const exportHistory = document.querySelector('.history-list');
    const uploadZone = document.getElementById('uploadZone');
    const importFile = document.getElementById('importFile');
    const startImportBtn = document.getElementById('startImportBtn');
    const webhookList = document.getElementById('webhookList');
    const addWebhookBtn = document.getElementById('addWebhookBtn');
    const addWebhookModal = document.getElementById('addWebhookModal');
    const closeWebhookModal = document.getElementById('closeWebhookModal');
    const cancelWh = document.getElementById('cancelWh');
    const webhookForm = document.getElementById('webhookForm');
    const accessSearch = document.getElementById('accessSearch');
    const accessType = document.getElementById('accessType');
    const accessLogsTable = document.getElementById('accessLogsTable').querySelector('tbody');
    const restoreModal = document.getElementById('restoreModal');
    const cancelRestore = document.getElementById('cancelRestore');
    const confirmRestore = document.getElementById('confirmRestore');
    const toastContainer = document.getElementById('toastContainer');

    // State
    let dbTables = [];
    let webhooks = [];
    let accessLogs = [];
    let selectedFile = null;

    // Mock Data
    const mockTables = [
        { name: 'users', records: '1,248', size: '45 MB', updated: '2024-05-29 09:42', status: 'healthy' },
        { name: 'invoices', records: '14,892', size: '320 MB', updated: '2024-05-29 09:41', status: 'healthy' },
        { name: 'clients', records: '4,210', size: '110 MB', updated: '2024-05-29 09:38', status: 'healthy' },
        { name: 'payments', records: '9,440', size: '215 MB', updated: '2024-05-29 09:42', status: 'warning' },
        { name: 'audit_logs', records: '142,880', size: '890 MB', updated: '2024-05-29 09:42', status: 'healthy' },
        { name: 'settings', records: '42', size: '12 MB', updated: '2024-05-28 14:20', status: 'healthy' }
    ];

    const mockWebhooks = [
        { id: 'wh_8x2k9p', url: 'https://hooks.zapier.com/v1/hooks/invoice', events: ['invoice', 'payment'], status: 'active' },
        { id: 'wh_3m4n7q', url: 'https://api.slack.com/services/T01/B01/abc', events: ['payment', 'client'], status: 'active' },
        { id: 'wh_9r1t5w', url: 'https://n8n.example.com/webhook/billing', events: ['invoice'], status: 'failed' }
    ];

    const mockLogs = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000).toISOString().replace('T', ' ').substring(0, 19),
        user: ['jane.doe@businesse.com', 'mike.k@businesse.com', 'system_scheduler', 'export_service'][i % 4],
        ip: ['192.168.1.45', '10.0.0.22', 'localhost', '172.16.0.8'][i % 4],
        action: ['SELECT invoices', 'CSV Export Generated', 'Admin Login', 'DB Backup Scheduled'][i % 4],
        type: ['query', 'export', 'login', 'query'][i % 4],
        status: ['success', 'success', 'success', 'warning'][i % 4],
        details: ['Filtered by date range', 'Format: CSV, Size: 12MB', 'Chrome on macOS', 'Retention: 30 days']
    }));

    // Initialize
    setupEventListeners();
    loadTables();
    loadWebhooks();
    loadAccessLogs();
    
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

        // Refresh & Optimize
        refreshDbBtn.addEventListener('click', () => {
            refreshDbBtn.disabled = true; refreshDbBtn.innerHTML = `<svg viewBox="0 0 24 24" style="animation: spin 1s linear infinite; width:16px; height:16px;"><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 3v5h5" fill="none" stroke="currentColor" stroke-width="2"/></svg> Syncing...`;
            setTimeout(() => { loadTables(); loadWebhooks(); loadAccessLogs(); renderExportHistory(); refreshDbBtn.disabled = false; refreshDbBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 3v5h5" fill="none" stroke="currentColor" stroke-width="2"/></svg> Refresh`; showToast('✓ Database state refreshed', 'success'); }, 1000);
        });
        optimizeDbBtn.addEventListener('click', () => { optimizeDbBtn.disabled = true; optimizeDbBtn.textContent = 'Running...'; setTimeout(() => { optimizeDbBtn.disabled = false; optimizeDbBtn.textContent = 'Optimize Tables'; showToast('✅ Tables optimized & indexes rebuilt', 'success'); }, 1500); });

        // Export
        exportForm.addEventListener('submit', handleExport);
        
        // Import
        uploadZone.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', (e) => { if(e.target.files[0]) { selectedFile = e.target.files[0]; uploadZone.style.borderColor = 'var(--success-dark)'; uploadZone.querySelector('p').innerHTML = `✅ <strong>${selectedFile.name}</strong> ready`; startImportBtn.disabled = false; }});
        startImportBtn.addEventListener('click', () => { if(!selectedFile) return; startImportBtn.disabled = true; startImportBtn.textContent = 'Processing...'; setTimeout(() => { restoreModal.classList.add('active'); startImportBtn.disabled = false; startImportBtn.textContent = 'Start Import'; }, 800); });
        
        // Restore
        cancelRestore.addEventListener('click', () => restoreModal.classList.remove('active'));
        confirmRestore.addEventListener('click', () => { restoreModal.classList.remove('active'); showToast('🔄 Database restore initiated. Monitor progress in logs.', 'warning'); });
        
        // Webhooks
        addWebhookBtn.addEventListener('click', () => { addWebhookModal.classList.add('active'); webhookForm.reset(); });
        closeWebhookModal.addEventListener('click', () => addWebhookModal.classList.remove('active'));
        cancelWh.addEventListener('click', () => addWebhookModal.classList.remove('active'));
        addWebhookModal.addEventListener('click', (e) => { if(e.target === addWebhookModal) addWebhookModal.classList.remove('active'); });
        webhookForm.addEventListener('submit', handleAddWebhook);

        // Access Logs
        accessSearch.addEventListener('input', renderAccessLogs);
        accessType.addEventListener('change', renderAccessLogs);
    }

    function loadTables() { dbTables = mockTables; renderTables(); }
    function loadWebhooks() { webhooks = mockWebhooks; renderWebhooks(); }
    function loadAccessLogs() { accessLogs = mockLogs; renderAccessLogs(); }
    function renderExportHistory() {
        exportHistory.innerHTML = [
            { name: 'invoices_export.csv', date: '2024-05-29', size: '14.2 MB', status: 'success' },
            { name: 'full_backup.sql', date: '2024-05-28', size: '842 MB', status: 'success' },
            { name: 'clients_q2.json', date: '2024-05-25', size: '4.1 MB', status: 'success' }
        ].map(h => `<li><div><code>${h.name}</code><br><small>${h.date} • ${h.size}</small></div><span class="status-badge healthy">✓</span></li>`).join('');
    }

    function renderTables() {
        dbTablesTable.innerHTML = dbTables.map(t => `
            <tr>
                <td><code>${t.name}</code></td>
                <td>${t.records}</td>
                <td>${t.size}</td>
                <td>${t.updated}</td>
                <td><span class="status-badge ${t.status}">${t.status === 'healthy' ? 'Optimal' : 'Fragmented'}</span></td>
                <td><button class="action-btn" onclick="showToast('🔍 Viewing table structure...', 'info')">View</button> <button class="action-btn" onclick="showToast('⬇️ Downloading dump...', 'success')">Export</button></td>
            </tr>
        `).join('');
    }

    function renderWebhooks() {
        webhookList.innerHTML = webhooks.map(wh => `
            <div class="webhook-card" data-id="${wh.id}">
                <div class="webhook-info"><h4>${wh.url.substring(0, 40)}...</h4><p>Events: ${wh.events.join(', ')} | Status: <strong class="${wh.status === 'active' ? 'status-badge healthy' : 'status-badge danger'}">${wh.status}</strong></p></div>
                <div class="webhook-actions">
                    <button class="action-btn" data-action="test" data-id="${wh.id}">Test</button>
                    <button class="action-btn danger" data-action="delete" data-id="${wh.id}">Delete</button>
                </div>
            </div>
        `).join('');
    }

    function renderAccessLogs() {
        const query = accessSearch.value.toLowerCase();
        const type = accessType.value;
        let filtered = accessLogs.filter(l => {
            const matchQuery = l.user.toLowerCase().includes(query) || l.ip.includes(query) || l.details.toLowerCase().includes(query);
            const matchType = type === 'all' || l.type === type;
            return matchQuery && matchType;
        });

        accessLogsTable.innerHTML = filtered.slice(0, 15).map(l => `
            <tr>
                <td>${l.timestamp}</td>
                <td><code>${l.user}</code></td>
                <td><code>${l.ip}</code></td>
                <td><span class="status-badge ${l.type === 'login' ? 'info' : l.type === 'export' ? 'warning' : 'healthy'}">${l.action}</span></td>
                <td>${l.details}</td>
                <td><span class="status-badge ${l.status === 'success' ? 'healthy' : 'warning'}">${l.status}</span></td>
            </tr>
        `).join('');
    }

    function handleExport(e) {
        e.preventDefault();
        const scope = document.getElementById('exportScope').value;
        const format = document.getElementById('exportFormat').value;
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Generating...';
        
        setTimeout(() => {
            const filename = `export_${scope}_${new Date().toISOString().split('T')[0]}.${format}`;
            exportHistory.insertAdjacentHTML('afterbegin', `<li><div><code>${filename}</code><br><small>Just now • ${(Math.random()*15+2).toFixed(1)} MB</small></div><span class="status-badge healthy">✓</span></li>`);
            btn.disabled = false; btn.textContent = 'Generate Export';
            showToast(`📦 ${filename} ready for download`, 'success');
        }, 1200);
    }

    function handleAddWebhook(e) {
        e.preventDefault();
        const url = document.getElementById('whUrl').value;
        const secret = document.getElementById('whSecret').value;
        const events = Array.from(document.querySelectorAll('.event-toggles input:checked')).map(cb => cb.value);
        
        const btn = document.getElementById('submitWh');
        btn.disabled = true; btn.textContent = 'Verifying...';
        
        setTimeout(() => {
            webhooks.unshift({ id: `wh_${Math.random().toString(36).substring(2, 8)}`, url, events, status: 'active' });
            renderWebhooks();
            addWebhookModal.classList.remove('active');
            btn.disabled = false; btn.textContent = 'Create Webhook';
            showToast('✅ Webhook endpoint added successfully', 'success');
        }, 800);
    }

    // Event Delegation for Webhooks
    webhookList.addEventListener('click', (e) => {
        const btn = e.target.closest('.action-btn');
        if (!btn) return;
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        
        if (action === 'test') {
            btn.textContent = 'Testing...'; btn.disabled = true;
            setTimeout(() => { btn.textContent = 'Test'; btn.disabled = false; showToast('📨 Test payload sent successfully (200 OK)', 'success'); }, 1000);
        } else if (action === 'delete') {
            if (confirm('Delete this webhook endpoint? External services will stop receiving events.')) {
                webhooks = webhooks.filter(w => w.id !== id);
                renderWebhooks();
                showToast('🗑️ Webhook removed', 'warning');
            }
        }
    });

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    renderExportHistory();
    const style = document.createElement('style');
    style.innerHTML = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
});