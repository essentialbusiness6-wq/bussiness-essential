from flask import request, jsonify

from . import bp
from .service import ask_ai


@bp.post("/chat")
def chat():

    body = request.get_json(silent=True) or {}

    prompt = body.get("message", "").strip()
    history = body.get("conversation", [])
    context = body.get("context", {})
    tools = body.get("tools", [])

    if not prompt:
        return jsonify({
            "success": False,
            "message": "Message is required."
        }), 400

    result = ask_ai(
        prompt=prompt,
        history=history,
        tools=tools
    )

    if not result["success"]:
        return jsonify(result), 500

    return jsonify({
        "success": True,
        "message": result["response"].choices[0].message.content
    })
