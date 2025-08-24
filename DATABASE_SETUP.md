# ATC24 Database Setup Guide

## Prerequisites

1. **Connect to Supabase**: Click [Connect to Supabase](#open-mcp-popover) to connect your Supabase database.

## Setup Steps

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and anon key

### Step 2: Run Database Schema
1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `database-setup.sql` 
3. Paste and run the script
4. Verify that all 5 tables are created successfully

### Step 3: Configure Environment Variables
1. Update `.env` file with your Supabase credentials:
   ```bash
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=your_anon_public_key_here
   ADMIN_PASSWORD=your_secure_admin_password
   ```

### Step 4: Restart the Server
The application will automatically detect the Supabase configuration and start using the database.

## Database Tables Created

1. **page_visits** - Tracks user page visits and sessions
2. **user_sessions** - Manages user session data
3. **clearance_generations** - Logs IFR clearance generations
4. **flight_plans_received** - Stores received flight plan data
5. **admin_activities** - Tracks admin actions and system events

## Features Enabled

- ✅ Analytics tracking and persistence
- ✅ Session management across deployments
- ✅ Admin panel with database insights
- ✅ Real-time data synchronization
- ✅ Automatic data cleanup functions
- ✅ Row Level Security (RLS) policies

## Verification

Visit `/health` endpoint to verify:
- `supabaseConfigured: true`
- `persistentStorage: true`
- `analytics_persistence: true`

## Admin Panel

Access the admin panel at `/admin` using your configured admin password to view:
- Real-time analytics
- Database table contents
- Current active users
- System logs and activities
