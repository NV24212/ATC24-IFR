// auth.js - SIMPLIFIED VERSION
import { API_BASE_URL } from './api.js';

let currentUser = null;

export async function checkAuth(updateUI) {
  const response = await fetch(`${API_BASE_URL}/api/auth/user`, { credentials: 'include' });
  const data = await response.json();
  currentUser = data.authenticated ? data.user : null;
  updateUI(data.authenticated, currentUser);
}

export function login() {
  sessionStorage.setItem('authRedirectPath', window.location.pathname);
  window.location.href = `${API_BASE_URL}/auth/discord?origin=${window.location.origin}`;
}

export async function logout(updateUI) {
  await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  currentUser = null;
  updateUI(false);
}

export function getUser() {
  return currentUser;
}