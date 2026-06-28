import re

with open('backend/routes/invoices.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace get invoices query
query_old = """                 (CASE 
                  WHEN p.payment_system = 'sessions' THEN 
                    COALESCE((SELECT SUM(cost) FROM treatment_logs WHERE patient_id = p.id), 0)
                  ELSE 
                    COALESCE(p.total_agreed_price, 0)
                END) AS total_price,
               ((CASE 
                  WHEN p.payment_system = 'sessions' THEN 
                    COALESCE((SELECT SUM(cost) FROM treatment_logs WHERE patient_id = p.id), 0)
                  ELSE 
                    COALESCE(p.total_agreed_price, 0)
                END) - COALESCE((SELECT SUM(paid_amount) FROM invoices WHERE patient_id = p.id), 0)) AS remaining"""

query_new = """                 COALESCE(p.total_agreed_price, 0) AS total_price,
               (COALESCE(p.total_agreed_price, 0) - COALESCE((SELECT SUM(paid_amount) FROM invoices WHERE patient_id = p.id), 0)) AS remaining"""

content = content.replace(query_old, query_new)

# Replace pay_invoice logic
pay_inv_old = """    p_data = g.db.execute("SELECT payment_system, total_agreed_price FROM patients WHERE id = ?", (p_id,)).fetchone()
    stats = g.db.execute("SELECT SUM(total_amount) as total_charges, SUM(paid_amount) as total_paid FROM invoices WHERE patient_id = ?", (p_id,)).fetchone()
    
    limit = p_data['total_agreed_price'] if p_data['payment_system'] != 'sessions' else stats['total_charges']"""

pay_inv_new = """    p_data = g.db.execute("SELECT total_agreed_price FROM patients WHERE id = ?", (p_id,)).fetchone()
    stats = g.db.execute("SELECT SUM(total_amount) as total_charges, SUM(paid_amount) as total_paid FROM invoices WHERE patient_id = ?", (p_id,)).fetchone()
    
    limit = p_data['total_agreed_price']"""

content = content.replace(pay_inv_old, pay_inv_new)

# Replace _recalc_patient_debt
recalc_old = """def _recalc_patient_debt(patient_id):
    \"\"\"Recalculate and update patients.debt after invoice changes.\"\"\"
    p = g.db.execute("SELECT payment_system, total_agreed_price FROM patients WHERE id=?", (patient_id,)).fetchone()
    if not p:
        return
    total_paid = g.db.execute("SELECT COALESCE(SUM(paid_amount),0) FROM invoices WHERE patient_id=?", (patient_id,)).fetchone()[0]
    if p['payment_system'] == 'sessions':
        agreed = g.db.execute("SELECT COALESCE(SUM(cost),0) FROM treatment_logs WHERE patient_id=?", (patient_id,)).fetchone()[0]
    else:
        agreed = p['total_agreed_price'] or 0
    debt = agreed - total_paid
    g.db.execute("UPDATE patients SET debt=?, total_paid=? WHERE id=?", (debt, total_paid, patient_id))"""

recalc_new = """def _recalc_patient_debt(patient_id):
    \"\"\"Recalculate and update patients.debt after invoice changes.\"\"\"
    p = g.db.execute("SELECT total_agreed_price FROM patients WHERE id=?", (patient_id,)).fetchone()
    if not p:
        return
    total_paid = g.db.execute("SELECT COALESCE(SUM(paid_amount),0) FROM invoices WHERE patient_id=?", (patient_id,)).fetchone()[0]
    agreed = p['total_agreed_price'] or 0
    debt = agreed - total_paid
    g.db.execute("UPDATE patients SET debt=?, total_paid=? WHERE id=?", (debt, total_paid, patient_id))"""

content = content.replace(recalc_old, recalc_new)

# Replace print_invoice
print_inv_old = """    inv = g.db.execute(\"\"\"
        SELECT i.*, p.first_name || ' ' || p.last_name AS patient_name, p.phone, p.payment_system, p.total_agreed_price 
        FROM invoices i 
        JOIN patients p ON i.patient_id = p.id 
        WHERE i.id = ?
    \"\"\", (id,)).fetchone()
    if not inv: return jsonify({"error": "NotFound"}), 404

    # Calculate debt logic
    stats = g.db.execute("SELECT SUM(total_amount) as total_charges, SUM(paid_amount) as total_paid FROM invoices WHERE patient_id = ?", (inv['patient_id'],)).fetchone()
    limit = inv['total_agreed_price'] if inv['payment_system'] != 'sessions' else stats['total_charges']"""

print_inv_new = """    inv = g.db.execute(\"\"\"
        SELECT i.*, p.first_name || ' ' || p.last_name AS patient_name, p.phone, p.total_agreed_price 
        FROM invoices i 
        JOIN patients p ON i.patient_id = p.id 
        WHERE i.id = ?
    \"\"\", (id,)).fetchone()
    if not inv: return jsonify({"error": "NotFound"}), 404

    # Calculate debt logic
    stats = g.db.execute("SELECT SUM(total_amount) as total_charges, SUM(paid_amount) as total_paid FROM invoices WHERE patient_id = ?", (inv['patient_id'],)).fetchone()
    limit = inv['total_agreed_price']"""

content = content.replace(print_inv_old, print_inv_new)

with open('backend/routes/invoices.py', 'w', encoding='utf-8') as f:
    f.write(content)
