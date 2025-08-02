const WebSocket = require("ws");
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

let flightPlans = []; // Store multiple flight plans

// Connect to WebSocket
const ws = new WebSocket("wss://24data.ptfs.app/wss", {
  headers: { Origin: "" } // Required as per docs
});

ws.on("open", () => console.log("✅ WebSocket connected"));
ws.on("message", (data) => {
  try {
    const parsed = JSON.parse(data);

    // Handle both regular and event flight plans
    if (parsed.t === "FLIGHT_PLAN" || parsed.t === "EVENT_FLIGHT_PLAN") {
      const flightPlan = parsed.d;

      // Add timestamp and source info
      flightPlan.timestamp = new Date().toISOString();
      flightPlan.source = parsed.t === "EVENT_FLIGHT_PLAN" ? "Event" : "Main";

      // Add new flight plan to array, keep last 20
      flightPlans.unshift(flightPlan);
      if (flightPlans.length > 20) {
        flightPlans = flightPlans.slice(0, 20);
      }

      console.log(`📡 Received ${flightPlan.source} FlightPlan:`, flightPlan.callsign);
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
    console.error("❌ Parse error:", err);
  }
});

ws.on("error", (err) => {
  console.error("❌ WebSocket error:", err);
});

ws.on("close", () => {
  console.log("❌ WebSocket connection closed");
});

app.use(cors());
app.use(express.json());

// Serve the frontend HTML
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>ATC IFR Clearance Generator</title>
  <link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary-color: #f5de40;
      --background-color: #0a0a0a;
      --surface-color: #151515;
      --surface-hover: #1f1f1f;
      --border-color: #333;
      --text-color: #e5e5e5;
      --text-muted: #a0a0a0;
      --shadow: 0 4px 20px rgba(0,0,0,0.3);
      --shadow-hover: 0 8px 30px rgba(245, 222, 64, 0.15);
    }
    
    * { 
      box-sizing: border-box; 
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Funnel Display', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--background-color);
      color: var(--text-color);
      line-height: 1.6;
      padding: 20px;
      min-height: 100vh;
    }
    
    .container { 
      max-width: 1400px; 
      margin: 0 auto; 
      animation: fadeIn 0.6s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 2px solid var(--border-color);
      position: relative;
      overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      width: 0;
      height: 2px;
      background: var(--primary-color);
      transform: translateX(-50%);
      animation: expandLine 1s ease-out 0.5s forwards;
    }
    
    @keyframes expandLine {
      to { width: 100px; }
    }
    
    .header h1 {
      color: var(--primary-color);
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, var(--primary-color), #ffd700);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .main-grid {
      display: grid;
      grid-template-columns: 1fr 420px;
      gap: 30px;
      margin-bottom: 30px;
    }
    
    @media (max-width: 1024px) {
      .main-grid {
        grid-template-columns: 1fr;
        gap: 20px;
      }
    }
    
    .section {
      background: var(--surface-color);
      border-radius: 16px;
      padding: 30px;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    
    .section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--primary-color), transparent);
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .section:hover::before {
      opacity: 1;
    }
    
    .section:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-hover);
      border-color: rgba(245, 222, 64, 0.3);
    }
    
    .section-title {
      color: var(--primary-color);
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 1px solid var(--border-color);
      position: relative;
    }
    
    .flight-plans {
      max-height: 500px;
      overflow-y: auto;
      padding-right: 5px;
    }
    
    .flight-plan {
      background: var(--surface-hover);
      border: 2px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 15px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    
    .flight-plan::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(245, 222, 64, 0.1), transparent);
      transition: left 0.5s ease;
    }
    
    .flight-plan:hover::before {
      left: 100%;
    }
    
    .flight-plan:hover {
      border-color: var(--primary-color);
      background: rgba(245, 222, 64, 0.05);
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 10px 25px rgba(245, 222, 64, 0.2);
    }
    
    .flight-plan.selected {
      border-color: var(--primary-color);
      background: rgba(245, 222, 64, 0.1);
      box-shadow: 0 0 20px rgba(245, 222, 64, 0.3);
      transform: scale(1.02);
    }
    
    .flight-plan-callsign {
      font-size: 18px;
      font-weight: 700;
      color: var(--primary-color);
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }
    
    .flight-plan-details {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    
    .config-group {
      margin-bottom: 25px;
      animation: slideInUp 0.4s ease-out;
      animation-fill-mode: both;
    }
    
    .config-group:nth-child(1) { animation-delay: 0.1s; }
    .config-group:nth-child(2) { animation-delay: 0.2s; }
    .config-group:nth-child(3) { animation-delay: 0.3s; }
    .config-group:nth-child(4) { animation-delay: 0.4s; }
    
    @keyframes slideInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .config-label {
      display: block;
      color: var(--primary-color);
      font-weight: 600;
      margin-bottom: 10px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    select, textarea, input[type="text"] {
      width: 100%;
      padding: 15px;
      background: var(--surface-hover);
      border: 2px solid var(--border-color);
      border-radius: 10px;
      color: var(--text-color);
      font-size: 14px;
      font-family: inherit;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    select:focus, textarea:focus, input[type="text"]:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(245, 222, 64, 0.1);
      background: rgba(245, 222, 64, 0.02);
      transform: translateY(-1px);
    }
    
    textarea {
      resize: vertical;
      font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
      line-height: 1.6;
      min-height: 120px;
    }
    
    input[type="text"]::placeholder {
      color: var(--text-muted);
      font-style: italic;
    }
    
    .generate-btn {
      width: 100%;
      padding: 18px;
      background: linear-gradient(135deg, var(--primary-color), #ffd700);
      border: none;
      border-radius: 12px;
      color: #000;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      position: relative;
      overflow: hidden;
    }
    
    .generate-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s ease;
    }
    
    .generate-btn:hover::before {
      left: 100%;
    }
    
    .generate-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 30px rgba(245, 222, 64, 0.4);
    }
    
    .generate-btn:active {
      transform: translateY(-1px);
    }
    
    .generate-btn:disabled {
      background: #444;
      color: #888;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
    
    .clearance-output {
      background: var(--background-color);
      border: 2px solid var(--primary-color);
      border-radius: 16px;
      padding: 30px;
      font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
      font-size: 16px;
      line-height: 1.8;
      color: var(--primary-color);
      white-space: pre-wrap;
      min-height: 180px;
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 2px 10px rgba(0,0,0,0.3);
    }
    
    .clearance-output::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(circle at 20% 80%, rgba(245, 222, 64, 0.03) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(245, 222, 64, 0.03) 0%, transparent 50%);
      pointer-events: none;
    }
    
    .no-plans {
      text-align: center;
      color: var(--text-muted);
      padding: 60px 20px;
      font-style: italic;
      font-size: 16px;
    }
    
    .refresh-btn {
      background: var(--surface-hover);
      border: 2px solid var(--border-color);
      color: var(--primary-color);
      padding: 12px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 20px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .refresh-btn:hover {
      background: var(--primary-color);
      color: #000;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(245, 222, 64, 0.3);
    }
    
    /* Custom Scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: var(--surface-color);
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb {
      background: var(--border-color);
      border-radius: 4px;
      transition: background 0.3s ease;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: var(--primary-color);
    }
    
    /* Loading Animation */
    .loading {
      position: relative;
    }
    
    .loading::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 20px;
      height: 20px;
      margin: -10px 0 0 -10px;
      border: 2px solid var(--border-color);
      border-top: 2px solid var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>ATC IFR Clearance Generator</h1>
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
        <label class="config-label">Departure runway</label>
        <input type="text" id="departureRunway" placeholder="e.g., 25L">
      </div>

      <div class="config-group">
        <label class="config-label">IFL (Initial Flight Level)</label>
        <select id="ifl">
          <option>1000</option>
          <option>2000</option>
          <option>3000</option>
          <option>4000</option>
        </select>
      </div>

      <button class="generate-btn" onclick="generateClearance()" id="generateBtn" disabled>
        Generate IFR Clearance
      </button>
    </div>
  </div>

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

  function generateSquawk() {
    while (true) {
      let code = Math.floor(1000 + Math.random() * 6777).toString();
      // Ensure all digits are between 0-7 for octal squawk code
      if ([...code].every(c => parseInt(c) <= 7)) return code;
    }
  }

  // Removed updateRunwayOptions function as it's no longer needed.
  // function updateRunwayOptions() {
  //   const activeRunwaysInput = document.getElementById("activeRunways");
  //   const departureRunwayInput = document.getElementById("departureRunway");
  //   const activeRunwaysText = activeRunwaysInput.value;
  //   
  //   const allRunways = new Set();
  //   
  //   // Match both Arrival and Departure runways from Active Runways text
  //   const arrivalMatch = activeRunwaysText.match(/Arrival Runway\\s*(?:\\(s\\))?\\s*:\\s*\\(([^)]+)\\)/i);
  //   const departureMatch = activeRunwaysText.match(/Departure Runway\\s*(?:\\(s\\))?\\s*:\\s*\\(([^)]+)\\)/i);
  //   
  //   // Process arrival runways
  //   if (arrivalMatch && arrivalMatch[1]) {
  //     const runways = arrivalMatch[1].split(/[,\/]|\s+and\s+/i)
  //       .map(runway => runway.trim())
  //       .filter(runway => runway.length > 0);
  //     runways.forEach(runway => allRunways.add(runway));
  //   }
  //   
  //   // Process departure runways
  //   if (departureMatch && departureMatch[1]) {
  //     const runways = departureMatch[1].split(/[,\/]|\s+and\s+/i)
  //       .map(runway => runway.trim())
  //       .filter(runway => runway.length > 0);
  //     runways.forEach(runway => allRunways.add(runway));
  //   }
  //   
  //   // Update the departure runway input placeholder if runways found
  //   if (allRunways.size > 0) {
  //     const runwayList = Array.from(allRunways).sort().join(', ');
  //     departureRunwayInput.placeholder = \`Available: \${runwayList}\`;
  //   } else {
  //     departureRunwayInput.placeholder = "e.g., 25L"; // Reset if no runways found
  //   }
  // }

  async function loadFlightPlans() {
    try {
      // Add loading state
      const flightPlansContainer = document.getElementById("flightPlans");
      flightPlansContainer.innerHTML = '<div class="no-plans loading">Loading flight plans...</div>';

      const res = await fetch("/flight-plans");
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
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
        <div class="flight-plan-callsign">${plan.callsign || 'Unknown'}</div>
        <div class="flight-plan-details">
          Destination: ${plan.arriving || 'N/A'}<br>
          Route: ${plan.route || 'GPS Direct'}<br>
          FL: ${plan.flightlevel || 'N/A'}<br>
          Source: ${plan.source || 'Main'}
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

    const ifl = document.getElementById("ifl").value;
    const departureRW = document.getElementById("departureRunway").value.trim();
    const squawk = generateSquawk();
    
    // Get FL from flight plan
    const flightLevel = selectedFlightPlan.flightlevel || 'N/A';

    // Validate departure runway input
    if (!departureRW) {
      alert('Please enter a Departure Runway.');
      return;
    }

    const clearance = `${selectedFlightPlan.callsign || 'UNKNOWN'} cleared IFR to ${selectedFlightPlan.arriving || 'destination'} Via ${selectedFlightPlan.route || 'GPS direct'}. Departure runway is ${departureRW}. Climb IFL ${ifl}. FL is ${flightLevel}. Squawking is ${squawk}.`;

    document.getElementById("clearanceOutput").textContent = clearance;
  }
  
  // Initial load of flight plans when the page loads
  document.addEventListener('DOMContentLoaded', () => {
    loadFlightPlans();
    // No need to call updateRunwayOptions here, it's called oninput for the textarea
  });
</script>

</body>
</html>`);
});

// REST: Get all flight plans
app.get("/flight-plans", (req, res) => {
  res.json(flightPlans);
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    wsConnected: ws.readyState === WebSocket.OPEN,
    flightPlansCount: flightPlans.length
  });
});

app.listen(PORT, () => console.log(`🌐 Server running at http://localhost:${PORT}`));
