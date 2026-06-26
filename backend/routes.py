from flask import Blueprint, jsonify, request
import requests
import os
from requests.adapters import HTTPAdapter
from urllib3.poolmanager import PoolManager
import ssl
import logging

logger = logging.getLogger(__name__)


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

    try:
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
            params={
                "country": "nigeria",
                "perPage": 500
            },
            timeout=20
        )

        response.raise_for_status()

        result = response.json()

        if not result.get("status"):

            return jsonify({
                "success": False,
                "message": result.get(
                    "message",
                    "Unable to fetch banks"
                )
            }), 400

        banks = sorted(
            result.get("data", []),
            key=lambda x: x["name"]
        )

        return jsonify({
            "success": True,
            "data": banks
        })

    except requests.Timeout:

        return jsonify({
            "success": False,
            "message":
            "Request timed out"
        }), 504

    except requests.RequestException as e:

        logger.exception(e)

        return jsonify({
            "success": False,
            "message":
            str(e)
        }), 500

    except Exception as e:

        logger.exception(e)

        return jsonify({
            "success": False,
            "message":
            "Unexpected error"
        }), 500


@bp.post("/resolve-account")
def resolve_account():

    try:

        body = request.get_json()

        if not body:
            return jsonify({
                "success": False,
                "message": "Invalid JSON"
            }), 400

        account_number = (
            body.get(
                "account_number",
                ""
            ).strip()
        )

        bank_code = (
            body.get(
                "bank_code",
                ""
            ).strip()
        )

        if not account_number:
            return jsonify({
                "success": False,
                "message":
                "Account number required"
            }), 400

        if not bank_code:
            return jsonify({
                "success": False,
                "message":
                "Bank code required"
            }), 400

        session = requests.Session()

        session.mount(
            "https://",
            TLSAdapter()
        )

        response = session.get(
            "https://api.paystack.co/bank/resolve",
            headers={
                "Authorization":
                f"Bearer {os.getenv('PAYSTACK_SECRET_KEY')}"
            },
            params={
                "account_number":
                account_number,

                "bank_code":
                bank_code
            },
            timeout=20
        )

        response.raise_for_status()

        result = response.json()

        if not result.get("status"):

            return jsonify({
                "success": False,
                "message":
                result.get(
                    "message",
                    "Unable to resolve account"
                )
            }), 400

        return jsonify({
            "success": True,
            "data":
            result["data"]
        })

    except requests.Timeout:

        return jsonify({
            "success": False,
            "message":
            "Request timed out"
        }), 504

    except Exception as e:

        logger.exception(e)

        return jsonify({
            "success": False,
            "message":
            str(e)
        }), 500
