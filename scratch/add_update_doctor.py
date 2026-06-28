import re

with open('backend/routes/auth.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure it's not already there to prevent duplication
if 'methods=["PUT"]' not in content and 'def update_doctor' not in content:
    update_route = """
@auth_bp.route("/doctors/<int:id>", methods=["PUT"])
@admin_required
def update_doctor(id):
    data = request.json or {}
    p = data.get("password")
    c = data.get("clinic_name")
    exp = data.get("expiry_date")
    status = data.get("status")
    sec_en = data.get("secretary_enabled", 0)
    sec_pass = data.get("secretary_password", "")
    at = data.get("account_type")
    
    master_conn = get_master_db()
    row = master_conn.execute("SELECT username FROM doctors WHERE id=?", (id,)).fetchone()
    if not row:
        master_conn.close()
        return jsonify({"error": "Doctor not found"}), 404
        
    update_fields = []
    params = []
    
    if p:
        update_fields.append("password = ?")
        params.append(generate_password_hash(p))
    if c is not None:
        update_fields.append("clinic_name = ?")
        params.append(c)
    if exp is not None:
        update_fields.append("expiry_date = ?")
        params.append(exp)
    if status is not None:
        update_fields.append("status = ?")
        params.append(status)
    if sec_en is not None:
        update_fields.append("secretary_enabled = ?")
        params.append(sec_en)
    if sec_pass is not None:
        update_fields.append("secretary_password = ?")
        params.append(sec_pass)
    if at is not None:
        update_fields.append("account_type = ?")
        params.append(at)
        
    if update_fields:
        query = f"UPDATE doctors SET {', '.join(update_fields)} WHERE id=?"
        params.append(id)
        try:
            master_conn.execute(query, tuple(params))
            master_conn.commit()
        except Exception as e:
            master_conn.close()
            return jsonify({"error": str(e)}), 400
            
    master_conn.close()
    return jsonify({"ok": True})

"""

    content = content.replace(
        '@auth_bp.route("/doctors/<int:id>", methods=["DELETE"])',
        update_route + '@auth_bp.route("/doctors/<int:id>", methods=["DELETE"])'
    )

    with open('backend/routes/auth.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Route added!")
else:
    print("Route already exists!")
