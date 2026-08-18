from apscheduler.schedulers.background import BackgroundScheduler
# from app import app
from backend.utils import auto_check_overdue_invoices,process_expired_subscriptions,process_invoice_due_notifications,process_subscription_notifications
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

    print("Checking Due Subscription notifications...")
    process_subscription_notifications()
        
    print("Scheduled Job Finished...")


scheduler.add_job(
    scheduled_job,
    trigger='interval',
    minutes=1
)


def start_scheduler():
    print("Started")
    scheduler.start()
