from supabase import create_client, Client
from .config import Config

supabase: Client = None
supabase_admin: Client = None

def init_db():
    """
    Initializes the database clients.
    Raises ValueError if essential Supabase configuration is missing.
    """
    global supabase, supabase_admin

    if not Config.SUPABASE_URL or 'your_supabase_url' in Config.SUPABASE_URL:
        raise ValueError("SUPABASE_URL is not set or is a placeholder. Please check your .env file.")

    if not Config.SUPABASE_ANON_KEY:
        raise ValueError("SUPABASE_ANON_KEY is not set. Please check your .env file.")

    if not Config.SUPABASE_SERVICE_KEY or 'your_secret_service_role_key' in Config.SUPABASE_SERVICE_KEY:
        raise ValueError("SUPABASE_SERVICE_KEY is not set or is a placeholder. Admin operations will fail.")

    try:
        supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_ANON_KEY)
        print("Supabase client initialized successfully.")

        supabase_admin = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_KEY)
        print("Supabase admin client initialized successfully.")

    except Exception as e:
        print(f"CRITICAL: Supabase client failed to initialize: {e}")
        raise

def log_to_db(level, message, source='backend', data=None):
    """Inserts a log entry into the debug_logs table."""
    if not supabase_admin:
        print(f"[{level.upper()}] DB_LOG_FAIL: {message}")
        return

    try:
        log_entry = {
            "level": level,
            "message": message,
            "source": source,
            "data": data
        }
        supabase_admin.from_('debug_logs').insert(log_entry).execute()
    except Exception as e:
        print(f"CRITICAL: Failed to write log to database: {e}")

def track_page_visit(session, request):
    """Tracks a page visit in the database."""
    if not supabase_admin:
        return

    try:
        is_first_visit = session.get('page_views', 0) == 0
        session['page_views'] = session.get('page_views', 0) + 1

        visit_data = {
            "page_path": request.path,
            "user_agent": request.user_agent.string,
            "referrer": request.referrer,
            "session_id": session.get('session_id'),
            "is_first_visit": is_first_visit,
            "user_id": session.get('user', {}).get('id'),
            "discord_username": session.get('user', {}).get('username')
        }
        supabase_admin.from_('page_visits').insert(visit_data).execute()
    except Exception as e:
        log_to_db('error', 'Failed to track page visit', data={'error': str(e)})
