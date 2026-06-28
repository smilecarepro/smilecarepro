import re

with open('frontend/src/pages/Appointments.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add patientForm state to Appointments.jsx
patient_state_str = """
  const [patientForm, setPatientForm] = useState({
    first_name: "", last_name: "", phone: "", gender: "Male", age: "", address: "", case_category: "",
    total_agreed_price: "", initial_payment: "", payment_method: "Cash", notes: ""
  });
  const [showPatientModal, setShowPatientModal] = useState(false);
"""

content = re.sub(r'(const \[form, setForm\] = useState.*?;\n)', r'\1' + patient_state_str, content, flags=re.DOTALL)

# 2. Add handleAddPatientSubmit to Appointments.jsx
handle_submit_str = """
  const handleAddPatientSubmit = async () => {
    if (!patientForm.first_name) return alert(t("يرجى إدخال اسم المريض"));
    
    if (patientForm.total_agreed_price && parseFloat(patientForm.total_agreed_price) % 500 !== 0) {
      return alert(t("⚠️ السعر الكلي يجب أن يكون من مضاعفات الـ 500 دينار عراقي."));
    }
    if (patientForm.initial_payment && parseFloat(patientForm.initial_payment) % 500 !== 0) {
      return alert(t("⚠️ مبلغ الدفعة الأولى يجب أن يكون من مضاعفات الـ 500 دينار عراقي."));
    }

    setPatientSaving(true);
    try {
      const { addPatient } = await import("../api");
      const res = await addPatient(patientForm);
      if (res && res.id) {
        const { saveTeeth, addInvoice } = await import("../api");
        await saveTeeth(res.id, {});

        if (patientForm.total_agreed_price || patientForm.initial_payment) {
          await addInvoice({
            patient_id: res.id,
            amount: parseFloat(patientForm.total_agreed_price) || 0,
            paid: parseFloat(patientForm.initial_payment) || 0,
            payment_method: patientForm.payment_method || "Cash",
            date: new Date().toISOString().split('T')[0],
            notes: t("الاتفاق المالي عند التسجيل")
          });
        }
        
        // Auto select the new patient for the appointment
        setForm({ ...form, patient_id: res.id });
        setSearchTerm(patientForm.first_name + " " + patientForm.last_name);
        
        setShowPatientModal(false);
        setPatientForm({
          first_name: "", last_name: "", phone: "", gender: "Male", age: "", address: "", case_category: "",
          total_agreed_price: "", initial_payment: "", payment_method: "Cash", notes: ""
        });
        alert(t("تمت إضافة المريض بنجاح ✅"));
      }
    } catch (e) {
      console.error(e);
      alert(t("حدث خطأ أثناء إضافة المريض"));
    }
    setPatientSaving(false);
  };
"""

# replace quickAddPatient with handleAddPatientSubmit + quickAddPatient wrapper
wrapper_str = """
  const quickAddPatient = () => {
    // Just open the full patient modal
    const parts = searchTerm.trim().split(" ");
    const fname = parts[0] || "";
    const lname = parts.slice(1).join(" ") || "";
    setPatientForm({ ...patientForm, first_name: fname, last_name: lname });
    setShowPatientModal(true);
  };
"""

content = re.sub(r'const quickAddPatient = async \(\) => \{.*?(?=\n  const handleAddClick)', handle_submit_str + wrapper_str, content, flags=re.DOTALL)

# 3. Add the Modal JSX
modal_jsx = """
      {showPatientModal && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto", padding: "40px 10px" }}>
          <div className="glass-panel animate-fade" style={{ width: "100%", maxWidth: 650, padding: 32, maxHeight: "95vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 32, textAlign: "center" }}>{t("إضافة مريض جديد")}</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><label className="input-label">{t("الاسم الأول")}</label><input className="glass-input" style={{ width: "100%" }} value={patientForm.first_name} onChange={e => setPatientForm({ ...patientForm, first_name: e.target.value })} /></div>
                <div><label className="input-label">{t("اسم العائلة")}</label><input className="glass-input" style={{ width: "100%" }} value={patientForm.last_name} onChange={e => setPatientForm({ ...patientForm, last_name: e.target.value })} /></div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><label className="input-label">{t("رقم الهاتف")}</label><input className="glass-input" style={{ width: "100%" }} value={patientForm.phone} onChange={e => setPatientForm({ ...patientForm, phone: e.target.value })} /></div>
                <div><label className="input-label">{t("العمر")}</label><input type="number" className="glass-input" style={{ width: "100%" }} value={patientForm.age} onChange={e => setPatientForm({ ...patientForm, age: e.target.value })} /></div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><label className="input-label">{t("العنوان")}</label><input className="glass-input" style={{ width: "100%" }} value={patientForm.address} onChange={e => setPatientForm({ ...patientForm, address: e.target.value })} /></div>
                <div>
                  <label className="input-label">{t("الجنس")}</label>
                  <select className="glass-input" style={{ width: "100%", height: 44 }} value={patientForm.gender} onChange={e => setPatientForm({ ...patientForm, gender: e.target.value })}>
                    <option value="Male">{t("ذكر")}</option>
                    <option value="Female">{t("أنثى")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">{t("نوع الحالة")}</label>
                <select className="glass-input" style={{ width: "100%", height: 44 }} value={patientForm.case_category} onChange={e => setPatientForm({ ...patientForm, case_category: e.target.value })}>
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
                <input type="text" className="glass-input" style={{ width: "100%" }} placeholder="IQD" value={patientForm.total_agreed_price ? Number(patientForm.total_agreed_price).toLocaleString() : ""} onChange={e => setPatientForm({ ...patientForm, total_agreed_price: e.target.value.replace(/\\D/g, "") })} />
              </div>
              
              <div style={{ marginTop: 4 }}>
                <label className="input-label">{t("الدفعة الأولى (د.ع)")}</label>
                <input type="text" className="glass-input" style={{ width: "100%" }} placeholder="IQD" value={patientForm.initial_payment ? Number(patientForm.initial_payment).toLocaleString() : ""} onChange={e => setPatientForm({ ...patientForm, initial_payment: e.target.value.replace(/\\D/g, "") })} />
              </div>

              <div style={{ marginTop: 4 }}>
                <label className="input-label">{t("ملاحظات طبية / عامة")}</label>
                <textarea className="glass-input" style={{ width: "100%", minHeight: 80 }} value={patientForm.notes} onChange={e => setPatientForm({ ...patientForm, notes: e.target.value })} />
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 40 }}>
                <button onClick={() => setShowPatientModal(false)} className="btn-ghost" style={{ width: 120 }}>{t("إلغاء")}</button>
                <button onClick={handleAddPatientSubmit} disabled={patientSaving} className="btn-primary" style={{ width: 200 }}>{patientSaving ? t("جاري الحفظ...") : t("إضافة المريض")}</button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
"""

# Insert modal JSX right before the final `</style>` or closing div of the component
content = content.replace("</style>", modal_jsx + "\n      </style>")

with open('frontend/src/pages/Appointments.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
