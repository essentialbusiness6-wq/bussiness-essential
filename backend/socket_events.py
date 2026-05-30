from flask_socketio import emit, join_room
from flask import request

from backend.utils import (
    get_db,
    get_user_from_token_cookie
)

from backend.support_ai import get_support_reply
from backend.rate_limit import check_chat_rate_limit



def register_socket_events(socketio):


    @socketio.on("join_support_room")
    def join_support(data):
      

        room_id = data.get("room_id")

        if not room_id:
            return

        join_room(room_id)

        emit("system_message", {
            "message": "Connected to AI support."
        }, room=room_id)


    @socketio.on("send_support_message")
    def handle_support_message(data):

        # =========================
        # AUTH FROM COOKIE TOKEN
        # =========================

        auth_data = get_user_from_token_cookie(request)

        if not auth_data["success"]:
            emit("receive_support_message", {
                "sender": "system",
                "message": "Authentication failed."
            })
            return
        
     
        current_user_id = auth_data["user_id"]
        current_user_role = auth_data["role"]

        # =========================
        # RATE LIMIT
        # =========================

        allowed = check_chat_rate_limit(current_user_id)

        if not allowed:
            emit("receive_support_message", {
                "sender": "system",
                "message": "Too many messages. Please wait a few seconds."
            })
            return

        room_id = data.get("room_id")
        message = data.get("message")

        if not room_id or not message:
            return

        conn = get_db()
        cursor = conn.cursor(dictionary=True, buffered=True)

        # =========================
        # USER INFO
        # =========================

        cursor.execute("""
            SELECT
                username,
                email,
                plan,
                role,
                trials_ends_at,
                account_status,
                active
            FROM user_base
            WHERE user_id = %s
        """, (current_user_id,))

        user_info = cursor.fetchone()

        if not user_info:
            emit("receive_support_message", {
                "sender": "system",
                "message": "User account not found."
            })
            return

        # =========================
        # COUNTS
        # =========================

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM invoices
            WHERE user_id = %s
        """, (current_user_id,))
        invoice_count = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM clients
            WHERE user_id = %s
        """, (current_user_id,))
        client_count = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM transactions
            WHERE user_id = %s
        """, (current_user_id,))
        transaction_count = cursor.fetchone()["total"]

        # =========================
        # SUBSCRIPTION
        # =========================

        cursor.execute("""
            SELECT
                billing_cycle,
                status,
                started_at,
                expires_at
            FROM user_subscriptions
            WHERE user_id = %s
            ORDER BY id DESC
            LIMIT 1
        """, (current_user_id,))

        subscription_info = cursor.fetchone()

        # =========================
        # CHAT MEMORY
        # =========================

        cursor.execute("""
            SELECT sender_type, message
            FROM support_chat_messages
            WHERE room_id = %s
            ORDER BY created_at DESC
            LIMIT 10
        """, (room_id,))

        history = cursor.fetchall()

        history.reverse()

        # =========================
        # USER DATA FOR AI
        # =========================

        user_data = {
            "user_id": current_user_id,
            "username": user_info["username"],
            "email": user_info["email"],
            "plan": user_info["plan"],
            "role": current_user_role,
            "trial_ends_at": str(user_info["trials_ends_at"]),
            "account_status": user_info["account_status"],
            "active": user_info["active"],
            "invoice_count": invoice_count,
            "client_count": client_count,
            "transaction_count": transaction_count,
            "subscription": subscription_info
        }

        # =========================
        # SAVE USER MESSAGE
        # =========================

        cursor.execute("""
            INSERT INTO support_chat_messages
            (room_id, sender_type, sender_id, message)
            VALUES (%s,%s,%s,%s)
        """, (
            room_id,
            "user",
            current_user_id,
            message
        ))

        conn.commit()

        emit("receive_support_message", {
            "sender": "user",
            "message": message
        }, room=room_id)

        # =========================
        # AI REPLY
        # =========================

        bot_reply = get_support_reply(
            message=message,
            user_data=user_data,
            chat_history=history
        )

        # =========================
        # SAVE AI REPLY
        # =========================

        cursor.execute("""
            INSERT INTO support_chat_messages
            (room_id, sender_type, sender_id, message)
            VALUES (%s,%s,%s,%s)
        """, (
            room_id,
            "system",
            current_user_id,
            bot_reply
        ))

        conn.commit()

        emit("receive_support_message", {
            "sender": "ai",
            "message": bot_reply
        }, room=room_id)

        cursor.close()
        conn.close()