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
    conn = get_db()
    cursor = conn.cursor(buffered=True)
    cursor.execute("SELECT user_id, username FROM user_base WHERE username=%s", (username,))
    user = cursor.fetchone()

    if not user:
        return jsonify({
            "status": "error",
            "message": "User not found"
        }), 400
    
    
    user_id = user[0]
    cursor.close()
    conn.close()

    return user_id



def token_required(f):

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

            current_user_id = payload["user_id"]
            current_user_role = payload["role"]

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
            *args,
            **kwargs
        )

    return decorated


# ======== EMAIL ========
def send_email(
    recipient: str,
    subject: str,
    body: str,
    html: bool = False,
    attachments: Optional[list] = None
) -> bool:
    try:
        api_key = os.getenv("RESEND_API_KEY")
        sender = os.getenv("SENDER_EMAIL")

        if not api_key or not sender:
            print("⚠️ Email not configured")
            return False

        files = []
        if attachments:
            for path in attachments:
                if os.path.exists(path):
                    with open(path, "rb") as f:
                        files.append({
                            "filename": os.path.basename(path),
                            "content": base64.b64encode(f.read()).decode()
                        })
                else:
                    print(f"Attachment not found: {path}")

        payload = {
            "from": sender,
            "to": [recipient],
            "subject": subject,
            "html": body if html else None,
            "text": body if not html else None,
            "attachments": files if files else None
        }

        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=10,
        )

        if response.status_code >= 400:
            print("⚠️ Email error:", response.text)
            return False

        return True

    except Exception as e:
        print("⚠️ Email failed:", e)
        traceback.print_exc()
        return False
    

def save_security_activity(user_id, type_, title, description,severity, ip_address):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO security_activity (user_id, type, title, description,severity,ip_address) VALUES (%s,%s,%s,%s,%s,%s)",
        (user_id, type_, title, description,severity,ip_address)
    )

    conn.commit()

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

    cursor.execute("""
        UPDATE user_sessions
        SET active = FALSE,
            is_current = FALSE
        WHERE last_active_time < NOW() - INTERVAL 4 DAY
        LIMIT 500
    """)
    conn.commit()
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
    

def get_location(lat,lng):

    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json"

    headers = {
        "User-Agent": "Bussiness Essential"
    }

    response = requests.get(url,headers=headers)
    location_data= response.json()

    address = location_data.get("address", {})
    city = address.get('city') or address.get('town')
    state = address.get("state")
    country = address.get("country")

    return city, state, country




def log_session(user_id, device_model, client_type,
                os_name, os_version,
                login_ip, city, country):

    now = datetime.utcnow()

    conn = get_db()
    cursor = conn.cursor()
    # 1️⃣ Check if session already exists
    cursor.execute("""
        SELECT session_id FROM user_sessions
        WHERE user_id=%s
        AND device_model=%s
        AND client_type=%s
        AND os_name=%s
        AND ip_address=%s
    """, (user_id, device_model, client_type, os_name, login_ip))

    existing_session = cursor.fetchone()

    # 2️⃣ Update existing session
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
            LIMIT 500
        """, (
            now,
            os_version,
            city,
            country,
            existing_session[0]
        ))

    # 3️⃣ Insert new session
    else:
        cursor.execute("""
            INSERT INTO user_sessions
            (
                user_id, device_model, client_type,
                os_name, os_version, ip_address,
                location_city, location_country,
                login_time, last_active_time,
                is_current, active
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            user_id, device_model, client_type,
            os_name, os_version, login_ip,
            city, country,
            now, now,
            True, True
        ))

    conn.commit() 
    cursor.close()
    conn.close()


LOGO_PATH = "C:\\Users\\Elitebook 1040 G6\\OneDrive\\Desktop\\web developmen\\reciept app\\static\\media\\app logo.png"  # Replace with your logo path


def generate_invoice_pdf(invoice_id, client_name, client_email,
                         invoice_date, due_date, status,
                         items, subtotal, tax, total,
                         amount_paid, balance, notes):

    filename = f"invoice_{invoice_id}.pdf"
    file_path = os.path.join("C:\\Users\\Elitebook 1040 G6\\OneDrive\\Desktop\\web developmen\\reciept app\\static\\invoices", filename)
    os.makedirs("C:\\Users\\Elitebook 1040 G6\\OneDrive\\Desktop\\web developmen\\reciept app\\static\\invoices", exist_ok=True)


    doc = SimpleDocTemplate(file_path, pagesize=A4,
                            rightMargin=40, leftMargin=40,
                            topMargin=40, bottomMargin=40)

    styles = getSampleStyleSheet()
    elements = []

    brand_color = colors.HexColor("#1558B0")  # Brand primary color

    # ---------- App Logo ----------
    logo_path = LOGO_PATH
    if os.path.exists(logo_path):
        logo = Image(logo_path, width=120, height=40)
        logo.hAlign = 'CENTER'
        elements.append(logo)
        elements.append(Spacer(1, 12))

    # ---------- Invoice Header ----------
    status_color = colors.green if status.lower() == "paid" else colors.red
    elements.append(Paragraph(
        f"<b>Invoice #{invoice_id}</b>",
        ParagraphStyle(
            name="InvoiceTitle",
            fontSize=20,
            textColor=brand_color,
            alignment=0,  # left
            spaceAfter=8
        )
    ))
    elements.append(Paragraph(
        f"<b>Status:</b> <font color='#{status_color.hexval()}'>{status.upper()}</font>",
        ParagraphStyle(
            name="InvoiceStatus",
            fontSize=12,
            spaceAfter=15
        )
    ))

    # ---------- Client & Invoice Info ----------
    info_table = Table([
        ["Bill To:", client_name, "Invoice Date:", invoice_date],
        ["Email:", client_email, "Due Date:", due_date],
    ], colWidths=[70, 180, 90, 140])

    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#f2f2f2")),
        ("GRID", (0,0), (-1,-1), 0.5, colors.grey),
        ("FONT", (0,0), (-1,-1), "Helvetica"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("TOPPADDING", (0,0), (-1,-1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))

    # ---------- Items Table ----------
    item_data = [["Description", "Qty", "Price", "Total"]]
    for idx, item in enumerate(items):
        line_total = item["quantity"] * item["price"]
        item_data.append([
            item["description"],
            item["quantity"],
            f"₦{item['price']:,.2f}",
            f"₦{line_total:,.2f}"
        ])

    items_table = Table(item_data, colWidths=[250, 60, 90, 90])
    # Alternating row colors for readability
    row_colors = [colors.HexColor("#f9f9f9") if i % 2 == 0 else colors.white for i in range(len(item_data))]
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), brand_color),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("ALIGN", (1,1), (-1,-1), "CENTER"),
        ("GRID", (0,0), (-1,-1), 0.5, colors.grey),
        ("BOTTOMPADDING", (0,0), (-1,0), 10),
        ("TOPPADDING", (0,0), (-1,0), 10),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ]))
    for i, color in enumerate(row_colors):
        if i == 0:  # skip header
            continue
        items_table.setStyle(TableStyle([("BACKGROUND", (0,i), (-1,i), color)]))

    elements.append(items_table)
    elements.append(Spacer(1, 20))

    # ---------- Totals Table ----------
    totals_data = [
        ["Subtotal:", f"₦{subtotal:,.2f}"],
        ["Tax:", f"₦{tax:,.2f}"],
        ["Total:", f"₦{total:,.2f}"],
        ["Amount Paid:", f"₦{amount_paid:,.2f}"],
        ["Balance:", f"₦{balance:,.2f}"]
    ]
    totals_table = Table(totals_data, colWidths=[350, 140], hAlign="RIGHT")
    totals_table.setStyle(TableStyle([
        ("ALIGN", (1,0), (-1,-1), "RIGHT"),
        ("FONT", (0,0), (-1,-1), "Helvetica-Bold"),
        ("LINEBEFORE", (1,0), (1,-1), 0.5, colors.grey),
        ("LINEABOVE", (0,-1), (-1,-1), 1, colors.black),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("TEXTCOLOR", (1,4), (1,4), colors.red if balance > 0 else colors.green)  # Balance
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 20))

    # ---------- Notes ----------
    if notes:
        elements.append(Paragraph(f"<b>Notes:</b><br/>{notes}", styles["Normal"]))

    # ---------- Build PDF ----------
    doc.build(elements)
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

    app_logo = os.path.join("static", "media", "app logo.png")

    html_body = f"""
    <div style="font-family:Arial, sans-serif; max-width:650px; margin:auto; border:1px solid #e0e0e0; padding:20px; background:#fdfdfd;">
        <div style="text-align:center; margin-bottom:20px;">
            <img src='{app_logo}' alt='Business Essential' style='height:50px;'/>
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
    app_logo = os.path.join("static", "media", "app logo.png")

    html_body = f"""
    <div style="font-family:'Segoe UI', Arial, sans-serif; max-width:700px; margin:auto; border:1px solid #e0e0e0; padding:25px; background:#fff;">
        <div style="text-align:center; margin-bottom:25px;">
            <img src='{app_logo}' alt='Business Essential' style='height:60px;'/>
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



def save_log_activity(
    user_id,
    type_,
    title,
    description,
    amount: Optional[float] = None,
    status: Optional[str] = None
):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO log_activity
        (user_id, type, title, description, amount, status)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (user_id, type_, title, description, amount, status)
    )

    conn.commit()
    cursor.close()
    conn.close()


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
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    device_info = parse_user_agent(user_agent)

    device_id = generate_device_id(
        user_agent,
        ip_address
    )

    session_token = secrets.token_hex(32)

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
                device_info["device_type"],
                device_info["browser"],
                device_info["os"],
                ip_address,
                location,
                latitude,
                longitude,
                user_agent
            )
        )

    conn.commit()

    cursor.close()
    conn.close()

    return session_token

def update_session_activity(session_token):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE user_sessions
        SET last_active=NOW()
        WHERE session_token=%s
        """,
        (session_token,)
    )

    conn.commit()
    cursor.close()
    conn.close()



def get_user_sessions(user_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

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

    sessions = cursor.fetchall()

    cursor.close()
    conn.close()

    return sessions

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

import hashlib


def generate_device_id(user_agent, ip_address):
    raw = f"{user_agent}{ip_address}"
    return hashlib.sha256(raw.encode()).hexdigest()


from flask import request


def get_client_ip():
    forwarded = request.headers.get(
        "X-Forwarded-For"
    )

    if forwarded:
        return forwarded.split(",")[0].strip()

    return request.remote_addr

import jwt


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

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
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
    """, (
        user_id,
        type_,
        title,
        description,
        amount,
        status
    ))

    conn.commit()

    notification_id = cursor.lastrowid

    cursor.execute("""
        SELECT *
        FROM log_activity
        WHERE id=%s AND user_id=%s
    """, (notification_id,user_id))

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
    conn.close()

    socketio.emit(
        "new_notification",
        notification_data,
        room=f"user_{user_id}"
    )

def save_audit_activity(
    user_id,
    type_,
    title,
    description,
    ip_address
):
    conn = get_db()
    cursor = conn.cursor()

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

    conn.commit()
    cursor.close()
    conn.close()

def generate_invoice_number(user_id, invoice_prefix):
    conn = get_db()
    cursor = conn.cursor()

    today = datetime.now().date()
    start_of_month = datetime.combine(today.replace(day=1), time.min)

    cursor.execute("""
        SELECT COUNT(*) FROM invoices
        WHERE user_id=%s AND created_at >= %s
    """, (user_id, start_of_month))

    count = cursor.fetchone()[0] + 1


    invoice_number = f"{invoice_prefix}-{today.strftime('%Y%m')}-{count:04d}"

    cursor.close()
    conn.close()

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
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    try:
        device_info = parse_user_agent(user_agent)
        location = str(get_location_from_ip(ip_address))

        device_id = generate_device_id(
            user_agent,
            ip_address
        )

        # Check if this device already exists
        cursor.execute(
            """
            SELECT id
            FROM admin_sessions
            WHERE admin_id = %s
            AND device_id = %s
            """,
            (
                admin_id,
                device_id
            )
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
                    device_info["device_type"],
                    device_info["browser"],
                    device_info["os"],
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
                    device_info["device_type"],
                    device_id,
                    device_info["browser"],
                    device_info["os"],
                    ip_address,
                    user_agent,
                    location
                )
            )

        conn.commit()

    except Exception as e:
        conn.rollback()
        print("log_admin_session error:", e)
        raise

    finally:
        cursor.close()
        conn.close()

def update_admin_session_activity(session_token):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE admin_sessions
        SET last_active=NOW()
        WHERE session_token=%s
        """,
        (session_token,)
    )

    conn.commit()
    cursor.close()
    conn.close()

from datetime import datetime

def auto_check_overdue_invoices():
    """
    Automatically checks ALL users' unpaid invoices and marks overdue if past due date.
    Sends email notifications to both client and user.
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Fetch all unpaid invoices across all users
        cursor.execute("""
            SELECT invoice_id, user_id, client_email, client_name, due_date, total_amount
            FROM invoices
            WHERE status = 'unpaid'
        """)
        invoices = cursor.fetchall()

        now = datetime.now()

        for invoice in invoices:
            invoice_id, user_id, client_email, client_name, due_date, total = invoice

            # Convert due_date properly
            if isinstance(due_date, str):
                due_date_dt = datetime.strptime(due_date, "%Y-%m-%d")
            else:
                due_date_dt = due_date

            if due_date_dt < now:
                # Mark invoice as overdue
                cursor.execute("""
                    UPDATE invoices 
                    SET status = 'overdue' 
                    WHERE invoice_id = %s
                """, (invoice_id,))

                # Get user info
                cursor.execute("""
                    SELECT email, username, plan 
                    FROM user_base 
                    WHERE user_id = %s
                """, (user_id,))
                user_info = cursor.fetchone()

                if user_info:
                    user_email, username, user_plan = user_info

                    # Notify user
                    send_overdue_invoice_email_to_user(
                        user_email=user_email,
                        username=username,
                        invoice_id=invoice_id,
                        client_name=client_name,
                        total=total,
                        due_date=due_date_dt.strftime("%d %b %Y")
                    )

                    # Notify client only for Pro users
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

                # Log activity
                save_log_activity(
                    user_id,
                    "Invoice",
                    "Invoice Overdue",
                    f"Invoice #{invoice_id} for {client_name} is now overdue."
                )

        conn.commit()

    except Exception as e:
        conn.rollback()
        print("Error checking overdue invoices:", e)

    finally:
        cursor.close()
        conn.close()


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
