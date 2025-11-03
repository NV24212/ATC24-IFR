import asyncio
import json
import time
from collections import deque
from threading import Thread
import requests
import websockets

from config import Config

flight_plans_cache = deque(maxlen=50)

class CacheManager:
    def __init__(self, ttl):
        self.cache = {}
        self.ttl = ttl

    def get(self, key):
        data = self.cache.get(key)
        if data and (time.time() - data['timestamp'] < self.ttl):
            return data['value']
        return None

    def set(self, key, value):
        self.cache[key] = {'value': value, 'timestamp': time.time()}

class ExternalApiService:
    def __init__(self, timeout=10):
        self.session = requests.Session()
        self.timeout = timeout
        self.controllers_cache = CacheManager(ttl=60)
        self.atis_cache = CacheManager(ttl=30)

    def get_controllers(self):
        cached = self.controllers_cache.get('controllers')
        if cached:
            return cached
        response = self.session.get(Config.DATA_API_CONTROLLERS_URL, timeout=self.timeout)
        response.raise_for_status()
        data = response.json()
        self.controllers_cache.set('controllers', data)
        return data

    def get_atis(self):
        cached = self.atis_cache.get('atis')
        if cached:
            return cached
        response = self.session.get(Config.DATA_API_ATIS_URL, timeout=self.timeout)
        response.raise_for_status()
        data = response.json()
        self.atis_cache.set('atis', data)
        return data

external_api_service = ExternalApiService()

async def flight_plan_websocket_client():
    uri = Config.DATA_API_WSS_URL
    backoff = 1
    while True:
        try:
            async with websockets.connect(uri) as websocket:
                backoff = 1
                while True:
                    message = await websocket.recv()
                    data = json.loads(message)
                    if data.get("t") in ["FLIGHT_PLAN", "EVENT_FLIGHT_PLAN"]:
                        flight_plans_cache.appendleft(data.get("d", {}))
        except Exception:
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 60)

def run_websocket_in_background():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(flight_plan_websocket_client())
