// 500.js - Business Essentials Prime Server Error Page

document.addEventListener('DOMContentLoaded', function () {
    // Initialize particles
    createParticles();

    // Initialize theme
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        applyTheme('dark');
    }

    // Theme toggle listener
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.contains('dark');
            const newTheme = isDark ? 'light' : 'dark';
            applyTheme(newTheme);
        });
    }

    // Copy error reference button
    const copyRefBtn = document.getElementById('copyRefBtn');
    if (copyRefBtn) {
        copyRefBtn.addEventListener('click', () => {
            const refValue = document.querySelector('.ref-value');
            if (refValue) {
                const textToCopy = refValue.textContent;
                
                // Copy to clipboard
                navigator.clipboard.writeText(textToCopy).then(() => {
                    // Show success feedback
                    copyRefBtn.classList.add('copied');
                    copyRefBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    `;
                    
                    // Reset after 2 seconds
                    setTimeout(() => {
                        copyRefBtn.classList.remove('copied');
                        copyRefBtn.innerHTML = `
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        `;
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy:', err);
                });
            }
        });
    }

    // Retry button with loading state
    const retryBtn = document.getElementById('retryBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', (e) => {
            // Add loading state
            retryBtn.disabled = true;
            retryBtn.innerHTML = `
                <svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 12a9 9 0 0 1 9-9c2.38 0 4.55.97 6.12 2.5l-2.62 2.62A5.5 5.5 0 1 0 18 12h2a7.5 7.5 0 0 1-7.93 7.5l-1.49-1.49A9.01 9.01 0 0 1 2 12z"></path>
                </svg>
                Reloading...
            `;
            
            // Small delay for visual feedback before reload
            setTimeout(() => {
                window.location.reload();
            }, 500);
        });
    }
});

function applyTheme(theme) {
    const body = document.body;
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');

    if (theme === "dark") {
        body.classList.add("dark");
        body.classList.remove("light");
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'block';
    } else {
        body.classList.remove("dark");
        body.classList.add("light");
        if (sunIcon) sunIcon.style.display = 'block';
        if (moonIcon) moonIcon.style.display = 'none';
    }
    localStorage.setItem("theme", theme);
}

function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    const particleCount = window.innerWidth > 768 ? 30 : 15;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');

        const size = Math.random() * 6 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;

        const duration = Math.random() * 10 + 15;
        const delay = Math.random() * 5;

        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${delay}s`;
        particle.style.opacity = `${Math.random() * 0.5 + 0.1}`;

        particlesContainer.appendChild(particle);
    }
}
