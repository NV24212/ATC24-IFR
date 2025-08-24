const WebSocket = require("ws");
const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

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

// Initialize Supabase client with proper validation
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
let supabase = null;

// Validate Supabase configuration
if (supabaseUrl && supabaseKey &&
    supabaseUrl !== 'your_supabase_url_here' &&
    supabaseUrl !== 'your_supabase_url_here/' &&
    supabaseKey !== 'your_supabase_anon_key_here' &&
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    logWithTimestamp('info', 'Supabase client initialized successfully');
  } catch (error) {
    logWithTimestamp('error', 'Failed to initialize Supabase', { error: error.message });
    logWithTimestamp('warn', 'Continuing without Supabase - using local storage');
  }
} else {
  console.log("⚠️ Supabase not properly configured - using local storage");
  if (!supabaseUrl || supabaseUrl.includes('your_supabase_url_here')) {
    console.log("   Please set SUPABASE_URL environment variable");
  }
  if (!supabaseKey || supabaseKey.includes('your_supabase_anon_key_here')) {
    console.log("   Please set SUPABASE_ANON_KEY environment variable");
  }
}

let flightPlans = []; // Store multiple flight plans

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
  if (process.env.VERCEL === '1' && supabase) {
    try {
      const [visitsResult, clearancesResult, flightPlansResult] = await Promise.all([
        supabase.from('page_visits').select('*', { count: 'exact' }),
        supabase.from('clearance_generations').select('*', { count: 'exact' }),
        supabase.from('flight_plans_received').select('*', { count: 'exact' })
      ]);

      analytics.totalVisits = visitsResult.count || 0;
      analytics.clearancesGenerated = clearancesResult.count || 0;
      analytics.flightPlansReceived = flightPlansResult.count || 0;

      console.log('📊 Analytics initialized from Supabase for serverless');
    } catch (error) {
      console.error('Failed to initialize analytics from DB:', error);
    }
  }
}

// Call initialization if in serverless
if (process.env.VERCEL === '1' && supabase) {
  initializeAnalyticsFromDB();
}

// Admin settings with aviation defaults
let adminSettings = {
  clearanceFormat: {
    includeAtis: true,
    includeSquawk: true,
    includeFlightLevel: true,
    phraseologyStyle: "ICAO", // ICAO, FAA, Local
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
    enableFlightPlanFiltering: false
  }
};

// Session tracking with serverless cleanup
const sessions = new Map();

// Clean up old sessions periodically (important for serverless)
function cleanupOldSessions() {
  const now = new Date();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastActivity > maxAge) {
      sessions.delete(sessionId);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupOldSessions, 5 * 60 * 1000);

// Helper function to get or create session
function getOrCreateSession(req) {
  try {
    // Try multiple ways to get session ID with better validation
    let sessionId = req.headers['x-session-id'] ||
                   req.headers['session-id'] ||
                   req.query.sessionId ||
                   req.session?.id;

    // Generate new session ID if none found
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      sessionId = uuidv4();
    }

    // Enhanced session ID validation
    if (!sessionId.match(/^[a-f0-9\-]{36}$/i)) {
      logWithTimestamp('warn', 'Invalid session ID format, generating new one', {
        invalidIdLength: sessionId ? sessionId.length : 0,
        ip: req.ip || 'unknown'
      });
      sessionId = uuidv4();
    }

    // Create session if it doesn't exist
    if (!sessions.has(sessionId)) {
      const newSession = {
        id: sessionId,
        createdAt: new Date(),
        lastActivity: new Date(),
        pageViews: 0,
        clearancesGenerated: 0
      };

      sessions.set(sessionId, newSession);

      logWithTimestamp('info', 'New session created', {
        sessionId: sessionId.slice(0, 8),
        totalSessions: sessions.size,
        ip: req.ip || 'unknown'
      });
    }

    // Update session activity
    const session = sessions.get(sessionId);
    session.lastActivity = new Date();

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
      ip_address: getRealIP(req),
      referrer: req.headers.referer || null,
      session_id: session.id,
      is_first_visit: isFirstVisit
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
      ip: visitData.ip_address
    });

    // Store in Supabase if available (don't let failures here affect the main app)
    if (supabase) {
      try {
        // Insert page visit
        const { error: visitError } = await supabase.from('page_visits').insert(visitData);
        if (visitError) {
          throw new Error(`Page visit insert failed: ${visitError.message}`);
        }

        // Update or create user session
        const sessionData = {
          session_id: session.id,
          ip_address: visitData.ip_address,
          user_agent: visitData.user_agent,
          last_activity: new Date().toISOString(),
          page_views: session.pageViews,
          clearances_generated: session.clearancesGenerated || 0
        };

        const { error: sessionError } = await supabase.from('user_sessions').upsert(sessionData);
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

    const enhancedClearanceData = {
      ...clearanceData,
      session_id: session.id,
      ip_address: getRealIP(req),
      user_agent: req.headers['user-agent'] || 'Unknown',
      timestamp: new Date().toISOString()
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

        // Update session clearance count and activity
        const { error: sessionError } = await supabase
          .from('user_sessions')
          .upsert({
            session_id: session.id,
            clearances_generated: session.clearancesGenerated,
            last_activity: new Date().toISOString(),
            ip_address: getRealIP(req),
            user_agent: req.headers['user-agent'] || 'Unknown'
          });

        if (sessionError) {
          throw new Error(`Session update failed: ${sessionError.message}`);
        }

      } catch (error) {
        logWithTimestamp('error', 'Failed to track clearance generation in Supabase', {
          error: error.message,
          sessionId: session.id.slice(0, 8),
          callsign: clearanceData?.callsign || 'Unknown'
        });
        // Continue execution - don't let Supabase errors break the app
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

// Middleware to track visits
async function trackVisit(req, res, next) {
  await trackPageVisit(req, req.path);
  next();
}

// Admin authentication middleware
function requireAdminAuth(req, res, next) {
  const { password } = req.body || req.query;
  const adminPassword = process.env.ADMIN_PASSWORD || 'bruhdang';
  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  next();
}

// WebSocket connection - only initialize if not in serverless environment
let ws = null;

function initializeWebSocket() {
  if (process.env.VERCEL !== '1' && !ws) {
    try {
      ws = new WebSocket("wss://24data.ptfs.app/wss", {
        headers: { Origin: "" } // Required as per docs
      });

      ws.on("open", () => logWithTimestamp('info', 'WebSocket connected to 24data.ptfs.app'));
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

            // Add new flight plan to array, keep configurable amount
            flightPlans.unshift(flightPlan);
            if (flightPlans.length > adminSettings.system.maxFlightPlansStored) {
              flightPlans = flightPlans.slice(0, adminSettings.system.maxFlightPlansStored);
            }

            logWithTimestamp('info', `Received ${flightPlan.source} flight plan`, {
              callsign: flightPlan.callsign,
              destination: flightPlan.arriving,
              route: flightPlan.route
            });

            if (adminSettings.system.enableDetailedLogging) {
              logWithTimestamp('debug', `Detailed flight plan data`, flightPlan);
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
        logWithTimestamp('error', 'WebSocket connection error', { error: err.message, code: err.code });
      });

      ws.on("close", (code, reason) => {
        logWithTimestamp('warn', 'WebSocket connection closed', { code, reason: reason?.toString() });
        // Attempt to reconnect after 5 seconds if not in serverless
        if (process.env.VERCEL !== '1') {
          logWithTimestamp('info', 'Scheduling WebSocket reconnection in 5 seconds');
          setTimeout(initializeWebSocket, 5000);
        }
      });
    } catch (error) {
      logWithTimestamp('error', 'Failed to initialize WebSocket', { error: error.message });
    }
  }
}

// Initialize WebSocket connection
initializeWebSocket();

app.use(cors());
app.use(express.json());

// Serve static files (like styles.css) from a 'public' directory
app.use(express.static('public'));

// Serve the frontend HTML
app.get("/", trackVisit, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve the license page
app.get("/license", trackVisit, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "license.html"));
});

// Serve admin panel (don't track admin visits to avoid skewing analytics)
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// REST: Get all flight plans with serverless-aware fallback
app.get("/flight-plans", async (req, res) => {
  try {
    // If we're in serverless and have Supabase, try to get recent flight plans
    if (process.env.VERCEL === '1' && supabase && flightPlans.length === 0) {
      try {
        const { data: recentPlans } = await supabase
          .from('flight_plans_received')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentPlans && recentPlans.length > 0) {
          // Convert Supabase format back to flight plan format
          const convertedPlans = recentPlans.map(plan => ({
            callsign: plan.callsign,
            arriving: plan.destination,
            route: plan.route,
            flightlevel: plan.flight_level,
            source: plan.source,
            timestamp: plan.created_at,
            ...plan.raw_data
          }));

          console.log(`📡 Retrieved ${convertedPlans.length} flight plans from Supabase for serverless`);
          return res.json(convertedPlans);
        }
      } catch (dbError) {
        console.error('Failed to fetch from Supabase:', dbError);
      }
    }

    res.json(flightPlans);
  } catch (error) {
    console.error('Error in flight plans endpoint:', error);
    res.json(flightPlans); // Fallback to in-memory
  }
});

// API endpoint to track clearance generation
app.post("/api/clearance-generated", async (req, res) => {
  try {
    const clearanceData = req.body || {};
    await trackClearanceGeneration(req, clearanceData);
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking clearance generation:', error);
    res.json({ success: true }); // Still return success to avoid breaking frontend
  }
});

// Admin API endpoints
app.post("/api/admin/login", requireAdminAuth, (req, res) => {
  logWithTimestamp('info', 'Admin login successful', { ip: req.ip, userAgent: req.headers['user-agent'] });
  res.json({ success: true, message: "Admin authenticated successfully" });
});

app.get("/api/admin/analytics", async (req, res) => {
  const { password } = req.query;
  const adminPassword = process.env.ADMIN_PASSWORD || 'bruhdang';
  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let analyticsData = { ...analytics };
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (supabase) {
      // Get comprehensive analytics from Supabase with graceful error handling
      let visitsResult = { count: 0 };
      let clearancesResult = { count: 0 };
      let flightPlansResult = { count: 0 };
      let sessionsResult = { count: 0 };

      try {
        visitsResult = await supabase.from('page_visits').select('*', { count: 'exact' });
      } catch (error) {
        logWithTimestamp('warn', 'page_visits table not accessible', { error: error.message });
      }

      try {
        clearancesResult = await supabase.from('clearance_generations').select('*', { count: 'exact' });
      } catch (error) {
        logWithTimestamp('warn', 'clearance_generations table not accessible', { error: error.message });
      }

      try {
        flightPlansResult = await supabase.from('flight_plans_received').select('*', { count: 'exact' });
      } catch (error) {
        logWithTimestamp('warn', 'flight_plans_received table not accessible', { error: error.message });
      }

      try {
        sessionsResult = await supabase.from('user_sessions').select('*', { count: 'exact' });
      } catch (error) {
        logWithTimestamp('warn', 'user_sessions table not accessible', { error: error.message });
      }

      // Get daily analytics for the last 30 days
      let dailyData = null;
      try {
        const result = await supabase
          .from('page_visits')
          .select('created_at')
          .gte('created_at', thirtyDaysAgo.toISOString());
        dailyData = result.data;
      } catch (error) {
        logWithTimestamp('warn', 'Failed to fetch daily visit data', { error: error.message });
      }

      // Process daily visits with proper date handling
      const dailyVisits = {};
      const last7DaysData = {};
      const last30DaysData = {};

      if (dailyData) {
        dailyData.forEach(visit => {
          const date = visit.created_at.split('T')[0];
          dailyVisits[date] = (dailyVisits[date] || 0) + 1;

          const visitDate = new Date(date);
          if (visitDate >= sevenDaysAgo) {
            last7DaysData[date] = (last7DaysData[date] || 0) + 1;
          }
          if (visitDate >= thirtyDaysAgo) {
            last30DaysData[date] = (last30DaysData[date] || 0) + 1;
          }
        });
      }

      // Calculate totals for last 7 and 30 days
      const last7Days = Object.values(last7DaysData).reduce((total, visits) => total + visits, 0);
      const last30Days = Object.values(last30DaysData).reduce((total, visits) => total + visits, 0);

      // Get unique visitors count
      let uniqueVisitors = null;
      try {
        const result = await supabase
          .from('user_sessions')
          .select('session_id', { count: 'exact' });
        uniqueVisitors = result.data;
      } catch (error) {
        logWithTimestamp('warn', 'Failed to fetch unique visitors', { error: error.message });
      }

      analyticsData = {
        totalVisits: visitsResult.count || 0,
        clearancesGenerated: clearancesResult.count || 0,
        flightPlansReceived: flightPlansResult.count || 0,
        uniqueVisitors: uniqueVisitors?.length || 0,
        dailyVisits,
        last7Days,
        last30Days,
        currentDate: new Date().toISOString(),
        lastReset: analytics.lastReset
      };
    } else {
      // Fallback to local analytics with proper date filtering
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

      const last7Days = Object.entries(analytics.dailyVisits)
        .filter(([date]) => date >= sevenDaysAgoStr)
        .reduce((total, [date, visits]) => total + visits, 0);

      const last30Days = Object.entries(analytics.dailyVisits)
        .filter(([date]) => date >= thirtyDaysAgoStr)
        .reduce((total, [date, visits]) => total + visits, 0);

      analyticsData = {
        ...analytics,
        last7Days,
        last30Days,
        currentDate: new Date().toISOString()
      };
    }

    res.json(analyticsData);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    // Fallback to local analytics on error with proper date filtering
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const last7Days = Object.entries(analytics.dailyVisits)
      .filter(([date]) => date >= sevenDaysAgoStr)
      .reduce((total, [date, visits]) => total + visits, 0);

    const last30Days = Object.entries(analytics.dailyVisits)
      .filter(([date]) => date >= thirtyDaysAgoStr)
      .reduce((total, [date, visits]) => total + visits, 0);

    res.json({
      ...analytics,
      last7Days,
      last30Days,
      currentDate: new Date().toISOString(),
      error: 'Failed to fetch from Supabase, showing local data'
    });
  }
});

app.get("/api/admin/settings", (req, res) => {
  const { password } = req.query;
  const adminPassword = process.env.ADMIN_PASSWORD || 'bruhdang';
  if (password !== adminPassword) {
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

app.post("/api/admin/reset-analytics", requireAdminAuth, async (req, res) => {
  try {
    // Reset local analytics
    analytics = {
      totalVisits: 0,
      dailyVisits: {},
      clearancesGenerated: 0,
      flightPlansReceived: 0,
      lastReset: new Date().toISOString()
    };

    // Track admin activity
    if (supabase) {
      await supabase.from('admin_activities').insert({
        action: 'reset_analytics',
        details: { timestamp: new Date().toISOString() },
        ip_address: req.ip || req.connection.remoteAddress
      });
    }

    res.json({ success: true, message: 'Analytics reset successfully' });
  } catch (error) {
    console.error('Error resetting analytics:', error);
    res.json({ success: true, message: 'Analytics reset successfully (local only)' });
  }
});

// Debug logs endpoint for admin
app.get("/api/admin/logs", (req, res) => {
  try {
    const { password } = req.query;
    const adminPassword = process.env.ADMIN_PASSWORD || 'bruhdang';
    if (password !== adminPassword) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Enhanced input validation
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 500);
    const level = req.query.level || null;

    // Ensure runtimeLogs exists and is safe
    if (!Array.isArray(runtimeLogs)) {
      logWithTimestamp('error', 'Runtime logs array is not initialized properly');
      return res.json({
        logs: [],
        totalCount: 0,
        filteredCount: 0,
        maxLogs: MAX_LOGS,
        serverStartTime: new Date().toISOString(),
        error: 'Logs not initialized'
      });
    }

    let filteredLogs = runtimeLogs;

    // Safe filtering by log level
    if (level && level !== 'all') {
      filteredLogs = runtimeLogs.filter(log => {
        try {
          return log && typeof log === 'object' && log.level === level;
        } catch (error) {
          return false;
        }
      });
    }

    // Safe limiting of results
    const logsToReturn = filteredLogs.slice(0, limit);

    // Get server start time safely
    const serverStartTime = runtimeLogs.length > 0 && runtimeLogs[runtimeLogs.length - 1]
      ? runtimeLogs[runtimeLogs.length - 1].timestamp || new Date().toISOString()
      : new Date().toISOString();

    res.json({
      logs: logsToReturn,
      totalCount: runtimeLogs.length,
      filteredCount: filteredLogs.length,
      maxLogs: MAX_LOGS,
      serverStartTime: serverStartTime
    });

  } catch (error) {
    logWithTimestamp('error', 'Error in debug logs endpoint', { error: error.message });
    res.status(500).json({
      error: 'Internal server error',
      logs: [],
      totalCount: 0,
      filteredCount: 0,
      maxLogs: MAX_LOGS,
      serverStartTime: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  const isServerless = process.env.VERCEL === '1';
  let wsStatus = 'disabled';

  if (isServerless) {
    wsStatus = 'disabled_serverless';
  } else if (ws) {
    wsStatus = ws.readyState === WebSocket.OPEN ? 'connected' : 'disconnected';
  } else {
    wsStatus = 'not_initialized';
  }

  res.json({
    status: "ok",
    wsConnected: ws ? ws.readyState === WebSocket.OPEN : false,
    wsStatus: wsStatus,
    environment: isServerless ? 'serverless' : 'traditional',
    deployment: {
      platform: isServerless ? 'vercel' : 'traditional',
      supportsWebSocket: !isServerless,
      persistentStorage: supabase !== null,
      sessionCount: sessions.size,
      memoryFlightPlans: flightPlans.length
    },
    capabilities: {
      realtime_updates: !isServerless,
      polling_fallback: true,
      analytics_persistence: supabase !== null,
      admin_panel: true,
      clearance_generation: true
    },
    flightPlansCount: flightPlans.length,
    supabaseConfigured: supabase !== null,
    supportsRealtime: !isServerless,
    limitations: isServerless ? {
      websocket: 'disabled_in_serverless',
      memory_persistence: 'function_lifecycle_only',
      recommended_polling_interval: '10_seconds',
      session_cleanup: 'automatic'
    } : null,
    recommendations: isServerless ? {
      data_update_method: 'client_side_polling',
      fallback_storage: supabase !== null ? 'supabase_available' : 'memory_only',
      user_experience: 'polling_with_notification'
    } : {
      data_update_method: 'websocket_realtime',
      storage: 'in_memory_with_supabase_backup'
    },
    analytics: {
      totalVisits: analytics.totalVisits,
      clearancesGenerated: analytics.clearancesGenerated,
      flightPlansReceived: analytics.flightPlansReceived,
      lastUpdated: new Date().toISOString()
    }
  });
});

// Test endpoint to simulate visits for testing analytics
app.post("/api/admin/test-visits", requireAdminAuth, async (req, res) => {
  try {
    const { count = 10, days = 7 } = req.body;
    const results = [];

    for (let i = 0; i < count; i++) {
      // Randomly distribute visits over the specified days
      const daysAgo = Math.floor(Math.random() * days);
      const visitDate = new Date();
      visitDate.setDate(visitDate.getDate() - daysAgo);
      const visitDateStr = visitDate.toISOString().split('T')[0];

      // Track the visit with custom date
      analytics.totalVisits++;
      analytics.dailyVisits[visitDateStr] = (analytics.dailyVisits[visitDateStr] || 0) + 1;

      results.push({
        visit: i + 1,
        date: visitDateStr,
        path: i % 2 === 0 ? '/' : '/license'
      });
    }

    logWithTimestamp('info', `Generated ${count} test visits over ${days} days`);
    res.json({
      success: true,
      message: `Generated ${count} test visits`,
      results,
      currentAnalytics: {
        totalVisits: analytics.totalVisits,
        dailyVisitsCount: Object.keys(analytics.dailyVisits).length
      }
    });
  } catch (error) {
    console.error('Error generating test visits:', error);
    res.status(500).json({ error: 'Failed to generate test visits' });
  }
});

// Supabase tables endpoints for admin panel
app.get("/api/admin/tables/:tableName", async (req, res) => {
  const { password } = req.query;
  const adminPassword = process.env.ADMIN_PASSWORD || 'bruhdang';
  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { tableName } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  const allowedTables = ['page_visits', 'clearance_generations', 'flight_plans_received', 'user_sessions', 'admin_activities'];

  if (!allowedTables.includes(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

  if (!supabase) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) {
      // Check for specific error types
      if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
        logWithTimestamp('info', `Table ${tableName} does not exist yet`, { error: error.message });
        return res.json({
          data: [],
          totalCount: 0,
          offset: parseInt(offset),
          limit: parseInt(limit),
          message: `Table '${tableName}' not created yet. Please run the setup SQL in your Supabase dashboard.`,
          setupRequired: true
        });
      }
      throw error;
    }

    res.json({
      data: data || [],
      totalCount: count || 0,
      offset: parseInt(offset),
      limit: parseInt(limit)
    });
  } catch (error) {
    logWithTimestamp('error', `Error fetching ${tableName}`, {
      message: error.message,
      details: error.toString(),
      hint: error.hint || '',
      code: error.code || ''
    });

    // Provide more helpful error messages
    if (error.message && error.message.includes('fetch failed')) {
      return res.status(503).json({
        error: `Database connection failed for ${tableName}`,
        message: 'Unable to connect to Supabase. Please check your connection and table setup.',
        setupRequired: true
      });
    }

    res.status(500).json({
      error: `Failed to fetch ${tableName}`,
      message: error.message || 'Unknown database error',
      setupRequired: true
    });
  }
});

// Current users endpoint - get active sessions
app.get("/api/admin/current-users", async (req, res) => {
  const { password } = req.query;
  const adminPassword = process.env.ADMIN_PASSWORD || 'bruhdang';
  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get current users from memory sessions
    const currentTime = new Date();
    const activeThreshold = 5 * 60 * 1000; // 5 minutes

    const memoryUsers = Array.from(sessions.values())
      .filter(session => currentTime - session.lastActivity < activeThreshold)
      .map(session => ({
        session_id: session.id.slice(0, 8),
        last_activity: session.lastActivity,
        page_views: session.pageViews,
        clearances_generated: session.clearancesGenerated || 0,
        source: 'memory'
      }));

    let supabaseUsers = [];

    // Get active users from Supabase if available
    if (supabase) {
      const fiveMinutesAgo = new Date(currentTime - activeThreshold).toISOString();

      const { data } = await supabase
        .from('user_sessions')
        .select('session_id, last_activity, page_views, clearances_generated, ip_address, user_agent')
        .gte('last_activity', fiveMinutesAgo)
        .order('last_activity', { ascending: false });

      supabaseUsers = (data || []).map(session => ({
        session_id: session.session_id.slice(0, 8),
        last_activity: session.last_activity,
        page_views: session.page_views || 0,
        clearances_generated: session.clearances_generated || 0,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        source: 'supabase'
      }));
    }

    // Combine and deduplicate users (prefer Supabase data)
    const allUsers = [...supabaseUsers];

    // Add memory users that aren't in Supabase
    memoryUsers.forEach(memUser => {
      if (!supabaseUsers.find(dbUser => dbUser.session_id === memUser.session_id)) {
        allUsers.push(memUser);
      }
    });

    res.json({
      users: allUsers,
      activeCount: allUsers.length,
      memorySessionsCount: memoryUsers.length,
      supabaseSessionsCount: supabaseUsers.length,
      lastUpdated: currentTime.toISOString()
    });

  } catch (error) {
    console.error('Error fetching current users:', error);
    res.status(500).json({ error: 'Failed to fetch current users' });
  }
});

// Start server only if not in Vercel environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    logWithTimestamp('info', `Server started successfully on port ${PORT}`, {
      port: PORT,
      environment: 'traditional',
      supabaseConfigured: supabase !== null
    });
  });
} else {
  logWithTimestamp('info', 'Server deployed in serverless environment (Vercel)', {
    environment: 'serverless',
    supabaseConfigured: supabase !== null
  });
}

// Export app for Vercel
module.exports = app;
