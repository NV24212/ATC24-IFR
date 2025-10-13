import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Flask configuration variables."""
    # General Config
    SECRET_KEY = os.environ.get('SESSION_SECRET') or 'a_very_secret_key_that_should_be_changed'
    # Sets the session cookie domain. Use a parent domain (e.g., '.hasmah.xyz')
    # to allow the cookie to be shared across subdomains (api.hasmah.xyz, 24ifr.hasmah.xyz).
    # Fallback to '.hasmah.xyz' if not set in the environment.
    SESSION_COOKIE_DOMAIN = os.environ.get('SESSION_COOKIE_DOMAIN') or '.hasmah.xyz'
    SESSION_COOKIE_SAMESITE = 'None'
    SESSION_COOKIE_SECURE = True
    PERMANENT_SESSION_LIFETIME = os.environ.get('PERMANENT_SESSION_LIFETIME', 2592000) # 30 days in seconds

    # Supabase
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
    SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

    # Discord OAuth
    DISCORD_CLIENT_ID = os.environ.get("DISCORD_CLIENT_ID")
    DISCORD_CLIENT_SECRET = os.environ.get("DISCORD_CLIENT_SECRET")
    DISCORD_REDIRECT_URI = os.environ.get("DISCORD_REDIRECT_URI", "http://localhost:5000/auth/discord/callback")

    # Frontend
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:8000")

    # Discord API
    DISCORD_API_BASE_URL = 'https://discord.com/api'
    DISCORD_AUTH_BASE_URL = DISCORD_API_BASE_URL + '/oauth2/authorize'
    DISCORD_TOKEN_URL = DISCORD_API_BASE_URL + '/oauth2/token'

    # Admin
    SUPER_ADMIN_DISCORD_ID = os.environ.get('SUPER_ADMIN_DISCORD_ID', '1200035083550208042')
    SUPER_ADMIN_USERNAME = os.environ.get('SUPER_ADMIN_USERNAME', 'h.a.s2')

    # 24Data API
    DATA_API_BASE_URL = 'https://24data.ptfs.app'
    DATA_API_CONTROLLERS_URL = f'{DATA_API_BASE_URL}/controllers'
    DATA_API_ATIS_URL = f'{DATA_API_BASE_URL}/atis'
    DATA_API_WSS_URL = 'wss://24data.ptfs.app/wss'
