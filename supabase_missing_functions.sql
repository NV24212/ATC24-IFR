
-- =============================================================================
-- ATC24 Complete Database Setup with Missing Functions
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
    last_login TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for discord_users
CREATE INDEX IF NOT EXISTS idx_discord_users_discord_id ON discord_users(discord_id);
CREATE INDEX IF NOT EXISTS idx_discord_users_username ON discord_users(username);
CREATE INDEX IF NOT EXISTS idx_discord_users_is_admin ON discord_users(is_admin);
CREATE INDEX IF NOT EXISTS idx_discord_users_last_login ON discord_users(last_login);

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
) RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION: upsert_discord_user
-- Creates or updates Discord user data
-- =============================================================================
CREATE OR REPLACE FUNCTION upsert_discord_user(
    p_discord_id TEXT,
    p_username TEXT,
    p_discriminator TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_avatar TEXT DEFAULT NULL,
    p_access_token TEXT DEFAULT NULL,
    p_refresh_token TEXT DEFAULT NULL,
    p_token_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE(
    id UUID,
    discord_id TEXT,
    username TEXT,
    email TEXT,
    avatar TEXT,
    is_admin BOOLEAN,
    roles JSONB
) AS $$
BEGIN
    INSERT INTO discord_users (
        discord_id,
        username,
        discriminator,
        email,
        avatar,
        access_token,
        refresh_token,
        token_expires_at,
        last_login,
        updated_at
    ) VALUES (
        p_discord_id,
        p_username,
        p_discriminator,
        p_email,
        p_avatar,
        p_access_token,
        p_refresh_token,
        p_token_expires_at,
        NOW(),
        NOW()
    )
    ON CONFLICT (discord_id) DO UPDATE SET
        username = EXCLUDED.username,
        discriminator = EXCLUDED.discriminator,
        email = EXCLUDED.email,
        avatar = EXCLUDED.avatar,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expires_at = EXCLUDED.token_expires_at,
        last_login = NOW(),
        updated_at = NOW()
    RETURNING 
        discord_users.id,
        discord_users.discord_id,
        discord_users.username,
        discord_users.email,
        discord_users.avatar,
        discord_users.is_admin,
        discord_users.roles;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION: update_user_from_discord_login
-- Updates existing user from Discord login (handles pending admin users)
-- =============================================================================
CREATE OR REPLACE FUNCTION update_user_from_discord_login(
    p_discord_id TEXT,
    p_username TEXT,
    p_email TEXT DEFAULT NULL,
    p_avatar TEXT DEFAULT NULL
) RETURNS TABLE(
    id UUID,
    discord_id TEXT,
    username TEXT,
    email TEXT,
    avatar TEXT,
    is_admin BOOLEAN,
    roles JSONB
) AS $$
BEGIN
    -- Update existing user or create new one
    INSERT INTO discord_users (
        discord_id,
        username,
        email,
        avatar,
        last_login,
        updated_at
    ) VALUES (
        p_discord_id,
        p_username,
        p_email,
        p_avatar,
        NOW(),
        NOW()
    )
    ON CONFLICT (discord_id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        avatar = EXCLUDED.avatar,
        last_login = NOW(),
        updated_at = NOW()
    RETURNING 
        discord_users.id,
        discord_users.discord_id,
        discord_users.username,
        discord_users.email,
        discord_users.avatar,
        discord_users.is_admin,
        discord_users.roles;
END;
$$ LANGUAGE plpgsql;

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
) AS $$
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
$$ LANGUAGE plpgsql;

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
) AS $$
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
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION: remove_admin_user
-- Removes admin privileges from a user
-- =============================================================================
CREATE OR REPLACE FUNCTION remove_admin_user(
    p_user_id UUID
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
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
$$ LANGUAGE plpgsql;

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
) AS $$
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
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGER FUNCTION: update_updated_at_column
-- Automatically updates the updated_at timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearance_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_plans_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for anon and authenticated users
-- Allow service_role to bypass RLS for server operations

-- Discord users policies
CREATE POLICY "Allow service role full access" ON discord_users FOR ALL TO service_role USING (true);
CREATE POLICY "Allow anon read access" ON discord_users FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated read access" ON discord_users FOR SELECT TO authenticated USING (true);

-- Page visits policies
CREATE POLICY "Allow service role full access" ON page_visits FOR ALL TO service_role USING (true);
CREATE POLICY "Allow anon insert access" ON page_visits FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON page_visits FOR ALL TO authenticated USING (true);

-- User sessions policies
CREATE POLICY "Allow service role full access" ON user_sessions FOR ALL TO service_role USING (true);
CREATE POLICY "Allow anon insert access" ON user_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON user_sessions FOR ALL TO authenticated USING (true);

-- Clearance generations policies
CREATE POLICY "Allow service role full access" ON clearance_generations FOR ALL TO service_role USING (true);
CREATE POLICY "Allow anon insert access" ON clearance_generations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON clearance_generations FOR ALL TO authenticated USING (true);

-- Flight plans policies
CREATE POLICY "Allow service role full access" ON flight_plans_received FOR ALL TO service_role USING (true);
CREATE POLICY "Allow anon read access" ON flight_plans_received FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated read access" ON flight_plans_received FOR SELECT TO authenticated USING (true);

-- Admin activities policies
CREATE POLICY "Allow service role full access" ON admin_activities FOR ALL TO service_role USING (true);
CREATE POLICY "Allow authenticated read access" ON admin_activities FOR SELECT TO authenticated USING (true);

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
