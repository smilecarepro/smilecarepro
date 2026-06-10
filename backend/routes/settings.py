from flask import Blueprint, request, jsonify, g, send_file
from database import db_required, DB_FOLDER, log_action
import os
import shutil
import sqlite3
from werkzeug.security import check_password_hash
from routes.auth import token_required

settings_bp = Blueprint("settings", __name__)

@settings_bp.route("/reset", methods=["POST"])
@db_required
def reset_clinic():
    from database import log_action
    from werkzeug.security import check_password_hash
    import sqlite3
    
    d = request.json
    password = d.get("password")
    
    # Verify password via master.db
    from database import MASTER_DB_PATH
    master_conn = sqlite3.connect(MASTER_DB_PATH)
    master_conn.row_factory = sqlite3.Row
    doc = master_conn.execute("SELECT password FROM doctors WHERE username = ?", (g.user.get('username'),)).fetchone()
    master_conn.close()
    
    if not doc or not check_password_hash(doc['password'], password):
        return jsonify({"error": "كلمة المرور غير صحيحة"}), 401
        
    # Reset wipes all clinical data
    tables = ["patients", "appointments", "invoices", "expenses", "teeth_map", "prescriptions", "treatment_logs"]
    for t in tables: 
        try: g.db.execute(f"DELETE FROM {t}")
        except: pass
        
    log_action("CLINIC_RESET", description="تم تصفير كافة بيانات العيادة نهائياً")
    g.db.commit()
    return jsonify({"ok": True})

@settings_bp.route("/", methods=["GET", "PUT"])
@db_required
def manage_settings():
    if request.method == "PUT":
        d = request.json
        for k, v in d.items():
            g.db.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, v))
        g.db.commit()
        return jsonify({"ok": True})
    rows = g.db.execute("SELECT * FROM settings").fetchall()
    return jsonify({r['key']: r['value'] for r in rows})

@settings_bp.route("/upload-logo", methods=["POST"])
@db_required
def upload_logo():
    if 'logo' not in request.files:
        return jsonify({"error": "No logo uploaded"}), 400
        
    file = request.files['logo']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
        
    # Ensure directory exists
    from flask import current_app
    import time
    
    upload_dir = os.path.join(current_app.root_path, "static", "uploads", "logos")
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        
    username = g.user.get('username', 'guest')
    # Generate unique filename to avoid caching issues
    filename = f"logo_{username}_{int(time.time())}.png"
    filepath = os.path.join(upload_dir, filename)
    
    file.save(filepath)
    
    # Save relative URL to database
    file_url = f"/uploads/logos/{filename}"
    g.db.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('clinic_logo', ?)", (file_url,))
    g.db.commit()
    
    log_action("LOGO_UPLOADED", description="تم تحديث الشعار الخاص بالعيادة")
    
    return jsonify({"ok": True, "url": file_url})



@settings_bp.route("/backup", methods=["GET"])
@db_required
def backup_db():
    from database import get_clinic_db_path, log_action
    import os
    from datetime import datetime
    
    username = g.user.get('username', 'guest')
    db_path = get_clinic_db_path(username)
    
    if not os.path.exists(db_path):
        return jsonify({"error": "Database file not found"}), 404
        
    # Audit Log
    log_action("BACKUP_DOWNLOADED", description="تم تحميل نسخة احتياطية من قاعدة البيانات")
    
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
    friendly_name = f"SmileCare_Backup_{timestamp}.db"
    
    return send_file(db_path, as_attachment=True, download_name=friendly_name)

@settings_bp.route("/audit-logs", methods=["GET"])
@db_required
def get_audit_logs():
    # SECURITY: Only doctors or center managers can see audit logs
    if g.user.get('role') != 'doctor' and g.user.get('account_type') != 'center_manager':
        return jsonify({"error": "Unauthorized Access"}), 403
        
    role_filter = request.args.get("role", "")
    date_filter = request.args.get("date", "")
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 100))
    offset = (page - 1) * limit
    
    query = "SELECT * FROM audit_logs WHERE 1=1"
    params = []
    
    if role_filter:
        query += " AND role = ?"
        params.append(role_filter)
    
    if date_filter:
        # SQLite date() function extracts YYYY-MM-DD from timestamp
        query += " AND date(timestamp) = ?"
        params.append(date_filter)
        
    query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    rows = g.db.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])

@settings_bp.route("/restore", methods=["POST"])
@token_required
def restore_db():
    from database import get_clinic_db_path, log_action
    from flask import g
    import os
    import sqlite3
    
    g.user = request.user
    
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
        
    file = request.files['file']
    if not file.filename.endswith('.db'):
        return jsonify({"error": "Invalid file format."}), 400
        
    username = g.user.get('username')
    db_path = get_clinic_db_path(username)
    temp_path = db_path + ".tmp"
    
    if os.path.exists(temp_path):
        try: os.remove(temp_path)
        except: pass
    file.save(temp_path)
    
    try:
        # 1. Open Source
        src_conn = sqlite3.connect(temp_path)
        # Verify
        src_conn.execute("SELECT 1 FROM patients LIMIT 1")
        
        # 2. Open Destination and DISABLE WAL temporarily to force sync
        dest_conn = sqlite3.connect(db_path, timeout=30)
        dest_conn.execute("PRAGMA journal_mode=DELETE") # Disables WAL and merges everything
        
        # 3. Perform Backup
        src_conn.backup(dest_conn)
        
        src_conn.close()
        dest_conn.close()
        
        # 4. CRITICAL: Delete WAL/SHM files if they still exist for some reason
        for ext in ['-wal', '-shm']:
            side_file = db_path + ext
            if os.path.exists(side_file):
                try: os.remove(side_file)
                except: pass
        
        # 5. Re-enable WAL in the NEW database for performance
        try:
            final_conn = sqlite3.connect(db_path)
            final_conn.execute("PRAGMA journal_mode=WAL")
            final_conn.close()
        except: pass

        # Cleanup
        if os.path.exists(temp_path):
            try: os.remove(temp_path)
            except: pass
            
        # Log success
        from database import get_db
        try:
            g.db = get_db(username)
            log_action("DB_RESTORED", description="تم استعادة قاعدة البيانات بنجاح (وضع المزامنة الكاملة)")
            g.db.close()
        except: pass
        
        return jsonify({"ok": True, "message": "Database restored and synchronized."})
    except Exception as e:
        if os.path.exists(temp_path):
            try: os.remove(temp_path)
            except: pass
        return jsonify({"error": f"Restore failed: {str(e)}"}), 500

# --- Google Drive OAuth2 Integration ---
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials as GoogleCredentials
from googleapiclient.discovery import build
import json

# Scopes required: Ability to see and manage files we created
SCOPES = ['https://www.googleapis.com/auth/drive.file']

@settings_bp.route("/google-auth", methods=["GET"])
@db_required
def google_auth():
    """Starts the Google OAuth2 flow manually to avoid PKCE issues."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        return jsonify({"error": "Google OAuth credentials not configured on server"}), 500

    redirect_uri = request.host_url.rstrip('/') + "/api/settings/google-callback"
    state_data = {"username": g.user.get('username')}
    
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": json.dumps(state_data)
    }
    
    from urllib.parse import urlencode
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return jsonify({"url": auth_url})

@settings_bp.route("/google-callback", methods=["GET"])
def google_callback():
    """Handles the redirect from Google and stores the refresh token."""
    # Allow insecure transport for local testing (HTTP instead of HTTPS)
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    
    code = request.args.get('code')
    state_json = request.args.get('state')
    
    if not code or not state_json:
        return "Invalid request", 400
        
    try:
        state_data = json.loads(state_json)
        username = state_data.get('username')
    except:
        return "Invalid state", 400
    
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    # Direct request to Google to exchange code for token
    import requests
    token_url = "https://oauth2.googleapis.com/token"
    payload = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": request.host_url.rstrip('/') + "/api/settings/google-callback",
        "grant_type": "authorization_code"
    }
    
    response = requests.post(token_url, data=payload)
    token_data = response.json()
    
    if "refresh_token" not in token_data:
        if "error" in token_data:
            return f"Google Error: {token_data.get('error_description', token_data['error'])}", 400
        return "Failed to get refresh token. Please try unlinking and linking again.", 400

    refresh_token = token_data["refresh_token"]
    
    # Save the refresh token to the clinic's settings table
    from database import get_db
    try:
        conn = get_db(username)
        conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('google_refresh_token', ?)", (refresh_token,))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Failed to save refresh token: {e}")
        return f"Error saving credentials: {str(e)}", 500
    
    return """
    <html>
        <head><title>Success</title></head>
        <body style="font-family: sans-serif; text-align: center; padding-top: 50px; background: #0f172a; color: white;">
            <div style="background: rgba(255,255,255,0.05); padding: 40px; border-radius: 20px; display: inline-block; border: 1px solid rgba(255,255,255,0.1);">
                <h2 style="color: #4ade80;">✓ تم ربط Google Drive بنجاح!</h2>
                <p style="opacity: 0.8;">سيقوم النظام الآن برفع نسخة احتياطية لحسابك الشخصي يومياً.</p>
                <p style="font-size: 12px; opacity: 0.5;">سيتم إغلاق هذه النافذة تلقائياً خلال ثوانٍ...</p>
            </div>
            <script>setTimeout(() => window.close(), 4000);</script>
        </body>
    </html>
    """
