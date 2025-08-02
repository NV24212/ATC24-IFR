const WebSocket = require("ws"); // Keep this one
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
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 20px;
      background: #000000;
      color: #f5de40;
      line-height: 1.4;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #333;
    }
    .header h1 {
      color: #f5de40;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .main-grid {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 30px;
      margin-bottom: 30px;
    }
    .section {
      background: #1a1a1a;
      border-radius: 8px;
      padding: 20px;
      border: 1px solid #333;
    }
    .section-title {
      color: #f5de40;
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 1px solid #333;
    }
    .flight-plans {
      max-height: 400px;
      overflow-y: auto;
    }
    .flight-plan {
      background: #2a2a2a;
      border: 2px solid #444;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .flight-plan:hover {
      border-color: #f5de40;
      background: #333;
    }
    .flight-plan.selected {
      border-color: #f5de40;
      background: #3a3a2a;
      box-shadow: 0 0 10px rgba(245, 222, 64, 0.3);
    }
    .flight-plan-callsign {
      font-size: 16px;
      font-weight: bold;
      color: #f5de40;
      margin-bottom: 5px;
    }
    .flight-plan-details {
      font-size: 14px;
      color: #ccc;
    }
    .config-group {
      margin-bottom: 20px;
    }
    .config-label {
      display: block;
      color: #f5de40;
      font-weight: 600;
      margin-bottom: 8px;
    }
    select, textarea {
      width: 100%;
      padding: 10px;
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 4px;
      color: #f5de40;
      font-size: 14px;
    }
    select:focus, textarea:focus {
      outline: none;
      border-color: #f5de40;
      box-shadow: 0 0 5px rgba(245, 222, 64, 0.3);
    }
    textarea {
      resize: vertical;
      font-family: 'Courier New', monospace;
      line-height: 1.3;
    }
    .generate-btn {
      width: 100%;
      padding: 12px;
      background: #f5de40;
      border: none;
      border-radius: 6px;
      color: #000;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .generate-btn:hover {
      background: #e6c938;
      transform: translateY(-1px);
    }
    .generate-btn:disabled {
      background: #666;
      color: #999;
      cursor: not-allowed;
      transform: none;
    }
    .clearance-output {
      background: #000000;
      border: 2px solid #f5de40;
      border-radius: 8px;
      padding: 20px;
      font-family: 'Courier New', monospace;
      font-size: 16px;
      line-height: 1.5;
      color: #f5de40;
      white-space: pre-wrap;
      min-height: 150px;
    }
    .no-plans {
      text-align: center;
      color: #999;
      padding: 40px;
      font-style: italic;
    }
    .refresh-btn {
      background: #2a2a2a;
      border: 1px solid #444;
      color: #f5de40;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-bottom: 15px;
    }
    .refresh-btn:hover {
      background: #333;
    }
    ::-webkit-scrollbar {
      width: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #2a2a2a;
    }
    ::-webkit-scrollbar-thumb {
      background: #444;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #666;
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
        <label class="config-label">Departure Runway</label>
        <select id="runway">
          <option value="">Select Runway</option>
        </select>
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

      <div class="config-group">
        <label class="config-label">ATIS Information</label>
        <textarea id="atis" rows="8" onchange="updateRunwayOptions()" oninput="updateRunwayOptions()">∎ (IRFD ATIS Information A) ∎
Controller Callsign: (IRFD_GND)
Aerodrome: IRFD
Max Taxi Speed: 25KTS
Arrival Runway(s): (25C)
Departure Runway(s): (25L)
QNH: 1013</textarea>
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
  let flightPlans = [];

  function generateSquawk() {
    while (true) {
      let code = Math.floor(1000 + Math.random() * 6777).toString();
      if ([...code].every(c => parseInt(c) <= 7)) return code;
    }
  }

  async function loadFlightPlans() {
    try {
      const res = await fetch("/flight-plans");
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      flightPlans = await res.json();
      displayFlightPlans();
    } catch (err) {
      console.error("Failed to load flight plans:", err);
      document.getElementById("flightPlans").innerHTML =
        '<div class="no-plans">Failed to connect to server...</div>';
    }
  }

  function displayFlightPlans() {
    const container = document.getElementById("flightPlans");

    if (flightPlans.length === 0) {
      container.innerHTML = '<div class="no-plans">No flight plans received yet...</div>';
      return;
    }

    container.innerHTML = flightPlans.map((plan, index) => \`
      <div class="flight-plan" onclick="selectFlightPlan(\${index})">
        <div class="flight-plan-callsign">\${plan.callsign || 'Unknown'}</div>
        <div class="flight-plan-details">
          Destination: \${plan.arriving || 'N/A'}<br>
          Route: \${plan.route || 'GPS Direct'}<br>
          FL: \${plan.flightlevel || 'N/A'}<br>
          Source: \${plan.source || 'Main'}
        </div>
      </div>
    \`).join('');
  }

  function selectFlightPlan(index) {
    selectedFlightPlan = flightPlans[index];
    document.querySelectorAll('.flight-plan').forEach((el, i) => {
      el.classList.toggle('selected', i === index);
    });
    document.getElementById('generateBtn').disabled = false;
  }

  function updateRunwayOptions() {
    const atis = document.getElementById("atis").value;
    const runwaySelect = document.getElementById("runway");
    
    // More flexible regex: allow optional space before (s), and before colon
    const departureMatch = atis.match(/Departure Runway\s*(?:\(s\))?\s*:\s*\(([^)]+)\)/i);
    
    runwaySelect.innerHTML = '<option value="">Select Runway</option>';
    
    if (departureMatch) {
      const runwaysText = departureMatch[1];
      const runways = runwaysText.split(/[,\/]|\s+and\s+/i)
        .map(runway => runway.trim())
        .filter(runway => runway.length > 0);
      
      runways.forEach(runway => {
        const option = document.createElement('option');
        option.value = runway;
        option.textContent = runway;
        runwaySelect.appendChild(option);
      });
    }
  }

  function generateClearance() {
    if (!selectedFlightPlan) {
      alert('Please select a flight plan first');
      return;
    }

    const atis = document.getElementById("atis").value;
    const ifl = document.getElementById("ifl").value;
    const departureRW = document.getElementById("runway").value || "Unknown";
    const squawk = generateSquawk();
    
    // Get FL from flight plan
    const flightLevel = selectedFlightPlan.flightlevel || 'N/A';

    const clearance = \`\${selectedFlightPlan.callsign || 'UNKNOWN'} cleared IFR to \${selectedFlightPlan.arriving || 'destination'} Via \${selectedFlightPlan.route || 'GPS direct'}. Departure RW is \${departureRW}. Climb IFL \${ifl}. FL is \${flightLevel}. Squacking is \${squawk}.\`;

    document.getElementById("clearanceOutput").textContent = clearance;
  }

  setInterval(loadFlightPlans, 5000);
  loadFlightPlans();
  
  // Initialize runway options on page load
  updateRunwayOptions();
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
