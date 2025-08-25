-- Discord Authentication Setup for ATC24-IFR
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

-- Policy: Allow authenticated users to read basic user info (username, avatar)
CREATE POLICY "Authenticated users can read basic info" ON users
    FOR SELECT USING (auth.role() = 'authenticated')
    WITH CHECK (true);

-- Insert a sample admin user (optional, replace with your Discord info)
-- You can remove this after testing
INSERT INTO users (discord_id, username, email, is_admin, roles) 
VALUES ('123456789', 'admin', 'admin@example.com', true, '["admin"]'::jsonb)
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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON users TO anon, authenticated;
GRANT ALL ON users TO service_role;
GRANT EXECUTE ON FUNCTION get_user_by_discord_id(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION upsert_discord_user(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, TIMESTAMPTZ) TO anon, authenticated, service_role;
