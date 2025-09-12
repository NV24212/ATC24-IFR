"""Gunicorn configuration file."""

import threading
from app import run_websocket_in_background

# Server socket
bind = "0.0.0.0:5000"
workers = 1

# Logging
loglevel = "debug"
accesslog = "-"
errorlog = "-"

def post_worker_init(worker):
    """
    Called when a worker is initialized.
    This is a good place to start background tasks.
    """
    worker.log.info("Worker initialized (pid: %s)", worker.pid)

    # Start the WebSocket client in a background thread
    try:
        websocket_thread = threading.Thread(target=run_websocket_in_background, daemon=True)
        websocket_thread.start()
        worker.log.info("Successfully started WebSocket client thread.")
    except Exception as e:
        worker.log.error("Failed to start WebSocket client thread: %s", e)
