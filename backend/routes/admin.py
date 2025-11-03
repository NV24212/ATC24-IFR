from functools import wraps
from flask import Blueprint, jsonify, request, session
from database import admin_rpc, supabase_admin_client

admin_bp = Blueprint('admin_bp', __name__)

def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('user', {}).get('is_admin'):
            return jsonify({"error": "Unauthorized"}), 403
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/api/admin/analytics')
@require_admin
def get_admin_analytics():
    analytics_data = admin_rpc('get_admin_analytics').data
    return jsonify(analytics_data)

@admin_bp.route('/api/admin/users', methods=['GET'])
@require_admin
def get_admin_users():
    users = admin_rpc('get_admin_users').data
    return jsonify({"users": users or []})

@admin_bp.route('/api/admin/users', methods=['POST'])
@require_admin
def add_admin_user():
    username = request.json.get('username')
    roles = request.json.get('roles', ['admin'])
    result = admin_rpc('add_admin_user_by_username', {'p_username': username, 'p_roles': roles}).data[0]
    return jsonify(result)

@admin_bp.route('/api/admin/users/<uuid:user_id>', methods=['DELETE'])
@require_admin
def remove_admin_user(user_id):
    if str(user_id) == session.get('user', {}).get('id'):
        return jsonify({"error": "Cannot remove self"}), 400
    result = admin_rpc('remove_admin_user', {'p_user_id': str(user_id)}).data[0]
    return jsonify(result)

@admin_bp.route('/api/admin/settings', methods=['GET', 'POST'])
@require_admin
def admin_settings():
    if request.method == 'POST':
        new_settings = request.json
        supabase_admin_client.from_('admin_settings').upsert({'id': 1, 'settings': new_settings}).execute()
        return jsonify({"success": True, "settings": new_settings})

    settings_res = supabase_admin_client.from_('admin_settings').select('settings').eq('id', 1).execute()
    return jsonify(settings_res.data[0].get('settings', {}) if settings_res.data else {})

@admin_bp.route('/api/admin/tables/<string:table_name>')
@require_admin
def get_table_data(table_name):
    limit = int(request.args.get('limit', 25))
    offset = int(request.args.get('offset', 0))
    count_res = supabase_admin_client.from_(table_name).select('id', count='exact').execute()
    data_res = supabase_admin_client.from_(table_name).select('*').order('created_at', desc=True).range(offset, offset + limit - 1).execute()
    return jsonify({"data": data_res.data or [], "totalCount": count_res.count or 0})
