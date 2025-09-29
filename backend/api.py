from flask import Blueprint, jsonify, request, session, current_app
from .database import supabase, supabase_admin, log_to_db
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

        if 'squawk_code' in data:
            data['transponder_code'] = data.pop('squawk_code')

        # Ensure atis_info is in a JSONB-compatible format
        if 'atis_info' in data and isinstance(data['atis_info'], str):
            data['atis_info'] = {'letter': data['atis_info']}

        clearance_data = {
            "ip_address": request.remote_addr,
            "user_agent": request.user_agent.string,
            "session_id": session.get('session_id'),
            "user_id": session.get('user', {}).get('id'),
            "discord_username": session.get('user', {}).get('username'),
            **data
        }
        supabase.table('clearance_generations').insert(clearance_data).execute()

        log_to_db('info', f"Clearance generated for {clearance_data.get('callsign')}", data={'user': clearance_data.get('discord_username')})
        return jsonify({"success": True})
    except Exception as e:
        log_to_db('error', 'Failed to track clearance generation', data={'error': str(e)})
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

        user_response = supabase.from_('discord_users').select('id').eq('username', username).execute()

        if not user_response.data:
            return jsonify({"error": "User not found"}), 404

        user_id = user_response.data[0]['id']

        supabase.from_('discord_users').update({
            'is_admin': True,
            'roles': roles
        }).eq('id', user_id).execute()

        log_to_db('info', f"Admin access granted to {username}", data={'granted_by': session.get('user', {}).get('username')})
        return jsonify({"success": True})

    except Exception as e:
        log_to_db('error', f"Failed to add admin user {username}", data={'error': str(e)})
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
        supabase.from_('discord_users').update({
            'is_admin': False,
            'roles': []
        }).eq('id', user_id).execute()

        log_to_db('warn', f"Admin access removed for user ID {user_id}", data={'removed_by': session.get('user', {}).get('username')})
        return jsonify({"success": True})

    except Exception as e:
        log_to_db('error', f"Failed to remove admin for user ID {user_id}", data={'error': str(e)})
        current_app.logger.error(f"Failed to remove admin user: {e}", exc_info=True)
        return jsonify({"error": "Failed to remove admin user", "details": str(e)}), 500

@api_bp.route('/api/settings', methods=['GET'])
def get_public_settings():
    try:
        response = supabase_admin.from_('admin_settings').select('settings').eq('id', 1).execute()
        if response.data:
            return jsonify(response.data[0].get('settings', {}))
        else:
            return jsonify({})
    except Exception as e:
        current_app.logger.error(f"Failed to fetch public settings: {e}", exc_info=True)
        return jsonify({})

@api_bp.route('/api/admin/settings', methods=['GET'])
@require_auth
def get_admin_settings():
    if not session.get('user', {}).get('is_admin'):
        return jsonify({"error": "Unauthorized"}), 403
    try:
        response = supabase.from_('admin_settings').select('settings').eq('id', 1).execute()
        if response.data:
            return jsonify(response.data[0].get('settings', {}))
        else:
            return jsonify({})
    except Exception as e:
        current_app.logger.error(f"Failed to fetch admin settings: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch settings", "details": str(e)}), 500

@api_bp.route('/api/admin/settings', methods=['POST'])
@require_auth
def save_admin_settings():
    if not session.get('user', {}).get('is_admin'):
        return jsonify({"error": "Unauthorized"}), 403
    try:
        new_settings = request.json
        response = supabase.from_('admin_settings').upsert({
            'id': 1,
            'settings': new_settings,
            'updated_at': 'now()'
        }).execute()

        log_to_db('info', "Admin settings saved", data={'saved_by': session.get('user', {}).get('username')})

        if response.data:
            return jsonify({"success": True, "settings": response.data[0]['settings']})
        return jsonify({"success": True})
    except Exception as e:
        log_to_db('error', "Failed to save admin settings", data={'error': str(e)})
        current_app.logger.error(f"Failed to save admin settings: {e}", exc_info=True)
        return jsonify({"error": "Failed to save settings", "details": str(e)}), 500

@api_bp.route('/api/admin/analytics', methods=['GET'])
@require_auth
def get_admin_analytics():
    if not session.get('user', {}).get('is_admin'):
        return jsonify({"error": "Unauthorized"}), 403
    try:
        # Fetch total counts
        total_visits_res = supabase.from_('page_visits').select('id', count='exact').execute()
        total_clearances_res = supabase.from_('clearance_generations').select('id', count='exact').execute()
        total_flight_plans_res = supabase.from_('flight_plans_received').select('id', count='exact').execute()

        # Use the optimized SQL function for daily visits
        daily_visits_res = supabase.rpc('get_daily_counts', {'table_name': 'page_visits'}).execute()

        # Format daily visits data for the frontend
        daily_visits_dict = {item['date']: item['count'] for item in daily_visits_res.data} if daily_visits_res.data else {}

        analytics_data = {
            "totalVisits": total_visits_res.count or 0,
            "clearancesGenerated": total_clearances_res.count or 0,
            "flightPlansReceived": total_flight_plans_res.count or 0,
            "dailyVisits": daily_visits_dict,
        }
        return jsonify(analytics_data)
    except Exception as e:
        current_app.logger.error(f"Failed to fetch admin analytics: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch analytics data", "details": str(e)}), 500

@api_bp.route('/api/admin/charts', methods=['GET'])
@require_auth
def get_chart_data():
    if not session.get('user', {}).get('is_admin'):
        return jsonify({"error": "Unauthorized"}), 403
    try:
        # Use the new SQL function for efficient data aggregation
        daily_visits_res = supabase.rpc('get_daily_counts', {'table_name': 'page_visits'}).execute()
        daily_clearances_res = supabase.rpc('get_daily_counts', {'table_name': 'clearance_generations'}).execute()

        chart_data = {
            "daily_visits": daily_visits_res.data or [],
            "daily_clearances": daily_clearances_res.data or []
        }
        return jsonify(chart_data)
    except Exception as e:
        current_app.logger.error(f"Failed to fetch chart data: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch chart data", "details": str(e)}), 500

@api_bp.route('/api/admin/logs', methods=['GET'])
@require_auth
def get_debug_logs():
    if not session.get('user', {}).get('is_admin'):
        return jsonify({"error": "Unauthorized"}), 403
    try:
        level = request.args.get('level', 'all')
        query = supabase.from_('debug_logs').select('*').order('timestamp', desc=True).limit(100)

        if level != 'all':
            query = query.eq('level', level)

        response = query.execute()

        return jsonify({"logs": response.data or []})
    except Exception as e:
        current_app.logger.error(f"Failed to fetch debug logs: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch logs", "details": str(e)}), 500

@api_bp.route('/api/admin/analytics/reset', methods=['POST'])
@require_auth
def reset_analytics_data():
    if not session.get('user', {}).get('is_admin'):
        return jsonify({"error": "Unauthorized"}), 403
    try:
        supabase.from_('page_visits').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        supabase.from_('clearance_generations').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        return jsonify({"success": True, "message": "Analytics data has been reset."})
    except Exception as e:
        current_app.logger.error(f"Failed to reset analytics data: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

@api_bp.route('/api/admin/current-users', methods=['GET'])
@require_auth
def get_current_users():
    if not session.get('user', {}).get('is_admin'):
        return jsonify({"error": "Unauthorized"}), 403
    try:
        from datetime import datetime, timedelta
        time_threshold = datetime.utcnow() - timedelta(minutes=5)

        # Get active sessions from page visits
        active_visits_res = supabase.from_('page_visits').select('session_id, created_at').gt('created_at', time_threshold.isoformat()).execute()

        sessions = {}
        if active_visits_res.data:
            for visit in active_visits_res.data:
                sid = visit['session_id']
                if sid not in sessions:
                    sessions[sid] = {
                        "session_id": sid,
                        "page_views": 0,
                        "clearances_generated": 0, # Initialize
                        "last_activity": "1970-01-01T00:00:00Z",
                        "source": "db"
                    }
                sessions[sid]["page_views"] += 1
                if visit['created_at'] > sessions[sid]['last_activity']:
                    sessions[sid]['last_activity'] = visit['created_at']

        # Get recent clearances
        recent_clearances_res = supabase.from_('clearance_generations').select('session_id, created_at').gt('created_at', time_threshold.isoformat()).execute()

        if recent_clearances_res.data:
            for clearance in recent_clearances_res.data:
                sid = clearance['session_id']
                if sid not in sessions:
                     sessions[sid] = {
                        "session_id": sid,
                        "page_views": 0,
                        "clearances_generated": 0,
                        "last_activity": "1970-01-01T00:00:00Z",
                        "source": "db"
                    }
                sessions[sid]['clearances_generated'] += 1
                if clearance['created_at'] > sessions[sid]['last_activity']:
                    sessions[sid]['last_activity'] = clearance['created_at']


        if not sessions:
            return jsonify({"activeCount": 0, "users": [], "memorySessionsCount": 0, "supabaseSessionsCount": 0})

        return jsonify({
            "activeCount": len(sessions),
            "users": list(sessions.values()),
            "memorySessionsCount": len(sessions),
            "supabaseSessionsCount": 0
        })
    except Exception as e:
        current_app.logger.error(f"Failed to fetch current users: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch current users", "details": str(e)}), 500

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
        limit = int(request.args.get('limit', 25))
        offset = int(request.args.get('offset', 0))

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
