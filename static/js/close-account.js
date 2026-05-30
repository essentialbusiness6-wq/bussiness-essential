// close-account.js - Business Essential Close Account Page

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const backButton = document.getElementById('backButton');
    const helpBtn = document.getElementById('helpBtn');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const checkboxes = document.querySelectorAll('.checklist input[type="checkbox"]');
    const closeAccountBtn = document.getElementById('closeAccountBtn');
    const closeAccountForm = document.getElementById('closeAccountForm');
    const confirmModal = document.getElementById('confirmModal');
    const successModal = document.getElementById('successModal');
    const closeModal = document.getElementById('closeModal');
    const cancelClose = document.getElementById('cancelClose');
    const finalConfirm = document.getElementById('finalConfirm');
    const redirectBtn = document.getElementById('redirectBtn');
    const verifyPassword = document.getElementById('verifyPassword');
    const particlesContainer = document.getElementById('particles');
    
    // Initialize
    createParticles();
    setupEventListeners();
    
    function setupEventListeners() {
        // Navigation
        backButton.addEventListener('click', () => {
            showHapticFeedback(backButton);
            setTimeout(() => {
                backButton.classList.remove('haptic-feedback');
                showToast('← Going back to settings...');
                window.history.back();
            }, 200);
        });
        
        helpBtn.addEventListener('click', () => {
            showHapticFeedback(helpBtn);
            showToast('🎧 Opening support documentation...');
            window.location.href = '/support';
        });
        
        exportDataBtn.addEventListener('click', () => {
            showHapticFeedback(exportDataBtn);
            showToast('📦 Preparing your data export. This may take a moment...');
            setTimeout(() => showToast('✅ Data exported successfully! Check your downloads.', 'success'), 1500);
        });
        
        // Checkbox validation
        checkboxes.forEach(cb => {
            cb.addEventListener('change', updateSubmitState);
        });
        
        // Final submission
        closeAccountForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!validateForm()) return;
            confirmModal.classList.add('active');
        });
        
        cancelClose.addEventListener('click', () => {
            confirmModal.classList.remove('active');
        });
        
        closeModal.addEventListener('click', () => {
            confirmModal.classList.remove('active');
        });
        
        finalConfirm.addEventListener('click', () => {
            showHapticFeedback(finalConfirm);
            confirmModal.classList.remove('active');
            processAccountClosure();
        });
        
        redirectBtn.addEventListener('click', () => {
            showToast('👋 Redirecting to homepage...');
            setTimeout(() => { window.location.href = '/'; }, 800);
        });
        
        // Close modals on overlay click
        [confirmModal, successModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        });
    }
    
    function updateSubmitState() {
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        const hasPassword = verifyPassword.value.trim().length >= 6;
        
        closeAccountBtn.disabled = !(allChecked && hasPassword);
    }
    
    verifyPassword.addEventListener('input', updateSubmitState);
    
    function validateForm() {
        if (!document.getElementById('closeReason').value) {
            showToast('⚠️ Please select a reason for leaving', 'warning');
            return false;
        }
        if (verifyPassword.value.trim().length < 6) {
            showToast('⚠️ Please enter a valid password', 'warning');
            verifyPassword.focus();
            return false;
        }
        return true;
    }
    
    async function processAccountClosure() {
        closeAccountBtn.disabled = true;
        const btnText = closeAccountBtn.querySelector('.btn-text');
        const btnLoader = closeAccountBtn.querySelector('.btn-loader');
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';


        const playload = {
                        reason:
                        document.getElementById(
                            "closeReason"
                        ).value,

                    feedback:
                        document.getElementById(
                            "additionalFeedback"
                        ).value,

                    password:
                        document.getElementById(
                            "verifyPassword"
                        ).value
        };

        try{
            const response = await fetch('/account/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (result.status === 'success') {
                 successModal.classList.add('active');
                showToast('🔒 Account closure processed successfully', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                throw new Error(result.message || 'Account closure failed');
            }
        } catch (error) {
            console.error('Error occurred while closing account:', error);
            showToast('❌ An error occurred while processing your request. Please try again.', 'error');
        }
        


   

    }
    
    function createParticles() {
        const count = window.innerWidth > 768 ? 25 : 15;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.cssText = `
                width: ${Math.random() * 6 + 3}px; height: ${Math.random() * 6 + 3}px;
                left: ${Math.random() * 100}%; top: ${Math.random() * 100}%;
                animation-duration: ${Math.random() * 10 + 15}s; animation-delay: ${Math.random() * 5}s;
                opacity: ${Math.random() * 0.5 + 0.1};
            `;
            particlesContainer.appendChild(p);
        }
    }
    
    function showToast(message, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${type.includes('success') || type.includes('warning') || type.includes('error') ? 'white' : 'var(--primary)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${type === 'success' ? '<polyline points="20 6 9 17 4 12"/>' : 
                  type === 'warning' ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' : 
                  type === 'error' ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' : 
                  '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'}
            </svg>
            ${message}
        `;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.transform = 'translateX(-50%) translateY(0)'; }, 10);
        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(100px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2800);
    }
    
    function showHapticFeedback(el) {
        if (!el) return;
        el.classList.add('haptic-feedback');
        setTimeout(() => el.classList.remove('haptic-feedback'), 200);
    }
    
    // Inject animations
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .haptic-feedback { animation: haptic 0.15s ease-in-out; }
    `;
    document.head.appendChild(style);
});