import sqlite3
import glob

def fix_mismatched_sessions():
    dbs = glob.glob('backend/databases/clinic_*.db')
    
    for db_path in dbs:
        print(f"Fixing {db_path}...")
        try:
            conn = sqlite3.connect(db_path)
            
            # Find patients on 'sessions' whose total_agreed_price is empty or 0
            # AND who have treatment logs. We will move their log sum to total_agreed_price
            # and switch them to 'total'
            patients = conn.execute("SELECT id FROM patients WHERE payment_system = 'sessions' AND (total_agreed_price = '' OR total_agreed_price = 0 OR total_agreed_price IS NULL)").fetchall()
            
            count = 0
            for (pid,) in patients:
                # Sum treatment logs
                cost_sum = conn.execute(f"SELECT SUM(cost) FROM treatment_logs WHERE patient_id = {pid}").fetchone()[0] or 0
                if cost_sum > 0:
                    conn.execute("UPDATE patients SET payment_system = 'total', total_agreed_price = ? WHERE id = ?", (cost_sum, pid))
                    # Zero out the treatment log cost so it doesn't double count if they ever switch back
                    conn.execute(f"UPDATE treatment_logs SET cost = 0 WHERE patient_id = {pid}")
                    count += 1
                else:
                    # No cost, just switch to total
                    conn.execute("UPDATE patients SET payment_system = 'total', total_agreed_price = 0 WHERE id = ?", (pid,))
                    count += 1
            
            conn.commit()
            print(f"  Fixed {count} patients back to 'total' and migrated their costs.")
            conn.close()
        except Exception as e:
            print(f"  Error fixing {db_path}: {e}")

if __name__ == '__main__':
    fix_mismatched_sessions()
