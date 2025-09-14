import { API_BASE_URL, getSessionId } from './utils.js';

// --- Helper for authorized requests ---
async function fetchWithAuth(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'X-Session-ID': getSessionId(),
        'Authorization': `Bearer ${getSessionId()}`,
        ...options.headers,
    };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed with status ' + response.status }));
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
    }
    return response.json();
}


// --- Public API Functions ---

export async function loadFlightPlans() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/flight-plans`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to load flight plans:", err);
    throw err;
  }
}

export async function loadPublicSettings() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/settings`);
    if (response.ok) {
      const settings = await response.json();
      if (settings && !settings.error) {
        return settings;
      }
    }
    return null;
  } catch (error) {
    console.log('Using default settings due to error:', error);
    return null;
  }
}

export async function loadControllers() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/controllers`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to load controllers:', error);
        throw error;
    }
}

export async function loadAtis() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/atis`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to load ATIS data:', error);
        throw error;
    }
}

export async function trackClearanceGeneration(clearanceData, currentUser) {
    try {
        const headers = { 'Content-Type': 'application/json', 'X-Session-ID': getSessionId() };
        if (currentUser) {
            headers['Authorization'] = `Bearer ${getSessionId()}`;
        }
        const response = await fetch(`${API_BASE_URL}/api/clearance-generated`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(clearanceData)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to track clearance generation:', error.message);
        throw error;
    }
}

export async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/leaderboard`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        throw error;
    }
}

export async function getSystemHealth() {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
    return await response.json();
}

// --- User-Specific API Functions ---

export async function loadUserClearances() {
    try {
        return await fetchWithAuth(`${API_BASE_URL}/api/user/clearances`);
    } catch (error) {
        console.error('Error loading profile clearances:', error);
        throw error;
    }
}

export async function saveUserSettings(settings, currentUser) {
    // This function is unused now, user settings are local.
    return Promise.resolve(true);
}


// --- Admin API Functions ---

export async function loadAdminSettings() {
    try {
        return await fetchWithAuth(`${API_BASE_URL}/api/admin/settings`);
    } catch (error) {
        console.error("Failed to load admin settings:", error);
        throw error;
    }
}

export async function saveAdminSettings(settings) {
    try {
        return await fetchWithAuth(`${API_BASE_URL}/api/admin/settings`, {
            method: 'POST',
            body: JSON.stringify(settings),
        });
    } catch (error) {
        console.error("Failed to save admin settings:", error);
        throw error;
    }
}

export async function loadTable(tableName, pageSize, offset) {
    try {
        const url = `${API_BASE_URL}/api/admin/table/${tableName}?pageSize=${pageSize}&offset=${offset}`;
        return await fetchWithAuth(url);
    } catch (error) {
        console.error(`Failed to load table ${tableName}:`, error);
        throw error;
    }
}

export async function loadCurrentUsers() {
    // This is a placeholder as the backend doesn't have a direct equivalent
    // The functionality is covered by the table viewer for 'user_sessions'
    return { activeCount: 0, memorySessionsCount: 0, supabaseSessionsCount: 0, users: [] };
}

export async function loadAdminUsers() {
    try {
        return await fetchWithAuth(`${API_BASE_URL}/api/admin/users`);
    } catch (error) {
        console.error("Failed to load admin users:", error);
        throw error;
    }
}

export async function addAdminUser(username, roles) {
    try {
        return await fetchWithAuth(`${API_BASE_URL}/api/admin/users`, {
            method: 'POST',
            body: JSON.stringify({ username, roles }),
        });
    } catch (error) {
        console.error("Failed to add admin user:", error);
        throw error;
    }
}

export async function removeAdminUser(userId) {
    try {
        return await fetchWithAuth(`${API_BASE_URL}/api/admin/users/${userId}`, {
            method: 'DELETE',
        });
    } catch (error) {
        console.error("Failed to remove admin user:", error);
        throw error;
    }
}

export async function loadDebugLogs(level) {
    try {
        return await fetchWithAuth(`${API_BASE_URL}/api/admin/logs?level=${level}`);
    } catch (error) {
        console.error("Failed to load debug logs:", error);
        throw error;
    }
}

export async function resetAnalytics() {
    // Placeholder - this would need a dedicated backend endpoint
    console.warn("Analytics reset functionality is not implemented on the backend yet.");
    return { success: false, error: "Not implemented" };
}
