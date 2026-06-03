document.addEventListener('DOMContentLoaded', function() {

    const theme = document.body.dataset.theme;
    if (theme) {
        applyTheme(theme);
    }
    // Initialize particles background
    createParticles();
    
    // Set up event listeners
    setupEventListeners();
    
    // Add entrance animations
    addEntranceAnimations();

    
});


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
async function generateInvoicePDF(invoiceData) {

    try {

        const { jsPDF } = window.jspdf;

        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        const pageWidth =
            pdf.internal.pageSize.getWidth();

        const primaryColor = [67, 97, 238];
        const darkColor = [33, 37, 41];
        const lightGray = [120, 120, 120];

        // =========================
        // COMPANY
        // =========================

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...primaryColor);
        pdf.setFontSize(24);

        pdf.text(
            invoiceData.companyName || "Business Essential",
            20,
            25
        );

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...lightGray);

        let companyY = 35;

        [
            invoiceData.companyAddress,
            invoiceData.companyEmail,
            invoiceData.companyPhone,
            invoiceData.companyWebsite
        ].forEach(line => {

            if (line) {

                pdf.text(
                    String(line),
                    20,
                    companyY
                );

                companyY += 5;
            }

        });

        // =========================
        // TITLE
        // =========================

        pdf.setTextColor(...darkColor);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(22);

        pdf.text(
            "TAX INVOICE",
            pageWidth - 20,
            25,
            {
                align: "right"
            }
        );

        pdf.setTextColor(...primaryColor);

        pdf.setFontSize(14);

        pdf.text(
            invoiceData.invoiceNumber,
            pageWidth - 20,
            35,
            {
                align: "right"
            }
        );

        // =========================
        // META
        // =========================

        pdf.setTextColor(...darkColor);

        pdf.setFontSize(10);

        pdf.text(
            `Invoice Date: ${invoiceData.invoiceDate}`,
            pageWidth - 20,
            48,
            {
                align: "right"
            }
        );

        pdf.text(
            `Due Date: ${invoiceData.dueDate}`,
            pageWidth - 20,
            55,
            {
                align: "right"
            }
        );

        pdf.text(
            `Status: ${invoiceData.status}`,
            pageWidth - 20,
            62,
            {
                align: "right"
            }
        );

        // =========================
        // BILL TO
        // =========================

        pdf.setDrawColor(220);

        pdf.line(
            20,
            75,
            pageWidth - 20,
            75
        );

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);

        pdf.text(
            "BILLED TO",
            20,
            85
        );

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);

        pdf.text(
            invoiceData.clientName || "",
            20,
            93
        );

        pdf.text(
            invoiceData.clientEmail || "",
            20,
            100
        );

        if (invoiceData.clientAddress) {

            const addressLines =
                pdf.splitTextToSize(
                    invoiceData.clientAddress,
                    70
                );

            pdf.text(
                addressLines,
                20,
                107
            );
        }

        // =========================
        // INVOICE DETAILS
        // =========================

        pdf.setFont("helvetica", "bold");

        pdf.text(
            "INVOICE DETAILS",
            120,
            85
        );

        pdf.setFont("helvetica", "normal");

        pdf.text(
            `Client ID: CL-${invoiceData.clientId}`,
            120,
            95
        );

        pdf.text(
            `Payment Terms: ${invoiceData.paymentTerms}`,
            120,
            102
        );

        pdf.text(
            `Status: ${invoiceData.status}`,
            120,
            109
        );

        // =========================
        // ITEMS TABLE
        // =========================

        pdf.autoTable({

            startY: 125,

            head: [[
                "Description",
                "Qty",
                "Unit Price",
                "Amount"
            ]],

            body: invoiceData.items.map(item => [

                item.desc,

                item.qty,

                `${invoiceData.currencySymbol}${Number(item.price).toFixed(2)}`,

                `${invoiceData.currencySymbol}${Number(item.total).toFixed(2)}`
            ]),

            theme: "grid",

            headStyles: {
                fillColor: primaryColor,
                textColor: 255,
                fontStyle: "bold"
            },

            styles: {
                fontSize: 10,
                cellPadding: 4
            }
        });

        // =========================
        // TOTALS
        // =========================

        const finalY =
            pdf.lastAutoTable.finalY + 15;

        pdf.setFontSize(11);

        pdf.text(
            "Subtotal:",
            130,
            finalY
        );

        pdf.text(
            `${invoiceData.currencySymbol}${Number(invoiceData.subtotal).toFixed(2)}`,
            pageWidth - 20,
            finalY,
            {
                align: "right"
            }
        );

        pdf.text(
            `Tax (${invoiceData.tax}%):`,
            130,
            finalY + 8
        );

        pdf.text(
            `${invoiceData.currencySymbol}${Number(invoiceData.taxAmount).toFixed(2)}`,
            pageWidth - 20,
            finalY + 8,
            {
                align: "right"
            }
        );

        pdf.setDrawColor(...primaryColor);

        pdf.line(
            130,
            finalY + 14,
            pageWidth - 20,
            finalY + 14
        );

        pdf.setTextColor(...primaryColor);

        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");

        pdf.text(
            "TOTAL",
            130,
            finalY + 25
        );

        pdf.text(
            `${invoiceData.currencySymbol}${Number(invoiceData.totalAmount).toFixed(2)}`,
            pageWidth - 20,
            finalY + 25,
            {
                align: "right"
            }
        );

        // =========================
        // PAYMENT INFO
        // =========================

        let footerY = finalY + 45;

        pdf.setTextColor(...darkColor);

        pdf.setFontSize(12);

        pdf.text(
            "Payment Information",
            20,
            footerY
        );

        pdf.setFontSize(10);

        const paymentText =
            "Payment is due within 30 days of the invoice date. This invoice has been paid in full via your Business Essential account.";

        pdf.text(
            pdf.splitTextToSize(
                paymentText,
                170
            ),
            20,
            footerY + 8
        );

        footerY += 30;

        pdf.setFont("helvetica", "bold");

        pdf.text(
            "Questions?",
            20,
            footerY
        );

        pdf.setFont("helvetica", "normal");

        pdf.text(
            "billing@businesse.com",
            20,
            footerY + 8
        );

        pdf.text(
            "+1 (800) 555-0199",
            20,
            footerY + 15
        );

        // =========================
        // THANK YOU
        // =========================

        pdf.setTextColor(...primaryColor);

        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");

        pdf.text(
            "Thank you for powering your business with Business Essential!",
            pageWidth / 2,
            280,
            {
                align: "center"
            }
        );

        pdf.save(
            `${invoiceData.invoiceNumber}.pdf`
        );

    }
    catch (error) {

        console.error(error);

        showToast(
            "Failed to generate PDF",
            "error"
        );

    }

}

function downloadPDF() {

    generateInvoicePDF({

        companyName:
            document.getElementById("companyName")?.textContent || "",

        companyEmail:
            document.getElementById("companyEmail")?.textContent || "",

        companyPhone:
            document.getElementById("companyPhone")?.textContent || "",

        companyWebsite:
            document.getElementById("companyWebsite")?.textContent || "",

        companyAddress:
            document.getElementById("companyAddress")?.textContent || "",

        clientName:
            document.getElementById("clientName")?.textContent || "",

        clientEmail:
            document.getElementById("clientEmail")?.textContent || "",

        clientAddress:
            document.getElementById("clientAddress")?.textContent || "",

        invoiceNumber:
            document.getElementById("invoiceNumber")?.textContent || "",

        invoiceDate:
            document.getElementById("invoiceDate")?.textContent || "",

        dueDate:
            document.getElementById("dueDate")?.textContent || "",

        clientId:
            document.getElementById("clientId")?.textContent
                .replace("CL-", ""),

        paymentTerms:
            document.getElementById("paymentTerms")?.textContent || "",

        status:
            document.getElementById("invoiceStatus")?.textContent || "",

        currencySymbol: document.body.dataset.currency,

        subtotal,

        tax,

        taxAmount,

        totalAmount,

        items

    });

}


// Function to create floating particles in the background
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    const particleCount = window.innerWidth > 768 ? 40 : 25;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        // Random size between 2px and 8px
        const size = Math.random() * 6 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // Random position
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        // Random animation duration and delay
        const duration = Math.random() * 15 + 20;
        const delay = Math.random() * 5;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${delay}s`;
        
        // Random opacity
        particle.style.opacity = `${Math.random() * 0.3 + 0.1}`;
        
        particlesContainer.appendChild(particle);
    }
}

// Function to set up all event listeners
function setupEventListeners() {
    // Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showHapticFeedback(backBtn);
            // In a real app, this would navigate back
            window.history.back();
        });
    }
    
    // Print button
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            showHapticFeedback(printBtn);
            showToast('🖨️ Preparing invoice for printing...');
            
            setTimeout(() => {
                showToast('✓ Print dialog opened', 'success');
                // In a real app: window.print();
            }, 1200);
        });
    }
    
    // Download button
const downloadBtn = document.getElementById('downloadBtn');

if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        showHapticFeedback(downloadBtn);

        const originalContent = downloadBtn.innerHTML;
        const oldTitle = document.title;

        downloadBtn.disabled = true;

        // loading spinner
        downloadBtn.innerHTML = `
            <svg viewBox="0 0 24 24"
                style="animation: spin 1s linear infinite; width: 20px; height: 20px;">
                <path d="M12 2v6m0 10v6M4.93 4.93l4.24 4.24m8.49-8.49l4.24 4.24M1.5 12h6m10 0h6M4.93 19.07l4.24-4.24m8.49 8.49l4.24-4.24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `;

        // set invoice title for print
        document.title = invoiceNumber;

        // small delay ensures DOM updates before print capture
        setTimeout(() => {
            
            downloadPDF()
            // restore after print dialog closes
            setTimeout(() => {
                document.title = oldTitle;
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = originalContent;
            }, 800);

        }, 50);
    });
}

    
    // Share button
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            showHapticFeedback(shareBtn);
            showToast('📤 Sharing invoice...');
            
            setTimeout(() => {
                showToast('✓ Invoice shared successfully!', 'success');
            }, 1000);
        });
    }
    
    // Pay button
    const payBtn = document.getElementById('payBtn');
    if (payBtn) {
        payBtn.addEventListener('click', () => {
            showHapticFeedback(payBtn);
            showToast('✓ This invoice has already been paid', 'success');
        });
    }
    
    // Email button
    const emailBtn = document.getElementById('emailBtn');
    if (emailBtn) {
        emailBtn.addEventListener('click', () => {
            showHapticFeedback(emailBtn);
            showToast('📧 Sending email copy...');
            
            setTimeout(() => {
                showToast('✓ Email sent successfully!', 'success');
            }, 1500);
        });
    }
    
    // Close modal button
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', hideModal);
    }
    
    // Modal overlay click to close
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                hideModal();
            }
        });
    }
    
    // Modal action button
    const modalActionBtn = document.getElementById('modalActionBtn');
    if (modalActionBtn) {
        modalActionBtn.addEventListener('click', () => {
            const redirectUrl = modalActionBtn.dataset.redirect;
            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                hideModal();
            }
        });
    }
}

// Function to add entrance animations
function addEntranceAnimations() {
    setTimeout(() => {
        document.querySelector('.invoice-card').style.opacity = '0';
        document.querySelector('.invoice-card').style.transform = 'translateY(20px)';
        setTimeout(() => {
            document.querySelector('.invoice-card').style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            document.querySelector('.invoice-card').style.opacity = '1';
            document.querySelector('.invoice-card').style.transform = 'translateY(0)';
        }, 300);
        
        document.querySelectorAll('.detail-section').forEach((section, index) => {
            section.style.opacity = '0';
            section.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                section.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                section.style.opacity = '1';
                section.style.transform = 'translateX(0)';
            }, 600 + index * 150);
        });
        
        document.querySelector('.total-section').style.opacity = '0';
        document.querySelector('.total-section').style.transform = 'translateY(20px)';
        setTimeout(() => {
            document.querySelector('.total-section').style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            document.querySelector('.total-section').style.opacity = '1';
            document.querySelector('.total-section').style.transform = 'translateY(0)';
        }, 900);
        
        document.querySelector('.invoice-footer').style.opacity = '0';
        document.querySelector('.invoice-footer').style.transform = 'translateY(20px)';
        setTimeout(() => {
            document.querySelector('.invoice-footer').style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            document.querySelector('.invoice-footer').style.opacity = '1';
            document.querySelector('.invoice-footer').style.transform = 'translateY(0)';
        }, 1000);
    }, 300);
}

// Function to show haptic feedback animation
function showHapticFeedback(element) {
    if (!element) return;
    
    element.classList.add('haptic-feedback');
    setTimeout(() => {
        element.classList.remove('haptic-feedback');
    }, 200);
}

// Function to show toast notification
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

// Function to show modal
function showModal(type, message, redirectUrl = null) {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalIcon = document.querySelector('.modal-icon');
    const modalBtn = document.getElementById('modalActionBtn');
    
    if (!modalOverlay || !modalTitle || !modalMessage || !modalIcon || !modalBtn) return;
    
    // Set modal content based on type
    if (type === 'error') {
        modalOverlay.querySelector('.modal-card').classList.add('error');
        modalTitle.textContent = 'Error';
        modalIcon.innerHTML = `
            <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="currentColor"/>
                <line x1="15" y1="9" x2="9" y2="15" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="9" y1="9" x2="15" y2="15" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    } else {
        modalOverlay.querySelector('.modal-card').classList.remove('error');
        modalTitle.textContent = 'Notification';
        modalIcon.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" fill="currentColor"/>
                <path d="M12 16v-4" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <circle cx="12" cy="8" r="0.5" fill="white"/>
            </svg>
        `;
    }
    
    modalMessage.textContent = message;
    
    // Set redirect URL if provided
    if (redirectUrl) {
        modalBtn.textContent = 'Go to Login';
        modalBtn.dataset.redirect = redirectUrl;
    } else {
        modalBtn.textContent = 'OK';
        modalBtn.dataset.redirect = '';
    }
    
    // Show modal
    modalOverlay.classList.add('show');
}

// Function to hide modal
function hideModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('show');
    }
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
    .toast {
        position: fixed;
        bottom: calc(20px + var(--safe-area-bottom));
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: rgba(255, 255, 255, 0.95);
        color: var(--dark);
        padding: 14px 24px;
        border-radius: 50px;
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        font-weight: 500;
        transition: transform 0.3s ease, opacity 0.3s ease;
        max-width: 85%;
        text-align: center;
        backdrop-filter: blur(12px);
        border: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .toast svg {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        fill: var(--primary);
    }
    .toast.success {
        background: rgba(46, 204, 113, 0.95);
        color: white;
    }
    .toast.success svg {
        fill: white;
    }
    .toast.error {
        background: rgba(231, 76, 60, 0.95);
        color: white;
    }
    .toast.error svg {
        fill: white;
    }
`;
document.head.appendChild(style);
