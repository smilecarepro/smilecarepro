import re

# We will construct a new Add Patient Modal string that looks EXACTLY the same for both.
# It will have:
# Row 1: first_name, last_name
# Row 2: phone, age
# Row 3: address, gender
# Row 4: case_category
# Row 5: total_agreed_price
# Row 6: initial_payment
# Row 7: notes
# Buttons

modal_template = """          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div><label className="input-label">{t("الاسم الأول")}</label><input className="glass-input" style={{ width: "100%" }} value={%FORM%.first_name} onChange={e => %SET_FORM%({ ...%FORM%, first_name: e.target.value })} /></div>
              <div><label className="input-label">{t("اسم العائلة")}</label><input className="glass-input" style={{ width: "100%" }} value={%FORM%.last_name} onChange={e => %SET_FORM%({ ...%FORM%, last_name: e.target.value })} /></div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div><label className="input-label">{t("رقم الهاتف")}</label><input className="glass-input" style={{ width: "100%" }} value={%FORM%.phone} onChange={e => %SET_FORM%({ ...%FORM%, phone: e.target.value })} /></div>
              <div><label className="input-label">{t("العمر")}</label><input type="number" className="glass-input" style={{ width: "100%" }} value={%FORM%.age} onChange={e => %SET_FORM%({ ...%FORM%, age: e.target.value })} /></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div><label className="input-label">{t("العنوان")}</label><input className="glass-input" style={{ width: "100%" }} value={%FORM%.address} onChange={e => %SET_FORM%({ ...%FORM%, address: e.target.value })} /></div>
              <div>
                <label className="input-label">{t("الجنس")}</label>
                <select className="glass-input" style={{ width: "100%", height: 44 }} value={%FORM%.gender} onChange={e => %SET_FORM%({ ...%FORM%, gender: e.target.value })}>
                  <option value="Male">{t("ذكر")}</option>
                  <option value="Female">{t("أنثى")}</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="input-label">{t("نوع الحالة")}</label>
              <select className="glass-input" style={{ width: "100%", height: 44 }} value={%FORM%.case_category} onChange={e => %SET_FORM%({ ...%FORM%, case_category: e.target.value })}>
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
              <input type="text" className="glass-input" style={{ width: "100%" }} placeholder="IQD" value={%FORM%.total_agreed_price ? Number(%FORM%.total_agreed_price).toLocaleString() : ""} onChange={e => %SET_FORM%({ ...%FORM%, total_agreed_price: e.target.value.replace(/\\D/g, "") })} />
            </div>
            
            <div style={{ marginTop: 4 }}>
              <label className="input-label">{t("الدفعة الأولى (د.ع)")}</label>
              <input type="text" className="glass-input" style={{ width: "100%" }} placeholder="IQD" value={%FORM%.initial_payment ? Number(%FORM%.initial_payment).toLocaleString() : ""} onChange={e => %SET_FORM%({ ...%FORM%, initial_payment: e.target.value.replace(/\\D/g, "") })} />
            </div>

            <div style={{ marginTop: 4 }}>
              <label className="input-label">{t("ملاحظات طبية / عامة")}</label>
              <textarea className="glass-input" style={{ width: "100%", minHeight: 80 }} value={%FORM%.notes} onChange={e => %SET_FORM%({ ...%FORM%, notes: e.target.value })} />
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
              <button onClick={() => %CLOSE_MODAL%(false)} className="btn-ghost" style={{ width: 120 }}>{t("إلغاء")}</button>
              <button onClick={%SUBMIT%} className="btn-primary" style={{ width: 200 }}>{t("إضافة المريض")}</button>
            </div>
          </div>
"""

# SecretaryDashboard.jsx Update
with open('frontend/src/pages/SecretaryDashboard.jsx', 'r', encoding='utf-8') as f:
    content_sec = f.read()

sec_modal = "<Modal title={t(\"إضافة مريض جديد\")} onClose={() => setShowAddPatient(false)}>\n" + modal_template.replace("%FORM%", "patientForm").replace("%SET_FORM%", "setPatientForm").replace("%CLOSE_MODAL%", "setShowAddPatient").replace("%SUBMIT%", "handleAddPatientSubmit") + "        </Modal>"

# Replace the inner div of Modal title={"إضافة مريض جديد"} ... </Modal>
sec_pattern = r'<Modal title=\{t\("إضافة مريض جديد"\)\} onClose=\{\(\) => setShowAddPatient\(false\)\}>.*?</Modal>'
content_sec = re.sub(sec_pattern, lambda match: sec_modal, content_sec, flags=re.DOTALL)

with open('frontend/src/pages/SecretaryDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content_sec)


# Patients.jsx Update
with open('frontend/src/pages/Patients.jsx', 'r', encoding='utf-8') as f:
    content_pat = f.read()

pat_modal = "<Modal title={t(\"إضافة مريض جديد\")} onClose={() => setShowAdd(false)}>\n" + modal_template.replace("%FORM%", "form").replace("%SET_FORM%", "setForm").replace("%CLOSE_MODAL%", "setShowAdd").replace("%SUBMIT%", "handleSave") + "        </Modal>"

pat_pattern = r'<Modal title=\{t\("إضافة مريض جديد"\)\} onClose=\{\(\) => setShowAdd\(false\)\}>.*?</Modal>'
content_pat = re.sub(pat_pattern, lambda match: pat_modal, content_pat, flags=re.DOTALL)

with open('frontend/src/pages/Patients.jsx', 'w', encoding='utf-8') as f:
    f.write(content_pat)

