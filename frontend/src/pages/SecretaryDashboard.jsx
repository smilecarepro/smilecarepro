import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  getAppointments, 
  getPatients, 
  getPatient,
  addPatient, 
  addAppointment, 
  addInvoice, 
  addExpense, 
  getLatestSession, 
  addFine,
  updateAppointment, 
  updateTreatment,
  getPrescriptionPDFUrl, 
  BASE 
} from "../api";
import { useLanguage } from "../LanguageContext";
import { useSettings } from "../SettingsContext";
import { useAuth } from "../AuthContext";
import DatePicker from "../components/DatePicker";
import TimePicker from "../components/TimePicker";
import TeethMap3D from "../components/TeethMap3D";

const format12h = (timeStr, lang = "ar") => {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const isPm = hours >= 12;
  const ampm = isPm ? (lang === "ar" ? "م" : "PM") : (lang === "ar" ? "ص" : "AM");
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
};

const STATUS_CONFIG = {
  "booked":    { ar: "محجوز", icon: "📅", color: "#185FA5", bg: "rgba(24, 95, 165, 0.15)" },
  "waiting":   { ar: "في الانتظار", icon: "⏳", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" },
  "treating":  { ar: "قيد المعالجة", icon: "🦷", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
  "finished":  { ar: "منتهي", icon: "✅", color: "#065f46", bg: "rgba(6, 95, 70, 0.15)" },
  "postponed": { ar: "مؤجل", icon: "🕒", color: "#7c3aed", bg: "rgba(124, 58, 237, 0.15)" },
  "absent":    { ar: "غائب", icon: "❌", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },
};

const lblStyle = { display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 };

export default function SecretaryDashboard() {
  const { t, lang } = useLanguage();
  const nav = useNavigate();
  const { user } = useAuth();
  const { settings, getDynamicList } = useSettings();

  const [appointments, setAppointments] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Hidden appointment IDs for today (session hidden list)
  const [hiddenIds, setHiddenIds] = useState(() => {
    const saved = sessionStorage.getItem('today_hidden_ids');
    return saved ? JSON.parse(saved) : [];
  });

  // Modals visibility states
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddApt, setShowAddApt] = useState(false);
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  
  const [checkoutApt, setCheckoutApt] = useState(null);
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [checkoutPatient, setCheckoutPatient] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState(0); // 0=Review, 1=Finance
  const [paidToday, setPaidToday] = useState("");
  const [todayCostInput, setTodayCostInput] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);

  const [absentApt, setAbsentApt] = useState(null);
  const [absentStep, setAbsentStep] = useState(0); 
  const [fineAmount, setFineAmount] = useState("");
  const [savingFine, setSavingFine] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [patientForm, setPatientForm] = useState({
    first_name: "", last_name: "", phone: "", gender: "Male", age: "", address: "", case_category: "",
    total_agreed_price: "", initial_payment: "", payment_method: "Cash", notes: ""
  });

  const [aptForm, setAptForm] = useState({
    patient_id: "", date: "", time: "", type: "", duration_min: 30, status: "booked", notes: ""
  });

  const [invoiceForm, setInvoiceForm] = useState({
    patient_id: "", total_amount: "", paid_amount: "", payment_method: "Cash", notes: ""
  });

  const [expenseForm, setExpenseForm] = useState({
    category: "", amount: "", payment_method: "Cash", date: "", notes: ""
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getLocalDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const todayStr = getLocalDate();

  const loadSchedule = (silent = false) => {
    if (!silent) setLoadingSchedule(true);
    getAppointments(todayStr).then(data => {
      if (Array.isArray(data)) {
        const filtered = data.filter(app => app.status !== "completed");
        const mapped = filtered.map(app => {
          let s = app.status;
          if (s === "قادم" || s === "محجوز") s = "booked";
          if (s === "في الانتظار") s = "waiting";
          if (s === "قيد المعالجة") s = "treating";
          if (s === "منتهي") s = "finished";
          if (s === "مؤجل") s = s = "postponed";
          if (s === "غائب") s = "absent";
          return { ...app, status: s };
        });
        const sorted = mapped.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
        setAppointments(prev => {
          if (JSON.stringify(prev) === JSON.stringify(sorted)) return prev;
          return sorted;
        });
      }
      if (!silent) setLoadingSchedule(false);
    }).catch(err => {
      console.error(err);
      if (!silent) setLoadingSchedule(false);
    });
  };

  useEffect(() => {
    loadSchedule();
    const interval = setInterval(() => loadSchedule(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const cycleStatus = async (id, current) => {
    const order = ["booked", "waiting", "treating", "finished", "postponed", "absent"];
    const idx = order.indexOf(current);
    const next = order[idx === -1 ? 0 : (idx + 1) % order.length];
    
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: next } : a));
    try {
      await updateAppointment(id, { status: next });
      loadSchedule();
    } catch (e) {
      console.error(e);
      loadSchedule();
    }
  };

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      getPatients(searchQuery)
        .then(res => setSearchResults(res || []))
        .catch(console.error);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleCheckoutClick = async (app) => {
    setCheckoutApt(app);
    setCheckoutStep(0);
    setLoadingSession(true);
    try {
      const sessionInfo = await getLatestSession(app.patient_id);
      setCheckoutSession(sessionInfo);
      const exactPatient = await getPatient(app.patient_id);
      setCheckoutPatient(exactPatient);
      
      const sessionCost = sessionInfo.treatments?.reduce((acc, curr) => acc + (parseFloat(curr.cost) || 0), 0) || 0;
      setTodayCostInput(String(sessionCost));
      const outstanding = exactPatient ? exactPatient.debt : 0;
      setPaidToday(outstanding > 0 ? String(outstanding) : "");
      
      setLoadingSession(false);
    } catch (e) {
      console.error(e);
      alert(t("فشل تحميل معلومات الجلسة"));
      setLoadingSession(false);
      setCheckoutApt(null);
    }
  };

  const printReceiptIframe = (receipt) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Receipt - ${receipt.patient_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
            body { direction: rtl; font-family: 'Cairo', sans-serif; padding: 20px; }
            .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #ccc; }
          </style>
        </head>
        <body>
          <h2>${settings?.clinic_name || "SmileCare"}</h2>
          <div class="row"><span>التاريخ:</span><span>${receipt.date}</span></div>
          <div class="row"><span>المريض:</span><span>${receipt.patient_name}</span></div>
          <div class="row"><span>المسدد:</span><span>${receipt.paid.toLocaleString()} د.ع</span></div>
          <div class="row"><span>المتبقي:</span><span>${receipt.remaining.toLocaleString()} د.ع</span></div>
        </body>
      </html>
    `);
    doc.close();
    setTimeout(() => { iframe.contentWindow.print(); setTimeout(() => document.body.removeChild(iframe), 1000); }, 300);
  };

  const submitCheckoutPayment = async () => {
    setSavingPayment(true);
    try {
      const initialSessionCost = checkoutSession.treatments?.reduce((acc, curr) => acc + (parseFloat(curr.cost) || 0), 0) || 0;
      const todayCost = parseFloat(todayCostInput) || 0;

      if (todayCost !== initialSessionCost && checkoutSession.treatments?.length > 0) {
        for (let i = 0; i < checkoutSession.treatments.length; i++) {
          await updateTreatment(checkoutSession.treatments[i].id, { ...checkoutSession.treatments[i], cost: i === 0 ? todayCost : 0 });
        }
      }

      const prevDebt = checkoutPatient.debt - initialSessionCost;
      const totalOutstanding = prevDebt + todayCost;
      const paidAmt = parseFloat(paidToday) || 0;
      const remainingDebt = totalOutstanding - paidAmt;

      if (paidAmt > 0) {
        await addInvoice({ patient_id: checkoutPatient.id, total_amount: 0, paid_amount: paidAmt, payment_method: "Cash", notes: t("تصفية اليوم"), date: todayStr });
      }

      const receipt = { date: todayStr, patient_name: checkoutPatient.first_name + " " + checkoutPatient.last_name, paid: paidAmt, remaining: remainingDebt };
      await updateAppointment(checkoutApt.id, { status: "completed" });
      setAppointments(prev => prev.map(a => a.id === checkoutApt.id ? {...a, status: "completed"} : a));
      setCheckoutApt({...checkoutApt, paymentDetails: receipt});
      setPaymentSuccess(true);
      setSavingPayment(false);
      const newHidden = [...hiddenIds, checkoutApt.id];
      setHiddenIds(newHidden);
      sessionStorage.setItem('today_hidden_ids', JSON.stringify(newHidden));
    } catch (e) {
      console.error(e);
      setSavingPayment(false);
      alert(t("فشل الحفظ"));
    }
  };

  const handleAbsentClick = (app) => {
    setAbsentApt(app);
    setAbsentStep(0);
    setFineAmount("");
  };

  const submitAbsentFine = async () => {
    const amt = parseFloat(fineAmount) || 0;
    if (amt > 0) {
      setSavingFine(true);
      try {
        await addFine(absentApt.patient_id, amt, t("غرامة غياب"));
        setSavingFine(false);
        setAbsentStep(1);
      } catch (e) {
        console.error(e);
        setSavingFine(false);
      }
    } else {
      setAbsentStep(1);
    }
  };

  const handleAddPatientSubmit = async () => {
    if (!patientForm.first_name) return alert(t("يرجى إدخال اسم المريض"));
    try {
      await addPatient(patientForm);
      setShowAddPatient(false);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: t("تمت إضافة المريض بنجاح"), type: "success" } }));
    } catch (e) { alert(t("خطأ")); }
  };

  const handleAddAptSubmit = async () => {
    const pid = selectedPatient?.id || aptForm.patient_id;
    if (!pid) return alert(t("يرجى اختيار مريض"));
    try {
      await addAppointment({ ...aptForm, patient_id: pid });
      setShowAddApt(false);
      loadSchedule();
    } catch (e) { alert(t("فشل")); }
  };

  const handleAddInvoiceSubmit = async () => {
    if (!selectedPatient?.id) return alert(t("يرجى اختيار مريض"));
    try {
      await addInvoice({ ...invoiceForm, patient_id: selectedPatient.id, date: todayStr });
      setShowAddInvoice(false);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: t("تم"), type: "success" } }));
    } catch (e) { alert(t("فشل")); }
  };

  const handleAddExpenseSubmit = async () => {
    try {
      await addExpense({ ...expenseForm, date: expenseForm.date || todayStr });
      setShowAddExpense(false);
    } catch (e) { alert(t("فشل")); }
  };

  return (
    <div className="animate-fade" style={{ direction: "rtl", textAlign: "right" }}>
      <div className="glass-panel" style={{ padding: 20, marginBottom: 28, borderRadius: 24 }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 800, color: "var(--primary)" }}>⚡ {t("العمليات السريعة بالاستقبال")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(6, 1fr)", gap: 12 }}>
          <button onClick={() => setShowAddPatient(true)} className="quick-btn-luxury">👤 {t("إضافة مريض")}</button>
          <button onClick={() => setShowAddApt(true)} className="quick-btn-luxury">📅 {t("إضافة موعد")}</button>
          <button onClick={() => setShowAddInvoice(true)} className="quick-btn-luxury">🧾 {t("فاتورة")}</button>
          <button onClick={() => setShowAddExpense(true)} className="quick-btn-luxury">📉 {t("مصروفات")}</button>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 850, margin: 0 }}>📋 {t("جدول مواعيد اليوم")}</h2>
          <button onClick={loadSchedule} className="btn-secondary">🔄 {t("تحديث")}</button>
        </div>

        {loadingSchedule ? (
          <div style={{ textAlign: "center", padding: 80 }}>{t("جاري التحميل...")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {appointments.filter(app => !hiddenIds.includes(app.id)).map((app, index) => (
                <div key={app.id} className="glass-panel" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{app.patient_name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{format12h(app.time, lang)} - {t(app.type)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => cycleStatus(app.id, app.status)} style={{ padding: "6px 12px", borderRadius: 8 }}>{t(STATUS_CONFIG[app.status]?.ar || "حالة")}</button>
                    {(app.status === "finished" || app.status === "postponed" || app.status === "absent") && (
                      <button onClick={() => app.status === "finished" ? handleCheckoutClick(app) : handleAbsentClick(app)} className="btn-primary">✔️</button>
                    )}
                  </div>
                </div>
            ))}
          </div>
        )}
      </div>

      {checkoutApt && (
        <Modal title={t("تخليص حساب المريض")} onClose={() => {
          setCheckoutApt(null);
          setCheckoutPatient(null);
          setPaymentSuccess(false);
        }}>
          {loadingSession ? (
            <div style={{ textAlign: "center", padding: 60 }}>{t("جاري التحميل...")}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {paymentSuccess && checkoutPatient ? (
                <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", padding: 20 }}>
                  <div style={{ fontSize: 50, color: "#10b981" }}>✅</div>
                  <h3>{t("تم حفظ الجلسة وتسديد الحساب بنجاح!")}</h3>
                  <div style={{ display: "flex", gap: 16, marginTop: 20, width: "100%" }}>
                    <button className="btn-primary" onClick={() => printReceiptIframe(checkoutApt.paymentDetails)} style={{ flex: 1 }}>🖨️ {t("طباعة الوصل المالي")}</button>
                    <button className="btn-primary" onClick={() => window.print()} style={{ flex: 1, background: "linear-gradient(135deg, #0ea5e9, #2563eb)" }}>🖨️ {t("طباعة الملخص الطبي")}</button>
                  </div>
                  <button className="btn-secondary" style={{ width: "100%" }} onClick={() => { setCheckoutApt(null); setPaymentSuccess(false); }}>{t("إغلاق")}</button>
                </div>
              ) : checkoutStep === 0 ? (
                <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: "var(--primary)" }}>📋 {t("الملخص الطبي للجلسة")}</h3>
                  {checkoutSession?.prescription ? (
                      <div style={{ background: "rgba(236, 72, 153, 0.05)", border: "1px solid rgba(236, 72, 153, 0.15)", borderRadius: 12, padding: 14 }}>
                        <div><strong>{t("التشخيص:")}</strong> {checkoutSession.prescription.diagnosis || t("علاج أسنان")}</div>
                        <div style={{ marginTop: 8 }}>
                          <strong>{t("الأدوية الموصوفة:")}</strong>
                          <div style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>{checkoutSession.prescription.meds}</div>
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>{t("لم يصرف الطبيب وصفة ذكية في هذه الجلسة.")}</p>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                    <button 
                      className="btn-secondary" 
                      onClick={printPrescription}
                      disabled={!checkoutSession?.prescription}
                      style={{ flex: 1, borderColor: "rgba(236, 72, 153, 0.4)", color: "#ec4899" }}
                    >
                      🖨️ {t("طباعة الوصفة الطبية")}
                    </button>
                    <button 
                      className="btn-primary" 
                      onClick={() => setCheckoutStep(1)}
                      style={{ flex: 1 }}
                    >
                      {t("التالي: تصفية الحساب المالي")} →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Invoice breakdown & payment */}
              {checkoutStep === 1 && (
                <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: "var(--primary)" }}>💰 {t("الملخص المالي والتحصيل")}</h3>
                  
                  {checkoutPatient && (
                    <div style={{ 
                      background: "rgba(255,255,255,0.02)", 
                      border: "1px solid rgba(255,255,255,0.05)", 
                      borderRadius: 16, 
                      padding: 16, 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: 12 
                    }}>
                      {/* Previous Debt calculation */}
                      {(() => {
                        const initialSessionCost = checkoutSession?.treatments?.reduce((acc, curr) => acc + (parseFloat(curr.cost) || 0), 0) || 0;
                        const prevDebt = checkoutPatient.debt - initialSessionCost;
                        const todayCost = parseFloat(todayCostInput) || 0;
                        const totalOutstanding = prevDebt + todayCost;
                        const remainingDebt = totalOutstanding - (parseFloat(paidToday) || 0);

                        return (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--text-muted)" }}>{t("الديون السابقة للمريض (قبل اليوم):")}</span>
                              <strong style={{ fontSize: 15 }}>{prevDebt.toLocaleString()} د.ع</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ color: "var(--text-muted)" }}>{t("تكلفة علاج اليوم:")}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input 
                                  type="text"
                                  value={todayCostInput ? Number(todayCostInput).toLocaleString() : ""}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "");
                                    setTodayCostInput(val);
                                    
                                    const newCost = parseFloat(val) || 0;
                                    const newOutstanding = prevDebt + newCost;
                                    setPaidToday(newOutstanding > 0 ? String(newOutstanding) : "");
                                  }}
                                  style={{ 
                                    width: 120, 
                                    padding: "6px 10px", 
                                    borderRadius: 8, 
                                    border: "1px solid rgba(255,255,255,0.15)", 
                                    background: "#0d1527", 
                                    color: "white", 
                                    textAlign: "right",
                                    fontSize: 14,
                                    fontWeight: "bold"
                                  }}
                                />
                                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>د.ع</span>
                              </div>
                            </div>
                            <div style={{ 
                              display: "flex", 
                              justifyContent: "space-between", 
                              borderTop: "1px dashed rgba(255,255,255,0.08)", 
                              paddingTop: 10,
                              background: "rgba(0, 210, 255, 0.05)",
                              padding: "8px 12px",
                              borderRadius: 10
                            }}>
                              <span style={{ color: "var(--primary)", fontWeight: 700 }}>{t("إجمالي المطلوب (شامل اليوم):")}</span>
                              <strong style={{ fontSize: 18, color: "var(--primary)" }}>{totalOutstanding.toLocaleString()} د.ع</strong>
                            </div>
                            <div style={{ 
                              display: "flex", 
                              justifyContent: "space-between",
                              borderTop: "1px dashed rgba(255,255,255,0.08)",
                              paddingTop: 10,
                              color: "#ef4444"
                            }}>
                              <span>{t("المتبقي كدين بعد دفعة اليوم:")}</span>
                              <strong style={{ fontSize: 16 }}>{remainingDebt.toLocaleString()} د.ع</strong>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label className="input-label" style={{ fontWeight: 800 }}>💰 {t("المبلغ المقبوض والمسدد الآن:")}</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder={t("أدخل المبلغ د.ع")}
                      value={paidToday ? Number(paidToday).toLocaleString() : ""}
                      onChange={e => setPaidToday(e.target.value.replace(/\D/g, ""))}
                      style={{ width: "100%", height: 48, fontSize: 16, fontWeight: 700, color: "#10b981" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                    <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setCheckoutStep(0)}>
                      ← {t("السابق")}
                    </button>
                    <button 
                      className="btn-primary" 
                      style={{ flex: 2, height: 48, background: "linear-gradient(135deg, #10b981, #059669)", border: "none", fontWeight: 800 }}
                      onClick={submitCheckoutPayment}
                      disabled={savingPayment}
                    >
                      {savingPayment ? t("جاري الحفظ...") : `💳 ${t("حفظ وتسديد الحساب")}`}
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}
        </Modal>
      )}

      {/* ── Absent / Postponed Checkout Modal ── */}
      {absentApt && (
        <Modal title={t("تصفية الموعد (تأجيل أو غياب)")} onClose={() => setAbsentApt(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            
            {/* Step 1: Add fine */}
            {absentStep === 0 && (
              <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>⚠️ {t("هل تريد تسجيل غرامة مالية على المريض؟")}</h3>
                <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>
                  {t("إذا قمت بإدخال غرامة مالية، فسيتم تسجيلها تلقائياً كدين مالي مضاف على كشف حساب المريض.")}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label className="input-label">{t("قيمة الغرامة المالية (د.ع):")}</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder={t("أدخل 0 أو قيمة الغرامة")}
                    value={fineAmount ? Number(fineAmount).toLocaleString() : ""}
                    onChange={e => setFineAmount(e.target.value.replace(/\D/g, ""))}
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setAbsentStep(1)}>
                    {t("تخطي بدون غرامة")}
                  </button>
                  <button 
                    className="btn-primary" 
                    style={{ flex: 2 }} 
                    onClick={submitAbsentFine}
                    disabled={savingFine}
                  >
                    {savingFine ? t("جاري التسجيل...") : t("تسجيل وتأكيد الغرامة")}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Ask re-book */}
            {absentStep === 1 && (
              <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "center" }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>📅 {t("هل تريد جدولة موعد بديل للمريض الآن؟")}</h3>
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  {t("يمكنك حجز موعد جديد للمريض في الأيام القادمة مباشرة.")}
                </p>

                <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                  <button 
                    className="btn-secondary" 
                    style={{ flex: 1 }} 
                    onClick={() => {
                      // Just hide the patient from today schedule list
                      const newHidden = [...hiddenIds, absentApt.id];
                      setHiddenIds(newHidden);
                      sessionStorage.setItem('today_hidden_ids', JSON.stringify(newHidden));
                      setAbsentApt(null);
                      loadSchedule();
                    }}
                  >
                    {t("لا، إغلاق وتصفية")}
                  </button>
                  <button 
                    className="btn-primary" 
                    style={{ flex: 1 }}
                    onClick={() => {
                      // Open Add Appointment Modal pre-filled
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
                      
                      setAptForm({
                        patient_id: absentApt.patient_id,
                        date: tomorrowStr,
                        time: absentApt.time,
                        type: absentApt.type,
                        duration_min: absentApt.duration_min,
                        status: "booked",
                        notes: t("موعد بديل معاد جدولته لعدم الحضور اليوم")
                      });
                      setSearchQuery(absentApt.patient_name);
                      
                      // Hide patient from today list first
                      const newHidden = [...hiddenIds, absentApt.id];
                      setHiddenIds(newHidden);
                      sessionStorage.setItem('today_hidden_ids', JSON.stringify(newHidden));
                      
                      setAbsentApt(null);
                      setShowAddApt(true);
                    }}
                  >
                    {t("نعم، حجز موعد جديد")}
                  </button>
                </div>
              </div>
            )}

          </div>
        </Modal>
      )}

      {/* Styled inline components styles */}
      <style>{`
        .quick-btn-luxury {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: white;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .quick-btn-luxury:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
        }
        .list-row-card:hover {
          transform: translateX(-4px);
          background: rgba(255, 255, 255, 0.03) !important;
          border-color: var(--primary) !important;
        }
      `}</style>

    </div>
  );
}

// Modal component wrapper with luxury styling
function Modal({ title, onClose, children, width = 500 }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.7)", 
      backdropFilter: "blur(6px)", zIndex: 100002, 
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div className="glass-panel animate-fade" style={{ 
        width: "100%", maxWidth: width, borderRadius: 24, padding: 28,
        border: "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 25px 80px rgba(0, 0, 0, 0.5)",
        background: "rgba(15, 23, 42, 0.98)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "white", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 12 }}>✕</button>
        </div>
        <div style={{ maxHeight: "calc(80vh - 100px)", overflowY: "auto", paddingRight: 4 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
