from flask import Blueprint, jsonify, request, session, current_app
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

# =============================================================================
# Admin Routes
# =============================================================================

@api_bp.route('/api/admin/users', methods=['GET'])
@require_auth
def get_admin_users():
    if not session.get('user', {}).get('is_admin'):
        return jsonify({"error": "Unauthorized"}), 403
    try:
        response = supabase.from_('discord_users').select('id, discord_id, username, avatar, roles, last_login').eq('is_admin', True).execute()
        return jsonify({"users": response.data or []})
    except Exception as e:
        current_app.logger.error(f"Failed to fetch admin users: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch admin users", "details": str(e)}), 500

@api_bp.route('/api/admin/users', methods=['POST'])
@require_auth
def add_admin_user():
    if not session.get('user', {}).get('is_admin'):
        return jsonify({"error": "Unauthorized"}), 403
    try:
        data = request.json
        username = data.get('username')
        roles = data.get('roles', ['admin'])
        if not username:
            return jsonify({"error": "Username is required"}), 400

        user_response = supabase.from_('discord_users').select('id').eq('username', username).single().execute()

        # Supabase returns a list for `execute()`, so we need to check if data exists and is not empty
        if not user_response.data:
            return jsonify({"error": "User not found"}), 404

        user_id = user_response.data['id']

        update_response = supabase.from_('discord_users').update({
            'is_admin': True,
            'roles': roles
        }).eq('id', user_id).execute()

        # Check if the update was successful
        if update_response.data:
            return jsonify({"success": True, "user": update_response.data[0]})
        else:
            # The API might return an empty list on success, so we might need to re-fetch the user
            # For now, let's assume an empty list is not an error if no exception was thrown
            return jsonify({"success": True})

    except Exception as e:
        current_app.logger.error(f"Failed to add admin user: {e}", exc_info=True)
        return jsonify({"error": "Failed to add admin user", "details": str(e)}), 500

@api_bp.route('/api/admin/users/<uuid:user_id>', methods=['DELETE'])
@require_auth
def remove_admin_user(user_id):
    if not session.get('user', {}).get('is_admin'):
        return jsonify({"error": "Unauthorized"}), 403

    if str(user_id) == session.get('user', {}).get('id'):
        return jsonify({"error": "You cannot remove yourself as an admin."}), 400

    try:
        update_response = supabase.from_('discord_users').update({
            'is_admin': False,
            'roles': []
        }).eq('id', user_id).execute()

        if update_response.data:
            return jsonify({"success": True})
        else:
            return jsonify({"success": True}) # Assume success if no error

    except Exception as e:
        current_app.logger.error(f"Failed to remove admin user: {e}", exc_info=True)
        return jsonify({"error": "Failed to remove admin user", "details": str(e)}), 500
