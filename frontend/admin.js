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
import { getSessionId } from './src/utils.js';

let analytics = {};
let settings = {};
let dailyVisitChart = null;
let charts = {};
let currentTable = 'page_visits';
let currentOffset = 0;
const pageSize = 25;
let totalRecords = 0;

function updateAuthUI(isLoggedIn, user = null) {
    const loginScreen = document.getElementById('loginScreen');
    const adminPanel = document.getElementById('adminPanel');
    const authLoading = document.getElementById('authLoading');
    const authLoginRequired = document.getElementById('authLoginRequired');
    const authNoAccess = document.getElementById('authNoAccess');

    authLoading.classList.add('hidden');

    if (isLoggedIn && user && user.is_admin) {
        loginScreen.classList.add('fade-out');
        adminPanel.classList.add('authenticated');
        showNotification('success', 'Access Granted', `Welcome ${user.username}! Admin access confirmed.`);
        loadAdminData();
    } else if (isLoggedIn && user && !user.is_admin) {
        authLoginRequired.classList.add('hidden');
        authNoAccess.classList.remove('hidden');
    } else {
        authLoginRequired.classList.remove('hidden');
        authNoAccess.classList.add('hidden');
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
      headers: {
        'X-Session-ID': getSessionId(),
        'Authorization': `Bearer ${getSessionId()}`
      }
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
            headers: {
                'X-Session-ID': getSessionId(),
                'Authorization': `Bearer ${getSessionId()}`
            }
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

async function resetAnalytics() {
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

async function loadDebugLogs() {
  const level = document.getElementById('logLevel').value || 'all';
  const debugLogsContainer = document.getElementById('debugLogs');
  debugLogsContainer.innerHTML = '<div class="loading-message">Loading debug logs...</div>';
  try {
    const data = await apiLoadDebugLogs(level);
    if (data.error) {
      throw new Error(`Server error: ${data.error}`);
    }
    if (!data.logs || data.logs.length === 0) {
      debugLogsContainer.innerHTML = '<div class="loading-message">No logs found for selected filter.</div>';
      return;
    }
    const logsHtml = data.logs.map(log => {
      if (!log || !log.timestamp || !log.level || !log.message) {
        return '<div style="color: #ff6b6b;">Invalid log entry</div>';
      }
      const time = new Date(log.timestamp).toLocaleTimeString();
      const date = new Date(log.timestamp).toLocaleDateString();
      let levelColor = '#e0e0e0';
      switch(log.level) {
        case 'error': levelColor = '#ff6b6b'; break;
        case 'warn': levelColor = '#ffa500'; break;
        case 'info': levelColor = '#4CAF50'; break;
        default: levelColor = '#87CEEB'; break;
      }
      return `
        <div style="margin-bottom: 8px; padding: 6px 0; border-bottom: 1px solid #333;">
          <span style="color: #888; font-size: 11px;">[${date} ${time}]</span>
          <span style="color: ${levelColor}; font-weight: bold; margin-left: 8px;">${log.level.toUpperCase()}</span>
          <span style="color: #bbb; margin-left: 8px; font-size: 10px;">(${log.id || 'no-id'})</span>
          <div style="margin-top: 2px; color: #e0e0e0;">${escapeHtml(log.message)}</div>
          ${log.data ? `<div style="margin-top: 2px; color: #999; font-size: 11px; font-style: italic;">${escapeHtml(log.data)}</div>` : ''}
        </div>
      `;
    }).join('');
    debugLogsContainer.innerHTML = logsHtml;
    debugLogsContainer.scrollTop = 0;
  } catch (error) {
    console.error('Failed to load debug logs:', error);
    debugLogsContainer.innerHTML = `
      <div style="color: #ff6b6b; margin-bottom: 10px;">Failed to load debug logs</div>
      <div style="color: #ffa500; font-size: 12px; margin-bottom: 5px;">Error Details</div>
      <div style="color: #999; font-size: 11px; margin-bottom: 10px;">${escapeHtml(error.message)}</div>
      <div style="color: #666; font-size: 10px;">
        <div>• Check console (F12) for technical details</div>
        <div>• Verify admin session is active</div>
      </div>
    `;
  }
}

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
    return '<div class="table-loading">No data available</div>';
  }
  const allColumns = Object.keys(data[0]);
  const sensitiveColumns = ['ip_address', 'user_agent', 'raw_data'];
  const columns = allColumns.filter(col => !sensitiveColumns.includes(col));
  let html = '<table class="data-table"><thead><tr>';
  columns.forEach(col => {
    let displayName = col.replace(/_/g, ' ').toUpperCase();
    if (col === 'session_id') displayName = 'SESSION';
    if (col === 'page_path') displayName = 'PAGE';
    if (col === 'created_at') displayName = 'TIME';
    if (col === 'callsign') displayName = 'CALLSIGN';
    if (col === 'destination') displayName = 'DEST';
    if (col === 'flight_level') displayName = 'FL';
    html += `<th>${displayName}</th>`;
  });
  html += '</tr></thead><tbody>';
  data.forEach(row => {
    html += '<tr>';
    columns.forEach(col => {
      let value = row[col];
      if (value === null || value === undefined) {
        value = '-';
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      } else if (typeof value === 'string' && value.length > 50) {
        const escapedValue = escapeHtml(value);
        value = `<span class="table-cell-truncated" onclick='showInfoPopup(${JSON.stringify(value)})'>${escapedValue}<i class="info-icon">i</i></span>`;
      } else if (col.includes('_at') || col.includes('timestamp')) {
        try {
          const date = new Date(value);
          value = date.toLocaleString();
        } catch (e) {}
      } else if (col === 'session_id' && typeof value === 'string') {
        value = value.substring(0, 8) + '...';
      }
      html += `<td>${value}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
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
  let html = '<div style="padding: 20px;">';
  users.forEach(user => {
    html += `
      <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: var(--surface-hover); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 15px;">
        ${user.avatar ? `<img src="${user.avatar}" alt="Avatar" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--primary-color);">` : ''}
        <div style="flex: 1;">
          <div style="font-weight: 600; color: var(--text-color); margin-bottom: 3px;">${user.username}</div>
          <div style="color: var(--text-muted); font-size: 12px;">Discord ID: ${user.discord_id} | Last login: ${new Date(user.last_login).toLocaleDateString()}</div>
          <div style="color: var(--text-muted); font-size: 11px; margin-top: 3px;">Roles: ${user.roles ? user.roles.join(', ') : 'admin'}</div>
        </div>
        <div style="display: flex; gap: 8px;">
          ${user.discord_id !== currentUser.discord_id ? `<button class="nav-btn" onclick="removeAdminUser('${user.id}')" style="margin: 0; padding: 6px 12px; font-size: 12px; background: #ff6b6b; border-color: #ff6b6b; color: white;">Remove</button>` : `<span style="color: var(--primary-color); font-size: 12px; font-weight: 600; padding: 6px 12px;">YOU</span>`}
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
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

document.addEventListener('DOMContentLoaded', () => {
  checkAuthParams(updateAuthUI);
  checkAuthStatus(updateAuthUI);
});

window.logout = () => logout(updateAuthUI);
window.loginWithDiscord = loginWithDiscord;
window.goToMainSite = goToMainSite;
window.showSection = showSection;
window.loadTable = loadTable;
window.refreshCurrentTable = refreshCurrentTable;
window.previousPage = previousPage;
window.nextPage = nextPage;
window.saveSettings = saveSettings;
window.resetAnalytics = resetAnalytics;
window.loadDebugLogs = loadDebugLogs;
window.clearLogDisplay = clearLogDisplay;
window.loadCurrentUsers = loadCurrentUsers;
window.loadAdminUsers = loadAdminUsers;
window.addAdminUser = addAdminUser;
window.removeAdminUser = removeAdminUser;
window.clearAddUserForm = clearAddUserForm;
window.showRemoveAdminDialog = showRemoveAdminDialog;
window.showInfoPopup = showInfoPopup;
window.hideInfoPopup = hideInfoPopup;
