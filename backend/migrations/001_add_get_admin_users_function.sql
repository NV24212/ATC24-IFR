-- Migration to add missing admin and analytics functions.

-- FUNCTION: get_admin_users()
-- Gets all admin users for management
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE(
    id UUID,
    discord_id TEXT,
    username TEXT,
    email TEXT,
    avatar TEXT,
    is_admin BOOLEAN,
    roles JSONB,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        du.id,
        du.discord_id,
        du.username,
        du.email,
        du.avatar,
        du.is_admin,
        du.roles,
        du.last_login,
        du.created_at
    FROM discord_users du
    WHERE du.is_admin = TRUE
    ORDER BY du.last_login DESC;
END;
$$;

-- FUNCTION: get_daily_counts(table_name TEXT)
-- Generic function to get daily counts for a given table.
CREATE OR REPLACE FUNCTION get_daily_counts(table_name TEXT)
RETURNS TABLE(date DATE, count BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY EXECUTE
    format('SELECT DATE(created_at) as date, COUNT(*) as count FROM %I WHERE created_at >= NOW() - INTERVAL ''30 days'' GROUP BY DATE(created_at) ORDER BY date ASC', table_name);
END;
$$;
