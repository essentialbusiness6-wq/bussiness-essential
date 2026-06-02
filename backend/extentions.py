from flask_socketio import SocketIO
from flask_caching import Cache
from 

socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode="gevent",
    manage_session=True,
    cors_credentials=True
)



cache = Cache(
    config={
        "CACHE_TYPE": "RedisCache",
        "CACHE_REDIS_URL": os.getenv("REDIS_URL"),
        "CACHE_DEFAULT_TIMEOUT": 60
    }
)
