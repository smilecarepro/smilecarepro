import re

with open('frontend/src/pages/Patients.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We will find the block starting with:
# <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 32, textAlign: "center" }}>{t("إضافة مريض جديد")}</h3>
# and ending before:
# <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 40 }}>

modal_start_str = r'<h3 style=\{\{ fontSize: 24, fontWeight: 700, marginBottom: 32, textAlign: "center" \}\}>\{t\("إضافة مريض جديد"\)\}</h3>.*?<div style=\{\{ display: "flex", flexDirection: "column", gap: 16 \}\}>'

modal_end_str = r'</div>\s*<div style=\{\{ display: "flex", gap: 12, justifyContent: "center", marginTop: 40 \}\}>'

new_fields = """
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><label className="input-label">{t("الاسم الأول")}</label><input className="glass-input" style={{ width: "100%" }} value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></div>
                <div><label className="input-label">{t("اسم العائلة")}</label><input className="glass-input" style={{ width: "100%" }} value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><label className="input-label">{t("رقم الهاتف")}</label><input className="glass-input" style={{ width: "100%" }} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div><label className="input-label">{t("العمر")}</label><input type="number" className="glass-input" style={{ width: "100%" }} value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><label className="input-label">{t("العنوان")}</label><input className="glass-input" style={{ width: "100%" }} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                <div>
                  <label className="input-label">{t("الجنس")}</label>
                  <select className="glass-input" style={{ width: "100%", height: 44 }} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                    <option value="Male">{t("ذكر")}</option>
                    <option value="Female">{t("أنثى")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">{t("نوع الحالة")}</label>
                <select className="glass-input" style={{ width: "100%", height: 44 }} value={form.case_category} onChange={e => setForm({ ...form, case_category: e.target.value })}>
                  <option value="">{t("اختر النوع...")}</option>
                  {getDynamicList('treatment_types', [
                    "فحص دوري", "تنظيف أسنان", "حشو ضرس", "خلع ضرس", "علاج عصب", "تلبيس ضرس", "تقويم أسنان", "تبييض أسنان", "زراعة", "أشعة", "استشارة", "أخرى"
                  ]).map(c => (
                    <option key={c} value={c}>{t(c)}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 4 }}>
                <label className="input-label">{t("السعر الكلي المتفق عليه (د.ع)")}</label>
                <input type="text" className="glass-input" style={{ width: "100%" }} placeholder="IQD" value={form.total_agreed_price ? Number(form.total_agreed_price).toLocaleString() : ""} onChange={e => setForm({ ...form, total_agreed_price: e.target.value.replace(/\\D/g, "") })} />
              </div>
              
              <div style={{ marginTop: 4 }}>
                <label className="input-label">{t("الدفعة الأولى (د.ع)")}</label>
                <input type="text" className="glass-input" style={{ width: "100%" }} placeholder="IQD" value={form.initial_payment ? Number(form.initial_payment).toLocaleString() : ""} onChange={e => setForm({ ...form, initial_payment: e.target.value.replace(/\\D/g, "") })} />
              </div>

              <div style={{ marginTop: 4 }}>
                <label className="input-label">{t("ملاحظات طبية / عامة")}</label>
                <textarea className="glass-input" style={{ width: "100%", minHeight: 80 }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
"""

# Extract the part between modal_start and modal_end
pattern = r'(<h3 style=\{\{\s*fontSize: 24,\s*fontWeight: 700,\s*marginBottom: 32,\s*textAlign: "center"\s*\}\}>\{t\("إضافة مريض جديد"\)\}</h3>).*?(<div style=\{\{\s*display: "flex",\s*gap: 12,\s*justifyContent: "center",\s*marginTop: 40\s*\}\}>)'

def replacer(match):
    return match.group(1) + new_fields + match.group(2)

content = re.sub(pattern, replacer, content, flags=re.DOTALL)

with open('frontend/src/pages/Patients.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
