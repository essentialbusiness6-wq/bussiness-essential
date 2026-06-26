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

        async function loadBanks() {

    const bankSelect =
    document.getElementById(
        "bankName"
    );

    if (!bankSelect)
        return;

    try {

        bankSelect.innerHTML = `
            <option value="">
                Loading banks...
            </option>
        `;

        const response =
        await fetch(
            "/api/paystack/banks",
            {
                credentials:
                "include"
            }
        );

        const data =
        await response.json();

        if (
            !response.ok ||
            data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to load banks"
            );
        }

        bankSelect.innerHTML =
        `
        <option value="">
            Select Bank
        </option>
        `;

        data.banks
        .forEach(
            bank => {

                const option =
                document.createElement(
                    "option"
                );

                option.value =
                bank.code;

                option.textContent =
                bank.name;

                bankSelect.appendChild(
                    option
                );

            }
        );

    }

    catch (err) {

        console.error(
            "BANK LOAD ERROR:",
            err
        );

        bankSelect.innerHTML =
        `
        <option value="">
            Failed to load banks
        </option>
        `;

        showToast(
            "Unable to load banks",
            "error"
        );
    }
}




        loadBanks();



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

    const bankCode =
    bankNameSelect.value;

    const bankName =
    bankCode === "custom"
    ? customBankName.value.trim()
    : bankNameSelect.options[
        bankNameSelect.selectedIndex
    ].text;

    const accountNumber =
    accountNumberInput.value.trim();

    if (
        !bankCode ||
        accountNumber.length !== 10
    ) {

        showToast(
            "Enter valid bank details",
            "warning"
        );

        return;
    }

    verifyBtn.classList.add(
        "loading"
    );

    verifyBtn.disabled =
    true;

    verifyBtn.querySelector(
        "span"
    ).textContent =
    "Verifying...";

    try {

        const response =
        await fetch(
            "/api/paystack/resolve-account",

            {
                method:
                "POST",

                headers: {
                    "Content-Type":
                    "application/json"
                },

                credentials:
                "include",

                body:
                JSON.stringify({

                    bank_code:
                    bankCode,

                    account_number:
                    accountNumber
                })
            }
        );

        const data =
        await response.json();

        if (
            !response.ok
        ) {

            throw new Error(
                data.message ||
                "Verification failed"
            );
        }

        if (
            data.status ===
            "success"
        ) {

            state.isVerified =
            true;

            state.verifiedAccountName =
            data.account_name;

            accountNameLabelText.textContent =
            "Verified Account Name";

            accountNameValue.textContent =
            data.account_name;

            accountNameDisplay.classList.remove(
                "error"
            );

            accountNameDisplay.classList.add(
                "active"
            );

            saveBtn.disabled =
            false;

            showToast(
                "Account verified",
                "success"
            );

        } else {

            accountNameLabelText.textContent =
            "Verification Failed";

            accountNameValue.textContent =
            data.message ||
            "Account not found";

            accountNameDisplay.classList.add(
                "active",
                "error"
            );

            state.isVerified =
            false;

            showToast(
                data.message,
                "error"
            );
        }

    }

    catch (error) {

        console.error(
            error
        );

        state.isVerified =
        false;

        accountNameLabelText.textContent =
        "Verification Failed";

        accountNameValue.textContent =
        error.message;

        accountNameDisplay.classList.add(
            "active",
            "error"
        );

        showToast(
            error.message,
            "error"
        );

    }

    finally {

        verifyBtn.classList.remove(
            "loading"
        );

        verifyBtn.disabled =
        false;

        verifyBtn.querySelector(
            "span"
        ).textContent =
        "Verify";

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
