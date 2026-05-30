// system-config.js - Business Essential System Configuration

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const openSidebar = document.getElementById('openSidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    const form = document.getElementById('systemConfigForm');
    const saveBtn = document.getElementById('saveConfigBtn');
    const saveStickyBtn = document.getElementById('saveStickyBtn');
    const resetBtn = document.getElementById('resetConfigBtn');
    const resetModal = document.getElementById('resetModal');
    const cancelReset = document.getElementById('cancelReset');
    const confirmReset = document.getElementById('confirmReset');
    const successModal = document.getElementById('successModal');
    const closeSuccess = document.getElementById('closeSuccess');
    const importBtn = document.getElementById('importConfigBtn');
    const addWebhookBtn = document.getElementById('addWebhookBtn');
    const webhookList = document.getElementById('webhookList');
    const toastContainer = document.getElementById('toastContainer');
    const changesText = document.getElementById('changesText');
    const changeIndicator = document.querySelector('.change-indicator');

    // State
    let originalConfig = {};
    let hasChanges = false;

    // Initialize
    setupEventListeners();
    loadCurrentConfig();

    // Functions
    function setupEventListeners() {
        // Sidebar
        openSidebar.addEventListener('click', () => { sidebar.classList.add('active'); sidebarOverlay.classList.add('active'); });
        closeSidebar.addEventListener('click', closeSidebarFn);
        sidebarOverlay.addEventListener('click', closeSidebarFn);
        function closeSidebarFn() { sidebar.classList.remove('active'); sidebarOverlay.classList.remove('active'); }

        // Form tracking
        form.addEventListener('input', trackChanges);
        form.addEventListener('change', trackChanges);

        // Save buttons
        saveBtn.addEventListener('click', handleSave);
        saveStickyBtn.addEventListener('click', handleSave);

        // Reset
        resetBtn.addEventListener('click', () => { if(hasChanges) resetModal.classList.add('active'); });
        cancelReset.addEventListener('click', () => resetModal.classList.remove('active'));
        resetModal.addEventListener('click', (e) => { if(e.target === resetModal) resetModal.classList.remove('active'); });
        confirmReset.addEventListener('click', resetForm);

        // Success modal
        closeSuccess.addEventListener('click', () => successModal.classList.remove('active'));
        successModal.addEventListener('click', (e) => { if(e.target === successModal) successModal.classList.remove('active'); });

        // Import
        importBtn.addEventListener('click', () => showToast('📂 Opening config import dialog...', 'info'));

        // Webhook management
        addWebhookBtn.addEventListener('click', addWebhookRow);
        webhookList.addEventListener('click', handleWebhookActions);

        // Masked input toggles
        document.querySelectorAll('.reveal-toggle').forEach(btn => {
            btn.addEventListener('click', toggleReveal);
        });
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', copyToClipboard);
        });
    }

    function loadCurrentConfig() {
        // In production: fetch('/api/system-config')
        const formData = new FormData(form);
        for (let [key, value] of formData.entries()) originalConfig[key] = value;
        // Also capture toggles & arrays
        originalConfig.webhooks = Array.from(document.querySelectorAll('.webhook-url')).map(i => i.value);
        originalConfig.flags = {};
        document.querySelectorAll('input[name^="feature_"]').forEach(cb => originalConfig.flags[cb.name] = cb.checked);
        
        trackChanges(); // Initialize state
    }

    function trackChanges() {
        const current = getCurrentState();
        const changed = JSON.stringify(current) !== JSON.stringify(originalConfig);
        
        hasChanges = changed;
        changeIndicator.classList.toggle('unsaved', changed);
        changesText.textContent = changed ? 'Unsaved changes' : 'No unsaved changes';
        
        saveBtn.disabled = !changed;
        saveStickyBtn.disabled = !changed;
    }

    function getCurrentState() {
        const formData = new FormData(form);
        const state = {};
        for (let [key, value] of formData.entries()) state[key] = value;
        state.webhooks = Array.from(document.querySelectorAll('.webhook-url')).map(i => i.value).filter(v => v.trim());
        state.flags = {};
        document.querySelectorAll('input[name^="feature_"]').forEach(cb => state.flags[cb.name] = cb.checked);
        return state;
    }

    function handleSave(e) {
        e.preventDefault();
        if (!hasChanges) return;

        // Validate URLs
        const urls = [document.getElementById('appUrl').value, document.getElementById('cdnUrl').value];
        for (let url of urls) {
            if (url && !/^https?:\/\/.+/.test(url)) {
                showToast('⚠️ Please enter valid URLs', 'error');
                return;
            }
        }

        // Show loading
        const btns = [saveBtn, saveStickyBtn];
        btns.forEach(btn => { btn.disabled = true; btn.querySelector('.btn-text').textContent = 'Saving...'; btn.querySelector('.btn-loader').style.display = 'inline-block'; });

        setTimeout(() => {
            // In production: POST /api/system-config with JSON payload
            originalConfig = getCurrentState();
            hasChanges = false;
            changeIndicator.classList.remove('unsaved');
            changesText.textContent = 'No unsaved changes';
            btns.forEach(btn => { btn.disabled = false; btn.querySelector('.btn-text').textContent = 'Save Changes'; btn.querySelector('.btn-loader').style.display = 'none'; });
            
            successModal.classList.add('active');
            showToast('✓ System configuration updated successfully', 'success');
            console.log('[AUDIT]', new Date().toISOString(), 'Config saved by Super Admin');
        }, 1200);
    }

    function resetForm() {
        form.reset();
        // Restore original webhook rows
        webhookList.innerHTML = '';
        originalConfig.webhooks.forEach(url => {
            const div = document.createElement('div');
            div.className = 'webhook-item';
            div.innerHTML = `<input type="text" value="${url}" class="webhook-url"><button type="button" class="remove-webhook" title="Remove">✕</button>`;
            webhookList.appendChild(div);
        });
        // Restore flags
        for (const [name, checked] of Object.entries(originalConfig.flags)) {
            const cb = document.querySelector(`input[name="${name}"]`);
            if (cb) cb.checked = checked;
        }
        
        resetModal.classList.remove('active');
        trackChanges();
        showToast('🔄 Form reverted to last saved state', 'warning');
    }

    function addWebhookRow() {
        const div = document.createElement('div');
        div.className = 'webhook-item';
        div.innerHTML = `<input type="text" placeholder="https://your-webhook-url.com/endpoint" class="webhook-url"><button type="button" class="remove-webhook" title="Remove">✕</button>`;
        webhookList.appendChild(div);
        div.querySelector('input').focus();
        trackChanges();
    }

    function handleWebhookActions(e) {
        if (e.target.classList.contains('remove-webhook')) {
            const item = e.target.closest('.webhook-item');
            if (document.querySelectorAll('.webhook-item').length > 1) {
                item.remove();
                trackChanges();
            } else {
                showToast('⚠️ At least one webhook URL is required', 'warning');
            }
        }
    }

    function toggleReveal(e) {
        const btn = e.currentTarget;
        const input = btn.previousElementSibling;
        if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '🙈';
        } else {
            input.type = 'password';
            btn.textContent = '👁️';
        }
    }

    function copyToClipboard(e) {
        const btn = e.currentTarget;
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        navigator.clipboard.writeText(input.value).then(() => {
            showToast('📋 Copied to clipboard', 'success');
        }).catch(() => {
            input.select();
            document.execCommand('copy');
            showToast('📋 Copied to clipboard', 'success');
        });
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // Warn before leaving with unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (hasChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
});