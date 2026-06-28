import re

with open('backend/routes/appointments.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """    if cost > 0:
        p_sys = g.db.execute("SELECT payment_system, total_agreed_price FROM patients WHERE id=?", (p_id,)).fetchone()
        if p_sys and p_sys['payment_system'] == 'total':
            # For 'total' system, the financial data is an integral part of the patient info.
            # We add the cost to the total_agreed_price.
            new_total = float(p_sys['total_agreed_price'] or 0) + cost
            g.db.execute("UPDATE patients SET total_agreed_price = ? WHERE id=?", (new_total, p_id))
            # Add a treatment log with 0 cost for record keeping
            g.db.execute(
                "INSERT INTO treatment_logs (patient_id, date, tooth_number, treatment, cost, is_prescription, notes) VALUES (?, ?, ?, ?, 0, 0, ?)",
                (p_id, d.get('date'), '', d.get('type', 'جلسة'), 'أضيف من لوحة المواعيد')
            )
        else:
            # For 'sessions' system, we insert the cost into the treatment log
            g.db.execute(
                "INSERT INTO treatment_logs (patient_id, date, tooth_number, treatment, cost, is_prescription, notes) VALUES (?, ?, ?, ?, ?, 0, ?)",
                (p_id, d.get('date'), '', d.get('type', 'جلسة'), cost, 'أضيف من لوحة المواعيد')
            )"""

new_logic = """    if cost > 0:
        p_sys = g.db.execute("SELECT total_agreed_price FROM patients WHERE id=?", (p_id,)).fetchone()
        if p_sys:
            new_total = float(p_sys['total_agreed_price'] or 0) + cost
            g.db.execute("UPDATE patients SET total_agreed_price = ? WHERE id=?", (new_total, p_id))
            g.db.execute(
                "INSERT INTO treatment_logs (patient_id, date, tooth_number, treatment, cost, is_prescription, notes) VALUES (?, ?, ?, ?, 0, 0, ?)",
                (p_id, d.get('date'), '', d.get('type', 'جلسة'), 'أضيف من لوحة المواعيد')
            )"""

content = content.replace(old_logic, new_logic)

with open('backend/routes/appointments.py', 'w', encoding='utf-8') as f:
    f.write(content)
