from flask import Blueprint, session, redirect, request, jsonify
from requests_oauthlib import OAuth2Session
from ..config import Config
from ..database import admin_rpc

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/auth/discord')
def discord_login():
    discord = OAuth2Session(Config.DISCORD_CLIENT_ID, redirect_uri=Config.DISCORD_REDIRECT_URI, scope=['identify', 'email'])
    auth_url, state = discord.authorization_url(Config.DISCORD_AUTH_BASE_URL)
    session['oauth2_state'] = state
    session['auth_origin'] = request.args.get('origin', Config.FRONTEND_URL)
    return redirect(auth_url)

@auth_bp.route('/auth/discord/callback')
def discord_callback():
    origin = session.pop('auth_origin', Config.FRONTEND_URL)
    discord = OAuth2Session(Config.DISCORD_CLIENT_ID, state=session['oauth2_state'], redirect_uri=Config.DISCORD_REDIRECT_URI)
    token = discord.fetch_token(Config.DISCORD_TOKEN_URL, client_secret=Config.DISCORD_CLIENT_SECRET, authorization_response=request.url)
    user_info = discord.get(f'{Config.DISCORD_API_BASE_URL}/users/@me').json()

    avatar_url = f"https://cdn.discordapp.com/avatars/{user_info['id']}/{user_info['avatar']}.png" if user_info.get('avatar') else None

    db_user_res = admin_rpc('update_user_from_discord_login', {
        'in_discord_id': user_info['id'],
        'in_username': user_info['username'],
        'in_email': user_info.get('email'),
        'in_avatar': avatar_url,
    })
    db_user = db_user_res.data[0]

    session['user'] = {
        'id': db_user['id'],
        'discord_id': db_user['discord_id'],
        'username': db_user['username'],
        'avatar': db_user['avatar'],
        'is_admin': db_user.get('is_admin', False),
    }
    session.permanent = True
    return redirect(f"{origin}/?auth=success")

@auth_bp.route('/api/auth/user')
def get_current_user():
    return jsonify({"authenticated": 'user' in session, "user": session.get('user')})

@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True})
