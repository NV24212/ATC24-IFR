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
from requests_oauthlib import OAuth2Session
from functools import wraps

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.config['SECRET_KEY'] = os.environ.get('SESSION_SECRET', 'a_very_secret_key_that_should_be_changed')

# --- Supabase Initialization ---
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key) if url and key else None

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
            print(f"WebSocket error: {e}. Reconnecting in 5 seconds...")
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

@app.route('/health')
def health_check():
    return jsonify({
        "status": "ok",
        "supabase_status": "connected" if supabase else "not configured",
        "flight_plan_cache_size": len(flight_plans_cache)
    })

@app.route('/controllers')
def get_controllers():
    try:
        response = requests.get('https://24data.ptfs.app/controllers', timeout=15)
        response.raise_for_status()
        return jsonify({"data": response.json(), "lastUpdated": time.time(), "source": "live"})
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500

@app.route('/atis')
def get_atis():
    try:
        response = requests.get('https://24data.ptfs.app/atis', timeout=15)
        response.raise_for_status()
        return jsonify({"data": response.json(), "lastUpdated": time.time(), "source": "live"})
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500

@app.route('/flight-plans')
def get_flight_plans():
    if flight_plans_cache:
        return jsonify(list(flight_plans_cache))
    if not supabase:
        return jsonify([])
    try:
        response = supabase.from_('flight_plans_received').select("*").order('created_at', desc=True).limit(20).execute()
        return jsonify(response.data or [])
    except Exception as e:
        return jsonify({"error": "Failed to fetch flight plans from database", "details": str(e)}), 500

@app.route('/settings')
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

@app.route('/leaderboard')
def get_leaderboard():
    if not supabase: return jsonify({"error": "Supabase not configured"}), 503
    try:
        response = supabase.rpc('get_clearance_leaderboard', {}).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": "Failed to fetch leaderboard", "details": str(e)}), 500

@app.route('/user/clearances')
@require_auth
def get_user_clearances():
    if not supabase: return jsonify({"error": "Supabase not configured"}), 503
    try:
        user_id = session['user']['id']
        response = supabase.rpc('get_user_clearances', {'p_user_id': user_id}).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": "Failed to fetch user clearances", "details": str(e)}), 500

@app.route('/user/settings', methods=['POST'])
@require_auth
def save_user_settings():
    if not supabase:
        return jsonify({"error": "Supabase not configured"}), 503

    try:
        user_id = session['user']['id']
        settings = request.json.get('settings')

        if not settings:
            return jsonify({"error": "No settings provided"}), 400

        # Assuming the table for user profiles is named 'profiles'
        supabase.table('profiles').update({'settings': settings}).eq('id', user_id).execute()

        # Update the session as well so the user gets the latest settings
        if 'user' in session:
            session['user']['settings'] = settings
            session.modified = True

        return jsonify({"success": True, "message": "Settings saved successfully."})
    except Exception as e:
        print(f"Error saving user settings: {e}")
        return jsonify({"error": "Failed to save settings", "details": str(e)}), 500

@app.route('/clearance-generated', methods=['POST'])
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
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:8000")
    if request.values.get('error'):
        return redirect(f"{frontend_url}?error={request.values['error']}")

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
            print(f"Supabase user upsert error: {e}")
            session['user'] = {'username': user_json['username'], 'discord_id': user_json['id']}
    else:
        session['user'] = {'username': user_json['username'], 'discord_id': user_json['id']}

    return redirect(f"{frontend_url}?auth=success")

@app.route('/auth/user')
def get_current_user():
    return jsonify({"authenticated": 'user' in session, "user": session.get('user')})

@app.route('/auth/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({"success": True, "message": "Logged out"})


if __name__ == '__main__':
    app.run(debug=True, port=5000, use_reloader=False)
