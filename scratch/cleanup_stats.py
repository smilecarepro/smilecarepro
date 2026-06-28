import re

with open('backend/routes/stats.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace agreed_total_query logic
agreed_total_old = """    agreed_total_query = \"\"\"
        SELECT SUM(total_amt) FROM (
            SELECT CASE 
                   WHEN p.payment_system = 'sessions' THEN COALESCE((SELECT SUM(cost) FROM treatment_logs WHERE patient_id = p.id), 0)
                   ELSE COALESCE(p.total_agreed_price, 0) 
                   END as total_amt
            FROM patients p
        )
    \"\"\""""

agreed_total_new = """    agreed_total_query = \"\"\"
        SELECT SUM(COALESCE(total_agreed_price, 0)) FROM patients
    \"\"\""""

content = content.replace(agreed_total_old, agreed_total_new)

# Replace get_debts query logic
debts_query_old = """    query = \"\"\"
        SELECT p.id, p.first_name, p.last_name, p.phone, p.payment_system, p.debt, p.total_paid,
               (CASE WHEN p.payment_system = 'sessions' THEN COALESCE((SELECT SUM(cost) FROM treatment_logs WHERE patient_id = p.id), 0) ELSE COALESCE(p.total_agreed_price, 0) END) AS total_amt
        FROM patients p
        WHERE p.debt > 0
        ORDER BY p.debt DESC
    \"\"\""""

debts_query_new = """    query = \"\"\"
        SELECT p.id, p.first_name, p.last_name, p.phone, p.debt, p.total_paid,
               COALESCE(p.total_agreed_price, 0) AS total_amt
        FROM patients p
        WHERE p.debt > 0
        ORDER BY p.debt DESC
    \"\"\""""

content = content.replace(debts_query_old, debts_query_new)

with open('backend/routes/stats.py', 'w', encoding='utf-8') as f:
    f.write(content)
