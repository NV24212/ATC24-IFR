from supabase import create_client, Client
from .config import Config

supabase: Client = None
supabase_admin: Client = None

def init_db():
    """Initializes the database clients."""
    global supabase, supabase_admin

    if Config.SUPABASE_URL and Config.SUPABASE_ANON_KEY and 'your_supabase_url' not in Config.SUPABASE_URL:
        try:
            supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_ANON_KEY)
            print("Supabase client initialized.")

            if Config.SUPABASE_SERVICE_KEY and 'your_secret_service_role_key' not in Config.SUPABASE_SERVICE_KEY:
                supabase_admin = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_KEY)
                print("Supabase admin client initialized.")
            else:
                print("WARNING: SUPABASE_SERVICE_KEY not set or is a placeholder. Admin operations will fail.")

        except Exception as e:
            print(f"WARNING: Supabase client failed to initialize: {e}. Supabase-dependent features will be disabled.")
    else:
        print("WARNING: SUPABASE_URL is not set or is a placeholder. Supabase-dependent features will be disabled.")
