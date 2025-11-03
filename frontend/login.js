import { loginWithDiscord } from './src/auth.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginButton = document.querySelector('.discord-login-btn');
  if (loginButton) {
    loginButton.addEventListener('click', loginWithDiscord);
  }
});
