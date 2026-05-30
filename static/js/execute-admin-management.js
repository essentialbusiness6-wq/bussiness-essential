// admin-management.js - Business Essential Admin Management

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const openSidebar = document.getElementById('openSidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    const addAdminBtn = document.getElementById('addAdminBtn');
    const adminModal = document.getElementById('adminModal');
    const closeModal = document.getElementById('closeModal');
    const cancelModal = document.getElementById('cancelModal');
    const adminForm = document.getElementById('adminForm');
    const adminTable = document.getElementById('adminTable').querySelector('tbody');
    const adminSearch = document.getElementById('adminSearch');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');
    const visibleCount = document.getElementById('visibleCount');
    const totalCount = document.getElementById('totalCount');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');
    const actionModal = document.getElementById('actionModal');
    const cancelAction = document.getElementById('cancelAction');
    const confirmAction = document.getElementById('confirmAction');
    const toastContainer = document.getElementById('toastContainer');
    
    // State
    let admins = [];
    let filteredAdmins = [];
    let currentPage = 1;
    const pageSize = 8;
    let currentAction = null;
    let currentAdminId = null;

    // Initialize
    setupEventListeners();
    loadAdmins();
    
    // Functions
    function setupEventListeners() {
        // Sidebar
        openSidebar.addEventListener('click', () => sidebar.classList.add('active'));
        closeSidebar.addEventListener('click', closeSidebarFn);
        sidebarOverlay.addEventListener('click', closeSidebarFn);
        
        function closeSidebarFn() {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        }

        // Modal controls
        addAdminBtn.addEventListener('click', () => openModal());
        closeModal.addEventListener('click', closeModalFn);
        cancelModal.addEventListener('click', closeModalFn);
        adminModal.addEventListener('click', (e) => { if (e.target === adminModal) closeModalFn(); });
        
        adminForm.addEventListener('submit', handleFormSubmit);
        
        // Filters & Search
        adminSearch.addEventListener('input', applyFilters);
        roleFilter.addEventListener('change', applyFilters);
        statusFilter.addEventListener('change', applyFilters);
        
        // Pagination
        prevPage.addEventListener('click', () => changePage(currentPage - 1));
        nextPage.addEventListener('click', () => changePage(currentPage + 1));
        
        // Action modal
        cancelAction.addEventListener('click', () => actionModal.classList.remove('active'));
        actionModal.addEventListener('click', (e) => { if (e.target === actionModal) actionModal.classList.remove('active'); });
        
        confirmAction.addEventListener('click', executeAction);
    }

async function loadAdmins() {

    try {

        const response = await fetch(
            '/admin/execute/admin-management/data',
            {
                method: 'GET',
                credentials: 'include'
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {

            showToast(
                data.message || "Failed to load admins",
                "error"
            );

            return;
        }

        // =====================================
        // MAP API DATA
        // =====================================

        admins = data.admins.map(admin => ({

            id: admin.id,

            name: admin.name,

            email: admin.email,

            role: admin.role,

            department: admin.department,

            status: admin.status,

            lastLogin: formatLastActive(
                admin.last_active
            ),

            twoFA: admin.two_factor_enabled,

            initials: getInitials(
                admin.name
            ),

            avatarColor: getAvatarColor(
                admin.department
            )

        }));

    function getInitials(name) {

    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase();
}

    function getAvatarColor(department) {

    const colors = {

        engineering: 'var(--primary)',

        support: 'var(--teal)',

        finance: 'var(--orange)',

        executive: 'var(--purple)',

        marketing: 'var(--info)'

    };

    return colors[
        department?.toLowerCase()
    ] || 'var(--primary)';
}   

    function formatLastActive(lastActive) {

    if (
        lastActive === "Never" ||
        !lastActive
    ) {
        return "Never";
    }

    const days = parseInt(lastActive);

    if (days === 0) {
        return "Today";
    }

    if (days === 1) {
        return "1 day ago";
    }

    if (days < 30) {
        return `${days} days ago`;
    }

    const months = Math.floor(days / 30);

    if (months < 12) {

        return `${months} month${months > 1 ? 's' : ''} ago`;
    }

    const years = Math.floor(months / 12);

    return `${years} year${years > 1 ? 's' : ''} ago`;
}

        


        // =====================================
        // UPDATE TOTAL
        // =====================================

        totalCount.textContent = admins.length;


        // =====================================
        // RENDER TABLE
        // =====================================

        applyFilters();

    } catch (error) {

        console.error(
            "Load admins error:",
            error
        );

        showToast(
            "Failed to fetch admins",
            "error"
        );
    }
}

    function applyFilters() {
        const query = adminSearch.value.toLowerCase().trim();
        const role = roleFilter.value;
        const status = statusFilter.value;
        
        filteredAdmins = admins.filter(admin => {
            const matchQuery = admin.name.toLowerCase().includes(query) || 
                              admin.email.toLowerCase().includes(query) || 
                              admin.role.toLowerCase().includes(query);
            const matchRole = role === 'all' || admin.role === role;
            const matchStatus = status === 'all' || admin.status === status;
            
            return matchQuery && matchRole && matchStatus;
        });
        
        currentPage = 1;
        renderTable();
    }

    function renderTable() {
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        const pageData = filteredAdmins.slice(start, end);
        
        adminTable.innerHTML = pageData.map(admin => createAdminRow(admin)).join('');
        
        visibleCount.textContent = filteredAdmins.length;
        totalPagesSpan.textContent = Math.ceil(filteredAdmins.length / pageSize) || 1;
        currentPageSpan.textContent = currentPage;
        
        prevPage.disabled = currentPage === 1;
        nextPage.disabled = currentPage >= Math.ceil(filteredAdmins.length / pageSize);
        
        // Add event listeners to action buttons
        adminTable.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', handleActionClick);
        });
    }

    function createAdminRow(admin) {
        const roleName = admin.role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        const departmentName = admin.department.charAt(0).toUpperCase() + admin.department.slice(1);
        const statusLabel = admin.status.charAt(0).toUpperCase() + admin.status.slice(1);
        
        return `
            <tr data-id="${admin.id}">
                <td class="admin-cell">
                    <div class="avatar" style="background: ${admin.avatarColor};">${admin.initials}</div>
                    <div>
                        <span class="name">${admin.name}</span>
                    </div>
                </td>
                <td class="email-cell">${admin.email}</td>
                <td><span class="role-badge ${admin.role}">${roleName}</span></td>
                <td>${departmentName}</td>
                <td><span class="status-badge ${admin.status}">${statusLabel}</span></td>
                <td>${admin.lastLogin}</td>
                <td>${admin.twoFA ? '<span class="verified">✓ Enabled</span>' : '<span class="pending">Not set</span>'}</td>
                <td class="actions-cell">
                    <button class="action-btn edit" data-action="edit" data-id="${admin.id}" title="Edit">
                        <svg viewBox="0 0 24 24"><path d="M12 20h9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                    </button>
                    <button class="action-btn ${admin.status === 'suspended' ? 'edit' : 'delete'}" data-action="${admin.status === 'suspended' ? 'reactivate' : 'suspend'}" data-id="${admin.id}" title="${admin.status === 'suspended' ? 'Reactivate' : 'Suspend'}">
                        <svg viewBox="0 0 24 24">${admin.status === 'suspended' ? '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="2"/><polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2"/>' : '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12" y1="16" x2="12.01" y2="16" fill="none" stroke="currentColor" stroke-width="2"/>'}</svg>
                    </button>
                    <button class="action-btn delete" data-action="delete" data-id="${admin.id}" title="Remove">
                        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                    </button>
                </td>
            </tr>
        `;
    }

    function openModal(admin = null) {
        const form = document.getElementById('adminForm');
        const title = document.getElementById('modalTitle');
        const subtitle = document.getElementById('modalSubtitle');
        
        form.reset();
        
        if (admin) {
            title.textContent = 'Edit Administrator';
            subtitle.textContent = 'Update administrator details and permissions';
            document.getElementById('adminId').value = admin.id;
            document.getElementById('adminName').value = admin.name;
            document.getElementById('adminEmail').value = admin.email;
            document.getElementById('adminRole').value = admin.role;
            document.getElementById('adminDepartment').value = admin.department;
            document.getElementById('adminStatus').value = admin.status;
            document.getElementById('submitModal').querySelector('.btn-text').textContent = 'Update Administrator';
        } else {
            title.textContent = 'Add New Administrator';
            subtitle.textContent = 'Fill in the details to create a new admin account';
            document.getElementById('adminId').value = '';
            document.getElementById('submitModal').querySelector('.btn-text').textContent = 'Save Administrator';
        }
        
        adminModal.classList.add('active');
    }

    function closeModalFn() {
        adminModal.classList.remove('active');
        document.getElementById('adminForm').reset();
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        
        const btnText = document.querySelector('#submitModal .btn-text');
        const btnLoader = document.querySelector('#submitModal .btn-loader');
        const submitBtn = document.getElementById('submitModal');
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
        
        const id = document.getElementById('adminId').value;
        const name = document.getElementById('adminName').value.trim();
        const email = document.getElementById('adminEmail').value.trim();
        const role = document.getElementById('adminRole').value;
        const department = document.getElementById('adminDepartment').value;
        const status = document.getElementById('adminStatus').value;
        
        // Validation
        if (!/^[a-zA-Z0-9._%+-]+@businesse\.com$/.test(email)) {
            showToast('⚠️ Only @businesse.com emails are allowed', 'error');
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            return;
        }
        
        setTimeout(() => {
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            const colors = ['var(--primary)', 'var(--orange)', 'var(--teal)', 'var(--purple)', 'var(--info)', 'var(--warning)'];
            
            if (id) {
                // Update existing
                const index = admins.findIndex(a => a.id === id);
                if (index !== -1) {
                    admins[index] = { ...admins[index], name, email, role, department, status, initials, avatarColor: admins[index].avatarColor };
                    showToast('✓ Administrator updated successfully', 'success');
                }
            } else {
                // Add new
                const newId = (Math.max(...admins.map(a => parseInt(a.id)), 0) + 1).toString();
                admins.push({ id: newId, name, email, role, department, status, lastLogin: 'Never', twoFA: false, initials, avatarColor: colors[Math.floor(Math.random() * colors.length)] });
                showToast('✓ New administrator added successfully', 'success');
            }
            
            totalCount.textContent = admins.length;
            applyFilters();
            closeModalFn();
            
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }, 800);
    }

function handleActionClick(e) {

    const btn = e.currentTarget;

    const action = btn.dataset.action;

    const id = btn.dataset.id;

    const admin = admins.find(
        a => String(a.id) === String(id)
    );

    if (!admin) {
        console.log("Admin not found");
        return;
    }

    currentAdminId = id;

    currentAction = action;

    const icon = document.getElementById('actionIcon');

    const title = document.getElementById('actionTitle');

    const message = document.getElementById('actionMessage');

    const confirmBtn = document.getElementById('confirmAction');

    if (action === 'edit') {

        openModal(admin);

        return;
    }

    if (action === 'suspend') {

        icon.className = 'modal-icon warning';

        title.textContent = 'Suspend Administrator';

        message.textContent =
            `Are you sure you want to suspend ${admin.name}?`;

        confirmBtn.className = 'btn warning';

    } else if (action === 'reactivate') {

        icon.className = 'modal-icon warning';

        title.textContent = 'Reactivate Administrator';

        message.textContent =
            `Reactivate access for ${admin.name}?`;

        confirmBtn.className = 'btn primary';

    } else if (action === 'delete') {

        icon.className = 'modal-icon danger';

        title.textContent = 'Remove Administrator';

        message.textContent =
            `Permanently remove ${admin.name}?`;

        confirmBtn.className = 'btn danger';
    }

    actionModal.classList.add('active');
}
async function executeAction() {

    if (!currentAction || !currentAdminId) {
        return;
    }

    const confirmBtn = document.getElementById('confirmAction');

    const originalText = confirmBtn.innerHTML;

    confirmBtn.disabled = true;

    confirmBtn.innerHTML = `
        <span class="btn-loader"></span>
        Processing...
    `;

    try {

        let endpoint = "";
        let method = "POST";

        // =====================================
        // DETERMINE API ENDPOINT
        // =====================================

        if (currentAction === "suspend") {

            endpoint = `/admin/execute/admin/management/suspend/${currentAdminId}`;

        } else if (currentAction === "reactivate") {

            endpoint = `/admin/execute/admin/management/reactivate/${currentAdminId}`;

        } else if (currentAction === "delete") {

            endpoint = `/admin/execute/admin/management/delete/${currentAdminId}`;

            method = "DELETE";
        }

        // =====================================
        // SEND REQUEST
        // =====================================

        const response = await fetch(endpoint, {
            method: method,
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
    

        // =====================================
        // HANDLE FAILURE
        // =====================================

        if (!response.ok || !data.success) {

            showToast(
                data.message || "Operation failed",
                "error"
            );

            return;
        }

        // =====================================
        // UPDATE UI LOCALLY
        // =====================================

        const index = admins.findIndex(
            a => String(a.id) === String(currentAdminId)
        );

        if (index === -1) {
            return;
        }

        // =====================================
        // SUSPEND
        // =====================================

        if (currentAction === "suspend") {

            admins[index].status = "suspended";

            showToast(
                `✓ ${admins[index].name} suspended successfully`,
                "success"
            );
        }

        // =====================================
        // REACTIVATE
        // =====================================

        else if (currentAction === "reactivate") {

            admins[index].status = "active";

            showToast(
                `✓ ${admins[index].name} reactivated successfully`,
                "success"
            );
        }

        // =====================================
        // DELETE
        // =====================================

        else if (currentAction === "delete") {

            const deletedName = admins[index].name;

            admins.splice(index, 1);

            totalCount.textContent = admins.length;

            showToast(
                `✓ ${deletedName} removed successfully`,
                "success"
            );
        }

        // =====================================
        // CLOSE MODAL
        // =====================================

        actionModal.classList.remove("active");

        applyFilters();

        currentAction = null;

        currentAdminId = null;

    } catch (error) {

        console.error(
            "Execute action error:",
            error
        );

        showToast(
            "Something went wrong while processing request",
            "error"
        );

    } finally {

        confirmBtn.disabled = false;

        confirmBtn.innerHTML = originalText;
    }
}

    function changePage(page) {
        if (page < 1 || page > Math.ceil(filteredAdmins.length / pageSize)) return;
        currentPage = page;
        renderTable();
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // Expose for debugging
    window.adminManagement = { admins, loadAdmins, applyFilters };
});