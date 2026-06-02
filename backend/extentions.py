from flask_socketio import SocketIO
from flask_caching import Cache

socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode="gevent",
    manage_session=True,
    cors_credentials=True
)



cache = Cache(
    config={
        "CACHE_TYPE": "SimpleCache",
        "CACHE_DEFAULT_TIMEOUT": 60
    }
)
