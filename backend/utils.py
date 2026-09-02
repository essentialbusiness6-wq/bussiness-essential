import os 
import json
import re
from datetime import datetime, time, timezone,timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import smtplib
import requests
import traceback
from flask import current_app
from typing import Optional
from functools import wraps
from flask import session, redirect, request, jsonify
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, HRFlowable, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
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
import os


load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
APP_LOGO="https://res.cloudinary.com/dkb987i8w/image/upload/v1772108684/app_logo_ky1yis.png" 

db_pool = MySQLConnectionPool(
    pool_name="business_pool",
    pool_size=5,
    pool_reset_session=True,
    host= os.getenv("DBHOST"),
    user= os.getenv("DBUSER"),
    password = os.getenv("DBPASS"),
    database = os.getenv("DB"),
    port= os.getenv("DBPORT"),
    autocommit=False,
    connection_timeout=20
)


def get_db():

    conn = (
        db_pool.get_connection()
    )

    try:

        conn.ping(
            reconnect=True,
            attempts=3,
            delay=2
        )

    except Exception:

        conn.reconnect(
            attempts=3,
            delay=2
        )

    return conn


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
            
from functools import wraps
from flask import request, jsonify
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError


def token_required(f):

    @wraps(f)
    def decorated(*args, **kwargs):

        print("TOKEN 1")

        token = request.cookies.get("access_token")

        print("TOKEN 2", token is not None)

        if not token:

            auth_header = request.headers.get("Authorization")

            print("TOKEN 3")

            if auth_header:

                parts = auth_header.split(" ", 1)

                if len(parts) != 2:
                    return jsonify({
                        "message": "Invalid Authorization header"
                    }), 401

                scheme, token = parts

                print("TOKEN 4")

                if scheme.lower() != "bearer":
                    return jsonify({
                        "message": "Authorization scheme must be Bearer"
                    }), 401

        if not token:

            print("TOKEN 5")

            return jsonify({
                "message": "Authentication required"
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

        except ExpiredSignatureError:

            print("JWT EXPIRED")

            return jsonify({
                "status": "error",
                "message": "Session expired. Please log in again.",
                "code": "TOKEN_EXPIRED"
            }), 401

        except InvalidTokenError as e:

            print("JWT INVALID:", type(e), e)

            return jsonify({
                "status": "error",
                "message": "Invalid authentication token.",
                "code": "INVALID_TOKEN"
            }), 401

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
            "Business Essentials Prime"
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



def token_required_phone(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            token = auth_header.split(" ")[1]

        if not token:
            return jsonify({
                "status": "error",
                "message": "Token is missing"
            }), 401

        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user_id = payload["user_id"]
            current_user_role = payload["role"]

        except jwt.ExpiredSignatureError:
            return jsonify({
                "status": "error",
                "message": "Token expired"
            }), 401

        except Exception:
            return jsonify({
                "status": "error",
                "message": "Invalid token"
            }), 401

        return f(current_user_id, current_user_role, *args, **kwargs)

    return decorated
    
# def log_session(
#     user_id,
#     device_model,
#     client_type,
#     os_name,
#     os_version,
#     login_ip,
#     city,
#     country
# ):
#     conn = None
#     cursor = None

#     try:
#         now = datetime.utcnow()

#         conn = get_db()
#         cursor = conn.cursor(buffered=True)

#         cursor.execute("""
#             SELECT session_id
#             FROM user_sessions
#             WHERE user_id=%s
#             AND device_model=%s
#             AND client_type=%s
#             AND os_name=%s
#             AND ip_address=%s
#         """, (
#             user_id,
#             device_model,
#             client_type,
#             os_name,
#             login_ip
#         ))

#         existing_session = cursor.fetchone()

#         if existing_session:
#             cursor.execute("""
#                 UPDATE user_sessions
#                 SET
#                     last_active_time=%s,
#                     os_version=%s,
#                     location_city=%s,
#                     location_country=%s,
#                     is_current=TRUE,
#                     active=TRUE
#                 WHERE session_id=%s
#             """, (
#                 now,
#                 os_version,
#                 city,
#                 country,
#                 existing_session[0]
#             ))
#         else:
#             cursor.execute("""
#                 INSERT INTO user_sessions (
#                     user_id,
#                     device_model,
#                     client_type,
#                     os_name,
#                     os_version,
#                     ip_address,
#                     location_city,
#                     location_country,
#                     login_time,
#                     last_active_time,
#                     is_current,
#                     active
#                 )
#                 VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
#             """, (
#                 user_id,
#                 device_model,
#                 client_type,
#                 os_name,
#                 os_version,
#                 login_ip,
#                 city,
#                 country,
#                 now,
#                 now,
#                 True,
#                 True
#             ))

#         conn.commit()

#     except Exception as e:
#         print(f"log_session error: {e}")

#         if conn:
#             conn.rollback()

#         raise

#     finally:
#         if cursor:
#             cursor.close()

#         if conn:
#             conn.close()


LOGO_PATH = "https://res.cloudinary.com/dkb987i8w/image/upload/v1772108684/app_logo_ky1yis.png" 

# Try to register custom fonts if available, fallback to Helvetica
try:
    font_path = os.path.join(current_app.root_path, "static", "fonts", "Inter-Regular.ttf")
    font_bold_path = os.path.join(current_app.root_path, "static", "fonts", "Inter-Bold.ttf")
    if os.path.exists(font_path) and os.path.exists(font_bold_path):
        pdfmetrics.registerFont(TTFont('Inter', font_path))
        pdfmetrics.registerFont(TTFont('Inter-Bold', font_bold_path))
        FONT_FAMILY = 'Inter'
        FONT_BOLD = 'Inter-Bold'
    else:
        FONT_FAMILY = 'Helvetica'
        FONT_BOLD = 'Helvetica-Bold'
except:
    FONT_FAMILY = 'Helvetica'
    FONT_BOLD = 'Helvetica-Bold'


def generate_invoice_pdf(invoice_id, client_name, client_email,
                         invoice_date, due_date, status,
                         items, subtotal, tax, total,
                         amount_paid, balance, notes,
                         company_name="Business Essentials Prime",
                         company_address="Ibadan, Nigeria",
                         company_email="hello@businessessentia.net",
                         company_phone="+234 800 000 0000",
                         company_website="www.businessessentia.net"):

    invoice_dir = os.path.join(current_app.root_path, "static", "invoices")
    safe_client_name = re.sub(r"[^a-zA-Z0-9_-]", "_", client_name)
    filename = f"invoice_{invoice_id}_{safe_client_name}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    
    os.makedirs(invoice_dir, exist_ok=True)
    file_path = os.path.join(invoice_dir, filename)

    doc = SimpleDocTemplate(
        file_path, pagesize=A4,
        rightMargin=45, leftMargin=45,
        topMargin=30, bottomMargin=40
    )

    # ---------- COLOR PALETTE ----------
    BRAND_PRIMARY = colors.HexColor("#1558B0")
    BRAND_SECONDARY = colors.HexColor("#4361ee")
    BRAND_LIGHT = colors.HexColor("#f0f4ff")
    BRAND_ACCENT = colors.HexColor("#4895ef")
    TEXT_DARK = colors.HexColor("#1e293b")
    TEXT_MEDIUM = colors.HexColor("#475569")
    TEXT_LIGHT = colors.HexColor("#64748b")
    BORDER_LIGHT = colors.HexColor("#e2e8f0")
    BG_LIGHT = colors.HexColor("#f8fafc")
    SUCCESS = colors.HexColor("#10b981")
    SUCCESS_BG = colors.HexColor("#d1fae5")
    DANGER = colors.HexColor("#ef4444")
    DANGER_BG = colors.HexColor("#fee2e2")
    WARNING = colors.HexColor("#f59e0b")
    WARNING_BG = colors.HexColor("#fef3c7")

    # Status color mapping
    status_colors = {
        "paid": (SUCCESS, SUCCESS_BG),
        "pending": (WARNING, WARNING_BG),
        "overdue": (DANGER, DANGER_BG),
        "draft": (TEXT_LIGHT, BG_LIGHT),
    }
    status_color, status_bg = status_colors.get(status.lower(), (TEXT_LIGHT, BG_LIGHT))

    # ---------- STYLES ----------
    styles = getSampleStyleSheet()
    
    style_title = ParagraphStyle(
        'CustomTitle', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=28, textColor=BRAND_PRIMARY,
        spaceAfter=4, leading=32
    )
    style_subtitle = ParagraphStyle(
        'CustomSubtitle', parent=styles['Normal'],
        fontName=FONT_FAMILY, fontSize=10, textColor=TEXT_LIGHT,
        spaceAfter=0, leading=14
    )
    style_section_header = ParagraphStyle(
        'SectionHeader', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=10, textColor=BRAND_PRIMARY,
        spaceAfter=8, leading=14, spaceBefore=12
    )
    style_label = ParagraphStyle(
        'Label', parent=styles['Normal'],
        fontName=FONT_FAMILY, fontSize=8, textColor=TEXT_LIGHT,
        leading=11, spaceAfter=2
    )
    style_value = ParagraphStyle(
        'Value', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=10, textColor=TEXT_DARK,
        leading=14, spaceAfter=6
    )
    style_body = ParagraphStyle(
        'Body', parent=styles['Normal'],
        fontName=FONT_FAMILY, fontSize=9, textColor=TEXT_MEDIUM,
        leading=13
    )
    style_small = ParagraphStyle(
        'Small', parent=styles['Normal'],
        fontName=FONT_FAMILY, fontSize=8, textColor=TEXT_LIGHT,
        leading=11
    )
    style_footer = ParagraphStyle(
        'Footer', parent=styles['Normal'],
        fontName=FONT_FAMILY, fontSize=7.5, textColor=TEXT_LIGHT,
        leading=10, alignment=1  # center
    )
    style_thank_you = ParagraphStyle(
        'ThankYou', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=11, textColor=BRAND_PRIMARY,
        alignment=1, spaceAfter=6, leading=14
    )

    elements = []

    # ========== TOP ACCENT BAR ==========
    accent_bar = Table([['']], colWidths=[480], rowHeights=[6])
    accent_bar.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BRAND_PRIMARY),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(accent_bar)
    elements.append(Spacer(1, 20))

    # ========== HEADER: COMPANY INFO + INVOICE TITLE ==========
    # Left side: Company info
    logo_path = os.path.join(current_app.root_path, "static", "media", "app logo.png")
    if os.path.exists(logo_path):
        logo = Image(logo_path, width=100, height=33)
        logo.hAlign = 'LEFT'
        elements.append(logo)
    else:
        elements.append(Paragraph(
            f"<b>{company_name}</b>",
            ParagraphStyle('CompanyName', parent=styles['Normal'],
                          fontName=FONT_BOLD, fontSize=14, textColor=BRAND_PRIMARY)
        ))
    
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(company_address, style_small))
    elements.append(Paragraph(company_email, style_small))
    elements.append(Paragraph(company_phone, style_small))
    elements.append(Paragraph(company_website, style_small))

    # Right side: Invoice title and details (using a table for alignment)
    invoice_title_data = [[
        '',
        Paragraph("INVOICE", style_title)
    ], [
        '',
        Paragraph(f"#{invoice_id}", ParagraphStyle(
            'InvoiceNum', parent=styles['Normal'],
            fontName=FONT_BOLD, fontSize=11, textColor=TEXT_MEDIUM,
            leading=14
        ))
    ], [
        '',
        # Status badge
        Table([[Paragraph(
            f"<b>{status.upper()}</b>",
            ParagraphStyle('StatusText', parent=styles['Normal'],
                          fontName=FONT_BOLD, fontSize=8, textColor=status_color,
                          alignment=1, leading=11)
        )]], colWidths=[80], rowHeights=[20])
    ]]
    
    invoice_title_table = Table(invoice_title_data, colWidths=[280, 200])
    invoice_title_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        # Style the status badge cell
        ('BACKGROUND', (1, 2), (1, 2), status_bg),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    
    # Combine header into a single table for proper alignment
    header_left = [
        [logo if os.path.exists(logo_path) else Paragraph(f"<b>{company_name}</b>", 
            ParagraphStyle('CN', parent=styles['Normal'], fontName=FONT_BOLD, fontSize=14, textColor=BRAND_PRIMARY))],
        [Paragraph(company_address, style_small)],
        [Paragraph(company_email, style_small)],
        [Paragraph(company_phone, style_small)],
    ]
    header_left_table = Table(header_left, colWidths=[280])
    header_left_table.setStyle(TableStyle([
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))

    header_right = [
        [Paragraph("INVOICE", style_title)],
        [Paragraph(f"#{invoice_id}", ParagraphStyle(
            'InvNum', parent=styles['Normal'],
            fontName=FONT_BOLD, fontSize=11, textColor=TEXT_MEDIUM, leading=14))],
        [Table([[Paragraph(f"<b>{status.upper()}</b>", ParagraphStyle(
            'StatusBadge', parent=styles['Normal'],
            fontName=FONT_BOLD, fontSize=8, textColor=status_color,
            alignment=1, leading=11))]], colWidths=[80], rowHeights=[20])]
    ]
    header_right_table = Table(header_right, colWidths=[200])
    header_right_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('BACKGROUND', (0, 2), (0, 2), status_bg),
    ]))

    main_header = Table([[header_left_table, header_right_table]], colWidths=[280, 200])
    main_header.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(main_header)
    elements.append(Spacer(1, 20))

    # ========== DIVIDER ==========
    elements.append(HRFlowable(width="100%", thickness=1, color=BORDER_LIGHT, spaceAfter=16))

    # ========== BILL TO + DATES SECTION ==========
    bill_to_content = [
        [Paragraph("BILL TO", style_section_header), '', 
         Paragraph("INVOICE DETAILS", style_section_header), ''],
        [Paragraph(client_name, style_value), '',
         Paragraph("Invoice Date", style_label), ''],
        [Paragraph(client_email, style_body), '',
         Paragraph(invoice_date, style_value), ''],
        [Spacer(1, 4), '',
         Paragraph("Due Date", style_label), ''],
        ['', '',
         Paragraph(due_date, style_value), ''],
    ]
    
    bill_to_table = Table(bill_to_content, colWidths=[200, 40, 120, 120])
    bill_to_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(bill_to_table)
    elements.append(Spacer(1, 24))

    # ========== ITEMS TABLE ==========
    # Table header
    item_header_style = ParagraphStyle(
        'ItemHeader', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=9, textColor=colors.white,
        leading=12
    )
    item_cell_style = ParagraphStyle(
        'ItemCell', parent=styles['Normal'],
        fontName=FONT_FAMILY, fontSize=9, textColor=TEXT_DARK,
        leading=13
    )
    item_cell_right = ParagraphStyle(
        'ItemCellRight', parent=styles['Normal'],
        fontName=FONT_FAMILY, fontSize=9, textColor=TEXT_DARK,
        leading=13, alignment=2  # right
    )
    item_cell_bold = ParagraphStyle(
        'ItemCellBold', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=9, textColor=TEXT_DARK,
        leading=13, alignment=2
    )

    item_data = [[
        Paragraph("DESCRIPTION", item_header_style),
        Paragraph("QTY", ParagraphStyle('QtyH', parent=item_header_style, alignment=1)),
        Paragraph("RATE", ParagraphStyle('RateH', parent=item_header_style, alignment=2)),
        Paragraph("AMOUNT", ParagraphStyle('AmtH', parent=item_header_style, alignment=2))
    ]]
    
    for idx, item in enumerate(items):
        line_total = item["quantity"] * item["price"]
        item_data.append([
            Paragraph(item["description"], item_cell_style),
            Paragraph(str(item["quantity"]), ParagraphStyle('Qty', parent=item_cell_style, alignment=1)),
            Paragraph(f"₦{item['price']:,.2f}", item_cell_right),
            Paragraph(f"₦{line_total:,.2f}", item_cell_bold)
        ])

    items_table = Table(item_data, colWidths=[240, 60, 90, 90])
    
    # Build table style
    table_style = [
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        # Data rows
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        # Grid
        ('LINEBELOW', (0, 0), (-1, 0), 0, colors.white),
        ('LINEBELOW', (0, 1), (-1, -1), 0.5, BORDER_LIGHT),
        ('LINEBEFORE', (0, 0), (-1, -1), 0, colors.white),
        ('LINEAFTER', (0, 0), (-1, -1), 0, colors.white),
        # Outer border
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]
    
    # Alternating row colors
    for i in range(1, len(item_data)):
        if i % 2 == 0:
            table_style.append(('BACKGROUND', (0, i), (-1, i), BG_LIGHT))
        else:
            table_style.append(('BACKGROUND', (0, i), (-1, i), colors.white))
    
    items_table.setStyle(TableStyle(table_style))
    elements.append(items_table)
    elements.append(Spacer(1, 20))

    # ========== TOTALS SECTION ==========
    totals_label_style = ParagraphStyle(
        'TotalsLabel', parent=styles['Normal'],
        fontName=FONT_FAMILY, fontSize=10, textColor=TEXT_MEDIUM,
        leading=14, alignment=2
    )
    totals_value_style = ParagraphStyle(
        'TotalsValue', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=10, textColor=TEXT_DARK,
        leading=14, alignment=2
    )
    totals_total_label = ParagraphStyle(
        'TotalsTotalLabel', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=12, textColor=TEXT_DARK,
        leading=16, alignment=2
    )
    totals_total_value = ParagraphStyle(
        'TotalsTotalValue', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=12, textColor=BRAND_PRIMARY,
        leading=16, alignment=2
    )
    balance_style = ParagraphStyle(
        'BalanceValue', parent=styles['Normal'],
        fontName=FONT_BOLD, fontSize=11, 
        textColor=SUCCESS if balance == 0 else DANGER,
        leading=14, alignment=2
    )

    totals_data = [
        [Paragraph("Subtotal", totals_label_style), Paragraph(f"₦{subtotal:,.2f}", totals_value_style)],
        [Paragraph(f"Tax", totals_label_style), Paragraph(f"₦{tax:,.2f}", totals_value_style)],
        [Paragraph("<b>Total</b>", totals_total_label), Paragraph(f"<b>₦{total:,.2f}</b>", totals_total_value)],
        [Paragraph("Amount Paid", totals_label_style), Paragraph(f"₦{amount_paid:,.2f}", totals_value_style)],
        [Paragraph("<b>Balance Due</b>", totals_total_label), Paragraph(f"<b>₦{balance:,.2f}</b>", balance_style)],
    ]
    
    totals_table = Table(totals_data, colWidths=[340, 140])
    totals_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        # Divider above total
        ('LINEABOVE', (0, 2), (-1, 2), 1, BORDER_LIGHT),
        # Highlight total row
        ('BACKGROUND', (0, 2), (-1, 2), BRAND_LIGHT),
        # Divider above balance
        ('LINEABOVE', (0, 4), (-1, 4), 0.5, BORDER_LIGHT),
        # Outer box
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 24))

    # ========== NOTES / TERMS ==========
    if notes:
        notes_box = Table([[
            Paragraph("<b>Notes & Terms</b>", ParagraphStyle(
                'NotesHeader', parent=styles['Normal'],
                fontName=FONT_BOLD, fontSize=9, textColor=BRAND_PRIMARY,
                leading=12, spaceAfter=6)),
        ], [
            Paragraph(notes, ParagraphStyle(
                'NotesBody', parent=styles['Normal'],
                fontName=FONT_FAMILY, fontSize=9, textColor=TEXT_MEDIUM,
                leading=13)),
        ]], colWidths=[480])
        notes_box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('LEFTPADDING', (0, 0), (-1, -1), 16),
            ('RIGHTPADDING', (0, 0), (-1, -1), 16),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
            ('ROUNDEDCORNERS', [6, 6, 6, 6]),
        ]))
        elements.append(notes_box)
        elements.append(Spacer(1, 30))

    # ========== FOOTER ==========
    elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_LIGHT, spaceAfter=12))
    
    elements.append(Paragraph("Thank you for your business!", style_thank_you))
    elements.append(Paragraph(
        f"{company_name} • {company_email} • {company_phone}",
        style_footer
    ))
    elements.append(Paragraph(
        f"If you have any questions about this invoice, please contact {company_email}",
        ParagraphStyle('FooterNote', parent=style_footer, fontSize=7, textColor=TEXT_LIGHT)
    ))

    # ========== BUILD PDF ==========
    doc.build(elements)
    return file_path


def send_basic_plan_invoice_email(
    client_email, client_name, invoice_id,
    invoice_date, due_date, status,
    subtotal, tax, total, amount_paid,
    balance, notes, items
):
    """
    Sends a clean, professional, and minimalist invoice email for Basic plan users.
    """
    # Generate PDF
    pdf_path = generate_invoice_pdf(
        invoice_id, client_name, client_email,
        invoice_date, due_date, status,
        items, subtotal, tax, total,
        amount_paid, balance, notes
    )

    brand_color = "#1558B0"
    
    # 1. Safely format items OUTSIDE the f-string to prevent Python syntax errors
    items_rows = "".join([
        f"<tr style='border-bottom: 1px solid #e2e8f0;'>"
        f"<td style='padding: 12px 8px; color: #334155; font-size: 14px;'>{item.get('description', 'Item')}</td>"
        f"<td style='padding: 12px 8px; color: #334155; font-size: 14px; text-align: center;'>{item.get('quantity', 1)}</td>"
        f"<td style='padding: 12px 8px; color: #334155; font-size: 14px; text-align: right;'>₦{item.get('price', 0):,.2f}</td>"
        f"<td style='padding: 12px 8px; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;'>₦{item.get('quantity', 1) * item.get('price', 0):,.2f}</td>"
        f"</tr>" 
        for item in items
    ])

    # 2. Pre-calculate conditional HTML OUTSIDE the f-string
    notes_html = f'<p style="margin: 0; font-size: 14px; color: #475569; background: #f8fafc; padding: 15px; border-radius: 6px; border-left: 3px solid {brand_color};"><strong>Notes:</strong> {notes}</p>' if notes else ''

    # 3. Clean f-string with ONLY simple {variable} interpolations
    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice #{invoice_id}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 30px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px 40px 20px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                            <img src="{LOGO_PATH}" alt="Business Essentials" style="height: 45px; margin-bottom: 15px; max-width: 100%;">
                            <h1 style="margin: 0; font-size: 20px; color: #0f172a; font-weight: 700;">Invoice #{invoice_id}</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px 40px;">
                            <p style="margin: 0 0 15px 0; font-size: 15px;">Hello <strong>{client_name}</strong>,</p>
                            <p style="margin: 0 0 25px 0; font-size: 15px; color: #475569;">Thank you for your business. Please find your invoice summary and details below.</p>

                            <!-- Summary Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 25px;">
                                <tr>
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; width: 50%;"><span style="color: #64748b; font-size: 13px;">Invoice Date</span><br><strong style="color: #0f172a; font-size: 14px;">{invoice_date}</strong></td>
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; width: 50%;"><span style="color: #64748b; font-size: 13px;">Due Date</span><br><strong style="color: #0f172a; font-size: 14px;">{due_date}</strong></td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 16px; width: 50%;"><span style="color: #64748b; font-size: 13px;">Status</span><br><strong style="color: {brand_color}; font-size: 14px;">{str(status).upper()}</strong></td>
                                    <td style="padding: 12px 16px; width: 50%;"><span style="color: #64748b; font-size: 13px;">Total Amount</span><br><strong style="color: #0f172a; font-size: 14px;">₦{total:,.2f}</strong></td>
                                </tr>
                            </table>

                            <!-- Items Table -->
                            <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #0f172a;">Invoice Items</p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 25px; font-size: 14px;">
                                <tr style="background-color: #f1f5f9;">
                                    <th style="padding: 10px 8px; text-align: left; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0;">Description</th>
                                    <th style="padding: 10px 8px; text-align: center; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0;">Qty</th>
                                    <th style="padding: 10px 8px; text-align: right; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0;">Price</th>
                                    <th style="padding: 10px 8px; text-align: right; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0;">Total</th>
                                </tr>
                                {items_rows}
                            </table>

                            <!-- Totals -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                                <tr>
                                    <td width="60%"></td>
                                    <td width="40%" style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                                        <span style="color: #64748b; font-size: 14px;">Subtotal:</span>
                                        <span style="float: right; color: #0f172a; font-size: 14px;">₦{subtotal:,.2f}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td width="60%"></td>
                                    <td width="40%" style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                                        <span style="color: #64748b; font-size: 14px;">Tax:</span>
                                        <span style="float: right; color: #0f172a; font-size: 14px;">₦{tax:,.2f}</span>
                                    </tr>
                                <tr>
                                    <td width="60%"></td>
                                    <td width="40%" style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                                        <span style="color: #64748b; font-size: 14px;">Amount Paid:</span>
                                        <span style="float: right; color: #0f172a; font-size: 14px;">₦{amount_paid:,.2f}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td width="60%"></td>
                                    <td width="40%" style="padding: 12px 0;">
                                        <span style="color: #0f172a; font-size: 15px; font-weight: 700;">Balance Due:</span>
                                        <span style="float: right; color: #dc2626; font-size: 15px; font-weight: 700;">₦{balance:,.2f}</span>
                                    </td>
                                </tr>
                            </table>

                            {notes_html}
                            
                            <p style="margin: 30px 0 0 0; font-size: 15px; color: #475569;">
                                Thank you for doing business with us.<br>
                                <strong style="color: #0f172a;">Business Essentials Team</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; font-size: 12px; color: #94a3b8;">This is an automated message. A PDF copy of this invoice is attached.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

    send_email(
        recipient=client_email,
        subject=f"Invoice #{invoice_id} from Business Essentials Prime",
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
    """
    Sends a premium, advanced, and highly polished invoice email for Pro plan users.
    """
    pay_link = f"https://www.businessessentia.net/pay/invoice/{invoice_id}"
    
    # Generate PDF
    pdf_path = generate_invoice_pdf(
        invoice_id, client_name, client_email,
        invoice_date, due_date, status,
        items, subtotal, tax, total,
        amount_paid, balance, notes
    )

    brand_primary = "#1558B0"
    brand_accent = "#4361ee"
    
    # Determine status badge color
    status_lower = str(status).lower()
    if status_lower == 'paid':
        badge_bg = "#d1fae5"; badge_text = "#065f46"
    elif status_lower == 'overdue':
        badge_bg = "#fee2e2"; badge_text = "#991b1b"
    else:
        badge_bg = "#fef3c7"; badge_text = "#92400e"

    # Safely format items
    items_rows = "".join([
        f"<tr style='border-bottom: 1px solid #f1f5f9;'>"
        f"<td style='padding: 14px 12px; color: #334155; font-size: 14px;'>{item.get('description', 'Item')}</td>"
        f"<td style='padding: 14px 12px; color: #334155; font-size: 14px; text-align: center;'>{item.get('quantity', 1)}</td>"
        f"<td style='padding: 14px 12px; color: #334155; font-size: 14px; text-align: right;'>₦{item.get('price', 0):,.2f}</td>"
        f"<td style='padding: 14px 12px; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;'>₦{item.get('quantity', 1) * item.get('price', 0):,.2f}</td>"
        f"</tr>" 
        for item in items
    ])

    # Pre-calculate dynamic colors and conditional blocks OUTSIDE the f-string 
    # to prevent Python SyntaxErrors
    balance_float = float(balance or 0)
    balance_color = "#10b981" if balance_float <= 0.01 else "#dc2626"

    notes_html = f'''
    <p style="margin: 0 0 30px 0; font-size: 14px; color: #475569; background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid {brand_primary}; line-height: 1.5;">
        <strong style="color: #0f172a;">Notes:</strong><br>{notes}
    </p>
    ''' if notes else ''

    cta_button_html = f'''
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
        <tr>
            <td align="center">
                <a href="{pay_link}" style="display: inline-block; background: linear-gradient(90deg, {brand_primary}, {brand_accent}); color: #ffffff !important; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(21, 88, 176, 0.25);">
                    Pay Securely Online
                </a>
            </td>
        </tr>
    </table>
    ''' if balance_float > 0.01 else ''

    html_body = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice #{invoice_id}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; -webkit-font-smoothing: antialiased;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table width="650" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
                        
                        <!-- Premium Top Accent Bar -->
                        <tr>
                            <td style="height: 6px; background: linear-gradient(90deg, {brand_primary}, {brand_accent});"></td>
                        </tr>

                        <!-- Header -->
                        <tr>
                            <td style="padding: 40px 40px 20px; text-align: center;">
                                <img src="{LOGO_PATH}" alt="Business Essentials Prime" style="height: 50px; margin-bottom: 20px; max-width: 100%;">
                                <h1 style="margin: 0; font-size: 24px; color: #0f172a; font-weight: 800; letter-spacing: -0.5px;">Invoice #{invoice_id}</h1>
                                <span style="display: inline-block; margin-top: 12px; background-color: {badge_bg}; color: {badge_text}; padding: 6px 16px; border-radius: 99px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">{status.upper()}</span>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 10px 40px 40px;">
                                <p style="margin: 0 0 10px 0; font-size: 16px; color: #0f172a;">Hello <strong>{client_name}</strong>,</p>
                                <p style="margin: 0 0 30px 0; font-size: 15px; color: #475569; line-height: 1.6;">Thank you for choosing Business Essentials Prime. Please find your invoice details below. A PDF copy is also attached for your records.</p>

                                <!-- Premium Summary Grid -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 30px; overflow: hidden;">
                                    <tr>
                                        <td width="50%" style="padding: 16px 20px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                                            <span style="display: block; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Invoice Date</span>
                                            <span style="color: #0f172a; font-size: 15px; font-weight: 600;">{invoice_date}</span>
                                        </td>
                                        <td width="50%" style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                                            <span style="display: block; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Due Date</span>
                                            <span style="color: #0f172a; font-size: 15px; font-weight: 600;">{due_date}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="50%" style="padding: 16px 20px; border-right: 1px solid #e2e8f0;">
                                            <span style="display: block; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Total Amount</span>
                                            <span style="color: #0f172a; font-size: 15px; font-weight: 600;">₦{total:,.2f}</span>
                                        </td>
                                        <td width="50%" style="padding: 16px 20px;">
                                            <span style="display: block; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Balance Due</span>
                                            <span style="color: {balance_color}; font-size: 15px; font-weight: 700;">₦{balance:,.2f}</span>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Items Table -->
                                <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Items</p>
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 30px; font-size: 14px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                                    <tr style="background-color: {brand_primary};">
                                        <th style="padding: 12px 12px; text-align: left; color: #ffffff; font-weight: 600; font-size: 13px;">Description</th>
                                        <th style="padding: 12px 12px; text-align: center; color: #ffffff; font-weight: 600; font-size: 13px;">Qty</th>
                                        <th style="padding: 12px 12px; text-align: right; color: #ffffff; font-weight: 600; font-size: 13px;">Price</th>
                                        <th style="padding: 12px 12px; text-align: right; color: #ffffff; font-weight: 600; font-size: 13px;">Total</th>
                                    </tr>
                                    {items_rows}
                                </table>

                                <!-- Advanced Totals Section -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                    <tr>
                                        <td width="60%"></td>
                                        <td width="40%" style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                            <span style="color: #64748b; font-size: 14px;">Subtotal</span>
                                            <span style="float: right; color: #334155; font-size: 14px;">₦{subtotal:,.2f}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="60%"></td>
                                        <td width="40%" style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                            <span style="color: #64748b; font-size: 14px;">Tax</span>
                                            <span style="float: right; color: #334155; font-size: 14px;">₦{tax:,.2f}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="60%"></td>
                                        <td width="40%" style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                            <span style="color: #64748b; font-size: 14px;">Amount Paid</span>
                                            <span style="float: right; color: #334155; font-size: 14px;">₦{amount_paid:,.2f}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="60%"></td>
                                        <td width="40%" style="padding: 16px 0;">
                                            <span style="color: #0f172a; font-size: 16px; font-weight: 800;">Balance Due</span>
                                            <span style="float: right; color: {balance_color}; font-size: 16px; font-weight: 800;">₦{balance:,.2f}</span>
                                        </td>
                                    </tr>
                                </table>

                                {notes_html}
                                {cta_button_html}

                                <p style="margin: 0; font-size: 15px; color: #475569; line-height: 1.6;">
                                    Thank you for powering your business with us.<br>
                                    <strong style="color: #0f172a;">Business Essentials Prime Team</strong>
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Premium Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569; font-weight: 600;">Need help with this invoice?</p>
                                <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                                    Contact our priority support at <a href="mailto:support@businessessentia.net" style="color: {brand_primary}; text-decoration: none; font-weight: 600;">support@businessessentia.net</a><br>
                                    This is an automated message. A PDF copy is attached.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    send_email(
        recipient=client_email,
        subject=f"Invoice #{invoice_id} from Business Essentials Prime",
        body=html_body,
        html=True,
        attachments=[pdf_path]
    )
    
from contextlib import contextmanager


@contextmanager
def db_cursor(
    dictionary=False
):

    conn = None
    cursor = None

    try:

        conn = get_db()

        # reconnect if dead
        if not conn.is_connected():

            print(
                "DB reconnecting..."
            )

            conn.reconnect(
                attempts=3,
                delay=2
            )

        cursor = conn.cursor(
            dictionary=dictionary,
            buffered=True
        )

        yield conn, cursor

        if conn.is_connected():
            conn.commit()

    except Exception:

        # rollback safely
        try:

            if (
                conn
                and
                conn.is_connected()
            ):
                conn.rollback()

        except Exception as rollback_error:

            print(
                "Rollback failed:",
                rollback_error
            )

        raise

    finally:

        try:

            if cursor:
                cursor.close()

        except Exception as e:

            print(
                "Cursor close failed:",
                e
            )

        try:

            if (
                conn
                and
                conn.is_connected()
            ):
                conn.close()

        except Exception as e:

            print(
                "Connection close failed:",
                e
            )

def detect_location():
     ip = request.headers.get("X-Forwarded-For", request.remote_addr)
     response = requests.get(f"https://ipinfo.io/{ip}/json", timeout=5)
     data = response.json()

     country = data.get("country")
     state = data.get("region")
     city = data.get("city")

     return country, state, city

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


def log_session_phone(
    user_id,
    device_info,
    ip_address,
    user_agent=None,
    location=None,
    latitude=None,
    longitude=None
):

    device_id = generate_device_id_phone(
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
                    device_info.get("modelName"),
                    device_info.get("brand"),
                    device_info.get("osName"),
                    ip_address,
                    location,
                    latitude,
                    longitude,
                    user_agent
                )
            )

    return session_token
    
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

def generate_device_id_phone(ip_address):
    raw = f"{ip_address}"
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
                SELECT 
                    i.id,
                    i.user_id, 
                    i.client_id,
                    c.client_email, 
                    c.client_name, 
                    i.due_date, 
                    i.total AS total_amount
                    
                FROM invoices i

                
                LEFT JOIN clients c
                ON c.id=i.client_id
                
                WHERE status = 'unpaid'
            """)
            invoices = cursor.fetchall()

        now = datetime.now().date()


        for invoice in invoices:

            invoice_id = invoice["id"]
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
                    WHERE id = %s
                """, (invoice_id,))
                conn.commit()

                cursor.execute("""
                    SELECT email, username, plan
                    FROM user_base
                    WHERE user_id = %s
                """, (user_id,))

                user_info = cursor.fetchone()

     
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
    Sends a professional, modern overdue invoice email to the client.
    """
    brand_color = "#1558B0"
    overdue_color = "#DC2626"
    
    # Safely format variables
    total_formatted = f"₦{total:,.2f}" if total is not None else "N/A"
    due_date_formatted = due_date if due_date else "N/A"

    html_body = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Overdue Invoice Reminder</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; color: #334155; }}
            .email-container {{ max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
            .header {{ padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; }}
            .content {{ padding: 32px 40px; line-height: 1.6; }}
            .details-table {{ width: 100%; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; border-collapse: collapse; margin: 24px 0; }}
            .details-table td {{ padding: 14px 16px; border-bottom: 1px solid #e2e8f0; }}
            .details-table tr:last-child td {{ border-bottom: none; }}
            .detail-label {{ color: #64748b; font-size: 14px; width: 45%; }}
            .detail-value {{ color: #0f172a; font-weight: 600; font-size: 15px; text-align: right; }}
            .btn-primary {{ display: inline-block; background-color: {brand_color}; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin-top: 16px; text-align: center; }}
            .footer {{ background-color: #f8fafc; padding: 24px 40px; text-align: center; color: #94a3b8; font-size: 13px; border-top: 1px solid #e2e8f0; }}
            .overdue {{ color: {overdue_color}; font-weight: 700; }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <img src="{APP_LOGO}" alt="Business Essentials Prime" width="140" style="margin-bottom: 16px; max-width: 100%; height: auto;">
                <h1 style="margin: 0; font-size: 22px; color: #0f172a; font-weight: 700;">Invoice Overdue Reminder</h1>
            </div>
            
            <div class="content">
                <p style="margin-top: 0; font-size: 16px;">Dear <strong>{client_name}</strong>,</p>
                <p style="font-size: 15px;">We hope this email finds you well. This is a friendly reminder that your invoice <strong>#{invoice_id}</strong> is currently <span class="overdue">overdue</span>.</p>
                
                <table class="details-table">
                    <tr>
                        <td class="detail-label">Invoice Number</td>
                        <td class="detail-value">#{invoice_id}</td>
                    </tr>
                    <tr>
                        <td class="detail-label">Due Date</td>
                        <td class="detail-value">{due_date_formatted}</td>
                    </tr>
                    <tr>
                        <td class="detail-label">Total Amount Due</td>
                        <td class="detail-value" style="color: {overdue_color}; font-size: 16px;">{total_formatted}</td>
                    </tr>
                </table>

                <p style="font-size: 15px;">Please settle this amount at your earliest convenience to ensure uninterrupted service and avoid any potential late fees.</p>

                {f'''
                <div style="text-align: center; margin-top: 28px; margin-bottom: 10px;">
                    <a href="{pay_link}" class="btn-primary">Pay Invoice Now</a>
                </div>
                ''' if pay_link else ''}

                <p style="font-size: 14px; color: #64748b; margin-top: 28px;">
                    <em>If you have already made this payment, please disregard this notice. Thank you for your prompt attention to this matter.</em>
                </p>
            </div>

            <div class="footer">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #475569;">Business Essentials Prime</p>
                <p style="margin: 0;">This is an automated message. For support, please contact <a href="mailto:support@businessessentia.net" style="color: {brand_color}; text-decoration: none;">support@businessessentia.net</a></p>
            </div>
        </div>
    </body>
    </html>
    """

    send_email(
        recipient=client_email,
        subject=f"Overdue Reminder: Invoice #{invoice_id} from Business Essentials Prime",
        body=html_body,
        html=True
    )


def send_overdue_invoice_email_to_user(user_email, username, invoice_id, client_name, total, due_date):
    """
    Sends a professional, modern overdue invoice alert to the business owner/user.
    """
    brand_color = "#1558B0"
    alert_color = "#DC2626"
    
    total_formatted = f"₦{total:,.2f}" if total is not None else "N/A"
    due_date_formatted = due_date if due_date else "N/A"

    html_body = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Overdue Invoice Alert</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; color: #334155; }}
            .email-container {{ max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
            .header {{ padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; }}
            .content {{ padding: 32px 40px; line-height: 1.6; }}
            .alert-box {{ background-color: #fef2f2; border-left: 4px solid {alert_color}; border-radius: 6px; padding: 16px 20px; margin: 20px 0; }}
            .alert-text {{ color: #991b1b; font-size: 15px; margin: 0; }}
            .details-table {{ width: 100%; border-collapse: collapse; margin: 24px 0; }}
            .details-table td {{ padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-size: 15px; }}
            .details-table tr:last-child td {{ border-bottom: none; }}
            .details-table .label {{ color: #64748b; width: 40%; }}
            .details-table .value {{ color: #0f172a; font-weight: 600; text-align: right; }}
            .footer {{ background-color: #f8fafc; padding: 24px 40px; text-align: center; color: #94a3b8; font-size: 13px; border-top: 1px solid #e2e8f0; }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <img src="{APP_LOGO}" alt="Business Essentials Prime" width="140" style="margin-bottom: 16px; max-width: 100%; height: auto;">
                <h1 style="margin: 0; font-size: 22px; color: #0f172a; font-weight: 700;">Action Required: Overdue Invoice</h1>
            </div>
            
            <div class="content">
                <p style="margin-top: 0; font-size: 16px;">Hi <strong>{username}</strong>,</p>
                <p style="font-size: 15px;">This is an automated alert to inform you that an invoice you issued is now past its due date.</p>
                
                <div class="alert-box">
                    <p class="alert-text">
                        <strong>Invoice #{invoice_id}</strong> for <strong>{client_name}</strong> is currently <span style="color: {alert_color}; font-weight: 700;">overdue</span>.
                    </p>
                </div>

                <table class="details-table">
                    <tr>
                        <td class="label">Client Name</td>
                        <td class="value">{client_name}</td>
                    </tr>
                    <tr>
                        <td class="label">Invoice ID</td>
                        <td class="value">#{invoice_id}</td>
                    </tr>
                    <tr>
                        <td class="label">Original Due Date</td>
                        <td class="value">{due_date_formatted}</td>
                    </tr>
                    <tr>
                        <td class="label">Total Amount</td>
                        <td class="value" style="color: {alert_color};">{total_formatted}</td>
                    </tr>
                </table>

                <p style="font-size: 15px; color: #475569;">
                    We recommend following up with your client promptly. Maintaining timely payments is crucial for healthy cash flow and helps avoid the need for late fee penalties.
                </p>

                <p style="font-size: 15px; margin-top: 28px;">
                    Best regards,<br>
                    <strong style="color: #0f172a;">Business Essentials Prime Team</strong>
                </p>
            </div>

            <div class="footer">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #475569;">Business Essentials Prime</p>
                <p style="margin: 0;">This is an automated notification. Please do not reply directly to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """

    send_email(
        recipient=user_email,
        subject=f"Action Required: Invoice #{invoice_id} for {client_name} is Overdue",
        body=html_body,
        html=True
    )
    
def process_expired_subscriptions():

    print("Checking expired subscriptions...")

    try:

        with db_cursor(dictionary=True) as (conn,cursor):

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
                conn.commit()

                print(
                    f"Expired {user_id}"
                )


    except Exception as e:

        print(
            "SUB EXPIRY ERROR:",
            e
        )

def process_invoice_due_notifications():

    now = datetime.utcnow().date()

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

        invoices = cursor.fetchall()

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




def send_subscription_expiry_email(
    email,
    username,
    expires_at,
    days_remaining
):
    """
    Sends a professional Business Essential Prime
    subscription-expiry reminder.
    """

    try:

        expiry_date = expires_at.strftime("%B %d, %Y")
        expiry_time = expires_at.strftime("%I:%M %p UTC")

        if days_remaining == 3:
            headline = "Your subscription expires in 3 days"
            message = (
                "Your Business Essential Prime subscription "
                "is approaching its expiration date."
            )

        elif days_remaining == 1:
            headline = "Your subscription expires tomorrow"
            message = (
                "Your Business Essential Prime subscription "
                "expires tomorrow. Renew now to avoid interruption."
            )

        elif days_remaining == 0:
            headline = "Your subscription expires today"
            message = (
                "Your Business Essential Prime subscription "
                "expires today. Renew now to keep your account active."
            )

        else:
            headline = "Your subscription has expired"
            message = (
                "Your Business Essential Prime subscription "
                "has expired."
            )

        html = f"""
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta name="viewport"
      content="width=device-width, initial-scale=1.0">

<title>Subscription Reminder</title>

</head>


<body style="
    margin:0;
    padding:0;
    background:#F4F7FC;
    font-family:Arial,Helvetica,sans-serif;
">


<table width="100%"
       cellpadding="0"
       cellspacing="0"
       border="0"
       style="background:#F4F7FC;padding:40px 15px;">

<tr>

<td align="center">


<table width="100%"
       cellpadding="0"
       cellspacing="0"
       border="0"
       style="
           max-width:620px;
           background:#FFFFFF;
           border-radius:20px;
           overflow:hidden;
           box-shadow:0 10px 35px rgba(0,0,0,0.08);
       ">


<!-- HEADER -->

<tr>

<td style="
    padding:30px 35px;
    background:linear-gradient(
        135deg,
        #4361EE,
        #2575FC
    );
">

<table width="100%">

<tr>

<td>

<div style="
    font-size:24px;
    font-weight:700;
    color:#FFFFFF;
">

Business Essential

</div>

<div style="
    margin-top:5px;
    font-size:13px;
    color:rgba(255,255,255,0.85);
">

PRIME BUSINESS MANAGEMENT

</div>

</td>

<td align="right">

<div style="
    width:48px;
    height:48px;
    line-height:48px;
    text-align:center;
    background:rgba(255,255,255,0.15);
    border-radius:14px;
    font-size:24px;
">

⏳

</div>

</td>

</tr>

</table>

</td>

</tr>


<!-- CONTENT -->

<tr>

<td style="
    padding:40px 35px;
">

<div style="
    font-size:14px;
    color:#64748B;
">

Hello {username},

</div>


<h1 style="
    margin:12px 0 15px;
    font-size:28px;
    line-height:1.3;
    color:#1E293B;
">

{headline}

</h1>


<p style="
    margin:0 0 25px;
    font-size:16px;
    line-height:1.7;
    color:#64748B;
">

{message}

</p>


<!-- EXPIRY CARD -->

<table width="100%"
       cellpadding="0"
       cellspacing="0"
       style="
           background:#F8FAFC;
           border:1px solid #E2E8F0;
           border-radius:16px;
       ">

<tr>

<td style="padding:22px;">

<div style="
    font-size:12px;
    color:#64748B;
    text-transform:uppercase;
    letter-spacing:0.8px;
">

Subscription Expiration

</div>

<div style="
    margin-top:8px;
    font-size:20px;
    font-weight:700;
    color:#1E293B;
">

{expiry_date}

</div>

<div style="
    margin-top:5px;
    font-size:13px;
    color:#64748B;
">

{expiry_time}

</div>

</td>

<td align="right"
    style="padding:22px;">

<div style="
    display:inline-block;
    padding:8px 13px;
    border-radius:20px;
    background:#FFF4E5;
    color:#D97706;
    font-size:13px;
    font-weight:700;
">

{days_remaining} day{"s" if days_remaining != 1 else ""} remaining

</div>

</td>

</tr>

</table>


<!-- CTA -->

<table width="100%"
       cellpadding="0"
       cellspacing="0"
       style="margin-top:30px;">

<tr>

<td align="center">

<a href="https://www.businessessentia.net/subscription"
   style="
       display:inline-block;
       padding:15px 30px;
       background:linear-gradient(
           135deg,
           #4361EE,
           #2575FC
       );
       color:#FFFFFF;
       text-decoration:none;
       border-radius:12px;
       font-size:15px;
       font-weight:700;
   ">

Renew Subscription

</a>

</td>

</tr>

</table>


<p style="
    margin-top:30px;
    font-size:13px;
    line-height:1.7;
    color:#94A3B8;
    text-align:center;
">

Renew before your expiration date to maintain
uninterrupted access to your Business Essential
features.

</p>

</td>

</tr>


<!-- FOOTER -->

<tr>

<td style="
    padding:25px 35px;
    background:#F8FAFC;
    border-top:1px solid #E2E8F0;
    text-align:center;
">

<div style="
    font-size:13px;
    color:#64748B;
">

Business Essential Prime

</div>

<div style="
    margin-top:6px;
    font-size:12px;
    color:#94A3B8;
">

Smart business management made simple.

</div>

<div style="
    margin-top:15px;
    font-size:11px;
    color:#CBD5E1;
">

© {datetime.now().year} Business Essential.
All rights reserved.

</div>

</td>

</tr>


</table>

</td>

</tr>

</table>

</body>

</html>
"""

        # Use your existing email function here.
        send_email(
            to=email,
            subject=f"Business Essential — {headline}",
            html=html
        )

        return True

    except Exception as e:

        print(
            "SUBSCRIPTION EMAIL ERROR:",
            e
        )

        return False


def process_subscription_notifications():

    print("Checking subscription notifications...")

    try:

        with db_cursor(dictionary=True) as (conn, cursor):

            # -----------------------------------------
            # 3 DAYS BEFORE EXPIRATION
            # -----------------------------------------

            cursor.execute("""
                SELECT
                    us.id AS subscription_id,
                    us.user_id,
                    us.expires_at,
                    ub.username,
                    ub.email

                FROM user_subscriptions us

                INNER JOIN user_base ub
                    ON ub.user_id = us.user_id

                WHERE us.status = 'active'

                  AND DATE(us.expires_at)
                      = DATE(
                          UTC_TIMESTAMP()
                          + INTERVAL 3 DAY
                      )
            """)

            reminders = cursor.fetchall()

            print(
                f"Found {len(reminders)} subscriptions "
                f"requiring 3-day reminders"
            )


            for sub in reminders:

                subscription_id = sub["subscription_id"]

                user_id = sub["user_id"]


                # Check if reminder already sent

                cursor.execute("""
                    SELECT id

                    FROM subscription_notifications

                    WHERE subscription_id = %s

                      AND notification_type =
                          '3_day_reminder'

                    LIMIT 1
                """, (
                    subscription_id,
                ))

                already_sent = cursor.fetchone()


                if already_sent:

                    continue


                # Send email

                sent = send_subscription_expiry_email(
                    email=sub["email"],
                    username=sub["username"],
                    expires_at=sub["expires_at"],
                    days_remaining=3
                )


                if sent:

                    cursor.execute("""
                        INSERT INTO
                        subscription_notifications
                        (
                            subscription_id,
                            user_id,
                            notification_type
                        )

                        VALUES (
                            %s,
                            %s,
                            '3_day_reminder'
                        )
                    """, (
                        subscription_id,
                        user_id
                    ))

                    print(
                        f"3-day reminder sent to {user_id}"
                    )


            # -----------------------------------------
            # EXPIRE SUBSCRIPTIONS
            # -----------------------------------------

            cursor.execute("""
                SELECT
                    id,
                    user_id

                FROM user_subscriptions

                WHERE status = 'active'

                  AND expires_at <= UTC_TIMESTAMP()
            """)

            expired = cursor.fetchall()


            print(
                f"Found {len(expired)} expired subscriptions"
            )


            for sub in expired:

                user_id = sub["user_id"]

                subscription_id = sub["id"]


                cursor.execute("""
                    UPDATE user_subscriptions

                    SET status = 'expired'

                    WHERE id = %s
                """, (
                    subscription_id,
                ))


                cursor.execute("""
                    UPDATE user_base

                    SET
                        plan = 'Trial',
                        plan_expiration = NULL

                    WHERE user_id = %s
                """, (
                    user_id,
                ))


                print(
                    f"Expired subscription {subscription_id} "
                    f"for user {user_id}"
                )


            conn.commit()


    except Exception as e:

        print(
            "SUBSCRIPTION PROCESSOR ERROR:",
            e
        )
