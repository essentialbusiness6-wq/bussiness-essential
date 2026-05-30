document.addEventListener('DOMContentLoaded', function () {
    // Initialize particles background
    createParticles();

    // Set up event listeners
    setupEventListeners();

    // Initialize greeting
    updateGreeting();

    // Fetch dashboard data
    fetchDashboardData();

    // Set up scroll indicator
    setupScrollIndicator();
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
function fetchDashboardData() {

    // SHOW LOADING STATE
    showStatsLoading(true);


    fetch("/dashboard/data", {
        "method": "GET",
        "credentials": "include"
    })
        .then(res => {

            if (res.status === 401) {
                showModal(
                    "error",
                    "Session expired. Please log in again.",
                    "/login"
                );

                throw new Error("Unauthorized");
            }

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            return res.json();
        })

        .then(data => {

            console.log("Dashboard Data:", data);

            // REMOVE LOADING STATE
            showStatsLoading(false);

            // =========================
            // USER DATA
            // =========================
            currencySymbol = data.currency_symbol || "$";
            const username = `Hi, ${data.username|| "User"}`;
            const plan = data.plan || "Trial";
            const profilepicurl =
                data.profilepicurl ||
                "/static/images/default-profile.png";

            const profilename =
                data.user_data?.[3] || username;

            const usernameEl =
                document.getElementById("username-placeholder");

            if (usernameEl) {
                usernameEl.textContent = username;
            }

            const planBadge =
                document.getElementById("planBadge");

            if (planBadge) {
                planBadge.textContent = plan;
                planBadge.className =
                    `plan-badge ${plan === 'Trial' ? 'trial' : ''}`;
            }

            const profilePic =
                document.getElementById("dashboard-profile-pic");

            if (profilePic) {
                profilePic.src = profilepicurl;
            }

            // =========================
            // BALANCE
            // =========================

            const balanceElement =
                document.getElementById("balance-amount");

            const formattedBalance = formatCurrency(
                data.wallet_balance || 0,
                currencySymbol
            );

            if (balanceElement) {
                balanceElement.textContent = formattedBalance;
                balanceElement.dataset.balance = formattedBalance;
            }

            // =========================
            // GREETING
            // =========================

            const greetingText =
                document.getElementById("greeting-text");

            if (greetingText) {
                greetingText.innerHTML =
                    `Good ${getTimeOfDay()}, ${profilename} 👋`;
            }

            // =========================
            // STATS
            // =========================

            const totalInvoices =
                document.getElementById("total-invoices");

            const paidInvoices =
                document.getElementById("paid-invoices");

            const pendingInvoices =
                document.getElementById("pending-invoices");

            const totalRevenue =
                document.getElementById("total-revenue");

            if (totalInvoices) {
                totalInvoices.textContent =
                    data.total_invoices || 0;
            }

            if (paidInvoices) {
                paidInvoices.textContent =
                    data.paid_invoices || 0;
            }

            if (pendingInvoices) {
                pendingInvoices.textContent =
                    data.pending_invoices || 0;
            }

            if (totalRevenue) {
                totalRevenue.textContent = formatCurrency(
                    data.total_revenue || 0,
                    currencySymbol
                );
            }

            // =========================
            // NOTIFICATIONS
            // =========================

            const notifyCount =
                document.getElementById("notifyCount");

            if (notifyCount) {
                notifyCount.textContent =
                    data.unread_count || 0;

                notifyCount.style.display =
                    data.unread_count > 0
                        ? 'flex'
                        : 'none';
            }

            // =========================
            // UPGRADE BANNER
            // =========================

            const upgradeBanner =
                document.getElementById("upgradeBanner");

            if (upgradeBanner) {
                upgradeBanner.classList.toggle(
                    'hidden',
                    plan !== 'Trial'
                );
            }

            // =========================
            // ACTIVITY
            // =========================

            populateActivityList(data.activities || []);

            // =========================
            // ANIMATION
            // =========================

            setTimeout(() => {
                animateStatsCards();
            }, 300);

        })

        .catch(err => {

            console.error(
                "Error fetching dashboard data:",
                err
            );

            showStatsLoading(false);

            if (err.message !== "Unauthorized") {
                showModal(
                    "error",
                    "Failed to load dashboard data. Please try again later."
                );
            }
        });
}

// ==============================
// STATS LOADING FIX
// ==============================
function showStatsLoading(isLoading) {

    const statValues = document.querySelectorAll('.stat-value');

    statValues.forEach(el => {

        if (isLoading) {

            el.dataset.original = el.textContent;

            el.innerHTML = `
                <div class="skeleton skeleton-title"></div>
            `;

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

    if (amount == null) {
        amount = 0;
    }

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

    const greetingText =
        document.getElementById('greeting-text');

    if (greetingText) {
        greetingText.innerHTML =
            `Good ${getTimeOfDay()}, User 👋`;
    }
}

// ==============================
// ACTIVITY LIST
// ==============================
function populateActivityList(activities) {

    const activityList =
        document.getElementById('activity-list');

    if (!activityList) return;

    if (activities.length === 0) {

        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-content">
                    <div class="activity-title">
                        No recent activity
                    </div>

                    <div class="activity-time">
                        Get started by creating your first invoice
                    </div>
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

                    <div class="activity-title">
                        ${activity[1] || "Activity"}
                    </div>

                    <div class="activity-time">
                        ${activity[2] || ""}
                    </div>

                </div>

                <div class="activity-amount">
                    ${formatCurrency(activity[3] || 0, currencySymbol)}
                </div>
            </div>
        `;
    });

    activityList.innerHTML = html;
}

// ==============================
// ANIMATION
// ==============================
function animateStatsCards() {

    const statCards =
        document.querySelectorAll('.stat-card');

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

    const balanceElement =
        document.getElementById('balance-amount');

    if (!balanceElement) return;

    const isHidden =
        balanceElement.textContent.trim() === '••••••';

    if (isHidden) {

        balanceElement.textContent =
            balanceElement.dataset.balance;

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

    const existingToast =
        document.querySelector('.toast');

    if (existingToast) {
        existingToast.remove();
    }

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

    const modalOverlay =
        document.getElementById('modalOverlay');

    const modalMessage =
        document.getElementById('modalMessage');

    const modalBtn =
        document.getElementById('modalActionBtn');

    if (!modalOverlay || !modalMessage || !modalBtn) {
        return;
    }

    modalMessage.textContent = message;

    modalBtn.dataset.redirect = redirectUrl || '';

    modalOverlay.classList.add('show');
}

function hideModal() {

    const modalOverlay =
        document.getElementById('modalOverlay');

    if (modalOverlay) {
        modalOverlay.classList.remove('show');
    }
}

// ==============================
// SCROLL INDICATOR
// ==============================
function setupScrollIndicator() {

    const scrollIndicator =
        document.getElementById('scrollIndicator');

    if (!scrollIndicator) return;

    window.addEventListener('scroll', () => {

        const scrollTop =
            window.pageYOffset ||
            document.documentElement.scrollTop;

        if (scrollTop > 100) {
            scrollIndicator.classList.add('visible');
        } else {
            scrollIndicator.classList.remove('visible');
        }
    });
}