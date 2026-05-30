import time

user_message_times = {}

LIMIT = 5
WINDOW = 15


def check_chat_rate_limit(user_id):

    now = time.time()

    if user_id not in user_message_times:
        user_message_times[user_id] = []

    timestamps = user_message_times[user_id]

    timestamps = [
        t for t in timestamps
        if now - t < WINDOW
    ]

    if len(timestamps) >= LIMIT:
        return False

    timestamps.append(now)

    user_message_times[user_id] = timestamps

    return True