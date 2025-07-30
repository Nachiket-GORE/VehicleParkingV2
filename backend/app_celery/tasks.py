from . import celery_app

from flask_mail import Message
from datetime import datetime
import pdfkit


@celery_app.task
def add(x, y):
    return x + y


@celery_app.task
def send_parking_reminders():
    from app import app
    from backend.extensions import mail
    from backend.models import User, ParkingReservation
    from flask_mail import Message
    from datetime import datetime

    with app.app_context():
        now = datetime.utcnow()
        reservations = ParkingReservation.query.filter_by(status='Reserved').all()
        for r in reservations:
            user = User.query.get(r.user_id)
            if not user or not user.email:
                continue
            # Calculate time differences
            time_to_start = (r.booking_time - now).total_seconds() / 60  # in minutes
            time_since_start = (now - r.booking_time).total_seconds() / 60  # in minutes

            # 1st reminder: 5 min before booking_time
            if 4.5 <= time_to_start <= 5.5:
                msg = Message(
                    "Parking Reminder: Upcoming Slot",
                    recipients=[user.email],
                    body=f"Hi {user.full_name},\n\nYour parking slot at {r.booking_time.strftime('%Y-%m-%d %H:%M')} is coming up in 5 minutes. Please be ready!"
                )
                try:
                    mail.send(msg)
                    print(f"Sent 5-min reminder to {user.email}")
                except Exception as e:
                    print(f"Failed to send 5-min reminder to {user.email}: {e}")

            # 2nd reminder: 2 min after booking_time
            if 1.5 <= time_since_start <= 2.5:
                msg = Message(
                    "Parking Reminder: Please Park",
                    recipients=[user.email],
                    body=f"Hi {user.full_name},\n\nYour parking slot time started 2 minutes ago. Please hurry and park your vehicle!"
                )
                try:
                    mail.send(msg)
                    print(f"Sent 2-min-after reminder to {user.email}")
                except Exception as e:
                    print(f"Failed to send 2-min-after reminder to {user.email}: {e}")


@celery_app.task
def send_daily_engagement_reminder():
    from app import app
    from backend.extensions import mail
    from backend.models import User
    from flask_mail import Message
    from datetime import datetime

    with app.app_context():
        users = User.query.filter(User.email != None).all()
        for user in users:
            msg = Message(
                subject="Stay Engaged: Discover New Parking Features!",
                recipients=[user.email],
                body=(
                    f"Dear {user.full_name},\n\n"
                    "We hope you're having a great day!\n\n"
                    "Don't forget to check out our Vehicle Parking App for the latest features, "
                    "easy slot booking, and real-time parking updates. Log in today to manage your bookings, "
                    "view your parking history, and explore new locations.\n\n"
                    "Thank you for being a valued member of our community!\n\n"
                    "Best regards,\n"
                    "Book-My-Ride Team"
                )
            )
            try:
                mail.send(msg)
                print(f"Daily engagement reminder sent to {user.email}")
            except Exception as e:
                print(f"Failed to send daily reminder to {user.email}: {e}")


                    
@celery_app.task
def send_monthly_report():
    from app import mail, app
    from backend.models import User, ParkingReservation, Parking_lot, Vehicle_info
    from flask_mail import Message
    from datetime import datetime
    import pdfkit
    import matplotlib.pyplot as plt
    import base64
    from io import BytesIO
    import calendar

    def chart_to_base64(fig):
        buf = BytesIO()
        plt.tight_layout()
        fig.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        return base64.b64encode(buf.read()).decode('utf-8')

    with app.app_context():
        now = datetime.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_end = now

        users = User.query.all()
        for user in users:
            # --- Monthly Spend Chart ---
            spend_months = []
            spend_amounts = []
            for i in range(5, -1, -1):
                month = (now.month - i - 1) % 12 + 1
                year = now.year if now.month - i > 0 else now.year - 1
                month_label = f"{calendar.month_abbr[month]} {year}"
                spend_months.append(month_label)
                month_start_i = datetime(year, month, 1)
                if month == 12:
                    month_end_i = datetime(year + 1, 1, 1)
                else:
                    month_end_i = datetime(year, month + 1, 1)
                bookings_i = ParkingReservation.query.filter(
                    ParkingReservation.user_id == user.id,
                    ParkingReservation.booking_time >= month_start_i,
                    ParkingReservation.booking_time < month_end_i
                ).all()
                spend_amounts.append(sum(float(b.parking_cost) for b in bookings_i))
            fig1, ax1 = plt.subplots(figsize=(6, 3))
            ax1.bar(spend_months, spend_amounts, color='#198754')
            ax1.set_title('Monthly Spend')
            ax1.set_xlabel('Month')
            ax1.set_ylabel('Spend (₹)')
            spend_chart_b64 = chart_to_base64(fig1)

            # --- Bookings by Location Chart ---
            bookings = ParkingReservation.query.filter(
                ParkingReservation.user_id == user.id,
                ParkingReservation.booking_time >= month_start,
                ParkingReservation.booking_time <= month_end
            ).all()
            location_counts = {}
            for b in bookings:
                lot = Parking_lot.query.get(b.lot_id)
                lot_name = lot.prime_location_name if lot else "Unknown"
                location_counts[lot_name] = location_counts.get(lot_name, 0) + 1
            if location_counts:
                fig2, ax2 = plt.subplots(figsize=(6, 3))
                ax2.pie(list(location_counts.values()), labels=list(location_counts.keys()), autopct='%1.0f%%')
                ax2.set_title('Bookings by Location')
                location_chart_b64 = chart_to_base64(fig2)
            else:
                location_chart_b64 = None

            # --- Bookings by Vehicle Type Chart ---
            vehicle_type_counts = {}
            for b in bookings:
                vehicle = Vehicle_info.query.filter_by(vehicle_no=b.vehicle_no).first()
                vtype = vehicle.vehicle_type if vehicle else "Unknown"
                vehicle_type_counts[vtype] = vehicle_type_counts.get(vtype, 0) + 1
            if vehicle_type_counts:
                fig3, ax3 = plt.subplots(figsize=(6, 3))
                ax3.bar(list(vehicle_type_counts.keys()), list(vehicle_type_counts.values()), color='#0d6efd')
                ax3.set_title('Bookings by Vehicle Type')
                ax3.set_xlabel('Vehicle Type')
                ax3.set_ylabel('Bookings')
                vehicle_type_chart_b64 = chart_to_base64(fig3)
            else:
                vehicle_type_chart_b64 = None

            # --- HTML Layout: Chart above, explanation below ---
            def chart_block(img_b64, explanation):
                if img_b64:
                    img_html = f'<div style="text-align:center;"><img src="data:image/png;base64,{img_b64}" width="500" style="border:1px solid #ccc;"/></div>'
                else:
                    img_html = '<div style="width:500px;height:200px;border:1px solid #ccc;display:flex;align-items:center;justify-content:center;">No data</div>'
                return f"""
                <div style="margin-bottom:30px;">
                  {img_html}
                  <div style="margin-top:10px;font-size:13px;color:#333;">{explanation}</div>
                </div>
                """

            html = f"""
            <h2>Monthly Activity Report - {now.strftime('%B %Y')}</h2>
            <p>Dear {user.full_name},</p>
            <p>Here is your parking activity summary for {now.strftime('%B %Y')}:</p>
            <ul>
                <li><b>Parking spots booked:</b> {len(bookings)}</li>
                <li><b>Total amount spent:</b> ₹{sum(float(b.parking_cost) for b in bookings)}</li>
            </ul>
            {chart_block(
                spend_chart_b64,
                "<b>Spends Chart:</b> This chart visualizes your total parking expenses for each of the last 6 months, helping you track how much you spend over time and identify any trends or changes in your parking habits."
            )}
            {chart_block(
                location_chart_b64,
                "<b>Bookings by Location:</b> The pie chart shows the distribution of your bookings across different parking lots this month, highlighting which locations you use most frequently."
            )}
            {chart_block(
                vehicle_type_chart_b64,
                "<b>Bookings by Vehicle Type:</b> This bar chart breaks down your bookings by vehicle type for this month, showing whether you park more frequently with a car, bike, or other vehicle."
            )}
            <p>Thank you for using our service!</p>
            """

            try:
                pdf = pdfkit.from_string(html, False)
            except Exception as e:
                print(f"Failed to generate PDF for {user.email}: {e}")
                continue

            msg = Message(
                subject=f"Your Monthly Parking Activity Report - {now.strftime('%B %Y')}",
                recipients=[user.email],
                body="Please find attached your monthly parking activity report.",
            )
            msg.attach(f"Monthly_Report_{now.strftime('%B_%Y')}.pdf", "application/pdf", pdf)
            try:
                mail.send(msg)
                print(f"Monthly report sent to {user.email}")
            except Exception as e:
                print(f"Failed to send monthly report to {user.email}: {e}")

