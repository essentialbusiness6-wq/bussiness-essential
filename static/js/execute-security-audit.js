// security-audit.js - Business Essential Security & Audit Page

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const openSidebar = document.getElementById('openSidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    const refreshBtn = document.getElementById('refreshBtn');
    const exportLogsBtn = document.getElementById('exportLogsBtn');
    const exportModal = document.getElementById('exportModal');
    const closeExportModal = document.getElementById('closeExportModal');
    const cancelExport = document.getElementById('cancelExport');
    const exportForm = document.getElementById('exportForm');
    const logSearch = document.getElementById('logSearch');
    const logFilter = document.getElementById('logFilter');
    const auditTable = document.getElementById('auditTable').querySelector('tbody');
    const visibleCount = document.getElementById('visibleCount');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');
    const savePoliciesBtn = document.getElementById('savePoliciesBtn');
    const toastContainer = document.getElementById('toastContainer');
    
    // State
    let auditLogs = [];
    let filteredLogs = [];
    let currentPage = 1;
    const pageSize = 10;
    let policiesChanged = false;

    // Mock Data
    const mockLogs = [
        { id: 1, timestamp: '2024-05-29 09:42:15', user: 'jane.doe@businesse.com', action: 'login', type: 'login', details: 'Successful login from Chrome on macOS', ip: '192.168.1.45', status: 'success' },
        { id: 2, timestamp: '2024-05-29 09:15:33', user: 'unknown@external.com', action: 'login_attempt', type: 'security', details: 'Failed login attempt - invalid credentials', ip: '45.33.22.11', status: 'failed' },
        { id: 3, timestamp: '2024-05-29 08:30:12', user: 'jane.doe@businesse.com', action: 'policy_update', type: 'config', details: 'Updated password policy to require special characters', ip: '192.168.1.45', status: 'success' },
        { id: 4, timestamp: '2024-05-28 16:45:09', user: 'mike.k@businesse.com', action: 'admin_created', type: 'admin', details: 'Created new support admin account for sarah.l', ip: '10.0.0.22', status: 'success' },
        { id: 5, timestamp: '2024-05-28 14:20:55', user: 'alex.t@businesse.com', action: 'export_data', type: 'config', details: 'Exported Q2 financial audit logs (CSV)', ip: '172.16.0.8', status: 'success' },
        { id: 6, timestamp: '2024-05-28 11:05:41', user: 'unknown@external.com', action: 'port_scan', type: 'security', details: 'Suspicious network probe detected and blocked', ip: '203.0.113.45', status: 'failed' },
        { id: 7, timestamp: '2024-05-27 22:10:33', user: 'james.b@businesse.com', action: 'login', type: 'login', details: 'Successful login from Firefox on Windows', ip: '192.168.5.112', status: 'success' },
        { id: 8, timestamp: '2024-05-27 15:55:19', user: 'jane.doe@businesse.com', action: '2fa_enabled', type: 'security', details: 'Enforced 2FA for all administrator accounts', ip: '192.168.1.45', status: 'success' },
        { id: 9, timestamp: '2024-05-27 10:30:02', user: 'lisa.m@businesse.com', action: 'password_reset', type: 'login', details: 'Requested password reset via email link', ip: '10.0.0.44', status: 'pending' },
        { id: 10, timestamp: '2024-05-26 09:12:48', user: 'jane.doe@businesse.com', action: 'role_changed', type: 'admin', details: 'Promoted emily.r from Support to Finance Admin', ip: '192.168.1.45', status: 'success' },
        { id: 11, timestamp: '2024-05-26 08:45:22', user: 'unknown@external.com', action: 'brute_force', type: 'security', details: 'Rate limited after 15 failed login attempts', ip: '45.33.22.11', status: 'failed' },
        { id: 12, timestamp: '2024-05-25 17:30:11', user: 'david.w@businesse.com', action: 'backup_complete', type: 'config', details: 'Automated daily system backup verified successfully', ip: 'localhost', status: 'success' },
    ];

    // Initialize
    setupEventListeners();
    loadLogs();
    checkPolicyChanges();
    
    // Functions
    function setupEventListeners() {
        // Sidebar
        openSidebar.addEventListener('click', () => {
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
        });
        closeSidebar.addEventListener('click', closeSidebarFn);
        sidebarOverlay.addEventListener('click', closeSidebarFn);
        function closeSidebarFn() {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        }

        // Refresh
        refreshBtn.addEventListener('click', () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = `<svg viewBox="0 0 24 24" style="animation: spin 1s linear infinite; width:16px; height:16px;"><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 3v5h5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M21 21v-5h-5" fill="none" stroke="currentColor" stroke-width="2"/></svg> Refreshing...`;
            setTimeout(() => {
                loadLogs();
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 3v5h5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M21 21v-5h-5" fill="none" stroke="currentColor" stroke-width="2"/></svg> Refresh`;
                showToast('✓ Audit logs refreshed', 'success');
            }, 800);
        });

        // Export Modal
        exportLogsBtn.addEventListener('click', () => {
            exportModal.classList.add('active');
        });
        closeExportModal.addEventListener('click', () => exportModal.classList.remove('active'));
        cancelExport.addEventListener('click', () => exportModal.classList.remove('active'));
        exportModal.addEventListener('click', (e) => { if (e.target === exportModal) exportModal.classList.remove('active'); });
        exportForm.addEventListener('submit', handleExport);

        // Filters & Pagination
        logSearch.addEventListener('input', applyFilters);
        logFilter.addEventListener('change', applyFilters);
        prevPage.addEventListener('click', () => changePage(currentPage - 1));
        nextPage.addEventListener('click', () => changePage(currentPage + 1));

        // Policies
        document.querySelectorAll('#policyPassword, #policy2FA, #policyIP').forEach(toggle => {
            toggle.addEventListener('change', () => { policiesChanged = true; });
        });
        document.getElementById('policySession').addEventListener('change', () => { policiesChanged = true; });
        savePoliciesBtn.addEventListener('click', savePolicies);
    }

async function loadLogs() {

    try {

        const response = await fetch(
            "/admin/execute/security-audit/logs",
            {
                method: "GET",
                credentials: "include"
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {

            showToast(
                data.message || "Failed to load logs",
                "error"
            );

            return;
        }

        auditLogs = data.logs;



        applyFilters();

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to fetch audit logs",
            "error"
        );
    }
}
    function applyFilters() {
        const query = logSearch.value.toLowerCase().trim();
        const type = logFilter.value;
        
        filteredLogs = auditLogs.filter(log => {
            const matchQuery = log.user.toLowerCase().includes(query) || 
                              log.details.toLowerCase().includes(query) || 
                              log.ip.includes(query);
            const matchType = type === 'all' || log.type === type;
            return matchQuery && matchType;
        });
        
        currentPage = 1;
        renderTable();
    }

    function renderTable() {
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        const pageData = filteredLogs.slice(start, end);
        
        auditTable.innerHTML = pageData.map(log => createLogRow(log)).join('');
        
        visibleCount.textContent = filteredLogs.length;
        totalPagesSpan.textContent = Math.ceil(filteredLogs.length / pageSize) || 1;
        currentPageSpan.textContent = currentPage;
        
        prevPage.disabled = currentPage === 1;
        nextPage.disabled = currentPage >= Math.ceil(filteredLogs.length / pageSize);
    }

    function createLogRow(log) {
        const typeClass = log.type;
        const typeLabel = log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const statusClass = `status-${log.status}`;
        const statusLabel = log.status.charAt(0).toUpperCase() + log.status.slice(1);
        
        return `
            <tr>
                <td>${log.timestamp}</td>
                <td>${log.user.includes('unknown') ? '<span class="status-failed">Unknown</span>' : log.user}</td>
                <td><span class="action-badge ${typeClass}">${typeLabel}</span></td>
                <td>${log.details}</td>
                <td><code>${log.ip}</code></td>
                <td><span class="${statusClass}">● ${statusLabel}</span></td>
            </tr>
        `;
    }

    function changePage(page) {
        if (page < 1 || page > Math.ceil(filteredLogs.length / pageSize)) return;
        currentPage = page;
        renderTable();
    }

    function checkPolicyChanges() {
        // Reset changed state on load
        policiesChanged = false;
        savePoliciesBtn.disabled = true;
        savePoliciesBtn.classList.remove('active');
    }

    function savePolicies() {
        if (!policiesChanged) return;
        
        savePoliciesBtn.disabled = true;
        savePoliciesBtn.textContent = 'Saving...';
        
        setTimeout(() => {
            showToast('✓ Security policies updated successfully', 'success');
            policiesChanged = false;
            savePoliciesBtn.disabled = false;
            savePoliciesBtn.textContent = 'Save Policies';
            
            // Log to audit trail
            auditLogs.unshift({
                id: auditLogs.length + 1,
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                user: 'jane.doe@businesse.com',
                action: 'policy_save',
                type: 'config',
                details: 'Saved security policies via dashboard',
                ip: '192.168.1.45',
                status: 'success'
            });
            applyFilters();
        }, 1000);
    }

    function handleExport(e) {
        e.preventDefault();
        const btn = document.getElementById('submitExport');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Generating...';
        
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = originalText;
            exportModal.classList.remove('active');
            showToast('📥 Audit logs exported successfully', 'success');
            console.log('[EXPORT] Logs exported:', new Date().toISOString());
        }, 1200);
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // Spin animation for refresh button
    const style = document.createElement('style');
    style.innerHTML = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
});