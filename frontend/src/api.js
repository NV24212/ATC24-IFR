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
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`, { credentials: 'include' });
        if (!response.ok) {
            throw new Error(`Health check failed with status ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('System health check failed:', error);
        throw error;
    }
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

// This duplicate placeholder function has been removed.