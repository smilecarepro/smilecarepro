import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "databases", "master.db")

def dump_debug():
    if not os.path.exists(DB_PATH):
        print(f"DB NOT FOUND AT {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    print("--- CENTER MANAGERS ---")
    managers = conn.execute("SELECT id, username, manager_name FROM center_managers").fetchall()
    for m in managers:
        print(dict(m))
        
    print("\n--- DOCTORS ---")
    doctors = conn.execute("SELECT id, username, doctor_name, center_id, account_type FROM doctors").fetchall()
    for d in doctors:
        print(dict(d))
        
    print("\n--- SECRETARIES ---")
    secs = conn.execute("SELECT id, username, full_name, center_id FROM secretaries").fetchall()
    for s in secs:
        print(dict(s))
        
    conn.close()

if __name__ == "__main__":
    dump_debug()
