-- =============================================================================
-- ATC24 Simplified Database Migrations (Complete Fixed Version)
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
    user_id UUID REFERENCES public.discord_users(id) ON DELETE SET NULL,
    discord_username TEXT,
    callsign TEXT,
    destination TEXT,
    departure_airport TEXT,
    flight_plan JSONB,
    route TEXT,
    routing_type TEXT,
    initial_altitude TEXT,
    flight_level TEXT,
    runway TEXT,
    sid TEXT,
    sid_transition TEXT,
    transponder_code TEXT,
    atis_letter TEXT,
    atis_info JSONB,
    station TEXT,
    clearance_text TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_user_id ON public.clearance_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_callsign ON public.clearance_generations(callsign);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_created_at ON public.clearance_generations(created_at DESC);

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

CREATE TABLE IF NOT EXISTS public.page_visits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.discord_users(id) ON DELETE SET NULL,
    session_id TEXT,
    path TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    visited_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_page_visits_user_id ON public.page_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_path ON public.page_visits(path);
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON public.page_visits(created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.discord_users(id) ON DELETE CASCADE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);

CREATE TABLE IF NOT EXISTS public.admin_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_user_id UUID REFERENCES public.discord_users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_resource TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_activities_admin_user_id ON public.admin_activities(admin_user_id);

CREATE TABLE IF NOT EXISTS public.debug_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT, -- e.g., 'backend', 'frontend'
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_debug_logs_timestamp ON public.debug_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_debug_logs_level ON public.debug_logs(level);

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

CREATE OR REPLACE FUNCTION public.upsert_discord_user(
    p_discord_id TEXT, p_username TEXT, p_discriminator TEXT, p_email TEXT,
    p_avatar TEXT, p_access_token TEXT, p_refresh_token TEXT, p_token_expires_at TIMESTAMPTZ
) RETURNS TABLE(
    id UUID, discord_id TEXT, username TEXT, email TEXT, avatar TEXT,
    is_admin BOOLEAN, roles JSONB, vatsim_cid TEXT, is_controller BOOLEAN
) LANGUAGE plpgsql AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_roles JSONB;
BEGIN
    v_is_admin := (p_discord_id = '1200035083550208042' OR p_username = 'h.a.s2');
    v_roles := CASE WHEN v_is_admin THEN '["admin", "super_admin"]'::JSONB ELSE '[]'::JSONB END;

    INSERT INTO public.discord_users (
        discord_id, username, discriminator, email, avatar, access_token, refresh_token, token_expires_at, is_admin, roles, last_login
    ) VALUES (
        p_discord_id, p_username, p_discriminator, p_email, p_avatar, p_access_token, p_refresh_token, p_token_expires_at, v_is_admin, v_roles, NOW()
    )
    ON CONFLICT (discord_id) DO UPDATE SET
        username = EXCLUDED.username,
        discriminator = EXCLUDED.discriminator,
        email = EXCLUDED.email,
        avatar = EXCLUDED.avatar,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expires_at = EXCLUDED.token_expires_at,
        is_admin = CASE WHEN (public.discord_users.discord_id = '1200035083550208042' OR public.discord_users.username = 'h.a.s2') THEN TRUE ELSE EXCLUDED.is_admin END,
        roles = CASE WHEN (public.discord_users.discord_id = '1200035083550208042' OR public.discord_users.username = 'h.a.s2') THEN '["admin", "super_admin"]'::JSONB ELSE EXCLUDED.roles END,
        last_login = NOW(),
        updated_at = NOW();

    RETURN QUERY
    SELECT du.id, du.discord_id, du.username, du.email, du.avatar, du.is_admin, du.roles, du.vatsim_cid, du.is_controller
    FROM public.discord_users du WHERE du.discord_id = p_discord_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_clearance_leaderboard(p_limit INT DEFAULT 25)
RETURNS TABLE(rank BIGINT, user_id UUID, username TEXT, avatar TEXT, clearance_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT ROW_NUMBER() OVER (ORDER BY COUNT(cg.id) DESC) as rank,
           du.id as user_id, du.username, du.avatar, COUNT(cg.id) as clearance_count
    FROM public.clearance_generations cg
    JOIN public.discord_users du ON cg.user_id = du.id
    WHERE cg.user_id IS NOT NULL
    GROUP BY du.id, du.username, du.avatar
    ORDER BY clearance_count DESC
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_clearances(p_user_id UUID)
RETURNS TABLE(id UUID, callsign TEXT, destination TEXT, clearance_text TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT cg.id, cg.callsign, cg.destination, cg.clearance_text, cg.created_at
    FROM public.clearance_generations cg
    WHERE cg.user_id = p_user_id
    ORDER BY cg.created_at DESC;
END;
$$;

-- =============================================================================
-- Row Level Security (RLS) -- THIS IS THE CRITICAL FIX
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_plans_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

-- Force RLS on all tables
ALTER TABLE public.discord_users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_generations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.flight_plans_received FORCE ROW LEVEL SECURITY;
ALTER TABLE public.page_visits FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.debug_logs FORCE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow admin full access" ON public.discord_users;
CREATE POLICY "Allow admin full access" ON public.discord_users FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Allow user to view their own data" ON public.discord_users;
CREATE POLICY "Allow user to view their own data" ON public.discord_users FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Allow anonymous users to insert clearances" ON public.clearance_generations;
CREATE POLICY "Allow anonymous users to insert clearances" ON public.clearance_generations FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert clearances" ON public.clearance_generations;
CREATE POLICY "Allow authenticated users to insert clearances" ON public.clearance_generations FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin select on clearance_generations" ON public.clearance_generations;
CREATE POLICY "Allow admin select on clearance_generations" ON public.clearance_generations FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Allow user to see their own clearances" ON public.clearance_generations;
CREATE POLICY "Allow user to see their own clearances" ON public.clearance_generations FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow admin full access" ON public.admin_settings;
CREATE POLICY "Allow admin full access" ON public.admin_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Allow public read access on flight_plans" ON public.flight_plans_received;
CREATE POLICY "Allow public read access on flight_plans" ON public.flight_plans_received FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow public insert on page_visits" ON public.page_visits;
CREATE POLICY "Allow public insert on page_visits" ON public.page_visits FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin select on page_visits" ON public.page_visits;
CREATE POLICY "Allow admin select on page_visits" ON public.page_visits FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Allow admin full access" ON public.user_sessions;
CREATE POLICY "Allow admin full access" ON public.user_sessions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Allow admin full access" ON public.admin_activities;
CREATE POLICY "Allow admin full access" ON public.admin_activities FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Allow admin select on debug_logs" ON public.debug_logs;
CREATE POLICY "Allow admin select on debug_logs" ON public.debug_logs FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Allow service_role to insert into debug_logs" ON public.debug_logs;
CREATE POLICY "Allow service_role to insert into debug_logs" ON public.debug_logs FOR INSERT TO service_role WITH CHECK (true);

-- =============================================================================
-- Permissions
-- =============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant permissions for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant permissions for anonymous users
GRANT SELECT ON public.flight_plans_received TO anon;
GRANT INSERT ON public.clearance_generations, public.page_visits TO anon;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =============================================================================
-- Initial Data
-- =============================================================================
DO $initial_data$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_settings WHERE id = 1) THEN
    INSERT INTO admin_settings (id, settings) VALUES (1, '{
      "clearanceFormat": {
        "includeAtis": true,
        "includeSquawk": true,
        "includeFlightLevel": true,
        "customTemplate": "{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}.",
        "includeStartupApproval": true,
        "includeInitialClimb": true
      },
      "aviation": {
        "defaultAltitudes": [1000, 2000, 3000, 4000, 5000],
        "squawkRanges": { "min": 1000, "max": 7777, "exclude": [7500, 7600, 7700] }
      }
    }');
  END IF;

  INSERT INTO public.discord_users (discord_id, username, is_admin, roles)
  VALUES ('1200035083550208042', 'h.a.s2', true, '["admin", "super_admin"]')
  ON CONFLICT (discord_id) DO UPDATE SET
    username = EXCLUDED.username,
    is_admin = EXCLUDED.is_admin,
    roles = EXCLUDED.roles;
END $initial_data$;

-- =============================================================================
DO $complete$
BEGIN
    RAISE NOTICE 'ATC24 Database Migration Fully Complete!';
END $complete$;
-- =============================================================================