# ATC24 IFR Clearance Generator - Deployment Guide

## 🚀 Quick Deployment Checklist

### 1. Required Environment Variables

Set these environment variables in your deployment platform:

```bash
# Discord OAuth (Required for authentication)
DISCORD_CLIENT_ID=1402233324092657724
DISCORD_CLIENT_SECRET=n8YZLv10Z5OPBRbRNfpmENaQC-SpW7GN
DISCORD_REDIRECT_URI=https://your-deployment-url.com/auth/discord/callback

# Supabase Database (Required for data persistence)
SUPABASE_URL=https://trarjzbjcbvvnqxppeua.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyYXJqemJqY2J2dm5xeHBwZXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NzY3MDksImV4cCI6MjA3MDE1MjcwOX0.HgSTQ2KF-tBYXnlNB6Oh5WN6WIYeyGN7ZtfZLxo6234

# Server Configuration
PORT=3000
NODE_ENV=production

# Optional (but recommended)
SESSION_SECRET=your_secure_random_session_secret
ADMIN_PASSWORD=your_secure_admin_password
```

### 2. Update Discord App Settings

**IMPORTANT**: Update your Discord application redirect URI to match your deployment URL:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application (ID: 1402233324092657724)
3. Go to OAuth2 → General
4. Update the redirect URI to: `https://your-deployment-url.com/auth/discord/callback`

### 3. Platform-Specific Instructions

#### Render
```bash
# Set environment variables in Render dashboard
# The redirect URI should be: https://your-app-name.onrender.com/auth/discord/callback
```

#### Fly.io
```bash
# Set secrets using fly CLI
fly secrets set DISCORD_CLIENT_ID=1402233324092657724
fly secrets set DISCORD_CLIENT_SECRET=n8YZLv10Z5OPBRbRNfpmENaQC-SpW7GN
fly secrets set DISCORD_REDIRECT_URI=https://your-app.fly.dev/auth/discord/callback
fly secrets set SUPABASE_URL=https://trarjzbjcbvvnqxppeua.supabase.co
fly secrets set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyYXJqemJqY2J2dm5xeHBwZXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NzY3MDksImV4cCI6MjA3MDE1MjcwOX0.HgSTQ2KF-tBYXnlNB6Oh5WN6WIYeyGN7ZtfZLxo6234
```

#### Vercel
```bash
# Set environment variables in Vercel dashboard or via CLI
vercel env add DISCORD_CLIENT_ID
vercel env add DISCORD_CLIENT_SECRET
vercel env add DISCORD_REDIRECT_URI
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
```

### 4. Verify Deployment

After deployment, check these endpoints:

1. **Health Check**: `https://your-deployment-url.com/health`
   - Should return JSON with `status: "healthy"`
   - Check that `supabaseConfigured: true` and `discordConfigured: true`

2. **Main App**: `https://your-deployment-url.com/`
   - Should load the ATC24 interface
   - Discord login button should be visible

3. **Discord Auth**: `https://your-deployment-url.com/auth/discord`
   - Should redirect to Discord OAuth flow

## 🔧 Troubleshooting

### Common Issues

#### 1. SIGTERM Error (Process Killed)
- **Cause**: Missing environment variables or startup timeout
- **Solution**: Ensure all required environment variables are set
- **Check**: Visit `/health` endpoint to verify configuration

#### 2. Discord OAuth Redirect Mismatch
- **Cause**: Redirect URI in Discord app doesn't match deployment URL
- **Solution**: Update Discord app settings with correct URL
- **Format**: `https://your-domain.com/auth/discord/callback`

#### 3. Database Connection Issues
- **Cause**: Incorrect Supabase credentials or network issues
- **Solution**: Verify SUPABASE_URL and SUPABASE_ANON_KEY
- **Test**: App should work with limited functionality even if database is unavailable

#### 4. WebSocket Connection Issues
- **Note**: WebSocket connection to flight data is optional
- **Impact**: App works normally, but live flight plans won't update
- **Check**: Look for "WebSocket connected" in logs

### Environment Variable Validation

The app logs its configuration status on startup:
```
🔧 Environment Configuration:
   PORT: 3000
   NODE_ENV: production
   Discord OAuth: ✅ Configured
   Supabase: ✅ Configured
   Redirect URI: https://your-domain.com/auth/discord/callback
```

### Logs to Monitor

Look for these log messages:
- ✅ `Supabase client initialized successfully`
- ✅ `Server started successfully on port 3000`
- ✅ `WebSocket connected to 24data.ptfs.app`
- ❌ `Discord OAuth not configured`
- ❌ `Supabase not properly configured`

## 📞 Support

If deployment issues persist:
1. Check the `/health` endpoint first
2. Review server logs for specific error messages
3. Verify all environment variables are correctly set
4. Ensure Discord app redirect URI matches your deployment URL

## 🔒 Security Notes

- Never commit real environment variables to git
- Use your deployment platform's secure environment variable storage
- Rotate the SESSION_SECRET regularly in production
- Keep Discord client secret secure and never expose it in frontend code
