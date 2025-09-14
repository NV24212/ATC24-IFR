-- =============================================================================
-- ATC24 Simplified Database Migrations
-- V2 - Adds tables for analytics and admin panel, fixes column names.
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
CREATE INDEX IF NOT EXISTS idx_discord_users_discord_id ON public.discord_users(discord_id);
CREATE INDEX IF NOT EXISTS idx_discord_users_is_admin ON public.discord_users(is_admin);

CREATE TABLE IF NOT EXISTS public.clearance_generations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    callsign TEXT,
    destination TEXT,
    route TEXT,
    runway TEXT,
    squawk_code TEXT,
    flight_level TEXT,
    atis_info TEXT, -- Changed from atis_letter to match application
    clearance_text TEXT,
    user_id UUID REFERENCES public.discord_users(id) ON DELETE SET NULL,
    discord_username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_user_id ON public.clearance_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_callsign ON public.clearance_generations(callsign);

CREATE TABLE IF NOT EXISTS public.admin_settings (
    id INT PRIMARY KEY DEFAULT 1,
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row_constraint CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS public.flight_plans_received (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    callsign TEXT NOT NULL,
    destination TEXT,
    route TEXT,
    flight_level TEXT,
    source TEXT DEFAULT 'Main',
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flight_plans_received_callsign ON public.flight_plans_received(callsign);

-- New table for page visits
CREATE TABLE IF NOT EXISTS public.page_visits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    page_path TEXT,
    user_id UUID REFERENCES public.discord_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON public.page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_user_id ON public.page_visits(user_id);

-- New table for user sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.discord_users(id) ON DELETE SET NULL,
    page_views INT DEFAULT 0,
    clearances_generated INT DEFAULT 0,
    source TEXT,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);

-- New table for admin activities
CREATE TABLE IF NOT EXISTS public.admin_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_user_id UUID NOT NULL REFERENCES public.discord_users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_activities_admin_user_id ON public.admin_activities(admin_user_id);

-- =============================================================================
-- Functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Removed the old upsert_discord_user function as the backend now handles this logic directly.

CREATE OR REPLACE FUNCTION public.get_clearance_leaderboard(p_limit INT DEFAULT 25)
RETURNS TABLE(
    rank BIGINT,
    user_id UUID,
    username TEXT,
    avatar TEXT,
    clearance_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (ORDER BY COUNT(cg.id) DESC) as rank,
        du.id as user_id,
        du.username,
        du.avatar,
        COUNT(cg.id) as clearance_count
    FROM public.clearance_generations cg
    JOIN public.discord_users du ON cg.user_id = du.id
    WHERE cg.user_id IS NOT NULL
    GROUP BY du.id, du.username, du.avatar
    ORDER BY clearance_count DESC
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_clearances(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    callsign TEXT,
    destination TEXT,
    clearance_text TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT cg.id, cg.callsign, cg.destination, cg.clearance_text, cg.created_at
    FROM public.clearance_generations cg
    WHERE cg.user_id = p_user_id
    ORDER BY cg.created_at DESC;
END;
$$;

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

-- Enable RLS for all tables
ALTER TABLE public.discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_plans_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activities ENABLE ROW LEVEL SECURITY;

-- Policies for existing tables
DROP POLICY IF EXISTS "Service role full access" ON public.discord_users;
CREATE POLICY "Service role full access" ON public.discord_users FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON public.clearance_generations;
CREATE POLICY "Service role full access" ON public.clearance_generations FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON public.admin_settings;
CREATE POLICY "Service role full access" ON public.admin_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON public.flight_plans_received;
CREATE POLICY "Service role full access" ON public.flight_plans_received FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage discord_users" ON public.discord_users;
CREATE POLICY "Admins can manage discord_users" ON public.discord_users FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Admins can manage admin_settings" ON public.admin_settings;
CREATE POLICY "Admins can manage admin_settings" ON public.admin_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Users can view their own data" ON public.discord_users;
CREATE POLICY "Users can view their own data" ON public.discord_users FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "Anon can insert clearances" ON public.clearance_generations;
CREATE POLICY "Anon can insert clearances" ON public.clearance_generations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can see all clearances" ON public.clearance_generations;
CREATE POLICY "Admins can see all clearances" ON public.clearance_generations FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "Anon can read flight plans" ON public.flight_plans_received;
CREATE POLICY "Anon can read flight plans" ON public.flight_plans_received FOR SELECT TO anon, authenticated USING (true);


-- Policies for new tables
DROP POLICY IF EXISTS "Service role full access" ON public.page_visits;
CREATE POLICY "Service role full access" ON public.page_visits FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anon can insert page visits" ON public.page_visits;
CREATE POLICY "Anon can insert page visits" ON public.page_visits FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can see all page visits" ON public.page_visits;
CREATE POLICY "Admins can see all page visits" ON public.page_visits FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Service role full access" ON public.user_sessions;
CREATE POLICY "Service role full access" ON public.user_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anon can insert/update sessions" ON public.user_sessions;
CREATE POLICY "Anon can insert/update sessions" ON public.user_sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can see all sessions" ON public.user_sessions;
CREATE POLICY "Admins can see all sessions" ON public.user_sessions FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Service role full access" ON public.admin_activities;
CREATE POLICY "Service role full access" ON public.admin_activities FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can manage admin activities" ON public.admin_activities;
CREATE POLICY "Admins can manage admin activities" ON public.admin_activities FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Force RLS
ALTER TABLE public.discord_users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_generations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.flight_plans_received FORCE ROW LEVEL SECURITY;
ALTER TABLE public.page_visits FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activities FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- Permissions
-- =============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON public.discord_users, public.clearance_generations, public.admin_settings, public.flight_plans_received TO authenticated;
GRANT SELECT ON public.flight_plans_received TO anon;
GRANT INSERT ON public.clearance_generations, public.page_visits, public.user_sessions TO anon, authenticated;
GRANT UPDATE ON public.user_sessions TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- =============================================================================
-- Initial Data
-- =============================================================================
DO $$
BEGIN
  -- Insert default admin settings if not present
  IF NOT EXISTS (SELECT 1 FROM admin_settings WHERE id = 1) THEN
    INSERT INTO admin_settings (id, settings) VALUES (1, '{
      "clearanceFormat": {
        "customTemplate": "{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}.",
        "includeAtis": true,
        "includeSquawk": true,
        "includeFlightLevel": true,
        "includeStartupApproval": true,
        "includeInitialClimb": true
      },
      "aviation": {
        "defaultAltitudes": [1000, 2000, 3000, 4000, 5000],
        "squawkRanges": { "min": 1000, "max": 7777, "exclude": [7500, 7600, 7700] },
        "enableRunwayValidation": false,
        "enableSIDValidation": false
      },
      "system": {
        "maxFlightPlansStored": 20,
        "autoRefreshInterval": 30000,
        "controllerPollInterval": 300000,
        "atisPollInterval": 300000,
        "enableDetailedLogging": false,
        "enableFlightPlanFiltering": false
      }
    }');
  END IF;

  -- Insert initial admin user
  INSERT INTO public.discord_users (discord_id, username, is_admin, roles)
  VALUES ('1200035083550208042', 'h.a.s2', true, '["admin", "super_admin"]')
  ON CONFLICT (discord_id) DO UPDATE SET
    username = EXCLUDED.username,
    is_admin = EXCLUDED.is_admin,
    roles = EXCLUDED.roles;
END $$;

-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'ATC24 V2 Database Migration Complete!';
END $$;
-- =============================================================================
