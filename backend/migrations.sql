-- =============================================================================
-- ATC24 Database Migration Script (Rewritten for Clarity and Idempotency)
-- Version: 2.2
-- Description: This script sets up the entire database schema from scratch.
-- It follows the correct dependency order: drop tables (which drops dependent
-- policies), then drop functions, then recreate everything.
-- =============================================================================

-- Preliminaries
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Section 1: Table Drops
-- Drop all tables with CASCADE. This removes the tables and any dependent
-- objects, such as Row Level Security (RLS) policies, which solves the
-- function dependency issue.
-- =============================================================================
DROP TABLE IF EXISTS public.admin_settings CASCADE;
DROP TABLE IF EXISTS public.debug_logs CASCADE;
DROP TABLE IF EXISTS public.admin_activities CASCADE;
DROP TABLE IF EXISTS public.flight_plans_received CASCADE;
DROP TABLE IF EXISTS public.clearance_generations CASCADE;
DROP TABLE IF EXISTS public.page_visits CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.discord_users CASCADE;

-- =============================================================================
-- Section 2: Function Drops
-- Now that tables and their dependent RLS policies are gone, we can safely
-- drop the functions without "depends on" errors.
-- =============================================================================
DROP FUNCTION IF EXISTS public.get_clearance_leaderboard(integer);
DROP FUNCTION IF EXISTS public.update_user_from_discord_login(text,text,text,text,text);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.upsert_user_session(text, uuid, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_daily_counts(text);
DROP FUNCTION IF EXISTS public.get_user_clearances(uuid);

-- =============================================================================
-- Section 3: Table Creations
-- Recreate the schema for all tables and their corresponding indexes.
-- =============================================================================

-- Table: discord_users
CREATE TABLE public.discord_users (
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
CREATE INDEX IF NOT EXISTS idx_discord_users_discord_id ON public.discord_users(discord_id);
CREATE INDEX IF NOT EXISTS idx_discord_users_is_admin ON public.discord_users(is_admin);

-- Table: user_sessions
CREATE TABLE public.user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.discord_users(id) ON DELETE SET NULL,
    user_agent TEXT,
    ip_address TEXT,
    page_views INTEGER DEFAULT 0,
    clearances_generated INTEGER DEFAULT 0,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON public.user_sessions(last_activity);

-- Table: page_visits
CREATE TABLE public.page_visits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    page_path TEXT NOT NULL DEFAULT '/',
    user_agent TEXT,
    referrer TEXT,
    session_id TEXT NOT NULL,
    is_first_visit BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES public.discord_users(id) ON DELETE SET NULL,
    discord_username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON public.page_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON public.page_visits(session_id);

-- Table: clearance_generations
CREATE TABLE public.clearance_generations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES public.discord_users(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_clearance_generations_created_at ON public.clearance_generations(created_at);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_user_id ON public.clearance_generations(user_id);

-- Table: flight_plans_received
CREATE TABLE public.flight_plans_received (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    callsign TEXT NOT NULL,
    destination TEXT,
    route TEXT,
    flight_level TEXT,
    source TEXT DEFAULT 'Main',
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flight_plans_received_created_at ON public.flight_plans_received(created_at);

-- Table: admin_activities
CREATE TABLE public.admin_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.discord_users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_activities_created_at ON public.admin_activities(created_at);

-- Table: admin_settings
CREATE TABLE public.admin_settings (
    id INT PRIMARY KEY DEFAULT 1,
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row_constraint CHECK (id = 1)
);

-- Table: debug_logs
CREATE TABLE public.debug_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_debug_logs_timestamp ON public.debug_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_debug_logs_level ON public.debug_logs(level);


-- =============================================================================
-- Section 4: Functions
-- Recreate all RPC functions.
-- =============================================================================

-- Function to check for admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    RETURN (SELECT du.is_admin FROM public.discord_users du WHERE du.id = auth.uid());
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Function to handle user session updates
CREATE OR REPLACE FUNCTION public.upsert_user_session(p_session_id TEXT, p_user_id UUID DEFAULT NULL, p_user_agent TEXT DEFAULT NULL, p_page_views INT DEFAULT NULL, p_clearances_generated INT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.user_sessions (session_id, user_id, user_agent, page_views, clearances_generated, last_activity)
    VALUES (p_session_id, p_user_id, p_user_agent, COALESCE(p_page_views, 1), COALESCE(p_clearances_generated, 0), NOW())
    ON CONFLICT (session_id) DO UPDATE SET
        user_id = COALESCE(p_user_id, public.user_sessions.user_id),
        user_agent = COALESCE(p_user_agent, public.user_sessions.user_agent),
        page_views = COALESCE(p_page_views, public.user_sessions.page_views + 1),
        clearances_generated = COALESCE(p_clearances_generated, public.user_sessions.clearances_generated),
        last_activity = NOW();
END;
$$;

-- Function to update user on Discord login (FIXED for ambiguity)
CREATE OR REPLACE FUNCTION public.update_user_from_discord_login(
    in_discord_id TEXT,
    in_username TEXT,
    in_email TEXT,
    in_avatar TEXT,
    in_vatsim_cid TEXT
)
RETURNS TABLE(id UUID, discord_id TEXT, username TEXT, email TEXT, avatar TEXT, is_admin BOOLEAN, roles JSONB, vatsim_cid TEXT, is_controller BOOLEAN)
LANGUAGE plpgsql AS $$
BEGIN
    -- Use ON CONFLICT to handle both INSERT and UPDATE in one atomic operation.
    INSERT INTO public.discord_users (discord_id, username, email, avatar, vatsim_cid, last_login, updated_at)
    VALUES (in_discord_id, in_username, in_email, in_avatar, in_vatsim_cid, NOW(), NOW())
    ON CONFLICT (discord_id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        avatar = EXCLUDED.avatar,
        vatsim_cid = COALESCE(EXCLUDED.vatsim_cid, public.discord_users.vatsim_cid),
        last_login = NOW(),
        updated_at = NOW();

    -- After the user is guaranteed to exist, handle pending admin activation.
    -- This checks if a placeholder admin was created for this username.
    UPDATE public.discord_users
    SET is_admin = TRUE, roles = '["admin"]'::jsonb
    WHERE public.discord_users.discord_id = in_discord_id AND EXISTS (
        SELECT 1 FROM public.discord_users AS pending
        WHERE pending.username = in_username AND pending.discord_id LIKE 'pending_%' AND pending.is_admin = TRUE
    );

    -- Clean up the placeholder user now that the real user is activated.
    DELETE FROM public.discord_users WHERE public.discord_users.username = in_username AND public.discord_users.discord_id LIKE 'pending_%';

    -- Return the final state of the user.
    RETURN QUERY
    SELECT du.id, du.discord_id, du.username, du.email, du.avatar, du.is_admin, du.roles, du.vatsim_cid, du.is_controller
    FROM public.discord_users AS du
    WHERE du.discord_id = in_discord_id;
END;
$$;

-- Function for leaderboard
CREATE OR REPLACE FUNCTION public.get_clearance_leaderboard(p_limit INT DEFAULT 20)
RETURNS TABLE(rank BIGINT, user_id UUID, username TEXT, avatar TEXT, clearance_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT DENSE_RANK() OVER (ORDER BY COUNT(cg.id) DESC) as rank, du.id, du.username, du.avatar, COUNT(cg.id) as clearance_count
    FROM public.clearance_generations cg
    JOIN public.discord_users du ON cg.user_id = du.id
    WHERE cg.user_id IS NOT NULL
    GROUP BY du.id
    ORDER BY clearance_count DESC
    LIMIT p_limit;
END;
$$;

-- Function to get a user's clearances
CREATE OR REPLACE FUNCTION public.get_user_clearances(p_user_id UUID)
RETURNS TABLE(id UUID, callsign TEXT, destination TEXT, clearance_text TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY SELECT cg.id, cg.callsign, cg.destination, cg.clearance_text, cg.created_at
    FROM public.clearance_generations cg
    WHERE cg.user_id = p_user_id
    ORDER BY cg.created_at DESC;
END;
$$;

-- Function to get daily counts for charts
CREATE OR REPLACE FUNCTION public.get_daily_counts(table_name TEXT)
RETURNS TABLE(date DATE, count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY EXECUTE format(
        'SELECT (created_at AT TIME ZONE ''UTC'')::date as date, COUNT(*) as count
         FROM public.%I
         WHERE created_at >= NOW() - INTERVAL ''30 days''
         GROUP BY date
         ORDER BY date',
        table_name
    );
END;
$$;


-- =============================================================================
-- Section 5: Row Level Security (RLS)
-- Re-apply all RLS policies now that tables and functions are recreated.
-- =============================================================================

ALTER TABLE public.discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_plans_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

-- Policies for public access (anon role)
CREATE POLICY "Allow anon insert on page_visits" ON public.page_visits FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon insert on user_sessions" ON public.user_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon insert on clearance_generations" ON public.clearance_generations FOR INSERT TO anon WITH CHECK (true);

-- Policies for authenticated users
CREATE POLICY "Allow users to see their own data" ON public.discord_users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Allow users to update their own settings" ON public.discord_users FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Allow users to view their own clearances" ON public.clearance_generations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Allow users to view their own session" ON public.user_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Policies for admins (full access)
CREATE POLICY "Admins have full access" ON public.discord_users FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access" ON public.user_sessions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access" ON public.page_visits FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access" ON public.clearance_generations FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access" ON public.flight_plans_received FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access" ON public.admin_activities FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access" ON public.admin_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins have full access" ON public.debug_logs FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());


-- =============================================================================
-- Section 6: Initial Data
-- Insert default settings and the primary admin user.
-- =============================================================================

-- Insert default admin settings
INSERT INTO public.admin_settings (id, settings)
VALUES (1, '{
    "clearanceFormat": {
      "customTemplate": "{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}."
    },
    "aviation": { "defaultAltitudes": [1000, 2000, 3000, 4000, 5000] },
    "system": { "maxFlightPlansStored": 20, "autoRefreshInterval": 30000, "controllerPollInterval": 300000 }
  }')
ON CONFLICT (id) DO NOTHING;

-- Insert primary admin user (replace with actual values)
INSERT INTO public.discord_users (discord_id, username, is_admin, roles)
VALUES ('1200035083550208042', 'h.a.s2', TRUE, '["admin", "super_admin"]'::JSONB)
ON CONFLICT (discord_id) DO UPDATE SET is_admin = TRUE, roles = '["admin", "super_admin"]'::JSONB;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'ATC24 Database Migration Script (v2.2) completed successfully!';
END $$;
