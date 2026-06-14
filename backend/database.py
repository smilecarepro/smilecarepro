import sqlite3
import os
import sys
import jwt
import datetime
from flask import request, g, jsonify, current_app
from functools import wraps
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

load_dotenv()

# Database path logic for Desktop App
def get_db_root():
    if os.path.exists("/app/databases"):
        return "/app/databases"
    if getattr(sys, 'frozen', False):
        app_data = os.environ.get('APPDATA')
        path = os.path.join(app_data, "SmileCareClinic", "databases")
    else:
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        path = os.path.join(BASE_DIR, "databases")
    if not os.path.exists(path):
        os.makedirs(path)
    return path

DB_FOLDER = get_db_root()
MASTER_DB_PATH = os.path.join(DB_FOLDER, "master.db")

def get_master_db():
    conn = sqlite3.connect(MASTER_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn

def get_clinic_db_path(username):
    if username.endswith("_sec"):
        username = username[:-4]
    if username == "doctor":
        legacy_root = os.path.join(DB_FOLDER, "clinic.db")
        if os.path.exists(legacy_root): return legacy_root
    return os.path.join(DB_FOLDER, f"clinic_{username}.db")

def get_global_manager_db_path(username):
    """Path for the central center-wide database (Warehouse, General Expenses, etc)"""
    return os.path.join(DB_FOLDER, f"global_manager_{username}.db")

def get_db(username=None):
    if not username:
        token = request.headers.get("Authorization") or request.args.get("token")
        active_doctor_username = request.headers.get("X-Active-Doctor")
        
        if token:
            try:
                if isinstance(token, str) and "Bearer " in token: 
                    token = token.split(" ")[1]
                secret = os.getenv("SECRET_KEY", "debug-secret-key-123")
                data = jwt.decode(token, secret, algorithms=["HS256"])
                
                # Check if it's a global route (Manager level)
                global_routes = ["/api/inventory", "/api/purchases", "/api/center/expenses"]
                is_global = any(request.path.startswith(r) for r in global_routes)
                
                if data.get("account_type") == "center_manager" and is_global:
                    db_path = get_global_manager_db_path(data.get("username"))
                    conn = sqlite3.connect(db_path)
                    conn.row_factory = sqlite3.Row
                    conn.execute("PRAGMA journal_mode=WAL;")
                    init_global_manager_schema(conn)
                    g.user = data
                    return conn
                
                if data.get("account_type") in ["center_secretary", "center_manager"] and active_doctor_username:
                    username = active_doctor_username
                else:
                    username = data.get("username")
                g.user = data
            except:
                username = "guest"
        else:
            username = "guest"

    db_path = get_clinic_db_path(username)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    init_clinic_schema(conn)
    return conn

def init_db():
    conn = get_master_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS doctors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            clinic_name TEXT,
            doctor_name TEXT,
            expiry_date TEXT,
            status TEXT DEFAULT 'active',
            secretary_enabled INTEGER DEFAULT 0,
            secretary_password TEXT,
            account_type TEXT DEFAULT 'single_doctor',
            center_id INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Migrations for master.db
    cols = [
        ("account_type", "TEXT DEFAULT 'single_doctor'"), 
        ("center_id", "INTEGER"),
        ("commission_rate", "REAL DEFAULT 0.0"),
        ("expiry_date", "TEXT")
    ]
    for c, ct in cols:
        try: conn.execute(f"ALTER TABLE doctors ADD COLUMN {c} {ct}")
        except: pass

    conn.execute("CREATE TABLE IF NOT EXISTS master_settings (key TEXT PRIMARY KEY, value TEXT)")
    conn.execute("INSERT OR IGNORE INTO master_settings (key, value) VALUES ('support_phone', '07XXXXXXXXX')")
    conn.execute("INSERT OR IGNORE INTO master_settings (key, value) VALUES ('announcement', '')")
    conn.execute("CREATE TABLE IF NOT EXISTS token_blacklist (token TEXT PRIMARY KEY, blacklisted_on TEXT DEFAULT CURRENT_TIMESTAMP)")
    
    conn.execute("""
        CREATE TABLE IF NOT EXISTS secretaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            full_name TEXT,
            center_id INTEGER,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(center_id) REFERENCES doctors(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS secretary_doctor_map (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            secretary_username TEXT,
            doctor_id INTEGER,
            center_id INTEGER,
            FOREIGN KEY(doctor_id) REFERENCES doctors(id),
            FOREIGN KEY(secretary_username) REFERENCES secretaries(username)
        )
    """)
    
    conn.execute("""
        CREATE TABLE IF NOT EXISTS center_managers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            center_name TEXT,
            manager_name TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_username TEXT NOT NULL,
            receiver_username TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_read INTEGER DEFAULT 0
        )
    """)
    
    conn.commit()
    conn.close()

def init_global_manager_schema(conn):
    """Schema for the Medical Center Hub Global Manager Database."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS inventory_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            category TEXT,
            stock_quantity REAL DEFAULT 0,
            min_quantity REAL DEFAULT 5,
            unit TEXT DEFAULT 'Piece',
            purchase_price REAL DEFAULT 0,
            last_updated TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS purchase_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            status TEXT DEFAULT 'pending',
            total_price REAL DEFAULT 0,
            supplier_name TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS purchase_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            inventory_item_id INTEGER,
            name TEXT,
            requested_qty REAL,
            received_qty REAL,
            price_per_unit REAL,
            FOREIGN KEY(order_id) REFERENCES purchase_orders(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS center_expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT,
            amount REAL,
            payment_method TEXT DEFAULT 'Cash',
            date TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS global_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            username TEXT,
            role TEXT,
            action TEXT,
            description TEXT
        )
    """)
    conn.commit()

def init_clinic_schema(conn):
    # Standard Clinic Tables
    conn.execute("""
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT,
            last_name TEXT,
            phone TEXT,
            birth_date TEXT,
            age INTEGER,
            gender TEXT,
            occupation TEXT,
            address TEXT,
            systemic_conditions TEXT,
            notes TEXT,
            case_category TEXT,
            status TEXT DEFAULT 'جديد',
            case_notes TEXT,
            case_images TEXT,
            is_ongoing INTEGER DEFAULT 1,
            total_agreed_price REAL DEFAULT 0,
            debt REAL DEFAULT 0,
            total_paid REAL DEFAULT 0,
            payment_system TEXT DEFAULT 'total',
            created_at TEXT DEFAULT CURRENT_DATE
        )
    """)
    
    # Migrations for clinic DBs (Ensure all columns exist)
    clinic_columns = [
        ("status", "TEXT DEFAULT 'جديد'"),
        ("case_notes", "TEXT"),
        ("case_images", "TEXT"),
        ("payment_system", "TEXT DEFAULT 'total'"),
        ("total_agreed_price", "REAL DEFAULT 0"),
        ("debt", "REAL DEFAULT 0"),
        ("total_paid", "REAL DEFAULT 0"),
        ("age", "INTEGER")
    ]
    for col, ctype in clinic_columns:
        try: conn.execute(f"ALTER TABLE patients ADD COLUMN {col} {ctype}")
        except: pass

    conn.execute("""
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            total_amount REAL DEFAULT 0,
            paid_amount REAL DEFAULT 0,
            payment_method TEXT DEFAULT 'Cash',
            date TEXT,
            status TEXT,
            notes TEXT
        )
    """)

    schema = [
        "CREATE TABLE IF NOT EXISTS treatment_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER, tooth_number TEXT, procedure TEXT, notes TEXT, cost REAL DEFAULT 0, date TEXT DEFAULT CURRENT_DATE, FOREIGN KEY(patient_id) REFERENCES patients(id))",
        "CREATE TABLE IF NOT EXISTS appointments (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER, patient_name TEXT, date TEXT, time TEXT, type TEXT, duration_min INTEGER, status TEXT DEFAULT 'booked', notes TEXT, teeth_snapshot TEXT, image_url TEXT)",
        "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT)",
        "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)",
        "CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT, amount REAL, payment_method TEXT DEFAULT 'Cash', date TEXT, notes TEXT)",
        "CREATE TABLE IF NOT EXISTS teeth_map (patient_id INTEGER PRIMARY KEY, map_data TEXT)",
        "CREATE TABLE IF NOT EXISTS prescriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER, meds TEXT, notes TEXT, date TEXT, image_url TEXT, rx_number TEXT, diagnosis TEXT, drugs_json TEXT)",
        "CREATE TABLE IF NOT EXISTS drugs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, category TEXT, stock_quantity REAL DEFAULT 0, min_quantity REAL DEFAULT 5, unit TEXT DEFAULT 'Piece', is_favorite INTEGER DEFAULT 0)",
        "CREATE TABLE IF NOT EXISTS inventory_items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, category TEXT, stock_quantity REAL DEFAULT 0, min_quantity REAL DEFAULT 5, unit TEXT DEFAULT 'Piece')",
        "CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, user_id INTEGER, username TEXT, role TEXT, action TEXT, target_id INTEGER, target_name TEXT, description TEXT, old_data TEXT, new_data TEXT)",
        "CREATE TABLE IF NOT EXISTS internal_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_role TEXT, content TEXT, image_url TEXT, is_read INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
        "CREATE TABLE IF NOT EXISTS appointment_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_name TEXT, phone TEXT, requested_date TEXT, status TEXT DEFAULT 'pending', notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
        "CREATE TABLE IF NOT EXISTS whatsapp_sessions (phone_number TEXT PRIMARY KEY, current_state TEXT, collected_data TEXT, last_interaction TEXT DEFAULT CURRENT_TIMESTAMP)",
        "CREATE TABLE IF NOT EXISTS purchase_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, status TEXT DEFAULT 'pending', total_price REAL DEFAULT 0, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
        "CREATE TABLE IF NOT EXISTS purchase_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, inventory_item_id INTEGER, name TEXT, requested_qty REAL, received_qty REAL, price_per_unit REAL)"
    ]
    for s in schema: 
        try: conn.execute(s)
        except: pass

    # Triggers for financial integrity
    triggers = [
        """CREATE TRIGGER IF NOT EXISTS trg_invoice_ins AFTER INSERT ON invoices BEGIN 
            UPDATE patients SET 
                total_paid = COALESCE((SELECT SUM(paid_amount) FROM invoices WHERE patient_id = NEW.patient_id), 0),
                debt = (CASE WHEN payment_system = 'sessions' THEN COALESCE((SELECT SUM(cost) FROM treatment_logs WHERE patient_id = NEW.patient_id), 0) - COALESCE((SELECT SUM(paid_amount) FROM invoices WHERE patient_id = NEW.patient_id), 0) ELSE COALESCE(total_agreed_price, 0) - COALESCE((SELECT SUM(paid_amount) FROM invoices WHERE patient_id = NEW.patient_id), 0) END) 
            WHERE id = NEW.patient_id; END;""",
        """CREATE TRIGGER IF NOT EXISTS trg_invoice_upd AFTER UPDATE ON invoices BEGIN 
            UPDATE patients SET 
                total_paid = COALESCE((SELECT SUM(paid_amount) FROM invoices WHERE patient_id = NEW.patient_id), 0),
                debt = (CASE WHEN payment_system = 'sessions' THEN COALESCE((SELECT SUM(cost) FROM treatment_logs WHERE patient_id = NEW.patient_id), 0) - COALESCE((SELECT SUM(paid_amount) FROM invoices WHERE patient_id = NEW.patient_id), 0) ELSE COALESCE(total_agreed_price, 0) - COALESCE((SELECT SUM(paid_amount) FROM invoices WHERE patient_id = NEW.patient_id), 0) END) 
            WHERE id = NEW.patient_id; END;"""
    ]
    for trg in triggers:
        try: conn.execute(trg)
        except: pass

    conn.commit()

def db_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        g.db = get_db()
        if not hasattr(g, 'user'):
            if hasattr(g, 'db'): g.db.close()
            return jsonify({"error": "Unauthorized Access"}), 401
        try:
            return f(*args, **kwargs)
        finally:
            if hasattr(g, 'db'): g.db.close()
    return decorated_function

def log_action(action, target_id=None, target_name=None, description=None):
    try:
        if not hasattr(g, 'db') or not hasattr(g, 'user'): return
        g.db.execute("INSERT INTO audit_logs (username, role, action, target_id, target_name, description) VALUES (?, ?, ?, ?, ?, ?)",
                    (g.user.get('username'), g.user.get('role'), action, target_id, target_name, description))
        g.db.commit()
    except: pass
def cleanup_old_tokens():
    """Removes tokens from blacklist that are older than 24 hours."""
    try:
        conn = get_master_db()
        conn.execute("DELETE FROM token_blacklist WHERE blacklisted_on < datetime('now', '-1 day')")
        conn.commit()
        conn.close()
        print("--- SYSTEM: Cleaned up old blacklisted tokens ---")
    except Exception as e:
        print(f"--- SYSTEM ERROR: Failed to cleanup tokens: {e}")
