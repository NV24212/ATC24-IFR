import { API_BASE_URL, getSessionId } from './utils.js';
import { showNotification, showAuthError } from './notifications.js';

let currentUser = null;

export async function checkAuthStatus(updateUI) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/user`, {
      headers: {
        'X-Session-ID': getSessionId()
      }
    });

    if (response.ok) {
      const authData = await response.json();
      if (authData.authenticated) {
        currentUser = authData.user;
        updateUI(true, authData.user);
      } else {
        currentUser = null;
        updateUI(false);
      }
    } else {
      currentUser = null;
      updateUI(false);
    }
  } catch (error) {
    console.error('Failed to check auth status:', error);
    currentUser = null;
    updateUI(false);
  }
}

export function loginWithDiscord() {
  window.location.href = `${API_BASE_URL}/auth/discord`;
}

export async function logout(updateUI) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': getSessionId()
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
    // Reconstruct the URL to be on the root path
    const newUrl = window.location.origin + '/?' + urlParams.toString();
    window.location.href = newUrl;
    return; // Stop execution to allow for redirect
  }

  if (authResult === 'success') {
    console.log('Discord authentication successful');
    // Remove the param from URL and set path to /
    window.history.replaceState({}, document.title, '/');
    // Check auth status to update UI
    setTimeout(() => checkAuthStatus(updateUI), 500);
  } else if (authError) {
    console.error('Discord authentication error:', authError);
    showAuthError(authError);
    // Remove the param from URL and set path to /
    window.history.replaceState({}, document.title, '/');
  }
}

export function getCurrentUser() {
    return currentUser;
}
