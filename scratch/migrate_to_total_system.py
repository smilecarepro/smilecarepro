import sqlite3
import glob
import os

def migrate_to_total_system():
    # We will search through all clinic DBs
    db_folder = 'backend/databases'
    db_files = glob.glob(os.path.join(db_folder, "clinic_*.db")) + [os.path.join(db_folder, "clinic.db")]
    
    for db_path in db_files:
        if not os.path.exists(db_path): continue
        print(f"Migrating {db_path}...")
        try:
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            
            # Find all patients whose payment_system was 'sessions'
            # (or honestly ANY patient with treatment_log costs, to be safe)
            patients = conn.execute("SELECT id, payment_system, total_agreed_price FROM patients").fetchall()
            
            count = 0
            for p in patients:
                pid = p['id']
                # Check if there are any costs in treatment_logs
                cost_sum = conn.execute("SELECT COALESCE(SUM(cost), 0) FROM treatment_logs WHERE patient_id = ?", (pid,)).fetchone()[0]
                
                if cost_sum > 0:
                    current_agreed = float(p['total_agreed_price'] or 0)
                    new_agreed = current_agreed + cost_sum
                    
                    conn.execute("UPDATE patients SET total_agreed_price = ? WHERE id = ?", (new_agreed, pid))
                    conn.execute("UPDATE treatment_logs SET cost = 0 WHERE patient_id = ?", (pid,))
                    count += 1
                
                # Also force everyone to payment_system = 'total' just to be clean
                conn.execute("UPDATE patients SET payment_system = 'total' WHERE id = ?", (pid,))
                
            conn.commit()
            print(f"  Migrated {count} patients.")
            conn.close()
        except Exception as e:
            print(f"  Error: {e}")

if __name__ == '__main__':
    migrate_to_total_system()
