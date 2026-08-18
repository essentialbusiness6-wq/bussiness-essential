// // document.addEventListener('DOMContentLoaded', function() {

// //     const theme = document.body.dataset.theme;
// //     if (theme) {
// //         applyTheme(theme);
// //     }
// //     // Initialize particles background
// //     createParticles();
    
// //     // Set up event listeners
// //     setupEventListeners();
    
// //     // Add entrance animations
// //     addEntranceAnimations();

    
// // });


// // function applyTheme(theme) {
// //     const body = document.body;

// //     if (theme === "dark") {
// //         body.classList.add("dark");
// //         body.classList.remove("light");
// //     } else {
// //         body.classList.remove("dark");
// //         body.classList.add("light");
// //     }

// //     // optional: persist it
// //     localStorage.setItem("theme", theme);
// // }
// // async function generateInvoicePDF(invoiceData) {

// //     try {

// //         const { jsPDF } = window.jspdf;

// //         const pdf = new jsPDF({
// //             orientation: "portrait",
// //             unit: "mm",
// //             format: "a4"
// //         });

// //         const pageWidth =
// //             pdf.internal.pageSize.getWidth();

// //         const primaryColor = [67, 97, 238];
// //         const darkColor = [33, 37, 41];
// //         const lightGray = [120, 120, 120];

// //         // =========================
// //         // COMPANY
// //         // =========================

// //         pdf.setFont("helvetica", "bold");
// //         pdf.setTextColor(...primaryColor);
// //         pdf.setFontSize(24);

// //         pdf.text(
// //             invoiceData.companyName || "Business Essential",
// //             20,
// //             25
// //         );

// //         pdf.setFontSize(10);
// //         pdf.setFont("helvetica", "normal");
// //         pdf.setTextColor(...lightGray);

// //         let companyY = 35;

// //         [
// //             invoiceData.companyAddress,
// //             invoiceData.companyEmail,
// //             invoiceData.companyPhone,
// //             invoiceData.companyWebsite
// //         ].forEach(line => {

// //             if (line) {

// //                 pdf.text(
// //                     String(line),
// //                     20,
// //                     companyY
// //                 );

// //                 companyY += 5;
// //             }

// //         });

// //         // =========================
// //         // TITLE
// //         // =========================

// //         pdf.setTextColor(...darkColor);
// //         pdf.setFont("helvetica", "bold");
// //         pdf.setFontSize(22);

// //         pdf.text(
// //             "TAX INVOICE",
// //             pageWidth - 20,
// //             25,
// //             {
// //                 align: "right"
// //             }
// //         );

// //         pdf.setTextColor(...primaryColor);

// //         pdf.setFontSize(14);

// //         pdf.text(
// //             invoiceData.invoiceNumber,
// //             pageWidth - 20,
// //             35,
// //             {
// //                 align: "right"
// //             }
// //         );

// //         // =========================
// //         // META
// //         // =========================

// //         pdf.setTextColor(...darkColor);

// //         pdf.setFontSize(10);

// //         pdf.text(
// //             `Invoice Date: ${invoiceData.invoiceDate}`,
// //             pageWidth - 20,
// //             48,
// //             {
// //                 align: "right"
// //             }
// //         );

// //         pdf.text(
// //             `Due Date: ${invoiceData.dueDate}`,
// //             pageWidth - 20,
// //             55,
// //             {
// //                 align: "right"
// //             }
// //         );

// //         pdf.text(
// //             `Status: ${invoiceData.status}`,
// //             pageWidth - 20,
// //             62,
// //             {
// //                 align: "right"
// //             }
// //         );

// //         // =========================
// //         // BILL TO
// //         // =========================

// //         pdf.setDrawColor(220);

// //         pdf.line(
// //             20,
// //             75,
// //             pageWidth - 20,
// //             75
// //         );

// //         pdf.setFont("helvetica", "bold");
// //         pdf.setFontSize(12);

// //         pdf.text(
// //             "BILLED TO",
// //             20,
// //             85
// //         );

// //         pdf.setFont("helvetica", "normal");
// //         pdf.setFontSize(10);

// //         pdf.text(
// //             invoiceData.clientName || "",
// //             20,
// //             93
// //         );

// //         pdf.text(
// //             invoiceData.clientEmail || "",
// //             20,
// //             100
// //         );

// //         if (invoiceData.clientAddress) {

// //             const addressLines =
// //                 pdf.splitTextToSize(
// //                     invoiceData.clientAddress,
// //                     70
// //                 );

// //             pdf.text(
// //                 addressLines,
// //                 20,
// //                 107
// //             );
// //         }

// //         // =========================
// //         // INVOICE DETAILS
// //         // =========================

// //         pdf.setFont("helvetica", "bold");

// //         pdf.text(
// //             "INVOICE DETAILS",
// //             120,
// //             85
// //         );

// //         pdf.setFont("helvetica", "normal");

// //         pdf.text(
// //             `Client ID: CL-${invoiceData.clientId}`,
// //             120,
// //             95
// //         );

// //         pdf.text(
// //             `Payment Terms: ${invoiceData.paymentTerms}`,
// //             120,
// //             102
// //         );

// //         pdf.text(
// //             `Status: ${invoiceData.status}`,
// //             120,
// //             109
// //         );

// //         // =========================
// //         // ITEMS TABLE
// //         // =========================

// //         pdf.autoTable({

// //             startY: 125,

// //             head: [[
// //                 "Description",
// //                 "Qty",
// //                 "Unit Price",
// //                 "Amount"
// //             ]],

// //             body: invoiceData.items.map(item => [

// //                 item.desc,

// //                 item.qty,

// //                 `${invoiceData.currencySymbol}${Number(item.price).toFixed(2)}`,

// //                 `${invoiceData.currencySymbol}${Number(item.total).toFixed(2)}`
// //             ]),

// //             theme: "grid",

// //             headStyles: {
// //                 fillColor: primaryColor,
// //                 textColor: 255,
// //                 fontStyle: "bold"
// //             },

// //             styles: {
// //                 fontSize: 10,
// //                 cellPadding: 4
// //             }
// //         });

// //         // =========================
// //         // TOTALS
// //         // =========================

// //         const finalY =
// //             pdf.lastAutoTable.finalY + 15;

// //         pdf.setFontSize(11);

// //         pdf.text(
// //             "Subtotal:",
// //             130,
// //             finalY
// //         );

// //         pdf.text(
// //             `${invoiceData.currencySymbol}${Number(invoiceData.subtotal).toFixed(2)}`,
// //             pageWidth - 20,
// //             finalY,
// //             {
// //                 align: "right"
// //             }
// //         );

// //         pdf.text(
// //             `Tax (${invoiceData.tax}%):`,
// //             130,
// //             finalY + 8
// //         );

// //         pdf.text(
// //             `${invoiceData.currencySymbol}${Number(invoiceData.taxAmount).toFixed(2)}`,
// //             pageWidth - 20,
// //             finalY + 8,
// //             {
// //                 align: "right"
// //             }
// //         );

// //         pdf.setDrawColor(...primaryColor);

// //         pdf.line(
// //             130,
// //             finalY + 14,
// //             pageWidth - 20,
// //             finalY + 14
// //         );

// //         pdf.setTextColor(...primaryColor);

// //         pdf.setFontSize(16);
// //         pdf.setFont("helvetica", "bold");

// //         pdf.text(
// //             "TOTAL",
// //             130,
// //             finalY + 25
// //         );

// //         pdf.text(
// //             `${invoiceData.currencySymbol}${Number(invoiceData.totalAmount).toFixed(2)}`,
// //             pageWidth - 20,
// //             finalY + 25,
// //             {
// //                 align: "right"
// //             }
// //         );

// //         // =========================
// //         // PAYMENT INFO
// //         // =========================

// //         let footerY = finalY + 45;

// //         pdf.setTextColor(...darkColor);

// //         pdf.setFontSize(12);

// //         pdf.text(
// //             "Payment Information",
// //             20,
// //             footerY
// //         );

// //         pdf.setFontSize(10);

// //         const paymentText =
// //             "Payment is due within 30 days of the invoice date. This invoice has been paid in full via your Business Essential account.";

// //         pdf.text(
// //             pdf.splitTextToSize(
// //                 paymentText,
// //                 170
// //             ),
// //             20,
// //             footerY + 8
// //         );

// //         footerY += 30;

// //         pdf.setFont("helvetica", "bold");

// //         pdf.text(
// //             "Questions?",
// //             20,
// //             footerY
// //         );

// //         pdf.setFont("helvetica", "normal");

// //         pdf.text(
// //             "billing@businesse.com",
// //             20,
// //             footerY + 8
// //         );

// //         pdf.text(
// //             "+1 (800) 555-0199",
// //             20,
// //             footerY + 15
// //         );

// //         // =========================
// //         // THANK YOU
// //         // =========================

// //         pdf.setTextColor(...primaryColor);

// //         pdf.setFontSize(12);
// //         pdf.setFont("helvetica", "bold");

// //         pdf.text(
// //             "Thank you for powering your business with Business Essential!",
// //             pageWidth / 2,
// //             280,
// //             {
// //                 align: "center"
// //             }
// //         );

// //         pdf.save(
// //             `${invoiceData.invoiceNumber}.pdf`
// //         );

// //     }
// //     catch (error) {

// //         console.error(error);

// //         showToast(
// //             "Failed to generate PDF",
// //             "error"
// //         );

// //     }

// // }

// // function downloadPDF() {

// //     generateInvoicePDF(invoiceData);

// // }


// // // Function to create floating particles in the background
// // function createParticles() {
// //     const particlesContainer = document.getElementById('particles');
// //     if (!particlesContainer) return;
    
// //     const particleCount = window.innerWidth > 768 ? 40 : 25;
    
// //     for (let i = 0; i < particleCount; i++) {
// //         const particle = document.createElement('div');
// //         particle.classList.add('particle');
        
// //         // Random size between 2px and 8px
// //         const size = Math.random() * 6 + 2;
// //         particle.style.width = `${size}px`;
// //         particle.style.height = `${size}px`;
        
// //         // Random position
// //         particle.style.left = `${Math.random() * 100}%`;
// //         particle.style.top = `${Math.random() * 100}%`;
        
// //         // Random animation duration and delay
// //         const duration = Math.random() * 15 + 20;
// //         const delay = Math.random() * 5;
// //         particle.style.animationDuration = `${duration}s`;
// //         particle.style.animationDelay = `${delay}s`;
        
// //         // Random opacity
// //         particle.style.opacity = `${Math.random() * 0.3 + 0.1}`;
        
// //         particlesContainer.appendChild(particle);
// //     }
// // }

// // // Function to set up all event listeners
// // function setupEventListeners() {
// //     // Back button
// //     const backBtn = document.getElementById('backBtn');
// //     if (backBtn) {
// //         backBtn.addEventListener('click', () => {
// //             showHapticFeedback(backBtn);
// //             // In a real app, this would navigate back
// //             window.history.back();
// //         });
// //     }
    
// //     // Print button
// //     const printBtn = document.getElementById('printBtn');
// //     if (printBtn) {
// //         printBtn.addEventListener('click', () => {
// //             showHapticFeedback(printBtn);
// //             showToast('🖨️ Preparing invoice for printing...');
            
// //             setTimeout(() => {
// //                 showToast('✓ Print dialog opened', 'success');
// //                 // In a real app: window.print();
// //             }, 1200);
// //         });
// //     }
    
// //     // Download button
// // const downloadBtn = document.getElementById('downloadBtn');

// // if (downloadBtn) {
// //     downloadBtn.addEventListener('click', () => {
// //         showHapticFeedback(downloadBtn);

// //         const originalContent = downloadBtn.innerHTML;
// //         const oldTitle = document.title;

// //         downloadBtn.disabled = true;

// //         // loading spinner
// //         downloadBtn.innerHTML = `
// //             <svg viewBox="0 0 24 24"
// //                 style="animation: spin 1s linear infinite; width: 20px; height: 20px;">
// //                 <path d="M12 2v6m0 10v6M4.93 4.93l4.24 4.24m8.49-8.49l4.24 4.24M1.5 12h6m10 0h6M4.93 19.07l4.24-4.24m8.49 8.49l4.24-4.24"
// //                 fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
// //             </svg>
// //         `;

// //         // set invoice title for print
// //         document.title = invoiceNumber;

// //         // small delay ensures DOM updates before print capture
// //         setTimeout(() => {
            
// //             downloadPDF()
// //             // restore after print dialog closes
// //             setTimeout(() => {
// //                 document.title = oldTitle;
// //                 downloadBtn.disabled = false;
// //                 downloadBtn.innerHTML = originalContent;
// //             }, 800);

// //         }, 50);
// //     });
// // }

    
// //     // Share button
// //     const shareBtn = document.getElementById('shareBtn');
// //     if (shareBtn) {
// //         shareBtn.addEventListener('click', () => {
// //             showHapticFeedback(shareBtn);
// //             showToast('📤 Sharing invoice...');
            
// //             setTimeout(() => {
// //                 showToast('✓ Invoice shared successfully!', 'success');
// //             }, 1000);
// //         });
// //     }
    
// //     // Pay button
// //     const payBtn = document.getElementById('payBtn');
// //     if (payBtn) {
// //         payBtn.addEventListener('click', () => {
// //             showHapticFeedback(payBtn);
// //             showToast('✓ This invoice has already been paid', 'success');
// //         });
// //     }
    
// //     // Email button
// //     const emailBtn = document.getElementById('emailBtn');
// //     if (emailBtn) {
// //         emailBtn.addEventListener('click', () => {
// //             showHapticFeedback(emailBtn);
// //             showToast('📧 Sending email copy...');
            
// //             setTimeout(() => {
// //                 showToast('✓ Email sent successfully!', 'success');
// //             }, 1500);
// //         });
// //     }
    
// //     // Close modal button
// //     const closeModal = document.getElementById('closeModal');
// //     if (closeModal) {
// //         closeModal.addEventListener('click', hideModal);
// //     }
    
// //     // Modal overlay click to close
// //     const modalOverlay = document.getElementById('modalOverlay');
// //     if (modalOverlay) {
// //         modalOverlay.addEventListener('click', (e) => {
// //             if (e.target === modalOverlay) {
// //                 hideModal();
// //             }
// //         });
// //     }
    
// //     // Modal action button
// //     const modalActionBtn = document.getElementById('modalActionBtn');
// //     if (modalActionBtn) {
// //         modalActionBtn.addEventListener('click', () => {
// //             const redirectUrl = modalActionBtn.dataset.redirect;
// //             if (redirectUrl) {
// //                 window.location.href = redirectUrl;
// //             } else {
// //                 hideModal();
// //             }
// //         });
// //     }
// // }

// // // Function to add entrance animations
// // function addEntranceAnimations() {
// //     setTimeout(() => {
// //         document.querySelector('.invoice-card').style.opacity = '0';
// //         document.querySelector('.invoice-card').style.transform = 'translateY(20px)';
// //         setTimeout(() => {
// //             document.querySelector('.invoice-card').style.transition = 'opacity 0.5s ease, transform 0.5s ease';
// //             document.querySelector('.invoice-card').style.opacity = '1';
// //             document.querySelector('.invoice-card').style.transform = 'translateY(0)';
// //         }, 300);
        
// //         document.querySelectorAll('.detail-section').forEach((section, index) => {
// //             section.style.opacity = '0';
// //             section.style.transform = 'translateX(-20px)';
// //             setTimeout(() => {
// //                 section.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
// //                 section.style.opacity = '1';
// //                 section.style.transform = 'translateX(0)';
// //             }, 600 + index * 150);
// //         });
        
// //         document.querySelector('.total-section').style.opacity = '0';
// //         document.querySelector('.total-section').style.transform = 'translateY(20px)';
// //         setTimeout(() => {
// //             document.querySelector('.total-section').style.transition = 'opacity 0.4s ease, transform 0.4s ease';
// //             document.querySelector('.total-section').style.opacity = '1';
// //             document.querySelector('.total-section').style.transform = 'translateY(0)';
// //         }, 900);
        
// //         document.querySelector('.invoice-footer').style.opacity = '0';
// //         document.querySelector('.invoice-footer').style.transform = 'translateY(20px)';
// //         setTimeout(() => {
// //             document.querySelector('.invoice-footer').style.transition = 'opacity 0.4s ease, transform 0.4s ease';
// //             document.querySelector('.invoice-footer').style.opacity = '1';
// //             document.querySelector('.invoice-footer').style.transform = 'translateY(0)';
// //         }, 1000);
// //     }, 300);
// // }

// // // Function to show haptic feedback animation
// // function showHapticFeedback(element) {
// //     if (!element) return;
    
// //     element.classList.add('haptic-feedback');
// //     setTimeout(() => {
// //         element.classList.remove('haptic-feedback');
// //     }, 200);
// // }

// // // Function to show toast notification
// // function showToast(message, type = 'info') {
// //     // Remove existing toast
// //     const existingToast = document.querySelector('.toast');
// //     if (existingToast) {
// //         existingToast.remove();
// //     }
    
// //     // Create new toast
// //     const toast = document.createElement('div');
// //     toast.className = `toast ${type === 'success' || type === 'error' ? type : ''}`;
// //     toast.innerHTML = `
// //         ${type === 'success' ? `
// //         <svg viewBox="0 0 24 24">
// //             <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
// //         </svg>
// //         ` : type === 'error' ? `
// //         <svg viewBox="0 0 24 24">
// //             <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
// //             <line x1="15" y1="9" x2="9" y2="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
// //             <line x1="9" y1="9" x2="15" y2="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
// //         </svg>
// //         ` : `
// //         <svg viewBox="0 0 24 24">
// //             <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
// //             <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
// //             <line x1="12" y1="17" x2="12.01" y2="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
// //         </svg>
// //         `}
// //         ${message}
// //     `;
    
// //     document.body.appendChild(toast);
    
// //     // Animate in
// //     setTimeout(() => {
// //         toast.style.transform = 'translateX(-50%) translateY(0)';
// //     }, 10);
    
// //     // Animate out and remove
// //     setTimeout(() => {
// //         toast.style.transform = 'translateX(-50%) translateY(100px)';
// //         toast.style.opacity = '0';
// //         setTimeout(() => {
// //             toast.remove();
// //         }, 300);
// //     }, 2800);
// // }

// // // Function to show modal
// // function showModal(type, message, redirectUrl = null) {
// //     const modalOverlay = document.getElementById('modalOverlay');
// //     const modalTitle = document.getElementById('modalTitle');
// //     const modalMessage = document.getElementById('modalMessage');
// //     const modalIcon = document.querySelector('.modal-icon');
// //     const modalBtn = document.getElementById('modalActionBtn');
    
// //     if (!modalOverlay || !modalTitle || !modalMessage || !modalIcon || !modalBtn) return;
    
// //     // Set modal content based on type
// //     if (type === 'error') {
// //         modalOverlay.querySelector('.modal-card').classList.add('error');
// //         modalTitle.textContent = 'Error';
// //         modalIcon.innerHTML = `
// //             <svg viewBox="0 0 24 24">
// //                 <circle cx="12" cy="12" r="10" fill="currentColor"/>
// //                 <line x1="15" y1="9" x2="9" y2="15" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
// //                 <line x1="9" y1="9" x2="15" y2="15" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
// //             </svg>
// //         `;
// //     } else {
// //         modalOverlay.querySelector('.modal-card').classList.remove('error');
// //         modalTitle.textContent = 'Notification';
// //         modalIcon.innerHTML = `
// //             <svg viewBox="0 0 24 24">
// //                 <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" fill="currentColor"/>
// //                 <path d="M12 16v-4" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>
// //                 <circle cx="12" cy="8" r="0.5" fill="white"/>
// //             </svg>
// //         `;
// //     }
    
// //     modalMessage.textContent = message;
    
// //     // Set redirect URL if provided
// //     if (redirectUrl) {
// //         modalBtn.textContent = 'Go to Login';
// //         modalBtn.dataset.redirect = redirectUrl;
// //     } else {
// //         modalBtn.textContent = 'OK';
// //         modalBtn.dataset.redirect = '';
// //     }
    
// //     // Show modal
// //     modalOverlay.classList.add('show');
// // }

// // // Function to hide modal
// // function hideModal() {
// //     const modalOverlay = document.getElementById('modalOverlay');
// //     if (modalOverlay) {
// //         modalOverlay.classList.remove('show');
// //     }
// // }

// // // Add CSS animations
// // const style = document.createElement('style');
// // style.innerHTML = `
// //     @keyframes spin {
// //         0% { transform: rotate(0deg); }
// //         100% { transform: rotate(360deg); }
// //     }
// //     @keyframes haptic {
// //         0% { transform: translateX(0); }
// //         25% { transform: translateX(-2px); }
// //         50% { transform: translateX(2px); }
// //         75% { transform: translateX(-2px); }
// //         100% { transform: translateX(0); }
// //     }
// //     .haptic-feedback {
// //         animation: haptic 0.15s ease-in-out;
// //     }
// //     .toast {
// //         position: fixed;
// //         bottom: calc(20px + var(--safe-area-bottom));
// //         left: 50%;
// //         transform: translateX(-50%) translateY(100px);
// //         background: rgba(255, 255, 255, 0.95);
// //         color: var(--dark);
// //         padding: 14px 24px;
// //         border-radius: 50px;
// //         box-shadow: var(--shadow-lg);
// //         z-index: 1000;
// //         font-weight: 500;
// //         transition: transform 0.3s ease, opacity 0.3s ease;
// //         max-width: 85%;
// //         text-align: center;
// //         backdrop-filter: blur(12px);
// //         border: 1px solid var(--border-color);
// //         display: flex;
// //         align-items: center;
// //         gap: 10px;
// //     }
// //     .toast svg {
// //         width: 20px;
// //         height: 20px;
// //         flex-shrink: 0;
// //         fill: var(--primary);
// //     }
// //     .toast.success {
// //         background: rgba(46, 204, 113, 0.95);
// //         color: white;
// //     }
// //     .toast.success svg {
// //         fill: white;
// //     }
// //     .toast.error {
// //         background: rgba(231, 76, 60, 0.95);
// //         color: white;
// //     }
// //     .toast.error svg {
// //         fill: white;
// //     }
// // `;
// // document.head.appendChild(style);

// document.addEventListener('DOMContentLoaded', function () {

//     const theme = document.body.dataset.theme;
//     if (theme) {
//         applyTheme(theme);
//     }

//     // Initialize particles background
//     createParticles();

//     // Set up event listeners
//     setupEventListeners();

//     // Add entrance animations
//     addEntranceAnimations();

// });

// function applyTheme(theme) {
//     const body = document.body;

//     if (theme === "dark") {
//         body.classList.add("dark");
//         body.classList.remove("light");
//     } else {
//         body.classList.remove("dark");
//         body.classList.add("light");
//     }

//     // optional: persist it
//     localStorage.setItem("theme", theme);
// }

// /* =========================================================
//    STATUS COLOR HELPERS
//    ========================================================= */

// function getStatusColors(status) {
//     const key = String(status || '').toLowerCase();

//     const palette = {
//         paid: { fill: [46, 204, 113], text: [255, 255, 255] },
//         pending: { fill: [243, 156, 18], text: [255, 255, 255] },
//         overdue: { fill: [231, 76, 60], text: [255, 255, 255] },
//         draft: { fill: [149, 165, 166], text: [255, 255, 255] },
//         cancelled: { fill: [149, 165, 166], text: [255, 255, 255] }
//     };

//     return palette[key] || { fill: [67, 97, 238], text: [255, 255, 255] };
// }

// function formatMoney(symbol, value) {
//     const n = Number(value || 0);
//     return `${symbol || ''}${n.toFixed(2)}`;
// }

// function sanitizeFilename(name) {
//     return String(name || 'invoice').replace(/[^a-z0-9\-_]+/gi, '_');
// }

// /* =========================================================
//    PDF GENERATION
//    ========================================================= */

// async function generateInvoicePDF(invoiceData) {

//     try {

//         const { jsPDF } = window.jspdf;

//         const pdf = new jsPDF({
//             orientation: "portrait",
//             unit: "mm",
//             format: "a4"
//         });

//         const pageWidth = pdf.internal.pageSize.getWidth();
//         const pageHeight = pdf.internal.pageSize.getHeight();
//         const marginX = 20;

//         const primaryColor = [67, 97, 238];
//         const darkColor = [33, 37, 41];
//         const lightGray = [120, 120, 120];
//         const borderColor = [225, 225, 230];

//         const statusColors = getStatusColors(invoiceData.status);
//         const currency = invoiceData.currencySymbol || '';

//         // =========================
//         // WATERMARK (if paid)
//         // =========================
//         if (String(invoiceData.status || '').toLowerCase() === 'paid') {
//             pdf.saveGraphicsState();
//             pdf.setGState(new pdf.GState({ opacity: 0.08 }));
//             pdf.setTextColor(...primaryColor);
//             pdf.setFont("helvetica", "bold");
//             pdf.setFontSize(80);
//             pdf.text("PAID", pageWidth / 2, pageHeight / 2, {
//                 align: "center",
//                 angle: 30
//             });
//             pdf.restoreGraphicsState();
//         }

//         // =========================
//         // PLATFORM BRAND (top strip)
//         // =========================
//         pdf.setFont("helvetica", "bold");
//         pdf.setTextColor(...primaryColor);
//         pdf.setFontSize(11);
//         pdf.text("Business Essentials Prime", marginX, 14);

//         pdf.setDrawColor(...borderColor);
//         pdf.line(marginX, 18, pageWidth - marginX, 18);

//         // =========================
//         // COMPANY (issuer) NAME + TITLE
//         // =========================
//         pdf.setFont("helvetica", "bold");
//         pdf.setTextColor(...darkColor);
//         pdf.setFontSize(20);
//         pdf.text(invoiceData.companyName || "Your Company", marginX, 30);

//         pdf.setFont("helvetica", "normal");
//         pdf.setFontSize(9.5);
//         pdf.setTextColor(...lightGray);

//         let companyY = 37;
//         [
//             invoiceData.companyAddress,
//             invoiceData.companyEmail,
//             invoiceData.companyPhone,
//             invoiceData.companyWebsite
//         ].forEach(line => {
//             if (line) {
//                 const wrapped = pdf.splitTextToSize(String(line), 85);
//                 pdf.text(wrapped, marginX, companyY);
//                 companyY += 5 * wrapped.length;
//             }
//         });

//         pdf.setTextColor(...darkColor);
//         pdf.setFont("helvetica", "bold");
//         pdf.setFontSize(22);
//         pdf.text("TAX INVOICE", pageWidth - marginX, 27, { align: "right" });

//         pdf.setTextColor(...primaryColor);
//         pdf.setFontSize(13);
//         pdf.text(invoiceData.invoiceNumber || "", pageWidth - marginX, 35, { align: "right" });

//         pdf.setTextColor(...darkColor);
//         pdf.setFont("helvetica", "normal");
//         pdf.setFontSize(9.5);
//         pdf.text(`Invoice Date: ${invoiceData.invoiceDate || ''}`, pageWidth - marginX, 43, { align: "right" });
//         pdf.text(`Due Date: ${invoiceData.dueDate || ''}`, pageWidth - marginX, 49, { align: "right" });

//         // Status badge (pill)
//         const statusLabel = String(invoiceData.status || '').toUpperCase();
//         pdf.setFontSize(9);
//         const badgeWidth = pdf.getTextWidth(statusLabel) + 10;
//         const badgeX = pageWidth - marginX - badgeWidth;
//         const badgeY = 53;

//         pdf.setFillColor(...statusColors.fill);
//         pdf.roundedRect(badgeX, badgeY, badgeWidth, 7, 3.5, 3.5, "F");
//         pdf.setTextColor(...statusColors.text);
//         pdf.setFont("helvetica", "bold");
//         pdf.text(statusLabel, badgeX + badgeWidth / 2, badgeY + 4.8, { align: "center" });

//         // =========================
//         // BILLED FROM / BILLED TO
//         // =========================
//         const sectionTop = Math.max(companyY + 6, 68);

//         pdf.setDrawColor(...borderColor);
//         pdf.line(marginX, sectionTop, pageWidth - marginX, sectionTop);

//         const colY = sectionTop + 10;

//         pdf.setFont("helvetica", "bold");
//         pdf.setFontSize(10.5);
//         pdf.setTextColor(...primaryColor);
//         pdf.text("BILLED FROM", marginX, colY);
//         pdf.text("BILLED TO", 115, colY);

//         pdf.setFont("helvetica", "normal");
//         pdf.setFontSize(9.5);
//         pdf.setTextColor(...darkColor);

//         let fromY = colY + 7;
//         pdf.setFont("helvetica", "bold");
//         pdf.text(invoiceData.companyName || "", marginX, fromY);
//         pdf.setFont("helvetica", "normal");
//         fromY += 5;
//         [invoiceData.companyEmail, invoiceData.companyPhone].forEach(line => {
//             if (line) {
//                 pdf.text(String(line), marginX, fromY);
//                 fromY += 5;
//             }
//         });

//         let toY = colY + 7;
//         pdf.setFont("helvetica", "bold");
//         pdf.text(invoiceData.clientName || "", 115, toY);
//         pdf.setFont("helvetica", "normal");
//         toY += 5;
//         if (invoiceData.clientEmail) {
//             pdf.text(String(invoiceData.clientEmail), 115, toY);
//             toY += 5;
//         }
//         if (invoiceData.clientAddress) {
//             const addrLines = pdf.splitTextToSize(String(invoiceData.clientAddress), 75);
//             pdf.text(addrLines, 115, toY);
//             toY += 5 * addrLines.length;
//         }

//         // =========================
//         // INVOICE DETAILS STRIP
//         // =========================
//         const detailsY = Math.max(fromY, toY) + 6;

//         pdf.setDrawColor(...borderColor);
//         pdf.line(marginX, detailsY, pageWidth - marginX, detailsY);

//         const detailRowY = detailsY + 8;
//         pdf.setFont("helvetica", "bold");
//         pdf.setFontSize(8.5);
//         pdf.setTextColor(...lightGray);
//         pdf.text("CLIENT ID", marginX, detailRowY);
//         pdf.text("PAYMENT TERMS", marginX + 55, detailRowY);
//         pdf.text("STATUS", marginX + 115, detailRowY);

//         pdf.setFont("helvetica", "normal");
//         pdf.setFontSize(10);
//         pdf.setTextColor(...darkColor);
//         pdf.text(`CL-${invoiceData.clientId || ''}`, marginX, detailRowY + 6);
//         pdf.text(String(invoiceData.paymentTerms || ''), marginX + 55, detailRowY + 6);
//         pdf.text(statusLabel, marginX + 115, detailRowY + 6);

//         // =========================
//         // ITEMS TABLE
//         // =========================
//         const tableStartY = detailRowY + 14;

//         pdf.autoTable({
//             startY: tableStartY,
//             head: [["Description", "Qty", "Unit Price", "Amount"]],
//             body: (invoiceData.items || []).map(item => [
//                 item.desc || '',
//                 item.qty,
//                 formatMoney(currency, item.price),
//                 formatMoney(currency, item.total)
//             ]),
//             theme: "grid",
//             headStyles: {
//                 fillColor: primaryColor,
//                 textColor: 255,
//                 fontStyle: "bold",
//                 fontSize: 9.5
//             },
//             styles: {
//                 fontSize: 9.5,
//                 cellPadding: 4,
//                 textColor: darkColor
//             },
//             columnStyles: {
//                 1: { halign: "center", cellWidth: 20 },
//                 2: { halign: "right", cellWidth: 35 },
//                 3: { halign: "right", cellWidth: 35 }
//             },
//             margin: { left: marginX, right: marginX }
//         });

//         // =========================
//         // TOTALS
//         // =========================
//         let finalY = pdf.lastAutoTable.finalY + 12;

//         // keep totals block on the same page if possible
//         if (finalY > pageHeight - 90) {
//             pdf.addPage();
//             finalY = 25;
//         }

//         const totalsLabelX = pageWidth - marginX - 70;

//         pdf.setFontSize(10);
//         pdf.setFont("helvetica", "normal");
//         pdf.setTextColor(...darkColor);

//         pdf.text("Subtotal", totalsLabelX, finalY);
//         pdf.text(formatMoney(currency, invoiceData.subtotal), pageWidth - marginX, finalY, { align: "right" });

//         pdf.text(`Tax (${invoiceData.tax || 0}%)`, totalsLabelX, finalY + 7);
//         pdf.text(formatMoney(currency, invoiceData.taxAmount), pageWidth - marginX, finalY + 7, { align: "right" });

//         pdf.setDrawColor(...primaryColor);
//         pdf.line(totalsLabelX, finalY + 12, pageWidth - marginX, finalY + 12);

//         pdf.setFontSize(14);
//         pdf.setFont("helvetica", "bold");
//         pdf.setTextColor(...primaryColor);
//         pdf.text("TOTAL PAID", totalsLabelX, finalY + 22);
//         pdf.text(formatMoney(currency, invoiceData.totalAmount), pageWidth - marginX, finalY + 22, { align: "right" });

//         // =========================
//         // PAYMENT INFO / SUPPORT
//         // =========================
//         let footerY = finalY + 40;

//         if (footerY > pageHeight - 55) {
//             pdf.addPage();
//             footerY = 25;
//         }

//         pdf.setDrawColor(...borderColor);
//         pdf.line(marginX, footerY - 8, pageWidth - marginX, footerY - 8);

//         pdf.setTextColor(...darkColor);
//         pdf.setFont("helvetica", "bold");
//         pdf.setFontSize(10.5);
//         pdf.text("Payment Information", marginX, footerY);

//         pdf.setFont("helvetica", "normal");
//         pdf.setFontSize(9);
//         pdf.setTextColor(...lightGray);
//         const paymentText =
//             `Payment is due within 30 days of the invoice date. This invoice has been paid in full via your Business Essentials Prime account.`;
//         pdf.text(pdf.splitTextToSize(paymentText, 170), marginX, footerY + 6);

//         pdf.setFont("helvetica", "bold");
//         pdf.setTextColor(...darkColor);
//         pdf.setFontSize(10.5);
//         pdf.text("Questions?", marginX, footerY + 22);

//         pdf.setFont("helvetica", "normal");
//         pdf.setFontSize(9);
//         pdf.setTextColor(...lightGray);
//         pdf.text("support@businessessentia.net", marginX, footerY + 28);
//         pdf.text("+234 (802)-604-8215", marginX, footerY + 33);

//         // =========================
//         // THANK YOU + PAGE NUMBERS
//         // =========================
//         const pageCount = pdf.internal.getNumberOfPages();
//         for (let i = 1; i <= pageCount; i++) {
//             pdf.setPage(i);

//             pdf.setFont("helvetica", "italic");
//             pdf.setFontSize(8.5);
//             pdf.setTextColor(...lightGray);
//             pdf.text(
//                 `Generated ${new Date().toLocaleDateString()} • Page ${i} of ${pageCount}`,
//                 pageWidth / 2,
//                 pageHeight - 10,
//                 { align: "center" }
//             );
//         }

//         pdf.setPage(pageCount);
//         pdf.setFont("helvetica", "bold");
//         pdf.setFontSize(10.5);
//         pdf.setTextColor(...primaryColor);
//         pdf.text(
//             "Thank you for powering your business with Business Essentials Prime!",
//             pageWidth / 2,
//             pageHeight - 16,
//             { align: "center" }
//         );

//         pdf.save(`${sanitizeFilename(invoiceData.invoiceNumber)}.pdf`);

//         return true;

//     } catch (error) {
//         console.error(error);
//         showToast("Failed to generate PDF", "error");
//         return false;
//     }
// }

// function downloadPDF() {
//     return generateInvoicePDF(invoiceData);
// }

// /* =========================================================
//    PRINTING
//    ========================================================= */

// function ensurePrintStyles() {
//     if (document.getElementById('invoicePrintStyles')) return;

//     const printStyle = document.createElement('style');
//     printStyle.id = 'invoicePrintStyles';
//     printStyle.media = 'print';
//     printStyle.innerHTML = `
//         @media print {
//             body * {
//                 visibility: hidden;
//             }
//             .invoice-card, .invoice-card * {
//                 visibility: visible;
//             }
//             .invoice-card {
//                 position: absolute;
//                 left: 0;
//                 top: 0;
//                 width: 100%;
//                 box-shadow: none !important;
//                 border: none !important;
//             }
//             .invoice-header,
//             .particles,
//             .toast,
//             .modal-overlay {
//                 display: none !important;
//             }
//         }
//     `;
//     document.head.appendChild(printStyle);
// }

// function printInvoice() {
//     ensurePrintStyles();

//     const oldTitle = document.title;
//     document.title = invoiceData.invoiceNumber || oldTitle;

//     const restoreTitle = () => {
//         document.title = oldTitle;
//         window.removeEventListener('afterprint', restoreTitle);
//     };
//     window.addEventListener('afterprint', restoreTitle);

//     // Give the browser a tick to apply the print stylesheet before printing
//     setTimeout(() => {
//         window.print();
//     }, 50);
// }

// /* =========================================================
//    BACKGROUND PARTICLES
//    ========================================================= */

// function createParticles() {
//     const particlesContainer = document.getElementById('particles');
//     if (!particlesContainer) return;

//     const particleCount = window.innerWidth > 768 ? 40 : 25;

//     for (let i = 0; i < particleCount; i++) {
//         const particle = document.createElement('div');
//         particle.classList.add('particle');

//         const size = Math.random() * 6 + 2;
//         particle.style.width = `${size}px`;
//         particle.style.height = `${size}px`;

//         particle.style.left = `${Math.random() * 100}%`;
//         particle.style.top = `${Math.random() * 100}%`;

//         const duration = Math.random() * 15 + 20;
//         const delay = Math.random() * 5;
//         particle.style.animationDuration = `${duration}s`;
//         particle.style.animationDelay = `${delay}s`;

//         particle.style.opacity = `${Math.random() * 0.3 + 0.1}`;

//         particlesContainer.appendChild(particle);
//     }
// }

// /* =========================================================
//    EVENT LISTENERS
//    ========================================================= */

// function setupEventListeners() {
//     // Back button
//     const backBtn = document.getElementById('backBtn');
//     if (backBtn) {
//         backBtn.addEventListener('click', () => {
//             showHapticFeedback(backBtn);
//             window.history.back();
//         });
//     }

//     // Print button
//     const printBtn = document.getElementById('printBtn');
//     if (printBtn) {
//         printBtn.addEventListener('click', () => {
//             showHapticFeedback(printBtn);
//             showToast('🖨️ Preparing invoice for printing...');

//             setTimeout(() => {
//                 printInvoice();
//             }, 400);
//         });
//     }

//     // Download button
//     const downloadBtn = document.getElementById('downloadBtn');

//     if (downloadBtn) {
//         downloadBtn.addEventListener('click', async () => {
//             showHapticFeedback(downloadBtn);

//             const originalContent = downloadBtn.innerHTML;
//             const oldTitle = document.title;

//             downloadBtn.disabled = true;

//             // loading spinner
//             downloadBtn.innerHTML = `
//                 <svg viewBox="0 0 24 24"
//                     style="animation: spin 1s linear infinite; width: 20px; height: 20px;">
//                     <path d="M12 2v6m0 10v6M4.93 4.93l4.24 4.24m8.49-8.49l4.24 4.24M1.5 12h6m10 0h6M4.93 19.07l4.24-4.24m8.49 8.49l4.24-4.24"
//                     fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
//                 </svg>
//             `;

//             document.title = invoiceData.invoiceNumber || oldTitle;

//             // small delay ensures the spinner renders before the (sync-heavy) PDF build
//             setTimeout(async () => {
//                 const success = await downloadPDF();

//                 document.title = oldTitle;
//                 downloadBtn.disabled = false;
//                 downloadBtn.innerHTML = originalContent;

//                 if (success) {
//                     showToast('✓ Invoice downloaded', 'success');
//                 }
//             }, 50);
//         });
//     }

//     // Share button
//     const shareBtn = document.getElementById('shareBtn');
//     if (shareBtn) {
//         shareBtn.addEventListener('click', () => {
//             showHapticFeedback(shareBtn);
//             showToast('📤 Sharing invoice...');

//             setTimeout(() => {
//                 showToast('✓ Invoice shared successfully!', 'success');
//             }, 1000);
//         });
//     }

//     // Pay button
//     const payBtn = document.getElementById('payBtn');
//     if (payBtn) {
//         payBtn.addEventListener('click', () => {
//             showHapticFeedback(payBtn);
//             showToast('✓ This invoice has already been paid', 'success');
//         });
//     }

//     // Email button
//     const emailBtn = document.getElementById('emailBtn');
//     if (emailBtn) {
//         emailBtn.addEventListener('click', () => {
//             showHapticFeedback(emailBtn);
//             showToast('📧 Sending email copy...');

//             setTimeout(() => {
//                 showToast('✓ Email sent successfully!', 'success');
//             }, 1500);
//         });
//     }

//     // Close modal button
//     const closeModal = document.getElementById('closeModal');
//     if (closeModal) {
//         closeModal.addEventListener('click', hideModal);
//     }

//     // Modal overlay click to close
//     const modalOverlay = document.getElementById('modalOverlay');
//     if (modalOverlay) {
//         modalOverlay.addEventListener('click', (e) => {
//             if (e.target === modalOverlay) {
//                 hideModal();
//             }
//         });
//     }

//     // Modal action button
//     const modalActionBtn = document.getElementById('modalActionBtn');
//     if (modalActionBtn) {
//         modalActionBtn.addEventListener('click', () => {
//             const redirectUrl = modalActionBtn.dataset.redirect;
//             if (redirectUrl) {
//                 window.location.href = redirectUrl;
//             } else {
//                 hideModal();
//             }
//         });
//     }
// }

// /* =========================================================
//    ENTRANCE ANIMATIONS
//    ========================================================= */

// function addEntranceAnimations() {
//     setTimeout(() => {
//         const card = document.querySelector('.invoice-card');
//         if (card) {
//             card.style.opacity = '0';
//             card.style.transform = 'translateY(20px)';
//             setTimeout(() => {
//                 card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
//                 card.style.opacity = '1';
//                 card.style.transform = 'translateY(0)';
//             }, 300);
//         }

//         document.querySelectorAll('.detail-section').forEach((section, index) => {
//             section.style.opacity = '0';
//             section.style.transform = 'translateX(-20px)';
//             setTimeout(() => {
//                 section.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
//                 section.style.opacity = '1';
//                 section.style.transform = 'translateX(0)';
//             }, 600 + index * 150);
//         });

//         const totalSection = document.querySelector('.total-section');
//         if (totalSection) {
//             totalSection.style.opacity = '0';
//             totalSection.style.transform = 'translateY(20px)';
//             setTimeout(() => {
//                 totalSection.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
//                 totalSection.style.opacity = '1';
//                 totalSection.style.transform = 'translateY(0)';
//             }, 900);
//         }

//         const footer = document.querySelector('.invoice-footer');
//         if (footer) {
//             footer.style.opacity = '0';
//             footer.style.transform = 'translateY(20px)';
//             setTimeout(() => {
//                 footer.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
//                 footer.style.opacity = '1';
//                 footer.style.transform = 'translateY(0)';
//             }, 1000);
//         }
//     }, 300);
// }

// function showHapticFeedback(element) {
//     if (!element) return;

//     element.classList.add('haptic-feedback');
//     setTimeout(() => {
//         element.classList.remove('haptic-feedback');
//     }, 200);
// }

// /* =========================================================
//    TOAST
//    ========================================================= */

// function showToast(message, type = 'info') {
//     const existingToast = document.querySelector('.toast');
//     if (existingToast) {
//         existingToast.remove();
//     }

//     const toast = document.createElement('div');
//     toast.className = `toast ${type === 'success' || type === 'error' ? type : ''}`;
//     toast.innerHTML = `
//         ${type === 'success' ? `
//         <svg viewBox="0 0 24 24">
//             <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
//         </svg>
//         ` : type === 'error' ? `
//         <svg viewBox="0 0 24 24">
//             <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
//             <line x1="15" y1="9" x2="9" y2="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
//             <line x1="9" y1="9" x2="15" y2="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
//         </svg>
//         ` : `
//         <svg viewBox="0 0 24 24">
//             <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
//             <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
//             <line x1="12" y1="17" x2="12.01" y2="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
//         </svg>
//         `}
//         ${message}
//     `;

//     document.body.appendChild(toast);

//     setTimeout(() => {
//         toast.style.transform = 'translateX(-50%) translateY(0)';
//     }, 10);

//     setTimeout(() => {
//         toast.style.transform = 'translateX(-50%) translateY(100px)';
//         toast.style.opacity = '0';
//         setTimeout(() => {
//             toast.remove();
//         }, 300);
//     }, 2800);
// }

// /* =========================================================
//    MODAL
//    ========================================================= */

// function showModal(type, message, redirectUrl = null) {
//     const modalOverlay = document.getElementById('modalOverlay');
//     const modalTitle = document.getElementById('modalTitle');
//     const modalMessage = document.getElementById('modalMessage');
//     const modalIcon = document.querySelector('.modal-icon');
//     const modalBtn = document.getElementById('modalActionBtn');

//     if (!modalOverlay || !modalTitle || !modalMessage || !modalIcon || !modalBtn) return;

//     if (type === 'error') {
//         modalOverlay.querySelector('.modal-card').classList.add('error');
//         modalTitle.textContent = 'Error';
//         modalIcon.innerHTML = `
//             <svg viewBox="0 0 24 24">
//                 <circle cx="12" cy="12" r="10" fill="currentColor"/>
//                 <line x1="15" y1="9" x2="9" y2="15" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
//                 <line x1="9" y1="9" x2="15" y2="15" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
//             </svg>
//         `;
//     } else {
//         modalOverlay.querySelector('.modal-card').classList.remove('error');
//         modalTitle.textContent = 'Notification';
//         modalIcon.innerHTML = `
//             <svg viewBox="0 0 24 24">
//                 <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" fill="currentColor"/>
//                 <path d="M12 16v-4" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/>
//                 <circle cx="12" cy="8" r="0.5" fill="white"/>
//             </svg>
//         `;
//     }

//     modalMessage.textContent = message;

//     if (redirectUrl) {
//         modalBtn.textContent = 'Go to Login';
//         modalBtn.dataset.redirect = redirectUrl;
//     } else {
//         modalBtn.textContent = 'OK';
//         modalBtn.dataset.redirect = '';
//     }

//     modalOverlay.classList.add('show');
// }

// function hideModal() {
//     const modalOverlay = document.getElementById('modalOverlay');
//     if (modalOverlay) {
//         modalOverlay.classList.remove('show');
//     }
// }

// /* =========================================================
//    INJECTED ANIMATION / TOAST CSS
//    ========================================================= */

// const style = document.createElement('style');
// style.innerHTML = `
//     @keyframes spin {
//         0% { transform: rotate(0deg); }
//         100% { transform: rotate(360deg); }
//     }
//     @keyframes haptic {
//         0% { transform: translateX(0); }
//         25% { transform: translateX(-2px); }
//         50% { transform: translateX(2px); }
//         75% { transform: translateX(-2px); }
//         100% { transform: translateX(0); }
//     }
//     .haptic-feedback {
//         animation: haptic 0.15s ease-in-out;
//     }
//     .toast {
//         position: fixed;
//         bottom: calc(20px + var(--safe-area-bottom));
//         left: 50%;
//         transform: translateX(-50%) translateY(100px);
//         background: rgba(255, 255, 255, 0.95);
//         color: var(--dark);
//         padding: 14px 24px;
//         border-radius: 50px;
//         box-shadow: var(--shadow-lg);
//         z-index: 1000;
//         font-weight: 500;
//         transition: transform 0.3s ease, opacity 0.3s ease;
//         max-width: 85%;
//         text-align: center;
//         backdrop-filter: blur(12px);
//         border: 1px solid var(--border-color);
//         display: flex;
//         align-items: center;
//         gap: 10px;
//     }
//     .toast svg {
//         width: 20px;
//         height: 20px;
//         flex-shrink: 0;
//         fill: var(--primary);
//     }
//     .toast.success {
//         background: rgba(46, 204, 113, 0.95);
//         color: white;
//     }
//     .toast.success svg {
//         fill: white;
//     }
//     .toast.error {
//         background: rgba(231, 76, 60, 0.95);
//         color: white;
//     }
//     .toast.error svg {
//         fill: white;
//     }
// `;
// document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', function () {

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

/* =========================================================
   STATUS COLOR HELPERS
   ========================================================= */

function getStatusColors(status) {
    const key = String(status || '').toLowerCase();

    const palette = {
        paid: { fill: [46, 204, 113], text: [255, 255, 255] },
        pending: { fill: [243, 156, 18], text: [255, 255, 255] },
        overdue: { fill: [231, 76, 60], text: [255, 255, 255] },
        draft: { fill: [149, 165, 166], text: [255, 255, 255] },
        cancelled: { fill: [149, 165, 166], text: [255, 255, 255] }
    };

    return palette[key] || { fill: [67, 97, 238], text: [255, 255, 255] };
}

function formatMoney(symbol, value) {
    const n = Number(value || 0);
    return `₦${n.toFixed(2)}`;
}

function sanitizeFilename(name) {
    return String(name || 'invoice').replace(/[^a-z0-9\-_]+/gi, '_');
}

/* =========================================================
   PDF GENERATION
   ========================================================= */

function buildInvoicePDFDocument(invoiceData) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 20;

    const primaryColor = [67, 97, 238];
    const darkColor = [33, 37, 41];
    const lightGray = [120, 120, 120];
    const borderColor = [225, 225, 230];

    const statusColors = getStatusColors(invoiceData.status);
    const currency = invoiceData.currencySymbol || '';

    // Helper for safe number fallbacks
    const totalAmount = invoiceData.totalAmount || invoiceData.total || 0;
    const amountPaid = invoiceData.amountPaid || invoiceData.amountpaid || 0;
    const balance = Math.max(0, totalAmount - amountPaid);

    // =========================
    // WATERMARK (if paid)
    // =========================
    if (String(invoiceData.status || '').toLowerCase() === 'paid') {
        pdf.saveGraphicsState();
        pdf.setGState(new pdf.GState({ opacity: 0.08 }));
        pdf.setTextColor(...primaryColor);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(80);
        pdf.text("PAID", pageWidth / 2, pageHeight / 2, {
            align: "center",
            angle: 30
        });
        pdf.restoreGraphicsState();
    }

    // =========================
    // LOGO & HEADER
    // =========================
    // INSTRUCTIONS: Replace 'null' with your logo's base64 string.
    // Example: const logoBase64 = "data:image/png;base64,iVBORw0KGgo...";
    // You can convert your logo to base64 using any free online image converter.
    const logoBase64 = "data:image/png;base64,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"; 

    let headerY = 15;
    if (logoBase64) {
        try {
            // Parameters: image data, format, x, y, width, height
            pdf.addImage(logoBase64, 'PNG', marginX, headerY, 45, 15);
            headerY = 32; // Push content down to make room for logo
        } catch (e) {
            console.warn("Logo failed to load, using text fallback");
        }
    } else {
        // Fallback to text if no logo is provided yet
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...primaryColor);
        pdf.setFontSize(16);
        pdf.text("Business Essentials Prime", marginX, headerY + 5);
        headerY += 25;
    }

    // Top divider line
    pdf.setDrawColor(...borderColor);
    pdf.setLineWidth(0.5);
    pdf.line(marginX, headerY, pageWidth - marginX, headerY);

    // =========================
    // COMPANY (issuer) INFO + TITLE
    // =========================
    let companyY = headerY + 10;
    
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...darkColor);
    pdf.setFontSize(18);
    pdf.text("Business Essentials Prime", marginX, companyY);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...lightGray);

    companyY += 7;
    [
        'Ibadan, Nigeria.',
        "support@businessessentia.net",
        "+234 802-604-8215",
        "www.businessessentia.net"
    ].forEach(line => {
        if (line) {
            const wrapped = pdf.splitTextToSize(String(line), 85);
            pdf.text(wrapped, marginX, companyY);
            companyY += 4.5 * wrapped.length;
        }
    });

    // Right side: TAX INVOICE
    pdf.setTextColor(...darkColor);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("TAX INVOICE", pageWidth - marginX, headerY + 10, { align: "right" });

    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(12);
    pdf.text(invoiceData.invoiceNumber || "", pageWidth - marginX, headerY + 18, { align: "right" });

    pdf.setTextColor(...darkColor);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.text(`Invoice Date: ${invoiceData.invoiceDate || ''}`, pageWidth - marginX, headerY + 26, { align: "right" });
    pdf.text(`Due Date: ${invoiceData.dueDate || ''}`, pageWidth - marginX, headerY + 32, { align: "right" });

    // Status badge (pill)
    const statusLabel = String(invoiceData.status || '').toUpperCase();
    pdf.setFontSize(9);
    const badgeWidth = pdf.getTextWidth(statusLabel) + 10;
    const badgeX = pageWidth - marginX - badgeWidth;
    const badgeY = headerY + 38;

    pdf.setFillColor(...statusColors.fill);
    pdf.roundedRect(badgeX, badgeY, badgeWidth, 7, 3.5, 3.5, "F");
    pdf.setTextColor(...statusColors.text);
    pdf.setFont("helvetica", "bold");
    pdf.text(statusLabel, badgeX + badgeWidth / 2, badgeY + 4.8, { align: "center" });

    // =========================
    // BILLED FROM / BILLED TO
    // =========================
    const sectionTop = Math.max(companyY + 8, headerY + 48);

    pdf.setDrawColor(...borderColor);
    pdf.line(marginX, sectionTop, pageWidth - marginX, sectionTop);

    const colY = sectionTop + 10;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(...primaryColor);
    pdf.text("BILLED FROM", marginX, colY);
    pdf.text("BILLED TO", 115, colY);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(...darkColor);

    let fromY = colY + 7;
    pdf.setFont("helvetica", "bold");
    pdf.text(invoiceData.companyName || "Business Essentials Prime", marginX, fromY);
    pdf.setFont("helvetica", "normal");
    fromY += 5;
    [invoiceData.companyEmail, invoiceData.companyPhone].forEach(line => {
        if (line) {
            pdf.text(String(line), marginX, fromY);
            fromY += 5;
        }
    });

    let toY = colY + 7;
    pdf.setFont("helvetica", "bold");
    pdf.text(invoiceData.clientName || "", 115, toY);
    pdf.setFont("helvetica", "normal");
    toY += 5;
    if (invoiceData.clientEmail) {
        pdf.text(String(invoiceData.clientEmail), 115, toY);
        toY += 5;
    }
    if (invoiceData.clientAddress) {
        const addrLines = pdf.splitTextToSize(String(invoiceData.clientAddress), 75);
        pdf.text(addrLines, 115, toY);
        toY += 5 * addrLines.length;
    }

    // =========================
    // INVOICE DETAILS STRIP
    // =========================
    const detailsY = Math.max(fromY, toY) + 8;

    pdf.setDrawColor(...borderColor);
    pdf.line(marginX, detailsY, pageWidth - marginX, detailsY);

    const detailRowY = detailsY + 8;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...lightGray);
    pdf.text("CLIENT ID", marginX, detailRowY);
    pdf.text("PAYMENT TERMS", marginX + 55, detailRowY);
    pdf.text("STATUS", marginX + 115, detailRowY);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...darkColor);
    pdf.text(`CL-${invoiceData.clientId || '000'}`, marginX, detailRowY + 6);
    pdf.text(String(invoiceData.paymentTerms || 'Net 30'), marginX + 55, detailRowY + 6);
    pdf.text(statusLabel, marginX + 115, detailRowY + 6);

    // =========================
    // ITEMS TABLE
    // =========================
    const tableStartY = detailRowY + 16;

    pdf.autoTable({
        startY: tableStartY,
        head: [["Description", "Qty", "Unit Price", "Amount"]],
        body: (invoiceData.items || []).map(item => [
            item.desc || item.description || '',
            item.qty || item.quantity || 1,
            formatMoney(invoiceData.currency, item.price || item.unitPrice || 0),
            formatMoney(invoiceData.currency, item.total || item.amount || 0)
        ]),
        theme: "grid",
        headStyles: {
            fillColor: primaryColor,
            textColor: 255,
            fontStyle: "bold",
            fontSize: 9.5
        },
        styles: {
            fontSize: 9.5,
            cellPadding: 4,
            textColor: darkColor
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: "center", cellWidth: 20 },
            2: { halign: "right", cellWidth: 35 },
            3: { halign: "right", cellWidth: 35 }
        },
        margin: { left: marginX, right: marginX }
    });

    // =========================
    // TOTALS (Fixed Overlap & Added Balance)
    // =========================
    let finalY = pdf.lastAutoTable ? pdf.lastAutoTable.finalY + 15 : 140;

    // Keep totals block on the same page if possible
    if (finalY > pageHeight - 85) {
        pdf.addPage();
        finalY = 25;
    }

    const totalsLabelX = pageWidth - marginX - 70;
    const totalsValueX = pageWidth - marginX;
    let currentY = finalY;
    const rowHeight = 7;

    // Helper function for clean totals rows
    const addTotalRow = (label, value, isBold = false, color = darkColor, fontSize = 10) => {
        pdf.setFont("helvetica", isBold ? "bold" : "normal");
        pdf.setFontSize(fontSize);
        pdf.setTextColor(...color);
        pdf.text(label, totalsLabelX, currentY);
        pdf.text(value, totalsValueX, currentY, { align: "right" });
        currentY += rowHeight;
    };

    // 1. Subtotal
    addTotalRow("Subtotal", formatMoney(invoiceData.currency, invoiceData.subtotal || 0));
    
    // 2. Tax
    addTotalRow(`Tax (${invoiceData.tax || 0}%)`, formatMoney(invoiceData.currency, invoiceData.taxAmount || 0));
    
    // 3. Total Amount
    currentY += 2; // extra spacing
    addTotalRow("Total Amount", formatMoney(invoiceData.currency, totalAmount), true, darkColor, 11);
    
    // Divider Line
    currentY += 2;
    pdf.setDrawColor(...primaryColor);
    pdf.setLineWidth(0.5);
    pdf.line(totalsLabelX, currentY, totalsValueX, currentY);
    currentY += 8;

    // 4. Amount Paid
    addTotalRow("Amount Paid", formatMoney(invoiceData.currency, amountPaid));
    
    // 5. Balance Due (Green if 0, Red if > 0)
    const balanceColor = balance <= 0.01 ? [16, 185, 129] : [239, 68, 68]; 
    addTotalRow("Balance Due", formatMoney(invoiceData.currency, balance), true, balanceColor, 11);

    // =========================
    // PAYMENT INFO / SUPPORT
    // =========================
    let footerY = currentY + 25;

    if (footerY > pageHeight - 55) {
        pdf.addPage();
        footerY = 25;
    }

    pdf.setDrawColor(...borderColor);
    pdf.setLineWidth(0.5);
    pdf.line(marginX, footerY - 8, pageWidth - marginX, footerY - 8);

    pdf.setTextColor(...darkColor);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.text("Payment Information", marginX, footerY);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...lightGray);
    const paymentText = balance <= 0.01 
        ? "Thank you! This invoice has been paid in full via your Business Essentials Prime account."
        : `Payment is due within ${invoiceData.paymentTerms || '30 days'} of the invoice date. Please settle the remaining balance to avoid late fees.`;
    
    pdf.text(pdf.splitTextToSize(paymentText, 170), marginX, footerY + 6);

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...darkColor);
    pdf.setFontSize(10.5);
    pdf.text("Questions?", marginX, footerY + 22);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...lightGray);
    pdf.text("support@businessessentia.net", marginX, footerY + 28);
    pdf.text("+234 (802)-604-8215", marginX, footerY + 33);

    // =========================
    // THANK YOU + PAGE NUMBERS
    // =========================
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);

        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(8.5);
        pdf.setTextColor(...lightGray);
        pdf.text(
            `Generated ${new Date().toLocaleDateString()} • Page ${i} of ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: "center" }
        );
    }

    pdf.setPage(pageCount);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(...primaryColor);
    pdf.text(
        "Thank you for powering your business with Business Essentials Prime!",
        pageWidth / 2,
        pageHeight - 16,
        { align: "center" }
    );

    return pdf;
}

/* =========================================================
   DOWNLOAD (share-first, with blob-link fallback)
   ========================================================= */

// Detect environments (iOS Safari, in-app WebViews) where the HTML
// `download` attribute on a blob link is silently ignored and the
// browser just navigates to / displays the PDF instead of saving it.
function supportsReliableBlobDownload() {
    const ua = navigator.userAgent || '';
    const isIOS = /iP(hone|od|ad)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return !isIOS;
}

async function downloadPDF() {
    try {
        const pdf = buildInvoicePDFDocument(invoiceData);
        const filename = `${sanitizeFilename(invoiceData.invoiceNumber)}.pdf`;
        const blob = pdf.output('blob');

        // 1) Native share sheet (best experience on iOS / Android / in-app
        //    WebViews) — gives the user a real "Save to Files / Save to device" option.
        if (navigator.canShare && window.File) {
            try {
                const file = new File([blob], filename, { type: 'application/pdf' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: invoiceData.invoiceNumber || 'Invoice',
                        text: `Invoice ${invoiceData.invoiceNumber || ''}`
                    });
                    return true;
                }
            } catch (shareError) {
                // User cancelled the share sheet, or share failed — fall through to the
                // direct-download path rather than treating this as an error.
                if (shareError && shareError.name === 'AbortError') {
                    return true;
                }
            }
        }

        // 2) Direct blob-link download (works on desktop Chrome/Firefox/Edge/Safari).
        if (supportsReliableBlobDownload()) {
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
            return true;
        }

        // 3) Last resort (older iOS Safari with no Share API support): open the
        //    PDF in a new tab. The user can use the native PDF viewer's own
        //    share/save icon from there.
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        showToast('Tap the share icon in the PDF viewer to save it', 'info');
        return true;

    } catch (error) {
        console.error(error);
        showToast("Failed to generate PDF", "error");
        return false;
    }
}

/* =========================================================
   PRINTING (prints the same clean, paginated PDF used for
   download — not the live styled page — so output is always
   a neat, correctly-paginated document rather than a stretched
   screenshot of the UI)
   ========================================================= */

function printInvoice() {
    try {
        const pdf = buildInvoicePDFDocument(invoiceData);
        const blob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(blob);

        const ua = navigator.userAgent || '';
        const isIOS = /iP(hone|od|ad)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        if (isIOS) {
            // iOS Safari does not reliably support triggering print() on an
            // iframe's PDF content. Opening the PDF gives the user access to
            // the native PDF viewer, which has its own Print option under the
            // share icon.
            window.open(blobUrl, '_blank');
            showToast('Use the share icon in the PDF viewer to print', 'info');
            return;
        }

        // Desktop / Android: print via a hidden iframe so the browser's
        // native PDF print dialog (clean, single document, correct
        // pagination) is used instead of printing the live web page.
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = blobUrl;

        const cleanup = () => {
            setTimeout(() => {
                if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                URL.revokeObjectURL(blobUrl);
            }, 1000);
        };

        iframe.onload = () => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (e) {
                // Fallback: if in-iframe printing is blocked, open the PDF
                // in a new tab so the user can print from there instead.
                window.open(blobUrl, '_blank');
            }
            if (iframe.contentWindow) {
                iframe.contentWindow.addEventListener('afterprint', cleanup);
            }
            // Safety net in case afterprint never fires.
            setTimeout(cleanup, 15000);
        };

        document.body.appendChild(iframe);

    } catch (error) {
        console.error(error);
        showToast("Failed to prepare invoice for printing", "error");
    }
}

/* =========================================================
   BACKGROUND PARTICLES
   ========================================================= */

function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    const particleCount = window.innerWidth > 768 ? 40 : 25;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');

        const size = Math.random() * 6 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;

        const duration = Math.random() * 15 + 20;
        const delay = Math.random() * 5;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${delay}s`;

        particle.style.opacity = `${Math.random() * 0.3 + 0.1}`;

        particlesContainer.appendChild(particle);
    }
}

/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {
    // Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showHapticFeedback(backBtn);
            window.history.back();
        });
    }

    // Print button
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            showHapticFeedback(printBtn);

            // Called directly (no delay) within the click's user-gesture window —
            // window.open() / iframe print can get silently blocked by popup
            // blockers otherwise, especially on Safari.
            printInvoice();
        });
    }

    // Download button
    const downloadBtn = document.getElementById('downloadBtn');

    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            showHapticFeedback(downloadBtn);

            const originalContent = downloadBtn.innerHTML;
            downloadBtn.disabled = true;

            // loading spinner
            downloadBtn.innerHTML = `
                <svg viewBox="0 0 24 24"
                    style="animation: spin 1s linear infinite; width: 20px; height: 20px;">
                    <path d="M12 2v6m0 10v6M4.93 4.93l4.24 4.24m8.49-8.49l4.24 4.24M1.5 12h6m10 0h6M4.93 19.07l4.24-4.24m8.49 8.49l4.24-4.24"
                    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `;

            // IMPORTANT: no setTimeout/delay before this call. navigator.share()
            // (used inside downloadPDF for the mobile "Save to device" sheet)
            // only works when called synchronously within the click's user-gesture
            // window — Safari in particular rejects it if a timer runs first.
            const success = await downloadPDF();

            downloadBtn.disabled = false;
            downloadBtn.innerHTML = originalContent;

            if (success) {
                showToast('✓ Invoice downloaded', 'success');
            }
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

/* =========================================================
   ENTRANCE ANIMATIONS
   ========================================================= */

function addEntranceAnimations() {
    setTimeout(() => {
        const card = document.querySelector('.invoice-card');
        if (card) {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 300);
        }

        document.querySelectorAll('.detail-section').forEach((section, index) => {
            section.style.opacity = '0';
            section.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                section.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                section.style.opacity = '1';
                section.style.transform = 'translateX(0)';
            }, 600 + index * 150);
        });

        const totalSection = document.querySelector('.total-section');
        if (totalSection) {
            totalSection.style.opacity = '0';
            totalSection.style.transform = 'translateY(20px)';
            setTimeout(() => {
                totalSection.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                totalSection.style.opacity = '1';
                totalSection.style.transform = 'translateY(0)';
            }, 900);
        }

        const footer = document.querySelector('.invoice-footer');
        if (footer) {
            footer.style.opacity = '0';
            footer.style.transform = 'translateY(20px)';
            setTimeout(() => {
                footer.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                footer.style.opacity = '1';
                footer.style.transform = 'translateY(0)';
            }, 1000);
        }
    }, 300);
}

function showHapticFeedback(element) {
    if (!element) return;

    element.classList.add('haptic-feedback');
    setTimeout(() => {
        element.classList.remove('haptic-feedback');
    }, 200);
}

/* =========================================================
   TOAST
   ========================================================= */

function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

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

    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);

    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(100px)';
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2800);
}

/* =========================================================
   MODAL
   ========================================================= */

function showModal(type, message, redirectUrl = null) {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalIcon = document.querySelector('.modal-icon');
    const modalBtn = document.getElementById('modalActionBtn');

    if (!modalOverlay || !modalTitle || !modalMessage || !modalIcon || !modalBtn) return;

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

    if (redirectUrl) {
        modalBtn.textContent = 'Go to Login';
        modalBtn.dataset.redirect = redirectUrl;
    } else {
        modalBtn.textContent = 'OK';
        modalBtn.dataset.redirect = '';
    }

    modalOverlay.classList.add('show');
}

function hideModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('show');
    }
}

/* =========================================================
   INJECTED ANIMATION / TOAST CSS
   ========================================================= */

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
