import sqlite3
import random
from datetime import datetime, timedelta
import sys

def seed_database(username):
    db_path = f"backend/databases/clinic_{username}.db"
    try:
        conn = sqlite3.connect(db_path)
    except Exception as e:
        print(f"Error connecting to database {db_path}: {e}")
        return

    print(f"Seeding database for '{username}' ({db_path})...")
    
    first_names = ["علي", "محمد", "فاطمة", "زينب", "أحمد", "حسين", "نور", "سارة", "حسن", "عمر"]
    last_names = ["الشمري", "التميمي", "الخفاجي", "العامري", "الساعدي", "المالكي", "الدراجي", "العبيدي", "الجبوري", "الموسوي"]
    drug_names = ["Amoxicillin 500mg", "Ibuprofen 400mg", "Paracetamol", "Augmentin", "Lidocaine 2%", "Chlorhexidine Mouthwash", "Metronidazole", "Diclofenac", "Clove Oil", "Azithromycin"]
    inventory_names = ["Composite Resin", "Dental Needles 30G", "Cotton Rolls", "Dental Mirrors", "Gloves Medium", "Masks", "Saliva Ejectors", "Impression Material", "Gutta Percha", "Paper Points"]
    expense_categories = ["رواتب", "إيجار", "صيانة", "مواد طبية", "قرطاسية", "كهرباء", "انترنت", "نظافة", "ضيافة", "أخرى"]
    
    # 1. Patients (10)
    print("Inserting 10 Patients...")
    for i in range(10):
        first = random.choice(first_names)
        last = random.choice(last_names)
        phone = f"077{random.randint(1000000, 9999999)}"
        birth = (datetime.now() - timedelta(days=random.randint(5000, 20000))).strftime("%Y-%m-%d")
        conn.execute("INSERT INTO patients (first_name, last_name, phone, birth_date, gender) VALUES (?, ?, ?, ?, ?)", 
                     (first, last, phone, birth, random.choice(["ذكر", "أنثى"])))
    
    conn.commit()
    patients = conn.execute("SELECT id, first_name, last_name FROM patients LIMIT 10").fetchall()
    
    # 2. Appointments (10)
    print("Inserting 10 Appointments...")
    for i, p in enumerate(patients):
        date_str = (datetime.now() + timedelta(days=random.randint(0, 10))).strftime("%Y-%m-%d")
        time_str = f"{random.randint(9, 17):02d}:00"
        conn.execute("INSERT INTO appointments (patient_id, patient_name, date, time, type, duration_min, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                     (p[0], f"{p[1]} {p[2]}", date_str, time_str, random.choice(["كشف", "حشوة", "قلع", "تنظيف"]), 30, "booked", f"ملاحظة للموعد رقم {i+1}"))
                     
    # 3. Invoices (10)
    print("Inserting 10 Invoices (Financial records)...")
    for i, p in enumerate(patients):
        total = random.choice([50000, 100000, 150000, 200000])
        paid = total if random.choice([True, False]) else total - 25000
        conn.execute("INSERT INTO invoices (patient_id, date, total_amount, paid_amount, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?)",
                     (p[0], datetime.now().strftime("%Y-%m-%d"), total, paid, "Cash", f"فاتورة علاج رقم {i+1}"))
                     
    # 4. Drugs (10)
    print("Inserting 10 Drugs to Pharmacy...")
    for i in range(10):
        try:
            conn.execute("INSERT INTO drugs (name, category, stock_quantity, unit) VALUES (?, ?, ?, ?)",
                         (drug_names[i], "أدوية", random.randint(20, 100), "شريط"))
        except sqlite3.IntegrityError:
            pass
            
    # 5. Inventory Items (10)
    print("Inserting 10 Inventory Items...")
    for i in range(10):
        try:
            conn.execute("INSERT INTO inventory_items (name, category, stock_quantity, unit, purchase_price) VALUES (?, ?, ?, ?, ?)",
                         (inventory_names[i], "مواد استهلاكية", random.randint(50, 500), "علبة", random.randint(5000, 25000)))
        except sqlite3.IntegrityError:
            pass
            
    # 6. Expenses (10)
    print("Inserting 10 Expenses...")
    for i in range(10):
        date_str = (datetime.now() - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d")
        conn.execute("INSERT INTO expenses (category, amount, payment_method, date, notes) VALUES (?, ?, ?, ?, ?)",
                     (expense_categories[i], random.randint(10000, 500000), "Cash", date_str, "مصروفات عامة"))
                     
    conn.commit()
    conn.close()
    print("Done! Inserted 10 records into each major table successfully.")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "a"
    seed_database(target)
