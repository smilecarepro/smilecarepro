import re

with open('frontend/src/pages/SecretaryDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

add_patient_old = r'<Modal title=\{t\("إضافة مريض جديد \+"\)\} onClose=\{\(\) => setShowAddPatient\(false\)\}>.*?</Modal>'

add_patient_new = """<Modal title={t("إضافة مريض جديد")} onClose={() => setShowAddPatient(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              <div><label className="input-label">{t("الاسم الأول")}</label><input className="glass-input" style={{ width: "100%" }} value={patientForm.first_name} onChange={e => setPatientForm({ ...patientForm, first_name: e.target.value })} /></div>
              <div><label className="input-label">{t("اسم العائلة")}</label><input className="glass-input" style={{ width: "100%" }} value={patientForm.last_name} onChange={e => setPatientForm({ ...patientForm, last_name: e.target.value })} /></div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              <div><label className="input-label">{t("رقم الهاتف")}</label><input className="glass-input" style={{ width: "100%" }} value={patientForm.phone} onChange={e => setPatientForm({ ...patientForm, phone: e.target.value })} /></div>
              <div><label className="input-label">{t("العمر")}</label><input type="number" className="glass-input" style={{ width: "100%" }} value={patientForm.age} onChange={e => setPatientForm({ ...patientForm, age: e.target.value })} /></div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              <div>
                <label className="input-label">{t("الجنس")}</label>
                <select className="glass-input" style={{ width: "100%", height: 44 }} value={patientForm.gender} onChange={e => setPatientForm({ ...patientForm, gender: e.target.value })}>
                  <option value="Male">{t("ذكر")}</option>
                  <option value="Female">{t("أنثى")}</option>
                </select>
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

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
              <button onClick={() => setShowAddPatient(false)} className="btn-ghost" style={{ width: 120 }}>{t("إلغاء")}</button>
              <button onClick={handleAddPatientSubmit} className="btn-primary" style={{ width: 200 }}>{t("إضافة المريض")}</button>
            </div>
          </div>
        </Modal>"""

content = re.sub(add_patient_old, lambda match: add_patient_new, content, flags=re.DOTALL)

add_apt_old = r'<Modal title=\{t\("حجز موعد جديد"\)\} onClose=\{\(\) => setShowAddApt\(false\)\}>.*?</Modal>'

add_apt_new = """<Modal title={t("إضافة موعد جديد")} onClose={() => setShowAddApt(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Search Patient Box */}
            <div>
              <label className="input-label">{t("المريض *")}</label>
              <div style={{ position: "relative" }}>
                <input 
                  className="glass-input" 
                  style={{ width: "100%", paddingRight: 40 }}
                  placeholder={t("بحث عن مريض...")}
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }}>🔍</span>
                {searchResults.length > 0 && (
                  <div style={{ 
                    position: "absolute", top: "105%", left: 0, width: "100%", 
                    background: "rgba(15, 23, 42, 0.98)", border: "1px solid var(--glass-border)",
                    borderRadius: 12, zIndex: 100, maxHeight: 150, overflowY: "auto"
                  }}>
                    {searchResults.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => {
                          setSelectedPatient(p);
                          setAptForm({ ...aptForm, patient_id: p.id, type: p.case_category || "" });
                          setSearchQuery(`${p.first_name} ${p.last_name}`);
                          setSearchResults([]);
                        }}
                        style={{ padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        {p.first_name} {p.last_name} ({p.phone || t("بلا هاتف")})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              <div>
                <label className="input-label">{t("التاريخ *")}</label>
                <input type="date" className="glass-input" value={aptForm.date} onChange={e => setAptForm({...aptForm, date: e.target.value})} style={{ width: "100%" }} />
              </div>
              <div>
                <label className="input-label">{t("الوقت *")}</label>
                <input type="time" className="glass-input" value={aptForm.time} onChange={e => setAptForm({...aptForm, time: e.target.value})} style={{ width: "100%" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              <div>
                <label className="input-label">{t("نوع العلاج")}</label>
                <select className="glass-input" value={aptForm.type} onChange={e => setAptForm({...aptForm, type: e.target.value})} style={{ width: "100%", height: 44 }}>
                  <option value="">{t("اختر...")}</option>
                  {getDynamicList('treatment_types', [
                    "فحص دوري", "تنظيف أسنان", "حشو ضرس", "خلع ضرس", "علاج عصب", "تلبيس ضرس", "تقويم أسنان", "تبييض أسنان", "زراعة", "أشعة", "استشارة", "أخرى"
                  ]).map(c => <option key={c} value={c}>{t(c)}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">{t("المدة (دقيقة)")}</label>
                <select className="glass-input" value={aptForm.duration_min} onChange={e => setAptForm({...aptForm, duration_min: parseInt(e.target.value)})} style={{ width: "100%", height: 44 }}>
                  {[15, 20, 30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} {t("دقيقة")}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="input-label">{t("الحالة")}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["booked", "treating", "finished", "postponed", "absent"].map(s => {
                  const sc = {
                    booked: { ar: "محجوز", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
                    treating: { ar: "في العيادة", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
                    finished: { ar: "مكتمل", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
                    postponed: { ar: "مؤجل", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
                    absent: { ar: "غائب", color: "#ef4444", bg: "rgba(239,68,68,0.1)" }
                  }[s];
                  
                  return (
                    <button key={s} onClick={() => setAptForm({ ...aptForm, status: s })}
                      style={{
                        flex: "1 1 100px", padding: "10px 4px", borderRadius: 10, border: `2px solid ${aptForm.status === s ? sc.color : "transparent"}`,
                        background: aptForm.status === s ? sc.bg : "rgba(255,255,255,0.04)",
                        color: aptForm.status === s ? sc.color : "var(--text-muted)",
                        fontWeight: 600, cursor: "pointer", fontSize: 12, transition: "all 0.15s"
                      }}>
                      {t(sc.ar)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="input-label">{t("ملاحظات")}</label>
              <input type="text" className="glass-input" value={aptForm.notes} onChange={e => setAptForm({...aptForm, notes: e.target.value})} style={{ width: "100%" }} placeholder={t("أي ملاحظات خاصة بالموعد...")} />
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 28, flexDirection: isMobile ? "column-reverse" : "row" }}>
              <button onClick={() => setShowAddApt(false)} className="btn-ghost" style={{ flex: 1, height: 48 }}>{t("إلغاء")}</button>
              <button onClick={handleAddAptSubmit} className="btn-primary" style={{ flex: 2, height: 48 }}>{t("✓ حفظ الموعد")}</button>
            </div>
          </div>
        </Modal>"""

content = re.sub(add_apt_old, lambda match: add_apt_new, content, flags=re.DOTALL)

with open('frontend/src/pages/SecretaryDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
