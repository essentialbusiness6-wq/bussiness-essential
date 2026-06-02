from flask import (
  make_response, render_template, Blueprint, jsonify, request, session,redirect
)
from backend.utils import(
    get_db,
    send_email,
    token_required_admin,
    save_audit_activity, 
    log_admin_session,
    update_admin_session_activity,
    db_cursor
)
import pyotp
import qrcode
import io
import base64
import jwt
import secrets
from datetime import datetime, timedelta
import os 
from dotenv import load_dotenv

load_dotenv()


SECRET_KEY = os.getenv("SECRET_KEY")

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

@admin_bp.before_request
def refresh_activity():
    token = session.get("session_token")

    if token:
        update_admin_session_activity(token)


@admin_bp.route('/register')
def register_page():
    return render_template("admins/auth/register.html")

@admin_bp.route('/login')
def login_page():
    return render_template("admins/auth/login.html")

@admin_bp.route('/execute/super-admin-dashboard')
@token_required_admin
def execute_super_admin_dashboard(current_user_id, current_user_role, current_user_department):

    if current_user_role != 'super_admin' and current_user_department != 'executive':
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403

    conn = None
    cursor = None

    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True, buffered=True)

        # Admin name
        cursor.execute("""
            SELECT fullname
            FROM admins
            WHERE id = %s
        """, (current_user_id,))
        adminName = cursor.fetchone()['fullname']

        # Stats
        cursor.execute("""
            SELECT COUNT(*) AS total_admins_before
            FROM admins
            WHERE created_at < DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
            AND role != 'super_admin'
            AND department != 'executive'
        """)
        total_admins_before = cursor.fetchone()['total_admins_before']

        cursor.execute("""
            SELECT COUNT(*) AS total_admins_this_week
            FROM admins
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
            AND role != 'super_admin'
            AND department != 'executive'
        """)
        total_admins_this_week = cursor.fetchone()['total_admins_this_week']

        cursor.execute("""
            SELECT email, last_failed_login
            FROM admins
            WHERE last_failed_login >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            AND role != 'super_admin'
            AND department != 'executive'
        """)
        last_failed_logins = cursor.fetchall()

        cursor.execute("""
            SELECT COUNT(*) AS active_sessions
            FROM admins
            WHERE last_login >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
            AND role != 'super_admin'
            AND department != 'executive'
        """)
        active_sessions = cursor.fetchone()['active_sessions']

        # Admin list
        cursor.execute("""
            SELECT id, fullname, role, email, department, status,
                   last_login AS last_active,
                   two_factor_enabled, created_at
            FROM admins
            WHERE role != 'super_admin'
            AND department != 'executive'
            ORDER BY created_at DESC
        """)
        admin_raw = cursor.fetchall()

        admins = []
        for admin in admin_raw:
            last_active = admin['last_active']

            if last_active:
                try:
                    delta_days = (datetime.now() - last_active).days
                except:
                    delta_days = "Unknown"
            else:
                delta_days = "Never"

            admins.append({
                "id": admin['id'],
                "name": admin['fullname'],
                "email": admin['email'],
                "role": admin['role'],
                "department": admin['department'],
                "status": admin['status'],
                "last_active": delta_days,
                "two_factor_enabled": admin['two_factor_enabled'],
                "created_at": admin['created_at'].strftime("%Y-%m-%d %H:%M:%S")
            })

        # Audit logs
        cursor.execute("""
            SELECT type, description, created_at, ip_address
            FROM audit_activity
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY created_at DESC
            LIMIT 5
        """)
        audit_logs = cursor.fetchall()

        return render_template(
            "admins/execute/super-admin-dashboard.html",
            adminName=adminName,
            total_admins_before=total_admins_before,
            total_admins_this_week=total_admins_this_week,
            last_failed_logins=last_failed_logins,
            active_sessions=active_sessions,
            admins=admins,
            audit_logs=audit_logs
        )

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
          
@admin_bp.route('/execute/invite-keys')
@token_required_admin
def execute_invite_keys(current_user_id, current_user_role, current_user_department):

    if (
        current_user_role != 'super_admin'
        or current_user_department != 'executive'
    ):
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403

    conn = None
    cursor = None

    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT email, invite_key, employee_id, role, department, used
            FROM admin_invites
            ORDER BY created_at DESC
        """)

        invite_keys = cursor.fetchall()

        return render_template(
            "admins/execute/invite-keys.html",
            invite_keys=invite_keys
        )

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@admin_bp.route("/execute/admin-management")
@token_required_admin
def execute_admin_managemnt_oage(current_user_id, current_user_role, current_user_department):

    if (
        current_user_role != 'super_admin'
        or current_user_department != 'executive'
    ):
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403

    conn = None
    cursor = None

    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)

        # Admin name
        cursor.execute("""
            SELECT fullname
            FROM admins
            WHERE id = %s
        """, (current_user_id,))
        adminName = cursor.fetchone()['fullname']

        initials = "".join(word[0].upper() for word in adminName.split())

        # Total admins
        cursor.execute("""
            SELECT COUNT(*) AS total_admins
            FROM admins
            WHERE role != 'super_admin'
            AND department != 'executive'
        """)
        total_admins = cursor.fetchone()['total_admins']

        # Suspended
        cursor.execute("""
            SELECT COUNT(*) AS total_suspended
            FROM admins
            WHERE status=%s
            AND role != 'super_admin'
            AND department != 'executive'
        """, ("suspended",))
        suspended_admins = cursor.fetchone()['total_suspended']

        # Active
        cursor.execute("""
            SELECT COUNT(*) AS total_active
            FROM admins
            WHERE status=%s
            AND role != 'super_admin'
            AND department != 'executive'
        """, ("active",))
        active_admins = cursor.fetchone()['total_active']

        # Pending setup
        cursor.execute("""
            SELECT COUNT(*) AS pending_setup
            FROM admin_invites
            WHERE used != TRUE
        """)
        pending_setup = cursor.fetchone()['pending_setup']

        return render_template(
            "admins/execute/admin-management.html",
            total_admins=total_admins,
            active_admins=active_admins,
            suspended_admins=suspended_admins,
            pending_setup=pending_setup,
            adminName=adminName,
            initials=initials
        )

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
@admin_bp.route("/execute/admin-management/data")
@token_required_admin
def execute_admin_management_data(current_user_id, current_user_role, current_user_department):

    if (
        current_user_role != 'super_admin'
        or current_user_department != 'executive'
    ):
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403

    conn = None
    cursor = None

    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, fullname, role, email, department, status,
                   last_login AS last_active,
                   two_factor_enabled, created_at
            FROM admins
            WHERE role != 'super_admin'
            AND department != 'executive'
            ORDER BY created_at DESC
        """)

        admin_raw = cursor.fetchall()

        admins = []
        for admin in admin_raw:

            initials = "".join(word[0].upper() for word in admin['fullname'].split())

            last_active = admin['last_active']

            if last_active:
                try:
                    days = (datetime.now() - last_active).days
                except:
                    days = "Unknown"
            else:
                days = "Never"

            admins.append({
                "id": admin['id'],
                "name": admin['fullname'],
                "email": admin['email'],
                "role": admin['role'],
                "department": admin['department'],
                "status": admin['status'],
                "last_active": days,
                "two_factor_enabled": admin['two_factor_enabled'],
                "created_at": admin['created_at'].strftime("%Y-%m-%d %H:%M:%S"),
                "initials": initials
            })

        return jsonify({
            "success": True,
            "admins": admins
        })

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()



@admin_bp.route("/execute/security-audit")
@token_required_admin
def execute_security_audit_page(current_user_id, current_user_role,current_user_department):
    if (
        current_user_role != 'super_admin'
        or
        current_user_department != 'executive'
    ):
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403
    
    conn = None
    cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True, buffered=True)
  
        cursor.execute("""
          SELECT id, fullname
          FROM admins
          WHERE id = %s
        """, (current_user_id,))
        adminName = cursor.fetchone()['fullname']
        initials = "".join(word[0].upper() for word in adminName.split())

        cursor.execute("""
          SELECT COUNT(*) AS total
          FROM admins
          WHERE is_active = TRUE
        """)
        total_admins = cursor.fetchone()["total"]


        cursor.execute("""
          SELECT COUNT(*) AS total
          FROM admins
          WHERE two_factor_enabled = TRUE
            AND is_active = TRUE
        """)
        admins_2fa = cursor.fetchone()["total"]


        cursor.execute("""
          SELECT COUNT(*) AS total
          FROM user_base
          WHERE two_factor_enabled = TRUE
            AND active = TRUE
        """)
        users_2fa = cursor.fetchone()["total"]


        cursor.execute("""
          SELECT COUNT(*) AS total
          FROM user_base
          WHERE active = TRUE
        """)
        total_users = cursor.fetchone()["total"]

        total_accounts = total_admins + total_users
        total_2fa = admins_2fa + users_2fa

        adoption_rate = round(
          (total_2fa / total_accounts) * 100,
          1
        ) if total_accounts else 0


        cursor.execute("""
          SELECT COUNT(*) AS total
          FROM security_activity
          WHERE type='Login' AND title='Login Failed'
          AND created_at >= NOW() - INTERVAL 24 HOUR
        """)
        failed_logins = cursor.fetchone()["total"]

        cursor.execute("""
          SELECT COUNT(*) AS total
          FROM user_sessions
          WHERE is_active = TRUE
        """)
        active_sessions = cursor.fetchone()["total"]


        cursor.execute("""
          SELECT COUNT(*) AS total
          FROM security_activity
          WHERE title IN (
              'Login Failed'
          )
          AND created_at >= NOW() - INTERVAL 7 DAY
        """)
        threats_blocked = cursor.fetchone()["total"]
        return render_template(
          "admins/execute/security-audit.html",
          adminName=adminName,
          initials=initials,
          two_factor_rate=adoption_rate,
          failed_logins=failed_logins,
          active_sessions=active_sessions,
          threats_blocked=threats_blocked
        )
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@admin_bp.route("/execute/security-audit/logs")
@token_required_admin
def get_audit_logs(current_user_id, current_user_role, current_user_department):

    if (
        current_user_role != 'super_admin'
        or current_user_department != 'executive'
    ):
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403

    conn = None
    cursor = None

    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            (
                SELECT
                    aa.id,
                    'admin' AS type,
                    aa.type AS action,
                    aa.title,
                    aa.description,
                    aa.ip_address,
                    aa.created_at,
                    a.email AS email
                FROM audit_activity aa
                LEFT JOIN admins a
                    ON aa.admin_id = a.id
            )

            UNION ALL

            (
                SELECT
                    la.id,
                    'user' AS type,
                    la.type AS action,
                    la.title,
                    la.description,
                    NULL AS ip_address,
                    la.created_at,
                    u.email AS email
                FROM log_activity la
                LEFT JOIN user_base u
                    ON la.user_id = u.user_id
            )

            UNION ALL

            (
                SELECT
                    sa.id,
                    'security' AS type,
                    sa.type AS action,
                    sa.title,
                    sa.description,
                    sa.ip_address,
                    sa.created_at,
                    u.email AS email
                FROM security_activity sa
                LEFT JOIN user_base u
                    ON sa.user_id = u.user_id
            )

            ORDER BY created_at DESC
            LIMIT 200
        """)

        rows = cursor.fetchall()

        logs = []

        for row in rows:

            created_at = row.get("created_at")

            if created_at:
                try:
                    timestamp = created_at.strftime("%Y-%m-%d %H:%M:%S")
                except:
                    timestamp = str(created_at)
            else:
                timestamp = "Unknown"

            logs.append({
                "timestamp": timestamp,
                "user": row.get("email") or "unknown",
                "action": row.get("action"),
                "type": row.get("type"),
                "details": row.get("description") or row.get("title"),
                "ip": row.get("ip_address") or "-",
                "status": "success"
            })

        return jsonify({
            "success": True,
            "logs": logs
        })

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@admin_bp.route("/execute/system-config")
@token_required_admin
def execute_system_config_page(current_user_id, current_user_role,current_user_department):
    if (
        current_user_role != 'super_admin'
        or
        current_user_department != 'executive'
    ):
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403
    
    conn = None
    cursor = None
    try:
      conn = get_db()
      cursor = conn.cursor(dictionary=True, buffered=True)
      cursor.execute("""
          SELECT id, fullname
          FROM admins
          WHERE id = %s
      """, (current_user_id,))
      adminName = cursor.fetchone()['fullname']
      initials = "".join(word[0].upper() for word in adminName.split())
      return render_template("admins/execute/system-config.html", initials=initials, adminName=adminName)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
          
@admin_bp.route("/execute/billing-payout")
@token_required_admin
def execute_billing_payout_page(current_user_id, current_user_role,current_user_department):
    if (
        current_user_role != 'super_admin'
        or
        current_user_department != 'executive'
    ):
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403
    
    conn = None
    cursor = None
    try:
      conn = get_db()
      cursor = conn.cursor(dictionary=True, buffered=True)
      cursor.execute("""
          SELECT id, fullname
          FROM admins
          WHERE id = %s
      """, (current_user_id,))
      adminName = cursor.fetchone()['fullname']
      initials = "".join(word[0].upper() for word in adminName.split())
      return render_template("admins/execute/billing-payout.html",initials=initials, adminName=adminName)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@admin_bp.route("/execute/database-api")
@token_required_admin
def execute_database_api_page(current_user_id, current_user_role,current_user_department):
    if (
        current_user_role != 'super_admin'
        or
        current_user_department != 'executive'
    ):
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403
    
    conn = None
    cursor = None
    try:
      conn = get_db()
      cursor = conn.cursor(dictionary=True, buffered=True)
      cursor.execute("""
          SELECT id, fullname
          FROM admins
          WHERE id = %s
      """, (current_user_id,))
      adminName = cursor.fetchone()['fullname']
      initials = "".join(word[0].upper() for word in adminName.split())
      return render_template("admins/execute/database-api.html",initials=initials, adminName=adminName)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@admin_bp.route("/supprt/dashboard")
@token_required_admin
def support_dahsboard_page(    current_user_id,
    current_user_role,
    current_user_department):
    if (
        current_user_role != 'support'
        or
        current_user_department != 'support'
    ):
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403
    
    conn = None
    cursor = None
    try:
      conn = get_db()
      cursor = conn.cursor(dictionary=True, buffered=True)
      cursor.execute("""
          SELECT id, fullname
          FROM admins
          WHERE id = %s
      """, (current_user_id,))
      adminName = cursor.fetchone()['fullname']
      initials = "".join(word[0].upper() for word in adminName.split())
      return render_template("admins/support/support-dashboard.html",initials=initials, adminName=adminName)
    finally:
      if cursor:
          cursor.close()
      if conn:
          conn.close()

@admin_bp.route("/logout")
def logout():
    
    token = session.get("session_token")

    if token:
        update_admin_session_activity(token)
        session.pop("session_token", None)
        response = jsonify({
            "status": "success",
            "message": "Logged out successfully"
        })

        # REMOVE AUTH COOKIE
        response.delete_cookie("access_token")
        return redirect("/admin/login")
    else:
        return jsonify({"message": "No active session found"}), 400


@admin_bp.route("/support/dashboard/data")
@token_required_admin
def support_dashboard(
    current_user_id,
    current_user_role,
    current_user_department
):
    if (
        current_user_role != "support"
        or current_user_department != "support"
    ):
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403

    with db_cursor(dictionary=True) as (conn, cursor):

        # =========================
        # Stats
        # =========================

        cursor.execute("""
            SELECT COUNT(*) total
            FROM feedback
        """)
        total_feedback = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT COUNT(*) total
            FROM feedback
            WHERE status='In Review'
        """)
        review_count = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT COUNT(*) total
            FROM support_tickets
            WHERE status='resolved'
        """)
        resolved_count = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT COUNT(*) total
            FROM support_tickets
            WHERE status NOT IN ('resolved','closed')
            AND created_at < NOW() - INTERVAL 48 HOUR
        """)
        sla_breach = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT
                ROUND(
                    AVG(
                        TIMESTAMPDIFF(
                            HOUR,
                            created_at,
                            updated_at
                        )
                    ),
                    1
                ) avg_response
            FROM support_tickets
            WHERE status IN (
                'pending',
                'resolved',
                'closed'
            )
        """)

        avg_row = cursor.fetchone()
        avg_response = avg_row["avg_response"] or 0

        # =========================
        # Feedback Volume
        # =========================

        cursor.execute("""
            SELECT
                DAYNAME(created_at) day,
                feedback_type,
                COUNT(*) total
            FROM feedback
            WHERE created_at >= NOW() - INTERVAL 7 DAY
            GROUP BY DAYNAME(created_at), feedback_type
        """)

        volume_rows = cursor.fetchall()

        days = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday"
        ]

        volume_map = {
            d: {
                "day": d[:3],
                "bug": 0,
                "sug": 0
            }
            for d in days
        }

        for row in volume_rows:
            ftype = (row["feedback_type"] or "").lower()

            if "bug" in ftype:
                volume_map[row["day"]]["bug"] = row["total"]
            else:
                volume_map[row["day"]]["sug"] = row["total"]

        volume_data = list(volume_map.values())

        # =========================
        # Status Distribution
        # =========================

        cursor.execute("""
            SELECT
                status,
                COUNT(*) total
            FROM feedback
            GROUP BY status
        """)

        status_rows = cursor.fetchall()

        color_map = {
            "In Review": "#f39c12",
            "Resolved": "#2ecc71",
            "Closed": "#95a5a6"
        }

        status_data = [
            {
                "name": row["status"],
                "count": row["total"],
                "color": color_map.get(
                    row["status"],
                    "#3498db"
                )
            }
            for row in status_rows
        ]

        # =========================
        # Priority Queue
        # =========================

        cursor.execute("""
            SELECT
                f.id,
                f.subject,
                c.fullname,
                f.created_at
            FROM feedback f
            LEFT JOIN cust_base c
                ON f.user_id = c.user_id
            WHERE f.status='In Review'
            ORDER BY f.created_at DESC
            LIMIT 10
        """)

        priority_rows = cursor.fetchall()

        priority_data = [
            {
                "id": f"FB-{row['id']}",
                "title": row["subject"],
                "user": row["fullname"] or "Unknown User",
                "time": row["created_at"].strftime("%Y-%m-%d"),
                "priority": "high"
            }
            for row in priority_rows
        ]

        # =========================
        # Activity Feed
        # =========================

        cursor.execute("""
            (
                SELECT
                    'new' type,
                    CONCAT(
                        'New feedback submitted: ',
                        subject
                    ) text,
                    created_at activity_time
                FROM feedback
            )

            UNION ALL

            (
                SELECT
                    'status' type,
                    CONCAT(
                        'Support ticket #',
                        id,
                        ' changed to ',
                        status
                    ) text,
                    updated_at activity_time
                FROM support_tickets
            )

            ORDER BY activity_time DESC
            LIMIT 20
        """)

        activity_rows = cursor.fetchall()

        activity_data = [
            {
                "type": row["type"],
                "text": row["text"],
                "time": row["activity_time"].strftime(
                    "%Y-%m-%d %H:%M"
                )
            }
            for row in activity_rows
        ]

    return jsonify({
        "success": True,
        "stats": {
            "total": total_feedback,
            "review": review_count,
            "resolved": resolved_count,
            "response": f"{avg_response}h",
            "breach": sla_breach
        },
        "volume": volume_data,
        "status": status_data,
        "priority": priority_data,
        "activity": activity_data
    })
@admin_bp.route("/support/feedback-center")
@token_required_admin
def feedback_center_page(  current_user_id,
    current_user_role,
    current_user_department):
    if (
        current_user_role != 'support'
        or
        current_user_department != 'support'
    ):
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403
    
    with db_cursor(dictionary=True) as (conn, cursor):
      cursor.execute("""
          SELECT id, fullname
          FROM admins
          WHERE id = %s
      """, (current_user_id,))
      adminName = cursor.fetchone()['fullname']
      initials = "".join(word[0].upper() for word in adminName.split())

      return render_template("admins/support/feedback-management.html",initials=initials,adminName=adminName)

@admin_bp.route('/api/support/items', methods=['GET'])
@token_required_admin
def get_support_items(current_user_id,
    current_user_role,
    current_user_department):
    if (
        current_user_role != 'support'
        or
        current_user_department != 'support'
    ):
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                f.id,
                f.user_id,
                f.feedback_type as type,
                f.subject,
                f.message,
                f.status,
                f.created_at,
                'feedback' as source
            FROM feedback f

            UNION ALL

            SELECT
                s.id,
                s.user_id,
                s.category as type,
                s.subject,
                s.message,
                s.status,
                s.created_at,
                'ticket' as source
            FROM support_tickets s

            ORDER BY created_at DESC
        """)

        data = cursor.fetchall()

        return jsonify({
            "success": True,
            "data": data
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    finally:
        cursor.close()
        conn.close()
      
# ===== FUNCTIONS

from werkzeug.security import check_password_hash

@admin_bp.route('/api/login', methods=['POST'])
def admin_login():

    data = request.get_json()

    email = data.get('email')
    password = data.get('password')


    conn = get_db()
    cursor = conn.cursor(dictionary=True, buffered=True)

    try:
        cursor.execute(
            "SELECT * FROM admins WHERE email=%s",
            (email,)
        )

        admin = cursor.fetchone()

        if not admin:
            return jsonify({
                "success": False,
                "message": "Invalid credentials"
            }), 401
        
        if admin['status'] == "suspended":
            return jsonify({
                "success": False,
                "message": "Your account has been suspended contact the Executive Super Admin for review."
            }), 400
        if admin['locked']:

            return jsonify({
                 "success": False,
                 "message":  f"Account locked! Reason: {admin.get('lock_reason', 'Account locked')}" 
            }), 400
     
        if not check_password_hash(
            admin['password_hash'],
            password
        ):
            new_attempts = admin['failed_attempts'] + 1  
            cursor.execute(
                "UPDATE admins SET failed_attempts=%s, last_failed_login=NOW() WHERE email=%s",
                (new_attempts, email),
            )
            conn.commit()

            if new_attempts >= 3:
                cursor.execute(
                    "UPDATE admins SET locked=1, lock_reason=%s WHERE email=%s",
                    ("Too many failed login attempts", email),
                )
                conn.commit()

                if (admin['role'] != 'super_admin' or admin['department'] != 'executive'):
                    _ip_address = request.remote_addr
                    save_audit_activity(
                        admin['id'],
                        "Failed",
                        "Account Locked",
                        f"{admin['fullname']} account locked due to too many failed login attempts from {_ip_address}",
                        _ip_address
                    )

            if (admin['role'] != 'super_admin' or admin['department'] != 'executive'):
                _ip_address = request.remote_addr
                save_audit_activity(
                    admin['id'],
                    "Failed",
                    "Login Failed",
                    f"{admin['fullname']} failed to log in from {_ip_address}",
                    _ip_address
                )
            return jsonify({
                "success": False,
                "message": "Incorrect password"
            }), 401


        # --- Successful login ---

        cursor.execute(
            "UPDATE admins SET failed_attempts=0, last_login= NOW() WHERE email=%s",
            (email,)
        )


        conn.commit()

        _ip_address = request.remote_addr
        user_agent = request.headers.get('User-Agent', 'Unknown')

        session_token = os.urandom(24).hex()
        if (admin['role'] != 'super_admin' or admin['department'] != 'executive'):
            save_audit_activity(
                admin['id'],
                "Success",
                "Login Success",
                f"{admin['fullname']} logged in from {_ip_address}",
                _ip_address
            )

            log_admin_session(
                admin['id'],
                _ip_address,
                user_agent,
                session_token
            )

        
        session['session_token'] = session_token

        # IF 2FA ENABLED
        if admin['two_factor_enabled']:

            session['pending_admin_id'] = admin['id']



            return jsonify({
                "success": True,
                "requires_2fa": True,
                "qr_code": admin['qr']
            })

        
   
        payload = {
            "admin_id": admin['id'],
            "role": admin['role'],
            "department": admin['department'],
            "exp": datetime.utcnow() + timedelta(hours=24)
        }

        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")



    
        response = make_response(jsonify({
            "success": True,
            "requires_2fa": False,
            "message": "Login successful",
            "role": admin['role'],
            "department": admin['department']
        }))
        response.set_cookie(
            "access_token",
            token,
            httponly=True,
            secure=False,  # True when using HTTPS
            samesite="Lax",
            max_age=60 * 60 * 24 * 7
        )

        return response, 200
    except Exception as e:
        conn.rollback()
        print("Login error:", e)
        return jsonify({
            "success": False,
            "message": "An error occurred during login: " + str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/api/setup-2fa', methods=['POST'])
def setup_2fa():

    # =========================================
    # 1. GET ADMIN EMAIL FROM FRONTEND
    # =========================================
    
    data = request.get_json()

    email = data.get("email")

    if not email:
        return jsonify({
            "success": False,
            "message": "Email is required"
        }), 400


    # =========================================
    # 2. GENERATE SECRET KEY
    # =========================================

    secret = pyotp.random_base32()


    # =========================================
    # 3. SAVE SECRET TO DATABASE
    # =========================================
    # Example only
    # Replace with your real DB code




    # =========================================
    # 4. CREATE TOTP OBJECT
    # =========================================

    totp = pyotp.TOTP(secret)


    # =========================================
    # 5. CREATE AUTHENTICATOR URI
    # =========================================

    uri = totp.provisioning_uri(
        name=email,
        issuer_name="Business Essential"
    )


    # =========================================
    # 6. GENERATE QR CODE
    # =========================================

    qr = qrcode.make(uri)


    # =========================================
    # 7. CONVERT QR TO BASE64
    # =========================================

    buffer = io.BytesIO()

    qr.save(buffer, format="PNG")

    qr_base64 = base64.b64encode(
        buffer.getvalue()
    ).decode()

    with db_cursor(dictionary=True) as (conn, cursor):
      cursor.execute("""
          UPDATE admins
          SET two_factor_secret=%s, qr=%s
          WHERE email = %s
      """, (secret, qr_base64, email))


    # =========================================
    # 8. RETURN QR IMAGE
    # =========================================

    return jsonify({
        "success": True,
        "secret": secret,
        "qr_code": qr_base64
    })


import pyotp

@admin_bp.route('/api/verify-2fa', methods=['POST'])
def verify_2fa():

    admin_id = session.get('pending_admin_id')

    if not admin_id:
        return jsonify({
            "success": False,
            "message": "Session expired"
        }), 401

    data = request.get_json()

    code = data.get('code')

    with db_cursor(dictionary=True) as (conn, cursor):

      cursor.execute(
          "SELECT * FROM admins WHERE id=%s",
          (admin_id,)
      )

      admin = cursor.fetchone()

      totp = pyotp.TOTP(
        admin['two_factor_secret']
      )

      if not totp.verify(code):

          return jsonify({
              "success": False,
              "message": "Invalid code"
          }), 401

      # FULL LOGIN
      payload = {
        "admin_id": admin['id'],
        "role": admin['role'],
        "department": admin['department'],
        "exp": datetime.utcnow() + timedelta(hours=24)
      }
      token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

      session.pop('pending_admin_id')

      if (admin['role'] != 'super_admin' or admin['department'] != 'executive'):
          _ip_address = request.remote_addr
          save_audit_activity(
            admin['id'],
            "Success",
            "2FA Success",
            f"{admin['fullname']} successfully completed 2FA from {_ip_address}",
            _ip_address
          )

      response = make_response(jsonify({
            "success": True,
            "requires_2fa": False,
            "message": "Login successful",
            "role": admin['role'],
            "department": admin['department']
      }))
      response.set_cookie(
            "access_token",
            token,
            httponly=True,
            secure=False,  # True when using HTTPS
            samesite="Lax",
            max_age=60 * 60 * 24 * 7
        )

      return response, 200

@admin_bp.route('/generate-invite-key', methods=['POST'])
@token_required_admin
def generate_invite_key(current_user_id, current_user_role, current_user_department):
    data = request.get_json()
    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid JSON"
        }), 400


    email = data["email"]
    if not email:
        return jsonify({
            "status": "error",
            "message": "Email is required"
        }), 400


    # Check if invite key already exists
    conn = None
    cursor = None
    try:
      conn = get_db()
      cursor = conn.cursor(dictionary=True,buffered-=True)
      cursor.execute(
        "SELECT * FROM admin_invites WHERE email=%s",
        (email,)
      )

      existing_invite = cursor.fetchone()

      if existing_invite:
        return jsonify({
            "status": "error",
            "message": "An invite key already exists for this email"
        }), 400

      # Generate unique invite key
      invite_key = secrets.token_urlsafe(14)

      employee_id = "EMP-" + secrets.token_hex(4).upper() 

    
      cursor.execute("""
        INSERT INTO admin_invites (email, invite_key, employee_id, created_by, role)
        VALUES (%s, %s, %s, %s, %s)
      """, (email, invite_key, employee_id, current_user_id, 'N/A'))

      conn.commit()

      invite_key_generated_email = f"""


<html>
<head>
    <meta charset="UTF-8">
    <title>Business Essential Admin Invitation</title>
</head>

<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">


<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
        <td align="center">

            <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

                <!-- Header -->
                <tr>
                    <td style="background:#0f172a;padding:35px;text-align:center;">
                        <h1 style="color:#ffffff;margin:0;font-size:28px;">
                            Business Essential
                        </h1>

                        <p style="color:#cbd5e1;margin-top:10px;font-size:14px;">
                            Internal Administration Portal
                        </p>
                    </td>
                </tr>

                <!-- Body -->
                <tr>
                    <td style="padding:40px;">

                        <h2 style="margin-top:0;color:#111827;font-size:24px;">
                            Admin Invitation
                        </h2>

                        <p style="font-size:16px;color:#374151;line-height:1.7;">
                            Hello 
                        </p>

                        <p style="font-size:16px;color:#374151;line-height:1.7;">
                            You have been invited to join the 
                            <strong>Business Essential Internal Administration System</strong>.
                        </p>

                        <p style="font-size:16px;color:#374151;line-height:1.7;">
                            Please use the credentials below to complete your secure admin registration.
                        </p>

                        <!-- Credentials Box -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
                            <tr>
                                <td style="padding:30px;">

                                    <p style="margin:0 0 18px;font-size:15px;color:#6b7280;">
                                        Employee ID
                                    </p>

                                    <p style="margin:0 0 28px;font-size:24px;font-weight:bold;color:#111827;letter-spacing:1px;">
                                        {employee_id}
                                    </p>

                                    <p style="margin:0 0 18px;font-size:15px;color:#6b7280;">
                                        Registration Invite Key
                                    </p>

                                    <p style="margin:0;font-size:24px;font-weight:bold;color:#2563eb;letter-spacing:2px;">
                                        {invite_key}
                                    </p>

                                </td>
                            </tr>
                        </table>

                        <!-- Button -->
                        <table cellpadding="0" cellspacing="0" style="margin:35px 0;">
                            <tr>
                                <td align="center" bgcolor="#2563eb" style="border-radius:8px;">
                                    <a href="https://businessessentia.net/admin/register"
                                       style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;">
                                        Complete Registration
                                    </a>
                                </td>
                            </tr>
                        </table>

                        <!-- Security Notice -->
                        <div style="margin-top:35px;padding:20px;background:#fff7ed;border-left:4px solid #f97316;border-radius:8px;">
                            <p style="margin:0;color:#9a3412;font-size:14px;line-height:1.6;">
                                <strong>Security Notice:</strong><br>
                                This invite key is confidential and expires after first use or after 24 hours.
                                You will be required to configure two-factor authentication (2FA) during setup.
                            </p>
                        </div>

                        <!-- Footer Text -->
                        <p style="margin-top:35px;font-size:14px;color:#6b7280;line-height:1.7;">
                            If you were not expecting this invitation, please contact the Business Essential security team immediately.
                        </p>

                        <p style="margin-top:30px;font-size:15px;color:#374151;">
                            Regards,<br>
                            <strong>Business Essential Security Team</strong>
                        </p>

                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">

                        <p style="margin:0;font-size:12px;color:#9ca3af;">
                            © 2026 Business Essential. All rights reserved.
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
        email,
        "Your Admin Invitation for Business Essential",
        invite_key_generated_email.format(
            full_name=email.split("@")[0].capitalize(),
            employee_id=employee_id,
            invite_key=invite_key
        ),
        html=True
      )

      return jsonify({
        "status": "success",
        "message": "Invite key generated successfully",
        "invite_key": invite_key
      }), 201
    except Exception as e:
      conn.rollback()
      print(f"Failed to generate Key: {e}")
      return jsonify({
        "status": "error",
        "message": "Failed to generate invite key.",
        "detials": str(e)
      }), 201
    finally:
      if cursor:
        cursor.close()
      if conn:
        conn.close()


@admin_bp.route('/create-admin', methods=['POST'])
def create_admin():
    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Invalid JSON"
        }), 400


    # =========================================
    # GET FIELDS
    # =========================================

    name = data.get('name')
    email = data.get('email')
    employee_id = data.get('employee_id')
    registration_key = data.get('registration_key')
    role = data.get('role')
    department = data.get('department')
    password = data.get('password')


    # =========================================
    # VALIDATE REQUIRED FIELDS
    # =========================================

    required_fields = {
        "name": name,
        "email": email,
        "employeeId": employee_id,
        "registrationKey": registration_key,
        "role": role,
        "department": department,
        "password": password
    }

    for field_name, field_value in required_fields.items():

        if not field_value:

            return jsonify({
                "success": False,
                "message": f"Missing field: {field_name}"
            }), 400


    # =========================================
    # VALIDATE INTERNAL EMAIL
    # =========================================

    if not email.endswith("@businessessentia.net"):

        return jsonify({
            "success": False,
            "message": "Invalid internal email"
        }), 400


    # =========================================
    # PASSWORD VALIDATION
    # =========================================

    if len(password) < 8:

        return jsonify({
            "success": False,
            "message": "Password too short"
        }), 400


    conn = get_db()

    cursor = conn.cursor(
        dictionary=True,
        buffered=True
    )

    try:

        # =========================================
        # CHECK EXISTING ADMIN
        # =========================================

        cursor.execute(
            "SELECT id FROM admins WHERE email=%s",
            (email,)
        )

        existing_admin = cursor.fetchone()

        if existing_admin:

            return jsonify({
                "success": False,
                "message": "Admin account already exists"
            }),     409
        

        # =========================================
        # CHECK SUPER ADMIN RESTRICTIONS
        # =========================================

        if role.lower() == "super_admin":


            cursor.execute(
                """
                SELECT id, name, email
                FROM admins
                WHERE role = %s
                AND department = %s
                LIMIT 1
                """,
                (
                    "super_admin",
                    department.lower()
                )
            )

            existing_super_admin = cursor.fetchone()

            if existing_super_admin:

                return jsonify({
                    "success": False,
                    "message": (
                        f"A Super Admin already exists "
                        f"in the {department} department"
                    )
                }), 409



        # =========================================
        # VERIFY INVITE
        # =========================================

        cursor.execute(
            """
            SELECT *
            FROM admin_invites
            WHERE employee_id=%s
            AND invite_key=%s
            AND used=FALSE
             """,
            (
                employee_id,
                registration_key
            )
        )

        invite = cursor.fetchone()

        if not invite:

            return jsonify({
                "success": False,
                "message": "Invalid registration invite"
            }), 401



        # =========================================
        # HASH PASSWORD
        # =========================================

        from werkzeug.security import generate_password_hash

        hashed_password = generate_password_hash(
            password,
            method='pbkdf2:sha256'
        )


        # =========================================
        # CREATE ADMIN
        # =========================================

        cursor.execute(
            """
            INSERT INTO admins (
                fullname,
                email,
                employee_id,
                password_hash,
                role,
                department,
                two_factor_enabled,
                failed_attempts,
                locked,
                created_at
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())
            """,
            (
                name,
                email,
                employee_id,
                hashed_password,
                role,
                department,
                True,
                0,
                False
            )
        )


        # =========================================
        # MARK INVITE AS USED
        # =========================================

        cursor.execute(
            """
            UPDATE admin_invites
            SET used=TRUE,
                role=%s,
                department=%s
            WHERE id=%s
            """,
            (role,department,invite['id'])
        )

        conn.commit()


        # =========================================
        # SUCCESS RESPONSE
        # =========================================

        return jsonify({
            "success": True,
            "message": "Admin account created successfully"
        }), 201


    except Exception as e:

        conn.rollback()

        print("Create admin error:", e)

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


    finally:

        cursor.close()
        conn.close()



@admin_bp.route(
    "/execute/admin/management/suspend/<int:admin_id>",
    methods=["POST"]
)
@token_required_admin
def suspend_admin(
    current_user_id,
    current_user_role,
    current_user_department,
    admin_id
):

    # =========================================
    # AUTHORIZE SUPER ADMIN
    # =========================================

    if (
        current_user_role != 'super_admin'
        or
        current_user_department != 'executive'
    ):

        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403


    conn = get_db()

    cursor = conn.cursor(
        dictionary=True,
        buffered=True
    )

    try:

        # =========================================
        # FETCH TARGET ADMIN
        # =========================================

        cursor.execute(
            """
            SELECT *
            FROM admins
            WHERE id=%s
            """,
            (admin_id,)
        )

        admin = cursor.fetchone()


        # =========================================
        # CHECK ADMIN EXISTS
        # =========================================

        if not admin:

            return jsonify({
                "success": False,
                "message": "Admin not found"
            }), 404


        # =========================================
        # PREVENT SUSPENDING SUPER ADMIN
        # =========================================

        if (
            admin['role'] == 'super_admin'
            and
            admin['department'] == 'executive'
        ):

            return jsonify({
                "success": False,
                "message": (
                    "Executive Super Admin "
                    "cannot be suspended"
                )
            }), 403


        # =========================================
        # CHECK IF ALREADY SUSPENDED
        # =========================================

        if admin['status'] == 'suspended':

            return jsonify({
                "success": False,
                "message": "Admin already suspended"
            }), 400


        # =========================================
        # UPDATE ADMIN STATUS
        # =========================================

        cursor.execute(
            """
            UPDATE admins
            SET
                status=%s,
                is_active=FALSE
            WHERE id=%s
            """,
            (
                "suspended",
                admin_id
            )
        )

        conn.commit()


        # =========================================
        # SAVE AUDIT LOG
        # =========================================

        save_audit_activity(
            admin_id,
            "ACCOUNT_SUSPENSION",
            "Admin Account Suspended",
            (
                f"Admin account suspended. "
                f"Target Admin: {admin['fullname']} "
                f"({admin['email']}) | "
                f"Department: {admin['department']} | "
                f"Role: {admin['role']}"
            ),
            request.remote_addr
        )


        # =========================================
        # ADMIN DETAILS
        # =========================================

        email = admin['email']

        employee_id = admin['employee_id']

        name = admin['fullname']

        role = admin['role']

        department = admin['department']


        # =========================================
        # PROFESSIONAL EMAIL TEMPLATE
        # =========================================

        suspended_email_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">

            <style>

                body {{
                    margin: 0;
                    padding: 0;
                    background: #f4f7fb;
                    font-family: Arial, sans-serif;
                }}

                .container {{
                    max-width: 650px;
                    margin: 40px auto;
                    background: #ffffff;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
                }}

                .header {{
                    background: #c62828;
                    color: white;
                    padding: 30px;
                    text-align: center;
                }}

                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                }}

                .content {{
                    padding: 35px;
                    color: #333333;
                    line-height: 1.7;
                }}

                .info-box {{
                    background: #f8f9fc;
                    border-left: 5px solid #c62828;
                    padding: 18px;
                    margin: 25px 0;
                    border-radius: 6px;
                }}

                .info-box p {{
                    margin: 8px 0;
                }}

                .warning {{
                    color: #c62828;
                    font-weight: bold;
                }}

                .footer {{
                    padding: 20px;
                    text-align: center;
                    font-size: 13px;
                    color: #777777;
                    background: #fafafa;
                    border-top: 1px solid #eeeeee;
                }}

            </style>
        </head>

        <body>

            <div class="container">

                <div class="header">

                    <h1>
                        Business Essential
                    </h1>

                </div>

                <div class="content">

                    <h2>
                        Account Suspension Notice
                    </h2>

                    <p>
                        Dear {name},
                    </p>

                    <p>
                        This email is to inform you that your
                        Business Essential internal admin account
                        has been temporarily suspended by the
                        Executive Administration team.
                    </p>

                    <div class="info-box">

                        <p>
                            <strong>Employee ID:</strong>
                            {employee_id}
                        </p>

                        <p>
                            <strong>Email:</strong>
                            {email}
                        </p>

                        <p>
                            <strong>Department:</strong>
                            {department}
                        </p>

                        <p>
                            <strong>Role:</strong>
                            {role}
                        </p>

                        <p>
                            <strong>Status:</strong>
                            Suspended
                        </p>

                    </div>

                    <p class="warning">
                        Your access to all internal systems has
                        been disabled until further notice.
                    </p>

                    <p>
                        If you believe this action was made
                        in error, please contact the
                        Executive Administration Department
                        immediately.
                    </p>

                    <p>
                        Regards,<br>
                        Executive Security Team<br>
                        Business Essential
                    </p>

                </div>

                <div class="footer">

                    © 2026 Business Essential.
                    All rights reserved.

                </div>

            </div>

        </body>
        </html>
        """


        # =========================================
        # SEND EMAIL
        # =========================================

        send_email(
            email,
            (
                "Business Essential - "
                "Account Suspension Notice"
            ),
            suspended_email_html,
            True
        )


        # =========================================
        # SUCCESS RESPONSE
        # =========================================

        return jsonify({
            "success": True,
            "message": (
                "Admin account suspended successfully"
            )
        }), 200


    except Exception as e:

        conn.rollback()

        print(
            "Suspend admin error:",
            e
        )

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


    finally:

        cursor.close()

        conn.close()


# =========================================
# REACTIVATE ADMIN
# =========================================

@admin_bp.route(
    "/execute/admin/management/reactivate/<int:admin_id>",
    methods=["POST"]
)
@token_required_admin
def reactivate_admin(
    current_user_id,
    current_user_role,
    current_user_department,
    admin_id
):

    if (
        current_user_role != 'super_admin'
        or
        current_user_department != 'executive'
    ):

        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403


    conn = get_db()

    cursor = conn.cursor(
        dictionary=True,
        buffered=True
    )

    try:

        cursor.execute(
            """
            SELECT *
            FROM admins
            WHERE id=%s
            """,
            (admin_id,)
        )

        admin = cursor.fetchone()

        if not admin:

            return jsonify({
                "success": False,
                "message": "Admin not found"
            }), 404


        cursor.execute(
            """
            UPDATE admins
            SET
                status=%s,
                is_active=TRUE
            WHERE id=%s
            """,
            (
                "active",
                admin_id
            )
        )

        conn.commit()

        save_audit_activity(
            current_user_id,
            "ACCOUNT_REACTIVATION",
            "Admin Reactivated",
            (
                f"{admin['fullname']} "
                f"was reactivated"
            ),
            request.remote_addr
        )

        return jsonify({
            "success": True,
            "message": "Admin reactivated successfully"
        })

    except Exception as e:

        conn.rollback()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    finally:

        cursor.close()

        conn.close()



# =========================================
# DELETE ADMIN
# =========================================

@admin_bp.route(
    "/execute/admin/management/delete/<int:admin_id>",
    methods=["DELETE"]
)
@token_required_admin
def delete_admin(
    current_user_id,
    current_user_role,
    current_user_department,
    admin_id
):

    if (
        current_user_role != 'super_admin'
        or
        current_user_department != 'executive'
    ):

        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403


    conn = get_db()

    cursor = conn.cursor(
        dictionary=True,
        buffered=True
    )

    try:

        cursor.execute(
            """
            SELECT *
            FROM admins
            WHERE id=%s
            """,
            (admin_id,)
        )

        admin = cursor.fetchone()

        if not admin:

            return jsonify({
                "success": False,
                "message": "Admin not found"
            }), 404


        cursor.execute(
            """
            DELETE FROM admins
            WHERE id=%s
            """,
            (admin_id,)
        )

        conn.commit()

        save_audit_activity(
            current_user_id,
            "ACCOUNT_DELETION",
            "Admin Deleted",
            (
                f"{admin['fullname']} "
                f"was permanently deleted"
            ),
            request.remote_addr
        )

        return jsonify({
            "success": True,
            "message": "Admin deleted successfully"
        })

    except Exception as e:

        conn.rollback()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    finally:

        cursor.close()

        conn.close()


@admin_bp.route('/api/support/status', methods=['POST'])
@token_required_admin
def update_support_status(current_user_id,current_user_role,current_user_department):

    if (
        current_user_role != 'support'
        or
        current_user_department != 'support'
    ):
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 403

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Invalid JSON."
        }), 500
    item_id = data.get('id')
    source = data.get('source')
    status = data.get('status')

    conn = get_db()
    cursor = conn.cursor()

    try:

        if source == "feedback":

            cursor.execute("""
                UPDATE feedback
                SET status=%s
                WHERE id=%s
            """, (
                status,
                item_id
            ))

        else:

            cursor.execute("""
                UPDATE support_tickets
                SET status=%s
                WHERE id=%s
            """, (
                status,
                item_id
            ))

        conn.commit()

        return jsonify({
            "success": True
        })

    except Exception as e:

        conn.rollback()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    finally:
        cursor.close()
        conn.close()
