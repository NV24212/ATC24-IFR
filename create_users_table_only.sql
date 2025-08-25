-- Quick fix: Create users table to resolve the error
-- Run this first if you want to fix the immediate error

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table for Discord OAuth
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

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create basic policy for service role
CREATE POLICY "Service role full access on users" ON users
    FOR ALL TO service_role USING (true);

-- Insert default admin user
INSERT INTO users (discord_id, username, email, is_admin, roles)
VALUES ('000000000', 'admin', 'admin@example.com', true, '["admin"]'::jsonb)
ON CONFLICT (discord_id) DO NOTHING;

SELECT 'Users table created successfully!' as result;
