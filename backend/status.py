import time
from collections import deque
from flask import Blueprint, jsonify, render_template, current_app
import requests

from .services import flight_plans_cache

status_bp = Blueprint('status_bp', __name__)

@status_bp.route('/')
def status_page():
    return render_template('status.html')

@status_bp.route('/api/full-status')
def get_full_status():
    external_services = get_external_service_status()
    internal_routes = get_internal_routes()
    error_log = get_error_log()

    data_status = 'operational'
    if any(s['status'] != 'Online (Receiving Data)' and s['status'] != 'Online' for s in external_services.values()):
        data_status = 'degraded'
    if all(s['status'] == 'Offline' for s in external_services.values()):
        data_status = 'outage'

    api_status = 'operational'
    error_status = 'operational'
    if error_log:
        error_status = 'degraded'

    response = {
        "24data_connectivity": {
            "status": data_status,
            "endpoints": [{"name": name, "status": "operational" if "Online" in details["status"] else "outage", "message": details["status"]} for name, details in external_services.items()]
        },
        "24ifr_api": {
            "status": api_status,
            "endpoints": [{"name": route["endpoint"], "path": route["path"], "methods": route["methods"], "status": "operational"} for route in internal_routes]
        },
        "errors": {
            "status": error_status,
            "count": len(error_log),
            "logs": list(error_log)
        }
    }
    return jsonify(response)

def get_external_service_status():
    from .config import Config
    services = {
        "24DATA_Controllers": {"url": Config.DATA_API_CONTROLLERS_URL, "status": "Offline"},
        "24DATA_ATIS": {"url": Config.DATA_API_ATIS_URL, "status": "Offline"},
        "24DATA_WebSocket": {"url": Config.DATA_API_WSS_URL, "status": "Offline"}
    }
    try:
        response = requests.head(services["24DATA_Controllers"]["url"], timeout=5)
        if response.status_code == 200:
            services["24DATA_Controllers"]["status"] = "Online"
    except requests.RequestException:
        pass
    try:
        response = requests.head(services["24DATA_ATIS"]["url"], timeout=5)
        if response.status_code == 200:
            services["24DATA_ATIS"]["status"] = "Online"
    except requests.RequestException:
        pass

    if flight_plans_cache and (time.time() - flight_plans_cache[0]['timestamp']) < 300:
        services["24DATA_WebSocket"]["status"] = "Online (Receiving Data)"

    return services

def get_internal_routes():
    routes = []
    # Use current_app context to inspect routes
    for rule in current_app.url_map.iter_rules():
        if "static" not in rule.endpoint:
            methods = ','.join(sorted([m for m in rule.methods if m not in ["HEAD", "OPTIONS"]]))
            routes.append({"endpoint": rule.endpoint, "methods": methods, "path": str(rule)})
    return routes

def get_error_log():
    try:
        with open('app_errors.log', 'r') as f:
            return deque(f, 25)
    except FileNotFoundError:
        return []
    except Exception as e:
        print(f"Error reading error log: {e}")
        return ["Could not read error log file."]
