from celery import Celery
from celery.schedules import crontab  
def create_celery_app():
    from app import app
    
    celery_app = Celery(app.import_name)
    
    # Configure Celery
    celery_app.conf.update(
        broker_url='redis://localhost:6379/0',
        result_backend='redis://localhost:6379/1',
        timezone='Asia/Kolkata',
        beat_schedule={

            'send-parking-reminders': { 
                'task': 'app_celery.tasks.send_parking_reminders',
                'schedule': crontab(minute='*'),  # every minute
            },
             'send-monthly-report': {
                'task': 'app_celery.tasks.send_monthly_report',
                'schedule': crontab(minute=0, hour=12, day_of_month=1),  # 1st day of every month
            },
            'send-daily-engagement-reminder': {
            'task': 'app_celery.tasks.send_daily_engagement_reminder',
            'schedule': crontab(minute=0, hour=12),  
        },
        }
    )
    
    class ContextTask(celery_app.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
    
    celery_app.Task = ContextTask
    return celery_app

celery_app = create_celery_app()

from . import tasks