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

// Serve static files (like styles.css) from a 'public' directory
app.use(express.static('public'));

// Serve the frontend HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve the license page
app.get("/license", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "license.html"));
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