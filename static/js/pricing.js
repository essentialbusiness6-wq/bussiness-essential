// pricing.js - Business Essential Pricing Page

document.addEventListener('DOMContentLoaded', () => {
    // ================= PARTICLES =================
    createParticles();
    
    // ================= MOBILE MENU =================
    setupMobileMenu();
    
    // ================= BILLING TOGGLE =================
    setupBillingToggle();
    
    // ================= FAQ ACCORDION =================
    setupFAQ();
    
    // ================= YEAR =================
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // ================= SMOOTH SCROLL =================
    setupSmoothScroll();
});

// ================= PARTICLES =================
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    const count = window.innerWidth > 768 ? 20 : 10;
    
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 6 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDuration = `${Math.random() * 10 + 15}s`;
        particle.style.animationDelay = `${Math.random() * 5}s`;
        particle.style.opacity = `${Math.random() * 0.5 + 0.1}`;
        
        particlesContainer.appendChild(particle);
    }
}

// ================= MOBILE MENU =================
function setupMobileMenu() {
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
        
        // Close menu on link click
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }
}

// ================= BILLING TOGGLE =================
function setupBillingToggle() {
    const billingToggle = document.getElementById('billingToggle');
    const toggleLabels = document.querySelectorAll('.toggle-label');
    const monthlyPrices = document.querySelectorAll('.monthly-price');
    const yearlyPrices = document.querySelectorAll('.yearly-price');
    const monthlyPeriods = document.querySelectorAll('.monthly-period');
    const yearlyPeriods = document.querySelectorAll('.yearly-period');
    
    if (!billingToggle) return;
    
    billingToggle.addEventListener('change', function() {
        const isYearly = this.checked;
        
        // Update toggle labels
        toggleLabels.forEach(label => {
            label.classList.remove('active');
            if ((isYearly && label.dataset.period === 'yearly') ||
                (!isYearly && label.dataset.period === 'monthly')) {
                label.classList.add('active');
            }
        });
        
        // Update prices
        monthlyPrices.forEach(el => el.style.display = isYearly ? 'none' : 'inline');
        yearlyPrices.forEach(el => el.style.display = isYearly ? 'inline' : 'none');
        monthlyPeriods.forEach(el => el.style.display = isYearly ? 'none' : 'inline');
        yearlyPeriods.forEach(el => el.style.display = isYearly ? 'inline' : 'none');
    });
    
    // Allow clicking on labels
    toggleLabels.forEach(label => {
        label.addEventListener('click', () => {
            const period = label.dataset.period;
            if (period === 'yearly' && !billingToggle.checked) {
                billingToggle.checked = true;
                billingToggle.dispatchEvent(new Event('change'));
            } else if (period === 'monthly' && billingToggle.checked) {
                billingToggle.checked = false;
                billingToggle.dispatchEvent(new Event('change'));
            }
        });
    });
}

// ================= FAQ ACCORDION =================
function setupFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Toggle current item
            item.classList.toggle('active', !isActive);
        });
    });
}

// ================= SMOOTH SCROLL =================
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}
