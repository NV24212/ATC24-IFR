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
  // Try to get session ID from various sources (headers, cookie, query param)
  const sessionId = req.headers['x-session-id'] ||
                   req.headers['authorization']?.replace('Bearer ', '') ||
                   req.cookies?.session_id ||
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

// Serve the status page
app.get("/api", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "status.html"));
});

// Also serve static files on the /api path to support the status page when behind the api-prefix middleware
app.use("/api", express.static('public'));

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
  if (!supabase) {
    return res.status(503).json({ error: "Database not configured" });
  }
  try {
    const { data, error } = await supabase.rpc('get_user_clearances', { p_user_id: req.user.id });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
    const result = await trackClearanceGeneration(req, clearanceData);
    if (!result.success) {
      // The function now returns a failure object, so we can inform the client
      return res.status(200).json({ success: false, error: result.error });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking clearance generation:', error);
    // This will catch critical errors in the tracking function itself
    res.status(500).json({ success: false, error: 'Internal server error while tracking clearance.' });
  }
});

// Discord OAuth routes with enhanced error handling
app.get("/auth/discord", (req, res) => {
  try {
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
      logWithTimestamp('error', 'Discord OAuth attempted but credentials not configured');
      return res.status(500).json({
        error: 'Discord OAuth not configured',
        message: 'Discord authentication is not available. Please contact the administrator.',
        configured: false
      });
    }

    const { url, state } = generateDiscordAuthURL();

    // Create a temporary session for the OAuth flow
    const sessionId = uuidv4();
    const tempSession = {
      id: sessionId,
      oauthState: state,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    // Store it in the session store
    sessionStore.set(sessionId, tempSession);

    // Set a cookie so the browser sends it back on the callback
    // This cookie is essential for retrieving the session during the callback.
    res.cookie('session_id', sessionId, {
      httpOnly: true, // Prevents client-side JS from accessing the cookie
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
      maxAge: 5 * 60 * 1000 // 5 minute expiry, just for the auth flow
    });

    logWithTimestamp('info', 'Discord OAuth initiated', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      sessionId: sessionId.slice(0, 8)
    });

    res.redirect(url);
  } catch (error) {
    logWithTimestamp('error', 'Discord OAuth initiation failed', { error: error.message });
    res.status(500).json({ error: 'OAuth initiation failed' });
  }
});

app.get("/auth/discord/callback", async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;

    // Check for OAuth errors
    if (oauthError) {
      logWithTimestamp('warn', 'Discord OAuth error', { error: oauthError });
      return res.redirect('/?error=oauth_cancelled');
    }

    // Validate required parameters
    if (!code) {
      logWithTimestamp('warn', 'Discord OAuth callback missing code');
      return res.redirect('/?error=missing_code');
    }

    // CSRF protection - validate state and clear it to prevent reuse
    if (!req.session?.oauthState || req.session.oauthState !== state) {
      logWithTimestamp('warn', 'Discord OAuth state mismatch or already used', {
        expected: req.session?.oauthState,
        received: state,
        ip: req.ip
      });
      return res.redirect('/?error=invalid_state');
    }
    // Clear the state so it cannot be used again
    delete req.session.oauthState;

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);

    // Get user information from Discord
    const discordUser = await getDiscordUser(tokenData.access_token);

    // Check if the user is an active controller
    let vatsimData = {
        cid: null,
        isController: false
    };

    if (controllerCache.data && controllerCache.data.length > 0) {
        const controller = controllerCache.data.find(c => c.name === discordUser.username);
        if (controller) {
            vatsimData.cid = controller.cid.toString();
            vatsimData.isController = true;
            logWithTimestamp('info', 'Logged-in user is an active controller', { username: discordUser.username, cid: vatsimData.cid });
        }
    }

    // Create or update user in database (with fallback if database unavailable)
    let user;
    try {
      user = await createOrUpdateUser(discordUser, tokenData, vatsimData);
    } catch (dbError) {
      logWithTimestamp('error', 'Database operation failed during Discord auth, using fallback', { error: dbError.message });
      // Fallback user object for when database is unavailable
      user = {
        id: discordUser.id,
        discord_id: discordUser.id,
        username: discordUser.username,
        email: discordUser.email,
        avatar: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
        is_admin: false,
        roles: [],
        vatsim_cid: vatsimData.cid,
        is_controller: vatsimData.isController
      };
    }

    // Create unified session for OAuth user
    const sessionId = uuidv4();
    const oauthSession = {
      id: sessionId,
      user: {
        id: user.id,
        discord_id: user.discord_id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        is_admin: user.is_admin || false,
        roles: user.roles || []
      },
      createdAt: new Date(),
      lastActivity: new Date()
    };

    // Create corresponding tracking session
    const trackingSession = {
      id: sessionId,
      createdAt: new Date(),
      lastActivity: new Date(),
      pageViews: 0,
      clearancesGenerated: 0,
      user_id: user.id,
      discord_username: user.username
    };

    // Store in both session stores
    sessionStore.set(sessionId, oauthSession);
    sessions.set(sessionId, trackingSession);

    logWithTimestamp('info', 'Discord OAuth session created', {
      sessionId: sessionId.slice(0, 8),
      userId: user.id,
      username: user.username,
      isAdmin: user.is_admin || false
    });

    logWithTimestamp('info', 'Discord OAuth successful', {
      userId: user.id,
      discordId: user.discord_id,
      username: user.username,
      ip: req.ip
    });

    // Set session cookie and redirect with session ID
    res.cookie('session_id', sessionId, { 
      httpOnly: false, 
      secure: false, 
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // Redirect to admin panel if user is admin, otherwise main page
    if (user.is_admin) {
      res.redirect('/admin?auth=success&session=' + sessionId);
    } else {
      res.redirect('/?auth=success&session=' + sessionId);
    }

  } catch (error) {
    logWithTimestamp('error', 'Discord OAuth callback failed', {
      error: error.message,
      stack: error.stack
    });
    res.redirect('/?error=auth_failed');
  }
});

// Get current user info
app.get("/api/auth/user", (req, res) => {
  const user = req.session?.user;
  if (user) {
    res.json({
      authenticated: true,
      user: {
        id: user.id,
        discord_id: user.discord_id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        is_admin: user.is_admin,
        roles: user.roles,
        vatsim_cid: user.vatsim_cid,
        is_controller: user.is_controller,
        settings: user.user_settings || {}
      }
    });
  } else {
    res.json({
      authenticated: false,
      user: null
    });
  }
});

// Logout endpoint
app.post("/api/auth/logout", (req, res) => {
  try {
    const sessionId = req.session?.id;

    if (sessionId) {
      // Remove from session store
      sessionStore.delete(sessionId);

      logWithTimestamp('info', 'User logged out', {
        sessionId: sessionId.slice(0, 8),
        userId: req.session?.user?.id
      });
    }

    // Clear session
    req.session = null;

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logWithTimestamp('error', 'Logout failed', { error: error.message });
    res.json({ success: true }); // Still return success
  }
});

app.post("/api/user/settings", requireDiscordAuth, async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings) {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { data, error } = await supabase
      .from('discord_users')
      .update({ user_settings: settings })
      .eq('id', req.user.id);

    if (error) {
      throw new Error(`Failed to save user settings: ${error.message}`);
    }

    logWithTimestamp('info', 'User settings updated', { userId: req.user.id, username: req.user.username });
    res.json({ success: true });
  } catch (error) {
    logWithTimestamp('error', 'Failed to save user settings', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to save user settings' });
  }
});

// Admin user management routes
app.get("/api/admin/users", async (req, res) => {
  try {
    // Check if user is authenticated and is admin
    if (!req.session?.user || !req.session.user.is_admin) {
      return res.status(401).json({ error: 'Admin access required' });
    }

    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { data, error } = await supabase.rpc('get_admin_users');

    if (error) {
      throw new Error(`Failed to fetch admin users: ${error.message}`);
    }

    res.json({
      success: true,
      users: data || []
    });

  } catch (error) {
    logWithTimestamp('error', 'Failed to fetch admin users', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

app.post("/api/admin/users", async (req, res) => {
  try {
    // Check if user is authenticated and is admin
    if (!req.session?.user || !req.session.user.is_admin) {
      return res.status(401).json({ error: 'Admin access required' });
    }

    const { username, roles } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }

    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { data, error } = await supabase.rpc('add_admin_user_by_username', {
      p_username: username.trim(),
      p_roles: roles || ['admin']
    });

    if (error) {
      throw new Error(`Failed to add admin user: ${error.message}`);
    }

    const result = data[0];

    // Log admin activity
    await supabase.from('admin_activities').insert({
      action: 'add_admin_user',
      details: {
        admin_user: req.session.user.username,
        target_username: username,
        roles: roles,
        timestamp: new Date().toISOString()
      }
    });

    logWithTimestamp('info', 'Admin user added', {
      adminUser: req.session.user.username,
      targetUsername: username,
      roles: roles
    });

    res.json({
      success: result.success,
      message: result.message,
      user_id: result.user_id
    });

  } catch (error) {
    logWithTimestamp('error', 'Failed to add admin user', { error: error.message });
    res.status(500).json({ error: 'Failed to add admin user' });
  }
});

app.delete("/api/admin/users/:userId", async (req, res) => {
  try {
    // Check if user is authenticated and is admin
    if (!req.session?.user || !req.session.user.is_admin) {
      return res.status(401).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Prevent self-removal
    if (userId === req.session.user.id) {
      return res.status(400).json({ error: 'Cannot remove yourself as admin' });
    }

    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { data, error } = await supabase.rpc('remove_admin_user', {
      p_user_id: userId
    });

    if (error) {
      throw new Error(`Failed to remove admin user: ${error.message}`);
    }

    const result = data[0];

    // Log admin activity
    await supabase.from('admin_activities').insert({
      action: 'remove_admin_user',
      details: {
        admin_user: req.session.user.username,
        target_user_id: userId,
        timestamp: new Date().toISOString()
      }
    });

    logWithTimestamp('info', 'Admin user removed', {
      adminUser: req.session.user.username,
      targetUserId: userId
    });

    res.json({
      success: result.success,
      message: result.message
    });

  } catch (error) {
    logWithTimestamp('error', 'Failed to remove admin user', { error: error.message });
    res.status(500).json({ error: 'Failed to remove admin user' });
  }
});

// Admin API endpoints
app.get("/api/admin/analytics", async (req, res) => {
  // Check if user is authenticated and is admin
  if (!req.session?.user || !req.session.user.is_admin) {
    return res.status(401).json({ error: 'Admin access required' });
  }

  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  try {
    const { data, error } = await supabase.rpc('get_analytics_summary');

    if (error) {
      logWithTimestamp('error', 'Failed to fetch analytics summary from RPC', { error: error.message });
      throw new Error(`Failed to fetch analytics summary: ${error.message}`);
    }

    if (!data || data.length === 0) {
      logWithTimestamp('warn', 'Analytics summary RPC returned no data');
      return res.json({
        totalVisits: 0,
        unique_visitors: 0,
        clearances_generated: 0,
        flight_plans_received: 0,
        authenticated_sessions: 0,
        last_7_days_visits: 0,
        last_30_days_visits: 0,
        error: 'No analytics data returned from database.'
      });
    }

    const summary = data[0];

    // The frontend expects some different key names, so let's adapt.
    const analyticsData = {
      totalVisits: summary.total_visits,
      uniqueVisitors: summary.unique_visitors,
      clearancesGenerated: summary.clearances_generated,
      flightPlansReceived: summary.flight_plans_received,
      authenticatedSessions: summary.authenticated_sessions,
      last7Days: summary.last_7_days_visits,
      last30Days: summary.last_30_days_visits,
      currentDate: new Date().toISOString()
    };

    // For the daily chart, we still need to fetch daily visits.
    // The RPC could be updated for this, but for now, we'll keep this one part.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: dailyData, error: dailyError } = await supabase
      .from('page_visits')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (dailyError) {
        logWithTimestamp('warn', 'Failed to fetch daily visit data for chart', { error: dailyError.message });
    }

    const dailyVisits = {};
    if (dailyData) {
        dailyData.forEach(visit => {
            const date = visit.created_at.split('T')[0];
            dailyVisits[date] = (dailyVisits[date] || 0) + 1;
        });
    }
    analyticsData.dailyVisits = dailyVisits;


    res.json(analyticsData);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics from Supabase',
      message: error.message
    });
  }
});

// PUBLIC: Get public-facing admin settings
app.get("/api/settings", (req, res) => {
  try {
    // Expose only non-sensitive settings
    const publicSettings = {
      clearanceFormat: adminSettings.clearanceFormat,
      aviation: {
        defaultAltitudes: adminSettings.aviation.defaultAltitudes,
        squawkRanges: adminSettings.aviation.squawkRanges
      }
    };
    res.json(publicSettings);
  } catch (error) {
    logWithTimestamp('error', 'Failed to retrieve public settings', { error: error.message });
    res.status(500).json({ error: 'Could not retrieve settings' });
  }
});

app.get("/api/admin/settings", (req, res) => {
  // Check if user is authenticated and is admin
  if (!req.session?.user || !req.session.user.is_admin) {
    return res.status(401).json({ error: 'Admin access required' });
  }

  res.json(adminSettings);
});

app.post("/api/admin/settings", async (req, res) => {
  try {
    // Check if user is authenticated and is admin
    if (!req.session?.user || !req.session.user.is_admin) {
      return res.status(401).json({ error: 'Admin access required' });
    }

    const newSettings = req.body.settings;
    if (!newSettings) {
        return res.status(400).json({ error: 'Invalid settings format' });
    }

    // Update in-memory settings (deep merge)
    Object.keys(newSettings).forEach(key => {
        if(adminSettings.hasOwnProperty(key) && typeof adminSettings[key] === 'object' && adminSettings[key] !== null && !Array.isArray(adminSettings[key])) {
            adminSettings[key] = { ...adminSettings[key], ...newSettings[key] };
        } else {
            adminSettings[key] = newSettings[key];
        }
    });

    // Persist to Supabase
    if (supabase) {
      const { data, error } = await supabase
        .from('admin_settings')
        .update({ settings: adminSettings, updated_at: new Date().toISOString() })
        .eq('id', 1);

      if (error) {
        logWithTimestamp('error', 'Failed to save admin settings to Supabase', { error: error.message });
        // Don't fail the request, but notify the user
        return res.status(500).json({ success: false, error: 'Failed to save settings to database.' });
      }
    }

    logWithTimestamp('info', 'Admin settings updated', { adminUser: req.session.user.username });

    // Log admin activity
    if (supabase) {
      await supabase.from('admin_activities').insert({
        action: 'update_settings',
        details: {
          admin_user: req.session.user.username,
          new_settings: newSettings,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Restart polling with new intervals
    startControllerPolling();
    startAtisPolling();

    res.json({ success: true, settings: adminSettings });
  } catch (error) {
    logWithTimestamp('error', 'Error saving settings', { error: error.message });
    res.status(500).json({ error: 'An unexpected error occurred while saving settings.' });
  }
});

app.post("/api/admin/reset-analytics", async (req, res) => {
  try {
    // Check if user is authenticated and is admin
    if (!req.session?.user || !req.session.user.is_admin) {
      return res.status(401).json({ error: 'Admin access required' });
    }

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
        details: {
          admin_user: req.session.user.username,
          timestamp: new Date().toISOString(),
          ip_address: req.ip || req.connection.remoteAddress
        }
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
    // Check if user is authenticated and is admin
    if (!req.session?.user || !req.session.user.is_admin) {
      return res.status(401).json({ error: 'Admin access required' });
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

// New comprehensive status endpoint
app.get("/api/full-status", async (req, res) => {
  try {
    let status = {
      "24data": {
        name: "24data Connectivity",
        status: "operational",
        endpoints: []
      },
      "24ifr_api": {
        name: "24IFR API",
        status: "operational",
        endpoints: []
      },
      errors: {
        name: "Error Reporting",
        status: "operational",
        count: 0,
        logs: []
      }
    };

    // 1. Check 24data Connectivity
    const dataEndpoints = [
      { name: "Controllers", url: "https://24data.ptfs.app/controllers" },
      { name: "ATIS", url: "https://24data.ptfs.app/atis" }
    ];

    for (const endpoint of dataEndpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(endpoint.url, { signal: controller.signal });
        clearTimeout(timeout);
        status["24data"].endpoints.push({
          name: endpoint.name,
          status: response.ok ? "operational" : "degraded",
          statusCode: response.status
        });
        if (!response.ok) status["24data"].status = "degraded";
      } catch (error) {
        status["24data"].endpoints.push({
          name: endpoint.name,
          status: "outage",
          error: error.message
        });
        status["24data"].status = "outage";
      }
    }

    // WebSocket status
    const isServerless = process.env.VERCEL === '1';
    let wsStatusValue = 'operational';
    let wsMessage = 'Connected';
    if (isServerless) {
        wsStatusValue = 'info';
        wsMessage = 'Polling Fallback (Serverless)';
    } else if (ws && ws.readyState === WebSocket.OPEN) {
        wsStatusValue = 'operational';
        wsMessage = 'Connected';
    } else {
        wsStatusValue = 'degraded';
        wsMessage = 'Disconnected';
        status["24data"].status = "degraded";
    }
    status["24data"].endpoints.push({ name: "Real-time WebSocket", status: wsStatusValue, message: wsMessage });

    // 2. Check 24IFR API Status (internal services)
    const internalEndpoints = [
        { name: "Flight Plans", path: "/flight-plans" },
        { name: "Controllers", path: "/controllers" },
        { name: "ATIS", path: "/api/atis" },
        { name: "Leaderboard", path: "/api/leaderboard" }
    ];

    for (const endpoint of internalEndpoints) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(`http://localhost:${PORT}${endpoint.path}`, { signal: controller.signal });
            clearTimeout(timeout);
            status["24ifr_api"].endpoints.push({
                name: endpoint.name,
                status: response.ok ? "operational" : "degraded",
                statusCode: response.status
            });
            if (!response.ok) status["24ifr_api"].status = "degraded";
        } catch (error) {
            status["24ifr_api"].endpoints.push({
                name: endpoint.name,
                status: "outage",
                error: error.message
            });
            status["24ifr_api"].status = "outage";
        }
    }

    // Supabase status
    status["24ifr_api"].endpoints.push({
      name: "Database (Supabase)",
      status: supabase ? "operational" : "outage",
      message: supabase ? "Connected" : "Not Configured"
    });
    if (!supabase) status["24ifr_api"].status = "outage";

    // 3. Error Reporting
    const errorLogs = runtimeLogs.filter(log => log.level === 'error');
    status.errors.count = errorLogs.length;
    status.errors.logs = errorLogs.slice(0, 5).map(log => ({
      timestamp: log.timestamp,
      message: log.message,
      data: log.data
    })); // show last 5 errors
    if (errorLogs.length > 0) {
        status.errors.status = "degraded";
    }


    // Determine overall status for each category
    if (status["24data"].endpoints.some(e => e.status === 'outage')) status["24data"].status = 'outage';
    if (status["24ifr_api"].endpoints.some(e => e.status === 'outage')) status["24ifr_api"].status = 'outage';

    res.json(status);

  } catch (error) {
    logWithTimestamp('error', 'Failed to generate full status report', { error: error.message });
    res.status(500).json({ error: "Failed to generate status report" });
  }
});

// Reusable health check logic
const getHealthStatus = (req, res) => {
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
};

// Health check endpoint
app.get("/health", getHealthStatus);
// Mirrored health check endpoint for /api status page
app.get("/api/health", getHealthStatus);

// Test visits endpoint removed for security and cleanup

// Endpoint for chart data
app.get("/api/admin/charts", async (req, res) => {
  // Check if user is authenticated and is admin
  if (!req.session?.user || !req.session.user.is_admin) {
    return res.status(401).json({ error: 'Admin access required' });
  }

  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  try {
    const { data, error } = await supabase.rpc('get_charts_data');

    if (error) {
      logWithTimestamp('error', 'Failed to fetch chart data from RPC', { error: error.message });
      throw new Error(`Failed to fetch chart data: ${error.message}`);
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({
      error: 'Failed to fetch chart data from Supabase',
      message: error.message
    });
  }
});

// Supabase tables endpoints for admin panel
app.get("/api/admin/tables/:tableName", async (req, res) => {
  // Check if user is authenticated and is admin
  if (!req.session?.user || !req.session.user.is_admin) {
    return res.status(401).json({ error: 'Admin access required' });
  }

  const { tableName } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  const allowedTables = ['page_visits', 'clearance_generations', 'flight_plans_received', 'user_sessions', 'admin_activities', 'discord_users'];

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
  // Check if user is authenticated and is admin
  if (!req.session?.user || !req.session.user.is_admin) {
    return res.status(401).json({ error: 'Admin access required' });
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
        .select('session_id, last_activity, page_views, clearances_generated, user_agent')
        .gte('last_activity', fiveMinutesAgo)
        .order('last_activity', { ascending: false });

      supabaseUsers = (data || []).map(session => ({
        session_id: session.session_id.slice(0, 8),
        last_activity: session.last_activity,
        page_views: session.page_views || 0,
        clearances_generated: session.clearances_generated || 0,
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
