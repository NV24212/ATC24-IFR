-- =============================================================================
-- ATC24 Complete Database Setup with Missing Functions - FIXED
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
    vatsim_cid TEXT,
    is_controller BOOLEAN DEFAULT FALSE,
    user_settings JSONB,
    last_login TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for discord_users
CREATE INDEX IF NOT EXISTS idx_discord_users_discord_id ON discord_users(discord_id);
CREATE INDEX IF NOT EXISTS idx_discord_users_username ON discord_users(username);
CREATE INDEX IF NOT EXISTS idx_discord_users_is_admin ON discord_users(is_admin);
CREATE INDEX IF NOT EXISTS idx_discord_users_last_login ON discord_users(last_login);
CREATE INDEX IF NOT EXISTS idx_discord_users_vatsim_cid ON discord_users(vatsim_cid);
CREATE INDEX IF NOT EXISTS idx_discord_users_is_controller ON discord_users(is_controller);

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
-- TABLE: admin_settings
-- Stores persistent admin panel settings
-- =============================================================================
CREATE TABLE IF NOT EXISTS admin_settings (
    id INT PRIMARY KEY DEFAULT 1,
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row_constraint CHECK (id = 1)
);

-- =============================================================================
-- FUNCTION: is_admin (NEW)
-- Checks if the currently authenticated user has admin privileges.
-- =============================================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    RETURN (
      SELECT is_admin
      FROM public.discord_users
      WHERE id = auth.uid()
    );
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Enable RLS for admin_settings
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Policies for admin_settings: service_role can do anything, authenticated admins can read/write
DROP POLICY IF EXISTS "Service role full access on admin_settings" ON admin_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON admin_settings;
CREATE POLICY "Service role full access on admin_settings" ON admin_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage settings" ON admin_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());


-- Insert default settings if the table is empty
-- This ensures that on first setup, there's a settings row to work with.
DO $$
DECLARE
  default_settings JSONB := '{
    "clearanceFormat": {
      "includeAtis": true,
      "includeSquawk": true,
      "includeFlightLevel": true,
      "phraseologyStyle": "ICAO",
      "customTemplate": "{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}.",
      "includeStartupApproval": true,
      "includeInitialClimb": true
    },
    "aviation": {
      "defaultAltitudes": [1000, 2000, 3000, 4000, 5000],
      "enableRunwayValidation": false,
      "enableSIDValidation": false,
      "squawkRanges": {
        "min": 1000,
        "max": 7777,
        "exclude": [7500, 7600, 7700]
      },
      "atisLetters": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]
    },
    "system": {
      "maxFlightPlansStored": 20,
      "enableDetailedLogging": false,
      "autoRefreshInterval": 30000,
      "controllerPollInterval": 300000,
      "enableFlightPlanFiltering": false
    }
  }';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_settings WHERE id = 1) THEN
    INSERT INTO admin_settings (id, settings) VALUES (1, default_settings);
  END IF;
END $$;

-- =============================================================================

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
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- =============================================================================
-- FUNCTION: upsert_discord_user (FIXED to avoid ambiguous columns)
-- Creates or updates Discord user data with admin check
-- =============================================================================
CREATE OR REPLACE FUNCTION upsert_discord_user(
    p_discord_id TEXT,
    p_username TEXT,
    p_discriminator TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_avatar TEXT DEFAULT NULL,
    p_access_token TEXT DEFAULT NULL,
    p_refresh_token TEXT DEFAULT NULL,
    p_token_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_vatsim_cid TEXT DEFAULT NULL
) RETURNS TABLE(
    id UUID,
    discord_id TEXT,
    username TEXT,
    email TEXT,
    avatar TEXT,
    is_admin BOOLEAN,
    roles JSONB,
    vatsim_cid TEXT,
    is_controller BOOLEAN
)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Check if user exists
    SELECT discord_users.id INTO v_user_id FROM discord_users WHERE discord_users.discord_id = p_discord_id;

    IF FOUND THEN
        -- Update existing user
        UPDATE discord_users
        SET
            username = p_username,
            discriminator = p_discriminator,
            email = p_email,
            avatar = p_avatar,
            access_token = p_access_token,
            refresh_token = p_refresh_token,
            token_expires_at = p_token_expires_at,
            vatsim_cid = COALESCE(p_vatsim_cid, discord_users.vatsim_cid),
            is_admin = CASE
                WHEN p_discord_id = '1200035083550208042' OR p_username = 'h.a.s2' THEN TRUE
                ELSE discord_users.is_admin -- Preserve existing value
            END,
            roles = CASE
                WHEN p_discord_id = '1200035083550208042' OR p_username = 'h.a.s2' THEN '["admin", "super_admin"]'::JSONB
                ELSE discord_users.roles -- Preserve existing value
            END,
            last_login = NOW(),
            updated_at = NOW()
        WHERE discord_users.discord_id = p_discord_id;
    ELSE
        -- Insert new user
        INSERT INTO discord_users (
            discord_id, username, discriminator, email, avatar, access_token, refresh_token, token_expires_at, vatsim_cid, is_admin, roles, last_login, created_at, updated_at
        ) VALUES (
            p_discord_id, p_username, p_discriminator, p_email, p_avatar, p_access_token, p_refresh_token, p_token_expires_at, p_vatsim_cid,
            CASE WHEN p_discord_id = '1200035083550208042' OR p_username = 'h.a.s2' THEN TRUE ELSE FALSE END,
            CASE WHEN p_discord_id = '1200035083550208042' OR p_username = 'h.a.s2' THEN '["admin", "super_admin"]'::JSONB ELSE '[]'::JSONB END,
            NOW(), NOW(), NOW()
        );
    END IF;

    -- Return the user's data
    RETURN QUERY
    SELECT du.id, du.discord_id, du.username, du.email, du.avatar, du.is_admin, du.roles, du.vatsim_cid, du.is_controller
    FROM discord_users du WHERE du.discord_id = p_discord_id;
END;
$$;


-- =============================================================================
-- FUNCTION: update_user_from_discord_login (FIXED to avoid ambiguous columns)
-- Updates existing user from Discord login (handles pending admin users)
-- =============================================================================
CREATE OR REPLACE FUNCTION update_user_from_discord_login(
    p_discord_id TEXT,
    p_username TEXT,
    p_email TEXT DEFAULT NULL,
    p_avatar TEXT DEFAULT NULL,
    p_vatsim_cid TEXT DEFAULT NULL
) RETURNS TABLE(
    id UUID,
    discord_id TEXT,
    username TEXT,
    email TEXT,
    avatar TEXT,
    is_admin BOOLEAN,
    roles JSONB,
    vatsim_cid TEXT,
    is_controller BOOLEAN
)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
    v_pending_user_id UUID;
    v_existing_user_id UUID;
BEGIN
    -- Check for a pending admin user created by username
    SELECT discord_users.id INTO v_pending_user_id
    FROM discord_users
    WHERE discord_users.discord_id LIKE 'pending_%' AND discord_users.username = p_username AND discord_users.is_admin = TRUE
    LIMIT 1;

    IF FOUND THEN
        -- Pending admin found, update their record with the real discord_id and info
        UPDATE discord_users
        SET
            discord_id = p_discord_id,
            email = p_email,
            avatar = p_avatar,
            vatsim_cid = COALESCE(p_vatsim_cid, discord_users.vatsim_cid),
            last_login = NOW(),
            updated_at = NOW()
        WHERE id = v_pending_user_id;
    ELSE
        -- No pending user, so check for a regular existing user by discord_id
        SELECT discord_users.id INTO v_existing_user_id FROM discord_users WHERE discord_users.discord_id = p_discord_id;

        IF FOUND THEN
            -- User exists, update them
            UPDATE discord_users
            SET
                username = p_username,
                email = p_email,
                avatar = p_avatar,
                vatsim_cid = COALESCE(p_vatsim_cid, discord_users.vatsim_cid),
                -- We preserve the is_admin and roles fields, as promotion is handled by add_admin_user_by_username
                last_login = NOW(),
                updated_at = NOW()
            WHERE id = v_existing_user_id;
        ELSE
            -- User does not exist, create a new one
            INSERT INTO discord_users (
                discord_id, username, email, avatar, vatsim_cid, is_admin, roles, last_login, created_at, updated_at
            ) VALUES (
                p_discord_id, p_username, p_email, p_avatar, p_vatsim_cid,
                -- New users are not admin unless they match the hardcoded values
                CASE WHEN p_discord_id = '1200035083550208042' OR p_username = 'h.a.s2' THEN TRUE ELSE FALSE END,
                CASE WHEN p_discord_id = '1200035083550208042' OR p_username = 'h.a.s2' THEN '["admin", "super_admin"]'::JSONB ELSE '[]'::JSONB END,
                NOW(), NOW(), NOW()
            );
        END IF;
    END IF;

    -- Return the final state of the user
    RETURN QUERY
    SELECT du.id, du.discord_id, du.username, du.email, du.avatar, du.is_admin, du.roles, du.vatsim_cid, du.is_controller
    FROM discord_users du WHERE du.discord_id = p_discord_id;
END;
$$;

-- =============================================================================
-- FUNCTION: set_user_controller_status
-- Updates the controller status for a given user.
-- =============================================================================
CREATE OR REPLACE FUNCTION set_user_controller_status(
    p_user_id UUID,
    p_is_controller BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    UPDATE discord_users
    SET
        is_controller = p_is_controller,
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$;


-- =============================================================================
-- Drop existing functions if they exist with different signatures
-- =============================================================================
DROP FUNCTION IF EXISTS get_admin_users();
DROP FUNCTION IF EXISTS add_admin_user_by_username(TEXT);
DROP FUNCTION IF EXISTS add_admin_user_by_username(character varying, jsonb);
DROP FUNCTION IF EXISTS add_admin_user_by_username(TEXT, JSONB);
DROP FUNCTION IF EXISTS remove_admin_user(UUID);
DROP FUNCTION IF EXISTS get_analytics_summary();
DROP FUNCTION IF EXISTS get_charts_data();

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
)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
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
$$;

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
)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
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
$$;

-- =============================================================================
-- FUNCTION: remove_admin_user
-- Removes admin privileges from a user
-- =============================================================================
CREATE OR REPLACE FUNCTION remove_admin_user(
    p_user_id UUID
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
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
$$;

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
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- =============================================================================
-- FUNCTION: get_charts_data
-- Gets aggregated data for analytics charts
-- =============================================================================
CREATE OR REPLACE FUNCTION get_charts_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    visits_data JSON;
    clearances_data JSON;
BEGIN
    -- Aggregate page visits for the last 30 days
    SELECT json_agg(t)
    INTO visits_data
    FROM (
        SELECT
            DATE(created_at) as date,
            COUNT(*) as count
        FROM page_visits
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    ) t;

    -- Aggregate clearance generations for the last 30 days
    SELECT json_agg(t)
    INTO clearances_data
    FROM (
        SELECT
            DATE(created_at) as date,
            COUNT(*) as count
        FROM clearance_generations
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    ) t;

    -- Return as a single JSON object
    RETURN json_build_object(
        'daily_visits', COALESCE(visits_data, '[]'::json),
        'daily_clearances', COALESCE(clearances_data, '[]'::json)
    );
END;
$$;

-- =============================================================================
-- TRIGGER FUNCTION: update_updated_at_column
-- Automatically updates the updated_at timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

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
-- ROW LEVEL SECURITY (RLS) POLICIES (REVISED FOR ADMIN ACCESS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearance_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_plans_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activities ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Service role full access discord_users" ON discord_users;
DROP POLICY IF EXISTS "Anon read discord_users" ON discord_users;
DROP POLICY IF EXISTS "Authenticated read discord_users" ON discord_users;
DROP POLICY IF EXISTS "Admins have full access to discord_users" ON discord_users;
DROP POLICY IF EXISTS "Authenticated full access page_visits" ON page_visits;
DROP POLICY IF EXISTS "Authenticated full access user_sessions" ON user_sessions;
DROP POLICY IF EXISTS "Authenticated full access clearance_generations" ON clearance_generations;
DROP POLICY IF EXISTS "Authenticated read flight_plans_received" ON flight_plans_received;
DROP POLICY IF EXISTS "Authenticated read admin_activities" ON admin_activities;

DROP POLICY IF EXISTS "Service role full access" ON discord_users;
DROP POLICY IF EXISTS "Service role full access" ON page_visits;
DROP POLICY IF EXISTS "Service role full access" ON user_sessions;
DROP POLICY IF EXISTS "Service role full access" ON clearance_generations;
DROP POLICY IF EXISTS "Service role full access" ON flight_plans_received;
DROP POLICY IF EXISTS "Service role full access" ON admin_activities;

DROP POLICY IF EXISTS "Admins have full access to page_visits" ON page_visits;
DROP POLICY IF EXISTS "Admins have full access to user_sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins have full access to clearance_generations" ON clearance_generations;
DROP POLICY IF EXISTS "Admins can read flight_plans_received" ON flight_plans_received;
DROP POLICY IF EXISTS "Admins can read admin_activities" ON admin_activities;
DROP POLICY IF EXISTS "Anon insert page_visits" ON page_visits;
DROP POLICY IF EXISTS "Anon insert user_sessions" ON user_sessions;
DROP POLICY IF EXISTS "Anon update user_sessions" ON user_sessions;
DROP POLICY IF EXISTS "Anon insert clearance_generations" ON clearance_generations;


-- Service role should have unrestricted access to all tables
CREATE POLICY "Service role full access" ON discord_users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON page_visits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON user_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON clearance_generations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON flight_plans_received FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON admin_activities FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Discord users policies: Admins can see all users, but regular users can't see any (for admin panel)
CREATE POLICY "Admins have full access to discord_users" ON public.discord_users FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Page visits policies: Anon can insert, but only admins can see/manage the data
CREATE POLICY "Anon insert page_visits" ON public.page_visits FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admins have full access to page_visits" ON public.page_visits FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- User sessions policies: Anon can insert/update, but only admins can see/manage the data
CREATE POLICY "Anon insert user_sessions" ON public.user_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update user_sessions" ON public.user_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Admins have full access to user_sessions" ON public.user_sessions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Clearance generations policies: Anon can insert, but only admins can see/manage
CREATE POLICY "Anon insert clearance_generations" ON public.clearance_generations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admins have full access to clearance_generations" ON public.clearance_generations FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Flight plans policies: Anon and authenticated can read, but only admins can do more (if needed)
-- For now, let's restrict all but service role. If client needs read, change to is_admin()
CREATE POLICY "Admins can read flight_plans_received" ON public.flight_plans_received FOR SELECT TO authenticated USING (is_admin());

-- Admin activities policies: Only admins can read
CREATE POLICY "Admins can read admin_activities" ON public.admin_activities FOR SELECT TO authenticated USING (is_admin());

-- Force RLS on all tables, which is best practice
ALTER TABLE discord_users FORCE ROW LEVEL SECURITY;
ALTER TABLE page_visits FORCE ROW LEVEL SECURITY;
ALTER TABLE user_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE clearance_generations FORCE ROW LEVEL SECURITY;
ALTER TABLE flight_plans_received FORCE ROW LEVEL SECURITY;
ALTER TABLE admin_activities FORCE ROW LEVEL SECURITY;

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

-- Add your specific Discord ID as admin - Force update
DELETE FROM discord_users WHERE discord_id = '1200035083550208042' OR username = 'h.a.s2';

INSERT INTO discord_users (
    discord_id,
    username,
    is_admin,
    roles,
    created_at,
    updated_at
) VALUES (
    '1200035083550208042',
    'h.a.s2',
    TRUE,
    '["admin", "super_admin"]'::JSONB,
    NOW(),
    NOW()
);

-- Also ensure any existing fallback users get admin
UPDATE discord_users SET 
    is_admin = TRUE,
    roles = '["admin", "super_admin"]'::JSONB,
    updated_at = NOW()
WHERE username = 'h.a.s2' OR discord_id = '1200035083550208042';

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
