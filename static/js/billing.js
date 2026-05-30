document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const backButton = document.getElementById('backButton');
    const helpBtn = document.getElementById('helpBtn');
    const billingToggle = document.getElementById('billingToggle');
    const upgradeBtns = document.querySelectorAll('.upgrade-btn');
    const trialDays = document.getElementById('trialDays');
    const countDays = document.getElementById('countDays');
    const countHours = document.getElementById('countHours');
    const countMinutes = document.getElementById('countMinutes');
    const particlesContainer = document.getElementById('particles');
    
    // Pricing data
    const pricingData = {
        basic: {
            monthly: 1000,
            yearly: 9600 // 20% discount
        },
        pro: {
            monthly: 10000,
            yearly: 96000 // 20% discount
        }
    };
    
    // Initialize
    createParticles();
    startCountdown();
    setupBillingToggle();
    
    // Event Listeners
    backButton.addEventListener('click', () => {
        showHapticFeedback(backButton);
        setTimeout(() => {
            backButton.classList.remove('haptic-feedback');
            showToast('← Navigation would take you back to profile');
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
    
    // Billing toggle
    billingToggle.addEventListener('change', () => {
        showHapticFeedback(billingToggle);
        updatePricingDisplay();
    });
    
    // Upgrade buttons
    upgradeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            showHapticFeedback(btn);
            
            const plan = btn.dataset.plan;
            console.log(plan)
            const isYearly = billingToggle.checked;
            const price = isYearly ? pricingData[plan].yearly : pricingData[plan].monthly;
            const period = isYearly ? 'year' : 'month';
            const userId = btn.dataset.userId
            
            // Show confirmation
            if (confirm(`Upgrade to ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan for ₦${price.toLocaleString()}/${period}?`)) {
                // Show loading state
                const originalText = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = `
                    <svg viewBox="0 0 24 24" style="animation: spin 1s linear infinite; width: 20px; height: 20px;">
                        <path d="M12 2v6m0 10v6M4.93 4.93l4.24 4.24m8.49-8.49l4.24 4.24M1.5 12h6m10 0h6M4.93 19.07l4.24-4.24m8.49 8.49l4.24-4.24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Processing...
                `;
                
               
                // Simulate payment processing
                setTimeout(() => {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                    
                    // Show success message
                    showToast(`✓ Successfully upgrading to ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan!`, 'success');
                    
                    // In a real app, this would redirect or update the UI
                    setTimeout(() => {
                        window.location.href = `/api/billing/${plan}/${price}/${userId}`
                    }, 1500);
                }, 2200);
            }
        });
    });
    
    // Functions
    function setupBillingToggle() {
        // Initialize with monthly pricing
        updatePricingDisplay();
    }
    
    function updatePricingDisplay() {
        const isYearly = billingToggle.checked;
        
        // Update price displays
        document.querySelectorAll('.pricing-card').forEach(card => {
            const plan = card.querySelector('h4').textContent.toLowerCase();
            const monthlyPrice = card.querySelector('.monthly-price');
            const yearlyPrice = card.querySelector('.yearly-price');
            const monthlyPeriod = card.querySelector('.monthly-period');
            const yearlyPeriod = card.querySelector('.yearly-period');
            
            if (isYearly) {
                if (monthlyPrice) monthlyPrice.style.display = 'none';
                if (yearlyPrice) yearlyPrice.style.display = 'inline';
                if (monthlyPeriod) monthlyPeriod.style.display = 'none';
                if (yearlyPeriod) yearlyPeriod.style.display = 'inline';
            } else {
                if (monthlyPrice) monthlyPrice.style.display = 'inline';
                if (yearlyPrice) yearlyPrice.style.display = 'none';
                if (monthlyPeriod) monthlyPeriod.style.display = 'inline';
                if (yearlyPeriod) yearlyPeriod.style.display = 'none';
            }
        });
    }
    
    function startCountdown() {
        // Simulate countdown timer (3 days, 12 hours, 45 minutes)
        let totalSeconds = (3 * 24 * 60 * 60) + (12 * 60 * 60) + (45 * 60);
        
        const updateCountdown = () => {
            if (totalSeconds <= 0) {
                trialDays.textContent = '0 days';
                if (countDays) countDays.textContent = '0';
                if (countHours) countHours.textContent = '0';
                if (countMinutes) countMinutes.textContent = '0';
                return;
            }
            
            const days = Math.floor(totalSeconds / (24 * 60 * 60));
            const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
            const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
            
            if (trialDays) trialDays.textContent = `${days} day${days !== 1 ? 's' : ''}`;
            if (countDays) countDays.textContent = days;
            if (countHours) countHours.textContent = hours.toString().padStart(2, '0');
            if (countMinutes) countMinutes.textContent = minutes.toString().padStart(2, '0');
            
            totalSeconds--;
        };
        
        // Update immediately and then every second
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }
    
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
        document.querySelectorAll('.pricing-card').forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 400 + index * 150);
        });
        
        document.querySelector('.trial-banner').style.opacity = '0';
        document.querySelector('.trial-banner').style.transform = 'translateY(10px)';
        setTimeout(() => {
            document.querySelector('.trial-banner').style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            document.querySelector('.trial-banner').style.opacity = '1';
            document.querySelector('.trial-banner').style.transform = 'translateY(0)';
        }, 200);
    }, 300);
});