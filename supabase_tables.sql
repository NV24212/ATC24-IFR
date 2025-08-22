-- ATC24 IFR Clearance Generator - Database Tables
-- Run this in your Supabase SQL Editor to create the required tables

-- Create page_visits table
CREATE TABLE IF NOT EXISTS page_visits (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    page_path TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    referrer TEXT,
    session_id TEXT NOT NULL,
    is_first_visit BOOLEAN DEFAULT FALSE
);

-- Create clearance_generations table  
CREATE TABLE IF NOT EXISTS clearance_generations (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id TEXT NOT NULL,
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
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create flight_plans_received table
CREATE TABLE IF NOT EXISTS flight_plans_received (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    callsign TEXT NOT NULL,
    destination TEXT,
    route TEXT,
    flight_level TEXT,
    source TEXT DEFAULT 'Main',
    raw_data JSONB
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    page_views INTEGER DEFAULT 0,
    clearances_generated INTEGER DEFAULT 0
);

-- Create admin_activities table
CREATE TABLE IF NOT EXISTS admin_activities (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_session_id ON clearance_generations(session_id);
CREATE INDEX IF NOT EXISTS idx_clearance_generations_created_at ON clearance_generations(created_at);
CREATE INDEX IF NOT EXISTS idx_flight_plans_callsign ON flight_plans_received(callsign);
CREATE INDEX IF NOT EXISTS idx_flight_plans_created_at ON flight_plans_received(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_admin_activities_created_at ON admin_activities(created_at);

-- Enable Row Level Security for all tables
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearance_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_plans_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activities ENABLE ROW LEVEL SECURITY;

-- Create policies to allow anon role to insert and service_role to read all
CREATE POLICY "Allow anon to insert page visits" ON page_visits
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow service_role to read page visits" ON page_visits
    FOR SELECT TO service_role USING (true);

CREATE POLICY "Allow anon to insert clearance generations" ON clearance_generations
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow service_role to read clearance generations" ON clearance_generations
    FOR SELECT TO service_role USING (true);

CREATE POLICY "Allow anon to insert flight plans" ON flight_plans_received
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow service_role to read flight plans" ON flight_plans_received
    FOR SELECT TO service_role USING (true);

CREATE POLICY "Allow anon to upsert user sessions" ON user_sessions
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role to read user sessions" ON user_sessions
    FOR SELECT TO service_role USING (true);

CREATE POLICY "Allow anon to insert admin activities" ON admin_activities
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow service_role to read admin activities" ON admin_activities
    FOR SELECT TO service_role USING (true);

-- Insert some sample data to test
INSERT INTO page_visits (page_path, user_agent, ip_address, session_id, is_first_visit)
VALUES 
    ('/', 'Test Browser', '127.0.0.1', 'test-session-1', true),
    ('/license', 'Test Browser', '127.0.0.1', 'test-session-1', false);

INSERT INTO flight_plans_received (callsign, destination, route, source)
VALUES 
    ('TEST123', 'EGLL', 'DCT', 'Test'),
    ('DEMO456', 'KJFK', 'GPS Direct', 'Test');

SELECT 'Tables created successfully!' as message;
