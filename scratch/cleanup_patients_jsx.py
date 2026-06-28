import re

with open('frontend/src/pages/Patients.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove payment_system from initial state
content = content.replace('payment_system: "total", ', '')

# Remove validation for payment_system == "total"
content = re.sub(r'if \(form.payment_system === "total" && form\.total_agreed_price.*?}', 'if (form.total_agreed_price && parseFloat(form.total_agreed_price) % 500 !== 0) {\n        return alert(t("⚠️ عذراً، لا يمكن إدخال هذا الرقم. يرجى إدخال مبلغ (السعر الكلي) صحيح من مضاعفات الـ 500 دينار عراقي."));\n      }', content, flags=re.DOTALL)

# Change amount to just total_agreed_price
content = content.replace("amount: form.payment_system === 'total' ? (parseFloat(form.total_agreed_price) || 0) : 0", "amount: parseFloat(form.total_agreed_price) || 0")

# Remove the radio buttons section
radio_section = """                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={lblStyle}>{t("نظام المحاسبة")}</label>
                    <div style={{ display: "flex", gap: 20, padding: "0 12px", background: "rgba(255,255,255,0.03)", borderRadius: 12, height: 44, alignItems: "center" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                        <input type="radio" checked={form.payment_system === "total"} onChange={() => setForm({ ...form, payment_system: "total" })} /> {t("مبلغ كلي")}
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                        <input type="radio" checked={form.payment_system === "sessions"} onChange={() => setForm({ ...form, payment_system: "sessions", total_agreed_price: "" })} /> {t("نظام جلسات")}
                      </label>
                    </div>
                  </div>
                </div>"""
content = content.replace(radio_section, "")

# Remove the conditional rendering for total_agreed_price
content = content.replace('{form.payment_system === "total" && (\n                  <div style={{ marginTop: 4 }}>', '<div style={{ marginTop: 4 }}>')
content = content.replace(' onChange={e => setForm({ ...form, total_agreed_price: e.target.value.replace(/\D/g, "") })} />\n                  </div>\n                )}', ' onChange={e => setForm({ ...form, total_agreed_price: e.target.value.replace(/\D/g, "") })} />\n                  </div>')

with open('frontend/src/pages/Patients.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
