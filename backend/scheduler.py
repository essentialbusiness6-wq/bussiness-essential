from apscheduler.schedulers.background import BackgroundScheduler
from app import app
from backend.utils import auto_check_overdue_invoices
import os 

scheduler = BackgroundScheduler()

def scheduled_job():
    with app.app_context():
        auto_check_overdue_invoices()

scheduler.add_job(
    scheduled_job,
    trigger='interval',
    hours=1
)

if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
    scheduler.start()