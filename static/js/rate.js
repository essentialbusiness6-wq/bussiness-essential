document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const backButton = document.getElementById('backButton');
    const helpBtn = document.getElementById('helpBtn');
    const stars = document.querySelectorAll('.star[data-value]');
    const submitBtn = document.getElementById('submitRating');
    const feedbackText = document.getElementById('feedbackText');
    const charCount = document.getElementById('charCount');
    const ratingLabel = document.getElementById('ratingLabel');
    const thankYouSection = document.getElementById('thankYouSection');
    const doneBtn = document.getElementById('doneBtn');
    const particlesContainer = document.getElementById('particles');
    
    let selectedRating = 0;
    
    // Initialize
    createParticles();
    setupCharacterCounter();
    
    // Event Listeners
    backButton.addEventListener('click', () => {
        showHapticFeedback(backButton);
        setTimeout(() => {
            backButton.classList.remove('haptic-feedback');
            if (thankYouSection.classList.contains('active')) {
                // Reset form if coming from thank you
                resetForm();
            } else {
                showToast('← Navigation would take you back to settings');
                window.location.href = '/dashboard/me';
            }
        }, 200);
    });
    
    helpBtn.addEventListener('click', () => {
        showHapticFeedback(helpBtn);
        setTimeout(() => {
            helpBtn.classList.remove('haptic-feedback');
            window.location.href = '/support';
        }, 200);
    });
    
    // Star rating functionality
    stars.forEach(star => {
        star.addEventListener('click', () => {
            showHapticFeedback(star);
            selectedRating = parseInt(star.dataset.value);
            updateStars(selectedRating);
            updateRatingLabel(selectedRating);
            showToast(`★ You rated ${selectedRating} ${selectedRating === 1 ? 'star' : 'stars'}`);
        });
        
        star.addEventListener('mouseover', () => {
            const hoverValue = parseInt(star.dataset.value);
            previewStars(hoverValue);
        });
        
        star.addEventListener('mouseout', () => {
            if (selectedRating === 0) {
                clearStars();
            } else {
                updateStars(selectedRating);
            }
        });
    });
    
    // Character counter for feedback
    feedbackText.addEventListener('input', () => {
        const count = feedbackText.value.length;
        charCount.textContent = count;
        
        // Visual feedback for character limit
        if (count > 450) {
            charCount.style.color = 'var(--warning)';
        } else if (count > 480) {
            charCount.style.color = 'var(--danger)';
        } else {
            charCount.style.color = 'var(--gray)';
        }
    });
    
    // Submit rating
    submitBtn.addEventListener('click', () => {
        showHapticFeedback(submitBtn);
        
        // Validate rating
        if (selectedRating === 0) {
            showToast('⚠️ Please select a rating before submitting', 'warning');
            // Animate the stars to draw attention
            stars.forEach(star => {
                star.style.animation = 'pulse 0.5s ease-in-out';
                setTimeout(() => {
                    star.style.animation = '';
                }, 500);
            });
            return;
        }
        
        // Show loading state
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg viewBox="0 0 24 24" style="animation: spin 1s linear infinite; width: 22px; height: 22px;">
                <path d="M12 2v6m0 10v6M4.93 4.93l4.24 4.24m8.49-8.49l4.24 4.24M1.5 12h6m10 0h6M4.93 19.07l4.24-4.24m8.49 8.49l4.24-4.24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Submitting...
        `;
        
        // Simulate API call
        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            
            // Hide form sections
            document.querySelector('.current-rating').style.display = 'none';
            document.querySelectorAll('.feedback-section').forEach(el => el.style.display = 'none');
            submitBtn.style.display = 'none';
            document.querySelector('.rewards-section').style.display = 'none';
            
            // Show thank you section
            thankYouSection.classList.add('active');
            
            // Show success toast
            showToast('✓ Thank you for your feedback! 1 month of Pro features added to your account.', 'success');
        }, 1800);
    });
    
    // Done button
    doneBtn.addEventListener('click', () => {
        showHapticFeedback(doneBtn);
        showToast('✓ Redirecting to dashboard...');
        
        setTimeout(() => {
            // In a real app, this would navigate to dashboard
            // For demo, reset the form
            resetForm();
        }, 1500);
    });
    
    // Functions
    function updateStars(rating) {
        stars.forEach(star => {
            const value = parseInt(star.dataset.value);
            if (value <= rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }
    
    function previewStars(rating) {
        stars.forEach(star => {
            const value = parseInt(star.dataset.value);
            if (value <= rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }
    
    function clearStars() {
        stars.forEach(star => star.classList.remove('active'));
    }
    
    function updateRatingLabel(rating) {
        const labels = [
            '',
            'Poor - We\'ll do better',
            'Fair - Thanks for the feedback',
            'Good - We appreciate it',
            'Great - You\'re awesome!',
            'Excellent - Thank you so much!'
        ];
        ratingLabel.textContent = labels[rating] || 'How would you rate us?';
    }
    
    function setupCharacterCounter() {
        feedbackText.addEventListener('input', () => {
            const count = feedbackText.value.length;
            charCount.textContent = count;
            
            // Visual feedback for character limit
            if (count > 450) {
                charCount.style.color = 'var(--warning)';
            } else if (count > 480) {
                charCount.style.color = 'var(--danger)';
            } else {
                charCount.style.color = 'var(--gray)';
            }
        });
    }
    
    function resetForm() {
        selectedRating = 0;
        clearStars();
        feedbackText.value = '';
        charCount.textContent = '0';
        charCount.style.color = 'var(--gray)';
        ratingLabel.textContent = 'How would you rate us?';
        thankYouSection.classList.remove('active');
        document.querySelector('.current-rating').style.display = 'block';
        document.querySelectorAll('.feedback-section').forEach(el => el.style.display = 'block');
        submitBtn.style.display = 'block';
        document.querySelector('.rewards-section').style.display = 'block';
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
        document.querySelector('.current-rating').style.opacity = '0';
        document.querySelector('.current-rating').style.transform = 'translateY(20px)';
        setTimeout(() => {
            document.querySelector('.current-rating').style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            document.querySelector('.current-rating').style.opacity = '1';
            document.querySelector('.current-rating').style.transform = 'translateY(0)';
        }, 200);
        
        document.querySelectorAll('.star').forEach((star, index) => {
            star.style.opacity = '0';
            star.style.transform = 'translateY(20px)';
            setTimeout(() => {
                star.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                star.style.opacity = '1';
                star.style.transform = 'translateY(0)';
            }, 400 + index * 100);
        });
        
        document.querySelector('textarea').style.opacity = '0';
        document.querySelector('textarea').style.transform = 'translateY(20px)';
        setTimeout(() => {
            document.querySelector('textarea').style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            document.querySelector('textarea').style.opacity = '1';
            document.querySelector('textarea').style.transform = 'translateY(0)';
        }, 800);
        
        document.querySelector('.submit-btn').style.opacity = '0';
        document.querySelector('.submit-btn').style.transform = 'translateY(20px)';
        setTimeout(() => {
            document.querySelector('.submit-btn').style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            document.querySelector('.submit-btn').style.opacity = '1';
            document.querySelector('.submit-btn').style.transform = 'translateY(0)';
        }, 1000);
        
        document.querySelector('.rewards-section').style.opacity = '0';
        document.querySelector('.rewards-section').style.transform = 'translateY(20px)';
        setTimeout(() => {
            document.querySelector('.rewards-section').style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            document.querySelector('.rewards-section').style.opacity = '1';
            document.querySelector('.rewards-section').style.transform = 'translateY(0)';
        }, 1200);
    }, 300);
});