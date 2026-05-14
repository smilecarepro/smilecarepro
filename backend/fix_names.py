import sqlite3
import re

db_path = 'databases/clinic_u.db'
conn = sqlite3.connect(db_path)
rows = conn.execute("SELECT id, notes FROM appointments WHERE patient_name = 'مريض من الواتساب'").fetchall()

for row_id, notes in rows:
    if not notes: continue
    name_match = re.search(r"الاسم\s*[:：]\s*([^،\n\.]+)", notes)
    if name_match:
        real_name = name_match.group(1).strip()
        conn.execute("UPDATE appointments SET patient_name = ? WHERE id = ?", (real_name, row_id))
        print(f"Updated ID {row_id} to {real_name}")

conn.commit()
conn.close()
print("--- ALL OLD NAMES CORRECTED ---")
