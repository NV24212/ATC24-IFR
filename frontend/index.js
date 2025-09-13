import {
    checkAuthStatus,
    loginWithDiscord,
    logout,
    checkAuthParams,
    getCurrentUser
} from './src/auth.js';
import {
    loadFlightPlans as apiLoadFlightPlans,
    loadAdminSettings as apiLoadAdminSettings,
    loadControllers as apiLoadControllers,
    loadAtis as apiLoadAtis,
    trackClearanceGeneration as apiTrackClearance,
    loadLeaderboard as apiLoadLeaderboard,
    loadUserClearances as apiLoadUserClearances,
    saveUserSettings as apiSaveUserSettings,
    getSystemHealth
} from './src/api.js';
import { showNotification } from './src/notifications.js';

let selectedFlightPlan = null;
let flightPlans = [];
let adminSettings = {};
let userSettings = {};
let atisData = [];

const DOMElements = {
    flightPlans: document.getElementById("flightPlans"),
    generateBtn: document.getElementById('generateBtn'),
    clearanceOutput: document.getElementById("clearanceOutput"),
    groundCallsignSelect: document.getElementById("groundCallsignSelect"),
    groundCallsignManual: document.getElementById("groundCallsignManual"),
    departureAirportSelect: document.getElementById('departureAirportSelect'),
    atisInfo: document.getElementById("atisInfo"),
    ifl: document.getElementById("ifl"),
    departureRunway: document.getElementById("departureRunway"),
    routingType: document.getElementById("routingType"),
    sidInput: document.getElementById("sidInput"),
    directInput: document.getElementById("directInput"),
    userPhraseologyTemplate: document.getElementById('userPhraseologyTemplate'),
    userDefaultAltitudes: document.getElementById('userDefaultAltitudes'),
    leaderboardModal: document.getElementById('leaderboardModal'),
    leaderboardContainer: document.getElementById('leaderboard'),
    profileModal: document.getElementById('profileModal'),
    profileAvatar: document.getElementById('profile-avatar'),
    profileUsername: document.getElementById('profile-username'),
    profileClearanceCount: document.getElementById('profile-clearance-count'),
    profileClearancesList: document.getElementById('profile-clearances-list'),
};

const getEffectiveSettings = () => {
    const effective = { ...adminSettings };
    if (userSettings.clearanceFormat?.customTemplate) {
        effective.clearanceFormat.customTemplate = userSettings.clearanceFormat.customTemplate;
    }
    if (userSettings.aviation?.defaultAltitudes?.length > 0) {
        effective.aviation.defaultAltitudes = userSettings.aviation.defaultAltitudes;
    }
    return effective;
};

const loadUserSettings = () => {
    try {
        const saved = localStorage.getItem('atc24_user_settings');
        if (saved) userSettings = { ...userSettings, ...JSON.parse(saved) };
        updateUserSettingsUI();
    } catch (error) {
        console.error('Failed to load user settings:', error);
        updateUserSettingsUI();
    }
};

const saveUserSettings = async () => {
    try {
        userSettings.clearanceFormat.customTemplate = DOMElements.userPhraseologyTemplate.value;
        const altitudesText = DOMElements.userDefaultAltitudes.value.trim();
        if (altitudesText) {
            userSettings.aviation.defaultAltitudes = altitudesText.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
        }
        localStorage.setItem('atc24_user_settings', JSON.stringify(userSettings));
        updateUIFromSettings();
        showNotification('Configuration saved locally!', 'success');
        const currentUser = getCurrentUser();
        if (currentUser && await apiSaveUserSettings(userSettings, currentUser)) {
            showNotification('Configuration saved to your profile!', 'success');
        } else if (currentUser) {
            showNotification('Failed to save settings to profile.', 'error');
        }
    } catch (error) {
        console.error('Failed to save user settings:', error);
        showNotification('Failed to save configuration', 'error');
    }
};

const updateUserSettingsUI = () => {
    const effectiveSettings = getEffectiveSettings();
    DOMElements.userPhraseologyTemplate.value = userSettings.clearanceFormat?.customTemplate || effectiveSettings.clearanceFormat?.customTemplate || '';
    if (userSettings.aviation?.defaultAltitudes?.length > 0) {
        DOMElements.userDefaultAltitudes.value = userSettings.aviation.defaultAltitudes.join(',');
    }
};

const updateUIFromSettings = () => {
    const effectiveSettings = getEffectiveSettings();
    if (effectiveSettings.aviation?.defaultAltitudes) {
        DOMElements.ifl.innerHTML = effectiveSettings.aviation.defaultAltitudes.map(altitude => `<option value="${altitude}">${altitude}FT</option>`).join('');
    }
};

const loadFlightPlans = async () => {
    try {
        DOMElements.flightPlans.innerHTML = '<div class="no-plans loading">Loading flight plans...</div>';
        flightPlans = await apiLoadFlightPlans();
        displayFlightPlans();
    } catch (err) {
        DOMElements.flightPlans.innerHTML = '<div class="no-plans">Failed to connect to server or no plans available.</div>';
    }
};

const displayFlightPlans = () => {
    if (flightPlans.length === 0) {
        DOMElements.flightPlans.innerHTML = '<div class="no-plans">No flight plans received yet...</div>';
        return;
    }
    DOMElements.flightPlans.innerHTML = flightPlans.map((plan, index) => `
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
};

const selectFlightPlan = index => {
    selectedFlightPlan = flightPlans[index];
    document.querySelectorAll('.flight-plan').forEach((el, i) => el.classList.toggle('selected', i === index));
    DOMElements.generateBtn.disabled = false;
};

const generateClearance = async () => {
    if (!selectedFlightPlan) return alert('Please select a flight plan first');
    const groundCallsign = DOMElements.groundCallsignSelect.value === 'manual' ? DOMElements.groundCallsignManual.value.trim() : DOMElements.groundCallsignSelect.value;
    if (!groundCallsign || !DOMElements.departureRunway.value.trim()) return alert('Please enter an ATC Call Sign and Departure Runway.');

    const effectiveSettings = getEffectiveSettings();
    if (effectiveSettings.aviation.enableRunwayValidation && !/^[0-3]?[0-9][LRC]?$/i.test(DOMElements.departureRunway.value.trim())) {
        return alert('Invalid runway format. Use format like: 25R, 09L, 03C, or 36');
    }

    let routePhrase = '';
    switch (DOMElements.routingType.value) {
        case 'SID':
            const sidName = DOMElements.sidInput.querySelector('input').value.trim();
            if (!sidName) return alert('Please enter a SID name.');
            if (effectiveSettings.aviation.enableSIDValidation && !/^[A-Z0-9]{3,6}$/i.test(sidName)) return alert('Invalid SID format. Use format like: CIV1K, BIMBO2');
            routePhrase = `the ${sidName} departure`;
            break;
        case 'DIRECT':
            const directWaypoint = DOMElements.directInput.querySelector('input').value.trim();
            if (!directWaypoint) return alert('Please enter a direct waypoint.');
            routePhrase = `direct ${directWaypoint}`;
            break;
        case 'RDV': routePhrase = 'radar vectors'; break;
        default: routePhrase = selectedFlightPlan.route || 'as filed';
    }

    const squawk = generateSquawk();
    const template = effectiveSettings.clearanceFormat.customTemplate || "{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}.";
    const clearance = template
        .replace('{CALLSIGN}', selectedFlightPlan.callsign || 'UNKNOWN')
        .replace('{ATC_STATION}', groundCallsign)
        .replace('{ATIS}', DOMElements.atisInfo.value)
        .replace('{DESTINATION}', selectedFlightPlan.arriving || 'UNKNOWN')
        .replace('{ROUTE}', routePhrase)
        .replace('{RUNWAY}', DOMElements.departureRunway.value.trim())
        .replace('{INITIAL_ALT}', DOMElements.ifl.value)
        .replace('{FLIGHT_LEVEL}', (selectedFlightPlan.flightlevel || 'N/A').replace('FL', '').padStart(3, '0'))
        .replace('{SQUAWK}', squawk);

    DOMElements.clearanceOutput.textContent = clearance;

    const currentUser = getCurrentUser();
    const clearanceData = {
        callsign: selectedFlightPlan.callsign,
        destination: selectedFlightPlan.arriving,
        route: selectedFlightPlan.route,
        routing_type: DOMElements.routingType.value,
        runway: DOMElements.departureRunway.value,
        initial_altitude: parseInt(DOMElements.ifl.value),
        station: groundCallsign,
        atis_info: DOMElements.atisInfo.value,
        clearance_text: clearance,
        user_id: currentUser?.id,
        discord_username: currentUser?.username,
    };
    try {
        const result = await apiTrackClearance(clearanceData, currentUser);
        if (currentUser) {
            showNotification(result.success ? 'Clearance generated and saved to your profile!' : 'Could not save clearance to your profile.', result.success ? 'success' : 'warning');
        }
    } catch (error) { /* Already logged in api.js */ }
};

const generateSquawk = () => {
    const { min, max, exclude = [7500, 7600, 7700] } = getEffectiveSettings().aviation.squawkRanges;
    while (true) {
        let code = Math.floor(min + Math.random() * (max - min + 1)).toString();
        if ([...code].every(c => parseInt(c) <= 7) && !exclude.includes(parseInt(code))) return code;
    }
};

const init = async () => {
    document.addEventListener('DOMContentLoaded', async () => {
        Object.keys(DOMElements).forEach(key => {
            if (!DOMElements[key]) console.error(`DOM Element not found: ${key}`);
        });

        checkAuthParams(updateAuthUI);
        checkAuthStatus(updateAuthUI);
        showContactNotification();
        loadControllers();
        loadFlightPlans();
        loadAtis();
        loadLeaderboard();
        loadUserSettings();

        try {
            adminSettings = await apiLoadAdminSettings() || adminSettings;
            updateUIFromSettings();
            const healthData = await getSystemHealth();
            if (healthData.environment === 'serverless') {
                showEnvironmentNotification();
                setInterval(loadFlightPlans, adminSettings.system?.autoRefreshInterval || 10000);
            }
            setInterval(loadControllers, adminSettings.system?.controllerPollInterval || 300000);
            setInterval(loadAtis, adminSettings.system?.atisPollInterval || 300000);
        } catch (error) {
            console.error('Failed to initialize app settings or health check:', error);
            setInterval(loadFlightPlans, 30000);
            showNotification('Initialization Incomplete. Falling back to a 30-second refresh rate.', 'warning');
        }

        const detailsElement = document.querySelector('details.section');
        if (detailsElement) {
            const toggle = detailsElement.querySelector('.collapse-toggle');
            detailsElement.addEventListener('toggle', () => {
                toggle.textContent = detailsElement.open ? '▼' : '▶';
            });
        }
    });

    window.selectFlightPlan = selectFlightPlan;
    window.generateClearance = generateClearance;
    window.loginWithDiscord = loginWithDiscord;
    window.logout = () => logout(updateAuthUI);
};

init();
