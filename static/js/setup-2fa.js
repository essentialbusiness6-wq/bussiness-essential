// setup-2fa.js - Business Essential 2FA Setup Flow

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const steps = {
        intro: document.getElementById('step-intro'),
        scan: document.getElementById('step-scan'),
        verify: document.getElementById('step-verify'),
        success: document.getElementById('step-success')
    };
    
    const getStartedBtn = document.getElementById('getStartedBtn');
    const backToIntroBtn = document.getElementById('backToIntroBtn');
    const continueToVerifyBtn = document.getElementById('continueToVerifyBtn');
    const backToScanBtn = document.getElementById('backToScanBtn');
    const verifyBtn = document.getElementById('verifyBtn');
    const finishBtn = document.getElementById('finishBtn');
    const backButton = document.getElementById('backButton');
    
    const copyKeyBtn = document.getElementById('copyKeyBtn');
    const secretKey = document.getElementById('secretKey');
    const authCodeInput = document.getElementById('authCodeInput');
    const codeError = document.getElementById('codeError');
    const toastContainer = document.getElementById('toastContainer');

    // State
    let currentStep = 'intro';

    // Initialize
    createParticles();
    setupEventListeners();

    function setupEventListeners() {
        getStartedBtn.addEventListener('click', () => goToStep('scan'));
        backToIntroBtn.addEventListener('click', () => goToStep('intro'));
        continueToVerifyBtn.addEventListener('click', () => {
            goToStep('verify');
            setTimeout(() => authCodeInput.focus(), 100);
        });
        backToScanBtn.addEventListener('click', () => {
            goToStep('scan');
            authCodeInput.value = '';
            codeError.classList.remove('visible');
            authCodeInput.classList.remove('error');
        });
        
        verifyBtn.addEventListener('click', handleVerify);
        finishBtn.addEventListener('click', () => {
            showToast('Redirecting to security settings...', 'success');
            setTimeout(() => { /* window.location.href = '/security'; */ }, 1500);
        });
        
        backButton.addEventListener('click', () => {
            if (currentStep === 'intro') {
                // window.history.back();
                showToast('Going back...', 'info');
            } else if (currentStep === 'scan') {
                goToStep('intro');
            } else if (currentStep === 'verify') {
                goToStep('scan');
                authCodeInput.value = '';
                codeError.classList.remove('visible');
                authCodeInput.classList.remove('error');
            }
        });

        copyKeyBtn.addEventListener('click', () => {
            const keyText = secretKey.textContent.replace(/\s/g, '');
            navigator.clipboard.writeText(keyText).then(() => {
                showToast('Secret key copied to clipboard', 'success');
            }).catch(() => {
                showToast('Failed to copy', 'error');
            });
        });

        // Auto-format and validate code input
        authCodeInput.addEventListener('input', (e) => {
            // Allow only numbers
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            
            // Clear error state when typing
            if (codeError.classList.contains('visible')) {
                codeError.classList.remove('visible');
                authCodeInput.classList.remove('error');
            }
        });

        // Allow "Enter" key to submit
        authCodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleVerify();
            }
        });
    }

    function goToStep(stepName) {
        // Hide all steps
        Object.values(steps).forEach(step => step.classList.remove('active'));
        // Show target step
        steps[stepName].classList.add('active');
        currentStep = stepName;
    }

    function handleVerify() {
        const code = authCodeInput.value.trim();
        
        if (code.length !== 6) {
            codeError.textContent = 'Please enter a valid 6-digit code.';
            codeError.classList.add('visible');
            authCodeInput.classList.add('error');
            authCodeInput.focus();
            return;
        }

        // Simulate API verification
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<span class="spinner"></span> Verifying...';
        
        setTimeout(() => {
            // For demo purposes, accept any 6-digit code. 
            // In production, validate against your backend.
            if (code.length === 6) {
                goToStep('success');
                showToast('Two-factor authentication enabled!', 'success');
            } else {
                codeError.textContent = 'Invalid code. Please check your authenticator app and try again.';
                codeError.classList.add('visible');
                authCodeInput.classList.add('error');
                authCodeInput.select();
            }
            
            // Reset button state
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = 'Verify & Enable';
        }, 1200);
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = '';
        if (type === 'success') icon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
        else if (type === 'error') icon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
        else icon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
        
        toast.innerHTML = `${icon} <span>${message}</span>`;
        toastContainer.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }

    function createParticles() {
        const container = document.getElementById('particles');
        const count = window.innerWidth > 768 ? 20 : 10;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.cssText = `
                width: ${Math.random() * 6 + 2}px; 
                height: ${Math.random() * 6 + 2}px;
                left: ${Math.random() * 100}%; 
                top: ${Math.random() * 100}%;
                animation-duration: ${Math.random() * 10 + 15}s; 
                animation-delay: ${Math.random() * 5}s;
                opacity: ${Math.random() * 0.5 + 0.1};
            `;
            container.appendChild(p);
        }
    }
});
