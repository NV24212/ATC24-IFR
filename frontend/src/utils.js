export const API_BASE_URL = 'https://api.hasmah.xyz';

// Get or create persistent session ID with validation
export function getSessionId() {
  // Try to get session ID from URL parameters first
  const urlParams = new URLSearchParams(window.location.search);
  const urlSessionId = urlParams.get('session');

  if (urlSessionId) {
    localStorage.setItem('atc24_session_id', urlSessionId);
    // Clean up URL
    urlParams.delete('session');
    const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
    window.history.replaceState({}, document.title, newUrl);
    return urlSessionId;
  }

  // Try to get from cookie
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'session_id' && value) {
      localStorage.setItem('atc24_session_id', value);
      return value;
    }
  }

  // Fallback to localStorage
  let sessionId = localStorage.getItem('atc24_session_id');
  if (!sessionId) {
    sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    localStorage.setItem('atc24_session_id', sessionId);
    console.log('Created new session ID:', sessionId.slice(0, 8) + '...');
  } else {
    console.log('Using existing session ID:', sessionId.slice(0, 8) + '...');
  }

  return sessionId;
}
