import sqlite3
import glob

for db in glob.glob('backend/clinic_*.db'):
    try:
        conn = sqlite3.connect(db)
        p = conn.execute("SELECT id, first_name, last_name, payment_system, total_agreed_price FROM patients WHERE first_name LIKE '%منى%' OR last_name LIKE '%منى%'").fetchall()
        if p:
            print(f'\n--- {db} ---')
            print('Patients:', p)
            for row in p:
                pid = row[0]
                logs = conn.execute(f"SELECT * FROM treatment_logs WHERE patient_id = {pid}").fetchall()
                invs = conn.execute(f"SELECT * FROM invoices WHERE patient_id = {pid}").fetchall()
                print(f"  PID {pid} Logs:", logs)
                print(f"  PID {pid} Invoices:", invs)
    except Exception as e:
        pass
