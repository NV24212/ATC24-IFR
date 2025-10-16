export function showNotification(type, title, message) {
  const container = document.getElementById('notification-container');
  if (!container) {
    console.error('Notification container not found.');
    return;
  }

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

  // Animate in
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  // Animate out and remove after a delay
  setTimeout(() => {
    notification.classList.remove('show');
    notification.addEventListener('transitionend', () => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });
  }, 5000); // Notification stays for 5 seconds
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