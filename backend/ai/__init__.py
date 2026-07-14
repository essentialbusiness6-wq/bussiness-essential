from flask import Blueprint

bp = Blueprint(
    "ai",
    __name__,
    url_prefix="/api/ai"
)

from . import routes
