from apscheduler.schedulers.background import BackgroundScheduler
from app import app
from backend.utils import auto_check_overdue_invoices,process_expired_subscriptions,process_invoice_due_notifications
import os 

scheduler = BackgroundScheduler()

def scheduled_job():
    print("Running Schedueled Job...")

    print("Checking overdue Invoices...")
    auto_check_overdue_invoices()

    print("Checking Expired Subsriptions...")
    process_expired_subscriptions()

    print("Checking Invoice Due Notifications...")
    process_invoice_due_notifications()
        
    print("Scheduled Job Finished...")


scheduler.add_job(
    scheduled_job,
    trigger='interval',
    minutes=1
)

print("Started")
scheduler.start()
