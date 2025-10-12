# Agent Instructions & Context

This document contains important context about the application's history and architecture. It is intended to help me, Jules, understand the intended functionality of the application, especially for features that may be missing or broken after a recent migration.

**Do not copy this code directly into the current codebase. The backend has been smigrated from Express.js (in `server.js`) to Flask. This code is for reference only.**

The following code represents the state of the application *before* it was split into a separate frontend and a Flask backend.

---

## Old `index.html`

```html
<!DOCTYPE html>
<html>
<head>
  <title>ATC24 IFR Clearance Generator</title>
  <link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <style>
    .controller-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    .controller-status {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--text-muted);
    }
    .status-light {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #888; /* Default gray */
        transition: background-color 0.3s ease;
    }
    .status-light.online {
        background-color: #2ecc71; /* Green */
    }
    .status-light.stale {
        background-color: #f39c12; /* Orange */
    }
    .controller-selection-wrapper {
        display: flex;
        gap: 10px;
    }
    #groundCallsignSelect {
        flex: 1;
    }
    .refresh-btn.small-btn {
        padding: 10px;
        line-height: 1;
        min-width: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    details summary {
        cursor: pointer;
        list-style: none; /* Remove default marker */
    }
    details summary::-webkit-details-marker {
        display: none; /* For Chrome */
    }
    .auth-logged-out, .auth-logged-in {
        transition: opacity 0.5s ease, visibility 0.5s ease;
    }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <img src="logo.png" alt="Logo" class="header-logo" style="width: 150px; height: auto; margin-bottom: 0px;">
    <h1>ATC24 IFR Clearance Generator</h1>

    <div class="auth-section" id="authSection">
      <div class="auth-loading" id="authLoading">
        <span>Checking login status...</span>
      </div>
      <div class="auth-logged-out" id="authLoggedOut" style="display: none;">
        <button class="leaderboard-btn" onclick="showLeaderboard()">Leaderboard</button>
        <button class="discord-login-btn discord-login-main" onclick="loginWithDiscord()">
          <svg width="18" height="18" viewBox="0 0 71 55" fill="none">
            <g clip-path="url(#clip0)">
              <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.308 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="#5865F2"/>
            </g>
          </svg>
          Login with Discord
        </button>
      </div>
      <div class="auth-logged-in" id="authLoggedIn" style="display: none;">
        <div class="user-info">
          <img class="user-avatar" id="userAvatar" src="" alt="User Avatar">
          <div class="user-details">
            <span class="user-name" id="userName"></span>
            <div class="user-actions">
              <button class="leaderboard-btn" onclick="showLeaderboard()">Leaderboard</button>
              <button class="profile-btn" onclick="showProfile()">Profile</button>
              <button class="logout-btn" onclick="logout()">Logout</button>
              <button class="admin-btn" id="adminBtn" onclick="window.location.href='/admin'" style="display: none;">Admin</button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <div class="main-grid">
    <div class="section">
      <h2 class="section-title">Flight Plans</h2>
      <button class="refresh-btn" onclick="loadFlightPlans()">Refresh Plans</button>
      <div class="flight-plans" id="flightPlans">
        <div class="no-plans">No flight plans received yet...</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">ATC Configuration</h2>

      <div class="config-group">
        <div class="controller-header">
          <label class="config-label">ATC Call Sign</label>
          <div class="controller-status" id="controllerStatus">
            <span class="status-light"></span>
            <span id="statusText">Loading...</span>
          </div>
        </div>
        <div class="controller-selection-wrapper">
          <select id="groundCallsignSelect" onchange="onControllerSelect()">
            <option value="">Loading controllers...</option>
          </select>
          <button class="refresh-btn small-btn" id="refreshControllersBtn" onclick="loadControllers()">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L20.49 15a9 9 0 0 1-14.85 3.36L3.51 9z"></path></svg>
          </button>
        </div>
        <input type="text" id="groundCallsignManual" placeholder="Or enter callsign manually" style="display: none; margin-top: 10px;">
      </div>

      <div class="config-group">
        <label class="config-label">Departure Airport</label>
        <select id="departureAirportSelect">
          <option value="">Loading airports...</option>
        </select>
      </div>

      <div class="config-group">
        <label class="config-label">ATIS Information Letter <span id="atis-auto" style="display:none;">✓</span></label>
        <select id="atisInfo">
          <option value="A">Information A</option>
          <option value="B">Information B</option>
          <option value="C">Information C</option>
          <option value="D">Information D</option>
          <option value="E">Information E</option>
          <option value="F">Information F</option>
          <option value="G">Information G</option>
          <option value="H">Information H</option>
          <option value="I">Information I</option>
          <option value="J">Information J</option>
          <option value="K">Information K</option>
          <option value="L">Information L</option>
          <option value="M">Information M</option>
          <option value="N">Information N</option>
          <option value="O">Information O</option>
          <option value="P">Information P</option>
          <option value="Q">Information Q</option>
          <option value="R">Information R</option>
          <option value="S">Information S</option>
          <option value="T">Information T</option>
          <option value="U">Information U</option>
          <option value="V">Information V</option>
          <option value="W">Information W</option>
          <option value="X">Information X</option>
          <option value="Y">Information Y</option>
          <option value="Z">Information Z</option>
        </select>
      </div>

      <div class="config-group">
        <label class="config-label">Routing Type</label>
        <p style="color: var(--text-muted); font-size: 12px; margin-bottom: 10px;">
          Select departure routing method. As Filed uses the original flight plan route.
        </p>
        <select id="routingType" onchange="handleRoutingTypeChange()">
          <option value="AS_FILED">Use original filed route</option>
          <option value="SID">SID (Standard Instrument Departure)</option>
          <option value="RDV">Radar Vectors (Controller guidance)</option>
          <option value="DIRECT">Direct (Navigation to specific waypoint)</option>
        </select>

        <div id="sidInput" style="display: none; margin-top: 15px;">
          <input type="text" id="sidName" placeholder="Enter SID (e.g., CIV1K)">
        </div>

        <div id="directInput" style="display: none; margin-top: 15px;">
          <input type="text" id="directWaypoint" placeholder="Enter directed waypoint(s) (e.g., BIMBO, ALPHA)">
        </div>
      </div>

      <div class="config-group">
        <label class="config-label">Departure Runway <span id="runway-auto" style="display:none;">✓</span></label>
        <input type="text" id="departureRunway" placeholder="e.g., 25R">
      </div>

      <div class="config-group">
        <label class="config-label">Initial Climb Altitude</label>
        <select id="ifl">
          <option value="1000">1000FT</option>
          <option value="2000">2000FT</option>
          <option value="3000">3000FT</option>
        </select>
      </div>


      <button class="generate-btn" onclick="generateClearance()" id="generateBtn" disabled style="margin-top: 20px;">
        Generate IFR Clearance
      </button>
    </div>
  </div>

  <!-- Advanced Configuration Moved and Made Collapsible -->
  <details class="section" style="margin-top: 20px; padding: 20px;">
    <summary class="section-header">
      <h2 class="section-title" style="border: none; margin: 0; padding: 0;">Advanced Configuration</h2>
      <span class="collapse-toggle">▶</span>
    </summary>
    <div class="advanced-config-content" style="margin-top: 15px;">
      <div class="advanced-config-grid">
        <div class="config-section">
          <h3 class="config-section-title">Clearance Format & Phraseology</h3>
          <div class="config-group">
            <label class="config-label">Custom Phraseology Format</label>
            <textarea id="userPhraseologyTemplate" placeholder="Enter custom clearance format template...">{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}.</textarea>
            <div class="template-help">
              Available variables: {CALLSIGN}, {ATC_STATION}, {ATIS}, {DESTINATION}, {ROUTE}, {RUNWAY}, {INITIAL_ALT}, {FLIGHT_LEVEL}, {SQUAWK}
            </div>
          </div>
          <div class="checkbox-group">
            <div class="checkbox-item">
              <input type="checkbox" id="userIncludeAtis" checked>
              <label for="userIncludeAtis">Include ATIS Information</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="userIncludeSquawk" checked>
              <label for="userIncludeSquawk">Include Squawk Code</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="userIncludeFlightLevel" checked>
              <label for="userIncludeFlightLevel">Include Expected Flight Level</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="userIncludeStartupApproval" checked>
              <label for="userIncludeStartupApproval">Include Startup Approval</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="userIncludeInitialClimb" checked>
              <label for="userIncludeInitialClimb">Include Initial Climb Instruction</label>
            </div>
          </div>
        </div>
        <div class="config-section">
          <h3 class="config-section-title">Aviation Standards</h3>
          <div class="config-group">
            <label class="config-label">Custom Altitudes (comma-separated)</label>
            <input type="text" id="userDefaultAltitudes" placeholder="1000,2000,3000,4000,5000">
            <div class="template-help">
              Enter custom altitude options for initial climb
            </div>
          </div>
          <div class="config-group">
            <label class="config-label">Squawk Code Range (Min)</label>
            <input type="number" id="userSquawkMin" placeholder="1000" min="1000" max="7777" value="1000">
          </div>
          <div class="config-group">
            <label class="config-label">Squawk Code Range (Max)</label>
            <input type="number" id="userSquawkMax" placeholder="7777" min="1000" max="7777" value="7777">
          </div>
          <div class="checkbox-group">
            <div class="checkbox-item">
              <input type="checkbox" id="userEnableRunwayValidation">
              <label for="userEnableRunwayValidation">Enable Runway Format Validation</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="userEnableSIDValidation">
              <label for="userEnableSIDValidation">Enable SID/STAR Validation</label>
            </div>
          </div>
        </div>
      </div>
      <button class="advanced-save-btn" onclick="saveUserSettings()">Save Configuration</button>
    </div>
  </details>

  <div class="section">
    <h2 class="section-title">IFR Clearance</h2>
    <div class="clearance-output" id="clearanceOutput">
      Select a flight plan and configure ATC settings to generate clearance...
    </div>
  </div>

</div>

<script>
  let selectedFlightPlan = null;
  let flightPlans = []; // This will hold flight plans fetched from the server
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

  // User settings (overrides admin settings)
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

  // Notification system
  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 100);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => document.body.removeChild(notification), 400);
    }, 3000);
  }

  // Load user settings from localStorage
  function loadUserSettings() {
    try {
      const saved = localStorage.getItem('atc24_user_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        userSettings = { ...userSettings, ...parsed };
      }
      // Always update UI after loading (or not loading) settings
      updateUserSettingsUI();
    } catch (error) {
      console.error('Failed to load user settings:', error);
      // Still update UI with defaults on error
      updateUserSettingsUI();
    }
  }

  // Save user settings to localStorage
  async function saveUserSettings() {
    try {
      // Get values from UI
      userSettings.clearanceFormat.customTemplate = document.getElementById('userPhraseologyTemplate').value;
      userSettings.clearanceFormat.includeAtis = document.getElementById('userIncludeAtis').checked;
      userSettings.clearanceFormat.includeSquawk = document.getElementById('userIncludeSquawk').checked;
      userSettings.clearanceFormat.includeFlightLevel = document.getElementById('userIncludeFlightLevel').checked;
      userSettings.clearanceFormat.includeStartupApproval = document.getElementById('userIncludeStartupApproval').checked;
      userSettings.clearanceFormat.includeInitialClimb = document.getElementById('userIncludeInitialClimb').checked;

      // Aviation settings
      const altitudesText = document.getElementById('userDefaultAltitudes').value.trim();
      if (altitudesText) {
        userSettings.aviation.defaultAltitudes = altitudesText.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
      }
      userSettings.aviation.squawkRanges.min = parseInt(document.getElementById('userSquawkMin').value) || 1000;
      userSettings.aviation.squawkRanges.max = parseInt(document.getElementById('userSquawkMax').value) || 7777;
      userSettings.aviation.enableRunwayValidation = document.getElementById('userEnableRunwayValidation').checked;
      userSettings.aviation.enableSIDValidation = document.getElementById('userEnableSIDValidation').checked;

      // Save to localStorage
      localStorage.setItem('atc24_user_settings', JSON.stringify(userSettings));

      // Update UI elements that depend on settings
      updateUIFromSettings();

      showNotification('Configuration saved locally!', 'success');

      // If user is logged in, also save to database
      if (currentUser) {
        try {
          const response = await fetch('/api/user/settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-ID': getSessionId()
            },
            body: JSON.stringify({ settings: userSettings })
          });
          if (response.ok) {
            showNotification('Configuration saved to your profile!', 'success');
          } else {
            showNotification('Failed to save settings to profile.', 'error');
          }
        } catch (dbError) {
          console.error('Failed to save user settings to DB:', dbError);
          showNotification('Failed to save settings to profile.', 'error');
        }
      }
    } catch (error) {
      console.error('Failed to save user settings:', error);
      showNotification('Failed to save configuration', 'error');
    }
  }

  // Update UI elements with user settings
  function updateUserSettingsUI() {
    // Set custom template or default template if empty
    const templateValue = userSettings.clearanceFormat.customTemplate || (adminSettings.clearanceFormat && adminSettings.clearanceFormat.customTemplate) || '';
    document.getElementById('userPhraseologyTemplate').value = templateValue;

    document.getElementById('userIncludeAtis').checked = userSettings.clearanceFormat.includeAtis;
    document.getElementById('userIncludeSquawk').checked = userSettings.clearanceFormat.includeSquawk;
    document.getElementById('userIncludeFlightLevel').checked = userSettings.clearanceFormat.includeFlightLevel;
    document.getElementById('userIncludeStartupApproval').checked = userSettings.clearanceFormat.includeStartupApproval;
    document.getElementById('userIncludeInitialClimb').checked = userSettings.clearanceFormat.includeInitialClimb;

    if (userSettings.aviation.defaultAltitudes && userSettings.aviation.defaultAltitudes.length > 0) {
      document.getElementById('userDefaultAltitudes').value = userSettings.aviation.defaultAltitudes.join(',');
    }
    document.getElementById('userSquawkMin').value = userSettings.aviation.squawkRanges.min;
    document.getElementById('userSquawkMax').value = userSettings.aviation.squawkRanges.max;
    document.getElementById('userEnableRunwayValidation').checked = userSettings.aviation.enableRunwayValidation;
    document.getElementById('userEnableSIDValidation').checked = userSettings.aviation.enableSIDValidation;
  }

  // Get effective settings (user settings override admin settings)
  function getEffectiveSettings() {
    const effective = JSON.parse(JSON.stringify(adminSettings)); // Deep clone

    // Override with user settings if they exist
    if (userSettings.clearanceFormat && userSettings.clearanceFormat.customTemplate) {
      effective.clearanceFormat.customTemplate = userSettings.clearanceFormat.customTemplate;
    }

    // For boolean flags, check if the property exists in userSettings before overriding
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

    // Hide all inputs first
    sidInput.style.display = "none";
    directInput.style.display = "none";

    // Show relevant input based on selection
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

      // Ensure all digits are between 0-7 for octal squawk code
      if ([...code].every(c => parseInt(c) <= 7) && !exclude.includes(parseInt(code))) {
        return code;
      }
    }
  }

  async function loadFlightPlans() {
    try {
      // Add loading state
      const flightPlansContainer = document.getElementById("flightPlans");
      flightPlansContainer.innerHTML = '<div class="no-plans loading">Loading flight plans...</div>';

      const res = await fetch("/flight-plans");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      flightPlans = await res.json();
      displayFlightPlans();
    } catch (err) {
      console.error("Failed to load flight plans:", err);
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

  function generateClearance() {
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

    // Get details from flight plan
    const callsign = selectedFlightPlan.callsign || 'UNKNOWN';
    const destination = selectedFlightPlan.arriving || 'UNKNOWN';
    const planRoute = selectedFlightPlan.route || '';
    const flightLevel = selectedFlightPlan.flightlevel || 'N/A';

    // Validate inputs
    if (!groundCallsign) {
      alert('Please enter an ATC Call Sign.');
      return;
    }

    if (!departureRW) {
      alert('Please enter a Departure Runway.');
      return;
    }

    // Runway validation if enabled
    if (effectiveSettings.aviation.enableRunwayValidation && userSettings.aviation.enableRunwayValidation) {
      const runwayPattern = /^[0-3]?[0-9][LRC]?$/i;
      if (!runwayPattern.test(departureRW)) {
        alert('Invalid runway format. Use format like: 25R, 09L, 03C, or 36');
        return;
      }
    }

    // Handle routing based on type
    let routePhrase = '';
    switch (routingType) {
      case 'SID':
        const sidName = document.getElementById("sidName").value.trim();
        if (sidName) {
          // SID validation if enabled
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

    // Generate clearance based on the effective custom template
    let clearance = '';
    const template = effectiveSettings.clearanceFormat.customTemplate;

    if (template) {
      clearance = template
        .replace('{CALLSIGN}', callsign)
        .replace('{ATC_STATION}', groundCallsign)
        .replace('{ATIS}', atisInfo)
        .replace('{DESTINATION}', destination)
        .replace('{ROUTE}', routePhrase)
        .replace('{RUNWAY}', departureRW)
        .replace('{INITIAL_ALT}', ifl)
        .replace('{FLIGHT_LEVEL}', flightLevel.replace('FL', '').padStart(3, '0'))
        .replace('{SQUAWK}', squawk);
    }
    document.getElementById("clearanceOutput").textContent = clearance;

    // Track analytics
    trackClearanceGeneration();
  }

  // Get or create persistent session ID with validation
  function getSessionId() {
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

  // Track clearance generation
  async function trackClearanceGeneration() {
    try {
      const groundCallsignSelect = document.getElementById("groundCallsignSelect");
      const groundCallsignManual = document.getElementById("groundCallsignManual");
      const atc_station = groundCallsignSelect.value === 'manual'
        ? groundCallsignManual.value.trim()
        : groundCallsignSelect.value;

      const clearanceData = {
        callsign: selectedFlightPlan?.callsign,
        destination: selectedFlightPlan?.arriving,
        route: selectedFlightPlan?.route,
        routing_type: document.getElementById("routingType").value,
        runway: document.getElementById("departureRunway").value,
        initial_altitude: parseInt(document.getElementById("ifl").value),
        atc_station: atc_station,
        atis_info: document.getElementById("atisInfo").value,
        clearance_text: document.getElementById("clearanceOutput").textContent,
        user_id: currentUser?.id || null,
        discord_username: currentUser?.username || null
      };

      console.log('Tracking clearance generation:', {
        callsign: clearanceData.callsign,
        destination: clearanceData.destination,
        sessionId: getSessionId().slice(0, 8) + '...',
        user: currentUser?.username || 'anonymous'
      });

      const headers = {
        'Content-Type': 'application/json',
        'X-Session-ID': getSessionId()
      };

      // Add authorization header if user is authenticated
      if (currentUser) {
        headers['Authorization'] = `Bearer ${getSessionId()}`;
      }

      const response = await fetch('/api/clearance-generated', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(clearanceData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Clearance tracking response:', result);

      if (!result.success) {
        // Show a non-blocking warning to the user
        showNotification('Could not save clearance to your profile. It is still available here.', 'warning');
        console.warn('Failed to log clearance:', result.error);
        return; // Don't throw an error, just notify
      }

      // Show success notification for authenticated users
      if (currentUser) {
        showNotification('Clearance generated and saved to your profile!', 'success');
      }

    } catch (error) {
      console.error('Failed to track clearance generation:', {
        error: error.message,
        sessionId: getSessionId().slice(0, 8) + '...',
        callsign: selectedFlightPlan?.callsign,
        destination: selectedFlightPlan?.arriving,
        timestamp: new Date().toISOString(),
        stack: error.stack
      });
      // Continue without breaking user experience
    }
  }

  // Show notification function
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 100);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 400);
    }, 5000);
  }

  // Load admin settings for the frontend
  async function loadAdminSettings() {
    try {
      const response = await fetch('/api/admin/settings?password=guest');
      if (response.ok) {
        const settings = await response.json();
        if (settings && !settings.error) {
          adminSettings = settings;

          // Update UI based on settings
          updateUIFromSettings();
          updateUserSettingsUI(); // This will update the advanced config text area
        }
      }
    } catch (error) {
      console.log('Using default settings');
    }
  }

  // Update UI elements based on effective settings (user settings override admin settings)
  function updateUIFromSettings() {
    const effectiveSettings = getEffectiveSettings();

    // Update default altitudes in the dropdown
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

    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 8000);
  }

  // Discord Authentication Functions
  let currentUser = null;

  async function checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/user', {
        headers: {
          'X-Session-ID': getSessionId()
        }
      });

      if (response.ok) {
        const authData = await response.json();
        if (authData.authenticated) {
          currentUser = authData.user;
          showLoggedInState(authData.user);
        } else {
          currentUser = null;
          showLoggedOutState();
        }
      } else {
        currentUser = null;
        showLoggedOutState();
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
      currentUser = null;
      showLoggedOutState();
    }
  }

  function showLoggedInState(user) {
    document.body.classList.remove('logged-out');
    // If server provides settings, merge them with local settings
    if (user.settings && Object.keys(user.settings).length > 0) {
      console.log('Applying user settings from server');
      // A simple merge, server settings take precedence
      userSettings.clearanceFormat = { ...userSettings.clearanceFormat, ...user.settings.clearanceFormat };
      userSettings.aviation = { ...userSettings.aviation, ...user.settings.aviation };
      updateUserSettingsUI();
    }

    document.getElementById('authLoading').style.display = 'none';
    document.getElementById('authLoggedOut').style.opacity = '0';
    document.getElementById('authLoggedOut').style.visibility = 'hidden';
    document.getElementById('authLoggedIn').style.display = 'block';
    setTimeout(() => {
        document.getElementById('authLoggedOut').style.display = 'none';
        document.getElementById('authLoggedIn').style.opacity = '1';
        document.getElementById('authLoggedIn').style.visibility = 'visible';
    }, 500);

    // Update user info
    document.getElementById('userName').textContent = user.username;

    const avatarImg = document.getElementById('userAvatar');
    if (user.avatar) {
      avatarImg.src = user.avatar;
      avatarImg.style.display = 'block';
    } else {
      avatarImg.style.display = 'none';
    }

    // Show admin button if user is admin
    const adminBtn = document.getElementById('adminBtn');
    if (user.is_admin) {
      adminBtn.style.display = 'inline-block';
    } else {
      adminBtn.style.display = 'none';
    }

    // If user is a controller, try to auto-select them in the dropdown
    if (user.is_controller) {
        const controllerSelect = document.getElementById('groundCallsignSelect');

        // This function will attempt to select the user's callsign
        const selectUserCallsign = () => {
            // Match by username, as CID is not in the controller data from the API
            const userOption = Array.from(controllerSelect.options).find(opt => opt.dataset.holder === user.username);

            if (userOption) {
                userOption.selected = true;
                onControllerSelect(); // Update UI
                console.log(`Auto-selected controller: ${userOption.value}`);
            }
        };

        // Listen for the custom event that signals controllers are loaded
        controllerSelect.addEventListener('controllersLoaded', selectUserCallsign, { once: true });

        // Also run it once in case the controllers were already loaded
        selectUserCallsign();
    }
  }

  function showLoggedOutState() {
    document.body.classList.add('logged-out');
    document.getElementById('authLoading').style.display = 'none';
    document.getElementById('authLoggedIn').style.opacity = '0';
    document.getElementById('authLoggedIn').style.visibility = 'hidden';
    document.getElementById('authLoggedOut').style.display = 'block';
    setTimeout(() => {
        document.getElementById('authLoggedIn').style.display = 'none';
        document.getElementById('authLoggedOut').style.opacity = '1';
        document.getElementById('authLoggedOut').style.visibility = 'visible';
    }, 500);
  }

  function loginWithDiscord() {
    window.location.href = '/auth/discord';
  }

  async function logout() {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': getSessionId()
        }
      });

      if (response.ok) {
        currentUser = null;
        showLoggedOutState();
        console.log('Logged out successfully');
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Still show logged out state on error
      currentUser = null;
      showLoggedOutState();
    }
  }

  // Check for auth success/error in URL params
  function checkAuthParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const authResult = urlParams.get('auth');
    const authError = urlParams.get('error');

    if (authResult === 'success') {
      console.log('Discord authentication successful');
      // Remove the param from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Check auth status to update UI
      setTimeout(checkAuthStatus, 500);
    } else if (authError) {
      console.error('Discord authentication error:', authError);
      showAuthError(authError);
      // Remove the param from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  function showAuthError(error) {
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

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(255, 0, 0, 0.1);
      border: 1px solid rgba(255, 0, 0, 0.3);
      border-radius: 8px;
      padding: 15px 20px;
      max-width: 300px;
      font-size: 14px;
      color: #ff6b6b;
      z-index: 1000;
      backdrop-filter: blur(10px);
    `;
    notification.innerHTML = `
      <strong>❌ Authentication Error</strong><br>
      <span style="color: var(--text-muted); font-size: 12px;">
        ${errorMessage}
      </span>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 8000);
  }

  // ATIS Management Functions
  let atisData = [];

  async function loadAtis() {
    try {
      const response = await fetch('/api/atis');
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const cache = await response.json();
      atisData = cache.data || [];
      populateAirportSelect();
    } catch (error) {
      console.error('Failed to load ATIS data:', error);
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

    // Set ATIS letter
    const atisLetterSelect = document.getElementById('atisInfo');
    if (atis.letter && [...atisLetterSelect.options].some(opt => opt.value === atis.letter)) {
      atisLetterSelect.value = atis.letter;
      document.getElementById('atis-auto').style.display = 'inline';
    }

    // Set departure runway
    const runwayRegex = /DEP RWY (\w+)/;
    const match = atis.content.match(runwayRegex);
    if (match && match[1]) {
      document.getElementById('departureRunway').value = match[1];
      document.getElementById('runway-auto').style.display = 'inline';
    }
  }

  // Controller Management Functions
  async function loadControllers() {
    const select = document.getElementById('groundCallsignSelect');
    const statusText = document.getElementById('statusText');
    const statusLight = document.querySelector('#controllerStatus .status-light');
    const refreshBtn = document.getElementById('refreshControllersBtn');

    // Set loading state
    select.innerHTML = '<option value="">Loading controllers...</option>';
    select.disabled = true;
    statusText.textContent = 'Loading...';
    statusLight.className = 'status-light';
    refreshBtn.disabled = true;

    try {
      const response = await fetch('/controllers');
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const cache = await response.json();
      const controllers = cache.data || [];

      select.innerHTML = ''; // Clear loading option

      const onlineControllers = controllers.filter(c => c.holder && !c.claimable && c.position && (c.position === 'GND' || c.position === 'TWR'));

      // Always clear and add the default/manual options
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

      // Update status based on results and freshness
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
      console.error('Failed to load controllers:', error);
      select.innerHTML = '<option value="manual">Error loading - Enter manually</option>';
      statusText.textContent = 'Error';
      statusLight.className = 'status-light';
    } finally {
      select.disabled = false;
      refreshBtn.disabled = false;
      onControllerSelect(); // Ensure manual input is shown if needed
      // Trigger a custom event to signal that controllers are loaded
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
          onAirportSelect(); // Trigger ATIS update
        }
      }
    }
  }


  // Leaderboard Functions
  async function loadLeaderboard() {
    const refreshBtn = document.querySelector('#leaderboardModal .refresh-btn');
    const originalText = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<span class="loading"></span> Refreshing...';
    refreshBtn.disabled = true;

    try {
      const response = await fetch('/api/leaderboard');
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const leaderboardData = await response.json();
      displayLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
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

  // Profile Modal Functions
  async function showProfile() {
    if (!currentUser) return;

    const modal = document.getElementById('profileModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);

    document.getElementById('profile-avatar').src = currentUser.avatar || 'https://via.placeholder.com/80';
    document.getElementById('profile-username').textContent = currentUser.username;

    try {
      const response = await fetch('/api/user/clearances', {
        headers: { 'X-Session-ID': getSessionId() }
      });
      if (!response.ok) throw new Error('Failed to fetch clearances');
      const clearances = await response.json();

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
      console.error('Error loading profile clearances:', error);
      document.getElementById('profile-clearances-list').innerHTML = '<p>Could not load clearances.</p>';
    }
  }

  function hideProfile() {
    const modal = document.getElementById('profileModal');
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
  }

  function showLeaderboard() {
    console.log('showLeaderboard called');
    const modal = document.getElementById('leaderboardModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
  }

  function hideLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
  }

  // Initial load of flight plans when the page loads
  document.addEventListener('DOMContentLoaded', () => {
    // Check auth params first
    checkAuthParams();

    // Check authentication status
    checkAuthStatus();

    // Load controllers
    loadControllers();

    // Load initial flight plans
    loadFlightPlans();

    // Load ATIS data
    loadAtis();

    // Load leaderboard
    loadLeaderboard();

    // Load user settings first
    loadUserSettings();

    // Then load admin settings
    loadAdminSettings().then(() => {
      updateUIFromSettings(); // Update UI with effective settings
    });

    // Toggle for advanced config
    const detailsElement = document.querySelector('details.section');
    if (detailsElement) {
        const toggle = detailsElement.querySelector('.collapse-toggle');
        detailsElement.addEventListener('toggle', () => {
            toggle.textContent = detailsElement.open ? '▼' : '▶';
        });
    }
  });
</script>

<div class="modal-overlay" id="leaderboardModal" style="display: none;">
  <div class="modal-content">
    <button class="modal-close" onclick="hideLeaderboard()">×</button>
    <div class="modal-header">
      <h2>Clearance Leaderboard</h2>
    </div>
    <div class="leaderboard" id="leaderboard">
      <div class="leaderboard-loading">Loading leaderboard...</div>
    </div>
    <div class="modal-footer">
      <button class="refresh-btn" onclick="loadLeaderboard()">Refresh</button>
    </div>
    <p class="leaderboard-login-prompt">Login to be on the leaderboard!</p>
  </div>
</div>

<div class="modal-overlay" id="profileModal" style="display: none;">
  <div class="modal-content">
    <button class="modal-close" onclick="hideProfile()">×</button>
    <div class="profile-header">
      <img id="profile-avatar" src="" alt="Avatar" class="profile-avatar">
      <h2 id="profile-username"></h2>
    </div>
    <div class="profile-stats">
      <div class="stat-item">
        <span class="stat-value" id="profile-clearance-count">0</span>
        <span class="stat-label">Clearances Generated</span>
      </div>
    </div>
    <div class="profile-clearances">
      <h3>Your Clearances</h3>
      <div id="profile-clearances-list" class="clearances-list">
        <p>Loading clearances...</p>
      </div>
    </div>
  </div>
</div>

<footer class="footer">
  <p>All rights reserved, Hasan Mahmood ©</p>
  <a href="/license" class="footer-link">License</a>
</footer>

</body>
</html>
```

---

## Old `admin.html`

```html
<!DOCTYPE html>
<html>
<head>
  <title>ATC24 Admin Panel</title>
  <link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    .admin-login {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--background-color);
      transition: opacity 0.5s ease, visibility 0.5s ease;
    }

    .admin-login.fade-out {
      opacity: 0;
      visibility: hidden;
      display: none;
    }

    .admin-container {
      display: block;
      opacity: 0;
      visibility: hidden;
      max-width: 1600px;
      margin: 0 auto;
      padding: 20px;
      transition: opacity 0.5s ease 0.5s, visibility 0.5s ease 0.5s;
    }

    .admin-container.authenticated {
      opacity: 1;
      visibility: visible;
    }

    .login-box {
      background: var(--surface-color);
      border-radius: 16px;
      padding: 40px;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow);
      width: 100%;
      max-width: 400px;
      text-align: center;
    }

    .admin-header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--border-color);
    }

    .admin-nav {
      display: flex;
      gap: 10px;
      margin-bottom: 30px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .nav-btn {
      padding: 12px 24px;
      background: var(--surface-hover);
      border: 2px solid var(--border-color);
      color: var(--text-color);
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .nav-btn:hover,
    .nav-btn.active {
      background: var(--primary-color);
      color: #000;
      border-color: var(--primary-color);
    }

    .admin-section {
      display: none;
    }

    .admin-section.active {
      display: block;
    }

    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .analytics-card {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 25px;
      text-align: center;
      transition: all 0.3s ease;
    }

    .analytics-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-hover);
      border-color: rgba(245, 222, 64, 0.3);
    }

    .analytics-value {
      font-size: 32px;
      font-weight: 700;
      color: var(--primary-color);
      margin-bottom: 8px;
    }

    .analytics-label {
      font-size: 14px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 30px;
    }

    .settings-group {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 25px;
    }

    .settings-group h3 {
      color: var(--primary-color);
      margin-bottom: 20px;
      font-size: 18px;
      font-weight: 600;
    }

    .setting-item {
      margin-bottom: 20px;
    }

    .setting-item:last-child {
      margin-bottom: 0;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 15px;
    }

    .checkbox-item input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: var(--primary-color);
    }

    .checkbox-item label {
      color: var(--text-color);
      font-size: 14px;
      cursor: pointer;
    }

    .danger-zone {
      background: rgba(255, 0, 0, 0.1);
      border: 1px solid rgba(255, 0, 0, 0.3);
      border-radius: 12px;
      padding: 25px;
      margin-top: 30px;
    }

    .danger-zone h3 {
      color: #ff6b6b;
      margin-bottom: 15px;
    }

    .danger-btn {
      background: #ff6b6b;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .danger-btn:hover {
      background: #ff5252;
      transform: translateY(-1px);
    }

    .logout-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--surface-hover);
      border: 2px solid var(--border-color);
      color: var(--text-color);
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .logout-btn:hover {
      background: #ff6b6b;
      border-color: #ff6b6b;
      color: white;
    }

    .chart-container {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 25px;
      margin-top: 20px;
      height: 400px;
      position: relative;
    }

    .chart-header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid var(--border-color);
    }

    .chart-header h3 {
      color: var(--primary-color);
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 5px 0;
    }

    .chart-subtitle {
      font-size: 12px;
      color: var(--text-muted);
      margin: 0;
    }

    .chart-wrapper {
      position: relative;
      height: 300px;
      width: 100%;
    }

    .chart-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 300px;
      color: var(--text-muted);
      font-style: italic;
    }

    .save-settings-btn {
      width: 100%;
      margin-top: 20px;
    }

    /* Override input styling to match main page beautiful design */
    .admin-container select,
    .admin-container textarea,
    .admin-container input[type="text"],
    .admin-container input[type="number"],
    .admin-container input[type="password"],
    .login-box select,
    .login-box textarea,
    .login-box input[type="text"],
    .login-box input[type="number"],
    .login-box input[type="password"] {
      width: 100%;
      padding: 15px;
      background: var(--surface-hover);
      border: 2px solid var(--border-color);
      border-radius: 10px;
      color: var(--text-color);
      font-size: 14px;
      font-family: inherit;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      z-index: 1;
    }

    .admin-container select {
      appearance: none;
      background-image: url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 5"><path fill="%23f5de40" d="M2 0L0 2h4zm0 5L0 3h4z"/></svg>');
      background-repeat: no-repeat;
      background-position: right 15px center;
      background-size: 12px;
      padding-right: 45px;
    }

    .admin-container select:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(245, 222, 64, 0.1);
      background: rgba(245, 222, 64, 0.02);
      transform: translateY(-1px);
      z-index: 200;
    }

    .admin-container select option {
      background: var(--surface-hover) !important;
      color: var(--text-color) !important;
      padding: 10px 15px;
      border: none;
    }

    .admin-container select option:hover,
    .admin-container select option:focus {
      background: var(--primary-color) !important;
      background-color: #f5de40 !important;
      color: #000 !important;
    }

    .admin-container select option:selected {
      background: var(--primary-color) !important;
      background-color: #f5de40 !important;
      color: #000 !important;
    }

    .admin-container textarea:focus,
    .admin-container input[type="text"]:focus,
    .admin-container input[type="number"]:focus,
    .admin-container input[type="password"]:focus,
    .login-box textarea:focus,
    .login-box input[type="text"]:focus,
    .login-box input[type="number"]:focus,
    .login-box input[type="password"]:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(245, 222, 64, 0.1);
      background: rgba(245, 222, 64, 0.02);
      transform: translateY(-1px);
    }

    .admin-container textarea {
      resize: vertical;
      font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
      line-height: 1.6;
      min-height: 120px;
    }

    .admin-container input[type="text"]::placeholder,
    .admin-container input[type="number"]::placeholder,
    .admin-container input[type="password"]::placeholder,
    .admin-container textarea::placeholder,
    .login-box input[type="text"]::placeholder,
    .login-box input[type="number"]::placeholder,
    .login-box input[type="password"]::placeholder,
    .login-box textarea::placeholder {
      color: var(--text-muted);
      font-style: italic;
    }

    /* Special styling for phraseology template textarea */
    #phraseologyTemplate {
      font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
      font-size: 13px;
      line-height: 1.5;
      min-height: 140px;
    }

    /* Notification Popup System */
    .notification-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .notification-overlay.show {
      opacity: 1;
      visibility: visible;
    }

    .notification-popup {
      background: var(--surface-color);
      border: 2px solid var(--border-color);
      border-radius: 16px;
      padding: 40px;
      max-width: 420px;
      width: 90%;
      text-align: center;
      box-shadow: var(--shadow);
      transform: scale(0.8) translateY(20px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .notification-overlay.show .notification-popup {
      transform: scale(1) translateY(0);
    }

    .notification-popup::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--primary-color), #ffd700);
    }

    .notification-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: bold;
      color: #fff;
      position: relative;
      overflow: hidden;
    }

    .notification-icon.success {
      background: linear-gradient(135deg, #4CAF50, #45a049);
      box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
    }

    .notification-icon.error {
      background: linear-gradient(135deg, #f44336, #d32f2f);
      box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
    }

    .notification-icon.warning {
      background: linear-gradient(135deg, #ff9800, #f57c00);
      box-shadow: 0 4px 15px rgba(255, 152, 0, 0.3);
    }

    .notification-icon.info {
      background: linear-gradient(135deg, var(--primary-color), #ffd700);
      box-shadow: 0 4px 15px rgba(245, 222, 64, 0.3);
    }

    .notification-title {
      color: var(--text-color);
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 12px;
      letter-spacing: -0.02em;
    }

    .notification-message {
      color: var(--text-muted);
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 30px;
    }

    .notification-close-btn {
      background: linear-gradient(135deg, var(--primary-color), #ffd700);
      border: none;
      border-radius: 10px;
      padding: 14px 32px;
      color: #000;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      position: relative;
      overflow: hidden;
    }

    .notification-close-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s ease;
    }

    .notification-close-btn:hover::before {
      left: 100%;
    }

    .notification-close-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(245, 222, 64, 0.4);
    }

    .notification-close-btn:active {
      transform: translateY(0);
    }

    /* Success specific styling */
    .notification-popup.success {
      border-color: rgba(76, 175, 80, 0.3);
    }

    .notification-popup.success::before {
      background: linear-gradient(90deg, #4CAF50, #45a049);
    }

    /* Error specific styling */
    .notification-popup.error {
      border-color: rgba(244, 67, 54, 0.3);
    }

    .notification-popup.error::before {
      background: linear-gradient(90deg, #f44336, #d32f2f);
    }

    /* Close button on top right */
    .notification-close-x {
      position: absolute;
      top: 15px;
      right: 15px;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 18px;
      cursor: pointer;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .notification-close-x:hover {
      background: var(--surface-hover);
      color: var(--text-color);
    }

    /* Tables Section Styles */
    .table-nav {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }

    .table-nav-btn {
      padding: 10px 16px;
      background: var(--surface-hover);
      border: 2px solid var(--border-color);
      color: var(--text-color);
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .table-nav-btn:hover,
    .table-nav-btn.active {
      background: var(--primary-color);
      color: #000;
      border-color: var(--primary-color);
    }

    .table-container {
      background: var(--surface-hover);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 0;
      overflow: hidden;
      max-height: 600px;
      overflow-y: auto;
    }

    .table-loading {
      padding: 40px;
      text-align: center;
      color: var(--text-muted);
      font-style: italic;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .data-table th {
      background: var(--background-color);
      color: var(--primary-color);
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .data-table td {
      padding: 10px 8px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-color);
      word-break: break-word;
      max-width: 300px;
    }

    .data-table tr:nth-child(even) {
      background: rgba(255, 255, 255, 0.02);
    }

    .data-table tr:hover {
      background: rgba(245, 222, 64, 0.05);
    }

    .table-cell-truncated {
      max-width: 250px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .table-cell-truncated:hover {
      color: var(--primary-color);
      text-overflow: clip;
      white-space: normal;
      max-width: none;
    }

    .table-pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 15px;
      margin-top: 15px;
    }

    .current-users-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 15px;
    }

    .user-card {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 15px;
      transition: all 0.3s ease;
    }

    .user-card:hover {
      border-color: rgba(245, 222, 64, 0.3);
      transform: translateY(-2px);
    }

    .user-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .user-session-id {
      font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
      color: var(--primary-color);
      font-weight: 600;
      font-size: 13px;
    }

    .user-source {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    .user-source.memory {
      background: rgba(255, 165, 0, 0.2);
      color: #ffa500;
    }

    .user-source.supabase {
      background: rgba(245, 222, 64, 0.2);
      color: var(--primary-color);
    }

    .user-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      font-size: 12px;
    }

    .user-stat {
      text-align: center;
    }

    .user-stat-value {
      color: var(--primary-color);
      font-weight: 600;
      font-size: 16px;
    }

    .user-stat-label {
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 10px;
    }

    .user-last-activity {
      margin-top: 10px;
      font-size: 11px;
      color: var(--text-muted);
      text-align: center;
    }

    @media (max-width: 768px) {
      .settings-grid {
        grid-template-columns: 1fr;
      }

      .analytics-grid {
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      }

      .admin-nav {
        flex-direction: column;
      }

      .table-nav {
        flex-direction: column;
      }

      .current-users-grid {
        grid-template-columns: 1fr;
      }

      .data-table {
        font-size: 11px;
      }

      .data-table th,
      .data-table td {
        padding: 8px 6px;
      }
    }

    /* Info Popup for Table Data */
    .info-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 11000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }

    .info-overlay.show {
      opacity: 1;
      visibility: visible;
    }

    .info-popup {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 30px;
      max-width: 80vw;
      max-height: 80vh;
      width: 600px;
      box-shadow: var(--shadow);
      transform: scale(0.9);
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .info-overlay.show .info-popup {
      transform: scale(1);
    }

    .info-title {
      color: var(--primary-color);
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid var(--border-color);
    }

    .info-content {
      color: var(--text-color);
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap; /* Preserve whitespace and newlines */
      word-break: break-word; /* Break long words */
      overflow-y: auto; /* Add scroll for long content */
      flex-grow: 1;
      background: var(--background-color);
      padding: 15px;
      border-radius: 8px;
    }

    .info-close-btn {
      background: var(--surface-hover);
      border: 2px solid var(--border-color);
      border-radius: 8px;
      padding: 12px 24px;
      color: var(--text-color);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-top: 20px;
      align-self: flex-end;
    }

    .info-close-btn:hover {
      background: var(--primary-color);
      color: #000;
      border-color: var(--primary-color);
    }

    .info-close-x {
      position: absolute;
      top: 10px;
      right: 10px;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 24px;
      cursor: pointer;
      width: 35px;
      height: 35px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .info-close-x:hover {
      background: var(--surface-hover);
      color: var(--text-color);
    }

    .info-icon {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 1.5px solid var(--text-muted);
      border-radius: 50%;
      color: var(--text-muted);
      font-size: 10px;
      line-height: 12px;
      text-align: center;
      font-style: normal;
      font-weight: bold;
      margin-left: 5px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .info-icon:hover {
      background: var(--primary-color);
      color: #000;
      border-color: var(--primary-color);
    }

    /* Card Layout for Tables */
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 15px;
    }
    .data-card {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 20px;
      font-size: 13px;
    }
    .data-card-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-color);
    }
    .data-card-row:last-child {
      border-bottom: none;
    }
    .data-card-key {
      color: var(--text-muted);
      font-weight: 600;
      text-transform: capitalize;
    }
    .data-card-value {
      color: var(--text-color);
      text-align: right;
      max-width: 60%;
    }
  </style>
</head>
<body>
  <!-- Login Screen -->
  <div class="admin-login" id="loginScreen">
    <div class="login-box">
      <h1 style="color: var(--primary-color); margin-bottom: 20px;">Admin Panel</h1>
      <div id="authLoading" style="color: var(--text-muted); margin-bottom: 30px; font-style: italic;">
        Checking authentication status...
      </div>
      <div id="authLoginRequired" style="display: none;">
        <p style="color: var(--text-muted); margin-bottom: 30px;">Admin access required. Please login with an authorized Discord account.</p>
        <button class="discord-login-btn" onclick="loginWithDiscord()" style="width: 100%; justify-content: center;">
          <svg width="18" height="18" viewBox="0 0 71 55" fill="none">
            <g clip-path="url(#clip0)">
              <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.308 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="#5865F2"/>
            </g>
          </svg>
          Login with Discord
        </button>
      </div>
      <div id="authNoAccess" style="display: none;">
        <p style="color: #ff6b6b; margin-bottom: 20px;">❌ Access Denied</p>
        <p style="color: var(--text-muted); margin-bottom: 30px;">Your Discord account does not have admin access. Contact the administrator to request access.</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button class="nav-btn" onclick="goToMainSite()" style="margin: 0;">← Back to Main Site</button>
          <button class="logout-btn" onclick="logout()" style="margin: 0;">Try Different Account</button>
        </div>
      </div>
      <div id="loginError" style="color: #ff6b6b; margin-top: 15px; display: none;"></div>
    </div>
  </div>

  <!-- Admin Panel -->
  <div class="admin-container" id="adminPanel">
    <button class="logout-btn" onclick="logout()">Logout</button>

    <div class="admin-header">
      <img src="logo.png" alt="Logo" class="header-logo" style="width: 150px; height: auto; margin-bottom: 0px;">
      <h1>ATC24 Control Panel</h1>
    </div>

    <div class="admin-nav">
      <button class="nav-btn active" onclick="showSection('analytics')">Analytics</button>
      <button class="nav-btn" onclick="showSection('tables')">Tables</button>
      <button class="nav-btn" onclick="showSection('settings')">Settings</button>
      <button class="nav-btn" onclick="showSection('users')">User Management</button>
      <button class="nav-btn" onclick="showSection('system')">System</button>
    </div>

    <!-- Analytics Section -->
    <div class="admin-section active" id="analytics">
      <div class="section">
        <h2 class="section-title">Real-Time Analytics</h2>

        <div class="analytics-grid">
          <div class="analytics-card">
            <div class="analytics-value" id="totalVisits">-</div>
            <div class="analytics-label">Total Visits</div>
          </div>

          <div class="analytics-card">
            <div class="analytics-value" id="todayVisits">-</div>
            <div class="analytics-label">Today's Visits</div>
          </div>

          <div class="analytics-card">
            <div class="analytics-value" id="last7Days">-</div>
            <div class="analytics-label">Last 7 Days</div>
          </div>

          <div class="analytics-card">
            <div class="analytics-value" id="clearancesGenerated">-</div>
            <div class="analytics-label">Clearances Generated</div>
          </div>

          <div class="analytics-card">
            <div class="analytics-value" id="flightPlansReceived">-</div>
            <div class="analytics-label">Flight Plans Received</div>
          </div>

          <div class="analytics-card">
            <div class="analytics-value" id="last30Days">-</div>
            <div class="analytics-label">Last 30 Days</div>
          </div>
        </div>

        <div class="chart-container">
          <div class="chart-header">
            <h3>Daily Visit Chart</h3>
            <p class="chart-subtitle">Website visits over the last 30 days</p>
          </div>
          <div class="chart-wrapper">
            <canvas id="dailyVisitChart"></canvas>
            <div id="chartLoading" class="chart-loading">Loading chart data...</div>
          </div>
        </div>
        <div class="chart-container">
          <div class="chart-header">
            <h3>Clearances per Day</h3>
            <p class="chart-subtitle">IFR clearances generated over the last 30 days</p>
          </div>
          <div class="chart-wrapper">
            <canvas id="clearancesChart"></canvas>
            <div id="clearancesChartLoading" class="chart-loading">Loading chart data...</div>
          </div>
        </div>
        <div class="chart-container">
          <div class="chart-header">
            <h3>HTTP Requests per Day</h3>
            <p class="chart-subtitle">Page visits over the last 30 days</p>
          </div>
          <div class="chart-wrapper">
            <canvas id="requestsChart"></canvas>
            <div id="requestsChartLoading" class="chart-loading">Loading chart data...</div>
          </div>
        </div>

        <div class="danger-zone">
          <h3>Analytics Management</h3>
          <p style="color: var(--text-muted); margin-bottom: 15px;">Reset all analytics data (cannot be undone)</p>
          <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            <button class="danger-btn" onclick="resetAnalytics()">Reset All Analytics</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tables Section -->
    <div class="admin-section" id="tables">
      <div class="section">
        <h2 class="section-title">Supabase Database Tables</h2>

        <!-- Current Users -->
        <div class="current-users-section" style="margin-bottom: 30px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="color: var(--primary-color); margin: 0;">Current Active Users</h3>
            <button class="nav-btn" onclick="loadCurrentUsers()" style="margin: 0; padding: 8px 16px;">Refresh Users</button>
          </div>

          <div class="analytics-grid" style="margin-bottom: 20px;">
            <div class="analytics-card">
              <div class="analytics-value" id="activeUsersCount">-</div>
              <div class="analytics-label">Active Users (5min)</div>
            </div>
            <div class="analytics-card">
              <div class="analytics-value" id="memorySessionsCount">-</div>
              <div class="analytics-label">Memory Sessions</div>
            </div>
            <div class="analytics-card">
              <div class="analytics-value" id="supabaseSessionsCount">-</div>
              <div class="analytics-label">Database Sessions</div>
            </div>
          </div>

          <div class="table-container" id="currentUsersTable">
            <div class="table-loading">Loading current users...</div>
          </div>
        </div>

        <!-- Table Navigation -->
        <div class="table-nav" style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
          <button class="table-nav-btn active" onclick="loadTable('page_visits')">Page Visits</button>
          <button class="table-nav-btn" onclick="loadTable('clearance_generations')">Clearances</button>
          <button class="table-nav-btn" onclick="loadTable('flight_plans_received')">Flight Plans</button>
          <button class="table-nav-btn" onclick="loadTable('user_sessions')">User Sessions</button>
          <button class="table-nav-btn" onclick="loadTable('discord_users')">Discord Users</button>
          <button class="table-nav-btn" onclick="loadTable('admin_activities')">Admin Activities</button>
        </div>

        <!-- Table Display Area -->
        <div class="table-info" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 id="currentTableTitle" style="color: var(--primary-color); margin: 0;">Page Visits</h3>
          <div style="display: flex; gap: 10px; align-items: center;">
            <span id="tableRecordCount" style="font-size: 12px; color: var(--text-muted);">Loading...</span>
            <button class="nav-btn" onclick="refreshCurrentTable()" style="margin: 0; padding: 6px 12px; font-size: 12px;">Refresh</button>
          </div>
        </div>

        <div class="table-container" id="tableDisplay">
          <div class="table-loading">Select a table to view data...</div>
        </div>

        <!-- Table Pagination -->
        <div class="table-pagination" id="tablePagination" style="display: none; margin-top: 15px; text-align: center;">
          <button class="nav-btn" onclick="previousPage()" id="prevBtn" style="margin: 0 5px; padding: 8px 16px;" disabled>Previous</button>
          <span id="pageInfo" style="margin: 0 15px; color: var(--text-muted);">Page 1</span>
          <button class="nav-btn" onclick="nextPage()" id="nextBtn" style="margin: 0 5px; padding: 8px 16px;" disabled>Next</button>
        </div>
      </div>
    </div>

    <!-- Settings Section -->
    <div class="admin-section" id="settings">
      <div class="section">
        <h2 class="section-title">System Configuration</h2>

        <div class="settings-grid">
          <div class="settings-group">
            <h3>Clearance Format & Phraseology</h3>

            <div class="setting-item">
              <label class="config-label">Global Phraseology Format</label>
              <textarea id="phraseologyTemplate" placeholder="Enter custom clearance format template...">{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}.</textarea>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">
                Available variables: {CALLSIGN}, {ATC_STATION}, {ATIS}, {DESTINATION}, {ROUTE}, {RUNWAY}, {INITIAL_ALT}, {FLIGHT_LEVEL}, {SQUAWK}
              </div>
            </div>

            <div class="checkbox-item">
              <input type="checkbox" id="includeAtis">
              <label for="includeAtis">Include ATIS Information</label>
            </div>

            <div class="checkbox-item">
              <input type="checkbox" id="includeSquawk">
              <label for="includeSquawk">Include Squawk Code</label>
            </div>

            <div class="checkbox-item">
              <input type="checkbox" id="includeFlightLevel">
              <label for="includeFlightLevel">Include Expected Flight Level</label>
            </div>

            <div class="checkbox-item">
              <input type="checkbox" id="includeStartupApproval">
              <label for="includeStartupApproval">Include Startup Approval</label>
            </div>

            <div class="checkbox-item">
              <input type="checkbox" id="includeInitialClimb">
              <label for="includeInitialClimb">Include Initial Climb Instruction</label>
            </div>
          </div>

          <div class="settings-group">
            <h3>Aviation Standards</h3>

            <div class="setting-item">
              <label class="config-label">Default Altitudes (comma-separated)</label>
              <input type="text" id="defaultAltitudes" placeholder="1000,2000,3000,4000,5000">
            </div>

            <div class="setting-item">
              <label class="config-label">Squawk Code Range (Min)</label>
              <input type="number" id="squawkMin" placeholder="1000" min="1000" max="7777">
            </div>

            <div class="setting-item">
              <label class="config-label">Squawk Code Range (Max)</label>
              <input type="number" id="squawkMax" placeholder="7777" min="1000" max="7777">
            </div>

            <div class="checkbox-item">
              <input type="checkbox" id="enableRunwayValidation">
              <label for="enableRunwayValidation">Enable Runway Format Validation</label>
            </div>

            <div class="checkbox-item">
              <input type="checkbox" id="enableSIDValidation">
              <label for="enableSIDValidation">Enable SID/STAR Validation</label>
            </div>
          </div>

          <div class="settings-group">
            <h3>System Performance</h3>

            <div class="setting-item">
              <label class="config-label">Max Flight Plans Stored</label>
              <input type="number" id="maxFlightPlansStored" placeholder="20" min="5" max="100">
            </div>

            <div class="setting-item">
              <label class="config-label">Auto Refresh Interval (ms)</label>
              <input type="number" id="autoRefreshInterval" placeholder="30000" min="5000" max="300000" step="1000">
            </div>

            <div class="setting-item">
              <label class="config-label">Controller Data Poll Interval (ms)</label>
              <input type="number" id="controllerPollInterval" placeholder="300000" min="60000" max="900000" step="10000">
            </div>

            <div class="checkbox-item">
              <input type="checkbox" id="enableDetailedLogging">
              <label for="enableDetailedLogging">Enable Detailed Console Logging</label>
            </div>

            <div class="setting-item">
              <label class="config-label">ATIS Data Poll Interval (ms)</label>
              <input type="number" id="atisPollInterval" placeholder="300000" min="60000" max="900000" step="10000">
            </div>

            <div class="checkbox-item">
              <input type="checkbox" id="enableFlightPlanFiltering">
              <label for="enableFlightPlanFiltering">Enable Flight Plan Filtering</label>
            </div>
          </div>
        </div>

        <button class="generate-btn save-settings-btn" onclick="saveSettings()">Save All Settings</button>
      </div>
    </div>

    <!-- System Section -->
    <div class="admin-section" id="system">
      <div class="section">
        <h2 class="section-title">System Information</h2>

        <div class="settings-grid">
          <div class="settings-group">
            <h3>WebSocket Status</h3>
            <div id="wsStatus" style="padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px; background: var(--surface-hover); border: 1px solid var(--border-color);">
              <div style="color: var(--text-muted); font-weight: 600;">Initializing system status...</div>
            </div>
          </div>

          <div class="settings-group">
            <h3>System Health</h3>
            <div style="padding: 20px;">
              <div style="margin-bottom: 15px;">
                <strong>Environment:</strong> <span id="environmentInfo">-</span>
              </div>
              <div style="margin-bottom: 15px;">
                <strong>Flight Plans in Memory:</strong> <span id="systemFlightPlans">-</span>
              </div>
              <div style="margin-bottom: 15px;">
                <strong>Real-time Support:</strong> <span id="realtimeSupport">-</span>
              </div>
              <div style="margin-bottom: 15px;">
                <strong>Last Analytics Reset:</strong> <span id="lastReset">-</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Debug Logs Section -->
        <div class="settings-group" style="margin-top: 30px;">
          <h3>Runtime Debug Logs</h3>
          <div style="margin-bottom: 15px;">
            <div style="display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
              <select id="logLevel" style="padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--surface-hover); color: var(--text-color);">
                <option value="all">All Levels</option>
                <option value="error">Errors Only</option>
                <option value="warn">Warnings Only</option>
                <option value="info">Info Only</option>
              </select>
              <button class="nav-btn" style="padding: 8px 16px; margin: 0;" onclick="loadDebugLogs()">Refresh Logs</button>
              <button class="nav-btn" style="padding: 8px 16px; margin: 0;" onclick="clearLogDisplay()">Clear Display</button>
            </div>
          </div>
          <div id="debugLogs" style="
            background: #1a1a1a;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 15px;
            height: 400px;
            overflow-y: auto;
            font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
            font-size: 12px;
            line-height: 1.4;
            color: #e0e0e0;
          ">
            <div style="color: var(--text-muted);">Loading debug logs...</div>
          </div>
        </div>

      </div>
    </div>

    <!-- User Management Section -->
    <div class="admin-section" id="users">
      <div class="section">
        <h2 class="section-title">User Management</h2>

        <!-- Current Admin Info -->
        <div class="settings-group" style="margin-bottom: 30px;">
          <h3>Current Admin User</h3>
          <div id="currentAdminInfo" style="padding: 20px; background: var(--surface-hover); border: 1px solid var(--border-color); border-radius: 8px;">
            <div style="color: var(--text-muted);">Loading current user info...</div>
          </div>
        </div>

        <!-- Admin Users List -->
        <div class="settings-group" style="margin-bottom: 30px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3>Admin Users</h3>
            <button class="nav-btn" onclick="loadAdminUsers()" style="margin: 0; padding: 8px 16px;">Refresh Users</button>
          </div>

          <div id="adminUsersList" style="background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 8px; min-height: 200px;">
            <div style="padding: 20px; text-align: center; color: var(--text-muted);">Loading admin users...</div>
          </div>
        </div>

        <!-- Add New Admin -->
        <div class="settings-group">
          <h3>Add New Admin User</h3>
          <div style="padding: 20px; background: var(--surface-hover); border: 1px solid var(--border-color); border-radius: 8px;">
            <div style="margin-bottom: 20px;">
              <label class="config-label" style="display: block; margin-bottom: 8px;">Discord Username</label>
              <input type="text" id="newAdminUsername" placeholder="e.g., h.a.s2 or user#1234" style="width: 100%; margin-bottom: 10px;">
              <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 15px;">
                Enter the Discord username exactly as it appears (with or without discriminator)
              </div>
            </div>

            <div style="margin-bottom: 20px;">
              <label class="config-label" style="display: block; margin-bottom: 8px;">Admin Roles</label>
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <label style="display: flex; align-items: center; gap: 8px;">
                  <input type="checkbox" id="roleAdmin" checked>
                  <span>Admin</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px;">
                  <input type="checkbox" id="roleSuperAdmin">
                  <span>Super Admin</span>
                </label>
              </div>
            </div>

            <div style="display: flex; gap: 10px;">
              <button class="generate-btn" onclick="addAdminUser()" style="flex: 1; margin: 0;">Add Admin User</button>
              <button class="nav-btn" onclick="clearAddUserForm()" style="margin: 0; padding: 12px 20px;">Clear</button>
            </div>
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="danger-zone" style="margin-top: 30px;">
          <h3>Danger Zone</h3>
          <p style="color: var(--text-muted); margin-bottom: 15px;">Removing admin users cannot be undone. Use with caution.</p>
          <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            <button class="danger-btn" onclick="showRemoveAdminDialog()">Remove Admin User</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Notification Popup -->
  <div class="notification-overlay" id="notificationOverlay">
    <div class="notification-popup" id="notificationPopup">
      <button class="notification-close-x" onclick="hideNotification()">×</button>
      <div class="notification-icon" id="notificationIcon">✓</div>
      <div class="notification-title" id="notificationTitle">Operation Successful</div>
      <div class="notification-message" id="notificationMessage">Your request has been completed successfully.</div>
      <button class="notification-close-btn" onclick="hideNotification()">Close</button>
    </div>
  </div>

  <!-- Info Popup for Table Data -->
  <div class="info-overlay" id="infoOverlay">
    <div class="info-popup" id="infoPopup">
      <button class="info-close-x" onclick="hideInfoPopup()">×</button>
      <h3 class="info-title" id="infoTitle">Full Cell Content</h3>
      <div class="info-content" id="infoContent">
        <!-- Full content will be injected here -->
      </div>
      <button class="info-close-btn" onclick="hideInfoPopup()">Close</button>
    </div>
  </div>

  <script>
    // Info Popup for Table Data
    function showInfoPopup(content) {
      const overlay = document.getElementById('infoOverlay');
      const contentEl = document.getElementById('infoContent');

      contentEl.textContent = content; // Use textContent for security
      overlay.classList.add('show');
    }

    function hideInfoPopup() {
      const overlay = document.getElementById('infoOverlay');
      overlay.classList.remove('show');
    }

    let currentUser = null;
    let sessionId = null;
    let analytics = {};
    let settings = {};
    let dailyVisitChart = null;
    // let currentPassword = localStorage.getItem('admin_password'); // DEPRECATED for security

    // Notification System
    function showNotification(type, title, message) {
      const overlay = document.getElementById('notificationOverlay');
      const popup = document.getElementById('notificationPopup');
      const icon = document.getElementById('notificationIcon');
      const titleEl = document.getElementById('notificationTitle');
      const messageEl = document.getElementById('notificationMessage');

      // Set content
      titleEl.textContent = title;
      messageEl.textContent = message;

      // Set icon and styling based on type
      popup.className = 'notification-popup ' + type;
      icon.className = 'notification-icon ' + type;

      switch(type) {
        case 'success':
          icon.textContent = '✓';
          break;
        case 'error':
          icon.textContent = '✕';
          break;
        case 'warning':
          icon.textContent = '⚠';
          break;
        case 'info':
          icon.textContent = 'i';
          break;
      }

      // Show notification
      overlay.classList.add('show');

      // Auto-hide after 4 seconds for success notifications
      if (type === 'success') {
        setTimeout(() => {
          hideNotification();
        }, 4000);
      }
    }

    function hideNotification() {
      const overlay = document.getElementById('notificationOverlay');
      overlay.classList.remove('show');
    }

    // Close notification when clicking overlay
    document.getElementById('notificationOverlay').addEventListener('click', function(e) {
      if (e.target === this) {
        hideNotification();
      }
    });

    // Add event listener to close info popup on overlay click
    document.getElementById('infoOverlay').addEventListener('click', function(e) {
      if (e.target === this) {
        hideInfoPopup();
      }
    });

    // Authentication Functions
    async function checkAuthStatus() {
      const currentSessionId = getSessionId();
      if (!currentSessionId) {
        console.log('No session ID found. Showing login required.');
        showLoginRequired();
        return;
      }

      try {
        document.getElementById('authLoading').style.display = 'block';
        document.getElementById('authLoginRequired').style.display = 'none';
        document.getElementById('authNoAccess').style.display = 'none';

        const response = await fetch('/api/auth/user', {
          headers: {
            'X-Session-ID': currentSessionId
          }
        });

        if (response.ok) {
          const authData = await response.json();
          if (authData.authenticated && authData.user.is_admin) {
            currentUser = authData.user;
            sessionId = currentSessionId;
            showAdminPanel();
          } else if (authData.authenticated && !authData.user.is_admin) {
            showNoAccess();
          } else {
            // Session ID was invalid or expired
            localStorage.removeItem('atc24_session_id');
            showLoginRequired();
          }
        } else {
          // Handle server errors (e.g., 500)
          showAuthError('Server error during authentication check.');
          showLoginRequired();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        showAuthError('Network error: Failed to check authentication status.');
        showLoginRequired(); // Show login as a fallback
      }
    }

    function showAdminPanel() {
      document.getElementById('loginScreen').classList.add('fade-out');
      document.getElementById('adminPanel').classList.add('authenticated');
      showNotification('success', 'Access Granted', `Welcome ${currentUser.username}! Admin access confirmed.`);
      loadAdminData();
    }

    function showLoginRequired() {
      document.getElementById('authLoading').style.display = 'none';
      document.getElementById('authLoginRequired').style.display = 'block';
      document.getElementById('authNoAccess').style.display = 'none';
    }

    function showNoAccess() {
      document.getElementById('authLoading').style.display = 'none';
      document.getElementById('authLoginRequired').style.display = 'none';
      document.getElementById('authNoAccess').style.display = 'block';
    }

    function loginWithDiscord() {
      window.location.href = '/auth/discord';
    }

    async function logout() {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId
          }
        });
      } catch (error) {
        console.error('Logout failed:', error);
      }

      currentUser = null;
      sessionId = null;
      localStorage.removeItem('atc24_session_id'); // Clear local session ID on logout
      localStorage.removeItem('admin_password'); // Clear stored password on logout
      document.getElementById('loginScreen').style.display = 'flex';
      document.getElementById('adminPanel').classList.remove('authenticated');
      showLoginRequired();
    }

    function goToMainSite() {
      window.location.href = '/';
    }

    function getSessionId() {
      // Try to get session ID from URL parameters first
      const urlParams = new URLSearchParams(window.location.search);
      const urlSessionId = urlParams.get('session');
      if (urlSessionId) {
        localStorage.setItem('atc24_session_id', urlSessionId);
        // Clean up URL
        const newUrl = window.location.pathname + (window.location.search.replace(/&?session=[^&]*/, '').replace(/^\?$/, ''));
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

      // Fallback to localStorage, return null if not found
      return localStorage.getItem('atc24_session_id');
    }

    function showAuthError(message) {
      const errorDiv = document.getElementById('loginError');
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 5000);
    }

    // Check for auth success/error in URL params
    function checkAuthParams() {
      const urlParams = new URLSearchParams(window.location.search);
      const authResult = urlParams.get('auth');
      const authError = urlParams.get('error');

      if (authResult === 'success') {
        console.log('Discord authentication successful');
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(checkAuthStatus, 500);
      } else if (authError) {
        console.error('Discord authentication error:', authError);
        showAuthError(`Authentication failed: ${authError}`);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    // Navigation
    function showSection(sectionName) {
      // Hide all sections
      document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
      });

      // Remove active class from all nav buttons
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
      });

      // Show selected section
      document.getElementById(sectionName).classList.add('active');

      // Add active class to clicked button
      event.target.classList.add('active');

      // Load section-specific data
      if (sectionName === 'analytics') {
        loadAnalytics();
      } else if (sectionName === 'tables') {
        loadCurrentUsers();
        loadTable('page_visits');
      } else if (sectionName === 'users') {
        loadCurrentAdminInfo();
        loadAdminUsers();
      } else if (sectionName === 'system') {
        loadSystemInfo();
        loadDebugLogs();
      }
    }

    // Data loading
    async function loadAdminData() {
      await Promise.all([
        loadAnalytics(),
        loadSettings(),
        loadSystemInfo()
      ]);
      // Load debug logs after other data is loaded
      loadDebugLogs();
    }

    async function loadAnalytics() {
      try {
        const response = await fetch('/api/admin/analytics', {
          headers: {
            'X-Session-ID': sessionId,
            'Authorization': `Bearer ${sessionId}`
          }
        });
        analytics = await response.json();

        const today = new Date().toISOString().split('T')[0];

        document.getElementById('totalVisits').textContent = analytics.totalVisits || 0;
        document.getElementById('todayVisits').textContent = analytics.dailyVisits?.[today] || 0;
        document.getElementById('last7Days').textContent = analytics.last7Days || 0;
        document.getElementById('last30Days').textContent = analytics.last30Days || 0;
        document.getElementById('clearancesGenerated').textContent = analytics.clearancesGenerated || 0;
        document.getElementById('flightPlansReceived').textContent = analytics.flightPlansReceived || 0;

        // Load chart data
        loadChartData();
      } catch (error) {
        console.error('Failed to load analytics:', error);
        showNotification('warning', 'Data Load Warning', 'Some analytics data may not be current. Refreshing automatically...');
      }
    }

    let charts = {};
    async function loadChartData() {
        try {
            const response = await fetch('/api/admin/charts', {
                headers: {
                    'X-Session-ID': sessionId,
                    'Authorization': `Bearer ${sessionId}`
                }
            });
            const chartData = await response.json();

            // Hide loading indicators
            document.getElementById('chartLoading').style.display = 'none';
            document.getElementById('clearancesChartLoading').style.display = 'none';
            document.getElementById('requestsChartLoading').style.display = 'none';

            // Render charts
            renderLineChart('dailyVisitChart', chartData.daily_visits, 'Daily Visits', '#f5de40');
            renderLineChart('clearancesChart', chartData.daily_clearances, 'Clearances per Day', '#3498db');
            renderLineChart('requestsChart', chartData.daily_visits, 'HTTP Requests per Day', '#e74c3c');

        } catch (error) {
            console.error('Failed to load chart data:', error);
        }
    }

    function renderLineChart(canvasId, data, label, color) {
        const chartCanvas = document.getElementById(canvasId);
        if (!chartCanvas || !data) return;

        const last30Days = [];
        const counts = [];
        const dataMap = new Map(data.map(item => [item.date.split('T')[0], item.count]));

        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            last30Days.push(dayLabel);
            counts.push(dataMap.get(dateStr) || 0);
        }

        if (charts[canvasId]) {
            charts[canvasId].destroy();
        }

        const ctx = chartCanvas.getContext('2d');
        charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last30Days,
                datasets: [{
                    label: label,
                    data: counts,
                    borderColor: color,
                    backgroundColor: `${color}1a`, // Hex with alpha
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: color,
                    pointBorderColor: '#000',
                    pointBorderWidth: 1,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: color,
                        bodyColor: '#ffffff',
                        borderColor: color,
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#888', font: { size: 11 }, maxTicksLimit: 8 }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#888', font: { size: 11 }, precision: 0 }
                    }
                },
                interaction: { intersect: false, mode: 'index' }
            }
        });
    }

    async function loadSettings() {
      try {
        const response = await fetch(`/api/admin/settings`, {
          headers: {
            'X-Session-ID': sessionId,
            'Authorization': `Bearer ${sessionId}`
          }
        });
        settings = await response.json();

        // Clearance format settings
        document.getElementById('phraseologyTemplate').value = settings.clearanceFormat?.customTemplate || '{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}.';
        document.getElementById('includeAtis').checked = settings.clearanceFormat?.includeAtis !== false;
        document.getElementById('includeSquawk').checked = settings.clearanceFormat?.includeSquawk !== false;
        document.getElementById('includeFlightLevel').checked = settings.clearanceFormat?.includeFlightLevel !== false;
        document.getElementById('includeStartupApproval').checked = settings.clearanceFormat?.includeStartupApproval !== false;
        document.getElementById('includeInitialClimb').checked = settings.clearanceFormat?.includeInitialClimb !== false;

        // Aviation settings
        document.getElementById('defaultAltitudes').value = settings.aviation?.defaultAltitudes?.join(',') || '1000,2000,3000,4000,5000';
        document.getElementById('squawkMin').value = settings.aviation?.squawkRanges?.min || 1000;
        document.getElementById('squawkMax').value = settings.aviation?.squawkRanges?.max || 7777;
        document.getElementById('enableRunwayValidation').checked = settings.aviation?.enableRunwayValidation || false;
        document.getElementById('enableSIDValidation').checked = settings.aviation?.enableSIDValidation || false;

        // System settings
        document.getElementById('maxFlightPlansStored').value = settings.system?.maxFlightPlansStored || 20;
        document.getElementById('autoRefreshInterval').value = settings.system?.autoRefreshInterval || 30000;
        document.getElementById('controllerPollInterval').value = settings.system?.controllerPollInterval || 300000;
        document.getElementById('enableDetailedLogging').checked = settings.system?.enableDetailedLogging || false;
        document.getElementById('enableFlightPlanFiltering').checked = settings.system?.enableFlightPlanFiltering || false;
        document.getElementById('atisPollInterval').value = settings.system?.atisPollInterval || 300000;
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }

    async function loadSystemInfo() {
      const wsStatus = document.getElementById('wsStatus');

      // Set loading state without ugly spinner
      wsStatus.innerHTML = '<div style="color: var(--text-muted); font-weight: 600;">Loading status...</div>';
      wsStatus.style.background = 'var(--surface-hover)';
      wsStatus.style.border = '1px solid var(--border-color)';

      try {
        const response = await fetch('/health');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const health = await response.json();
        console.log('System health data:', health);

        // WebSocket status with environment awareness
        if (health.environment === 'serverless') {
          wsStatus.innerHTML = '<div style="width: 12px; height: 12px; background: #ffa500; border-radius: 50%; margin: 0 auto 10px;"></div><div style="color: #ffa500; font-weight: 600;">WebSocket Disabled</div><div style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">Serverless deployment - using polling fallback</div>';
          wsStatus.style.background = 'rgba(255, 165, 0, 0.1)';
          wsStatus.style.border = '1px solid rgba(255, 165, 0, 0.3)';
        } else if (health.wsStatus === 'connected') {
          wsStatus.innerHTML = '<div style="width: 12px; height: 12px; background: var(--primary-color); border-radius: 50%; margin: 0 auto 10px;"></div><div style="color: var(--primary-color); font-weight: 600;">WebSocket Connected</div><div style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">Real-time data active</div>';
          wsStatus.style.background = 'rgba(245, 222, 64, 0.1)';
          wsStatus.style.border = '1px solid rgba(245, 222, 64, 0.3)';
        } else if (health.wsStatus === 'disconnected' || health.wsStatus === 'not_initialized') {
          wsStatus.innerHTML = '<div style="width: 12px; height: 12px; background: #ff6b6b; border-radius: 50%; margin: 0 auto 10px;"></div><div style="color: #ff6b6b; font-weight: 600;">WebSocket Disconnected</div><div style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">No real-time connection</div>';
          wsStatus.style.background = 'rgba(255, 107, 107, 0.1)';
          wsStatus.style.border = '1px solid rgba(255, 107, 107, 0.3)';
        } else {
          // Fallback for unknown status
          wsStatus.innerHTML = '<div style="width: 12px; height: 12px; background: var(--text-muted); border-radius: 50%; margin: 0 auto 10px;"></div><div style="color: var(--text-muted); font-weight: 600;">Status Unknown</div><div style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">Unable to determine connection status</div>';
          wsStatus.style.background = 'var(--surface-hover)';
          wsStatus.style.border = '1px solid var(--border-color)';
        }

        // System info
        document.getElementById('systemFlightPlans').textContent = health.flightPlansCount || 0;

        // Update environment info
        const environmentInfo = document.getElementById('environmentInfo');
        if (environmentInfo) {
          environmentInfo.textContent = health.environment === 'serverless' ? 'Serverless (Vercel)' : 'Traditional Server';
        }

        // Update realtime support info
        const realtimeSupport = document.getElementById('realtimeSupport');
        if (realtimeSupport) {
          if (health.supportsRealtime) {
            realtimeSupport.innerHTML = '<span style="color: var(--primary-color);">✓ WebSocket Available</span>';
          } else {
            realtimeSupport.innerHTML = '<span style="color: #ffa500;">⚠ Polling Fallback Only</span>';
          }
        }

        if (analytics.lastReset) {
          document.getElementById('lastReset').textContent = new Date(analytics.lastReset).toLocaleString();
        }
      } catch (error) {
        console.error('Failed to load system info:', error);
        // Show clear error state without ugly icons
        wsStatus.innerHTML = '<div style="color: #ff6b6b; font-weight: 600;">Connection Failed</div><div style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">Unable to fetch system status</div>';
        wsStatus.style.background = 'rgba(255, 107, 107, 0.1)';
        wsStatus.style.border = '1px solid rgba(255, 107, 107, 0.3)';
      }
    }

    // Settings management
    async function saveSettings() {
      try {
        const newSettings = {
          clearanceFormat: {
            customTemplate: document.getElementById('phraseologyTemplate').value,
            includeAtis: document.getElementById('includeAtis').checked,
            includeSquawk: document.getElementById('includeSquawk').checked,
            includeFlightLevel: document.getElementById('includeFlightLevel').checked,
            includeStartupApproval: document.getElementById('includeStartupApproval').checked,
            includeInitialClimb: document.getElementById('includeInitialClimb').checked
          },
          aviation: {
            defaultAltitudes: document.getElementById('defaultAltitudes').value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)),
            squawkRanges: {
              min: parseInt(document.getElementById('squawkMin').value) || 1000,
              max: parseInt(document.getElementById('squawkMax').value) || 7777,
              exclude: [7500, 7600, 7700]
            },
            enableRunwayValidation: document.getElementById('enableRunwayValidation').checked,
            enableSIDValidation: document.getElementById('enableSIDValidation').checked
          },
          system: {
            maxFlightPlansStored: parseInt(document.getElementById('maxFlightPlansStored').value) || 20,
            autoRefreshInterval: parseInt(document.getElementById('autoRefreshInterval').value) || 30000,
            controllerPollInterval: parseInt(document.getElementById('controllerPollInterval').value) || 300000,
            enableDetailedLogging: document.getElementById('enableDetailedLogging').checked,
            enableFlightPlanFiltering: document.getElementById('enableFlightPlanFiltering').checked,
            atisPollInterval: parseInt(document.getElementById('atisPollInterval').value) || 300000
          }
        };

        const response = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId,
            'Authorization': `Bearer ${sessionId}`
          },
          body: JSON.stringify({ settings: newSettings })
        });

        const result = await response.json();
        if (result.success) {
          showNotification('success', 'Settings Saved', 'All configuration changes have been applied successfully');
          settings = result.settings;
        } else {
          showNotification('error', 'Save Failed', 'Unable to save settings. Please try again.');
        }
      } catch (error) {
        console.error('Failed to save settings:', error);
        showNotification('error', 'Connection Error', 'Failed to communicate with server. Check your connection.');
      }
    }

    // Test analytics function removed for security

    async function resetAnalytics() {
      if (!confirm('This will permanently delete all analytics data. Are you sure?')) {
        return;
      }

      try {
        const response = await fetch('/api/admin/reset-analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId,
            'Authorization': `Bearer ${sessionId}`
          }
        });

        const result = await response.json();
        if (result.success) {
          showNotification('success', 'Analytics Reset', 'All analytics data has been cleared successfully');
          loadAnalytics();
        } else {
          showNotification('error', 'Reset Failed', 'Unable to reset analytics. Please try again.');
        }
      } catch (error) {
        console.error('Failed to reset analytics:', error);
        showNotification('error', 'Connection Error', 'Failed to communicate with server. Check your connection.');
      }
    }

    // Debug logs functionality
    async function loadDebugLogs() {
      // The backend now uses session authentication, so no password is needed.
      const levelSelect = document.getElementById('logLevel');
      const debugLogsContainer = document.getElementById('debugLogs');

      if (!levelSelect || !debugLogsContainer) {
        console.error('Debug logs UI elements not found');
        return;
      }

      const level = levelSelect.value || 'all';

      try {
        debugLogsContainer.innerHTML = '<div style="color: var(--text-muted);">Loading debug logs...</div>';

        const url = `/api/admin/logs?level=${encodeURIComponent(level)}&limit=50`;
        const response = await fetch(url, {
          headers: {
            'X-Session-ID': sessionId,
            'Authorization': `Bearer ${sessionId}`
          }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Invalid response from server' }));
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorData.error || 'No error details'}`);
        }

        const data = await response.json();

        // Check for server-side error
        if (data.error) {
          throw new Error(`Server error: ${data.error}`);
        }


        // Display logs
        if (!data.logs || data.logs.length === 0) {
          debugLogsContainer.innerHTML = '<div style="color: var(--text-muted);">No logs found for selected filter.</div>';
          return;
        }

        const logsHtml = data.logs.map(log => {
          if (!log || !log.timestamp || !log.level || !log.message) {
            return '<div style="color: #ff6b6b;">Invalid log entry</div>';
          }

          const time = new Date(log.timestamp).toLocaleTimeString();
          const date = new Date(log.timestamp).toLocaleDateString();
          let levelColor = '#e0e0e0';

          switch(log.level) {
            case 'error': levelColor = '#ff6b6b'; break;
            case 'warn': levelColor = '#ffa500'; break;
            case 'info': levelColor = '#4CAF50'; break;
            default: levelColor = '#87CEEB'; break;
          }

          return `
            <div style="margin-bottom: 8px; padding: 6px 0; border-bottom: 1px solid #333;">
              <span style="color: #888; font-size: 11px;">[${date} ${time}]</span>
              <span style="color: ${levelColor}; font-weight: bold; margin-left: 8px;">${log.level.toUpperCase()}</span>
              <span style="color: #bbb; margin-left: 8px; font-size: 10px;">(${log.id || 'no-id'})</span>
              <div style="margin-top: 2px; color: #e0e0e0;">${escapeHtml(log.message)}</div>
              ${log.data ? `<div style="margin-top: 2px; color: #999; font-size: 11px; font-style: italic;">${escapeHtml(log.data)}</div>` : ''}
            </div>
          `;
        }).join('');

        debugLogsContainer.innerHTML = logsHtml;

        // Auto-scroll to top for newest logs
        debugLogsContainer.scrollTop = 0;

      } catch (error) {
        console.error('Failed to load debug logs:', error);
        debugLogsContainer.innerHTML = `
          <div style="color: #ff6b6b; margin-bottom: 10px;">Failed to load debug logs</div>
          <div style="color: #ffa500; font-size: 12px; margin-bottom: 5px;">Error Details</div>
          <div style="color: #999; font-size: 11px; margin-bottom: 10px;">${escapeHtml(error.message)}</div>
          <div style="color: #666; font-size: 10px;">
            <div>• Check console (F12) for technical details</div>
            <div>• Verify admin session is active</div>
          </div>
        `;
      }
    }

    function clearLogDisplay() {
      document.getElementById('debugLogs').innerHTML = '<div style="color: var(--text-muted);">Log display cleared. Click "Refresh Logs" to reload.</div>';
    }

    async function testDebugLogsEndpoint() {
      const debugLogsContainer = document.getElementById('debugLogs');

      if (!debugLogsContainer) {
        console.error('Debug logs container not found');
        return;
      }

      debugLogsContainer.innerHTML = '<div style="color: var(--primary-color);">Testing debug logs endpoint...</div>';

      try {
        // Test basic connectivity first
        console.log('Testing basic endpoint connectivity...');

        const testUrl = `/api/admin/logs?level=all&limit=5`;
        console.log('Test URL:', testUrl);

        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId,
            'Authorization': `Bearer ${sessionId}`
          }
        });

        console.log('Test response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        const responseText = await response.text();
        console.log('Raw response text:', responseText);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}\nResponse: ${responseText}`);
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(`JSON Parse Error: ${parseError.message}\nResponse: ${responseText}`);
        }

        console.log('Parsed response data:', data);

        // Display test results
        debugLogsContainer.innerHTML = `
          <div style="color: #4CAF50; margin-bottom: 10px;">✓ Endpoint Test Successful</div>
          <div style="color: #e0e0e0; font-size: 12px;">
            <div>Status: ${response.status} ${response.statusText}</div>
            <div>Logs Available: ${data.totalCount || 0}</div>
            <div>Response Valid: ${data.logs ? 'Yes' : 'No'}</div>
            <div>Server Time: ${data.serverStartTime || 'Unknown'}</div>
          </div>
          <div style="color: var(--text-muted); font-size: 11px; margin-top: 10px;">
            Test completed successfully. Click "Refresh Logs" to load full data.
          </div>
        `;

      } catch (error) {
        console.error('Endpoint test failed:', error);

        debugLogsContainer.innerHTML = `
          <div style="color: #ff6b6b; margin-bottom: 10px;">✗ Endpoint Test Failed</div>
          <div style="color: #999; font-size: 11px; margin-bottom: 10px;">
            Error: ${escapeHtml(error.message)}
          </div>
          <div style="color: #666; font-size: 10px;">
            See console for full technical details
          </div>
        `;
      }
    }

    function escapeHtml(text) {
      if (typeof text !== 'string') {
        return String(text || '');
      }
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Tables functionality
    let currentTable = 'page_visits';
    let currentOffset = 0;
    const pageSize = 25;
    let totalRecords = 0;

    async function loadTable(tableName) {
      try {
        currentTable = tableName;
        currentOffset = 0;

        // Update active nav button
        document.querySelectorAll('.table-nav-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        // Update table title
        const titles = {
          'page_visits': 'Page Visits',
          'clearance_generations': 'Clearance Generations',
          'flight_plans_received': 'Flight Plans Received',
          'user_sessions': 'User Sessions',
          'admin_activities': 'Admin Activities'
        };
        document.getElementById('currentTableTitle').textContent = titles[tableName] || tableName;

        await fetchTableData();
      } catch (error) {
        console.error('Error loading table:', error);
        showNotification('error', 'Load Error', 'Failed to load table data');
      }
    }

    async function fetchTableData() {
      const tableDisplay = document.getElementById('tableDisplay');
      try {
        tableDisplay.innerHTML = '<div class="table-loading">Loading table data...</div>';

        // Removed insecure password from URL. Session auth is handled by the browser cookie.
        const url = `/api/admin/tables/${currentTable}?limit=${pageSize}&offset=${currentOffset}`;
        const response = await fetch(url, {
          headers: {
            'X-Session-ID': sessionId,
            'Authorization': `Bearer ${sessionId}`
          }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Invalid response from server' }));
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorData.error || 'No error details'}`);
        }

        const data = await response.json();
        totalRecords = data.totalCount || 0;

        // Handle cases where setup is required
        if (data.setupRequired) {
          tableDisplay.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--text-muted);">
              <div style="font-size: 18px; color: var(--primary-color); margin-bottom: 15px;">⚠️ Database Setup Required</div>
              <div style="margin-bottom: 20px;">${data.message || 'The required table does not exist.'}</div>
              <div style="background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 20px; margin: 20px auto; max-width: 600px; text-align: left;">
                <div style="font-weight: 600; margin-bottom: 10px; color: var(--primary-color);">Next Steps:</div>
                <div style="font-size: 13px; line-height: 1.6;">
                  1. Go to your <a href="https://supabase.com/dashboard" target="_blank" style="color: var(--primary-color);">Supabase Dashboard</a> and select this project.<br>
                  2. Navigate to the <strong>SQL Editor</strong>.<br>
                  3. Run the provided SQL migration script to create all necessary tables and functions.<br>
                  4. After the script runs successfully, refresh this page.
                </div>
              </div>
              <button class="nav-btn" onclick="refreshCurrentTable()" style="margin: 10px;">Retry after Setup</button>
            </div>
          `;
          document.getElementById('tableRecordCount').textContent = 'Setup required';
          document.getElementById('tablePagination').style.display = 'none';
          return;
        }

        if (!data.data || data.data.length === 0) {
          tableDisplay.innerHTML = '<div class="table-loading">No records found in this table.</div>';
          document.getElementById('tableRecordCount').textContent = '0 records';
          document.getElementById('tablePagination').style.display = 'none';
          return;
        }

        // Update record count
        const startRecord = currentOffset + 1;
        const endRecord = Math.min(currentOffset + pageSize, totalRecords);
        document.getElementById('tableRecordCount').textContent = `Showing ${startRecord}-${endRecord} of ${totalRecords} records`;

        // Generate table HTML
        let tableHtml;
        if (currentTable === 'discord_users') {
          tableHtml = generateCardLayoutHtml(data.data);
        } else if (currentTable === 'clearance_generations') {
            tableHtml = generateClearanceTableHtml(data.data);
        }
        else {
          tableHtml = generateTableHtml(data.data);
        }
        tableDisplay.innerHTML = tableHtml;

        // Update pagination
        updatePagination();

      } catch (error) {
        console.error('Error fetching table data:', error);
        tableDisplay.innerHTML = `
          <div style="padding: 40px; text-align: center; color: #ff6b6b;">
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">❌ Failed to Load Table Data</div>
            <div style="font-family: 'SF Mono', 'Monaco', monospace; font-size: 13px; color: #ffa500; margin-bottom: 20px;">${escapeHtml(error.message)}</div>
            <div style="color: var(--text-muted); font-size: 13px;">This could be due to a database connection issue, a problem with the server, or incorrect RLS policies. Check the server logs for more details.</div>
            <button class="nav-btn" onclick="refreshCurrentTable()" style="margin-top: 20px;">Try Again</button>
          </div>
        `;
        document.getElementById('tableRecordCount').textContent = 'Error';
        showNotification('error', 'Table Load Error', `Failed to fetch data for ${currentTable}.`);
      }
    }

    function generateTableHtml(data) {
      if (!data || data.length === 0) {
        return '<div class="table-loading">No data available</div>';
      }

      // Get column names from first row and filter out sensitive columns
      const allColumns = Object.keys(data[0]);
      const sensitiveColumns = ['ip_address', 'user_agent', 'raw_data'];
      const columns = allColumns.filter(col => !sensitiveColumns.includes(col));

      let html = '<table class="data-table"><thead><tr>';
      columns.forEach(col => {
        let displayName = col.replace(/_/g, ' ').toUpperCase();
        // Make column names more user-friendly
        if (col === 'session_id') displayName = 'SESSION';
        if (col === 'page_path') displayName = 'PAGE';
        if (col === 'created_at') displayName = 'TIME';
        if (col === 'callsign') displayName = 'CALLSIGN';
        if (col === 'destination') displayName = 'DEST';
        if (col === 'flight_level') displayName = 'FL';
        html += `<th>${displayName}</th>`;
      });
      html += '</tr></thead><tbody>';

      data.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
          let value = row[col];

          // Format different data types
          if (value === null || value === undefined) {
            value = '-';
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          } else if (typeof value === 'string' && value.length > 50) {
            const escapedValue = escapeHtml(value);
            value = `<span class="table-cell-truncated" onclick='showInfoPopup(${JSON.stringify(value)})'>${escapedValue}<i class="info-icon">i</i></span>`;
          } else if (col.includes('_at') || col.includes('timestamp')) {
            // Format dates
            try {
              const date = new Date(value);
              value = date.toLocaleString();
            } catch (e) {
              // Keep original value if date parsing fails
            }
          } else if (col === 'session_id' && typeof value === 'string') {
            // Truncate session IDs for privacy
            value = value.substring(0, 8) + '...';
          }

          html += `<td>${value}</td>`;
        });
        html += '</tr>';
      });

      html += '</tbody></table>';
      return html;
    }

    function generateCardLayoutHtml(data) {
      if (!data || data.length === 0) {
        return '<div class="table-loading">No data available</div>';
      }

      let html = '<div class="card-grid">';
      data.forEach(row => {
        html += '<div class="data-card">';
        for (const key in row) {
          let value = row[key];
          if (value === null || value === undefined) {
            value = '-';
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          }

          let valueHtml = escapeHtml(String(value));
          if (typeof value === 'string' && value.length > 30) {
            valueHtml = `<span class="table-cell-truncated" onclick='showInfoPopup(${JSON.stringify(value)})'>${escapeHtml(value.substring(0, 30))}...<i class="info-icon">i</i></span>`;
          }

          html += `
            <div class="data-card-row">
              <span class="data-card-key">${key.replace(/_/g, ' ')}</span>
              <span class="data-card-value">${valueHtml}</span>
            </div>
          `;
        }
        html += '</div>';
      });
      html += '</div>';
      return html;
    }

    function generateClearanceTableHtml(data) {
      if (!data || data.length === 0) {
        return '<div class="table-loading">No data available</div>';
      }

      const columns = ['callsign', 'destination', 'clearance_text', 'discord_username', 'created_at'];
      const columnNames = ['Callsign', 'Destination', 'Clearance', 'Generated By', 'Timestamp'];

      let html = '<table class="data-table"><thead><tr>';
      columnNames.forEach(col => {
        html += `<th>${col}</th>`;
      });
      html += '</tr></thead><tbody>';

      data.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
          let value = row[col];

          if (value === null || value === undefined) {
            value = '-';
          } else if (col === 'created_at') {
            value = new Date(value).toLocaleString();
          } else if (typeof value === 'string' && value.length > 50) {
            const escapedValue = escapeHtml(value);
            value = `<span class="table-cell-truncated" onclick='showInfoPopup(${JSON.stringify(value)})'>${escapedValue}<i class="info-icon">i</i></span>`;
          }

          html += `<td>${value}</td>`;
        });
        html += '</tr>';
      });

      html += '</tbody></table>';
      return html;
    }

    function updatePagination() {
      const pagination = document.getElementById('tablePagination');
      const prevBtn = document.getElementById('prevBtn');
      const nextBtn = document.getElementById('nextBtn');
      const pageInfo = document.getElementById('pageInfo');

      const currentPage = Math.floor(currentOffset / pageSize) + 1;
      const totalPages = Math.ceil(totalRecords / pageSize);

      prevBtn.disabled = currentOffset === 0;
      nextBtn.disabled = currentOffset + pageSize >= totalRecords;

      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
      pagination.style.display = totalPages > 1 ? 'flex' : 'none';
    }

    async function previousPage() {
      if (currentOffset > 0) {
        currentOffset = Math.max(0, currentOffset - pageSize);
        await fetchTableData();
      }
    }

    async function nextPage() {
      if (currentOffset + pageSize < totalRecords) {
        currentOffset += pageSize;
        await fetchTableData();
      }
    }

    async function refreshCurrentTable() {
      await fetchTableData();
    }

    // Current users functionality
    async function loadCurrentUsers() {
      try {
        const response = await fetch(`/api/admin/current-users`, {
          headers: {
            'X-Session-ID': sessionId,
            'Authorization': `Bearer ${sessionId}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Update stats
        document.getElementById('activeUsersCount').textContent = data.activeCount || 0;
        document.getElementById('memorySessionsCount').textContent = data.memorySessionsCount || 0;
        document.getElementById('supabaseSessionsCount').textContent = data.supabaseSessionsCount || 0;

        // Generate users display
        const usersTable = document.getElementById('currentUsersTable');

        if (!data.users || data.users.length === 0) {
          usersTable.innerHTML = '<div class="table-loading">No active users in the last 5 minutes</div>';
          return;
        }

        let usersHtml = '<div class="current-users-grid">';

        data.users.forEach(user => {
          const lastActivity = new Date(user.last_activity);
          const timeAgo = getTimeAgo(lastActivity);

          usersHtml += `
            <div class="user-card">
              <div class="user-card-header">
                <span class="user-session-id">${user.session_id}</span>
                <span class="user-source ${user.source}">${user.source}</span>
              </div>
              <div class="user-stats">
                <div class="user-stat">
                  <div class="user-stat-value">${user.page_views || 0}</div>
                  <div class="user-stat-label">Page Views</div>
                </div>
                <div class="user-stat">
                  <div class="user-stat-value">${user.clearances_generated || 0}</div>
                  <div class="user-stat-label">Clearances</div>
                </div>
              </div>
              <div class="user-last-activity">
                Last activity: ${timeAgo}
              </div>
            </div>
          `;
        });

        usersHtml += '</div>';
        usersTable.innerHTML = usersHtml;

      } catch (error) {
        console.error('Error loading current users:', error);
        document.getElementById('currentUsersTable').innerHTML = '<div class="table-loading">Error loading current users</div>';
      }
    }

    function getTimeAgo(date) {
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      if (diffMins < 1) {
        return 'Just now';
      } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else {
        return date.toLocaleString();
      }
    }

    // User Management Functions
    async function loadCurrentAdminInfo() {
      try {
        const currentAdminDiv = document.getElementById('currentAdminInfo');
        if (currentUser) {
          currentAdminDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
              ${currentUser.avatar ? `<img src="${currentUser.avatar}" alt="Avatar" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid var(--primary-color);">` : ''}
              <div style="flex: 1;">
                <div style="font-size: 18px; font-weight: 600; color: var(--primary-color); margin-bottom: 5px;">
                  ${currentUser.username}
                </div>
                <div style="color: var(--text-muted); font-size: 14px;">
                  Discord ID: ${currentUser.discord_id} | Email: ${currentUser.email || 'N/A'}
                </div>
                <div style="color: var(--text-muted); font-size: 12px; margin-top: 5px;">
                  Roles: ${currentUser.roles ? currentUser.roles.join(', ') : 'admin'}
                </div>
              </div>
              <div style="padding: 8px 16px; background: var(--primary-color); color: #000; border-radius: 6px; font-size: 12px; font-weight: 600;">
                ADMIN ACCESS
              </div>
            </div>
          `;
        }
      } catch (error) {
        console.error('Failed to load current admin info:', error);
      }
    }

    async function loadAdminUsers() {
      try {
        const response = await fetch('/api/admin/users', {
          headers: {
            'X-Session-ID': sessionId,
            'Authorization': `Bearer ${sessionId}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          displayAdminUsers(data.users || []);
        } else {
          document.getElementById('adminUsersList').innerHTML = `
            <div style="padding: 20px; text-align: center; color: #ff6b6b;">
              Failed to load admin users
            </div>
          `;
        }
      } catch (error) {
        console.error('Failed to load admin users:', error);
        document.getElementById('adminUsersList').innerHTML = `
          <div style="padding: 20px; text-align: center; color: #ff6b6b;">
            Error loading admin users
          </div>
        `;
      }
    }

    function displayAdminUsers(users) {
      const container = document.getElementById('adminUsersList');

      if (users.length === 0) {
        container.innerHTML = `
          <div style="padding: 20px; text-align: center; color: var(--text-muted);">
            No admin users found
          </div>
        `;
        return;
      }

      let html = '<div style="padding: 20px;">';
      users.forEach(user => {
        html += `
          <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: var(--surface-hover); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 15px;">
            ${user.avatar ? `<img src="${user.avatar}" alt="Avatar" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--primary-color);">` : ''}
            <div style="flex: 1;">
              <div style="font-weight: 600; color: var(--text-color); margin-bottom: 3px;">
                ${user.username}
              </div>
              <div style="color: var(--text-muted); font-size: 12px;">
                Discord ID: ${user.discord_id} | Last login: ${new Date(user.last_login).toLocaleDateString()}
              </div>
              <div style="color: var(--text-muted); font-size: 11px; margin-top: 3px;">
                Roles: ${user.roles ? user.roles.join(', ') : 'admin'}
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              ${user.discord_id !== currentUser.discord_id ? `
                <button class="nav-btn" onclick="removeAdminUser('${user.id}')" style="margin: 0; padding: 6px 12px; font-size: 12px; background: #ff6b6b; border-color: #ff6b6b; color: white;">
                  Remove
                </button>
              ` : `
                <span style="color: var(--primary-color); font-size: 12px; font-weight: 600; padding: 6px 12px;">
                  YOU
                </span>
              `}
            </div>
          </div>
        `;
      });
      html += '</div>';
      container.innerHTML = html;
    }

    async function addAdminUser() {
      const username = document.getElementById('newAdminUsername').value.trim();
      const isAdmin = document.getElementById('roleAdmin').checked;
      const isSuperAdmin = document.getElementById('roleSuperAdmin').checked;

      if (!username) {
        showNotification('error', 'Validation Error', 'Please enter a Discord username');
        return;
      }

      const roles = [];
      if (isAdmin) roles.push('admin');
      if (isSuperAdmin) roles.push('super_admin');

      try {
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId,
            'Authorization': `Bearer ${sessionId}`
          },
          body: JSON.stringify({
            username: username,
            roles: roles
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          showNotification('success', 'User Added', `${username} has been granted admin access`);
          clearAddUserForm();
          loadAdminUsers();
        } else {
          showNotification('error', 'Add Failed', data.error || 'Failed to add admin user');
        }
      } catch (error) {
        console.error('Error adding admin user:', error);
        showNotification('error', 'Network Error', 'Failed to connect to server');
      }
    }

    async function removeAdminUser(userId) {
      if (!confirm('Are you sure you want to remove this admin user? This cannot be undone.')) {
        return;
      }

      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'X-Session-ID': sessionId,
            'Authorization': `Bearer ${sessionId}`
          }
        });

        const data = await response.json();

        if (response.ok && data.success) {
          showNotification('success', 'User Removed', 'Admin user has been removed');
          loadAdminUsers();
        } else {
          showNotification('error', 'Remove Failed', data.error || 'Failed to remove admin user');
        }
      } catch (error) {
        console.error('Error removing admin user:', error);
        showNotification('error', 'Network Error', 'Failed to connect to server');
      }
    }

    function clearAddUserForm() {
      document.getElementById('newAdminUsername').value = '';
      document.getElementById('roleAdmin').checked = true;
      document.getElementById('roleSuperAdmin').checked = false;
    }

    function showRemoveAdminDialog() {
      // This could be enhanced with a proper modal dialog
      const username = prompt('Enter the Discord username of the admin user to remove:');
      if (username) {
        // In a real implementation, you'd look up the user ID first
        showNotification('info', 'Feature Coming Soon', 'Use the Remove button next to each user in the list above');
      }
    }

    // Auto-refresh analytics every 30 seconds
    setInterval(() => {
      if (sessionId && document.getElementById('analytics').classList.contains('active')) {
        loadAnalytics();
      }
    }, 30000);

    // Auto-refresh debug logs every 15 seconds when system section is active
    setInterval(() => {
      if (sessionId && document.getElementById('system').classList.contains('active')) {
        loadDebugLogs();
      }
    }, 15000);

    // Auto-refresh tables and current users every 10 seconds when tables section is active
    setInterval(() => {
      if (sessionId && document.getElementById('tables').classList.contains('active')) {
        loadCurrentUsers();
      }
    }, 10000);

    // Auto-refresh user management every 30 seconds when users section is active
    setInterval(() => {
      if (sessionId && document.getElementById('users').classList.contains('active')) {
        loadAdminUsers();
      }
    }, 30000);

    // Initialize admin panel
    document.addEventListener('DOMContentLoaded', () => {
      checkAuthParams();
      checkAuthStatus();
    });
  </script>
</body>
</html>
```

---

## Old DB Migration (`db.sql`)

```sql
-- =============================================================================
-- ATC24 Complete Database Setup with Missing Functions - FIXED
-- Run this in your Supabase SQL Editor to fix all authentication issues
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Drop existing tables to recreate with correct schema
-- =============================================================================
DROP TABLE IF EXISTS page_visits CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS clearance_generations CASCADE;
DROP TABLE IF EXISTS flight_plans_received CASCADE;
DROP TABLE IF EXISTS admin_activities CASCADE;
DROP TABLE IF EXISTS discord_users CASCADE;

-- =============================================================================
-- TABLE: discord_users
-- Stores Discord user information for authentication
-- =============================================================================
CREATE TABLE discord_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    discord_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    discriminator TEXT,
    email TEXT,
    avatar TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    is_admin BOOLEAN DEFAULT FALSE,
    roles JSONB DEFAULT '[]'::JSONB,
    vatsim_cid TEXT,
    is_controller BOOLEAN DEFAULT FALSE,
    user_settings JSONB,
    last_login TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for discord_users
CREATE INDEX IF NOT EXISTS idx_discord_users_discord_id ON discord_users(discord_id);
CREATE INDEX IF NOT EXISTS idx_discord_users_username ON discord_users(username);
CREATE INDEX IF NOT EXISTS idx_discord_users_is_admin ON discord_users(is_admin);
CREATE INDEX IF NOT EXISTS idx_discord_users_last_login ON discord_users(last_login);
CREATE INDEX IF NOT EXISTS idx_discord_users_vatsim_cid ON discord_users(vatsim_cid);
CREATE INDEX IF NOT EXISTS idx_discord_users_is_controller ON discord_users(is_controller);

-- =============================================================================
-- TABLE: page_visits
-- Tracks individual page visits for analytics
-- =============================================================================
CREATE TABLE page_visits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    page_path TEXT NOT NULL DEFAULT '/',
    user_agent TEXT,
    referrer TEXT,
    session_id TEXT NOT NULL,
    ip_address TEXT,
    is_first_visit BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES discord_users(id) ON DELETE SET NULL,
    discord_username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for page_visits
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_user_id ON page_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_page_path ON page_visits(page_path);
CREATE INDEX IF NOT EXISTS idx_page_visits_ip_address ON page_visits(ip_address);

-- =============================================================================
-- TABLE: user_sessions
-- Manages user session data and tracking
-- =============================================================================
CREATE TABLE user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES discord_users(id) ON DELETE SET NULL,
    user_agent TEXT,
    ip_address TEXT,
    page_views INTEGER DEFAULT 0,
    clearances_generated INTEGER DEFAULT 0,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at);

-- =============================================================================
-- TABLE: clearance_generations
-- Tracks IFR clearance generations
-- =============================================================================
CREATE TABLE clearance_generations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    callsign TEXT,
    destination TEXT,
    route TEXT,
    runway TEXT,
    squawk_code TEXT,
    flight_level TEXT,
    atis_letter TEXT,
    clearance_text TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES discord_users(id) ON DELETE SET NULL,
    discord_username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for clearance_generations
CREATE INDEX IF NOT EXISTS idx_clearance_generations_created_at ON clearance_generations(created_at);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_session_id ON clearance_generations(session_id);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_user_id ON clearance_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_callsign ON clearance_generations(callsign);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_destination ON clearance_generations(destination);

-- =============================================================================
-- TABLE: flight_plans_received
-- Stores flight plans received from external sources
-- =============================================================================
CREATE TABLE flight_plans_received (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    callsign TEXT NOT NULL,
    destination TEXT,
    route TEXT,
    flight_level TEXT,
    source TEXT DEFAULT 'Main',
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for flight_plans_received
CREATE INDEX IF NOT EXISTS idx_flight_plans_received_created_at ON flight_plans_received(created_at);
CREATE INDEX IF NOT EXISTS idx_flight_plans_received_callsign ON flight_plans_received(callsign);
CREATE INDEX IF NOT EXISTS idx_flight_plans_received_source ON flight_plans_received(source);

-- =============================================================================
-- TABLE: admin_activities
-- Tracks admin panel activities for auditing
-- =============================================================================
CREATE TABLE admin_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    action TEXT NOT NULL,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for admin_activities
CREATE INDEX IF NOT EXISTS idx_admin_activities_created_at ON admin_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activities_action ON admin_activities(action);

-- =============================================================================
-- TABLE: admin_settings
-- Stores persistent admin panel settings
-- =============================================================================
CREATE TABLE IF NOT EXISTS admin_settings (
    id INT PRIMARY KEY DEFAULT 1,
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row_constraint CHECK (id = 1)
);

-- =============================================================================
-- FUNCTION: is_admin (NEW)
-- Checks if the currently authenticated user has admin privileges.
-- =============================================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    RETURN (
      SELECT is_admin
      FROM public.discord_users
      WHERE id = auth.uid()
    );
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Enable RLS for admin_settings
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Policies for admin_settings: service_role can do anything, authenticated admins can read/write
DROP POLICY IF EXISTS "Service role full access on admin_settings" ON admin_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON admin_settings;
CREATE POLICY "Service role full access on admin_settings" ON admin_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage settings" ON admin_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());


-- Insert default settings if the table is empty
-- This ensures that on first setup, there's a settings row to work with.
DO $$
DECLARE
  default_settings JSONB := '{
    "clearanceFormat": {
      "includeAtis": true,
      "includeSquawk": true,
      "includeFlightLevel": true,
      "customTemplate": "{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}.",
      "includeStartupApproval": true,
      "includeInitialClimb": true
    },
    "aviation": {
      "defaultAltitudes": [1000, 2000, 3000, 4000, 5000],
      "enableRunwayValidation": false,
      "enableSIDValidation": false,
      "squawkRanges": {
        "min": 1000,
        "max": 7777,
        "exclude": [7500, 7600, 7700]
      },
      "atisLetters": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]
    },
    "system": {
      "maxFlightPlansStored": 20,
      "enableDetailedLogging": false,
      "autoRefreshInterval": 30000,
      "controllerPollInterval": 300000,
      "enableFlightPlanFiltering": false
    }
  }';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_settings WHERE id = 1) THEN
    INSERT INTO admin_settings (id, settings) VALUES (1, default_settings);
  END IF;
END $$;

-- =============================================================================

-- =============================================================================
-- FUNCTION: upsert_user_session
-- Creates or updates user session data safely
-- =============================================================================
CREATE OR REPLACE FUNCTION upsert_user_session(
    p_session_id TEXT,
    p_user_id UUID DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_page_views INTEGER DEFAULT NULL,
    p_clearances_generated INTEGER DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    INSERT INTO user_sessions (
        session_id,
        user_id,
        user_agent,
        ip_address,
        page_views,
        clearances_generated,
        last_activity,
        updated_at
    ) VALUES (
        p_session_id,
        p_user_id,
        p_user_agent,
        p_ip_address,
        COALESCE(p_page_views, 1),
        COALESCE(p_clearances_generated, 0),
        NOW(),
        NOW()
    )
    ON CONFLICT (session_id) DO UPDATE SET
        user_id = COALESCE(EXCLUDED.user_id, user_sessions.user_id),
        user_agent = COALESCE(EXCLUDED.user_agent, user_sessions.user_agent),
        ip_address = COALESCE(EXCLUDED.ip_address, user_sessions.ip_address),
        page_views = COALESCE(EXCLUDED.page_views, user_sessions.page_views),
        clearances_generated = COALESCE(EXCLUDED.clearances_generated, user_sessions.clearances_generated),
        last_activity = NOW(),
        updated_at = NOW();
END;
$$;

-- =============================================================================
-- FUNCTION: upsert_discord_user (FIXED to avoid ambiguous columns)
-- Creates or updates Discord user data with admin check
-- =============================================================================
CREATE OR REPLACE FUNCTION upsert_discord_user(
    p_discord_id TEXT,
    p_username TEXT,
    p_discriminator TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_avatar TEXT DEFAULT NULL,
    p_access_token TEXT DEFAULT NULL,
    p_refresh_token TEXT DEFAULT NULL,
    p_token_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_vatsim_cid TEXT DEFAULT NULL
) RETURNS TABLE(
    id UUID,
    discord_id TEXT,
    username TEXT,
    email TEXT,
    avatar TEXT,
    is_admin BOOLEAN,
    roles JSONB,
    vatsim_cid TEXT,
    is_controller BOOLEAN
)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Check if user exists
    SELECT discord_users.id INTO v_user_id FROM discord_users WHERE discord_users.discord_id = p_discord_id;

    IF FOUND THEN
        -- Update existing user
        UPDATE discord_users
        SET
            username = p_username,
            discriminator = p_discriminator,
            email = p_email,
            avatar = p_avatar,
            access_token = p_access_token,
            refresh_token = p_refresh_token,
            token_expires_at = p_token_expires_at,
            vatsim_cid = COALESCE(p_vatsim_cid, discord_users.vatsim_cid),
            is_admin = CASE
                WHEN p_discord_id = '1200035083550208042' OR p_username = 'h.a.s2' THEN TRUE
                ELSE discord_users.is_admin -- Preserve existing value
            END,
            roles = CASE
                WHEN p_discord_id = '1200035083550208042' OR p_username = 'h.a.s2' THEN '["admin", "super_admin"]'::JSONB
                ELSE discord_users.roles -- Preserve existing value
            END,
            last_login = NOW(),
            updated_at = NOW()
        WHERE discord_users.discord_id = p_discord_id;
    ELSE
        -- Insert new user
        INSERT INTO discord_users (
            discord_id, username, discriminator, email, avatar, access_token, refresh_token, token_expires_at, vatsim_cid, is_admin, roles, last_login, created_at, updated_at
        ) VALUES (
            p_discord_id, p_username, p_discriminator, p_email, p_avatar, p_access_token, p_refresh_token, p_token_expires_at, p_vatsim_cid,
            CASE WHEN p_discord_id = '1200035083550208042' OR p_username = 'h.a.s2' THEN TRUE ELSE FALSE END,
            CASE WHEN p_discord_id = '1200035083550208042' OR p_username = 'h.a.s2' THEN '["admin", "super_admin"]'::JSONB ELSE '[]'::JSONB END,
            NOW(), NOW(), NOW()
        );
    END IF;

    -- Return the user's data
    RETURN QUERY
    SELECT du.id, du.discord_id, du.username, du.email, du.avatar, du.is_admin, du.roles, du.vatsim_cid, du.is_controller
    FROM discord_users du WHERE du.discord_id = p_discord_id;
END;
$$;


-- =============================================================================
-- FUNCTION: update_user_from_discord_login (FIXED to avoid ambiguous columns)
-- Updates existing user from Discord login (handles pending admin users)
-- =============================================================================
CREATE OR REPLACE FUNCTION update_user_from_discord_login(
    p_discord_id TEXT,
    p_username TEXT,
    p_email TEXT DEFAULT NULL,
    p_avatar TEXT DEFAULT NULL,
    p_vatsim_cid TEXT DEFAULT NULL
) RETURNS TABLE(
    id UUID,
    discord_id TEXT,
    username TEXT,
    email TEXT,
    avatar TEXT,
    is_admin BOOLEAN,
    roles JSONB,
    vatsim_cid TEXT,
    is_controller BOOLEAN
)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
    v_pending_user_id UUID;
    v_existing_user_id UUID;
BEGIN
    -- Check for a pending admin user created by username
    SELECT discord_users.id INTO v_pending_user_id
    FROM discord_users
    WHERE discord_users.discord_id LIKE 'pending_%' AND discord_users.username = p_username AND discord_users.is_admin = TRUE
    LIMIT 1;

    IF FOUND THEN
        -- Pending admin found, update their record with the real discord_id and info
        UPDATE discord_users
        SET
            discord_id = p_discord_id,
            email = p_email,
            avatar = p_avatar,
            vatsim_cid = COALESCE(p_vatsim_cid, discord_users.vatsim_cid),
            last_login = NOW(),
            updated_at = NOW()
        WHERE id = v_pending_user_id;
    ELSE
        -- No pending user, so check for a regular existing user by discord_id
        SELECT discord_users.id INTO v_existing_user_id FROM discord_users WHERE discord_users.discord_id = p_discord_id;

        IF FOUND THEN
            -- User exists, update them
            UPDATE discord_users
            SET
                username = p_username,
                email = p_email,
                avatar = p_avatar,
                vatsim_cid = COALESCE(p_vatsim_cid, discord_users.vatsim_cid),
                -- We preserve the is_admin and roles fields, as promotion is handled by add_admin_user_by_username
                last_login = NOW(),
                updated_at = NOW()
            WHERE id = v_existing_user_id;
        ELSE
            -- User does not exist, create a new one
            INSERT INTO discord_users (
                discord_id, username, email, avatar, vatsim_cid, is_admin, roles, last_login, created_at, updated_at
            ) VALUES (
                p_discord_id, p_username, p_email, p_avatar, p_vatsim_cid,
                -- New users are not admin unless they match the hardcoded values
                CASE WHEN p_discord_id = '1200035083550208042' OR p_username = 'h.a.s2' THEN TRUE ELSE FALSE END,
                CASE WHEN p_discord_id = '1200035083550208042' OR p_username = 'h.a.s2' THEN '["admin", "super_admin"]'::JSONB ELSE '[]'::JSONB END,
                NOW(), NOW(), NOW()
            );
        END IF;
    END IF;

    -- Return the final state of the user
    RETURN QUERY
    SELECT du.id, du.discord_id, du.username, du.email, du.avatar, du.is_admin, du.roles, du.vatsim_cid, du.is_controller
    FROM discord_users du WHERE du.discord_id = p_discord_id;
END;
$$;

-- =============================================================================
-- FUNCTION: set_user_controller_status
-- Updates the controller status for a given user.
-- =============================================================================
CREATE OR REPLACE FUNCTION set_user_controller_status(
    p_user_id UUID,
    p_is_controller BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    UPDATE discord_users
    SET
        is_controller = p_is_controller,
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$;


-- =============================================================================
-- Drop existing functions if they exist with different signatures
-- =============================================================================
DROP FUNCTION IF EXISTS get_admin_users();
DROP FUNCTION IF EXISTS add_admin_user_by_username(TEXT);
DROP FUNCTION IF EXISTS add_admin_user_by_username(character varying, jsonb);
DROP FUNCTION IF EXISTS add_admin_user_by_username(TEXT, JSONB);
DROP FUNCTION IF EXISTS remove_admin_user(UUID);
DROP FUNCTION IF EXISTS get_analytics_summary();
DROP FUNCTION IF EXISTS get_charts_data();

-- =============================================================================
-- FUNCTION: get_admin_users
-- Gets all admin users for management
-- =============================================================================
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE(
    id UUID,
    discord_id TEXT,
    username TEXT,
    email TEXT,
    avatar TEXT,
    is_admin BOOLEAN,
    roles JSONB,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        du.id,
        du.discord_id,
        du.username,
        du.email,
        du.avatar,
        du.is_admin,
        du.roles,
        du.last_login,
        du.created_at
    FROM discord_users du
    WHERE du.is_admin = TRUE
    ORDER BY du.last_login DESC;
END;
$$;

-- =============================================================================
-- FUNCTION: add_admin_user_by_username
-- Adds admin privileges to a user by username
-- =============================================================================
CREATE OR REPLACE FUNCTION add_admin_user_by_username(
    p_username TEXT,
    p_roles JSONB DEFAULT '["admin"]'::JSONB
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    user_id UUID
)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
    v_user_id UUID;
    v_found BOOLEAN := FALSE;
BEGIN
    -- Try to find existing user by username
    SELECT id INTO v_user_id
    FROM discord_users
    WHERE username = p_username
    LIMIT 1;

    IF FOUND THEN
        -- Update existing user
        UPDATE discord_users
        SET
            is_admin = TRUE,
            roles = p_roles,
            updated_at = NOW()
        WHERE id = v_user_id;

        v_found := TRUE;
    ELSE
        -- Create placeholder user (will be filled when they login)
        INSERT INTO discord_users (
            discord_id,
            username,
            is_admin,
            roles,
            created_at,
            updated_at
        ) VALUES (
            'pending_' || p_username || '_' || extract(epoch from now())::text,
            p_username,
            TRUE,
            p_roles,
            NOW(),
            NOW()
        ) RETURNING id INTO v_user_id;
    END IF;

    RETURN QUERY SELECT
        TRUE as success,
        CASE
            WHEN v_found THEN 'User granted admin access'
            ELSE 'Pending admin user created - will be activated when they login'
        END as message,
        v_user_id as user_id;
END;
$$;

-- =============================================================================
-- FUNCTION: remove_admin_user
-- Removes admin privileges from a user
-- =============================================================================
CREATE OR REPLACE FUNCTION remove_admin_user(
    p_user_id UUID
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
    UPDATE discord_users
    SET
        is_admin = FALSE,
        roles = '[]'::JSONB,
        updated_at = NOW()
    WHERE id = p_user_id;

    IF FOUND THEN
        RETURN QUERY SELECT TRUE as success, 'Admin access removed' as message;
    ELSE
        RETURN QUERY SELECT FALSE as success, 'User not found' as message;
    END IF;
END;
$$;

-- =============================================================================
-- FUNCTION: get_analytics_summary
-- Gets comprehensive analytics data
-- =============================================================================
CREATE OR REPLACE FUNCTION get_analytics_summary()
RETURNS TABLE(
    total_visits BIGINT,
    unique_visitors BIGINT,
    clearances_generated BIGINT,
    flight_plans_received BIGINT,
    authenticated_sessions BIGINT,
    last_7_days_visits BIGINT,
    last_30_days_visits BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM page_visits) as total_visits,
        (SELECT COUNT(DISTINCT session_id) FROM user_sessions) as unique_visitors,
        (SELECT COUNT(*) FROM clearance_generations) as clearances_generated,
        (SELECT COUNT(*) FROM flight_plans_received) as flight_plans_received,
        (SELECT COUNT(*) FROM user_sessions WHERE user_id IS NOT NULL) as authenticated_sessions,
        (SELECT COUNT(*) FROM page_visits WHERE created_at >= NOW() - INTERVAL '7 days') as last_7_days_visits,
        (SELECT COUNT(*) FROM page_visits WHERE created_at >= NOW() - INTERVAL '30 days') as last_30_days_visits;
END;
$$;

-- =============================================================================
-- FUNCTION: get_charts_data
-- Gets aggregated data for analytics charts
-- =============================================================================
CREATE OR REPLACE FUNCTION get_charts_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    visits_data JSON;
    clearances_data JSON;
BEGIN
    -- Aggregate page visits for the last 30 days
    SELECT json_agg(t)
    INTO visits_data
    FROM (
        SELECT
            DATE(created_at) as date,
            COUNT(*) as count
        FROM page_visits
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    ) t;

    -- Aggregate clearance generations for the last 30 days
    SELECT json_agg(t)
    INTO clearances_data
    FROM (
        SELECT
            DATE(created_at) as date,
            COUNT(*) as count
        FROM clearance_generations
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    ) t;

    -- Return as a single JSON object
    RETURN json_build_object(
        'daily_visits', COALESCE(visits_data, '[]'::json),
        'daily_clearances', COALESCE(clearances_data, '[]'::json)
    );
END;
$$;

-- =============================================================================
-- TRIGGER FUNCTION: update_updated_at_column
-- Automatically updates the updated_at timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_discord_users_updated_at ON discord_users;
CREATE TRIGGER update_discord_users_updated_at
    BEFORE UPDATE ON discord_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (REVISED FOR ADMIN ACCESS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearance_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_plans_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activities ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Service role full access discord_users" ON discord_users;
DROP POLICY IF EXISTS "Anon read discord_users" ON discord_users;
DROP POLICY IF EXISTS "Authenticated read discord_users" ON discord_users;
DROP POLICY IF EXISTS "Admins have full access to discord_users" ON discord_users;
DROP POLICY IF EXISTS "Authenticated full access page_visits" ON page_visits;
DROP POLICY IF EXISTS "Authenticated full access user_sessions" ON user_sessions;
DROP POLICY IF EXISTS "Authenticated full access clearance_generations" ON clearance_generations;
DROP POLICY IF EXISTS "Authenticated read flight_plans_received" ON flight_plans_received;
DROP POLICY IF EXISTS "Authenticated read admin_activities" ON admin_activities;

DROP POLICY IF EXISTS "Service role full access" ON discord_users;
DROP POLICY IF EXISTS "Service role full access" ON page_visits;
DROP POLICY IF EXISTS "Service role full access" ON user_sessions;
DROP POLICY IF EXISTS "Service role full access" ON clearance_generations;
DROP POLICY IF EXISTS "Service role full access" ON flight_plans_received;
DROP POLICY IF EXISTS "Service role full access" ON admin_activities;

DROP POLICY IF EXISTS "Admins have full access to page_visits" ON page_visits;
DROP POLICY IF EXISTS "Admins have full access to user_sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins have full access to clearance_generations" ON clearance_generations;
DROP POLICY IF EXISTS "Admins can read flight_plans_received" ON flight_plans_received;
DROP POLICY IF EXISTS "Admins can read admin_activities" ON admin_activities;
DROP POLICY IF EXISTS "Anon insert page_visits" ON page_visits;
DROP POLICY IF EXISTS "Anon insert user_sessions" ON user_sessions;
DROP POLICY IF EXISTS "Anon update user_sessions" ON user_sessions;
DROP POLICY IF EXISTS "Anon insert clearance_generations" ON clearance_generations;


-- Service role should have unrestricted access to all tables
CREATE POLICY "Service role full access" ON discord_users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON page_visits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON user_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON clearance_generations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON flight_plans_received FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON admin_activities FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Discord users policies: Admins can see all users, but regular users can't see any (for admin panel)
CREATE POLICY "Admins have full access to discord_users" ON public.discord_users FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Page visits policies: Anon can insert, but only admins can see/manage the data
CREATE POLICY "Anon insert page_visits" ON public.page_visits FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admins have full access to page_visits" ON public.page_visits FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- User sessions policies: Anon can insert/update, but only admins can see/manage the data
CREATE POLICY "Anon insert user_sessions" ON public.user_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update user_sessions" ON public.user_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Admins have full access to user_sessions" ON public.user_sessions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Clearance generations policies: Anon can insert, but only admins can see/manage
CREATE POLICY "Anon insert clearance_generations" ON public.clearance_generations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admins have full access to clearance_generations" ON public.clearance_generations FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Flight plans policies: Anon and authenticated can read, but only admins can do more (if needed)
-- For now, let's restrict all but service role. If client needs read, change to is_admin()
CREATE POLICY "Admins can read flight_plans_received" ON public.flight_plans_received FOR SELECT TO authenticated USING (is_admin());

-- Admin activities policies: Only admins can read
CREATE POLICY "Admins can read admin_activities" ON public.admin_activities FOR SELECT TO authenticated USING (is_admin());

-- Force RLS on all tables, which is best practice
ALTER TABLE discord_users FORCE ROW LEVEL SECURITY;
ALTER TABLE page_visits FORCE ROW LEVEL SECURITY;
ALTER TABLE user_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE clearance_generations FORCE ROW LEVEL SECURITY;
ALTER TABLE flight_plans_received FORCE ROW LEVEL SECURITY;
ALTER TABLE admin_activities FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant usage on all sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Grant permissions on tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT ON page_visits, user_sessions, clearance_generations TO anon, authenticated;
GRANT UPDATE ON user_sessions TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- =============================================================================
-- INSERT INITIAL ADMIN USER (CHANGE THESE VALUES)
-- =============================================================================

-- Insert your Discord username as the first admin
-- Replace 'YourDiscordUsername' with your actual Discord username
INSERT INTO discord_users (
    discord_id,
    username,
    is_admin,
    roles,
    created_at,
    updated_at
) VALUES (
    'initial_admin_setup',
    'h.a.s2',
    TRUE,
    '["admin", "super_admin"]'::JSONB,
    NOW(),
    NOW()
) ON CONFLICT (discord_id) DO UPDATE SET
    is_admin = TRUE,
    roles = '["admin", "super_admin"]'::JSONB,
    updated_at = NOW();

-- Add your specific Discord ID as admin - Force update
DELETE FROM discord_users WHERE discord_id = '1200035083550208042' OR username = 'h.a.s2';

INSERT INTO discord_users (
    discord_id,
    username,
    is_admin,
    roles,
    created_at,
    updated_at
) VALUES (
    '1200035083550208042',
    'h.a.s2',
    TRUE,
    '["admin", "super_admin"]'::JSONB,
    NOW(),
    NOW()
);

-- Also ensure any existing fallback users get admin
UPDATE discord_users SET
    is_admin = TRUE,
    roles = '["admin", "super_admin"]'::JSONB,
    updated_at = NOW()
WHERE username = 'h.a.s2' OR discord_id = '1200035083550208042';

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify all functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Verify admin user was created
SELECT discord_id, username, is_admin, roles
FROM discord_users
WHERE is_admin = TRUE;

-- Test the upsert_user_session function
SELECT upsert_user_session('test-session-123', NULL, 'Test User Agent', '127.0.0.1', 1, 0);

-- Verify the test session was created
SELECT session_id, user_agent, ip_address, page_views, clearances_generated
FROM user_sessions
WHERE session_id = 'test-session-123';

-- Clean up test session
DELETE FROM user_sessions WHERE session_id = 'test-session-123';

-- =============================================================================
-- FUNCTION: get_clearance_leaderboard
-- Gets the top users by clearance count
-- =============================================================================
CREATE OR REPLACE FUNCTION get_clearance_leaderboard(
    p_limit INT DEFAULT 25
)
RETURNS TABLE(
    rank BIGINT,
    user_id UUID,
    username TEXT,
    avatar TEXT,
    clearance_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (ORDER BY COUNT(cg.id) DESC) as rank,
        du.id as user_id,
        du.username,
        du.avatar,
        COUNT(cg.id) as clearance_count
    FROM clearance_generations cg
    JOIN discord_users du ON cg.user_id = du.id
    WHERE cg.user_id IS NOT NULL
    GROUP BY du.id, du.username, du.avatar
    ORDER BY clearance_count DESC
    LIMIT p_limit;
END;
$$;

-- =============================================================================
-- FUNCTION: get_user_clearances
-- Gets all clearances for a specific user
-- =============================================================================
CREATE OR REPLACE FUNCTION get_user_clearances(
    p_user_id UUID
)
RETURNS TABLE(
    id UUID,
    callsign TEXT,
    destination TEXT,
    clearance_text TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cg.id,
        cg.callsign,
        cg.destination,
        cg.clearance_text,
        cg.created_at
    FROM clearance_generations cg
    WHERE cg.user_id = p_user_id
    ORDER BY cg.created_at DESC;
END;
$$;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'ATC24 Database Setup Complete!';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'All tables, functions, and security policies have been created successfully.';
    RAISE NOTICE 'Initial admin user "h.a.s2" has been added.';
    RAISE NOTICE 'Your application should now work correctly.';
    RAISE NOTICE '=============================================================================';
END $$;
```

---

## Old `server.js`

```javascript
const WebSocket = require("ws");
const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Discord OAuth configuration with deployment safety
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/auth/discord/callback` || 'http://localhost:3000/auth/discord/callback';
const SESSION_SECRET = process.env.SESSION_SECRET || 'default_session_secret_change_in_production';

// Log configuration status for debugging deployment issues
console.log('🔧 Environment Configuration:');
console.log(`   PORT: ${process.env.PORT || 3000}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Discord OAuth: ${DISCORD_CLIENT_ID ? '✅ Configured' : '❌ Missing CLIENT_ID'}`);
console.log(`   Supabase: ${process.env.SUPABASE_URL ? '✅ Configured' : '❌ Missing URL'}`);
console.log(`   Redirect URI: ${DISCORD_REDIRECT_URI}`);

const app = express();
const PORT = process.env.PORT || 3000;

// Runtime logs storage for debugging - moved before first usage
let runtimeLogs = [];
const MAX_LOGS = 100; // Keep last 100 log entries to prevent memory issues

// Enhanced logging function - moved before first usage
function logWithTimestamp(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data: data ? JSON.stringify(data) : null,
    id: uuidv4().slice(0, 8)
  };

  // Add to runtime logs with memory safety
  try {
    runtimeLogs.unshift(logEntry);
    if (runtimeLogs.length > MAX_LOGS) {
      runtimeLogs = runtimeLogs.slice(0, MAX_LOGS);
    }
  } catch (error) {
    console.error('Failed to add to runtime logs:', error);
  }

  // Console output with formatting
  const formattedMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  switch(level) {
    case 'error':
      console.error(formattedMessage, data || '');
      break;
    case 'warn':
      console.warn(formattedMessage, data || '');
      break;
    case 'info':
      console.info(formattedMessage, data || '');
      break;
    default:
      console.log(formattedMessage, data || '');
  }
}

// Initialize Supabase client with proper validation and security
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE; // SECURE: Loaded from server environment, not .env file
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // PUBLIC: Safe to be in .env file
let supabase = null;

// The server should ALWAYS use the service role key for admin operations.
// This key MUST be kept secret and set as an environment variable in your hosting platform.
if (supabaseUrl && supabaseServiceKey && supabaseUrl.startsWith('https://')) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    logWithTimestamp('info', 'Supabase admin client initialized successfully using SERVICE_ROLE key.');
  } catch (error) {
    logWithTimestamp('error', 'Failed to initialize Supabase admin client', { error: error.message });
    supabase = null;
  }
} else {
    logWithTimestamp('warn', 'Supabase SERVICE_ROLE key not configured or URL is invalid.');
    logWithTimestamp('error', 'SERVER IS NOT PROPERLY CONFIGURED. Admin operations will fail.');
    if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
        console.log("   ❌ Missing or invalid SUPABASE_URL.");
    }
    if (!supabaseServiceKey) {
        console.log("   ❌ CRITICAL: SUPABASE_SERVICE_ROLE key is not set in the environment.");
        console.log("   For security, this key should NOT be in a .env file. Set it in your hosting provider's secrets/environment variables.");
    }
}

// Validation for the public (anon) key which is sent to the client
if (!supabaseAnonKey) {
    logWithTimestamp('warn', 'SUPABASE_ANON_KEY is not set. Frontend functionality may be limited.');
}

let flightPlans = []; // Store multiple flight plans

// Controller data cache and polling
let controllerCache = {
  data: [],
  lastUpdated: null,
  source: 'cache'
};

async function pollControllers() {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000); // 15 second timeout

  try {
    const response = await fetch('https://24data.ptfs.app/controllers', { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }
    const data = await response.json();
    const filteredData = data.filter(c => c.position && (c.position === 'TWR' || c.position === 'GND'));
    controllerCache = {
      data: filteredData,
      lastUpdated: new Date().toISOString(),
      source: 'live'
    };
    logWithTimestamp('info', 'Fetched controller data successfully', { originalCount: data.length, filteredCount: filteredData.length });
  } catch (error) {
    logWithTimestamp('error', 'Failed to fetch controller data', { error: error.message });
    controllerCache.source = 'stale'; // Mark data as potentially stale
  } finally {
    clearTimeout(timeout);
  }
}

// Poll immediately on startup, then set interval
let controllerPollInterval = null;

function startControllerPolling() {
  if (controllerPollInterval) {
    clearInterval(controllerPollInterval);
  }

  const interval = adminSettings.system.controllerPollInterval || 300000; // Default to 5 minutes
  pollControllers(); // Poll immediately
  controllerPollInterval = setInterval(pollControllers, interval);
  logWithTimestamp('info', `Controller polling started with interval: ${interval}ms`);
}

// Initialize startup log
logWithTimestamp('info', 'ATC24 Server starting up', {
  environment: process.env.VERCEL === '1' ? 'serverless' : 'traditional',
  nodeVersion: process.version,
  timestamp: new Date().toISOString()
});

// Add some initial test logs
logWithTimestamp('info', 'Runtime logs system initialized');
logWithTimestamp('warn', 'This is a test warning log');
logWithTimestamp('error', 'This is a test error log for debugging');

// Analytics storage with serverless persistence
let analytics = {
  totalVisits: 0,
  dailyVisits: {},
  clearancesGenerated: 0,
  flightPlansReceived: 0,
  lastReset: new Date().toISOString()
};

// Initialize analytics from Supabase in serverless environment
async function initializeAnalyticsFromDB() {
  if (supabase) {
    try {
      // Fetch analytics data from Supabase
      const [visitsResult, clearancesResult, flightPlansResult] = await Promise.all([
        supabase.from('page_visits').select('*', { count: 'exact' }),
        supabase.from('clearance_generations').select('*', { count: 'exact' }),
        supabase.from('flight_plans_received').select('*', { count: 'exact' })
      ]);

      analytics.totalVisits = visitsResult.count || 0;
      analytics.clearancesGenerated = clearancesResult.count || 0;
      analytics.flightPlansReceived = flightPlansResult.count || 0;

      // Also calculate daily visits for the last 30 days
      if (visitsResult.data) {
        const dailyVisitsMap = {};
        visitsResult.data.forEach(visit => {
          const date = visit.created_at.split('T')[0];
          dailyVisitsMap[date] = (dailyVisitsMap[date] || 0) + 1;
        });
        analytics.dailyVisits = dailyVisitsMap;
      }

      logWithTimestamp('info', '📊 Analytics initialized from Supabase', {
        totalVisits: analytics.totalVisits,
        clearancesGenerated: analytics.clearancesGenerated,
        flightPlansReceived: analytics.flightPlansReceived,
        dailyVisitDays: Object.keys(analytics.dailyVisits).length
      });
    } catch (error) {
      logWithTimestamp('error', 'Failed to initialize analytics from DB', { error: error.message });
    }
  }
}

// Call initialization for both serverless and traditional environments if Supabase is available
if (supabase) {
  initializeAnalyticsFromDB();
}

// Admin settings with aviation defaults
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
    enableRunwayValidation: false,
    enableSIDValidation: false,
    squawkRanges: {
      min: 1000,
      max: 7777,
      exclude: [7500, 7600, 7700] // Emergency codes
    },
    atisLetters: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]
  },
  system: {
    maxFlightPlansStored: 20,
    enableDetailedLogging: false,
    autoRefreshInterval: 30000,
    enableFlightPlanFiltering: false,
    atisPollInterval: 300000
  }
};

async function initializeAdminSettings() {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('settings')
      .eq('id', 1)
      .single();

    if (error) {
      logWithTimestamp('warn', 'Could not load admin settings from database.', { message: error.message });
      logWithTimestamp('info', 'Using default in-memory settings. They will be saved on first edit.');
      return;
    }

    if (data && data.settings) {
      const dbSettings = data.settings;
      Object.keys(dbSettings).forEach(key => {
          if(adminSettings.hasOwnProperty(key) && typeof adminSettings[key] === 'object' && adminSettings[key] !== null && !Array.isArray(adminSettings[key])) {
              adminSettings[key] = { ...adminSettings[key], ...dbSettings[key] };
          } else {
              adminSettings[key] = dbSettings[key];
          }
      });
      logWithTimestamp('info', '⚙️ Admin settings loaded from Supabase.');
    }
  } catch (error) {
    logWithTimestamp('error', 'Failed to initialize admin settings', { error: error.message });
  }
  // Start polling after settings are loaded
  logWithTimestamp('info', 'Admin settings initialized. Starting controller and ATIS polling...');
  startControllerPolling();
  startAtisPolling();
}

// Call initialization
logWithTimestamp('info', 'Initializing admin settings...');
initializeAdminSettings();

// Session tracking with serverless cleanup
const sessions = new Map();

// Clean up old sessions periodically (important for serverless)
function cleanupOldSessions() {
  try {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleanedCount = 0;

    for (const [sessionId, session] of sessions.entries()) {
      if (session && session.lastActivity && (now - session.lastActivity > maxAge)) {
        sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logWithTimestamp('info', `Cleaned up ${cleanedCount} old sessions`, {
        totalSessions: sessions.size,
        cleanedSessions: cleanedCount
      });
    }
  } catch (error) {
    logWithTimestamp('error', 'Session cleanup failed', { error: error.message });
  }
}

// Run cleanup every 5 minutes with error handling
setInterval(() => {
  try {
    cleanupOldSessions();
  } catch (error) {
    logWithTimestamp('error', 'Session cleanup interval failed', { error: error.message });
  }
}, 5 * 60 * 1000);

// Helper function to get or create session with unified handling
function getOrCreateSession(req) {
  try {
    // Try multiple ways to get session ID with better validation
    let sessionId = req.headers['x-session-id'] ||
                   req.headers['session-id'] ||
                   req.query.sessionId ||
                   req.session?.id ||
                   req.trackingSession?.id;

    // Generate new session ID if none found
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      sessionId = uuidv4();
    }

    // Enhanced session ID validation - handle both UUID and shorter formats
    if (!sessionId.match(/^[a-f0-9\-]{8,36}$/i)) {
      logWithTimestamp('warn', 'Invalid session ID format, generating new one', {
        invalidIdLength: sessionId ? sessionId.length : 0,
        invalidId: sessionId ? sessionId.slice(0, 10) + '...' : 'null',
        ip: req.ip || 'unknown'
      });
      sessionId = uuidv4();
    }

    // Ensure full UUID format
    if (sessionId.length < 36 && sessionId.match(/^[a-f0-9]{8}$/i)) {
      // Convert 8-character hex to full UUID format for consistency
      const fullUuid = uuidv4();
      sessionId = sessionId + fullUuid.slice(8);
      logWithTimestamp('info', 'Extended short session ID to full UUID', {
        originalLength: 8,
        newId: sessionId.slice(0, 8) + '...',
        ip: req.ip || 'unknown'
      });
    }

    // Create session if it doesn't exist
    if (!sessions.has(sessionId)) {
      const newSession = {
        id: sessionId,
        createdAt: new Date(),
        lastActivity: new Date(),
        pageViews: 0,
        clearancesGenerated: 0,
        // Add user info if authenticated
        user_id: req.session?.user?.id || null,
        discord_username: req.session?.user?.username || null
      };

      sessions.set(sessionId, newSession);

      logWithTimestamp('info', 'New session created', {
        sessionId: sessionId.slice(0, 8),
        totalSessions: sessions.size,
        authenticated: !!req.session?.user,
        username: req.session?.user?.username || 'anonymous',
        ip: req.ip || 'unknown'
      });
    }

    // Update session activity and sync user info if authenticated
    const session = sessions.get(sessionId);
    session.lastActivity = new Date();

    // Sync authenticated user info to tracking session
    if (req.session?.user && !session.user_id) {
      session.user_id = req.session.user.id;
      session.discord_username = req.session.user.username;
    }

    return session;

  } catch (error) {
    logWithTimestamp('error', 'Error in getOrCreateSession, creating fallback session', {
      error: error.message,
      ip: req.ip || 'unknown'
    });

    // Fallback: create a basic session
    const fallbackId = uuidv4();
    const fallbackSession = {
      id: fallbackId,
      createdAt: new Date(),
      lastActivity: new Date(),
      pageViews: 0,
      clearancesGenerated: 0
    };

    sessions.set(fallbackId, fallbackSession);
    return fallbackSession;
  }
}

// Analytics helper functions
async function trackPageVisit(req, pagePath) {
  try {
    const session = getOrCreateSession(req);
    const isFirstVisit = session.pageViews === 0;
    session.pageViews++;

    // Extract real IP address from various headers (useful for proxies/load balancers)
    const getRealIP = (req) => {
      try {
        return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               req.connection?.remoteAddress ||
               req.socket?.remoteAddress ||
               req.ip ||
               'unknown';
      } catch (error) {
        logWithTimestamp('warn', 'Failed to extract IP address', { error: error.message });
        return 'unknown';
      }
    };

    const visitData = {
      page_path: pagePath,
      user_agent: req.headers['user-agent'] || 'Unknown',
      referrer: req.headers.referer || null,
      session_id: session.id,
      is_first_visit: isFirstVisit,
      user_id: req.session?.user?.id || null,
      discord_username: req.session?.user?.username || null
    };

    // Track in local analytics for fallback (always do this first)
    const today = new Date().toISOString().split('T')[0];
    analytics.totalVisits++;
    analytics.dailyVisits[today] = (analytics.dailyVisits[today] || 0) + 1;

    // Log visitor activity
    logWithTimestamp('info', `Page visit tracked`, {
      path: pagePath,
      sessionId: session.id.slice(0, 8),
      isFirstVisit,
      totalVisits: analytics.totalVisits,
      todayVisits: analytics.dailyVisits[today],
      ip: getRealIP(req)
    });

    // Store in Supabase if available (don't let failures here affect the main app)
    if (supabase) {
      try {
        // Insert page visit
        const { error: visitError } = await supabase.from('page_visits').insert(visitData);
        if (visitError) {
          throw new Error(`Page visit insert failed: ${visitError.message}`);
        }

        // Use unified session management RPC
        const { data: sessionResult, error: sessionError } = await supabase.rpc('upsert_user_session', {
          p_session_id: session.id,
          p_user_id: session.user_id || visitData.user_id || null,
          p_user_agent: visitData.user_agent,
          p_ip_address: getRealIP(req),
          p_page_views: session.pageViews,
          p_clearances_generated: session.clearancesGenerated || 0
        });

        if (sessionError) {
          throw new Error(`Session upsert failed: ${sessionError.message}`);
        }

      } catch (error) {
        logWithTimestamp('error', 'Failed to track page visit in Supabase', {
          error: error.message,
          sessionId: session.id.slice(0, 8),
          path: pagePath
        });
        // Continue execution - don't let Supabase errors break the app
      }
    }

    return { success: true, session, visitData };

  } catch (error) {
    logWithTimestamp('error', 'Critical error in trackPageVisit', {
      error: error.message,
      path: pagePath,
      stack: error.stack
    });
    // Even if tracking fails, don't break the request
    return { success: false, error: error.message };
  }
}

async function trackClearanceGeneration(req, clearanceData) {
  try {
    const session = getOrCreateSession(req);
    session.clearancesGenerated = (session.clearancesGenerated || 0) + 1;

    // Track in local analytics for fallback (always do this first)
    analytics.clearancesGenerated++;

    // Extract real IP address
    const getRealIP = (req) => {
      return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
             req.headers['x-real-ip'] ||
             req.connection?.remoteAddress ||
             req.socket?.remoteAddress ||
             req.ip ||
             'unknown';
    };

    // Prepare clearance data matching the database schema
    const enhancedClearanceData = {
      session_id: session.id,
      ip_address: getRealIP(req),
      user_agent: req.headers['user-agent'] || 'Unknown',
      callsign: clearanceData?.callsign || null,
      destination: clearanceData?.destination || null,
      route: clearanceData?.route || null,
      runway: clearanceData?.runway || null,
      squawk_code: clearanceData?.squawk_code || clearanceData?.squawk || null,
      flight_level: clearanceData?.flight_level || clearanceData?.flightLevel || null,
      atis_letter: clearanceData?.atis_letter || clearanceData?.atis || null,
      clearance_text: clearanceData?.clearance_text || clearanceData?.clearance || null,
      timestamp: new Date().toISOString(),
      user_id: req.session?.user?.id || clearanceData.user_id || null,
      discord_username: req.session?.user?.username || clearanceData.discord_username || null
    };

    logWithTimestamp('info', 'Clearance generation tracked', {
      sessionId: session.id.slice(0, 8),
      callsign: clearanceData?.callsign || 'Unknown',
      totalClearances: analytics.clearancesGenerated,
      sessionClearances: session.clearancesGenerated
    });

    // Store in Supabase if available (don't let failures here affect the main app)
    if (supabase) {
      try {
        // Insert clearance generation record
        const { error: clearanceError } = await supabase
          .from('clearance_generations')
          .insert(enhancedClearanceData);

        if (clearanceError) {
          throw new Error(`Clearance insert failed: ${clearanceError.message}`);
        }

        // Update session clearance count using unified RPC
        const { data: sessionResult, error: sessionError } = await supabase.rpc('upsert_user_session', {
          p_session_id: session.id,
          p_user_id: session.user_id || enhancedClearanceData.user_id || null,
          p_user_agent: req.headers['user-agent'] || 'Unknown',
          p_ip_address: getRealIP(req),
          p_clearances_generated: session.clearancesGenerated
        });

        if (sessionError) {
          throw new Error(`Session upsert failed: ${sessionError.message}`);
        }

      } catch (error) {
        logWithTimestamp('error', 'Failed to track clearance generation in Supabase', {
          error: error.message,
          sessionId: session.id.slice(0, 8),
          clearanceData: enhancedClearanceData
        });
        // Return failure so the client can be notified
        return { success: false, error: 'Failed to log clearance to database.' };
      }
    }

    return { success: true, session, clearanceData: enhancedClearanceData };

  } catch (error) {
    logWithTimestamp('error', 'Critical error in trackClearanceGeneration', {
      error: error.message,
      clearanceData: clearanceData,
      stack: error.stack
    });
    // Even if tracking fails, don't break the request
    return { success: false, error: error.message };
  }
}

async function trackFlightPlanReceived(flightPlanData) {
  // Track in local analytics for fallback
  analytics.flightPlansReceived++;

  // Store in Supabase if available
  if (supabase) {
    try {
      await supabase.from('flight_plans_received').insert({
        callsign: flightPlanData.callsign,
        destination: flightPlanData.arriving,
        route: flightPlanData.route,
        flight_level: flightPlanData.flightlevel,
        source: flightPlanData.source,
        raw_data: flightPlanData
      });
    } catch (error) {
      console.error('Failed to track flight plan in Supabase:', error);
    }
  }
}

// Middleware to track visits with error handling
async function trackVisit(req, res, next) {
  try {
    await trackPageVisit(req, req.path);
  } catch (error) {
    logWithTimestamp('error', 'Visit tracking failed in middleware', {
      error: error.message,
      path: req.path
    });
    // Don't block the request if tracking fails
  }
  next();
}

// Discord OAuth helper functions
function generateDiscordAuthURL() {
  const scope = 'identify';
  const state = uuidv4();
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: scope,
    state: state
  });

  return {
    url: `https://discord.com/api/oauth2/authorize?${params.toString()}`,
    state: state
  };
}

async function exchangeCodeForToken(code) {
  const data = {
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: DISCORD_REDIRECT_URI
  };

  logWithTimestamp('info', 'Discord token exchange attempt', {
    redirect_uri: DISCORD_REDIRECT_URI,
    client_id: DISCORD_CLIENT_ID ? 'configured' : 'missing',
    code_length: code ? code.length : 0
  });

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(data)
  });

  if (!response.ok) {
    const errorText = await response.text();
    logWithTimestamp('error', 'Discord token exchange failed', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      redirect_uri: DISCORD_REDIRECT_URI
    });
    throw new Error(`Discord token exchange failed: ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

async function getDiscordUser(accessToken) {
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Discord user fetch failed: ${response.statusText}`);
  }

  return await response.json();
}

async function createOrUpdateUser(discordUser, tokenData, vatsimData = {}) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const avatar = discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null;

  // Use the new, more comprehensive RPC function
  const { data, error } = await supabase.rpc('upsert_discord_user', {
    p_discord_id: discordUser.id,
    p_username: discordUser.username,
    p_discriminator: discordUser.discriminator,
    p_email: discordUser.email,
    p_avatar: avatar,
    p_access_token: tokenData.access_token,
    p_refresh_token: tokenData.refresh_token,
    p_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    p_vatsim_cid: vatsimData.cid || null
  });

  if (error) {
    logWithTimestamp('error', 'Database user upsert failed', { error: error.message, discord_id: discordUser.id });
    throw new Error(`Database user creation/update failed: ${error.message}`);
  }

  // After creating/updating the user, set their controller status
  if (supabase && data && data[0] && vatsimData.isController) {
    await supabase.rpc('set_user_controller_status', {
        p_user_id: data[0].id,
        p_is_controller: vatsimData.isController
    });
    // Add the controller status to the returned user object
    data[0].is_controller = vatsimData.isController;
  }

  return data[0];
}

// Discord authentication middleware
function requireDiscordAuth(req, res, next) {
  const user = req.session?.user;
  if (!user || !user.discord_id) {
    return res.status(401).json({
      error: 'Discord authentication required',
      loginUrl: '/auth/discord'
    });
  }
  req.user = user;
  next();
}

// Optional Discord authentication (doesn't block if not authenticated)
function optionalDiscordAuth(req, res, next) {
  const user = req.session?.user;
  if (user && user.discord_id) {
    req.user = user;
  }
  next();
}

// Simple session store (in production, use Redis or database)
const sessionStore = new Map();

// Session cleanup for memory management
function cleanupExpiredSessions() {
  try {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleanedCount = 0;

    for (const [sessionId, session] of sessionStore.entries()) {
      if (session && session.lastActivity && (now - session.lastActivity > maxAge)) {
        sessionStore.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logWithTimestamp('info', `Cleaned up ${cleanedCount} expired OAuth sessions`);
    }
  } catch (error) {
    logWithTimestamp('error', 'OAuth session cleanup failed', { error: error.message });
  }
}

// Run OAuth session cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// WebSocket connection - only initialize if not in serverless environment
let ws = null;

function initializeWebSocket() {
  if (process.env.VERCEL !== '1' && !ws) {
    try {
      logWithTimestamp('info', 'Attempting WebSocket connection to 24data.ptfs.app...');

      // Set a connection timeout to prevent hanging during deployment
      const connectionTimeout = setTimeout(() => {
        if (ws && ws.readyState === WebSocket.CONNECTING) {
          logWithTimestamp('warn', 'WebSocket connection timeout, terminating attempt');
          ws.terminate();
          ws = null;
        }
      }, 10000); // 10 second timeout

      ws = new WebSocket("wss://24data.ptfs.app/wss", {
        headers: { Origin: "" } // Required as per docs
      });

      ws.on("open", () => {
        clearTimeout(connectionTimeout);
        logWithTimestamp('info', 'WebSocket connected to 24data.ptfs.app');
      });
      ws.on("message", async (data) => {
        try {
          const parsed = JSON.parse(data);

          // Handle both regular and event flight plans
          if (parsed.t === "FLIGHT_PLAN" || parsed.t === "EVENT_FLIGHT_PLAN") {
            const flightPlan = parsed.d;

            // Add timestamp and source info
            flightPlan.timestamp = new Date().toISOString();
            flightPlan.source = parsed.t === "EVENT_FLIGHT_PLAN" ? "Event" : "Main";

            // Track analytics in Supabase
            await trackFlightPlanReceived(flightPlan);

            // Add new flight plan to array, respecting the configured limit
            flightPlans.unshift(flightPlan);
            const limit = adminSettings.system.maxFlightPlansStored || 20;
            if (flightPlans.length > limit) {
              flightPlans = flightPlans.slice(0, limit);
            }

            logWithTimestamp('info', `Received ${flightPlan.source} flight plan`, {
              callsign: flightPlan.callsign,
              destination: flightPlan.arriving,
              route: flightPlan.route
            });

            // Log detailed data only if the setting is enabled
            if (adminSettings.system.enableDetailedLogging) {
              logWithTimestamp('debug', `Detailed flight plan data for ${flightPlan.callsign}`, flightPlan);
            }
          }
          // Also handle METAR data to extract runway information
          if (parsed.t === "METAR") {
            const metarData = parsed.d;
            // You can process metarData here to extract active runways
            // For simplicity, we'll just store the raw METAR for now,
            // and the frontend will ideally parse it or a separate function
            // would extract relevant info.
            // A more robust solution would involve parsing the METAR string
            // to identify active runways, e.g., using regex for "R/XXXX" or similar patterns.
            // For this specific fix, the client-side `updateRunwayOptions`
            // expects a text input that it parses.
            // A more direct way to send this to the frontend for parsing would be:
            // flightPlans.metar = metarData.raw; // Or some processed runway info
          }
        } catch (err) {
          logWithTimestamp('error', 'WebSocket message parse error', { error: err.message, data: data.toString() });
        }
      });

      ws.on("error", (err) => {
        logWithTimestamp('error', 'WebSocket connection error', {
          error: err.message,
          code: err.code,
          errno: err.errno,
          syscall: err.syscall
        });

        // Clean up WebSocket reference on error
        ws = null;

        // Attempt to reconnect after 10 seconds if not in serverless
        if (process.env.VERCEL !== '1') {
          logWithTimestamp('info', 'Scheduling WebSocket reconnection in 10 seconds due to error');
          setTimeout(initializeWebSocket, 10000);
        }
      });

      ws.on("close", (code, reason) => {
        logWithTimestamp('warn', 'WebSocket connection closed', {
          code,
          reason: reason?.toString(),
          timestamp: new Date().toISOString()
        });

        // Clean up WebSocket reference
        ws = null;

        // Attempt to reconnect after 5 seconds if not in serverless and not a clean close
        if (process.env.VERCEL !== '1' && code !== 1000) {
          logWithTimestamp('info', 'Scheduling WebSocket reconnection in 5 seconds');
          setTimeout(initializeWebSocket, 5000);
        }
      });
    } catch (error) {
      logWithTimestamp('error', 'Failed to initialize WebSocket', { error: error.message });
    }
  }
}

// Initialize WebSocket connection asynchronously (don't block server startup)
setTimeout(() => {
  logWithTimestamp('info', 'Starting delayed WebSocket initialization...');
  initializeWebSocket();
}, 2000); // Wait 2 seconds after server starts

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Cookie parser middleware (simple implementation)
app.use((req, res, next) => {
  req.cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        req.cookies[name] = decodeURIComponent(value);
      }
    });
  }
  next();
});

// Unified session middleware
app.use((req, res, next) => {
  // Try to get session ID from various sources
  const sessionId = req.headers['x-session-id'] ||
                   req.headers['authorization']?.replace('Bearer ', '') ||
                   req.query.sessionId;

  // Check both session stores for authenticated and anonymous sessions
  if (sessionId) {
    // First check OAuth session store (for authenticated users)
    if (sessionStore.has(sessionId)) {
      req.session = sessionStore.get(sessionId);
      req.session.lastActivity = new Date();
      sessionStore.set(sessionId, req.session);
    }
    // Also check anonymous session store (for tracking purposes)
    if (sessions.has(sessionId)) {
      req.trackingSession = sessions.get(sessionId);
      req.trackingSession.lastActivity = new Date();
      sessions.set(sessionId, req.trackingSession);
    }
  }

  next();
});

// Serve the frontend HTML with tracking BEFORE static middleware
app.get("/", trackVisit, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve the license page
app.get("/license", trackVisit, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "license.html"));
});

// Serve the maintenance page
app.get("/maintenance", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "maintenance.html"));
});

// Serve admin panel (don't track admin visits to avoid skewing analytics)
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Serve static files (like styles.css) from a 'public' directory
// This must come AFTER specific route handlers to avoid bypassing tracking
app.use(express.static('public'));


// ATIS data cache and polling
let atisCache = {
  data: [],
  lastUpdated: null,
  source: 'cache'
};

async function pollAtis() {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000); // 15 second timeout

  try {
    const response = await fetch('https://24data.ptfs.app/atis', { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }
    const data = await response.json();
    atisCache = {
      data: data,
      lastUpdated: new Date().toISOString(),
      source: 'live'
    };
    logWithTimestamp('info', 'Fetched ATIS data successfully', { count: data.length });
  } catch (error) {
    logWithTimestamp('error', 'Failed to fetch ATIS data', { error: error.message });
    atisCache.source = 'stale'; // Mark data as potentially stale
  } finally {
    clearTimeout(timeout);
  }
}

// Poll ATIS data on startup and then at a configurable interval
let atisPollInterval = null;

function startAtisPolling() {
  if (atisPollInterval) {
    clearInterval(atisPollInterval);
  }

  const interval = adminSettings.system.atisPollInterval || 300000; // Default to 5 minutes
  pollAtis(); // Poll immediately
  atisPollInterval = setInterval(pollAtis, interval);
  logWithTimestamp('info', `ATIS polling started with interval: ${interval}ms`);
}

// REST: Get all online controllers
app.get("/controllers", (req, res) => {
  res.json(controllerCache);
});

// REST: Get all ATIS data
app.get("/api/atis", (req, res) => {
  res.json(atisCache);
});

// API endpoint for leaderboard
app.get("/api/leaderboard", async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: "Database not configured" });
  }
  try {
    const { data, error } = await supabase.rpc('get_clearance_leaderboard');
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint for user's clearances
app.get("/api/user/clearances", requireDiscordAuth, async (req, res) => {
  if (!
