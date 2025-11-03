---
filepath: frontend/src/notifications.js
---
```javascript
export function showNotification(type, title, message) {
  const container = document.getElementById('notification-container');
  const overlay = document.getElementById('notificationOverlay');

  if (overlay) { // Admin page modal logic
    const popup = document.getElementById('notificationPopup');
    const titleEl = document.getElementById('notificationTitle');
    const messageEl = document.getElementById('notificationMessage');
    const iconEl = document.getElementById('notificationIcon');

    if (popup && titleEl && messageEl && iconEl) {
      titleEl.textContent = title;
      messageEl.textContent = message;

      let iconContent = '';
      switch (type) {
        case 'success': iconContent = '✓'; break;
        case 'error': iconContent = '❌'; break;
        case 'warning': iconContent = '⚠️'; break;
        case 'info': iconContent = 'ℹ️'; break;
      }
      iconEl.textContent = iconContent;

      popup.className = `notification-popup ${type}`;
      overlay.style.display = 'flex';
    }
    return;
  }

  if (container) { // Toast logic
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;

      let iconContent = '';
      switch (type) {
        case 'success': iconContent = '✓'; break;
        case 'error': iconContent = '❌'; break;
        case 'warning': iconContent = '⚠️'; break;
        case 'info': iconContent = 'ℹ️'; break;
      }

      notification.innerHTML = `
        <span class="notification-icon">${iconContent}</span>
        <div class="notification-content">
          <div class="notification-title">${title}</div>
          <div class="notification-message">${message}</div>
        </div>
      `;

      container.appendChild(notification);

      setTimeout(() => {
        notification.classList.add('show');
      }, 10);

      setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        });
      }, 5000);
      return;
  }

  console.error('Notification container or overlay not found.');
}

export function showAuthError(error) {
  let errorMessage = 'Authentication failed';
  let errorTitle = 'Authentication Error';
  switch (error) {
    case 'oauth_cancelled':
      errorMessage = 'Discord login was cancelled by the user.';
      break;
    case 'missing_code':
      errorMessage = 'The authentication code from Discord was missing. Please try again.';
      break;
    case 'invalid_state':
      errorMessage = 'There was a problem with the authentication session. Please try again.';
      break;
    case 'auth_failed':
      errorMessage = 'The server was unable to authenticate you with Discord. Please try again.';
      break;
  }
  showNotification('error', errorTitle, errorMessage);
}

export function hideNotification() {
    const overlay = document.getElementById('notificationOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}```

---
filepath: frontend/src/utils.js
---
```javascript
export const API_BASE_URL = 'https://api.hasmah.xyz';```

---
filepath: frontend/srcsrc/api.js
---
```javascript
import { API_BASE_URL } from './utils.js';

export async function loadFlightPlans() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/flight-plans`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to load flight plans:", err);
    throw err;
  }
}

export async function loadPublicSettings() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/settings`, { credentials: 'include' });
    if (response.ok) {
      const settings = await response.json();
      if (settings && !settings.error) {
        return settings;
      }
    }
    return null;
  } catch (error) {
    console.log('Using default settings');
    return null;
  }
}

export async function saveUserSettings(settings) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/user/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ settings }),
            credentials: 'include'
        });
        return response.ok;
    } catch (dbError) {
        console.error('Failed to save user settings to DB:', dbError);
        return false;
    }
}

export async function loadControllers() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/controllers`, { credentials: 'include' });
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to load controllers:', error);
        throw error;
    }
}

// Implemented missing functions
export async function loadAdminAnalytics() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/analytics`, { credentials: 'include' });
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Failed to load admin analytics:', error);
        throw error;
    }
}

export async function loadChartData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/charts`, { credentials: 'include' });
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Failed to load chart data:', error);
        throw error;
    }
}

// This function is the correct, final version.
export async function loadDebugLogs(level = 'all') {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/logs?level=${level}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Failed to load debug logs:', error);
        // Returning dummy data on failure as per original code's intention
        return { logs: [{ timestamp: new Date().toISOString(), level: 'error', message: `Failed to load logs: ${error.message}`, id: 'frontend-error' }] };
    }
}

export async function resetAnalytics() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/analytics/reset`, {
            method: 'POST',
            credentials: 'include'
        });
        return await response.json();
    } catch (error) {
        console.error('Failed to reset analytics:', error);
        return { success: false, error: error.message };
    }
}

// The duplicate placeholder function that was here has been removed.

export async function loadCurrentUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/current-users`, { credentials: 'include' });
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Failed to load current users:', error);
        throw error;
    }
}

export async function loadAtis() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/atis`, { credentials: 'include' });
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to load ATIS data:', error);
        throw error;
    }
}

export async function trackClearanceGeneration(clearanceData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/clearance-generated`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(clearanceData),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to track clearance generation:', {
            error: error.message,
            callsign: clearanceData?.callsign,
            destination: clearanceData?.destination,
            timestamp: new Date().toISOString(),
            stack: error.stack
        });
        throw error;
    }
}

export async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/leaderboard`, { credentials: 'include' });
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        throw error;
    }
}

export async function loadUserClearances() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/user/clearances`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch clearances');
        return await response.json();
    } catch (error) {
        console.error('Error loading profile clearances:', error);
        throw error;
    }
}

export async function getSystemHealth() {
    const response = await fetch(`${API_BASE_URL}/api/health`, { credentials: 'include' });
    if (!response.ok) {
        throw new Error(`Health check failed with status ${response.status}`);
    }
    return await response.json();
}

// =============================================================================
// Admin Panel API Functions
// =============================================================================

export async function loadAdminUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to load admin users:', error);
        throw error;
    }
}

export async function addAdminUser(username, roles) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, roles }),
            credentials: 'include'
        });
        return await response.json();
    } catch (error) {
        console.error('Failed to add admin user:', error);
        return { success: false, error: error.message };
    }
}

export async function removeAdminUser(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        return await response.json();
    } catch (error) {
        console.error('Failed to remove admin user:', error);
        return { success: false, error: error.message };
    }
}

export async function loadAdminSettings() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/settings`, {
        credentials: 'include'
    });
    if (response.ok) {
      const settings = await response.json();
      if (settings && !settings.error) {
        return settings;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to load admin settings:', error);
    return null;
  }
}

export async function saveAdminSettings(settings) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings),
            credentials: 'include'
        });
        return await response.json();
    } catch (error) {
        console.error('Failed to save admin settings:', error);
        return { success: false, error: error.message };
    }
}

export async function loadTable(tableName, limit, offset) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/tables/${tableName}?limit=${limit}&offset=${offset}`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Failed to load table ${tableName}:`, error);
        throw error;
    }
}

// This duplicate placeholder function has been removed.```

---
filepath: frontend/src/auth.js
---
```javascript
import { API_BASE_URL } from './utils.js';
import { showNotification, showAuthError } from './notifications.js';

let currentUser = null;

export async function checkAuthStatus(updateUI, options = { requireAuth: false }) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/user`, {
      credentials: 'include',
    });

    if (response.ok) {
      const authData = await response.json();
      if (authData.authenticated) {
        currentUser = authData.user;
        updateUI(true, authData.user);
      } else {
        currentUser = null;
        updateUI(false);
        if (options.requireAuth) {
          window.location.href = '/login.html';
        }
      }
    } else {
      currentUser = null;
      updateUI(false);
      if (options.requireAuth) {
        window.location.href = '/login.html';
      }
    }
  } catch (error) {
    console.error('Failed to check auth status:', error);
    currentUser = null;
    updateUI(false);
    if (options.requireAuth) {
      window.location.href = '/login.html';
    }
  }
}

export function loginWithDiscord() {
  sessionStorage.setItem('authRedirectPath', window.location.pathname);
  const origin = window.location.origin;
  window.location.href = `${API_BASE_URL}/auth/discord?origin=${encodeURIComponent(origin)}`;
}

export async function logout(updateUI) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      currentUser = null;
      updateUI(false);
      console.log('Logged out successfully');
    }
  } catch (error) {
    console.error('Logout failed:', error);
    // Still show logged out state on error
    currentUser = null;
    updateUI(false);
  }
}

export function checkAuthParams(updateUI) {
  const urlParams = new URLSearchParams(window.location.search);
  const authResult = urlParams.get('auth');
  const authError = urlParams.get('error');

  // Handle the case where the redirect lands on /auth
  if (window.location.pathname === '/auth') {
    const newUrl = window.location.origin + '/?' + urlParams.toString();
    window.location.href = newUrl;
    return true; // Stop execution to allow for redirect
  }

  if (authResult || authError) {
    // Clean the URL by removing auth parameters.
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('auth');
    newUrl.searchParams.delete('error');
    window.history.replaceState({}, '', newUrl.toString());

    if (authResult === 'success') {
        console.log('Discord authentication successful');
        // Check auth status to update UI
        setTimeout(() => checkAuthStatus(updateUI), 100);
    } else if (authError) {
        console.error('Discord authentication error:', authError);
        showAuthError(authError);
    }
    return true;
  }

  return false;
}

export function getCurrentUser() {
    return currentUser;
}
```

---
filepath: frontend/sitemap.xml
---
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset
      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
<!-- created with Free Online Sitemap Generator www.xml-sitemaps.com -->


<url>
  <loc>https://24ifr.hasmah.xyz/</loc>
  <lastmod>2024-01-01T00:00:00+00:00</lastmod>
</url>
<url>
  <loc>https://24ifr.hasmah.xyz/license.html</loc>
  <lastmod>2024-01-01T00:00:00+00:00</lastmod>
</url>

</urlset>```

---
filepath: frontend/styles.css
---
```css
:root {
  --primary-color: #f5de40;
  --background-color: #0a0a0a;
  --surface-color: #151515;
  --surface-hover: #1f1f1f;
  --border-color: #222; /* Made border more subtle */
  --text-color: #e5e5e5;
  --text-muted: #a0a0a0;
  --shadow: 0 2px 8px rgba(0,0,0,0.2); /* Softer, more modern shadow */
  --shadow-hover: 0 6px 16px rgba(0,0,0,0.25); /* Subtle lift effect */
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Noto Sans Mono', monospace;
  font-weight: 300;
  background: var(--background-color);
  color: var(--text-color);
  line-height: 1.6;
  padding: 20px;
  min-height: 100vh;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  padding-bottom: 30px;
  border-bottom: 2px solid var(--border-color);
  position: relative;
  overflow: hidden;
}

@keyframes expandLine {
  to { width: 100px; }
}

.header h1 {
  color: var(--primary-color);
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--primary-color), #ffd700);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.main-grid {
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 30px;
  margin-bottom: 30px;
}

@media (max-width: 1024px) {
  .main-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

.section {
  background: var(--surface-color);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: visible;
  z-index: 1;
}


.section:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-hover);
  border-color: rgba(245, 222, 64, 0.3);
  z-index: 10;
}

.section-title {
  color: var(--primary-color);
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
  position: relative;
}

.flight-plans {
  max-height: 800px;
  overflow-y: auto;
  overflow-x: visible; /* Allow hover effect to extend outside */
  padding: 5px; /* Add some padding to not cut off shadows */
  transition: max-height 0.5s ease-in-out;
}

.flight-plan {
  background: var(--surface-hover);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  margin: 15px 0;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  /* overflow: hidden; */ /* Removed to prevent hover transform from being cut off */
}


.flight-plan:hover {
  border-color: var(--primary-color);
  background: rgba(245, 222, 64, 0.05);
  transform: translateY(-4px);
  box-shadow: 0 10px 30px rgba(245, 222, 64, 0.4);
  z-index: 10; /* Bring to front on hover */
}

.flight-plan:active {
  transform: translateY(1px) scale(0.99);
  box-shadow: 0 2px 10px rgba(245, 222, 64, 0.2);
  background: rgba(245, 222, 64, 0.08);
}

.flight-plan.selected {
  border-color: var(--primary-color);
  background: rgba(245, 222, 64, 0.1);
  box-shadow: 0 0 25px rgba(245, 222, 64, 0.5);
  transform: translateY(-2px) scale(1.01);
}

.flight-plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.flight-plan-callsign {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary-color);
  letter-spacing: 0.5px;
}

.flight-plan-aircraft {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--background-color);
  padding: 4px 8px;
  border-radius: 6px;
}

.flight-plan-route {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  background: var(--background-color);
  padding: 10px;
  border-radius: 8px;
}

.flight-plan-airport {
  font-size: 16px;
  font-weight: 600;
}

.flight-plan-arrow {
  font-size: 20px;
  color: var(--primary-color);
}

.flight-plan-info {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-muted);
  border-top: 1px solid var(--border-color);
  padding-top: 10px;
}

.config-group {
  margin-bottom: 15px;
  animation: slideInUp 0.3s ease-out;
  animation-fill-mode: both;
  position: relative;
  z-index: 1;
}

.config-group:focus-within {
  z-index: 100;
}

@keyframes slideInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.config-label {
  display: block;
  color: var(--primary-color);
  font-weight: 600;
  margin-bottom: 10px;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

select, textarea, input[type="text"] {
  width: 100%;
  padding: 15px;
  background: var(--surface-hover);
  border: 2px solid var(--border-color);
  border-radius: 12px; /* Standardized rounding */
  color: var(--text-color);
  font-size: 14px;
  font-family: inherit;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 1;
}

select {
  appearance: none;
  background-image: url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 5"><path fill="%23f5de40" d="M2 0L0 2h4zm0 5L0 3h4z"/></svg>');
  background-repeat: no-repeat;
  background-position: right 15px center;
  background-size: 12px;
  padding-right: 45px;
}

select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(245, 222, 64, 0.1);
  background: rgba(245, 222, 64, 0.02);
  transform: translateY(-1px);
  z-index: 200;
}

select option {
  background: var(--surface-hover) !important;
  color: var(--text-color) !important;
  padding: 10px 15px;
  border: none;
}

select option:hover,
select option:focus {
  background: var(--primary-color) !important;
  background-color: #f5de40 !important;
  color: #000 !important;
}

select option:selected {
  background: var(--primary-color) !important;
  background-color: #f5de40 !important;
  color: #000 !important;
}

textarea:focus, input[type="text"]:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(245, 222, 64, 0.1);
  background: rgba(245, 222, 64, 0.02);
  transform: translateY(-1px);
}

textarea {
  resize: vertical;
  font-family: 'Noto Sans Mono', monospace;
  line-height: 1.6;
  min-height: 120px;
}

input[type="text"]::placeholder {
  color: var(--text-muted);
  font-style: italic;
}

.generate-btn {
  width: 100%;
  padding: 18px;
  background: linear-gradient(135deg, var(--primary-color), #ffd700);
  border: none;
  border-radius: 12px;
  color: #000;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
}

.generate-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s ease;
}

.generate-btn:hover::before {
  left: 100%;
}

.generate-btn:hover {
  transform: translateY(-3px) scale(1.03); /* Added scale effect */
  box-shadow: 0 10px 30px rgba(245, 222, 64, 0.4);
}

.generate-btn:active {
  transform: translateY(1px) scale(0.98);
  box-shadow: 0 2px 15px rgba(245, 222, 64, 0.3);
}

.generate-btn:disabled {
  background: #444;
  color: #888;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.clearance-output {
  background: var(--background-color);
  border: 2px solid var(--primary-color);
  border-radius: 16px;
  padding: 30px;
  font-family: 'Noto Sans Mono', monospace;
  font-size: 16px;
  line-height: 1.8;
  color: var(--primary-color);
  white-space: pre-wrap;
  min-height: 180px;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 2px 10px rgba(0,0,0,0.3);
}

.clearance-output::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 80%, rgba(245, 222, 64, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(245, 222, 64, 0.03) 0%, transparent 50%);
  pointer-events: none;
}

.no-plans {
  text-align: center;
  color: var(--text-muted);
  padding: 60px 20px;
  font-style: italic;
  font-size: 16px;
}

.refresh-btn {
  background: var(--surface-hover);
  border: 2px solid var(--border-color);
  color: var(--primary-color);
  padding: 12px 20px;
  border-radius: 12px; /* Standardized rounding */
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 20px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.refresh-btn:hover {
  background: var(--primary-color);
  color: #000;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(245, 222, 64, 0.3);
}

.refresh-btn:active {
  transform: translateY(1px) scale(0.98);
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--surface-color);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
  transition: background 0.3s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--primary-color);
}

.loading {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.loading::after {
  content: '';
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Advanced Configuration Styles */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0 5px;
  border-radius: 8px;
}

.section-header:hover {
  background: rgba(245, 222, 64, 0.05);
}

.section-header:active {
  background: rgba(245, 222, 64, 0.1);
  transform: translateY(1px) scale(0.995);
}

.section-header .section-title {
  margin: 0;
  padding: 0;
  border: none;
}

.collapse-toggle {
  background: none;
  border: 2px solid var(--border-color);
  color: var(--primary-color);
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 40px;
  text-align: center;
}

.collapse-toggle:hover {
  background: var(--primary-color);
  color: #000;
  transform: scale(1.1);
}

.collapse-toggle:active {
  transform: scale(1.05);
}

.advanced-config-content {
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: 25px;
}

.advanced-config-content.collapsed {
  max-height: 0;
  margin-top: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.advanced-config-content:not(.collapsed) {
  max-height: 2000px;
  opacity: 1;
  transform: translateY(0);
}

.advanced-config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 25px;
  margin-bottom: 25px;
}

@media (max-width: 768px) {
  .advanced-config-grid {
    grid-template-columns: 1fr;
  }
}

.config-section {
  background: var(--surface-hover);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 25px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.config-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--primary-color), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.config-section:hover::before {
  opacity: 1;
}

.config-section:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(245, 222, 64, 0.15);
  border-color: rgba(245, 222, 64, 0.3);
}

.config-section-title {
  color: var(--primary-color);
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 15px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  transition: all 0.2s ease;
}

.checkbox-item:hover {
  background: rgba(245, 222, 64, 0.03);
  border-radius: 8px;
  padding-left: 8px;
  padding-right: 8px;
}

.checkbox-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--primary-color);
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  background: var(--surface-hover);
  border: 2px solid var(--border-color);
  border-radius: 4px;
  position: relative;
}

.checkbox-item input[type="checkbox"]:checked {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.checkbox-item input[type="checkbox"]:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #000;
  font-size: 12px;
  font-weight: bold;
  line-height: 1;
}

.checkbox-item input[type="checkbox"]:hover {
  transform: scale(1.1);
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(245, 222, 64, 0.2);
}

.checkbox-item label {
  color: var(--text-color);
  font-size: 14px;
  cursor: pointer;
  transition: color 0.2s ease;
  font-weight: 500;
}

.checkbox-item:hover label {
  color: var(--primary-color);
}

.template-help {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(245, 222, 64, 0.05);
  border-radius: 6px;
  border-left: 3px solid var(--primary-color);
  font-style: italic;
}

.advanced-save-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, var(--surface-hover), var(--surface-color));
  border: 2px solid var(--primary-color);
  border-radius: 12px;
  color: var(--primary-color);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
}

.advanced-save-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(245, 222, 64, 0.1), transparent);
  transition: left 0.5s ease;
}

.advanced-save-btn:hover::before {
  left: 100%;
}

.advanced-save-btn:hover {
  background: var(--primary-color);
  color: #000;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(245, 222, 64, 0.3);
}

.advanced-save-btn:active {
  transform: translateY(1px) scale(0.99);
  background: var(--primary-color);
  color: #000;
}

/* Enhanced input styling for advanced config */
.config-section input[type="number"] {
  width: 100%;
  padding: 15px;
  background: var(--background-color);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-color);
  font-size: 14px;
  font-family: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.config-section input[type="number"]:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(245, 222, 64, 0.1);
  background: rgba(245, 222, 64, 0.02);
  transform: translateY(-1px);
}

.config-section textarea {
  font-family: 'Noto Sans Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  min-height: 140px;
  background: var(--background-color);
}

/* Notification styles */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 20px;
  max-width: 350px;
  color: var(--text-color);
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow);
  transform: translateX(400px);
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.notification.show {
  transform: translateX(0);
  opacity: 1;
}

.notification.success {
  border-color: var(--primary-color);
  background: rgba(245, 222, 64, 0.1);
  color: var(--primary-color);
}

.notification.error {
  border-color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  color: #ff6b6b;
}

/* Discord Authentication Styles */
.auth-section {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 20px 0;
}

.auth-loading {
  color: var(--text-muted);
  font-size: 14px;
  font-style: italic;
  text-align: center;
}

.discord-login-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface-hover);
  border: 2px solid var(--border-color);
  color: #5865F2;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.discord-login-btn:hover {
  background: #5865F2;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(88, 101, 242, 0.3);
}

.discord-login-btn:active {
  transform: translateY(1px) scale(0.98);
  box-shadow: 0 2px 10px rgba(88, 101, 242, 0.2);
}

.discord-login-btn svg {
  flex-shrink: 0;
}

@keyframes glowing-border {
  0% { box-shadow: 0 0 3px var(--primary-color); }
  50% { box-shadow: 0 0 15px var(--primary-color); }
  100% { box-shadow: 0 0 3px var(--primary-color); }
}

.discord-login-btn.discord-login-main {
  color: white;
  border-color: var(--primary-color);
}

.discord-login-btn.discord-login-main svg path {
  fill: white;
}

.discord-login-btn.discord-login-main:hover {
  background: var(--primary-color);
  color: #000;
  box-shadow: 0 5px 20px rgba(245, 222, 64, 0.4);
}

.discord-login-btn.discord-login-main:hover svg path {
  fill: #000;
}

.discord-login-btn:hover svg path {
    fill: white;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 20px;
  transition: all 0.25s ease;
  justify-content: center;
}

.user-info:hover {
  background: var(--surface-hover);
  border-color: var(--primary-color);
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid var(--primary-color);
  object-fit: cover;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name {
  color: var(--text-color);
  font-size: 14px;
  font-weight: 600;
}

.user-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.logout-btn, .admin-btn, .profile-btn, .leaderboard-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  border-radius: 12px; /* Standardized rounding */
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.auth-logged-out .leaderboard-btn {
  margin-bottom: 10px;
}

.logout-btn:hover {
  background: rgba(255, 107, 107, 0.1);
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.logout-btn:active, .admin-btn:active, .profile-btn:active, .leaderboard-btn:active {
    transform: translateY(1px) scale(0.95);
}

.admin-btn:hover, .profile-btn:hover, .leaderboard-btn:hover {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #000;
}

/* Footer Styles */
.footer {
  text-align: center;
  padding: 20px 0;
  margin-top: 40px;
  border-top: 1px solid var(--border-color);
}

.footer-link {
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.3s ease;
}

.footer-link:hover {
  color: var(--primary-color);
}

.profile-btn, .leaderboard-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  border-radius: 12px; /* Standardized rounding */
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.modal-overlay.show {
    opacity: 1;
}

.modal-content {
  background: var(--surface-color);
  border-radius: 16px;
  padding: 40px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow);
  position: relative;
  border: 1px solid var(--border-color);
}

.modal-close {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 24px;
  cursor: pointer;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;
}

.modal-close:hover {
  background: var(--surface-hover);
  color: var(--text-color);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-footer {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
  text-align: right;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid var(--primary-color);
}

.profile-header h2 {
  color: var(--text-color);
  font-size: 24px;
}

.profile-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
}

.stat-label {
  font-size: 14px;
  color: var(--text-muted);
}

.profile-clearances h3 {
  color: var(--primary-color);
  margin-bottom: 15px;
}

.clearances-list {
  max-height: 400px;
  overflow-y: auto;
  flex-grow: 1;
  padding-right: 10px;
}

.clearance-item {
  background: var(--surface-hover);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 10px;
  border-left: 3px solid var(--primary-color);
}

.clearance-item-header {
  font-size: 14px;
  margin-bottom: 8px;
}

.clearance-item-body {
  font-family: 'Noto Sans Mono', monospace;
  font-size: 13px;
  color: var(--text-muted);
  white-space: pre-wrap;
  margin-bottom: 8px;
}

.clearance-item-footer {
  font-size: 12px;
  color: var(--text-muted);
  text-align: right;
}

/* Leaderboard Styles */
.leaderboard {
  padding-top: 10px;
  flex-grow: 1;
  min-height: 0;
  overflow-y: auto;
}

.leaderboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.leaderboard-user {
  display: flex;
  align-items: center;
  gap: 15px;
  background: var(--surface-hover);
  padding: 10px 15px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  transition: all 0.25s ease;
}

.leaderboard-user:hover {
  transform: translateY(-2px);
  border-color: var(--primary-color);
}

.leaderboard-user:active {
  transform: translateY(1px) scale(0.99);
  border-color: var(--primary-color);
}

.leaderboard-rank {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary-color);
  min-width: 20px;
  text-align: right;
}

.leaderboard-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.leaderboard-username {
  font-weight: 600;
  flex-grow: 1;
}

.leaderboard-count {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary-color);
}

.leaderboard-loading {
  text-align: center;
  color: var(--text-muted);
  padding: 40px 20px;
  font-style: italic;
}

.leaderboard-login-prompt {
  display: none;
  text-align: center;
  margin-top: 20px;
  color: var(--text-muted);
}

body.logged-out .leaderboard-login-prompt {
  display: block;
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
  .auth-section {
    margin: 15px 0;
  }

  .user-info {
    flex-direction: column;
    gap: 8px;
    text-align: center;
    padding: 16px;
  }

  .user-actions {
    flex-direction: row;
    justify-content: center;
  }

  .discord-login-btn {
    font-size: 13px;
    padding: 10px 16px;
    gap: 8px;
  }

  .discord-login-btn svg {
    width: 16px;
    height: 16px;
  }
}
.controller-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}
.controller-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-muted);
}
.status-light {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #888; /* Default gray */
    transition: background-color 0.3s ease;
}
.status-light.online {
    background-color: #2ecc71; /* Green */
}
.status-light.stale {
    background-color: #f39c12; /* Orange */
}
.controller-selection-wrapper {
    display: flex;
    gap: 10px;
}
#groundCallsignSelect {
    flex: 1;
}
.refresh-btn.small-btn {
    padding: 10px;
    line-height: 1;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
}
details summary {
    cursor: pointer;
    list-style: none; /* Remove default marker */
}
details summary::-webkit-details-marker {
    display: none; /* For Chrome */
}
.auth-logged-out, .auth-logged-in {
    transition: opacity 0.5s ease, visibility 0.5s ease;
}
.footer-contact {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 10px;
}

.header-logo {
    width: 150px;
    height: auto;
    margin-bottom: 0px;
}

.hidden {
    display: none;
}

#groundCallsignManual {
    margin-top: 10px;
}

.generate-btn {
    margin-top: 20px;
}

details.section {
    margin-top: 20px;
    padding: 20px;
}

.advanced-config-content {
    margin-top: 15px;
}

.section-title.no-border {
    border: none;
    margin: 0;
    padding: 0;
}
.admin-login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--background-color);
  transition: opacity 0.5s ease, visibility 0.5s ease;
}

.admin-login.fade-out {
  opacity: 0;
  visibility: hidden;
  display: none;
}

.admin-container {
  display: block;
  opacity: 0;
  visibility: hidden;
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px;
  transition: opacity 0.5s ease 0.5s, visibility 0.5s ease 0.5s;
}

.admin-container.authenticated {
  opacity: 1;
  visibility: visible;
}

.login-box {
  background: var(--surface-color);
  border-radius: 16px;
  padding: 40px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.admin-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 2px solid var(--border-color);
}

.admin-header h1 {
  margin: 0;
  flex-grow: 1;
  text-align: left;
}

.admin-main-content {
  display: flex;
  gap: 30px;
}

.admin-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 240px;
  flex-shrink: 0;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-btn span {
  transition: opacity 0.2s 0.1s ease-out, width 0.2s 0.1s ease-out;
  white-space: nowrap;
}

.nav-collapse-btn {
  padding: 10px;
  background: transparent;
  border: 2px solid var(--border-color);
  color: var(--text-muted);
  border-radius: 12px; /* Standardized rounding */
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.nav-collapse-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.nav-collapse-btn .nav-icon {
  width: 24px;
  height: 24px;
  transition: transform 0.3s ease;
}

/* --- Sidebar Collapsed State --- */
.sidebar-collapsed .admin-nav {
  width: 88px;
}

.sidebar-collapsed .nav-btn span {
  opacity: 0;
  width: 0;
  overflow: hidden;
}

.sidebar-collapsed .nav-btn {
  justify-content: center;
  gap: 0;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 14px 20px;
  background: transparent;
  border: 2px solid transparent;
  color: var(--text-muted);
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: left;
  width: 100%;
}

.nav-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  stroke-width: 1.5;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-btn:hover {
  background: var(--surface-hover);
  color: var(--text-color);
  transform: translateX(5px);
}

.nav-btn.active {
  background: var(--primary-color);
  color: #000;
  border-color: var(--primary-color);
  box-shadow: 0 5px 15px rgba(245, 222, 64, 0.2);
  transform: translateX(5px) scale(1.02);
}

.admin-content-area {
  flex-grow: 1;
  min-width: 0; /* Prevents flexbox overflow issues */
}

.nav-btn:hover,
.nav-btn.active {
  background: var(--primary-color);
  color: #000;
  border-color: var(--primary-color);
}

.admin-section {
  display: none;
}

.admin-section.active {
  display: block;
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.analytics-card {
  display: flex;
  align-items: center;
  gap: 20px;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 25px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.analytics-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-hover);
  border-color: rgba(245, 222, 64, 0.3);
}

.card-icon-container {
  width: 60px;
  height: 60px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon-container svg {
  width: 28px;
  height: 28px;
}

.card-text-container {
  text-align: left;
}

.analytics-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-color);
  margin-bottom: 2px;
}

.analytics-label {
  font-size: 13px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 30px;
}

.settings-group {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 16px; /* Standardized rounding */
  padding: 30px; /* Increased whitespace */
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.settings-group:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-hover);
  border-color: rgba(245, 222, 64, 0.2);
}

.settings-group h3 {
  color: var(--primary-color);
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 600;
}

.setting-item {
  margin-bottom: 20px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.checkbox-item input[type="checkbox"] {
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--surface-hover);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  flex-shrink: 0;
}

.checkbox-item input[type="checkbox"]:hover {
  border-color: var(--primary-color);
}

.checkbox-item input[type="checkbox"]:checked {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

.checkbox-item input[type="checkbox"]:checked::before {
  content: '✓';
  font-size: 14px;
  font-weight: bold;
  color: #000;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.checkbox-item label {
  color: var(--text-color);
  font-size: 14px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.checkbox-item:hover label {
    color: var(--primary-color);
}

.danger-zone {
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  border-radius: 16px; /* Standardized rounding */
  padding: 25px;
  margin-top: 30px;
}

.danger-zone h3 {
  color: #ff6b6b;
  margin-bottom: 15px;
}

.danger-btn {
  background: #ff6b6b;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px; /* Standardized rounding */
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.danger-btn:hover {
  background: #ff5252;
  transform: translateY(-1px);
}

.logout-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--surface-hover);
  border: 2px solid var(--border-color);
  color: var(--text-color);
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.logout-btn:hover {
  background: #ff6b6b;
  border-color: #ff6b6b;
  color: white;
}

.charts-grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.chart-container {
  display: flex;
  flex-direction: column;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 25px;
  transition: all 0.3s ease;
}

.chart-container:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-hover);
  border-color: rgba(245, 222, 64, 0.2);
}

.chart-header {
  text-align: left;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
}

.chart-header h3 {
  color: var(--primary-color);
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 5px 0;
}

.chart-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

.chart-wrapper {
  position: relative;
  height: 300px;
  width: 100%;
}

.chart-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--text-muted);
  font-style: italic;
}

.save-settings-btn {
  width: 100%;
  margin-top: 20px;
}

/* Override input styling to match main page beautiful design */
.admin-container select,
.admin-container textarea,
.admin-container input[type="text"],
.admin-container input[type="number"],
.admin-container input[type="password"],
.login-box select,
.login-box textarea,
.login-box input[type="text"],
.login-box input[type="number"],
.login-box input[type="password"] {
  width: 100%;
  padding: 15px;
  background: var(--surface-hover);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  color: var(--text-color);
  font-size: 14px;
  font-family: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 1;
}

.admin-container select {
  appearance: none;
  background-image: url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 5"><path fill="%23f5de40" d="M2 0L0 2h4zm0 5L0 3h4z"/></svg>');
  background-repeat: no-repeat;
  background-position: right 15px center;
  background-size: 12px;
  padding-right: 45px;
}

.admin-container select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(245, 222, 64, 0.1);
  background: rgba(245, 222, 64, 0.02);
  transform: translateY(-1px);
  z-index: 200;
}

.admin-container select option {
  background: var(--surface-hover) !important;
  color: var(--text-color) !important;
  padding: 10px 15px;
  border: none;
}

.admin-container select option:hover,
.admin-container select option:focus {
  background: var(--primary-color) !important;
  background-color: #f5de40 !important;
  color: #000 !important;
}

.admin-container select option:selected {
  background: var(--primary-color) !important;
  background-color: #f5de40 !important;
  color: #000 !important;
}

.admin-container textarea:focus,
.admin-container input[type="text"]:focus,
.admin-container input[type="number"]:focus,
.admin-container input[type="password"]:focus,
.login-box textarea:focus,
.login-box input[type="text"]:focus,
.login-box input[type="number"]:focus,
.login-box input[type="password"]:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(245, 222, 64, 0.1);
  background: rgba(245, 222, 64, 0.02);
  transform: translateY(-1px);
}

.admin-container textarea {
  resize: vertical;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
  line-height: 1.6;
  min-height: 120px;
}

.admin-container input[type="text"]::placeholder,
.admin-container input[type="number"]::placeholder,
.admin-container input[type="password"]::placeholder,
.admin-container textarea::placeholder,
.login-box input[type="text"]::placeholder,
.login-box input[type="number"]::placeholder,
.login-box input[type="password"]::placeholder,
.login-box textarea::placeholder {
  color: var(--text-muted);
  font-style: italic;
}

/* Special styling for phraseology template textarea */
#phraseologyTemplate {
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
  font-size: 13px;
  line-height: 1.5;
  min-height: 140px;
}

/* Notification Container */
#notification-container {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

/* Individual Notification */
.notification {
  background-color: var(--surface-color);
  color: var(--text-color);
  padding: 12px 20px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow);
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 400px;
}

.notification.show {
  opacity: 1;
  transform: translateY(0);
}

.notification-icon {
  font-size: 18px;
  font-weight: bold;
}

.notification.success .notification-icon {
  color: #4CAF50;
}

.notification.error .notification-icon {
  color: #f44336;
}

.notification.warning .notification-icon {
  color: #ff9800;
}

.notification.info .notification-icon {
  color: var(--primary-color);
}

.notification-content {
  display: flex;
  flex-direction: column;
}

.notification-title {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 2px;
}

.notification-message {
  font-size: 13px;
  color: var(--text-muted);
}

/* Tables Section Styles */
.table-nav {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.table-nav-btn {
  padding: 10px 16px;
  background: var(--surface-hover);
  border: 2px solid var(--border-color);
  color: var(--text-color);
  border-radius: 12px; /* Standardized rounding */
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-nav-btn:hover,
.table-nav-btn.active {
  background: var(--primary-color);
  color: #000;
  border-color: var(--primary-color);
}

.table-container {
  background: var(--surface-hover);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0;
  overflow: hidden;
  max-height: 600px;
  overflow-y: auto;
}

.table-loading {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
  font-style: italic;
}

.data-table {
  width: 100%;
  border-collapse: separate; /* Changed for modern spacing */
  border-spacing: 0;
  font-size: 13px; /* Slightly larger font */
}

.data-table th {
  background: var(--surface-hover);
  color: var(--text-muted);
  padding: 16px 20px; /* Increased padding */
  text-align: left;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 10;
}

.data-table th:first-child {
  border-top-left-radius: 12px;
}
.data-table th:last-child {
  border-top-right-radius: 12px;
}

.data-table td {
  padding: 16px 20px; /* Increased padding */
  border-bottom: 1px solid var(--border-color);
  color: var(--text-color);
  word-break: break-word;
  max-width: 300px;
  transition: background-color 0.2s ease;
}

.data-table tr:last-child td {
    border-bottom: none; /* Remove border on last row */
}

.data-table tr:hover td {
  background: rgba(245, 222, 64, 0.05);
}

.table-cell-truncated {
  max-width: 250px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: all 0.2s ease;
}

.table-cell-truncated:hover {
  color: var(--primary-color);
  text-overflow: clip;
  white-space: normal;
  max-width: none;
}

.table-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 15px;
}

.current-users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
}

.user-card {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 16px; /* Standardized rounding */
  padding: 25px; /* Increased whitespace */
  transition: all 0.3s ease;
}

.user-card:hover {
  border-color: rgba(245, 222, 64, 0.3);
  transform: translateY(-2px);
}

.user-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.user-session-id {
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
  color: var(--primary-color);
  font-weight: 600;
  font-size: 13px;
}

.user-source {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.user-source.memory {
  background: rgba(255, 165, 0, 0.2);
  color: #ffa500;
}

.user-source.supabase {
  background: rgba(245, 222, 64, 0.2);
  color: var(--primary-color);
}

.user-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  font-size: 12px;
}

.user-stat {
  text-align: center;
}

.user-stat-value {
  color: var(--primary-color);
  font-weight: 600;
  font-size: 16px;
}

.user-stat-label {
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 10px;
}

.user-last-activity {
  margin-top: 10px;
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
}

@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .analytics-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }

  .admin-nav {
    flex-direction: column;
  }

  .table-nav {
    flex-direction: column;
  }

  .current-users-grid {
    grid-template-columns: 1fr;
  }

  .data-table {
    font-size: 11px;
  }

  .data-table th,
  .data-table td {
    padding: 8px 6px;
  }
}

/* Info Popup for Table Data */
.info-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 11000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.info-overlay.show {
  opacity: 1;
  visibility: visible;
}

.info-popup {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 16px; /* Standardized rounding */
  padding: 30px;
  max-width: 80vw;
  max-height: 80vh;
  width: 600px;
  box-shadow: var(--shadow);
  transform: scale(0.95); /* Modern, subtle scale */
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  position: relative;
}

.info-overlay.show .info-popup {
  transform: scale(1);
  opacity: 1;
}

.info-title {
  color: var(--primary-color);
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
}

.info-content {
  color: var(--text-color);
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap; /* Preserve whitespace and newlines */
  word-break: break-word; /* Break long words */
  overflow-y: auto; /* Add scroll for long content */
  flex-grow: 1;
  background: var(--background-color);
  padding: 15px;
  border-radius: 8px;
}

.info-close-btn {
  background: var(--surface-hover);
  border: 2px solid var(--border-color);
  border-radius: 12px; /* Standardized rounding */
  padding: 12px 24px;
  color: var(--text-color);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 20px;
  align-self: flex-end;
}

.info-close-btn:hover {
  background: var(--primary-color);
  color: #000;
  border-color: var(--primary-color);
}

.info-close-x {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 24px;
  cursor: pointer;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.info-close-x:hover {
  background: var(--surface-hover);
  color: var(--text-color);
}

.info-icon {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 1.5px solid var(--text-muted);
  border-radius: 50%;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 12px;
  text-align: center;
  font-style: normal;
  font-weight: bold;
  margin-left: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.info-icon:hover {
  background: var(--primary-color);
  color: #000;
  border-color: var(--primary-color);
}

/* Card Layout for Tables */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 15px;
}
.data-card {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  font-size: 13px;
}
.data-card-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}
.data-card-row:last-child {
  border-bottom: none;
}
.data-card-key {
  color: var(--text-muted);
  font-weight: 600;
  text-transform: capitalize;
}
.data-card-value {
  color: var(--text-color);
  text-align: right;
  max-width: 60%;
}

.hidden {
    display: none;
}

.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.login-container {
  text-align: center;
}

.login-logo {
  width: 150px;
  margin-bottom: 20px;
}

.login-container h1 {
  color: var(--primary-color);
  margin-bottom: 10px;
}

.login-container p {
  color: var(--text-muted);
  margin-bottom: 30px;
}

.login-container .discord-login-btn {
  display: inline-flex;
}

.auth-loading-message {
    color: var(--text-muted);
    margin-bottom: 30px;
    font-style: italic;
}

.login-box .discord-login-btn {
    width: 100%;
    justify-content: center;
}

.no-access-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
}

.no-access-actions .nav-btn,
.no-access-actions .logout-btn {
    margin: 0;
}

.login-error-message {
    color: #ff6b6b;
    margin-top: 15px;
}

.admin-header .header-logo {
    width: 150px;
    height: auto;
    margin-bottom: 0px;
}

.current-users-section {
    margin-bottom: 30px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.section-header h3 {
    color: var(--primary-color);
    margin: 0;
}

.section-header .nav-btn {
    margin: 0;
    padding: 8px 16px;
}

.analytics-grid.users-grid {
    margin-bottom: 20px;
}

.table-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.table-info h3 {
    color: var(--primary-color);
    margin: 0;
}

.table-controls {
    display: flex;
    gap: 10px;
    align-items: center;
}

.table-record-count {
    font-size: 12px;
    color: var(--text-muted);
}

.table-controls .nav-btn {
    margin: 0;
    padding: 6px 12px;
    font-size: 12px;
}

.table-pagination {
    text-align: center;
    margin-top: 15px;
}

.table-pagination .nav-btn {
    margin: 0 5px;
    padding: 8px 16px;
}

.page-info {
    margin: 0 15px;
    color: var(--text-muted);
}

.template-help-text {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 8px;
}

#wsStatus {
    padding: 20px;
    text-align: center;
    border-radius: 12px; /* Standardized rounding */
    margin-bottom: 20px;
    background: var(--surface-hover);
    border: 1px solid var(--border-color);
}

#wsStatus .status-message {
    color: var(--text-muted);
    font-weight: 600;
}

.system-health-item {
    margin-bottom: 15px;
}

.debug-logs-container {
    background: #1a1a1a;
    border: 1px solid var(--border-color);
    border-radius: 12px; /* Standardized rounding */
    padding: 15px;
    height: 400px;
    overflow-y: auto;
    font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
    font-size: 12px;
    line-height: 1.4;
    color: #e0e0e0;
}

.debug-logs-container .loading-message {
    color: var(--text-muted);
}

.user-management-section .settings-group {
    margin-bottom: 30px;
}

#currentAdminInfo {
    padding: 20px;
    background: var(--surface-hover);
    border: 1px solid var(--border-color);
    border-radius: 12px; /* Standardized rounding */
}

#currentAdminInfo .loading-message {
    color: var(--text-muted);
}

#adminUsersList {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    min-height: 200px;
}

#adminUsersList .loading-message {
    padding: 20px;
    text-align: center;
    color: var(--text-muted);
}

.add-admin-form {
    padding: 20px;
    background: var(--surface-hover);
    border: 1px solid var(--border-color);
    border-radius: 12px; /* Standardized rounding */
}

.form-group {
    margin-bottom: 20px;
}

.form-label {
    display: block;
    margin-bottom: 8px;
}

.form-input {
    width: 100%;
    margin-bottom: 10px;
}

.help-text {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 15px;
}

.role-selection {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.role-label {
    display: flex;
    align-items: center;
    gap: 8px;
}

.form-actions {
    display: flex;
    gap: 10px;
}

.form-actions .generate-btn {
    flex: 1;
    margin: 0;
}

.form-actions .nav-btn {
    margin: 0;
    padding: 12px 20px;
}

.danger-zone p {
    color: var(--text-muted);
    margin-bottom: 15px;
}

.danger-zone .button-group {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
}

/* User Management List Styles */
.user-list-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.user-list-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: var(--surface-hover);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  transition: all 0.25s ease;
}

.user-list-item:hover {
  transform: translateY(-3px);
  border-color: var(--primary-color);
  box-shadow: var(--shadow-hover);
}

.user-list-avatar {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  border: 2px solid var(--primary-color);
  flex-shrink: 0;
}

.user-list-info {
  flex-grow: 1;
}

.user-list-name {
  font-weight: 600;
  color: var(--text-color);
  font-size: 16px;
  margin-bottom: 4px;
}

.user-list-details {
  font-size: 12px;
  color: var(--text-muted);
}

.user-list-actions {
  flex-shrink: 0;
}

.current-user-tag {
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--primary-color);
  color: #000;
}

.danger-btn.small-btn {
  padding: 8px 16px;
  font-size: 12px;
}

/* Back to Top Button */
.back-to-top-btn {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  padding: 12px 24px;
  background: linear-gradient(135deg, var(--primary-color), #ffd700);
  border: none;
  border-radius: 12px;
  color: #000;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 5px 20px rgba(245, 222, 64, 0.3);
  opacity: 1;
  transform: translate(-50%, 0);
}

.back-to-top-btn.hidden {
  opacity: 0;
  transform: translate(-50%, -150%);
  pointer-events: none;
}

.back-to-top-btn:hover {
  transform: translate(-50%, -2px) scale(1.05);
  box-shadow: 0 10px 30px rgba(245, 222, 64, 0.4);
}

.back-to-top-btn:active {
  transform: translate(-50%, 0) scale(1);
}

/* Loading Screen Styles */
#loadingScreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--background-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  transition: opacity 0.5s ease, visibility 0.5s ease;
}

#loadingScreen.hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.loading-logo {
  animation: pulse 2s infinite ease-in-out;
}

.loading-logo img {
  width: 200px;
  height: auto;
}

.loading-status {
  margin-top: 20px;
  color: var(--text-muted);
  font-size: 16px;
  letter-spacing: 1px;
  animation: fadeIn 1.5s infinite alternate ease-in-out;
}

.progress-bar-container {
  width: 200px;
  height: 8px;
  background-color: var(--surface-color);
  border-radius: 4px;
  margin-top: 20px;
  overflow: hidden;
}

.progress-bar {
  width: 0;
  height: 100%;
  background-color: var(--primary-color);
  border-radius: 4px;
  transition: width 0.5s ease;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
```

---
filepath: frontend/license.html
---
```html
<!DOCTYPE html>
<html>
<head>
  <title>License - ATC24 IFR Clearance Generator</title>
  <link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
<style>
    /* Specific styles for the license page to override/supplement shared styles */
    .license-content {
      background: var(--surface-color);
      border-radius: 16px;
      padding: 40px;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow);
      margin-bottom: 30px;
    }

    .license-title {
      color: var(--primary-color);
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 30px;
      text-align: center;
    }

    .license-text {
      font-size: 16px;
      line-height: 1.8;
      color: var(--text-color);
      margin-bottom: 20px;
      text-align: center;
    }

    .contact-info {
      background: var(--surface-hover);
      border: 2px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }

    .contact-info strong {
      color: var(--primary-color);
    }

    .back-btn {
      display: inline-block;
      background: linear-gradient(135deg, var(--primary-color), #ffd700);
      color: #000;
      padding: 15px 30px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      text-align: center;
      transition: all 0.3s ease;
      margin-top: 20px;
    }

    .back-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(245, 222, 64, 0.3);
    }

    .copyright {
      text-align: center;
      color: var(--text-muted);
      font-size: 14px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <img src="logo.png" alt="Logo" class="header-logo" style="width: 150px; height: auto; margin-bottom: 0px;">
    <h1>License</h1>
    <p style="color: var(--text-muted); margin-top: 10px;">ATC24 IFR Clearance Generator</p>
  </div>

  <div class="license-content">
    <div class="license-title">License Agreement</div>

    <div class="license-text">
      You can use this application only after obtaining approval from me.
    </div>

    <div class="contact-info">
      <strong>Contact Information:</strong><br><br>
      Email: <span style="color: var(--primary-color);">nv24212@nvtc.edu.bh</span><br>
      Discord: <span style="color: var(--primary-color);">h.a.s2</span>
    </div>

    <a href="/" class="back-btn">← Back to Application</a>
  </div>

  <div class="copyright">
    © 2025 Hasan Mahmood. All rights reserved.
  </div>
</div>
</body>
</html>```

---
filepath: frontend/admin.js
---
```javascript
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
import { showNotification, showAuthError, hideNotification } from './src/notifications.js';
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
    apiLoadDebugLogs() // Correctly call the imported function
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
    if (document.getElementById('totalVisits')) {
        document.getElementById('totalVisits').textContent = analytics.totalVisits || 0;
    }
    if (document.getElementById('todayVisits')) {
        document.getElementById('todayVisits').textContent = analytics.dailyVisits?.[today] || 0;
    }
    if (document.getElementById('clearancesGenerated')) {
        document.getElementById('clearancesGenerated').textContent = analytics.clearancesGenerated || 0;
    }
    if (document.getElementById('flightPlansReceived')) {
        document.getElementById('flightPlansReceived').textContent = analytics.flightPlansReceived || 0;
    }
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
        document.getElementById('defaultAltitudes').value = settings.aviation?.defaultAltitudes?.join(',') || '1000,2000,3000,4000,5000';
        document.getElementById('maxFlightPlansStored').value = settings.system?.maxFlightPlansStored || 20;
        document.getElementById('autoRefreshInterval').value = (settings.system?.autoRefreshInterval || 30000) / 1000;
        document.getElementById('controllerPollInterval').value = (settings.system?.controllerPollInterval || 300000) / 60000;
        document.getElementById('atisPollInterval').value = (settings.system?.atisPollInterval || 300000) / 60000;
    }
}

async function saveSettings() {
    const newSettings = {
        clearanceFormat: {
            customTemplate: document.getElementById('phraseologyTemplate').value
        },
        aviation: {
            defaultAltitudes: document.getElementById('defaultAltitudes').value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n))
        },
        system: {
            maxFlightPlansStored: parseInt(document.getElementById('maxFlightPlansStored').value) || 20,
            autoRefreshInterval: (parseInt(document.getElementById('autoRefreshInterval').value) || 30) * 1000,
            controllerPollInterval: (parseInt(document.getElementById('controllerPollInterval').value) || 5) * 60000,
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

function showSection(sectionName, buttonElement) {
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const sectionElement = document.getElementById(sectionName);
    if (sectionElement) {
        sectionElement.classList.add('active');
    } else {
        console.error(`Section with ID '${sectionName}' not found.`);
        return;
    }
    if (buttonElement) {
        buttonElement.classList.add('active');
    }
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
        apiLoadDebugLogs();
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

function setupModalEventListeners() {
    const notificationOverlay = document.getElementById('notificationOverlay');
    if (notificationOverlay) {
        const closeButton = notificationOverlay.querySelector('.notification-close-x');
        const closeBtn = notificationOverlay.querySelector('.notification-close-btn');
        if (closeButton) closeButton.addEventListener('click', hideNotification);
        if (closeBtn) closeBtn.addEventListener('click', hideNotification);
        notificationOverlay.addEventListener('click', (event) => {
            if (event.target === notificationOverlay) {
                hideNotification();
            }
        });
    }

    const infoOverlay = document.getElementById('infoOverlay');
    if (infoOverlay) {
        const closeButton = infoOverlay.querySelector('.info-close-x');
        const closeBtn = infoOverlay.querySelector('.info-close-btn');
        if (closeButton) closeButton.addEventListener('click', hideInfoPopup);
        if (closeBtn) closeBtn.addEventListener('click', hideInfoPopup);
        infoOverlay.addEventListener('click', (event) => {
            if (event.target === infoOverlay) {
                hideInfoPopup();
            }
        });
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
            const sectionName = btn.textContent.trim().toLowerCase().replace(/\s+/g, '-');
            btn.addEventListener('click', (event) => showSection(sectionName, event.currentTarget));
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
}

document.addEventListener('DOMContentLoaded', () => {
    initializeAdminPanel();
    setupModalEventListeners();
});```

---
filepath: frontend/admin.html
---
```html
<!DOCTYPE html>
<html>
<head>
  <title>ATC24 Admin Panel</title>
  <link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <!-- Login Screen -->
  <div class="admin-login" id="loginScreen">
    <div class="login-box">
      <h1>Admin Panel</h1>
      <div id="authLoading" class="auth-loading-message">
        Checking authentication status...
      </div>
      <div id="authLoginRequired" class="hidden">
        <p style="color: var(--text-muted); margin-bottom: 30px;">Admin access required. Please login with an authorized Discord account.</p>
        <button class="discord-login-btn">
          <svg width="18" height="18" viewBox="0 0 71 55" fill="none">
            <g clip-path="url(#clip0)">
              <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.308 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="#5865F2"/>
            </g>
          </svg>
          Login with Discord
        </button>
      </div>
      <div id="authNoAccess" class="hidden">
        <p style="color: #ff6b6b; margin-bottom: 20px;">❌ Access Denied</p>
        <p style="color: var(--text-muted); margin-bottom: 30px;">Your Discord account does not have admin access. Contact the administrator to request access.</p>
        <div class="no-access-actions">
          <button class="nav-btn">← Back to Main Site</button>
          <button class="logout-btn">Try Different Account</button>
        </div>
      </div>
      <div id="loginError" class="login-error-message hidden"></div>
    </div>
  </div>

  <!-- Admin Panel -->
  <div class="admin-container" id="adminPanel">
    <button class="logout-btn">Logout</button>

    <div class="admin-header">
      <button class="nav-collapse-btn" id="collapseBtn">
        <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
      </button>
      <h1>Admin Panel</h1>
    </div>

    <div class="admin-main-content">
      <div class="admin-nav">
        <button class="nav-btn active">
          <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
          <span>Analytics</span>
        </button>
        <button class="nav-btn">
          <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" /></svg>
          <span>Tables</span>
        </button>
        <button class="nav-btn">
          <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-1.003 1.11-1.226M12 20.25a12.25 12.25 0 00-3.394-.44c-.552 0-1.048.204-1.425.568M12 20.25a12.25 12.25 0 013.394-.44c.552 0 1.048.204 1.425.568M12 20.25v-3.375c0-.621.504-1.125 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125v3.375M12 20.25v-3.375c0-.621-.504-1.125-1.125-1.125h-1.5c-.621 0-1.125.504-1.125 1.125v3.375m0 0a3 3 0 00-3-3H6.75a3 3 0 00-3 3v.038c0 .621.504 1.125 1.125 1.125h13.5c.621 0 1.125-.504 1.125-1.125v-.038a3 3 0 00-3-3h-2.25a3 3 0 00-3 3z" /></svg>
          <span>Settings</span>
        </button>
        <button class="nav-btn">
          <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372m-2.625-.372a9.337 9.337 0 00-2.625-.372m2.625.372v-1.125c0-.621-.504-1.125-1.125-1.125H12.75c-.621 0-1.125.504-1.125 1.125v1.125m0 0a9.337 9.337 0 00-2.625.372m2.625-.372a9.337 9.337 0 00-2.625-.372M9.75 19.128a9.38 9.38 0 002.625.372M14.25 19.128a9.38 9.38 0 00-2.625.372M11.25 19.128a9.38 9.38 0 00-2.625.372m9.375-9.375a9.375 9.375 0 00-18.75 0A9.375 9.375 0 0012 21.75a9.375 9.375 0 009.375-9.375z" /></svg>
          <span>Users</span>
        </button>
        <button class="nav-btn">
          <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V5.625a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v12.75a2.25 2.25 0 002.25 2.25z" /></svg>
          <span>System</span>
        </button>
      </div>

      <div class="admin-content-area">
        <!-- Analytics Section -->
        <div class="admin-section active" id="analytics">
      <div class="section">
        <h2 class="section-title">Real-Time Analytics</h2>

        <div class="analytics-grid">
          <div class="analytics-card">
            <div class="card-icon-container" style="background-color: rgba(52, 152, 219, 0.1);"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#3498db"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639l4.368-7.28A1.012 1.012 0 017.5 4.5h9c.436 0 .845.22 1.036.582l4.368 7.28c.297.495.297 1.115 0 1.61l-4.368 7.28A1.012 1.012 0 0116.5 21h-9a1.012 1.012 0 01-1.036-.582z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
            <div class="card-text-container">
              <div class="analytics-label">Total Visits</div>
              <div class="analytics-value" id="totalVisits">-</div>
            </div>
          </div>
          <div class="analytics-card">
            <div class="card-icon-container" style="background-color: rgba(26, 188, 156, 0.1);"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#1abc9c"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M12 12.75h.008v.008H12v-.008z" /></svg></div>
            <div class="card-text-container">
              <div class="analytics-label">Today's Visits</div>
              <div class="analytics-value" id="todayVisits">-</div>
            </div>
          </div>
          <div class="analytics-card">
            <div class="card-icon-container" style="background-color: rgba(241, 196, 15, 0.1);"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#f1c40f"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75l3 3m0 0l3-3m-3 3v-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
            <div class="card-text-container">
              <div class="analytics-label">Clearances Generated</div>
              <div class="analytics-value" id="clearancesGenerated">-</div>
            </div>
          </div>
          <div class="analytics-card">
            <div class="card-icon-container" style="background-color: rgba(231, 76, 60, 0.1);"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#e74c3c"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg></div>
            <div class="card-text-container">
              <div class="analytics-label">Flight Plans Received</div>
              <div class="analytics-value" id="flightPlansReceived">-</div>
            </div>
          </div>
        </div>

        <div class="charts-grid-container">
          <div class="chart-container">
            <div class="chart-header">
              <h3>Daily Visit Chart</h3>
            <p class="chart-subtitle">Website visits over the last 30 days</p>
          </div>
          <div class="chart-wrapper">
            <canvas id="dailyVisitChart"></canvas>
            <div id="chartLoading" class="chart-loading">Loading chart data...</div>
          </div>
        </div>
        <div class="chart-container">
          <div class="chart-header">
            <h3>Clearances per Day</h3>
            <p class="chart-subtitle">IFR clearances generated over the last 30 days</p>
          </div>
          <div class="chart-wrapper">
            <canvas id="clearancesChart"></canvas>
            <div id="clearancesChartLoading" class="chart-loading">Loading chart data...</div>
          </div>
        </div>
        <div class="chart-container">
          <div class="chart-header">
            <h3>HTTP Requests per Day</h3>
            <p class="chart-subtitle">Page visits over the last 30 days</p>
          </div>
          <div class="chart-wrapper">
            <canvas id="requestsChart"></canvas>
            <div id="requestsChartLoading" class="chart-loading">Loading chart data...</div>
          </div>
        </div>

        </div>

        <div class="danger-zone">
          <h3>Analytics Management</h3>
          <p>Reset all analytics data (cannot be undone)</p>
          <div class="button-group">
            <button class="danger-btn" id="resetAnalyticsBtn">Reset All Analytics</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tables Section -->
    <div class="admin-section" id="tables">
      <div class="section">
        <h2 class="section-title">Supabase Database Tables</h2>

        <!-- Current Users -->
        <div class="current-users-section">
          <div class="section-header">
            <h3>Current Active Users</h3>
            <button class="nav-btn" id="refreshUsersBtn">Refresh Users</button>
          </div>

          <div class="analytics-grid users-grid">
            <div class="analytics-card">
              <div class="analytics-value" id="activeUsersCount">-</div>
              <div class="analytics-label">Active Users (5min)</div>
            </div>
            <div class="analytics-card">
              <div class="analytics-value" id="memorySessionsCount">-</div>
              <div class="analytics-label">Memory Sessions</div>
            </div>
            <div class="analytics-card">
              <div class="analytics-value" id="supabaseSessionsCount">-</div>
              <div class="analytics-label">Database Sessions</div>
            </div>
          </div>

          <div class="table-container" id="currentUsersTable">
            <div class="table-loading">Loading current users...</div>
          </div>
        </div>

        <!-- Table Navigation -->
        <div class="table-nav">
          <button class="table-nav-btn active">Page Visits</button>
          <button class="table-nav-btn">Clearances</button>
          <button class="table-nav-btn">Flight Plans</button>
          <button class="table-nav-btn">User Sessions</button>
          <button class="table-nav-btn">Discord Users</button>
          <button class="table-nav-btn">Admin Activities</button>
        </div>

        <!-- Table Display Area -->
        <div class="table-info">
          <h3 id="currentTableTitle">Page Visits</h3>
          <div class="table-controls">
            <span id="tableRecordCount" class="table-record-count">Loading...</span>
            <button class="nav-btn">Refresh</button>
          </div>
        </div>

        <div class="table-container" id="tableDisplay">
          <div class="table-loading">Select a table to view data...</div>
        </div>

        <!-- Table Pagination -->
        <div class="table-pagination" id="tablePagination">
          <button class="nav-btn" id="prevBtn" disabled>Previous</button>
          <span id="pageInfo" class="page-info">Page 1</span>
          <button class="nav-btn" id="nextBtn" disabled>Next</button>
        </div>
      </div>
    </div>

    <!-- Settings Section -->
    <div class="admin-section" id="settings">
      <div class="section">
        <h2 class="section-title">System Configuration</h2>

        <div class="settings-grid">
          <div class="settings-group">
            <h3>Clearance Format & Phraseology</h3>

            <div class="setting-item">
              <label class="config-label">Global Phraseology Format</label>
              <textarea id="phraseologyTemplate" placeholder="Enter custom clearance format template...">{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}.</textarea>
              <div class="template-help-text">
                Available variables: {CALLSIGN}, {ATC_STATION}, {ATIS}, {DESTINATION}, {ROUTE}, {RUNWAY}, {INITIAL_ALT}, {FLIGHT_LEVEL}, {SQUAWK}
              </div>
            </div>

          </div>

          <div class="settings-group">
            <h3>Aviation Standards</h3>

            <div class="setting-item">
              <label class="config-label">Default Altitudes (comma-separated)</label>
              <input type="text" id="defaultAltitudes" placeholder="1000,2000,3000,4000,5000">
            </div>

          </div>

          <div class="settings-group">
            <h3>System Performance</h3>

            <div class="setting-item">
              <label class="config-label">Max Flight Plans Stored</label>
              <input type="number" id="maxFlightPlansStored" placeholder="20" min="5" max="100">
            </div>

            <div class="setting-item">
            <label class="config-label">Auto Refresh Interval (seconds)</label>
            <input type="number" id="autoRefreshInterval" placeholder="30" min="5" max="300" step="1">
            </div>

            <div class="setting-item">
            <label class="config-label">Controller Data Poll Interval (minutes)</label>
            <input type="number" id="controllerPollInterval" placeholder="5" min="1" max="15" step="1">
            </div>

            <div class="setting-item">
            <label class="config-label">ATIS Data Poll Interval (minutes)</label>
            <input type="number" id="atisPollInterval" placeholder="5" min="1" max="15" step="1">
            </div>
          </div>
        </div>

        <button class="generate-btn save-settings-btn">Save All Settings</button>
      </div>
    </div>

    <!-- System Section -->
    <div class="admin-section" id="system">
      <div class="section">
        <h2 class="section-title">System Information</h2>

        <div class="settings-grid">
          <div class="settings-group">
            <h3>WebSocket Status</h3>
            <div id="wsStatus">
              <div class="status-message">Initializing system status...</div>
            </div>
          </div>

          <div class="settings-group">
            <h3>System Health</h3>
            <div style="padding: 20px;">
              <div class="system-health-item">
                <strong>Environment:</strong> <span id="environmentInfo">-</span>
              </div>
              <div class="system-health-item">
                <strong>Flight Plans in Memory:</strong> <span id="systemFlightPlans">-</span>
              </div>
              <div class="system-health-item">
                <strong>Real-time Support:</strong> <span id="realtimeSupport">-</span>
              </div>
              <div class="system-health-item">
                <strong>Last Analytics Reset:</strong> <span id="lastReset">-</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Debug Logs Section -->
        <div class="settings-group" style="margin-top: 30px;">
          <h3>Runtime Debug Logs</h3>
          <div class="system-health-item">
            <div class="table-controls">
              <select id="logLevel" style="padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--surface-hover); color: var(--text-color);">
                <option value="all">All Levels</option>
                <option value="error">Errors Only</option>
                <option value="warn">Warnings Only</option>
                <option value="info">Info Only</option>
              </select>
              <button class="nav-btn">Refresh Logs</button>
              <button class="nav-btn">Clear Display</button>
            </div>
          </div>
          <div id="debugLogs" class="debug-logs-container">
            <div class="loading-message">Loading debug logs...</div>
          </div>
        </div>

      </div>
    </div>

    <!-- User Management Section -->
    <div class="admin-section" id="users">
      <div class="section">
        <h2 class="section-title">User Management</h2>

        <!-- Current Admin Info -->
        <div class="settings-group user-management-section">
          <h3>Current Admin User</h3>
          <div id="currentAdminInfo">
            <div class="loading-message">Loading current user info...</div>
          </div>
        </div>

        <!-- Admin Users List -->
        <div class="settings-group user-management-section">
          <div class="section-header">
            <h3>Admin Users</h3>
            <button class="nav-btn">Refresh Users</button>
          </div>

          <div id="adminUsersList">
            <div class="loading-message">Loading admin users...</div>
          </div>
        </div>

        <!-- Add New Admin -->
        <div class="settings-group">
          <h3>Add New Admin User</h3>
          <div class="add-admin-form">
            <div class="form-group">
              <label class="form-label">Discord Username</label>
              <input type="text" id="newAdminUsername" placeholder="e.g., h.a.s2 or user#1234" class="form-input">
              <div class="help-text">
                Enter the Discord username exactly as it appears (with or without discriminator)
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Admin Roles</label>
              <div class="role-selection">
                <label class="role-label">
                  <input type="checkbox" id="roleAdmin" checked>
                  <span>Admin</span>
                </label>
                <label class="role-label">
                  <input type="checkbox" id="roleSuperAdmin">
                  <span>Super Admin</span>
                </label>
              </div>
            </div>

            <div class="form-actions">
              <button class="generate-btn">Add Admin User</button>
              <button class="nav-btn">Clear</button>
            </div>
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="danger-zone">
          <h3>Danger Zone</h3>
          <p>Removing admin users cannot be undone. Use with caution.</p>
          <div class="button-group">
            <button class="danger-btn">Remove Admin User</button>
          </div>
        </div>
      </div>
    </div>
      </div>
    </div>

  <!-- Notification Popup -->
  <div class="notification-overlay" id="notificationOverlay">
    <div class="notification-popup" id="notificationPopup">
      <button class="notification-close-x">×</button>
      <div class="notification-icon" id="notificationIcon">✓</div>
      <div class="notification-title" id="notificationTitle">Operation Successful</div>
      <div class="notification-message" id="notificationMessage">Your request has been completed successfully.</div>
      <button class="notification-close-btn">Close</button>
    </div>
  </div>

  <!-- Info Popup for Table Data -->
  <div class="info-overlay" id="infoOverlay">
    <div class="info-popup" id="infoPopup">
      <button class="info-close-x">×</button>
      <h3 class="info-title" id="infoTitle">Full Cell Content</h3>
      <div class="info-content" id="infoContent">
        <!-- Full content will be injected here -->
      </div>
      <button class="info-close-btn">Close</button>
    </div>
  </div>

  <script type="module" src="admin.js"></script>
</body>
</html>```

---
filepath: frontend/login.js
---
```javascript
import { loginWithDiscord } from './src/auth.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginButton = document.querySelector('.discord-login-btn');
  if (loginButton) {
    loginButton.addEventListener('click', loginWithDiscord);
  }
});
```

---
filepath: frontend/index.html
---
```html
<!DOCTYPE html>
<html>
<head>
  <title>ATC24 IFR Clearance Generator</title>
  <link rel="icon" href="/logo.png" type="image/png">
  <link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div id="loadingScreen">
    <div class="loading-logo">
      <img src="/logo.png" alt="Loading..." />
    </div>
    <div class="loading-status" id="loadingStatus">
      Initializing...
    </div>
    <div class="progress-bar-container">
      <div class="progress-bar" id="progressBar"></div>
    </div>
  </div>

  <button id="backToTopBtn" class="back-to-top-btn hidden">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="24" height="24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
    </svg>
    New Clearance
  </button>
<div class="container">
  <div class="header">
    <img src="/logo.png" alt="Logo" class="header-logo">

    <div class="auth-section" id="authSection">
      <div class="auth-loading" id="authLoading">
        <span>Checking login status...</span>
      </div>
      <div class="auth-logged-out hidden" id="authLoggedOut">
        <button class="leaderboard-btn">Leaderboard</button>
        <button class="discord-login-btn discord-login-main">
          <svg width="18" height="18" viewBox="0 0 71 55" fill="none">
            <g clip-path="url(#clip0)">
              <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.308 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="#5865F2"/>
            </g>
          </svg>
          Login with Discord
        </button>
      </div>
      <div class="auth-logged-in hidden" id="authLoggedIn">
        <div class="user-info">
          <img class="user-avatar" id="userAvatar" src="" alt="User Avatar">
          <div class="user-details">
            <span class="user-name" id="userName"></span>
            <div class="user-actions">
              <button class="leaderboard-btn" id="leaderboardBtn">Leaderboard</button>
              <button class="profile-btn" id="profileBtn">Profile</button>
              <button class="logout-btn">Logout</button>
              <button class="admin-btn hidden" id="adminBtn" onclick="window.location.href='/admin'">Admin</button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <div class="main-grid">
    <div class="section">
      <h2 class="section-title">Flight Plans</h2>
      <button class="refresh-btn" id="refreshPlansBtn">Refresh Plans</button>
      <div class="flight-plans" id="flightPlans">
        <div class="no-plans">No flight plans received yet...</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">ATC Configuration</h2>

      <div class="config-group">
        <div class="controller-header">
          <label class="config-label">ATC Call Sign</label>
          <div class="controller-status" id="controllerStatus">
            <span class="status-light"></span>
            <span id="statusText">Loading...</span>
          </div>
        </div>
        <div class="controller-selection-wrapper">
          <select id="groundCallsignSelect">
            <option value="">Loading controllers...</option>
          </select>
          <button class="refresh-btn small-btn" id="refreshControllersBtn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L20.49 15a9 9 0 0 1-14.85 3.36L3.51 9z"></path></svg>
          </button>
        </div>
        <input type="text" id="groundCallsignManual" placeholder="Or enter callsign manually" class="hidden">
      </div>

      <div class="config-group">
        <label class="config-label">Departure Airport</label>
        <select id="departureAirportSelect">
          <option value="">Loading airports...</option>
        </select>
      </div>

      <div class="config-group">
        <label class="config-label">ATIS Information Letter <span id="atis-auto" class="hidden">✓</span></label>
        <select id="atisInfo">
          <option value="A">Information A</option>
          <option value="B">Information B</option>
          <option value="C">Information C</option>
          <option value="D">Information D</option>
          <option value="E">Information E</option>
          <option value="F">Information F</option>
          <option value="G">Information G</option>
          <option value="H">Information H</option>
          <option value="I">Information I</option>
          <option value="J">Information J</option>
          <option value="K">Information K</option>
          <option value="L">Information L</option>
          <option value="M">Information M</option>
          <option value="N">Information N</option>
          <option value="O">Information O</option>
          <option value="P">Information P</option>
          <option value="Q">Information Q</option>
          <option value="R">Information R</option>
          <option value="S">Information S</option>
          <option value="T">Information T</option>
          <option value="U">Information U</option>
          <option value="V">Information V</option>
          <option value="W">Information W</option>
          <option value="X">Information X</option>
          <option value="Y">Information Y</option>
          <option value="Z">Information Z</option>
        </select>
      </div>

      <div class="config-group">
        <label class="config-label">Routing Type</label>
        <p style="color: var(--text-muted); font-size: 12px; margin-bottom: 10px;">
          Select departure routing method. As Filed uses the original flight plan route.
        </p>
        <select id="routingType">
          <option value="AS_FILED">Use original filed route</option>
          <option value="SID">SID (Standard Instrument Departure)</option>
          <option value="RDV">Radar Vectors (Controller guidance)</option>
          <option value="DIRECT">Direct (Navigation to specific waypoint)</option>
        </select>

        <div id="sidInput" class="hidden" style="margin-top: 15px;">
          <input type="text" id="sidName" placeholder="Enter SID (e.g., CIV1K)">
        </div>

        <div id="directInput" class="hidden" style="margin-top: 15px;">
          <input type="text" id="directWaypoint" placeholder="Enter directed waypoint(s) (e.g., BIMBO, ALPHA)">
        </div>
      </div>

      <div class="config-group">
        <label class="config-label">Departure Runway <span id="runway-auto" class="hidden">✓</span></label>
        <input type="text" id="departureRunway" placeholder="e.g., 25R">
      </div>

      <div class="config-group">
        <label class="config-label">Initial Climb Altitude</label>
        <select id="ifl">
          <option value="1000">1000FT</option>
          <option value="2000">2000FT</option>
          <option value="3000">3000FT</option>
        </select>
      </div>


      <button class="generate-btn" id="generateBtn" disabled>
        Generate IFR Clearance
      </button>
    </div>
  </div>

  <!-- Advanced Configuration Moved and Made Collapsible -->
  <details class="section">
    <summary class="section-header">
      <h2 class="section-title no-border">Advanced Configuration</h2>
      <span class="collapse-toggle">▶</span>
    </summary>
    <div class="advanced-config-content">
      <div class="advanced-config-grid">
        <div class="config-section">
          <h3 class="config-section-title">Clearance Format & Phraseology</h3>
          <div class="config-group">
            <label class="config-label">Custom Phraseology Format</label>
            <textarea id="userPhraseologyTemplate" placeholder="Enter custom clearance format template..."></textarea>
            <div class="template-help">
              Available variables: {CALLSIGN}, {ATC_STATION}, {ATIS}, {DESTINATION}, {ROUTE}, {RUNWAY}, {INITIAL_ALT}, {FLIGHT_LEVEL}, {SQUAWK}
            </div>
          </div>
        </div>
        <div class="config-section">
          <h3 class="config-section-title">Aviation Standards</h3>
        <div class="config-group">
          <label class="config-label">Custom Altitudes (comma-separated)</label>
          <input type="text" id="userDefaultAltitudes" placeholder="1000,2000,3000,4000,5000">
          <div class="template-help">
            Enter custom altitude options for initial climb
          </div>
        </div>
      </div>
      <button class="advanced-save-btn">Save Configuration</button>
    </div>
  </details>

  <div class="section">
    <h2 class="section-title">IFR Clearance</h2>
    <div class="clearance-output" id="clearanceOutput">
      Select a flight plan and configure ATC settings to generate clearance...
    </div>
  </div>

</div>

<div class="modal-overlay" id="leaderboardModal" style="display: none;">
  <div class="modal-content">
    <button class="modal-close">×</button>
    <div class="modal-header">
      <h2>Clearance Leaderboard</h2>
    </div>
    <div class="leaderboard" id="leaderboard">
      <div class="leaderboard-loading">Loading leaderboard...</div>
    </div>
    <div class="modal-footer">
      <button class="refresh-btn">Refresh</button>
    </div>
    <p class="leaderboard-login-prompt">Login to be on the leaderboard!</p>
  </div>
</div>

<div class="modal-overlay" id="profileModal" style="display: none;">
  <div class="modal-content">
    <button class="modal-close">×</button>
    <div class="profile-header">
      <img id="profile-avatar" src="" alt="Avatar" class="profile-avatar">
      <h2 id="profile-username"></h2>
    </div>
    <div class="profile-stats">
      <div class="stat-item">
        <span class="stat-value" id="profile-clearance-count">0</span>
        <span class="stat-label">Clearances Generated</span>
      </div>
    </div>
    <div class="profile-clearances">
      <h3>Your Clearances</h3>
      <div id="profile-clearances-list" class="clearances-list">
        <p>Loading clearances...</p>
      </div>
    </div>
  </div>
</div>

<footer class="footer">
  <p>All rights reserved, Hasan Mahmood ©</p>
  <a href="/license" class="footer-link">License</a>
  <a href="https://api.hasmah.xyz" class="footer-link" target="_blank">Status</a>
  <span class="footer-link">Support: h.a.s2 on Discord</span>
</footer>

<!-- Notifications container -->
<div id="notification-container"></div>

<script type="module" src="/index.js"></script>
</body>
</html>
```

---
filepath: frontend/maintenance.html
---
```html
<!DOCTYPE html>
<html>
<head>
  <title>ATC24 - Under Maintenance</title>
  <link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <style>
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .maintenance-container {
      max-width: 600px;
    }
    .maintenance-container h1 {
        font-size: 32px;
    }
    .maintenance-container p {
        font-size: 18px;
        margin-top: 15px;
    }
  </style>
</head>
<body>
<div class="container maintenance-container">
  <div class="header">
    <img src="logo.png" alt="Logo" class="header-logo" style="width: 150px; height: auto; margin-bottom: 0px;">
    <h1>24IFR is currently under maintenance.</h1>
    <p style="color: var(--text-muted);">
      The application is not usable at this time. We'll be back shortly.
    </p>
  </div>
</div>
</body>
</html>
```

---
filepath: frontend/login.html
---
```html
<!DOCTYPE html>
<html>
<head>
  <title>Login - ATC24 IFR Clearance Generator</title>
  <link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="login-page">
  <div class="login-container">
    <img src="/logo.png" alt="Logo" class="login-logo">
    <h1>Welcome to 24IFR</h1>
    <p>Please log in with Discord to continue.</p>
    <button class="discord-login-btn discord-login-main">
      <svg width="18" height="18" viewBox="0 0 71 55" fill="none">
        <g clip-path="url(#clip0)">
          <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.308 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="#5865F2"/>
        </g>
      </svg>
      Login with Discord
    </button>
  </div>
  <script type="module" src="/login.js"></script>
</body>
</html>```

---
filepath: frontend/index.js
---
```javascript
import {
    checkAuthStatus,
    loginWithDiscord,
    logout,
    checkAuthParams,
    getCurrentUser
} from './src/auth.js';
import {
    loadFlightPlans as apiLoadFlightPlans,
    loadPublicSettings as apiLoadPublicSettings,
    loadControllers as apiLoadControllers,
    loadAtis as apiLoadAtis,
    trackClearanceGeneration as apiTrackClearance,
    loadLeaderboard as apiLoadLeaderboard,
    loadUserClearances as apiLoadUserClearances,
    getSystemHealth
} from './src/api.js';
import { showNotification, showAuthError } from './src/notifications.js';

let selectedFlightPlan = null;
let selectedFlightPlanCallsign = null;
let flightPlans = [];
let selectedAtcCallsign = null;

let adminSettings = {
  clearanceFormat: {
    includeAtis: true,
    includeSquawk: true,
    includeFlightLevel: true,
    customTemplate: "{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}.",
    includeStartupApproval: true,
    includeInitialClimb: true
  },
  aviation: {
    defaultAltitudes: [1000, 2000, 3000, 4000, 5000],
    squawkRanges: { min: 1000, max: 7777, exclude: [7500, 7600, 7700] }
  }
};
let userSettings = {
  clearanceFormat: {
    customTemplate: "",
    includeAtis: true,
    includeSquawk: true,
    includeFlightLevel: true,
    includeStartupApproval: true,
    includeInitialClimb: true
  },
  aviation: {
    defaultAltitudes: [],
    squawkRanges: { min: 1000, max: 7777 },
    enableRunwayValidation: false,
    enableSIDValidation: false
  }
};

function loadUserSettings() {
  try {
    const saved = localStorage.getItem('atc24_user_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      userSettings = { ...userSettings, ...parsed };
    }
    updateUserSettingsUI();
  } catch (error) {
    console.error('Failed to load user settings:', error);
    updateUserSettingsUI();
  }
}

async function saveUserSettings() {
  try {
    userSettings.clearanceFormat.customTemplate = document.getElementById('userPhraseologyTemplate').value;
    const altitudesText = document.getElementById('userDefaultAltitudes').value.trim();
    if (altitudesText) {
      userSettings.aviation.defaultAltitudes = altitudesText.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    }
    localStorage.setItem('atc24_user_settings', JSON.stringify(userSettings));
    updateUIFromSettings();
    showNotification('success', 'Configuration Saved', 'Your settings have been saved to your local browser storage.');
    const currentUser = getCurrentUser();
    if (currentUser) {
        const success = await apiSaveUserSettings(userSettings, currentUser);
        if (success) {
            showNotification('success', 'Profile Updated', 'Your settings have also been saved to your user profile.');
        } else {
            showNotification('error', 'Profile Save Failed', 'Could not save settings to your profile.');
        }
    }
  } catch (error) {
    console.error('Failed to save user settings:', error);
    showNotification('error', 'Save Failed', 'An unexpected error occurred while saving your configuration.');
  }
}

function updateUserSettingsUI() {
  const templateValue = userSettings.clearanceFormat.customTemplate || (adminSettings.clearanceFormat && adminSettings.clearanceFormat.customTemplate) || '';
  if(document.getElementById('userPhraseologyTemplate')) {
      document.getElementById('userPhraseologyTemplate').value = templateValue;
  }
  if (userSettings.aviation.defaultAltitudes && userSettings.aviation.defaultAltitudes.length > 0) {
    document.getElementById('userDefaultAltitudes').value = userSettings.aviation.defaultAltitudes.join(',');
  }
}

function getEffectiveSettings() {
    const effective = JSON.parse(JSON.stringify(adminSettings)); // Deep clone

    // Ensure nested objects exist before assignment to prevent errors
    if (!effective.clearanceFormat) effective.clearanceFormat = {};
    if (!effective.aviation) effective.aviation = {};
    if (!effective.aviation.squawkRanges) effective.aviation.squawkRanges = {};

    if (userSettings.clearanceFormat?.customTemplate) {
        effective.clearanceFormat.customTemplate = userSettings.clearanceFormat.customTemplate;
    }
    if (userSettings.clearanceFormat?.hasOwnProperty('includeAtis')) {
        effective.clearanceFormat.includeAtis = userSettings.clearanceFormat.includeAtis;
    }
    if (userSettings.clearanceFormat?.hasOwnProperty('includeSquawk')) {
        effective.clearanceFormat.includeSquawk = userSettings.clearanceFormat.includeSquawk;
    }
    if (userSettings.clearanceFormat?.hasOwnProperty('includeFlightLevel')) {
        effective.clearanceFormat.includeFlightLevel = userSettings.clearanceFormat.includeFlightLevel;
    }
    if (userSettings.clearanceFormat?.hasOwnProperty('includeStartupApproval')) {
        effective.clearanceFormat.includeStartupApproval = userSettings.clearanceFormat.includeStartupApproval;
    }
    if (userSettings.clearanceFormat?.hasOwnProperty('includeInitialClimb')) {
        effective.clearanceFormat.includeInitialClimb = userSettings.clearanceFormat.includeInitialClimb;
    }
    if (userSettings.aviation?.defaultAltitudes?.length > 0) {
        effective.aviation.defaultAltitudes = userSettings.aviation.defaultAltitudes;
    }
    if (userSettings.aviation?.squawkRanges?.min) {
        effective.aviation.squawkRanges.min = userSettings.aviation.squawkRanges.min;
    }
    if (userSettings.aviation?.squawkRanges?.max) {
        effective.aviation.squawkRanges.max = userSettings.aviation.squawkRanges.max;
    }

    return effective;
}

function handleRoutingTypeChange() {
  const routingType = document.getElementById("routingType").value;
  const sidInput = document.getElementById("sidInput");
  const directInput = document.getElementById("directInput");
  sidInput.style.display = "none";
  directInput.style.display = "none";
  if (routingType === "SID") {
    sidInput.style.display = "block";
  } else if (routingType === "DIRECT") {
    directInput.style.display = "block";
  }
}

function generateSquawk() {
  const effectiveSettings = getEffectiveSettings();
  const min = effectiveSettings.aviation.squawkRanges.min;
  const max = effectiveSettings.aviation.squawkRanges.max;
  const exclude = effectiveSettings.aviation.squawkRanges.exclude || [7500, 7600, 7700];
  while (true) {
    let code = Math.floor(min + Math.random() * (max - min + 1)).toString();
    if ([...code].every(c => parseInt(c) <= 7) && !exclude.includes(parseInt(code))) {
      return code;
    }
  }
}

async function loadFlightPlans() {
  try {
    const flightPlansContainer = document.getElementById("flightPlans");
    flightPlansContainer.innerHTML = '<div class="no-plans loading">Loading flight plans...</div>';
    flightPlans = await apiLoadFlightPlans();
    displayFlightPlans();
  } catch (err) {
    document.getElementById("flightPlans").innerHTML =
      '<div class="no-plans">Failed to connect to server or no plans available.</div>';
  }
}

function displayFlightPlans() {
  const container = document.getElementById("flightPlans");
  if (flightPlans.length === 0) {
    container.innerHTML = '<div class="no-plans">No flight plans received yet...</div>';
    return;
  }

  if (selectedFlightPlanCallsign) {
    const newSelectedPlan = flightPlans.find(p => p.callsign === selectedFlightPlanCallsign);
    selectedFlightPlan = newSelectedPlan || null;
  }

  container.innerHTML = flightPlans.map((plan, index) => `
    <div class="flight-plan ${selectedFlightPlan && selectedFlightPlan.callsign === plan.callsign ? 'selected' : ''}" data-plan-index="${index}">
      <div class="flight-plan-header">
        <span class="flight-plan-callsign">${plan.callsign || 'Unknown'}</span>
        <span class="flight-plan-aircraft">${plan.aircraft || 'N/A'}</span>
      </div>
      <div class="flight-plan-route">
        <span class="flight-plan-airport">${plan.departing || 'N/A'}</span>
        <span class="flight-plan-arrow">→</span>
        <span class="flight-plan-airport">${plan.arriving || 'N/A'}</span>
      </div>
      <div class="flight-plan-info">
        <span>Route: ${plan.route || 'Direct'}</span>
        <span>FL: ${plan.flightlevel || 'N/A'}</span>
        <span>Rule: ${plan.flightrules || 'N/A'}</span>
      </div>
    </div>
  `).join('');
}

function selectFlightPlan(index) {
  selectedFlightPlan = flightPlans[index];
  selectedFlightPlanCallsign = selectedFlightPlan ? selectedFlightPlan.callsign : null;

  document.querySelectorAll('.flight-plan').forEach((el, i) => {
    el.classList.toggle('selected', i === index);
  });

  document.getElementById('generateBtn').disabled = !selectedFlightPlan;
}

async function generateClearance() {
  if (!selectedFlightPlan) {
    alert('Please select a flight plan first');
    return;
  }
  const effectiveSettings = getEffectiveSettings();
  const groundCallsignSelect = document.getElementById("groundCallsignSelect");
  const groundCallsignManual = document.getElementById("groundCallsignManual");
  const groundCallsign = groundCallsignSelect.value === 'manual'
    ? groundCallsignManual.value.trim()
    : groundCallsignSelect.value;
  const atisInfo = document.getElementById("atisInfo").value;
  const ifl = document.getElementById("ifl").value;
  const departureRW = document.getElementById("departureRunway").value.trim();
  const routingType = document.getElementById("routingType").value;
  const squawk = generateSquawk();
  const callsign = selectedFlightPlan.callsign || 'UNKNOWN';
  const destination = selectedFlightPlan.arriving || 'UNKNOWN';
  const planRoute = selectedFlightPlan.route || '';
  const flightLevel = selectedFlightPlan.flightlevel || 'N/A';

  if (!groundCallsign) {
    alert('Please enter an ATC Call Sign.');
    return;
  }
  if (!departureRW) {
    alert('Please enter a Departure Runway.');
    return;
  }
  if (effectiveSettings.aviation.enableRunwayValidation && userSettings.aviation.enableRunwayValidation) {
    const runwayPattern = /^[0-3]?[0-9][LRC]?$/i;
    if (!runwayPattern.test(departureRW)) {
      alert('Invalid runway format. Use format like: 25R, 09L, 03C, or 36');
      return;
    }
  }

  let routePhrase = '';
  switch (routingType) {
    case 'SID':
      const sidName = document.getElementById("sidName").value.trim();
      if (sidName) {
        if (effectiveSettings.aviation.enableSIDValidation && userSettings.aviation.enableSIDValidation) {
          const sidPattern = /^[A-Z0-9]{3,6}$/i;
          if (!sidPattern.test(sidName)) {
            alert('Invalid SID format. Use format like: CIV1K, BIMBO2');
            return;
          }
        }
        routePhrase = `the ${sidName} departure`;
      } else {
        alert('Please enter a SID name.');
        return;
      }
      break;
    case 'RDV':
      routePhrase = 'radar vectors';
      break;
    case 'DIRECT':
      const directWaypoint = document.getElementById("directWaypoint").value.trim();
      if (directWaypoint) {
        routePhrase = `direct ${directWaypoint}`;
      } else {
        alert('Please enter a direct waypoint.');
        return;
      }
      break;
    case 'AS_FILED':
      routePhrase = planRoute || 'as filed';
      break;
    default:
      routePhrase = planRoute || 'as filed';
  }

  const hardcodedDefaultTemplate = "{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}.";
  const template = effectiveSettings.clearanceFormat.customTemplate || hardcodedDefaultTemplate;
  const clearance = template
    .replace('{CALLSIGN}', callsign)
    .replace('{ATC_STATION}', groundCallsign)
    .replace('{ATIS}', atisInfo)
    .replace('{DESTINATION}', destination)
    .replace('{ROUTE}', routePhrase)
    .replace('{RUNWAY}', departureRW)
    .replace('{INITIAL_ALT}', ifl)
    .replace('{FLIGHT_LEVEL}', flightLevel.replace('FL', '').padStart(3, '0'))
    .replace('{SQUAWK}', squawk);
  const outputElement = document.getElementById("clearanceOutput");
  outputElement.textContent = clearance;

  // Scroll to the output and show the 'Back to Top' button
  const backToTopBtn = document.getElementById('backToTopBtn');
  outputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  backToTopBtn.classList.remove('hidden');

  const currentUser = getCurrentUser();
  const clearanceData = {
    callsign: selectedFlightPlan?.callsign,
    destination: selectedFlightPlan?.arriving,
    route: selectedFlightPlan?.route,
    routing_type: document.getElementById("routingType").value,
    runway: document.getElementById("departureRunway").value,
    initial_altitude: parseInt(document.getElementById("ifl").value),
    station: groundCallsign,
    atis_info: document.getElementById("atisInfo").value,
    clearance_text: document.getElementById("clearanceOutput").textContent,
    user_id: currentUser?.id || null,
    discord_username: currentUser?.username || null
  };
  try {
    const result = await apiTrackClearance(clearanceData, currentUser);
    if (currentUser) {
        if (result.success) {
            showNotification('success', 'Clearance Saved', 'Your clearance has been generated and saved to your profile.');
        } else {
            showNotification('warning', 'Profile Save Failed', 'Clearance was generated but could not be saved to your profile.');
        }
    }
  } catch (error) {
    // Already logged in the api module
  }
}

async function loadPublicSettings() {
    const settings = await apiLoadPublicSettings();
    if (settings) {
        adminSettings = settings;
        updateUIFromSettings();
        updateUserSettingsUI();
    }
}

function updateUIFromSettings() {
  const effectiveSettings = getEffectiveSettings();
  if (effectiveSettings.aviation && effectiveSettings.aviation.defaultAltitudes) {
    const iflSelect = document.getElementById('ifl');
    iflSelect.innerHTML = '';
    effectiveSettings.aviation.defaultAltitudes.forEach(altitude => {
      const option = document.createElement('option');
      option.value = altitude;
      option.textContent = `${altitude}FT`;
      iflSelect.appendChild(option);
    });
  }
}

function showEnvironmentNotification() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(255, 165, 0, 0.1);
    border: 1px solid rgba(255, 165, 0, 0.3);
    border-radius: 8px;
    padding: 15px 20px;
    max-width: 300px;
    font-size: 14px;
    color: #ffa500;
    z-index: 1000;
    backdrop-filter: blur(10px);
  `;
  notification.innerHTML = `
    <strong>⚠️ Serverless Mode</strong><br>
    <span style="color: var(--text-muted); font-size: 12px;">
      Flight plans update every 10 seconds via polling
    </span>
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 8000);
}

function updateAuthUI(isLoggedIn, user = null) {
    const authLoading = document.getElementById('authLoading');
    const authLoggedOut = document.getElementById('authLoggedOut');
    const authLoggedIn = document.getElementById('authLoggedIn');
    const adminBtn = document.getElementById('adminBtn');

    // Always hide the loading spinner after a check
    authLoading.classList.add('hidden');

    if (isLoggedIn && user) {
        document.body.classList.remove('logged-out');
        authLoggedOut.classList.add('hidden');
        authLoggedIn.classList.remove('hidden');

        // Populate user-specific elements
        document.getElementById('userName').textContent = user.username;
        const avatarImg = document.getElementById('userAvatar');
        if (user.avatar) {
            avatarImg.src = user.avatar;
            avatarImg.style.display = 'block';
        } else {
            avatarImg.style.display = 'none';
        }

        // Show admin button if user is admin
        if (user.is_admin) {
            adminBtn.classList.remove('hidden');
        } else {
            adminBtn.classList.add('hidden');
        }

        // Apply user settings if they exist
        if (user.settings && Object.keys(user.settings).length > 0) {
            userSettings.clearanceFormat = { ...userSettings.clearanceFormat, ...user.settings.clearanceFormat };
            userSettings.aviation = { ...userSettings.aviation, ...user.settings.aviation };
            updateUserSettingsUI();
        }

        // Auto-select controller if user is a controller
        if (user.is_controller) {
            const controllerSelect = document.getElementById('groundCallsignSelect');
            const selectUserCallsign = () => {
                const userOption = Array.from(controllerSelect.options).find(opt => opt.dataset.holder === user.username);
                if (userOption) {
                    userOption.selected = true;
                    onControllerSelect();
                    console.log(`Auto-selected controller: ${userOption.value}`);
                }
            };
            controllerSelect.addEventListener('controllersLoaded', selectUserCallsign, { once: true });
            selectUserCallsign();
        }
    } else {
        // Handle logged-out state
        document.body.classList.add('logged-out');
        authLoggedIn.classList.add('hidden');
        authLoggedOut.classList.remove('hidden');
        adminBtn.classList.add('hidden');
    }
}

let atisData = []; // Module-level variable to hold ATIS data

async function loadAtis() {
    try {
        const freshAtisData = await apiLoadAtis();
        atisData = freshAtisData.data || [];
        populateAirportSelect();
    } catch (error) {
        document.getElementById('departureAirportSelect').innerHTML = '<option value="">Error loading airports</option>';
    }
}

function populateAirportSelect() {
  const select = document.getElementById('departureAirportSelect');
  select.innerHTML = '<option value="">-- Select Airport --</option>';
  const airports = [...new Set(atisData.map(a => a.airport))].sort();
  airports.forEach(airport => {
    const option = document.createElement('option');
    option.value = airport;
    option.textContent = airport;
    select.appendChild(option);
  });
  select.addEventListener('change', onAirportSelect);
}

function onAirportSelect() {
  const airport = document.getElementById('departureAirportSelect').value;
  if (!airport) return;
  const atis = atisData.find(a => a.airport === airport);
  if (!atis) return;
  const atisLetterSelect = document.getElementById('atisInfo');
  if (atis.letter && [...atisLetterSelect.options].some(opt => opt.value === atis.letter)) {
    atisLetterSelect.value = atis.letter;
    document.getElementById('atis-auto').style.display = 'inline';
  } else {
    document.getElementById('atis-auto').style.display = 'none';
  }
  const runwayRegex = /DEP RWY (\w+)/;
  const match = atis.content.match(runwayRegex);
  if (match && match[1]) {
    document.getElementById('departureRunway').value = match[1];
    document.getElementById('runway-auto').style.display = 'inline';
  } else {
    document.getElementById('runway-auto').style.display = 'none';
  }
}

async function loadControllers() {
  const select = document.getElementById('groundCallsignSelect');
  const statusText = document.getElementById('statusText');
  const statusLight = document.querySelector('#controllerStatus .status-light');
  const refreshBtn = document.getElementById('refreshControllersBtn');
  select.innerHTML = '<option value="">Loading controllers...</option>';
  select.disabled = true;
  statusText.textContent = 'Loading...';
  statusLight.className = 'status-light';
  refreshBtn.disabled = true;
  try {
    const cache = await apiLoadControllers();
    const controllers = cache.data || [];
    select.innerHTML = '';
    const onlineControllers = controllers.filter(c => c.holder && !c.claimable && c.position && (c.position === 'GND' || c.position === 'TWR'));
    select.innerHTML = '<option value="">-- Select ATC --</option>';
    onlineControllers.forEach(controller => {
      const callsign = `${controller.airport}_${controller.position}`;
      const option = document.createElement('option');
      option.value = callsign;
      option.dataset.holder = controller.holder;
      option.textContent = `${callsign} (${controller.holder})`;
      select.appendChild(option);
    });
    select.innerHTML += '<option value="manual">-- Enter Manually --</option>';

    if (selectedAtcCallsign) {
      if ([...select.options].some(opt => opt.value === selectedAtcCallsign)) {
        select.value = selectedAtcCallsign;
      }
    }

    if (cache.source === 'live') {
      statusText.textContent = `${onlineControllers.length} online | Live`;
      statusLight.className = 'status-light online';
    } else {
      const lastUpdated = new Date(cache.lastUpdated);
      const minutesAgo = Math.round((new Date() - lastUpdated) / 60000);
      statusText.textContent = `Stale | Updated ${minutesAgo}m ago`;
      statusLight.className = 'status-light stale';
    }
  } catch (error) {
    select.innerHTML = '<option value="manual">Error loading - Enter manually</option>';
    statusText.textContent = 'Error';
    statusLight.className = 'status-light';
  } finally {
    select.disabled = false;
    refreshBtn.disabled = false;
    onControllerSelect();
    select.dispatchEvent(new Event('controllersLoaded'));
  }
}

function onControllerSelect() {
  const select = document.getElementById('groundCallsignSelect');
  selectedAtcCallsign = select.value;
  const manualInput = document.getElementById('groundCallsignManual');
  const airportSelect = document.getElementById('departureAirportSelect');
  if (select.value === 'manual') {
    manualInput.style.display = 'block';
    manualInput.focus();
  } else {
    manualInput.style.display = 'none';
    if (select.value) {
      const airport = select.value.split('_')[0];
      if ([...airportSelect.options].some(opt => opt.value === airport)) {
        airportSelect.value = airport;
        onAirportSelect(); // This will now use the module-level atisData
      }
    }
  }
}

async function loadLeaderboard() {
  const refreshBtn = document.querySelector('#leaderboardModal .refresh-btn');
  const originalText = refreshBtn.innerHTML;
  refreshBtn.innerHTML = '<span class="loading"></span> Refreshing...';
  refreshBtn.disabled = true;
  try {
    const leaderboardData = await apiLoadLeaderboard();
    displayLeaderboard(leaderboardData);
  } catch (error) {
    document.getElementById('leaderboard').innerHTML = '<div class="leaderboard-loading">Error loading leaderboard</div>';
  } finally {
    refreshBtn.innerHTML = originalText;
    refreshBtn.disabled = false;
  }
}

function displayLeaderboard(data) {
  const container = document.getElementById('leaderboard');
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="leaderboard-loading">No data to display</div>';
    return;
  }
  container.innerHTML = `
    <div class="leaderboard-grid">
      ${data.map(user => `
        <div class="leaderboard-user">
          <span class="leaderboard-rank">${user.rank}</span>
          <img src="${user.avatar || 'https://via.placeholder.com/40'}" alt="Avatar" class="leaderboard-avatar">
          <span class="leaderboard-username">${user.username}</span>
          <span class="leaderboard-count">${user.clearance_count}</span>
        </div>
      `).join('')}
    </div>
  `;
}

async function showProfile() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const modal = document.getElementById('profileModal');
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);

  document.getElementById('profile-avatar').src = currentUser.avatar || 'https://via.placeholder.com/80';
  document.getElementById('profile-username').textContent = currentUser.username;

  const list = document.getElementById('profile-clearances-list');
  const countEl = document.getElementById('profile-clearance-count');
  list.innerHTML = '<p>Loading clearances...</p>';
  countEl.textContent = '...';

  try {
    const clearances = await apiLoadUserClearances();
    countEl.textContent = clearances.length;

    if (clearances.length === 0) {
      list.innerHTML = '<p>You have not generated any clearances yet.</p>';
      return;
    }

    list.innerHTML = clearances.map(c => `
      <div class="clearance-item">
        <div class="clearance-item-header">
          <strong>${c.callsign || 'N/A'}</strong> to <strong>${c.destination || 'N/A'}</strong>
        </div>
        <div class="clearance-item-body">
          ${c.clearance_text || 'No text available.'}
        </div>
        <div class="clearance-item-footer">
          ${new Date(c.created_at).toLocaleString()}
        </div>
      </div>
    `).join('');
  } catch (error) {
    list.innerHTML = '<p>Could not load your clearances at this time.</p>';
    countEl.textContent = 'Error';
  }
}

function hideProfile() {
  const modal = document.getElementById('profileModal');
  modal.classList.remove('show');
  setTimeout(() => modal.style.display = 'none', 300);
}

function showLeaderboard() {
  const modal = document.getElementById('leaderboardModal');
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);
  loadLeaderboard();
}

function hideLeaderboard() {
  const modal = document.getElementById('leaderboardModal');
  modal.classList.remove('show');
  setTimeout(() => modal.style.display = 'none', 300);
}


function handleSimpleRouting() {
    const currentPath = window.location.pathname;

    // The main app SPA lives at the root. Any other path that serves this HTML is a 404.
    if (currentPath !== '/' && currentPath !== '/index.html') {
        document.body.innerHTML = `
            <style>
                :root {
                    --background-primary: #1a1c1e;
                    --surface-primary: #242628;
                    --primary-color: #f5de40;
                    --text-normal: #e0e0e0;
                    --text-muted: #a0a0a0;
                    --font-primary: 'Funnel Display', sans-serif;
                }
                body {
                    background-color: var(--background-primary);
                    color: var(--text-normal);
                    font-family: var(--font-primary);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    text-align: center;
                }
                .container404 { padding: 20px; }
                .container404 h1 { font-size: 6em; color: var(--primary-color); margin-bottom: 0.1em; font-weight: 700; }
                .container404 p { font-size: 1.5em; color: var(--text-muted); margin-bottom: 2.5em; }
                .container404 a {
                    color: var(--background-primary);
                    background-color: var(--primary-color);
                    text-decoration: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    transition: opacity 0.3s;
                    font-weight: 600;
                }
                .container404 a:hover { opacity: 0.9; }
            </style>
            <div class="container404">
                <h1>404</h1>
                <p>Page Not Found</p>
                <a href="/">RETURN TO ATC24 CLEARANCE GENERATOR</a>
            </div>
        `;
        // Stop the rest of the app from initializing
        throw new Error(`Path not found: ${currentPath}`);
    }
}

function backToTop() {
  const formTop = document.querySelector('.main-grid');
  const backToTopBtn = document.getElementById('backToTopBtn');
  if (formTop) {
    formTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // Hide the button after a short delay to allow scroll to start
  setTimeout(() => {
    if(backToTopBtn) backToTopBtn.classList.add('hidden');
  }, 300);
}

async function initializeApp() {
  const loadingScreen = document.getElementById('loadingScreen');
  const loadingStatus = document.getElementById('loadingStatus');
  const progressBar = document.getElementById('progressBar');
  const mainContainer = document.querySelector('.container');

  mainContainer.style.opacity = '0'; // Hide main content initially

  try {
    handleSimpleRouting();

    document.getElementById('backToTopBtn')?.addEventListener('click', backToTop);

    // Event delegation for auth section
    const authSection = document.getElementById('authSection');
    if (authSection) {
        authSection.addEventListener('click', (event) => {
            const target = event.target.closest('button');
            if (!target) return;

            if (target.classList.contains('leaderboard-btn')) {
                showLeaderboard();
            } else if (target.classList.contains('discord-login-main')) {
                loginWithDiscord();
            } else if (target.classList.contains('profile-btn')) {
                showProfile();
            } else if (target.classList.contains('logout-btn')) {
                if (confirm('Are you sure you want to log out?')) {
                    logout(updateAuthUI);
                }
            }
        });
    }

    document.getElementById('refreshPlansBtn')?.addEventListener('click', loadFlightPlans);
    document.getElementById('flightPlans')?.addEventListener('click', (event) => {
        const flightPlanElement = event.target.closest('.flight-plan');
        if (flightPlanElement) {
            const planIndex = flightPlanElement.dataset.planIndex;
            if (planIndex !== null && planIndex !== undefined) {
                selectFlightPlan(parseInt(planIndex, 10));
            }
        }
    });
    document.getElementById('generateBtn')?.addEventListener('click', generateClearance);
    document.getElementById('refreshControllersBtn')?.addEventListener('click', loadControllers);
    document.getElementById('groundCallsignSelect')?.addEventListener('change', onControllerSelect);
    document.getElementById('routingType')?.addEventListener('change', handleRoutingTypeChange);
    document.querySelector('.advanced-save-btn')?.addEventListener('click', saveUserSettings);
    document.querySelector('#leaderboardModal .modal-close')?.addEventListener('click', hideLeaderboard);
    document.querySelector('#leaderboardModal .refresh-btn')?.addEventListener('click', loadLeaderboard);
    document.querySelector('#profileModal .modal-close')?.addEventListener('click', hideProfile);

    loadingStatus.textContent = 'Authenticating...';
    progressBar.style.width = '20%';
    const authHandled = checkAuthParams(updateAuthUI);
    if (!authHandled) {
      await checkAuthStatus(updateAuthUI, { requireAuth: false });
    }

    loadingStatus.textContent = 'Loading ATC Data...';
    progressBar.style.width = '50%';
    await Promise.all([
        loadControllers(),
        loadFlightPlans(),
        loadAtis(),
        loadPublicSettings()
    ]);

    loadingStatus.textContent = 'Finalizing...';
    progressBar.style.width = '80%';

    loadLeaderboard();
    loadUserSettings();
    updateUIFromSettings();

    // Hide loading screen and show app
    progressBar.style.width = '100%';
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
      mainContainer.style.opacity = '1';
    }, 500);

    const healthData = await getSystemHealth();
    if (healthData.environment === 'serverless') {
      showEnvironmentNotification();
      const flightPlanInterval = adminSettings.system?.autoRefreshInterval || 10000;
      setInterval(loadFlightPlans, flightPlanInterval);
    }
    const controllerInterval = adminSettings.system?.controllerPollInterval || 300000;
    setInterval(loadControllers, controllerInterval);
    const atisInterval = adminSettings.system?.atisPollInterval || 300000;
    setInterval(loadAtis, atisInterval);

  } catch (error) {
    console.error("Initialization failed:", error);
    loadingStatus.innerHTML = `Error: Could not connect to the server.<br>Please try refreshing the page.`;
    loadingScreen.querySelector('.loading-logo').style.animation = 'none';
  }
}

function setupModalEventlisteners() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        const closeButton = modal.querySelector('.modal-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                modal.classList.remove('show');
                setTimeout(() => modal.style.display = 'none', 300);
            });
        }
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.classList.remove('show');
                setTimeout(() => modal.style.display = 'none', 300);
            }
        });
    });

}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupModalEventlisteners();
});```

---
filepath: frontend/_redirects
---
```
/api/* https://api.hasmah.xyz/api/:splat 200
```
