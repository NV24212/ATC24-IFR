import os
from flask import Flask, jsonify, session, redirect, request
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client, Client
import requests
import asyncio
import threading
import websockets
import json
from collections import deque
import time
from datetime import datetime, timezone
from requests_oauthlib import OAuth2Session
from collections import deque
from functools import wraps
from werkzeug.middleware.proxy_fix import ProxyFix

# Load environment variables from .env file
load_dotenv()

import logging
from logging.handlers import RotatingFileHandler

# This is now a pure API server. No static file serving.
app = Flask(__name__)

# Apply ProxyFix to handle headers from Traefik
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

CORS(app, supports_credentials=True)
app.config['SECRET_KEY'] = os.environ.get('SESSION_SECRET', 'a_very_secret_key_that_should_be_changed')

# --- Logging Configuration ---
log_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
log_handler = RotatingFileHandler('app_errors.log', maxBytes=1024 * 1024, backupCount=5) # 1MB per file, 5 backups
log_handler.setFormatter(log_formatter)
log_handler.setLevel(logging.ERROR) # Only log ERROR and CRITICAL
app.logger.addHandler(log_handler)
app.logger.setLevel(logging.ERROR)

# --- Supabase Initialization ---
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")
service_key: str = os.environ.get("SUPABASE_SERVICE_KEY")

supabase: Client = None
supabase_admin: Client = None

if url and key and 'your_supabase_url' not in url:
    try:
        supabase = create_client(url, key)
        if service_key and 'your_secret_service_role_key' not in service_key:
            supabase_admin = create_client(url, service_key)
            print("Supabase admin client initialized.")
        else:
            print("WARNING: SUPABASE_SERVICE_KEY not set or is a placeholder. Admin operations will fail.")
    except Exception as e:
        print(f"WARNING: Supabase client failed to initialize: {e}. Supabase-dependent features will be disabled.")
else:
    print("WARNING: SUPABASE_URL is not set or is a placeholder. Supabase-dependent features will be disabled.")

# --- Discord OAuth Configuration ---
DISCORD_CLIENT_ID = os.environ.get("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.environ.get("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI = os.environ.get("DISCORD_REDIRECT_URI", "http://localhost:5000/auth/discord/callback")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:8000")
API_BASE_URL = 'https://discord.com/api'
AUTHORIZATION_BASE_URL = API_BASE_URL + '/oauth2/authorize'
TOKEN_URL = API_BASE_URL + '/oauth2/token'

# --- In-memory Cache ---
MAX_FLIGHT_PLANS = 50
flight_plans_cache = deque(maxlen=MAX_FLIGHT_PLANS)

# --- WebSocket Client ---
async def flight_plan_websocket_client():
    uri = "wss://24data.ptfs.app/wss"
    while True:
        try:
            async with websockets.connect(uri, origin="") as websocket:
                print("WebSocket connected successfully.")
                while True:
                    message = await websocket.recv()
                    data = json.loads(message)
                    if data.get("t") in ["FLIGHT_PLAN", "EVENT_FLIGHT_PLAN"]:
                        flight_plan = data.get("d", {})
                        if flight_plan:
                            flight_plan["timestamp"] = time.time()
                            flight_plan["source"] = data.get("t")
                            flight_plans_cache.appendleft(flight_plan)
        except Exception as e:
            app.logger.error(f"WebSocket error: {e}. Reconnecting in 5 seconds...", exc_info=True)
        await asyncio.sleep(5)

def run_websocket_in_background():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(flight_plan_websocket_client())

# --- Auth Decorators ---
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function

def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({"error": "Authentication required"}), 401
        if not session['user'].get('is_admin'):
            return jsonify({"error": "Admin access required"}), 403
        if not supabase_admin:
            return jsonify({"error": "Admin backend not configured"}), 500
        return f(*args, **kwargs)
    return decorated_function

# --- API Endpoints ---

@app.route('/api/health')
def health_check():
    return jsonify({
        "status": "ok",
        "supabase_status": "connected" if supabase else "not configured",
        "flight_plan_cache_size": len(flight_plans_cache)
    })

@app.route('/api/controllers')
def get_controllers():
    try:
        response = requests.get('https://24data.ptfs.app/controllers', timeout=15)
        response.raise_for_status()
        return jsonify({"data": response.json(), "lastUpdated": time.time(), "source": "live"})
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Failed to fetch controllers: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/atis')
def get_atis():
    try:
        response = requests.get('https://24data.ptfs.app/atis', timeout=15)
        response.raise_for_status()
        return jsonify({"data": response.json(), "lastUpdated": time.time(), "source": "live"})
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Failed to fetch ATIS data: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/flight-plans')
def get_flight_plans():
    if flight_plans_cache:
        return jsonify(list(flight_plans_cache))
    if not supabase:
        return jsonify([])
    try:
        response = supabase.from_('flight_plans_received').select("*").order('created_at', desc=True).limit(20).execute()
        return jsonify(response.data or [])
    except Exception as e:
        app.logger.error(f"Failed to fetch flight plans from Supabase: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch flight plans from database", "details": str(e)}), 500

def get_default_public_settings():
    """Returns a complete, default settings object for the frontend."""
    return {
        "clearanceFormat": {
            "customTemplate": "{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}.",
            "includeAtis": True,
            "includeSquawk": True,
            "includeFlightLevel": True,
            "includeStartupApproval": True,
            "includeInitialClimb": True
        },
        "aviation": {
            "defaultAltitudes": [1000, 2000, 3000, 4000, 5000],
            "squawkRanges": { "min": 1000, "max": 7777, "exclude": [7500, 7600, 7700] }
        }
    }

@app.route('/api/settings')
def get_public_settings():
    if not supabase_admin:
        # Fallback for when admin client is not available
        return jsonify(get_default_public_settings())
    try:
        response = supabase_admin.table('admin_settings').select('settings').eq('id', 1).single().execute()
        settings = response.data.get('settings', {})
        # Filter for only public-safe settings
        public_settings = {
            "clearanceFormat": settings.get('clearanceFormat', {}),
            "aviation": settings.get('aviation', {})
        }
        # Ensure the returned object has the same shape as the default
        default_settings = get_default_public_settings()
        public_settings["aviation"] = {**default_settings["aviation"], **public_settings.get("aviation", {})}
        public_settings["clearanceFormat"] = {**default_settings["clearanceFormat"], **public_settings.get("clearanceFormat", {})}

        return jsonify(public_settings)
    except Exception:
        # Fallback to hardcoded defaults if DB fails
        return jsonify(get_default_public_settings())


@app.route('/api/leaderboard')
def get_leaderboard():
    if not supabase: return jsonify({"error": "Supabase not configured"}), 503
    try:
        response = supabase.rpc('get_clearance_leaderboard', {}).execute()
        return jsonify(response.data)
    except Exception as e:
        app.logger.error(f"Failed to fetch leaderboard from Supabase: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch leaderboard", "details": str(e)}), 500

@app.route('/api/user/clearances')
@require_auth
def get_user_clearances():
    if not supabase: return jsonify({"error": "Supabase not configured"}), 503
    try:
        user_id = session['user']['id']
        response = supabase.rpc('get_user_clearances', {'p_user_id': user_id}).execute()
        return jsonify(response.data)
    except Exception as e:
        app.logger.error(f"Failed to fetch user clearances from Supabase: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch user clearances", "details": str(e)}), 500

@app.route('/api/clearance-generated', methods=['POST'])
def track_clearance_generation():
    if not supabase: return jsonify({"success": False, "error": "Supabase not configured"}), 503
    try:
        data = request.json
        clearance_data = {
            "ip_address": request.remote_addr,
            "user_agent": request.user_agent.string,
            "user_id": session.get('user', {}).get('id'),
            **data
        }
        # The atis_info / atis_letter mismatch is now fixed in the migration
        supabase.table('clearance_generations').insert(clearance_data).execute()
        return jsonify({"success": True})
    except Exception as e:
        app.logger.error(f"Failed to track clearance generation in Supabase: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

# --- Authentication Endpoints ---

@app.route('/auth/discord')
def discord_login():
    if not all([DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET]):
        return jsonify({"error": "Discord OAuth not configured"}), 500
    scope = ['identify', 'email']
    discord_session = OAuth2Session(DISCORD_CLIENT_ID, redirect_uri=DISCORD_REDIRECT_URI, scope=scope)
    authorization_url, state = discord_session.authorization_url(AUTHORIZATION_BASE_URL)
    session['oauth2_state'] = state
    return redirect(authorization_url)

@app.route('/auth/discord/callback')
def discord_callback():
    if request.values.get('error'):
        return redirect(f"{FRONTEND_URL}/?error={request.values['error']}")

    discord_session = OAuth2Session(DISCORD_CLIENT_ID, state=session.get('oauth2_state'), redirect_uri=DISCORD_REDIRECT_URI)

    try:
        token = discord_session.fetch_token(TOKEN_URL, client_secret=DISCORD_CLIENT_SECRET, authorization_response=request.url)
        user_json = discord_session.get(API_BASE_URL + '/users/@me').json()
    except Exception as e:
        app.logger.error(f"Discord OAuth token fetch/user fetch error: {e}", exc_info=True)
        return redirect(f"{FRONTEND_URL}/?error=discord_auth_failed")

    if not supabase_admin:
        app.logger.error("Supabase admin client not available for user upsert.")
        return redirect(f"{FRONTEND_URL}/?error=admin_not_configured")

    try:
        expires_at = datetime.fromtimestamp(int(time.time() + token['expires_in']), tz=timezone.utc)

        user_data = {
            'discord_id': user_json['id'],
            'username': user_json['username'],
            'discriminator': user_json.get('discriminator'),
            'email': user_json.get('email'),
            'avatar': f"https://cdn.discordapp.com/avatars/{user_json['id']}/{user_json['avatar']}.png" if user_json.get('avatar') else None,
            'access_token': token['access_token'],
            'refresh_token': token.get('refresh_token'),
            'token_expires_at': expires_at.isoformat(),
            'last_login': datetime.now(timezone.utc).isoformat()
        }

        # Use service client to upsert, bypassing RLS. is_admin is preserved by ON CONFLICT DO NOTHING.
        supabase_admin.table('discord_users').upsert(user_data, on_conflict='discord_id').execute()

        db_user = supabase_admin.table('discord_users').select('*').eq('discord_id', user_json['id']).single().execute().data
        if not db_user:
            raise Exception("Failed to retrieve user from DB after upsert.")

        session['user'] = {
            'id': db_user['id'], 'discord_id': db_user['discord_id'],
            'username': db_user['username'], 'avatar': db_user['avatar'],
            'is_admin': db_user.get('is_admin', False),
            'roles': db_user.get('roles', [])
        }
    except Exception as e:
        app.logger.error(f"Supabase user upsert error: {e}", exc_info=True)
        return redirect(f"{FRONTEND_URL}/?error=db_error")

    return redirect(f"{FRONTEND_URL}/?auth=success")

@app.route('/api/auth/user')
def get_current_user():
    return jsonify({"authenticated": 'user' in session, "user": session.get('user')})

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    session.clear()
    return jsonify({"success": True, "message": "Logged out"})

# --- Admin API Endpoints ---
@app.route('/api/admin/settings', methods=['GET'])
@require_admin
def get_admin_settings():
    try:
        response = supabase_admin.table('admin_settings').select('settings').eq('id', 1).single().execute()
        return jsonify(response.data.get('settings', {}))
    except Exception as e:
        app.logger.error(f"Failed to get admin settings: {e}", exc_info=True)
        return jsonify({"error": "Failed to retrieve settings"}), 500

@app.route('/api/admin/settings', methods=['POST'])
@require_admin
def save_admin_settings():
    try:
        new_settings = request.json
        supabase_admin.table('admin_settings').update({
            'settings': new_settings,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', 1).execute()
        return jsonify({"success": True, "settings": new_settings})
    except Exception as e:
        app.logger.error(f"Failed to save admin settings: {e}", exc_info=True)
        return jsonify({"error": "Failed to save settings"}), 500

@app.route('/api/admin/table/<table>')
@require_admin
def get_table_data(table):
    allowed_tables = ['clearance_generations', 'flight_plans_received', 'discord_users', 'page_visits', 'user_sessions', 'admin_activities']
    if table not in allowed_tables:
        return jsonify({"error": "Table not found or not permitted"}), 404

    try:
        offset = int(request.args.get('offset', 0))
        page_size = int(request.args.get('pageSize', 25))

        count_res = supabase_admin.table(table).select('id', count='exact').execute()
        data_res = supabase_admin.table(table).select('*').order('created_at', desc=True).range(offset, offset + page_size - 1).execute()

        return jsonify({"data": data_res.data, "totalCount": count_res.count})
    except Exception as e:
        app.logger.error(f"Failed to load table '{table}': {e}", exc_info=True)
        return jsonify({"error": f"Failed to load data for {table}"}), 500

@app.route('/api/admin/users', methods=['GET'])
@require_admin
def get_admin_users():
    try:
        res = supabase_admin.table('discord_users').select('*').eq('is_admin', True).order('username').execute()
        return jsonify({"users": res.data})
    except Exception as e:
        app.logger.error(f"Failed to load admin users: {e}", exc_info=True)
        return jsonify({"error": "Failed to load admin users"}), 500

@app.route('/api/admin/users', methods=['POST'])
@require_admin
def add_admin_user():
    data = request.json
    username = data.get('username')
    roles = data.get('roles', ['admin'])
    if not username: return jsonify({"error": "Username is required"}), 400

    try:
        user_res = supabase_admin.table('discord_users').select('id, roles').ilike('username', username).single().execute()
        if not user_res.data: return jsonify({"error": f"User '{username}' not found"}), 404

        current_roles = user_res.data.get('roles', [])
        new_roles = list(set(current_roles + roles))

        supabase_admin.table('discord_users').update({'is_admin': True, 'roles': new_roles}).eq('id', user_res.data['id']).execute()
        return jsonify({"success": True})
    except Exception as e:
        app.logger.error(f"Failed to add admin user: {e}", exc_info=True)
        return jsonify({"error": "An internal error occurred"}), 500

@app.route('/api/admin/users/<user_id>', methods=['DELETE'])
@require_admin
def remove_admin_user(user_id):
    # Check if user is one of the hardcoded super admins
    user_to_remove = supabase_admin.table('discord_users').select('discord_id').eq('id', user_id).single().execute().data
    if user_to_remove and user_to_remove['discord_id'] in ['1200035083550208042']:
         return jsonify({"error": "This admin user cannot be removed."}), 403

    try:
        supabase_admin.table('discord_users').update({'is_admin': False, 'roles': []}).eq('id', user_id).execute()
        return jsonify({"success": True})
    except Exception as e:
        app.logger.error(f"Failed to remove admin user: {e}", exc_info=True)
        return jsonify({"error": "An internal error occurred"}), 500

@app.route('/api/admin/logs')
@require_admin
def get_debug_logs():
    try:
        log_entries = []
        with open('app_errors.log', 'r') as f:
            for i, line in enumerate(reversed(f.readlines()[-100:])):
                parts = line.split(' - ')
                if len(parts) >= 3:
                    log_entries.append({"id": i, "timestamp": parts[0], "level": parts[1].lower(), "message": " - ".join(parts[2:]).strip()})
        return jsonify({"logs": log_entries})
    except FileNotFoundError:
        return jsonify({"logs": []})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Fallback 404 for API routes
@app.errorhandler(404)
def not_found(e):
    return jsonify(error='Not found'), 404

if __name__ == '__main__':
    websocket_thread = threading.Thread(target=run_websocket_in_background, daemon=True)
    websocket_thread.start()
    app.run(debug=True, port=5000, use_reloader=False)
