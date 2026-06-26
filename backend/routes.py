from flask import Blueprint, jsonify, request

from backend.services import PaystackService

bp = Blueprint("paystack", __name__)

paystack = PaystackService()


@bp.get("/banks")
def banks():

    result = paystack.get_banks()

    if not result["success"]:
        return jsonify(result), 400

    return jsonify(result)


@bp.post("/resolve-account")
def resolve_account():

    body = request.get_json()

    result = paystack.resolve_account(
        account_number=body["account_number"],
        bank_code=body["bank_code"]
    )

    if not result["success"]:
        return jsonify(result), 400

    return jsonify(result)
