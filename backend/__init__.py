import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, jsonify, session
from flask_cors import CORS
from whitenoise import WhiteNoise
from werkzeug.middleware.proxy_fix import ProxyFix
import uuid

import threading
from .config import Config
from .database import init_db
from .services import run_websocket_in_background

def create_app(config_class=Config):
    """Create and configure an instance of the Flask application."""
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.config['SESSION_COOKIE_NAME'] = 'session_id'

    # --- Logging ---
    log_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    log_handler = RotatingFileHandler('app_errors.log', maxBytes=1024 * 1024, backupCount=5)
    log_handler.setFormatter(log_formatter)
    log_handler.setLevel(logging.ERROR)
    app.logger.addHandler(log_handler)
    app.logger.setLevel(logging.ERROR)

    # --- Middleware ---
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    CORS(app, supports_credentials=True)
    # WhiteNoise will automatically serve files from the folder set in app.static_folder
    app.wsgi_app = WhiteNoise(app.wsgi_app)

    # --- Session ID Management ---
    @app.before_request
    def ensure_session_id():
        if 'session_id' not in session:
            session['session_id'] = str(uuid.uuid4())

    # --- Database ---
    with app.app_context():
        init_db()

    # --- Blueprints ---
    from .auth import auth_bp
    from .api import api_bp
    from .status import status_bp
    from .admin import admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(status_bp)
    app.register_blueprint(admin_bp)

    # --- Background Services ---
    if app.config.get("ENV") != "development":
        websocket_thread = threading.Thread(target=run_websocket_in_background, daemon=True)
        websocket_thread.start()

    # --- Error Handlers ---
    @app.errorhandler(404)
    def not_found(e):
        return jsonify(error='Not found'), 404

    @app.errorhandler(500)
    def internal_error(e):
        app.logger.error(f"Internal Server Error: {e}", exc_info=True)
        return jsonify(error="Internal server error"), 500

    return app
