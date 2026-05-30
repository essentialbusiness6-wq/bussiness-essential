// internal-login.js - Business Essential Internal Admin Login

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('internalLoginForm');
    const loginBtn = document.getElementById('loginBtn');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const twoFactorSection = document.getElementById('twoFactorSection');
    const twoFactorCode = document.getElementById('twoFactorCode');
    const codeDots = document.querySelectorAll('.code-input-dots .dot');
    const errorModal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');
    const closeErrorModal = document.getElementById('closeErrorModal');
    const successModal = document.getElementById('successModal');
    const particlesContainer = document.getElementById('particles');
    
    // State
    let requires2FA = false;
    let loginStep = 'credentials';
    
    // Initialize
    createParticles();
    setupEventListeners();
    restoreSession();
    
    // Functions
    function setupEventListeners() {
        togglePassword.addEventListener('click', () => toggleVisibility(passwordInput, togglePassword));
        form.addEventListener('submit', handleSubmission);
        closeErrorModal.addEventListener('click', () => errorModal.classList.remove('active'));
        errorModal.addEventListener('click', (e) => { if (e.target === errorModal) errorModal.classList.remove('active'); });
        
        // 2FA code input handling
        twoFactorCode?.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            updateCodeDots(e.target.value.length);
            
            if (e.target.value.length === 6 && requires2FA) {
                verifyTwoFactor(e.target.value);
            }
        });
        
        // Paste support for 2FA
        twoFactorCode?.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '').substring(0, 6);
            twoFactorCode.value = pasted;
            updateCodeDots(pasted.length);
            if (pasted.length === 6) verifyTwoFactor(pasted);
        });
    }
    
    function restoreSession() {
        // Check for remembered device token
        const rememberToken = localStorage.getItem('admin_remember_token');
        if (rememberToken) {
            document.getElementById('rememberDevice').checked = true;
            showToast('✓ Trusted device detected. Session can be resumed.');
        }
    }
    
    function toggleVisibility(input, btn) {
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        btn.querySelector('.eye-open').style.display = isPass ? 'none' : 'block';
        btn.querySelector('.eye-closed').style.display = isPass ? 'block' : 'none';
        showHapticFeedback(btn);
    }
    
    function updateCodeDots(count) {
        codeDots.forEach((dot, i) => {
            dot.classList.toggle('filled', i < count);
        });
    }
    
    function handleSubmission(e) {
        e.preventDefault();
        
        if (loginStep === 'credentials') {
            if (!validateCredentials()) return;
            handleCredentialSubmit();
        } else if (loginStep === 'two-factor') {
            if (twoFactorCode.value.length !== 6) {
                showError('Please enter a complete 6-digit code');
                return;
            }
            verifyTwoFactor(twoFactorCode.value);
        }
    }
    
    function validateCredentials() {
        const email = document.getElementById('adminEmail').value.trim();
        const password = passwordInput.value;
        
        // Validate internal email domain
        if (!/^[a-zA-Z0-9._%+-]+@businessessentia\.net$/.test(email)) {
            showError('Only @businesse.com email addresses are permitted');
            document.getElementById('adminEmail').focus();
            return false;
        }
        
        if (password.length < 8) {
            showError('Password must be at least 8 characters');
            passwordInput.focus();
            return false;
        }
        
        return true;
    }
    
    async function handleCredentialSubmit() {
        const btnText = loginBtn.querySelector('.btn-text');
        const btnLoader = loginBtn.querySelector('.btn-loader');
        loginBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
        
        const email = document.getElementById('adminEmail').value;
        const password = passwordInput.value;

        try{
            const response = await fetch('/admin/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (!response.ok) {
                loginBtn.disabled = false;
                btnText.style.display = 'inline';
                btnLoader.style.display = 'none';
                showError(data.message || 'Login failed. Please check your credentials.');
                console.log('[AUDIT] Failed login attempt:', new Date().toISOString(), 'Email:', email, 'Reason:', data.message);
                return;
            }

            if (data.success) {
                if (data.requires_2fa) {
                    requires2FA = true;
                    if (data.qr_code) {
                
                        document.getElementById('qrCodeContainer').innerHTML = '';
                        const verifytext = document.createElement('p');
                        verifytext.textContent = 'Enter code from your authenticator app';
                        document.getElementById('qrCodeContainer').appendChild(verifytext);
                            document.getElementById(
        'credentialsSection'
    ).style.display = 'none';

    twoFactorSection.style.display = 'block';
                    }else {
                    setup2FA();
                    showToast('🔐 Two-factor authentication required');
                    }
            } else {
                loginSuccess(data.role, data.department);
            }
            } else {
                showError(data.message || "Login failed. Please check your credentials.")
            }

        } catch (error) {
            console.error('Login error:', error);
            showError('An error occurred during login');
        } finally {
            loginBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    }

    async function setup2FA() {

        
        try {
            const response = await fetch('/admin/api/setup-2fa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: document.getElementById('adminEmail').value })
            });

            const data = await response.json();
if (response.ok && data.qr_code) {

    const qrImg = document.createElement('img');

    qrImg.src = `data:image/png;base64,${data.qr_code}`;

    qrImg.alt = 'Scan this QR code with your authenticator app';

    document.getElementById('qrCodeContainer').innerHTML = '';

    document
        .getElementById('qrCodeContainer')
        .appendChild(qrImg);

    document.getElementById(
        'credentialsSection'
    ).style.display = 'none';

    twoFactorSection.style.display = 'block';

    twoFactorCode.focus();

    showToast(
        '📱 Scan the QR code with your authenticator app'
    );
} else {
                showError(data.message || 'Failed to set up two-factor authentication');
            }
        } catch (error) {
            console.error('2FA setup error:', error);
            showError('An error occurred while setting up two-factor authentication');
        }
        
    }
    
    async function verifyTwoFactor(code) {
        const btnText = loginBtn.querySelector('.btn-text');
        const btnLoader = loginBtn.querySelector('.btn-loader');
        loginBtn.disabled = true;
        btnText.textContent = 'Verifying Code...';
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';


        try{
            if (code.length === 6 && /^\d{6}$/.test(code)) {
                if (document.getElementById('rememberDevice').checked) {
                    localStorage.setItem('admin_remember_token', 'token_' + Math.random().toString(36).substr(2, 9));
                }

                const response = await fetch('/admin/api/verify-2fa', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: document.getElementById('adminEmail').value, code })
                });

                const data = await response.json();

                console.log("Data: ", data);

                if (response.ok && data.success) {
                    loginSuccess(data.role, data.department);
                } else {
                    showError(data.message || 'Invalid authentication code. Please try again.');
                    updateCodeDots(0);
                    twoFactorCode.value = '';
                    twoFactorCode.focus();
                }
            }
        } catch (error) {
            console.log("Erorr:",error);
            showError(error);
        } finally {
                 loginBtn.disabled = false;
                btnText.textContent = 'Sign In to Admin Portal';
        }
    }
    
    function loginSuccess(role,department) {
        // Store device token if remembered
        if (document.getElementById('rememberDevice').checked) {
            localStorage.setItem('admin_remember_token', 'token_' + Math.random().toString(36).substr(2, 9));
        }
        
        successModal.classList.add('active');
        showToast('✓ Authentication successful! Redirecting...', 'success');
        console.log('[AUDIT] Successful login:', new Date().toISOString());
        
        // Simulate redirect
        setTimeout(() => {
            successModal.classList.remove('active');
            showToast('🎉 Welcome to Business Essential Admin Portal');
            if (role === 'super_admin' && department === 'executive') {
                window.location.href = '/admin/execute/super-admin-dashboard';
            } else if (role === 'support' && department === 'support') {
                window.location.href = '/admin/supprt/dashboard';
            }

            // window.location.href = '/internal-dashboard';
           
        }, 2000);
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorModal.classList.add('active');
        showToast('⚠️ ' + message, 'error');
    }
    
    function createParticles() {
        const count = window.innerWidth > 768 ? 30 : 15;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.cssText = `width:${Math.random()*5+2}px;height:${Math.random()*5+2}px;left:${Math.random()*100}%;top:${Math.random()*100}%;animation-duration:${Math.random()*10+15}s;animation-delay:${Math.random()*5}s;opacity:${Math.random()*0.4+0.1};`;
            particlesContainer.appendChild(p);
        }
    }
    
    function showToast(message, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${type.includes('success') || type.includes('warning') || type.includes('error') ? 'white' : 'var(--primary)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${type==='success'?'<polyline points="20 6 9 17 4 12"/>':type==='warning'?'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>':type==='error'?'<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>':'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'}</svg>${message}`;
        document.body.appendChild(t);
        setTimeout(() => { t.style.transform = 'translateX(-50%) translateY(0)'; }, 10);
        setTimeout(() => { t.style.transform = 'translateX(-50%) translateY(100px)'; t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2600);
    }
    
    function showHapticFeedback(el) { if(!el) return; el.classList.add('haptic-feedback'); setTimeout(() => el.classList.remove('haptic-feedback'), 200); }
    
    const style = document.createElement('style');
    style.innerHTML = `@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}.haptic-feedback{animation:haptic .15s ease-in-out}`;
    document.head.appendChild(style);
    
    setTimeout(() => {
        document.querySelector('.auth-brand').style.opacity = '0'; document.querySelector('.auth-brand').style.transform = 'translateY(10px)';
        setTimeout(() => { document.querySelector('.auth-brand').style.transition = 'opacity .4s ease, transform .4s ease'; document.querySelector('.auth-brand').style.opacity = '1'; document.querySelector('.auth-brand').style.transform = 'translateY(0)'; }, 200);
        document.querySelectorAll('.form-section').forEach((s, i) => { s.style.opacity = '0'; s.style.transform = 'translateY(15px)'; setTimeout(() => { s.style.transition = 'opacity .4s ease, transform .4s ease'; s.style.opacity = '1'; s.style.transform = 'translateY(0)'; }, 350 + i * 120); });
    }, 250);
});