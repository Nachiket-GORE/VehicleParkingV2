import os
from flask import Flask, send_from_directory, jsonify, request
from flask_mail import Mail, Message
from flask_security import Security, SQLAlchemyUserDatastore, hash_password

from backend.models import db, User, Role, Parking_lot, Parking_spot, ParkingReservation
from backend.routes import auth_bp
from backend.config import LocalDevelopmentConfig
from flask_caching import Cache
from backend.extensions import db, cache, mail
from datetime import datetime

app = Flask(__name__, static_folder="frontend", static_url_path="/static")
app.config.from_object(LocalDevelopmentConfig)

app.config['CACHE_TYPE'] = "RedisCache"
app.config['CACHE_DEFAULT_TIMEOUT'] = 1
app.config['CACHE_REDIS_PORT'] = 6379
app.config['CACHE_REDIS_URL'] = 'redis://localhost:6379/2' 

db.init_app(app)
mail.init_app(app)
cache.init_app(app)
@app.route('/cache')
@cache.cached(timeout=5)
def cache_test():
    return {'time': str(datetime.now())}

user_datastore = SQLAlchemyUserDatastore(db, User, Role)
security = Security(app, user_datastore)

app.register_blueprint(auth_bp)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.errorhandler(404)
def not_found(e):
    if request.path.startswith('/api/'):
        return jsonify({'message': 'Not found'}), 404
    return app.send_static_file('index.html')

@app.errorhandler(500)
def internal_error(e):
    if request.path.startswith('/api/'):
        return jsonify({'message': 'Internal server error'}), 500
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def static_proxy(path):
    static_file = os.path.join(app.static_folder, path)
    if os.path.exists(static_file):
        return send_from_directory(app.static_folder, path)
    return app.send_static_file('index.html')

@app.route('/test-monthly-report')
def test_monthly_report():
    from backend.app_celery.tasks import send_monthly_report
    send_monthly_report()  
    return "Monthly report task triggered!"

def create_initial_data():
    db.create_all()
    user_datastore.find_or_create_role(name='admin', description='superuser')
    if not user_datastore.find_user(email='mydummytesting50@gmail.com'):
        user_datastore.create_user(
            email='mydummytesting50@gmail.com',

            password=hash_password('admin'),
            roles=['admin'],
            full_name='Admin User',
            country='India',
            city='Delhi',
            address='Admin Street 1',
            pincode='110001'
        )
    user_datastore.find_or_create_role(name='user', description='general user')
    if not user_datastore.find_user(email='recever447@gmail.com'):
        user_datastore.create_user(
            email='recever447@gmail.com',
            password=hash_password('pass'),
            roles=['user'],
            full_name='User One',
            country='India',
            city='Mumbai',
            address='User Lane 2',
            pincode=400001
        )
        print("Created 1st")
    if not user_datastore.find_user(email='nachiketgore35@gmail.com'):
        user_datastore.create_user(
            email='nachiketgore35@gmail.com',
            password=hash_password('pass'),
            roles=['user'],
            full_name='User Two',
            country='India',
            city='Bangalore',
            address='User Road 3',
            pincode=560001
        )
        print("Created 2nd")
    if not user_datastore.find_user(email='rajeshpatil5049@gmail.com'):
        user_datastore.create_user(
            email='rajeshpatil5049@gmail.com',
            password=hash_password('pass'),
            roles=['user'],
            full_name='User Three',
            country='India',
            city='Chennai',
            address='User Avenue 4',
            pincode=600001
        )
        print("Created 3rd")
    parking_lots = [
        ('India', 'Mumbai', 'Gateway Road', 400001, 'Gateway Prime', 5),
        ('India', 'Mumbai', 'Marine Drive', 400002, 'Marine Prime', 3),
        ('India', 'Delhi', 'Connaught Place', 110001, 'Connaught Prime', 4),
        ('India', 'Delhi', 'Karol Bagh', 110005, 'Karol Prime', 2),
        ('USA', 'New York', '5th Avenue', 10001, '5th Prime', 6),
        ('USA', 'New York', 'Wall Street', 10005, 'Wall Prime', 2),
        ('USA', 'San Francisco', 'Market Street', 94103, 'Market Prime', 3),
        ('USA', 'San Francisco', 'Mission Street', 94110, 'Mission Prime', 4),
    ]
    for country, city, address, pincode, prime_location_name, number_of_spots in parking_lots:
        lot = Parking_lot.query.filter_by(
            country=country, city=city, address=address, pincode=pincode
        ).first()
        if not lot:
            lot = Parking_lot(
                country=country,
                city=city,
                address=address,
                pincode=pincode,
                prime_location_name=prime_location_name,
                price=50,
                number_of_spots=number_of_spots
            )
            db.session.add(lot)
            db.session.flush()
            for i in range(number_of_spots):
                spot = Parking_spot(
                    lot_id=lot.id
                )
                db.session.add(spot)
    db.session.commit()
    print("Committed all users and parking lots.")



if __name__ == '__main__':
    with app.app_context():
        create_initial_data()
    app.run(debug=True)