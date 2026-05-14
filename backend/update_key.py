import sqlite3
import os

db_path = 'databases/clinic_u.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('gemini_api_key', 'AIzaSyBo12cSY1NHQ7rWylfNq0l3Kp9G9uQ5yQw')")
    conn.commit()
    conn.close()
    print("--- SUCCESS: API KEY UPDATED FOR CLINIC U ---")
else:
    print(f"--- ERROR: Database not found at {db_path} ---")
