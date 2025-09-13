import {
    checkAuthStatus,
    loginWithDiscord,
    logout,
    checkAuthParams
} from './src/auth.js';
import {
    loadAdminSettings as apiLoadAdminSettings,
    saveAdminSettings as apiSaveAdminSettings,
    loadTable as apiLoadTable,
    loadCurrentUsers as apiLoadCurrentUsers,
    loadAdminUsers as apiLoadAdminUsers,
    addAdminUser as apiAddAdminUser,
    removeAdminUser as apiRemoveAdminUser,
    loadDebugLogs as apiLoadDebugLogs,
    resetAnalytics as apiResetAnalytics,
    getSystemHealth
} from './src/api.js';
import { showNotification } from './src/notifications.js';
import { getSessionId, API_BASE_URL } from './src/utils.js';

let charts = {};
let currentTable = 'page_visits';
let currentOffset = 0;
const pageSize = 25;
let totalRecords = 0;

const DOMElements = {
    loginScreen: document.getElementById('loginScreen'),
    adminPanel: document.getElementById('adminPanel'),
    authLoading: document.getElementById('authLoading'),
    authLoginRequired: document.getElementById('authLoginRequired'),
    authNoAccess: document.getElementById('authNoAccess'),
    totalVisits: document.getElementById('totalVisits'),
    todayVisits: document.getElementById('todayVisits'),
    last7Days: document.getElementById('last7Days'),
    last30Days: document.getElementById('last30Days'),
    clearancesGenerated: document.getElementById('clearancesGenerated'),
    flightPlansReceived: document.getElementById('flightPlansReceived'),
    chartLoading: document.getElementById('chartLoading'),
    clearancesChartLoading: document.getElementById('clearancesChartLoading'),
    requestsChartLoading: document.getElementById('requestsChartLoading'),
    phraseologyTemplate: document.getElementById('phraseologyTemplate'),
    includeAtis: document.getElementById('includeAtis'),
    includeSquawk: document.getElementById('includeSquawk'),
    includeFlightLevel: document.getElementById('includeFlightLevel'),
    includeStartupApproval: document.getElementById('includeStartupApproval'),
    includeInitialClimb: document.getElementById('includeInitialClimb'),
    defaultAltitudes: document.getElementById('defaultAltitudes'),
    squawkMin: document.getElementById('squawkMin'),
    squawkMax: document.getElementById('squawkMax'),
    enableRunwayValidation: document.getElementById('enableRunwayValidation'),
    enableSIDValidation: document.getElementById('enableSIDValidation'),
    maxFlightPlansStored: document.getElementById('maxFlightPlansStored'),
    autoRefreshInterval: document.getElementById('autoRefreshInterval'),
    controllerPollInterval: document.getElementById('controllerPollInterval'),
    enableDetailedLogging: document.getElementById('enableDetailedLogging'),
    enableFlightPlanFiltering: document.getElementById('enableFlightPlanFiltering'),
    atisPollInterval: document.getElementById('atisPollInterval'),
    wsStatus: document.getElementById('wsStatus'),
    environmentInfo: document.getElementById('environmentInfo'),
    systemFlightPlans: document.getElementById('systemFlightPlans'),
    realtimeSupport: document.getElementById('realtimeSupport'),
    lastReset: document.getElementById('lastReset'),
    logLevel: document.getElementById('logLevel'),
    debugLogs: document.getElementById('debugLogs'),
    currentAdminInfo: document.getElementById('currentAdminInfo'),
    adminUsersList: document.getElementById('adminUsersList'),
    newAdminUsername: document.getElementById('newAdminUsername'),
    roleAdmin: document.getElementById('roleAdmin'),
    roleSuperAdmin: document.getElementById('roleSuperAdmin'),
    activeUsersCount: document.getElementById('activeUsersCount'),
    memorySessionsCount: document.getElementById('memorySessionsCount'),
    supabaseSessionsCount: document.getElementById('supabaseSessionsCount'),
    currentUsersTable: document.getElementById('currentUsersTable'),
    currentTableTitle: document.getElementById('currentTableTitle'),
    tableDisplay: document.getElementById('tableDisplay'),
    tableRecordCount: document.getElementById('tableRecordCount'),
    tablePagination: document.getElementById('tablePagination'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    pageInfo: document.getElementById('pageInfo'),
};

const updateAuthUI = (isLoggedIn, user = null) => {
    DOMElements.authLoading.style.display = 'none';
    if (isLoggedIn && user?.is_admin) {
        DOMElements.loginScreen.classList.add('fade-out');
        DOMElements.adminPanel.classList.add('authenticated');
        showNotification('success', 'Access Granted', `Welcome ${user.username}! Admin access confirmed.`);
        loadAdminData();
    } else if (isLoggedIn && user && !user.is_admin) {
        DOMElements.authLoginRequired.style.display = 'none';
        DOMElements.authNoAccess.style.display = 'block';
    } else {
        DOMElements.authLoginRequired.style.display = 'block';
        DOMElements.authNoAccess.style.display = 'none';
    }
};

const loadAdminData = async () => {
    await Promise.all([loadAnalytics(), loadSettings(), loadSystemInfo()]);
    loadDebugLogs();
};

const loadAnalytics = async () => {
    try {
        const analytics = await apiLoadAnalytics();
        const today = new Date().toISOString().split('T')[0];
        DOMElements.totalVisits.textContent = analytics.totalVisits || 0;
        DOMElements.todayVisits.textContent = analytics.dailyVisits?.[today] || 0;
        DOMElements.last7Days.textContent = analytics.last7Days || 0;
        DOMElements.last30Days.textContent = analytics.last30Days || 0;
        DOMElements.clearancesGenerated.textContent = analytics.clearancesGenerated || 0;
        DOMElements.flightPlansReceived.textContent = analytics.flightPlansReceived || 0;
        loadChartData(analytics.daily_visits, analytics.daily_clearances);
    } catch (error) {
        showNotification('warning', 'Data Load Warning', 'Some analytics data may not be current.');
    }
};

const loadChartData = (dailyVisits, dailyClearances) => {
    renderLineChart('dailyVisitChart', dailyVisits, 'Daily Visits', '#f5de40');
    renderLineChart('clearancesChart', dailyClearances, 'Clearances per Day', '#3498db');
};

const renderLineChart = (canvasId, data, label, color) => {
    const chartCanvas = document.getElementById(canvasId);
    if (!chartCanvas || !data) return;
    const labels = data.map(item => new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const counts = data.map(item => item.count);
    if (charts[canvasId]) charts[canvasId].destroy();
    charts[canvasId] = new Chart(chartCanvas.getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [{ label, data: counts, borderColor: color, backgroundColor: `${color}1a`, borderWidth: 2, fill: true, tension: 0.4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
};

const loadSettings = async () => {
    const settings = await apiLoadAdminSettings();
    if (settings) {
        Object.keys(settings.clearanceFormat).forEach(key => {
            if (DOMElements[key]) DOMElements[key].checked = settings.clearanceFormat[key];
        });
        Object.keys(settings.aviation).forEach(key => {
            if (DOMElements[key]) DOMElements[key].value = Array.isArray(settings.aviation[key]) ? settings.aviation[key].join(',') : settings.aviation[key];
        });
        Object.keys(settings.system).forEach(key => {
            if (DOMElements[key]) DOMElements[key].value = settings.system[key] / (key.includes('Interval') ? (key.includes('second') ? 1000 : 60000) : 1);
        });
    }
};

const saveSettings = async () => {
    const newSettings = {
        clearanceFormat: Object.keys(DOMElements).filter(k => k.startsWith('include')).reduce((acc, key) => ({ ...acc, [key]: DOMElements[key].checked }), { customTemplate: DOMElements.phraseologyTemplate.value }),
        aviation: {
            defaultAltitudes: DOMElements.defaultAltitudes.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)),
            squawkRanges: { min: parseInt(DOMElements.squawkMin.value) || 1000, max: parseInt(DOMElements.squawkMax.value) || 7777, exclude: [7500, 7600, 7700] },
            enableRunwayValidation: DOMElements.enableRunwayValidation.checked,
            enableSIDValidation: DOMElements.enableSIDValidation.checked
        },
        system: {
            maxFlightPlansStored: parseInt(DOMElements.maxFlightPlansStored.value) || 20,
            autoRefreshInterval: (parseInt(DOMElements.autoRefreshInterval.value) || 30) * 1000,
            controllerPollInterval: (parseInt(DOMElements.controllerPollInterval.value) || 5) * 60000,
            enableDetailedLogging: DOMElements.enableDetailedLogging.checked,
            enableFlightPlanFiltering: DOMElements.enableFlightPlanFiltering.checked,
            atisPollInterval: (parseInt(DOMElements.atisPollInterval.value) || 5) * 60000
        }
    };
    const result = await apiSaveAdminSettings(newSettings);
    showNotification(result.success ? 'success' : 'error', result.success ? 'Settings Saved' : 'Save Failed', result.success ? 'All configuration changes have been applied successfully' : 'Unable to save settings. Please try again.');
};

const init = () => {
    document.addEventListener('DOMContentLoaded', () => {
        checkAuthParams(updateAuthUI);
        checkAuthStatus(updateAuthUI);
    });

    Object.keys(window).forEach(key => {
        if (key.startsWith('show') || key.startsWith('load') || key.startsWith('hide') || key.startsWith('login') || key.startsWith('logout')) {
            window[key] = eval(key);
        }
    });
};

init();
