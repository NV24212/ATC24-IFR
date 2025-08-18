const WebSocket = require("ws");
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

let flightPlans = []; // Store multiple flight plans

// Analytics storage
let analytics = {
  totalVisits: 0,
  dailyVisits: {},
  clearancesGenerated: 0,
  flightPlansReceived: 0,
  lastReset: new Date().toISOString()
};

// Admin settings with aviation defaults
let adminSettings = {
  clearanceFormat: {
    includeAtis: true,
    includeSquawk: true,
    includeFlightLevel: true,
    phraseologyStyle: "ICAO", // ICAO, FAA, Local
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
    enableFlightPlanFiltering: false
  }
};

// Middleware to track visits
function trackVisit(req, res, next) {
  const today = new Date().toISOString().split('T')[0];
  analytics.totalVisits++;
  analytics.dailyVisits[today] = (analytics.dailyVisits[today] || 0) + 1;

  // Keep only last 30 days of daily stats
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  Object.keys(analytics.dailyVisits).forEach(date => {
    if (new Date(date) < thirtyDaysAgo) {
      delete analytics.dailyVisits[date];
    }
  });

  next();
}

// Admin authentication middleware
function requireAdminAuth(req, res, next) {
  const { password } = req.body || req.query;
  if (password !== 'bruhdang') {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  next();
}

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

      // Track analytics
      analytics.flightPlansReceived++;

      // Add new flight plan to array, keep configurable amount
      flightPlans.unshift(flightPlan);
      if (flightPlans.length > adminSettings.system.maxFlightPlansStored) {
        flightPlans = flightPlans.slice(0, adminSettings.system.maxFlightPlansStored);
      }

      if (adminSettings.system.enableDetailedLogging) {
        console.log(`📡 Received ${flightPlan.source} FlightPlan:`, flightPlan.callsign);
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

// Serve static files (like styles.css) from a 'public' directory
app.use(express.static('public'));

// Serve the frontend HTML
app.get("/", trackVisit, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve the license page
app.get("/license", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "license.html"));
});

// Serve admin panel
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// REST: Get all flight plans
app.get("/flight-plans", (req, res) => {
  res.json(flightPlans);
});

// API endpoint to track clearance generation
app.post("/api/clearance-generated", (req, res) => {
  analytics.clearancesGenerated++;
  res.json({ success: true });
});

// Admin API endpoints
app.post("/api/admin/login", requireAdminAuth, (req, res) => {
  res.json({ success: true, message: "Admin authenticated successfully" });
});

app.get("/api/admin/analytics", (req, res) => {
  const { password } = req.query;
  if (password !== 'bruhdang') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Calculate additional analytics
  const last7Days = Object.entries(analytics.dailyVisits)
    .slice(-7)
    .reduce((total, [date, visits]) => total + visits, 0);

  const last30Days = Object.entries(analytics.dailyVisits)
    .slice(-30)
    .reduce((total, [date, visits]) => total + visits, 0);

  res.json({
    ...analytics,
    last7Days,
    last30Days,
    currentDate: new Date().toISOString()
  });
});

app.get("/api/admin/settings", (req, res) => {
  const { password } = req.query;
  if (password !== 'bruhdang') {
    // Allow guest access to basic settings for the main app
    if (password === 'guest') {
      const guestSettings = {
        clearanceFormat: adminSettings.clearanceFormat,
        aviation: {
          defaultAltitudes: adminSettings.aviation.defaultAltitudes,
          squawkRanges: adminSettings.aviation.squawkRanges
        }
      };
      return res.json(guestSettings);
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(adminSettings);
});

app.post("/api/admin/settings", requireAdminAuth, (req, res) => {
  try {
    adminSettings = { ...adminSettings, ...req.body.settings };
    res.json({ success: true, settings: adminSettings });
  } catch (error) {
    res.status(400).json({ error: 'Invalid settings format' });
  }
});

app.post("/api/admin/reset-analytics", requireAdminAuth, (req, res) => {
  analytics = {
    totalVisits: 0,
    dailyVisits: {},
    clearancesGenerated: 0,
    flightPlansReceived: 0,
    lastReset: new Date().toISOString()
  };
  res.json({ success: true, message: 'Analytics reset successfully' });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    wsConnected: ws.readyState === WebSocket.OPEN,
    flightPlansCount: flightPlans.length,
    analytics: {
      totalVisits: analytics.totalVisits,
      clearancesGenerated: analytics.clearancesGenerated
    }
  });
});

app.listen(PORT, () => console.log(`🌐 Server running at http://localhost:${PORT}`));
