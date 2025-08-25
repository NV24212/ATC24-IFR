
-- Missing Supabase Functions for ATC24-IFR
-- Run this SQL in your Supabase SQL editor

-- Create upsert_user_session function
CREATE OR REPLACE FUNCTION upsert_user_session(
    p_session_id VARCHAR,
    p_user_id UUID DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_page_views INTEGER DEFAULT NULL,
    p_clearances_generated INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_sessions (
        session_id, 
        user_id, 
        user_agent, 
        ip_address, 
        page_views, 
        clearances_generated,
        created_at,
        last_activity
    )
    VALUES (
        p_session_id, 
        p_user_id, 
        p_user_agent, 
        p_ip_address, 
        COALESCE(p_page_views, 0), 
        COALESCE(p_clearances_generated, 0),
        NOW(),
        NOW()
    )
    ON CONFLICT (session_id) 
    DO UPDATE SET
        user_id = COALESCE(p_user_id, user_sessions.user_id),
        user_agent = COALESCE(p_user_agent, user_sessions.user_agent),
        ip_address = COALESCE(p_ip_address, user_sessions.ip_address),
        page_views = COALESCE(p_page_views, user_sessions.page_views),
        clearances_generated = COALESCE(p_clearances_generated, user_sessions.clearances_generated),
        last_activity = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create upsert_discord_user function
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
RETURNS TABLE(
    id UUID,
    discord_id VARCHAR,
    username VARCHAR,
    email VARCHAR,
    avatar VARCHAR,
    is_admin BOOLEAN,
    roles JSONB
) AS $$
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
        username = p_username,
        discriminator = p_discriminator,
        email = p_email,
        avatar = p_avatar,
        access_token = p_access_token,
        refresh_token = p_refresh_token,
        token_expires_at = p_token_expires_at,
        last_login = NOW(),
        updated_at = NOW()
    RETURNING users.id, users.discord_id, users.username, users.email, users.avatar, users.is_admin, users.roles;
END;
$$ LANGUAGE plpgsql;

-- Create update_user_from_discord_login function
CREATE OR REPLACE FUNCTION update_user_from_discord_login(
    p_discord_id VARCHAR,
    p_username VARCHAR,
    p_email VARCHAR DEFAULT NULL,
    p_avatar VARCHAR DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    discord_id VARCHAR,
    username VARCHAR,
    email VARCHAR,
    avatar VARCHAR,
    is_admin BOOLEAN,
    roles JSONB
) AS $$
BEGIN
    RETURN QUERY
    UPDATE users SET
        username = p_username,
        email = p_email,
        avatar = p_avatar,
        last_login = NOW(),
        updated_at = NOW()
    WHERE users.discord_id = p_discord_id
    RETURNING users.id, users.discord_id, users.username, users.email, users.avatar, users.is_admin, users.roles;
    
    -- If no rows were updated, insert new user
    IF NOT FOUND THEN
        RETURN QUERY
        INSERT INTO users (discord_id, username, email, avatar, last_login)
        VALUES (p_discord_id, p_username, p_email, p_avatar, NOW())
        RETURNING users.id, users.discord_id, users.username, users.email, users.avatar, users.is_admin, users.roles;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create get_admin_users function
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE(
    id UUID,
    discord_id VARCHAR,
    username VARCHAR,
    email VARCHAR,
    avatar VARCHAR,
    roles JSONB,
    is_admin BOOLEAN,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        users.id,
        users.discord_id,
        users.username,
        users.email,
        users.avatar,
        users.roles,
        users.is_admin,
        users.last_login,
        users.created_at
    FROM users 
    WHERE users.is_admin = true
    ORDER BY users.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create add_admin_user_by_username function
CREATE OR REPLACE FUNCTION add_admin_user_by_username(
    p_username VARCHAR,
    p_roles JSONB DEFAULT '["admin"]'::jsonb
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    user_id UUID
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Try to find and update existing user
    UPDATE users 
    SET 
        is_admin = true,
        roles = p_roles,
        updated_at = NOW()
    WHERE username = p_username
    RETURNING id INTO v_user_id;
    
    IF FOUND THEN
        RETURN QUERY SELECT true, 'User granted admin access successfully'::TEXT, v_user_id;
    ELSE
        RETURN QUERY SELECT false, 'User not found. They must login with Discord first.'::TEXT, NULL::UUID;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create remove_admin_user function
CREATE OR REPLACE FUNCTION remove_admin_user(p_user_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
BEGIN
    UPDATE users 
    SET 
        is_admin = false,
        roles = '[]'::jsonb,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    IF FOUND THEN
        RETURN QUERY SELECT true, 'Admin access removed successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT false, 'User not found'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;
