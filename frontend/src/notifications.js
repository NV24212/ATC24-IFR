export function showNotification(type, title, message) {
  const overlay = document.getElementById('notificationOverlay');
  const popup = document.getElementById('notificationPopup');
  const icon = document.getElementById('notificationIcon');
  const titleEl = document.getElementById('notificationTitle');
  const messageEl = document.getElementById('notificationMessage');

  if (!overlay || !popup || !icon || !titleEl || !messageEl) {
    console.error('Notification elements not found in the DOM.');
    alert(`${title}: ${message}`);
    return;
  }

  // Reset classes and styles
  popup.className = 'notification-popup';
  icon.className = 'notification-icon';
  overlay.classList.remove('show');

  // Set content
  titleEl.textContent = title;
  messageEl.textContent = message;

  // Set type-specific styles
  popup.classList.add(type); // 'success', 'error', 'warning', 'info'
  if (type === 'success') {
    icon.textContent = '✓';
  } else if (type === 'error') {
    icon.textContent = '❌';
  } else if (type === 'warning') {
    icon.textContent = '⚠️';
  } else { // info
    icon.textContent = 'ℹ️';
  }

  setTimeout(() => {
      overlay.classList.add('show');
  }, 10);
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
    overlay.classList.remove('show');
  }
}