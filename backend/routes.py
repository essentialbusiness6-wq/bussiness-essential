from flask import Blueprint, jsonify, request,current_app
from backend.utils import token_required,db_cursor,save_log_activity, send_email
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
            cursor.execute(
                """
                SELECT
                    invoices.id,
                    invoices.client_id,
                    invoices.invoice_date,
                    invoices.due_date,
                    invoices.subtotal,
                    invoices.tax,
                    invoices.amount_paid,
                    invoices.balance,
                    invoices.notes,
                    invoices.total,
                    invoices.status,

                    invoice_items.description,
                    invoice_items.quantity,
                    invoice_items.price,

                    clients.client_name,
                    clients.client_email

                FROM invoices

                LEFT JOIN clients
                    ON invoices.client_id = clients.id

                LEFT JOIN invoice_items
                    ON invoice_items.invoice_id = invoices.id

                WHERE invoices.id=%s
            """,
                (invoice_id,)
            )

            rows = cursor.fetchall()

            if rows:

                first = rows[0]

                client_email = first["client_email"]
                client_name = first["client_name"]

                invoice_id = first["id"]
                invoice_date = first["invoice_date"]
                due_date = first["due_date"]

                subtotal = first["subtotal"]
                tax = first["tax"]
                total = first["total"]

                amount_paid = first["amount_paid"]
                balance = first["balance"]

                status = first["status"]

                notes = first["notes"]

                items = []

            for row in rows:

                if row["description"]:

                    items.append({
                        "description": row["description"],
                        "quantity": row["quantity"],
                        "price": float(
                            row["price"] or 0
                        ),
                        "total": (
                            float(row["price"] or 0)
                                *
                            int(row["quantity"] or 0)
                        )
                    })
                # Generate PDF
                pdf_path = generate_invoice_pdf(
                    invoice_id, client_name, client_email,
                    invoice_date, due_date, status,
                    items, subtotal, tax, total,
                    amount_paid, balance, notes
                )
                pro_invoice_html = """
                
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>

body{
    margin:0;
    padding:0;
    background:#f5f7fb;
    font-family:Inter,Arial,sans-serif;
}

.wrapper{
    max-width:680px;
    margin:40px auto;
    background:#ffffff;
    border-radius:14px;
    overflow:hidden;
    box-shadow:0 10px 35px rgba(0,0,0,.06);
}

.header{
    background:linear-gradient(
        135deg,
        #4361ee,
        #4895ef
    );
    padding:38px;
    text-align:center;
}

.brand{
    color:white;
    font-size:26px;
    font-weight:700;
}

.content{
    padding:42px;
}

.title{
    font-size:28px;
    font-weight:700;
    color:#111827;
    margin-bottom:18px;
}

.text{
    font-size:15px;
    color:#4b5563;
    line-height:1.8;
}

.invoice-card{
    margin-top:28px;
    border:1px solid #e5e7eb;
    border-radius:12px;
    overflow:hidden;
}

.invoice-row{
    display:flex;
    justify-content:space-between;
    padding:14px 18px;
    border-bottom:1px solid #f3f4f6;
}

.invoice-row:last-child{
    border-bottom:none;
}

.label{
    color:#6b7280;
}

.value{
    color:#111827;
    font-weight:600;
}

.items{
    margin-top:26px;
}

.items table{
    width:100%;
    border-collapse:collapse;
}

.items th{
    background:#f9fafb;
    padding:14px;
    text-align:left;
    font-size:13px;
    color:#6b7280;
}

.items td{
    padding:16px 14px;
    border-bottom:1px solid #f3f4f6;
    color:#374151;
}

.summary{
    margin-top:28px;
    padding:22px;
    background:#fafafa;
    border-radius:12px;
}

.summary-row{
    display:flex;
    justify-content:space-between;
    padding:8px 0;
}

.total{
    font-size:20px;
    font-weight:700;
    color:#111827;
}

.status{
    display:inline-block;
    padding:8px 14px;
    border-radius:999px;
    background:#ecfdf3;
    color:#027a48;
    font-size:13px;
    font-weight:700;
}

.note{
    margin-top:28px;
    padding:18px;
    background:#f8fbff;
    border-left:4px solid #4361ee;
    border-radius:8px;
}

.footer{
    padding:30px;
    text-align:center;
    color:#6b7280;
    font-size:13px;
}

</style>

</head>

<body>

<div class="wrapper">

<div class="header">
<div class="brand">
Business Essentia
</div>
</div>

<div class="content">

<div class="title">
Invoice Updated
</div>

<p class="text">
Hello {{client_name}},
</p>

<p class="text">
We’re writing to let you know that your invoice has been updated following recent payment activity.
This email is for your records and reflects the current invoice status and balances.
</p>

<div class="invoice-card">

<div class="invoice-row">
<span class="label">Invoice ID</span>
<span class="value">{{invoice_id}}</span>
</div>

<div class="invoice-row">
<span class="label">Invoice Date</span>
<span class="value">{{invoice_date}}</span>
</div>

<div class="invoice-row">
<span class="label">Due Date</span>
<span class="value">{{due_date}}</span>
</div>

<div class="invoice-row">
<span class="label">Status</span>
<span class="value">
<span class="status">
{{status}}
</span>
</span>
</div>

<div class="invoice-row">
<span class="label">Client Email</span>
<span class="value">
{{client_email}}
</span>
</div>

</div>


<div class="items">

<table>

<thead>
<tr>
<th>Description</th>
<th>Qty</th>
<th>Amount</th>
</tr>
</thead>

<tbody>

{{items}}

</tbody>

</table>

</div>


<div class="summary">

<div class="summary-row">
<span>Subtotal</span>
<span>{{subtotal}}</span>
</div>

<div class="summary-row">
<span>Tax</span>
<span>{{tax}}</span>
</div>

<div class="summary-row">
<span>Total</span>
<span>{{total}}</span>
</div>

<hr>

<div class="summary-row">
<span>Amount Paid</span>
<span>{{amount_paid}}</span>
</div>

<div class="summary-row total">
<span>Balance</span>
<span>{{balance}}</span>
</div>

</div>


{% if notes %}

<div class="note">

<strong>Additional Notes</strong>

<p>
{{notes}}
</p>

</div>

{% endif %}


<p class="text" style="margin-top:28px;">
This email serves as an update only and does not require immediate action unless otherwise communicated.
</p>

<p class="text">
If you have questions regarding this invoice, please contact the invoice sender directly or reach our support team.
</p>

</div>

<div class="footer">

© {{year}} Business Essentia

</div>

</div>

</body>
</html>
"""
                send_email(
                    recipient=client_email,
                    subject= f"Invoice Updated — {invoice_id} Payment Status & Balance Summary",
                    body=pro_invoice_html,
                    html=True,
                    attachments=[pdf_path]
                )
                    
            cursor.execute(
                """SELECT email, username FROM user_base WHERE user_id=%s""",(invoice["user_id"],)
            )
            if cursor.fetchone():
                user_email = cursor.fetchone()['email']
                user_name = cursor.fetchone()['username']
                year = datetime.now().year
                send_email_to_user_for_client_payment_html = """
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
body{
    margin:0;
    padding:0;
    background:#f5f7fb;
    font-family:Inter,Arial,sans-serif;
}

.wrapper{
    max-width:640px;
    margin:40px auto;
    background:#ffffff;
    border-radius:14px;
    overflow:hidden;
    box-shadow:0 10px 35px rgba(0,0,0,.06);
}

.header{
    background:linear-gradient(
        135deg,
        #4361ee,
        #4895ef
    );
    padding:36px;
    text-align:center;
}

.logo{
    color:white;
    font-size:24px;
    font-weight:700;
}

.content{
    padding:40px;
}

.badge{
    display:inline-block;
    padding:8px 14px;
    background:#ecfdf3;
    color:#027a48;
    border-radius:999px;
    font-size:13px;
    font-weight:600;
    margin-bottom:20px;
}

.title{
    font-size:28px;
    color:#111827;
    margin-bottom:18px;
    font-weight:700;
}

.text{
    color:#4b5563;
    line-height:1.8;
    font-size:15px;
}

.payment-box{
    margin:28px 0;
    padding:22px;
    border:1px solid #e5e7eb;
    border-radius:12px;
    background:#fafafa;
}

.payment-label{
    color:#6b7280;
    font-size:13px;
}

.payment-value{
    color:#111827;
    font-size:18px;
    font-weight:700;
    margin-top:6px;
}

.notice{
    margin-top:24px;
    padding:18px;
    border-left:4px solid #4361ee;
    background:#f8fbff;
    color:#374151;
    border-radius:8px;
}

.footer{
    padding:30px;
    text-align:center;
    color:#6b7280;
    font-size:13px;
    border-top:1px solid #f1f1f1;
}

.support{
    color:#4361ee;
    text-decoration:none;
}

</style>
</head>

<body>

<div class="wrapper">

<div class="header">
<div class="logo">
Business Essentia
</div>
</div>

<div class="content">

<div class="badge">
✓ Payment Verified
</div>

<div class="title">
Your client payment has been confirmed
</div>

<p class="text">
Hello {{user_name}},
</p>

<p class="text">
Good news — we’ve successfully verified a payment made by <strong>{{clientName}}</strong>.
</p>

<div class="payment-box">

<div class="payment-label">
Client
</div>

<div class="payment-value">
{{clientName}}
</div>

</div>

<p class="text">
Your payment is now being processed and settlement has been initiated.
</p>

<div class="notice">
Funds are typically processed and made available by the next business day. Processing times may vary slightly depending on banking schedules and settlement timelines.
</div>

<p class="text">
You do not need to take any action at this time. We’ll continue processing and notify you if anything requires your attention.
</p>

<p class="text">
If you need further assistance or have questions regarding this transaction, please contact our support team at:
</p>

<p class="text">
<a
class="support"
href="mailto:support@businessessentia.net">
support@businessessentia.net
</a>
</p>

<p class="text">
Thank you for using Business Essentia.
</p>

</div>

<div class="footer">
© {{year}} Business Essentials Prime • Secure Payment Processing
</div>

</div>

</body>
</html>
"""
                send_email(
                    user_email,
                    "Payment Confirmed — Your Client’s Payment Has Been Verified",
                    send_email_to_user_for_client_payment_html,
                    True
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
