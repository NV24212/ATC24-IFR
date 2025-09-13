import os
from flask import Flask, jsonify, session, redirect, request, render_template, send_from_directory
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
from requests_oauthlib import OAuth2Session
from collections import deque
from functools import wraps

# Load environment variables from .env file
load_dotenv()

import logging
from logging.handlers import RotatingFileHandler

# Construct the path to the frontend directory
frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend')

app = Flask(__name__,
            static_folder=frontend_dir,
            template_folder=frontend_dir)
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
supabase: Client = None # Default to None
if url and key and 'your_supabase_url' not in url:
    try:
        supabase = create_client(url, key)
    except Exception as e:
        # Using print because logger might not be configured yet
        print(f"WARNING: Supabase client failed to initialize: {e}. Supabase-dependent features will be disabled.")
else:
    print("WARNING: SUPABASE_URL is not set or is a placeholder. Supabase-dependent features will be disabled.")

# --- Discord OAuth Configuration ---
DISCORD_CLIENT_ID = os.environ.get("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.environ.get("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI = os.environ.get("DISCORD_REDIRECT_URI", "http://localhost:5000/auth/discord/callback")
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

# --- Auth Decorator ---
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({"error": "Authentication required"}), 401
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

# --- Status Page ---
@app.route('/api/full-status')
def get_full_status():
    external_services = get_external_service_status()
    internal_routes = get_internal_routes()
    error_log = get_error_log()

    # Determine overall status for each category
    data_status = 'operational'
    if any(s['status'] != 'Online (Receiving Data)' and s['status'] != 'Online' for s in external_services.values()):
        data_status = 'degraded'
    if all(s['status'] == 'Offline' for s in external_services.values()):
        data_status = 'outage'

    api_status = 'operational' # Assume operational unless an error is found, a more robust check could be added

    error_status = 'operational'
    if error_log:
        error_status = 'degraded'


    response = {
        "24data_connectivity": {
            "status": data_status,
            "endpoints": [{"name": name, "status": "operational" if "Online" in details["status"] else "outage", "message": details["status"]} for name, details in external_services.items()]
        },
        "24ifr_api": {
            "status": api_status,
            "endpoints": [{"name": route["endpoint"], "path": route["path"], "methods": route["methods"], "status": "operational"} for route in internal_routes]
        },
        "errors": {
            "status": error_status,
            "count": len(error_log),
            "logs": list(error_log)
        }
    }
    return jsonify(response)

def get_external_service_status():
    services = {
        "24DATA_Controllers": {"url": "https://24data.ptfs.app/controllers", "status": "Offline"},
        "24DATA_ATIS": {"url": "https://24data.ptfs.app/atis", "status": "Offline"},
        "24DATA_WebSocket": {"url": "wss://24data.ptfs.app/wss", "status": "Offline"}
    }
    try:
        response = requests.head(services["24DATA_Controllers"]["url"], timeout=5)
        if response.status_code == 200:
            services["24DATA_Controllers"]["status"] = "Online"
    except requests.RequestException:
        pass # Status remains Offline
    try:
        response = requests.head(services["24DATA_ATIS"]["url"], timeout=5)
        if response.status_code == 200:
            services["24DATA_ATIS"]["status"] = "Online"
    except requests.RequestException:
        pass # Status remains Offline

    # WebSocket status is harder to check synchronously.
    # We'll assume it's online if the flight plan cache has recent entries.
    if flight_plans_cache and (time.time() - flight_plans_cache[0]['timestamp']) < 300: # 5 minutes
        services["24DATA_WebSocket"]["status"] = "Online (Receiving Data)"

    return services

def get_internal_routes():
    routes = []
    for rule in app.url_map.iter_rules():
        if "static" not in rule.endpoint:
            methods = ','.join(sorted([m for m in rule.methods if m not in ["HEAD", "OPTIONS"]]))
            routes.append({"endpoint": rule.endpoint, "methods": methods, "path": str(rule)})
    return routes

def get_error_log():
    try:
        with open('app_errors.log', 'r') as f:
            # Read last 25 lines for brevity
            return deque(f, 25)
    except FileNotFoundError:
        return []
    except Exception as e:
        # Log this error to the console, not to the file to avoid loops
        print(f"Error reading error log: {e}")
        return ["Could not read error log file."]

@app.route('/')
def status_page():
    return render_template('status.html')

@app.route('/app')
def serve_spa():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/app/<path:path>')
def serve_spa_paths(path):
    return send_from_directory(app.static_folder, 'index.html')

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

@app.route('/api/settings')
def get_public_settings():
    public_settings = {
        "clearanceFormat": {
            "includeAtis": True, "includeSquawk": True, "includeFlightLevel": True,
            "customTemplate": "{CALLSIGN}, {ATC_STATION}, good day. Startup approved. Information {ATIS} is correct. Cleared to {DESTINATION} via {ROUTE}, runway {RUNWAY}. Initial climb {INITIAL_ALT}FT, expect further climb to Flight Level {FLIGHT_LEVEL}. Squawk {SQUAWK}.",
            "includeStartupApproval": True, "includeInitialClimb": True
        },
        "aviation": {
            "defaultAltitudes": [1000, 2000, 3000, 4000, 5000],
            "squawkRanges": {"min": 1000, "max": 7777, "exclude": [7500, 7600, 7700]}
        }
    }
    return jsonify(public_settings)

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
    discord = OAuth2Session(DISCORD_CLIENT_ID, redirect_uri=DISCORD_REDIRECT_URI, scope=scope)
    authorization_url, state = discord.authorization_url(AUTHORIZATION_BASE_URL)
    session['oauth2_state'] = state
    return redirect(authorization_url)

@app.route('/auth/discord/callback')
def discord_callback():
    if request.values.get('error'):
        return redirect(f"/app?error={request.values['error']}")

    discord = OAuth2Session(DISCORD_CLIENT_ID, state=session.get('oauth2_state'), redirect_uri=DISCORD_REDIRECT_URI)
    token = discord.fetch_token(TOKEN_URL, client_secret=DISCORD_CLIENT_SECRET, authorization_response=request.url)
    user_json = discord.get(API_BASE_URL + '/users/@me').json()

    if supabase:
        try:
            rpc_params = {
                'p_discord_id': user_json['id'], 'p_username': user_json['username'],
                'p_discriminator': user_json['discriminator'], 'p_email': user_json.get('email'),
                'p_avatar': f"https://cdn.discordapp.com/avatars/{user_json['id']}/{user_json['avatar']}.png" if user_json['avatar'] else None,
                'p_access_token': token['access_token'], 'p_refresh_token': token.get('refresh_token'),
                'p_token_expires_at': str(int(time.time() + token['expires_in']))
            }
            db_user = supabase.rpc('upsert_discord_user', rpc_params).execute().data[0]
            session['user'] = {
                'id': db_user['id'], 'discord_id': db_user['discord_id'],
                'username': db_user['username'], 'avatar': db_user['avatar'],
                'is_admin': db_user.get('is_admin', False)
            }
        except Exception as e:
            app.logger.error(f"Supabase user upsert error: {e}", exc_info=True)
            session['user'] = {'username': user_json['username'], 'discord_id': user_json['id']}
    else:
        session['user'] = {'username': user_json['username'], 'discord_id': user_json['id']}

    return redirect("/app?auth=success")

@app.route('/api/auth/user')
def get_current_user():
    return jsonify({"authenticated": 'user' in session, "user": session.get('user')})

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({"success": True, "message": "Logged out"})

if __name__ == '__main__':
    # The WebSocket client is started by the Gunicorn `post_worker_init` hook in production.
    # For local development, you might want to start it here, but it's better
    # to run with Gunicorn locally to mimic the production environment.
    # Example: gunicorn --config gunicorn.conf.py app:app
    app.run(debug=True, port=5000, use_reloader=False)
