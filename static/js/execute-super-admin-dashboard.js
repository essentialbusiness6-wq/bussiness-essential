// super-admin-dashboard.js - Business Essential Execute Super Admin Dashboard

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const closeSidebar = document.getElementById('closeSidebar');
    const generateKeyBtn = document.getElementById('generateKeyBtn');
    const generateKeyModal = document.getElementById('generateKeyModal');
    const closeModal = document.getElementById('closeModal');
    const cancelKeyGen = document.getElementById('cancelKeyGen');
    const submitKeyGen = document.getElementById('submitKeyGen');
    const closeKeyModal = document.getElementById('closeKeyModal');
    const generateKeyForm = document.getElementById('generateKeyForm');
    const generatedKeyResult = document.getElementById('generatedKeyResult');
    const newKeyValue = document.getElementById('newKeyValue');
    const copyKeyBtn = document.getElementById('copyKeyBtn');
    const adminSearch = document.getElementById('adminSearch');
    const adminRows = document.querySelectorAll('.admin-table tbody tr');
    const addAdminBtn = document.getElementById('addAdminBtn');
    
    // Initialize
    setupEventListeners();
    
    // Functions
    function setupEventListeners() {
        // Sidebar toggle
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });
        
        closeSidebar.addEventListener('click', closeSidebarMenu);
        sidebarOverlay.addEventListener('click', closeSidebarMenu);
        
        function closeSidebarMenu() {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        }
        
        // Modal controls
        generateKeyBtn.addEventListener('click', openKeyModal);
        closeModal.addEventListener('click', closeKeyModalFn);
        cancelKeyGen.addEventListener('click', closeKeyModalFn);
        
        generateKeyModal.addEventListener('click', (e) => {
            if (e.target === generateKeyModal) closeKeyModalFn();
        });
        
        // Generate Key
        generateKeyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleGenerateKey();
        });
        
        closeKeyModal.addEventListener('click', closeKeyModalFn);
        copyKeyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(newKeyValue.textContent).then(() => {
                showToast('✓ Invite key copied to clipboard', 'success');
            }).catch(() => {
                showToast('⚠️ Failed to copy key', 'error');
            });
        });
        
        // Admin search
        adminSearch?.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            filterAdmins(query);
        });
        
        // Add Admin (demo)
        addAdminBtn?.addEventListener('click', () => {
            showToast('➕ Opening admin registration flow...');
        });
    }
    
    function openKeyModal() {
        generateKeyModal.classList.add('active');
        generateKeyForm.style.display = 'block';
        generatedKeyResult.style.display = 'none';
        generateKeyForm.reset();
    }
    
    function closeKeyModalFn() {
        generateKeyModal.classList.remove('active');
        setTimeout(() => {
            generateKeyForm.style.display = 'block';
            generatedKeyResult.style.display = 'none';
            generateKeyForm.reset();
        }, 300);
    }
    
    function handleGenerateKey() {
        const role = document.getElementById('keyRole').value;
        const expiry = document.getElementById('keyExpiry').value;
        const maxUses = document.getElementById('keyMaxUses').value;
        
        // Show loading
        submitKeyGen.disabled = true;
        submitKeyGen.textContent = 'Generating...';
        
        setTimeout(() => {
            // Generate random key
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let key = '';
            for (let i = 0; i < 12; i++) {
                if (i === 4 || i === 8) key += '-';
                key += chars[Math.floor(Math.random() * chars.length)];
            }
            
            // Show generated key
            newKeyValue.textContent = key;
            generateKeyForm.style.display = 'none';
            generatedKeyResult.style.display = 'block';
            
            // Reset button
            submitKeyGen.disabled = false;
            submitKeyBtn.textContent = 'Generate Key';
            
            // Log audit event
            console.log(`[AUDIT] ${new Date().toISOString()} | Super Admin generated invite key: ${key} | Role: ${role} | Expiry: ${expiry} | Max Uses: ${maxUses}`);
            
            showToast('🔑 Invite key generated successfully!', 'success');
        }, 800);
    }
    
    function filterAdmins(query) {
        adminRows.forEach(row => {
            const name = row.querySelector('.name')?.textContent.toLowerCase() || '';
            const email = row.querySelector('.email')?.textContent.toLowerCase() || '';
            const role = row.querySelector('.role-badge')?.textContent.toLowerCase() || '';
            
            const match = name.includes(query) || email.includes(query) || role.includes(query);
            row.style.display = match ? '' : 'none';
        });
    }
    
    function showToast(message, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
});