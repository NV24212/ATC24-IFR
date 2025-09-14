from flask import Blueprint, jsonify, request, session
from .database import supabase
from .services import external_api_service, flight_plans_cache
from .auth_utils import require_auth

api_bp = Blueprint('api_bp', __name__)

@api_bp.route('/api/health')
def health_check():
    return jsonify({
        "status": "ok",
        "supabase_status": "connected" if supabase else "not configured",
        "flight_plan_cache_size": len(flight_plans_cache)
    })

@api_bp.route('/api/controllers')
def get_controllers():
    try:
        return jsonify(external_api_service.get_controllers())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/api/atis')
def get_atis():
    try:
        return jsonify(external_api_service.get_atis())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/api/flight-plans')
def get_flight_plans():
    if flight_plans_cache:
        return jsonify(list(flight_plans_cache))
    if not supabase:
        return jsonify([])
    try:
        response = supabase.from_('flight_plans_received').select("*").order('created_at', desc=True).limit(20).execute()
        return jsonify(response.data or [])
    except Exception as e:
        current_app.logger.error(f"Failed to fetch flight plans from Supabase: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch flight plans from database", "details": str(e)}), 500

@api_bp.route('/api/leaderboard')
def get_leaderboard():
    if not supabase: return jsonify({"error": "Supabase not configured"}), 503
    try:
        response = supabase.rpc('get_clearance_leaderboard', {}).execute()
        return jsonify(response.data)
    except Exception as e:
        current_app.logger.error(f"Failed to fetch leaderboard from Supabase: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch leaderboard", "details": str(e)}), 500

@api_bp.route('/api/user/clearances')
@require_auth
def get_user_clearances():
    if not supabase: return jsonify({"error": "Supabase not configured"}), 503
    try:
        user_id = session['user']['id']
        response = supabase.rpc('get_user_clearances', {'p_user_id': user_id}).execute()
        return jsonify(response.data)
    except Exception as e:
        current_app.logger.error(f"Failed to fetch user clearances from Supabase: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch user clearances", "details": str(e)}), 500

@api_bp.route('/api/clearance-generated', methods=['POST'])
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
        current_app.logger.error(f"Failed to track clearance generation in Supabase: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500
