// internal-admin-register.js - Business Essential Internal Admin Registration

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('internalAdminForm');
    const registerBtn = document.getElementById('registerBtn');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const togglePassword = document.getElementById('togglePassword');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    const matchStatus = document.getElementById('matchStatus');
    const roleSelect = document.getElementById('adminRole');
    const permissionsList = document.getElementById('permissionsList');
    const successModal = document.getElementById('successModal');
    const copyCredentials = document.getElementById('copyCredentials');
    const goToAdminList = document.getElementById('goToAdminList');
    const particlesContainer = document.getElementById('particles');
    
    // Role Permissions Data
    const rolePermissions = {
        'super-admin': [
            { perm: 'Full System Configuration', access: true },
            { perm: 'User & Role Management', access: true },
            { perm: 'Billing & Payout Control', access: true },
            { perm: 'Security & Audit Logs', access: true },
            { perm: 'Database & API Access', access: true },
            { perm: 'Delete/Archive Records', access: true }
        ],
        'admin': [
            { perm: 'User Management', access: true },
            { perm: 'Platform Settings', access: true },
            { perm: 'Support Ticket Oversight', access: true },
            { perm: 'Basic Analytics', access: true },
            { perm: 'Billing & Payout Control', access: false },
            { perm: 'Delete/Archive Records', access: false }
        ],
        'support': [
            { perm: 'View User Accounts', access: true },
            { perm: 'Manage Support Tickets', access: true },
            { perm: 'Send System Notifications', access: true },
            { perm: 'Reset User Passwords', access: true },
            { perm: 'Billing Modifications', access: false },
            { perm: 'Delete/Archive Records', access: false }
        ],
        'finance': [
            { perm: 'Invoice & Revenue Reports', access: true },
            { perm: 'Payout & Refund Management', access: true },
            { perm: 'Tax & Compliance Docs', access: true },
            { perm: 'User Account Management', access: false },
            { perm: 'Security Logs', access: false },
            { perm: 'System Configuration', access: false }
        ],
        'audit': [
            { perm: 'View Audit & Activity Logs', access: true },
            { perm: 'Export Compliance Reports', access: true },
            { perm: 'Read-Only System Access', access: true },
            { perm: 'Modify Records', access: false },
            { perm: 'User Management', access: false },
            { perm: 'Financial Operations', access: false }
        ]
    };

    // Initialize
    createParticles();
    setupEventListeners();
    
    // Functions
    function setupEventListeners() {
        togglePassword.addEventListener('click', () => toggleVisibility(passwordInput, togglePassword));
        roleSelect.addEventListener('change', updatePermissionsPreview);
        passwordInput.addEventListener('input', checkStrength);
        confirmPasswordInput.addEventListener('input', checkMatch);
        passwordInput.addEventListener('input', checkMatch);
        form.addEventListener('submit', handleSubmission);
        
        copyCredentials.addEventListener('click', () => {
            const temp = document.createElement('input');
            temp.value = `Email: ${document.getElementById('internalEmail').value}\nTemp Password: [Sent Securely]`;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
            showToast('✓ Credentials copied to clipboard', 'success');
        });
        
        goToAdminList.addEventListener('click', () => {
            showToast('🔍 Redirecting to admin dashboard...');
            setTimeout(() => { window.location.href = '/admin-list'; }, 800);
        });
    }
    
    function toggleVisibility(input, btn) {
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        btn.querySelector('.eye-open').style.display = isPass ? 'none' : 'block';
        btn.querySelector('.eye-closed').style.display = isPass ? 'block' : 'none';
        showHapticFeedback(btn);
    }
    
    function updatePermissionsPreview() {
        const role = roleSelect.value;
        const perms = rolePermissions[role] || [];
        permissionsList.innerHTML = '';
        
        if (perms.length === 0) {
            permissionsList.innerHTML = '<li class="placeholder">Select a role to view assigned permissions</li>';
            return;
        }
        
        perms.forEach(p => {
            const li = document.createElement('li');
            li.className = p.access ? 'valid' : 'denied';
            li.textContent = p.perm;
            permissionsList.appendChild(li);
        });
    }
    
    function checkStrength() {
        const pass = passwordInput.value;
        let score = 0;
        
        if (pass.length >= 12) score += 25;
        if (/[A-Z]/.test(pass)) score += 20;
        if (/[a-z]/.test(pass)) score += 20;
        if (/[0-9]/.test(pass)) score += 20;
        if (/[^A-Za-z0-9]/.test(pass)) score += 15;
        
        strengthFill.className = 'strength-fill';
        if (score < 40) { strengthFill.classList.add('weak'); strengthText.textContent = 'Weak'; }
        else if (score < 70) { strengthFill.classList.add('medium'); strengthText.textContent = 'Moderate'; }
        else if (score < 90) { strengthFill.classList.add('strong'); strengthText.textContent = 'Strong'; }
        else { strengthFill.classList.add('very-strong'); strengthText.textContent = 'Very Strong'; }
    }
    
    function checkMatch() {
        const p1 = passwordInput.value, p2 = confirmPasswordInput.value;
        if (!p2) { matchStatus.textContent = ''; return; }
        if (p1 === p2) { matchStatus.textContent = '✓ Passwords match'; matchStatus.className = 'match-status match'; }
        else { matchStatus.textContent = '✗ Passwords do not match'; matchStatus.className = 'match-status no-match'; }
    }
    
    async function handleSubmission(e) {
        e.preventDefault();
        if (!validateForm()) return;
        
        const btnText = registerBtn.querySelector('.btn-text');
        const btnLoader = registerBtn.querySelector('.btn-loader');
        registerBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';

        const playload= {
            name: document.getElementById('fullName').value.trim(),
            email: document.getElementById('internalEmail').value.trim(),
            employee_id: document.getElementById('employeeId').value.trim(),
            registration_key: document.getElementById('regCode').value.trim(),
            role: document.getElementById("adminRole").value.trim(),
            department: document.getElementById("department").value.trim(),
            password: document.getElementById("password").value.trim()
        };

        try{
            const response = await fetch("/admin/create-admin", {
                method:"POST", 
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify(playload)
            })

            const data = await response.json();

            if (data.success) {
                successModal.classList.add('active');
                showToast('✓ Internal admin account created successfully!', 'success');
                setTimeout(() => {
                    window.location.href = '/admin/login';
                },1800)
            } else {
                showToast(data.message || "Failed to create admin.")
            
            }
        } catch (error) {
            showToast(error || "Something happened durring admin creation.")
        } finally {
                   registerBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
        

    }
    
    function validateForm() {
        const email = document.getElementById('internalEmail').value;
        if (!/^[a-zA-Z0-9._%+-]+@businessessentia\.net$/.test(email)) {
            showToast('⚠️ Only @businessessentia.net emails are allowed', 'error');
            document.getElementById('internalEmail').focus();
            return false;
        }
        
        const pass = passwordInput.value;
        if (pass.length < 12 || !/[A-Z]/.test(pass) || !/[a-z]/.test(pass) || !/[0-9]/.test(pass) || !/[^A-Za-z0-9]/.test(pass)) {
            showToast('⚠️ Password does not meet internal security standards (12+ chars, upper, lower, number, special)', 'error');
            passwordInput.focus();
            return false;
        }
        
        if (pass !== confirmPasswordInput.value) {
            showToast('⚠️ Passwords do not match', 'error');
            confirmPasswordInput.focus();
            return false;
        }
        
        if (!document.getElementById('agreeNDA').checked || !document.getElementById('agreeDataAccess').checked) {
            showToast('⚠️ You must acknowledge internal policies', 'error');
            return false;
        }
        
        return true;
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