document.addEventListener('DOMContentLoaded', () => {
    // login.js
    const particlesContainer = document.getElementById('particles');

// ------------- Helper functions for loading spinner -------------
function setLoading(button, text = "Processing...") {
    button.disabled = true;
    button.originalText = button.innerHTML;
    button.innerHTML = `
        <span class="spinner"></span> ${text}
    `;
}

            // Create floating particles
            function createParticles() {
                const particleCount = 20;
                
                for (let i = 0; i < particleCount; i++) {
                    const particle = document.createElement('div');
                    particle.classList.add('particle');
                    
                    const size = Math.random() * 7 + 3;
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
            
            // Initialize
            createParticles();



// ------------- Modal popup for success -------------
function showSuccessModal(message, redirectUrl = null, delay = 0) {
    // Overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    // Modal
    const modal = document.createElement("div");
    modal.className = "modal-card";

    modal.innerHTML = `
        <div class="modal-icon">
            <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M8 12.5l2.5 2.5L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>

        <h2>Success</h2>
        <p>${message}</p>

        <button class="modal-btn">Continue</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Trigger animation
    requestAnimationFrame(() => overlay.classList.add("show"));

    const closeModal = () => {
        overlay.classList.remove("show");
        setTimeout(() => overlay.remove(), 250);
    };

    // Button click
    modal.querySelector(".modal-btn").onclick = () => {
        closeModal();
        if (redirectUrl) window.location.href = redirectUrl;
    };

    // Click outside to close
    overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
    };

    // Escape key
    document.addEventListener("keydown", function escClose(e) {
        if (e.key === "Escape") {
            closeModal();
            document.removeEventListener("keydown", escClose);
        }
    });

    // Auto redirect
    if (redirectUrl && delay > 0) {
        setTimeout(() => {
            closeModal();
            window.location.href = redirectUrl;
        }, delay);
    }
}

     // DOM Elements
            const loginWrapper = document.getElementById('login');
            const resetWrapper = document.getElementById('reset-password');
            const saveWrapper = document.getElementById('save-password');
            const verify2FAWrapper = document.getElementById('verify-2fa');
            const backupCodeWrapper = document.getElementById('backup-code');
            
            const signupLink = document.getElementById('signup-link');
            const backToLoginBtn = document.getElementById('backToLoginBtn');
            const backToLoginFromReset = document.getElementById('backToLoginFromReset');
            const backTo2FABtn = document.getElementById('backTo2FABtn');
            const resendCodeBtn = document.getElementById('resendCodeBtn');
            const useBackupBtn = document.getElementById('useBackupBtn');
            

            const verify2FAForm = document.getElementById('verify2FAForm');
            const backupCodeForm = document.getElementById('backupCodeForm');
            
            const twofaCodeInput = document.getElementById('twofa_code_input');
            const timerCountdown = document.getElementById('timerCountdown');
            const codeTimer = document.getElementById('codeTimer');
            
            
            let countdownInterval = null;

            // Form switching function
            function showForm(formId) {
                // Hide all forms
                loginWrapper.classList.remove('active');
                resetWrapper.classList.remove('active');
                saveWrapper.classList.remove('active');
                verify2FAWrapper.classList.remove('active');
                backupCodeWrapper.classList.remove('active');
                
                // Show selected form
                document.getElementById(formId).classList.add('active');
                
                // Start timer if showing 2FA form
                if (formId === 'verify-2fa') {
                    startCountdown();
                    setTimeout(() => twofaCodeInput.focus(), 100);
                } else {
                    stopCountdown();
                }
            }

            // Countdown timer for 2FA code
            function startCountdown() {
                let timeLeft = 30;
                timerCountdown.textContent = timeLeft;
                codeTimer.classList.add('active');
                
                if (countdownInterval) clearInterval(countdownInterval);
                
                countdownInterval = setInterval(() => {
                    timeLeft--;
                    timerCountdown.textContent = timeLeft;
                    
                    if (timeLeft <= 10) {
                        codeTimer.classList.add('warning');
                    }
                    
                    if (timeLeft <= 0) {
                        clearInterval(countdownInterval);
                        codeTimer.classList.remove('active', 'warning');
                        codeTimer.innerHTML = `
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"></circle>
                                <line x1="12" y1="8" x2="12" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
                            </svg>
                            <span>Code expired. <a href="#" id="resendExpiredBtn">Resend code</a></span>
                        `;
                        
                        // Re-attach resend event
                        const resendExpiredBtn = document.getElementById('resendExpiredBtn');
                        if (resendExpiredBtn) {
                            resendExpiredBtn.addEventListener('click', (e) => {
                                e.preventDefault();
                                handleResendCode();
                            });
                        }
                    }
                }, 1000);
            }

            function stopCountdown() {
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                }
                codeTimer.classList.remove('active', 'warning');
            }

            function handleResendCode() {
                // Reset timer display
                codeTimer.innerHTML = `
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"></circle>
                        <polyline points="12 6 12 12 16 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></polyline>
                    </svg>
                    <span>Code expires in <strong id="timerCountdown">30</strong>s</span>
                `;
                
                // Restart countdown
                startCountdown();
                
                // Show success toast (you can integrate with your toast system)
                showToast('New code sent to your authenticator app', 'success');
            }

            function showToast(message, type = 'info') {
                // Simple toast implementation - replace with your existing toast system
                const toast = document.createElement('div');
                toast.className = `toast ${type}`;
                toast.textContent = message;
                document.body.appendChild(toast);
                
                setTimeout(() => toast.classList.add('show'), 10);
                setTimeout(() => {
                    toast.classList.remove('show');
                    setTimeout(() => toast.remove(), 300);
                }, 3000);
            }

            // Auto-format 2FA input (numbers only)
            if (twofaCodeInput) {
                twofaCodeInput.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, '');
                });
            }

            // Event Listeners
            if (resetBtn) {
                resetBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    showForm('reset-password');
                });
            }

            if (backToLoginBtn) {
                backToLoginBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    showForm('login');
                });
            }

            if (backToLoginFromReset) {
                backToLoginFromReset.addEventListener('click', (e) => {
                    e.preventDefault();
                    showForm('login');
                });
            }

            if (backTo2FABtn) {
                backTo2FABtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    showForm('verify-2fa');
                });
            }

            if (resendCodeBtn) {
                resendCodeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    handleResendCode();
                });
            }

            if (useBackupBtn) {
                useBackupBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    showForm('backup-code');
                });
            }



if (verify2FAForm) {

    verify2FAForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();

            const code =
                twofaCodeInput.value.trim();

            if (
                !code ||
                code.length !== 6
            ) {

                showToast(
                    "Please enter a valid 6-digit code",
                    "error"
                );

                return;
            }

            const verifyBtn =
                document.getElementById(
                    "verify2FABtn"
                );

            verifyBtn.disabled = true;

            verifyBtn.innerHTML = `
                <span class="spinner"></span>
                Verifying...
            `;

            try {

                const response =
                    await fetch(
                        "/verify-2fa",
                        {
                            method: "POST",
                            credentials: "include",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify({
                                code: code
                            })
                        }
                    );

                const data =
                    await response.json();

                if (
                    !response.ok ||
                    data.success === false ||
                    data.status === "error"
                ) {

                    throw new Error(
                        data.message ||
                        "Invalid verification code"
                    );
                }

                showToast(
                    "Verification successful",
                    "success"
                );

                showSuccessModal(
                    data.message ||
                    "2FA verification successful",
                    "/dashboard",
                    1500
                );

            } catch (error) {

                console.error(
                    "2FA Verification Error:",
                    error
                );

                showErrorModal(
                    error.message ||
                    "Verification failed"
                );

            } finally {

                verifyBtn.disabled = false;

                verifyBtn.innerHTML = `
                    <svg viewBox="0 0 24 24"
                         width="18"
                         height="18">
                        <path
                            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2">
                        </path>
                        <polyline
                            points="9 12 11 14 15 10"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round">
                        </polyline>
                    </svg>
                    Verify & Sign In
                `;
            }
        }
    );
}
            if (backupCodeForm) {
                backupCodeForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const code = document.getElementById('backup_code_input').value;
                    
                    if (!code) {
                        showToast('Please enter a backup code', 'error');
                        return;
                    }
                    
                    showToast('Backup code verified! Redirecting...', 'success');
                    // window.location.href = '/dashboard';
                });
            }


function showErrorModal(message) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const modal = document.createElement("div");
    modal.className = "modal-card error";

    modal.innerHTML = `
        <div class="modal-icon error-icon">
            <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M15 9l-6 6M9 9l6 6"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"/>
            </svg>
        </div>

        <h2>Error</h2>
        <p>${message}</p>

        <button class="modal-btn error-btn">Close</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add("show"));

    const close = () => {
        overlay.classList.remove("show");
        setTimeout(() => overlay.remove(), 250);
    };

    modal.querySelector(".error-btn").onclick = close;

    overlay.onclick = (e) => {
        if (e.target === overlay) close();
    };

    document.addEventListener("keydown", function esc(e) {
        if (e.key === "Escape") {
            close();
            document.removeEventListener("keydown", esc);
        }
    });
}
// ------------- Spinner CSS dynamically (optional) -------------
const style = document.createElement("style");
style.innerHTML = `
.spinner {
    border: 3px solid rgba(255,255,255,0.3);
    border-top: 3px solid #fff;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    display: inline-block;
    margin-right: 8px;
    animation: spin 0.8s linear infinite;
}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;
document.head.appendChild(style);

// ------------- Grab form and button -------------
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("SigninButton");
const resetForm = document.getElementById("resetForm");
const resetBtn = document.getElementById("resetPassword");
const saveForm = document.getElementById("passwordForm");
const saveBtn = document.getElementById("savePassword");
const restBtna = document.getElementById("resetpsbtn");
const logindiv = document.getElementById("login");
const resetdiv = document.getElementById("reset-password");
const savediv = document.getElementById("save-password");

function clearLoading(button) {
    button.disabled = false;
    button.innerHTML = button.originalText;
}

function showOnly(div) {
    logindiv.classList.remove("active");
    resetdiv.classList.remove("active");
    savediv.classList.remove("active");

    div.classList.add("active");
}



// ------------- Submit event -------------
loginForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    const username = document.getElementById("username_input").value.trim();
    const password = document.getElementById("password_input").value.trim();

    if (!username || !password) {
        showErrorModal("Please enter both username and password.");
        return;
    }

    const user_agent = navigator.userAgent;

    async function login(lat = null, lng = null) {
        const payload = {
            username,
            password,
            user_agent,
            lat,
            lng
        };



        setLoading(loginBtn, "Logging in...");

        try {
            const response = await fetch("/loginp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(payload)
            });

            const data = await response.json();



            clearLoading(loginBtn);

            if (data.status === "success") {
                if (data.two_factor_required) {
                    showToast("Two-factor authentication required. Please verify.", "info");
                    showForm("verify-2fa");
                    return;
                }else if (data.faceid_required) {
                    showToast("Face ID authentication required. Please verify.", "info");
                    return;
                } else {
                showSuccessModal(
                    "Login successful!",
                    "/dashboard",
                    2000
                );
            }
            } else {
                showErrorModal(data.message || "Login failed");
            }

        } catch (error) {
            clearLoading(loginBtn);
            console.error("Error:", error);
            showErrorModal("An error occurred during login");
        }
    }

    if (!navigator.geolocation) {
        login();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            login(
                position.coords.latitude,
                position.coords.longitude
            );
        },
        (error) => {
            console.warn("Location permission denied:", error);

            // Continue login without location
            login();
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        }
    );
});

restBtna.addEventListener('click', function (e) {
    e.preventDefault();

    const username =
        document.getElementById("username_input").value.trim();

    if (!username) {
        showErrorModal(
            "Please enter your username first."
        );
        return;
    }

    showOnly(resetdiv);
});

resetForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const security_question = document.getElementById("security_question_input").value;
    const security_answer = document.getElementById("security_answer_input").value;
    if (!security_question || !security_answer) {
        showErrorModal("Please enter both security question and answer");
        return;
    }


    setLoading(resetBtn, "Reseting......");

    const d_dict = {
        username: document.getElementById("username_input").value,
        security_question: security_question, 
        security_answer: security_answer
    };

    try {
        const response = await fetch("/resetpass", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(d_dict)
        });

        const data = await response.json();

        clearLoading(resetBtn);

        if (data.status === "success") {
            showOnly(savediv);
        } else {
            showErrorModal(data.message || "Reset failed");
        }

    } catch (error) {
        clearLoading(resetBtn);
        console.error("Error:", error);
        showErrorModal("An error occurred during Reset");
    }
});

saveForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const entered_code = document.getElementById("verification_code_input").value;
    const password = document.getElementById("password_input_reset").value;
    const confirmpassowrd = document.getElementById("confirm_password_input").value;

    if (!entered_code || !password || !confirmpassowrd) {
        showErrorModal("All fields are required.");
        return;
    }  
    if (password !== confirmpassowrd) {
        showErrorModal("Passowrds doesn't match");
        return;
    }

    setLoading(saveBtn, "Saving Passowrd....");
    const d_dict = {
        username:document.getElementById("username_input").value,
        reset_code: document.getElementById("verification_code_input").value, 
        new_password: password,
    };

    
    try {
        const response = await fetch("/save-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(d_dict)
        });

        const data = await response.json();

        clearLoading(saveBtn);

        if (data.status === "success") {
            showSuccessModal("Password reset successfully. You can login now", "/login",3000);
        } else {
            showErrorModal(data.message || "Save failed");
        }

    } catch (error) {
        clearLoading(saveBtn);
        console.error("Error:", error);
        showErrorModal("An error occurred during Reset");
    }



});

async function faceidLogin() {
    const username = document.getElementById("username_input").value;

    let res = await fetch("/webauthn/auth/options", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ username })
    });
    const options = await res.json();

    options.challenge = Uint8Array.from(atob(options.challenge), c=>c.charCodeAt(0));
    options.allowCredentials.forEach(c => {
        c.id = Uint8Array.from(atob(c.id), d=>d.charCodeAt(0));
    });

    const credential = await navigator.credentials.get({ publicKey: options });

    const data = {
        username,
        id: credential.id,
        rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        response: {
            authenticatorData: btoa(String.fromCharCode(...new Uint8Array(credential.response.authenticatorData))),
            clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
            signature: btoa(String.fromCharCode(...new Uint8Array(credential.response.signature))),
            userHandle: credential.response.userHandle ? btoa(String.fromCharCode(...new Uint8Array(credential.response.userHandle))) : null
        },
        type: credential.type
    };

    await fetch("/webauthn/auth/verify", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(data)
    });

    window.location.href = "/dashboard";
}

document.getElementById("faceid-login")
    .addEventListener("click", faceidLogin);
});
