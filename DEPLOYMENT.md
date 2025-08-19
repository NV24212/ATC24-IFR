# Deployment Guide for ATC24 IFR Clearance Generator

## Fixed Issues

✅ **Invalid URL Error**: Fixed Supabase configuration validation
✅ **Admin/License Pages**: Proper routing configuration
✅ **WebSocket in Serverless**: Conditional WebSocket initialization
✅ **Environment Variables**: Proper handling and validation

## Vercel Deployment Steps

### 1. Prepare Environment Variables

Set these in Vercel Dashboard > Project Settings > Environment Variables:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
ADMIN_PASSWORD=your-secure-password
NODE_ENV=production
```

### 2. Deploy Options

**Option A: Vercel CLI**
```bash
npm install -g vercel
vercel login
vercel --prod
```

**Option B: GitHub Integration**
1. Push code to GitHub repository
2. Connect repository in Vercel dashboard
3. Deploy automatically on push

### 3. Database Setup

If using Supabase:
1. [Connect to Supabase](#open-mcp-popover)
2. Create tables using schema in README.md
3. Configure RLS policies if needed

### 4. Testing Deployment

After deployment, test these endpoints:
- `/` - Main application
- `/license` - License page
- `/admin` - Admin panel
- `/health` - Health check
- `/api/admin/analytics?password=your-password` - Admin API

## Troubleshooting

### WebSocket Issues
- WebSocket connections are disabled in serverless environments
- Flight plans will still work via polling/API calls
- Use traditional hosting (Railway, DigitalOcean) for full WebSocket support

### Static Files
- Ensure `public/` directory contains all CSS and HTML files
- Vercel automatically serves static files from public directory

### Database Connection
- Test Supabase connection with health endpoint
- Check environment variables are set correctly
- Verify Supabase URL format: `https://project-id.supabase.co`

### Admin Panel Access
- Use correct admin password from environment variables
- Check `/admin` route accessibility
- Verify authentication endpoints work

## Environment Differences

**Development (with WebSocket):**
- Full real-time flight plan updates
- WebSocket connection to 24data.ptfs.app
- Local analytics storage

**Production Serverless (Vercel):**
- WebSocket disabled (serverless limitation)
- Supabase for persistent storage
- API-based flight plan polling

## Performance Optimization

1. **Static Assets**: Served via Vercel CDN
2. **Database**: Connection pooling via Supabase
3. **Caching**: API responses cached appropriately
4. **Monitoring**: Use health endpoint for uptime monitoring

## Security Considerations

1. Change default admin password
2. Use strong Supabase RLS policies
3. Configure CORS appropriately
4. Monitor admin access logs
