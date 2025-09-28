import {
    checkAuthStatus,
    loginWithDiscord,
    logout,
    checkAuthParams,
    getCurrentUser
} from './src/auth.js';
import {
    loadFlightPlans as apiLoadFlightPlans,
    loadPublicSettings as apiLoadPublicSettings,
    loadControllers as apiLoadControllers,
    loadAtis as apiLoadAtis,
    trackClearanceGeneration as apiTrackClearance,
    loadLeaderboard as apiLoadLeaderboard,
    loadUserClearances as apiLoadUserClearances,
    getSystemHealth
} from './src/api.js';
import { showNotification, showAuthError } from './src/notifications.js';

let selectedFlightPlan = null;
let flightPlans = [];
let adminSettings = {
  clearanceFormat: {
    includeAtis: true,
    includeSquawk: true,
    includeFlightLevel: true,
    customTemplate: "{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}.",
    includeStartupApproval: true,
    includeInitialClimb: true
  },
  aviation: {
    defaultAltitudes: [1000, 2000, 3000, 4000, 5000],
    squawkRanges: { min: 1000, max: 7777, exclude: [7500, 7600, 7700] }
  }
};
let userSettings = {
  clearanceFormat: {
    customTemplate: "",
    includeAtis: true,
    includeSquawk: true,
    includeFlightLevel: true,
    includeStartupApproval: true,
    includeInitialClimb: true
  },
  aviation: {
    defaultAltitudes: [],
    squawkRanges: { min: 1000, max: 7777 },
    enableRunwayValidation: false,
    enableSIDValidation: false
  }
};

function loadUserSettings() {
  try {
    const saved = localStorage.getItem('atc24_user_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      userSettings = { ...userSettings, ...parsed };
    }
    updateUserSettingsUI();
  } catch (error) {
    console.error('Failed to load user settings:', error);
    updateUserSettingsUI();
  }
}

async function saveUserSettings() {
  try {
    userSettings.clearanceFormat.customTemplate = document.getElementById('userPhraseologyTemplate').value;
    const altitudesText = document.getElementById('userDefaultAltitudes').value.trim();
    if (altitudesText) {
      userSettings.aviation.defaultAltitudes = altitudesText.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    }
    localStorage.setItem('atc24_user_settings', JSON.stringify(userSettings));
    updateUIFromSettings();
    showNotification('Configuration saved locally!', 'success');
    const currentUser = getCurrentUser();
    if (currentUser) {
        const success = await apiSaveUserSettings(userSettings, currentUser);
        if (success) {
            showNotification('Configuration saved to your profile!', 'success');
        } else {
            showNotification('Failed to save settings to profile.', 'error');
        }
    }
  } catch (error) {
    console.error('Failed to save user settings:', error);
    showNotification('Failed to save configuration', 'error');
  }
}

function updateUserSettingsUI() {
  const templateValue = userSettings.clearanceFormat.customTemplate || (adminSettings.clearanceFormat && adminSettings.clearanceFormat.customTemplate) || '';
  if(document.getElementById('userPhraseologyTemplate')) {
      document.getElementById('userPhraseologyTemplate').value = templateValue;
  }
  if (userSettings.aviation.defaultAltitudes && userSettings.aviation.defaultAltitudes.length > 0) {
    document.getElementById('userDefaultAltitudes').value = userSettings.aviation.defaultAltitudes.join(',');
  }
}

function getEffectiveSettings() {
  const effective = JSON.parse(JSON.stringify(adminSettings)); // Deep clone
  if (userSettings.clearanceFormat && userSettings.clearanceFormat.customTemplate) {
    effective.clearanceFormat.customTemplate = userSettings.clearanceFormat.customTemplate;
  }
  if (userSettings.clearanceFormat && userSettings.clearanceFormat.hasOwnProperty('includeAtis')) {
    effective.clearanceFormat.includeAtis = userSettings.clearanceFormat.includeAtis;
  }
  if (userSettings.clearanceFormat && userSettings.clearanceFormat.hasOwnProperty('includeSquawk')) {
    effective.clearanceFormat.includeSquawk = userSettings.clearanceFormat.includeSquawk;
  }
  if (userSettings.clearanceFormat && userSettings.clearanceFormat.hasOwnProperty('includeFlightLevel')) {
    effective.clearanceFormat.includeFlightLevel = userSettings.clearanceFormat.includeFlightLevel;
  }
  if (userSettings.clearanceFormat && userSettings.clearanceFormat.hasOwnProperty('includeStartupApproval')) {
    effective.clearanceFormat.includeStartupApproval = userSettings.clearanceFormat.includeStartupApproval;
  }
  if (userSettings.clearanceFormat && userSettings.clearanceFormat.hasOwnProperty('includeInitialClimb')) {
    effective.clearanceFormat.includeInitialClimb = userSettings.clearanceFormat.includeInitialClimb;
  }
  if (userSettings.aviation && userSettings.aviation.defaultAltitudes && userSettings.aviation.defaultAltitudes.length > 0) {
    effective.aviation.defaultAltitudes = userSettings.aviation.defaultAltitudes;
  }
  if (userSettings.aviation && userSettings.aviation.squawkRanges && userSettings.aviation.squawkRanges.min) {
    effective.aviation.squawkRanges.min = userSettings.aviation.squawkRanges.min;
  }
  if (userSettings.aviation && userSettings.aviation.squawkRanges && userSettings.aviation.squawkRanges.max) {
    effective.aviation.squawkRanges.max = userSettings.aviation.squawkRanges.max;
  }
  return effective;
}

function handleRoutingTypeChange() {
  const routingType = document.getElementById("routingType").value;
  const sidInput = document.getElementById("sidInput");
  const directInput = document.getElementById("directInput");
  sidInput.style.display = "none";
  directInput.style.display = "none";
  if (routingType === "SID") {
    sidInput.style.display = "block";
  } else if (routingType === "DIRECT") {
    directInput.style.display = "block";
  }
}

function generateSquawk() {
  const effectiveSettings = getEffectiveSettings();
  const min = effectiveSettings.aviation.squawkRanges.min;
  const max = effectiveSettings.aviation.squawkRanges.max;
  const exclude = effectiveSettings.aviation.squawkRanges.exclude || [7500, 7600, 7700];
  while (true) {
    let code = Math.floor(min + Math.random() * (max - min + 1)).toString();
    if ([...code].every(c => parseInt(c) <= 7) && !exclude.includes(parseInt(code))) {
      return code;
    }
  }
}

async function loadFlightPlans() {
  try {
    const flightPlansContainer = document.getElementById("flightPlans");
    flightPlansContainer.innerHTML = '<div class="no-plans loading">Loading flight plans...</div>';
    flightPlans = await apiLoadFlightPlans();
    displayFlightPlans();
  } catch (err) {
    document.getElementById("flightPlans").innerHTML =
      '<div class="no-plans">Failed to connect to server or no plans available.</div>';
  }
}

function displayFlightPlans() {
  const container = document.getElementById("flightPlans");
  if (flightPlans.length === 0) {
    container.innerHTML = '<div class="no-plans">No flight plans received yet...</div>';
    return;
  }
  container.innerHTML = flightPlans.map((plan, index) => `
    <div class="flight-plan ${selectedFlightPlan === plan ? 'selected' : ''}" onclick="selectFlightPlan(${index})">
      <div class="flight-plan-header">
        <span class="flight-plan-callsign">${plan.callsign || 'Unknown'}</span>
        <span class="flight-plan-aircraft">${plan.aircraft || 'N/A'}</span>
      </div>
      <div class="flight-plan-route">
        <span class="flight-plan-airport">${plan.departing || 'N/A'}</span>
        <span class="flight-plan-arrow">→</span>
        <span class="flight-plan-airport">${plan.arriving || 'N/A'}</span>
      </div>
      <div class="flight-plan-info">
        <span>Route: ${plan.route || 'Direct'}</span>
        <span>FL: ${plan.flightlevel || 'N/A'}</span>
        <span>Rule: ${plan.flightrules || 'N/A'}</span>
      </div>
    </div>
  `).join('');
}

function selectFlightPlan(index) {
  selectedFlightPlan = flightPlans[index];
  document.querySelectorAll('.flight-plan').forEach((el, i) => {
    el.classList.toggle('selected', i === index);
  });
  document.getElementById('generateBtn').disabled = false;
}

async function generateClearance() {
  if (!selectedFlightPlan) {
    alert('Please select a flight plan first');
    return;
  }
  const effectiveSettings = getEffectiveSettings();
  const groundCallsignSelect = document.getElementById("groundCallsignSelect");
  const groundCallsignManual = document.getElementById("groundCallsignManual");
  const groundCallsign = groundCallsignSelect.value === 'manual'
    ? groundCallsignManual.value.trim()
    : groundCallsignSelect.value;
  const atisInfo = document.getElementById("atisInfo").value;
  const ifl = document.getElementById("ifl").value;
  const departureRW = document.getElementById("departureRunway").value.trim();
  const routingType = document.getElementById("routingType").value;
  const squawk = generateSquawk();
  const callsign = selectedFlightPlan.callsign || 'UNKNOWN';
  const destination = selectedFlightPlan.arriving || 'UNKNOWN';
  const planRoute = selectedFlightPlan.route || '';
  const flightLevel = selectedFlightPlan.flightlevel || 'N/A';

  if (!groundCallsign) {
    alert('Please enter an ATC Call Sign.');
    return;
  }
  if (!departureRW) {
    alert('Please enter a Departure Runway.');
    return;
  }
  if (effectiveSettings.aviation.enableRunwayValidation && userSettings.aviation.enableRunwayValidation) {
    const runwayPattern = /^[0-3]?[0-9][LRC]?$/i;
    if (!runwayPattern.test(departureRW)) {
      alert('Invalid runway format. Use format like: 25R, 09L, 03C, or 36');
      return;
    }
  }

  let routePhrase = '';
  switch (routingType) {
    case 'SID':
      const sidName = document.getElementById("sidName").value.trim();
      if (sidName) {
        if (effectiveSettings.aviation.enableSIDValidation && userSettings.aviation.enableSIDValidation) {
          const sidPattern = /^[A-Z0-9]{3,6}$/i;
          if (!sidPattern.test(sidName)) {
            alert('Invalid SID format. Use format like: CIV1K, BIMBO2');
            return;
          }
        }
        routePhrase = `the ${sidName} departure`;
      } else {
        alert('Please enter a SID name.');
        return;
      }
      break;
    case 'RDV':
      routePhrase = 'radar vectors';
      break;
    case 'DIRECT':
      const directWaypoint = document.getElementById("directWaypoint").value.trim();
      if (directWaypoint) {
        routePhrase = `direct ${directWaypoint}`;
      } else {
        alert('Please enter a direct waypoint.');
        return;
      }
      break;
    case 'AS_FILED':
      routePhrase = planRoute || 'as filed';
      break;
    default:
      routePhrase = planRoute || 'as filed';
  }

  const hardcodedDefaultTemplate = "{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}.";
  const template = effectiveSettings.clearanceFormat.customTemplate || hardcodedDefaultTemplate;
  const clearance = template
    .replace('{CALLSIGN}', callsign)
    .replace('{ATC_STATION}', groundCallsign)
    .replace('{ATIS}', atisInfo)
    .replace('{DESTINATION}', destination)
    .replace('{ROUTE}', routePhrase)
    .replace('{RUNWAY}', departureRW)
    .replace('{INITIAL_ALT}', ifl)
    .replace('{FLIGHT_LEVEL}', flightLevel.replace('FL', '').padStart(3, '0'))
    .replace('{SQUAWK}', squawk);
  const outputElement = document.getElementById("clearanceOutput");
  outputElement.textContent = clearance;

  // Scroll to the output and show the 'Back to Top' button
  const backToTopBtn = document.getElementById('backToTopBtn');
  outputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  backToTopBtn.classList.remove('hidden');

  const currentUser = getCurrentUser();
  const clearanceData = {
    callsign: selectedFlightPlan?.callsign,
    destination: selectedFlightPlan?.arriving,
    route: selectedFlightPlan?.route,
    routing_type: document.getElementById("routingType").value,
    runway: document.getElementById("departureRunway").value,
    initial_altitude: parseInt(document.getElementById("ifl").value),
    station: groundCallsign,
    atis_info: document.getElementById("atisInfo").value,
    clearance_text: document.getElementById("clearanceOutput").textContent,
    user_id: currentUser?.id || null,
    discord_username: currentUser?.username || null
  };
  try {
    const result = await apiTrackClearance(clearanceData, currentUser);
    if (currentUser) {
        if (result.success) {
            showNotification('Clearance generated and saved to your profile!', 'success');
        } else {
            showNotification('Could not save clearance to your profile. It is still available here.', 'warning');
        }
    }
  } catch (error) {
    // Already logged in the api module
  }
}

async function loadPublicSettings() {
    const settings = await apiLoadPublicSettings();
    if (settings) {
        adminSettings = settings;
        updateUIFromSettings();
        updateUserSettingsUI();
    }
}

function updateUIFromSettings() {
  const effectiveSettings = getEffectiveSettings();
  if (effectiveSettings.aviation && effectiveSettings.aviation.defaultAltitudes) {
    const iflSelect = document.getElementById('ifl');
    iflSelect.innerHTML = '';
    effectiveSettings.aviation.defaultAltitudes.forEach(altitude => {
      const option = document.createElement('option');
      option.value = altitude;
      option.textContent = `${altitude}FT`;
      iflSelect.appendChild(option);
    });
  }
}

function showEnvironmentNotification() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(255, 165, 0, 0.1);
    border: 1px solid rgba(255, 165, 0, 0.3);
    border-radius: 8px;
    padding: 15px 20px;
    max-width: 300px;
    font-size: 14px;
    color: #ffa500;
    z-index: 1000;
    backdrop-filter: blur(10px);
  `;
  notification.innerHTML = `
    <strong>⚠️ Serverless Mode</strong><br>
    <span style="color: var(--text-muted); font-size: 12px;">
      Flight plans update every 10 seconds via polling
    </span>
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 8000);
}

function updateAuthUI(isLoggedIn, user = null) {
    const authLoading = document.getElementById('authLoading');
    const authLoggedOut = document.getElementById('authLoggedOut');
    const authLoggedIn = document.getElementById('authLoggedIn');
    const adminBtn = document.getElementById('adminBtn');

    // Always hide the loading spinner after a check
    authLoading.classList.add('hidden');

    if (isLoggedIn && user) {
        document.body.classList.remove('logged-out');
        authLoggedOut.classList.add('hidden');
        authLoggedIn.classList.remove('hidden');

        // Populate user-specific elements
        document.getElementById('userName').textContent = user.username;
        const avatarImg = document.getElementById('userAvatar');
        if (user.avatar) {
            avatarImg.src = user.avatar;
            avatarImg.style.display = 'block';
        } else {
            avatarImg.style.display = 'none';
        }

        // Show admin button if user is admin
        if (user.is_admin) {
            adminBtn.classList.remove('hidden');
        } else {
            adminBtn.classList.add('hidden');
        }

        // Apply user settings if they exist
        if (user.settings && Object.keys(user.settings).length > 0) {
            userSettings.clearanceFormat = { ...userSettings.clearanceFormat, ...user.settings.clearanceFormat };
            userSettings.aviation = { ...userSettings.aviation, ...user.settings.aviation };
            updateUserSettingsUI();
        }

        // Auto-select controller if user is a controller
        if (user.is_controller) {
            const controllerSelect = document.getElementById('groundCallsignSelect');
            const selectUserCallsign = () => {
                const userOption = Array.from(controllerSelect.options).find(opt => opt.dataset.holder === user.username);
                if (userOption) {
                    userOption.selected = true;
                    onControllerSelect();
                    console.log(`Auto-selected controller: ${userOption.value}`);
                }
            };
            controllerSelect.addEventListener('controllersLoaded', selectUserCallsign, { once: true });
            selectUserCallsign();
        }
    } else {
        // Handle logged-out state
        document.body.classList.add('logged-out');
        authLoggedIn.classList.add('hidden');
        authLoggedOut.classList.remove('hidden');
        adminBtn.classList.add('hidden');
    }
}

let atisData = []; // Module-level variable to hold ATIS data

async function loadAtis() {
    try {
        const freshAtisData = await apiLoadAtis();
        atisData = freshAtisData.data || [];
        populateAirportSelect();
    } catch (error) {
        document.getElementById('departureAirportSelect').innerHTML = '<option value="">Error loading airports</option>';
    }
}

function populateAirportSelect() {
  const select = document.getElementById('departureAirportSelect');
  select.innerHTML = '<option value="">-- Select Airport --</option>';
  const airports = [...new Set(atisData.map(a => a.airport))].sort();
  airports.forEach(airport => {
    const option = document.createElement('option');
    option.value = airport;
    option.textContent = airport;
    select.appendChild(option);
  });
  select.addEventListener('change', onAirportSelect);
}

function onAirportSelect() {
  const airport = document.getElementById('departureAirportSelect').value;
  if (!airport) return;
  const atis = atisData.find(a => a.airport === airport);
  if (!atis) return;
  const atisLetterSelect = document.getElementById('atisInfo');
  if (atis.letter && [...atisLetterSelect.options].some(opt => opt.value === atis.letter)) {
    atisLetterSelect.value = atis.letter;
    document.getElementById('atis-auto').style.display = 'inline';
  } else {
    document.getElementById('atis-auto').style.display = 'none';
  }
  const runwayRegex = /DEP RWY (\w+)/;
  const match = atis.content.match(runwayRegex);
  if (match && match[1]) {
    document.getElementById('departureRunway').value = match[1];
    document.getElementById('runway-auto').style.display = 'inline';
  } else {
    document.getElementById('runway-auto').style.display = 'none';
  }
}

async function loadControllers() {
  const select = document.getElementById('groundCallsignSelect');
  const statusText = document.getElementById('statusText');
  const statusLight = document.querySelector('#controllerStatus .status-light');
  const refreshBtn = document.getElementById('refreshControllersBtn');
  select.innerHTML = '<option value="">Loading controllers...</option>';
  select.disabled = true;
  statusText.textContent = 'Loading...';
  statusLight.className = 'status-light';
  refreshBtn.disabled = true;
  try {
    const cache = await apiLoadControllers();
    const controllers = cache.data || [];
    select.innerHTML = '';
    const onlineControllers = controllers.filter(c => c.holder && !c.claimable && c.position && (c.position === 'GND' || c.position === 'TWR'));
    select.innerHTML = '<option value="">-- Select ATC --</option>';
    onlineControllers.forEach(controller => {
      const callsign = `${controller.airport}_${controller.position}`;
      const option = document.createElement('option');
      option.value = callsign;
      option.dataset.holder = controller.holder;
      option.textContent = `${callsign} (${controller.holder})`;
      select.appendChild(option);
    });
    select.innerHTML += '<option value="manual">-- Enter Manually --</option>';
    if (cache.source === 'live') {
      statusText.textContent = `${onlineControllers.length} online | Live`;
      statusLight.className = 'status-light online';
    } else {
      const lastUpdated = new Date(cache.lastUpdated);
      const minutesAgo = Math.round((new Date() - lastUpdated) / 60000);
      statusText.textContent = `Stale | Updated ${minutesAgo}m ago`;
      statusLight.className = 'status-light stale';
    }
  } catch (error) {
    select.innerHTML = '<option value="manual">Error loading - Enter manually</option>';
    statusText.textContent = 'Error';
    statusLight.className = 'status-light';
  } finally {
    select.disabled = false;
    refreshBtn.disabled = false;
    onControllerSelect();
    select.dispatchEvent(new Event('controllersLoaded'));
  }
}

function onControllerSelect() {
  const select = document.getElementById('groundCallsignSelect');
  const manualInput = document.getElementById('groundCallsignManual');
  const airportSelect = document.getElementById('departureAirportSelect');
  if (select.value === 'manual') {
    manualInput.style.display = 'block';
    manualInput.focus();
  } else {
    manualInput.style.display = 'none';
    if (select.value) {
      const airport = select.value.split('_')[0];
      if ([...airportSelect.options].some(opt => opt.value === airport)) {
        airportSelect.value = airport;
        onAirportSelect(); // This will now use the module-level atisData
      }
    }
  }
}

async function loadLeaderboard() {
  const refreshBtn = document.querySelector('#leaderboardModal .refresh-btn');
  const originalText = refreshBtn.innerHTML;
  refreshBtn.innerHTML = '<span class="loading"></span> Refreshing...';
  refreshBtn.disabled = true;
  try {
    const leaderboardData = await apiLoadLeaderboard();
    displayLeaderboard(leaderboardData);
  } catch (error) {
    document.getElementById('leaderboard').innerHTML = '<div class="leaderboard-loading">Error loading leaderboard</div>';
  } finally {
    refreshBtn.innerHTML = originalText;
    refreshBtn.disabled = false;
  }
}

function displayLeaderboard(data) {
  const container = document.getElementById('leaderboard');
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="leaderboard-loading">No data to display</div>';
    return;
  }
  container.innerHTML = `
    <div class="leaderboard-grid">
      ${data.map(user => `
        <div class="leaderboard-user">
          <span class="leaderboard-rank">${user.rank}</span>
          <img src="${user.avatar || 'https://via.placeholder.com/40'}" alt="Avatar" class="leaderboard-avatar">
          <span class="leaderboard-username">${user.username}</span>
          <span class="leaderboard-count">${user.clearance_count}</span>
        </div>
      `).join('')}
    </div>
  `;
}

async function showProfile() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  const modal = document.getElementById('profileModal');
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);
  document.getElementById('profile-avatar').src = currentUser.avatar || 'https://via.placeholder.com/80';
  document.getElementById('profile-username').textContent = currentUser.username;
  try {
    const clearances = await apiLoadUserClearances();
    document.getElementById('profile-clearance-count').textContent = clearances.length;
    const list = document.getElementById('profile-clearances-list');
    if (clearances.length === 0) {
      list.innerHTML = '<p>You have not generated any clearances yet.</p>';
      return;
    }
    list.innerHTML = clearances.map(c => `
      <div class="clearance-item">
        <div class="clearance-item-header">
          <strong>${c.callsign || 'N/A'}</strong> to <strong>${c.destination || 'N/A'}</strong>
        </div>
        <div class="clearance-item-body">
          ${c.clearance_text || 'No text available.'}
        </div>
        <div class="clearance-item-footer">
          ${new Date(c.created_at).toLocaleString()}
        </div>
      </div>
    `).join('');
  } catch (error) {
    document.getElementById('profile-clearances-list').innerHTML = '<p>Could not load clearances.</p>';
  }
}

function hideProfile() {
  const modal = document.getElementById('profileModal');
  modal.classList.remove('show');
  setTimeout(() => modal.style.display = 'none', 300);
}

function showLeaderboard() {
  const modal = document.getElementById('leaderboardModal');
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);
}

function hideLeaderboard() {
  const modal = document.getElementById('leaderboardModal');
  modal.classList.remove('show');
  setTimeout(() => modal.style.display = 'none', 300);
}

function showContactNotification() {
  if (!sessionStorage.getItem('contactNotificationShown')) {
    setTimeout(() => {
      showNotification('For bugs or suggestions, contact me on Discord: h.a.s2', 'info', 10000);
      sessionStorage.setItem('contactNotificationShown', 'true');
    }, 5000);
  }
}

function handleSimpleRouting() {
    const currentPath = window.location.pathname;

    // The main app SPA lives at the root. Any other path that serves this HTML is a 404.
    if (currentPath !== '/' && currentPath !== '/index.html') {
        document.body.innerHTML = `
            <style>
                :root {
                    --background-primary: #1a1c1e;
                    --surface-primary: #242628;
                    --primary-color: #f5de40;
                    --text-normal: #e0e0e0;
                    --text-muted: #a0a0a0;
                    --font-primary: 'Funnel Display', sans-serif;
                }
                body {
                    background-color: var(--background-primary);
                    color: var(--text-normal);
                    font-family: var(--font-primary);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    text-align: center;
                }
                .container404 { padding: 20px; }
                .container404 h1 { font-size: 6em; color: var(--primary-color); margin-bottom: 0.1em; font-weight: 700; }
                .container404 p { font-size: 1.5em; color: var(--text-muted); margin-bottom: 2.5em; }
                .container404 a {
                    color: var(--background-primary);
                    background-color: var(--primary-color);
                    text-decoration: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    transition: opacity 0.3s;
                    font-weight: 600;
                }
                .container404 a:hover { opacity: 0.9; }
            </style>
            <div class="container404">
                <h1>404</h1>
                <p>Page Not Found</p>
                <a href="/">RETURN TO ATC24 CLEARANCE GENERATOR</a>
            </div>
        `;
        // Stop the rest of the app from initializing
        throw new Error(`Path not found: ${currentPath}`);
    }
}

function backToTop() {
  const formTop = document.querySelector('.main-grid');
  const backToTopBtn = document.getElementById('backToTopBtn');
  if (formTop) {
    formTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // Hide the button after a short delay to allow scroll to start
  setTimeout(() => {
    if(backToTopBtn) backToTopBtn.classList.add('hidden');
  }, 300);
}

async function initializeApp() {
  try {
    const backToTopBtn = document.getElementById('backToTopBtn');
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', backToTop);
    }
    handleSimpleRouting();
  } catch (e) {
    console.error(e.message);
    return; // Stop initialization
  }
  const authHandled = checkAuthParams(updateAuthUI);
  if (!authHandled) {
    checkAuthStatus(updateAuthUI);
  }
  showContactNotification();
  loadControllers();
  loadFlightPlans();
  loadAtis();
  loadLeaderboard();
  loadUserSettings();
  try {
    await loadPublicSettings();
    updateUIFromSettings();
    const healthData = await getSystemHealth();
    if (healthData.environment === 'serverless') {
      showEnvironmentNotification();
      const flightPlanInterval = adminSettings.system?.autoRefreshInterval || 10000;
      setInterval(loadFlightPlans, flightPlanInterval);
    }
    const controllerInterval = adminSettings.system?.controllerPollInterval || 300000;
    setInterval(loadControllers, controllerInterval);
    const atisInterval = adminSettings.system?.atisPollInterval || 300000;
    setInterval(loadAtis, atisInterval);
  } catch (error) {
    console.error('Failed to initialize app settings or health check:', error);
    setInterval(loadFlightPlans, 30000);
    showNotification('warning', 'Initialization Incomplete', 'Could not determine server environment. Falling back to a 30-second refresh rate.');
  }
  const detailsElement = document.querySelector('details.section');
  if (detailsElement) {
      const toggle = detailsElement.querySelector('.collapse-toggle');
      detailsElement.addEventListener('toggle', () => {
          toggle.textContent = detailsElement.open ? '▼' : '▶';
      });
  }
}

document.addEventListener('DOMContentLoaded', initializeApp);

// Make functions available in the global scope for onclick handlers
window.showLeaderboard = showLeaderboard;
window.hideLeaderboard = hideLeaderboard;
window.showProfile = showProfile;
window.hideProfile = hideProfile;
window.loginWithDiscord = loginWithDiscord;
window.logout = () => logout(updateAuthUI);
window.loadFlightPlans = loadFlightPlans;
window.selectFlightPlan = selectFlightPlan;
window.generateClearance = generateClearance;
window.loadControllers = loadControllers;
window.onControllerSelect = onControllerSelect;
window.handleRoutingTypeChange = handleRoutingTypeChange;
window.saveUserSettings = saveUserSettings;
window.loadLeaderboard = loadLeaderboard;
