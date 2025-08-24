-- =============================================================================
-- ATC24 IFR Clearance Generator - Supabase Database Setup (Fixed + Final)
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE: page_visits
-- =============================================================================
CREATE TABLE IF NOT EXISTS page_visits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  page_path TEXT NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  session_id UUID NOT NULL,
  is_first_visit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_page_path ON page_visits(page_path);

-- =============================================================================
-- TABLE: user_sessions
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID UNIQUE NOT NULL,
  user_agent TEXT,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  page_views INTEGER DEFAULT 0,
  clearances_generated INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);

-- =============================================================================
-- TABLE: clearance_generations
-- =============================================================================
CREATE TABLE IF NOT EXISTS clearance_generations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID NOT NULL,
  callsign TEXT,
  destination TEXT,
  route TEXT,
  routing_type TEXT,
  runway TEXT,
  initial_altitude INTEGER,
  atc_station TEXT,
  atis_info TEXT,
  clearance_text TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clearance_generations_created_at ON clearance_generations(created_at);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_session_id ON clearance_generations(session_id);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_callsign ON clearance_generations(callsign);

-- =============================================================================
-- TABLE: flight_plans_received
-- =============================================================================
CREATE TABLE IF NOT EXISTS flight_plans_received (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  callsign TEXT NOT NULL,
  destination TEXT,
  route TEXT,
  flight_level TEXT,
  source TEXT DEFAULT 'Main',
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flight_plans_received_created_at ON flight_plans_received(created_at);
CREATE INDEX IF NOT EXISTS idx_flight_plans_received_callsign ON flight_plans_received(callsign);
CREATE INDEX IF NOT EXISTS idx_flight_plans_received_source ON flight_plans_received(source);

-- =============================================================================
-- TABLE: admin_activities
-- =============================================================================
CREATE TABLE IF NOT EXISTS admin_activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  action TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_activities_created_at ON admin_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activities_action ON admin_activities(action);

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearance_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_plans_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activities ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES FOR ANON (PUBLIC) ACCESS
-- =============================================================================

-- page_visits: allow inserts from anon
CREATE POLICY "Anon insert page_visits" ON page_visits FOR INSERT TO anon WITH CHECK (true);

-- user_sessions: allow inserts from anon
CREATE POLICY "Anon insert user_sessions" ON user_sessions FOR INSERT TO anon WITH CHECK (true);

-- clearance_generations: allow inserts from anon
CREATE POLICY "Anon insert clearance_generations" ON clearance_generations FOR INSERT TO anon WITH CHECK (true);

-- flight_plans_received: allow inserts from anon (optional)
CREATE POLICY "Anon insert flight_plans_received" ON flight_plans_received FOR INSERT TO anon WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES FOR SERVICE ROLE (server-side access)
-- =============================================================================

-- page_visits
CREATE POLICY "Service full access page_visits" ON page_visits FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_sessions
CREATE POLICY "Service full access user_sessions" ON user_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- clearance_generations
CREATE POLICY "Service full access clearance_generations" ON clearance_generations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- flight_plans_received
CREATE POLICY "Service full access flight_plans_received" ON flight_plans_received FOR ALL TO service_role USING (true) WITH CHECK (true);

-- admin_activities
CREATE POLICY "Service full access admin_activities" ON admin_activities FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Summary analytics
CREATE OR REPLACE FUNCTION get_analytics_summary()
RETURNS TABLE (
  total_visits BIGINT,
  total_clearances BIGINT,
  total_flight_plans BIGINT,
  unique_sessions BIGINT,
  last_7_days_visits BIGINT,
  last_30_days_visits BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM page_visits),
    (SELECT COUNT(*) FROM clearance_generations),
    (SELECT COUNT(*) FROM flight_plans_received),
    (SELECT COUNT(DISTINCT session_id) FROM user_sessions),
    (SELECT COUNT(*) FROM page_visits WHERE created_at >= NOW() - INTERVAL '7 days'),
    (SELECT COUNT(*) FROM page_visits WHERE created_at >= NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

-- Cleanup old data
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INTEGER DEFAULT 90)
RETURNS TEXT AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
  deleted_visits INTEGER;
  deleted_sessions INTEGER;
BEGIN
  cutoff_date := NOW() - (days_to_keep || ' days')::INTERVAL;
  
  DELETE FROM page_visits WHERE created_at < cutoff_date;
  GET DIAGNOSTICS deleted_visits = ROW_COUNT;
  
  DELETE FROM user_sessions WHERE last_activity < cutoff_date;
  GET DIAGNOSTICS deleted_sessions = ROW_COUNT;
  
  RETURN format('Cleanup complete. Deleted %s page visits and %s sessions older than %s days.', 
                deleted_visits, deleted_sessions, days_to_keep);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INITIAL DATA
-- ✅ FIX APPLIED: Used jsonb_build_object() for correct JSONB insertion
-- =============================================================================
INSERT INTO admin_activities (action, details)
VALUES (
  'database_setup',
  jsonb_build_object(
    'message', 'Database setup completed',
    'timestamp', NOW()
  )
) ON CONFLICT DO NOTHING;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' 
  AND table_name IN (
    'page_visits',
    'user_sessions', 
    'clearance_generations',
    'flight_plans_received',
    'admin_activities'
  );
  
  IF table_count = 5 THEN
    RAISE NOTICE '✅ All 5 tables created successfully.';
  ELSE
    RAISE NOTICE '⚠️ Only % out of 5 tables were created.', table_count;
  END IF;
END $$;

-- Confirmation message
SELECT '✅ DATABASE SETUP COMPLETE' AS status;
SELECT * FROM get_analytics_summary();
