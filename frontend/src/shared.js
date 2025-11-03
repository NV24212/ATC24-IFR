// shared.js - Code used by both pages
export function showNotification(type, title, message) {
  const container = document.getElementById('notification-container');
  const overlay = document.getElementById('notificationOverlay');

  if (overlay) { // Admin page modal logic
    const popup = document.getElementById('notificationPopup');
    const titleEl = document.getElementById('notificationTitle');
    const messageEl = document.getElementById('notificationMessage');
    const iconEl = document.getElementById('notificationIcon');

    if (popup && titleEl && messageEl && iconEl) {
      titleEl.textContent = title;
      messageEl.textContent = message;

      let iconContent = '';
      switch (type) {
        case 'success': iconContent = '✓'; break;
        case 'error': iconContent = '❌'; break;
        case 'warning': iconContent = '⚠️'; break;
        case 'info': iconContent = 'ℹ️'; break;
      }
      iconEl.textContent = iconContent;

      popup.className = `notification-popup ${type}`;
      overlay.style.display = 'flex';
    }
    return;
  }

  if (container) { // Toast logic
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

      setTimeout(() => {
        notification.classList.add('show');
      }, 10);

      setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        });
      }, 5000);
      return;
  }

  console.error('Notification container or overlay not found.');
}

export function setupModalListeners() {
  // Your modal code here
}

export function handleLogout(updateUI) {
  // Your logout code here
}