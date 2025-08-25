-- Discord Authentication Setup for ATC24-IFR (FIXED VERSION)
-- Run this SQL in your Supabase SQL editor

-- Create users table for Discord authentication
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

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Add user_id column to existing user_sessions table
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create index for user sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- Add user_id column to existing clearance_generations table
ALTER TABLE clearance_generations 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for clearance generations
CREATE INDEX IF NOT EXISTS idx_clearance_generations_user_id ON clearance_generations(user_id);

-- Add user_id column to existing page_visits table
ALTER TABLE page_visits 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for page visits
CREATE INDEX IF NOT EXISTS idx_page_visits_user_id ON page_visits(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text OR is_admin = true);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = id::text OR is_admin = true);

-- Policy: Allow service role full access (for server-side operations)
CREATE POLICY "Service role full access" ON users
    FOR ALL USING (auth.role() = 'service_role');

-- Policy: Allow authenticated users to read basic user info (username, avatar) - FIXED
CREATE POLICY "Authenticated users can read basic info" ON users
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert the main admin user (h.a.s2)
-- This will be updated when they first login with Discord
INSERT INTO users (discord_id, username, email, is_admin, roles)
VALUES ('000000000', 'h.a.s2', 'admin@24ifr.hasmah.xyz', true, '["admin", "super_admin"]'::jsonb)
ON CONFLICT (discord_id) DO NOTHING;

-- Create a function to get user by Discord ID
CREATE OR REPLACE FUNCTION get_user_by_discord_id(discord_user_id TEXT)
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
    WHERE u.discord_id = discord_user_id;
END;
$$;

-- Create a function to create or update user from Discord data
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

-- Create function to get all admin users
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
    WHERE u.is_admin = true
    ORDER BY u.created_at DESC;
END;
$$;

-- Create function to add admin user by username
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
    found_user_id UUID;
BEGIN
    -- Try to find user by username (case insensitive)
    SELECT id INTO found_user_id
    FROM users
    WHERE LOWER(username) = LOWER(p_username)
    LIMIT 1;

    IF found_user_id IS NULL THEN
        -- User not found, create a placeholder entry
        INSERT INTO users (discord_id, username, is_admin, roles)
        VALUES ('pending_' || p_username, p_username, true, p_roles)
        RETURNING id INTO found_user_id;

        RETURN QUERY
        SELECT true, 'User added as admin (will be activated when they login with Discord)', found_user_id;
    ELSE
        -- User exists, update their admin status
        UPDATE users
        SET is_admin = true, roles = p_roles, updated_at = NOW()
        WHERE id = found_user_id;

        RETURN QUERY
        SELECT true, 'User granted admin access', found_user_id;
    END IF;
END;
$$;

-- Create function to remove admin user
CREATE OR REPLACE FUNCTION remove_admin_user(p_user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_count INTEGER;
BEGIN
    -- Check if there will be at least one admin left
    SELECT COUNT(*) INTO admin_count
    FROM users
    WHERE is_admin = true AND id != p_user_id;

    IF admin_count = 0 THEN
        RETURN QUERY
        SELECT false, 'Cannot remove the last admin user';
        RETURN;
    END IF;

    -- Remove admin privileges
    UPDATE users
    SET is_admin = false, roles = '[]'::jsonb, updated_at = NOW()
    WHERE id = p_user_id;

    IF FOUND THEN
        RETURN QUERY
        SELECT true, 'Admin privileges removed successfully';
    ELSE
        RETURN QUERY
        SELECT false, 'User not found';
    END IF;
END;
$$;

-- Create function to update user admin status when they login with Discord
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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON users TO anon, authenticated;
GRANT ALL ON users TO service_role;
GRANT EXECUTE ON FUNCTION get_user_by_discord_id(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION upsert_discord_user(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, TIMESTAMPTZ) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_admin_users() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION add_admin_user_by_username(VARCHAR, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION remove_admin_user(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_user_from_discord_login(VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO anon, authenticated, service_role;
