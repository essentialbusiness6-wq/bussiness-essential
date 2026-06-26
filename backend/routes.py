from flask import Blueprint, jsonify, request
import requests
import os
from requests.adapters import HTTPAdapter
from urllib3.poolmanager import PoolManager
import ssl


from backend.service import PaystackService

bp = Blueprint("paystack", __name__)

paystack = PaystackService()


class TLSAdapter(HTTPAdapter):

    def init_poolmanager(
        self,
        connections,
        maxsize,
        block=False,
        **pool_kwargs
    ):

        ctx = ssl.create_default_context()

        ctx.minimum_version = ssl.TLSVersion.TLSv1_2

        self.poolmanager = PoolManager(
            num_pools=connections,
            maxsize=maxsize,
            block=block,
            ssl_context=ctx
        )


@bp.route("/test-paystack")
def test_paystack():
    session = requests.Session()

    session.mount(
                    "https://",
                    TLSAdapter()
        )


    response = session.get(
        "https://api.paystack.co/bank",
        headers={
            "Authorization":
            f"Bearer {os.getenv('PAYSTACK_SECRET_KEY')}"
        },
        timeout=20
    )

    return jsonify(response.json())

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
