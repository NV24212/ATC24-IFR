-- ATC24-IFR Complete Database Setup with Discord Authentication (FIXED)
-- Run this SQL in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to ensure clean setup
DROP TABLE IF EXISTS admin_activities CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS flight_plans_received CASCADE;
DROP TABLE IF EXISTS clearance_generations CASCADE;
DROP TABLE IF EXISTS page_visits CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table for Discord authentication
CREATE TABLE users (
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

-- Create page_visits table
CREATE TABLE page_visits (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    page_path TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    referrer TEXT,
    session_id TEXT NOT NULL,
    is_first_visit BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    discord_username VARCHAR(255)
);

-- Create clearance_generations table  
CREATE TABLE clearance_generations (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    discord_username VARCHAR(255)
);

-- Create flight_plans_received table
CREATE TABLE flight_plans_received (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    callsign TEXT NOT NULL,
    destination TEXT,
    route TEXT,
    flight_level TEXT,
    source TEXT DEFAULT 'Main',
    raw_data JSONB,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create user_sessions table
CREATE TABLE user_sessions (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    page_views INTEGER DEFAULT 0,
    clearances_generated INTEGER DEFAULT 0,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    discord_username VARCHAR(255)
);

-- Create admin_activities table
CREATE TABLE admin_activities (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    discord_username VARCHAR(255)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_users_discord_id ON users(discord_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_last_login ON users(last_login);
CREATE INDEX idx_users_is_admin ON users(is_admin);
CREATE INDEX idx_page_visits_session_id ON page_visits(session_id);
CREATE INDEX idx_page_visits_created_at ON page_visits(created_at);
CREATE INDEX idx_page_visits_user_id ON page_visits(user_id);
CREATE INDEX idx_clearance_generations_session_id ON clearance_generations(session_id);
CREATE INDEX idx_clearance_generations_created_at ON clearance_generations(created_at);
CREATE INDEX idx_clearance_generations_user_id ON clearance_generations(user_id);
CREATE INDEX idx_clearance_generations_callsign ON clearance_generations(callsign);
CREATE INDEX idx_flight_plans_callsign ON flight_plans_received(callsign);
CREATE INDEX idx_flight_plans_created_at ON flight_plans_received(created_at);
CREATE INDEX idx_flight_plans_user_id ON flight_plans_received(user_id);
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_last_activity ON user_sessions(last_activity);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_admin_activities_created_at ON admin_activities(created_at);
CREATE INDEX idx_admin_activities_user_id ON admin_activities(user_id);

-- Enable Row Level Security for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearance_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_plans_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text OR is_admin = true);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = id::text OR is_admin = true);

CREATE POLICY "Service role full access users" ON users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read basic info" ON users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow anon to insert page visits" ON page_visits
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow service_role to read page visits" ON page_visits
    FOR SELECT TO service_role USING (true);

CREATE POLICY "Allow authenticated to read own page visits" ON page_visits
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Allow anon to insert clearance generations" ON clearance_generations
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow service_role to read clearance generations" ON clearance_generations
    FOR SELECT TO service_role USING (true);

CREATE POLICY "Allow authenticated to read own clearances" ON clearance_generations
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Allow anon to insert flight plans" ON flight_plans_received
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow service_role to read flight plans" ON flight_plans_received
    FOR SELECT TO service_role USING (true);

CREATE POLICY "Allow authenticated to read flight plans" ON flight_plans_received
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow anon to upsert user sessions" ON user_sessions
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role to read user sessions" ON user_sessions
    FOR SELECT TO service_role USING (true);

CREATE POLICY "Allow authenticated to read own sessions" ON user_sessions
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Allow anon to insert admin activities" ON admin_activities
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow service_role to read admin activities" ON admin_activities
    FOR SELECT TO service_role USING (true);

CREATE POLICY "Allow admins to read admin activities" ON admin_activities
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
    );

-- Drop all existing functions to avoid conflicts
DROP FUNCTION IF EXISTS get_user_by_discord_id(TEXT);
DROP FUNCTION IF EXISTS upsert_discord_user(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_admin_users();
DROP FUNCTION IF EXISTS add_admin_user_by_username(VARCHAR, JSONB);
DROP FUNCTION IF EXISTS remove_admin_user(UUID);
DROP FUNCTION IF EXISTS update_user_from_discord_login(VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_analytics_summary();

-- Create function to get user by Discord ID (FIXED - proper table qualification)
CREATE OR REPLACE FUNCTION get_user_by_discord_id(p_discord_id TEXT)
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
    SELECT 
        users.id,
        users.discord_id,
        users.username,
        users.email,
        users.avatar,
        users.is_admin,
        users.roles,
        users.created_at,
        users.last_login
    FROM users
    WHERE users.discord_id = p_discord_id;
END;
$$;

-- Create function to create or update user from Discord data (FIXED - proper table qualification)
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

-- Create function to get all admin users (FIXED - proper table qualification)
CREATE OR REPLACE FUNCTION get_admin_users()
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
    SELECT
        users.id,
        users.discord_id,
        users.username,
        users.email,
        users.avatar,
        users.is_admin,
        users.roles,
        users.created_at,
        users.last_login
    FROM users
    WHERE users.is_admin = true
    ORDER BY users.created_at DESC;
END;
$$;

-- Create function to add admin user by username (FIXED - proper table qualification)
CREATE OR REPLACE FUNCTION add_admin_user_by_username(
    p_username VARCHAR,
    p_roles JSONB DEFAULT '["admin"]'::jsonb
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_exists BOOLEAN;
BEGIN
    -- Check if user exists
    SELECT users.id, TRUE INTO v_user_id, v_user_exists 
    FROM users 
    WHERE users.username = p_username;
    
    IF v_user_exists THEN
        -- Update existing user to admin
        UPDATE users 
        SET 
            is_admin = TRUE,
            roles = p_roles,
            updated_at = NOW()
        WHERE users.id = v_user_id;
        
        RETURN QUERY SELECT TRUE, 'User promoted to admin successfully'::TEXT, v_user_id;
    ELSE
        -- Create placeholder admin user (will be updated when they login)
        INSERT INTO users (discord_id, username, is_admin, roles)
        VALUES ('pending_' || p_username, p_username, TRUE, p_roles)
        RETURNING users.id INTO v_user_id;
        
        RETURN QUERY SELECT TRUE, 'Admin user created (will be activated on first Discord login)'::TEXT, v_user_id;
    END IF;
END;
$$;

-- Create function to remove admin user (FIXED - proper table qualification)
CREATE OR REPLACE FUNCTION remove_admin_user(p_user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE users 
    SET 
        is_admin = FALSE,
        roles = '[]'::jsonb,
        updated_at = NOW()
    WHERE users.id = p_user_id;
    
    IF FOUND THEN
        RETURN QUERY SELECT TRUE, 'Admin privileges removed successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'User not found'::TEXT;
    END IF;
END;
$$;

-- Create function to update user from Discord login (FIXED - proper table qualification)
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
    v_pending_user UUID;
BEGIN
    -- Check for pending admin user
    SELECT users.id INTO v_pending_user 
    FROM users 
    WHERE users.discord_id = 'pending_' || p_username AND users.is_admin = TRUE;
    
    IF v_pending_user IS NOT NULL THEN
        -- Update pending admin user with Discord info
        RETURN QUERY
        UPDATE users 
        SET 
            discord_id = p_discord_id,
            email = p_email,
            avatar = p_avatar,
            last_login = NOW(),
            updated_at = NOW()
        WHERE users.id = v_pending_user
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
    ELSE
        -- Regular user login - use upsert
        RETURN QUERY
        SELECT * FROM upsert_discord_user(
            p_discord_id,
            p_username,
            NULL,
            p_email,
            p_avatar,
            NULL,
            NULL,
            NULL
        );
    END IF;
END;
$$;

-- Create function to get analytics data (FIXED - proper table qualification)
CREATE OR REPLACE FUNCTION get_analytics_summary()
RETURNS TABLE (
    total_visits BIGINT,
    clearances_generated BIGINT,
    flight_plans_received BIGINT,
    daily_visit_days BIGINT,
    unique_users BIGINT,
    admin_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE((SELECT COUNT(*) FROM page_visits), 0) as total_visits,
        COALESCE((SELECT COUNT(*) FROM clearance_generations), 0) as clearances_generated,
        COALESCE((SELECT COUNT(*) FROM flight_plans_received), 0) as flight_plans_received,
        COALESCE((SELECT COUNT(DISTINCT DATE(page_visits.created_at)) FROM page_visits), 0) as daily_visit_days,
        COALESCE((SELECT COUNT(*) FROM users WHERE users.discord_id NOT LIKE 'pending_%'), 0) as unique_users,
        COALESCE((SELECT COUNT(*) FROM users WHERE users.is_admin = true), 0) as admin_users;
END;
$$;

-- Insert the main admin user (h.a.s2)
INSERT INTO users (discord_id, username, email, is_admin, roles)
VALUES ('000000000', 'h.a.s2', 'admin@24ifr.hasmah.xyz', true, '["admin", "super_admin"]'::jsonb);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Insert test data
INSERT INTO page_visits (page_path, user_agent, ip_address, session_id, is_first_visit, discord_username)
VALUES 
    ('/', 'Test Browser', '127.0.0.1', 'test-session-1', true, 'test_user'),
    ('/license', 'Test Browser', '127.0.0.1', 'test-session-1', false, 'test_user');

INSERT INTO flight_plans_received (callsign, destination, route, source)
VALUES 
    ('TEST123', 'EGLL', 'DCT', 'Test'),
    ('DEMO456', 'KJFK', 'GPS Direct', 'Test');

-- Success message
SELECT 'ATC24-IFR Complete Database Setup completed successfully! All tables, functions, and Discord authentication ready. Fixed ambiguous column references.' as message;
