const API_BASE_URL = ''; // Use relative paths

export async function adminLogin(password) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        return await response.json();
    } catch (error) {
        console.error('Admin login request failed:', error);
        return { success: false, error: 'Network error during login.' };
    }
}

export async function getAdminAnalytics() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/analytics`);
        if (!response.ok) throw new Error('Failed to fetch analytics');
        return await response.json();
    } catch (error) {
        console.error('Failed to get admin analytics:', error);
        return { totalVisits: 'Error', clearancesGenerated: 'Error' };
    }
}

export async function getAdminTable(tableName) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/tables/${tableName}`);
        if (!response.ok) throw new Error(`Failed to fetch table ${tableName}`);
        return await response.json();
    } catch (error) {
        console.error(`Failed to get table ${tableName}:`, error);
        return [];
    }
}