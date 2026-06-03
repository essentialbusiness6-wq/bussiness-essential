document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const backButton = document.getElementById('backButton');
    const helpBtn = document.getElementById('helpBtn');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const referralCode = document.getElementById('referralCode');
    const shareEmail = document.getElementById('shareEmail');
    const shareWhatsApp = document.getElementById('shareWhatsApp');
    const shareSMS = document.getElementById('shareSMS');
    const shareTwitter = document.getElementById('shareTwitter');
    const shareLinkedIn = document.getElementById('shareLinkedIn');
    const shareMore = document.getElementById('shareMore');
    const inviteMoreBtn = document.getElementById('inviteMoreBtn');
    const particlesContainer = document.getElementById('particles');
    
    // Initialize
    createParticles();
    const theme = document.body.dataset.theme;
    if (theme){
        applyTheme(theme);
    }
    
    // Event Listeners
    backButton.addEventListener('click', () => {
        showHapticFeedback(backButton);
        setTimeout(() => {
            backButton.classList.remove('haptic-feedback');
            showToast('← Navigation would take you back to settings');
            window.history.back();
        }, 200);
    });
    
    helpBtn.addEventListener('click', () => {
        showHapticFeedback(helpBtn);
        setTimeout(() => {
            helpBtn.classList.remove('haptic-feedback');
            window.location.href = '/support';
        }, 200);
    });
    
    // Copy referral code
    copyCodeBtn.addEventListener('click', () => {
        showHapticFeedback(copyCodeBtn);
        
        // Copy to clipboard
        navigator.clipboard.writeText(referralCode.textContent).then(() => {
            // Show success state
            const originalContent = copyCodeBtn.innerHTML;
            copyCodeBtn.innerHTML = `
                <svg viewBox="0 0 24 24" style="animation: spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                    <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Copied!
            `;
            copyCodeBtn.disabled = true;
            
            // Show toast
            showToast('✓ Referral code copied to clipboard!', 'success');
            
            // Reset button after delay
            setTimeout(() => {
                copyCodeBtn.innerHTML = originalContent;
                copyCodeBtn.disabled = false;
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy:', err);
            showToast('⚠️ Failed to copy code. Please try again.', 'warning');
        });
    });
    
    // Share options
    const shareOptions = [
        { element: shareEmail, platform: 'email', message: '📧 Opening email composer with your referral link...' },
        { element: shareWhatsApp, platform: 'whatsapp', message: '💬 Opening WhatsApp with your referral link...' },
        { element: shareSMS, platform: 'sms', message: '📱 Opening SMS app with your referral link...' },
        { element: shareTwitter, platform: 'twitter', message: '🐦 Opening Twitter to share your referral link...' },
        { element: shareLinkedIn, platform: 'linkedin', message: '💼 Opening LinkedIn to share your referral link...' },
        { element: shareMore, platform: 'more', message: '✨ Showing more sharing options...' }
    ];
    
    shareOptions.forEach(option => {
        option.element.addEventListener('click', () => {
            showHapticFeedback(option.element);
            
            // Show platform-specific message
            showToast(option.message);
            
            // In a real app, this would trigger the actual sharing functionality
            // For demo purposes, we'll just show the toast
        });
    });
    
    // Invite more friends button
    inviteMoreBtn.addEventListener('click', () => {
        showHapticFeedback(inviteMoreBtn);
        
        // Show loading state
        const originalContent = inviteMoreBtn.innerHTML;
        inviteMoreBtn.disabled = true;
        inviteMoreBtn.innerHTML = `
            <svg viewBox="0 0 24 24" style="animation: spin 1s linear infinite; width: 20px; height: 20px;">
                <path d="M12 2v6m0 10v6M4.93 4.93l4.24 4.24m8.49-8.49l4.24 4.24M1.5 12h6m10 0h6M4.93 19.07l4.24-4.24m8.49 8.49l4.24-4.24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Sending Invites...
        `;
        
        // Simulate API call
        setTimeout(() => {
            inviteMoreBtn.disabled = false;
            inviteMoreBtn.innerHTML = originalContent;
            
            // Show success message
            showToast('✓ Invitations sent successfully! Check your referral stats for updates.', 'success');
            
            // In a real app, this would trigger the actual invite functionality
        }, 2000);
    });
    
    // Functions
    function createParticles() {
        const particleCount = window.innerWidth > 768 ? 35 : 20;
        
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
    
    function showToast(message, type = 'info') {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create new toast
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'success' || type === 'warning' ? type : ''}`;
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
    `;
    document.head.appendChild(style);
    
    // Add entrance animations
    setTimeout(() => {
        document.querySelector('.referral-card').style.opacity = '0';
        document.querySelector('.referral-card').style.transform = 'translateY(20px)';
        setTimeout(() => {
            document.querySelector('.referral-card').style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            document.querySelector('.referral-card').style.opacity = '1';
            document.querySelector('.referral-card').style.transform = 'translateY(0)';
        }, 200);
        
        document.querySelectorAll('.share-option').forEach((option, index) => {
            option.style.opacity = '0';
            option.style.transform = 'translateY(20px)';
            setTimeout(() => {
                option.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                option.style.opacity = '1';
                option.style.transform = 'translateY(0)';
            }, 400 + index * 80);
        });
        
        document.querySelector('.benefits-section').style.opacity = '0';
        document.querySelector('.benefits-section').style.transform = 'translateY(20px)';
        setTimeout(() => {
            document.querySelector('.benefits-section').style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            document.querySelector('.benefits-section').style.opacity = '1';
            document.querySelector('.benefits-section').style.transform = 'translateY(0)';
        }, 800);
        
        document.querySelector('.stats-section').style.opacity = '0';
        document.querySelector('.stats-section').style.transform = 'translateY(20px)';
        setTimeout(() => {
            document.querySelector('.stats-section').style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            document.querySelector('.stats-section').style.opacity = '1';
            document.querySelector('.stats-section').style.transform = 'translateY(0)';
        }, 1000);
        
        document.querySelector('.invite-friends').style.opacity = '0';
        document.querySelector('.invite-friends').style.transform = 'translateY(20px)';
        setTimeout(() => {
            document.querySelector('.invite-friends').style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            document.querySelector('.invite-friends').style.opacity = '1';
            document.querySelector('.invite-friends').style.transform = 'translateY(0)';
        }, 1200);
    }, 300);
});
