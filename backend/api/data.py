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
        Print("Hit Data Fetch")
        print("DASHBOARD: USER QUERY")

        # --- User ---
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
            return jsonify({
                "status":"error",
                "message":"user not found"
            }), 400
        print("Hit User Data")

        # --- Invoice stats ---
        cursor.execute("""
            SELECT
                COUNT(*) AS total_invoices,
                SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) AS paid_invoices,
                SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending_invoices,
                COALESCE(
                    SUM(CASE WHEN status='paid' THEN total ELSE 0 END), 0
                ) AS total_revenue
            FROM invoices
            WHERE user_id=%s
        """, (user_id,))
        invoice_stats = cursor.fetchone()
        print('Hit invoice Stats")

        # --- Settings / wallet ---
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
        print("Hit Account Data")
        if not account_data:
            return None
        

        # --- Notifications ---
        cursor.execute("""
            SELECT COUNT(*) AS unread_count
            FROM log_activity
            WHERE user_id=%s AND is_read=FALSE
        """, (user_id,))
        unread_count = cursor.fetchone()["unread_count"]
        print("Hit Unread Count Data")

        # --- Activities (now pulling id too) ---
        cursor.execute("""
            SELECT
                id, type, title, description, amount, created_at
            FROM log_activity
            WHERE user_id=%s
            ORDER BY created_at DESC
            LIMIT 10
        """, (user_id,))
        raw_activities = cursor.fetchall()
        print("Hit Raw Activities")

        # --- Payment subaccount / org flags ---
        cursor.execute("SELECT id FROM payment_subaccounts WHERE user_id=%s", (user_id,))
        account = cursor.fetchone() is not None

        cursor.execute("SELECT id FROM organizations_data WHERE owner_id=%s", (user_id,))
        company_data = cursor.fetchone() is not None

        # --- Clients (kept as-is for the "account/company_data/clients" block) ---
        cursor.execute("""
            SELECT
                clients.id,
                clients.client_name,
                COUNT(invoices.id) AS total_invoices
            FROM clients
            LEFT JOIN invoices ON invoices.client_id = clients.id
            WHERE clients.user_id = %s
            GROUP BY clients.id, clients.client_name
        """, (user_id,))
        clients = cursor.fetchall()

        # --- Top 5 clients by revenue (for analytics.topClients) ---
        cursor.execute("""
            SELECT
                clients.id,
                clients.client_name,
                COUNT(invoices.id) AS invoice_count,
                COALESCE(
                    SUM(CASE WHEN invoices.status='paid' THEN invoices.total ELSE 0 END), 0
                ) AS revenue
            FROM clients
            LEFT JOIN invoices ON invoices.client_id = clients.id
            WHERE clients.user_id = %s
            GROUP BY clients.id, clients.client_name
            ORDER BY revenue DESC
            LIMIT 5
        """, (user_id,))
        top_clients_raw = cursor.fetchall()
        print("Monthly Hit Row")
        # --- Monthly revenue, last 6 months (for analytics.monthlyRevenue) ---
        cursor.execute("""
    SELECT
        DATE_FORMAT(created_at, '%%Y-%%m') AS month_key,
        DATE_FORMAT(MIN(created_at), '%%b') AS month,

        COALESCE(
            SUM(
                CASE
                    WHEN status = 'paid' THEN total
                    ELSE 0
                END
            ),
            0
        ) AS paid,

        COALESCE(
            SUM(
                CASE
                    WHEN status = 'pending' THEN total
                    ELSE 0
                END
            ),
            0
        ) AS pending

    FROM invoices

    WHERE user_id = %s
      AND created_at >= DATE_FORMAT(
            DATE_SUB(CURDATE(), INTERVAL 5 MONTH),
            '%%Y-%%m-01'
          )

    GROUP BY DATE_FORMAT(created_at, '%%Y-%%m')
    ORDER BY month_key ASC
""", (user_id,))

    monthly_rows = cursor.fetchall()
    print("Fetched Monthly data")

    # ---------- Shape: user ----------
    user_block = {
        "name": user_data["profilename"] or user_data["username"],
        "plan": (user_data["plan"] or "").capitalize(),
        "profilePic": user_data["profilepicurl"],
        "balance": float(account_data["wallet_balance"] or 0),
        "currency": account_data["currency_symbol"] or account_data["currency"],
    }

    # ---------- Shape: stats ----------
    total_invoices = invoice_stats["total_invoices"] or 0
    paid_invoices = invoice_stats["paid_invoices"] or 0
    pending_invoices = invoice_stats["pending_invoices"] or 0
    total_revenue = float(invoice_stats["total_revenue"] or 0)

    stats_block = {
        "totalInvoices": total_invoices,
        "paidInvoices": paid_invoices,
        "pendingInvoices": pending_invoices,
        "totalRevenue": total_revenue,
    }

    # ---------- Shape: analytics ----------
    monthly_revenue = [
        {
            "month": row["month"],
            "monthKey": row["month_key"],
            "paid": float(row["paid"] or 0),
            "pending": float(row["pending"] or 0),
        }
        for row in monthly_rows
    ]

    # revenueGrowth: current month paid vs previous month paid, % change
    revenue_growth = 0.0
    if len(monthly_revenue) >= 2:
        prev, curr = monthly_revenue[-2]["paid"], monthly_revenue[-1]["paid"]
        if prev:
            revenue_growth = round(((curr - prev) / prev) * 100, 1)

    payment_success = round((paid_invoices / total_invoices) * 100, 1) if total_invoices else 0.0
    avg_invoice_value = round(total_revenue / paid_invoices, 2) if paid_invoices else 0.0

    # ASSUMPTION: no expenses table exists in the query you sent me, so
    # "expenses" and therefore "cashFlow" can't be computed from this data
    # alone. Wire this up to your real expenses source (e.g. an
    # `expenses` table) — placeholder logic below just uses this month's
    # paid revenue as "income" and 0 as "expenses".
    income = monthly_revenue[-1]["paid"] if monthly_revenue else 0.0
    expenses = 0.0  # TODO: replace with real expenses query
    cash_flow = round(income - expenses, 2)

    top_clients = [
        {
            "name": row["client_name"],
            "invoices": row["invoice_count"] or 0,
            "revenue": float(row["revenue"] or 0),
            "color": CLIENT_COLORS[i % len(CLIENT_COLORS)],
        }
        for i, row in enumerate(top_clients_raw)
    ]

    analytics_block = {
        "revenueGrowth": revenue_growth,
        "paymentSuccess": payment_success,
        "avgInvoiceValue": avg_invoice_value,
        "cashFlow": cash_flow,
        "monthlyRevenue": monthly_revenue,
        "topClients": top_clients,
        "income": income,
        "expenses": expenses,
    }

    # ---------- Shape: activities ----------
    activities_block = [
        {
            "id": row["id"],
            "title": row["title"],
            "time": _humanize(row["created_at"]),
            "amount": float(row["amount"] or 0),
            "type": ACTIVITY_TYPE_MAP.get(row["type"], "info"),
        }
        for row in raw_activities
    ]

    return {
        "status": "success",
        "user": {"user_block": user_block, "id": user_id, "role": user_role},
        "stats": stats_block,
        "analytics": analytics_block,
        "activities": activities_block,
        "unread_count": unread_count,
        "account": account,
        "company_data": company_data,
        "clients": clients,
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
