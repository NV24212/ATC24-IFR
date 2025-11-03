from functools import wraps
from flask import Blueprint, jsonify, request, session
from database import rpc, get_supabase_client

user_bp = Blueprint('user_bp', __name__)

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function

@user_bp.route('/api/user/clearances')
@require_auth
def get_user_clearances():
    user_id = session['user']['id']
    clearances = rpc('get_user_clearances', {'p_user_id': user_id}).data
    return jsonify(clearances)

@user_bp.route('/api/user/settings', methods=['POST'])
@require_auth
def save_user_settings():
    settings = request.json.get('settings')
    user_id = session['user']['id']
    get_supabase_client().from_('discord_users').update({'user_settings': settings}).eq('id', user_id).execute()
    return jsonify({"success": True})

@user_bp.route('/api/clearance-generated', methods=['POST'])
@require_auth
def track_clearance_generation():
    data = request.json
    clearance_data = {
        "callsign": data.get('callsign'),
        "destination": data.get('destination'),
        "route": data.get('route'),
        "routing_type": data.get('routing_type'),
        "runway": data.get('runway'),
        "initial_altitude": data.get('initial_altitude'),
        "station": data.get('station'),
        "atis_info": data.get('atis_info'),
        "clearance_text": data.get('clearance_text'),
        "user_id": session.get('user', {}).get('id'),
        "discord_username": session.get('user', {}).get('username')
    }
    get_supabase_client().from_('clearance_generations').insert(clearance_data).execute()
    return jsonify({"success": True})
