// document.addEventListener('DOMContentLoaded', function () {
//     // Initialize particles background
//     createParticles();

//     // Set up event listeners
//     setupEventListeners();

//     // Initialize greeting
//     setupAccountModal();
//     updateGreeting();

//     const saved = localStorage.getItem("theme");
//     if (saved) applyTheme(saved);

//     // Fetch dashboard data
//     const cachedData =
//             sessionStorage.getItem(
//                 "dashboard_data"
//             );

//     if (cachedData) {

//             renderDashboard(
//                 JSON.parse(cachedData)
//             );

//             // silent refresh in background
//             setTimeout(() => {
//                 fetchDashboardData(true);
//             }, 1000);

//         } else {

//             fetchDashboardData();
//         }

//     // Set up scroll indicator
//     setupScrollIndicator();
// });
// let currencySymbol = "$"; 


// // ==============================
// // PARTICLES
// // ==============================
// function createParticles() {
//     const particlesContainer = document.getElementById('particles');

//     if (!particlesContainer) return;

//     const particleCount = window.innerWidth > 768 ? 40 : 25;

//     for (let i = 0; i < particleCount; i++) {
//         const particle = document.createElement('div');

//         particle.classList.add('particle');

//         const size = Math.random() * 7 + 3;

//         particle.style.width = `${size}px`;
//         particle.style.height = `${size}px`;

//         particle.style.left = `${Math.random() * 100}%`;
//         particle.style.top = `${Math.random() * 100}%`;

//         const duration = Math.random() * 10 + 15;
//         const delay = Math.random() * 5;

//         particle.style.animationDuration = `${duration}s`;
//         particle.style.animationDelay = `${delay}s`;

//         particle.style.opacity = `${Math.random() * 0.5 + 0.1}`;

//         particlesContainer.appendChild(particle);
//     }
// }

// // ==============================
// // EVENT LISTENERS
// // ==============================
// function setupEventListeners() {
//     const helpBtn = document.getElementById('helpBtn');

//     if (helpBtn) {
//         helpBtn.addEventListener('click', () => {
//             showHapticFeedback(helpBtn);
//        window.location.href = '/support';
//         });
//     }

//     const notifyBtn = document.getElementById('notifyBtn');

//     if (notifyBtn) {
//         notifyBtn.addEventListener('click', () => {
//             showHapticFeedback(notifyBtn);
//             showToast("Notifications opened");
//             window.location.href = '/dashboard/notifications';
//         });
//     }

//     const showInvoiceBtn = document.getElementById('show-invoice-btn');

//     if (showInvoiceBtn) {
//         showInvoiceBtn.addEventListener('click', () => {
//             showHapticFeedback(showInvoiceBtn);
//             window.location.href = '/dashboard/create-invoice';
//         });
//     }

//     const upgradeBtn = document.getElementById('upgradeBtn');

//     if (upgradeBtn) {
//         upgradeBtn.addEventListener('click', () => {
//             showHapticFeedback(upgradeBtn);
//             window.location.href = '/billing';
//         });
//     }

//     const balanceAmount = document.getElementById('balance-amount');

//     if (balanceAmount) {
//         balanceAmount.addEventListener('click', toggleBalanceVisibility);
//     }

//     const closeModal = document.getElementById('closeModal');

//     if (closeModal) {
//         closeModal.addEventListener('click', hideModal);
//     }

//     const modalOverlay = document.getElementById('modalOverlay');

//     if (modalOverlay) {
//         modalOverlay.addEventListener('click', (e) => {
//             if (e.target === modalOverlay) {
//                 hideModal();
//             }
//         });
//     }

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

// // ==============================
// // FETCH DASHBOARD DATA
// // ==============================
// let dashboardController = null;
// let dashboardLoading = false;

// const CACHE_KEY = "dashboard_data";
// const CACHE_TIME_KEY = "dashboard_data_time";

// const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// async function fetchDashboardData(forceRefresh = false) {

//     if (dashboardLoading) return;

//     dashboardLoading = true;

//     try {

//         const cachedData =
//             sessionStorage.getItem(CACHE_KEY);

//         const cachedTime =
//             sessionStorage.getItem(CACHE_TIME_KEY);

//         const now = Date.now();

//         // ==========================
//         // USE CACHE
//         // ==========================

//         if (
//             !forceRefresh &&
//             cachedData &&
//             cachedTime &&
//             (now - Number(cachedTime)) < CACHE_DURATION
//         ) {

//        const parsed = JSON.parse(cachedData);
//         renderDashboard(parsed);
//         applyTheme(parsed.theme || "light");

//             dashboardLoading = false;

//             return;
//         }

//         showStatsLoading(true);

//         // ==========================
//         // CANCEL OLD REQUEST
//         // ==========================

//         if (dashboardController) {
//             dashboardController.abort();
//         }

//         dashboardController =
//             new AbortController();

//         const response = await fetch(
//             "/dashboard/data",
//             {
//                 method: "GET",
//                 credentials: "include",
//                 signal:
//                     dashboardController.signal
//             }
//         );

//         if (response.status === 401) {

//             showModal(
//                 "error",
//                 "Session expired.",
//                 "/login"
//             );

//             return;
//         }

//         if (!response.ok) {
//             throw new Error(
//                 `HTTP ${response.status}`
//             );
//         }

//         const data = await response.json();

//         // ==========================
//         // SAVE CACHE
//         // ==========================

//         sessionStorage.setItem(
//             CACHE_KEY,
//             JSON.stringify(data)
//         );

//         sessionStorage.setItem(
//             CACHE_TIME_KEY,
//             Date.now()
//         );

//         renderDashboard(data);
//         checkAccountCompletion(data);

//     } catch (err) {

//         if (err.name === "AbortError") {
//             return;
//         }

//         console.error(
//             "Dashboard fetch error:",
//             err
//         );

//         // ==========================
//         // FALLBACK TO CACHE
//         // ==========================

//         const cachedData =
//             sessionStorage.getItem(CACHE_KEY);

//         if (cachedData) {

//             console.warn(
//                 "Using cached dashboard data"
//             );

//             renderDashboard(
//                 JSON.parse(cachedData)
//             );

//             return;
//         }

//         showModal(
//             "error",
//             "Failed to load dashboard data."
//         );

//     } finally {

//         showStatsLoading(false);

//         dashboardLoading = false;
//     }
// }

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
// // ================= ACCOUNT DETAILS COMPLETION CHECK =================
// function checkAccountCompletion(data) {

//     const dismissedAt =
//         localStorage.getItem(
//             "accountModalDismissedAt"
//         );

//     const now =
//         Date.now();

//     const hoursSinceDismissed =
//         dismissedAt
//             ? (
//                 now -
//                 parseInt(
//                     dismissedAt
//                 )
//             ) /
//             (
//                 1000 *
//                 60 *
//                 60
//             )
//             : Infinity;


//     const notRecentlyDismissed =
//         hoursSinceDismissed > 24;


//     window.userAccountComplete =
//         data.account;


//     const accountIncomplete =
//         !window.userAccountComplete;


//     console.log(
//         "Complete:",
//         window.userAccountComplete
//     );

//     console.log(
//         "Incomplete:",
//         accountIncomplete
//     );


//     if (
//         accountIncomplete &&
//         notRecentlyDismissed
//     ) {

//         setTimeout(
//             () => {

//                 showAccountModal();

//             },
//             1500
//         );
//     }
// }

// function showAccountModal() {

//     const modal =
//         document.getElementById(
//             "accountModalOverlay"
//         );

//     console.log(
//         modal
//     );

//     if(!modal){

//         console.error(
//             "Modal not found"
//         );

//         return;
//     }

//     modal.classList.add(
//         "active"
//     );

//     console.log(
//         modal.className
//     );

//     document.body.style.overflow =
//         "hidden";
// }

// function hideAccountModal() {
//     const modal = document.getElementById('accountModalOverlay');
//     modal.classList.remove('active');
//     document.body.style.overflow = '';
// }

// function setupAccountModal() {
//     const modal = document.getElementById('accountModalOverlay');
//     const remindLaterBtn = document.getElementById('remindLaterBtn');
    
//     // Close on overlay click
//     modal.addEventListener('click', (e) => {
//         if (e.target === modal) {
//             hideAccountModal();
//             // Remember dismissal time
//             localStorage.setItem('accountModalDismissedAt', Date.now().toString());
//         }
//     });
    
//     // Remind Later button
//     remindLaterBtn.addEventListener('click', () => {
//         hideAccountModal();
//         // Remember dismissal time - don't show again for 24 hours
//         localStorage.setItem('accountModalDismissedAt', Date.now().toString());
//     });
    
//     // ESC key to close
//     document.addEventListener('keydown', (e) => {
//         if (e.key === 'Escape' && modal.classList.contains('active')) {
//             hideAccountModal();
//             localStorage.setItem('accountModalDismissedAt', Date.now().toString());
//         }
//     });
// }



// function renderDashboard(data) {
//     applyTheme(data.theme || localStorage.getItem("theme") || "light");
//     currencySymbol =
//         data.currency_symbol || "$";

//     const username =
//         `Hi, ${data.username || "User"}`;

//     const plan =
//         data.plan || "Trial";

//     const profilepicurl =
//         data.profilepicurl ||
//         "/static/images/default-profile.png";

//     const profilename =
//         data.profilename ||
//         data.username ||
//         "User";

//     const usernameEl = document.getElementById("username-placeholder");

//     if (usernameEl) {
//         usernameEl.textContent = username;
//     }

//     const planBadge =
//         document.getElementById("planBadge");

//     if (planBadge) {

//         planBadge.textContent = plan;

//         planBadge.className =
//             `plan-badge ${
//                 plan === "Trial"
//                     ? "trial"
//                     : ""
//             }`;
//     }

//     document.getElementById(
//         "dashboard-profile-pic"
//     )?.setAttribute(
//         "src",
//         profilepicurl
//     );

//     const greetText =     document.getElementById(
//         "greeting-text"
//     );

//     if (greetText) {
//         greetText.innerHTML =
//         `Good ${getTimeOfDay()}, ${profilename} 👋`;
//     }

//     const totInv =     document.getElementById(
//         "total-invoices"
//     );

//     if (totInv){
//        totInv .replaceChildren(
//             document.createTextNode(
//                 data.total_invoices || 0
//             )
//         );
//     }

//     const padInv =    document.getElementById(
//         "paid-invoices"
//     );

//     if (padInv){
//         padInv.replaceChildren(
//             document.createTextNode(
//                 data.paid_invoices || 0
//             )
//         );
//     }

//     const pendInv =     document.getElementById(
//         "pending-invoices"
//     );

//     if (pendInv) {
//         pendInv.replaceChildren(
//             document.createTextNode(
//                 data.pending_invoices || 0
//             )
//         );
//     }

//     const totRev =     document.getElementById(
//         "total-revenue"
//     );

//     if (totRev) {
//         totRev.replaceChildren(
//             document.createTextNode(
//                 formatCurrency(
//                     data.total_revenue || 0,
//                     currencySymbol
//                 )
//             )
//         );
//     }

//     const balanceElement =
//         document.getElementById(
//             "balance-amount"
//         );

//     if (balanceElement) {

//         const formattedBalance =
//             formatCurrency(
//                 data.balance || 0,
//                 currencySymbol
//             );

//         balanceElement.textContent =
//             formattedBalance;

//         balanceElement.dataset.balance =
//             formattedBalance;
//     }

//     const notifyCount =
//         document.getElementById(
//             "notifyCount"
//         );

//     if (notifyCount) {

//         notifyCount.textContent =
//             data.unread_count || 0;

//         notifyCount.style.display =
//             data.unread_count > 0
//                 ? "flex"
//                 : "none";
//     }

//     document
//         .getElementById(
//             "upgradeBanner"
//         )
//         ?.classList.toggle(
//             "hidden",
//             plan !== "Trial"
//         );

//     populateActivityList(
//         data.activities || []
//     );

//     animateStatsCards();
// }
// // ==============================
// // STATS LOADING FIX
// // ==============================
// function showStatsLoading(isLoading) {

//     const statValues = document.querySelectorAll('.stat-value');

//     statValues.forEach(el => {

//         if (isLoading) {

//             el.dataset.original = el.textContent;

//             el.innerHTML = `
//                 <div class="skeleton skeleton-title"></div>
//             `;

//         } else {

//             const skeleton = el.querySelector('.skeleton');

//             if (skeleton) {
//                 el.innerHTML = el.dataset.original || "0";
//             }
//         }
//     });
// }

// // ==============================
// // FORMAT CURRENCY
// // ==============================
// function formatCurrency(amount, currency = 'USD') {

//     if (amount == null) {
//         amount = 0;
//     }

//     try {

//         return new Intl.NumberFormat('en-US', {
//             style: 'currency',
//             currency: currency,
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2
//         }).format(amount);

//     } catch (e) {

//         return `${currency} ${amount}`;
//     }
// }

// // ==============================
// // GREETING
// // ==============================
// function getTimeOfDay() {
//     const hour = new Date().getHours();

//     if (hour < 12) return 'morning';
//     if (hour < 17) return 'afternoon';

//     return 'evening';
// }

// function updateGreeting() {

//     const greetingText =
//         document.getElementById('greeting-text');

//     if (greetingText) {
//         greetingText.innerHTML =
//             `Good ${getTimeOfDay()}, User 👋`;
//     }
// }

// // ==============================
// // ACTIVITY LIST
// // ==============================
// function populateActivityList(activities) {

//     const activityList =
//         document.getElementById('activity-list');

//     if (!activityList) return;

//     if (activities.length === 0) {

//         activityList.innerHTML = `
//             <div class="activity-item">
//                 <div class="activity-content">
//                     <div class="activity-title">
//                         No recent activity
//                     </div>

//                     <div class="activity-time">
//                         Get started by creating your first invoice
//                     </div>
//                 </div>
//             </div>
//         `;

//         return;
//     }

//     let html = '';

//     activities.slice(0, 5).forEach(activity => {

//         html += `
//             <div class="activity-item">
//                 <div class="activity-content">

//                     <div class="activity-title">
//                         ${activity.title || "Activity"}
//                     </div>

//                     <div class="activity-time">
//                         ${activity.created_at || ""}
//                     </div>

//                 </div>

//                 <div class="activity-amount">
//                     ${formatCurrency(activity.amount || 0, currencySymbol)}
//                 </div>
//             </div>
//         `;
//     });

//     activityList.innerHTML = html;
// }

// // ==============================
// // ANIMATION
// // ==============================
// function animateStatsCards() {

//     const statCards =
//         document.querySelectorAll('.stat-card');

//     statCards.forEach((card, index) => {

//         setTimeout(() => {
//             card.classList.add('visible');
//         }, 200 * index);

//     });
// }

// // ==============================
// // BALANCE TOGGLE
// // ==============================
// function toggleBalanceVisibility() {

//     const balanceElement =
//         document.getElementById('balance-amount');

//     if (!balanceElement) return;

//     const isHidden =
//         balanceElement.textContent.trim() === '••••••';

//     if (isHidden) {

//         balanceElement.textContent =
//             balanceElement.dataset.balance;

//     } else {

//         balanceElement.textContent = '••••••';
//     }
// }

// // ==============================
// // HAPTIC
// // ==============================
// function showHapticFeedback(element) {

//     if (!element) return;

//     element.classList.add('haptic-feedback');

//     setTimeout(() => {
//         element.classList.remove('haptic-feedback');
//     }, 200);
// }

// // ==============================
// // TOAST
// // ==============================
// function showToast(message) {

//     const existingToast =
//         document.querySelector('.toast');

//     if (existingToast) {
//         existingToast.remove();
//     }

//     const toast = document.createElement('div');

//     toast.className = 'toast';

//     toast.textContent = message;

//     document.body.appendChild(toast);

//     setTimeout(() => {
//         toast.remove();
//     }, 3000);
// }

// // ==============================
// // MODAL
// // ==============================
// function showModal(type, message, redirectUrl = null) {

//     const modalOverlay =
//         document.getElementById('modalOverlay');

//     const modalMessage =
//         document.getElementById('modalMessage');

//     const modalBtn =
//         document.getElementById('modalActionBtn');

//     if (!modalOverlay || !modalMessage || !modalBtn) {
//         return;
//     }

//     modalMessage.textContent = message;

//     modalBtn.dataset.redirect = redirectUrl || '';

//     modalOverlay.classList.add('show');
// }

// function hideModal() {

//     const modalOverlay =
//         document.getElementById('modalOverlay');

//     if (modalOverlay) {
//         modalOverlay.classList.remove('show');
//     }
// }

// // ==============================
// // SCROLL INDICATOR
// // ==============================
// function setupScrollIndicator() {

//     const scrollIndicator =
//         document.getElementById('scrollIndicator');

//     if (!scrollIndicator) return;

//     window.addEventListener('scroll', () => {

//         const scrollTop =
//             window.pageYOffset ||
//             document.documentElement.scrollTop;

//         if (scrollTop > 100) {
//             scrollIndicator.classList.add('visible');
//         } else {
//             scrollIndicator.classList.remove('visible');
//         }
//     });
// }

document.addEventListener('DOMContentLoaded', function () {
    // Initialize particles background
    createParticles();

    // Set up event listeners
    setupEventListeners();

    // Initialize greeting
    setupAccountModal();
    updateGreeting();

    const saved = localStorage.getItem("theme");
    if (saved) applyTheme(saved);

    // Fetch dashboard data
    const cachedData = sessionStorage.getItem("dashboard_data");

    if (cachedData) {
        renderDashboard(JSON.parse(cachedData));
        // silent refresh in background
        setTimeout(() => {
            fetchDashboardData(true);
        }, 1000);
    } else {
        fetchDashboardData();
    }

    // Set up scroll indicator
    setupScrollIndicator();

    setupAIAssistant();
});

let currencySymbol = "$";

// ==============================
// PARTICLES
// ==============================
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    const particleCount = window.innerWidth > 768 ? 40 : 25;

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

// ==============================
// EVENT LISTENERS
// ==============================
function setupEventListeners() {
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            showHapticFeedback(helpBtn);
            window.location.href = '/support';
        });
    }

    const notifyBtn = document.getElementById('notifyBtn');
    if (notifyBtn) {
        notifyBtn.addEventListener('click', () => {
            showHapticFeedback(notifyBtn);
            showToast("Notifications opened");
            window.location.href = '/dashboard/notifications';
        });
    }

    const showInvoiceBtn = document.getElementById('show-invoice-btn');
    if (showInvoiceBtn) {
        showInvoiceBtn.addEventListener('click', () => {
            showHapticFeedback(showInvoiceBtn);
            window.location.href = '/dashboard/create-invoice';
        });
    }

    const upgradeBtn = document.getElementById('upgradeBtn');
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', () => {
            showHapticFeedback(upgradeBtn);
            window.location.href = '/billing';
        });
    }

    const balanceAmount = document.getElementById('balance-amount');
    if (balanceAmount) {
        balanceAmount.addEventListener('click', toggleBalanceVisibility);
    }

    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', hideModal);
    }

    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                hideModal();
            }
        });
    }

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

// ==============================
// FETCH DASHBOARD DATA
// ==============================
let dashboardController = null;
let dashboardLoading = false;

const CACHE_KEY = "dashboard_data";
const CACHE_TIME_KEY = "dashboard_data_time";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchDashboardData(forceRefresh = false) {
    if (dashboardLoading) return;
    dashboardLoading = true;

    try {
        const cachedData = sessionStorage.getItem(CACHE_KEY);
        const cachedTime = sessionStorage.getItem(CACHE_TIME_KEY);
        const now = Date.now();

        // USE CACHE
        if (!forceRefresh && cachedData && cachedTime && (now - Number(cachedTime)) < CACHE_DURATION) {
            const parsed = JSON.parse(cachedData);
            renderDashboard(parsed);
            applyTheme(parsed.theme || "light");
            dashboardLoading = false;
            return;
        }

        showStatsLoading(true);

        // CANCEL OLD REQUEST
        if (dashboardController) {
            dashboardController.abort();
        }

        dashboardController = new AbortController();

        const response = await fetch("/dashboard/data", {
            method: "GET",
            credentials: "include",
            signal: dashboardController.signal
        });

        if (response.status === 401) {
            showModal("error", "Session expired.", "/login");
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
            window.location.href = '/login';
                
        }

        const data = await response.json();

        // SAVE CACHE
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
        sessionStorage.setItem(CACHE_TIME_KEY, Date.now());

        renderDashboard(data);
        checkAccountCompletion(data);
        checkAccoutSetupBanner(data);
        renderAdvancedAnalytics(data);

    } catch (err) {
        if (err.name === "AbortError") {
            return;
        }

        console.error("Dashboard fetch error:", err);

        // FALLBACK TO CACHE
        const cachedData = sessionStorage.getItem(CACHE_KEY);
        if (cachedData) {
            console.warn("Using cached dashboard data");
            renderDashboard(JSON.parse(cachedData));
            return;
        }

        showModal("error", "Failed to load dashboard data.");
    } finally {
        showStatsLoading(false);
        dashboardLoading = false;
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
    localStorage.setItem("theme", theme);
}
// ================= PERSISTENT ACCOUNT SETUP BANNER =================
function checkAccountSetupBanner(data) {
    const banner = document.getElementById('accountSetupBanner');
    if (!banner) return;
    
    // Check if account is incomplete
    let isAccountIncomplete = false;
    
    if (data.account) {
        if (typeof data.account === 'object') {
            isAccountIncomplete = !(
                data.account.bank_name && 
                data.account.account_number && 
                data.account.account_name
            );
        } else if (typeof data.account === 'boolean') {
            isAccountIncomplete = !data.account;
        } else {
            isAccountIncomplete = !Boolean(data.account);
        }
    } else {
        isAccountIncomplete = true;
    }
    
    // Check if user dismissed the banner
    const dismissedAt = localStorage.getItem('setupBannerDismissedAt');
    const now = Date.now();
    const hoursSinceDismissed = dismissedAt ? (now - parseInt(dismissedAt)) / (1000 * 60 * 60) : Infinity;
    const notRecentlyDismissed = hoursSinceDismissed > 24;
    
    if (isAccountIncomplete && notRecentlyDismissed) {
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }
    
    // Setup close button
    const closeBtn = document.getElementById('closeSetupBanner');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            banner.classList.add('hidden');
            localStorage.setItem('setupBannerDismissedAt', Date.now().toString());
        });
    }
}

// ================= ADVANCED ANALYTICS =================
function renderAdvancedAnalytics(data) {
    const analyticsSection = document.getElementById('analyticsSection');
    if (!analyticsSection) return;
    
    // Check if user has Pro plan AND company data
    const isProPlan = data.plan && (data.plan.toLowerCase() === 'pro' || data.plan.toLowerCase() === 'professional');
    const hasCompanyData = data.company_data && Object.keys(data.company_data).length > 0;
    
    if (isProPlan && hasCompanyData) {
        analyticsSection.classList.remove('hidden');
        populateAnalytics(data);
    } else {
        analyticsSection.classList.add('hidden');
    }
}

function populateAnalytics(data) {
    const companyData = data.company_data;
    const currency = data.currency_symbol || '$';
    
    // Revenue Growth
    const revenueGrowth = companyData.revenue_growth || 0;
    const growthEl = document.getElementById('revenueGrowth');
    const growthTrendEl = document.getElementById('revenueGrowthTrend');
    if (growthEl) {
        growthEl.textContent = `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth}%`;
        growthEl.parentElement.querySelector('.analytics-stat-card')?.classList.toggle('positive', revenueGrowth >= 0);
    }
    if (growthTrendEl) {
        growthTrendEl.innerHTML = `<span>${revenueGrowth >= 0 ? '↑' : '↓'} vs last month</span>`;
        growthTrendEl.classList.toggle('positive', revenueGrowth >= 0);
        growthTrendEl.classList.toggle('negative', revenueGrowth < 0);
    }
    
    // Payment Success Rate
    const totalPayments = companyData.total_payments || 0;
    const successfulPayments = companyData.successful_payments || 0;
    const successRate = totalPayments > 0 ? Math.round((successfulPayments / totalPayments) * 100) : 0;
    const successRateEl = document.getElementById('paymentSuccessRate');
    const successCountEl = document.getElementById('paymentSuccessCount');
    if (successRateEl) successRateEl.textContent = `${successRate}%`;
    if (successCountEl) successCountEl.textContent = `${successfulPayments} of ${totalPayments} payments`;
    
    // Average Invoice Value
    const totalRevenue = companyData.total_revenue || 0;
    const totalInvoices = companyData.total_invoices || 0;
    const avgValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
    const avgValueEl = document.getElementById('avgInvoiceValue');
    if (avgValueEl) avgValueEl.textContent = formatCurrency(avgValue, currency);
    
    // Cash Flow
    const income = companyData.monthly_income || 0;
    const expenses = companyData.monthly_expenses || 0;
    const netCashFlow = income - expenses;
    const cashFlowEl = document.getElementById('cashFlowValue');
    const cashFlowTrendEl = document.getElementById('cashFlowTrend');
    if (cashFlowEl) {
        cashFlowEl.textContent = `${netCashFlow >= 0 ? '+' : ''}${formatCurrency(Math.abs(netCashFlow), currency)}`;
        cashFlowEl.style.color = netCashFlow >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    if (cashFlowTrendEl) {
        cashFlowTrendEl.innerHTML = `<span>net this month</span>`;
    }
    
    // Monthly Revenue Chart
    renderMonthlyChart(companyData.monthly_revenue || [], currency);
    
    // Top Clients
    renderTopClients(companyData.top_clients || []);
    
    // Cash Flow Breakdown
    renderCashFlowBreakdown(income, expenses, netCashFlow, currency);
}

function renderMonthlyChart(monthlyData, currency) {
    const chartContainer = document.getElementById('monthlyRevenueChart');
    if (!chartContainer) return;
    
    if (monthlyData.length === 0) {
        chartContainer.innerHTML = '<div class="analytics-empty"><p>No data available</p></div>';
        return;
    }
    
    const maxAmount = Math.max(...monthlyData.map(m => (m.paid || 0) + (m.pending || 0)));
    
    chartContainer.innerHTML = monthlyData.map(month => {
        const paidHeight = maxAmount > 0 ? ((month.paid || 0) / maxAmount) * 100 : 0;
        const pendingHeight = maxAmount > 0 ? ((month.pending || 0) / maxAmount) * 100 : 0;
        
        return `
            <div class="bar-group">
                <div class="bar-stack">
                    <div class="bar paid" style="height: ${paidHeight}%" title="Paid: ${formatCurrency(month.paid || 0, currency)}"></div>
                    <div class="bar pending" style="height: ${pendingHeight}%" title="Pending: ${formatCurrency(month.pending || 0, currency)}"></div>
                </div>
                <span class="bar-label">${month.month || ''}</span>
            </div>
        `;
    }).join('');
    
    // Update chart total
    const totalRevenue = monthlyData.reduce((sum, m) => sum + (m.paid || 0) + (m.pending || 0), 0);
    const chartTotalEl = document.getElementById('chartTotal');
    if (chartTotalEl) chartTotalEl.textContent = formatCurrency(totalRevenue, currency);
}

function renderTopClients(clients) {
    const container = document.getElementById('topClientsList');
    if (!container) return;
    
    if (clients.length === 0) {
        container.innerHTML = '<div class="analytics-empty"><p>No client data available</p></div>';
        return;
    }
    
    const colors = ['#4361ee', '#3498db', '#2ecc71', '#9333ea', '#f39c12'];
    
    container.innerHTML = clients.slice(0, 5).map((client, index) => {
        const initials = (client.name || 'NA').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const color = colors[index % colors.length];
        
        return `
            <div class="top-client-item">
                <div class="client-rank">${index + 1}</div>
                <div class="client-avatar-small" style="background: ${color}">${initials}</div>
                <div class="client-info-small">
                    <div class="client-name-small">${client.name || 'Unknown'}</div>
                    <div class="client-invoices-small">${client.invoice_count || 0} invoices</div>
                </div>
                <div class="client-revenue-small">${formatCurrency(client.revenue || 0)}</div>
            </div>
        `;
    }).join('');
}

function renderCashFlowBreakdown(income, expenses, net, currency) {
    const total = income + expenses;
    const incomePercent = total > 0 ? (income / total) * 100 : 0;
    const expensePercent = total > 0 ? (expenses / total) * 100 : 0;
    
    const incomeBar = document.getElementById('cashFlowIncomeBar');
    const expenseBar = document.getElementById('cashFlowExpenseBar');
    const incomeEl = document.getElementById('cashFlowIncome');
    const expenseEl = document.getElementById('cashFlowExpense');
    const netEl = document.getElementById('cashFlowNet');
    
    if (incomeBar) {
        setTimeout(() => {
            incomeBar.style.width = `${incomePercent}%`;
        }, 100);
    }
    if (expenseBar) {
        setTimeout(() => {
            expenseBar.style.width = `${expensePercent}%`;
        }, 200);
    }
    
    if (incomeEl) incomeEl.textContent = formatCurrency(income, currency);
    if (expenseEl) expenseEl.textContent = formatCurrency(expenses, currency);
    if (netEl) {
        netEl.textContent = `${net >= 0 ? '+' : '-'}${formatCurrency(Math.abs(net), currency)}`;
        netEl.style.color = net >= 0 ? 'var(--success)' : 'var(--danger)';
    }
}




// ================= ACCOUNT DETAILS COMPLETION CHECK =================
function checkAccountCompletion(data) {
    console.log("=== CHECKING ACCOUNT COMPLETION ===");

    const dismissedAt = localStorage.getItem("accountModalDismissedAt");
    const now = Date.now();
    const hoursSinceDismissed = dismissedAt ? (now - parseInt(dismissedAt)) / (1000 * 60 * 60) : Infinity;
    const notRecentlyDismissed = hoursSinceDismissed > 24;

    console.log("Dismissed at:", dismissedAt);
    console.log("Hours since dismissed:", hoursSinceDismissed);
    console.log("Not recently dismissed:", notRecentlyDismissed);

    // Check if account is actually complete by checking specific fields
    let isAccountComplete = false;
    
    if (data.account) {
        // If account is an object, check for required fields
        if (typeof data.account === 'object') {
            isAccountComplete = Boolean(
                 data.account
            );
        } 
        // If account is a boolean
        else if (typeof data.account === 'boolean') {
            isAccountComplete = data.account;
        }
        // If account is a string or number (truthy value)
        else {
            isAccountComplete = Boolean(data.account);
        }
    } else {
        console.log("No account data found");
        isAccountComplete = false;
    }

    window.userAccountComplete = isAccountComplete;
    const accountIncomplete = !isAccountComplete;

    console.log("Final result - Account Complete:", isAccountComplete);
    console.log("Final result - Account Incomplete:", accountIncomplete);
    console.log("Should show modal:", accountIncomplete && notRecentlyDismissed);

    if (accountIncomplete && notRecentlyDismissed) {
        console.log("✅ SHOWING MODAL IN 1.5 SECONDS");
        setTimeout(() => {
            showAccountModal();
        }, 1500);
    } else {
        console.log("❌ NOT SHOWING MODAL");
        if (!accountIncomplete) {
            console.log("Reason: Account is complete");
        }
        if (!notRecentlyDismissed) {
            console.log("Reason: Modal was dismissed recently");
        }
    }
}

function showAccountModal() {
    console.log("=== SHOWING ACCOUNT MODAL ===");
    const modal = document.getElementById("accountModalOverlay");
    
    if (!modal) {
        console.error("❌ Modal element not found in DOM!");
        return;
    }
    
    console.log("Modal element found:", modal);
    console.log("Modal current classes:", modal.className);
    
    modal.classList.add("active");
    
    console.log("Modal classes after adding active:", modal.className);
    console.log("Modal computed display:", window.getComputedStyle(modal).display);
    
    document.body.style.overflow = "hidden";
    console.log("✅ Modal should now be visible");
}

function hideAccountModal() {
    const modal = document.getElementById('accountModalOverlay');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function setupAccountModal() {
    const modal = document.getElementById('accountModalOverlay');
    const remindLaterBtn = document.getElementById('remindLaterBtn');
    
    if (!modal) {
        console.error("Account modal not found during setup!");
        return;
    }
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideAccountModal();
            localStorage.setItem('accountModalDismissedAt', Date.now().toString());
        }
    });
    
    // Remind Later button
    if (remindLaterBtn) {
        remindLaterBtn.addEventListener('click', () => {
            hideAccountModal();
            localStorage.setItem('accountModalDismissedAt', Date.now().toString());
        });
    }
    
    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            hideAccountModal();
            localStorage.setItem('accountModalDismissedAt', Date.now().toString());
        }
    });
}

function renderDashboard(data) {
    applyTheme(data.theme || localStorage.getItem("theme") || "light");
    currencySymbol = data.currency_symbol || "$";

    const username = `Hi, ${data.username || "User"}`;
    const plan = data.plan || "Trial";
    const profilepicurl = data.profilepicurl || "/static/images/default-profile.png";
    const profilename = data.profilename || data.username || "User";

    const usernameEl = document.getElementById("username-placeholder");
    if (usernameEl) {
        usernameEl.textContent = username;
    }

    const planBadge = document.getElementById("planBadge");
    if (planBadge) {
        planBadge.textContent = plan;
        planBadge.className = `plan-badge ${plan === "Trial" ? "trial" : ""}`;
    }

    document.getElementById("dashboard-profile-pic")?.setAttribute("src", profilepicurl);

    const greetText = document.getElementById("greeting-text");
    if (greetText) {
        greetText.innerHTML = `Good ${getTimeOfDay()}, ${profilename} 👋`;
    }

    const totInv = document.getElementById("total-invoices");
    if (totInv) {
        totInv.replaceChildren(document.createTextNode(data.total_invoices || 0));
    }

    const padInv = document.getElementById("paid-invoices");
    if (padInv) {
        padInv.replaceChildren(document.createTextNode(data.paid_invoices || 0));
    }

    const pendInv = document.getElementById("pending-invoices");
    if (pendInv) {
        pendInv.replaceChildren(document.createTextNode(data.pending_invoices || 0));
    }

    const totRev = document.getElementById("total-revenue");
    if (totRev) {
        totRev.replaceChildren(
            document.createTextNode(formatCurrency(data.total_revenue || 0, currencySymbol))
        );
    }

    const balanceElement = document.getElementById("balance-amount");
    if (balanceElement) {
        const formattedBalance = formatCurrency(data.balance || 0, currencySymbol);
        balanceElement.textContent = formattedBalance;
        balanceElement.dataset.balance = formattedBalance;
    }

    const notifyCount = document.getElementById("notifyCount");
    if (notifyCount) {
        notifyCount.textContent = data.unread_count || 0;
        notifyCount.style.display = data.unread_count > 0 ? "flex" : "none";
    }

    document.getElementById("upgradeBanner")?.classList.toggle("hidden", plan !== "Trial");

    populateActivityList(data.activities || []);
    animateStatsCards();
}

// ==============================
// STATS LOADING FIX
// ==============================
function showStatsLoading(isLoading) {
    const statValues = document.querySelectorAll('.stat-value');
    statValues.forEach(el => {
        if (isLoading) {
            el.dataset.original = el.textContent;
            el.innerHTML = `<div class="skeleton skeleton-title"></div>`;
        } else {
            const skeleton = el.querySelector('.skeleton');
            if (skeleton) {
                el.innerHTML = el.dataset.original || "0";
            }
        }
    });
}

// ==============================
// FORMAT CURRENCY
// ==============================
function formatCurrency(amount, currency = 'USD') {
    if (amount == null) amount = 0;
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    } catch (e) {
        return `${currency} ${amount}`;
    }
}

// ==============================
// GREETING
// ==============================
function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
}

function updateGreeting() {
    const greetingText = document.getElementById('greeting-text');
    if (greetingText) {
        greetingText.innerHTML = `Good ${getTimeOfDay()}, User 👋`;
    }
}

// ==============================
// ACTIVITY LIST
// ==============================
function populateActivityList(activities) {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;

    if (activities.length === 0) {
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-content">
                    <div class="activity-title">No recent activity</div>
                    <div class="activity-time">Get started by creating your first invoice</div>
                </div>
            </div>
        `;
        return;
    }

    let html = '';
    activities.slice(0, 5).forEach(activity => {
        html += `
            <div class="activity-item">
                <div class="activity-content">
                    <div class="activity-title">${activity.title || "Activity"}</div>
                    <div class="activity-time">${activity.created_at || ""}</div>
                </div>
                <div class="activity-amount">${formatCurrency(activity.amount || 0, currencySymbol)}</div>
            </div>
        `;
    });

    activityList.innerHTML = html;
}

// ==============================
// ANIMATION
// ==============================
function animateStatsCards() {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('visible');
        }, 200 * index);
    });
}

// ==============================
// BALANCE TOGGLE
// ==============================
function toggleBalanceVisibility() {
    const balanceElement = document.getElementById('balance-amount');
    if (!balanceElement) return;

    const isHidden = balanceElement.textContent.trim() === '••••••';
    if (isHidden) {
        balanceElement.textContent = balanceElement.dataset.balance;
    } else {
        balanceElement.textContent = '••••••';
    }
}

// ==============================
// HAPTIC
// ==============================
function showHapticFeedback(element) {
    if (!element) return;
    element.classList.add('haptic-feedback');
    setTimeout(() => {
        element.classList.remove('haptic-feedback');
    }, 200);
}

// ==============================
// TOAST
// ==============================
function showToast(message) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ==============================
// MODAL
// ==============================
function showModal(type, message, redirectUrl = null) {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalMessage = document.getElementById('modalMessage');
    const modalBtn = document.getElementById('modalActionBtn');

    if (!modalOverlay || !modalMessage || !modalBtn) return;

    modalMessage.textContent = message;
    modalBtn.dataset.redirect = redirectUrl || '';
    modalOverlay.classList.add('show');
}

function hideModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('show');
    }
}

// ==============================
// SCROLL INDICATOR
// ==============================
function setupScrollIndicator() {
    const scrollIndicator = document.getElementById('scrollIndicator');
    if (!scrollIndicator) return;

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > 100) {
            scrollIndicator.classList.add('visible');
        } else {
            scrollIndicator.classList.remove('visible');
        }
    });
}

// ==============================
// TEST FUNCTION - FORCE SHOW MODAL
// ==============================
function forceShowAccountModal() {
    console.log("=== FORCE SHOWING ACCOUNT MODAL ===");
    localStorage.removeItem('accountModalDismissedAt');
    showAccountModal();
}

// Make it available in console for testing
window.forceShowAccountModal = forceShowAccountModal;




// ================= AI ASSISTANT FUNCTIONALITY =================
function setupAIAssistant() {
    const promptInput = document.getElementById('aiPromptInput');
    const sendBtn = document.getElementById('aiSendBtn');
    const micBtn = document.getElementById('aiMicBtn');
    const charCounter = document.getElementById('charCounter');
    const responseArea = document.getElementById('aiResponseArea');
    const loadingIndicator = document.getElementById('aiLoadingIndicator');
    
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;

    // Auto-resize textarea and character counter
    promptInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 150) + 'px';
        
        const len = this.value.length;
        charCounter.textContent = `${len}/500`;
        
        if (len > 450) {
            charCounter.classList.add('warning');
        } else {
            charCounter.classList.remove('warning');
        }
        
        sendBtn.disabled = len === 0 || len > 500;
    });

    // Keyboard shortcuts (Enter to send, Shift+Enter for new line)
    promptInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled) {
                handleTextSubmit();
            }
        }
    });

    sendBtn.addEventListener('click', handleTextSubmit);

    async function handleTextSubmit() {
        const text = promptInput.value.trim();
        if (!text) return;

        // UI Updates
        promptInput.value = '';
        promptInput.style.height = 'auto';
        charCounter.textContent = '0/500';
        sendBtn.disabled = true;
        addMessage(text, 'user');
        showLoading(true);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text })
            });

            if (!response.ok) throw new Error('Failed to get AI response');
            
            const data = await response.json();
            addMessage(data.response || 'Sorry, I could not process that.', 'ai');
        } catch (error) {
            console.error('AI Text Error:', error);
            addMessage('An error occurred while processing your request. Please try again.', 'error');
        } finally {
            showLoading(false);
        }
    }

    // Microphone functionality
    micBtn.addEventListener('click', async () => {
        if (isRecording) {
            stopRecording();
        } else {
            await startRecording();
        }
    });

    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                await handleAudioSubmit(audioBlob);
                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecording = true;
            micBtn.classList.add('recording');
            micBtn.title = "Stop recording";
            promptInput.placeholder = "Listening... Speak now";
            promptInput.disabled = true;
            sendBtn.disabled = true;
        } catch (err) {
            console.error('Microphone access denied or error:', err);
            addMessage('Microphone access denied. Please check your browser permissions and try again.', 'error');
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        isRecording = false;
        micBtn.classList.remove('recording');
        micBtn.title = "Voice input";
        promptInput.placeholder = "Ask me anything about your business...";
        promptInput.disabled = false;
        // Re-evaluate send button state based on textarea
        sendBtn.disabled = promptInput.value.trim().length === 0;
    }

    async function handleAudioSubmit(audioBlob) {
        showLoading(true);
        addMessage('🎤 Processing voice input...', 'user');

        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch('/api/ai/voice', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Failed to process audio');

            const data = await response.json();
            addMessage(data.response || 'Sorry, I could not understand the audio.', 'ai');
        } catch (error) {
            console.error('AI Voice Error:', error);
            addMessage('An error occurred while processing your voice input. Please try typing your message instead.', 'error');
        } finally {
            showLoading(false);
        }
    }

    function addMessage(text, type) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-message ${type}`;
        msgDiv.textContent = text;
        responseArea.appendChild(msgDiv);
        responseArea.scrollTop = responseArea.scrollHeight;
    }

    function showLoading(show) {
        loadingIndicator.style.display = show ? 'flex' : 'none';
        if (show) {
            responseArea.scrollTop = responseArea.scrollHeight;
        }
    }
}

