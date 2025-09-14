import asyncio
import json
import threading
import time
from collections import deque

import requests
import websockets
from flask import current_app

from .config import Config

# --- In-memory Cache ---
MAX_FLIGHT_PLANS = 50
flight_plans_cache = deque(maxlen=MAX_FLIGHT_PLANS)

# --- External API Service ---
class ExternalApiService:
    def __init__(self):
        self.session = requests.Session()

    def get_controllers(self):
        try:
            response = self.session.get(Config.DATA_API_CONTROLLERS_URL, timeout=15)
            response.raise_for_status()
            return {"data": response.json(), "lastUpdated": time.time(), "source": "live"}
        except requests.exceptions.RequestException as e:
            current_app.logger.error(f"Failed to fetch controllers: {e}", exc_info=True)
            raise

    def get_atis(self):
        try:
            response = self.session.get(Config.DATA_API_ATIS_URL, timeout=15)
            response.raise_for_status()
            return {"data": response.json(), "lastUpdated": time.time(), "source": "live"}
        except requests.exceptions.RequestException as e:
            current_app.logger.error(f"Failed to fetch ATIS data: {e}", exc_info=True)
            raise

external_api_service = ExternalApiService()

# --- WebSocket Service ---
async def flight_plan_websocket_client():
    """Connects to the flight plan WebSocket and populates the cache."""
    uri = Config.DATA_API_WSS_URL
    while True:
        try:
            async with websockets.connect(uri, origin="") as websocket:
                print("WebSocket connected successfully.")
                while True:
                    message = await websocket.recv()
                    data = json.loads(message)
                    if data.get("t") in ["FLIGHT_PLAN", "EVENT_FLIGHT_PLAN"]:
                        flight_plan = data.get("d", {})
                        if flight_plan:
                            flight_plan["timestamp"] = time.time()
                            flight_plan["source"] = data.get("t")
                            flight_plans_cache.appendleft(flight_plan)
        except Exception as e:
            # Use print here as we are outside the Flask app context
            print(f"WebSocket error: {e}. Reconnecting in 5 seconds...")
        await asyncio.sleep(5)

def run_websocket_in_background():
    """Runs the WebSocket client in a separate thread."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(flight_plan_websocket_client())
