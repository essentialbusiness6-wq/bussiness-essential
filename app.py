import traceback
import hmac
from flask import (
    Flask, request, jsonify, make_response, render_template,session,redirect, Blueprint,send_from_directory
)
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
import time
from apscheduler.schedulers.background import BackgroundScheduler
from backend.extentions import socketio, cache
from backend.socket_events import register_socket_events
from werkzeug import Client
from backend.utils import (
    send_email,
    save_security_activity,
    get_user_id,
    get_client_ip,
    get_location_from_ip,
    parse_user_agent,
    get_location,
    log_session,
    get_db,
    token_required,
    generate_invoice_number,
    generate_reference,
    send_basic_plan_invoice_email,
    send_pro_plan_invoice_email,
    save_log_activity,
    update_session_activity,
    parse_user_agent1,
    get_user_from_token_cookie,
    send_notification,
    db_cursor
)
from backend.admin import admin_bp
import hashlib
from datetime import datetime,timedelta
import secrets
import requests
import os
import cloudinary
import cloudinary.uploader
import cloudinary.api
import jwt
from dotenv import load_dotenv
from collections import defaultdict
import pyotp
import qrcode
import io
import base64
import requests as http_requests


load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
PAYSTACK_PUBLIC=os.getenv("PAYSTACK_PUBLIC_KEY")
PAYSTACK_SECRET=os.getenv("PAYSTACK_SECRET_KEY")
app = Flask(__name__)
app.register_blueprint(admin_bp)
app.secret_key = os.getenv("SECRET_KEY")


CORS(app, supports_credentials=True)

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax"
)




@app.before_request
def refresh_activity():
    token = session.get("session_token")

    if token:
        update_session_activity(token)

cloudinary.config(
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key =  os.getenv("CLOUDINARY_API_KEY"),
    api_secret = os.getenv("CLOUDINARY_API_SECRET")
)

cache.init_app(app)
socketio.init_app(app)

@app.route("/test-notification")
def test_notification():

    send_notification(
        user_id=1,
        type_="payment",
        title="Payment Received",
        description="Invoice #INV-001 was paid",
        amount=500,
        status="paid"
    )

    return "Notification sent"

register_socket_events(socketio)

@socketio.on("connect")
def handle_connect():

    auth_data = get_user_from_token_cookie(request)

    if not auth_data["success"]:
        return False
     
        
     
    current_user_id = auth_data["user_id"]
    current_user_role = auth_data["role"]

    if not current_user_id:
        return False

    join_room(f"user_{current_user_id}")

    print(f"User {current_user_id} connected")




APP_LOGO_URL = "https://res.cloudinary.com/dkb987i8w/image/upload/v1772108684/app_logo_ky1yis.png"
DASHBOARD_URL ='https:/businessessentia.net/dashboard'
SECURITY_URL= 'https:/businessessentia.net/dashboard'
SECRET_KEY = os.getenv("SECRET_KEY")


# ==========================
# PAGE ROUTES
# ==========================
@app.route("/ping")
def ping():
    return "ok"

@app.route("/robots.txt")
def robots():
    return send_from_directory('static','robots.txt')

@app.route("/sitemap.xml")
def sitemap():
    return send_from_directory('static','sitemap.xml')

@app.route("/test-email")
def test_email():
    emails = ["budom7774@gmail.com","huntclara.56@gmail.com","Lawal22413@gmail.com","leanerbeamllc26@gmail.com","test-hbaxiezfa@srv1.mail-tester.com"]
    for email in emails:
        send_email(
            email,
            "Business Essential - Email Testing",
            "Welcome. Testing yor email"
        )

    return "Email Sent"

@app.route("/")
def home():

    with db_cursor(dictionary=True) as (_, cursor):

        cursor.execute(
            """
            SELECT COUNT(*) AS total_user
            FROM user_base
            WHERE account_status = %s
            """,
            ("active",)
        )

        total_users = cursor.fetchone()["total_user"]

    return render_template(
        "index.html",
        totalUsers=total_users
    )

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/contact")
def contact():
    return render_template("contact.html")

@app.route("/blog")
def blog():
    return render_template("blog.html")
    
@app.route("/features")
def features():
    return render_template("features.html")
    
@app.route("/privacy-policy")
def privacy_policy():
    return render_template("privacy-policy.html")


@app.route("/entry")
def entry():
    return render_template("users/index.html")


@app.route("/register")
def register_page():
    return render_template("users/auth/register.html")


@app.route("/login")
def login_page():
    return render_template("users/auth/login.html")

@app.after_request
def add_no_cache_headers(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response



@app.route("/dashboard")
def dashboard():
    return render_template("users/dashboard.html")

@app.route("/dashboard/create-invoice")
@token_required
def create_invoice_page(current_user_id,current_user_role):
    with db_cursor(dictionary=True) as (_, cursor):

        cursor.execute(
            """
            SELECT currency_symbol, theme
            FROM user_settings
            WHERE user_id=%s
            """,
            (current_user_id,)
        )
        settings = cursor.fetchone()
        currencySymbol = settings['currency_symbol'] if settings else "$"
        theme = settings['theme'] if settings else 'light'

    return render_template("users/create-invoice.html",currencySymbol=currencySymbol, theme=theme)

@app.route("/invoice/edit/<int:invoiceId>")
@token_required
def edit_invoice_page(current_user_id,current_user_role,invoiceId):
    with db_cursor(dictionary=True) as (_, cursor):

        cursor.execute(
            "SELECT role FROM user_base WHERE user_id=%s",
            (current_user_id,)
        )

        user = cursor.fetchone()

        if not user:
            return jsonify({
            "status": "error",
            "message": "User not found"
        }), 401

        cursor.execute(
            """
            SELECT 
                invoices.id,
                invoices.client_id,
                invoices.invoice_number,
                invoices.invoice_date,
                invoices.due_date,
                invoices.total AS amount,
                invoices.status,
                invoices.subtotal,
                invoices.tax,
                invoices.amount_paid,
                invoices.balance,
                invoices.note,
                clients.client_name AS clientName,
                clients.client_email AS clientEmail
            FROM invoices
            JOIN clients ON clients.id = invoices.client_id
            WHERE invoices.user_id=%s AND invoices.id=%s
            """,
            (current_user_id,invoiceId)
        )
        invoice = cursor.fetchone()
        if not invoice:
            return jsonify({
                "status": "error",
                "message": "Invoice not found"
            }), 404
    
        cursor.execute("""
            SELECT description, quantity, price
            FROM invoice_items
            WHERE invoice_id=%s
        """, (invoiceId,))
        items = cursor.fetchall()
        items_list = [{"desc": i['description'], "qty": i['quantity'], "price": i['price']} for i in items]
        cursor.execute(
            """
            SELECT currency_symbol, theme
            FROM user_settings
            WHERE user_id=%s
            """,
            (current_user_id,)
        )
        settings = cursor.fetchone()
        theme = settings['theme'] if settings else "light"

    return render_template(
        "users/edit-invoice.html", 
        invoiceId=invoiceId,
        invoiceNumber= invoice['invoice_number'],
        invoiceDate= invoice['invoice_date'].strftime("%Y-%m-%d"),
        dueDate= invoice['due_date'].strftime("%Y-%m-%d"),
        amount= float(invoice['amount']),
        status= invoice['status'],
        note= invoice['note'],
        subtotal= float(invoice['subtotal']),
        tax= float(invoice['tax']),
        amountPaid= float(invoice['amount_paid']),
        balance= float(invoice['balance']),
        clientId= invoice['client_id'],
        clientName=invoice['clientName'],
        clientEmail=invoice['clientEmail'],
        items=items_list,
        theme=theme
    )

@app.route("/dashboard/view-invoices/full/<int:invoiceId>")
@token_required
def view_invoices_page(current_user_id,current_user_role,invoiceId):
    with db_cursor(dictionary=True) as (_, cursor):

        cursor.execute(
            "SELECT role FROM user_base WHERE user_id=%s",
            (current_user_id,)
        )

        user = cursor.fetchone()

        if not user:
            return jsonify({
            "status": "error",
            "message": "User not found"
        }), 401

        cursor.execute(
            """
            SELECT 
                invoices.id,
                invoices.client_id,
                invoices.invoice_number,
                invoices.invoice_date,
                invoices.due_date,
                invoices.total AS amount,
                invoices.status,
                invoices.subtotal,
                invoices.tax,
                invoices.amount_paid,
                invoices.balance,
                invoices.note
            FROM invoices
            WHERE invoices.user_id=%s AND invoices.id=%s
            """,
            (current_user_id,invoiceId)
        )

        invoice = cursor.fetchone()
        if not invoice:
            return jsonify({
                "status": "error",
                "message": "Invoice not found"
            }), 404
    
        cursor.execute("""
            SELECT description, quantity, price
            FROM invoice_items
            WHERE invoice_id=%s
        """, (invoiceId,))
        items = cursor.fetchall()
        items_list = [{"desc": i['description'], "qty": i['quantity'], "price": i['price'], "total": i['quantity'] * i['price']} for i in items]

        cursor.execute(
            """
            SELECT client_name, client_email, client_address
            FROM clients
            WHERE user_id=%s AND id=%s
            """,
            (current_user_id, invoice['client_id'])
        )
        client = cursor.fetchone()
        if not client:
            return jsonify({"error": "Client not found"}), 404
    
        cursor.execute(
            """
            SELECT currency, currency_symbol, theme
            FROM user_settings
            WHERE user_id=%s
            """,
            (current_user_id,)
        )
        settings = cursor.fetchone()
        if not settings:
            return jsonify({"error": "Settings not found"}), 404

        cursor.execute(
            """
            SELECT profilename, address, alternateemail, phone, website
            FROM cust_base
            WHERE user_id=%s
            """,
            (current_user_id,)
        )
        profile = cursor.fetchone()
        if not profile:
            return jsonify({"error": "Profile not found"}), 404

   

        invoice_date =invoice["invoice_date"]
        due_date = invoice["due_date"]

        days = (due_date - invoice_date).days

        if days <= 0:
            payment_term = "Due on Receipt"
        elif days == 7:
            payment_term = "Net 7"
        elif days == 15:
            payment_term = "Net 15"
        elif days == 30:
            payment_term = "Net 30"
        elif days == 60:
            payment_term = "Net 60"
        elif days == 90:
            payment_term = "Net 90"
        else:
            payment_term = f"Net {days}"

        taxAmount = float(invoice['subtotal']) * float(invoice['tax']) / 100

    return render_template(
        "users/view-full-invoice.html", 
        invoiceId=invoiceId,
        invoiceNumber= invoice['invoice_number'],
        invoiceDate= invoice['invoice_date'].strftime("%Y-%m-%d"),
        dueDate= invoice['due_date'].strftime("%Y-%m-%d"),
        totalAmount = float(invoice['amount']),
        status= invoice['status'],
        note= invoice['note'],
        subtotal= float(invoice['subtotal']),
        tax= float(invoice['tax']),
        taxAmount= taxAmount,
        amountPaid= float(invoice['amount_paid']),
        balance= float(invoice['balance']),
        clientId= invoice['client_id'],
        clientName=client['client_name'],
        clientEmail=client['client_email'],
        clientAddress=client['client_address'],
        currencySymbol=settings['currency_symbol'],
        companyName = profile['profilename'],
        companyAddress = profile['address'],
        companyEmail = profile['alternateemail'],
        companyWebsite = profile['website'],
        companyPhone = profile['phone'],
        paymentTerms = payment_term,
        items=items_list,
        theme = settings['theme'] if settings else 'light'
    )

@app.route("/dashboard/invoices/list")
def view_invoices_list_page():
    return render_template("users/invoice-list.html")

@app.route("/invoice/drafts/list")
def view_drafts_list_page():
    return render_template("users/invoice-drafts.html")

@app.route("/invoice/draft/edit/<int:draftId>")
@token_required
def edit_draft_page(current_user_id, current_user_role, draftId):

    with db_cursor(dictionary=True) as (_, cursor):

        cursor.execute("""
            SELECT
                id,
                client_name,
                client_email,
                invoice_date,
                due_date,
                total,
                status,
                subtotal,
                tax,
                description,
                quantity,
                price,
                note
            FROM invoice_drafts
            WHERE user_id=%s
            AND id=%s
        """, (current_user_id, draftId))

        draft = cursor.fetchone()

        if not draft:
            return jsonify({
                "status": "error",
                "message": "Draft not found"
            }), 404

        cursor.execute("""
            SELECT currency_symbol, theme
            FROM user_settings
            WHERE user_id=%s
        """, (current_user_id,))

        settings = cursor.fetchone()
        currency_symbol = (
            settings["currency_symbol"]
            if settings else "$"
        )

    return render_template(
        "users/edit-draft.html",
        draftId=draft["id"],
        clientName=draft["client_name"],
        clientEmail=draft["client_email"],
        invoiceDate=draft["invoice_date"],
        dueDate=draft["due_date"],
        totalAmount=draft["total"],
        status=draft["status"],
        subTotal=draft["subtotal"],
        tax=draft["tax"],
        taxAmount=(draft["tax"] * draft["subtotal"] / 100),
        items=[
            {
                "desc": draft["description"],
                "qty": draft["quantity"],
                "price": float(draft["price"])
            }
        ],
        note=draft["note"],
        currencySymbol=currency_symbol,
        theme = settings['theme'] if settings else 'light'
    )


@app.route("/dashboard/clients")
def view_clients_page():  
    return render_template("users/clients.html")


@app.route("/clients/edit/<int:clientId>")
@token_required
def edit_client_page(current_user_id,current_user_role,clientId):
    with db_cursor(dictionary=True) as (_, cursor):

        cursor.execute(
            """
            SELECT 
                id,
                client_name,
                client_email,
                client_address,
                client_phone,
                client_company,
                client_notes
            FROM clients
            WHERE user_id =%s AND id=%s
            ORDER BY client_name ASC
            """,
            (current_user_id, clientId)
        )
        client = cursor.fetchone()

        if not client:
            return jsonify({
                "status": "error",
                "message": "Client not found."
            }), 401 

        parts = client['client_name'].split()
        intials = parts[0][0] + parts[1][0]
        cursor.execute("""
            SELECT currency_symbol, theme
            FROM user_settings
            WHERE user_id=%s
        """, (current_user_id,))

        settings = cursor.fetchone()

    return render_template(
        "users/edit-client.html", 
        clientId=clientId,
        name = client['client_name'],
        email = client['client_email'],
        address = client['client_address'],
        phone = client['client_phone'],
        company= client['client_company'],
        notes = client['client_notes'],
        intials=intials,
        theme = settings['theme'] if settings else 'light'
    )

@app.route("/dashboard/payment")
@token_required
def payment_page(current_user_id,current_user_role):
    return render_template("users/payments.html")

@app.route("/transactions")
@token_required
def transaction_page(current_user_id, current_user_role):
    return render_template("users/transaction.html")

@app.route("/dashboard/me")
def me_page():
    return render_template("users/me.html")

@app.route("/security-center")
def security_center_page():
    return render_template("users/security.html")

@app.route("/security-center/2fa")
@token_required
def two_fa_page(current_user_id, current_user_role):
    with db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            "SELECT theme FROM user_settings WHERE user_id=%s",
            (current_user_id,)
        )
        settings = cursor.fetchone()
    
        theme = settings["theme"] if settings and settings.get("theme") else "light"
    return render_template("users/setup-2fa.html",theme=theme)

@app.route("/rate-us")
@token_required
def rate_us_page(current_user_id, current_user_role):
    with db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            "SELECT theme FROM user_settings WHERE user_id=%s",
            (current_user_id,)
        )
        settings = cursor.fetchone()
    
        theme = settings["theme"] if settings and settings.get("theme") else "light"
    return render_template("users/rate.html", theme=theme)

@app.route("/share")
@token_required
def share_page(current_user_id, current_user_role):

    with db_cursor(dictionary=True) as (_, cursor):

        cursor.execute(
            """
            SELECT referral_code,invite_sent, signups, earned
            FROM referrals
            WHERE user_id=%s
            """,
            (current_user_id,)
        )
        referral = cursor.fetchone()
        if not referral:
            return jsonify({
                "status":"error",
                "message":"Referral not found."
            }), 400
            
        cursor.execute(
                "SELECT theme FROM user_settings WHERE user_id=%s",
                (current_user_id,)
            )

        
        settings = cursor.fetchone()

        theme = "light"
        if settings and settings.get("theme"):
            theme = settings["theme"]
    return render_template("users/share.html",theme=theme,referralCode = referral['referral_code'], inviteSent = referral['invite_sent'], signups = referral['signups'], earned = referral['earned'])




@app.route("/billing")
@token_required
def billing_share(current_user_id,current_user_role):
    with db_cursor(dictionary=True) as (_, cursor):

        cursor.execute("""
            SELECT *
            FROM user_subscriptions
            WHERE user_id = %s
            ORDER BY id DESC
            LIMIT 1
        """, (current_user_id,))

        subscription = cursor.fetchone()

        cursor.execute(
                "SELECT theme FROM user_settings WHERE user_id=%s",
                (current_user_id,)
            )

        
        settings = cursor.fetchone()

        theme = "light"
        if settings and settings.get("theme"):
            theme = settings["theme"]
        


        # Default trial if user has no subscription yet
        if not subscription:

            trial_days = 7

            subscription = {
                "plan": "trial",
                "billing_cycle": "monthly",
                "status": "active",
                "expires_at": None
            }

            days_left = trial_days
            hours_left = 0
            minutes_left = 0
    
        else:

            days_left = 0
            hours_left = 0
            minutes_left = 0

            expires_at = subscription.get("expires_at")

            if expires_at:

                now = datetime.utcnow()

                remaining = expires_at - now

                total_seconds = int(remaining.total_seconds())

                if total_seconds > 0:

                    days_left = total_seconds // 86400
                    hours_left = (total_seconds % 86400) // 3600
                    minutes_left = (total_seconds % 3600) // 60

    return render_template(
        "users/billing.html",
        subscription=subscription,
        days_left=days_left,
        hours_left=hours_left,
        minutes_left=minutes_left,
        user_id=current_user_id,
        theme=theme
    )

@app.route("/settings")
@token_required
def settings_page(current_user_id, current_user_role):
    with db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            """
            SELECT 
                invoice_prefix, next_invoice_number, default_due_date, default_tax_rate, show_tax, show_discount, footer_note,
                currency, currency_symbol, timezone, date_format, email_notifications, due_date_reminder, reminder_days_before,
                theme, language, auto_logout_minutes, require_pin_for_delete, auto_logout_on_inactivity
            FROM user_settings
            WHERE user_id=%s
            """,
            (current_user_id,)
        )
        settings = cursor.fetchone()
        if not settings:
            return jsonify({
                "status": "error",
                "message": "An error occured while trying to fetch settings"
            }), 400

    return render_template(
        "users/settings.html",
        invoice_prefix=settings['invoice_prefix'],
        next_invoice_number=settings['next_invoice_number'],
        default_due_date=settings['default_due_date'],
        default_tax_rate=settings['default_tax_rate'],
        show_tax=settings['show_tax'],
        show_discount=settings['show_discount'],
        footer_note=settings['footer_note'],
        currency=settings['currency'],
        currency_symbol=settings['currency_symbol'],
        timezone=settings['timezone'],
        date_format=settings['date_format'],
        email_notifications=settings['email_notifications'],
        due_date_reminder=settings['due_date_reminder'],
        reminder_days_before=settings['reminder_days_before'],
        theme=settings['theme'],
        language=settings['language'],
        auto_logout_minutes=settings['auto_logout_minutes'],
        require_pin_for_delete=settings['require_pin_for_delete'],
        auto_logout_on_inactivity=settings['auto_logout_on_inactivity']
    )

@app.route("/feedback")
@token_required
def feedback_page(current_user_id, current_user_role):
    with db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            "SELECT theme FROM user_settings WHERE user_id=%s",
            (current_user_id,)
        )
        settings = cursor.fetchone()
    
        theme = settings["theme"] if settings and settings.get("theme") else "light"
    return render_template("users/feedback.html", theme=theme)

@app.route("/api/my-feedback")
@token_required
def my_feedback(current_user_id, current_user_role):
    with db_cursor(dictionary=True) as (_, cursor):

        cursor.execute("""
            SELECT *
            FROM feedback
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (current_user_id,))

        feedbacks = cursor.fetchall()

    return jsonify(feedbacks)

@app.route("/support")
@token_required
def support_page(current_user_id, current_user_role):
    with db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            "SELECT theme FROM user_settings WHERE user_id=%s",
            (current_user_id,)
        )
        settings = cursor.fetchone()
    
        theme = settings["theme"] if settings and settings.get("theme") else "light"
    return render_template("users/support.html", theme=theme)

@app.route("/api/support/my-tickets")
@token_required
def get_my_tickets(current_user_id, current_user_role):

    with db_cursor(dictionary=True) as (_, cursor):

        cursor.execute("""
            SELECT *
            FROM support_tickets
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (current_user_id,))

        tickets = cursor.fetchall()

    return jsonify(tickets)

@app.route("/close-account")
def close_account_page():
    return render_template("users/close-account.html")

@app.route("/app/about")
@token_required
def app_about(current_user_id,current_user_role):
    with db_cursor(dictionary=True) as (_, cursor):
        cursor.execute(
            "SELECT theme FROM user_settings WHERE user_id=%s",
            (current_user_id,)
        )
        settings = cursor.fetchone()
    
        theme = settings["theme"] if settings and settings.get("theme") else "light"
    return render_template("users/about.html", theme=theme)

@app.route("/dashboard/notifications")
def notifications_page():
    return render_template("users/notifications.html")

@app.route("/logout", methods=["POST"])
@token_required
def logout(current_user_id,current_user_role):

    token = session.get("session_token")

    if token:
        update_session_activity(token)
        session.pop("session_token", None)
        response = jsonify({
            "status": "success",
            "message": "Logged out successfully"
        })

        # REMOVE AUTH COOKIE
        response.delete_cookie("access_token")
        return response 
    else:
        return jsonify({"message": "No active session found"}), 400


@cache.memoize(timeout=30)  # short cache for notifications (real-time-ish)
def get_user_notifications(user_id):

    with db_cursor(dictionary=True) as (_, cursor):

        # ================= NOTIFICATIONS =================
        cursor.execute("""
            SELECT *
            FROM log_activity
            WHERE user_id=%s
            ORDER BY created_at DESC
        """, (user_id,))

        notifications = cursor.fetchall()

        # ================= SETTINGS =================
        cursor.execute("""
            SELECT theme
            FROM user_settings
            WHERE user_id=%s
            LIMIT 1
        """, (user_id,))

        settings = cursor.fetchone() or {}

        return {
            "notifications": notifications,
            "theme": settings.get("theme", "light")
        }

@app.route("/api/notifications")
@token_required
def get_notifications(current_user_id, current_user_role):

    try:

        data = get_user_notifications(current_user_id)

        return jsonify({
            "status": "success",
            "notifications": data["notifications"],
            "theme": data["theme"]
        })

    except Exception as e:

        print("Notifications error:", e)

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route("/profile")
@token_required
def profile_page(current_user_id,current_user_role):
    with db_cursor(dictionary=True) as (_, cursor):
        cursor.execute("""
            SELECT
                user_base.username, 
                cust_base.fullname,
                cust_base.profilename, 
                cust_base.profilepicurl AS profile_pic, 
                cust_base.address, 
                cust_base.alternateemail, 
                cust_base.phone, 
                cust_base.website,
                cust_base.bio,
                cust_base.country
            FROM cust_base
            JOIN user_base ON user_base.user_id = cust_base.user_id
            WHERE cust_base.user_id=%s
        """, (current_user_id,))
        profile_data = cursor.fetchone()

  
        cursor.execute(
            "SELECT theme FROM user_settings WHERE user_id=%s",
            (current_user_id,)
        )
        settings = cursor.fetchone()
    
        theme = settings["theme"] if settings and settings.get("theme") else "light"

    return render_template("users/profile.html", profile_data=profile_data, theme=theme)

# ========================= DATA ROUTES =========================
@cache.memoize(timeout=60)
def get_dashboard_data(user_id, user_role):

    with db_cursor(dictionary=True) as (_, cursor):

        # User
        cursor.execute("""
            SELECT
                ub.username,
                ub.plan,
                cb.profilepicurl,
                cb.profilename
            FROM user_base ub
            LEFT JOIN cust_base cb
                ON cb.user_id = ub.user_id
            WHERE ub.user_id=%s
            LIMIT 1
        """, (user_id,))
        user_data = cursor.fetchone()

        if not user_data:
            return None

        # Invoice Stats
        cursor.execute("""
            SELECT
                COUNT(*) AS total_invoices,
                SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) AS paid_invoices,
                SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending_invoices,
                COALESCE(
                    SUM(
                        CASE
                            WHEN status='paid'
                            THEN total
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_revenue
            FROM invoices
            WHERE user_id=%s
        """, (user_id,))
        invoice_stats = cursor.fetchone()

        # Settings
        cursor.execute("""
            SELECT
                us.currency,
                us.currency_symbol,
                us.theme,
                wb.wallet_balance
            FROM user_settings us
            LEFT JOIN wallet_base wb
                ON wb.user_id = us.user_id
            WHERE us.user_id=%s
            LIMIT 1
        """, (user_id,))
        account_data = cursor.fetchone()

        if not account_data:
            return None

        # Notifications
        cursor.execute("""
            SELECT COUNT(*) AS unread_count
            FROM log_activity
            WHERE user_id=%s
            AND is_read=FALSE
        """, (user_id,))
        unread_count = cursor.fetchone()["unread_count"]

        # Activities
        cursor.execute("""
            SELECT
                type,
                title,
                description,
                amount,
                created_at
            FROM log_activity
            WHERE user_id=%s
            ORDER BY created_at DESC
            LIMIT 10
        """, (user_id,))
        activities = cursor.fetchall()

    return {
        "status": "success",

        "username": user_data["username"],
        "plan": (user_data["plan"] or "").capitalize(),
        "profilepicurl": user_data["profilepicurl"],
        "profilename": user_data["profilename"],

        "total_invoices": invoice_stats["total_invoices"] or 0,
        "paid_invoices": invoice_stats["paid_invoices"] or 0,
        "pending_invoices": invoice_stats["pending_invoices"] or 0,

        "total_revenue": float(
            invoice_stats["total_revenue"] or 0
        ),

        "currency": account_data["currency"],
        "currency_symbol": account_data["currency_symbol"],
        "theme": account_data["theme"],

        "balance": float(
            account_data["wallet_balance"] or 0
        ),

        "unread_count": unread_count,

        "activities": activities,

        "user": {
            "id": user_id,
            "role": user_role
        }
    }

@app.route("/dashboard/data")
@token_required
def dashboard_data(current_user_id, current_user_role):

    try:

        start = time.time()

        data = get_dashboard_data(
            current_user_id,
            current_user_role
        )

        if not data:
            return jsonify({
                "status": "error",
                "message": "User data not found"
            }), 404

        print(
            f"Dashboard response took "
            f"{time.time() - start:.3f}s"
        )

        return jsonify(data)

    except Exception as e:

        print("Dashboard error:", e)

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@cache.memoize(timeout=60)
def get_invoice_list_cached(user_id):

    with db_cursor(dictionary=True) as (_, cursor):

        cursor.execute("""
            SELECT
                i.id,
                i.client_id,
                i.invoice_number,
                DATE_FORMAT(i.invoice_date, '%Y-%m-%d') AS invoice_date,
                DATE_FORMAT(i.due_date, '%Y-%m-%d') AS due_date,
                i.total AS amount,
                i.status,
                c.client_name AS client
            FROM invoices i
            LEFT JOIN clients c
                ON c.id = i.client_id
            WHERE i.user_id=%s
            ORDER BY i.id DESC
            LIMIT 100
        """, (user_id,))

        invoices = cursor.fetchall()

        cursor.execute("""
            SELECT
                currency_symbol,
                theme
            FROM user_settings
            WHERE user_id=%s
            LIMIT 1
        """, (user_id,))

        settings = cursor.fetchone()

        return {
            "invoices": invoices,
            "currency_symbol":
                settings["currency_symbol"]
                if settings else "$",

            "theme":
                settings["theme"]
                if settings else "light"
        }

@app.route("/dashboard/invoices/list/data")
@token_required
def invoice_list_data(
    current_user_id,
    current_user_role
):

    try:

        data = get_invoice_list_cached(
            current_user_id
        )

        return jsonify({
            "status": "success",

            "invoices":
                data["invoices"],

            "currency_symbol":
                data["currency_symbol"],

            "theme":
                data["theme"],

            "user": {
                "user_id": current_user_id,
                "role": current_user_role
            }
        })

    except Exception as e:

        print("Invoice list error:", e)

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@cache.memoize(timeout=60)
def get_invoice_drafts_data(user_id, user_role):

    with db_cursor() as (_, cursor):

        cursor.execute(
            """
            SELECT
                id,
                client_name,
                client_email,
                invoice_date,
                due_date,
                total,
                status,
                subtotal,
                tax,
                description,
                quantity,
                price,
                note
            FROM invoice_drafts
            WHERE user_id=%s
            ORDER BY id DESC
            """,
            (user_id,)
        )

        drafts = cursor.fetchall()

        draft_list = []

        for draft in drafts:

            draft_list.append({
                "id": draft[0],
                "client_name": draft[1],
                "client_email": draft[2],

                "invoice_date": (
                    draft[3].strftime("%Y-%m-%d")
                    if draft[3]
                    else None
                ),

                "due_date": (
                    draft[4].strftime("%Y-%m-%d")
                    if draft[4]
                    else None
                ),

                "total": float(draft[5] or 0),

                "status": draft[6],

                "subtotal": float(draft[7] or 0),

                "tax": float(draft[8] or 0),

                "taxAmount": (
                    float(draft[7] or 0)
                    * float(draft[8] or 0)
                    / 100
                ),

                "items": {
                    "desc": draft[9],
                    "qty": draft[10],
                    "price": float(draft[11] or 0)
                },

                "note": draft[12]
            })

        cursor.execute(
            """
            SELECT
                currency_symbol,
                theme
            FROM user_settings
            WHERE user_id=%s
            LIMIT 1
            """,
            (user_id,)
        )

        settings = cursor.fetchone()

        currency_symbol = (
            settings[0]
            if settings
            else "$"
        )

        theme = (
            settings[1]
            if settings
            else "light"
        )

    return {
        "status": "success",

        "drafts": draft_list,

        "currency_symbol": currency_symbol,

        "theme": theme,

        "user": {
            "user_id": user_id,
            "role": user_role
        }
    }

@app.route("/invoice/drafts/list/data")
@token_required
def invoice_drafts_list_data(
    current_user_id,
    current_user_role
):

    try:

        data = get_invoice_drafts_data(
            current_user_id,
            current_user_role
        )

        return jsonify(data)

    except Exception as e:

        print(
            f"Invoice drafts error: {e}"
        )

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@cache.memoize(timeout=60)
def get_clients_page_data(user_id, user_role):

    with db_cursor() as (_, cursor):

        cursor.execute(
            """
            SELECT
                id,
                client_name,
                client_email,
                client_address,
                client_phone,
                client_company,
                client_notes
            FROM clients
            WHERE user_id=%s
            ORDER BY client_name ASC
            """,
            (user_id,)
        )

        clients_raw = cursor.fetchall()

        cursor.execute(
            """
            SELECT
                client_id,
                COUNT(*) AS total_invoices,
                COALESCE(
                    SUM(
                        CASE
                            WHEN status != 'paid'
                            THEN total
                            ELSE 0
                        END
                    ),
                    0
                ) AS outstanding_amount
            FROM invoices
            WHERE user_id=%s
            GROUP BY client_id
            """,
            (user_id,)
        )

        invoice_aggregates_raw = cursor.fetchall()

        invoice_map = {
            row[0]: {
                "total_invoices": row[1],
                "outstanding": float(row[2] or 0)
            }
            for row in invoice_aggregates_raw
        }

        clients = []

        for c in clients_raw:

            (
                client_id,
                name,
                email,
                address,
                phone,
                company,
                notes
            ) = c

            invoice_data = invoice_map.get(
                client_id,
                {
                    "total_invoices": 0,
                    "outstanding": 0
                }
            )

            initials = (
                "".join(word[0] for word in name.split()[:2]).upper()
                if name else "NA"
            )

            clients.append({
                "id": client_id,
                "name": name,
                "initials": initials,
                "email": email,
                "address": address,
                "totalInvoices": invoice_data["total_invoices"],
                "outstanding": invoice_data["outstanding"],
                "status": (
                    "paid"
                    if invoice_data["outstanding"] == 0
                    else "unpaid"
                ),
                "company": company,
                "note": notes,
                "phone": phone
            })

        cursor.execute(
            """
            SELECT currency, currency_symbol, theme
            FROM user_settings
            WHERE user_id=%s
            """,
            (user_id,)
        )

        settings = cursor.fetchone()

        if not settings:
            return {
                "status": "error",
                "message": "Settings not found"
            }, 404

        currency, currency_symbol, theme = settings

        return {
            "status": "success",
            "clients": clients,
            "currencySymbol": currency_symbol,
            "theme": theme,
            "user": {
                "user_id": user_id,
                "role": user_role
            }
        }


@app.route("/dashboard/clients/data")
@token_required
def clients_page_data(current_user_id, current_user_role):

    try:

        data = get_clients_page_data(
            current_user_id,
            current_user_role
        )

        if isinstance(data, tuple):
            return jsonify(data[0]), data[1]

        return jsonify(data)

    except Exception as e:

        print("Clients dashboard error:", e)

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@cache.memoize(timeout=60)
def get_payment_page_data(user_id):

    with db_cursor(dictionary=True) as (_, cursor):

        # Total received
        cursor.execute(
            """
            SELECT COALESCE(SUM(total), 0) AS total_received
            FROM invoices
            WHERE user_id=%s AND status=%s
            """,
            (user_id, "paid")
        )
        total_received = cursor.fetchone()["total_received"]

        # Total pending
        cursor.execute(
            """
            SELECT COALESCE(SUM(total), 0) AS total_pending
            FROM invoices
            WHERE user_id=%s AND status=%s
            """,
            (user_id, "pending")
        )
        total_pending = cursor.fetchone()["total_pending"]

        # Total unpaid
        cursor.execute(
            """
            SELECT COALESCE(SUM(total), 0) AS total_unpaid
            FROM invoices
            WHERE user_id=%s AND status=%s
            """,
            (user_id, "unpaid")
        )
        total_unpaid = cursor.fetchone()["total_unpaid"]

        total_outstanding = total_pending + total_unpaid

        # Total overdue
        cursor.execute(
            """
            SELECT COALESCE(SUM(total), 0) AS total_overdue
            FROM invoices
            WHERE user_id=%s
            AND due_date < %s
            AND status IN (%s,%s,%s)
            """,
            (
                user_id,
                datetime.now(),
                "pending",
                "unpaid",
                "overdue"
            )
        )

        total_overdue = cursor.fetchone()["total_overdue"]

        # Payments
        cursor.execute(
            """
            SELECT
                invoices.id,
                invoices.invoice_number,
                invoices.client_id,
                invoices.invoice_date,
                invoices.total AS amount,
                invoices.status,
                invoices.due_date,
                invoices.note,
                clients.client_name AS clientName,
                clients.client_email AS clientEmail
            FROM invoices
            JOIN clients
                ON clients.id = invoices.client_id
            WHERE invoices.user_id=%s
            """,
            (user_id,)
        )

        payments_raw = cursor.fetchall()

        payments = []

        for p in payments_raw:

            cursor.execute(
                """
                SELECT
                    description,
                    quantity,
                    price
                FROM invoice_items
                WHERE invoice_id=%s
                """,
                (p["id"],)
            )

            items = cursor.fetchall()

            payments.append({
                "id": p["invoice_number"],
                "client": p["clientName"],
                "email": p["clientEmail"],
                "date": (
                    p["invoice_date"].strftime("%Y-%m-%d")
                    if p["invoice_date"] else None
                ),
                "amount": float(p["amount"] or 0),
                "status": p["status"],
                "dueDate": (
                    p["due_date"].strftime("%Y-%m-%d")
                    if p["due_date"] else None
                ),
                "items": [
                    {
                        "desc": i["description"],
                        "qty": i["quantity"],
                        "price": float(i["price"] or 0)
                    }
                    for i in items
                ],
                "notes": p["note"]
            })

        cursor.execute(
            """
            SELECT
                currency,
                currency_symbol,
                theme
            FROM user_settings
            WHERE user_id=%s
            """,
            (user_id,)
        )

        currency_info = cursor.fetchone()

        return {
            "status": "success",
            "total_received": float(total_received or 0),
            "total_outstanding": float(total_outstanding or 0),
            "total_overdue": float(total_overdue or 0),
            "payments": payments,
            "currency": (
                currency_info["currency"]
                if currency_info else "USD"
            ),
            "currencySymbol": (
                currency_info["currency_symbol"]
                if currency_info else "$"
            ),
            "theme": (
                currency_info["theme"]
                if currency_info else "light"
            )
        }


@app.route("/dashboard/payment/data")
@token_required
def payment_page_data(current_user_id, current_user_role):

    try:

        data = get_payment_page_data(current_user_id)

        data["user"] = {
            "user_id": current_user_id,
            "role": current_user_role
        }

        return jsonify(data)

    except Exception as e:

        print("Payment dashboard error:", e)

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@cache.memoize(timeout=60)
def get_me_page_data(user_id):

    with db_cursor(dictionary=True) as (_, cursor):

        # ================= USER INFO =================
        cursor.execute(
            """
            SELECT fullname, profilepicurl
            FROM cust_base
            WHERE user_id=%s
            """,
            (user_id,)
        )
        user_data = cursor.fetchone()

        if not user_data:
            return None

        # ================= WALLET =================
        cursor.execute(
            """
            SELECT wallet_balance
            FROM wallet_base
            WHERE user_id=%s
            """,
            (user_id,)
        )
        row = cursor.fetchone()
        balance = row["wallet_balance"] if row and row["wallet_balance"] is not None else 0.00

        # ================= CURRENCY =================
        cursor.execute(
            """
            SELECT currency_symbol, theme
            FROM user_settings
            WHERE user_id=%s
            """,
            (user_id,)
        )
        settings = cursor.fetchone()
        currency_symbol = settings["currency_symbol"] if settings else "$"
        theme = settings["theme"] if settings else "light"

        # ================= NAME CLEANUP =================
        name = user_data["fullname"] or ""

        return {
            "user": {
                "name": name,
                "profilePic": user_data["profilepicurl"],
                "balance": float(balance)
            },
            "currency_symbol": currency_symbol,
            "theme":theme
            
        }

@app.route("/dashboard/me/data")
@token_required
def me_page_data(current_user_id, current_user_role):

    try:

        data = get_me_page_data(current_user_id)

        if not data:
            return jsonify({
                "status": "error",
                "message": "Profile not found."
            }), 404

        data["status"] = "success"
        data["user"]["user_id"] = current_user_id
        data["user"]["role"] = current_user_role

        return jsonify(data)

    except Exception as e:

        print("ME dashboard error:", e)

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@cache.memoize(timeout=60)  # cache per user for 60s
def get_transactions_data(user_id):

    with db_cursor(dictionary=True) as (_, cursor):

        # ================= TOTAL =================
        cursor.execute("""
            SELECT COUNT(*) AS total_transactions
            FROM transactions
            WHERE user_id=%s
        """, (user_id,))
        total_transactions = cursor.fetchone()["total_transactions"]

        # ================= PAID =================
        cursor.execute("""
            SELECT COUNT(*) AS paid_transactions
            FROM transactions
            WHERE user_id=%s AND status=%s
        """, (user_id, "paid"))
        paid_transactions = cursor.fetchone()["paid_transactions"]

        # ================= PENDING =================
        cursor.execute("""
            SELECT COUNT(*) AS pending_transactions
            FROM transactions
            WHERE user_id=%s AND status IN (%s, %s)
        """, (user_id, "pending", "unpaid"))
        pending_transactions = cursor.fetchone()["pending_transactions"]

        # ================= OVERDUE =================
        cursor.execute("""
            SELECT COUNT(*) AS overdue_transactions
            FROM transactions
            WHERE user_id=%s AND status=%s
        """, (user_id, "overdue"))
        overdue_transactions = cursor.fetchone()["overdue_transactions"]

        # ================= TRANSACTIONS LIST =================
        cursor.execute("""
            SELECT
                t.id,
                t.reference,
                t.amount,
                t.status,
                t.transaction_type,
                t.paid_at,
                t.created_at,
                t.note,
                c.client_company AS client,
                c.client_email AS email,
                i.due_date
            FROM transactions t
            LEFT JOIN invoices i ON t.invoice_id = i.id
            LEFT JOIN clients c ON i.client_id = c.id
            WHERE t.user_id = %s
            ORDER BY t.created_at DESC
        """, (user_id,))

        transactions_raw = cursor.fetchall()

        transactions = []
        grouped = defaultdict(list)

        for tx in transactions_raw:

            created = tx["created_at"]

            month_key = created.strftime("%B %Y")

            transactions.append({
                "id": tx["reference"],
                "client": tx["client"],
                "email": tx["email"],
                "date": created.strftime("%b %d, %Y"),
                "dueDate": tx["due_date"].strftime("%b %d, %Y") if tx["due_date"] else "N/A",
                "amount": float(tx["amount"] or 0),
                "status": tx["status"],
                "type": tx["transaction_type"],
                "notes": tx["note"] or ""
            })

            grouped[month_key].append({
                "id": tx["reference"],
                "client": tx["client"],
                "date": created.strftime("%b %d, %Y"),
                "amount": float(tx["amount"] or 0),
                "status": tx["status"],
                "type": tx["transaction_type"]
            })

        # ================= CURRENCY =================
        cursor.execute("""
            SELECT currency_symbol, theme
            FROM user_settings
            WHERE user_id=%s
        """, (user_id,))

        settings = cursor.fetchone() or {}

        return {
            "status": "success",
            "total_transactions": total_transactions,
            "paid_transactions": paid_transactions,
            "pending_transactions": pending_transactions,
            "overdue_transactions": overdue_transactions,
            "transactions": transactions,
            "transactions_by_month": dict(grouped),
            "currencySymbol": settings.get("currency_symbol", "$"),
            "theme": settings.get("theme", "light")
        }


@app.route("/transactions/data")
@token_required
def transactions_page_data(current_user_id, current_user_role):

    try:
        data = get_transactions_data(current_user_id)

        # optional: attach user meta
        data["user"] = {
            "user_id": current_user_id,
            "role": current_user_role
        }

        return jsonify(data)

    except Exception as e:
        print("Transactions error:", e)

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

    
@app.route("/api/sessions")
@token_required
def get_sessions(current_user_id, current_user_role):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                id,
                device_type,
                browser,
                os,
                location,
                session_token,
                created_at,
                last_active
            FROM user_sessions
            WHERE user_id=%s
            ORDER BY last_active DESC
        """, (current_user_id,))

        sessions = cursor.fetchall()

        cursor.execute("SELECT theme FROM user_settings WHERE user_id=%s",(current_user_id,))
        settings = cursor.fetchone()
        theme = settings['theme'] if settings else "light"

        current_token = session.get("session_token")

        for s in sessions:
            s["is_current"] = (
                s["session_token"] == current_token
            )

        return jsonify({
            "status": "success",
            "sessions": sessions,
            "theme": theme
        })

    finally:
        cursor.close()
        conn.close()

@app.route("/security-status", methods=["GET"])
@token_required
def security_status(current_user_id, current_user_role):

    with db_cursor(dictionary=True) as (_, cursor):

        cursor.execute("""
            SELECT
                two_factor_enabled,
                biometric_enabled,
                is_email_verified AS email_verified,
                pin,
                last_password_change
            FROM user_base
            WHERE user_id=%s
        """, (current_user_id,))

        user = cursor.fetchone()

        score = 0

        if user["two_factor_enabled"]:
            score += 30
    
        if user["email_verified"]:
            score += 20

        if user["pin"]:
            score += 20

        if user["biometric_enabled"]:
            score += 15

        score += 15

    return jsonify({
        "status": "success",
        "security_score": score,
        "settings": user
    })
# =================  FUNCTIONS =====================


@app.route("/cust", methods=["POST"])
def create_profile():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid or missing JSON"
        }), 400

    required_fields = [
        "username",
        "profile_name",
        "full_name",
        "address",
        "country",
        "currency",
        "dob"
    ]

    # GET USER ID FOR INDEXING
    user_id = get_user_id(data['username'])


    # lOAD DATA FROM DATABASE TO ENSURE NO DUPLICATES
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT profilename FROM cust_base")
    existing_profiles = {row[0] for row in cursor.fetchall()}
    if data["profile_name"] in existing_profiles:
        return jsonify({
            "status": "error",
            "message": "Profile name already exists"
        }), 400
    
    # Validate required fields
    for field in required_fields:
        if not data.get(field):
            return jsonify({
                "status": "error",
                "message": f"Missing field: {field}"
            }), 400

    try:
        cursor.execute("""
            INSERT INTO cust_base
            (user_id,profilename, fullname, address, country, currency, dob)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            data["profile_name"],
            data["full_name"],
            data["address"],
            data["country"],
            data["currency"],
            data["dob"]
        ))

        conn.commit()
        # welcome html
        first_name = data['profile_name']
        year = datetime.now().year
        welcome_html = f"""

<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">


    <!-- Card -->
    <table width="100%" cellpadding="0" cellspacing="0"
      style="max-width:600px; background:#ffffff; border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,0.08); overflow:hidden;">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg, #2563eb, #1e40af); padding:28px; text-align:center;">
          <img src="{APP_LOGO_URL}" alt="Business Essential Logo" width="56" height="56"
            style="display:block; margin:0 auto 10px;" />
          <h1 style="margin:0; font-size:22px; color:#ffffff;">Welcome to Business Essential 🎉</h1>
          <p style="margin:6px 0 0; font-size:14px; color:#dbeafe;">
            Simple • Secure • Professional Invoicing
          </p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px; color:#111827;">
          <h2 style="margin-top:0; font-size:24px;">
            Hi {first_name},
          </h2>

          <p style="font-size:15px; line-height:1.7;">
            Welcome aboard! We’re excited to have you join <strong>Business Essential</strong>.
            Your account has been successfully created, and you’re now ready to start managing
            invoices, customers, and payments with ease.
          </p>

          <!-- Feature List -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr>
              <td style="font-size:15px; line-height:1.8;">
                ✅ Create and manage professional invoices<br />
                ✅ Track payments and customer activity<br />
                ✅ Secure your account with built-in protections<br />
                ✅ Access your data anytime, anywhere
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
            <tr>
              <td align="center">
                <a href="{DASHBOARD_URL}"
                  style="background:#2563eb; color:#ffffff; text-decoration:none;
                         padding:14px 26px; border-radius:10px;
                         font-size:15px; font-weight:600; display:inline-block;">
                  Go to Dashboard
                </a>
              </td>
            </tr>
          </table>

          <p style="font-size:15px; line-height:1.7;">
            If you ever need help, our support team is always here to assist you.
            We recommend starting by completing your profile and creating your first invoice.
          </p>

          <p style="font-size:15px; line-height:1.7;">
            We’re glad you’re here — let’s build something great together 🚀
          </p>

          <p style="margin-top:32px; font-size:14px; color:#374151;">
            Warm regards,<br />
            <strong>The Business Essential Team</strong>
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f9fafb; padding:18px; text-align:center; font-size:12px; color:#6b7280;">
          You’re receiving this email because you created an Business Essential account.<br />
          © {year} Business Essential. All rights reserved.
        </td>
      </tr>

    </table>

  </td>
</tr>


  </table>

</body>

"""
        send_email(
            recipient=data["email"],
            subject="Welcome to Business Essential 🎉",
            body=welcome_html,
            html=True
        )
        
        save_security_activity(
            user_id=user_id,
            type_="Profile",
            title="Profile Creation",
            description= f"Profile {data["profile_name"]} created fsuccessfully",
            severity="LOW",
            ip_address=get_client_ip()
        )

        return jsonify({
            "status": "success",
            "message": "Profile created successfully"
        }), 201

    except Exception as e:
        traceback.print_exc()
        conn.rollback()
        return jsonify({
            "status": "error",
            "message": "Database error",
            "details": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/user", methods=["POST"])
def create_user():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid or missing JSON"
        }), 400

    required_fields = [
        "username",
        "email",
        "password",
        "security_question",
        "security_answer",
        "app_pin",
        "verification_code"
    ]
    conn = get_db()
    cursor = conn.cursor()

    # Check for duplicate usernames
    cursor.execute("SELECT username FROM user_base")
    existing_usernames = {row[0] for row in cursor.fetchall()}
    if data["username"] in existing_usernames:
        return jsonify({
            "status": "error",
            "message": "Username already exists"
        }), 400
    

    # Validate required fields
    for field in required_fields:
        if not data.get(field):
            return jsonify({
                "status": "error",
                "message": f"Missing field: {field}"
            }), 400

    try:
        cursor.execute("""
            INSERT INTO user_base
            (username, email, password_hash, security_question, security_answer ,failed_attempts, last_login, last_failed_login, trials_ends_at, locked, lock_reason, active, pin)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data["username"],
            data["email"],
            hashlib.sha256(data["password"].encode()).hexdigest(),
            hashlib.sha256(data["security_question"].encode()).hexdigest(),
            hashlib.sha256(data["security_answer"].encode()).hexdigest(),
            0, None, None, (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S"),
            False, "", True,
            hashlib.sha256(data['app_pin'].encode()).hexdigest()
        ))
        user_id = cursor.lastrowid
        cursor.execute(
            """
            INSERT INTO user_settings (user_id, footer_note
            )
            VALUES (%s, %s)
            """,
            (
                user_id,
                "Thanks for doing business with us."
            )
        )

        cursor.execute(
            """
            INSERT INTO wallet_base (user_id)
            VALUES(%s)
            """,
            (user_id,)
        )


        conn.commit()
    
        send_email(
            recipient=data["email"],
            subject="Verification of Account Creation",
            body=f"Here is your verification code: {data['verification_code']}",
            html=False
        )

        save_security_activity(
            user_id=user_id,
            type_="User",
            title="New User",
            description="User created successfully",
            severity="LOW",
            ip_address=get_client_ip()
        )

        return jsonify({
            "status": "success",
            "message": "User created successfully"
        }), 201

    except Exception as e:
        print(e)
        conn.rollback()
        return jsonify({
            "status": "error",
            "message": "Database error",
            "details": str(e)
    
        }), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/verify", methods=["POST"])
def verify_user():

    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid or missing JSON"
        }), 400

    required_fields = [
        "generated_code",
        "verification_code",
        "username"
    ]

    for field in required_fields:
        if not data.get(field):
            return jsonify({
                "status": "error",
                "message": f"Missing field: {field}"
            }), 400

    username = data["username"]

    with db_cursor(dictionary=True) as (_, cursor):

        # ================= GET USER IN SAME CONNECTION =================
        cursor.execute(
            """
            SELECT user_id
            FROM user_base
            WHERE username=%s
            """,
            (username,)
        )

        user_row = cursor.fetchone()

        if not user_row:
            return jsonify({
                "status": "error",
                "message": "User not found"
            }), 404

        user_id = user_row["user_id"]

        # ================= VERIFY CODE =================
        if data["generated_code"] != data["verification_code"]:

            save_security_activity(
                user_id=user_id,
                type_="Verification",
                title="Email verification",
                description="Email verification failed",
                severity="MEDIUM",
                ip_address=get_client_ip()
            )

            return jsonify({
                "status": "error",
                "message": "Invalid verification code"
            }), 400

        # ================= SUCCESS LOG =================
        save_security_activity(
            user_id=user_id,
            type_="Verification",
            title="Email verification",
            description="Email verified successfully",
            severity="LOW",
            ip_address=get_client_ip()
        )

        # ================= UPDATE USER =================
        cursor.execute(
            """
            UPDATE user_base
            SET is_email_verified = %s
            WHERE user_id = %s
            """,
            (True, user_id)
        )

    return jsonify({
        "status": "success",
        "message": "User verified successfully"
    }), 200


@app.route("/completecust", methods=["POST"])
def complete_cust():
    # Since we are sending FormData, use request.form and request.files
    form = request.form
    file = request.files.get("profile_picture")


    username = form.get("username")
    user_id = get_user_id(username) 


    # Example saving file
    file = request.files.get("profile_picture")  # Make sure your input type="file"
    if file:
        try:
            result = cloudinary.uploader.upload(
            file,
            folder="profile_images",
            transformation = [
                {"width":300, "height":300, "crop":"fill"}
            ],
            public_id = f"user_{user_id}",
            overwrite= True
         )
            save_path = result['secure_url']
        except Exception as e:
            print("Cloudinary upload error:", str(e))

            return jsonify({
            "success": False,
            "message": "Unable to upload file. Please try again."
        }), 500


    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE cust_base
            SET phone=%s,
                alternateemail=%s,
                website=%s,
                profilepicurl=%s,
                bio=%s
            WHERE profilename=%s AND user_id=%s
        """, (
            form.get("phone_number"),
            form.get("alternate_email"),
            form.get("website"),
            save_path,
            form.get("bio"),
            form.get("profile_name"),
            user_id
        ))

      

        conn.commit()
        _ip = get_client_ip()
   
        save_security_activity(
            user_id=user_id,
            type_="Profile",
            title="Profile Created",
            description=f"New profile for {form.get("profile_name")} completed successfully",
            severity= "LOW",
            ip_address= _ip
         
        )

        return jsonify({
            "status": "success",
            "message": "Customer profile completed successfully"
        }), 200

    except Exception as e:
        conn.rollback()
        print(e)
        return jsonify({
            "status": "error",
            "message": "Database error",
            "details": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()




    
@app.route("/resend", methods=["POST"])
def resend_verification():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid or missing JSON"
        }), 400

    required_fields = [
        "email",
        "verification_code"
    ]

    for field in required_fields:
        if not data.get(field):
            return jsonify({
                "status": "error",
                "message": f"Missing field: {field}"
            }), 400

    send_email(
        recipient=data["email"],
        subject="Verification Code Resent",
        body=f"Here is your verification code: {data['verification_code']}",
        html=False
    )

    return jsonify({
        "status": "success",
        "message": "Verification code resent successfully"
    }), 200


@app.route("/loginp", methods=["POST"])
def verifylogin():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid or missing JSON"
        }), 400
    
    required_fields = [
        'username',
        'password'
    ]

    # Validate required fields
    for field in required_fields:
        if not data.get(field):
            return jsonify({
                "status": "error",
                "message": f"Missing field: {field}"
            }), 400
        
    user_agent = data.get("user_agent")

    latitude = data.get("lat")
    longitude = data.get("lng")

    ip_address = get_client_ip()

    conn = get_db()
    cursor = conn.cursor(buffered=True)
    try:
        cursor.execute(
            """
            SELECT password_hash, locked, failed_attempts, last_failed_login,email,lock_reason, user_id,role,two_factor_enabled
            FROM user_base
            WHERE username=%s
            """,
            (data['username'],)
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({
                "status": "error",
                "message":"User not found"
            }),400
        

        current_password = user[0]
        password = data['password']
        hashed = hashlib.sha256(password.encode()).hexdigest()
        user_id = user[6]

        if user[1]:
            save_security_activity(
                user_id=user_id,
                type_="Login",
                title="Login Failed",
                description="Login failed. Account locked!",
                severity="MEDIUM",
                ip_address=get_client_ip()
            )
            return jsonify({
                "status": "error",
                "message":  f"Account locked! Reason: {user[5]}" 
            }), 400
     
        


   
        if hashed != current_password:
            # Failed attempt
            new_attempts = user[2] + 1  
            cursor.execute(
                "UPDATE user_base SET failed_attempts=%s, last_failed_login=NOW() WHERE username=%s",
                (new_attempts, data['username']),
            )
            conn.commit()

            if new_attempts >= 3:
                cursor.execute(
                    "UPDATE user_base SET locked=1, lock_reason=%s WHERE username=%s",
                    ("Too many failed login attempts", data['username']),
                )
                conn.commit()
                save_security_activity(
                    user_id=user_id,
                    type_="Login",
                    title="Login Failed",
                    description=f"Login failed. Account locked,Too many failed login attempts",
                    severity="HIGH",
                    ip_address=get_client_ip()
                )


            save_security_activity(
                user_id=user_id,
                type_="Login",
                title="Login Failed",
                description=f"Login failed. Incorrect Password, attempts({new_attempts})",
                severity="MEDIUM",
                ip_address=get_client_ip()
            )
            return jsonify({
                "status": "error",
                "message": "Incorrect Password"
            }), 400
        

        # --- Successful login ---

        cursor.execute(
            "UPDATE user_base SET failed_attempts=0, last_login= NOW() WHERE username=%s",
            (data['username'],)
        )


        cursor.execute(
    """
    SELECT 1
    FROM wallet_base
    WHERE user_id=%s
    LIMIT 1
    """,
    (user_id,)
)

        w = cursor.fetchone()
        if not w :
            cursor.execute(
                """
                INSERT INTO wallet_base (user_id)
                VALUES(%s)
                """,
                (user_id,)
            )

        cursor.execute(
            """
            SELECT 1
            FROM user_settings
            WHERE user_id=%s
            LIMIT 1
            """,
            (user_id,)
        )
        s = cursor.fetchone()
        print("Just fetched s")
        if not s:
            cursor.execute(
                """
                INSERT INTO user_settings (user_id, footer_note)
                VALUES(%s, %s)
                """,
                (
                    user_id,
                    "Thanks for doing business with us."
                )
            )
           
            print("Just finished fetched s")

        referral_code = f"REF{user_id}{int(datetime.now().timestamp())}"
        cursor.execute(
            """
            INSERT INTO referrals (user_id,referral_code)
            VALUES(%s,%s)  
            """,
            (user_id,referral_code)
        )


            

        conn.commit()
        lat = data['lat']
        lng = data['lng']
        login_ip = get_client_ip()
        city, region, country = get_location_from_ip(login_ip)
        citys,state,counts = get_location(lat=lat,lng=lng)
        device_model, client_type, os_name, os_version  = parse_user_agent1(data['user_agent'])

        location = None

        if latitude and longitude:
            location = f"{latitude}, {longitude}"

        session_token = log_session(
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            location=location,
            latitude=latitude,
            longitude=longitude
        )


        session["session_token"] = session_token

        

  
    
        # --- Send login notification ---
        email = str(user[4]) if user[4] else None # type: ignore
        # Build login HTML





     
        year = datetime.now().year

        login_html = f"""

<body style="margin:0; padding:0; background-color:#f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">


    <!-- Main Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background:#ffffff; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.08); overflow:hidden;">

      <!-- Header -->
      <tr>
        <td style="background:#111827; padding:24px; text-align:center;">
          <img src="{APP_LOGO_URL}" alt="Business Essential Logo" width="48" height="48" style="display:block; margin:0 auto 8px;" />
          <h1 style="color:#ffffff; font-size:20px; margin:0;">Business Essential</h1>
          <p style="color:#9ca3af; margin:4px 0 0; font-size:14px;">Security Notification</p>
        </td>
      </tr>

      <!-- Content -->
      <tr>
        <td style="padding:32px; color:#111827;">
          <h2 style="margin-top:0; font-size:22px;">New Sign-In Detected</h2>

          <p style="font-size:15px; line-height:1.6;">
            We noticed a new sign-in to your Invoice App account.  
            For your security, we’re letting you know whenever your account is accessed from a new device or location.
          </p>

          <!-- Details Box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0; background:#f9fafb; border-radius:8px; padding:16px;">
            <tr>
              <td style="font-size:14px; line-height:1.8;">
                <strong>Login details</strong><br />
                <strong>IP Address:</strong> {login_ip}<br />
                <strong>Location:</strong> {citys}, {state}, {counts}<br />
                <strong>Date & Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br />
                <strong>Device:</strong> New or unrecognized device
              </td>
            </tr>
          </table>

          <p style="font-size:15px; line-height:1.6;">
            <strong>Was this you?</strong><br />
            If you recognize this activity, no action is required. You can safely ignore this message.
          </p>

          <p style="font-size:15px; line-height:1.6;">
            <strong>Was this not you?</strong><br />
            If you do not recognize this sign-in, we strongly recommend taking action immediately to protect your account:
          </p>

          <ul style="font-size:15px; line-height:1.6; padding-left:20px;">
            <li>Change your account password</li>
            <li>Review recent account activity</li>
            <li>Update your security questions or recovery details</li>
          </ul>

          <!-- CTA Button -->
          <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
            <tr>
              <td align="center">
                <a href="{SECURITY_URL}" style="background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:8px; font-weight:600; display:inline-block;">
                  Secure My Account
                </a>
              </td>
            </tr>
          </table>

          <p style="font-size:14px; color:#374151; line-height:1.6;">
            If you believe your account has been compromised or need assistance, please contact our support team immediately.
          </p>

          <p style="font-size:14px; color:#6b7280; margin-top:32px;">
            Thank you for helping us keep your account secure,<br />
            <strong>The Business Essential Security Team</strong>
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f9fafb; padding:16px; text-align:center; font-size:12px; color:#6b7280;">
          This is an automated security message. Please do not reply.<br />
          © {year} Business Essential. All rights reserved.
        </td>
      </tr>

    </table>

  </td>
</tr>
```

  </table>

</body>


        """
        

        send_email(
            recipient=email,
            subject="New Sign-In Detected — Business Essential",
            body=login_html,
            html=True
        )
        save_security_activity(
            user_id=user_id,
            type_="account",
            title="User Login",
            description=f"A login into this app was noticed on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}.",
            severity="LOW",
            ip_address=login_ip
        )

        
        # IF 2FA ENABLED
        if user[8]:

            session['pending_user_id'] = user[6]

            return jsonify({
                "status": "success",
                "two_factor_required": True
            }), 200


        payload = {
            "user_id": user[6],
            "role": user[7],
            "exp": datetime.utcnow() + timedelta(hours=24)
        }

        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")



        response = make_response(jsonify({
            "status": "success",
            "message": "Login successful"
        }))
        response.set_cookie(
            "access_token",
            token,
            httponly=True,
            secure=True,  
            samesite="Lax",
            max_age=60 * 60 * 24 * 7
        )
        return response, 200

    except Exception as e:
        conn.rollback()
        print(e)
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": "Database error",
            "details": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/resetpass", methods=["POST"])
def reset():
    data = request.get_json()
    print("RESET PASS HIT")

    required_fields = ["username", "security_question", "security_answer"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"status": "error", "message": f"Missing {field}"}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT user_id, security_question, security_answer, email
            FROM user_base
            WHERE username=%s
            """,
            (data['username'],)
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({"status": "error", "message": "User not found"}), 404

        user_id, question, answer_hash, email = user
        incoming_answer_hash = hashlib.sha256(
            data['security_answer'].encode()
        ).hexdigest()
        incoming_question_hash = hashlib.sha256(
            data['security_question'].encode()
        ).hexdigest()

        if incoming_question_hash != question or incoming_answer_hash != answer_hash:
            save_security_activity(
                user_id=user_id,
                type_="Password",
                title="Password Reset",
                description="Failed. Invalid security details",
                severity= "MEDIUM",
                ip_address=get_client_ip()
            )

            return jsonify({"status": "error", "message": "Invalid security details"}), 400
         
        reset_code = secrets.token_hex(3)
        reset_code_hash = hashlib.sha256(reset_code.encode()).hexdigest()

        reset_code_expires = datetime.utcnow() + timedelta(minutes=10)

        cursor.execute(
            "UPDATE user_base SET reset_code_hash=%s, reset_code_expires=%s WHERE username=%s",
            (reset_code_hash,reset_code_expires, data['username'])
        )
        conn.commit()
        reset_password_html = f"""
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:#ffffff; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.08); overflow:hidden;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background:#1558B0; padding:20px; text-align:center;">
                            <h2 style="margin:0; color:#ffffff; font-weight:600;">
                                Business Essential
                            </h2>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:30px;">
                            <h3 style="margin-top:0; color:#333333;">
                                Reset Your Password
                            </h3>

                            <p style="color:#555555; font-size:15px; line-height:1.6;">
                                We received a request to reset your password.  
                                If you didn’t make this request, you can safely ignore this email.
                            </p>

                            <p style="color:#555555; font-size:15px; line-height:1.6;">
                                Use the verification code below to reset your password:
                            </p>

                            <!-- Code box -->
                            <div style="text-align:center; margin:25px 0;">
                                <span style="display:inline-block; padding:14px 24px; font-size:20px; letter-spacing:3px; background:#f1f5ff; color:#1558B0; border-radius:6px; font-weight:600;">
                                    {reset_code}
                                </span>
                            </div>

                            <p style="color:#777777; font-size:14px; line-height:1.6;">
                                This code will expire in 10 minutes.
                            </p>

                            <p style="color:#555555; font-size:14px; line-height:1.6;">
                                Need help? Contact our support team.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background:#f4f6f8; padding:16px; text-align:center;">
                            <p style="margin:0; color:#888888; font-size:13px;">
                                © {datetime.now().year} Business Essential. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
"""


        send_email(
            recipient=email,
            subject="Business Essential - Password Reset Code",
            body=reset_password_html,
            html=True
        )

        return jsonify({
            "status": "success",
            "message": "Reset code sent to email"
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "Server error",
            "details": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()

    
@app.route("/save-password", methods=["POST"])
def savepassword():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid or missing JSON"
        }), 400

    required_fields = ["username", "reset_code", "new_password"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({
                "status": "error",
                "message": f"Missing field: {field}"
            }), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT user_id, reset_code_hash, reset_code_expires, email
            FROM user_base
            WHERE username=%s
            """,
            (data["username"],)
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({
                "status": "error",
                "message": "User not found"
            }), 404

        user_id, stored_hash, expires_at, email = user

        if not stored_hash or not expires_at:
            save_security_activity(
                user_id=user_id,
                type_="Password",
                title="Password Reset",
                description="Failed.No active reset request ",
                severity= "MEDIUM",
                ip_address=get_client_ip()
            )

            return jsonify({
                "status": "error",
                "message": "No active reset request"
            }), 400
        


        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)



        if datetime.utcnow() > expires_at:
            return jsonify({
                "status": "error",
                "message": "Reset code expired"
            }), 400

        entered_hash = hashlib.sha256(
            data["reset_code"].encode()
        ).hexdigest()
        if entered_hash != stored_hash:
            return jsonify({
                "status": "error",
                "message": "Invalid reset code"
            }), 400

        new_password_hash = hashlib.sha256(
            data["new_password"].encode()
        ).hexdigest()

        cursor.execute(
            """
            UPDATE user_base
            SET password_hash=%s,
                reset_code_hash=NULL,
                reset_code_expires=NULL,
                locked=0
            WHERE username=%s
            """,
            (new_password_hash, data["username"])
        )
        conn.commit()

        # Email Notification
        password_reset_success_html = f"""
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:#ffffff; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.08); overflow:hidden;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background:#1aa251; padding:20px; text-align:center;">
                            <h2 style="margin:0; color:#ffffff; font-weight:600;">
                                Business Essential
                            </h2>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:30px;">
                            <h3 style="margin-top:0; color:#333333;">
                                Password Reset Successful 🎉
                            </h3>

                            <p style="color:#555555; font-size:15px; line-height:1.6;">
                                Your password has been successfully reset.
                            </p>

                            <p style="color:#555555; font-size:15px; line-height:1.6;">
                                You can now log in to your account using your new password.
                            </p>

                            <!-- Login Button -->
                            <div style="text-align:center; margin:30px 0;">
                                <a href="{{LOGIN_URL}}"
                                   style="display:inline-block; padding:12px 26px; background:#1558B0; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:500; font-size:15px;">
                                    Go to Login
                                </a>
                            </div>

                            <p style="color:#777777; font-size:14px; line-height:1.6;">
                                If you did not perform this action, please contact support immediately.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background:#f4f6f8; padding:16px; text-align:center;">
                            <p style="margin:0; color:#888888; font-size:13px;">
                                © {datetime.now().year} Business Essential. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
"""
        send_email(
            recipient=email,
            subject="Business Essential - Password Reset Successful",
            body=password_reset_success_html,
            html=True
        )

        save_security_activity(
            user_id=user_id,
            type_="Password",
            title="Password Reset",
            description="Password updated successfully.",
            severity= "LOW",
            ip_address=get_client_ip()
        )

        return jsonify({
            "status": "success",
            "message": "Password updated successfully"
        }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({
            "status": "error",
            "message": "Database error",
            "details": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/change-password", methods=["POST"])
@token_required
def changepassword(current_user_id, current_user_role):
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid or missing JSON"
        }), 400

    required_fields = ["current_password", "new_password"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({
                "status": "error",
                "message": f"Missing field: {field}"
            }), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT password_hash, email
            FROM user_base
            WHERE user_id=%s
            """,
            (current_user_id,)
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({
                "status": "error",
                "message": "User not found"
            }), 404

        current_password_hash, email = user
        incoming_current_hash = hashlib.sha256(
            data["current_password"].encode()
        ).hexdigest()

        if incoming_current_hash != current_password_hash:
            save_security_activity(
                user_id=current_user_id,
                type_="Password",
                title="Change Password",
                description="Failed. Incorrect current password",
                severity= "MEDIUM",
                ip_address=get_client_ip(request)
            )

            return jsonify({
                "status": "error",
                "message": "Incorrect current password"
            }), 400

        new_password_hash = hashlib.sha256(
            data["new_password"].encode()
        ).hexdigest()

        cursor.execute(
            """
            UPDATE user_base
            SET password_hash=%s
            WHERE user_id=%s
            """,
            (new_password_hash, current_user_id)
        )
        conn.commit()

        # Email Notification
        password_change_html = f"""
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr>
<td align="center">

<table width="100%" cellpadding="0" cellspacing="0"
       style="max-width:600px;background:#ffffff;border-radius:12px;
       overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <tr>
        <td style="background:#111827;padding:24px;text-align:center;">
            <img src="{APP_LOGO_URL}" width="48" height="48"
                 style="display:block;margin:0 auto 8px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;">
                Business Essential
            </h1>
            <p style="margin:4px 0 0;color:#9ca3af;font-size:14px;">
                Security Notification
            </p>
        </td>
    </tr>

    <!-- Content -->
    <tr>
        <td style="padding:32px;color:#111827;">

            <h2 style="margin-top:0;font-size:22px;">
                Password Changed Successfully
            </h2>

            <p style="font-size:15px;line-height:1.7;">
                Hello <strong>{user[1]}</strong>,
            </p>

            <p style="font-size:15px;line-height:1.7;">
                This email confirms that the password for your
                Business Essential account was successfully changed.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0"
                   style="margin:24px 0;background:#f9fafb;
                   border-radius:8px;padding:16px;">
                <tr>
                    <td style="font-size:14px;line-height:1.8;">
                        <strong>Change Details</strong><br>
                        <strong>Date & Time:</strong>
                        {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br>
                        <strong>IP Address:</strong>
                        {get_client_ip()}
                    </td>
                </tr>
            </table>

            <div style="
                background:#fef2f2;
                border-left:4px solid #dc2626;
                padding:16px;
                border-radius:6px;
                margin:24px 0;
            ">
                <p style="margin:0;font-size:14px;color:#991b1b;">
                    <strong>Didn't make this change?</strong><br>
                    If you did not change your password, your account
                    may have been compromised. Secure your account
                    immediately and contact support.
                </p>
            </div>

            <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                    <td align="center">
                        <a href="{SECURITY_URL}"
                           style="
                           background:#2563eb;
                           color:#ffffff;
                           text-decoration:none;
                           padding:12px 20px;
                           border-radius:8px;
                           font-weight:600;
                           display:inline-block;">
                            Review Security Settings
                        </a>
                    </td>
                </tr>
            </table>

            <p style="font-size:14px;color:#6b7280;line-height:1.6;">
                If you have any questions or concerns, please contact
                our support team.
            </p>

            <p style="font-size:14px;color:#6b7280;margin-top:32px;">
                Regards,<br>
                <strong>Business Essential Security Team</strong>
            </p>

        </td>
    </tr>

    <!-- Footer -->
    <tr>
        <td style="
            background:#f9fafb;
            padding:16px;
            text-align:center;
            font-size:12px;
            color:#6b7280;">
            This is an automated security notification.<br>
            © {datetime.now().year} Business Essential.
            All rights reserved.
        </td>
    </tr>

</table>

</td>
</tr>
</table>

</body>
"""
        send_email(
            recipient=email,
            subject="Business Essential - Password Changed Successfully",
            body=password_change_html,
            html=True
        )

    except Exception as e:
        conn.rollback()
        return jsonify({
            "status": "error",
            "message": "Database error",
            "details": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/create_invoice", methods=["POST"])
@token_required
def create_invoice(current_user_id, current_user_role):
    data = request.get_json(force=True) 
    if not data:
        return jsonify({"status": "error", "message": "Invalid JSON"}), 400
    


    conn = get_db()
    cursor = conn.cursor(buffered=True)


    try:
        # Verify user
        cursor.execute(
            "SELECT username, plan, trials_ends_at FROM user_base WHERE user_id=%s",
            (current_user_id,)
        )
        user_info = cursor.fetchone()
        if not user_info:
            return jsonify({"status": "error", "message": "User not found"}), 404

        # Fetch settings 
        cursor.execute(
            """
            SELECT invoice_prefix, next_invoice_number, default_due_date, default_tax_rate, show_tax, show_discount, footer_note
            FROM user_settings
            WHERE user_id=%s
            """,
            (current_user_id,)
        )
        settings = cursor.fetchone()

        tax_rate = 0

        if settings[4]:
            tax_rate = settings[3]
        else: 
            tax_rate = 0

        if not data.get("tax"):
            data["tax"] = tax_rate

        if not data['due_date']:
            default_due_date = settings[2]
            if default_due_date:
                data['due_date'] = (datetime.now() + timedelta(days=default_due_date)).strftime("%Y-%m-%d")
            else:
                data['due_date'] = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        if not data['notes']:
            data['notes'] = settings[6] if settings['footer_note'] else ""
        
        

        client_name = data.get("client_name")
        client_email = data.get("client_email")
        invoice_date = data.get("invoice_date")
        due_date = data.get("due_date")
        items = data.get("items", [])
        notes = data.get("notes", "")
        subtotal = float(data.get("subtotal", 0))
        tax = float(data.get("tax", 0))
        total = float(data.get("total", 0))
        amount_paid = float(data.get("amount_paid", 0))


        invoice_number = generate_invoice_number(current_user_id, settings[0])

        # Validation
        if not all([client_name, client_email, invoice_date, due_date]):
            return jsonify({"status": "error", "message": "Missing required fields"}), 400

        # Calculate balance & status
        balance = max(total - amount_paid, 0)

        if balance <= 0:
            status = "paid"
        elif amount_paid > 0:
            status = "pending"
        else:
            status = "unpaid"


        # Fetch total invoice
        cursor.execute("""
            SELECT COUNT(*)
            FROM invoices
            WHERE user_id=%s
        """, (current_user_id,))
        total_invoices = cursor.fetchone()[0]

        # Update next invoice number
        cursor.execute(
            """

            UPDATE user_settings
            SET next_invoice_number=%s
            WHERE user_id=%s
            """,
            (current_user_id, total_invoices + 1)
        )

        conn.commit()

        if user_info[1] == "trial":
            if total_invoices >= 30:
                return jsonify({
                    "status": "error",
                    "message": "Trial period has ended. Please upgrade your plan."
                }), 400

        # Find or create client (email-based)
        cursor.execute(
            "SELECT id FROM clients WHERE user_id=%s AND client_email=%s",
            (current_user_id, client_email)
        )
        client = cursor.fetchone()

        if client:
            client_id = client[0]
        else:
            cursor.execute(
                """
                INSERT INTO clients (user_id, client_name, client_email)
                VALUES (%s, %s, %s)
                """,
                (current_user_id, client_name, client_email)
            )
            client_id = cursor.lastrowid

        if not client_id:
            return jsonify({"status": "error", "message": "Failed to create or find client"}), 500
        


        # Insert invoice
        cursor.execute(
            """
            INSERT INTO invoices (
                user_id,
                client_id,
                subtotal,
                tax,
                invoice_date,
                due_date,
                note,
                total,
                amount_paid,
                balance,
                status,
                invoice_number
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                current_user_id,
                client_id,
                subtotal,
                tax,
                invoice_date,
                due_date,
                notes,
                total,
                amount_paid,
                balance,
                status,
                invoice_number
            )
        )
        invoice_id = cursor.lastrowid

        # Insert items
        for item in items:
            if not item.get("description"):
                continue

            cursor.execute(
                """
                INSERT INTO invoice_items (invoice_id, description, quantity, price)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    invoice_id,
                    item.get("description"),
                    item.get("quantity", 1),
                    item.get("price", 0)
                )
            )

      

        invoice_prefix= settings[0] if settings else "INV"

        # record to transaction 
        reference = generate_reference(invoice_prefix)
        cursor.execute(
            """
            INSERT INTO transactions
            (user_id,invoice_id,amount,reference,status,paid_at,note)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (current_user_id,invoice_id,amount_paid,reference,status,invoice_date,notes)
        )

        conn.commit()

        if user_info[1] == "basic":
            current_month = datetime.now().month
            cursor.execute(
                """
                SELECT COUNT(*) FROM invoices
                WHERE user_id=%s AND MONTH(created_at)=%s AND YEAR(created_at)=YEAR(NOW())
                """,
                (current_user_id, current_month)
            )
            invoice_count = cursor.fetchone()[0]
            if invoice_count > 100:
                return jsonify({
                    "status": "error",
                    "message": "Invoice limit reached for Basic plan. Please upgrade your plan."
                }), 400 
            
            send_basic_plan_invoice_email(client_email,client_name,invoice_id,invoice_date,due_date,status,subtotal,tax,total,amount_paid, balance, notes,items)
  
        if user_info[1] == "pro":
            send_pro_plan_invoice_email(client_email,client_name,invoice_id,invoice_date,due_date,status,subtotal,tax,total,amount_paid, balance, notes,items)
        
        if user_info[1] == "trial":
            send_basic_plan_invoice_email(client_email,client_name,invoice_id,invoice_date,due_date,status,subtotal,tax,total,amount_paid, balance, notes,items)


        send_notification(
            user_id= current_user_id,
            title="Invoice Created",
            type_="invoice",
            description=f"Invoice #{invoice_id} created for {client_name}",
            amount=total,
            status=status
        )
        cache.delete_memoized(
            get_invoice_list_cached,
            current_user_id
        )
        cache.delete_memoized(
            get_dashboard_data,
            current_user_id,
            current_user_role
        )
        cache.delete_memoized(
            get_clients_page_data,
            current_user_id,
            current_user_role
        )

        cache.delete_memoized(
            get_payment_page_data,
            current_user_id
        )

        return jsonify({
            "status": "success",
            "message": "Invoice created successfully",
            "invoice_id": invoice_id
        }), 201

    except Exception as e:
        conn.rollback()
        traceback.print_exc()
        print("Create invoice error:", e)
        return jsonify({"status": "error", "message": f"Server error: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/invoice/drafts", methods=["POST"])
@token_required
def save_draft(current_user_id, current_user_role):
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Invalid JSON"}), 400

    client_name = data.get("client_name")
    client_email = data.get("client_email")
    invoice_date = data.get("invoice_date")
    due_date = data.get("due_date")
    items = data.get("items", [])
    notes = data.get("notes", "")
    subtotal = float(data.get("subtotal", 0))
    tax = float(data.get("tax", 0))
    total = float(data.get("total", 0))

    if not all([client_name, client_email, invoice_date, due_date]):
        return jsonify({"status": "error", "message": "Missing required fields"}), 400
    
    conn = get_db()
    cursor = conn.cursor(buffered=True)

    try:
        cursor.execute(
            "SELECT username FROM user_base WHERE user_id=%s",
            (current_user_id,)
        )
        if not cursor.fetchone():
            return jsonify({"status": "error", "message": "User not found"}), 404

        for item in items:
            cursor.execute(
                """
                INSERT INTO invoice_drafts (
                    user_id,
                    client_name,
                    client_email,
                    invoice_date,
                    due_date,
                    note,
                    description,
                    quantity,
                    price,
                    subtotal,
                    tax,
                    total
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    current_user_id,
                    client_name,
                    client_email,
                    invoice_date,
                    due_date,
                    notes,
                    item.get("description"),
                    item.get("quantity", 1),
                    item.get("price", 0),
                    subtotal,
                    tax,
                    total
                )
            )

        conn.commit()


        send_notification(
            user_id=current_user_id,
            type_="invoice",
            title="Draft Saved",
            description=f"Draft saved for {client_name}",
            amount=total
        )
        cache.delete_memoized(
            get_dashboard_data,
            current_user_id,
            current_user_role
        )
        cache.delete_memoized(
            get_invoice_drafts_data,
            current_user_id,
            current_user_role
        )

        return jsonify({
            "status": "success",
            "message": "Invoice saved as draft"
        }), 200

    except Exception as e:
        conn.rollback()
        print("Save draft error:", e)
        return jsonify({"status": "error", "message": "Server error"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/invoice/update-edit", methods=["POST"])
@token_required
def update_draft(current_user_id, current_user_role):
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Invalid JSON"}), 400

    invoice_id = data.get("invoice_id")
    client_name = data.get("client_name")
    client_email = data.get("client_email")
    invoice_date = data.get("invoice_date")
    due_date = data.get("due_date")
    items = data.get("items", [])
    notes = data.get("notes", "")
    subtotal = float(data.get("subtotal", 0))
    tax = float(data.get("tax", 0))
    total = float(data.get("total", 0))

    if not all([invoice_id, client_name, client_email, invoice_date, due_date]):
        return jsonify({"status": "error", "message": "Missing required fields"}), 400
    
    conn = get_db()
    cursor = conn.cursor(buffered=True)

    try:
        cursor.execute(
            "SELECT username FROM user_base WHERE user_id=%s",
            (current_user_id,)
        )
        if not cursor.fetchone():
            return jsonify({"status": "error", "message": "User not found"}), 404
        
        cursor.execute(
            "SELECT id FROM clients WHERE user_id=%s AND client_email=%s",
            (current_user_id, client_email)
        )
        client = cursor.fetchone()
        if client:
            client_id = client[0]
        else:
            cursor.execute(
                """
                INSERT INTO clients (user_id, client_name, client_email)
                VALUES (%s, %s, %s)
                """,
                (current_user_id, client_name, client_email)
            )
            client_id = cursor.lastrowid

        cursor.execute(
            """
            UPDATE invoices
            SET client_id=%s,
                invoice_date=%s,
                due_date=%s,
                note=%s,
                subtotal=%s,
                tax=%s,
                total=%s
            WHERE id=%s AND user_id=%s
            """,
            (
                client_id,
                invoice_date,
                due_date,
                notes,
                subtotal,
                tax,
                total,
                invoice_id,
                current_user_id
            )
        )

        cursor.execute(
            """
            DELETE FROM invoice_items
            WHERE invoice_id=%s
            """,
            (invoice_id,)
        )

        for item in items:
            cursor.execute(
                """
                INSERT INTO invoice_items (invoice_id, description, quantity, price)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    invoice_id,
                    item.get("description"),
                    item.get("quantity", 1),
                    item.get("price", 0)
                )
            )

        conn.commit()

        save_log_activity(
            current_user_id,
            "Invoice",
            "Invoice Updated",
            f"Invoice updated for {client_name}",
            total
        )
        cache.delete_memoized(
            get_invoice_list_cached,
            current_user_id
        )
        cache.delete_memoized(
            get_dashboard_data,
            current_user_id,
            current_user_role
        )
        cache.delete_memoized(
            get_payment_page_data,
            current_user_id
        )
        return jsonify({
            "status": "success",
            "message": "Invoice updated"
        }), 200
    except Exception as e:
        conn.rollback()
        print("Update invoice error:", e)
        return jsonify({"status": "error", "message": "Server error"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/invoice/delete/<int:invoice_id>", methods=["DELETE"])
@token_required
def delete_invoice(current_user_id, current_user_role, invoice_id):
    conn = get_db()
    cursor = conn.cursor(buffered=True)

    try:
        cursor.execute(
            "SELECT id FROM invoices WHERE id=%s AND user_id=%s",
            (invoice_id, current_user_id)
        )
        if not cursor.fetchone():
            return jsonify({"status": "error", "message": "Invoice not found"}), 404

        cursor.execute(
            "DELETE FROM invoice_items WHERE invoice_id=%s",
            (invoice_id,)
        )

        cursor.execute(
            "DELETE FROM invoices WHERE id=%s",
            (invoice_id,)
        )

        cursor.execute(
            "DELETE FROM transactions WHERE invoice_id=%s",
            (invoice_id,)
        )

        conn.commit()

        save_log_activity(
            current_user_id,
            "Invoice",
            "Deleted",
            f"Invoice #{invoice_id} deleted"
        )
        cache.delete_memoized(
            get_invoice_list_cached,
            current_user_id
        )
        cache.delete_memoized(
            get_dashboard_data,
            current_user_id,
            current_user_role
        )
        cache.delete_memoized(
            get_payment_page_data,
            current_user_id
        )
        return jsonify({
            "status": "success",
            "message": "Invoice deleted"
        }), 200

    except Exception as e:
        conn.rollback()
        print("Delete invoice error:", e)
        return jsonify({"status": "error", "message": "Server error"}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/invoices/draft/delete/<int:draft_id>", methods=["DELETE"])
@token_required
def delete_draft(current_user_id, current_user_role, draft_id):
    conn = get_db()
    cursor = conn.cursor(buffered=True)

    try:
        cursor.execute(
            "SELECT id FROM invoice_drafts WHERE id=%s AND user_id=%s",
            (draft_id, current_user_id)
        )
        if not cursor.fetchone():
            return jsonify({"status": "error", "message": "Draft not found"}), 404

        cursor.execute(
            "DELETE FROM invoice_drafts WHERE id=%s",
            (draft_id,)
        )

        conn.commit()

        save_log_activity(
            current_user_id,
            "draft",
            "Deleted",
            f"Draft #{draft_id} deleted"
        )
        cache.delete_memoized(
            get_dashboard_data,
            current_user_id,
            current_user_role
        )
        cache.delete_memoized(
            get_invoice_drafts_data,
            current_user_id,
            current_user_role
        )
        return jsonify({
            "status": "success",
            "message": "Draft deleted"
        }), 200

    except Exception as e:
        conn.rollback()
        print("Delete draft error:", e)
        return jsonify({"status": "error", "message": "Server error"}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/invoice/draft/update-edit", methods=["POST"])
@token_required
def update_edit_draft(current_user_id, current_user_role):
    data = request.get_json()
    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid JSON "
        }), 400
    
    conn = get_db()
    cursor = conn.cursor(buffered=True)
    try:
        draft_id = data.get("draft_id")
        client_name = data.get("client_name")
        client_email = data.get("client_email")
        invoice_date = data.get("invoice_date")
        due_date = data.get("due_date")
        items = data.get("items", [])
        notes = data.get("notes", "")
        subtotal = float(data.get("subtotal", 0))
        tax = float(data.get("tax", 0))
        total = float(data.get("total", 0))

        if not all([draft_id, client_name, client_email, invoice_date, due_date]):
            return jsonify({
                "status": "error",
                "message": "Missing required fields"
            }), 400

        cursor.execute(
            "SELECT id FROM invoice_drafts WHERE id=%s AND user_id=%s",
            (draft_id, current_user_id)
        )
        if not cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": "Draft not found"
            }), 404
        for item in items:
            cursor.execute(
            """
            UPDATE invoice_drafts
            SET client_name=%s,
                client_email=%s,
                invoice_date=%s,
                due_date=%s,
                note=%s,
                subtotal=%s,
                tax=%s,
                total=%s,
                description=%s,
                quantity=%s,
                price=%s
            WHERE id=%s AND user_id=%s
            """,
            (
                client_name,
                client_email,
                invoice_date,
                due_date,
                notes,
                subtotal,
                tax,
                total,
                item.get("description"),
                item.get("quantity", 1),
                item.get("price", 0),
                draft_id,

                current_user_id
            )
        )

            conn.commit()

        save_log_activity(
            current_user_id,
            "draft",
            "Draft Updated",
            f"Draft #{draft_id} updated for {client_name}",
            total
        )
        cache.delete_memoized(
            get_dashboard_data,
            current_user_id,
            current_user_role
        )
        cache.delete_memoized(
            get_invoice_drafts_data,
            current_user_id,
            current_user_role
        )

        return jsonify({
            "status": "success",
            "message": "Draft updated"
        }), 200

    except Exception as e:
        conn.rollback()
        print("Update draft error:", e)
        return jsonify({"status": "error", "message": "Server error"}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/clients/add", methods=["POST"])
@token_required
def add_client(current_user_id, current_user_role):
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Invalid JSON"}), 400
    
    conn = get_db()
    cursor = conn.cursor(buffered=True)

    try:
        client_name = data.get("name")
        client_email = data.get("email")
        client_phone = data.get("phone")
        client_company = data.get("company")
        client_notes = data.get("notes", "")

        if not client_name or not client_email:
            return jsonify({"status": "error", "message": "Name and email are required"}), 400

        cursor.execute(
            """
            SELECT id FROM clients WHERE client_email=%s AND user_id=%s
            """,
            (client_email, current_user_id)
        )
        if cursor.fetchone():
            return jsonify({"status": "error", "message": "Client with this email already exists"}), 400

        cursor.execute(
            """
            INSERT INTO clients (user_id, client_name, client_email, client_phone, client_company, client_notes)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (current_user_id, client_name, client_email, client_phone, client_company, client_notes)
        )
        conn.commit()

        save_log_activity(
            current_user_id,
            "client",
            "Added",
            f"Client {client_name} added"
        )
        cache.delete_memoized(
            get_dashboard_data,
            current_user_id,
            current_user_role
        )
        cache.delete_memoized(
            get_clients_page_data,
            current_user_id,
            current_user_role
        )

        return jsonify({
            "status": "success",
            "message": "Client added successfully"
        }), 201
    except Exception as e:
        conn.rollback()
        print("Add client error:", e)
        return jsonify({"status": "error", "message": "Server error"}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/client/update-edit", methods=["POST"])
@token_required
def update_client(current_user_id, current_user_role):
    data = request.get_json()
    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid JSON."
        }), 401

    conn = get_db()
    cursor = conn.cursor(buffered=True)

    try:
        id = data.get("id")
        client_name = data.get("name")
        client_email = data.get("email")
        client_phone = data.get("phone")
        client_address = data.get("address")
        client_company = data.get("company")
        client_notes = data.get("notes", "")

        if not client_name or not client_email:
            return jsonify({"status": "error", "message": "Name and email are required"}), 400
        
        cursor.execute(
            """
            UPDATE clients
            SET client_name=%s,
                client_email=%s,
                client_phone=%s,
                client_address=%s,
                client_company=%s,
                client_notes=%s
            WHERE user_id=%s AND id=%s
            """,
            (client_name,
             client_email,
             client_phone,
             client_address,
             client_company,
             client_notes,
             current_user_id,
             id
            )
        )
        conn.commit()

        save_log_activity(
            current_user_id,
            "client",
            "Update",
            f"Updated client {client_name}"
        )

        cache.delete_memoized(
            get_clients_page_data,
                current_user_id,
            current_user_role
        )

        return jsonify({
            "status": "success",
            "message": "Client edited successfully"
        }), 201
    except Exception as e:
        conn.rollback()
        print("Add client error:", e)
        return jsonify({"status": "error", "message": "Server error"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/client/delete/<int:client_id>", methods=["DELETE"])
@token_required
def delete_client(current_user_id, current_user_role, client_id):
    conn = get_db()
    cursor = conn.cursor(buffered=True)

    try:
        cursor.execute(
            "SELECT client_name FROM clients WHERE id=%s AND user_id=%s",
            (client_id, current_user_id)
        )
        client = cursor.fetchone()
        if not client:
            return jsonify({"status": "error", "message": "Client not found"}), 404

        # delete invoices linked to client
        cursor.execute(
            "SELECT id FROM invoices WHERE client_id=%s AND user_id=%s",
            (client_id, current_user_id)
        )
        invoices = cursor.fetchall()
        for invoice in invoices:
            invoice_id = invoice[0]
            cursor.execute(
                "DELETE FROM invoice_items WHERE invoice_id=%s",
                (invoice_id,)
            )
            cursor.execute(
                "DELETE FROM invoices WHERE id=%s",
                (invoice_id,)
            )


        cursor.execute(
            "DELETE FROM clients WHERE id=%s",
            (client_id,)
        )

        conn.commit()

        save_log_activity(
            current_user_id,
            "client",
            "Deleted",
            f"Deleted client {client[0]}"
        )
        cache.delete_memoized(
            get_clients_page_data,
            current_user_id,
            current_user_role
        )

        return jsonify({
            "status": "success",
            "message": "Client deleted"
        }), 200

    except Exception as e:
        conn.rollback()
        print("Delete client error:", e)
        return jsonify({"status": "error", "message": "Server error"}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/logout-session/<int:session_id>", methods=["DELETE"])
@token_required
def logout_session(current_user, session_id):

    with db_cursor() as (_, cursor):

        cursor.execute("""
            DELETE FROM user_sessions
            WHERE id=%s
            AND user_id=%s
        """, (
            session_id,
            current_user["user_id"]
        ))

    return jsonify({
        "status": "success"
    }), 200
    

@app.route("/logout-all-other-devices", methods=["POST"])
@token_required
def logout_all_other_devices(current_user):

    current_token = session.get("session_token")

    if not current_token:
        return jsonify({
            "status": "error",
            "message": "Session token missing"
        }), 400

    with db_cursor() as (_, cursor):

        cursor.execute("""
            DELETE FROM user_sessions
            WHERE user_id=%s
            AND session_token != %s
        """, (
            current_user["user_id"],
            current_token
        ))

    return jsonify({
        "status": "success"
    }), 200

ALLOWED_SETTINGS = {
    "invoice_prefix": "invoice_prefix",
    "next_invoice_number": "next_invoice_number",
    "default_due_date": "default_due_date",
    "default_tax_rate": "default_tax_rate",
    "show_tax": "show_tax",
    "show_discount": "show_discount",
    "footer_note": "footer_note",

    "currency": "currency",
    "currency_symbol": "currency_symbol",
    "timezone": "timezone",
    "date_format": "date_format",

    "email_notifications": "email_notifications",
    "due_date_reminder": "due_date_reminder",
    "reminder_days_before": "reminder_days_before",

    "theme": "theme",
    "language": "language",

    "auto_logout_on_inactivity": "auto_logout_on_inactivity",
    "auto_logout_minutes": "auto_logout_minutes",
    "require_pin_for_delete": "require_pin_for_delete"
}


@app.route("/update/settings", methods=["POST"])
@token_required
def update_settings(current_user_id, current_user_role):

    if not request.is_json:
        return jsonify({"status": "error", "message": "Invalid JSON"}), 400

    data = request.get_json()

    key = data.get("key")
    value = data.get("value")

    if not key or key not in ALLOWED_SETTINGS:
        return jsonify({
            "status": "error",
            "message": "Invalid setting key"
        }), 400

    column = ALLOWED_SETTINGS[key]

    conn = get_db()
    cursor = conn.cursor(buffered=True)

    try:
        cursor.execute(
            f"""
            UPDATE user_settings
            SET {column} = %s,
                updated_at = NOW()
            WHERE user_id = %s
            """,
            (value, current_user_id)
        )
        conn.commit()

    except Exception as e:
        conn.rollback()
        return jsonify({
            "status": "error",
            "message": "Failed to update setting"
        }), 500
    finally:
        cursor.close()
        conn.close()

    save_log_activity(
        current_user_id,
        "account",
        "Update Settings",
        f"Upated {column} successfully"
    )
    return jsonify({
        "status": "success",
        "key": key,
        "value": value
    }), 200




@app.route("/submit-feedback", methods=["POST"])
@token_required
def submit_feedback(current_user_id, current_user_role):

    feedback_type = request.form.get("feedback_type", "general")
    rating = request.form.get("rating")
    subject = request.form.get("subject")
    message = request.form.get("message")
    notify_me = request.form.get("notify_me") == "on"

    attachment_url = None

    # ================= FILE UPLOAD =================
    if "attachment" in request.files:

        file = request.files["attachment"]

        if file and file.filename:

            try:
                allowed_extensions = {
                    "png", "jpg", "jpeg",
                    "pdf", "doc", "docx"
                }

                filename = file.filename.lower()
                extension = filename.rsplit(".", 1)[-1]

                if extension not in allowed_extensions:
                    return jsonify({
                        "status": "error",
                        "message": "Invalid file type"
                    }), 400

                image_extensions = {"png", "jpg", "jpeg"}

                public_id = f"user_{current_user_id}_{int(time.time())}"

                if extension in image_extensions:

                    result = cloudinary.uploader.upload(
                        file,
                        folder="feedback_attachments/images",
                        transformation=[
                            {
                                "width": 1200,
                                "crop": "limit",
                                "quality": "auto"
                            }
                        ],
                        public_id=public_id,
                        resource_type="image"
                    )

                else:

                    result = cloudinary.uploader.upload(
                        file,
                        folder="feedback_attachments/documents",
                        public_id=public_id,
                        resource_type="raw"
                    )

                attachment_url = result.get("secure_url")

            except Exception as e:

                print("Cloudinary upload error:", str(e))

                return jsonify({
                    "status": "error",
                    "message": "Unable to upload file. Please try again."
                }), 500

    # ================= DB =================
    with db_cursor() as (_, cursor):

        cursor.execute("""
            INSERT INTO feedback
            (
                user_id,
                feedback_type,
                rating,
                subject,
                message,
                attachment,
                notify_me
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s)
        """, (
            current_user_id,
            feedback_type,
            rating,
            subject,
            message,
            attachment_url,
            notify_me
        ))

    return jsonify({
        "status": "success",
        "message": "Feedback submitted successfully"
    })

@app.route("/api/support/ticket", methods=["POST"])
@token_required
def create_support_ticket(current_user_id, current_user_role):

    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid JSON"
        }), 400

    category = data.get("category")
    subject = data.get("subject")
    message = data.get("message")

    if not all([category, subject, message]):
        return jsonify({
            "status": "error",
            "message": "All fields are required"
        }), 400

    with db_cursor() as (_, cursor):

        cursor.execute("""
            INSERT INTO support_tickets
            (user_id, category, subject, message)
            VALUES (%s,%s,%s,%s)
        """, (
            current_user_id,
            category,
            subject,
            message
        ))

    return jsonify({
        "status": "success",
        "message": "Support ticket submitted"
    }), 200

@app.route("/account/delete", methods=["DELETE"])
@token_required
def delete_account(current_user_id,current_user_role):
    data = request.get_json()
    if not data:
        return jsonify({
            "status":"error",
            "message":"Invalid JSON"
        }), 400 

    reason = data.get("reason")
    feedback = data.get("feedback")
    password = data.get("password")

    if not password:
        return jsonify({
            "status": "error",
            "message": "Password required."
        }), 400


    conn = get_db()
    cursor = conn.cursor(buffered=True, dictionary=True)

    try:
        cursor.execute("""
            SELECT password_hash, email, username
            FROM user_base
            WHERE user_id = %s
        """, (current_user_id,))

        user = cursor.fetchone()

        hashed = hashlib.sha256(password.encode()).hexdigest()
        if hashed != user["password_hash"]:
            return jsonify({
                "status": "error",
                "message": "Incorrect password."
            }), 401

        cursor.execute("""
            INSERT INTO closed_accounts
            (
                user_id,
                reason,
                feedback,
                closed_at
            )
            VALUES (%s,%s,%s,NOW())
        """, (
            current_user_id,
            reason,
            feedback
        ))
        

        cursor.execute(
            """
            DELETE FROM cust_base WHERE user_id=%s
            """,
            (current_user_id,)
        )

        cursor.execute(
            """
            DELETE FROM user_settings  WHERE user_id=%s
            """,
            (current_user_id,)
        )

        cursor.execute(
            """
            DELETE FROM user_sessions  WHERE user_id=%s
            """,
            (current_user_id,)
        )

        cursor.execute(
            """
            DELETE FROM wallet_base  WHERE user_id=%s
            """,
            (current_user_id,)
        )

        cursor.execute(
            """
            DELETE FROM security_activity  WHERE user_id=%s
            """,
            (current_user_id,)
        )

        cursor.execute(
            """
            DELETE FROM log_activity  WHERE user_id=%s
            """,
            (current_user_id,)
        )

        cursor.execute(
            """
            DELETE FROM clients  WHERE user_id=%s
            """,
            (current_user_id,)
        )

        cursor.execute(
            """
            SELECT id FROM invoices WHERE user_id=%s
            """,
            (current_user_id,)
        )
        invoices = cursor.fetchall()
        for i in invoices:
            cursor.execute(
                 """
                DELETE FROM invoice_items WHERE invoice_id=%s
                """,
                (i[0],)
            )
        cursor.execute(
            """
            DELETE FROM invoices  WHERE user_id=%s
            """,
            (current_user_id,)
        )

        cursor.execute(
            """
            DELETE FROM transactions  WHERE user_id=%s
            """,
            (current_user_id,)
        )

        cursor.execute(
            """
            DELETE FROM invoice_drafts  WHERE user_id=%s
            """,
            (current_user_id,)
        )

        cursor.execute(
            """
            DELETE FROM support_tickets  WHERE user_id=%s
            """,
            (current_user_id,)
        )

        cursor.execute(
            """
            DELETE FROM subscriptions  WHERE user_id=%s
            """,
            (current_user_id,)
        )

        cursor.execute(
            """
            DELETE FROM referrals  WHERE user_id=%s
            """,
            (current_user_id,)
        )

        cursor.execute(
            """
            DELETE FROM user_subscriptions  WHERE user_id=%s
            """,
            (current_user_id,)
        )

        cursor.execute(
            """
            DELETE FROM feedback  WHERE user_id=%s
            """,
            (current_user_id,)
        )

        cursor.execute(
            """
            DELETE FROM support_chat_messages  WHERE user_id=%s
            """,
            (current_user_id,)
        )
        
        conn.commit()
        response = jsonify({
            "status": "success",
            "message": "Account closed successfully."
        })

        # REMOVE AUTH COOKIE
        response.delete_cookie("access_token")
    except Exception as e:
        conn.rollback()
        print("Delete account error:", e)
        return jsonify({
            "status": "error",
            "message": "Server error. Please try again later."
        }), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/mark-notifications-read", methods=["POST"])
@token_required
def mark_notifications_as_read(current_user_id, current_user_role):

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Invalid JSON"
        }), 400

    notification_id = data.get("notification_id")

    if not notification_id:
        return jsonify({
            "success": False,
            "message": "Notification ID is required"
        }), 400

    with db_cursor() as (_, cursor):

        cursor.execute("""
            UPDATE log_activity
            SET is_read = TRUE
            WHERE id = %s
            AND user_id = %s
        """, (
            notification_id,
            current_user_id
        ))
        cache.delete_memoized(
            get_dashboard_data,
            current_user_id,
            current_user_role
        )
    return jsonify({
        "success": True,
        "message": "Notification marked as read"
    })


@app.route("/profile/update-edit", methods=["POST"])
@token_required
def update_profile(current_user_id,current_user_role):
    data = request.get_json()
    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid JSON"
        }), 400

    required_data = ["fullname", "profilename", "address", "alternateemail", "phone", "website", "bio", "country", "username"]
    
    for field in required_data:
        if field not in data or not data[field].strip():
            return jsonify({
                "status": "error",
                "message": f"{field.replace('_', ' ').title()} is required"
            }), 400

    conn = get_db()
    cursor = conn.cursor(buffered=True)
    try:
        cursor.execute(
            """
            SELECT 1 
            FROM cust_base
            WHERE user_id=%s
            """,
            (current_user_id,)
        )
        profile = cursor.fetchone()
        if profile:
            cursor.execute(
                """
                UPDATE cust_base
                SET fullname=%s,
                    profilename=%s,
                    address=%s,
                    alternateemail=%s,
                    phone=%s,
                    website=%s,
                    bio=%s,
                    country=%s
                WHERE user_id=%s
                """,
                (data['fullname'],
                data['profilename'],
                data['address'],
                data['alternateemail'],
                data['phone'],
                data['website'],
                data['bio'],
                data['country'],
                current_user_id)
            )

        else:
            cursor.execute(
                """
                INSERT INTO cust_base
                (user_id,fullname,profilename,address,alternateemail,phone,website,bio,country,currency)
                VALUES(%s ,%s ,%s ,%s ,%s ,%s ,%s ,%s ,%s ,%s)
                """,
                (   
                    current_user_id,
                    data['fullname'],
                    data['profilename'],
                    data['address'],
                    data['alternateemail'],
                    data['phone'],
                    data['website'],
                    data['bio'],
                    data['country'],
                    "NGN"
                )
            )


    

        cursor.execute(
            "UPDATE user_base SET username=%s WHERE user_id=%s",
            (data['username'], current_user_id)
        )

        conn.commit()
        send_notification(
            current_user_id,
            "account",
            "Profile Updated",
            f"Updated profile info for {data['fullname']}"
        )
        cache.delete_memoized(
            get_dashboard_data,
            current_user_id,
            current_user_role
        )

        return jsonify({
            "status": "success",
            "message": "Profile updated successfully"
        }), 200
    except Exception as e:
        conn.rollback()
        print("Update profile error:", e)
        return jsonify({
            "status": "error",
            "message": "Server error. Please try again later."
        }), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/profile/update/pic", methods=["POST"])
@token_required
def change_profile_pic(current_user_id, current_user_role):
    file = request.files.get("profile_picture")  # Make sure your input type="file"
    if file:
        try:
            result = cloudinary.uploader.upload(
            file,
            folder="profile_images",
            transformation = [
                {"width":300, "height":300, "crop":"fill"}
            ],
            public_id = f"user_{current_user_id}",
            overwrite= True
         )
            save_path = result['secure_url']
        except Exception as e:
            print("Cloudinary upload error:", str(e))

            return jsonify({
            "success": False,
            "message": "Unable to upload file. Please try again."
        }), 500

    conn = get_db()
    cursor = conn.cursor(buffered=True)
    try:
        cursor.execute(
            """
            SELECT id 
            FROM cust_base
            WHERE user_id=%s
            """,
            (current_user_id,)
        )
        profile = cursor.fetchone()
        if profile:
            cursor.execute(
                """
                UPDATE cust_base
                SET profilepicurl=%s
                WHERE user_id=%s
                """,
                (save_path,current_user_id)
            )

            conn.commit()
        else:
            cursor.execute(
                """
                INSERT INTO cust_base (user_id,profilepicurl)
                VALUES(%s, %s)
                """,
                (current_user_id,save_path)
            )
            conn.commit()

        send_notification(
            current_user_id,
            "account",
            "Profile Updated",
            "Profile picture changed"
        )
        cache.delete_memoized(
            get_dashboard_data,
            current_user_id,
            current_user_role
        )

        return jsonify({
            "success": True,
            "message": "Profile Pic updated successfully."
        }), 200
    except Exception as e:
        conn.rollback()
        print("Update profile pic error:", e)
        return jsonify({
            "success": False,
            "message": "Server error. Please try again later."
        }), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/billing/<string:plan>/<int:amount>/<int:user_id>", methods=["GET"])
@token_required
def pay_page(current_user_id,current_user_role,plan,amount,user_id):
    if current_user_id != user_id:
        redirect("/login")
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT email
        FROM user_base
        WHERE user_id=%s
        """,
        (user_id,)
    )
    email = cursor.fetchone()['email']
    cursor.close()
    conn.close()
    return render_template(
        "users/pay.html",
        plan=plan.upper(),
        amount=f'{amount:,.2f}',
        email=email,
        user_id=user_id
    )

import requests
from dateutil.relativedelta import relativedelta

@app.route('/api/setup-2fa', methods=['POST'])
@token_required
def setup_2fa(current_user_id, current_user_role):

    try:

        with db_cursor(dictionary=True) as (conn, cursor):

            cursor.execute("""
                SELECT
                    username,
                    email,
                    two_factor_secret
                FROM user_base
                WHERE user_id=%s
                LIMIT 1
            """, (current_user_id,))

            user = cursor.fetchone()

            if not user:
                return jsonify({
                    "status": "error",
                    "message": "User not found."
                }), 404

            # Reuse existing secret if one already exists
            secret = (
                user["two_factor_secret"]
                or pyotp.random_base32()
            )

            totp = pyotp.TOTP(secret)

            label = (
                user.get("email")
                or user.get("username")
                or f"user-{current_user_id}"
            )

            uri = totp.provisioning_uri(
                name=label,
                issuer_name="Business Essential"
            )

            qr = qrcode.make(uri)

            buffer = io.BytesIO()

            qr.save(
                buffer,
                format="PNG"
            )

            qr_base64 = base64.b64encode(
                buffer.getvalue()
            ).decode()

            cursor.execute("""
                UPDATE user_base
                SET two_factor_secret=%s, qr=%s
                WHERE user_id=%s
            """, (
                secret,
                qr_base64,
                current_user_id
            ))

            save_security_activity(
                current_user_id,
                "account",
                "2FA Setup",
                f"User {current_user_id} generated a new 2FA setup QR code",
                "LOW",
                request.remote_addr
            )

            return jsonify({
                "status": "success",
                "secret": secret,
                "qr_code": qr_base64
            })

    except Exception as e:

        print("2FA setup error:", e)

        return jsonify({
            "status": "error",
            "message": "Failed to setup 2FA."
        }), 500

        

@app.route('/setup/verify-2fa', methods=['POST'])
@token_required
def verify_2fa(current_user_id, current_user_role):

    try:

        data = request.get_json() or {}
        code = data.get('code', '').strip()

        if not code:
            return jsonify({
                "status": "error",
                "message": "Verification code is required."
            }), 400

        with db_cursor(dictionary=True) as (conn, cursor):

            cursor.execute(
                """
                SELECT
                    user_id,
                    role,
                    two_factor_secret
                FROM user_base
                WHERE user_id=%s
                LIMIT 1
                """,
                (current_user_id,)
            )

            user = cursor.fetchone()

            if not user:
                return jsonify({
                    "status": "error",
                    "message": "User not found."
                }), 404

            if not user.get("two_factor_secret"):
                return jsonify({
                    "status": "error",
                    "message": "2FA is not configured."
                }), 400

            totp = pyotp.TOTP(
                user["two_factor_secret"]
            )

            if not totp.verify(code):

                _ip_address = request.remote_addr

                save_security_activity(
                    current_user_id,
                    "account",
                    "2FA Verification Failed",
                    f"User {current_user_id} entered an invalid 2FA code from {_ip_address}",
                    "MEDIUM",
                    _ip_address
                )

                return jsonify({
                    "status": "error",
                    "message": "Invalid verification code."
                }), 401

            _ip_address = request.remote_addr

            save_security_activity(
                current_user_id,
                "account",
                "2FA Verification Success",
                f"User {current_user_id} successfully completed 2FA from {_ip_address}",
                "LOW",
                _ip_address
            )

            cursor.execute("""
                UPDATE user_base
                SET two_factor_enabled = TRUE
                WHERE user_id = %s
            """, (current_user_id,))

            return jsonify({
                "status": "success",
                "message": "2FA verification successful."
            }), 200

    except Exception as e:

        print("2FA verification error:", e)

        return jsonify({
            "status": "error",
            "message": "An unexpected error occurred."
        }), 500

@app.route("/disable-2fa", methods=["POST"])
@token_required
def disable_2fa(current_user_id, current_user_role):

    try:

        with db_cursor(dictionary=True) as (conn, cursor):

            cursor.execute("""
                SELECT username, role
                FROM user_base
                WHERE user_id=%s
                LIMIT 1
            """, (current_user_id,))

            user = cursor.fetchone()

            if not user:
                return jsonify({
                    "status": "error",
                    "message": "User not found"
                }), 404

            cursor.execute("""
                UPDATE user_base
                SET
                    two_factor_secret=NULL,
                    qr=NULL,
                    two_factor_enabled=FALSE
                WHERE user_id=%s
            """, (current_user_id,))

        ip_address = request.remote_addr

        save_security_activity(
            current_user_id,
            "account",
            "2FA Disabled",
            f"User '{current_user_id}' disabled two-factor authentication from {ip_address}",
            "MEDIUM",
            ip_address
        )

        return jsonify({
            "status": "success",
            "message": "Two-factor authentication disabled successfully."
        }), 200

    except Exception as e:

        print("Disable 2FA Error:", e)

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/verify-2fa', methods=['POST'])
def login_verify_2fa():

    try:

        user_id = session.get('pending_user_id')

        if not user_id:
            return jsonify({
                "success": False,
                "message": "Session expired"
            }), 401

        data = request.get_json() or {}

        code = data.get('code', '').strip()

        if not code:
            return jsonify({
                "success": False,
                "message": "Verification code is required"
            }), 400

        with db_cursor(dictionary=True) as (conn, cursor):

            cursor.execute(
                """
                SELECT *
                FROM user_base
                WHERE user_id=%s
                LIMIT 1
                """,
                (user_id,)
            )

            user = cursor.fetchone()

            if not user:
                return jsonify({
                    "success": False,
                    "message": "User not found"
                }), 404

            if not user.get("two_factor_secret"):
                return jsonify({
                    "success": False,
                    "message": "2FA is not configured"
                }), 400

            totp = pyotp.TOTP(
                user['two_factor_secret']
            )

            if not totp.verify(code):

                return jsonify({
                    "success": False,
                    "message": "Invalid code"
                }), 401

            payload = {
                "user_id": user['user_id'],
                "role": user['role'],
                "exp": datetime.utcnow() + timedelta(hours=24)
            }

            token = jwt.encode(
                payload,
                SECRET_KEY,
                algorithm="HS256"
            )

        session.pop('pending_user_id', None)

        ip_address = request.remote_addr

        try:

            save_security_activity(
                user_id=user['user_id'],
                type_="account",
                title="2FA Success",
                description=(
                    f"User '{user['user_id']}' "
                    f"successfully completed 2FA "
                    f"from {ip_address}"
                ),
                severity="LOW",
                ip_address=ip_address
            )

        except Exception as log_error:
            print("Activity log error:", log_error)

        response = make_response(jsonify({
            "success": True,
            "status": "success",
            "message": "2FA verification successful",
            "role": user["role"]
        }))

        response.set_cookie(
            "access_token",
            token,
            httponly=True,
            secure=True,  
            samesite="Lax",
            max_age=60 * 60 * 24 * 7
        )

        return response, 200

    except Exception as e:

        print("2FA Verification Error:", e)

        return jsonify({
            "success": False,
            "message": "An unexpected error occurred"
        }), 500

@app.route("/payment/callback")
@token_required
def payment_callback(current_user_id, current_user_role):

    reference = request.args.get("reference")

    if not reference:
        return redirect("/billing")

    return redirect(
        f"/payment/success?ref={reference}"
    )


@app.route("/payment/initialize", methods=["POST"])
@token_required
def initialize_payment(current_user_id, current_user_role):

    print("STEP 1 → Route entered")

    try:

        data = request.get_json()

        print("STEP 2 → JSON received:", data)

        if not data:
            return jsonify({
                "status": "error",
                "message": "Invalid JSON"
            }), 400


        amount = data.get("amount")
        plan = data.get("plan")

        print("STEP 3 → Amount:", amount)
        print("STEP 4 → Plan:", plan)

        if not amount:
            return jsonify({
                "status": "error",
                "message": "Amount required"
            }), 400


        print("STEP 5 → Opening DB")

        with db_cursor(dictionary=True) as (conn, cursor):

            print("STEP 6 → DB Connected")

            cursor.execute("""
                SELECT email
                FROM user_base
                WHERE user_id=%s
            """, (current_user_id,))

            print("STEP 7 → Query executed")

            current_user = cursor.fetchone()

            print("STEP 8 → User fetched:", current_user)

            if not current_user:
                return jsonify({
                    "status": "error",
                    "message": "User not found"
                }), 404


            payload = {
                "email": current_user["email"],

                "amount": int(float(amount)) * 100,

                "callback_url":
                "https://businessessentia.net/payment/callback",

                "metadata": {
                    "user_id": current_user_id,
                    "plan": plan
                }
            }

            print("STEP 9 → Payload ready")

            headers = {
                "Authorization":
                f"Bearer {PAYSTACK_SECRET}",

                "Content-Type":
                "application/json"
            }
            print("STEP 10 → Calling Paystack")

            print("REQUESTS MODULE:", requests)
            print("REQUESTS FILE:", requests.__file__)

            response = http_requests.post(
                "https://api.paystack.co/transaction/initialize",
                json=payload,
                headers=headers,
                timeout=30
            )

            print("STEP 11 → Paystack responded")

            result = response.json()

            print("STEP 12 → Result:", result)

            if not result.get("status"):

                return jsonify({
                    "status": "error",
                    "message":
                    result.get(
                        "message",
                        "Initialization failed"
                    )
                }), 400


            print("STEP 13 → Returning success")

            return jsonify({
                "status": "success",

                "authorization_url":
                result["data"]["authorization_url"],

                "reference":
                result["data"]["reference"]
            }), 200


    except Exception as e:

        print("PAYMENT ERROR:")
        print(type(e))
        print(str(e))

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
        
@app.route("/payment/webhook",methods=["POST"])
def payment_webhook():

    payload = request.get_json()

    event = payload["event"]

    if event != "charge.success":

        return "",200


    payment = payload["data"]

    reference = payment["reference"]

    metadata = payment["metadata"]

    user_id = metadata["user_id"]

    plan = metadata["plan"]

    conn = get_db()

    cursor = conn.cursor()

    try:

        # prevent duplicates

        cursor.execute("""
        SELECT id
        FROM user_subscriptions
        WHERE reference=%s
        """,
        (reference,)
        )

        existing = cursor.fetchone()

        if existing:

            return "",200


        expires =datetime.utcnow()+relativedelta(months=1)


        cursor.execute("""
        UPDATE user_base
        SET plan=%s, plan_expiration=%s
        WHERE user_id=%s
        """,
        (
            plan,
            expires,
            user_id
        )
        )


        cursor.execute("""
        INSERT INTO user_subscriptions(
            user_id,
            plan,
            reference,
            status,
            expires_at
        )

        VALUES(
            %s,
            %s,
            %s,
            'active',
            %s
        )
        """,
        (
            user_id,
            plan,
            reference,
            expires
        )
        )

        conn.commit()

        return "",200

    finally:

        cursor.close()

        conn.close()

@app.route(
"/payment/status/<reference>"
)
def payment_status(
reference
):

    with db_cursor(dictionary=True) as (conn, cursor):
        cursor.execute("""
            SELECT status
            FROM user_subscriptions
            WHERE reference=%s
        """,
            (reference,)
        )

        row= cursor.fetchone()

        return jsonify({
            "active":
            bool(row)
        }) , 200
        
if __name__ == "__main__":

    socketio.run(
        app,
        debug=True
    )

