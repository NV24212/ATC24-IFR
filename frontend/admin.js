import {
    checkAuthStatus,
    loginWithDiscord,
    logout,
    checkAuthParams,
    getCurrentUser
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
import { showNotification, showAuthError } from './src/notifications.js';
import { API_BASE_URL } from './src/utils.js';

let analytics = {};
let settings = {};
let dailyVisitChart = null;
let charts = {};
let currentTable = 'page_visits';
let currentOffset = 0;
const pageSize = 25;
let totalRecords = 0;

function goToMainSite() {
    window.location.href = '/';
}

function updateAuthUI(isLoggedIn, user = null) {
    const loginScreen = document.getElementById('loginScreen');
    const adminPanel = document.getElementById('adminPanel');
    const authLoading = document.getElementById('authLoading');
    const authLoginRequired = document.getElementById('authLoginRequired');
    const authNoAccess = document.getElementById('authNoAccess');

    authLoading.style.display = 'none';

    if (isLoggedIn && user && user.is_admin) {
        loginScreen.classList.add('fade-out');
        adminPanel.classList.add('authenticated');
        showNotification('success', 'Access Granted', `Welcome ${user.username}! Admin access confirmed.`);
        loadAdminData();
    } else if (isLoggedIn && user && !user.is_admin) {
        authLoginRequired.style.display = 'none';
        authNoAccess.style.display = 'block';
    } else {
        authLoginRequired.style.display = 'block';
        authNoAccess.style.display = 'none';
    }
}

async function loadSystemInfo() {
    const wsStatusDiv = document.getElementById('wsStatus');
    try {
        const health = await getSystemHealth(); // Imported from api.js
        document.getElementById('environmentInfo').textContent = health.environment || 'Unknown';
        document.getElementById('systemFlightPlans').textContent = health.flight_plan_cache_size !== undefined ? health.flight_plan_cache_size : 'N/A';

        // The health check from app.py provides websocket status via flight plan cache size
        const wsStatus = (health.flight_plan_cache_size > 0) ? 'connected' : 'disconnected';
        document.getElementById('realtimeSupport').textContent = wsStatus;

        if (wsStatus === 'connected') {
            wsStatusDiv.innerHTML = '<div class="status-message online">WebSocket Connected (Receiving Flight Plans)</div>';
        } else {
            wsStatusDiv.innerHTML = `<div class="status-message offline">WebSocket Disconnected or No Data</div>`;
        }

    } catch (error) {
        console.error('Failed to load system info:', error);
        wsStatusDiv.innerHTML = '<div class="status-message offline">Failed to get system status</div>';
        document.getElementById('environmentInfo').textContent = 'Error';
    }
}

async function loadAdminData() {
  const results = await Promise.allSettled([
    loadAnalytics(),
    loadSettings(),
    loadSystemInfo(),
    loadDebugLogs()
  ]);

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const failedComponent = ['Analytics', 'Settings', 'System Info', 'Debug Logs'][i];
      console.error(`Failed to load ${failedComponent}:`, result.reason);
      showNotification('error', 'Component Load Failed', `Could not load data for: ${failedComponent}`);
    }
  });
}

async function loadAnalytics() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/analytics`, {
      credentials: 'include'
    });
    analytics = await response.json();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('totalVisits').textContent = analytics.totalVisits || 0;
    document.getElementById('todayVisits').textContent = analytics.dailyVisits?.[today] || 0;
    document.getElementById('last7Days').textContent = analytics.last7Days || 0;
    document.getElementById('last30Days').textContent = analytics.last30Days || 0;
    document.getElementById('clearancesGenerated').textContent = analytics.clearancesGenerated || 0;
    document.getElementById('flightPlansReceived').textContent = analytics.flightPlansReceived || 0;
    loadChartData();
  } catch (error) {
    console.error('Failed to load analytics:', error);
    showNotification('warning', 'Data Load Warning', 'Some analytics data may not be current. Refreshing automatically...');
  }
}

async function loadChartData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/charts`, {
            credentials: 'include'
        });
        const chartData = await response.json();
        document.getElementById('chartLoading').style.display = 'none';
        document.getElementById('clearancesChartLoading').style.display = 'none';
        document.getElementById('requestsChartLoading').style.display = 'none';
        renderLineChart('dailyVisitChart', chartData.daily_visits, 'Daily Visits', '#f5de40');
        renderLineChart('clearancesChart', chartData.daily_clearances, 'Clearances per Day', '#3498db');
        renderLineChart('requestsChart', chartData.daily_visits, 'HTTP Requests per Day', '#e74c3c');
    } catch (error) {
        console.error('Failed to load chart data:', error);
    }
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
        data: {
            labels: last30Days,
            datasets: [{
                label: label,
                data: counts,
                borderColor: color,
                backgroundColor: `${color}1a`,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: color,
                pointBorderColor: '#000',
                pointBorderWidth: 1,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: color,
                    bodyColor: '#ffffff',
                    borderColor: color,
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#888', font: { size: 11 }, maxTicksLimit: 8 }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#888', font: { size: 11 }, precision: 0 }
                }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });
}

async function loadSettings() {
    settings = await apiLoadAdminSettings();
    if (settings) {
        document.getElementById('phraseologyTemplate').value = settings.clearanceFormat?.customTemplate || '{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}.';
        document.getElementById('includeAtis').checked = settings.clearanceFormat?.includeAtis !== false;
        document.getElementById('includeSquawk').checked = settings.clearanceFormat?.includeSquawk !== false;
        document.getElementById('includeFlightLevel').checked = settings.clearanceFormat?.includeFlightLevel !== false;
        document.getElementById('includeStartupApproval').checked = settings.clearanceFormat?.includeStartupApproval !== false;
        document.getElementById('includeInitialClimb').checked = settings.clearanceFormat?.includeInitialClimb !== false;
        document.getElementById('defaultAltitudes').value = settings.aviation?.defaultAltitudes?.join(',') || '1000,2000,3000,4000,5000';
        document.getElementById('squawkMin').value = settings.aviation?.squawkRanges?.min || 1000;
        document.getElementById('squawkMax').value = settings.aviation?.squawkRanges?.max || 7777;
        document.getElementById('enableRunwayValidation').checked = settings.aviation?.enableRunwayValidation || false;
        document.getElementById('enableSIDValidation').checked = settings.aviation?.enableSIDValidation || false;
        document.getElementById('maxFlightPlansStored').value = settings.system?.maxFlightPlansStored || 20;
        document.getElementById('autoRefreshInterval').value = (settings.system?.autoRefreshInterval || 30000) / 1000;
        document.getElementById('controllerPollInterval').value = (settings.system?.controllerPollInterval || 300000) / 60000;
        document.getElementById('enableDetailedLogging').checked = settings.system?.enableDetailedLogging || false;
        document.getElementById('enableFlightPlanFiltering').checked = settings.system?.enableFlightPlanFiltering || false;
        document.getElementById('atisPollInterval').value = (settings.system?.atisPollInterval || 300000) / 60000;
    }
}

async function saveSettings() {
    const newSettings = {
        clearanceFormat: {
            customTemplate: document.getElementById('phraseologyTemplate').value,
            includeAtis: document.getElementById('includeAtis').checked,
            includeSquawk: document.getElementById('includeSquawk').checked,
            includeFlightLevel: document.getElementById('includeFlightLevel').checked,
            includeStartupApproval: document.getElementById('includeStartupApproval').checked,
            includeInitialClimb: document.getElementById('includeInitialClimb').checked
        },
        aviation: {
            defaultAltitudes: document.getElementById('defaultAltitudes').value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)),
            squawkRanges: {
                min: parseInt(document.getElementById('squawkMin').value) || 1000,
                max: parseInt(document.getElementById('squawkMax').value) || 7777,
                exclude: [7500, 7600, 7700]
            },
            enableRunwayValidation: document.getElementById('enableRunwayValidation').checked,
            enableSIDValidation: document.getElementById('enableSIDValidation').checked
        },
        system: {
            maxFlightPlansStored: parseInt(document.getElementById('maxFlightPlansStored').value) || 20,
            autoRefreshInterval: (parseInt(document.getElementById('autoRefreshInterval').value) || 30) * 1000,
            controllerPollInterval: (parseInt(document.getElementById('controllerPollInterval').value) || 5) * 60000,
            enableDetailedLogging: document.getElementById('enableDetailedLogging').checked,
            enableFlightPlanFiltering: document.getElementById('enableFlightPlanFiltering').checked,
            atisPollInterval: (parseInt(document.getElementById('atisPollInterval').value) || 5) * 60000
        }
    };

    const result = await apiSaveAdminSettings(newSettings);
    if (result.success) {
        showNotification('success', 'Settings Saved', 'All configuration changes have been applied successfully');
        settings = result.settings;
    } else {
        showNotification('error', 'Save Failed', 'Unable to save settings. Please try again.');
    }
}

// This function was removed to resolve the "Identifier has already been declared" error.
// It is now correctly imported from api.js as apiResetAnalytics.

// This function was moved to api.js to consolidate API calls.
// async function loadDebugLogs() { ... }

function clearLogDisplay() {
  document.getElementById('debugLogs').innerHTML = '<div class="loading-message">Log display cleared. Click "Refresh Logs" to reload.</div>';
}

async function loadTable(tableName) {
  currentTable = tableName;
  currentOffset = 0;
  document.querySelectorAll('.table-nav-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  const titles = {
    'page_visits': 'Page Visits',
    'clearance_generations': 'Clearance Generations',
    'flight_plans_received': 'Flight Plans Received',
    'user_sessions': 'User Sessions',
    'discord_users': 'Discord Users',
    'admin_activities': 'Admin Activities'
  };
  document.getElementById('currentTableTitle').textContent = titles[tableName] || tableName;
  await fetchTableData();
}

async function fetchTableData() {
  const tableDisplay = document.getElementById('tableDisplay');
  tableDisplay.innerHTML = '<div class="table-loading">Loading table data...</div>';
  try {
    const data = await apiLoadTable(currentTable, pageSize, currentOffset);
    totalRecords = data.totalCount || 0;
    if (data.setupRequired) {
      tableDisplay.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--text-muted);">
          <div style="font-size: 18px; color: var(--primary-color); margin-bottom: 15px;">⚠️ Database Setup Required</div>
          <div style="margin-bottom: 20px;">${data.message || 'The required table does not exist.'}</div>
          <button class="nav-btn" onclick="refreshCurrentTable()" style="margin: 10px;">Retry after Setup</button>
        </div>
      `;
      document.getElementById('tableRecordCount').textContent = 'Setup required';
      document.getElementById('tablePagination').style.display = 'none';
      return;
    }
    if (!data.data || data.data.length === 0) {
      tableDisplay.innerHTML = '<div class="table-loading">No records found in this table.</div>';
      document.getElementById('tableRecordCount').textContent = '0 records';
      document.getElementById('tablePagination').style.display = 'none';
      return;
    }
    const startRecord = currentOffset + 1;
    const endRecord = Math.min(currentOffset + pageSize, totalRecords);
    document.getElementById('tableRecordCount').textContent = `Showing ${startRecord}-${endRecord} of ${totalRecords} records`;
    let tableHtml;
    if (currentTable === 'discord_users') {
      tableHtml = generateCardLayoutHtml(data.data);
    } else if (currentTable === 'clearance_generations') {
        tableHtml = generateClearanceTableHtml(data.data);
    }
    else {
      tableHtml = generateTableHtml(data.data);
    }
    tableDisplay.innerHTML = tableHtml;
    updatePagination();
  } catch (error) {
    tableDisplay.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #ff6b6b;">
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">❌ Failed to Load Table Data</div>
        <div style="font-family: 'SF Mono', 'Monaco', monospace; font-size: 13px; color: #ffa500; margin-bottom: 20px;">${escapeHtml(error.message)}</div>
        <button class="nav-btn" onclick="refreshCurrentTable()" style="margin-top: 20px;">Try Again</button>
      </div>
    `;
    document.getElementById('tableRecordCount').textContent = 'Error';
    showNotification('error', 'Table Load Error', `Failed to fetch data for ${currentTable}.`);
  }
}

function generateTableHtml(data) {
  if (!data || data.length === 0) {
    const noData = document.createElement('div');
    noData.className = 'table-loading';
    noData.textContent = 'No data available';
    return noData;
  }

  const allColumns = Object.keys(data[0]);
  const sensitiveColumns = ['ip_address', 'user_agent', 'raw_data'];
  const columns = allColumns.filter(col => !sensitiveColumns.includes(col));

  const table = document.createElement('table');
  table.className = 'data-table';

  const thead = table.createTHead();
  const headerRow = thead.insertRow();
  columns.forEach(col => {
    let displayName = col.replace(/_/g, ' ').toUpperCase();
    if (col === 'session_id') displayName = 'SESSION';
    if (col === 'page_path') displayName = 'PAGE';
    if (col === 'created_at') displayName = 'TIME';
    if (col === 'callsign') displayName = 'CALLSIGN';
    if (col === 'destination') displayName = 'DEST';
    if (col === 'flight_level') displayName = 'FL';
    const th = document.createElement('th');
    th.textContent = displayName;
    headerRow.appendChild(th);
  });

  const tbody = table.createTBody();
  data.forEach(rowData => {
    const row = tbody.insertRow();
    columns.forEach(col => {
      const cell = row.insertCell();
      let value = rowData[col];

      if (value === null || value === undefined) {
        cell.textContent = '-';
      } else if (typeof value === 'object') {
        cell.textContent = JSON.stringify(value);
      } else if (typeof value === 'string' && value.length > 50) {
        const span = document.createElement('span');
        span.className = 'table-cell-truncated';
        const escapedValue = escapeHtml(value);
        span.innerHTML = `${escapedValue}<i class="info-icon">i</i>`;
        span.addEventListener('click', () => showInfoPopup(value));
        cell.appendChild(span);
      } else if (col.includes('_at') || col.includes('timestamp')) {
        try {
          cell.textContent = new Date(value).toLocaleString();
        } catch (e) {
          cell.textContent = value;
        }
      } else if (col === 'session_id' && typeof value === 'string') {
        cell.textContent = value.substring(0, 8) + '...';
      } else {
        cell.textContent = String(value);
      }
    });
  });

  return table;
}

function generateCardLayoutHtml(data) {
  if (!data || data.length === 0) {
    return '<div class="table-loading">No data available</div>';
  }
  let html = '<div class="card-grid">';
  data.forEach(row => {
    html += '<div class="data-card">';
    for (const key in row) {
      let value = row[key];
      if (value === null || value === undefined) {
        value = '-';
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      let valueHtml = escapeHtml(String(value));
      if (typeof value === 'string' && value.length > 30) {
        valueHtml = `<span class="table-cell-truncated" onclick='showInfoPopup(${JSON.stringify(value)})'>${escapeHtml(value.substring(0, 30))}...<i class="info-icon">i</i></span>`;
      }
      html += `
        <div class="data-card-row">
          <span class="data-card-key">${key.replace(/_/g, ' ')}</span>
          <span class="data-card-value">${valueHtml}</span>
        </div>
      `;
    }
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function generateClearanceTableHtml(data) {
  if (!data || data.length === 0) {
    return '<div class="table-loading">No data available</div>';
  }
  const columns = ['callsign', 'destination', 'clearance_text', 'discord_username', 'created_at'];
  const columnNames = ['Callsign', 'Destination', 'Clearance', 'Generated By', 'Timestamp'];
  let html = '<table class="data-table"><thead><tr>';
  columnNames.forEach(col => {
    html += `<th>${col}</th>`;
  });
  html += '</tr></thead><tbody>';
  data.forEach(row => {
    html += '<tr>';
    columns.forEach(col => {
      let value = row[col];
      if (value === null || value === undefined) {
        value = '-';
      } else if (col === 'created_at') {
        value = new Date(value).toLocaleString();
      } else if (typeof value === 'string' && value.length > 50) {
        const escapedValue = escapeHtml(value);
        value = `<span class="table-cell-truncated" onclick='showInfoPopup(${JSON.stringify(value)})'>${escapedValue}<i class="info-icon">i</i></span>`;
      }
      html += `<td>${value}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

function updatePagination() {
  const pagination = document.getElementById('tablePagination');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const pageInfo = document.getElementById('pageInfo');
  const currentPage = Math.floor(currentOffset / pageSize) + 1;
  const totalPages = Math.ceil(totalRecords / pageSize);
  prevBtn.disabled = currentOffset === 0;
  nextBtn.disabled = currentOffset + pageSize >= totalRecords;
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  pagination.style.display = totalPages > 1 ? 'flex' : 'none';
}

async function previousPage() {
  if (currentOffset > 0) {
    currentOffset = Math.max(0, currentOffset - pageSize);
    await fetchTableData();
  }
}

async function nextPage() {
  if (currentOffset + pageSize < totalRecords) {
    currentOffset += pageSize;
    await fetchTableData();
  }
}

async function refreshCurrentTable() {
  await fetchTableData();
}

async function loadCurrentUsers() {
    const usersTable = document.getElementById('currentUsersTable');
    try {
        const data = await apiLoadCurrentUsers();
        document.getElementById('activeUsersCount').textContent = data.activeCount || 0;
        document.getElementById('memorySessionsCount').textContent = data.memorySessionsCount || 0;
        document.getElementById('supabaseSessionsCount').textContent = data.supabaseSessionsCount || 0;
        if (!data.users || data.users.length === 0) {
            usersTable.innerHTML = '<div class="table-loading">No active users in the last 5 minutes</div>';
            return;
        }
        let usersHtml = '<div class="current-users-grid">';
        data.users.forEach(user => {
            const lastActivity = new Date(user.last_activity);
            const timeAgo = getTimeAgo(lastActivity);
            usersHtml += `
            <div class="user-card">
              <div class="user-card-header">
                <span class="user-session-id">${user.session_id}</span>
                <span class="user-source ${user.source}">${user.source}</span>
              </div>
              <div class="user-stats">
                <div class="user-stat">
                  <div class="user-stat-value">${user.page_views || 0}</div>
                  <div class="user-stat-label">Page Views</div>
                </div>
                <div class="user-stat">
                  <div class="user-stat-value">${user.clearances_generated || 0}</div>
                  <div class="user-stat-label">Clearances</div>
                </div>
              </div>
              <div class="user-last-activity">
                Last activity: ${timeAgo}
              </div>
            </div>
          `;
        });
        usersHtml += '</div>';
        usersTable.innerHTML = usersHtml;
    } catch (error) {
        usersTable.innerHTML = '<div class="table-loading">Error loading current users</div>';
    }
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleString();
  }
}

async function loadCurrentAdminInfo() {
  const currentAdminDiv = document.getElementById('currentAdminInfo');
  const currentUser = getCurrentUser();
  if (currentUser) {
    currentAdminDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px;">
        ${currentUser.avatar ? `<img src="${currentUser.avatar}" alt="Avatar" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid var(--primary-color);">` : ''}
        <div style="flex: 1;">
          <div style="font-size: 18px; font-weight: 600; color: var(--primary-color); margin-bottom: 5px;">
            ${currentUser.username}
          </div>
          <div style="color: var(--text-muted); font-size: 14px;">
            Discord ID: ${currentUser.discord_id} | Email: ${currentUser.email || 'N/A'}
          </div>
          <div style="color: var(--text-muted); font-size: 12px; margin-top: 5px;">
            Roles: ${currentUser.roles ? currentUser.roles.join(', ') : 'admin'}
          </div>
        </div>
        <div style="padding: 8px 16px; background: var(--primary-color); color: #000; border-radius: 6px; font-size: 12px; font-weight: 600;">
          ADMIN ACCESS
        </div>
      </div>
    `;
  }
}

async function loadAdminUsers() {
    const container = document.getElementById('adminUsersList');
    try {
        const data = await apiLoadAdminUsers();
        displayAdminUsers(data.users || []);
    } catch (error) {
        container.innerHTML = `<div style="padding: 20px; text-align: center; color: #ff6b6b;">Failed to load admin users</div>`;
    }
}

function displayAdminUsers(users) {
  const container = document.getElementById('adminUsersList');
  const currentUser = getCurrentUser();
  if (users.length === 0) {
    container.innerHTML = `<div class="loading-message">No admin users found</div>`;
    return;
  }

  const userListContainer = document.createElement('div');
  userListContainer.className = 'user-list-container';

  users.forEach(user => {
    const userItem = document.createElement('div');
    userItem.className = 'user-list-item';
    userItem.innerHTML = `
      <img src="${user.avatar || 'logo.png'}" alt="Avatar" class="user-list-avatar">
      <div class="user-list-info">
        <div class="user-list-name">${user.username}</div>
        <div class="user-list-details">
          <span>ID: ${user.discord_id}</span> | <span>Roles: ${user.roles ? user.roles.join(', ') : 'admin'}</span>
        </div>
      </div>
      <div class="user-list-actions">
        ${user.discord_id !== currentUser.discord_id
          ? `<button class="danger-btn small-btn" data-user-id="${user.id}">Remove</button>`
          : `<span class="current-user-tag">YOU</span>`}
      </div>
    `;
    if (user.discord_id !== currentUser.discord_id) {
      const removeBtn = userItem.querySelector('.danger-btn');
      removeBtn.addEventListener('click', () => removeAdminUser(removeBtn.dataset.userId));
    }
    userListContainer.appendChild(userItem);
  });

  container.innerHTML = '';
  container.appendChild(userListContainer);
}

async function addAdminUser() {
  const username = document.getElementById('newAdminUsername').value.trim();
  if (!username) {
    showNotification('error', 'Validation Error', 'Please enter a Discord username');
    return;
  }
  const roles = [];
  if (document.getElementById('roleAdmin').checked) roles.push('admin');
  if (document.getElementById('roleSuperAdmin').checked) roles.push('super_admin');
  const data = await apiAddAdminUser(username, roles);
  if (data.success) {
    showNotification('success', 'User Added', `${username} has been granted admin access`);
    clearAddUserForm();
    loadAdminUsers();
  } else {
    showNotification('error', 'Add Failed', data.error || 'Failed to add admin user');
  }
}

async function removeAdminUser(userId) {
  if (!confirm('Are you sure you want to remove this admin user? This cannot be undone.')) {
    return;
  }
  const data = await apiRemoveAdminUser(userId);
  if (data.success) {
    showNotification('success', 'User Removed', 'Admin user has been removed');
    loadAdminUsers();
  } else {
    showNotification('error', 'Remove Failed', data.error || 'Failed to remove admin user');
  }
}

function clearAddUserForm() {
  document.getElementById('newAdminUsername').value = '';
  document.getElementById('roleAdmin').checked = true;
  document.getElementById('roleSuperAdmin').checked = false;
}

function showRemoveAdminDialog() {
  const username = prompt('Enter the Discord username of the admin user to remove:');
  if (username) {
    showNotification('info', 'Feature Coming Soon', 'Use the Remove button next to each user in the list above');
  }
}

function showSection(sectionName) {
  document.querySelectorAll('.admin-section').forEach(section => {
    section.classList.remove('active');
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(sectionName).classList.add('active');
  event.target.classList.add('active');
  if (sectionName === 'analytics') {
    loadAnalytics();
  } else if (sectionName === 'tables') {
    loadCurrentUsers();
    loadTable('page_visits');
  } else if (sectionName === 'users') {
    loadCurrentAdminInfo();
    loadAdminUsers();
  } else if (sectionName === 'system') {
    loadSystemInfo();
    loadDebugLogs();
  }
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function showInfoPopup(content) {
    let popup = document.getElementById('infoPopup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'infoPopup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: var(--surface-primary);
            color: var(--text-normal);
            padding: 20px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            z-index: 2000;
            max-width: 80%;
            max-height: 80%;
            overflow-y: auto;
            box-shadow: 0 5px 15px rgba(0,0,0,0.5);
        `;
        const contentEl = document.createElement('pre');
        contentEl.id = 'infoPopupContent';
        contentEl.style.whiteSpace = 'pre-wrap';
        contentEl.style.wordBreak = 'break-all';
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.onclick = hideInfoPopup;
        closeBtn.style.cssText = `
            margin-top: 15px;
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            background-color: var(--primary-color);
            color: var(--background-primary);
            cursor: pointer;
            display: block;
            margin-left: auto;
            margin-right: auto;
        `;
        popup.appendChild(contentEl);
        popup.appendChild(closeBtn);
        document.body.appendChild(popup);
    }
    document.getElementById('infoPopupContent').textContent = content;
    popup.style.display = 'block';
}

function hideInfoPopup() {
    const popup = document.getElementById('infoPopup');
    if (popup) {
        popup.style.display = 'none';
    }
}

async function handleResetAnalyticsClick() {
    if (!confirm('This will permanently delete all analytics data. Are you sure?')) {
        return;
    }
    const result = await apiResetAnalytics();
    if (result.success) {
        showNotification('success', 'Analytics Reset', 'All analytics data has been cleared successfully');
        loadAnalytics();
    } else {
        showNotification('error', 'Reset Failed', 'Unable to reset analytics. Please try again.');
    }
}

function initializeAdminPanel() {
    // Auth
    const authHandled = checkAuthParams(updateAuthUI);
    if (!authHandled) {
        checkAuthStatus(updateAuthUI);
    }
    document.querySelector('.discord-login-btn')?.addEventListener('click', loginWithDiscord);
    document.querySelector('.nav-btn[onclick*="goToMainSite"]')?.addEventListener('click', goToMainSite);
    document.querySelectorAll('.logout-btn').forEach(btn => btn.addEventListener('click', () => logout(updateAuthUI)));

    // Sidebar
    document.getElementById('collapseBtn')?.addEventListener('click', () => {
        document.querySelector('.admin-container')?.classList.toggle('sidebar-collapsed');
    });

    // Main Navigation
    document.querySelectorAll('.admin-nav .nav-btn').forEach(btn => {
        if (btn.id !== 'collapseBtn') {
            const section = btn.textContent.trim().toLowerCase().replace(' ', '-');
            btn.addEventListener('click', () => showSection(section));
        }
    });

    // Analytics
    document.getElementById('resetAnalyticsBtn')?.addEventListener('click', handleResetAnalyticsClick);

    // Tables
    document.querySelectorAll('.table-nav-btn').forEach(btn => {
        const tableName = btn.textContent.trim().toLowerCase().replace(' ', '_');
        btn.addEventListener('click', () => loadTable(tableName));
    });
    document.getElementById('refreshUsersBtn')?.addEventListener('click', loadCurrentUsers);
    document.querySelector('.nav-btn[onclick*="refreshCurrentTable"]')?.addEventListener('click', refreshCurrentTable);
    document.getElementById('prevBtn')?.addEventListener('click', previousPage);
    document.getElementById('nextBtn')?.addEventListener('click', nextPage);

    // Settings
    document.querySelector('.save-settings-btn')?.addEventListener('click', saveSettings);

    // System
    document.querySelector('.nav-btn[onclick*="loadDebugLogs"]')?.addEventListener('click', loadDebugLogs);
    document.querySelector('.nav-btn[onclick*="clearLogDisplay"]')?.addEventListener('click', clearLogDisplay);

    // User Management
    document.querySelector('.nav-btn[onclick*="loadAdminUsers"]')?.addEventListener('click', loadAdminUsers);
    document.querySelector('.generate-btn[onclick*="addAdminUser"]')?.addEventListener('click', addAdminUser);
    document.querySelector('.nav-btn[onclick*="clearAddUserForm"]')?.addEventListener('click', clearAddUserForm);
    document.querySelector('.danger-btn[onclick*="showRemoveAdminDialog"]')?.addEventListener('click', showRemoveAdminDialog);

    // Modals
    document.querySelectorAll('.notification-close-x, .notification-close-btn').forEach(btn => btn.addEventListener('click', hideNotification));
    document.querySelectorAll('.info-close-x, .info-close-btn').forEach(btn => btn.addEventListener('click', hideInfoPopup));
}

document.addEventListener('DOMContentLoaded', initializeAdminPanel);