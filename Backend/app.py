from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from config import Config
import uuid
import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
# Enable CORS for the React frontend
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

def get_db_connection():
    """Establish and return a database connection."""
    try:
        connection = mysql.connector.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME
        )
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def send_booking_email(recipient_email, passenger_name, ticket_ref, flight_number):
    """Sends a beautiful HTML confirmation email to the user."""
    
    # ⚠️ REPLACE THESE WITH YOUR DETAILS ⚠️
    SENDER_EMAIL = Config.SENDER_EMAIL
    SENDER_PASSWORD = Config.SENDER_PASSWORD

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"✈️ Flight Confirmation: {ticket_ref}"
    msg["From"] = SENDER_EMAIL
    msg["To"] = recipient_email

    # The HTML template for the email
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; border-top: 5px solid #10b981;">
          <h2 style="color: #064e3b; margin-top: 0;">Reservation Confirmed!</h2>
          <p style="color: #3f3f46; font-size: 16px;">Dear <strong>{passenger_name}</strong>,</p>
          <p style="color: #3f3f46; font-size: 16px;">Your seat has been successfully booked. Have a great trip!</p>
          
          <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #064e3b;"><strong>Ticket Reference:</strong> <span style="color: #10b981; font-size: 18px;">{ticket_ref}</span></p>
            <p style="margin: 5px 0; color: #064e3b;"><strong>Flight Number:</strong> {flight_number}</p>
          </div>
          
          <p style="color: #71717a; font-size: 14px;">You can download your official PDF Boarding Pass and QR code directly from your Travel Wallet dashboard.</p>
          <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;">
          <p style="color: #a1a1aa; font-size: 12px; text-align: center;">This is an automated message from the Web Engineering Flight System.</p>
        </div>
      </body>
    </html>
    """
    
    msg.attach(MIMEText(html_content, "html"))

    try:
        # Connect to Google's SMTP Server
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls() # Secure the connection
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, recipient_email, msg.as_string())
        server.quit()
        print(f"Success: Email sent to {recipient_email}")
    except Exception as e:
        print(f"Error sending email: {e}")
def send_cancellation_email(recipient_email, passenger_name, ticket_ref):
    """Sends a cancellation confirmation email to the user."""
    SENDER_EMAIL = Config.SENDER_EMAIL
    SENDER_PASSWORD = Config.SENDER_PASSWORD

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"✈️ Flight Cancellation Confirmed: {ticket_ref}"
    msg["From"] = SENDER_EMAIL
    msg["To"] = recipient_email

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; border-top: 5px solid #ef4444;">
          <h2 style="color: #7f1d1d; margin-top: 0;">Reservation Cancelled</h2>
          <p style="color: #3f3f46; font-size: 16px;">Dear <strong>{passenger_name}</strong>,</p>
          <p style="color: #3f3f46; font-size: 16px;">As requested, your booking for Ticket Reference <strong>{ticket_ref}</strong> has been successfully cancelled.</p>
          <p style="color: #3f3f46; font-size: 16px;">Any applicable refunds will be processed to your original payment method within 3-5 business days.</p>
          <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;">
          <p style="color: #a1a1aa; font-size: 12px; text-align: center;">This is an automated message from the Web Engineering Flight System.</p>
        </div>
      </body>
    </html>
    """
    msg.attach(MIMEText(html_content, "html"))

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, recipient_email, msg.as_string())
        server.quit()
        print(f"Success: Cancellation email sent to {recipient_email}")
    except Exception as e:
        print(f"Error sending cancellation email: {e}")

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple route to verify the API is running."""
    return jsonify({"status": "success", "message": "API is running!"}), 200

@app.route('/api/login', methods=['POST'])
def login():
    """Authenticate a user and return their details."""
    data = request.json
    email = data.get('email')
    password = data.get('password')

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        query = "SELECT id, name, email, role FROM users WHERE email = %s AND password_hash = %s"
        cursor.execute(query, (email, password))
        user = cursor.fetchone()
        
        if user:
            return jsonify({"status": "success", "user": user}), 200
        else:
            return jsonify({"error": "Invalid email or password"}), 401
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/flights', methods=['GET'])
def get_flights():
    """Fetch all flights with their origin and destination airport codes."""
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT 
            f.id, f.flight_number, f.departure_time, f.arrival_time, f.base_price, f.status,
            orig.code AS origin_code, orig.city AS origin_city,
            dest.code AS destination_code, dest.city AS destination_city
        FROM flights f
        JOIN airports orig ON f.origin_id = orig.id
        JOIN airports dest ON f.destination_id = dest.id
    """
    try:
        cursor.execute(query)
        flights = cursor.fetchall()
        return jsonify({"status": "success", "data": flights}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/flights/<int:flight_id>/seats', methods=['GET'])
def get_flight_seats(flight_id):
    """Fetch all seats for a specific flight to generate the seat map."""
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT id, seat_number, class, status 
        FROM seats 
        WHERE flight_id = %s
        ORDER BY seat_number ASC
    """
    try:
        cursor.execute(query, (flight_id,))
        seats = cursor.fetchall()
        if not seats:
             return jsonify({"status": "success", "message": "No seats found", "data": []}), 200
        return jsonify({"status": "success", "data": seats}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/users/<int:user_id>/bookings', methods=['GET'])
def get_user_bookings(user_id):
    """Fetch all bookings and ticket details for a specific user."""
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT 
            b.id AS booking_id, b.total_price, b.status AS booking_status, b.created_at,
            t.ticket_ref,
            f.flight_number, f.departure_time,
            orig.city AS origin_city, orig.code AS origin_code,
            dest.city AS destination_city, dest.code AS destination_code,
            s.seat_number, s.class AS seat_class
        FROM bookings b
        JOIN tickets t ON b.id = t.booking_id
        JOIN flights f ON b.flight_id = f.id
        JOIN airports orig ON f.origin_id = orig.id
        JOIN airports dest ON f.destination_id = dest.id
        JOIN seats s ON b.seat_id = s.id
        WHERE b.user_id = %s
        ORDER BY b.created_at DESC
    """
    try:
        cursor.execute(query, (user_id,))
        bookings = cursor.fetchall()
        return jsonify({"status": "success", "data": bookings}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/bookings', methods=['GET'])
def get_all_bookings():
    """Admin route to fetch every booking in the system."""
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT 
            b.id AS booking_id, b.total_price, b.status AS booking_status, b.created_at,
            t.ticket_ref,
            f.flight_number, f.departure_time,
            orig.code AS origin_code, dest.code AS destination_code,
            u.name AS passenger_name, u.email AS passenger_email
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN tickets t ON b.id = t.booking_id
        JOIN flights f ON b.flight_id = f.id
        JOIN airports orig ON f.origin_id = orig.id
        JOIN airports dest ON f.destination_id = dest.id
        ORDER BY b.created_at DESC
    """
    try:
        cursor.execute(query)
        all_bookings = cursor.fetchall()
        return jsonify({"status": "success", "data": all_bookings}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/bookings', methods=['POST'])
def create_booking():
    """Handle the multi-step transaction of creating a booking."""
    data = request.json
    
    user_id = data.get('user_id')
    flight_id = data.get('flight_id')
    seat_id = data.get('seat_id')
    base_price = data.get('total_price', 8500.00)
    
    passenger_name = data.get('passenger_name')
    passport_number = data.get('passport_number')
    address = data.get('address')

    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        cursor.execute("SELECT status FROM seats WHERE id = %s", (seat_id,))
        seat = cursor.fetchone()
        if not seat or seat['status'] == 'booked':
            return jsonify({"error": "Seat is already booked or invalid"}), 400

        booking_query = """
            INSERT INTO bookings (user_id, flight_id, seat_id, total_price, status, passenger_name, passport_number, address) 
            VALUES (%s, %s, %s, %s, 'confirmed', %s, %s, %s)
        """
        cursor.execute(booking_query, (user_id, flight_id, seat_id, base_price, passenger_name, passport_number, address))
        booking_id = cursor.lastrowid

        cursor.execute("UPDATE seats SET status = 'booked' WHERE id = %s", (seat_id,))

        ticket_ref = f"TKT-{datetime.datetime.now().year}-{str(uuid.uuid4())[:6].upper()}"
        ticket_query = "INSERT INTO tickets (booking_id, ticket_ref) VALUES (%s, %s)"
        cursor.execute(ticket_query, (booking_id, ticket_ref))

        # We need the user's email and flight number to send the message!
        cursor.execute("SELECT email FROM users WHERE id = %s", (user_id,))
        user_data = cursor.fetchone()
        
        cursor.execute("SELECT flight_number FROM flights WHERE id = %s", (flight_id,))
        flight_data = cursor.fetchone()

        conn.commit()
        
        # FIRE OFF THE EMAIL AFTER SUCCESSFUL COMMIT!
        if user_data and flight_data:
            send_booking_email(
                recipient_email=user_data['email'], 
                passenger_name=passenger_name, 
                ticket_ref=ticket_ref, 
                flight_number=flight_data['flight_number']
            )

        return jsonify({
            "status": "success", 
            "message": "Booking confirmed", 
            "ticket_ref": ticket_ref
        }), 201

    except Error as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
# --- WEBSOCKET REAL-TIME EVENTS ---

@socketio.on('join_flight')
def on_join(data):
    """When a user opens a booking page, they join a specific flight 'room'."""
    room = data['flight_id']
    join_room(room)

@socketio.on('leave_flight')
def on_leave(data):
    """When a user leaves the page, remove them from the room."""
    room = data['flight_id']
    leave_room(room)

@socketio.on('select_seat')
def handle_select_seat(data):
    """Broadcast to everyone ELSE in the room that this seat is currently locked."""
    emit('seat_locked', {'seat_id': data['seat_id']}, to=data['flight_id'], include_self=False)

@socketio.on('deselect_seat')
def handle_deselect_seat(data):
    """Broadcast that the user unclicked the seat, making it available again."""
    emit('seat_unlocked', {'seat_id': data['seat_id']}, to=data['flight_id'], include_self=False)

# --- END WEBSOCKET EVENTS ---
@app.route('/api/bookings/<int:booking_id>', methods=['DELETE'])
def cancel_booking(booking_id):
    """Handle the cancellation of a booking and free up the seat."""
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        # 1. Get the booking details before we delete them (so we know which seat to free and who to email)
        cursor.execute("""
            SELECT b.seat_id, b.passenger_name, t.ticket_ref, u.email 
            FROM bookings b 
            JOIN tickets t ON b.id = t.booking_id
            JOIN users u ON b.user_id = u.id
            WHERE b.id = %s
        """, (booking_id,))
        booking_info = cursor.fetchone()

        if not booking_info:
            return jsonify({"error": "Booking not found"}), 404

        # 2. Delete the ticket first (Foreign Key constraint)
        cursor.execute("DELETE FROM tickets WHERE booking_id = %s", (booking_id,))

        # 3. Delete the booking itself
        cursor.execute("DELETE FROM bookings WHERE id = %s", (booking_id,))

        # 4. Make the seat available again!
        cursor.execute("UPDATE seats SET status = 'available' WHERE id = %s", (booking_info['seat_id'],))

        conn.commit()

        # 5. Fire off the cancellation email
        send_cancellation_email(
            recipient_email=booking_info['email'],
            passenger_name=booking_info['passenger_name'],
            ticket_ref=booking_info['ticket_ref']
        )

        return jsonify({"status": "success", "message": "Booking cancelled and seat freed."}), 200

    except Error as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)