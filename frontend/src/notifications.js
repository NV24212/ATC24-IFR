export function showNotification(messageOrOptions, type = 'info', duration = 4000) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;

  if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
    const { title, message } = messageOrOptions;
    notification.innerHTML = `
      <strong>${title}</strong><br>
      <span style="color: var(--text-muted); font-size: 12px;">
        ${message}
      </span>
    `;
  } else {
    notification.textContent = messageOrOptions;
  }

  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => notification.classList.add('show'), 100);

  // Auto-remove after the specified duration
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 400); // Wait for fade-out animation
  }, duration);
}

export function showAuthError(error) {
  let errorMessage = 'Authentication failed';
  switch (error) {
    case 'oauth_cancelled':
      errorMessage = 'Discord login was cancelled';
      break;
    case 'missing_code':
      errorMessage = 'Authentication code missing';
      break;
    case 'invalid_state':
      errorMessage = 'Invalid authentication state';
      break;
    case 'auth_failed':
      errorMessage = 'Authentication failed - please try again';
      break;
  }
  showNotification({ title: 'Authentication Error', message: errorMessage }, 'error');
}

export function hideNotification() {
  const overlay = document.getElementById('notificationOverlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
}
