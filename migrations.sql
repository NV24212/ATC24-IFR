-- =============================================================================
-- ATC24 Simplified Database Migrations
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Tables
-- =============================================================================

CREATE TABLE public.discord_users (
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
CREATE INDEX ON public.discord_users(discord_id);
CREATE INDEX ON public.discord_users(is_admin);

CREATE TABLE public.clearance_generations (
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
    atis_letter TEXT,
    clearance_text TEXT,
    user_id UUID REFERENCES public.discord_users(id) ON DELETE SET NULL,
    discord_username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON public.clearance_generations(user_id);
CREATE INDEX ON public.clearance_generations(callsign);

CREATE TABLE public.admin_settings (
    id INT PRIMARY KEY DEFAULT 1,
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row_constraint CHECK (id = 1)
);

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

CREATE OR REPLACE FUNCTION public.upsert_discord_user(
    p_discord_id TEXT,
    p_username TEXT,
    p_discriminator TEXT,
    p_email TEXT,
    p_avatar TEXT,
    p_access_token TEXT,
    p_refresh_token TEXT,
    p_token_expires_at TIMESTAMPTZ
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
AS $$
DECLARE
    v_user_id UUID;
    v_is_admin BOOLEAN;
    v_roles JSONB;
BEGIN
    -- Check if the user is a hardcoded admin
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

-- Policies
-- service_role has full access
CREATE POLICY "Service role full access" ON public.discord_users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.clearance_generations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.admin_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admins can manage users and settings
CREATE POLICY "Admins can manage discord_users" ON public.discord_users FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can manage admin_settings" ON public.admin_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Users can view their own data
CREATE POLICY "Users can view their own data" ON public.discord_users FOR SELECT TO authenticated USING (id = auth.uid());

-- Allow anonymous clearance generation, but only admins can see all of them
CREATE POLICY "Anon can insert clearances" ON public.clearance_generations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admins can see all clearances" ON public.clearance_generations FOR SELECT TO authenticated USING (is_admin());

-- Force RLS
ALTER TABLE public.discord_users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_generations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings FORCE ROW LEVEL SECURITY;


-- =============================================================================
-- Permissions
-- =============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON public.discord_users, public.clearance_generations, public.admin_settings TO authenticated;
GRANT INSERT ON public.clearance_generations TO anon, authenticated;
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
    RAISE NOTICE 'ATC24 Simplified Database Migration Complete!';
END $$;
-- =============================================================================
