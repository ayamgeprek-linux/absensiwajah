from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import cv2
import numpy as np
import face_recognition
import os
import json
from datetime import datetime, timedelta
import logging
import time
import pandas as pd
from io import BytesIO
from functools import wraps
import jwt
import math
import hashlib
import secrets

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# JWT Configuration
app.config['JWT_SECRET_KEY'] = 'your-super-secret-jwt-key-2024'
app.config['JWT_ALGORITHM'] = 'HS256'

# CORS
CORS(app, 
     origins=["http://localhost:3000", "http://127.0.0.1:3000"],
     supports_credentials=True,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# Storage files
USERS_FILE = 'users.json'
ATTENDANCE_FILE = 'attendance.json'
MONTHLY_ATTENDANCE_FILE = 'monthly_attendance.json'
LOCATION_SETTINGS_FILE = 'location_settings.json'

# Cache untuk percepatan
face_encodings_cache = {}

# Password hashing functions
def hash_password(password):
    """Hash password dengan salt"""
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000  # Iterasi
    )
    return salt + ':' + password_hash.hex()

def verify_password(stored_password, provided_password):
    """Verifikasi password"""
    try:
        salt, stored_hash = stored_password.split(':')
        computed_hash = hashlib.pbkdf2_hmac(
            'sha256',
            provided_password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        ).hex()
        return computed_hash == stored_hash
    except:
        return False

# Load location settings
def load_location_settings():
    try:
        if os.path.exists(LOCATION_SETTINGS_FILE):
            with open(LOCATION_SETTINGS_FILE, 'r') as f:
                return json.load(f)
        # Default settings
        return {
            'enabled': False,
            'latitude': -6.2088,
            'longitude': 106.8456,
            'radius': 100,
            'location_name': 'Kantor Pusat'
        }
    except Exception as e:
        logger.error(f"Error loading location settings: {str(e)}")
        return {
            'enabled': False,
            'latitude': -6.2088,
            'longitude': 106.8456,
            'radius': 100,
            'location_name': 'Kantor Pusat'
        }

# Save location settings
def save_location_settings(settings):
    try:
        with open(LOCATION_SETTINGS_FILE, 'w') as f:
            json.dump(settings, f, indent=2)
        logger.info("Location settings saved successfully")
    except Exception as e:
        logger.error(f"Error saving location settings: {str(e)}")

# Calculate distance between two coordinates (Haversine formula)
def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two coordinates in meters
    using Haversine formula
    """
    R = 6371000  # Radius of Earth in meters
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_lat/2) * math.sin(delta_lat/2) +
         math.cos(lat1_rad) * math.cos(lat2_rad) *
         math.sin(delta_lon/2) * math.sin(delta_lon/2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    distance = R * c
    return distance

# Validate location
def validate_location(user_lat, user_lon):
    """
    Validate if user location is within allowed radius
    """
    settings = load_location_settings()
    
    if not settings['enabled']:
        return True, "Location validation disabled"
    
    if user_lat is None or user_lon is None:
        return False, "Location data not provided"
    
    distance = calculate_distance(
        settings['latitude'], 
        settings['longitude'],
        user_lat, 
        user_lon
    )
    
    if distance <= settings['radius']:
        return True, f"Lokasi valid ({distance:.0f}m dari {settings['location_name']})"
    else:
        return False, f"Lokasi tidak valid. Anda berada {distance:.0f}m dari {settings['location_name']} (max: {settings['radius']}m)"

# Load users from file
def load_users():
    try:
        if os.path.exists(USERS_FILE):
            with open(USERS_FILE, 'r') as f:
                users = json.load(f)
                for user_id, user_data in users.items():
                    face_encodings_cache[user_id] = np.array(user_data['face_encoding'])
                return users
        return {}
    except Exception as e:
        logger.error(f"Error loading users: {str(e)}")
        return {}

def save_users(users):
    try:
        with open(USERS_FILE, 'w') as f:
            json.dump(users, f, indent=2)
        logger.info(f"Users saved successfully. Total users: {len(users)}")
    except Exception as e:
        logger.error(f"Error saving users: {str(e)}")

def load_attendance():
    try:
        if os.path.exists(ATTENDANCE_FILE):
            with open(ATTENDANCE_FILE, 'r') as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
                else:
                    logger.warning("Attendance file contains dictionary, converting to list")
                    return []
        return []
    except Exception as e:
        logger.error(f"Error loading attendance: {str(e)}")
        return []

def save_attendance(records):
    try:
        if not isinstance(records, list):
            logger.error(f"Records is not a list: {type(records)}")
            records = []
            
        with open(ATTENDANCE_FILE, 'w') as f:
            json.dump(records, f, indent=2)
        logger.info(f"Attendance records saved. Total records: {len(records)}")
    except Exception as e:
        logger.error(f"Error saving attendance: {str(e)}")

def load_monthly_attendance():
    try:
        if os.path.exists(MONTHLY_ATTENDANCE_FILE):
            with open(MONTHLY_ATTENDANCE_FILE, 'r') as f:
                return json.load(f)
        return {}
    except Exception as e:
        logger.error(f"Error loading monthly attendance: {str(e)}")
        return {}

def save_monthly_attendance(monthly_data):
    try:
        with open(MONTHLY_ATTENDANCE_FILE, 'w') as f:
            json.dump(monthly_data, f, indent=2)
        logger.info(f"Monthly attendance saved for {len(monthly_data)} months")
    except Exception as e:
        logger.error(f"Error saving monthly attendance: {str(e)}")

# Auto-cleanup
def cleanup_old_attendance():
    try:
        records = load_attendance()
        current_month = datetime.now().strftime("%Y-%m")
        
        current_month_records = []
        old_records = []
        
        for record in records:
            record_date = datetime.fromisoformat(record['timestamp'])
            record_month = record_date.strftime("%Y-%m")
            
            if record_month == current_month:
                current_month_records.append(record)
            else:
                old_records.append(record)
        
        if old_records:
            monthly_data = load_monthly_attendance()
            
            for record in old_records:
                record_date = datetime.fromisoformat(record['timestamp'])
                month_key = record_date.strftime("%Y-%m")
                
                if month_key not in monthly_data:
                    monthly_data[month_key] = []
                
                existing_timestamps = [r.get('timestamp') for r in monthly_data[month_key]]
                if record['timestamp'] not in existing_timestamps:
                    monthly_data[month_key].append(record)
            
            save_monthly_attendance(monthly_data)
            logger.info(f"✅ Pindahkan {len(old_records)} data ke riwayat bulanan")
        
        save_attendance(current_month_records)
        logger.info(f"✅ Cleanup selesai. Data bulan ini: {len(current_month_records)} records")
        
        return len(old_records)
        
    except Exception as e:
        logger.error(f"❌ Error cleaning up attendance: {str(e)}")
        return 0

# Face recognition functions
def extract_face_encodings(image_array):
    try:
        start_time = time.time()
        
        rgb_image = cv2.cvtColor(image_array, cv2.COLOR_BGR2RGB)
        
        height, width = rgb_image.shape[:2]
        max_size = 800
        if max(height, width) > max_size:
            scale = max_size / max(height, width)
            new_width = int(width * scale)
            new_height = int(height * scale)
            rgb_image = cv2.resize(rgb_image, (new_width, new_height))
        
        face_locations = face_recognition.face_locations(rgb_image, model="hog")
        
        if face_locations:
            face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
            
            processing_time = time.time() - start_time
            logger.info(f"✅ Detected {len(face_encodings)} face(s) in {processing_time:.2f}s")
            
            return face_encodings
        
        logger.warning("❌ No faces detected in image")
        return None
        
    except Exception as e:
        logger.error(f"❌ Error in face encoding: {str(e)}")
        return None

def find_best_match(unknown_encoding, users_db, similarity_threshold=0.6):
    best_match = None
    best_similarity = 0
    
    unknown_encoding = np.array(unknown_encoding)
    
    for user_id, user_data in users_db.items():
        try:
            if user_id in face_encodings_cache:
                stored_encoding = face_encodings_cache[user_id]
            else:
                stored_encoding = np.array(user_data['face_encoding'])
                face_encodings_cache[user_id] = stored_encoding
            
            face_distance = face_recognition.face_distance([stored_encoding], unknown_encoding)[0]
            similarity = 1 - face_distance
            
            if similarity >= 0.7:
                confidence = "HIGH"
            elif similarity >= 0.6:
                confidence = "MEDIUM"
            else:
                confidence = "LOW"
            
            if similarity > best_similarity and similarity >= similarity_threshold:
                best_similarity = similarity
                best_match = {
                    'user_id': user_id,
                    'name': user_data['name'],
                    'similarity': float(similarity),
                    'confidence': confidence,
                    'distance': float(face_distance)
                }
                
        except Exception as e:
            logger.error(f"❌ Error comparing with user {user_id}: {str(e)}")
            continue
    
    return best_match, best_similarity

def validate_image_quality(image):
    try:
        height, width = image.shape[:2]
        
        if height < 150 or width < 150:
            return False, "Image terlalu kecil"
        
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        brightness = np.mean(gray)
        if brightness < 50:
            return False, "Gambar terlalu gelap"
        if brightness > 220:
            return False, "Gambar terlalu terang"
        
        return True, "Kualitas gambar baik"
        
    except Exception as e:
        return False, f"Error validasi: {str(e)}"

# JWT Token Authentication
def create_jwt_token(username):
    """Create JWT token"""
    payload = {
        'username': username,
        'exp': datetime.utcnow() + timedelta(hours=24),
        'iat': datetime.utcnow()
    }
    token = jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm=app.config['JWT_ALGORITHM'])
    return token

def verify_jwt_token(token):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=[app.config['JWT_ALGORITHM']])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception('Token expired')
    except jwt.InvalidTokenError:
        raise Exception('Invalid token')

def token_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Check authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'success': False, 'error': 'Token is missing'}), 401
        
        try:
            payload = verify_jwt_token(token)
            request.current_user = payload
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 401
        
        return f(*args, **kwargs)
    return decorated_function

# ==================== USER ENDPOINTS ====================

@app.route('/')
def home():
    return jsonify({
        "message": "Face Recognition API is running!", 
        "status": "active",
        "version": "4.0 - WITH LOGIN & PASSWORD"
    })

@app.route('/system-status', methods=['GET'])
def system_status():
    try:
        users = load_users()
        attendance_records = load_attendance()
        monthly_data = load_monthly_attendance()
        location_settings = load_location_settings()
        
        return jsonify({
            'success': True,
            'status': 'operational',
            'users_registered': len(users),
            'current_month_records': len(attendance_records),
            'historical_months': len(monthly_data),
            'cache_size': len(face_encodings_cache),
            'location_enabled': location_settings['enabled'],
            'current_month': datetime.now().strftime("%B %Y")
        })
    except Exception as e:
        logger.error(f"System status error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# 🔥 NEW: User Login Endpoint
@app.route('/login', methods=['POST'])
def user_login():
    """User login dengan password"""
    try:
        data = request.get_json()
        user_id = data.get('user_id', '').strip()
        password = data.get('password', '').strip()
        
        logger.info(f"🔐 User login attempt: {user_id}")
        
        if not user_id or not password:
            return jsonify({'success': False, 'error': 'User ID dan password diperlukan'}), 400
        
        users = load_users()
        
        if user_id not in users:
            logger.warning(f"❌ Login failed - User ID tidak ditemukan: {user_id}")
            return jsonify({'success': False, 'error': 'User ID atau password salah'}), 401
        
        user_data = users[user_id]
        
        # Check if user has password (for backward compatibility)
        if 'password_hash' not in user_data:
            logger.warning(f"❌ Login failed - User belum setup password: {user_id}")
            return jsonify({'success': False, 'error': 'Akun belum setup password. Silakan daftar ulang.'}), 401
        
        # Verify password
        if not verify_password(user_data['password_hash'], password):
            logger.warning(f"❌ Login failed - Password salah: {user_id}")
            return jsonify({'success': False, 'error': 'User ID atau password salah'}), 401
        
        # Create JWT token for user
        token = create_jwt_token(user_id)
        
        logger.info(f"✅ User login successful: {user_data['name']} ({user_id})")
        
        return jsonify({
            'success': True,
            'message': 'Login berhasil',
            'token': token,
            'user': {
                'user_id': user_id,
                'name': user_data['name'],
                'registered_at': user_data.get('registered_at')
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Login error: {str(e)}")
        return jsonify({'success': False, 'error': f'Login gagal: {str(e)}'}), 500

@app.route('/register', methods=['POST'])
def register_user():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        file = request.files['file']
        name = request.form.get('name', '').strip()
        user_id = request.form.get('user_id', '').strip()
        password = request.form.get('password', '').strip()  # 🔥 NEW: Get password
        
        if not user_id or not name or not password:  # 🔥 UPDATE: Check password
            return jsonify({'success': False, 'error': 'Name, User ID, dan Password diperlukan'}), 400
        
        if len(password) < 4:
            return jsonify({'success': False, 'error': 'Password minimal 4 karakter'}), 400
        
        file_bytes = np.frombuffer(file.read(), np.uint8)
        image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({'success': False, 'error': 'Invalid image file'}), 400
        
        quality_ok, quality_msg = validate_image_quality(image)
        if not quality_ok:
            return jsonify({'success': False, 'error': f'Kualitas gambar buruk: {quality_msg}'}), 400
        
        face_encodings = extract_face_encodings(image)
        
        if face_encodings is None:
            return jsonify({
                'success': False, 
                'error': 'Tidak ada wajah yang terdeteksi. Pastikan wajah jelas dan pencahayaan baik.'
            }), 400
        
        if len(face_encodings) > 1:
            return jsonify({
                'success': False, 
                'error': f'Multiple faces detected ({len(face_encodings)}). Upload gambar dengan satu wajah saja.'
            }), 400
        
        users = load_users()
        
        if user_id in users:
            return jsonify({'success': False, 'error': 'User ID already exists'}), 400
        
        new_encoding = face_encodings[0]
        existing_match, similarity = find_best_match(new_encoding, users, 0.7)
        if existing_match:
            return jsonify({
                'success': False, 
                'error': f'Wajah sudah terdaftar sebagai {existing_match["name"]} (similarity: {similarity:.2%})'
            }), 400
        
        # 🔥 NEW: Hash password sebelum disimpan
        password_hash = hash_password(password)
        
        users[user_id] = {
            'name': name,
            'face_encoding': new_encoding.tolist(),
            'password_hash': password_hash,  # 🔥 NEW: Store hashed password
            'registered_at': datetime.now().isoformat()
        }
        
        face_encodings_cache[user_id] = new_encoding
        save_users(users)
        
        logger.info(f"✅ User registered: {name} ({user_id}) dengan password")
        
        return jsonify({
            'success': True,
            'message': f'User {name} registered successfully',
            'data': {
                'user_id': user_id,
                'name': name,
                'registered_at': users[user_id]['registered_at']
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Registration error: {str(e)}")
        return jsonify({'success': False, 'error': f'Registration failed: {str(e)}'}), 500

@app.route('/attendance', methods=['POST'])
def take_attendance():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        # Get location data from request
        latitude = request.form.get('latitude', type=float)
        longitude = request.form.get('longitude', type=float)
        
        file = request.files['file']
        file_bytes = np.frombuffer(file.read(), np.uint8)
        image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({'success': False, 'error': 'Invalid image file'}), 400
        
        quality_ok, quality_msg = validate_image_quality(image)
        if not quality_ok:
            return jsonify({'success': False, 'error': f'Kualitas gambar buruk: {quality_msg}'}), 400
        
        face_encodings = extract_face_encodings(image)
        
        if face_encodings is None:
            return jsonify({
                'success': True,
                'recognized_user': None,
                'message': 'Tidak ada wajah yang terdeteksi'
            })
        
        users = load_users()
        
        if not users:
            return jsonify({
                'success': False, 
                'error': 'Tidak ada user terdaftar'
            })
        
        best_match, similarity = find_best_match(face_encodings[0], users, similarity_threshold=0.6)
        
        if best_match:
            # Validate location
            location_valid, location_message = validate_location(latitude, longitude)
            
            if not location_valid:
                return jsonify({
                    'success': False,
                    'error': location_message,
                    'recognized_user': {
                        'user_id': best_match['user_id'],
                        'name': best_match['name'],
                        'similarity': float(similarity),
                        'confidence': best_match['confidence']
                    }
                })
            
            # Load and save attendance record
            attendance_records = load_attendance()
            
            if not isinstance(attendance_records, list):
                logger.warning("Attendance records is not a list, resetting to empty list")
                attendance_records = []
            
            attendance_data = {
                'user_id': best_match['user_id'],
                'name': best_match['name'],
                'similarity': float(similarity),
                'confidence': best_match['confidence'],
                'timestamp': datetime.now().isoformat(),
                'date': datetime.now().strftime("%Y-%m-%d"),
                'time': datetime.now().strftime("%H:%M:%S"),
                'status': 'present',
                'location_verified': location_valid,
                'location_message': location_message,
                'user_latitude': latitude,
                'user_longitude': longitude
            }
            
            attendance_records.append(attendance_data)
            save_attendance(attendance_records)
            
            logger.info(f"✅ Attendance: {best_match['name']} ({similarity:.2%}) - Location: {location_message}")
            
            return jsonify({
                'success': True,
                'recognized_user': {
                    'user_id': best_match['user_id'],
                    'name': best_match['name'],
                    'similarity': float(similarity),
                    'confidence': best_match['confidence']
                },
                'location': {
                    'verified': location_valid,
                    'message': location_message
                }
            })
        else:
            return jsonify({
                'success': True,
                'recognized_user': None,
                'message': f'Wajah tidak dikenali (similarity tertinggi: {similarity:.2%})'
            })
            
    except Exception as e:
        logger.error(f"❌ Attendance error: {str(e)}")
        return jsonify({'success': False, 'error': f'Absensi failed: {str(e)}'}), 500

@app.route('/users', methods=['GET'])
def get_users():
    try:
        users = load_users()
        users_list = {}
        for user_id, user_data in users.items():
            users_list[user_id] = {
                'user_id': user_id,
                'name': user_data['name'],
                'registered_at': user_data['registered_at'],
                'has_password': 'password_hash' in user_data  # 🔥 NEW: Info password
            }
        
        return jsonify({
            'success': True,
            'total_users': len(users),
            'users': users_list
        })
    except Exception as e:
        logger.error(f"Error getting users: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/attendance-records', methods=['GET'])
def get_attendance_records():
    try:
        records = load_attendance()
        
        if not isinstance(records, list):
            logger.warning("Records is not a list, returning empty list")
            records = []
            
        records.reverse()
        return jsonify({
            'success': True,
            'total_records': len(records),
            'records': records[:100]
        })
    except Exception as e:
        logger.error(f"Error getting attendance records: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== ADMIN ENDPOINTS (JWT) ====================

@app.route('/admin/login', methods=['POST'])
def admin_login():
    """Admin login dengan JWT"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        logger.info(f"🔐 Admin login attempt: {username}")
        
        if username == 'admin' and password == 'admin123':
            token = create_jwt_token(username)
            
            logger.info(f"✅ Admin login successful - Token created")
            
            return jsonify({
                'success': True, 
                'message': 'Login berhasil',
                'token': token,
                'user': {'username': 'admin', 'role': 'administrator'}
            })
        else:
            logger.warning("❌ Admin login failed - invalid credentials")
            return jsonify({'success': False, 'error': 'Username atau password salah'}), 401
            
    except Exception as e:
        logger.error(f"❌ Login error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/verify-token', methods=['POST'])
def verify_token():
    """Verify JWT token"""
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'success': False, 'error': 'Token is missing'}), 401
        
        payload = verify_jwt_token(token)
        
        return jsonify({
            'success': True,
            'authenticated': True,
            'user': {'username': payload['username'], 'role': 'administrator'}
        })
        
    except Exception as e:
        return jsonify({
            'success': True,
            'authenticated': False,
            'error': str(e)
        })

# Location settings endpoints
@app.route('/admin/location-settings', methods=['GET'])
@token_required
def get_location_settings():
    """Get current location settings"""
    try:
        settings = load_location_settings()
        return jsonify({
            'success': True,
            'settings': settings
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/location-settings', methods=['POST'])
@token_required
def update_location_settings():
    """Update location settings"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['enabled', 'latitude', 'longitude', 'radius', 'location_name']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'Field {field} is required'}), 400
        
        settings = {
            'enabled': bool(data['enabled']),
            'latitude': float(data['latitude']),
            'longitude': float(data['longitude']),
            'radius': int(data['radius']),
            'location_name': data['location_name'].strip()
        }
        
        save_location_settings(settings)
        
        logger.info(f"✅ Location settings updated: {settings}")
        
        return jsonify({
            'success': True,
            'message': 'Location settings updated successfully',
            'settings': settings
        })
        
    except Exception as e:
        logger.error(f"❌ Error updating location settings: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/test-location', methods=['POST'])
@token_required
def test_location():
    """Test location validation"""
    try:
        data = request.get_json()
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if latitude is None or longitude is None:
            return jsonify({'success': False, 'error': 'Latitude and longitude are required'}), 400
        
        settings = load_location_settings()
        distance = calculate_distance(
            settings['latitude'], 
            settings['longitude'],
            latitude, 
            longitude
        )
        
        is_valid = distance <= settings['radius']
        
        return jsonify({
            'success': True,
            'valid': is_valid,
            'distance': round(distance, 2),
            'max_radius': settings['radius'],
            'message': f"Jarak: {distance:.0f}m dari {settings['location_name']} ({'Valid' if is_valid else 'Tidak Valid'})"
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/dashboard', methods=['GET'])
@token_required
def admin_dashboard():
    """Admin dashboard statistics"""
    try:
        users = load_users()
        attendance_records = load_attendance()
        monthly_data = load_monthly_attendance()
        location_settings = load_location_settings()
        
        # Hitung statistics
        total_attendance_today = len([
            record for record in attendance_records 
            if datetime.fromisoformat(record['timestamp']).date() == datetime.now().date()
        ])
        
        # Hitung lokasi invalid hari ini
        invalid_location_today = len([
            record for record in attendance_records 
            if (datetime.fromisoformat(record['timestamp']).date() == datetime.now().date() and 
                not record.get('location_verified', True))
        ])
        
        # Hitung total semua bulan
        total_all_months = len(attendance_records)
        for month_records in monthly_data.values():
            total_all_months += len(month_records)
        
        # Hitung rata-rata similarity
        avg_similarity = 85.5
        if attendance_records:
            similarities = [r['similarity'] for r in attendance_records if 'similarity' in r]
            if similarities:
                avg_similarity = (sum(similarities) / len(similarities)) * 100
        
        return jsonify({
            'success': True,
            'statistics': {
                'totalUsers': len(users),
                'totalTransactions': total_all_months,
                'averageScore': round(avg_similarity, 1),
                'activeMonths': len(monthly_data) + (1 if attendance_records else 0),
                'total_attendance_today': total_attendance_today,
                'invalid_location_today': invalid_location_today,
                'total_attendance_current_month': len(attendance_records),
                'historical_months': len(monthly_data),
                'location_enabled': location_settings['enabled']
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/monthly-records', methods=['GET'])
@token_required
def get_monthly_records():
    """Get attendance records for specific month"""
    try:
        month = request.args.get('month', datetime.now().strftime("%Y-%m"))
        
        logger.info(f"📊 Request monthly records for: {month}")
        
        if month == datetime.now().strftime("%Y-%m"):
            records = load_attendance()
            logger.info(f"📁 Loaded {len(records)} records from current month")
        else:
            monthly_data = load_monthly_attendance()
            records = monthly_data.get(month, [])
            logger.info(f"📁 Loaded {len(records)} records from historical data for {month}")
        
        records.reverse()
        
        return jsonify({
            'success': True,
            'month': month,
            'total_records': len(records),
            'records': records
        })
    except Exception as e:
        logger.error(f"Error getting monthly records: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/available-months', methods=['GET'])
@token_required
def get_available_months():
    """Get list of available months with data"""
    try:
        monthly_data = load_monthly_attendance()
        current_month = datetime.now().strftime("%Y-%m")
        
        months = list(monthly_data.keys())
        
        current_records = load_attendance()
        if current_records:
            if current_month not in months:
                months.append(current_month)
        
        months.sort(reverse=True)
        
        logger.info(f"📅 Available months: {months}")
        
        return jsonify({
            'success': True,
            'months': months,
            'current_month': current_month
        })
    except Exception as e:
        logger.error(f"Error getting available months: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/users/<user_id>', methods=['DELETE'])
@token_required
def delete_user(user_id):
    """Delete user by ID"""
    try:
        users = load_users()
        
        logger.info(f"🗑️ Attempting to delete user: {user_id}")
        
        if user_id not in users:
            return jsonify({'success': False, 'error': 'User tidak ditemukan'}), 404
        
        if user_id in face_encodings_cache:
            del face_encodings_cache[user_id]
        
        deleted_name = users[user_id]['name']
        del users[user_id]
        save_users(users)
        
        logger.info(f"✅ User deleted: {deleted_name} ({user_id})")
        
        return jsonify({
            'success': True,
            'message': f'User {deleted_name} berhasil dihapus'
        })
        
    except Exception as e:
        logger.error(f"❌ Error deleting user: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/export-excel', methods=['GET'])
@token_required
def export_excel():
    """Export attendance data to Excel"""
    try:
        month = request.args.get('month', datetime.now().strftime("%Y-%m"))
        
        if month == datetime.now().strftime("%Y-%m"):
            records = load_attendance()
        else:
            monthly_data = load_monthly_attendance()
            records = monthly_data.get(month, [])
        
        if not records:
            return jsonify({'success': False, 'error': 'Tidak ada data untuk diexport'}), 404
        
        # Create DataFrame
        df_data = []
        for record in records:
            df_data.append({
                'User ID': record['user_id'],
                'Nama': record['name'],
                'Tanggal': record['date'],
                'Waktu': record['time'],
                'Tingkat Kemiripan': f"{record['similarity']:.2%}",
                'Confidence': record['confidence'],
                'Status': record['status'],
                'Lokasi Valid': 'Ya' if record.get('location_verified', True) else 'Tidak',
                'Pesan Lokasi': record.get('location_message', 'Tidak tersedia'),
                'Latitude': record.get('user_latitude', ''),
                'Longitude': record.get('user_longitude', '')
            })
        
        df = pd.DataFrame(df_data)
        
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name=f'Absensi {month}', index=False)
        
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'absensi_{month}.xlsx'
        )
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/admin/cleanup', methods=['POST'])
@token_required
def cleanup_data():
    """Manual cleanup of old attendance data"""
    try:
        moved_count = cleanup_old_attendance()
        return jsonify({
            'success': True,
            'message': f'Data cleanup completed. {moved_count} records dipindahkan ke riwayat.'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'success': False, 'error': 'Method not allowed'}), 405

if __name__ == '__main__':
    # Pre-load data
    load_users()
    
    # Create files if they don't exist
    if not os.path.exists(USERS_FILE):
        save_users({})
        logger.info("Created new users file")
    
    if not os.path.exists(ATTENDANCE_FILE):
        save_attendance([])
        logger.info("Created new attendance file")
    
    if not os.path.exists(MONTHLY_ATTENDANCE_FILE):
        save_monthly_attendance({})
        logger.info("Created new monthly attendance file")
    
    if not os.path.exists(LOCATION_SETTINGS_FILE):
        save_location_settings({
            'enabled': False,
            'latitude': -6.2088,
            'longitude': 106.8456,
            'radius': 100,
            'location_name': 'Kantor Pusat'
        })
        logger.info("Created new location settings file")
    
    # Auto-cleanup on startup
    cleanup_old_attendance()
    
    logger.info("🚀 Starting Face Recognition API with Login & Password...")
    logger.info("🔐 Admin Login: username='admin', password='admin123'")
    logger.info("👤 User Login: Available with User ID & Password")
    logger.info("📍 Location Verification: Available")
    
    app.run(debug=True, host='127.0.0.1', port=5000)