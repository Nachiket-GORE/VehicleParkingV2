from flask import Blueprint, request, jsonify
from flask_security import hash_password, verify_password
from backend.models import db, User, Role, Parking_lot, Parking_spot, ParkingReservation, Vehicle_info, BankTransaction
from sqlalchemy.orm import joinedload
import uuid
from datetime import datetime, timedelta, timezone
from dateutil import parser
from decimal import Decimal
from sqlalchemy.orm import joinedload

from backend.extensions import cache  





auth_bp = Blueprint('auth', __name__)






@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if not user or not verify_password(data['password'], user.password):
        return jsonify({'message': 'Invalid email or password'}), 401

    token = str(uuid.uuid4())
    user.fs_uniquifier = token  
    db.session.commit()

    is_admin = any(role.name == 'admin' for role in user.roles)
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'role': 'admin' if is_admin else 'user'
    }), 200


@auth_bp.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already registered'}), 400
    user = User(
        email=data['email'],
        password=hash_password(data['password']),
        full_name=data.get('full_name', ''),
        country=data.get('country', ''),
        city=data.get('city', ''),
        address=data.get('address', ''),
        pincode=data.get('pincode', None),
        user_profile=data.get('user_profile', ''),  # Optional
        active=True
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'Registration successful'}), 201















@auth_bp.route('/api/parking-lot', methods=['POST'])
def create_parking_lot():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user or not any(role.name == 'admin' for role in user.roles):
        return jsonify({'message': 'Admin access required'}), 403


    data = request.json
    required_fields = ['prime_location_name', 'price', 'country', 'city', 'address', 'pincode', 'number_of_spots']
    if not all(field in data and data[field] for field in required_fields):
        return jsonify({'message': 'Missing required fields'}), 400

    existing = Parking_lot.query.filter_by(
        country=data['country'],
        city=data['city'],
        address=data['address'],
        pincode=data['pincode']
    ).first()
    if existing:
        return jsonify({'message': 'Parking lot already exists'}), 400

    lot = Parking_lot(
        prime_location_name=data['prime_location_name'],
        price=data['price'],
        country=data['country'],
        city=data['city'],
        address=data['address'],
        pincode=data['pincode'],
        number_of_spots=data['number_of_spots']
    )
    db.session.add(lot)
    db.session.flush()  # Get lot.id before adding spots

    for i in range(int(data['number_of_spots'])):
        spot = Parking_spot(
            lot_id=lot.id
            
        )
        db.session.add(spot)

    db.session.commit()
    return jsonify({'message': 'Parking lot created successfully!'}), 201



@auth_bp.route('/api/parking-lot/countries')
def get_countries():
    countries = db.session.query(Parking_lot.country).distinct().all()
    return jsonify([c[0] for c in countries if c[0]])

@auth_bp.route('/api/parking-lot/cities')
def get_cities():
    country = request.args.get('country')
    cities = db.session.query(Parking_lot.city).filter_by(country=country).distinct().all()
    return jsonify([c[0] for c in cities if c[0]])

@auth_bp.route('/api/parking-lot/addresses')
def get_addresses():
    country = request.args.get('country')
    city = request.args.get('city')
    addresses = db.session.query(Parking_lot.address).filter_by(country=country, city=city).distinct().all()
    return jsonify([a[0] for a in addresses if a[0]])


@auth_bp.route('/api/parking-lot/slots')
def get_slots():
    country = request.args.get('country')
    city = request.args.get('city')
    address = request.args.get('address')
    lot = Parking_lot.query.filter_by(country=country, city=city, address=address).first()
    if not lot:
        return jsonify([])
    slots = []
    now = datetime.utcnow()
    for i, spot in enumerate(lot.spots):
        active_res = ParkingReservation.query.filter(
            ParkingReservation.spot_id == spot.id,
            ParkingReservation.booking_time <= now,
            ParkingReservation.release_time >= now
        ).first()
        status = 'occupied' if active_res else 'available'
        slots.append({
            'id': spot.id,
            'number': i+1,
            'status': status,
            'lot_id': lot.id
        })
    return jsonify(slots)



@auth_bp.route('/api/admin/parking/history', methods=['GET'])
def get_all_parking_history():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user or not any(role.name == 'admin' for role in user.roles):
        return jsonify({'message': 'Admin access required'}), 403

    reservations = ParkingReservation.query.order_by(ParkingReservation.booking_time.desc()).all()
    result = []
    for r in reservations:
        lot = Parking_lot.query.get(r.lot_id)
        spot = Parking_spot.query.get(r.spot_id)
        vehicle = Vehicle_info.query.filter_by(vehicle_no=r.vehicle_no).first()
        owner = User.query.get(vehicle.vehicle_owner_id) if vehicle else User.query.get(r.user_id)
        result.append({
            'id': r.id,
            'lot_name': lot.prime_location_name if lot else '',
            'lot_id': r.lot_id,
            'slot_number': spot.id if spot else '',
            'spot_id': r.spot_id,
            'vehicle_no': r.vehicle_no,
            'vehicle_type': vehicle.vehicle_type if vehicle else '',
            'owner_name': owner.full_name if owner else '',
            'owner_email': owner.email if owner else '',
            'booking_time': r.booking_time,
            'duration_hours': r.duration_hours,
            'release_time': r.release_time,
            'parking_cost': float(r.parking_cost),
            'city': lot.city if lot else '',
            "status": r.status,
        })
    return jsonify(result)



@auth_bp.route('/api/admin/wallet/transactions', methods=['GET'])
def admin_wallet_transactions():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user or not any(role.name == 'admin' for role in user.roles):
        return jsonify({'message': 'Admin access required'}), 403
    txns = BankTransaction.query.order_by(BankTransaction.timestamp.desc()).all()
    result = []
    for t in txns:
        txn_user = User.query.get(t.user_id)
        result.append({
            'id': t.id,
            'from_account': t.from_account,
            'to_account': t.to_account,
            'from_bank': t.get_from_bank(),
            'to_bank': t.get_to_bank(),
            'type': t.type,
            'amount': float(t.amount),
            'timestamp': t.timestamp,
            'reservation_id': t.reservation_id,
            'user_name': txn_user.full_name if txn_user else '',
            'user_email': txn_user.email if txn_user else ''
        })
    return jsonify(result)


@auth_bp.route('/api/admin/slot/<int:spot_id>/booking-details', methods=['GET'])
def get_slot_booking_details(spot_id):
    token = request.headers.get('Authentication-Token')
    if not token:
        return jsonify({'message': 'Missing token'}), 401

    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user or not any(role.name == 'admin' for role in user.roles):
        return jsonify({'message': 'Admin access required'}), 403

    reservations = ParkingReservation.query.filter_by(spot_id=spot_id).order_by(ParkingReservation.booking_time.desc()).all()

    result = []
    for reservation in reservations:
        customer = User.query.get(reservation.user_id)
        vehicle = Vehicle_info.query.filter_by(vehicle_no=reservation.vehicle_no).first()
        result.append({
            'customer_name': customer.full_name if customer else '',
            'customer_email': customer.email if customer else '',
            'customer_country': customer.country if customer else '',
            'customer_city': customer.city if customer else '',
            'customer_address': customer.address if customer else '',
            'vehicle_no': reservation.vehicle_no,
            'vehicle_type': vehicle.vehicle_type if vehicle else 'Unknown',
            'booking_time': reservation.booking_time,
            'duration_hours': reservation.duration_hours,
            'release_time': reservation.release_time,
            'parking_cost': float(reservation.parking_cost)
        })
    return jsonify(result)


@auth_bp.route('/api/admin/country-stats')
@cache.cached(timeout=3) 
def admin_country_stats():
    country = request.args.get('country')
    cities = db.session.query(Parking_lot.city).filter_by(country=country).distinct().all()
    city_names = [c[0] for c in cities if c[0]]
    city_revenue = {}
    for city in city_names:
        lots = Parking_lot.query.filter_by(country=country, city=city).all()
        lot_ids = [lot.id for lot in lots]
        total_revenue = db.session.query(db.func.sum(ParkingReservation.parking_cost)).filter(
            ParkingReservation.lot_id.in_(lot_ids)
        ).scalar() or 0
        city_revenue[city] = float(total_revenue)
    ranking = sorted(
        [{'city': city, 'revenue': city_revenue[city]} for city in city_revenue],
        key=lambda x: x['revenue'], reverse=True
    )
    return jsonify({
        'totalCities': len(city_names),
        'cityRevenue': city_revenue,
        'cityRanking': ranking
    })

@auth_bp.route('/api/admin/city-stats')
@cache.cached(timeout=3) 
def admin_city_stats():
    country = request.args.get('country')
    city = request.args.get('city')
    addresses = db.session.query(Parking_lot.address).filter_by(country=country, city=city).distinct().all()
    address_names = [a[0] for a in addresses if a[0]]
    address_revenue = {}
    for address in address_names:
        lots = Parking_lot.query.filter_by(country=country, city=city, address=address).all()
        lot_ids = [lot.id for lot in lots]
        total_revenue = db.session.query(db.func.sum(ParkingReservation.parking_cost)).filter(
            ParkingReservation.lot_id.in_(lot_ids)
        ).scalar() or 0
        address_revenue[address] = float(total_revenue)
    ranking = sorted(
        [{'address': address, 'revenue': address_revenue[address]} for address in address_revenue],
        key=lambda x: x['revenue'], reverse=True
    )
    return jsonify({
        'totalAddresses': len(address_names),
        'addressRevenue': address_revenue,
        'addressRanking': ranking
    })
@auth_bp.route('/api/admin/address-stats')
@cache.cached(timeout=3) 
def admin_address_stats():
    country = request.args.get('country')
    city = request.args.get('city')
    address = request.args.get('address')
    lots = Parking_lot.query.filter_by(country=country, city=city, address=address).all()
    spot_ids = []
    for lot in lots:
        spot_ids.extend([spot.id for spot in lot.spots])
    slot_revenue = {}
    for spot_id in spot_ids:
        total_revenue = db.session.query(db.func.sum(ParkingReservation.parking_cost)).filter(
            ParkingReservation.spot_id == spot_id  # <-- FIXED HERE
        ).scalar() or 0
        slot_revenue[spot_id] = float(total_revenue)
    ranking = sorted(
        [{'slot': spot, 'revenue': slot_revenue[spot]} for spot in slot_revenue],
        key=lambda x: x['revenue'], reverse=True
    )
    return jsonify({
        'totalSlots': len(spot_ids),
        'slotRevenue': slot_revenue,
        'slotRanking': ranking
    })

@auth_bp.route('/api/admin/global-country-revenue')
@cache.cached(timeout=3) 
def admin_global_country_revenue():
    countries = db.session.query(Parking_lot.country).distinct().all()
    country_names = [c[0] for c in countries if c[0]]
    country_revenue = {}
    for country in country_names:
        lots = Parking_lot.query.filter_by(country=country).all()
        lot_ids = [lot.id for lot in lots]
        total_revenue = db.session.query(db.func.sum(ParkingReservation.parking_cost)).filter(
            ParkingReservation.lot_id.in_(lot_ids)
        ).scalar() or 0
        country_revenue[country] = float(total_revenue)
    ranking = sorted(
        [{'country': country, 'revenue': country_revenue[country]} for country in country_revenue],
        key=lambda x: x['revenue'], reverse=True
    )
    return jsonify({
        'countryRevenue': country_revenue,
        'countryRanking': ranking
    })

@auth_bp.route('/api/admin/monthly-revenue')
@cache.cached(timeout=3) 
def admin_monthly_revenue():
    from sqlalchemy import extract
    months = []
    revenues = []
    for i in range(1, 13):
        month_total = db.session.query(db.func.sum(ParkingReservation.parking_cost)).filter(
            extract('month', ParkingReservation.booking_time) == i
        ).scalar() or 0
        months.append(datetime(2025, i, 1).strftime('%b'))  # Jan, Feb, etc.
        revenues.append(float(month_total))
    return jsonify({
        'months': months,
        'revenues': revenues
    })


@auth_bp.route('/api/admin/best-customers')
@cache.cached(timeout=3) 
def admin_best_customers():
    users = db.session.query(User).all()
    customer_stats = []
    for user in users:
        total_bookings = ParkingReservation.query.filter_by(user_id=user.id).count()
        total_spend = db.session.query(db.func.sum(ParkingReservation.parking_cost)).filter_by(user_id=user.id).scalar() or 0
        if total_bookings > 0:
            customer_stats.append({
                'name': user.full_name,
                'email': user.email,
                'total_bookings': total_bookings,
                'total_spend': float(total_spend)
            })
    ranked = sorted(customer_stats, key=lambda x: x['total_spend'], reverse=True)
    for idx, item in enumerate(ranked, 1):
        item['rank'] = idx
    return jsonify(ranked)

@auth_bp.route('/api/admin/all-bookings-status')
def admin_all_bookings_status():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user or not any(role.name == 'admin' for role in user.roles):
        return jsonify({'message': 'Admin access required'}), 403
    from collections import Counter
    bookings = ParkingReservation.query.all()
    status_counts = Counter()
    for b in bookings:
        status_counts[b.status] += 1
    labels = list(status_counts.keys())
    counts = list(status_counts.values())
    return jsonify({'labels': labels, 'counts': counts})



@auth_bp.route('/api/admin/customers', methods=['GET'])
def admin_get_customers():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user or not any(role.name == 'admin' for role in user.roles):
        return jsonify({'message': 'Admin access required'}), 403

    customers = User.query.all()
    result = []
    for c in customers:
        if any(role.name == 'admin' for role in c.roles):
            continue
        total_bookings = ParkingReservation.query.filter_by(user_id=c.id).count()
        total_spend = db.session.query(db.func.sum(ParkingReservation.parking_cost)).filter_by(user_id=c.id).scalar() or 0
        result.append({
            'id': c.id,
            'full_name': c.full_name,
            'email': c.email,
            'country': c.country,
            'city': c.city,
            'address': c.address,
            'pincode': c.pincode,
            'date_of_Account_creation': c.date_of_Account_creation,
            'wallet_balance': float(c.wallet_balance) if c.wallet_balance else 0,
            'user_profile': c.user_profile,
            'total_bookings': total_bookings,
            'total_spend': float(total_spend)
        })
    return jsonify(result)


@auth_bp.route('/api/admin/customer-monthly-spend')
@cache.cached(timeout=3)
def admin_customer_monthly_spend():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user or not any(role.name == 'admin' for role in user.roles):
        return jsonify({'message': 'Admin access required'}), 403
    email = request.args.get('email')
    customer = User.query.filter_by(email=email).first()
    if not customer:
        return jsonify({'months': [], 'spends': []})

    from datetime import datetime, timedelta
    import calendar
    from collections import defaultdict

    now = datetime.now()
    # Build last 12 months list
    months = []
    spends = []
    monthly_spend = defaultdict(float)

    bookings = ParkingReservation.query.filter_by(user_id=customer.id).all()
    for b in bookings:
        month = b.booking_time.month
        year = b.booking_time.year
        key = f"{calendar.month_abbr[month]} {year}"
        monthly_spend[key] += float(b.parking_cost)

    for i in range(11, -1, -1):
        dt = now.replace(day=1) - timedelta(days=30*i)
        month = dt.month
        year = dt.year
        key = f"{calendar.month_abbr[month]} {year}"
        months.append(key)
        spends.append(monthly_spend.get(key, 0.0))

    return jsonify({'months': months, 'spends': spends})


@auth_bp.route('/api/admin/customer-bookings-by-location')
@cache.cached(timeout=3) 
def admin_customer_bookings_by_location():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user or not any(role.name == 'admin' for role in user.roles):
        return jsonify({'message': 'Admin access required'}), 403
    email = request.args.get('email')
    customer = User.query.filter_by(email=email).first()
    if not customer:
        return jsonify({'labels': [], 'counts': []})
    from collections import Counter
    from sqlalchemy.orm import joinedload
    bookings = ParkingReservation.query.options(joinedload(ParkingReservation.lot)).filter_by(user_id=customer.id).all()
    address_counts = Counter()
    for b in bookings:
        if b.lot:
            address = f"{b.lot.country}, {b.lot.city}, {b.lot.address}"
            address_counts[address] += 1
    labels = list(address_counts.keys())
    counts = list(address_counts.values())
    return jsonify({'labels': labels, 'counts': counts})



@auth_bp.route('/api/admin/customer-bookings-by-vehicle-type')
@cache.cached(timeout=3) 
def admin_customer_bookings_by_vehicle_type():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user or not any(role.name == 'admin' for role in user.roles):
        return jsonify({'message': 'Admin access required'}), 403
    email = request.args.get('email')
    customer = User.query.filter_by(email=email).first()
    if not customer:
        return jsonify({'labels': [], 'counts': []})
    from collections import Counter
    bookings = ParkingReservation.query.filter_by(user_id=customer.id).all()
    vehicle_type_counts = Counter()
    for b in bookings:
        vehicle = Vehicle_info.query.filter_by(vehicle_no=b.vehicle_no).first()
        vtype = vehicle.vehicle_type if vehicle else 'Unknown'
        vehicle_type_counts[vtype] += 1
    labels = list(vehicle_type_counts.keys())
    counts = list(vehicle_type_counts.values())
    return jsonify({'labels': labels, 'counts': counts})

@auth_bp.route('/api/admin/customer-bookings-status')
@cache.cached(timeout=3)
def admin_customer_bookings_status():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user or not any(role.name == 'admin' for role in user.roles):
        return jsonify({'message': 'Admin access required'}), 403
    email = request.args.get('email')
    customer = User.query.filter_by(email=email).first()
    if not customer:
        return jsonify({'labels': [], 'counts': []})
    from collections import Counter
    bookings = ParkingReservation.query.filter_by(user_id=customer.id).all()
    status_counts = Counter()
    for b in bookings:
        status_counts[b.status] += 1
    labels = list(status_counts.keys())
    counts = list(status_counts.values())
    return jsonify({'labels': labels, 'counts': counts})


@auth_bp.route('/api/admin/lot', methods=['GET'])
def admin_get_lot():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user or not any(role.name == 'admin' for role in user.roles):
        return jsonify({'message': 'Admin access required'}), 403
    country = request.args.get('country')
    city = request.args.get('city')
    address = request.args.get('address')
    lot = Parking_lot.query.filter_by(country=country, city=city, address=address).first()
    if not lot:
        return jsonify({'message': 'Lot not found'}), 404
    return jsonify({
        'id': lot.id,
        'prime_location_name': lot.prime_location_name,
        'price': float(lot.price),
        'country': lot.country,
        'city': lot.city,
        'address': lot.address,
        'pincode': lot.pincode,
        'number_of_spots': lot.number_of_spots
    })

@auth_bp.route('/api/admin/lot', methods=['PUT'])
def admin_edit_lot():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user or not any(role.name == 'admin' for role in user.roles):
        return jsonify({'message': 'Admin access required'}), 403
    data = request.json
    lot_id = data.get('id')
    lot = Parking_lot.query.get(lot_id)
    if not lot:
        return jsonify({'message': 'Lot not found'}), 404

    duplicate = Parking_lot.query.filter(
        Parking_lot.country == data.get('country'),
        Parking_lot.city == data.get('city'),
        Parking_lot.address == data.get('address'),
        Parking_lot.pincode == data.get('pincode'),
        Parking_lot.id != lot_id
    ).first()
    if duplicate:
        return jsonify({'message': 'A parking lot with these details already exists.'}), 400

    # Update lot fields
    lot.prime_location_name = data.get('prime_location_name', lot.prime_location_name)
    lot.price = data.get('price', lot.price)
    lot.country = data.get('country', lot.country)
    lot.city = data.get('city', lot.city)
    lot.address = data.get('address', lot.address)
    lot.pincode = data.get('pincode', lot.pincode)
    old_spots = lot.number_of_spots
    new_spots = int(data.get('number_of_spots', lot.number_of_spots))  # Ensure int
    lot.number_of_spots = new_spots

    db.session.commit()

    # Now update spots
    if new_spots > old_spots:
        # Add new spots
        for i in range(old_spots, new_spots):
            spot = Parking_spot(lot_id=lot.id)
            db.session.add(spot)
        db.session.commit()
    elif new_spots < old_spots:
        # Remove extra spots (remove from end)
        spots = Parking_spot.query.filter_by(lot_id=lot.id).order_by(Parking_spot.id).all()
        spots_to_remove = spots[new_spots:]
        # Check if any of these spots have reservations
        has_active_reservation = False
        for spot in spots_to_remove:
            reservation_count = ParkingReservation.query.filter_by(spot_id=spot.id).count()
            if reservation_count > 0:
                has_active_reservation = True
                break
        if has_active_reservation:
            return jsonify({'message': 'Cannot delete spots because there are bookings for these slots.'}), 400
        for spot in spots_to_remove:
            ParkingReservation.query.filter_by(spot_id=spot.id).delete()
            db.session.delete(spot)
        db.session.commit()

    return jsonify({'message': 'Lot updated'})


# Delete lot (address)
@auth_bp.route('/api/admin/lot', methods=['DELETE'])
def admin_delete_lot():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user or not any(role.name == 'admin' for role in user.roles):
        return jsonify({'message': 'Admin access required'}), 403
    data = request.json
    country = data.get('country')
    city = data.get('city')
    address = data.get('address')
    lot = Parking_lot.query.filter_by(country=country, city=city, address=address).first()
    if not lot:
        return jsonify({'message': 'Lot not found'}), 404
    db.session.delete(lot)
    db.session.commit()
    return jsonify({'message': 'Lot deleted'})




























def auto_update_unattend(user_id):
    now = datetime.utcnow()
    reservations = ParkingReservation.query.filter_by(user_id=user_id, status='Reserved').all()
    for r in reservations:
        if r.release_time < now:
            r.status = 'Unattend'
    db.session.commit()
    
@auth_bp.route('/api/parking/book', methods=['POST'])
def book_parking_slot():
    import sys
    from datetime import datetime, timedelta, timezone

    token = request.headers.get('Authentication-Token')
    if not token:
        print("DEBUG: Missing token", file=sys.stderr)
        return jsonify({'message': 'Missing token'}), 401
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user:
        print("DEBUG: Invalid token", file=sys.stderr)
        return jsonify({'message': 'Invalid token'}), 401
    data = request.json or {}
    lot_id = data.get('lot_id')
    spot_id = data.get('spot_id')
    duration_hours = data.get('duration_hours')
    vehicle_no = data.get('vehicle_no')
    vehicle_type = data.get('vehicle_type')
    booking_time_str = data.get('booking_time')

    print(f"DEBUG: Booking request lot_id={lot_id}, spot_id={spot_id}, duration_hours={duration_hours}, vehicle_no={vehicle_no}, vehicle_type={vehicle_type}, booking_time={booking_time_str}", file=sys.stderr)

    # Validate input
    if not all([lot_id, spot_id, duration_hours, vehicle_no, vehicle_type, booking_time_str]):
        print("DEBUG: Missing required fields", file=sys.stderr)
        return jsonify({'message': 'Missing required fields'}), 400

    try:
        from dateutil import parser
        booking_time = parser.parse(booking_time_str)
        # Ensure booking_time is timezone-aware (UTC)
        if booking_time.tzinfo is None:
            booking_time = booking_time.replace(tzinfo=timezone.utc)
        else:
            booking_time = booking_time.astimezone(timezone.utc)
    except Exception as e:
        print(f"DEBUG: Invalid booking time: {e}", file=sys.stderr)
        return jsonify({'message': 'Invalid booking time'}), 400

    try:
        duration_hours = float(duration_hours)
    except Exception as e:
        print(f"DEBUG: Invalid duration: {e}", file=sys.stderr)
        return jsonify({'message': 'Invalid duration'}), 400

    release_time = booking_time + timedelta(hours=duration_hours)

    spot = Parking_spot.query.filter_by(id=spot_id, lot_id=lot_id).first()
    print(f"DEBUG: Loaded spot: {spot}", file=sys.stderr)
    if not spot:
        print("DEBUG: Slot not found", file=sys.stderr)
        return jsonify({'message': 'Slot not found'}), 404

    lot = Parking_lot.query.get(lot_id)
    if not lot:
        print("DEBUG: Parking lot not found", file=sys.stderr)
        return jsonify({'message': 'Parking lot not found'}), 404

    # Check for overlapping reservations
    overlap = ParkingReservation.query.filter(
        ParkingReservation.spot_id == spot_id,
        ParkingReservation.booking_time < release_time,
        ParkingReservation.release_time > booking_time
    ).first()
    print(f"DEBUG: Overlap check: {overlap}", file=sys.stderr)
    if overlap:
        print("DEBUG: Overlapping reservation found", file=sys.stderr)
        return jsonify({'message': 'Selected slot is already booked for the chosen time. Please change booking time.'}), 400

    # Calculate cost
    from decimal import Decimal
    parking_cost = Decimal(str(lot.price)) * Decimal(str(duration_hours))
    print(f"DEBUG: Calculated parking cost: {parking_cost}", file=sys.stderr)

    # Check wallet balance
    if user.wallet_balance is None or Decimal(str(user.wallet_balance)) < parking_cost:
        print("DEBUG: Insufficient wallet balance", file=sys.stderr)
        return jsonify({'message': 'Insufficient wallet balance'}), 400

    # --- FIRST: Update spot status and vehicle number ---
    now = datetime.utcnow().replace(tzinfo=timezone.utc)
    print(f"DEBUG: Current time: {now}, booking_time: {booking_time}, release_time: {release_time}", file=sys.stderr)
    if booking_time <= now <= release_time:
        spot.status = 'occupied'
        spot.vehicle_no = vehicle_no
        print(f"DEBUG: Spot marked occupied, vehicle_no set to {vehicle_no}", file=sys.stderr)
    else:
        spot.status = 'available'
        spot.vehicle_no = None
        print(f"DEBUG: Spot marked available, vehicle_no cleared", file=sys.stderr)
    db.session.add(spot)
    db.session.flush()  # Ensure spot is updated before proceeding
    print(f"DEBUG: Spot after flush: status={spot.status}, vehicle_no={spot.vehicle_no}", file=sys.stderr)

    # --- SECOND: Update or create vehicle info ---
    vehicle = Vehicle_info.query.filter_by(vehicle_no=vehicle_no).first()
    if not vehicle:
        vehicle = Vehicle_info(
            vehicle_no=vehicle_no,
            vehicle_type=vehicle_type,
            vehicle_owner_id=user.id,
            spot_id=spot_id,
            lot_id=lot_id
        )
        db.session.add(vehicle)
        print(f"DEBUG: Created new vehicle info", file=sys.stderr)
    else:
        vehicle.vehicle_type = vehicle_type
        vehicle.vehicle_owner_id = user.id
        vehicle.spot_id = spot_id
        vehicle.lot_id = lot_id
        db.session.add(vehicle)
        print(f"DEBUG: Updated existing vehicle info", file=sys.stderr)

    # --- THIRD: Create reservation ---
    reservation = ParkingReservation(
        user_id=user.id,
        lot_id=lot_id,
        spot_id=spot_id,
        vehicle_no=vehicle_no,
        booking_time=booking_time,
        duration_hours=duration_hours,
        release_time=release_time,
        parking_cost=parking_cost,
        status="Reserved"  # <-- Ensure status is set to Reserved at booking
    )
    db.session.add(reservation)
    db.session.flush()  # Get reservation.id before commit
    print(f"DEBUG: Reservation created with id={reservation.id}", file=sys.stderr)

    # Deduct from user wallet
    user.wallet_balance = Decimal(str(user.wallet_balance)) - parking_cost
    print(f"DEBUG: User wallet after deduction: {user.wallet_balance}", file=sys.stderr)

    # Optionally, add to admin wallet (find admin user)
    admin = User.query.filter(User.roles.any(name='admin')).first()
    if admin:
        admin.wallet_balance = (Decimal(str(admin.wallet_balance)) if admin.wallet_balance else Decimal('0')) + parking_cost
        print(f"DEBUG: Admin wallet after addition: {admin.wallet_balance}", file=sys.stderr)

    # Create transaction for user (Paid)
    txn = BankTransaction(
        user_id=user.id,
        from_account='Wallet',
        to_account='Wallet',
        type='Paid',
        amount=parking_cost,
        reservation_id=reservation.id
    )
    db.session.add(txn)
    db.session.commit()
    print("DEBUG: Transaction committed", file=sys.stderr)

    # Double-check: reload spot from DB and return its status/vehicle_no for debugging
    updated_spot = Parking_spot.query.get(spot_id)
    print("DEBUG: Spot status after booking:", updated_spot.status, "Vehicle No:", updated_spot.vehicle_no, file=sys.stderr)

    return jsonify({'message': 'Slot booked successfully!'}), 201




@auth_bp.route('/api/parking/apply-penalty/<int:reservation_id>', methods=['POST'])
def apply_penalty(reservation_id):
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user:
        return jsonify({'message': 'Unauthorized'}), 401

    reservation = ParkingReservation.query.get(reservation_id)
    if not reservation or reservation.user_id != user.id:
        return jsonify({'message': 'Forbidden'}), 403

    now = datetime.utcnow()
    if reservation.status != 'Occupied' or now <= reservation.release_time:
        return jsonify({'message': 'Penalty not applicable'}), 400

    penalty_amount = 500
    # Deduct from user wallet
    if user.wallet_balance is None or Decimal(str(user.wallet_balance)) < penalty_amount:
        return jsonify({'message': 'Insufficient wallet balance'}), 400
    user.wallet_balance = Decimal(str(user.wallet_balance)) - penalty_amount

    # Add to admin wallet
    admin = User.query.filter(User.roles.any(name='admin')).first()
    if admin:
        admin.wallet_balance = (Decimal(str(admin.wallet_balance)) if admin.wallet_balance else Decimal('0')) + penalty_amount

    # Update reservation status
    reservation.status = 'Completed'

    # Add transaction entry with type 'Penalty'
    txn = BankTransaction(
        user_id=user.id,
        from_account='Wallet',
        to_account='Wallet',
        type='Penalty',
        amount=penalty_amount,
        reservation_id=reservation.id,
        timestamp=datetime.utcnow()
    )
    db.session.add(txn)
    db.session.commit()
    return jsonify({'message': 'Penalty applied', 'status': reservation.status})



@auth_bp.route('/api/parking/history', methods=['GET'])
def get_parking_history():
    from datetime import datetime, timezone

    token = request.headers.get('Authentication-Token')
    if not token:
        return jsonify({'message': 'Missing token'}), 401
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user:
        return jsonify({'message': 'Invalid token'}), 401

    now = datetime.utcnow()
    reservations = ParkingReservation.query.filter_by(user_id=user.id).order_by(ParkingReservation.booking_time.desc()).all()

    # Auto-update: If booking is over and status is still "Reserved", set to "Unattend"
    for r in reservations:
        if r.status == "Reserved" and r.release_time < now:
            r.status = "Unattend"
            db.session.add(r)
    db.session.commit()

    result = []
    for r in reservations:
        lot = Parking_lot.query.get(r.lot_id)
        spot = Parking_spot.query.get(r.spot_id)
        vehicle = Vehicle_info.query.filter_by(vehicle_no=r.vehicle_no).first()
        owner = User.query.get(vehicle.vehicle_owner_id) if vehicle else None
        result.append({
            'id': r.id,
            'lot_name': lot.prime_location_name if lot else '',
            'lot_id': r.lot_id,
            'slot_number': spot.id if spot else '',
            'spot_id': r.spot_id,
            'vehicle_no': r.vehicle_no,
            'vehicle_type': vehicle.vehicle_type if vehicle else '',
            'owner_name': owner.full_name if owner else '',
            'owner_email': owner.email if owner else '',
            'booking_time': r.booking_time,
            'duration_hours': r.duration_hours,
            'release_time': r.release_time,
            'parking_cost': float(r.parking_cost),
            'city': lot.city if lot else '',
            'status': r.status  # Include status in response
        })
    return jsonify(result)



@auth_bp.route('/api/parking/all-reservations', methods=['GET'])
def get_all_active_reservations():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    # Only allow admins
   
    
    country = request.args.get('country')
    city = request.args.get('city')
    address = request.args.get('address')
    
    # Get parking lots that match the criteria
    lots = Parking_lot.query.filter_by(country=country, city=city, address=address).all()
    lot_ids = [lot.id for lot in lots]
    
    # Get all active and future reservations for these lots
    now = datetime.utcnow()
    reservations = ParkingReservation.query.filter(
        ParkingReservation.lot_id.in_(lot_ids),
        ParkingReservation.release_time >= now
    ).all()
    
    result = []
    for r in reservations:
        result.append({
            'id': r.id,
            'spot_id': r.spot_id,
            'booking_time': r.booking_time,
            'release_time': r.release_time
        })
    return jsonify(result)


@auth_bp.route('/api/user/profile')
def get_user_profile():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user:
        return jsonify({'message': 'Invalid token'}), 401


    email = request.args.get('email')
    if not email:
        return jsonify({'message': 'Missing email'}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    return jsonify({
        'full_name': user.full_name,
        'email': user.email,
        'country': user.country,
        'city': user.city,
        'address': user.address,
        'pincode': user.pincode,
       
        'date_of_Account_creation': user.date_of_Account_creation,
        
        'user_profile': user.user_profile  # Should be a URL or base64 image string
    })
@auth_bp.route('/api/user/profile/me', methods=['GET', 'PUT'])
def user_profile_me():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user:
        return jsonify({'message': 'Invalid token'}), 401
    if request.method == 'GET':
        return jsonify({
            'full_name': user.full_name,
            'email': user.email,
            'country': user.country,
            'city': user.city,
            'address': user.address,
            'pincode': user.pincode,
            'wallet_balance': float(user.wallet_balance),
            'date_of_Account_creation': user.date_of_Account_creation,
            'user_profile': user.user_profile  # base64 string
        })
    else:
        data = request.json
        user.full_name = data.get('full_name', user.full_name)
        user.country = data.get('country', user.country)
        user.city = data.get('city', user.city)
        user.address = data.get('address', user.address)
        user.pincode = data.get('pincode', user.pincode)
        if 'user_profile' in data and data['user_profile']:
            user.user_profile = data['user_profile']  # base64 string
        db.session.commit()
        return jsonify({'message': 'Profile updated'})

@auth_bp.route('/api/user/bookings-status-distribution')
def bookings_status_distribution():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user:
        return jsonify({"labels": [], "counts": []})

    # Get all bookings for the user
    bookings = ParkingReservation.query.filter_by(user_id=user.id).all()

    # Count statuses
    from collections import Counter
    status_list = [b.status for b in bookings]
    status_counter = Counter(status_list)

    labels = list(status_counter.keys())
    counts = [status_counter[label] for label in labels]

    return jsonify({"labels": labels, "counts": counts})

@auth_bp.route('/api/user/wallet/topup', methods=['POST'])
def wallet_topup():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user:
        return jsonify({'message': 'Invalid token'}), 401
    data = request.json
    account_no = data.get('account_no')
    bank_name = data.get('bank_name')
    holder_name = data.get('holder_name')
    amount = data.get('amount')
    if not all([account_no, bank_name, holder_name, amount]):
        return jsonify({'message': 'Missing fields'}), 400

    amount = Decimal(str(amount))
    txn = BankTransaction(
        user_id=user.id,
        from_account='Bank',
        to_account='Wallet',
        type='Topup',
        amount=amount
    )
    txn.set_from_bank({'bank_name': bank_name, 'account_no': account_no, 'holder_name': holder_name})

    user.wallet_balance = (Decimal(str(user.wallet_balance)) if user.wallet_balance else Decimal('0')) + amount
    db.session.add(txn)
    db.session.commit()
    return jsonify({'message': 'Wallet topped up successfully'})




@auth_bp.route('/api/user/wallet/withdraw', methods=['POST'])
def wallet_withdraw():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user:
        return jsonify({'message': 'Invalid token'}), 401

    # Check if user is admin
    is_admin = any(role.name == 'admin' for role in user.roles)
    if not is_admin:
        return jsonify({'message': 'Only admin can withdraw from wallet to bank'}), 403

    data = request.json
    account_no = data.get('account_no')
    bank_name = data.get('bank_name')
    holder_name = data.get('holder_name')
    amount = data.get('amount')
    if not all([account_no, bank_name, holder_name, amount]):
        return jsonify({'message': 'Missing fields'}), 400

    amount = Decimal(str(amount))
    if user.wallet_balance is None or Decimal(str(user.wallet_balance)) < amount:
        return jsonify({'message': 'Insufficient wallet balance'}), 400

    user.wallet_balance = Decimal(str(user.wallet_balance)) - amount
    txn = BankTransaction(
        user_id=user.id,
        from_account='Wallet',
        to_account='Bank',
        type='Withdraw',
        amount=amount
    )
    txn.set_to_bank({'bank_name': bank_name, 'account_no': account_no, 'holder_name': holder_name})
    db.session.add(txn)
    db.session.commit()
    return jsonify({'message': 'Withdrawal successful'})



@auth_bp.route('/api/user/wallet/transactions', methods=['GET'])
def wallet_transactions():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user:
        return jsonify({'message': 'Invalid token'}), 401
    txns = BankTransaction.query.filter_by(user_id=user.id).order_by(BankTransaction.timestamp.desc()).all()
    result = []
    for t in txns:
        result.append({
            'id': t.id,
            'from_account': t.from_account,
            'to_account': t.to_account,
            'from_bank': t.get_from_bank(),
            'to_bank': t.get_to_bank(),
            'type': t.type,
            'amount': float(t.amount),
            'timestamp': t.timestamp,
            'reservation_id': t.reservation_id
        })
    return jsonify(result)


@auth_bp.route('/api/user/monthly-spend')
@cache.cached(timeout=3) 
def user_monthly_spend():
    print("Generating monthly spend data...")  # Add this line
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user:
        return jsonify({'message': 'Invalid token'}), 401

    from sqlalchemy import extract
    from datetime import datetime
    months = []
    spends = []
    for i in range(1, 13):
        month_total = db.session.query(db.func.sum(ParkingReservation.parking_cost)).filter(
            ParkingReservation.user_id == user.id,
            extract('month', ParkingReservation.booking_time) == i
        ).scalar() or 0
        months.append(datetime(2025, i, 1).strftime('%b'))  # Jan, Feb, etc.
        spends.append(float(month_total))
    return jsonify({
        'months': months,
        'spends': spends
    })

@auth_bp.route('/api/user/bookings-by-location')
@cache.cached(timeout=3) 
def user_bookings_by_location():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user:
        return jsonify({'message': 'Invalid token'}), 401

    from collections import Counter
    bookings = ParkingReservation.query.filter_by(user_id=user.id).all()
    address_counts = Counter()
    for b in bookings:
        address = f"{b.lot.country}, {b.lot.city}, {b.lot.address}"
        address_counts[address] += 1
    labels = list(address_counts.keys())
    counts = list(address_counts.values())
    return jsonify({'labels': labels, 'counts': counts})

@auth_bp.route('/api/user/monthly-bookings')
@cache.cached(timeout=3) 
def user_monthly_bookings():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user:
        return jsonify({'message': 'Invalid token'}), 401

    from sqlalchemy import extract
    from datetime import datetime
    months = []
    bookings = []
    for i in range(1, 13):
        month_count = ParkingReservation.query.filter(
            ParkingReservation.user_id == user.id,
            extract('month', ParkingReservation.booking_time) == i
        ).count()
        months.append(datetime(2025, i, 1).strftime('%b'))
        bookings.append(month_count)
    return jsonify({
        'months': months,
        'bookings': bookings
    })

@auth_bp.route('/api/user/bookings-by-vehicle-type')
@cache.cached(timeout=3) 
def user_bookings_by_vehicle_type():
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user:
        return jsonify({'message': 'Invalid token'}), 401

    from collections import Counter
    bookings = ParkingReservation.query.filter_by(user_id=user.id).all()
    type_counts = Counter()
    for b in bookings:
        vehicle = Vehicle_info.query.filter_by(vehicle_no=b.vehicle_no).first()
        vtype = vehicle.vehicle_type if vehicle else 'Unknown'
        type_counts[vtype] += 1
    labels = list(type_counts.keys())
    counts = list(type_counts.values())
    return jsonify({'labels': labels, 'counts': counts})



@auth_bp.route('/api/parking/update-status/<int:reservation_id>', methods=['POST'])
def update_reservation_status(reservation_id):
    token = request.headers.get('Authentication-Token')
    user = User.query.filter_by(fs_uniquifier=token).first()
    if not user:
        return jsonify({'message': 'Unauthorized'}), 401

    reservation = ParkingReservation.query.get(reservation_id)
    if not reservation or reservation.user_id != user.id:
        return jsonify({'message': 'Forbidden'}), 403

    data = request.json or {}
    new_status = data.get('status')
    if new_status not in ['Occupied', 'Completed']:
        return jsonify({'message': 'Invalid status'}), 400

    reservation.status = new_status
    db.session.commit()
    return jsonify({'message': 'Status updated', 'status': reservation.status})



# Keep this function but move the import inside:
@auth_bp.get('/celery')
def celery():
    from backend.app_celery.tasks import add  # Import inside function
    task = add.delay(10, 20)
    return {'task_id': task.id}

