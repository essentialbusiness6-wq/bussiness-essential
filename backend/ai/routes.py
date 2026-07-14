from flask import request

from flask import jsonify

from . import bp

from .service import ask_ai


@bp.post("/chat")
def chat():

    body = request.get_json()

    message = body.get(
        "message",
        ""
    )

    conversation = body.get(
        "conversation",
        []
    )

    context = body.get(
        "context",
        {}
    )

    response = ask_ai(

        message,

        conversation,

        context

    )

    return jsonify(

        response.model_dump()

    )
