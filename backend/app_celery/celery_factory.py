from celery import Celery, Task
from flask import Flask

class CeleryConfig:
    broker_url = 'redis://localhost:6379/0'  
    result_backend = 'redis://localhost:6379/1'
    timezone = 'Asia/Kolkata'

def celery_init_app(app: Flask) -> Celery:
    class FlaskTask(Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery_app = Celery(app.name, task_cls=FlaskTask)
    celery_app.config_from_object(CeleryConfig)
    app.extensions["celery"] = celery_app
    return celery_app