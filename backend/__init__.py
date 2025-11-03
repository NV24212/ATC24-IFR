import uuid
import threading
from flask import Flask, session, request
from flask_cors import CORS
from whitenoise import WhiteNoise
from werkzeug.middleware.proxy_fix import ProxyFix

from .config import Config
from .database import init_db, add_page_visit_to_batch
from .services import run_websocket_in_background

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    CORS(app, supports_credentials=True)
    app.wsgi_app = WhiteNoise(app.wsgi_app, root='static/')

    @app.before_request
    def before_request_tasks():
        if 'session_id' not in session:
            session['session_id'] = str(uuid.uuid4())

        if request.endpoint and 'static' not in request.endpoint:
            visit_data = {
                "page_path": request.path,
                "user_agent": request.user_agent.string,
                "referrer": request.referrer,
                "session_id": session.get('session_id'),
                "user_id": session.get('user', {}).get('id'),
                "discord_username": session.get('user', {}).get('username')
            }
            add_page_visit_to_batch(visit_data)

    with app.app_context():
        init_db()

    from .routes.auth import auth_bp
    from .routes.public import public_bp
    from .routes.admin import admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(public_bp)
    app.register_blueprint(admin_bp)

    if app.config.get("ENV") != "development":
        thread = threading.Thread(target=run_websocket_in_background, daemon=True)
        thread.start()

    return app
