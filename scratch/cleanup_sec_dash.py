import re

with open('frontend/src/pages/SecretaryDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove payment_system from initial state
content = content.replace('payment_system: "total", ', '')

# Change amount logic in addPatient
content = content.replace("amount: patientForm.payment_system === 'total' ? (parseFloat(patientForm.total_agreed_price) || 0) : 0", "amount: parseFloat(patientForm.total_agreed_price) || 0")

# The UI section for radio buttons in SecretaryDashboard's Add Patient modal needs to be removed. Let's find it.
# We'll use regex to remove the "نظام المحاسبة" div
radio_div_pattern = r'<div style=\{\{\s*display:\s*"flex",\s*flexDirection:\s*"column",\s*gap:\s*8\s*\}\}>\s*<label style=\{lblStyle\}>\{t\("نظام المحاسبة"\)\}</label>\s*<div.*?>.*?</div>\s*</div>'
content = re.sub(radio_div_pattern, '', content, flags=re.DOTALL)

# Remove the conditional rendering for total_agreed_price
content = content.replace('{patientForm.payment_system === "total" && (\n                    <div style={{ marginTop: 4 }}>', '<div style={{ marginTop: 4 }}>')
content = content.replace(' onChange={e => setPatientForm({ ...patientForm, total_agreed_price: e.target.value.replace(/\D/g, "") })} />\n                    </div>\n                  )}', ' onChange={e => setPatientForm({ ...patientForm, total_agreed_price: e.target.value.replace(/\D/g, "") })} />\n                    </div>')

with open('frontend/src/pages/SecretaryDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
