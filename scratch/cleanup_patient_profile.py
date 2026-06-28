import re

with open('frontend/src/pages/PatientProfile.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace isSessions logic in addInvoice
add_invoice_old = """    const isSessions = patient?.payment_system === 'sessions';
    let sessionCost = 0;

    if (isSessions) {
      const parsedAmount = parseFloat(paymentAmount) || 0;
      // If payment exceeds current debt, we must be adding a new session cost implicitly
      if (parsedAmount > remaining) {
        sessionCost = parsedAmount - remaining;
      }
    }"""

add_invoice_new = """    let sessionCost = 0;"""
content = content.replace(add_invoice_old, add_invoice_new)

# Replace the payload in addInvoice
payload_old = """      const payload = {
        amount: sessionCost > 0 ? sessionCost : 0,
        paid: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        date: localDate(),
        notes: paymentNotes
      };"""
payload_new = """      const payload = {
        amount: 0,
        paid: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        date: localDate(),
        notes: paymentNotes
      };"""
content = content.replace(payload_old, payload_new)


# Replace remaining debt calculation logic
remaining_old = """  const isSessions = patient?.payment_system === 'sessions';
  const remaining = isSessions ? (totalSessionCosts - totalPaid) : ((parseFloat(agreedPrice) || 0) - totalPaid);"""
remaining_new = """  const remaining = (parseFloat(agreedPrice) || 0) - totalPaid;"""
content = content.replace(remaining_old, remaining_new)

# Remove the system badge from the header
badge_old_1 = """            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <span className="glass-badge"><User size={14} /> {patient?.gender} - {patient?.age} {t("سنة")}</span>
              <span className="glass-badge"><Phone size={14} /> <a href={`tel:${patient?.phone}`} style={{ color: "inherit", textDecoration: "none" }}>{patient?.phone}</a></span>
              <span className="glass-badge" style={{ color: patient?.payment_system === 'sessions' ? '#3498db' : '#2ecc71' }}>
                <Wallet size={14} /> {patient?.payment_system === 'sessions' ? t('نظام الجلسات') : t('مبلغ كلي')}
              </span>
            </div>"""

badge_new_1 = """            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <span className="glass-badge"><User size={14} /> {patient?.gender} - {patient?.age} {t("سنة")}</span>
              <span className="glass-badge"><Phone size={14} /> <a href={`tel:${patient?.phone}`} style={{ color: "inherit", textDecoration: "none" }}>{patient?.phone}</a></span>
            </div>"""

content = content.replace(badge_old_1, badge_new_1)

# Arabic version of the badge (might have different translations, let's just do a regex replace)
content = re.sub(r'<span className="glass-badge" style=\{\{ color: patient\?\.payment_system === \'sessions\' \? \'#3498db\' : \'#2ecc71\' \}\}>.*?</span>', '', content, flags=re.DOTALL)


# Disable/Remove the logic that hides agreed price for sessions
hide_price_old = """{isSessions ? (
                    <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{t("إجمالي تكلفة الجلسات المسجلة")}</p>
                      <h3 style={{ margin: "4px 0 0", color: "var(--text)" }}>{totalSessionCosts.toLocaleString()} {t("د")}</h3>
                    </div>
                  ) : (
                    <div style={{ position: "relative" }}>
                      <input type="text" className="glass-input" style={{ width: "100%", paddingRight: 40 }} 
                             value={agreedPrice ? Number(agreedPrice).toLocaleString() : ""} 
                             onChange={e => setAgreedPrice(e.target.value.replace(/\D/g, ""))} />
                      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 13 }}>IQD</span>
                    </div>
                  )}"""

hide_price_new = """                    <div style={{ position: "relative" }}>
                      <input type="text" className="glass-input" style={{ width: "100%", paddingRight: 40 }} 
                             value={agreedPrice ? Number(agreedPrice).toLocaleString() : ""} 
                             onChange={e => setAgreedPrice(e.target.value.replace(/\D/g, ""))} />
                      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 13 }}>IQD</span>
                    </div>"""

content = content.replace(hide_price_old, hide_price_new)

with open('frontend/src/pages/PatientProfile.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
