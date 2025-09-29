from flask import Blueprint, jsonify, request, session, current_app
from .database import supabase_admin
from .auth import require_admin_auth

api_bp = Blueprint('api_bp', __name__)

# =============================================================================
# Public Routes
# =============================================================================

@api_bp.route('/api/health')
def health_check():
    return jsonify({"status": "ok"})

# This endpoint is simplified as the complex UI for it was removed.
@api_bp.route('/api/clearance', methods=['POST'])
def generate_clearance():
    data = request.get_json()
    # Basic validation
    if not data or 'callsign' not in data or 'destination' not in data:
        return jsonify({"error": "Missing required fields"}), 400

    # Simplified clearance generation logic
    clearance_text = f"{data['callsign']} cleared to {data['destination']} as filed. Climb and maintain 5000. Squawk 1234."

    # Log the generation to the database
    try:
        if supabase_admin:
            supabase_admin.from_('clearance_generations').insert({
                "callsign": data['callsign'],
                "clearance_text": clearance_text,
                "user_id": session.get('user', {}).get('id') # Optional user tracking
            }).execute()
    except Exception as e:
        current_app.logger.error(f"Failed to log clearance generation: {e}")

    return jsonify({"clearance_text": clearance_text})

# =============================================================================
# Admin Routes (Protected by Password)
# =============================================================================

@api_bp.route('/api/admin/analytics', methods=['GET'])
@require_admin_auth
def get_admin_analytics():
    try:
        total_visits_res = supabase_admin.from_('page_visits').select('id', count='exact').execute()
        total_clearances_res = supabase_admin.from_('clearance_generations').select('id', count='exact').execute()

        return jsonify({
            "totalVisits": total_visits_res.count or 0,
            "clearancesGenerated": total_clearances_res.count or 0,
        })
    except Exception as e:
        current_app.logger.error(f"Failed to fetch admin analytics: {e}", exc_info=True)
        return jsonify({"error": "Failed to fetch analytics"}), 500

@api_bp.route('/api/admin/tables/<table>', methods=['GET'])
@require_admin_auth
def get_table_data(table):
    allowed_tables = ['discord_users', 'clearance_generations', 'page_visits']
    if table not in allowed_tables:
        return jsonify({"error": "Table not found or access denied"}), 404

    try:
        res = supabase_admin.from_(table).select('*').limit(100).order('created_at', desc=True).execute()
        return jsonify(res.data or [])
    except Exception as e:
        current_app.logger.error(f"Failed to fetch table {table}: {e}", exc_info=True)
        return jsonify({"error": f"Failed to fetch data for {table}"}), 500