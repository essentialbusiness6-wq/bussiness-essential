from flask_socketio import SocketIO
from flask_caching import Cache

socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode="gevent",
    manage_session=True,
    cors_credentials=True
)

cache = Cache()

