// feedback-admin.js - Business Essential Feedback Management

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const openSidebar = document.getElementById('openSidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    const refreshBtn = document.getElementById('refreshBtn');
    const exportBtn = document.getElementById('exportBtn');
    const feedbackSearch = document.getElementById('feedbackSearch');
    const typeFilter = document.getElementById('typeFilter');
    const statusFilter = document.getElementById('statusFilter');
    const priorityFilter = document.getElementById('priorityFilter');
    const fbTable = document.getElementById('feedbackTable').querySelector('tbody');
    const fbCount = document.getElementById('fbCount');
    const fbPrev = document.getElementById('fbPrev');
    const fbNext = document.getElementById('fbNext');
    const fbPage = document.getElementById('fbPage');
    const feedbackModal = document.getElementById('feedbackModal');
    const closeFeedbackModal = document.getElementById('closeFeedbackModal');
    const statusSelect = document.getElementById('statusSelect');
    const updateStatusBtn = document.getElementById('updateStatusBtn');
    const replyText = document.getElementById('replyText');
    const sendReplyBtn = document.getElementById('sendReplyBtn');
    const toastContainer = document.getElementById('toastContainer');

    // State
    let feedbackData = [];
    let filteredData = [];
    let currentPage = 1;
    const pageSize = 10;
    let activeId = null;

    // Mock Data
    const mockFeedback = [
        { id: 'FB-1042', user: 'Sarah Jenkins', email: 'sarah.j@techcorp.com', type: 'bug', status: 'in_review', priority: 'high', date: '2024-05-28', subject: 'PDF Export Fails on Chrome 125', message: 'When I click export to PDF, the page just reloads and nothing downloads. Tried on Windows and Mac.', attachments: [{name: 'screenshot.png', size: '245KB'}, {name: 'console_log.txt', size: '12KB'}], replies: [{type: 'user', text: 'Any update on this?', date: '2024-05-29 09:12'}] },
        { id: 'FB-1041', user: 'Mike Chen', email: 'mike.c@designstudio.io', type: 'suggestion', status: 'resolved', priority: 'medium', date: '2024-05-27', subject: 'Add Dark Mode to Dashboard', message: 'Would be great to have a dark theme. My team works late hours and the bright UI strains our eyes.', attachments: [], replies: [{type: 'admin', text: 'Thanks Mike! Dark mode is now in our Q2 roadmap.', date: '2024-05-27 14:30'}] },
        { id: 'FB-1040', user: 'Emily Ross', email: 'emily.r@startup.co', type: 'bug', status: 'closed', priority: 'low', date: '2024-05-25', subject: 'Typo in Settings Label', message: 'The "Notificaiton" toggle has a spelling mistake.', attachments: [{name: 'typo.jpg', size: '180KB'}], replies: [{type: 'admin', text: 'Fixed in v2.4.1. Thanks for catching that!', date: '2024-05-25 16:45'}] },
        { id: 'FB-1039', user: 'Alex Turner', email: 'alex.t@agency.net', type: 'suggestion', status: 'in_review', priority: 'medium', date: '2024-05-24', subject: 'Bulk Invoice Status Update', message: 'Allow admins to mark multiple invoices as paid at once instead of one by one.', attachments: [], replies: [] },
        { id: 'FB-1038', user: 'David Wilson', email: 'david.w@retail.com', type: 'bug', status: 'in_review', priority: 'high', date: '2024-05-23', subject: 'Tax Calculation Rounding Error', message: 'When tax rate is set to 7.25%, the total is off by $0.01 on amounts over $1000.', attachments: [{name: 'calc_example.xlsx', size: '45KB'}], replies: [] },
        { id: 'FB-1037', user: 'Lisa Martin', email: 'lisa.m@consulting.biz', type: 'suggestion', status: 'closed', priority: 'low', date: '2024-05-20', subject: 'Export Client List to CSV', message: 'Need ability to download client contact info for CRM integration.', attachments: [], replies: [{type: 'admin', text: 'Already available in Clients > Export button!', date: '2024-05-20 11:00'}, {type: 'user', text: 'Oh I missed it, thanks!', date: '2024-05-20 15:20'}] }
    ];

    // Initialize
    setupEventListeners();
    loadFeedback();

    function setupEventListeners() {
        // Sidebar
        openSidebar.addEventListener('click', () => { sidebar.classList.add('active'); sidebarOverlay.classList.add('active'); });
        closeSidebar.addEventListener('click', closeSidebarFn);
        sidebarOverlay.addEventListener('click', closeSidebarFn);
        function closeSidebarFn() { sidebar.classList.remove('active'); sidebarOverlay.classList.remove('active'); }

        // Filters & Search
        feedbackSearch.addEventListener('input', () => { currentPage = 1; applyFilters(); });
        typeFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });
        statusFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });
        priorityFilter.addEventListener('change', () => { currentPage = 1; applyFilters(); });
        fbPrev.addEventListener('click', () => changePage(currentPage - 1));
        fbNext.addEventListener('click', () => changePage(currentPage + 1));

        // Refresh & Export
        refreshBtn.addEventListener('click', () => {
            refreshBtn.disabled = true; refreshBtn.textContent = 'Loading...';
            setTimeout(() => { loadFeedback(); refreshBtn.disabled = false; refreshBtn.textContent = 'Refresh'; showToast('✓ Feedback list refreshed', 'success'); }, 600);
        });
        exportBtn.addEventListener('click', () => {
            exportBtn.disabled = true; exportBtn.textContent = 'Generating CSV...';
            setTimeout(() => { exportBtn.disabled = false; exportBtn.textContent = 'Export'; showToast('📥 feedback_report.csv downloaded', 'success'); }, 1000);
        });

        // Modal
        closeFeedbackModal.addEventListener('click', () => feedbackModal.classList.remove('active'));
        feedbackModal.addEventListener('click', (e) => { if(e.target === feedbackModal) feedbackModal.classList.remove('active'); });

        // Status Update
updateStatusBtn.addEventListener('click', async () => {

    if (!activeId) return;

    const item = feedbackData.find(
        f => f.id === activeId
    );

    if (!item) return;

    try {

        const response = await fetch(
            '/admin/api/support/status',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: item.db_id,
                    source: item.source,
                    status: statusSelect.value
                })
            }
        );

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message);
        }

        item.status = statusSelect.value;

        applyFilters();

        showToast(
            'Status updated successfully',
            'success'
        );

    } catch(error) {

        console.error(error);

        showToast(
            'Failed to update status',
            'error'
        );
    }
});

        // Reply
        sendReplyBtn.addEventListener('click', handleReply);
    }

    async function loadFeedback() {
    try {

        const response = await fetch('/admin/api/support/items', {
            method:"GET",
            credentials:'include'
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message);
        }

        feedbackData = result.data.map(item => ({
            id: `${item.source.toUpperCase()}-${item.id}`,
            db_id: item.id,
            source: item.source,
            user_id: item.user_id,
            user: `User #${item.user_id}`,
            email: '',
            type: item.type,
            status: item.status,
            priority: 'medium',
            date: new Date(item.created_at).toLocaleDateString(),
            subject: item.subject,
            message: item.message,
            attachments: [],
            replies: []
        }));

        applyFilters();

    } catch(error) {

        console.error(error);

        showToast(
            'Failed to load feedback',
            'error'
        );
    }
}

    function applyFilters() {
        const q = feedbackSearch.value.toLowerCase();
        const t = typeFilter.value;
        const s = statusFilter.value;
        const p = priorityFilter.value;

        filteredData = feedbackData.filter(f => {
            const matchQ = f.subject.toLowerCase().includes(q) || f.user.toLowerCase().includes(q) || f.email.toLowerCase().includes(q) || f.id.toLowerCase().includes(q);
            const matchT = t === 'all' || f.type === t;
            const matchS = s === 'all' || f.status === s;
            const matchP = p === 'all' || f.priority === p;
            return matchQ && matchT && matchS && matchP;
        });

        renderTable();
    }

    function renderTable() {
        const start = (currentPage - 1) * pageSize;
        const pageData = filteredData.slice(start, start + pageSize);

        fbTable.innerHTML = pageData.map(f => `
            <tr>
                <td><code>${f.id}</code></td>
                <td><strong>${f.user}</strong><br><small style="color:var(--gray)">${f.email}</small></td>
                <td><span class="badge ${f.type}">${f.type}</span></td>
                <td><span class="badge ${f.status}">${f.status.replace('_', ' ')}</span></td>
                <td><span class="badge ${f.priority}">${f.priority}</span></td>
                <td>${f.date}</td>
                <td><button class="action-btn" data-id="${f.id}">View Details</button></td>
            </tr>
        `).join('');

        fbCount.textContent = filteredData.length;
        fbPage.textContent = currentPage;
        fbPrev.disabled = currentPage === 1;
        fbNext.disabled = currentPage >= Math.ceil(filteredData.length / pageSize);

        document.querySelectorAll('.action-btn').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.id)));
    }

    function changePage(page) {
        if(page < 1 || page > Math.ceil(filteredData.length / pageSize)) return;
        currentPage = page;
        renderTable();
    }

    function openModal(id) {
        activeId = id;
        const f = feedbackData.find(x => x.id === id);
        if(!f) return;

        document.getElementById('modalId').textContent = f.id;
        document.getElementById('modalType').className = `badge ${f.type}`;
        document.getElementById('modalType').textContent = f.type;
        document.getElementById('modalSubject').textContent = f.subject;
        document.getElementById('modalUser').textContent = f.user;
        document.getElementById('modalEmail').textContent = f.email;
        document.getElementById('modalDate').textContent = f.date;
        document.getElementById('modalMessage').textContent = f.message;
        statusSelect.value = f.status;

        // Attachments
        const attGrid = document.getElementById('attachmentGrid');
        document.getElementById('attCount').textContent = f.attachments.length;
        attGrid.innerHTML = f.attachments.map(a => `
            <div class="att-item" onclick="showToast('📎 Downloading ${a.name}...', 'info')">
                <div class="att-icon">📄</div>
                <div class="att-name" title="${a.name}">${a.name}</div>
                <small style="color:var(--gray)">${a.size}</small>
            </div>
        `).join('');
        document.getElementById('attachmentsSection').style.display = f.attachments.length > 0 ? 'block' : 'none';

        // Replies
        const hist = document.getElementById('replyHistory');
        hist.innerHTML = f.replies.map(r => `
            <div class="reply-item ${r.type}">
                <div class="reply-meta"><span>${r.type === 'admin' ? '👤 Support Admin' : '👤 ' + f.user}</span><span>${r.date}</span></div>
                <div class="reply-text">${r.text}</div>
            </div>
        `).join('');
        replyText.value = '';
        
        feedbackModal.classList.add('active');
    }

    function handleReply() {
        const text = replyText.value.trim().replace(/\{\{user\}\}/gi, feedbackData.find(f=>f.id===activeId)?.user || 'there');
        if(!text) return showToast('⚠️ Reply cannot be empty', 'error');

        sendReplyBtn.disabled = true; sendReplyBtn.textContent = 'Sending...';
        setTimeout(() => {
            const idx = feedbackData.findIndex(f => f.id === activeId);
            if(idx !== -1) feedbackData[idx].replies.push({type: 'admin', text, date: new Date().toLocaleString()});
            openModal(activeId); // Refresh modal view
            sendReplyBtn.disabled = false; sendReplyBtn.textContent = 'Send Reply';
            showToast('✅ Reply sent & user notified via email', 'success');
        }, 800);
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
});