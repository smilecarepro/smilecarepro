from flask import Blueprint, request, jsonify, current_app, send_file
from database import get_db, get_master_db, init_clinic_schema, log_action, DB_FOLDER
import datetime
import jwt
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
import os
import sqlite3
from dotenv import load_dotenv

load_dotenv()

auth_bp = Blueprint("auth", __name__)

# Key for consistency across modules
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    print("CRITICAL WARNING: SECRET_KEY is not set in environment!")

# --- Authentication Middleware ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Token is missing"}), 401
        try:
            if " " in token:
                token = token.split(" ")[1]
            
            master_conn = get_master_db()
            is_blacklisted = master_conn.execute("SELECT 1 FROM token_blacklist WHERE token = ?", (token,)).fetchone()
            master_conn.close()
            if is_blacklisted:
                return jsonify({"error": "Token is blacklisted"}), 401

            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.user = data
        except Exception as e:
            return jsonify({"error": "Token is invalid or expired"}), 401
        
        # New: Read-Only Protection for Center Managers
        if request.user.get('account_type') == 'center_manager' and request.headers.get("X-Active-Doctor"):
            if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
                return jsonify({"error": "Read-only mode: Managers cannot modify doctor data"}), 403
                
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token: return jsonify({"error": "Unauthorized"}), 401
        try:
            if " " in token: token = token.split(" ")[1]
            
            master_conn = get_master_db()
            is_blacklisted = master_conn.execute("SELECT 1 FROM token_blacklist WHERE token = ?", (token,)).fetchone()
            master_conn.close()
            if is_blacklisted:
                return jsonify({"error": "Token is blacklisted"}), 401
                
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            if data.get("role") != "admin":
                return jsonify({"error": "Admin access required"}), 403
            request.user = data
        except Exception as e:
            current_app.logger.error(f"Auth error: {str(e)}")
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

from extensions import limiter

@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    data = request.json or {}
    u = data.get("username", "").strip().lower()
    p = data.get("password")
    
    current_app.logger.info(f"--- LOGIN ATTEMPT: {u} ---")

    if not u or not p:
        return jsonify({"error": "Username and password required"}), 400

    # 1. Admin Login
    admin_pass = os.getenv("ADMIN_PASSWORD")
    if u == "admin" and p == admin_pass:
        token = jwt.encode({
            "username": "admin",
            "role": "admin",
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, SECRET_KEY, algorithm="HS256")
        return jsonify({"token": token, "role": "admin", "username": "admin"})

    # 2. Login Check (Doctors, Secretaries, or Center Managers)
    master_conn = get_master_db()
    master_conn.row_factory = sqlite3.Row
    
    # Check center_managers table
    manager_row = master_conn.execute("SELECT * FROM center_managers WHERE username = ?", (u,)).fetchone()
    
    # Check doctors table
    doctor_row = None
    if not manager_row:
        doctor_row = master_conn.execute("SELECT * FROM doctors WHERE username = ?", (u,)).fetchone()
    
    # Check dedicated secretaries table
    secretary_row = None
    if not manager_row and not doctor_row:
        secretary_row = master_conn.execute("SELECT * FROM secretaries WHERE username = ?", (u,)).fetchone()

    if not manager_row and not doctor_row and not secretary_row:
        master_conn.close()
        return jsonify({"error": "Invalid credentials"}), 401

    is_valid = False
    role = None
    user_data = {}
    
    if manager_row:
        user_data = dict(manager_row)
        stored_p = user_data.get('password')
        if stored_p and (stored_p == p or check_password_hash(stored_p, p)):
            is_valid = True
            role = "doctor" # Role for UI layout, but account_type differentiates
            user_data["account_type"] = "center_manager"
            user_data["clinic_id"] = user_data["id"]
            
    elif doctor_row:
        user_data = dict(doctor_row)
        stored_p = user_data.get('password')
        sec_p = user_data.get('secretary_password')
        sec_enabled = user_data.get('secretary_enabled', 0)
        
        if stored_p and (stored_p == p or check_password_hash(stored_p, p)):
            is_valid = True
            role = "doctor"
        elif sec_enabled and sec_p and (sec_p == p or check_password_hash(sec_p, p)):
            is_valid = True
            role = "secretary"
            
    elif secretary_row:
        user_data = dict(secretary_row)
        stored_p = user_data.get('password')
        if stored_p and (stored_p == p or check_password_hash(stored_p, p)):
            is_valid = True
            role = "secretary"
            user_data["account_type"] = "center_secretary"

    if not is_valid:
        master_conn.close()
        return jsonify({"error": "Invalid credentials"}), 401

    # Status & Expiry checks
    status = user_data.get('status', 'active')
    if status == 'inactive':
        master_conn.close()
        return jsonify({"error": "Account deactivated"}), 403
        
    if role == "doctor":
        expiry = user_data.get('expiry_date')
        if expiry:
            try:
                # Use string slicing for simple date strings like 'YYYY-MM-DD'
                if 'T' in expiry:
                    exp_date = datetime.datetime.fromisoformat(expiry).date()
                else:
                    exp_date = datetime.datetime.strptime(expiry[:10], "%Y-%m-%d").date()
                
                if exp_date < datetime.date.today():
                    master_conn.close()
                    return jsonify({"error": "Subscription expired"}), 403
            except Exception as e:
                print(f"Expiry check error for {u}: {e}")
                pass

    # 3. Create Token
    token_payload = {
        "username": u,
        "role": role,
        "clinic_id": user_data.get("id"),
        "account_type": user_data.get("account_type", "single_doctor"),
        "center_id": user_data.get("center_id"),
        "commission_rate": user_data.get("commission_rate", 0),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    
    if role == "secretary" and user_data.get("account_type") == "center_secretary":
        token_payload["center_id"] = user_data.get("center_id")

    token = jwt.encode(token_payload, SECRET_KEY, algorithm="HS256")
    
    # If it returned bytes (old PyJWT), decode to string
    if isinstance(token, bytes):
        token = token.decode('utf-8')

    res = {
        "token": token,
        "username": u,
        "role": role,
        "full_name": user_data.get("full_name") or user_data.get("doctor_name") or u,
        "clinic_name": user_data.get("clinic_name", ""),
        "account_type": user_data.get("account_type", "single_doctor"),
        "center_id": user_data.get("center_id"),
        "commission_rate": user_data.get("commission_rate", 0),
    }

    if user_data.get("account_type") == "center_secretary":
        assigned = master_conn.execute("""
            SELECT d.username, d.doctor_name, d.clinic_name 
            FROM doctors d
            JOIN secretary_doctor_map m ON d.id = m.doctor_id
            WHERE m.secretary_username = ?
        """, (u,)).fetchall()
        res["assigned_doctors"] = [dict(a) for a in assigned]
    
    master_conn.close()
    return jsonify(res)

@auth_bp.route("/logout", methods=["POST"])
@token_required
def logout():
    token = request.headers.get("Authorization")
    if token and " " in token: token = token.split(" ")[1]
    master_conn = get_master_db()
    master_conn.execute("INSERT OR IGNORE INTO token_blacklist (token) VALUES (?)", (token,))
    master_conn.commit()
    master_conn.close()
    return jsonify({"ok": True})

@auth_bp.route("/me", methods=["GET"])
@token_required
def get_me():
    return jsonify(request.user)

@auth_bp.route("/secretary", methods=["GET", "POST"])
@token_required
def secretary_settings():
    role = request.user.get('role')
    acc_type = request.user.get('account_type')
    username = request.user.get('username')
    master_conn = get_master_db()
    master_conn.row_factory = sqlite3.Row
    
    # CASE 1: Single Doctor managing their own secretary
    if role == 'doctor' and acc_type != 'center_manager':
        if request.method == "GET":
            row = master_conn.execute("SELECT secretary_enabled, secretary_password FROM doctors WHERE username = ?", (username,)).fetchone()
            master_conn.close()
            if row:
                return jsonify({
                    "username": "secretary", # Virtual username for UI
                    "full_name": "Secretary",
                    "secretary_enabled": row["secretary_enabled"],
                    "enabled": row["secretary_enabled"],
                    "password": row["secretary_password"]
                })
            return jsonify({"error": "Doctor not found"}), 404
            
        if request.method == "POST":
            data = request.json or {}
            enabled = data.get("secretary_enabled")
            if enabled is None:
                enabled = data.get("enabled", 0)
            password = data.get("password")
            
            # Use hashing for security if it looks like a new password
            if password and not password.startswith("pbkdf2:"):
                password = generate_password_hash(password)
                
            master_conn.execute("UPDATE doctors SET secretary_enabled = ?, secretary_password = ? WHERE username = ?", (enabled, password, username))
            master_conn.commit()
            master_conn.close()
            return jsonify({"ok": True})

    # CASE 2: Independent Secretary (Center) managing their own profile
    elif role == 'secretary':
        if request.method == "GET":
            row = master_conn.execute("SELECT id, username, full_name, center_id, status FROM secretaries WHERE username = ?", (username,)).fetchone()
            master_conn.close()
            if row:
                return jsonify(dict(row))
            return jsonify({"error": "Secretary not found"}), 404
            
        if request.method == "POST":
            data = request.json
            name = data.get("full_name")
            new_pass = data.get("password")
            
            if new_pass:
                hashed = generate_password_hash(new_pass)
                master_conn.execute("UPDATE secretaries SET full_name = ?, password = ? WHERE username = ?", (name, hashed, username))
            else:
                master_conn.execute("UPDATE secretaries SET full_name = ? WHERE username = ?", (name, username))
                
            master_conn.commit()
            master_conn.close()
            return jsonify({"ok": True})

    # Default: Unauthorized
    master_conn.close()
    return jsonify({"error": "Unauthorized"}), 403

@auth_bp.route("/doctors", methods=["GET"])
@admin_required
def list_doctors():
    master_conn = get_master_db()
    # Now that secretaries are in their own table, we don't need complex filtering
    doctors = master_conn.execute("SELECT id, username, clinic_name, expiry_date, status, account_type, created_at FROM doctors").fetchall()
    master_conn.close()
    return jsonify([dict(d) for d in doctors])

@auth_bp.route("/doctors", methods=["POST"])
@admin_required
def create_doctor():
    data = request.json or {}
    u = data.get("username", "").strip().lower()
    p = data.get("password")
    c = data.get("clinic_name", "عيادة جديدة")
    
    if not u or not p: return jsonify({"error": "Missing fields"}), 400
    
    master_conn = get_master_db()
    existing = master_conn.execute("SELECT id FROM doctors WHERE username = ?", (u,)).fetchone()
    if existing:
        master_conn.close()
        return jsonify({"error": "Username already taken"}), 400
    
    hashed_p = generate_password_hash(p)
    at = data.get("account_type", "single_doctor")
    try:
        master_conn.execute(
            "INSERT INTO doctors (username, password, clinic_name, status, account_type, created_at) VALUES (?, ?, ?, 'active', ?, ?)",
            (u, hashed_p, c, at, datetime.date.today().isoformat())
        )
        master_conn.commit()
        from database import get_db
        new_conn = get_db(u)
        new_conn.close()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    finally:
        master_conn.close()

@auth_bp.route("/doctors/<int:id>", methods=["DELETE"])
@admin_required
def delete_doctor(id):
    master_conn = get_master_db()
    row = master_conn.execute("SELECT username FROM doctors WHERE id=?", (id,)).fetchone()
    if not row:
        master_conn.close()
        return jsonify({"error": "Doctor not found"}), 404
        
    username = row["username"]
    master_conn.execute("DELETE FROM doctors WHERE id=?", (id,))
    master_conn.commit()
    master_conn.close()
    
    try:
        from database import get_clinic_db_path
        db_path = get_clinic_db_path(username)
        if os.path.exists(db_path):
            os.remove(db_path)
    except: pass
    return jsonify({"ok": True})
@auth_bp.route("/debug-db", methods=["GET"])
def debug_db_route():
    try:
        conn = get_master_db()
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT id, username, clinic_name, secretary_enabled, secretary_password, account_type FROM doctors").fetchall()
        conn.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)})

@auth_bp.route("/announcement", methods=["GET"])
def get_announcement():
    try:
        conn = get_master_db()
        res = conn.execute("SELECT value FROM master_settings WHERE key = 'announcement'").fetchone()
        conn.close()
        return jsonify({"message": res["value"] if res else ""})
    except:
        return jsonify({"message": ""})

@auth_bp.route("/admin/stats", methods=["GET"])
@token_required
def get_admin_stats():
    if request.user.get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403
    
    master_conn = get_master_db()
    docs_count = master_conn.execute("SELECT count(*) FROM doctors").fetchone()[0]
    managers_count = master_conn.execute("SELECT count(*) FROM center_managers").fetchone()[0]
    master_conn.close()
    
    return jsonify({
        "doctors": docs_count,
        "centers": managers_count,
        "revenue": 0 # Placeholder
    })

@auth_bp.route("/admin/settings", methods=["GET"])
@admin_required
def get_admin_settings():
    master_conn = get_master_db()
    rows = master_conn.execute("SELECT * FROM master_settings").fetchall()
    master_conn.close()
    return jsonify({r['key']: r['value'] for r in rows})

@auth_bp.route("/admin/settings", methods=["POST"])
@admin_required
def update_admin_settings():
    data = request.json or {}
    master_conn = get_master_db()
    for k, v in data.items():
        master_conn.execute("INSERT OR REPLACE INTO master_settings (key, value) VALUES (?, ?)", (k, str(v)))
    master_conn.commit()
    master_conn.close()
    return jsonify({"ok": True})

@auth_bp.route("/admin/backups", methods=["GET"])
@admin_required
def get_admin_backups():
    master_conn = get_master_db()
    doctors = master_conn.execute("SELECT username, clinic_name FROM doctors").fetchall()
    master_conn.close()
    
    results = []
    for doc in doctors:
        username = doc["username"]
        clinic_name = doc["clinic_name"]
        
        if username == "doctor":
            legacy_root = os.path.join(DB_FOLDER, "clinic.db")
            db_path = legacy_root if os.path.exists(legacy_root) else os.path.join(DB_FOLDER, f"clinic_{username}.db")
        else:
            db_path = os.path.join(DB_FOLDER, f"clinic_{username}.db")
            
        if os.path.exists(db_path):
            size_mb = os.path.getsize(db_path) / (1024 * 1024)
            mtime = os.path.getmtime(db_path)
            last_modified = datetime.datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")
            status = "Available"
        else:
            size_mb = 0
            last_modified = "N/A"
            status = "Missing"
            
        results.append({
            "username": username,
            "clinic_name": clinic_name,
            "size_mb": round(size_mb, 2),
            "last_modified": last_modified,
            "status": status
        })
        
    return jsonify(results)

@auth_bp.route("/admin/backups/download/<username>", methods=["GET"])
@admin_required
def download_admin_backup(username):
    if username == "doctor":
        legacy_root = os.path.join(DB_FOLDER, "clinic.db")
        db_path = legacy_root if os.path.exists(legacy_root) else os.path.join(DB_FOLDER, f"clinic_{username}.db")
    else:
        db_path = os.path.join(DB_FOLDER, f"clinic_{username}.db")
        
    if os.path.exists(db_path):
        return send_file(db_path, as_attachment=True, download_name=f"clinic_{username}_backup_{datetime.date.today()}.db")
    else:
        return jsonify({"error": "Database file not found"}), 404


