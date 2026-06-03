document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const backButton = document.getElementById('backButton');
    const helpBtn = document.getElementById('helpBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const saveClientBtn = document.getElementById('saveClientBtn');
    const clientNameInput = document.getElementById('client_name');
    const clientEmailInput = document.getElementById('client_email');
    const clientPhoneInput = document.getElementById('client_phone');
    const clientAvatar = document.getElementById('clientAvatar');
    const editClientForm = document.getElementById('editClientForm');
    const particlesContainer = document.getElementById('particles');
    
    const theme = document.body.dataset.theme;
    if (theme) {
        applyTheme(theme);
    }

    // Initialize
    createParticles();
    updateAvatarPreview();
    setupPhoneFormatting();
    
    // Event Listeners
    backButton.addEventListener('click', () => {
        showHapticFeedback(backButton);
        setTimeout(() => {
            window.location.href = '/dashboard/clients';
        }, 200);
    });
    
    helpBtn.addEventListener('click', () => {
        showHapticFeedback(helpBtn);
        window.location.href = '/support';
    });
    
    cancelBtn.addEventListener('click', () => {
        showHapticFeedback(cancelBtn);
        showToast('Changes discarded');
        setTimeout(() => {
            window.location.href = '/dashboard/clients';
        }, 800);
    });
    
    clientNameInput.addEventListener('input', updateAvatarPreview);
    clientEmailInput.addEventListener('blur', validateEmail);
    clientPhoneInput.addEventListener('input', formatPhoneInput);
    
    editClientForm.addEventListener('submit', handleFormSubmit);
    
    // Functions
    function loadClientData() {
        // In a real app, this would fetch from API
        // For demo, we use sample data
        document.getElementById('clientId').value = sampleClient.id;
        clientNameInput.value = sampleClient.name;
        clientEmailInput.value = sampleClient.email;
        clientPhoneInput.value = sampleClient.phone;
        document.getElementById('client_company').value = sampleClient.company;
        document.getElementById('client_address').value = sampleClient.address;
        document.getElementById('client_notes').value = sampleClient.notes;
        
        // Update avatar with loaded name
        updateAvatarPreview();
    }
    
    function updateAvatarPreview() {
        const name = clientNameInput.value.trim() || 'AB';
        const initials = name.split(' ')
            .map(n => n.trim())
            .filter(n => n)
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
        clientAvatar.textContent = initials || 'AB';
    }
    
    function setupPhoneFormatting() {
        clientPhoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length > 10) {
                value = value.slice(0, 10);
            }
            
            if (value.length > 6) {
                value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
            } else if (value.length > 3) {
                value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
            } else if (value.length > 0) {
                value = `(${value}`;
            }
            
            e.target.value = value;
        });
    }
    
    function formatPhoneInput(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length > 10) {
            value = value.slice(0, 10);
        }
        
        if (value.length > 6) {
            value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
        } else if (value.length > 3) {
            value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
        } else if (value.length > 0) {
            value = `(${value}`;
        }
        
        e.target.value = value;
    }
    
    function validateEmail() {
        const email = clientEmailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const formGroup = clientEmailInput.closest('.form-group');
        
        if (email && !emailRegex.test(email)) {
            formGroup.classList.add('error');
            return false;
        } else {
            formGroup.classList.remove('error');
            return true;
        }
    }
    
    function validateForm() {
        let isValid = true;
        
        // Validate client name
        const nameValue = clientNameInput.value.trim();
        const nameGroup = clientNameInput.closest('.form-group');
        if (!nameValue) {
            nameGroup.classList.add('error');
            isValid = false;
        } else {
            nameGroup.classList.remove('error');
        }
        
        // Validate email
        if (!validateEmail()) {
            isValid = false;
        }
        
        return isValid;
    }
    
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        // Validate form
        if (!validateForm()) {
            showToast('Please fix the errors in the form', 'error');
            // Scroll to first error
            const firstError = document.querySelector('.form-group.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }
        
        showHapticFeedback(saveClientBtn);
        
        // Show loading state
        const originalText = saveClientBtn.innerHTML;
        saveClientBtn.disabled = true;
        saveClientBtn.innerHTML = `
            <svg viewBox="0 0 24 24" style="animation: spin 1s linear infinite;">
                <path d="M12 2v6m0 10v6M4.93 4.93l4.24 4.24m8.49-8.49l4.24 4.24M1.5 12h6m10 0h6M4.93 19.07l4.24-4.24m8.49 8.49l4.24-4.24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Saving...
        `;
        
        // Get form data
        const formData = {
            id: document.getElementById('clientId').value,
            name: clientNameInput.value.trim(),
            email: clientEmailInput.value.trim(),
            phone: clientPhoneInput.value.trim(),
            company: document.getElementById('client_company').value.trim(),
            address: document.getElementById('client_address').value.trim(),
            notes: document.getElementById('client_notes').value.trim()
        };
        
        try {
            const response = await fetch("/client/update-edit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "credentials": "include"
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.status == "success") {
                showToast(`✓ ${formData.name} updated successfully!`, 'success');

                setTimeout(() => {
                showToast(`✨ Client details saved!`);
                window.location.href = '/dashboard/clients';
            }, 1500);
            } else {
                showToast(data.message || `Failed to update client`, 'error')
            }
        } catch (err) {
            console.error(err);
            showToast("error", "Server error");
        } finally {
            saveClientBtn.disabled = false;
            saveClientBtn.innerHTML = originalText
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
