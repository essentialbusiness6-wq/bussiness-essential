    document.addEventListener('DOMContentLoaded', () => {
        // ================= DOM ELEMENTS =================
        const bankNameSelect = document.getElementById('bankName');
        const customBankGroup = document.getElementById('customBankGroup');
        const customBankName = document.getElementById('customBankName');
        const accountNumberInput = document.getElementById('accountNumber');
        const verifyBtn = document.getElementById('verifyBtn');
        const accountNameDisplay = document.getElementById('accountNameDisplay');
        const accountNameValue = document.getElementById('accountNameValue');
        const accountNameLabelText = document.getElementById('accountNameLabelText');
        const saveBtn = document.getElementById('saveBtn');
        const accountForm = document.getElementById('accountForm');
        const toastContainer = document.getElementById('toastContainer');
        const particlesContainer = document.getElementById('particles');

        // ================= STATE =================
        const state = {
            isVerified: false,
            verifiedAccountName: '',
            isSaving: false
        };

        // ================= INITIALIZATION =================
        createParticles();
        setupEventListeners();

        function setupEventListeners() {
            // Bank selection - show custom input if "Other" selected
            bankNameSelect.addEventListener('change', () => {
                if (bankNameSelect.value === 'custom') {
                    customBankGroup.style.display = 'block';
                    customBankName.focus();
                } else {
                    customBankGroup.style.display = 'none';
                    customBankName.value = '';
                }
                resetVerification();
                updateVerifyButton();
            });

            // Account number input - only allow numbers
            accountNumberInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                resetVerification();
                updateVerifyButton();
            });

            // Verify button
            verifyBtn.addEventListener('click', verifyAccount);

            // Form submission
            accountForm.addEventListener('submit', handleSave);
        }

        // ================= VERIFICATION =================
        function updateVerifyButton() {
            const bankSelected = bankNameSelect.value && 
                (bankNameSelect.value !== 'custom' || customBankName.value.trim());
            const accountValid = accountNumberInput.value.length === 10;
            
            verifyBtn.disabled = !(bankSelected && accountValid);
        }

        function resetVerification() {
            state.isVerified = false;
            state.verifiedAccountName = '';
            accountNameDisplay.classList.remove('active', 'error');
            saveBtn.disabled = true;
        }

        async function verifyAccount() {
            const bankCode = bankNameSelect.value;
            const bankName = bankCode === 'custom' 
                ? customBankName.value.trim() 
                : bankNameSelect.options[bankNameSelect.selectedIndex].text;
            const accountNumber = accountNumberInput.value;

            if (!bankName || accountNumber.length !== 10) {
                showToast('Please enter valid bank details', 'warning');
                return;
            }

            // Show loading state
            verifyBtn.classList.add('loading');
            verifyBtn.disabled = true;
            verifyBtn.querySelector('span').textContent = 'Verifying...';

            // Simulate API call to verify account
            try {
                // In production, this would be a real API call:
                // const response = await fetch('/api/verify-account', {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify({ bank_code: bankCode, account_number: accountNumber })
                // });
                // const data = await response.json();

                // Simulated response
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Simulate successful verification (90% success rate for demo)
                const isSuccess = Math.random() > 0.1;

                if (isSuccess) {
                    // Generate a realistic-looking account name
                    const sampleNames = [
                        'JOHN DOE',
                        'JANE SMITH',
                        'BUSINESS ESSENTIAL LTD',
                        'ACME CORPORATION',
                        'TECHSTART INC',
                        'GLOBAL SOLUTIONS'
                    ];
                    const accountName = sampleNames[Math.floor(Math.random() * sampleNames.length)];

                    state.isVerified = true;
                    state.verifiedAccountName = accountName;
                    
                    accountNameLabelText.textContent = 'Verified Account Name';
                    accountNameValue.textContent = accountName;
                    accountNameDisplay.classList.remove('error');
                    accountNameDisplay.classList.add('active');
                    
                    saveBtn.disabled = false;
                    showToast('Account verified successfully!', 'success');
                } else {
                    accountNameLabelText.textContent = 'Verification Failed';
                    accountNameValue.textContent = 'Account number not found. Please check and try again.';
                    accountNameDisplay.classList.add('active', 'error');
                    showToast('Account verification failed. Please check details.', 'error');
                }
            } catch (error) {
                accountNameLabelText.textContent = 'Verification Failed';
                accountNameValue.textContent = 'An error occurred. Please try again.';
                accountNameDisplay.classList.add('active', 'error');
                showToast('Network error. Please try again.', 'error');
            } finally {
                verifyBtn.classList.remove('loading');
                verifyBtn.querySelector('span').textContent = 'Verify';
                updateVerifyButton();
            }
        }

        // ================= SAVE =================
        async function handleSave(e) {
            e.preventDefault();

            if (!state.isVerified) {
                showToast('Please verify your account first', 'warning');
                return;
            }

            const bankCode = bankNameSelect.value;
            const bankName = bankCode === 'custom' 
                ? customBankName.value.trim() 
                : bankNameSelect.options[bankNameSelect.selectedIndex].text;
            const accountNumber = accountNumberInput.value;

            // Show loading state
            saveBtn.classList.add('loading');
            saveBtn.disabled = true;
            state.isSaving = true;

            try {
                // In production, this would be a real API call:
                // const response = await fetch('/api/update-account', {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify({
                //         bank_code: bankCode,
                //         bank_name: bankName,
                //         account_number: accountNumber,
                //         account_name: state.verifiedAccountName
                //     })
                // });
                // const data = await response.json();

                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1500));

                showToast('Account details saved successfully!', 'success');

                // Redirect to billing page after 1.5 seconds
                setTimeout(() => {
                    window.location.href = '/billing';
                }, 1500);

            } catch (error) {
                showToast('Failed to save account details. Please try again.', 'error');
                saveBtn.classList.remove('loading');
                saveBtn.disabled = false;
                state.isSaving = false;
            }
        }

        // ================= UTILITIES =================
        function showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            let icon = '';
            if (type === 'success') {
                icon = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            } else if (type === 'error') {
                icon = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
            } else if (type === 'warning') {
                icon = '<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
            }
            
            toast.innerHTML = `${icon}<span>${message}</span>`;
            toastContainer.appendChild(toast);
            
            setTimeout(() => toast.remove(), 3000);
        }

        function createParticles() {
            const count = window.innerWidth > 768 ? 15 : 8;
            for (let i = 0; i < count; i++) {
                const p = document.createElement('div');
                p.className = 'particle';
                p.style.cssText = `
                    width: ${Math.random() * 6 + 2}px;
                    height: ${Math.random() * 6 + 2}px;
                    left: ${Math.random() * 100}%;
                    top: ${Math.random() * 100}%;
                    animation-duration: ${Math.random() * 10 + 15}s;
                    animation-delay: ${Math.random() * 5}s;
                    opacity: ${Math.random() * 0.5 + 0.1};
                `;
                particlesContainer.appendChild(p);
            }
        }
    });
