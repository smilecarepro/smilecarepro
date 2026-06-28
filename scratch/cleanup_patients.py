import re

with open('backend/routes/patients.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove payment_system from fields list
content = content.replace("'payment_system', ", "")
content = content.replace(", 'payment_system'", "")

# Remove the default check
content = re.sub(r"if f == 'payment_system' and not val:\s*val = 'sessions'", "", content)

# Remove the branch for payment_system == 'total' in add_debt
content = content.replace("    # If the system is 'total', we must also increase total_agreed_price\n    if p['payment_system'] == 'total':\n        new_total = p['total_agreed_price'] + amount\n        g.db.execute(\"UPDATE patients SET total_agreed_price = ? WHERE id = ?\", (new_total, id))", "    new_total = float(p['total_agreed_price'] or 0) + amount\n    g.db.execute(\"UPDATE patients SET total_agreed_price = ? WHERE id = ?\", (new_total, id))")

with open('backend/routes/patients.py', 'w', encoding='utf-8') as f:
    f.write(content)
