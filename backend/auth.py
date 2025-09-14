import time
from datetime import datetime, timezone
from flask import Blueprint, session, redirect, request, jsonify, current_app
from requests_oauthlib import OAuth2Session

from .config import Config
from .database import supabase_admin

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/auth/discord')
def discord_login():
    if not all([Config.DISCORD_CLIENT_ID, Config.DISCORD_CLIENT_SECRET]):
        return jsonify({"error": "Discord OAuth not configured"}), 500

    scope = ['identify', 'email']
    discord_session = OAuth2Session(Config.DISCORD_CLIENT_ID, redirect_uri=Config.DISCORD_REDIRECT_URI, scope=scope)
    authorization_url, state = discord_session.authorization_url(Config.DISCORD_AUTH_BASE_URL)
    session['oauth2_state'] = state
    return redirect(authorization_url)

@auth_bp.route('/auth/discord/callback')
def discord_callback():
    if request.values.get('error'):
        return redirect(f"{Config.FRONTEND_URL}/?error={request.values['error']}")

    discord_session = OAuth2Session(Config.DISCORD_CLIENT_ID, state=session.get('oauth2_state'), redirect_uri=Config.DISCORD_REDIRECT_URI)

    try:
        token = discord_session.fetch_token(Config.DISCORD_TOKEN_URL, client_secret=Config.DISCORD_CLIENT_SECRET, authorization_response=request.url)
        user_json = discord_session.get(Config.DISCORD_API_BASE_URL + '/users/@me').json()
    except Exception as e:
        current_app.logger.error(f"Discord OAuth token fetch/user fetch error: {e}", exc_info=True)
        return redirect(f"{Config.FRONTEND_URL}/?error=discord_auth_failed")

    if not supabase_admin:
        current_app.logger.error("Supabase admin client not available for user upsert.")
        return redirect(f"{Config.FRONTEND_URL}/?error=admin_not_configured")

    try:
        expires_at = datetime.fromtimestamp(int(time.time() + token['expires_in']), tz=timezone.utc)

        user_data = {
            'discord_id': user_json['id'],
            'username': user_json['username'],
            'discriminator': user_json.get('discriminator'),
            'email': user_json.get('email'),
            'avatar': f"https://cdn.discordapp.com/avatars/{user_json['id']}/{user_json['avatar']}.png" if user_json.get('avatar') else None,
            'access_token': token['access_token'],
            'refresh_token': token.get('refresh_token'),
            'token_expires_at': expires_at.isoformat(),
            'last_login': datetime.now(timezone.utc).isoformat()
        }

        supabase_admin.table('discord_users').upsert(user_data, on_conflict='discord_id').execute()

        db_user = supabase_admin.table('discord_users').select('*').eq('discord_id', user_json['id']).single().execute().data
        if not db_user:
            raise Exception("Failed to retrieve user from DB after upsert.")

        # Check if the user is a super admin
        is_super_admin = (db_user['discord_id'] == Config.SUPER_ADMIN_DISCORD_ID or
                          db_user['username'] == Config.SUPER_ADMIN_USERNAME)

        db_user['is_admin'] = db_user.get('is_admin', False) or is_super_admin

        session['user'] = {
            'id': db_user['id'], 'discord_id': db_user['discord_id'],
            'username': db_user['username'], 'avatar': db_user['avatar'],
            'is_admin': db_user['is_admin'],
            'roles': db_user.get('roles', [])
        }
    except Exception as e:
        current_app.logger.error(f"Supabase user upsert error: {e}", exc_info=True)
        return redirect(f"{Config.FRONTEND_URL}/?error=db_error")

    return redirect(f"{Config.FRONTEND_URL}/?auth=success")

@auth_bp.route('/api/auth/user')
def get_current_user():
    return jsonify({"authenticated": 'user' in session, "user": session.get('user')})

@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    session.clear()
    return jsonify({"success": True, "message": "Logged out"})
