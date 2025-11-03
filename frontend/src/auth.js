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
