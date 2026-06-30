// landing.js - Business Essential Landing & Static Pages

document.addEventListener('DOMContentLoaded', () => {
    const header = document.getElementById('header');
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-links a');
    const yearSpan = document.getElementById('year');
    const contactForm = document.getElementById('contactForm');
    
    // Set current year
    if(yearSpan) yearSpan.textContent = new Date().getFullYear();
    // ================= PROBLEM/SOLUTION ANIMATION =================
function setupProblemSolutionAnimation() {
    const section = document.querySelector('.problem-solution');
    if (!section) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.3
    });
    
    observer.observe(section);
}

 setupProblemSolutionAnimation();

    function applyTheme(theme = "auto") {

    const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
    ).matches;

    const useDark =
        theme === "dark" ||
        (theme === "auto" && prefersDark);

    document.body.classList.toggle(
        "dark-theme",
        useDark
    );

    document.documentElement.classList.toggle(
        "dark-theme",
        useDark
    );
}

    const mediaQuery = window.matchMedia(
    "(prefers-color-scheme: dark)"
);

mediaQuery.addEventListener("change", () => {

    const savedTheme =
        localStorage.getItem("theme") || "auto";

    if (savedTheme === "auto") {
        applyTheme("auto");
    }
});

    // Mobile Nav Toggle
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            const isOpen = navMenu.classList.contains('active');
            mobileToggle.setAttribute('aria-expanded', isOpen);
            
            // Animate hamburger to X
            const bars = mobileToggle.querySelectorAll('.bar');
            if(isOpen) {
                bars[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
                bars[1].style.opacity = '0';
                bars[2].style.transform = 'rotate(-45deg) translate(6px, -6px)';
            } else {
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            }
        });

        // Close on link click
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                const bars = mobileToggle.querySelectorAll('.bar');
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            });
        });
    }

    // Active nav highlighting on scroll (for single page index)
    if(window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        const sections = document.querySelectorAll('section[id]');
        window.addEventListener('scroll', () => {
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                if (pageYOffset >= sectionTop - 100) {
                    current = section.getAttribute('id');
                }
            });
            navLinks.forEach(link => {
                link.classList.remove('active');
                if(link.getAttribute('href')?.includes(current)) {
                    link.classList.add('active');
                }
            });
        });
    }

    // Header scroll effect
    if(header) {
        window.addEventListener('scroll', () => {
            if(window.scrollY > 10) {
                header.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            } else {
                header.style.boxShadow = 'none';
            }
        });
    }

    // Contact Form Submission
if (contactForm) {

    contactForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();

            const btn =
            document.getElementById(
                "submitBtn"
            );

            const originalText =
            btn.innerHTML;

            try {

                btn.disabled = true;

                btn.innerHTML =
                `
                <span class="spinner"></span>
                Sending...
                `;

                const payload = {

                    fullName:
                    document
                    .getElementById(
                        "name"
                    )
                    ?.value
                    .trim(),

                    email:
                    document
                    .getElementById(
                        "email"
                    )
                    ?.value
                    .trim(),

                    subject:
                    document
                    .getElementById(
                        "subject"
                    )
                    ?.value
                    .trim(),

                    message:
                    document
                    .getElementById(
                        "message"
                    )
                    ?.value
                    .trim()

                };


                if (
                    !payload.fullName ||
                    !payload.email ||
                    !payload.subject ||
                    !payload.message
                ) {

                    throw new Error(
                        "Please complete all fields"
                    );

                }


                const response =
                await fetch(
                    "/contact-business",
                    {

                        method:
                        "POST",

                        headers: {
                            "Content-Type":
                            "application/json"
                        },

                        body:
                        JSON.stringify(
                            payload
                        )

                    }
                );


                const result =
                await response.json();


                if (
                    !response.ok
                ) {

                    throw new Error(
                        result.message ||
                        "Unable to send"
                    );

                }


                contactForm.reset();


                showToast(
                    "✅ Message sent successfully! We'll reply within 24 hours.",
                    "success"
                );

            }

            catch(err){

                console.error(
                    "CONTACT ERROR:",
                    err
                );

                showToast(
                    err.message ||
                    "Something went wrong",
                    "error"
                );

            }

            finally{

                btn.disabled =
                false;

                btn.innerHTML =
                originalText;

            }

        }
    );

}

    // Toast Notification System
    window.showToast = function(message, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    };

        // COOKIE CONSENT LOGIC
    const cookieBanner = document.getElementById('cookieBanner');
    const acceptBtn = document.getElementById('cookieAccept');
    const declineBtn = document.getElementById('cookieDecline');
    const CONSENT_KEY = 'businessEssential_cookieConsent';

    function initCookieConsent() {
        const consent = localStorage.getItem(CONSENT_KEY);
        if (!consent && cookieBanner) {
            // Show banner after a short delay for better UX
            setTimeout(() => {
                cookieBanner.classList.add('visible');
                document.body.style.paddingBottom = '80px'; // Prevent content jump
            }, 1500);
        }
    }

    function setConsent(type) {
        localStorage.setItem(CONSENT_KEY, type);
        cookieBanner.classList.remove('visible');
        document.body.style.paddingBottom = '';
        
        if (type === 'accepted') {
            console.log('✅ Analytics & tracking cookies enabled');
            // TODO: Initialize Google Analytics, Hotjar, etc. here
            // e.g., gtag('consent', 'update', { analytics_storage: 'granted' });
        } else {
            console.log('⛔ Only essential cookies active');
            // TODO: Disable non-essential scripts
        }
    }

    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => setConsent('accepted'));
    }
    if (declineBtn) {
        declineBtn.addEventListener('click', () => setConsent('declined'));
    }

    // Initialize on load
    initCookieConsent();
});
