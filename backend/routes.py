from flask import Blueprint, jsonify, request,current_app
from backend.utils import token_required,db_cursor,save_log_activity
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

@bp.post("/create-subaccount")
@token_required
def create_subaccount(
    current_user_id,
    current_user_role
):

    try:

        body = (
            request.get_json()
            or {}
        )

        account_number = (
            str(
                body.get(
                    "account_number",
                    ""
                )
            )
            .strip()
        )

        bank_code = (
            body.get(
                "bank_code",
                ""
            )
            .strip()
        )

        percentage_charge = float(
            body.get(
                "percentage_charge",
                5
            )
        )

        business_name = (
            body.get(
                "business_name"
            )
        )

        if (
            len(account_number)
            != 10
        ):

            return jsonify({
                "success": False,
                "message":
                "Invalid account number"
            }), 400


        if not bank_code:

            return jsonify({
                "success": False,
                "message":
                "Bank code required"
            }), 400


        with db_cursor(
            dictionary=True
        ) as (
            conn,
            cursor
        ):

            if not business_name:

                cursor.execute(
                    """
                    SELECT
                        profilename
                    FROM cust_base
                    WHERE user_id=%s
                    LIMIT 1
                    """,
                    (
                        current_user_id,
                    )
                )

                user = (
                    cursor.fetchone()
                )

                business_name = (
                    user[
                        "profilename"
                    ]
                    if user
                    else "Business"
                )


        session = requests.Session()
        session.mount(
            "https://",
            TLSAdapter()
        )

        headers = {

            "Authorization":
            f"Bearer {os.getenv('PAYSTACK_SECRET_KEY')}",

            "Content-Type":
            "application/json"
        }

        # ------------------
        # Resolve account
        # ------------------

        verify = session.get(

            "https://api.paystack.co/bank/resolve",

            headers=headers,

            params={

                "account_number":
                account_number,

                "bank_code":
                bank_code
            },

            timeout=20
        )

        verify.raise_for_status()

        verified = (
            verify.json()
        )

        if not verified.get(
            "status"
        ):

            return jsonify({

                "success": False,

                "message":
                verified.get(
                    "message"
                )
            }), 400


        account = (
            verified[
                "data"
            ]
        )

        account_name = (
            account[
                "account_name"
            ]
        )

        bank_name = (
            body.get(
            "bank_name"
            )
        )

        if not bank_name:

            bank_name = (
                body.get(
                    "bankCodeText",
                    "Unknown Bank"
                )
            )

        # ------------------
        # Create subaccount
        # ------------------

        create = session.post(

            "https://api.paystack.co/subaccount",

            headers=headers,

            json={

                "business_name":
                business_name,

                "settlement_bank":
                bank_code,

                "account_number":
                account_number,

                "percentage_charge":
                percentage_charge
            },

            timeout=20
        )

        create.raise_for_status()

        sub = (
            create.json()
        )

        if not sub.get(
            "status"
        ):

            return jsonify({

                "success": False,

                "message":
                sub.get(
                    "message"
                )
            }), 400


        sub_data = (
            sub[
                "data"
            ]
        )

        # ------------------
        # Save
        # ------------------

        with db_cursor() as (
            conn,
            cursor
        ):

            cursor.execute(
                """
                INSERT INTO
                payment_subaccounts (

                    user_id,

                    business_name,

                    account_name,

                    account_number,

                    bank_code,

                    bank_name,

                    subaccount_code,

                    paystack_subaccount_id,

                    percentage_charge,

                    settlement_bank

                )

                VALUES (

                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s

                )

                ON DUPLICATE KEY UPDATE

                    business_name=
                    VALUES(
                        business_name
                    ),

                    account_name=
                    VALUES(
                        account_name
                    ),

                    account_number=
                    VALUES(
                        account_number
                    ),

                    bank_code=
                    VALUES(
                        bank_code
                    ),

                    bank_name=
                    VALUES(
                        bank_name
                    ),

                    subaccount_code=
                    VALUES(
                        subaccount_code
                    ),

                    paystack_subaccount_id=
                    VALUES(
                        paystack_subaccount_id
                    ),

                    percentage_charge=
                    VALUES(
                        percentage_charge
                    ),

                    settlement_bank=
                    VALUES(
                        settlement_bank
                    ),

                    active=TRUE
                """,

                (

                    current_user_id,

                    business_name,

                    account_name,

                    account_number,

                    bank_code,

                    bank_name,

                    sub_data[
                        "subaccount_code"
                    ],

                    sub_data[
                        "id"
                    ],

                    percentage_charge,

                    bank_name
                )
            )

            conn.commit()

        save_log_activity(
            current_user_id,
            "account",
            "Added account information",
            "Account and subaccount created successfully.",
            0.00,
            "paid"
        )
            

        return jsonify({

            "success": True,

            "message":
            "Subaccount created",

            "data": {

                "account_name":
                account_name,

                "bank_name":
                bank_name,

                "subaccount_code":
                sub_data[
                    "subaccount_code"
                ]
            }

        })

    except Exception as e:

        current_app.logger.exception(
            e
        )

        return jsonify({

            "success": False,

            "message":
            str(e)

        }), 500
        

@bp.post("/verify")
@token_required
def verify_payment(
    current_user_id,
    current_user_role
):

    body = (
        request.get_json()
        or {}
    )

    reference = (
        body.get(
            "reference"
        )
    )

    invoice_id = (
        body.get(
            "invoice_id"
        )
    )
    clientName = (
        body.get(
            "client_name"
        )
    )

    if (
        not reference
        or
        not invoice_id
    ):

        return jsonify({

            "success":
            False,

            "message":
            "Missing payment details"

        }), 400


    try:

        headers = {

            "Authorization":

            f"Bearer "
            f"{os.getenv('PAYSTACK_SECRET_KEY')}"

        }
        session = requests.Session()
        session.mount(
            "https://",
            TLSAdapter()
        )

        response = (
            session .get(

                f"https://api.paystack.co/transaction/verify/{reference}",

                headers=headers,

                timeout=20
            )
        )

        response.raise_for_status()

        result = (
            response.json()
        )

        if (
            not result.get(
                "status"
            )
        ):

            return jsonify({

                "success":
                False,

                "message":
                "Verification failed"

            }), 400


        trx = (
            result["data"]
        )


        if (
            trx["status"]
            !=
            "success"
        ):

            return jsonify({

                "success":
                False,

                "message":
                "Payment not completed"

            }), 400


        with db_cursor(
            dictionary=True
        ) as (
            conn,
            cursor
        ):


            cursor.execute(
                """
                SELECT
                    id,
                    total,
                    status,
                    user_id
                FROM invoices
                WHERE id=%s
                LIMIT 1
                """,
                (
                    invoice_id,
                )
            )

            invoice = (
                cursor.fetchone()
            )

            if (
                not invoice
            ):

                return jsonify({

                    "success":
                    False,

                    "message":
                    "Invoice not found"

                }), 404


            if (
                invoice[
                    "status"
                ]
                ==
                "paid"
            ):

                return jsonify({

                    "success":
                    True,

                    "message":
                    "Invoice already paid"

                })


            expected_amount = (
                float(
                    invoice[
                        "total"
                    ]
                )
            )


            paid_amount = (
                float(
                    trx[
                        "amount"
                    ]
                )
                / 100
            )


            if (
                paid_amount
                <
                expected_amount
            ):

                return jsonify({

                    "success":
                    False,

                    "message":
                    "Incorrect payment amount"

                }), 400


            cursor.execute(
                """
                UPDATE invoices
                SET
                    status='paid',
                    amount_paid=%s,
                    balance=0,
                    paid_at=NOW()
                WHERE id=%s
                """,

                (
                    paid_amount,
                    invoice_id
                )
            )


            cursor.execute(
                """
                INSERT INTO payments(

                    invoice_id,

                    user_id,

                    reference,

                    amount,

                    provider,

                    status

                )

                VALUES(

                    %s,
                    %s,
                    %s,
                    %s,
                    'paystack',
                    'success'

                )
                """,

                (
                    invoice_id,

                    invoice[
                        "user_id"
                    ],

                    reference,

                    paid_amount
                )
            )


            conn.commit()
            save_log_activity(
                current_user_id,
                "payment",
                f"Client `{clientName}` Payment verfied",
                "Payment successfully proccessed.",
                paid_amount,
                "paid"
        )

        return jsonify({

            "success":
            True,

            "message":
            "Payment verified",

            "reference":
            reference,

            "amount":
            paid_amount

        })


    except requests.Timeout:

        return jsonify({

            "success":
            False,

            "message":
            "Verification timeout"

        }), 504


    except Exception as e:

        logger.exception(e)

        return jsonify({

            "success":
            False,

            "message":
            str(e)

        }), 500
