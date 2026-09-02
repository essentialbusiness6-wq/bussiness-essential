from backend.api import api_bp
from flask import (
    Flask, request, jsonify, session
)
from datetime import datetime,timedelta
from backend.extentions import cache
import os
from backend.utils import ( 
    token_required,
    get_user_id,
    get_db,
    db_cursor
)
import requests
import time

# Palette cycled through for topClients — swap for your own brand colors
CLIENT_COLORS = ["#4361ee", "#3498db", "#2ecc71", "#9333ea", "#f39c12"]


ACTIVITY_TYPE_MAP = {
    "payment_received": "success",
    "invoice_sent": "info",
    "client_added": "success",
    "invoice_overdue": "warning",
}


def _humanize(dt):
    """Turn a datetime into '2 min ago' / '3 hours ago' / 'Yesterday' / date."""
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    delta = now - dt
    seconds = delta.total_seconds()

    if seconds < 60:
        return "Just now"
    if seconds < 3600:
        mins = int(seconds // 60)
        return f"{mins} min ago"
    if seconds < 86400:
        hours = int(seconds // 3600)
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    if seconds < 172800:
        return "Yesterday"
    days = int(seconds // 86400)
    if days < 7:
        return f"{days} days ago"
    return dt.strftime("%b %d")
    
@cache.memoize(timeout=300)
def get_dashboard_data(user_id, user_role):
    with db_cursor(dictionary=True) as (_, cursor):
        
        # 1. User Data
        cursor.execute("""
            SELECT
                ub.username,
                ub.plan,
                cb.profilepicurl,
                cb.profilename
            FROM user_base ub
            LEFT JOIN cust_base cb ON cb.user_id = ub.user_id
            WHERE ub.user_id = %s
            LIMIT 1
        """, (user_id,))
        user_data = cursor.fetchone()
        if not user_data:
            return None

        # 2. Overall Invoice Stats
        cursor.execute("""
            SELECT
                COUNT(*) AS total_invoices,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_invoices,
                SUM(CASE WHEN status IN ('pending', 'overdue') THEN 1 ELSE 0 END) AS pending_invoices,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) AS total_revenue
            FROM invoices
            WHERE user_id = %s
        """, (user_id,))
        invoice_stats = cursor.fetchone()

        # 3. Account Settings & Wallet
        cursor.execute("""
            SELECT
                us.currency,
                us.currency_symbol,
                us.theme,
                COALESCE(wb.wallet_balance, 0) AS wallet_balance
            FROM user_settings us
            LEFT JOIN wallet_base wb ON wb.user_id = us.user_id
            WHERE us.user_id = %s
            LIMIT 1
        """, (user_id,))
        account_data = cursor.fetchone()
        
        if not account_data:
            account_data = {
                "currency": "USD",
                "currency_symbol": "$",
                "theme": "light",
                "wallet_balance": 0.0
            }

        # 4. Notifications
        cursor.execute("""
            SELECT COUNT(*) AS unread_count
            FROM log_activity
            WHERE user_id = %s AND is_read = FALSE
        """, (user_id,))
        unread_count = cursor.fetchone()["unread_count"]

        # 5. Recent Activities
        cursor.execute("""
            SELECT
                type,
                title,
                description,
                amount,
                created_at
            FROM log_activity
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 10
        """, (user_id,))
        activities = cursor.fetchall()

        # 6. Account Completion Status
        cursor.execute("""
            SELECT id FROM payment_subaccounts WHERE user_id = %s LIMIT 1
        """, (user_id,))
        has_payment_account = cursor.fetchone() is not None

        # ==========================================
        # 7. ADVANCED ANALYTICS (Company Data)
        # ==========================================
        
        # 7a. Monthly Revenue (Last 6 months) - FIXED
        cursor.execute("""
            SELECT 
                DATE_FORMAT(created_at, '%%Y-%%m') AS month_key,
                DATE_FORMAT(created_at, '%%b') AS month,
                SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) AS paid,
                SUM(CASE WHEN status IN ('pending', 'overdue') THEN total ELSE 0 END) AS pending
            FROM invoices
            WHERE user_id = %s 
              AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%%Y-%%m'), DATE_FORMAT(created_at, '%%b')
            ORDER BY month_key ASC
        """, (user_id,))
        monthly_revenue_raw = cursor.fetchall()
        
        monthly_revenue = []
        for row in monthly_revenue_raw:
            monthly_revenue.append({
                "month": row["month"],
                "paid": float(row["paid"] or 0),
                "pending": float(row["pending"] or 0)
            })

        # 7b. Revenue Growth (Current Month vs Last Month)
        cursor.execute("""
            SELECT 
                SUM(CASE WHEN MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) AND status = 'paid' THEN total ELSE 0 END) AS current_month,
                SUM(CASE WHEN MONTH(created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND status = 'paid' THEN total ELSE 0 END) AS last_month
            FROM invoices
            WHERE user_id = %s
        """, (user_id,))
        growth_data = cursor.fetchone()
        
        current_rev = float(growth_data["current_month"] or 0)
        last_rev = float(growth_data["last_month"] or 0)
        
        if last_rev > 0:
            revenue_growth = round(((current_rev - last_rev) / last_rev) * 100, 1)
        elif current_rev > 0:
            revenue_growth = 100.0
        else:
            revenue_growth = 0.0

        # 7c. Payment Stats
        cursor.execute("""
            SELECT 
                COUNT(*) AS total_payments,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS successful_payments
            FROM invoices
            WHERE user_id = %s
        """, (user_id,))
        payment_stats = cursor.fetchone()

        # 7d. Monthly Income & Expenses
        try:
            cursor.execute("""
                SELECT COALESCE(SUM(amount), 0) AS monthly_expenses 
                FROM expenses 
                WHERE user_id = %s 
                  AND MONTH(created_at) = MONTH(CURDATE()) 
                  AND YEAR(created_at) = YEAR(CURDATE())
            """, (user_id,))
            exp_res = cursor.fetchone()
            monthly_expenses = float(exp_res["monthly_expenses"] or 0)
        except Exception:
            monthly_expenses = 0.0

        monthly_income = current_rev

        # 7e. Top Clients (by revenue)
        cursor.execute("""
            SELECT 
                c.client_name AS name,
                COUNT(i.id) AS invoice_count,
                COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END), 0) AS revenue
            FROM clients c
            LEFT JOIN invoices i ON i.client_id = c.id
            WHERE c.user_id = %s
            GROUP BY c.id, c.client_name
            ORDER BY revenue DESC
            LIMIT 5
        """, (user_id,))
        top_clients = cursor.fetchall()
        
        for client in top_clients:
            client["revenue"] = float(client["revenue"] or 0)
            client["invoice_count"] = int(client["invoice_count"] or 0)

        company_data = {
            "revenue_growth": revenue_growth,
            "total_payments": int(payment_stats["total_payments"] or 0),
            "successful_payments": int(payment_stats["successful_payments"] or 0),
            "total_revenue": float(invoice_stats["total_revenue"] or 0),
            "total_invoices": int(invoice_stats["total_invoices"] or 0),
            "monthly_income": float(monthly_income),
            "monthly_expenses": float(monthly_expenses),
            "monthly_revenue": monthly_revenue,
            "top_clients": top_clients
        }

    return {
        "status": "success",
        
        "username": user_data["username"],
        "plan": (user_data["plan"] or "Trial").capitalize(),
        "profilepicurl": user_data["profilepicurl"],
        "profilename": user_data["profilename"],

        "total_invoices": int(invoice_stats["total_invoices"] or 0),
        "paid_invoices": int(invoice_stats["paid_invoices"] or 0),
        "pending_invoices": int(invoice_stats["pending_invoices"] or 0),
        "total_revenue": float(invoice_stats["total_revenue"] or 0),

        "currency": account_data["currency"],
        "currency_symbol": account_data["currency_symbol"],
        "theme": account_data["theme"],
        "balance": float(account_data["wallet_balance"] or 0),

        "unread_count": int(unread_count or 0),
        "activities": activities,

        "account": has_payment_account,
        "company_data": company_data,
        
        "user": {
            "id": user_id,
            "role": user_role
        }
    }


@api_bp.route("/dashboard/data")
@token_required
def dashboard_data(current_user_id, current_user_role):

    try:

        data = get_dashboard_data(
            current_user_id,
            current_user_role
        )

        if not data:
            return jsonify({
                "status": "error",
                "message": "User data not found"
            }), 404

        return jsonify(data)

    except Exception as e:

        print("Dashboard error:", e)

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@cache.memoize(timeout=300)
def get_profile_data(current_user_id, current_user_role):
    
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

        cursor.execute(
            """
            SELECT bank_name, account_number, account_name, bank_code
            FROM payment_subaccounts 
            WHERE user_id=%s
            """,
            (current_user_id,)
        )
        bank_data = cursor.fetchone()

    return {
        "status": "success",
        "profile":profile_data,
        "theme":theme,
        "bank":bank_data
    }

@api_bp.route("/profile/data")
@token_required
def profile_data(current_user_id, current_user_role):

    try:

        data = get_profile_data(
            current_user_id,
            current_user_role
        )

        if not data:
            return jsonify({
                "status": "error",
                "message": "User data not found"
            }), 404

        return jsonify(data)

    except Exception as e:

        print("Profile error:", e)

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@cache.memoize(timeout=300)
def get_billing_data(current_user_id,current_user_role):
        with db_cursor(dictionary=True) as (_, cursor):

        cursor.execute("""
            SELECT *
            FROM user_subscriptions
            WHERE user_id = %s AND status in ('active','Active')
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

    return {
        "status":"success",
        
        "subscription": subscription,
        "days_left" : days_left,
        "hours_left" : hours_left,
        "minutes_left" : minutes_left,
        "user_id": current_user_id,
        "theme": theme
    }


@api_bp.route("/billing/data")
@token_required
def billing_data(current_user_id, current_user_role):

    try:

        data = get_billing_data(
            current_user_id,
            current_user_role
        )

        if not data:
            return jsonify({
                "status": "error",
                "message": "User data not found"
            }), 404

        return jsonify(data)

    except Exception as e:

        print("Billing error:", e)

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
