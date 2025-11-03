import os
import multiprocessing

bind = "0.0.0.0:5000"
workers = multiprocessing.cpu_count() * 2 + 1
loglevel = os.environ.get('GUNICORN_LOGLEVEL', 'info')
accesslog = "-"
errorlog = "-"
pythonpath = "/app/backend"
