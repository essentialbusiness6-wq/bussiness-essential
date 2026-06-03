// feedback.js - Business Essential Feedback Page

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const backButton = document.getElementById('backButton');
    const helpBtn = document.getElementById('helpBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const submitBtn = document.getElementById('submitBtn');
    const feedbackForm = document.getElementById('feedbackForm');
    const stars = document.querySelectorAll('#starRating .star');
    const ratingText = document.getElementById('ratingText');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const filePreview = document.getElementById('filePreview');
    const particlesContainer = document.getElementById('particles');
    
    let selectedRating = 0;
    
    // Initialize
    createParticles();
    setupEventListeners();
    loadFeedback();
    const theme = document.body.dataset.theme;
    if (theme){
        applyTheme(theme);
    }
    // Functions
    function setupEventListeners() {
        // Navigation buttons
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
            setTimeout(() => {
                helpBtn.classList.remove('haptic-feedback');
                showToast('🎧 Opening help center...');
                window.location.href = '/support';
            }, 200);
        });
        
        cancelBtn.addEventListener('click', () => {
            showHapticFeedback(cancelBtn);
            setTimeout(() => {
                cancelBtn.classList.remove('haptic-feedback');
                showToast('Form cleared');
                feedbackForm.reset();
                resetStars();
                filePreview.innerHTML = '';
                uploadPlaceholder.style.display = 'block';
            }, 200);
        });
        
        // Star Rating
        stars.forEach(star => {
            star.addEventListener('mouseenter', () => {
                highlightStars(star.dataset.value);
            });
            
            star.addEventListener('mouseleave', () => {
                highlightStars(selectedRating);
            });
            
            star.addEventListener('click', () => {
                showHapticFeedback(star);
                selectedRating = parseInt(star.dataset.value);
                highlightStars(selectedRating);
                updateRatingText(selectedRating);
            });
        });
        
        // File Upload
        fileUploadArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.style.borderColor = 'var(--primary)';
            fileUploadArea.style.background = 'rgba(67, 97, 238, 0.1)';
        });
        
        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.style.borderColor = 'rgba(0, 0, 0, 0.1)';
            fileUploadArea.style.background = 'rgba(255, 255, 255, 0.5)';
        });
        
        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.style.borderColor = 'rgba(0, 0, 0, 0.1)';
            fileUploadArea.style.background = 'rgba(255, 255, 255, 0.5)';
            handleFiles(e.dataTransfer.files);
        });
        
        fileInput.addEventListener('change', () => {
            handleFiles(fileInput.files);
        });
        
        // Form Submission
        feedbackForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmit();
        });
    }
    
    function highlightStars(value) {
        stars.forEach(s => {
            s.classList.toggle('active', s.dataset.value <= value);
        });
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
    
    function resetStars() {
        selectedRating = 0;
        highlightStars(0);
        ratingText.textContent = 'Select a rating';
    }
    
    function updateRatingText(value) {
        const texts = ['', 'Poor 😞', 'Fair 😐', 'Good 🙂', 'Great 😊', 'Excellent 🤩'];
        ratingText.textContent = texts[value];
    }
    
    function handleFiles(files) {
        if (files.length > 0) {
            uploadPlaceholder.style.display = 'none';
            filePreview.innerHTML = '';
            
            Array.from(files).forEach(file => {
                if (file.size > 5 * 1024 * 1024) {
                    showToast(`⚠️ ${file.name} is too large (max 5MB)`, 'warning');
                    return;
                }
                
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `
                    <span class="file-name">${file.name}</span>
                    <button class="file-remove" type="button">&times;</button>
                `;
                
                fileItem.querySelector('.file-remove').addEventListener('click', () => {
                    fileItem.remove();
                    if (filePreview.children.length === 0) {
                        uploadPlaceholder.style.display = 'block';
                    }
                });
                
                filePreview.appendChild(fileItem);
            });
        }
    }
    
    async function handleFormSubmit() {
        if (selectedRating === 0) {
            showToast('⚠️ Please select a rating', 'warning');
            return;
        }
        
        if (!document.getElementById('subject').value.trim()) {
            showToast('⚠️ Please enter a subject', 'warning');
            return;
        }
        
        if (!document.getElementById('message').value.trim()) {
            showToast('⚠️ Please enter details', 'warning');
            return;
        }
        
        // Show loading state
        submitBtn.disabled = true;
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';

        const formData = new FormData(feedbackForm);
        console.log("Form Data:", Object.fromEntries(formData.entries()));

        try{

            const response = await fetch("/submit-feedback", {
                method: "POST",
                credentials: 'include', 
                body: formData
            }); 

            const data = await response.json();

            if (data.status === "success") {
                showToast('✅ Feedback submitted successfully!', 'success');
                // Reset form
                feedbackForm.reset();
                resetStars();
                filePreview.innerHTML = '';
                uploadPlaceholder.style.display = 'block';
            } else {
                showToast(data.message || '❌ Failed to submit feedback', 'error');
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            showToast('❌ An error occurred while submitting feedback', 'error');
        } finally {
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
        

    }
    async function loadFeedback() {

    try {

        const response = await fetch("/api/my-feedback");

        const feedbacks = await response.json();

        const feedbackList = document.getElementById("feedbackList");

        feedbackList.innerHTML = "";

        if (feedbacks.length === 0) {

            feedbackList.innerHTML = `
                <p>No feedback submitted yet.</p>
            `;

            return;
        }

        feedbacks.forEach(item => {

            feedbackList.innerHTML += `
                <div class="feedback-item">

                    <div class="feedback-header">

                        <span class="badge ${item.feedback_type}">
                            ${item.feedback_type}
                        </span>

                        <span class="status pending">
                            ${item.status}
                        </span>

                    </div>

                    <h4 class="feedback-title">
                        ${item.subject}
                    </h4>

                    <p class="feedback-date">
                        ${formatDate(item.created_at)}
                    </p>

                </div>
            `;
        });

    } catch (err) {

        console.error(err);

    }

}


/* =========================
   FORMAT DATE
========================= */

function formatDate(dateString) {

    const date = new Date(dateString);

    return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
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
        toast.className = `toast ${type}`;
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
