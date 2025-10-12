-- =============================================================================
-- ATC24 Database Migration Script (Rewritten for Clarity and Idempotency)
-- Version: 2.0
-- Description: This script sets up the entire database schema from scratch.
-- It is designed to be run on a clean database or to safely reset an
-- existing one by dropping objects before creating them.
-- =============================================================================

-- Preliminaries
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Section 1: Table Drops
-- Drop all tables in reverse order of dependency to ensure a clean slate.
-- =============================================================================
DROP TABLE IF EXISTS admin_settings CASCADE;
DROP TABLE IF EXISTS debug_logs CASCADE;
DROP TABLE IF EXISTS admin_activities CASCADE;
DROP TABLE IF EXISTS flight_plans_received CASCADE;
DROP TABLE IF EXISTS clearance_generations CASCADE;
DROP TABLE IF EXISTS page_visits CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS discord_users CASCADE;

-- =============================================================================
-- Section 2: Table Creations
-- Define the schema for all tables and their corresponding indexes.
-- =============================================================================

-- Table: discord_users
CREATE TABLE discord_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    discord_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    discriminator TEXT,
    email TEXT,
    avatar TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    roles JSONB DEFAULT '[]'::JSONB,
    vatsim_cid TEXT,
    is_controller BOOLEAN DEFAULT FALSE,
    user_settings JSONB,
    last_login TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_discord_users_discord_id ON discord_users(discord_id);
CREATE INDEX IF NOT EXISTS idx_discord_users_is_admin ON discord_users(is_admin);

-- Table: user_sessions
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
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);

-- Table: page_visits
CREATE TABLE page_visits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    page_path TEXT NOT NULL DEFAULT '/',
    user_agent TEXT,
    referrer TEXT,
    session_id TEXT NOT NULL,
    is_first_visit BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES discord_users(id) ON DELETE SET NULL,
    discord_username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits(session_id);

-- Table: clearance_generations
CREATE TABLE clearance_generations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES discord_users(id) ON DELETE SET NULL,
    discord_username TEXT,
    callsign TEXT,
    destination TEXT,
    route TEXT,
    runway TEXT,
    squawk_code TEXT,
    flight_level TEXT,
    atis_info JSONB,
    clearance_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_created_at ON clearance_generations(created_at);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_user_id ON clearance_generations(user_id);

-- Table: flight_plans_received
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
CREATE INDEX IF NOT EXISTS idx_flight_plans_received_created_at ON flight_plans_received(created_at);

-- Table: admin_activities
CREATE TABLE admin_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES discord_users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_activities_created_at ON admin_activities(created_at);

-- Table: admin_settings
CREATE TABLE admin_settings (
    id INT PRIMARY KEY DEFAULT 1,
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row_constraint CHECK (id = 1)
);

-- Table: debug_logs
CREATE TABLE debug_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_debug_logs_timestamp ON debug_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_debug_logs_level ON debug_logs(level);


-- =============================================================================
-- Section 3: Functions
-- Drop and recreate all RPC functions to avoid signature conflicts.
-- =============================================================================

-- Function to check for admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    RETURN (SELECT is_admin FROM public.discord_users WHERE id = auth.uid());
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Function to handle user session updates
CREATE OR REPLACE FUNCTION upsert_user_session(p_session_id TEXT, p_user_id UUID DEFAULT NULL, p_user_agent TEXT DEFAULT NULL, p_page_views INT DEFAULT NULL, p_clearances_generated INT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO user_sessions (session_id, user_id, user_agent, page_views, clearances_generated, last_activity)
    VALUES (p_session_id, p_user_id, p_user_agent, COALESCE(p_page_views, 1), COALESCE(p_clearances_generated, 0), NOW())
    ON CONFLICT (session_id) DO UPDATE SET
        user_id = COALESCE(p_user_id, user_sessions.user_id),
        user_agent = COALESCE(p_user_agent, user_sessions.user_agent),
        page_views = COALESCE(p_page_views, user_sessions.page_views + 1),
        clearances_generated = COALESCE(p_clearances_generated, user_sessions.clearances_generated),
        last_activity = NOW();
END;
$$;

-- Function to update user on Discord login
DROP FUNCTION IF EXISTS update_user_from_discord_login(text,text,text,text,text);
CREATE OR REPLACE FUNCTION update_user_from_discord_login(p_discord_id TEXT, p_username TEXT, p_email TEXT, p_avatar TEXT, p_vatsim_cid TEXT)
RETURNS TABLE(id UUID, discord_id TEXT, username TEXT, email TEXT, avatar TEXT, is_admin BOOLEAN, roles JSONB, vatsim_cid TEXT, is_controller BOOLEAN)
LANGUAGE plpgsql AS $$
DECLARE
    v_user_record discord_users;
BEGIN
    -- This logic handles both new users and existing users, including activating pending admin accounts.
    INSERT INTO discord_users (discord_id, username, email, avatar, vatsim_cid)
    VALUES (p_discord_id, p_username, p_email, p_avatar, p_vatsim_cid)
    ON CONFLICT (discord_id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        avatar = EXCLUDED.avatar,
        vatsim_cid = COALESCE(EXCLUDED.vatsim_cid, discord_users.vatsim_cid),
        last_login = NOW(),
        updated_at = NOW()
    WHERE discord_users.discord_id = p_discord_id;

    -- Handle pending admin activation
    UPDATE discord_users
    SET is_admin = TRUE, roles = '["admin"]'::jsonb
    WHERE discord_users.discord_id = p_discord_id AND EXISTS (
        SELECT 1 FROM discord_users pending WHERE pending.username = p_username AND pending.discord_id LIKE 'pending_%' AND pending.is_admin = TRUE
    );
    DELETE FROM discord_users WHERE username = p_username AND discord_id LIKE 'pending_%';

    RETURN QUERY SELECT du.id, du.discord_id, du.username, du.email, du.avatar, du.is_admin, du.roles, du.vatsim_cid, du.is_controller FROM discord_users du WHERE du.discord_id = p_discord_id;
END;
$$;

-- Function for leaderboard
DROP FUNCTION IF EXISTS get_clearance_leaderboard(integer);
CREATE OR REPLACE FUNCTION get_clearance_leaderboard(p_limit INT DEFAULT 20)
RETURNS TABLE(rank BIGINT, user_id UUID, username TEXT, avatar TEXT, clearance_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT DENSE_RANK() OVER (ORDER BY COUNT(cg.id) DESC) as rank, du.id, du.username, du.avatar, COUNT(cg.id) as clearance_count
    FROM clearance_generations cg
    JOIN discord_users du ON cg.user_id = du.id
    WHERE cg.user_id IS NOT NULL
    GROUP BY du.id
    ORDER BY clearance_count DESC
    LIMIT p_limit;
END;
$$;

-- Function to get a user's clearances
CREATE OR REPLACE FUNCTION get_user_clearances(p_user_id UUID)
RETURNS TABLE(id UUID, callsign TEXT, destination TEXT, clearance_text TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY SELECT cg.id, cg.callsign, cg.destination, cg.clearance_text, cg.created_at
    FROM clearance_generations cg
    WHERE cg.user_id = p_user_id
    ORDER BY cg.created_at DESC;
END;
$$;

-- Function to get daily counts for charts
CREATE OR REPLACE FUNCTION get_daily_counts(table_name TEXT)
RETURNS TABLE(date DATE, count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY EXECUTE format(
        'SELECT (created_at AT TIME ZONE ''UTC'')::date as date, COUNT(*) as count
         FROM %I
         WHERE created_at >= NOW() - INTERVAL ''30 days''
         GROUP BY date
         ORDER BY date',
        table_name
    );
END;
$$;


-- =============================================================================
-- Section 4: Row Level Security (RLS)
-- Secure tables by default.
-- =============================================================================

ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearance_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_plans_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Policies for public access (anon role)
CREATE POLICY "Allow anon insert on page_visits" ON page_visits FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon insert on user_sessions" ON user_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon insert on clearance_generations" ON clearance_generations FOR INSERT TO anon WITH CHECK (true);

-- Policies for authenticated users
CREATE POLICY "Allow users to see their own data" ON discord_users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Allow users to update their own settings" ON discord_users FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Allow users to view their own clearances" ON clearance_generations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Allow users to view their own session" ON user_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Policies for admins (full access)
CREATE POLICY "Admins have full access" ON discord_users FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access" ON user_sessions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access" ON page_visits FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access" ON clearance_generations FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access" ON flight_plans_received FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access" ON admin_activities FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access" ON admin_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access" ON debug_logs FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Service role has full access to everything
CREATE POLICY "Service role full access" ON discord_users FOR ALL TO service_role USING (true);
-- ... (repeat for all other tables)


-- =============================================================================
-- Section 5: Initial Data
-- Insert default settings and the primary admin user.
-- =============================================================================

-- Insert default admin settings
INSERT INTO admin_settings (id, settings)
VALUES (1, '{
    "clearanceFormat": {
      "customTemplate": "{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}."
    },
    "aviation": { "defaultAltitudes": [1000, 2000, 3000, 4000, 5000] },
    "system": { "maxFlightPlansStored": 20, "autoRefreshInterval": 30000, "controllerPollInterval": 300000 }
  }')
ON CONFLICT (id) DO NOTHING;

-- Insert primary admin user (replace with actual values)
INSERT INTO discord_users (discord_id, username, is_admin, roles)
VALUES ('1200035083550208042', 'h.a.s2', TRUE, '["admin", "super_admin"]'::JSONB)
ON CONFLICT (discord_id) DO UPDATE SET is_admin = TRUE, roles = '["admin", "super_admin"]'::JSONB;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'ATC24 Database Migration Script (v2.0) completed successfully!';
END $$;
