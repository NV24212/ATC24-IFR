import { checkAuth, login, logout, getUser } from './src/auth.js';
import * as api from './src/api.js';
import { storage } from './src/storage.js';
import { setText, setHTML, show, hide } from './src/dom-utils.js';
import { showNotification, setupModalListeners, handleLogout } from './src/shared.js';

let charts = {};
let currentTable = 'page_visits';
let currentOffset = 0;
const pageSize = 25;
let totalRecords = 0;

function updateAuthUI(isLoggedIn, user = null) {
    hide('authLoading');
    if (isLoggedIn && user && user.is_admin) {
        document.getElementById('loginScreen').classList.add('fade-out');
        document.getElementById('adminPanel').classList.add('authenticated');
        showNotification('success', 'Access Granted', `Welcome ${user.username}! Admin access confirmed.`);
        loadAdminData();
    } else if (isLoggedIn && user && !user.is_admin) {
        hide('authLoginRequired');
        show('authNoAccess');
    } else {
        show('authLoginRequired');
        hide('authNoAccess');
    }
}

async function loadAdminData() {
  await Promise.allSettled([
    api.loadAdminAnalytics().then(analytics => {
      const today = new Date().toISOString().split('T')[0];
      setText('totalVisits', analytics.totalVisits || 0);
      setText('todayVisits', analytics.dailyVisits?.[today] || 0);
      setText('clearancesGenerated', analytics.clearancesGenerated || 0);
      setText('flightPlansReceived', analytics.flightPlansReceived || 0);
    }),
    api.loadAdminSettings().then(settings => {
      if (settings) {
        document.getElementById('phraseologyTemplate').value = settings.clearanceFormat?.customTemplate || '';
        document.getElementById('defaultAltitudes').value = settings.aviation?.defaultAltitudes?.join(',') || '';
      }
    }),
    api.getSystemHealth().then(health => {
      setText('environmentInfo', health.environment || 'Unknown');
      setText('systemFlightPlans', health.flight_plan_cache_size !== undefined ? health.flight_plan_cache_size : 'N/A');
    }),
    api.loadDebugLogs()
  ]);
  loadChartData();
}

async function loadChartData() {
    try {
        const chartData = await api.loadChartData();
        hide('chartLoading');
        hide('clearancesChartLoading');
        hide('requestsChartLoading');
        renderLineChart('dailyVisitChart', chartData.daily_visits, 'Daily Visits', '#f5de40');
        renderLineChart('clearancesChart', chartData.daily_clearances, 'Clearances per Day', '#3498db');
        renderLineChart('requestsChart', chartData.daily_visits, 'HTTP Requests per Day', '#e74c3c');
    } catch (error) {}
}

function renderLineChart(canvasId, data, label, color) {
    const chartCanvas = document.getElementById(canvasId);
    if (!chartCanvas || !data) return;
    const last30Days = [];
    const counts = [];
    const dataMap = new Map(data.map(item => [item.date.split('T')[0], item.count]));
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        last30Days.push(dayLabel);
        counts.push(dataMap.get(dateStr) || 0);
    }
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    const ctx = chartCanvas.getContext('2d');
    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: { labels: last30Days, datasets: [{ label, data: counts, borderColor: color, backgroundColor: `${color}1a`, borderWidth: 2, fill: true, tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255, 255, 255, 0.1)' } }, y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' } } } }
    });
}

function showSection(sectionName, buttonElement) {
    document.querySelectorAll('.admin-section').forEach(section => section.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    show(sectionName);
    buttonElement.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('auth') || urlParams.has('error')) {
      window.history.replaceState({}, '', '/admin.html');
    }
    checkAuth(updateAuthUI);
    setupModalListeners();
    document.querySelectorAll('.nav-btn').forEach(btn => {
      if(btn.id !== 'collapseBtn'){
        const sectionName = btn.textContent.trim().toLowerCase().replace(/\s+/g, '-');
        btn.addEventListener('click', (event) => showSection(sectionName, event.currentTarget));
      }
    });
});