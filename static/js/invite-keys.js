// invite-keys.js - Business Essential Invite Keys Management

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const openModalBtn = document.getElementById('openGenerateModal');
    const modal = document.getElementById('generateModal');
    const closeModalBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelGenerate');
    const doneBtn = document.getElementById('doneGenerate');
    const generateForm = document.getElementById('generateForm');
    const generatedResult = document.getElementById('generatedResult');
    const newKeyOutput = document.getElementById('newKeyOutput');
    const copyNewKeyBtn = document.getElementById('copyNewKey');
    const tableSearch = document.getElementById('tableSearch');
    const keysTable = document.getElementById('keysTable');
    const tbody = keysTable.querySelector('tbody');
    const toastContainer = document.getElementById('toastContainer');
    
    // Initialize
    setupEventListeners();
    setupTableSearch();

    // Functions
    function setupEventListeners() {
        openModalBtn.addEventListener('click', openModal);
        closeModalBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        doneBtn.addEventListener('click', closeModal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        generateForm.addEventListener('submit', handleGenerateKey);
        copyNewKeyBtn.addEventListener('click', copyKeyToClipboard);
        
        // Table row key copy
        tbody.addEventListener('click', (e) => {
            const keyEl = e.target.closest('.key-code');
            if (keyEl) {
                copyToClipboard(keyEl.dataset.key, showToast('📋 Key copied to clipboard', 'success'));
            }
        });
    }

    function openModal() {
        modal.classList.add('active');
        generateForm.reset();
        generateForm.style.display = 'block';
        generatedResult.style.display = 'none';
        document.getElementById('targetEmail').focus();
    }

    function closeModal() {
        modal.classList.remove('active');
        setTimeout(() => {
            generateForm.style.display = 'block';
            generatedResult.style.display = 'none';
            generateForm.reset();
        }, 300);
    }

    async function handleGenerateKey(e) {
        e.preventDefault();
        const email = document.getElementById('targetEmail').value.trim();
        
        if (!validateEmail(email)) {
            showToast('⚠️ Please enter a valid @businesse.com email', 'error');
            return;
        }
        
        // Show loading
        const btnText = document.querySelector('#submitGenerate .btn-text');
        const btnLoader = document.querySelector('#submitGenerate .btn-loader');
        const submitBtn = document.getElementById('submitGenerate');
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';

        try {
            const response = await fetch('/admin/generate-invite-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to generate invite key');
            }

            if (data.status === 'success') {
                const key = data.invite_key;
                newKeyOutput.textContent = key;
                // Switch views
                generateForm.style.display = 'none';
                generatedResult.style.display = 'block';
                showToast('🔑 Invite key generated successfully!', 'success');
            } else {
                throw new Error(data.message || 'Failed to generate invite key');
            }
        } catch (error) {
            showToast(`❌ Error: ${error.message}`, 'error');
        } finally {
            // Reset button
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
        
  
    }

    function validateEmail(email) {
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    }

    function copyKeyToClipboard() {
        copyToClipboard(newKeyOutput.textContent, showToast('✅ Key copied to clipboard', 'success'));
    }

    function copyToClipboard(text, callback) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(callback);
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed'; ta.style.left = '-999px';
            document.body.appendChild(ta);
            ta.select(); document.execCommand('copy');
            document.body.removeChild(ta);
            callback();
        }
    }

    function setupTableSearch() {
        tableSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            let visible = 0;
            tbody.querySelectorAll('tr').forEach(row => {
                const text = row.textContent.toLowerCase();
                const match = text.includes(query);
                row.style.display = match ? '' : 'none';
                if (match) visible++;
            });
            document.getElementById('visibleCount').textContent = visible;
        });
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
});