-- =============================================================================
-- ATC24 Simplified Database Migrations (Definitive Final Version)
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.discord_users (
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

CREATE TABLE IF NOT EXISTS public.clearance_generations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT, ip_address TEXT, user_agent TEXT, user_id UUID REFERENCES public.discord_users(id) ON DELETE SET NULL,
    discord_username TEXT, callsign TEXT, destination TEXT, departure_airport TEXT, flight_plan JSONB, route TEXT,
    routing_type TEXT, initial_altitude TEXT, flight_level TEXT, runway TEXT, sid TEXT, sid_transition TEXT,
    transponder_code TEXT, atis_letter TEXT, atis_info JSONB, station TEXT, clearance_text TEXT, remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_settings (
    id INT PRIMARY KEY DEFAULT 1,
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row_constraint CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS public.flight_plans_received (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    callsign TEXT NOT NULL, destination TEXT, route TEXT, flight_level TEXT,
    source TEXT DEFAULT 'Main', raw_data JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.page_visits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.discord_users(id) ON DELETE SET NULL,
    session_id TEXT, path TEXT NOT NULL, ip_address TEXT, user_agent TEXT,
    visited_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.discord_users(id) ON DELETE CASCADE NOT NULL,
    ip_address TEXT, user_agent TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.admin_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_user_id UUID REFERENCES public.discord_users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, target_resource TEXT, details JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.debug_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(), level TEXT NOT NULL, message TEXT NOT NULL,
    source TEXT, data JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_discord_users_discord_id ON public.discord_users(discord_id);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_created_at ON public.clearance_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON public.page_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_logs_timestamp ON public.debug_logs(timestamp DESC);

-- =============================================================================
-- Functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    RETURN (SELECT is_admin FROM public.discord_users WHERE id = auth.uid());
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Function to get the leaderboard data
DROP FUNCTION IF EXISTS public.get_clearance_leaderboard(INT);
CREATE OR REPLACE FUNCTION get_clearance_leaderboard(p_limit INT)
RETURNS TABLE(rank BIGINT, discord_id TEXT, username TEXT, avatar TEXT, clearance_count BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        RANK() OVER (ORDER BY COUNT(c.id) DESC),
        u.discord_id,
        u.username,
        u.avatar,
        COUNT(c.id) AS clearance_count
    FROM
        public.clearance_generations c
    JOIN
        public.discord_users u ON c.user_id = u.id
    GROUP BY
        u.discord_id, u.username, u.avatar
    ORDER BY
        clearance_count DESC
    LIMIT p_limit;
END;
$$;

-- Function to get clearances for a specific user
DROP FUNCTION IF EXISTS public.get_user_clearances(UUID);
CREATE OR REPLACE FUNCTION get_user_clearances(p_user_id UUID)
RETURNS TABLE(id UUID, callsign TEXT, destination TEXT, clearance_text TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.callsign,
        c.destination,
        c.clearance_text,
        c.created_at
    FROM
        public.clearance_generations c
    WHERE
        c.user_id = p_user_id
    ORDER BY
        c.created_at DESC;
END;
$$;

-- Function to get daily counts for a given table
CREATE OR REPLACE FUNCTION get_daily_counts(table_name TEXT)
RETURNS TABLE(date DATE, count BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY EXECUTE format('
        SELECT
            DATE(created_at),
            COUNT(*)
        FROM
            public.%I
        WHERE
            created_at >= NOW() - INTERVAL ''30 days''
        GROUP BY
            DATE(created_at)
        ORDER BY
            DATE(created_at)
    ', table_name);
END;
$$;

-- =============================================================================
-- Permissions
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clearance_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_clearances(p_user_id UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_counts(table_name TEXT) TO authenticated;

-- =============================================================================
-- Row Level Security (RLS) -- THE DEFINITIVE FIX
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_generations ENABLE ROW LEVEL SECURITY;
-- RLS on admin_settings is disabled in favor of direct grants, as the API endpoint is admin-protected.
ALTER TABLE public.admin_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_plans_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

-- Force RLS on all tables
ALTER TABLE public.discord_users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_generations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.flight_plans_received FORCE ROW LEVEL SECURITY;
ALTER TABLE public.page_visits FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.debug_logs FORCE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow public insert on clearance_generations" ON public.clearance_generations;
DROP POLICY IF EXISTS "Allow anonymous users to insert clearances" ON public.clearance_generations;
DROP POLICY IF EXISTS "Allow authenticated users to insert clearances" ON public.clearance_generations;
DROP POLICY IF EXISTS "Allow admin select on clearance_generations" ON public.clearance_generations;
DROP POLICY IF EXISTS "Allow user to see their own clearances" ON public.clearance_generations;
DROP POLICY IF EXISTS "Allow admin full access" ON public.discord_users;
DROP POLICY IF EXISTS "Allow user to view their own data" ON public.discord_users;
DROP POLICY IF EXISTS "Allow admin full access" ON public.admin_settings;
DROP POLICY IF EXISTS "Allow public read access on flight_plans" ON public.flight_plans_received;
DROP POLICY IF EXISTS "Allow public insert on page_visits" ON public.page_visits;
DROP POLICY IF EXISTS "Allow admin select on page_visits" ON public.page_visits;
DROP POLICY IF EXISTS "Allow admin full access" ON public.user_sessions;
DROP POLICY IF EXISTS "Allow admin full access" ON public.admin_activities;
DROP POLICY IF EXISTS "Allow admin select on debug_logs" ON public.debug_logs;
DROP POLICY IF EXISTS "Allow service_role to insert into debug_logs" ON public.debug_logs;

-- Create correct policies
-- discord_users
CREATE POLICY "Allow admin full access" ON public.discord_users FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Allow user to view their own data" ON public.discord_users FOR SELECT TO authenticated USING (id = auth.uid());

-- clearance_generations (FIX: Explicitly allow INSERT for anon and authenticated roles)
-- clearance_generations
CREATE POLICY "Allow anon insert on clearance_generations" ON public.clearance_generations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated insert on clearance_generations" ON public.clearance_generations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow admin full select access" ON public.clearance_generations FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Allow users to see their own clearances" ON public.clearance_generations FOR SELECT TO authenticated USING (user_id = auth.uid());

-- admin_settings
-- admin_settings (RLS is disabled, using direct grants instead)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_settings TO authenticated;

-- flight_plans_received
CREATE POLICY "Allow public read access" ON public.flight_plans_received FOR SELECT USING (true);

-- page_visits
CREATE POLICY "Allow anon insert on page_visits" ON public.page_visits FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated insert on page_visits" ON public.page_visits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow admin select on page_visits" ON public.page_visits FOR SELECT TO authenticated USING (is_admin());

-- user_sessions & admin_activities
CREATE POLICY "Allow admin full access on user_sessions" ON public.user_sessions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Allow admin full access on admin_activities" ON public.admin_activities FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- debug_logs (FIX: Allow service_role to insert, admins to read)
CREATE POLICY "Allow service_role to insert logs" ON public.debug_logs FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Allow admins to read logs" ON public.debug_logs FOR SELECT TO authenticated USING (is_admin());

-- =============================================================================
-- Initial Data
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_settings WHERE id = 1) THEN
    INSERT INTO admin_settings (id, settings) VALUES (1, '{
      "clearanceFormat": { "customTemplate": "{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}." },
      "aviation": { "defaultAltitudes": [5000, 6000, 7000] }
    }');
  END IF;

  INSERT INTO public.discord_users (discord_id, username, is_admin, roles)
  VALUES ('1200035083550208042', 'h.a.s2', true, '["admin", "super_admin"]')
  ON CONFLICT (discord_id) DO NOTHING;
END $$;

-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'ATC24 Database Migration Fully Complete and Corrected!';
END $$;
-- =============================================================================