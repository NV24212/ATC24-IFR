"""Gunicorn configuration file."""

import os

# Server socket
bind = "0.0.0.0:5000"
workers = int(os.environ.get('GUNICORN_WORKERS', 1))

# Logging
loglevel = os.environ.get('GUNICORN_LOGLEVEL', 'info')
accesslog = "-"
errorlog = "-"

def post_worker_init(worker):
    """
    Called when a worker is initialized.
    """
    worker.log.info("Worker initialized (pid: %s)", worker.pid)