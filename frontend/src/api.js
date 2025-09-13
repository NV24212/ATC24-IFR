import { API_BASE_URL, getSessionId } from './utils.js';

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

export async function loadAdminSettings() {
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
    console.log('Using default settings');
    return null;
  }
}

export async function saveUserSettings(settings, currentUser) {
    try {
        const headers = {
            'Content-Type': 'application/json',
            'X-Session-ID': getSessionId()
        };
        if (currentUser) {
            headers['Authorization'] = `Bearer ${getSessionId()}`;
        }
        const response = await fetch(`${API_BASE_URL}/api/user/settings`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ settings })
        });
        return response.ok;
    } catch (dbError) {
        console.error('Failed to save user settings to DB:', dbError);
        return false;
    }
}

export async function loadControllers() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/controllers`);
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to load controllers:', error);
        throw error;
    }
}

export async function loadAtis() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/atis`);
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to load ATIS data:', error);
        throw error;
    }
}

export async function trackClearanceGeneration(clearanceData, currentUser) {
    try {
        const headers = {
            'Content-Type': 'application/json',
            'X-Session-ID': getSessionId()
        };

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
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to track clearance generation:', {
            error: error.message,
            sessionId: getSessionId().slice(0, 8) + '...',
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
        const response = await fetch(`${API_BASE_URL}/api/leaderboard`);
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
            headers: { 'X-Session-ID': getSessionId() }
        });
        if (!response.ok) throw new Error('Failed to fetch clearances');
        return await response.json();
    } catch (error) {
        console.error('Error loading profile clearances:', error);
        throw error;
    }
}

export async function getSystemHealth() {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) {
        throw new Error(`Health check failed with status ${response.status}`);
    }
    return await response.json();
}
