import sqlite3
import glob

with open('scratch/all_patients.txt', 'w', encoding='utf-8') as f:
    for db in glob.glob('backend/databases/clinic_*.db'):
        try:
            conn = sqlite3.connect(db)
            patients = conn.execute('SELECT id, first_name, last_name, payment_system, total_agreed_price, debt, total_paid FROM patients').fetchall()
            if patients:
                f.write(f'\n--- {db} ---\n')
                for p in patients:
                    f.write(f'{p}\n')
                    # Also print their invoices and logs
                    logs = conn.execute(f'SELECT id, cost, date FROM treatment_logs WHERE patient_id = {p[0]}').fetchall()
                    invs = conn.execute(f'SELECT id, total_amount, paid_amount FROM invoices WHERE patient_id = {p[0]}').fetchall()
                    f.write(f'  Logs: {logs}\n')
                    f.write(f'  Invoices: {invs}\n')
        except Exception as e:
            pass
