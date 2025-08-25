-- =============================================================================
-- ATC24 Essential Tables Creation - Step by Step
-- =============================================================================
-- 
-- Run this in your Supabase SQL Editor to create the missing tables
--
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Step 1: Create users table for Discord OAuth
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    discord_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    discriminator VARCHAR(10),
    email VARCHAR(255),
    avatar VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    roles JSONB DEFAULT '[]'::jsonb,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- =============================================================================
-- Step 2: Create user_sessions table (fixed version)
-- =============================================================================

-- First, drop the problematic constraint if it exists
ALTER TABLE IF EXISTS user_sessions DROP CONSTRAINT IF EXISTS user_sessions_session_id_key;
DROP INDEX IF EXISTS idx_user_sessions_session_id;

-- Recreate user_sessions table with proper schema
DROP TABLE IF EXISTS user_sessions;
CREATE TABLE user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_agent TEXT,
    ip_address TEXT,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    page_views INTEGER DEFAULT 0,
    clearances_generated INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add proper indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);

-- =============================================================================
-- Step 3: Ensure other core tables exist
-- =============================================================================

-- Page visits table
CREATE TABLE IF NOT EXISTS page_visits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    page_path TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    referrer TEXT,
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    discord_username TEXT,
    is_first_visit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for page_visits
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_page_visits_user_id ON page_visits(user_id);

-- Clearance generations table
CREATE TABLE IF NOT EXISTS clearance_generations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    callsign TEXT,
    destination TEXT,
    route TEXT,
    routing_type TEXT,
    runway TEXT,
    squawk_code TEXT,
    flight_level TEXT,
    initial_altitude INTEGER,
    atis_letter TEXT,
    atis_info TEXT,
    atc_station TEXT,
    clearance_text TEXT,
    discord_username TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for clearance_generations
CREATE INDEX IF NOT EXISTS idx_clearance_generations_session_id ON clearance_generations(session_id);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_created_at ON clearance_generations(created_at);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_user_id ON clearance_generations(user_id);

-- Flight plans received table
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

-- Add indexes for flight_plans_received
CREATE INDEX IF NOT EXISTS idx_flight_plans_received_created_at ON flight_plans_received(created_at);
CREATE INDEX IF NOT EXISTS idx_flight_plans_received_callsign ON flight_plans_received(callsign);

-- Admin activities table
CREATE TABLE IF NOT EXISTS admin_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for admin_activities
CREATE INDEX IF NOT EXISTS idx_admin_activities_created_at ON admin_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activities_action ON admin_activities(action);

-- =============================================================================
-- Step 4: Create updated_at trigger function
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Step 5: Create essential database functions
-- =============================================================================

-- Function for safe session upsert
CREATE OR REPLACE FUNCTION upsert_user_session(
    p_session_id TEXT,
    p_user_id UUID DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_page_views INTEGER DEFAULT NULL,
    p_clearances_generated INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    session_id TEXT,
    user_id UUID,
    page_views INTEGER,
    clearances_generated INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    INSERT INTO user_sessions (
        session_id,
        user_id,
        user_agent,
        ip_address,
        page_views,
        clearances_generated,
        last_activity
    )
    VALUES (
        p_session_id,
        p_user_id,
        p_user_agent,
        p_ip_address,
        COALESCE(p_page_views, 0),
        COALESCE(p_clearances_generated, 0),
        NOW()
    )
    ON CONFLICT (session_id) 
    DO UPDATE SET
        user_id = COALESCE(EXCLUDED.user_id, user_sessions.user_id),
        user_agent = COALESCE(EXCLUDED.user_agent, user_sessions.user_agent),
        ip_address = COALESCE(EXCLUDED.ip_address, user_sessions.ip_address),
        page_views = COALESCE(EXCLUDED.page_views, user_sessions.page_views),
        clearances_generated = COALESCE(EXCLUDED.clearances_generated, user_sessions.clearances_generated),
        last_activity = NOW(),
        updated_at = NOW()
    RETURNING 
        user_sessions.id,
        user_sessions.session_id,
        user_sessions.user_id,
        user_sessions.page_views,
        user_sessions.clearances_generated,
        user_sessions.created_at,
        user_sessions.updated_at;
END;
$$;

-- Function to create or update user from Discord data
CREATE OR REPLACE FUNCTION upsert_discord_user(
    p_discord_id VARCHAR,
    p_username VARCHAR,
    p_discriminator VARCHAR DEFAULT NULL,
    p_email VARCHAR DEFAULT NULL,
    p_avatar VARCHAR DEFAULT NULL,
    p_access_token TEXT DEFAULT NULL,
    p_refresh_token TEXT DEFAULT NULL,
    p_token_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    discord_id VARCHAR,
    username VARCHAR,
    email VARCHAR,
    avatar VARCHAR,
    is_admin BOOLEAN,
    roles JSONB,
    created_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    INSERT INTO users (
        discord_id,
        username,
        discriminator,
        email,
        avatar,
        access_token,
        refresh_token,
        token_expires_at,
        last_login
    )
    VALUES (
        p_discord_id,
        p_username,
        p_discriminator,
        p_email,
        p_avatar,
        p_access_token,
        p_refresh_token,
        p_token_expires_at,
        NOW()
    )
    ON CONFLICT (discord_id) 
    DO UPDATE SET
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
        users.id,
        users.discord_id,
        users.username,
        users.email,
        users.avatar,
        users.is_admin,
        users.roles,
        users.created_at,
        users.last_login;
END;
$$;

-- Function to update user from Discord login (handles pending admin users)
CREATE OR REPLACE FUNCTION update_user_from_discord_login(
    p_discord_id VARCHAR,
    p_username VARCHAR,
    p_email VARCHAR DEFAULT NULL,
    p_avatar VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    discord_id VARCHAR,
    username VARCHAR,
    email VARCHAR,
    avatar VARCHAR,
    is_admin BOOLEAN,
    roles JSONB,
    created_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pending_user_id UUID;
    final_is_admin BOOLEAN := false;
    final_roles JSONB := '[]'::jsonb;
BEGIN
    -- Check if there's a pending user with this username
    SELECT u.id, u.is_admin, u.roles INTO pending_user_id, final_is_admin, final_roles
    FROM users u
    WHERE u.discord_id = 'pending_' || p_username AND u.username = p_username
    LIMIT 1;

    IF pending_user_id IS NOT NULL THEN
        -- Update the pending user with real Discord data
        UPDATE users
        SET
            discord_id = p_discord_id,
            email = p_email,
            avatar = p_avatar,
            last_login = NOW(),
            updated_at = NOW()
        WHERE id = pending_user_id;

        -- Return the updated user
        RETURN QUERY
        SELECT
            u.id,
            u.discord_id,
            u.username,
            u.email,
            u.avatar,
            u.is_admin,
            u.roles,
            u.created_at,
            u.last_login
        FROM users u
        WHERE u.id = pending_user_id;
    ELSE
        -- Use the existing upsert function
        RETURN QUERY
        SELECT * FROM upsert_discord_user(
            p_discord_id,
            p_username,
            NULL, -- discriminator
            p_email,
            p_avatar,
            NULL, -- access_token
            NULL, -- refresh_token
            NULL  -- token_expires_at
        );
    END IF;
END;
$$;

-- =============================================================================
-- Step 6: Enable Row Level Security and Create Policies
-- =============================================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearance_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_plans_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Service role full access on users" ON users;
DROP POLICY IF EXISTS "Service role full access on user_sessions" ON user_sessions;
DROP POLICY IF EXISTS "Service role full access on page_visits" ON page_visits;
DROP POLICY IF EXISTS "Service role full access on clearance_generations" ON clearance_generations;
DROP POLICY IF EXISTS "Service role full access on flight_plans_received" ON flight_plans_received;
DROP POLICY IF EXISTS "Service role full access on admin_activities" ON admin_activities;

-- Create service role policies (for server operations)
CREATE POLICY "Service role full access on users" ON users
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access on user_sessions" ON user_sessions
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access on page_visits" ON page_visits
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access on clearance_generations" ON clearance_generations
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access on flight_plans_received" ON flight_plans_received
    FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access on admin_activities" ON admin_activities
    FOR ALL TO service_role USING (true);

-- Create anon policies (for client operations)
CREATE POLICY "Anon can insert page visits" ON page_visits
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can manage user sessions" ON user_sessions
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can insert clearance generations" ON clearance_generations
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can insert flight plans" ON flight_plans_received
    FOR INSERT TO anon WITH CHECK (true);

-- =============================================================================
-- Step 7: Grant Permissions
-- =============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION upsert_user_session TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION upsert_discord_user TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_user_from_discord_login TO anon, authenticated, service_role;

-- Grant table permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON user_sessions TO anon;
GRANT INSERT ON page_visits TO anon;
GRANT INSERT ON clearance_generations TO anon;
GRANT INSERT ON flight_plans_received TO anon;
GRANT SELECT ON users TO authenticated;

-- =============================================================================
-- Step 8: Insert default admin user
-- =============================================================================

-- Insert the main admin user if it doesn't exist
INSERT INTO users (discord_id, username, email, is_admin, roles)
VALUES ('000000000', 'admin', 'admin@example.com', true, '["admin", "super_admin"]'::jsonb)
ON CONFLICT (discord_id) DO NOTHING;

-- =============================================================================
-- Step 9: Verification
-- =============================================================================

DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('users', 'user_sessions', 'page_visits', 'clearance_generations', 'flight_plans_received', 'admin_activities');
    
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name IN ('upsert_user_session', 'upsert_discord_user', 'update_user_from_discord_login');
    
    IF table_count = 6 AND function_count = 3 THEN
        RAISE NOTICE '✅ SUCCESS: All essential tables and functions created!';
        RAISE NOTICE '📊 Tables: % | Functions: %', table_count, function_count;
        RAISE NOTICE '🔧 Users table created - Discord OAuth ready';
        RAISE NOTICE '🔐 Session constraint issues resolved';
        RAISE NOTICE '📈 Database fully configured';
    ELSE
        RAISE NOTICE '⚠️  WARNING: Setup incomplete - Tables: %, Functions: %', table_count, function_count;
    END IF;
END $$;

-- Show created tables
SELECT 'Essential tables created:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'user_sessions', 'page_visits', 'clearance_generations', 'flight_plans_received', 'admin_activities')
ORDER BY table_name;
