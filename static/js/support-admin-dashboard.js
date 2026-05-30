// support-dashboard.js - Business Essential Support Dashboard

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const openSidebar = document.getElementById('openSidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    const refreshDashboard = document.getElementById('refreshDashboard');
    const volumeChart = document.getElementById('volumeChart');
    const statusDonut = document.getElementById('statusDonut');
    const donutLegend = document.getElementById('donutLegend');
    const priorityList = document.getElementById('priorityList');
    const highCount = document.getElementById('highCount');
    const activityFeed = document.getElementById('activityFeed');
    const activityFilter = document.getElementById('activityFilter');
    const toastContainer = document.getElementById('toastContainer');

    // Mock Data
    let statsData = {};
    let volumeData = []

    let statusData = [];
    let priorityData = [];
    let activityData = [];



    // Initialize
    setupEventListeners();
    loadDashboard();

    function setupEventListeners() {
        openSidebar.addEventListener('click', () => { sidebar.classList.add('active'); sidebarOverlay.classList.add('active'); });
        closeSidebar.addEventListener('click', () => { sidebar.classList.remove('active'); sidebarOverlay.classList.remove('active'); });
        sidebarOverlay.addEventListener('click', () => { sidebar.classList.remove('active'); sidebarOverlay.classList.remove('active'); });

        refreshDashboard.addEventListener('click', () => {
            refreshDashboard.disabled = true; refreshDashboard.innerHTML = `<svg viewBox="0 0 24 24" style="animation: spin 1s linear infinite; width:16px; height:16px;"><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 3v5h5" fill="none" stroke="currentColor" stroke-width="2"/></svg> Syncing...`;
            setTimeout(() => {
                renderDashboard();
                refreshDashboard.disabled = false; refreshDashboard.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 3v5h5" fill="none" stroke="currentColor" stroke-width="2"/></svg> Refresh`;
                showToast('✓ Dashboard data refreshed', 'success');
            }, 800);
        });

        activityFilter.addEventListener('change', renderActivity);
    }

    function renderDashboard() {
        renderStats();
        renderVolumeChart();
        renderDonutChart();
        renderPriorityQueue();
        renderActivity();
    }

        async function loadDashboard() {

    try {

        const response = await fetch(
            '/admin/support/dashboard/data',{
                method:'GET',
                credentials:'include'
            }
        );

        const data = await response.json();

        if (!data.success) {
            throw new Error(
                "Failed to load dashboard"
            );
        }

        statsData = data.stats;
        volumeData = data.volume;
        statusData = data.status;
        priorityData = data.priority;
        activityData = data.activity;

        renderDashboard();

    } catch (error) {

        console.error(error);

        showToast(
            "Failed to load dashboard",
            "error"
        );
    }
}

    function renderStats() {
        document.getElementById('statTotal').textContent = statsData.total;
        document.getElementById('statReview').textContent = statsData.review;
        document.getElementById('statResolved').textContent = statsData.resolved;
        document.getElementById('statResponse').textContent = statsData.response;
        document.getElementById('statBreach').textContent = statsData.breach;
    }

    function renderVolumeChart() {
        const maxVal = Math.max(...volumeData.map(d => d.bug + d.sug));
        volumeChart.innerHTML = volumeData.map(d => {
            const total = d.bug + d.sug;
            const bugH = (d.bug / maxVal) * 140;
            const sugH = (d.sug / maxVal) * 140;
            return `
                <div class="bar-group">
                    <div class="bar bug" style="height: ${bugH}px" data-val="${d.bug} bugs"></div>
                    <div class="bar suggestion" style="height: ${sugH}px" data-val="${d.sug} suggestions"></div>
                    <span class="bar-label">${d.day}</span>
                </div>
            `;
        }).join('');
    }

    function renderDonutChart() {
        const total = statusData.reduce((sum, s) => sum + s.count, 0);
        let cumulative = 0;
        const gradientParts = [];

        statusData.forEach(s => {
            const start = cumulative;
            cumulative += (s.count / total) * 100;
            gradientParts.push(`${s.color} ${start}% ${cumulative}%`);
        });

        statusDonut.style.background = `conic-gradient(${gradientParts.join(', ')})`;
        statusDonut.innerHTML = `<div class="donut-center">${total}</div>`;

        donutLegend.innerHTML = statusData.map(s => `
            <div class="legend-item">
                <div class="legend-color" style="background: ${s.color}"></div>
                <span>${s.name}: <strong>${s.count}</strong> (${Math.round((s.count/total)*100)}%)</span>
            </div>
        `).join('');
    }

    function renderPriorityQueue() {
        const highItems = priorityData.filter(p => p.priority === 'high');
        highCount.textContent = `${highItems.length} High`;
        priorityList.innerHTML = priorityData.map(p => `
            <li class="priority-item">
                <div class="priority-info">
                    <span class="title"><code>${p.id}</code> ${p.title}</span>
                    <span class="user">${p.user}</span>
                </div>
                <div class="priority-meta">
                    <span class="badge ${p.priority}">${p.priority}</span>
                    <div class="priority-time">${p.time}</div>
                </div>
            </li>
        `).join('');
    }

    function renderActivity() {
        const filter = activityFilter.value;
        let filtered = activityData;
        if (filter !== 'all') filtered = activityData.filter(a => a.type === filter);

        activityFeed.innerHTML = filtered.map(a => `
            <div class="activity-item">
                <div class="activity-icon ${a.type}">${a.type === 'new' ? '📥' : a.type === 'reply' ? '💬' : '🔄'}</div>
                <div class="activity-content">
                    <p class="activity-text">${a.text}</p>
                    <div class="activity-time">${a.time}</div>
                </div>
            </div>
        `).join('');
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    const style = document.createElement('style');
    style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
});