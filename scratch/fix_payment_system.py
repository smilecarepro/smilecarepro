import sqlite3
import glob

def fix_payment_systems():
    # Find all clinic databases
    dbs = glob.glob('backend/databases/clinic_*.db')
    
    for db_path in dbs:
        print(f"Fixing {db_path}...")
        try:
            conn = sqlite3.connect(db_path)
            
            # Find patients with empty or null payment system and set to sessions
            cur = conn.execute("UPDATE patients SET payment_system = 'sessions' WHERE payment_system = '' OR payment_system IS NULL")
            if cur.rowcount > 0:
                print(f"  Fixed {cur.rowcount} patients with empty/null payment_system.")
            
            # Also, patients created via quick add might have 'total' as payment_system from DB default, 
            # but total_agreed_price as 0. 
            # If they have treatment logs with cost > 0, they should definitely be 'sessions'.
            cur = conn.execute("""
                UPDATE patients 
                SET payment_system = 'sessions' 
                WHERE payment_system = 'total' 
                  AND (total_agreed_price = 0 OR total_agreed_price IS NULL OR total_agreed_price = '')
                  AND id IN (SELECT patient_id FROM treatment_logs WHERE cost > 0)
            """)
            if cur.rowcount > 0:
                print(f"  Fixed {cur.rowcount} patients with 'total' but active session costs.")
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"  Error fixing {db_path}: {e}")

if __name__ == '__main__':
    fix_payment_systems()
