-- ATC24-IFR Database Migration - Fix Schema Issues
-- Run this SQL in your Supabase SQL editor to fix existing database

-- Drop and recreate problematic functions with proper table qualifications
DROP FUNCTION IF EXISTS get_user_by_discord_id(TEXT);
DROP FUNCTION IF EXISTS upsert_discord_user(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS update_user_from_discord_login(VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS add_admin_user_by_username(VARCHAR, JSONB);
DROP FUNCTION IF EXISTS remove_admin_user(UUID);

-- Create function to get user by Discord ID (FIXED - proper table qualification)
CREATE OR REPLACE FUNCTION get_user_by_discord_id(p_discord_id TEXT)
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
        users.id,
        users.discord_id,
        users.username,
        users.email,
        users.avatar,
        users.is_admin,
        users.roles,
        users.created_at,
        users.last_login
    FROM users
    WHERE users.discord_id = p_discord_id;
END;
$$;

-- Create function to create or update user from Discord data (FIXED - proper table qualification)
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

-- Create function to update user from Discord login (FIXED - proper table qualification)
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
    v_pending_user UUID;
BEGIN
    -- Check for pending admin user
    SELECT users.id INTO v_pending_user 
    FROM users 
    WHERE users.discord_id = 'pending_' || p_username AND users.is_admin = TRUE;
    
    IF v_pending_user IS NOT NULL THEN
        -- Update pending admin user with Discord info
        RETURN QUERY
        UPDATE users 
        SET 
            discord_id = p_discord_id,
            email = p_email,
            avatar = p_avatar,
            last_login = NOW(),
            updated_at = NOW()
        WHERE users.id = v_pending_user
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
    ELSE
        -- Regular user login - use upsert
        RETURN QUERY
        SELECT * FROM upsert_discord_user(
            p_discord_id,
            p_username,
            NULL,
            p_email,
            p_avatar,
            NULL,
            NULL,
            NULL
        );
    END IF;
END;
$$;

-- Create function to add admin user by username (FIXED - proper table qualification)
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
    v_user_id UUID;
    v_user_exists BOOLEAN;
BEGIN
    -- Check if user exists
    SELECT users.id, TRUE INTO v_user_id, v_user_exists 
    FROM users 
    WHERE users.username = p_username;
    
    IF v_user_exists THEN
        -- Update existing user to admin
        UPDATE users 
        SET 
            is_admin = TRUE,
            roles = p_roles,
            updated_at = NOW()
        WHERE users.id = v_user_id;
        
        RETURN QUERY SELECT TRUE, 'User promoted to admin successfully'::TEXT, v_user_id;
    ELSE
        -- Create placeholder admin user (will be updated when they login)
        INSERT INTO users (discord_id, username, is_admin, roles)
        VALUES ('pending_' || p_username, p_username, TRUE, p_roles)
        RETURNING users.id INTO v_user_id;
        
        RETURN QUERY SELECT TRUE, 'Admin user created (will be activated on first Discord login)'::TEXT, v_user_id;
    END IF;
END;
$$;

-- Create function to remove admin user (FIXED - proper table qualification)
CREATE OR REPLACE FUNCTION remove_admin_user(p_user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE users 
    SET 
        is_admin = FALSE,
        roles = '[]'::jsonb,
        updated_at = NOW()
    WHERE users.id = p_user_id;
    
    IF FOUND THEN
        RETURN QUERY SELECT TRUE, 'Admin privileges removed successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'User not found'::TEXT;
    END IF;
END;
$$;

-- Grant necessary permissions to new functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Success message
SELECT 'Database migration completed successfully! Fixed ambiguous column references in functions.' as message;
