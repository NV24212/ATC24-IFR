import { checkAuth, login, logout, getUser } from './src/auth.js';
import * as api from './src/api.js';
import { storage } from './src/storage.js';
import { setText, setHTML, show, hide } from './src/dom-utils.js';
import { showNotification, setupModalListeners, handleLogout } from './src/shared.js';

let selectedFlightPlan = null;
let selectedFlightPlanCallsign = null;
let flightPlans = [];
let selectedAtcCallsign = null;
let adminSettings = {};
let userSettings = {};

function loadUserSettings() {
  userSettings = storage.load('user_settings', {});
  updateUserSettingsUI();
}

async function saveUserSettings() {
  userSettings.clearanceFormat.customTemplate = document.getElementById('userPhraseologyTemplate').value;
  const altitudesText = document.getElementById('userDefaultAltitudes').value.trim();
  if (altitudesText) {
    userSettings.aviation.defaultAltitudes = altitudesText.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
  }
  storage.save('user_settings', userSettings);
  updateUIFromSettings();
  showNotification('success', 'Configuration Saved', 'Your settings have been saved to your local browser storage.');
  const currentUser = getUser();
  if (currentUser) {
    const success = await api.saveUserSettings(userSettings);
    if (success) {
      showNotification('success', 'Profile Updated', 'Your settings have also been saved to your user profile.');
    } else {
      showNotification('error', 'Profile Save Failed', 'Could not save settings to your profile.');
    }
  }
}

function updateUserSettingsUI() {
  const templateValue = userSettings.clearanceFormat?.customTemplate || adminSettings.clearanceFormat?.customTemplate || '';
  if(document.getElementById('userPhraseologyTemplate')) {
      document.getElementById('userPhraseologyTemplate').value = templateValue;
  }
  if (userSettings.aviation?.defaultAltitudes?.length > 0) {
    document.getElementById('userDefaultAltitudes').value = userSettings.aviation.defaultAltitudes.join(',');
  }
}

function getEffectiveSettings() {
    const effective = JSON.parse(JSON.stringify(adminSettings));
    if (userSettings.clearanceFormat?.customTemplate) {
        effective.clearanceFormat.customTemplate = userSettings.clearanceFormat.customTemplate;
    }
    if (userSettings.aviation?.defaultAltitudes?.length > 0) {
        effective.aviation.defaultAltitudes = userSettings.aviation.defaultAltitudes;
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
    setHTML("flightPlans", '<div class="no-plans loading">Loading flight plans...</div>');
    flightPlans = await api.loadFlightPlans();
    displayFlightPlans();
  } catch (err) {
    setHTML("flightPlans", '<div class="no-plans">Failed to connect to server or no plans available.</div>');
  }
}

function displayFlightPlans() {
  const container = document.getElementById("flightPlans");
  if (flightPlans.length === 0) {
    setHTML("flightPlans", '<div class="no-plans">No flight plans received yet...</div>');
    return;
  }

  if (selectedFlightPlanCallsign) {
    selectedFlightPlan = flightPlans.find(p => p.callsign === selectedFlightPlanCallsign) || null;
  }

  setHTML("flightPlans", flightPlans.map((plan, index) => `
    <div class="flight-plan ${selectedFlightPlan && selectedFlightPlan.callsign === plan.callsign ? 'selected' : ''}" data-plan-index="${index}">
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
  `).join(''));
}

function selectFlightPlan(index) {
  selectedFlightPlan = flightPlans[index];
  selectedFlightPlanCallsign = selectedFlightPlan ? selectedFlightPlan.callsign : null;
  document.querySelectorAll('.flight-plan').forEach((el, i) => {
    el.classList.toggle('selected', i === index);
  });
  document.getElementById('generateBtn').disabled = !selectedFlightPlan;
}

async function generateClearance() {
  if (!selectedFlightPlan) return;
  const effectiveSettings = getEffectiveSettings();
  const groundCallsign = document.getElementById("groundCallsignSelect").value === 'manual'
    ? document.getElementById("groundCallsignManual").value.trim()
    : document.getElementById("groundCallsignSelect").value;
  const atisInfo = document.getElementById("atisInfo").value;
  const ifl = document.getElementById("ifl").value;
  const departureRW = document.getElementById("departureRunway").value.trim();
  const routingType = document.getElementById("routingType").value;
  const squawk = generateSquawk();
  const callsign = selectedFlightPlan.callsign || 'UNKNOWN';
  const destination = selectedFlightPlan.arriving || 'UNKNOWN';
  const planRoute = selectedFlightPlan.route || '';
  const flightLevel = selectedFlightPlan.flightlevel || 'N/A';

  let routePhrase = '';
  switch (routingType) {
    case 'SID':
      routePhrase = `the ${document.getElementById("sidName").value.trim()} departure`;
      break;
    case 'RDV':
      routePhrase = 'radar vectors';
      break;
    case 'DIRECT':
      routePhrase = `direct ${document.getElementById("directWaypoint").value.trim()}`;
      break;
    default:
      routePhrase = planRoute || 'as filed';
  }

  const template = effectiveSettings.clearanceFormat.customTemplate;
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
  setText("clearanceOutput", clearance);
  show('backToTopBtn');
  const currentUser = getUser();
  const clearanceData = { callsign, destination, route: planRoute, routing_type: routingType, runway: departureRW, initial_altitude: parseInt(ifl), station: groundCallsign, atis_info: atisInfo, clearance_text: clearance, user_id: currentUser?.id, discord_username: currentUser?.username };
  try {
    const result = await api.trackClearanceGeneration(clearanceData);
    if (currentUser && result.success) {
        showNotification('success', 'Clearance Saved', 'Your clearance has been generated and saved to your profile.');
    }
  } catch (error) {}
}

async function loadPublicSettings() {
    const settings = await api.loadPublicSettings();
    if (settings) {
        adminSettings = settings;
        updateUIFromSettings();
        updateUserSettingsUI();
    }
}

function updateUIFromSettings() {
  const effectiveSettings = getEffectiveSettings();
  const iflSelect = document.getElementById('ifl');
  iflSelect.innerHTML = '';
  effectiveSettings.aviation.defaultAltitudes.forEach(altitude => {
    const option = document.createElement('option');
    option.value = altitude;
    option.textContent = `${altitude}FT`;
    iflSelect.appendChild(option);
  });
}

function updateAuthUI(isLoggedIn, user = null) {
    hide('authLoading');
    if (isLoggedIn && user) {
        document.body.classList.remove('logged-out');
        hide('authLoggedOut');
        show('authLoggedIn');
        setText('userName', user.username);
        const avatarImg = document.getElementById('userAvatar');
        if (user.avatar) {
            avatarImg.src = user.avatar;
            show('userAvatar');
        } else {
            hide('userAvatar');
        }
        if (user.is_admin) {
            show('adminBtn');
        } else {
            hide('adminBtn');
        }
        if (user.settings) {
            userSettings = user.settings;
            updateUserSettingsUI();
        }
    } else {
        document.body.classList.add('logged-out');
        hide('authLoggedIn');
        show('authLoggedOut');
        hide('adminBtn');
    }
}

async function initializeApp() {
  const currentPath = window.location.pathname;
  if (currentPath === '/license') {
    document.body.innerHTML = `
        <div class="container">
            <div class="header"><h1>License</h1></div>
            <div class="section">
                <p>You can use this application only after obtaining approval from me.</p>
                <p>Contact: nv24212@nvtc.edu.bh or h.a.s2 on Discord</p>
                <a href="/">Back to Application</a>
            </div>
        </div>
    `;
    return;
  }
  setText('loadingStatus', 'Authenticating...');
  document.getElementById('progressBar').style.width = '20%';
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('auth') || urlParams.has('error')) {
    window.history.replaceState({}, '', '/');
    if (urlParams.get('auth') === 'success') {
      showNotification('success', 'Login Successful', 'You have successfully logged in with Discord.');
    } else {
      showNotification('error', 'Login Failed', 'There was an error logging in with Discord.');
    }
  }
  await checkAuth(updateAuthUI);
  setText('loadingStatus', 'Loading ATC Data...');
  document.getElementById('progressBar').style.width = '50%';
  await Promise.all([api.loadControllers(), loadFlightPlans(), api.loadAtis(), loadPublicSettings()]);
  setText('loadingStatus', 'Finalizing...');
  document.getElementById('progressBar').style.width = '80%';
  api.loadLeaderboard().then(displayLeaderboard);
  loadUserSettings();
  updateUIFromSettings();
  document.getElementById('progressBar').style.width = '100%';
  setTimeout(() => {
    hide('loadingScreen');
    document.querySelector('.container').style.opacity = '1';
  }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupModalListeners();
});