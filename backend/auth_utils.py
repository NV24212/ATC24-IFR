from functools import wraps
from flask import session, jsonify
from .database import supabase_admin

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function

def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({"error": "Authentication required"}), 401
        if not session['user'].get('is_admin'):
            return jsonify({"error": "Admin access required"}), 403
        if not supabase_admin:
            return jsonify({"error": "Admin backend not configured"}), 500
        return f(*args, **kwargs)
    return decorated_function
