import time
from datetime import datetime, timezone
from flask import Blueprint, session, redirect, request, jsonify, current_app
from requests_oauthlib import OAuth2Session
from postgrest import APIError

from .config import Config
from .database import supabase_admin, track_page_visit

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/auth/discord')
def discord_login():
    if not all([Config.DISCORD_CLIENT_ID, Config.DISCORD_CLIENT_SECRET]):
        return jsonify({"error": "Discord OAuth not configured"}), 500

    scope = ['identify']
    discord_session = OAuth2Session(Config.DISCORD_CLIENT_ID, redirect_uri=Config.DISCORD_REDIRECT_URI, scope=scope)
    authorization_url, state = discord_session.authorization_url(Config.DISCORD_AUTH_BASE_URL)
    session['oauth2_state'] = state
    session['auth_origin'] = request.args.get('origin', Config.FRONTEND_URL)
    return redirect(authorization_url)

@auth_bp.route('/auth/discord/callback')
def discord_callback():
    auth_origin = session.pop('auth_origin', Config.FRONTEND_URL)

    if request.values.get('error'):
        return redirect(f"{auth_origin}/?error={request.values['error']}")

    discord_session = OAuth2Session(Config.DISCORD_CLIENT_ID, state=session.get('oauth2_state'), redirect_uri=Config.DISCORD_REDIRECT_URI)

    try:
        token = discord_session.fetch_token(Config.DISCORD_TOKEN_URL, client_secret=Config.DISCORD_CLIENT_SECRET, authorization_response=request.url)
        user_json = discord_session.get(Config.DISCORD_API_BASE_URL + '/users/@me').json()
    except Exception as e:
        current_app.logger.error(f"Discord OAuth token fetch/user fetch error: {e}", exc_info=True)
        return redirect(f"{auth_origin}/?error=discord_auth_failed")

    if not supabase_admin:
        current_app.logger.error("Supabase admin client not available for user upsert.")
        return redirect(f"{auth_origin}/?error=admin_not_configured")

    try:
        avatar_url = f"https://cdn.discordapp.com/avatars/{user_json['id']}/{user_json['avatar']}.png" if user_json.get('avatar') else None

        # Call the correct RPC function to handle pending admin users and user updates
        response = supabase_admin.rpc('update_user_from_discord_login', {
            'p_discord_id': user_json['id'],
            'p_username': user_json['username'],
            'p_email': user_json.get('email'),
            'p_avatar': avatar_url,
            'p_vatsim_cid': None
        }).execute()

        db_user = response.data[0]
        if not db_user:
            raise Exception("Failed to retrieve user from DB after upsert via RPC.")

        session['user'] = {
            'id': db_user['id'],
            'discord_id': db_user['discord_id'],
            'username': db_user['username'],
            'avatar': db_user['avatar'],
            'is_admin': db_user.get('is_admin', False),
            'roles': db_user.get('roles', [])
        }
    except APIError as e:
        current_app.logger.error(f"Supabase API Error: {e.message}", exc_info=True)
        return redirect(f"{auth_origin}/?error=db_error")
    except Exception as e:
        current_app.logger.error(f"Supabase user upsert error: {e}", exc_info=True)
        return redirect(f"{auth_origin}/?error=db_error")

    return redirect(f"{auth_origin}/?auth=success")

@auth_bp.route('/api/auth/user')
def get_current_user():
    # This endpoint is hit on every page load by the frontend
    track_page_visit(session, request)
    return jsonify({"authenticated": 'user' in session, "user": session.get('user')})

@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    session.clear()
    return jsonify({"success": True, "message": "Logged out"})
