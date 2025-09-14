from flask import Blueprint, jsonify, request, current_app
from datetime import datetime, timezone
from .database import supabase_admin
from .auth_utils import require_admin
from .config import Config

admin_bp = Blueprint('admin_bp', __name__)

@admin_bp.route('/api/admin/settings', methods=['GET'])
@require_admin
def get_admin_settings():
    try:
        response = supabase_admin.table('admin_settings').select('settings').eq('id', 1).single().execute()
        return jsonify(response.data.get('settings', {}))
    except Exception as e:
        current_app.logger.error(f"Failed to get admin settings: {e}", exc_info=True)
        return jsonify({"error": "Failed to retrieve settings"}), 500

@admin_bp.route('/api/admin/settings', methods=['POST'])
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
        current_app.logger.error(f"Failed to save admin settings: {e}", exc_info=True)
        return jsonify({"error": "Failed to save settings"}), 500

@admin_bp.route('/api/admin/table/<table>')
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
        current_app.logger.error(f"Failed to load table '{table}': {e}", exc_info=True)
        return jsonify({"error": f"Failed to load data for {table}"}), 500

@admin_bp.route('/api/admin/users', methods=['GET'])
@require_admin
def get_admin_users():
    try:
        res = supabase_admin.table('discord_users').select('*').eq('is_admin', True).order('username').execute()
        return jsonify({"users": res.data})
    except Exception as e:
        current_app.logger.error(f"Failed to load admin users: {e}", exc_info=True)
        return jsonify({"error": "Failed to load admin users"}), 500

@admin_bp.route('/api/admin/users', methods=['POST'])
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
        current_app.logger.error(f"Failed to add admin user: {e}", exc_info=True)
        return jsonify({"error": "An internal error occurred"}), 500

@admin_bp.route('/api/admin/users/<user_id>', methods=['DELETE'])
@require_admin
def remove_admin_user(user_id):
    try:
        user_to_remove = supabase_admin.table('discord_users').select('discord_id').eq('id', user_id).single().execute().data
        if user_to_remove and user_to_remove['discord_id'] == Config.SUPER_ADMIN_DISCORD_ID:
            return jsonify({"error": "This admin user cannot be removed."}), 403

        supabase_admin.table('discord_users').update({'is_admin': False, 'roles': []}).eq('id', user_id).execute()
        return jsonify({"success": True})
    except Exception as e:
        current_app.logger.error(f"Failed to remove admin user: {e}", exc_info=True)
        return jsonify({"error": "An internal error occurred"}), 500

@admin_bp.route('/api/admin/logs')
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
