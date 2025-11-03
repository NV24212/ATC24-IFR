from flask import Blueprint, jsonify, request, Response, session
from services import external_api_service, flight_plans_cache
from database import rpc, get_supabase_client

public_bp = Blueprint('public_bp', __name__)

@public_bp.route('/api/health')
def health_check():
    return jsonify({"status": "ok"})

@public_bp.route('/api/controllers')
def get_controllers():
    data = external_api_service.get_controllers()
    return jsonify(data)

@public_bp.route('/api/atis')
def get_atis():
    data = external_api_service.get_atis()
    return jsonify(data)

@public_bp.route('/api/flight-plans')
def get_flight_plans():
    return jsonify(list(flight_plans_cache))

@public_bp.route('/api/leaderboard')
def get_leaderboard():
    leaderboard_data = rpc('get_clearance_leaderboard', {'p_limit': 20}).data
    response = jsonify(leaderboard_data)
    response.headers['Cache-Control'] = 'public, max-age=300'
    return response

@public_bp.route('/api/clearance-generated', methods=['POST'])
def track_clearance_generation():
    data = request.json
    clearance_data = {
        "session_id": session.get('session_id'),
        "user_id": session.get('user', {}).get('id'),
        "discord_username": session.get('user', {}).get('username'),
        "clearance_text": data.get('clearance_text')
    }
    get_supabase_client().from_('clearance_generations').insert(clearance_data).execute()
    return jsonify({"success": True})
