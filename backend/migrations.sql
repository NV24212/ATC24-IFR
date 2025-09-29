-- =============================================================================
-- ATC24 Database Migrations (Complete Rewrite)
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Tables
-- =============================================================================

-- Stores site-wide configuration, including the new admin password
CREATE TABLE IF NOT EXISTS public.site_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores user data from Discord
CREATE TABLE IF NOT EXISTS public.discord_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    discord_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    roles JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores generated clearances
CREATE TABLE IF NOT EXISTS public.clearance_generations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.discord_users(id) ON DELETE SET NULL,
    callsign TEXT,
    clearance_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores page visit analytics
CREATE TABLE IF NOT EXISTS public.page_visits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id TEXT,
    path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Functions
-- =============================================================================

-- Checks if a user is an admin based on their authenticated ID
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

-- =============================================================================
-- Row Level Security (RLS) -- Simplified and Corrected
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- Force RLS on all tables
ALTER TABLE public.site_config FORCE ROW LEVEL SECURITY;
ALTER TABLE public.discord_users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_generations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.page_visits FORCE ROW LEVEL SECURITY;

-- Drop all existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Allow admin read access to site_config" ON public.site_config;
DROP POLICY IF EXISTS "Allow admin full access" ON public.discord_users;
DROP POLICY IF EXISTS "Allow user to view their own data" ON public.discord_users;
DROP POLICY IF EXISTS "Allow public insert on clearance_generations" ON public.clearance_generations;
DROP POLICY IF EXISTS "Allow users to see their own clearances" ON public.clearance_generations;
DROP POLICY IF EXISTS "Allow admin full select access" ON public.clearance_generations;
DROP POLICY IF EXISTS "Allow public insert on page_visits" ON public.page_visits;
DROP POLICY IF EXISTS "Allow admin select on page_visits" ON public.page_visits;

-- Create new, correct policies
-- site_config: Only admins can read it. Service role can do anything.
CREATE POLICY "Allow admin read access to site_config" ON public.site_config FOR SELECT TO authenticated USING (is_admin());

-- discord_users: Admins can manage, users can see themselves.
CREATE POLICY "Allow admin full access" ON public.discord_users FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Allow user to view their own data" ON public.discord_users FOR SELECT TO authenticated USING (id = auth.uid());

-- clearance_generations: Anyone can insert, users can see their own, admins can see all.
CREATE POLICY "Allow public insert on clearance_generations" ON public.clearance_generations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow users to see their own clearances" ON public.clearance_generations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Allow admin full select access" ON public.clearance_generations FOR SELECT TO authenticated USING (is_admin());

-- page_visits: Anyone can insert, admins can see all.
CREATE POLICY "Allow public insert on page_visits" ON public.page_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin select on page_visits" ON public.page_visits FOR SELECT TO authenticated USING (is_admin());


-- =============================================================================
-- Permissions
-- =============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant specific permissions for anonymous and authenticated roles
GRANT SELECT ON public.clearance_generations TO authenticated;
GRANT INSERT ON public.clearance_generations, public.page_visits TO anon, authenticated;


-- =============================================================================
-- Initial Data
-- =============================================================================
DO $$
BEGIN
  -- Insert the hashed admin password. The hash is for "hasan2311".
  -- This uses pgsodium, which is available in Supabase.
  -- Make sure the pgsodium extension is enabled in your Supabase project.
  CREATE EXTENSION IF NOT EXISTS pgsodium;

  INSERT INTO public.site_config (key, value)
  VALUES ('admin_password', jsonb_build_object('hash', crypt('hasan2311', gen_salt('bf'))))
  ON CONFLICT (key) DO UPDATE SET value = jsonb_build_object('hash', crypt('hasan2311', gen_salt('bf')));

  -- Insert the default admin user for Discord login
  INSERT INTO public.discord_users (discord_id, username, is_admin, roles)
  VALUES ('1200035083550208042', 'h.a.s2', true, '["admin", "super_admin"]')
  ON CONFLICT (discord_id) DO NOTHING;
END $$;

-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'ATC24 Database Migration (Rewrite) Fully Complete!';
END $$;
-- =============================================================================