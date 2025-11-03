// api.js - SIMPLIFIED
export const API_BASE_URL = 'https://api.hasmah.xyz';

async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'include',
    ...options
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// Now all your functions become ONE line:
export const loadFlightPlans = () => apiCall('/api/flight-plans');
export const loadControllers = () => apiCall('/api/controllers');
export const loadAtis = () => apiCall('/api/atis');
export const loadLeaderboard = () => apiCall('/api/leaderboard');
export const loadUserClearances = () => apiCall('/api/user/clearances');
export const loadAdminAnalytics = () => apiCall('/api/admin/analytics');
export const loadChartData = () => apiCall('/api/admin/charts');
export const loadDebugLogs = (level = 'all') => apiCall(`/api/admin/logs?level=${level}`);
export const loadCurrentUsers = () => apiCall('/api/admin/current-users');
export const loadAdminUsers = () => apiCall('/api/admin/users');
export const loadAdminSettings = () => apiCall('/api/admin/settings');
export const loadPublicSettings = () => apiCall('/api/settings');
export const loadTable = (name, limit, offset) => apiCall(`/api/admin/tables/${name}?limit=${limit}&offset=${offset}`);
export const getSystemHealth = () => apiCall('/api/health');

export const saveUserSettings = (settings) => apiCall('/api/user/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ settings })
});

export const saveAdminSettings = (settings) => apiCall('/api/admin/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(settings)
});

export const trackClearanceGeneration = (data) => apiCall('/api/clearance-generated', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

export const addAdminUser = (username, roles) => apiCall('/api/admin/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, roles })
});

export const removeAdminUser = (userId) => apiCall(`/api/admin/users/${userId}`, {
  method: 'DELETE'
});

export const resetAnalytics = () => apiCall('/api/admin/analytics/reset', {
  method: 'POST'
});