document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const settingsBtn = document.getElementById('settings');
    const toggleBalance = document.getElementById('toggleBalance');
    const eyeIcon = document.getElementById('eyeIcon');
    const balanceDisplay = document.getElementById('balanceDisplay');
    const userName = document.getElementById('userName');
    const profilePic = document.getElementById('dashboard-profile-pic');
    const particlesContainer = document.getElementById('particles');
    
    // Action buttons
    const transactionsBtn = document.getElementById('transactionsBtn');
    const securityBtn = document.getElementById('securityBtn');
    const rateBtn = document.getElementById('rateBtn');
    const shareBtn = document.getElementById('shareBtn');
    const billingBtn = document.getElementById('billingBtn');
    
    // Sample user data (in real app, this would come from API)
    let sampleUser = []
    let currencySymbol = "$";
    
    // Initialize
    createParticles();
    loadUserData();
    
    // Event Listeners
    settingsBtn.addEventListener('click', () => {
        showHapticFeedback(settingsBtn);
        showToast('Settings menu would open here');
        window.location.href = '/settings';
    });
    
    toggleBalance.addEventListener('click', toggleBalanceVisibility);
    
    // Action button handlers
    transactionsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showHapticFeedback(transactionsBtn);
        showToast('Opening transaction history...');
        window.location.href = '/transactions';
    });
    
    securityBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showHapticFeedback(securityBtn);
        showToast('Opening security center...');
        window.location.href = '/security-center';
    });
    
    rateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showHapticFeedback(rateBtn);
        showToast('Thank you for rating us! ⭐');
        window.location.href = '/rate-us';
    });
    
    shareBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showHapticFeedback(shareBtn);
        window.location.href = '/share';

    });
    
    billingBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showHapticFeedback(billingBtn);
        showToast('Opening billing settings...');
        window.location.href = '/billing';
    });
    
    // Functions
    function loadUserData() {
        // In a real app, this would fetch from API
        fetch("/dashboard/me/data", {
            methods: "GET",
            header: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        })
        .then(response => response.json())
        .then(data => {
            sampleUser = data.user;
            currencySymbol = data.currency_symbol || "$";
            userName.textContent = sampleUser.name;
            balanceDisplay.textContent = formatCurrency(sampleUser.balance);
            balanceDisplay.dataset.balance = formatCurrency(sampleUser.balance);
            if (sampleUser.profilePic) {
             profilePic.src = sampleUser.profilePic;
            }
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
        });
        
      
    }
    
    function toggleBalanceVisibility() {
        showHapticFeedback(toggleBalance);
        
        const isHidden = balanceDisplay.textContent === '••••••';
        
        if (isHidden) {
            // Show balance
            balanceDisplay.textContent = balanceDisplay.dataset.balance;
            eyeIcon.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            `;
        } else {
            // Hide balance
            balanceDisplay.textContent = '••••••';
            eyeIcon.innerHTML = `
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="1" y1="1" x2="23" y2="23" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            `;
        }
    }
    
    function formatCurrency(amount) {
        return `${currencySymbol}${amount}`
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
        toast.className = `toast ${type === 'success' || type === 'error' ? type : ''}`;
        toast.innerHTML = `
            ${type === 'success' ? `
            <svg viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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
    `;
    document.head.appendChild(style);
});
