import os 
import json
from datetime import datetime, time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import smtplib
import requests
import traceback
from typing import Optional
from functools import wraps
from flask import session, redirect, request, jsonify
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import mysql.connector
from user_agents import parse
import jwt
from dotenv import load_dotenv
from typing import Optional
from backend.extentions import socketio
import base64
from mysql.connector.pooling import MySQLConnectionPool
import hashlib
from requests.adapters import HTTPAdapter
from urllib3.poolmanager import PoolManager
import ssl


load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")


db_pool = MySQLConnectionPool(
    pool_name="business_pool",
    pool_size=20,
    host= os.getenv("DBHOST"),
    user= os.getenv("DBUSER"),
    password = os.getenv("DBPASS"),
    database = os.getenv("DB"),
    port= os.getenv("DBPORT")
)

def get_db():
    return db_pool.get_connection()


def get_user_id(username):
    conn = None
    cursor = None

    try:
        conn = get_db()
        cursor = conn.cursor(buffered=True)

        cursor.execute(
            "SELECT user_id, username FROM user_base WHERE username=%s",
            (username,)
        )

        user = cursor.fetchone()

        if not user:
            return None

        return user[0]

    except Exception as e:
        print(f"Failed to get user id: {e}")
        return None

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            
def token_required(f):

    @wraps(f)
    def decorated(*args, **kwargs):

        print("TOKEN 1")

        token = request.cookies.get("access_token")

        print("TOKEN 2", token is not None)

        if not token:

            auth_header = request.headers.get(
                "Authorization"
            )

            print("TOKEN 3")

            if auth_header:

                try:

                    scheme, token = (
                        auth_header.split(" ")
                    )

                    print("TOKEN 4")

                except Exception as e:

                    print("AUTH SPLIT ERROR", e)

                    raise


        if not token:

            print("TOKEN 5")

            return jsonify({
                "message":
                "Authentication required"
            }), 401


        try:

            print("TOKEN 6")

            print(type(token))

            payload = jwt.decode(
                token,
                SECRET_KEY,
                algorithms=["HS256"]
            )

            print("TOKEN 7")

            current_user_id = payload["user_id"]
            current_user_role = payload["role"]

            print("TOKEN 8")

        except Exception as e:

            print("JWT ERROR")
            print(type(e))
            print(e)

            raise


        print("TOKEN 9")

        return f(
            current_user_id,
            current_user_role,
            *args,
            **kwargs
        )

    return decorated



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




import os
import base64
import traceback
import requests

from typing import Optional, List


def send_email(
    recipient: str,
    subject: str,
    body: str,
    html: bool = False,
    attachments: Optional[List[str]] = None
) -> bool:

    try:

        api_key = os.getenv("RESEND_API_KEY")

        sender = (
            "Business Essential "
            "<no-reply@businessessentia.net>"
        )

        if not api_key:
            print("❌ RESEND_API_KEY missing")
            return False


        payload = {
            "from": sender,

            "to": [recipient],

            "subject": subject,

            "reply_to":
            "support@businessessentia.net",

            "headers": {

                # improves delivery
                "List-Unsubscribe":
                "<mailto:unsubscribe@businessessentia.net>",

                "X-Entity-Ref-ID":
                str(recipient)

            }
        }


        if html:
            payload["html"] = body
        else:
            payload["text"] = body


        if attachments:

            payload["attachments"] = []

            for path in attachments:

                if not os.path.exists(path):

                    print(
                        f"⚠️ Attachment missing: {path}"
                    )

                    continue

                with open(
                    path,
                    "rb"
                ) as f:

                    payload[
                        "attachments"
                    ].append({

                        "filename":
                        os.path.basename(path),

                        "content":
                        base64.b64encode(
                            f.read()
                        ).decode()

                    })


        session = requests.Session()

        session.mount(
                    "https://",
                    TLSAdapter()
        )


        response = session.post(
            "https://api.resend.com/emails",

            headers={

                "Authorization":
                f"Bearer {api_key}",

                "Content-Type":
                "application/json",

                "Accept":
                "application/json"

            },

            json=payload,

            timeout=20
        )


        print(
            "EMAIL RESPONSE:",
            response.status_code
        )

        print(
            response.text
        )


        if response.status_code >= 400:

            return False


        result = response.json()

        print(
            "EMAIL SENT:",
            result.get("id")
        )

        return True


    except requests.exceptions.Timeout:

        print(
            "❌ Email timeout"
        )

        return False


    except Exception as e:

        print(
            "❌ SEND EMAIL ERROR:",
            e
        )

        traceback.print_exc()

        return False

def save_security_activity(user_id, type_, title, description,severity, ip_address):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO security_activity (user_id, type, title, description,severity,ip_address) VALUES (%s,%s,%s,%s,%s,%s)",
            (user_id, type_, title, description,severity,ip_address)
        )

        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Failed to save security activity: {e}")
    finally:
        cursor.close()
        conn.close()


from user_agents import parse

def parse_user_agent1(user_agent_string):
    ua = parse(user_agent_string)

    # ---------- DEVICE NAME ----------
    if ua.is_mobile:
        device_family = ua.device.family

        # Apple devices improvement
        if device_family in ["iPhone", "iPad"]:
            device_model = device_family
        elif device_family == "Generic Smartphone":
            device_model = "Android Phone"
        else:
            device_model = device_family

    elif ua.is_tablet:
        device_model = ua.device.family or "Tablet"

    elif ua.is_pc:
        if "Windows" in ua.os.family:
            device_model = "Windows PC"
        elif "Mac" in ua.os.family:
            device_model = "Mac"
        elif "Linux" in ua.os.family:
            device_model = "Linux PC"
        else:
            device_model = "PC"

    else:
        device_model = ua.device.family or "Unknown Device"

    # ---------- CLIENT ----------
    client_type = ua.browser.family or "Unknown Browser"

    # ---------- OS ----------
    os_name = ua.os.family or "Unknown OS"
    os_version = ua.os.version_string or ""


    return device_model, client_type, os_name, os_version

def expire_old_sessions():
    conn = get_db()
    cursor = conn.cursor()


    try:
        cursor.execute("""
            UPDATE user_sessions
            SET active = FALSE,
                is_current = FALSE
            WHERE last_active_time < NOW() - INTERVAL 4 DAY
            LIMIT 500
        """)
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Failed to update old sessions: {e}")
    finally:
        cursor.close()
        conn.close()


def get_location_from_ip(ip):
    try:
        response = requests.get(f"https://ipinfo.io/{ip}/json", timeout=5)
        data = response.json()

        city = data.get("city", "Unknown City")
        region = data.get("region", "Unknown Region")
        country = data.get("country", "Unknown Country")
        return city, region, country
    except Exception:
        return "Unknown City", "Unknown Region", "Unknown Country"
    

import requests

def get_location(lat, lng):
    url = "https://nominatim.openstreetmap.org/reverse"

    headers = {
        "User-Agent": "BusinessEssentialApp/1.0 (contact: admin@businessessentia.net)"
    }

    params = {
        "lat": lat,
        "lon": lng,
        "format": "json"
    }

    try:
        response = requests.get(
            url,
            headers=headers,
            params=params,
            timeout=10
        )

        response.raise_for_status()
        location_data = response.json()

        address = location_data.get("address", {})

        city = address.get("city") or address.get("town") or address.get("village")
        state = address.get("state")
        country = address.get("country")

        return city, state, country

    except requests.exceptions.RequestException as e:
        print("Location API error:", e)
        return None, None, None

    except Exception as e:
        print("Unexpected error:", e)
        return None, None, None




def log_session(
    user_id,
    device_model,
    client_type,
    os_name,
    os_version,
    login_ip,
    city,
    country
):
    conn = None
    cursor = None

    try:
        now = datetime.utcnow()

        conn = get_db()
        cursor = conn.cursor(buffered=True)

        cursor.execute("""
            SELECT session_id
            FROM user_sessions
            WHERE user_id=%s
            AND device_model=%s
            AND client_type=%s
            AND os_name=%s
            AND ip_address=%s
        """, (
            user_id,
            device_model,
            client_type,
            os_name,
            login_ip
        ))

        existing_session = cursor.fetchone()

        if existing_session:
            cursor.execute("""
                UPDATE user_sessions
                SET
                    last_active_time=%s,
                    os_version=%s,
                    location_city=%s,
                    location_country=%s,
                    is_current=TRUE,
                    active=TRUE
                WHERE session_id=%s
            """, (
                now,
                os_version,
                city,
                country,
                existing_session[0]
            ))
        else:
            cursor.execute("""
                INSERT INTO user_sessions (
                    user_id,
                    device_model,
                    client_type,
                    os_name,
                    os_version,
                    ip_address,
                    location_city,
                    location_country,
                    login_time,
                    last_active_time,
                    is_current,
                    active
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                user_id,
                device_model,
                client_type,
                os_name,
                os_version,
                login_ip,
                city,
                country,
                now,
                now,
                True,
                True
            ))

        conn.commit()

    except Exception as e:
        print(f"log_session error: {e}")

        if conn:
            conn.rollback()

        raise

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()


LOGO_PATH = "https://res.cloudinary.com/dkb987i8w/image/upload/v1772108684/app_logo_ky1yis.png" 


def generate_invoice_pdf(
    invoice_id,
    client_name,
    client_email,
    invoice_date,
    due_date,
    status,
    items,
    subtotal,
    tax,
    total,
    amount_paid,
    balance,
    notes
):

    filename = f"invoice_{invoice_id}.pdf"

    invoice_dir = os.path.join(
        app.root_path,
        "static",
        "invoices"
    )

    os.makedirs(
        invoice_dir,
        exist_ok=True
    )

    file_path = os.path.join(
        invoice_dir,
        filename
    )

    doc = SimpleDocTemplate(
        file_path,
        pagesize=A4,
        rightMargin=35,
        leftMargin=35,
        topMargin=35,
        bottomMargin=35
    )

    styles = getSampleStyleSheet()

    PRIMARY = colors.HexColor("#1558B0")
    DARK = colors.HexColor("#111827")
    LIGHT = colors.HexColor("#F8FAFC")
    BORDER = colors.HexColor("#E5E7EB")
    TEXT = colors.HexColor("#4B5563")

    PAID = colors.HexColor("#10B981")
    UNPAID = colors.HexColor("#EF4444")

    elements = []

    status_color = (
        PAID
        if status.lower() == "paid"
        else UNPAID
    )

    # --------------------
    # Header
    # --------------------

    header = []

    if os.path.exists(LOGO_PATH):

        logo = Image(
            LOGO_PATH,
            width=140,
            height=45
        )

        header.append([
            logo,

            Paragraph(
                f"""
                <font size=24 color="#1558B0">
                <b>INVOICE</b>
                </font><br/>
                <font size=11 color="#6B7280">
                #{invoice_id}
                </font>
                """,

                styles["Normal"]
            )
        ])

        table = Table(
            header,
            colWidths=[250, 250]
        )

        table.setStyle(TableStyle([
            ("VALIGN",(0,0),(-1,-1),"TOP")
        ]))

        elements.append(table)

    elements.append(
        Spacer(
            1,
            20
        )
    )

    # --------------------
    # Status pill
    # --------------------

    status_box = Table(
        [[
            Paragraph(
                f"""
                <font color="white">
                <b>{status.upper()}</b>
                </font>
                """,

                styles["BodyText"]
            )
        ]],

        colWidths=100
    )

    status_box.setStyle(
        TableStyle([

            (
                "BACKGROUND",
                (0,0),
                (-1,-1),
                status_color
            ),

            (
                "BOX",
                (0,0),
                (-1,-1),
                0,
                status_color
            ),

            (
                "ALIGN",
                (0,0),
                (-1,-1),
                "CENTER"
            ),

            (
                "PADDING",
                (0,0),
                (-1,-1),
                10
            )
        ])
    )

    elements.append(status_box)

    elements.append(
        Spacer(
            1,
            20
        )
    )

    # --------------------
    # Client card
    # --------------------

    info = Table([[
        Paragraph(
            f"""
            <b>Bill To</b><br/><br/>
            {client_name}<br/>
            {client_email}
            """,

            styles["Normal"]
        ),

        Paragraph(
            f"""
            <b>Invoice Date</b><br/>
            {invoice_date}

            <br/><br/>

            <b>Due Date</b><br/>
            {due_date}
            """,

            styles["Normal"]
        )
    ]])

    info.setStyle(
        TableStyle([

            (
                "BACKGROUND",
                (0,0),
                (-1,-1),
                LIGHT
            ),

            (
                "BOX",
                (0,0),
                (-1,-1),
                1,
                BORDER
            ),

            (
                "PADDING",
                (0,0),
                (-1,-1),
                18
            )
        ])
    )

    elements.append(info)

    elements.append(
        Spacer(
            1,
            25
        )
    )

    # --------------------
    # Items
    # --------------------

    rows = [[
        "Description",
        "Qty",
        "Price",
        "Total"
    ]]

    for item in items:

        rows.append([

            item["description"],

            str(
                item["quantity"]
            ),

            f"₦{item['price']:,.2f}",

            f"₦{
                item['price']
                *
                item['quantity']
            :,.2f}"

        ])

    table = Table(
        rows,

        colWidths=[
            250,
            60,
            90,
            100
        ]
    )

    style = [

        (
            "BACKGROUND",
            (0,0),
            (-1,0),
            PRIMARY
        ),

        (
            "TEXTCOLOR",
            (0,0),
            (-1,0),
            colors.white
        ),

        (
            "LINEBELOW",
            (0,1),
            (-1,-1),
            0.5,
            BORDER
        ),

        (
            "PADDING",
            (0,0),
            (-1,-1),
            12
        )
    ]

    table.setStyle(
        TableStyle(
            style
        )
    )

    elements.append(table)

    elements.append(
        Spacer(
            1,
            30
        )
    )

    # --------------------
    # Totals
    # --------------------

    totals = Table([

        ["Subtotal", f"₦{subtotal:,.2f}"],
        ["Tax", f"₦{tax:,.2f}"],
        ["Total", f"₦{total:,.2f}"],
        ["Paid", f"₦{amount_paid:,.2f}"],
        ["Balance", f"₦{balance:,.2f}"]

    ],

    colWidths=[
        120,
        130
    ],

    hAlign="RIGHT"
    )

    totals.setStyle(
        TableStyle([

            (
                "BACKGROUND",
                (0,0),
                (-1,-1),
                LIGHT
            ),

            (
                "PADDING",
                (0,0),
                (-1,-1),
                12
            ),

            (
                "TEXTCOLOR",
                (1,4),
                (1,4),

                PAID
                if balance <= 0
                else UNPAID
            )

        ])
    )

    elements.append(totals)

    elements.append(
        Spacer(
            1,
            25
        )
    )

    # --------------------
    # Notes
    # --------------------

    if notes:

        elements.append(
            Paragraph(
                "<b>Notes</b>",
                styles["Heading3"]
            )
        )

        elements.append(
            Paragraph(
                notes,
                styles["BodyText"]
            )
        )

    elements.append(
        Spacer(
            1,
            40
        )
    )

    # --------------------
    # Footer
    # --------------------

    elements.append(
        Paragraph(
            """
            <font color="#9CA3AF">
            Generated by BusinessEssentia
            </font>
            """,

            styles["Normal"]
        )
    )

    doc.build(
        elements
    )

    return file_path

def send_basic_plan_invoice_email(
    client_email, client_name, invoice_id,
    invoice_date, due_date, status,
    subtotal, tax, total, amount_paid,
    balance, notes, items
):
  

    # Generate PDF
    pdf_path = generate_invoice_pdf(
        invoice_id, client_name, client_email,
        invoice_date, due_date, status,
        items, subtotal, tax, total,
        amount_paid, balance, notes
    )

    html_body = f"""
    <div style="font-family:Arial, sans-serif; max-width:650px; margin:auto; border:1px solid #e0e0e0; padding:20px; background:#fdfdfd;">
        <div style="text-align:center; margin-bottom:20px;">
            <img src='{LOGO_PATH}' alt='Business Essential' style='height:50px;'/>
            <h2 style="color:#1558B0; margin:5px 0;">Invoice #{invoice_id}</h2>
        </div>

        <p>Hello <b>{client_name}</b>,</p>
        <p>Here is your invoice summary:</p>

        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse; margin-bottom:15px;">
            <tr><td style="font-weight:bold;">Invoice Date:</td><td>{invoice_date}</td></tr>
            <tr><td style="font-weight:bold;">Due Date:</td><td>{due_date}</td></tr>
            <tr><td style="font-weight:bold;">Status:</td><td><b>{status.upper()}</b></td></tr>
            <tr><td style="font-weight:bold;">Total:</td><td><b>₦{total:,.2f}</b></td></tr>
            <tr><td style="font-weight:bold;">Amount Paid:</td><td>₦{amount_paid:,.2f}</td></tr>
            <tr><td style="font-weight:bold;">Balance:</td><td><b>₦{balance:,.2f}</b></td></tr>
        </table>

        <p>Invoice items:</p>
        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse; border:1px solid #ddd; margin-bottom:15px;">
            <tr style="background:#1558B0; color:white;">
                <th align="left">Description</th>
                <th align="center">Qty</th>
                <th align="right">Price</th>
                <th align="right">Total</th>
            </tr>
            {''.join(f"<tr><td>{i['description']}</td><td align='center'>{i['quantity']}</td><td align='right'>₦{i['price']:,.2f}</td><td align='right'>₦{i['quantity']*i['price']:,.2f}</td></tr>" for i in items)}
        </table>

        <p style="margin-top:10px;">
            <b>Subtotal:</b> ₦{subtotal:,.2f}<br/>
            <b>Tax:</b> ₦{tax:,.2f}<br/>
            <b>Total:</b> ₦{total:,.2f}<br/>
            <b>Amount Paid:</b> ₦{amount_paid:,.2f}<br/>
            <b>Balance:</b> ₦{balance:,.2f}
        </p>

        {f"<p><b>Notes:</b> {notes}</p>" if notes else ""}
        <p>Thank you for doing business with us.<br/><b>Business Essential</b></p>
    </div>
    """

    send_email(
        recipient=client_email,
        subject=f"Business Essential - Invoice #{invoice_id}",
        body=html_body,
        html=True,
        attachments=[pdf_path]
    )


def send_pro_plan_invoice_email(
    client_email, client_name, invoice_id,
    invoice_date, due_date, status,
    subtotal, tax, total, amount_paid,
    balance, notes, items
):
    from pathlib import Path

    pay_link = f"https://yourapp.com/pay/invoice/{invoice_id}"

    # Generate PDF
    pdf_path = generate_invoice_pdf(
        invoice_id, client_name, client_email,
        invoice_date, due_date, status,
        items, subtotal, tax, total,
        amount_paid, balance, notes
    )
 

    html_body = f"""
    <div style="font-family:'Segoe UI', Arial, sans-serif; max-width:700px; margin:auto; border:1px solid #e0e0e0; padding:25px; background:#fff;">
        <div style="text-align:center; margin-bottom:25px;">
            <img src='{LOGO_PATH}' alt='Business Essential' style='height:60px;'/>
            <h1 style="color:#1558B0; margin:5px 0;">Invoice #{invoice_id}</h1>
        </div>

        <p>Hello <b>{client_name}</b>,</p>
        <p>Here are your invoice details:</p>

        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse; margin-bottom:20px;">
            <tr><td style="font-weight:bold;">Invoice Date:</td><td>{invoice_date}</td></tr>
            <tr><td style="font-weight:bold;">Due Date:</td><td>{due_date}</td></tr>
            <tr><td style="font-weight:bold;">Status:</td><td><b>{status.upper()}</b></td></tr>
            <tr><td style="font-weight:bold;">Total:</td><td><b>₦{total:,.2f}</b></td></tr>
            <tr><td style="font-weight:bold;">Amount Paid:</td><td>₦{amount_paid:,.2f}</td></tr>
            <tr><td style="font-weight:bold;">Balance:</td><td><b>₦{balance:,.2f}</b></td></tr>
        </table>

        <p>Invoice Items:</p>
        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse; border:1px solid #ddd; margin-bottom:20px;">
            <tr style="background:#1558B0; color:white;">
                <th align="left">Description</th>
                <th align="center">Qty</th>
                <th align="right">Price</th>
                <th align="right">Total</th>
            </tr>
            {''.join(f"<tr><td>{i['description']}</td><td align='center'>{i['quantity']}</td><td align='right'>₦{i['price']:,.2f}</td><td align='right'>₦{i['quantity']*i['price']:,.2f}</td></tr>" for i in items)}
        </table>

        <div style="margin-bottom:20px;">
            <p><b>Subtotal:</b> ₦{subtotal:,.2f} | <b>Tax:</b> ₦{tax:,.2f} | <b>Total:</b> ₦{total:,.2f}</p>
            <p><b>Amount Paid:</b> ₦{amount_paid:,.2f} | <b>Balance:</b> ₦{balance:,.2f}</p>
        </div>

        {f"<p><b>Notes:</b> {notes}</p>" if notes else ""}

        <div style="text-align:center; margin:30px 0;">
            <a href="{pay_link}" style="background:#28a745; color:white; padding:12px 25px; text-decoration:none; border-radius:5px; font-weight:bold;">
                Pay Now
            </a>
        </div>

        <p style="text-align:center; color:#555;">Thank you for choosing <b>Business Essential</b></p>
    </div>
    """

    send_email(
        recipient=client_email,
        subject=f"Business Essential - Invoice #{invoice_id}",
        body=html_body,
        html=True,
        attachments=[pdf_path]
    )

from contextlib import contextmanager

@contextmanager
def db_cursor(dictionary=False):
    conn = None
    cursor = None

    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=dictionary,buffered=True)

        yield conn, cursor

        conn.commit()

    except:
        if conn:
            conn.rollback()
        raise

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()



def save_log_activity(
    user_id,
    type_,
    title,
    description,
    amount: Optional[float] = None,
    status: Optional[str] = None
):
    with db_cursor() as (conn, cursor):
        cursor.execute(
            """
            INSERT INTO log_activity
            (user_id, type, title, description, amount, status)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (user_id, type_, title, description, amount, status)
        )




from uuid import uuid4

import secrets


def log_session(
    user_id,
    ip_address,
    user_agent,
    location=None,
    latitude=None,
    longitude=None
):
    device_info = parse_user_agent(user_agent)

    device_id = generate_device_id(
        user_agent,
        ip_address
    )

    session_token = secrets.token_hex(32)

    with db_cursor(dictionary=True) as (conn, cursor):

        cursor.execute(
            """
            SELECT id
            FROM user_sessions
            WHERE user_id=%s
            AND device_id=%s
            """,
            (user_id, device_id)
        )

        existing = cursor.fetchone()

        if existing:

            cursor.execute(
                """
                UPDATE user_sessions
                SET
                    session_token=%s,
                    ip_address=%s,
                    location=%s,
                    latitude=%s,
                    longitude=%s,
                    last_active=NOW()
                WHERE id=%s
                """,
                (
                    session_token,
                    ip_address,
                    location,
                    latitude,
                    longitude,
                    existing["id"]
                )
            )

        else:

            cursor.execute(
                """
                INSERT INTO user_sessions(
                    user_id,
                    session_token,
                    device_id,
                    device_type,
                    browser,
                    os,
                    ip_address,
                    location,
                    latitude,
                    longitude,
                    user_agent
                )
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    user_id,
                    session_token,
                    device_id,
                    device_info.get("device_type"),
                    device_info.get("browser"),
                    device_info.get("os"),
                    ip_address,
                    location,
                    latitude,
                    longitude,
                    user_agent
                )
            )

    return session_token

def update_session_activity(session_token):

    with db_cursor() as (conn, cursor):

        cursor.execute(
            """
            UPDATE user_sessions
            SET last_active=NOW()
            WHERE session_token=%s
            """,
            (session_token,)
        )



def get_user_sessions(user_id):
    with db_cursor(dictionary=True) as (conn, cursor):

        cursor.execute(
            """
            SELECT
                id,
                device_name,
                browser,
                operating_system,
                location,
                ip_address,
                login_at,
                last_activity,
                is_active
            FROM user_sessions
            WHERE user_id=%s
            ORDER BY last_activity DESC
            """,
            (user_id,)
        )

        return cursor.fetchall()

def parse_user_agent(user_agent):
    """
    Returns:
    {
        browser,
        os,
        device_type
    }
    """

    ua = parse(user_agent)

    if ua.is_mobile:
        device_type = "Mobile"

    elif ua.is_tablet:
        device_type = "Tablet"

    elif ua.is_pc:
        device_type = "Desktop"

    else:
        device_type = "Unknown"

    return {
        "browser": f"{ua.browser.family} {ua.browser.version_string}",
        "os": f"{ua.os.family} {ua.os.version_string}",
        "device_type": device_type
    }




def generate_device_id(user_agent, ip_address):
    raw = f"{user_agent}{ip_address}"
    return hashlib.sha256(raw.encode()).hexdigest()




def get_client_ip():
    forwarded = request.headers.get(
        "X-Forwarded-For"
    )

    if forwarded:
        return forwarded.split(",")[0].strip()

    return request.remote_addr



def get_user_from_token_cookie(request):
        token = None

        # -----------------------------
        # 1. Try HttpOnly Cookie first
        # -----------------------------
        token = request.cookies.get("access_token")

        # -----------------------------
        # 2. Fallback to Authorization
        # -----------------------------
        if not token:
            auth_header = request.headers.get("Authorization")

            if auth_header:
                try:
                    scheme, token = auth_header.split(" ")

                    if scheme.lower() != "bearer":
                        return jsonify({
                            "status": "error",
                            "message": "Invalid authorization scheme"
                        }), 401

                except ValueError:
                    return jsonify({
                        "status": "error",
                        "message": "Invalid authorization header"
                    }), 401

        # -----------------------------
        # 3. No token found
        # -----------------------------
        if not token:
            return jsonify({
                "status": "error",
                "message": "Authentication required"
            }), 401

        try:
            payload = jwt.decode(
                token,
                SECRET_KEY,
                algorithms=["HS256"]
            )

            return {
                "success": True,
                "user_id": payload["user_id"],
                "role": payload["role"]
            }


        except jwt.ExpiredSignatureError:
            return jsonify({
                "status": "error",
                "message": "Session expired. Please login again."
            }), 401

        except jwt.InvalidTokenError:
            return jsonify({
                "status": "error",
                "message": "Invalid token"
            }), 401
        
      
def send_notification(
    user_id,
    type_,
    title,
    description,
    amount=None,
    status=None
):
    with db_cursor(dictionary=True) as (conn, cursor):

        cursor.execute(
            """
            INSERT INTO log_activity
            (
                user_id,
                type,
                title,
                description,
                amount,
                status
            )
            VALUES (%s,%s,%s,%s,%s,%s)
            """,
            (
                user_id,
                type_,
                title,
                description,
                amount,
                status
            )
        )

        notification_id = cursor.lastrowid

        cursor.execute(
            """
            SELECT *
            FROM log_activity
            WHERE id=%s AND user_id=%s
            """,
            (notification_id, user_id)
        )

        notification = cursor.fetchone()

    notification_data = {
        "id": int(notification_id),
        "user_id": int(user_id),
        "type": str(type_),
        "title": str(title),
        "description": str(description),
        "amount": float(amount) if amount else 0,
        "status": str(status) if status else None,
        "is_read": False,
        "created_at": datetime.now().isoformat()
    }

    socketio.emit(
        "new_notification",
        notification_data,
        room=f"user_{user_id}"
    )

    return notification_data

def save_audit_activity(
    user_id,
    type_,
    title,
    description,
    ip_address
):
    with db_cursor() as (conn, cursor):
        cursor.execute("""
            INSERT INTO audit_activity
            (
                admin_id,
                type,
                title,
                description,
                ip_address
            )
            VALUES (%s,%s,%s,%s,%s)
        """, (
            user_id,
            type_,
            title,
            description,
            ip_address
        ))



def generate_invoice_number(user_id, invoice_prefix):

    today = datetime.now().date()
    start_of_month = datetime.combine(today.replace(day=1), time.min)
    with db_cursor(dictionary=True) as (conn, cursor):
        cursor.execute("""
            SELECT COUNT(*) AS TOTAL FROM invoices
            WHERE user_id=%s AND created_at >= %s
        """, (user_id, start_of_month))

        count = cursor.fetchone()["TOTAL"] + 1


        invoice_number = f"{invoice_prefix}-{today.strftime('%Y%m')}-{count:04d}"


        return invoice_number


def generate_reference(invoice_prefix):
    timestamp = int(datetime.now().timestamp())
    random_part = os.urandom(4).hex()
    return f"{invoice_prefix}-{timestamp}-{random_part}"





def token_required_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):

        token = None

        # -----------------------------
        # 1. Try HttpOnly Cookie first
        # -----------------------------
        token = request.cookies.get("access_token")

        # -----------------------------
        # 2. Fallback to Authorization
        # -----------------------------
        if not token:
            auth_header = request.headers.get("Authorization")

            if auth_header:
                try:
                    scheme, token = auth_header.split(" ")

                    if scheme.lower() != "bearer":
                        return jsonify({
                            "status": "error",
                            "message": "Invalid authorization scheme"
                        }), 401

                except ValueError:
                    return jsonify({
                        "status": "error",
                        "message": "Invalid authorization header"
                    }), 401

        # -----------------------------
        # 3. No token found
        # -----------------------------
        if not token:
            return jsonify({
                "status": "error",
                "message": "Authentication required"
            }), 401

        try:
            payload = jwt.decode(
                token,
                SECRET_KEY,
                algorithms=["HS256"]
            )

            current_user_id = payload["admin_id"]
            current_user_role = payload["role"]
            current_user_department = payload.get("department")

        except jwt.ExpiredSignatureError:
            return jsonify({
                "status": "error",
                "message": "Session expired. Please login again."
            }), 401

        except jwt.InvalidTokenError:
            return jsonify({
                "status": "error",
                "message": "Invalid token"
            }), 401

        return f(
            current_user_id,
            current_user_role,
            current_user_department,
            *args,
            **kwargs
        )

    return decorated



def log_admin_session(admin_id, ip_address, user_agent, session_token):
    try:
        device_info = parse_user_agent(user_agent)
        location = str(get_location_from_ip(ip_address))

        device_id = generate_device_id(user_agent, ip_address)

      
        conn = get_db()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id
            FROM admin_sessions
            WHERE admin_id = %s
            AND device_id = %s
            """,
            (admin_id, device_id)
        )

        existing_session = cursor.fetchone()

        if existing_session:
            cursor.execute(
                """
                UPDATE admin_sessions
                SET
                    session_token = %s,
                    device_type = %s,
                    browser = %s,
                    os = %s,
                    ip_address = %s,
                    user_agent = %s,
                    location = %s,
                    last_active = NOW()
                WHERE id = %s
                """,
                (
                    session_token,
                    device_info.get("device_type"),
                    device_info.get("browser"),
                    device_info.get("os"),
                    ip_address,
                    user_agent,
                    location,
                    existing_session["id"]
                )
            )
        else:
            cursor.execute(
                """
                INSERT INTO admin_sessions(
                    admin_id,
                    session_token,
                    device_type,
                    device_id,
                    browser,
                    os,
                    ip_address,
                    user_agent,
                    location
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    admin_id,
                    session_token,
                    device_info.get("device_type"),
                    device_id,
                    device_info.get("browser"),
                    device_info.get("os"),
                    ip_address,
                    user_agent,
                    location
                )
            )

        conn.commit()

    except Exception as e:
        if conn:
            conn.rollback()
        print("log_admin_session error:", e)
        raise

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def update_admin_session_activity(session_token):
    with db_cursor() as (conn, cursor):

        cursor.execute(
            """
            UPDATE admin_sessions
            SET last_active=NOW()
            WHERE session_token=%s
            """,
            (session_token,)
        )


def auto_check_overdue_invoices():
    """
    Automatically checks unpaid invoices and marks overdue if past due date.
    """

    try:

        with db_cursor(dictionary=True) as (conn, cursor):
            cursor.execute("""
                SELECT invoice_id, user_id, client_email, client_name, due_date, total_amount
                FROM invoices
                WHERE status = 'unpaid'
            """)
            invoices = cursor.fetchall()

        now = datetime.now()


        for invoice in invoices:

            invoice_id = invoice["invoice_id"]
            user_id = invoice["user_id"]
            client_email = invoice["client_email"]
            client_name = invoice["client_name"]
            due_date = invoice["due_date"]
            total = invoice["total_amount"]

            if isinstance(due_date, str):
                due_date_dt = datetime.strptime(due_date, "%Y-%m-%d")
            else:
                due_date_dt = due_date

            if due_date_dt >= now:
                continue


            with db_cursor() as (conn, cursor):

                cursor.execute("""
                    UPDATE invoices
                    SET status = 'overdue'
                    WHERE invoice_id = %s
                """, (invoice_id,))

                cursor.execute("""
                    SELECT email, username, plan
                    FROM user_base
                    WHERE user_id = %s
                """, (user_id,))

                user_info = cursor.fetchone()
                conn.commit()

     
            if user_info:
                user_email, username, user_plan = user_info

                send_overdue_invoice_email_to_user(
                    user_email=user_email,
                    username=username,
                    invoice_id=invoice_id,
                    client_name=client_name,
                    total=total,
                    due_date=due_date_dt.strftime("%d %b %Y")
                )

                if user_plan == "Pro":
                    pay_link = f"https://yourapp.com/pay/invoice/{invoice_id}"

                    send_overdue_invoice_email(
                        client_email=client_email,
                        client_name=client_name,
                        invoice_id=invoice_id,
                        due_date=due_date_dt.strftime("%d %b %Y"),
                        total=total,
                        pay_link=pay_link
                    )


            save_log_activity(
                user_id,
                "Invoice",
                "Invoice Overdue",
                f"Invoice #{invoice_id} for {client_name} is now overdue."
            )

    except Exception as e:
        print("Error checking overdue invoices:", e)


def send_overdue_invoice_email(client_email, client_name, invoice_id, due_date=None, total=None, pay_link=None):
    """
    Sends a professional overdue invoice email.
    
    Parameters:
        client_email (str)
        client_name (str)
        invoice_id (int)
        due_date (str, optional)
        total (float, optional)
        pay_link (str, optional) - link for online payment
    """

    brand_color = "#1558B0"  # Primary brand color
    overdue_color = "#D32F2F"  # Red for overdue highlight

    html_body = f"""
    <div style="font-family:Arial, sans-serif; max-width:650px; margin:auto; border:1px solid #e0e0e0; padding:25px; background:#ffffff; border-radius:8px;">
        <!-- Logo -->
        <div style="text-align:center; margin-bottom:25px;">
            <img src='https://yourdomain.com/static/media/app_logo.png' alt="Business Essential" width="140" style="margin-bottom:10px;">
            <h2 style="color:{overdue_color}; margin:5px 0;">Invoice #{invoice_id} Overdue</h2>
        </div>

        <!-- Greeting -->
        <p>Dear <b>{client_name}</b>,</p>
        <p>This is a reminder that your invoice <b>#{invoice_id}</b> is now <span style="color:{overdue_color}; font-weight:bold;">overdue</span>.</p>
    """

    if due_date:
        html_body += f"<p><b>Due Date:</b> {due_date}</p>"
    if total:
        html_body += f"<p><b>Amount Due:</b> ₦{total:,.2f}</p>"

    html_body += """
        <p>Please make the payment at your earliest convenience to avoid any late fees.</p>
    """

    # Add Pay Now button if link is provided
    if pay_link:
        html_body += f"""
        <div style="text-align:center; margin:25px 0;">
            <a href="{pay_link}" style="background:{brand_color}; color:white; padding:12px 25px; text-decoration:none; border-radius:5px; font-weight:bold; display:inline-block;">
                Pay Now
            </a>
        </div>
        """

    html_body += f"""
        <p>If you have already made the payment, please disregard this notice.</p>
        <p>Thank you for your prompt attention.<br><b>Business Essential</b></p>
        <hr style="border:none; border-top:1px solid #e0e0e0; margin-top:30px;">
        <p style="font-size:12px; color:#777; text-align:center;">This is an automated message. Please do not reply directly to this email.</p>
    </div>
    """

    # Send email
    send_email(
        recipient=client_email,
        subject=f"Business Essential - Invoice #{invoice_id} Overdue Notice",
        body=html_body,
        html=True
    )

def send_overdue_invoice_email_to_user(user_email, username, invoice_id, client_name, total, due_date):
    """
    Sends a professional overdue invoice email to the user notifying them that a client invoice is overdue.
    """
    subject = f"Business Essential - Invoice #{invoice_id} Overdue Notice"

    html_body = f"""
    <div style="
        font-family: 'Arial', sans-serif;
        max-width: 650px;
        margin: auto;
        border: 1px solid #e0e0e0;
        padding: 25px;
        background: #fdfdfd;
        border-radius: 8px;
    ">
        <div style="text-align: center; margin-bottom: 25px;">
            <img src='https://yourapp.com/static/media/app_logo.png' alt='Business Essential' width='120' style='margin-bottom:10px;'>
            <h2 style="color:#1558B0; margin:5px 0;">Invoice #{invoice_id} Overdue</h2>
        </div>

        <p>Hi <b>{username}</b>,</p>

        <p>This is to inform you that the invoice <b>#{invoice_id}</b> for your client <b>{client_name}</b> is now <span style="color:#D32F2F; font-weight:bold;">overdue</span>.</p>

        <table width="100%" cellpadding="8" cellspacing="0" border="0" style="margin-top:15px; border-collapse: collapse;">
            <tr style="background:#f0f0f0;">
                <td><strong>Client</strong></td>
                <td>{client_name}</td>
            </tr>
            <tr>
                <td><strong>Invoice ID</strong></td>
                <td>{invoice_id}</td>
            </tr>
            <tr style="background:#f0f0f0;">
                <td><strong>Due Date</strong></td>
                <td>{due_date}</td>
            </tr>
            <tr>
                <td><strong>Total Amount</strong></td>
                <td>₦{total:,.2f}</td>
            </tr>
        </table>

        <p style="margin-top:20px; color:#555;">
            Please follow up with your client promptly. Keeping invoices paid on time helps your cash flow and avoids late fees.
        </p>

        <p style="margin-top:25px;">
            Thank you,<br>
            <b>Business Essential Team</b>
        </p>

        <hr style="margin-top:30px; border:none; border-top:1px solid #e0e0e0;">
        <p style="font-size:12px; color:#999; text-align:center;">
            This is an automated notification from Business Essential. Please do not reply directly to this email.
        </p>
    </div>
    """

    send_email(
        recipient=user_email,
        subject=subject,
        body=html_body,
        html=True
    )


def process_expired_subscriptions():

    print("Checking expired subscriptions...")

    try:

        with db_cursor(commit=True) as cursor:

            cursor.execute("""
            SELECT
                id,
                user_id
            FROM user_subscriptions
            WHERE
                status='active'
            AND
                expires_at<=UTC_TIMESTAMP()
            """)

            expired = cursor.fetchall()


            print(
                f"Found {len(expired)} expired"
            )


            for sub in expired:

                user_id = sub["user_id"]

                subscription_id = sub["id"]


                cursor.execute("""
                UPDATE user_subscriptions
                SET status='expired'
                WHERE id=%s
                """,
                (
                    subscription_id,
                )
                )


                cursor.execute("""
                UPDATE user_base
                SET
                    plan='Trial',
                    plan_expiration=NULL
                WHERE user_id=%s
                """,
                (
                    user_id,
                )
                )


                print(
                    f"Expired {user_id}"
                )


    except Exception as e:

        print(
            "SUB EXPIRY ERROR:",
            e
        )

def process_invoice_due_notifications():

    now = datetime.utcnow()

    with db_cursor(
        dictionary=True
    ) as (conn, cursor):

        cursor.execute("""
        SELECT

            i.id,
            i.invoice_number,
            i.due_date,
            i.total,
            i.status,

            u.user_id,
            u.email user_email,
            u.plan,

            c.client_name,
            c.client_email

        FROM invoices i

        JOIN user_base u
            ON u.user_id=i.user_id

        LEFT JOIN clients c
            ON c.id=i.client_id

        WHERE
            i.status
            IN (
                'pending',
                'unpaid'
            )
        """)

        invoices =
        cursor.fetchall()

        for inv in invoices:

            days_left = (
                inv["due_date"]
                -
                now
            ).days

            notification = None

            if days_left == 3:
                notification = "due_3"

            elif days_left == 1:
                notification = "due_1"

            elif days_left < 0:
                notification = "overdue"

            if not notification:
                continue


            recipients = [
                (
                    "user",
                    inv[
                        "user_email"
                    ]
                )
            ]


            if (
                inv["plan"]
                .lower()
                !=
                "basic"
            ):

                if (
                    inv[
                        "client_email"
                    ]
                ):

                    recipients.append(
                        (
                            "client",

                            inv[
                                "client_email"
                            ]
                        )
                    )


            for role,email in recipients:

                cursor.execute("""
                SELECT id

                FROM invoice_notifications

                WHERE
                invoice_id=%s

                AND notification_type=%s

                AND recipient=%s
                """,

                (
                    inv["id"],
                    notification,
                    role
                ))

                if cursor.fetchone():
                    continue


                subject = (
                    f"Invoice {inv['invoice_number']} Reminder"
                )


                html = (
                    build_invoice_reminder_email(
                        invoice=inv,
                        days_left=days_left
                    )
                )


                sent = send_email(
                    recipient=email,
                    subject=subject,
                    body=html,
                    html=True
                )


                if sent:

                    cursor.execute("""
                    INSERT INTO
                    invoice_notifications(

                        invoice_id,
                        notification_type,
                        recipient

                    )

                    VALUES(
                        %s,
                        %s,
                        %s
                    )
                    """,

                    (
                        inv["id"],
                        notification,
                        role
                    ))

        conn.commit()

def build_invoice_reminder_email(
    invoice,
    days_left
):

    title = (
        "Invoice Overdue"
        if days_left < 0
        else
        "Upcoming Invoice Due"
    )

    color = (
        "#DC2626"
        if days_left < 0
        else
        "#1558B0"
    )

    text = (

        "This invoice is overdue."

        if days_left < 0

        else

        f"This invoice becomes due in {days_left} day(s)."
    )

    return f"""
<html>

<body
style="
font-family:Arial;
background:#f5f7fa;
padding:30px;
">

<div
style="
background:white;
max-width:650px;
margin:auto;
padding:40px;
border-radius:14px;
">

<img
src="{APP_LOGO}"
width="140"
/>

<h2
style="
color:{color};
">

{title}

</h2>

<p>

Hello,

{text}

</p>

<div
style="
background:#f9fafb;
padding:18px;
border-radius:10px;
">

<b>Invoice:</b>
{invoice["invoice_number"]}

<br><br>

<b>Client:</b>
{invoice["client_name"]}

<br><br>

<b>Amount:</b>

₦{invoice["total"]:,.2f}

<br><br>

<b>Due Date:</b>

{invoice["due_date"]}

</div>

<p>

Please take action to avoid payment delays.

</p>

</div>

</body>

</html>
"""
