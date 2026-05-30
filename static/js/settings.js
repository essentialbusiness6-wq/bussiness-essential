document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const backButton = document.getElementById('backButton');
    const helpBtn = document.getElementById('helpBtn');
    const resetSettingsBtn = document.getElementById('resetSettings');
    const cancelResetBtn = document.getElementById('cancelReset');
    const confirmResetBtn = document.getElementById('confirmReset');
    const confirmModal = document.getElementById('confirmModal');
    const securityCenterBtn = document.getElementById('securityCenterBtn');
    const contactSupportBtn = document.getElementById('contactSupportBtn');
    const feedbackBtn = document.getElementById('feedbackBtn');
    const closeAccountBtn = document.getElementById('closeAccountBtn');
    const aboutBtn = document.getElementById('aboutBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const particlesContainer = document.getElementById('particles');
    
    // Settings elements
    const settingsInputs = document.querySelectorAll('[data-setting]');
    const toggleSwitches = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
    
    // Auto-save configuration
    const AUTO_SAVE_DELAY = 1500; // 1.5 seconds
    let autoSaveTimeout = null;
    let lastSavedValues = {};
    
    // Initialize
    createParticles();
    initializeSettings();
    setupEventListeners();
    loadSavedSettings();
    
    // Functions
    function initializeSettings() {
        // Store initial values for auto-save comparison
        settingsInputs.forEach(input => {
            const settingName = input.dataset.setting;
            lastSavedValues[settingName] = input.type === 'checkbox' ? input.checked : input.value;
        });
    }
    
    function setupEventListeners() {
        // Navigation buttons
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
                showToast('🎧 Need help? Contact support@businesse.com', 'success');
            }, 200);
        });
        
        // Action buttons
        securityCenterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showHapticFeedback(securityCenterBtn);
            showToast('🔐 Opening Security Center...');
           window.location.href = '/security-center';
        });
        
        contactSupportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showHapticFeedback(contactSupportBtn);
            showToast('💬 Opening support chat...');
           window.location.href = '/support';
        });
        
        feedbackBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showHapticFeedback(feedbackBtn);
            showToast('✨ Opening feedback form...');
            window.location.href = '/feedback';
        });
        
        closeAccountBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showHapticFeedback(closeAccountBtn);
            if (confirm('Are you sure you want to close your account? This action cannot be undone.')) {
                showToast('⚠️ Account closure process initiated');
                window.location.href = '/close-account';
            }
        });
        
        aboutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showHapticFeedback(aboutBtn);
            showToast('ℹ️ Opening about page...');
            window.location.href = '/app/about';
        });
        
        logoutBtn.addEventListener('click',async (e) => {
            e.preventDefault();
            showHapticFeedback(logoutBtn);
            if (confirm('Are you sure you want to logout?')) {
                // Show loading state
                const originalText = logoutBtn.textContent;
                logoutBtn.disabled = true;
                logoutBtn.textContent = 'Logging Out...';

                try {
                       const response = await fetch('/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                if (!response.ok) {
                    showToast('❌ Logout failed. Please try again.', 'error');
                }

                const data = await response.json();
                if (data.status === 'success') {
                    showToast('✅ Logged out successfully', 'success');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 1500);
                } else {
                    showToast('❌ Logout failed. Please try again.', 'error');
                }
                } catch (error) {
                    console.error('Error during logout:', error);
                    showToast('❌ An error occurred. Please try again.', 'error');
                } finally {
                    logoutBtn.disabled = false;
                    logoutBtn.textContent = originalText;
                }
            }
        });
        
        // Reset settings
        resetSettingsBtn.addEventListener('click', () => {
            showHapticFeedback(resetSettingsBtn);
            confirmModal.classList.add('active');
        });
        
        cancelResetBtn.addEventListener('click', () => {
            showHapticFeedback(cancelResetBtn);
            confirmModal.classList.remove('active');
        });
        
        confirmResetBtn.addEventListener('click', () => {
            showHapticFeedback(confirmResetBtn);
            resetSettingsToDefault();
            confirmModal.classList.remove('active');
        });
        
        // Close modal when clicking outside
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) {
                confirmModal.classList.remove('active');
            }
        });
        
        // Settings inputs - auto-save on change
        settingsInputs.forEach(input => {
            input.addEventListener('input', handleSettingChange);
            input.addEventListener('change', handleSettingChange);
        });
        
        // Toggle switches
        toggleSwitches.forEach(toggle => {
            toggle.addEventListener('change', handleSettingChange);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+S or Cmd+S to save manually
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveAllSettings();
                showToast('✓ Settings saved manually', 'success');
            }
        });
    }
    
    function handleSettingChange(event) {
        const input = event.target;
        const settingName = input.dataset.setting;
        
        if (!settingName) return;
        
        // Clear existing timeout
        if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout);
        }
        
        // Show saving indicator
        showSavingIndicator(settingName);
        
        // Set new timeout for auto-save
        autoSaveTimeout = setTimeout(() => {
            saveSetting(settingName, input);
        }, AUTO_SAVE_DELAY);
    }
    
    function showSavingIndicator(settingName) {
        // Find the field container
        const field = document.querySelector(`[data-setting="${settingName}"]`).closest('.field, .toggle');
        if (!field) return;
        
        // Remove any existing indicators
        const existingIndicator = field.querySelector('.saving-indicator');
        if (existingIndicator) existingIndicator.remove();
        
        // Create and add indicator
        const indicator = document.createElement('span');
        indicator.className = 'saving-indicator';
        indicator.innerHTML = `
            <svg viewBox="0 0 24 24" style="animation: spin 1s linear infinite; width: 16px; height: 16px;">
                <path d="M12 2v6m0 10v6M4.93 4.93l4.24 4.24m8.49-8.49l4.24 4.24M1.5 12h6m10 0h6M4.93 19.07l4.24-4.24m8.49 8.49l4.24-4.24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <small>Saving...</small>
        `;
        indicator.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--primary);
            font-size: 0.8rem;
            margin-left: 8px;
            opacity: 0.8;
        `;
        
        // Add to field
        if (field.classList.contains('toggle')) {
            field.querySelector('span').appendChild(indicator);
        } else {
            field.appendChild(indicator);
        }
    }
    
    function hideSavingIndicator(settingName) {
        const field = document.querySelector(`[data-setting="${settingName}"]`).closest('.field, .toggle');
        if (!field) return;
        
        const indicator = field.querySelector('.saving-indicator');
        if (indicator) {
            indicator.style.opacity = '0';
            indicator.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.remove();
                }
            }, 300);
        }
    }
    
    function saveSetting(settingName, input) {
        const value = input.type === 'checkbox' ? input.checked : input.value;
        
        // Validate input
        if (!validateSetting(settingName, value)) {
            showToast(`⚠️ Invalid value for ${settingName.replace('_', ' ')}`, 'warning');
            // Revert to last saved value
            if (input.type === 'checkbox') {
                input.checked = lastSavedValues[settingName];
            } else {
                input.value = lastSavedValues[settingName];
            }
            hideSavingIndicator(settingName);
            return;
        }
        
        const payload = {"key": settingName, "value": value};

        console.log("Auto-saving:", payload);

        fetch("/update/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                // Update last saved value
                lastSavedValues[settingName] = value;
                // Hide saving indicator
                hideSavingIndicator(settingName);
                // Show success toast for important settings
                if (['invoice_prefix', 'currency', 'timezone'].includes(settingName)) {
                    showToast(`✓ ${formatSettingName(settingName)} updated`, 'success');
                } 
            } else {
                throw new Error(data.message || 'Failed to save setting');
            }
        })
        .catch(error => {
            console.error('Error saving setting:', error);
            showToast(`❌ Error saving ${formatSettingName(settingName)}`, 'error');
            // Revert to last saved value
            if (input.type === 'checkbox') {
                input.checked = lastSavedValues[settingName];
            } else {
                input.value = lastSavedValues[settingName];
            }
            hideSavingIndicator(settingName);
        });
     
    }
    
    function saveAllSettings() {
        settingsInputs.forEach(input => {
            const settingName = input.dataset.setting;
            const value = input.type === 'checkbox' ? input.checked : input.value;
            
            if (validateSetting(settingName, value)) {
                lastSavedValues[settingName] = value;
            }
        });
        
        showToast('✓ All settings saved', 'success');
    }
    
    function validateSetting(settingName, value) {
        // Add validation rules for specific settings
        const validationRules = {
            invoice_prefix: (val) => /^[A-Z0-9]{2,10}$/.test(val) && val.length >= 2,
            next_invoice_number: (val) => !isNaN(val) && parseInt(val) > 0,
            default_due_date: (val) => !isNaN(val) && parseInt(val) >= 1 && parseInt(val) <= 365,
            default_tax_rate: (val) => !isNaN(val) && parseFloat(val) >= 0 && parseFloat(val) <= 100,
            currency_symbol: (val) => val.length <= 3,
            reminder_days_before: (val) => !isNaN(val) && parseInt(val) >= 1 && parseInt(val) <= 30,
            auto_logout_minutes: (val) => !isNaN(val) && parseInt(val) >= 5 && parseInt(val) <= 1440
        };
        
        if (validationRules[settingName]) {
            return validationRules[settingName](value);
        }
        
        // Default validation - just check if value exists
        return value !== null && value !== undefined && value !== '';
    }
    
    function formatSettingName(settingName) {
        return settingName
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    function resetSettingsToDefault() {
        // Default values for all settings
        const defaultValues = {
            invoice_prefix: 'INV',
            next_invoice_number: '1001',
            default_due_date: '30',
            default_tax_rate: '7.5',
            show_tax: true,
            show_discount: false,
            footer_note: 'Thank you for your business!',
            currency: 'NGN',
            currency_symbol: '₦',
            timezone: 'Africa/Lagos',
            date_format: 'DD/MM/YYYY',
            email_notifications: true,
            due_date_reminder: true,
            reminder_days_before: '3',
            auto_logout_on_inactivity: true,
            auto_logout_minutes: '30',
            require_pin_for_delete: true
        };
        
        // Apply default values to inputs
        Object.entries(defaultValues).forEach(([settingName, defaultValue]) => {
            const input = document.querySelector(`[data-setting="${settingName}"]`);
            if (!input) return;
            
            if (input.type === 'checkbox') {
                input.checked = defaultValue;
            } else {
                input.value = defaultValue;
            }
            
            // Update last saved values
            lastSavedValues[settingName] = defaultValue;
        });
        
        showToast('✓ Settings reset to default values', 'success');
    }
    
    function loadSavedSettings() {
        // In a real app, this would fetch saved settings from backend
        // For demo, we'll use the values already in the HTML
        
        // Simulate loading from storage
        setTimeout(() => {
            // Update last saved values with current values
            settingsInputs.forEach(input => {
                const settingName = input.dataset.setting;
                lastSavedValues[settingName] = input.type === 'checkbox' ? input.checked : input.value;
            });
        }, 500);
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
        .saving-indicator {
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--primary);
            font-size: 0.8rem;
            margin-left: 8px;
            opacity: 0.8;
            transition: opacity 0.3s ease;
        }
    `;
    document.head.appendChild(style);
    
    // Add entrance animations
    setTimeout(() => {
        document.querySelectorAll('.settings-card').forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 300 + index * 150);
        });
        
        document.querySelector('.help').style.opacity = '0';
        document.querySelector('.help').style.transform = 'translateY(20px)';
        setTimeout(() => {
            document.querySelector('.help').style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            document.querySelector('.help').style.opacity = '1';
            document.querySelector('.help').style.transform = 'translateY(0)';
        }, 1000);
        
        document.querySelector('.settings-actions').style.opacity = '0';
        document.querySelector('.settings-actions').style.transform = 'translateY(20px)';
        setTimeout(() => {
            document.querySelector('.settings-actions').style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            document.querySelector('.settings-actions').style.opacity = '1';
            document.querySelector('.settings-actions').style.transform = 'translateY(0)';
        }, 1200);
        
        document.querySelector('.logout').style.opacity = '0';
        document.querySelector('.logout').style.transform = 'translateY(20px)';
        setTimeout(() => {
            document.querySelector('.logout').style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            document.querySelector('.logout').style.opacity = '1';
            document.querySelector('.logout').style.transform = 'translateY(0)';
        }, 1400);
    }, 300);
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout);
        }
    });
});