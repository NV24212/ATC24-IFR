# ATC Clearance Delivery Application

## Prerequisites

Before deploying, you need to set up Supabase for data storage and analytics.

## Supabase Setup

1. **Connect to Supabase**: [Connect to Supabase](#open-mcp-popover) or visit [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key from Settings > API
4. Create the required tables (see Database Schema below)

## Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL (https://your-project-id.supabase.co)
- `SUPABASE_ANON_KEY`: Your Supabase anon key
- `PORT`: Server port (default: 3000)
- `ADMIN_PASSWORD`: Admin panel password (change from default!)

## Database Schema

Create these tables in your Supabase database:

```sql
-- Page visits tracking
CREATE TABLE page_visits (
  id SERIAL PRIMARY KEY,
  page_path VARCHAR(255),
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions
CREATE TABLE user_sessions (
  session_id UUID PRIMARY KEY,
  ip_address INET,
  user_agent TEXT,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  page_views INTEGER DEFAULT 0,
  clearances_generated INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clearance generations tracking
CREATE TABLE clearance_generations (
  id SERIAL PRIMARY KEY,
  session_id UUID,
  ip_address INET,
  callsign VARCHAR(50),
  destination VARCHAR(50),
  clearance_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flight plans received
CREATE TABLE flight_plans_received (
  id SERIAL PRIMARY KEY,
  callsign VARCHAR(50),
  destination VARCHAR(50),
  route TEXT,
  flight_level VARCHAR(20),
  source VARCHAR(50),
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin activities
CREATE TABLE admin_activities (
  id SERIAL PRIMARY KEY,
  action VARCHAR(100),
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Vercel Deployment

1. Install Vercel CLI: `npm i -g vercel`
2. Login to Vercel: `vercel login`
3. Deploy: `vercel --prod`
4. Set environment variables in Vercel dashboard:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - ADMIN_PASSWORD

## Local Development

```bash
npm install
npm run dev
```

The application will be available at http://localhost:3000

## Features

- Real-time flight plan reception from 24 Hour ATC
- IFR clearance generation with customizable templates
- Admin panel for analytics and settings
- Supabase integration for data persistence
- Session tracking and analytics

## Admin Panel

Access the admin panel at `/admin` with the configured admin password.
