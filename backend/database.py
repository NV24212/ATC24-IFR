from threading import Lock, Thread
from time import sleep
from typing import Union, List, Dict, Any
from flask import session
from gotrue import SyncSupportedStorage
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
from config import Config

supabase_admin_client: Client = None
page_visits_batch: List[Dict[str, Any]] = []
batch_lock = Lock()

class FlaskSessionStorage(SyncSupportedStorage):
    def get_item(self, key: str) -> Union[str, None]:
        return session.get(key)

    def set_item(self, key: str, value: str) -> None:
        session[key] = value

    def remove_item(self, key: str) -> None:
        session.pop(key, None)

def get_supabase_client() -> Client:
    return create_client(
        Config.SUPABASE_URL,
        Config.SUPABASE_ANON_KEY,
        options=ClientOptions(storage=FlaskSessionStorage())
    )

def init_db():
    global supabase_admin_client
    supabase_admin_client = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_KEY)

    def batch_processor():
        while True:
            sleep(10)
            process_page_visits_batch()

    thread = Thread(target=batch_processor, daemon=True)
    thread.start()

def add_page_visit_to_batch(visit_data: Dict[str, Any]):
    with batch_lock:
        page_visits_batch.append(visit_data)
        if len(page_visits_batch) >= 50:
            process_page_visits_batch()

def process_page_visits_batch():
    with batch_lock:
        if not page_visits_batch:
            return
        try:
            supabase_admin_client.from_('page_visits').insert(page_visits_batch).execute()
            page_visits_batch.clear()
        except Exception:
            pass # Fail silently as per instructions

def rpc(function_name: str, params: Dict[str, Any] = None):
    supabase = get_supabase_client()
    return supabase.rpc(function_name, params or {}).execute()

def admin_rpc(function_name: str, params: Dict[str, Any] = None):
    return supabase_admin_client.rpc(function_name, params or {}).execute()
