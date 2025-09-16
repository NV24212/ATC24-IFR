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

@api_bp.route('/api/admin/settings', methods=['POST'])
@require_auth
def save_admin_settings():
    if not session.get('user', {}).get('is_admin'):
        return jsonify({"error": "Unauthorized"}), 403
    try:
        new_settings = request.json
        # Use upsert to create or update the settings
        response = supabase.from_('admin_settings').upsert({
            'id': 1,
            'settings': new_settings,
            'updated_at': 'now()'
        }).execute()
        if response.data:
            return jsonify({"success": True, "settings": response.data[0]['settings']})
        return jsonify({"success": True})
    except Exception as e:
        current_app.logger.error(f"Failed to save admin settings: {e}", exc_info=True)
        return jsonify({"error": "Failed to save settings", "details": str(e)}), 500

@api_bp.route('/api/admin/tables/<string:table_name>', methods=['GET'])
@require_auth
def get_table_data(table_name):
    if not session.get('user', {}).get('is_admin'):
        return jsonify({"error": "Unauthorized"}), 403

    ALLOWED_TABLES = [
        'page_visits', 'clearance_generations', 'flight_plans_received',
        'user_sessions', 'discord_users', 'admin_activities'
    ]
    if table_name not in ALLOWED_TABLES:
        return jsonify({"error": "Table not found or access denied"}), 404

    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 25))
        offset = (page - 1) * limit

        # Get total count
        count_res = supabase.from_(table_name).select('id', count='exact').execute()
        total_count = count_res.count if count_res.count is not None else 0

        # Get paginated data
        data_res = supabase.from_(table_name).select('*').order('created_at', desc=True).range(offset, offset + limit - 1).execute()

        return jsonify({
            "data": data_res.data or [],
            "totalCount": total_count
        })
    except Exception as e:
        current_app.logger.error(f"Failed to fetch table '{table_name}': {e}", exc_info=True)
        # Check for a common Supabase error when a table doesn't exist
        if 'relation' in str(e) and 'does not exist' in str(e):
            return jsonify({"setupRequired": True, "message": f"The table '{table_name}' does not exist in the database."}), 200
        return jsonify({"error": f"Failed to fetch data for {table_name}", "details": str(e)}), 500
