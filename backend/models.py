

from flask_sqlalchemy import SQLAlchemy
from flask_security import UserMixin, RoleMixin
from datetime import datetime, timedelta
import uuid
import json
from backend.extensions import db

roles_users = db.Table('roles_users',
    db.Column('user_id', db.Integer(), db.ForeignKey('user.id')),
    db.Column('role_id', db.Integer(), db.ForeignKey('role.id'))
)

class Role(db.Model, RoleMixin):
    __tablename__ = 'role'
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(80), unique=True)
    description = db.Column(db.String(255))


class User(db.Model, UserMixin):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    password = db.Column(db.String(255))
    user_profile = db.Column(db.String(255))
    email = db.Column(db.String(255), unique=True)
    full_name = db.Column(db.String(255))
    country = db.Column(db.String(255))
    city = db.Column(db.String(255))
    address = db.Column(db.String(255))
    pincode = db.Column(db.Integer)
    wallet_balance = db.Column(db.Numeric(10, 2), default=0.00)
    date_of_Account_creation = db.Column(db.Date, default=datetime.utcnow)
    active = db.Column(db.Boolean(), default=True)
    fs_uniquifier = db.Column(db.String(255), unique=True, default=lambda: uuid.uuid4().hex)
    
    roles = db.relationship('Role', secondary=roles_users,
                            backref=db.backref('users', lazy='dynamic'))


class Parking_lot(db.Model):
    __tablename__ = 'parking_lot'
    id = db.Column(db.Integer, primary_key=True)
    prime_location_name = db.Column(db.String(255))
    price = db.Column(db.Numeric(10, 2),nullable=False)
    country = db.Column(db.String(255))
    city = db.Column(db.String(255))
    address = db.Column(db.String(255))
    pincode = db.Column(db.Integer)
    number_of_spots = db.Column(db.Integer)

    __table_args__ = (
        db.UniqueConstraint('country', 'city', 'address', 'pincode', name='_lot_uc'),
    )
    ...

    spots = db.relationship('Parking_spot', backref='lot', cascade='all, delete-orphan', lazy=True)
    reservations = db.relationship('ParkingReservation', backref='lot', lazy=True)


class Parking_spot(db.Model):
    __tablename__ = 'parking_spot'
    id = db.Column(db.Integer, primary_key=True)
    lot_id = db.Column(db.Integer, db.ForeignKey('parking_lot.id'))
    reservations = db.relationship('ParkingReservation', backref='spot', lazy=True)


class Vehicle_info(db.Model):
    __tablename__ = 'vehicle_info'
    id = db.Column(db.Integer, primary_key=True)
    vehicle_no = db.Column(db.String(255), unique=True, nullable=False)
    vehicle_type = db.Column(db.String(255))
    vehicle_owner_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    spot_id = db.Column(db.Integer, db.ForeignKey('parking_spot.id'), nullable=True)
    lot_id = db.Column(db.Integer, db.ForeignKey('parking_lot.id'), nullable=True)


class ParkingReservation(db.Model):
    __tablename__ = 'parking_reservation'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    spot_id = db.Column(db.Integer, db.ForeignKey('parking_spot.id'))
    lot_id = db.Column(db.Integer, db.ForeignKey('parking_lot.id'))
    vehicle_no = db.Column(db.String(255), nullable=False)  
    booking_time = db.Column(db.DateTime, default=datetime.utcnow)
    duration_hours = db.Column(db.Float, nullable=False)
    release_time = db.Column(db.DateTime, nullable=False)  
    parking_cost = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.String(50), default='Reserved') 
    user = db.relationship('User', backref='reservations')


class BankTransaction(db.Model):
    __tablename__ = 'bank_transaction'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    from_account = db.Column(db.String(50), nullable=False)  
    to_account = db.Column(db.String(50), nullable=False)   
    from_bank = db.Column(db.Text, nullable=True)            
    to_bank = db.Column(db.Text, nullable=True)              
    type = db.Column(db.String(50), nullable=False)          
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    reservation_id = db.Column(db.Integer, db.ForeignKey('parking_reservation.id'), nullable=True)  

    user = db.relationship('User', backref='bank_transactions')
    reservation = db.relationship('ParkingReservation', backref='bank_transactions')

    def set_from_bank(self, bank_dict):
        self.from_bank = json.dumps(bank_dict)

    def get_from_bank(self):
        return json.loads(self.from_bank) if self.from_bank else None

    def set_to_bank(self, bank_dict):
        self.to_bank = json.dumps(bank_dict)

    def get_to_bank(self):
        return json.loads(self.to_bank) if self.to_bank else None