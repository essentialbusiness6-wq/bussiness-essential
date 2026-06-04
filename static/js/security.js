document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const backButton = document.getElementById('backButton');
    const helpBtn = document.getElementById('helpBtn');
    const twoFactorToggle = document.getElementById('twoFactorToggle');
    const biometricToggle = document.getElementById('biometricToggle');
    const passwordOption = document.getElementById('passwordOption');
    const emailOption = document.getElementById('emailOption');
    const pinOption = document.getElementById('pinOption');
    const logoutBtns = document.querySelectorAll('.logout-btn:not([id])');
    const logoutAllBtn = document.getElementById('logoutAllBtn');
    const logoutModal = document.getElementById('logoutModal');
    const passwordModal = document.getElementById('passwordModal');
    const closeLogoutModal = document.getElementById('closeLogoutModal');
    const closePasswordModal = document.getElementById('closePasswordModal');
    const cancelLogoutBtn = document.getElementById('cancelLogout');
    const confirmLogoutBtn = document.getElementById('confirmLogout');
    const cancelPasswordBtn = document.getElementById('cancelPassword');
    const passwordForm = document.getElementById('passwordForm');
    const newPasswordInput = document.getElementById('newPassword');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');
    const particlesContainer = document.getElementById('particles');
    
    // Initialize
    createParticles();
    setupPasswordStrength();
    loadSessions();
    loadSecurityStatus();
    
    // Event Listeners
    backButton.addEventListener('click', () => {
        showHapticFeedback(backButton);
        setTimeout(() => {
            window.location.href = '/dashboard/me';
        }, 200);
    });
    
    helpBtn.addEventListener('click', () => {
        showHapticFeedback(helpBtn);
        window.location.href = '/support';
    });
    
    // Two-factor authentication toggle
    twoFactorToggle.addEventListener('change', () => {
        showHapticFeedback(twoFactorToggle);
        const option = twoFactorToggle.closest('.security-option');
        const statusLabel = option.querySelector('.status-label');
        
        if (twoFactorToggle.checked) {
            option.dataset.status = 'enabled';
            statusLabel.textContent = 'Enabled';
            statusLabel.className = 'status-label enabled';
            showToast('✓ Two-factor authentication enabled', 'success');
            window.location.href = '/security-center/2fa';
        } else {
            option.dataset.status = 'disabled';
            statusLabel.textContent = 'Disabled';
            statusLabel.className = 'status-label disabled';
            showToast('⚠️ Two-factor authentication disabled', 'warning');
        }
    });
    
    // Biometric login toggle
    biometricToggle.addEventListener('change', () => {
        showHapticFeedback(biometricToggle);
        const option = biometricToggle.closest('.security-option');
        const statusLabel = option.querySelector('.status-label');
        
        if (biometricToggle.checked) {
            option.dataset.status = 'enabled';
            statusLabel.textContent = 'Enabled';
            statusLabel.className = 'status-label enabled';
            showToast('✓ Biometric login enabled', 'success');
        } else {
            option.dataset.status = 'disabled';
            statusLabel.textContent = 'Disabled';
            statusLabel.className = 'status-label disabled';
            showToast('⚠️ Biometric login disabled', 'warning');
        }
    });
    
    // Password change option
    passwordOption.addEventListener('click', () => {
        showHapticFeedback(passwordOption);
        showPasswordModal();
    });
    
    // Email verification option
    emailOption.addEventListener('click', () => {
        showHapticFeedback(emailOption);
        showToast('📧 Sending verification email to your address...');
        
        // Simulate email sent
        setTimeout(() => {
            showToast('✓ Verification email sent! Check your inbox.', 'success');
            emailOption.dataset.status = 'enabled';
            emailOption.querySelector('.option-icon').style.background = 'rgba(46, 204, 113, 0.15)';
            emailOption.querySelector('.option-icon svg').style.fill = 'var(--success)';
            emailOption.querySelector('.status-label').textContent = 'Verified';
            emailOption.querySelector('.status-label').className = 'status-label enabled';
        }, 1500);
    });
    
    // PIN management option
    pinOption.addEventListener('click', () => {
        showHapticFeedback(pinOption);
        showToast('🔢 Opening PIN management screen...');
    });
    
    // Logout buttons for individual sessions
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showHapticFeedback(btn);
            
            const sessionCard = btn.closest('.session-card');
            const deviceName = sessionCard.querySelector('.session-device').textContent;
            
            // Update modal content
            document.getElementById('modalTitle').textContent = 'Log Out From Device?';
            document.getElementById('modalMessage').textContent = `Are you sure you want to log out from ${deviceName}? You can always log back in with your credentials.`;
            confirmLogoutBtn.dataset.action = 'single';
            confirmLogoutBtn.dataset.device = deviceName;
            
            showLogoutModal();
        });
    });
    
    // Logout from all devices button
    logoutAllBtn.addEventListener('click', () => {
        showHapticFeedback(logoutAllBtn);
        
        // Update modal content for logout all
        document.getElementById('modalTitle').textContent = 'Log Out From All Devices?';
        document.getElementById('modalMessage').textContent = 'Are you sure you want to log out from all devices except your current session? This will require re-authentication on all other devices.';
        confirmLogoutBtn.dataset.action = 'all';
        
        showLogoutModal();
    });
    
    // Modal close buttons
    closeLogoutModal.addEventListener('click', hideLogoutModal);
    closePasswordModal.addEventListener('click', hidePasswordModal);
    
    // Modal overlay click to close
    logoutModal.addEventListener('click', (e) => {
        if (e.target === logoutModal) hideLogoutModal();
    });
    
    passwordModal.addEventListener('click', (e) => {
        if (e.target === passwordModal) hidePasswordModal();
    });
    
    // Modal cancel buttons
    cancelLogoutBtn.addEventListener('click', hideLogoutModal);
    cancelPasswordBtn.addEventListener('click', hidePasswordModal);
    
    // Confirm logout button
    confirmLogoutBtn.addEventListener('click', handleLogoutConfirm);
    
    // Password form submission
    passwordForm.addEventListener('submit', handlePasswordChange);
    
    // Password strength checker
    newPasswordInput.addEventListener('input', checkPasswordStrength);
    
    // Functions
    function showLogoutModal() {
        logoutModal.classList.add('show');
    }
    
    function hideLogoutModal() {
        logoutModal.classList.remove('show');
    }
    
    function showPasswordModal() {
        passwordModal.classList.add('show');
        // Reset form
        passwordForm.reset();
        strengthBar.className = 'strength-bar';
        strengthText.textContent = 'Password strength';
    }
    
    function hidePasswordModal() {
        passwordModal.classList.remove('show');
    }
    
    async function handleLogoutConfirm() {
        showHapticFeedback(confirmLogoutBtn);
        
        // Show loading state
        const originalText = confirmLogoutBtn.textContent;
        confirmLogoutBtn.disabled = true;
        confirmLogoutBtn.textContent = 'Logging Out...';
        
        // Simulate API call
        setTimeout(async  () => {
            confirmLogoutBtn.disabled = false;
            confirmLogoutBtn.textContent = originalText;
            
            const action = confirmLogoutBtn.dataset.action;
            
            if (action === 'all') {
                const response = await fetch(
                    "/logout-all-other-devices",
                    {
                        method: "POST",
                        credentials: "include"
                    }
                );

                const data = await response.json();

                if (data.status === "success") {
                    showToast('✓ Successfully logged out from all other devices', 'success');
                    loadSessions();
                }
               
            } else {
                const device = confirmLogoutBtn.dataset.device;
  

                const response = await fetch(
                    `/logout-session/${sessionId}`,
                    {
                        method: "DELETE",
                        credentials: "include"
                    }
                );

                const data = await response.json();

                if (data.status === "success") {
                    showToast(`✓ Successfully logged out from ${device}`, 'success');
                    loadSessions();
                }
        
            }
            
            hideLogoutModal();
        }, 1500);
    }
    
    async function handlePasswordChange(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validate passwords
        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match', 'error');
            return;
        }
        
        if (newPassword.length < 8) {
            showToast('Password must be at least 8 characters', 'error');
            return;
        }
        
        // Show loading state
        const submitBtn = passwordForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';

        try {
            const response = await fetch('/update-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'credentials': 'include'
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update password');
            }

            const data = await response.json();
            if (data.status == "success") {
                showToast('✓ Password updated successfully!', 'success');
                hidePasswordModal();
                // Update the password option text
                          // Update the password option text
            passwordOption.querySelector('.option-text p').innerHTML = 'Last changed: Just now • <span class="success-text">Strong password</span>';
            passwordOption.dataset.status = 'enabled';
            passwordOption.querySelector('.option-icon').style.background = 'rgba(46, 204, 113, 0.15)';
            passwordOption.querySelector('.option-icon svg').style.fill = 'var(--success)';
            passwordOption.querySelector('.status-label').textContent = 'Updated';
            } else {
                throw new Error(data.message || 'Failed to update password');
            }

        } catch (error) {
            showToast('Error updating password', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }

    }
    
    function setupPasswordStrength() {
        newPasswordInput.addEventListener('input', checkPasswordStrength);
    }
    
    function checkPasswordStrength() {
        const password = newPasswordInput.value;
        let strength = 0;
        
        // Check length
        if (password.length >= 8) strength += 25;
        if (password.length >= 12) strength += 25;
        
        // Check complexity
        if (/[A-Z]/.test(password)) strength += 15;
        if (/[a-z]/.test(password)) strength += 15;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[^A-Za-z0-9]/.test(password)) strength += 15;
        
        // Update UI
        if (strength < 40) {
            strengthBar.className = 'strength-bar weak';
            strengthText.textContent = 'Weak password';
            strengthText.style.color = 'var(--danger)';
        } else if (strength < 70) {
            strengthBar.className = 'strength-bar medium';
            strengthText.textContent = 'Medium strength';
            strengthText.style.color = 'var(--warning)';
        } else {
            strengthBar.className = 'strength-bar strong';
            strengthText.textContent = 'Strong password';
            strengthText.style.color = 'var(--success)';
        }
    }
    
    function createParticles() {
        const particleCount = window.innerWidth > 768 ? 30 : 15;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            
            // Random size between 3px and 10px
            const size = Math.random() * 7 + 3;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            // Random position
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            
            // Random animation duration and delay
            const duration = Math.random() * 10 + 15;
            const delay = Math.random() * 5;
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `${delay}s`;
            
            // Random opacity
            particle.style.opacity = `${Math.random() * 0.5 + 0.1}`;
            
            particlesContainer.appendChild(particle);
        }
    }
    
    function showToast(message, type = 'info') {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create new toast
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'success' || type === 'warning' || type === 'error' ? type : ''}`;
        toast.innerHTML = `
            ${type === 'success' ? `
            <svg viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ` : type === 'warning' ? `
            <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                <line x1="12" y1="8" x2="12" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <line x1="12" y1="16" x2="12.01" y2="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ` : type === 'error' ? `
            <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                <line x1="15" y1="9" x2="9" y2="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="9" y1="9" x2="15" y2="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ` : `
            <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <line x1="12" y1="17" x2="12.01" y2="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            `}
            ${message}
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);
        
        // Animate out and remove
        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(100px)';
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 2800);
    }
    
    function showHapticFeedback(element) {
        if (!element) return;
        
        element.classList.add('haptic-feedback');
        setTimeout(() => {
            element.classList.remove('haptic-feedback');
        }, 200);
    }
    
    // Add CSS animations
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes haptic {
            0% { transform: translateX(0); }
            25% { transform: translateX(-2px); }
            50% { transform: translateX(2px); }
            75% { transform: translateX(-2px); }
            100% { transform: translateX(0); }
        }
        .haptic-feedback {
            animation: haptic 0.15s ease-in-out;
        }
        .success-text {
            color: var(--success);
            font-weight: 500;
        }
    `;
    document.head.appendChild(style);
    
    // Add entrance animations
    setTimeout(() => {
        document.querySelectorAll('.security-option').forEach((option, index) => {
            option.style.opacity = '0';
            option.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                option.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                option.style.opacity = '1';
                option.style.transform = 'translateX(0)';
            }, 300 + index * 100);
        });
        
        document.querySelectorAll('.session-card').forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateX(0)';
            }, 700 + index * 100);
        });
        
        document.querySelector('.security-tips').style.opacity = '0';
        document.querySelector('.security-tips').style.transform = 'translateY(20px)';
        setTimeout(() => {
            document.querySelector('.security-tips').style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            document.querySelector('.security-tips').style.opacity = '1';
            document.querySelector('.security-tips').style.transform = 'translateY(0)';
        }, 1000);
    }, 300);
    function applyTheme(theme) {
    const body = document.body;

    if (theme === "dark") {
        body.classList.add("dark");
        body.classList.remove("light");
    } else {
        body.classList.remove("dark");
        body.classList.add("light");
    }

    // optional: persist it
    localStorage.setItem("theme", theme);
}
    async function loadSessions() {
    try {
        const response = await fetch("/api/sessions", {
            credentials: "include"
        });

        const data = await response.json();

        if (data.status !== "success") {
            throw new Error(data.message);
        }

        renderSessions(data.sessions);
        applyTheme(data.theme);

    } catch (err) {
        console.error(err);
    }
}

function renderSessions(sessions) {
    const container = document.getElementById("sessionsContainer");

    container.innerHTML = "";

    sessions.forEach(session => {

        const card = document.createElement("div");
        card.className = session.current
            ? "session-card current"
            : "session-card";

        const badge = session.current
            ? '<div class="session-badge current">Current</div>'
            : '<div class="session-badge active">Active</div>';

        const logoutBtn = session.current
            ? ''
            : `
                <button
                    class="logout-btn"
                    onclick="logoutSession(${session.id})">
                    Log Out
                </button>
            `;

        card.innerHTML = `
            <div class="session-info">
                <div class="session-device">
                    ${session.os || 'Unknown OS'} • ${session.browser || 'Unknown Browser'}
                </div>

                <div class="session-location">
                    ${session.location || 'Unknown Location'}
                </div>

                <div class="session-time">
                    Last active:
                    ${formatDate(session.last_active)}
                </div>
            </div>

            ${badge}

            ${logoutBtn}
        `;

        container.appendChild(card);
    });
}

function formatLastSeen(dateString) {
    const now = new Date();
    const date = new Date(dateString);

    const diff =
        Math.floor(
            (now - date) / 1000
        );

    if (diff < 60)
        return "Just now";

    if (diff < 3600)
        return `${Math.floor(diff / 60)} min ago`;

    if (diff < 86400)
        return `${Math.floor(diff / 3600)} hrs ago`;

    if (diff < 604800)
        return `${Math.floor(diff / 86400)} days ago`;

    return date.toLocaleDateString();
}



async function loadSecurityStatus() {

    const response = await fetch("/security-status", {
        credentials: "include"
    });

    const data = await response.json();

    if (data.status !== "success") return;

    renderSecurityStatus(data);
}

function renderSecurityStatus(data) {

    document.getElementById("securityScore").textContent =
        `Security Score: ${data.security_score}/100`;

    const indicators =
    document.querySelectorAll(".level-indicator");

const activeBars =
    Math.ceil(data.security_score / 20);

indicators.forEach((bar, index) => {

    if (index < activeBars) {
        bar.classList.add("active");
    } else {
        bar.classList.remove("active");
    }

});

    const statusText =
        document.getElementById("securityStatusText");

    const title =
        document.getElementById("securityTitle");

    if (data.security_score >= 80) {

        statusText.textContent = "Excellent Security";

        title.textContent =
            "Your account is well protected";

    } else if (data.security_score >= 60) {

        statusText.textContent = "Good Security";

        title.textContent =
            "Your account is reasonably protected";

    } else {

        statusText.textContent = "Security Needs Attention";

        title.textContent =
            "We recommend improving your account security";
    }

    updateSecuritySettings(data.settings);
}

function updateSecuritySettings(settings) {

    document.getElementById("twoFactorToggle").checked =
        settings.two_factor_enabled;

    document.getElementById("biometricToggle").checked =
        settings.biometric_enabled;


    const verifyBtn = document.getElementById("verifybtn");

    if (settings.email_verified) {
        verifyBtn.textContent = "Verified";
        verifyBtn.disabled = true;
        verifyBtn.classList.add("disabled");
    } else {
        verifyBtn.textContent = "Verify";
        verifyBtn.disabled = false;
        verifyBtn.classList.remove("disabled");
    }
    
document.getElementById(
    "emailVerificationText"
).textContent =
    settings.email_verified
        ? "Email verified"
        : "Verify your email for account recovery";


        const changed =
    new Date(settings.last_password_change);

const days =
    Math.floor(
        (Date.now() - changed.getTime()) /
        (1000 * 60 * 60 * 24)
    );

document.querySelector(
    "#passwordOption .option-text p"
).innerHTML =
    `Last changed: ${days} days ago`;


}

function formatDate(dateString) {
    const date = new Date(dateString);

    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (days < 1) return "Just now";
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
    if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;

}

});
