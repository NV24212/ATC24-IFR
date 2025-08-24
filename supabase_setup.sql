-- =============================================================================
-- ATC24 IFR Clearance Generator - Supabase Database Setup
-- =============================================================================
-- 
-- This file contains all the SQL commands needed to set up the database
-- for the ATC24 IFR Clearance Generator application.
--
-- Instructions:
-- 1. Open your Supabase Dashboard (https://supabase.com/dashboard/projects)
-- 2. Select your project
-- 3. Go to "SQL Editor" in the left sidebar
-- 4. Copy and paste this entire file into the SQL editor
-- 5. Click "Run" to execute all commands
-- 6. Refresh your admin panel to see the data
--
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE: page_visits
-- Tracks all page visits to the application
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_page_path ON page_visits(page_path);

-- =============================================================================
-- TABLE: user_sessions
-- Tracks user sessions and activity
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);

-- =============================================================================
-- TABLE: clearance_generations
-- Tracks all generated IFR clearances
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_clearance_generations_created_at ON clearance_generations(created_at);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_session_id ON clearance_generations(session_id);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_callsign ON clearance_generations(callsign);

-- =============================================================================
-- TABLE: flight_plans_received
-- Stores flight plans received from external sources
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_flight_plans_received_created_at ON flight_plans_received(created_at);
CREATE INDEX IF NOT EXISTS idx_flight_plans_received_callsign ON flight_plans_received(callsign);
CREATE INDEX IF NOT EXISTS idx_flight_plans_received_source ON flight_plans_received(source);

-- =============================================================================
-- TABLE: admin_activities
-- Tracks admin panel activities for auditing
-- =============================================================================
CREATE TABLE IF NOT EXISTS admin_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    action TEXT NOT NULL,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_activities_created_at ON admin_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activities_action ON admin_activities(action);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable security for all tables
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearance_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_plans_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activities ENABLE ROW LEVEL SECURITY;

-- Allow all operations for service role (used by the server)
CREATE POLICY IF NOT EXISTS "Allow service role all access on page_visits" ON page_visits
    FOR ALL USING (true);

CREATE POLICY IF NOT EXISTS "Allow service role all access on user_sessions" ON user_sessions
    FOR ALL USING (true);

CREATE POLICY IF NOT EXISTS "Allow service role all access on clearance_generations" ON clearance_generations
    FOR ALL USING (true);

CREATE POLICY IF NOT EXISTS "Allow service role all access on flight_plans_received" ON flight_plans_received
    FOR ALL USING (true);

CREATE POLICY IF NOT EXISTS "Allow service role all access on admin_activities" ON admin_activities
    FOR ALL USING (true);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get analytics summary
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
        (SELECT COUNT(*) FROM page_visits)::BIGINT as total_visits,
        (SELECT COUNT(*) FROM clearance_generations)::BIGINT as total_clearances,
        (SELECT COUNT(*) FROM flight_plans_received)::BIGINT as total_flight_plans,
        (SELECT COUNT(DISTINCT session_id) FROM user_sessions)::BIGINT as unique_sessions,
        (SELECT COUNT(*) FROM page_visits WHERE created_at >= NOW() - INTERVAL '7 days')::BIGINT as last_7_days_visits,
        (SELECT COUNT(*) FROM page_visits WHERE created_at >= NOW() - INTERVAL '30 days')::BIGINT as last_30_days_visits;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old data (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INTEGER DEFAULT 90)
RETURNS TEXT AS $$
DECLARE
    cutoff_date TIMESTAMPTZ;
    deleted_visits INTEGER;
    deleted_sessions INTEGER;
BEGIN
    cutoff_date := NOW() - (days_to_keep || ' days')::INTERVAL;
    
    -- Delete old page visits
    DELETE FROM page_visits WHERE created_at < cutoff_date;
    GET DIAGNOSTICS deleted_visits = ROW_COUNT;
    
    -- Delete old inactive sessions
    DELETE FROM user_sessions WHERE last_activity < cutoff_date;
    GET DIAGNOSTICS deleted_sessions = ROW_COUNT;
    
    RETURN format('Cleanup completed. Deleted %s page visits and %s inactive sessions older than %s days.', 
                  deleted_visits, deleted_sessions, days_to_keep);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INITIAL DATA (OPTIONAL)
-- =============================================================================

-- Insert initial admin activity record
INSERT INTO admin_activities (action, details) 
VALUES ('database_setup', '{"message": "Database setup completed", "timestamp": "' || NOW() || '"}')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify all tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('page_visits', 'user_sessions', 'clearance_generations', 'flight_plans_received', 'admin_activities');
    
    IF table_count = 5 THEN
        RAISE NOTICE 'SUCCESS: All 5 tables created successfully!';
        RAISE NOTICE 'Tables: page_visits, user_sessions, clearance_generations, flight_plans_received, admin_activities';
    ELSE
        RAISE NOTICE 'WARNING: Only % out of 5 tables were created', table_count;
    END IF;
END $$;

-- Display analytics summary
SELECT 'DATABASE SETUP COMPLETE' as status;
SELECT * FROM get_analytics_summary();

-- =============================================================================
-- SETUP COMPLETE
-- =============================================================================
-- 
-- Your ATC24 database is now ready!
-- 
-- Next steps:
-- 1. Configure your application with your Supabase URL and API key
-- 2. Set the SUPABASE_URL and SUPABASE_ANON_KEY environment variables
-- 3. Test the admin panel to ensure data is being collected
-- 
-- Optional maintenance:
-- - Run cleanup_old_data() function periodically to remove old data
-- - Monitor table sizes and performance as your application grows
-- 
-- =============================================================================
