// notifications.js - Business Essential Notifications Page

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const backButton = document.getElementById('backButton');
    const optionsButton = document.getElementById('optionsButton');
    const optionsDropdown = document.getElementById('optionsDropdown');
    const markAllRead = document.getElementById('markAllRead');
    const clearAll = document.getElementById('clearAll');
    const exportNotifications = document.getElementById('exportNotifications');
    const notificationSettings = document.getElementById('notificationSettings');
    const deleteAll = document.getElementById('deleteAll');
    const typeFilter = document.getElementById('typeFilter');
    const statusFilter = document.getElementById('statusFilter');
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
    const notifications = document.getElementById('notifications');
    const emptyState = document.getElementById('emptyState');
    const unreadCountEl = document.getElementById('unreadCount');
    const totalCountEl = document.getElementById('totalCount');
    const particlesContainer = document.getElementById('particles');
    const notificationsContainer =
    document.getElementById("notifications");


const socket = io("http://127.0.0.1:5000", {
    withCredentials: true,
    transports: ["websocket", "polling"]
});
    // State
    let notificationsData = [];
    
    // Initialize
    createParticles();
    loadNotifications();
    setupEventListeners();
    updateStats();
    
    // Functions
    function setupEventListeners() {
        // Navigation
        backButton.addEventListener('click', () => {
            showHapticFeedback(backButton);
            setTimeout(() => {
                backButton.classList.remove('haptic-feedback');
                window.location.href = '/dashboard';
            }, 200);
        });
        
        // Options dropdown
        optionsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            showHapticFeedback(optionsButton);
            optionsDropdown.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!optionsDropdown.contains(e.target) && e.target !== optionsButton) {
                optionsDropdown.classList.remove('active');
            }
        });
        
        // Dropdown actions
        exportNotifications.addEventListener('click', () => {
            showToast('📤 Exporting notifications...');
            optionsDropdown.classList.remove('active');
        });
        
        notificationSettings.addEventListener('click', () => {
            showToast('⚙️ Opening notification settings...');
            optionsDropdown.classList.remove('active');
        });
        
        deleteAll.addEventListener('click', () => {
            if (confirm('Delete all notifications? This cannot be undone.')) {
                notifications.innerHTML = '';
                updateStats();
                checkEmptyState();
                showToast('🗑️ All notifications deleted', 'success');
            }
            optionsDropdown.classList.remove('active');
        });
        
        // Mark all as read
        markAllRead.addEventListener('click', () => {
            showHapticFeedback(markAllRead);
            document.querySelectorAll('.notification-card.unread').forEach(card => {
                markAsRead(card, false);
            });
            updateStats();
            showToast('✓ All notifications marked as read', 'success');
        });
        
        // Clear all
        clearAll.addEventListener('click', () => {
            showHapticFeedback(clearAll);
            if (confirm('Clear all notifications?')) {
                notifications.innerHTML = '';
                updateStats();
                checkEmptyState();
                showToast('🗑️ All notifications cleared', 'success');
            }
        });
        
        // Filters
        [typeFilter, statusFilter, monthSelect, yearSelect].forEach(filter => {
            filter.addEventListener('change', applyFilters);
        });
        
        // Individual notification actions
        notifications.addEventListener('click', (e) => {
            const card = e.target.closest('.notification-card');
            if (!card) return;
            
            // Mark as read on click
            if (card.classList.contains('unread')) {
                markAsRead(card);
            }
            
            // Handle action button
            if (e.target.closest('.action-btn')) {
                e.stopPropagation();
                const type = card.dataset.type;
                showToast(`🔍 Opening ${type} details...`);
            }
        });
    }
    
async function loadNotifications(forceRefresh = false) {

    try {

        const cached = sessionStorage.getItem("notifications_data");

        // =========================
        // USE CACHE FIRST
        // =========================
        if (!forceRefresh && cached) {
            const data = JSON.parse(cached);
            handleNotifications(data);
            return;
        }

        const response = await fetch("/api/notifications", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== "success") {
            throw new Error(data.message || "Failed to load notifications");
        }

        // =========================
        // CACHE RESULT
        // =========================
        sessionStorage.setItem(
            "notifications_data",
            JSON.stringify(data)
        );

        handleNotifications(data);

    } catch (err) {

        console.error("Notification error:", err);

        // =========================
        // FALLBACK CACHE
        // =========================
        const cached = sessionStorage.getItem("notifications_data");

        if (cached) {
            handleNotifications(JSON.parse(cached));
            return;
        }
    }
}

function handleNotifications(data) {

    const notifications = data.notifications || [];

    console.log("Fetched notifications:", notifications);

    notificationsContainer.innerHTML = "";

    if (notifications.length === 0) {
        notificationsContainer.innerHTML = `
            <div class="empty-notifications">
                No notifications yet
            </div>
        `;
        return;
    }

    notifications.forEach(notification => {
        addNotificationToUI(notification);
    });

    updateStats();

    // =========================
    // APPLY THEME FROM BACKEND
    // =========================
    if (data.theme) {
        applyTheme(data.theme);
        sessionStorage.setItem("theme", data.theme);
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
    
function addNotificationToUI(notification, prepend = false) {

    const card = document.createElement("div");

    // =========================
    // STATUS + TYPE
    // =========================

    const isUnread = !notification.is_read;

    const isCritical =
        notification.status === "overdue" ||
        notification.status === "unpaid";

    card.className = `
        notification-card
        ${isUnread ? "unread" : ""}
        ${isCritical ? "critical" : ""}
    `;

    card.dataset.type = notification.type;
    card.dataset.id = notification.id;

    card.dataset.status =
        isUnread ? "unread" : "read";

    // =========================
    // ICONS
    // =========================

    let iconSVG = "";

    switch (notification.type) {

        case "payment":

            iconSVG = `
                <svg viewBox="0 0 24 24">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"/>

                    <polyline points="22 4 12 14.01 9 11.01"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"/>
                </svg>
            `;

            break;

        case "invoice":

            iconSVG = `
                <svg viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"/>

                    <polyline points="14 2 14 8 20 8"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"/>
                </svg>
            `;

            break;

        case "client":

            iconSVG = `
                <svg viewBox="0 0 24 24">
                    <circle cx="9" cy="7" r="4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"/>

                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"/>
                </svg>
            `;

            break;

        default:

            iconSVG = `
                <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"/>

                    <line x1="12" y1="8" x2="12" y2="12"
                    stroke="currentColor"
                    stroke-width="2"/>

                    <line x1="12" y1="16" x2="12.01" y2="16"
                    stroke="currentColor"
                    stroke-width="2"/>
                </svg>
            `;
    }

    // =========================
    // BADGE CLASS
    // =========================

    const badgeClass = `
        badge
        ${notification.type}
        ${isCritical ? "critical" : ""}
    `;

    // =========================
    // ICON CLASS
    // =========================

    const iconClass = `
        icon
        ${notification.type}
        ${isCritical ? "critical" : ""}
    `;

    // =========================
    // HTML
    // =========================

    card.innerHTML = `

        <div class="card-left">

            <div class="${iconClass}">
                ${iconSVG}
            </div>

            <div class="details">

                <p class="title">
                    ${notification.title}
                </p>

                <p class="description">
                    ${notification.description}
                </p>

                <div class="meta">

                    <span class="${badgeClass}">
                        ${notification.type}
                    </span>

                    <span class="timestamp">
                        ${new Date(notification.created_at).toLocaleString()}
                    </span>

                </div>

            </div>

        </div>

        <div class="card-right">

            ${
                isUnread
                ? `<div class="unread-indicator ${
                    isCritical ? "critical" : ""
                }"></div>`
                : ""
            }

            <button class="action-btn">

                <svg viewBox="0 0 24 24">

                    <polyline
                        points="9 18 15 12 9 6"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />

                </svg>

            </button>

        </div>
    `;

    // =========================
    // ADD TO PAGE
    // =========================

    if (prepend) {

        notificationsContainer.prepend(card);

    } else {

        notificationsContainer.appendChild(card);

    }
}
socket.on(
    "new_notification",
    (notification) => {

        addNotificationToUI(
            notification,
            true
        );

        updateStats();

    }
);
async function markAsRead(card, update = true) {

    const notificationId = card.dataset.id;

    try {

        const response = await fetch(
            "/mark-notifications-read",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    notification_id: notificationId
                })
            }
        );

        const result = await response.json();

        if (result.success) {

            card.classList.remove("unread");

            card.dataset.status = "read";

            const indicator =
                card.querySelector(".unread-indicator");

            if (indicator) {
                indicator.remove();
            }

            if (update) {

                updateStats();

                showToast(
                    "✓ Notification marked as read",
                    "success"
                );
            }

        }

    } catch (error) {

        console.error(
            "Mark read error:",
            error
        );

    }
}
    
    function applyFilters() {
        const type = typeFilter.value;
        const status = statusFilter.value;
        const month = monthSelect.value;
        const year = yearSelect.value;
        
        let visibleCount = 0;
        
        notificationsData.forEach(item => {
            const card = item.element;
            let show = true;
            
            // Type filter
            if (type !== 'all' && item.type !== type) show = false;
            
            // Status filter
            if (status !== 'all' && item.status !== status) show = false;
            
            // Date filter
            if (month !== 'all' || year !== 'all') {
                const cardDate = new Date(item.date);
                if (year !== 'all' && cardDate.getFullYear().toString() !== year) show = false;
                if (month !== 'all' && (cardDate.getMonth() + 1).toString() !== month) show = false;
            }
            
            card.style.display = show ? 'flex' : 'none';
            if (show) visibleCount++;
        });
        
        checkEmptyState(visibleCount);
        
        if (type !== 'all' || status !== 'all' || month !== 'all' || year !== 'all') {
            showToast('🔍 Filters applied');
        }
    }
    
    function updateStats() {
        const unread = document.querySelectorAll('.notification-card.unread').length;
        const total = document.querySelectorAll('.notification-card').length;
        
        unreadCountEl.textContent = unread;
        totalCountEl.textContent = total;
    }
    
    function checkEmptyState(count) {
        const visible = count !== undefined ? count : document.querySelectorAll('.notification-card[style="display: flex"], .notification-card:not([style])').length;
        
        if (visible === 0) {
            notifications.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            notifications.style.display = 'flex';
            emptyState.style.display = 'none';
        }
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
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${type === 'success' || type === 'warning' ? 'white' : 'var(--primary)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${type === 'success' ? '<polyline points="20 6 9 17 4 12"/>' : type === 'warning' ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' : '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'}
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
        document.querySelectorAll('.notification-card').forEach((card, i) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(10px)';
            setTimeout(() => {
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100 + i * 50);
        });
    }, 200);
});
