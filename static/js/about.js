// about.js - Business Essential About Page

document.addEventListener('DOMContentLoaded', () => {
    const backButton = document.getElementById('backButton');
    const helpBtn = document.getElementById('helpBtn');
    const particlesContainer = document.getElementById('particles');
    
    // Initialize dynamic year
    document.getElementById('year').textContent = new Date().getFullYear();

    // Init
    createParticles();
    setupListeners();
    const theme = document.body.dataset.theme;
    if (theme){
        applyTheme(theme);
    }


    function setupListeners() {
        backButton.addEventListener('click', () => {
            showHapticFeedback(backButton);
            setTimeout(() => {
                backButton.classList.remove('haptic-feedback');
                showToast('← Going back...');
                window.history.back();
            }, 200);
        });

        helpBtn.addEventListener('click', () => {
            showHapticFeedback(helpBtn);
            showToast('🎧 Opening help documentation...');
            window.location.href = '/support';
        });

        // Add hover effect to legal links for better interaction
        document.querySelectorAll('.legal-links a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showToast(`Opening ${link.textContent}...`);
            });
        });
    }

    function createParticles() {
        const count = window.innerWidth > 768 ? 30 : 15;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.cssText = `
                width: ${Math.random() * 6 + 3}px; 
                height: ${Math.random() * 6 + 3}px;
                left: ${Math.random() * 100}%; 
                top: ${Math.random() * 100}%;
                animation-duration: ${Math.random() * 10 + 15}s; 
                animation-delay: ${Math.random() * 5}s;
                opacity: ${Math.random() * 0.5 + 0.1};
            `;
            particlesContainer.appendChild(p);
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
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${type === 'success' ? 'white' : 'var(--primary)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${type === 'success' ? '<polyline points="20 6 9 17 4 12"/>' : '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'}
            </svg>
            ${message}
        `;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.transform = 'translateX(-50%) translateY(0)'; }, 10);
        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(100px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2800);
    }

    function showHapticFeedback(el) {
        if (!el) return;
        el.classList.add('haptic-feedback');
        setTimeout(() => el.classList.remove('haptic-feedback'), 200);
    }

    // Inject animations if not present
    if (!document.getElementById('about-animations')) {
        const style = document.createElement('style');
        style.id = 'about-animations';
        style.innerHTML = `
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            @keyframes haptic { 0% { transform: translateX(0); } 25% { transform: translateX(-2px); } 50% { transform: translateX(2px); } 75% { transform: translateX(-2px); } 100% { transform: translateX(0); } }
            .haptic-feedback { animation: haptic 0.15s ease-in-out; }
        `;
        document.head.appendChild(style);
    }
});
