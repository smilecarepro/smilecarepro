import re

files = [
    'frontend/src/pages/Patients.jsx',
    'frontend/src/pages/Appointments.jsx',
    'frontend/src/pages/SecretaryDashboard.jsx'
]

# 1. Remove the UI inputs for total_agreed_price and initial_payment
ui_pattern = re.compile(
    r'<div style={{ marginTop: 4 }}>\s*<label className="input-label">\{t\("السعر الكلي المتفق عليه \(د\.ع\)"\)\}</label>.*?</label>\s*<input[^>]+initial_payment[^>]+>\s*</div>',
    re.DOTALL
)

ui_pattern2 = re.compile(
    r'<div style={{ marginTop: 4 }}>\s*<label className="input-label">\{t\("السعر الكلي المتفق عليه \(د\.ع\)"\)\}</label>.*?</div>\s*<div style={{ marginTop: 4 }}>\s*<label className="input-label">\{t\("الدفعة الأولى \(د\.ع\)"\)\}</label>.*?</div>',
    re.DOTALL
)

# 2. Remove the 500 IQD validation logic for these fields
val_pattern = re.compile(
    r'if\s*\([^)]*total_agreed_price[^)]*\)\s*\{\s*return\s*alert\([^)]+\);\s*\}\s*if\s*\([^)]*initial_payment[^)]*\)\s*\{\s*return\s*alert\([^)]+\);\s*\}',
    re.DOTALL
)

# 3. Remove the addInvoice logic
invoice_pattern = re.compile(
    r'if\s*\([^)]*total_agreed_price\s*\|\|[^)]*initial_payment\)\s*\{\s*await\s*addInvoice\(\{[^}]+\}\);\s*\}',
    re.DOTALL
)

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove UI
    content = ui_pattern.sub('', content)
    content = ui_pattern2.sub('', content)
    
    # Remove validation
    content = val_pattern.sub('', content)
    
    # Remove addInvoice logic
    content = invoice_pattern.sub('', content)

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Removed financial fields from add patient modals.")
