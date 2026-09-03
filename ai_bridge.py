"""
ai_bridge.py

Bridges your Flask-SocketIO app to the separately-deployed AI Engine
service. Mints short-lived JWTs signed with the SAME secret the AI Engine
verifies against (AI_ENGINE_JWT_SECRET must match on both Render services),
and handles the confirm-then-execute flow for write actions (e.g. creating
an invoice) so a plain "yes" typed in chat gets turned back into a real
confirmed API call.
"""
import os
import time
import threading

import jwt
import requests
from dotenv import load_dotenv

load_dotenv()



AI_ENGINE_URL = os.getenv("AI_ENGINE_URL").rstrip("/")
AI_ENGINE_JWT_SECRET = os.getenv("AI_ENGINE_JWT_SECRET")

AFFIRMATIVE_WORDS = {"yes", "yeah", "yep", "y", "confirm", "correct", "ok", "okay", "do it", "go ahead", "sure"}

# room_id -> original text awaiting confirmation. Swap for Redis
# (SETEX with a TTL) if you run more than one Flask worker/process --
# this dict is per-process and won't be shared across gunicorn workers.
_pending_confirmations: dict[str, str] = {}
_lock = threading.Lock()


def _mint_ai_token(user_id: str, permissions: list[str], tenant_id: str | None = None) -> str:
    payload = {
        "sub": str(user_id),
        "tenant_id": tenant_id,
        "permissions": permissions,
        "roles": [],
        "iat": int(time.time()),
        "exp": int(time.time()) + 300,  # short-lived; minted fresh per call
    }
    return jwt.encode(payload, AI_ENGINE_JWT_SECRET, algorithm="HS256")


def ask_ai_engine(room_id: str, text: str, user_id: str, permissions: list[str]) -> dict:
    """
    Sends one chat turn to the AI Engine's /v1/interpret endpoint.
    Returns the parsed JSON response: {status, message, data, tool_name, ...}
    Raises requests.RequestException on network/HTTP failure -- callers
    should catch this and show a friendly fallback message.
    """
    confirmed = False
    with _lock:
        if room_id in _pending_confirmations and text.strip().lower() in AFFIRMATIVE_WORDS:
            text = _pending_confirmations.pop(room_id)
            confirmed = True

    token = _mint_ai_token(user_id, permissions)
    resp = requests.post(
        f"{AI_ENGINE_URL}/v1/interpret",
        json={"conversation_id": room_id, "text": text, "confirmed": confirmed},
        headers={"Authorization": f"Bearer {token}"},
        timeout=20,
    )
    resp.raise_for_status()
    result = resp.json()

    with _lock:
        if result.get("status") == "pending_confirmation":
            _pending_confirmations[room_id] = text
        else:
            _pending_confirmations.pop(room_id, None)

    return result


def issue_frontend_ai_token(user_id: str, permissions: list[str], tenant_id: str | None = None) -> str:
    """
    Used by the /api/ai-token Flask endpoint below, for screens that call
    the AI Engine DIRECTLY from the RN app (bypassing the socket/chat
    flow) -- e.g. a "Create Invoice" button that isn't part of the chat
    widget. Kept as a separate function name for clarity even though it
    does the same thing as _mint_ai_token.
    """
    return _mint_ai_token(user_id, permissions, tenant_id)
