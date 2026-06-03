// profile.js - Business Essential Profile Page

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const backButton = document.getElementById('backButton');
    const helpBtn = document.getElementById('helpBtn');
    const profileForm = document.getElementById('profileForm');
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const deleteAccountBtn = document.getElementById('deleteAccount');
    const confirmModal = document.getElementById('confirmModal');
    const closeModal = document.getElementById('closeModal');
    const cancelDelete = document.getElementById('cancelDelete');
    const confirmDelete = document.getElementById('confirmDelete');
    const changePicBtn = document.getElementById('changePicBtn');
    const removePicBtn = document.getElementById('removePicBtn');
    const newProfilePic = document.getElementById('newProfilePic');
    const profilePicture = document.getElementById('profilePicture');
    const particlesContainer = document.getElementById('particles');
    
    // Initialize
    createParticles();
    setupEventListeners();
    const theme = document.body.dataset.theme;
    if (theme) {
        applyTheme(theme);
    }
    
    // Functions

    function setupEventListeners() {
        // Navigation
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
            window.location.href = '/support';
        });
        
        // Form submission
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmit();
        });
        
        // Cancel button
        cancelBtn.addEventListener('click', () => {
            showHapticFeedback(cancelBtn);
            showToast('Changes discarded');

        });
        
        // Profile picture actions
        changePicBtn.addEventListener('click', () => {
            showHapticFeedback(changePicBtn);
            newProfilePic.click();
        });
        
        newProfilePic.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    showToast('⚠️ Image too large (max 5MB)', 'warning');
                    return;
                }

                const formData = new FormData();
                formData.append('profile_picture', file);
                try {

                    const response = await fetch('/profile/update/pic', {
                        method: 'POST',
                        body: formData,
                        credentials: 'include'
                    });
                    if (!response.ok) {
                        throw new Error('Failed to upload image');
                    }
                    const data = await response.json();
                    if (data.success) {
                        showToast('✓ Profile picture updated on server', 'success');
                    } else {
                        throw new Error(data.message || 'Server error');
                    }
                } catch (error) {
                    showToast(`⚠️ ${error.message}`, 'error');
                    return;
                }

                
                const reader = new FileReader();
                reader.onload = (event) => {
                    profilePicture.src = event.target.result;
                    showToast('✓ Profile picture updated', 'success');
                };
                reader.readAsDataURL(file);
            }
        });
        
        removePicBtn.addEventListener('click', () => {
            showHapticFeedback(removePicBtn);
            if (confirm('Remove your profile picture?')) {
                profilePicture.src = '/static/images/default-profile.png';
                newProfilePic.value = '';
                showToast('✓ Profile picture removed', 'success');
            }
        });
        
        // Delete account
        deleteAccountBtn.addEventListener('click', () => {
            showHapticFeedback(deleteAccountBtn);
            confirmModal.classList.add('active');
        });
        
        cancelDelete.addEventListener('click', () => {
            confirmModal.classList.remove('active');
        });
        
        closeModal.addEventListener('click', () => {
            confirmModal.classList.remove('active');
        });
        
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) {
                confirmModal.classList.remove('active');
            }
        });
        
        confirmDelete.addEventListener('click', () => {
            showHapticFeedback(confirmDelete);
            // Simulate account deletion
            confirmDelete.disabled = true;
            confirmDelete.textContent = 'Deleting...';
            
            setTimeout(() => {
                showToast('🗑️ Account deletion initiated. Check your email for confirmation.', 'success');
                confirmModal.classList.remove('active');
                confirmDelete.disabled = false;
                confirmDelete.innerHTML = `
                    <svg viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Delete Account
                `;
            }, 2000);
        });
    }
    
    async function handleFormSubmit() {
        // Validate form
        if (!validateForm()) return;
        
        // Show loading state
        const btnText = saveChangesBtn.querySelector('.btn-text');
        const btnLoader = saveChangesBtn.querySelector('.btn-loader');
        saveChangesBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';

        const playload = {
            username: document.getElementById('profileUsername').value.trim(),
            fullname: document.getElementById('fullName').value.trim(),
            profilename: document.getElementById('profileName').value.trim(),
            phone: document.getElementById('Phone').value.trim(),
            address: document.getElementById('Address').value.trim(),
            country: document.getElementById('Country').value.trim(),
            alternateemail: document.getElementById('Alternateemail').value.trim(),
            website: document.getElementById('website').value.trim(),
            bio: document.getElementById('profileBio').value.trim()
        };

        try{ 
            const response = await fetch('/profile/update-edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(playload)
            });
            
            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            if (response.status === 200) {
                showToast('✓ Profile updated successfully!', 'success');
            } else {
                throw new Error('Unexpected response from server');
            }
            
        } catch (error) {
            showToast(`⚠️ ${error.message}`, 'error');
        } finally {
            saveChangesBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
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
    
    function validateForm() {
        const fullName = document.getElementById('fullName').value.trim();
        const username = document.getElementById('profileUsername').value.trim();
        
        if (!fullName) {
            showToast('⚠️ Full name is required', 'warning');
            document.getElementById('fullName').focus();
            return false;
        }
        
        if (!username || username.length < 3) {
            showToast('⚠️ Username must be at least 3 characters', 'warning');
            document.getElementById('profileUsername').focus();
            return false;
        }
        
        return true;
    }
    
    function createParticles() {
        const count = window.innerWidth > 768 ? 30 : 15;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.cssText = `
                width: ${Math.random() * 6 + 3}px; height: ${Math.random() * 6 + 3}px;
                left: ${Math.random() * 100}%; top: ${Math.random() * 100}%;
                animation-duration: ${Math.random() * 10 + 15}s; animation-delay: ${Math.random() * 5}s;
                opacity: ${Math.random() * 0.5 + 0.1};
            `;
            particlesContainer.appendChild(p);
        }
    }
    
    function showToast(message, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${type === 'success' || type === 'warning' || type === 'error' ? 'white' : 'var(--primary)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${type === 'success' ? '<polyline points="20 6 9 17 4 12"/>' : 
                  type === 'warning' ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' : 
                  type === 'error' ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' : 
                  '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'}
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
    
    // Add animations
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .haptic-feedback { animation: haptic 0.15s ease-in-out; }
    `;
    document.head.appendChild(style);
    
    // Entrance animations
    setTimeout(() => {
        document.querySelector('.profile-header').style.opacity = '0';
        document.querySelector('.profile-header').style.transform = 'translateY(10px)';
        setTimeout(() => {
            document.querySelector('.profile-header').style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            document.querySelector('.profile-header').style.opacity = '1';
            document.querySelector('.profile-header').style.transform = 'translateY(0)';
        }, 200);
        
        document.querySelectorAll('.form-section').forEach((section, i) => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            setTimeout(() => {
                section.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }, 400 + i * 150);
        });
    }, 300);
});
