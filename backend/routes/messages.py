from flask import Blueprint, request, jsonify, g
from database import get_master_db
from routes.auth import token_required

messages_bp = Blueprint("messages", __name__)

@messages_bp.route("/contacts", methods=["GET"])
@token_required
def get_contacts():
    user = request.user
    role = user.get('role')
    account_type = user.get('account_type')
    username = user.get('username')
    
    conn = get_master_db()
    conn.row_factory = lambda cursor, row: {cursor.description[i][0]: row[i] for i in range(len(cursor.description))}
    
    contacts = []
    
    # Identify the Center ID for the current user
    my_center_id = None
    if account_type == 'center_manager':
        my_center_id = user.get('clinic_id') # Managers 'clinic_id' is their 'id'
    else:
        # Check doctors and secretaries tables
        d_row = conn.execute("SELECT center_id FROM doctors WHERE username = ?", (username,)).fetchone()
        if d_row and d_row['center_id']:
            my_center_id = d_row['center_id']
        else:
            s_row = conn.execute("SELECT center_id FROM secretaries WHERE username = ?", (username,)).fetchone()
            if s_row and s_row['center_id']:
                my_center_id = s_row['center_id']

    if my_center_id:
        # 1. The Manager(s) of this center
        mgrs = conn.execute("SELECT username, manager_name as full_name, 'manager' as role FROM center_managers WHERE id = ?", (my_center_id,)).fetchall()
        contacts += mgrs
        
        # 2. All Doctors in this center
        docs = conn.execute("SELECT username, doctor_name as full_name, 'doctor' as role FROM doctors WHERE center_id = ?", (my_center_id,)).fetchall()
        contacts += docs
        
        # 3. All Secretaries in this center
        secs = conn.execute("SELECT username, full_name as full_name, 'secretary' as role FROM secretaries WHERE center_id = ?", (my_center_id,)).fetchall()
        contacts += secs

    else:
        # Fallback for Single Doctor (not in a center)
        # See their own secretary account if enabled
        d_row = conn.execute("SELECT secretary_enabled FROM doctors WHERE username = ?", (username,)).fetchone()
        if d_row and d_row['secretary_enabled']:
            contacts.append({"username": f"{username}_sec", "full_name": "السكرتارية", "role": "secretary"})
        
        # Or if the user IS the secretary of a single doctor
        if username.endswith("_sec"):
            doc_user = username.replace("_sec", "")
            doc = conn.execute("SELECT username, doctor_name as full_name, 'doctor' as role FROM doctors WHERE username = ?", (doc_user,)).fetchone()
            if doc: contacts.append(doc)

    conn.close()
    
    # Remove self and duplicates
    unique_contacts = []
    seen = set()
    seen.add(username) # Don't show self in chat
    
    for c in contacts:
        if c['username'] not in seen:
            unique_contacts.append(c)
            seen.add(c['username'])
            
    return jsonify(unique_contacts)

@messages_bp.route("/", methods=["POST"])
@token_required
def send_message():
    user = request.user
    data = request.json
    receiver = data.get("receiver_username")
    content = data.get("content")
    
    if not receiver or not content:
        return jsonify({"error": "Missing data"}), 400
        
    conn = get_master_db()
    conn.execute("INSERT INTO messages (sender_username, receiver_username, message) VALUES (?, ?, ?)",
                 (user['username'], receiver, content))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@messages_bp.route("/history/<other_user>", methods=["GET"])
@token_required
def get_chat_history(other_user):
    me = request.user['username']
    conn = get_master_db()
    conn.row_factory = lambda cursor, row: {cursor.description[i][0]: row[i] for i in range(len(cursor.description))}
    
    msgs = conn.execute("""
        SELECT sender_username, receiver_username, message as content, timestamp, is_read 
        FROM messages 
        WHERE (sender_username = ? AND receiver_username = ?)
           OR (sender_username = ? AND receiver_username = ?)
        ORDER BY timestamp ASC
    """, (me, other_user, other_user, me)).fetchall()
    
    # Mark as read
    conn.execute("UPDATE messages SET is_read = 1 WHERE sender_username = ? AND receiver_username = ?", (other_user, me))
    conn.commit()
    conn.close()
    return jsonify(msgs)

@messages_bp.route("/unread", methods=["GET"])
@token_required
def get_unread_count():
    me = request.user['username']
    conn = get_master_db()
    count_row = conn.execute("SELECT COUNT(*) as c FROM messages WHERE receiver_username = ? AND is_read = 0", (me,)).fetchone()
    count = count_row['c'] if count_row else 0
    conn.close()
    return jsonify({"count": count})
