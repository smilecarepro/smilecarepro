from flask import Blueprint, request, jsonify, current_app
from database import get_db, get_master_db, init_clinic_schema, log_action
from routes.auth import token_required
import datetime
import os
from werkzeug.security import generate_password_hash

center_bp = Blueprint("center", __name__)

def manager_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(request, 'user') or request.user.get('account_type') != 'center_manager':
            return jsonify({"error": "Center Manager access required"}), 403
        return f(*args, **kwargs)
    return decorated

@center_bp.route("/stats", methods=["GET"])
@token_required
@manager_required
def get_center_stats():
    manager_id = request.user.get("clinic_id")
    master_conn = get_master_db()
    
    # 1. Get all doctors in this center
    doctors = master_conn.execute("SELECT username, doctor_name FROM doctors WHERE center_id = ?", (manager_id,)).fetchall()
    
    total_revenue = 0
    total_patients = 0
    total_appointments = 0
    
    # 2. Loop through each doctor's DB and aggregate
    from database import get_clinic_db_path
    import sqlite3
    
    for doc in doctors:
        db_path = get_clinic_db_path(doc["username"])
        if os.path.exists(db_path):
            try:
                conn = sqlite3.connect(db_path)
                conn.row_factory = sqlite3.Row
                
                # Revenue
                rev = conn.execute("SELECT SUM(paid_amount) as r FROM invoices").fetchone()["r"] or 0
                total_revenue += rev
                
                # Patients
                pts = conn.execute("SELECT COUNT(*) as c FROM patients").fetchone()["c"] or 0
                total_patients += pts
                
                # Appointments (Today)
                today = datetime.date.today().isoformat()
                apts = conn.execute("SELECT COUNT(*) as c FROM appointments WHERE date = ?", (today,)).fetchone()["c"] or 0
                total_appointments += apts
                
                conn.close()
            except: pass
            
    master_conn.close()
    
    return jsonify({
        "doctors_count": len(doctors),
        "total_revenue": total_revenue,
        "total_patients": total_patients,
        "total_appointments_today": total_appointments
    })
@center_bp.route("/doctors", methods=["GET"])
@token_required
@manager_required
def get_center_doctors():
    manager_id = request.user.get("clinic_id")
    master_conn = get_master_db()
    doctors = master_conn.execute("""
        SELECT id, username, clinic_name, doctor_name, status, created_at 
        FROM doctors 
        WHERE center_id = ?
    """, (manager_id,)).fetchall()
    master_conn.close()
    return jsonify([dict(d) for d in doctors])

@center_bp.route("/doctors", methods=["POST"])
@token_required
@manager_required
def add_doctor_to_center():
    data = request.json or {}
    manager_id = request.user.get("clinic_id")
    u = data.get("username", "").strip().lower()
    p = data.get("password")
    c = data.get("clinic_name", "عيادة فرعية")
    d_name = data.get("doctor_name", "")
    
    if not u or not p: return jsonify({"error": "Missing fields"}), 400
    
    master_conn = get_master_db()
    existing = master_conn.execute("SELECT id FROM doctors WHERE username = ?", (u,)).fetchone()
    if existing:
        master_conn.close()
        return jsonify({"error": "Username already taken"}), 400
    
    hashed_p = generate_password_hash(p)
    try:
        master_conn.execute(
            "INSERT INTO doctors (username, password, clinic_name, doctor_name, status, account_type, center_id, created_at) VALUES (?, ?, ?, ?, 'active', 'single_doctor', ?, ?)",
            (u, hashed_p, c, d_name, manager_id, datetime.date.today().isoformat())
        )
        master_conn.commit()
        from database import get_db, init_clinic_schema
        new_conn = get_db(u)
        init_clinic_schema(new_conn)
        new_conn.close()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    finally:
        master_conn.close()

@center_bp.route("/secretaries", methods=["GET"])
@token_required
@manager_required
def get_center_secretaries():
    manager_id = request.user.get("clinic_id")
    master_conn = get_master_db()
    
    # Fetch from the new dedicated secretaries table
    secretaries = master_conn.execute("""
        SELECT id, username, full_name, status, created_at 
        FROM secretaries 
        WHERE center_id = ?
    """, (manager_id,)).fetchall()
    
    results = []
    for sec in secretaries:
        sec_dict = dict(sec)
        # Get assigned doctors
        assigned = master_conn.execute("""
            SELECT d.id, d.doctor_name, d.clinic_name 
            FROM doctors d
            JOIN secretary_doctor_map m ON d.id = m.doctor_id
            WHERE m.secretary_username = ?
        """, (sec["username"],)).fetchall()
        sec_dict["assigned_doctors"] = [dict(a) for a in assigned]
        results.append(sec_dict)
        
    master_conn.close()
    return jsonify(results)

@center_bp.route("/doctors/<int:doctor_id>", methods=["PUT"])
@token_required
@manager_required
def update_doctor_settings(doctor_id):
    data = request.json
    name = data.get("doctor_name")
    clinic = data.get("clinic_name")
    expiry = data.get("expiry_date")
    commission = data.get("commission_rate", 0)
    password = data.get("password")
    
    master_conn = get_master_db()
    
    if password:
        from werkzeug.security import generate_password_hash
        hashed = generate_password_hash(password)
        master_conn.execute("""
            UPDATE doctors 
            SET doctor_name = ?, clinic_name = ?, expiry_date = ?, commission_rate = ?, password = ?
            WHERE id = ?
        """, (name, clinic, expiry, commission, hashed, doctor_id))
    else:
        master_conn.execute("""
            UPDATE doctors 
            SET doctor_name = ?, clinic_name = ?, expiry_date = ?, commission_rate = ?
            WHERE id = ?
        """, (name, clinic, expiry, commission, doctor_id))
        
    master_conn.commit()
    master_conn.close()
    return jsonify({"ok": True})

@center_bp.route("/doctors/<int:doctor_id>", methods=["DELETE"])
@token_required
@manager_required
def delete_doctor_from_center(doctor_id):
    master_conn = get_master_db()
    doc = master_conn.execute("SELECT username FROM doctors WHERE id = ?", (doctor_id,)).fetchone()
    if not doc:
        master_conn.close()
        return jsonify({"error": "Doctor not found"}), 404
        
    username = doc["username"]
    master_conn.execute("DELETE FROM doctors WHERE id = ?", (doctor_id,))
    # Also delete their mappings
    master_conn.execute("DELETE FROM secretary_doctor_map WHERE doctor_id = ?", (doctor_id,))
    master_conn.commit()
    master_conn.close()
    
    # Optional: Delete clinic DB file
    try:
        from database import get_clinic_db_path
        db_path = get_clinic_db_path(username)
        if os.path.exists(db_path):
            os.remove(db_path)
    except: pass
    
    return jsonify({"ok": True})

@center_bp.route("/secretaries/<int:sec_id>", methods=["DELETE"])
@token_required
@manager_required
def delete_secretary_from_center(sec_id):
    master_conn = get_master_db()
    sec = master_conn.execute("SELECT username FROM secretaries WHERE id = ?", (sec_id,)).fetchone()
    if not sec:
        master_conn.close()
        return jsonify({"error": "Secretary not found"}), 404
    username = sec["username"]
    master_conn.execute("DELETE FROM secretaries WHERE id = ?", (sec_id,))
    # Also delete their doctor mappings
    master_conn.execute("DELETE FROM secretary_doctor_map WHERE secretary_username = ?", (username,))
    master_conn.commit()
    master_conn.close()
    
    return jsonify({"ok": True})

@center_bp.route("/reports/financial", methods=["GET"])
@token_required
@manager_required
def get_center_financial_report():
    manager_id = request.user.get("clinic_id")
    master_conn = get_master_db()
    master_conn.row_factory = sqlite3.Row
    
    # Get filters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # 1. Get all doctors in this center with their commission rates
    doctors = master_conn.execute("""
        SELECT id, username, doctor_name, clinic_name, commission_rate 
        FROM doctors 
        WHERE center_id = ?
    """, (manager_id,)).fetchall()
    
    report_data = []
    total_revenue = 0
    total_commission = 0
    
    from database import get_clinic_db_path
    import sqlite3
    
    for doc in doctors:
        db_path = get_clinic_db_path(doc["username"])
        doc_stats = {
            "id": doc["id"],
            "doctor_name": doc["doctor_name"],
            "clinic_name": doc["clinic_name"],
            "commission_rate": doc["commission_rate"] or 0,
            "revenue": 0,
            "commission_amount": 0,
            "appointments_count": 0
        }
        
        if os.path.exists(db_path):
            try:
                conn = sqlite3.connect(db_path)
                conn.row_factory = sqlite3.Row
                
                query = "SELECT SUM(paid_amount) as r FROM invoices WHERE 1=1"
                apt_query = "SELECT COUNT(*) as c FROM appointments WHERE 1=1"
                params = []
                
                if start_date:
                    query += " AND created_at >= ?"
                    apt_query += " AND date >= ?"
                    params.append(start_date)
                if end_date:
                    query += " AND created_at <= ?"
                    apt_query += " AND date <= ?"
                    params.append(end_date)
                
                rev = conn.execute(query, params).fetchone()["r"] or 0
                apts = conn.execute(apt_query, params).fetchone()["c"] or 0
                
                doc_stats["revenue"] = rev
                doc_stats["appointments_count"] = apts
                doc_stats["commission_amount"] = (rev * (doc["commission_rate"] or 0)) / 100
                
                total_revenue += rev
                total_commission += doc_stats["commission_amount"]
                
                conn.close()
            except Exception as e:
                print(f"Error reading DB for {doc['username']}: {e}")
        
        report_data.append(doc_stats)
    
    # 2. Get Center Expenses
    from database import get_db
    global_conn = get_db()
    global_conn.row_factory = sqlite3.Row
    exp_query = "SELECT SUM(amount) as total FROM center_expenses WHERE 1=1"
    exp_params = []
    if start_date:
        exp_query += " AND date >= ?"
        exp_params.append(start_date)
    if end_date:
        exp_query += " AND date <= ?"
        exp_params.append(end_date)
        
    total_expenses = global_conn.execute(exp_query, exp_params).fetchone()["total"] or 0
    global_conn.close()
    
    master_conn.close()
    
    return jsonify({
        "doctors_breakdown": report_data,
        "summary": {
            "total_revenue": total_revenue,
            "total_commission": total_commission,
            "total_expenses": total_expenses,
            "net_profit": total_commission - total_expenses
        }
    })

@center_bp.route("/secretaries", methods=["POST"])
@token_required
@manager_required
def add_center_secretary():
    data = request.json or {}
    manager_id = request.user.get("clinic_id")
    u = data.get("username", "").strip().lower()
    p = data.get("password")
    n = data.get("full_name", u) # Use the new name field
    
    if not u or not p: return jsonify({"error": "Missing fields"}), 400
    
    master_conn = get_master_db()
    
    # Check uniqueness across both doctors and secretaries
    exists_doc = master_conn.execute("SELECT id FROM doctors WHERE username = ?", (u,)).fetchone()
    exists_sec = master_conn.execute("SELECT id FROM secretaries WHERE username = ?", (u,)).fetchone()
    
    if exists_doc or exists_sec:
        master_conn.close()
        return jsonify({"error": "Username already taken"}), 400
    
    hashed_p = generate_password_hash(p)
    try:
        master_conn.execute(
            "INSERT INTO secretaries (username, password, full_name, center_id, status) VALUES (?, ?, ?, ?, 'active')",
            (u, hashed_p, n, manager_id)
        )
        master_conn.commit()
        return jsonify({"ok": True, "message": "Secretary account created successfully in dedicated table."})
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    finally:
        master_conn.close()
@center_bp.route("/secretaries/map", methods=["POST"])
@token_required
@manager_required
def map_secretary_to_doctor():
    data = request.json or {}
    manager_id = request.user.get("clinic_id")
    sec_username = data.get("secretary_username")
    doctor_id = data.get("doctor_id")
    action = data.get("action", "add")
    
    master_conn = get_master_db()
    try:
        if action == "add":
            master_conn.execute(
                "INSERT OR IGNORE INTO secretary_doctor_map (secretary_username, doctor_id, center_id) VALUES (?, ?, ?)",
                (sec_username, doctor_id, manager_id)
            )
        else:
            master_conn.execute(
                "DELETE FROM secretary_doctor_map WHERE secretary_username = ? AND doctor_id = ? AND center_id = ?",
                (sec_username, doctor_id, manager_id)
            )
        master_conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    finally:
        master_conn.close()
@center_bp.route("/expenses", methods=["GET"])
@token_required
@manager_required
def get_center_expenses():
    master_conn = get_master_db() # We use this only to ensure master connection for context if needed, but get_db will handle global
    from database import get_db
    global_conn = get_db()
    expenses = global_conn.execute("SELECT * FROM center_expenses ORDER BY date DESC").fetchall()
    global_conn.close()
    return jsonify([dict(e) for e in expenses])

@center_bp.route("/expenses", methods=["POST"])
@token_required
@manager_required
def add_center_expense():
    data = request.json or {}
    cat = data.get("category")
    amt = data.get("amount")
    date = data.get("date", datetime.date.today().isoformat())
    notes = data.get("notes", "")
    
    if not cat or not amt: return jsonify({"error": "Missing fields"}), 400
    
    from database import get_db
    global_conn = get_db()
    global_conn.execute("""
        INSERT INTO center_expenses (category, amount, payment_method, date, notes)
        VALUES (?, ?, ?, ?, ?)
    """, (cat, amt, data.get("payment_method", "Cash"), date, notes))
    global_conn.commit()
    global_conn.close()
    return jsonify({"ok": True})

@center_bp.route("/low-stock", methods=["GET"])
@token_required
def get_center_low_stock():
    if request.user.get('account_type') != 'center_manager':
        return jsonify({"error": "Unauthorized"}), 403
        
    username = request.user.get('username')
    from database import get_master_db, get_db
    master_conn = get_master_db()
    manager = master_conn.execute("SELECT id FROM center_managers WHERE username = ?", (username,)).fetchone()
    if not manager:
        master_conn.close()
        return jsonify([])
        
    doctors = master_conn.execute("SELECT username, doctor_name, clinic_name FROM doctors WHERE center_id = ?", (manager['id'],)).fetchall()
    master_conn.close()
    
    low_stock_report = []
    
    for doc in doctors:
        try:
            doc_db = get_db(doc['username'])
            low_items = doc_db.execute("SELECT * FROM inventory WHERE stock <= min_stock").fetchall()
            doc_db.close()
            
            for item in low_items:
                item_dict = dict(item)
                item_dict['doctor_name'] = doc['doctor_name']
                item_dict['clinic_name'] = doc['clinic_name']
                low_stock_report.append(item_dict)
        except:
            continue
            
    return jsonify(low_stock_report)

@center_bp.route("/announcement", methods=["POST"])
@token_required
def update_center_announcement():
    if request.user.get('account_type') != 'center_manager':
        return jsonify({"error": "Unauthorized"}), 403
    
    data = request.json
    msg = data.get("message", "")
    
    from database import get_master_db
    conn = get_master_db()
    conn.execute("INSERT OR REPLACE INTO master_settings (key, value) VALUES ('announcement', ?)", (msg,))
    conn.commit()
    conn.close()
    
    return jsonify({"ok": True})

@center_bp.route("/audit-logs", methods=["GET"])
@token_required
def get_global_audit_logs():
    if request.user.get('account_type') != 'center_manager':
        return jsonify({"error": "Unauthorized"}), 403
        
    username = request.user.get('username')
    from database import get_master_db, get_db
    master_conn = get_master_db()
    manager = master_conn.execute("SELECT id FROM center_managers WHERE username = ?", (username,)).fetchone()
    if not manager:
        master_conn.close()
        return jsonify([])
        
    doctors = master_conn.execute("SELECT username, doctor_name FROM doctors WHERE center_id = ?", (manager['id'],)).fetchall()
    master_conn.close()
    
    global_logs = []
    
    # 1. Get Manager's own logs (from their global DB)
    try:
        mgr_db = get_db()
        mgr_logs = mgr_db.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100").fetchall()
        for log in mgr_logs:
            l = dict(log)
            l['source_clinic'] = "إدارة المركز"
            global_logs.append(l)
        mgr_db.close()
    except: pass
    
    # 2. Get logs from each doctor
    for doc in doctors:
        try:
            doc_db = get_db(doc['username'])
            doc_logs = doc_db.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50").fetchall()
            for log in doc_logs:
                l = dict(log)
                l['source_clinic'] = doc['doctor_name']
                global_logs.append(l)
            doc_db.close()
        except: continue
        
    # Sort everything by timestamp DESC
    global_logs.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return jsonify(global_logs[:200]) # Return last 200 actions across center
