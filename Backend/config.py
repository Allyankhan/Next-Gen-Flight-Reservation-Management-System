import os
from dotenv import load_dotenv

# Load the variables from the .env file
load_dotenv()

class Config:
    DB_HOST = os.environ.get('DB_HOST', '127.0.0.1')
    DB_USER = os.environ.get('DB_USER', 'root')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
    DB_NAME = os.environ.get('DB_NAME', 'flight_booking_db')
    
    # Add your new email secrets here
    SENDER_EMAIL = os.environ.get('SENDER_EMAIL')
    SENDER_PASSWORD = os.environ.get('SENDER_PASSWORD')