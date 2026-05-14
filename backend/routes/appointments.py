from flask import Blueprint, request, jsonify, g
from database import db_required, log_action
from datetime import datetime, timedelta

appointments_bp = Blueprint("appointments", __name__)

@appointments_bp.route("/", methods=["GET"])
@db_required
def get_appointments():
    pid = request.args.get("pid")
    date = request.args.get("date") # Optional filter for Home.jsx
    
    query = """
        SELECT a.*, 
               COALESCE(NULLIF(a.patient_name, ''), p.first_name || ' ' || p.last_name) AS patient_name, 
               p.phone AS patient_phone
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
    """
    params = []
    
    if pid:
        query += " WHERE a.patient_id = ?"
        params.append(pid)
    elif date:
        query += " WHERE a.date = ?"
        params.append(date)
        
    query += " ORDER BY a.date DESC, a.time DESC"
    rows = g.db.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])

@appointments_bp.route("/", methods=["POST"])
@db_required
def add_appointment():
    d = request.json
    p_id = d.get('patient_id') or d.get('patientId')
    if not p_id:
        return jsonify({"error": "Missing patient_id"}), 400
        
    # Get patient name if only id is provided
    p_name = d.get('patient_name')
    if not p_name and p_id:
        p = g.db.execute("SELECT first_name, last_name FROM patients WHERE id=?", (p_id,)).fetchone()
        if p: p_name = f"{p['first_name']} {p['last_name']}"
        
    g.db.execute(
        "INSERT INTO appointments (patient_id, patient_name, date, time, type, duration_min, status, notes, image_url) VALUES (?,?,?,?,?,?,?,?,?)",
        (p_id, p_name, d.get('date'), d.get('time'), 
         d.get('type', d.get('treatment', '')),
         d.get('duration_min', d.get('duration', 30)),
         d.get('status', 'booked'),
         d.get('notes', ''),
         d.get('image_url'))
    )
    
    # Audit Log - Safe way
    try:
        p = g.db.execute("SELECT first_name, last_name FROM patients WHERE id=?", (p_id,)).fetchone()
        p_name = f"{p['first_name']} {p['last_name']}" if p else "Unknown"
        log_action("CREATE_APPOINTMENT", target_id=p_id, target_name=p_name, 
                   description=f"حجز موعد جديد بتاريخ {d.get('date')} الساعة {d.get('time')}",
                   new_data=d)
    except Exception as e:
        print(f"--- APPOINTMENT_LOG_ERROR: {str(e)} ---")
    
    g.db.commit()
    return jsonify({"ok": True})

@appointments_bp.route("/<int:id>", methods=["DELETE"])
@db_required
def delete_appointment(id):
    # Get info before delete for logging
    apt = g.db.execute("SELECT patient_id, date, time FROM appointments WHERE id=?", (id,)).fetchone()
    if apt:
        p = g.db.execute("SELECT first_name, last_name FROM patients WHERE id=?", (apt['patient_id'],)).fetchone()
        p_name = f"{p['first_name']} {p['last_name']}" if p else "Unknown"
        log_action("DELETE_APPOINTMENT", target_id=apt['patient_id'], target_name=p_name, description=f"حذف موعد المريض ليوم {apt['date']} الساعة {apt['time']}")
    
    g.db.execute("DELETE FROM appointments WHERE id = ?", (id,))
    g.db.commit()
    return jsonify({"ok": True})

@appointments_bp.route("/reminders/send", methods=["POST"])
@db_required
def send_reminders():
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    query = """
        SELECT a.id, a.time, p.first_name, p.phone
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.date = ? AND (a.status = 'booked' OR a.status = 'waiting')
    """
    rows = g.db.execute(query, (tomorrow,)).fetchall()
    
    # Simulate sending SMS/WhatsApp
    sent_count = 0
    for r in rows:
        if r['phone']:
            # Append [تم التذكير] to notes if not already there
            g.db.execute("UPDATE appointments SET notes = CASE WHEN notes IS NULL THEN '[تم التذكير]' ELSE notes || ' [تم التذكير]' END WHERE id = ?", (r['id'],))
            sent_count += 1
            
    g.db.commit()
    return jsonify({"ok": True, "sent": sent_count, "total_tomorrow": len(rows)})

@appointments_bp.route("/<int:id>", methods=["PUT"])
@db_required
def update_appointment(id):
    d = request.json
    fields = []
    params = []
    for k, v in d.items():
        if k in ['date', 'time', 'type', 'duration_min', 'status', 'notes', 'teeth_snapshot', 'image_url']:
            fields.append(f"{k} = ?")
            params.append(v)
    
    if not fields:
        return jsonify({"error": "No fields to update"}), 400
        
    # Get old data for diff
    old_row = g.db.execute("SELECT * FROM appointments WHERE id=?", (id,)).fetchone()
    old_data = dict(old_row) if old_row else {}

    params.append(id)
    g.db.execute(f"UPDATE appointments SET {', '.join(fields)} WHERE id = ?", params)
    
    # Get new data for diff
    new_row = g.db.execute("SELECT * FROM appointments WHERE id=?", (id,)).fetchone()
    new_data = dict(new_row) if new_row else {}

    # Audit Log with Diff
    try:
        p_id = new_data.get('patient_id')
        p = g.db.execute("SELECT first_name, last_name FROM patients WHERE id=?", (p_id,)).fetchone() if p_id else None
        p_name = f"{p['first_name']} {p['last_name']}" if p else "Unknown"
        log_action("UPDATE_APPOINTMENT", target_id=p_id, target_name=p_name, 
                   description=f"تعديل بيانات أو حالة موعد يوم {new_data.get('date')}",
                   old_data=old_data, new_data=new_data)
    except Exception as e:
        print(f"--- APPOINTMENT_UPDATE_LOG_ERROR: {str(e)} ---")
        
    g.db.commit()
    return jsonify({"ok": True})

@appointments_bp.route("/requests", methods=["GET"])
@db_required
def get_appointment_requests():
    rows = g.db.execute("SELECT * FROM appointment_requests WHERE status = 'pending' ORDER BY created_at DESC").fetchall()
    return jsonify([dict(r) for r in rows])

@appointments_bp.route("/requests/<int:id>/confirm", methods=["POST"])
@db_required
def confirm_appointment_request(id):
    d = request.json
    req_id = id
    
    # Get request data
    req = g.db.execute("SELECT * FROM appointment_requests WHERE id = ?", (id,)).fetchone()
    if not req: return jsonify({"error": "Request not found"}), 404

    # Search for patient: prioritize body patient_id, then phone search
    p_id = d.get('patient_id')
    if not p_id:
        p = g.db.execute("SELECT id FROM patients WHERE phone = ?", (req['phone'],)).fetchone()
        p_id = p['id'] if p else None
    
    # Create the actual appointment
    g.db.execute(
        "INSERT INTO appointments (patient_id, patient_name, date, time, type, duration_min, status, notes) VALUES (?,?,?,?,?,?,?,?)",
        (p_id, req['patient_name'], d.get('date'), d.get('time'), 
         d.get('type', 'كشف'), d.get('duration_min', 30), 'booked', d.get('notes', req['notes']))
    )
    
    # Mark request as confirmed
    g.db.execute("UPDATE appointment_requests SET status = 'confirmed' WHERE id = ?", (id,))
    
    # Send WhatsApp Confirmation
    try:
        clinic_info = g.db.execute("SELECT value FROM settings WHERE key = 'clinic_name'").fetchone()
        clinic_name = clinic_info['value'] if clinic_info else "العيادة"
        
        # تنسيق الوقت ليكون جميلاً في الرسالة
        msg = (
            f"✅ تم تأكيد حجزك بنجاح في {clinic_name}\n\n"
            f"👤 الاسم: {req['patient_name']}\n"
            f"📅 التاريخ: {d.get('date')}\n"
            f"⏰ الوقت: {d.get('time')}\n"
            f"🦷 الخدمة: {d.get('type', 'كشف')}\n\n"
            "نحن بانتظارك، يرجى الحضور قبل الموعد بـ 10 دقائق."
        )
        
        import requests
        requests.post("http://localhost:3001/send", json={
            "clinicId": g.clinic_username,
            "to": req['phone'],
            "message": msg
        })
    except Exception as e:
        print(f"WhatsApp Confirmation Error: {e}")

    g.db.commit()
    return jsonify({"ok": True})

@appointments_bp.route("/requests/<int:id>", methods=["DELETE"])
@db_required
def delete_appointment_request(id):
    g.db.execute("DELETE FROM appointment_requests WHERE id = ?", (id,))
    g.db.commit()
    return jsonify({"ok": True})
