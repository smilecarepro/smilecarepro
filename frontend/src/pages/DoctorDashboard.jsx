import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAppointments, getPatient, saveTeeth, addTreatment, updateAppointment, addAppointment, addInvoice, createSmartPrescription, BASE } from "../api";
import { useLanguage } from "../LanguageContext";
import { useSettings } from "../SettingsContext";
import { useAuth } from "../AuthContext";
import { useSession } from "../SessionContext";
import TeethMap from "../components/TeethMap";
import TeethMap3D from "../components/TeethMap3D";
import PrescriptionModal from "../components/PrescriptionModal";

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

export default function DoctorDashboard() {
  const { t, lang } = useLanguage();
  const nav = useNavigate();
  const { user } = useAuth();
  const { settings, getDynamicList } = useSettings();
  const { activeSession, startSession, updateSessionData, updateSessionStep, clearSession } = useSession();

  // Schedule States
  const [appointments, setAppointments] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Active Session Patient Data (loaded when session is active)
  const [activePatient, setActivePatient] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [mapMode, setMapMode] = useState("3D");
  const [isSavingSession, setIsSavingSession] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getLocalDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const todayStr = getLocalDate();

  const mapStatus = (s) => {
    if (s === "قادم" || s === "محجوز") return "booked";
    if (s === "في الانتظار") return "waiting";
    if (s === "قيد المعالجة") return "treating";
    if (s === "منتهي") return "finished";
    if (s === "مؤجل") return "postponed";
    if (s === "غائب") return "absent";
    return s;
  };

  const loadSchedule = (silent = false) => {
    if (!silent) setLoadingSchedule(true);
    getAppointments(todayStr).then(data => {
      if (Array.isArray(data)) {
        const filtered = data.filter(app => app.status !== "completed");
        const mapped = filtered.map(app => ({ ...app, status: mapStatus(app.status) }));
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
    if (!activeSession) {
      loadSchedule();
      // Auto-refresh silently every 10 seconds without UI churn
      const interval = setInterval(() => loadSchedule(true), 10000);
      return () => clearInterval(interval);
    }
  }, [activeSession]);

  useEffect(() => {
    if (activeSession?.patientId) {
      setLoadingPatient(true);
      getPatient(activeSession.patientId)
        .then(data => {
          setActivePatient(data);
          if (!activeSession.sessionData?.teeth) {
            updateSessionData({ teeth: data.teeth || {} });
          }
          setLoadingPatient(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingPatient(false);
        });
    } else {
      setActivePatient(null);
    }
  }, [activeSession?.patientId]);

  const handleStartSession = async (app) => {
    try {
      const { updateAppointment } = await import("../api");
      await updateAppointment(app.id, { status: "treating" });
      
      setLoadingPatient(true);
      const patientData = await getPatient(app.patient_id);
      
      startSession(app.patient_id, app.patient_name, {
        teeth: patientData.teeth || {},
        treatments: [],
        current: { tooth: "", procedure: "", cost: "", notes: "" },
        meds: [],
        paid: "",
        photo: null
      });
      
      setLoadingPatient(false);
    } catch (e) {
      console.error("Failed to start session:", e);
      alert(t("فشل بدء الجلسة، يرجى المحاولة لاحقاً"));
      setLoadingPatient(false);
    }
  };

  const handleFinishSession = async () => {
    if (isSavingSession) return;
    setIsSavingSession(true);
    
    const pid = activeSession.patientId;
    const sessionData = activeSession.sessionData;
    
    try {
      if (sessionData.teeth) {
        await saveTeeth(pid, sessionData.teeth);
      }
      
      for (const tr of sessionData.treatments) {
        await addTreatment(pid, { 
          tooth_number: tr.tooth, 
          procedure: tr.procedure, 
          cost: parseFloat(tr.cost || 0),
          notes: tr.notes,
          date: todayStr
        });
      }
      
      const todayVisits = activePatient?.visits || [];
      const todayApt = todayVisits.find(v => v.date === todayStr);
      const teethSnapshot = JSON.stringify(sessionData.teeth || {});
      
      if (todayApt) {
        await updateAppointment(todayApt.id, { 
          status: 'finished', 
          teeth_snapshot: teethSnapshot, 
          image_url: sessionData.photo 
        });
      } else {
        await addAppointment({
          patient_id: pid, 
          date: todayStr,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          type: t("جلسة علاج"), 
          status: 'finished', 
          teeth_snapshot: teethSnapshot, 
          image_url: sessionData.photo
        });
      }
      
      if (sessionData.paid) {
        await addInvoice({
          patient_id: parseInt(pid), 
          total_amount: 0,
          paid_amount: parseFloat(sessionData.paid), 
          payment_method: "Cash",
          date: todayStr, 
          notes: t("دفعة جلسة تشمل: ") + sessionData.treatments.map(t => t.tooth).join(", ")
        });
      }
      
      if (sessionData.meds?.length > 0) {
        const diagStr = sessionData.treatments.map(t => t.procedure).join(", ");
        await createSmartPrescription({
          patient_id: parseInt(pid), 
          diagnosis: diagStr || "Dental Treatment",
          drugs: sessionData.meds, 
          custom_info: { 
            name: activePatient.first_name + " " + activePatient.last_name, 
            age: activePatient.age, 
            gender: activePatient.gender, 
            date: todayStr 
          }
        });
      }
      
      clearSession();
      nav(`/patients/${pid}`);
      window.dispatchEvent(new CustomEvent('show-toast', { 
        detail: { message: t("تم حفظ وإنهاء الجلسة بنجاح ✅"), type: "success" } 
      }));
    } catch (e) {
      console.error(e);
      alert(t("حدث خطأ أثناء حفظ الجلسة: ") + e.message);
    } finally {
      setIsSavingSession(false);
    }
  };

  const STATUS_CONFIG = {
    "booked":    { ar: "محجوز", icon: "📅", color: "#185FA5", bg: "rgba(24, 95, 165, 0.15)" },
    "waiting":   { ar: "في الانتظار", icon: "⏳", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" },
    "treating":  { ar: "قيد المعالجة", icon: "🦷", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
    "finished":  { ar: "منتهي", icon: "✅", color: "#065f46", bg: "rgba(6, 95, 70, 0.15)" },
    "postponed": { ar: "مؤجل", icon: "🕒", color: "#7c3aed", bg: "rgba(124, 58, 237, 0.15)" },
    "absent":    { ar: "غائب", icon: "❌", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },
  };

  if (!activeSession) {
    return (
      <div className="animate-fade" style={{ direction: "rtl", textAlign: "right" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 850, margin: 0 }}>🩺 {t("لوحة الطبيب المركزية")}</h1>
            <p style={{ color: "var(--text-muted)", marginTop: 8, fontSize: 16 }}>
              {new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button onClick={loadSchedule} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            🔄 {t("تحديث")}
          </button>
        </div>

        {loadingSchedule ? (
          <div style={{ textAlign: "center", padding: 80, fontSize: 18, color: "var(--text-muted)" }}>
            <div className="page-loader-spinner" style={{ margin: "0 auto 16px" }} />
            {t("جاري تحميل جدول مواعيد اليوم...")}
          </div>
        ) : appointments.length === 0 ? (
          <div className="glass-panel" style={{ padding: 80, textAlign: "center", fontSize: 20, color: "var(--text-muted)", borderRadius: 24 }}>
            📭 {t("لا توجد مواعيد مسجلة لهذا اليوم حتى الآن")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {appointments.map((app, index) => {
              const isNext = index === 0 && app.status === "booked";
              const isTreatable = ["waiting", "booked", "treating"].includes(app.status);
              
              return (
                <div key={app.id} 
                  onClick={() => nav(`/patients/${app.patient_id}`)}
                  className="glass-panel list-row-card animate-fade"
                  style={{
                    padding: isMobile ? 16 : 24,
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "stretch" : "center",
                    gap: isMobile ? 16 : 24,
                    cursor: "pointer",
                    borderRight: `6px solid ${(STATUS_CONFIG[app.status] || STATUS_CONFIG["booked"]).color}`,
                    background: app.status === "treating" ? "rgba(16, 185, 129, 0.05)" : "linear-gradient(90deg, rgba(255,255,255,0.02) 0%, transparent 100%)",
                    borderRadius: 20,
                    transition: "all 0.3s"
                  }}
                >
                  <div style={{
                    fontSize: isMobile ? 20 : 26,
                    fontWeight: 900,
                    minWidth: isMobile ? "auto" : 120,
                    color: "var(--primary)",
                    textAlign: "center",
                    background: "rgba(24, 95, 165, 0.12)",
                    padding: isMobile ? "8px" : "12px 20px",
                    borderRadius: 16,
                    flexShrink: 0
                  }}>
                    {format12h(app.time, lang)}
                    <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", marginTop: 4, fontWeight: 700 }}>{t("الوقت")}</div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                      <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, margin: 0, color: "white" }}>{app.patient_name}</h2>
                      {app.status === "treating" && (
                        <span className="badge-treating animate-pulse" style={{ background: "#10b981", color: "white", padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
                          {t("قيد المعالجة حالياً")}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, color: "var(--text-muted)", fontSize: 13 }}>
                      <span>🩺 {t(app.type) || t("فحص عام")}</span>
                      <span>⏱️ {app.duration_min} {t("دقيقة")}</span>
                      {app.notes && <span style={{ color: "var(--accent)" }}>📝 {app.notes}</span>}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: isMobile ? "space-between" : "flex-end" }} onClick={e => e.stopPropagation()}>
                    <div style={{
                      padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                      background: (STATUS_CONFIG[app.status] || STATUS_CONFIG["booked"]).bg,
                      color: (STATUS_CONFIG[app.status] || STATUS_CONFIG["booked"]).color,
                      display: "flex", alignItems: "center", gap: 6
                    }}>
                      <span>{(STATUS_CONFIG[app.status] || STATUS_CONFIG["booked"]).icon}</span>
                      <span>{t((STATUS_CONFIG[app.status] || STATUS_CONFIG["booked"]).ar)}</span>
                    </div>

                    {isTreatable && (
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleStartSession(app);
                        }}
                        style={{
                          padding: "10px 20px",
                          borderRadius: 12,
                          fontSize: 14,
                          fontWeight: 800,
                          background: "linear-gradient(135deg, #10b981, #059669)",
                          color: "white",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)",
                          transition: "all 0.2s"
                        }}
                        onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
                        onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
                      >
                        <span>🦷</span>
                        <span>{t("بدء الجلسة")}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const step = activeSession.step;
  const sessionData = activeSession.sessionData;

  return (
    <div className="animate-fade" style={{ direction: "rtl", textAlign: "right" }}>
      <div className="glass-panel" style={{ padding: 20, marginBottom: 24, borderRadius: 20, borderLeft: "6px solid var(--primary)", background: "rgba(24, 95, 165, 0.05)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>{t("جلسة معالجة نشطة")} ⚡</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 0 0", color: "white" }}>{activeSession.patientName}</h2>
          </div>
          {activePatient && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, fontSize: 14, background: "rgba(255,255,255,0.02)", padding: "10px 20px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
              <div><span style={{ color: "var(--text-muted)" }}>{t("العمر")}:</span> <strong>{activePatient.age || t("غير مسجل")}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>{t("الجنس")}:</span> <strong>{t(activePatient.gender) || t("غير مسجل")}</strong></div>
              {activePatient.systemic_conditions && (
                <div style={{ color: "#ef4444" }}><span style={{ color: "var(--text-muted)" }}>{t("أمراض مزمنة")}:</span> <strong>⚠️ {activePatient.systemic_conditions}</strong></div>
              )}
            </div>
          )}
          <button 
            onClick={() => {
              if (window.confirm(t("هل أنت متأكد من إنهاء جلسة العلاج الحالية والرجوع للجدول اليومي؟"))) {
                clearSession();
              }
            }}
            className="btn-secondary" 
            style={{ color: "#ff4444", borderColor: "rgba(239, 68, 68, 0.3)" }}
          >
            ✕ {t("إلغاء الجلسة")}
          </button>
        </div>
      </div>

      {loadingPatient ? (
        <div style={{ textAlign: "center", padding: 100, fontSize: 18, color: "var(--text-muted)" }}>
          <div className="page-loader-spinner" style={{ margin: "0 auto 16px" }} />
          {t("جاري تحميل بيانات المريض...")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="glass-panel" style={{ padding: "20px 24px", borderRadius: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
              {[t("التشخيص وتحديد السن"), t("تفاصيل الإجراء"), t("الوصفة الطبية"), t("صورة الجلسة"), t("حفظ وإنهاء الجلسة")].map((label, i) => {
                const isActive = step === i;
                const isCompleted = step > i;
                return (
                  <div key={i} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ 
                      height: 6, 
                      borderRadius: 3, 
                      background: isCompleted ? "var(--success)" : isActive ? "var(--primary)" : "rgba(255,255,255,0.05)",
                      transition: "all 0.3s",
                      marginBottom: 8
                    }} />
                    <span style={{ 
                      fontSize: 12, 
                      fontWeight: isActive || isCompleted ? 800 : 600, 
                      color: isCompleted ? "#10b981" : isActive ? "var(--primary)" : "var(--text-muted)"
                    }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="active-step-layout" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, alignItems: "start" }}>
            
            {step === 0 && (
            <div className="glass-panel animate-fade" style={{ padding: 24, minHeight: 400, borderRadius: 20 }}>
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 16, marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: 20 }}>🦷 {t("الخطوة 1: اختر السن المطلوب علاجه")}</h3>
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>
                    {t("انقر على السن من الخريطة بالأسفل، أو اضغط الزر لاختيار إجراء طبي عام يشمل كافة الأسنان.")}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <button 
                    onClick={() => {
                      updateSessionData({ current: { ...sessionData.current, tooth: "General" } });
                      updateSessionStep(1);
                    }}
                    className="btn-secondary"
                    style={{ padding: "10px 20px", borderRadius: 12, fontWeight: 800 }}
                  >
                    🌐 {t("إجراء عام")}
                  </button>
                  <div style={{ background: "rgba(255,255,255,0.05)", padding: 4, borderRadius: 12, display: "flex", gap: 4 }}>
                    <button onClick={() => setMapMode("2D")} style={{ padding: "8px 16px", fontSize: 13, borderRadius: 8, border: "none", background: mapMode === "2D" ? "var(--primary)" : "transparent", color: "white", fontWeight: 700, cursor: "pointer" }}>2D</button>
                    <button onClick={() => setMapMode("3D")} style={{ padding: "8px 16px", fontSize: 13, borderRadius: 8, border: "none", background: mapMode === "3D" ? "var(--primary)" : "transparent", color: "white", fontWeight: 700, cursor: "pointer" }}>3D ✨</button>
                  </div>
                </div>
              </div>

              {mapMode === "2D" ? (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <TeethMap 
                    pid={activeSession.patientId} 
                    initial={sessionData.teeth || {}} 
                    treatments={activePatient?.treatments || []}
                    onToothClick={(tid) => {
                      if (tid !== "Manual") {
                        updateSessionData({ current: { ...sessionData.current, tooth: tid } });
                        updateSessionStep(1);
                      }
                    }}
                    onAddTreatment={(tid) => {
                      updateSessionData({ current: { ...sessionData.current, tooth: tid } });
                      updateSessionStep(1);
                    }}
                  />
                </div>
              ) : (
                <div style={{ height: 500, width: "100%" }}>
                  <TeethMap3D 
                    pid={activeSession.patientId} 
                    data={sessionData.teeth || {}} 
                    treatments={activePatient?.treatments || []}
                    onChange={(newData) => updateSessionData({ teeth: newData })}
                    focusedTooth={sessionData.current?.tooth}
                    onToothClick={(tid) => {
                      if (tid !== "Manual") {
                        updateSessionData({ current: { ...sessionData.current, tooth: tid } });
                        updateSessionStep(1);
                      }
                    }}
                  />
                </div>
              )}

              {sessionData.treatments?.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
                  <div>
                    <h4 style={{ margin: "0 0 12px 0", fontSize: 14, color: "var(--success)", fontWeight: 800 }}>✅ {t("إجراءات مضافة في هذه الجلسة:")}</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {sessionData.treatments.map((tr, i) => (
                        <span key={i} style={{ 
                          fontSize: 12, 
                          background: "rgba(0, 210, 255, 0.15)", 
                          color: "var(--primary)", 
                          padding: "6px 14px", 
                          borderRadius: 12,
                          border: "1px solid rgba(0, 210, 255, 0.2)",
                          fontWeight: 700
                        }}>
                          {tr.tooth === "General" ? `🌐 ${t("عام")}` : `#${tr.tooth}`} : {tr.procedure}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button className="btn-primary" onClick={() => updateSessionStep(2)} style={{ padding: "10px 24px" }}>
                    {t("التالي: الوصفة الطبية")} →
                  </button>
                </div>
              )}
            </div>
            )}

            {(step > 0) && (
            <div className="glass-panel animate-fade" style={{ padding: 24, borderRadius: 20 }}>

              {step === 1 && (
                <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>
                    📋 {t("الخطوة 2: تفاصيل الإجراء")} ({sessionData.current?.tooth === "General" ? t("إجراء عام") : `#${sessionData.current?.tooth}`})
                  </h3>
                  
                  {sessionData.current?.tooth && sessionData.current?.tooth !== "General" && activePatient?.treatments?.some(tr => String(tr.tooth_number) === String(sessionData.current.tooth)) && (
                    <div style={{ background: "rgba(245, 158, 11, 0.05)", padding: 12, borderRadius: 12, border: "1px solid rgba(245, 158, 11, 0.15)", fontSize: 12 }}>
                      <div style={{ color: "#f59e0b", fontWeight: 800, marginBottom: 6 }}>🕒 {t("تاريخ العمل السابق على هذا السن")}:</div>
                      {activePatient.treatments.filter(tr => String(tr.tooth_number) === String(sessionData.current.tooth)).slice(-2).reverse().map((tr, i) => (
                        <div key={i} style={{ marginBottom: 4, opacity: 0.9 }}>
                          • {tr.date}: <strong>{tr.procedure}</strong> {tr.notes && `(${tr.notes})`}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label className="input-label" style={{ fontWeight: 700 }}>{t("الإجراء الطبي")}</label>
                    <select 
                      className="glass-input" 
                      value={sessionData.current?.procedure || ""} 
                      onChange={e => updateSessionData({ current: { ...sessionData.current, procedure: e.target.value } })}
                      style={{ width: "100%", height: 48 }}
                    >
                      <option value="" disabled>{t("-- اختر الإجراء --")}</option>
                      {getDynamicList("treatment_types", ["فحص دوري", "تنظيف أسنان", "حشو ضرس", "خلع ضرس", "علاج عصب", "تلبيس ضرس", "تقويم أسنان", "تبييض أسنان", "زراعة", "أشعة", "استشارة", "أخرى"]).map((trt, i) => (
                        <option key={i} value={trt}>{trt}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label className="input-label" style={{ fontWeight: 700 }}>{t("تكلفة الجلسة للمريض (اختياري)")}</label>
                    <input 
                      type="text" 
                      className="glass-input"
                      placeholder={t("د.ع")}
                      value={sessionData.current?.cost ? Number(sessionData.current.cost).toLocaleString() : ""} 
                      onChange={e => updateSessionData({ current: { ...sessionData.current, cost: e.target.value.replace(/\D/g, "") } })}
                      style={{ width: "100%", height: 48 }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label className="input-label" style={{ fontWeight: 700 }}>{t("ملاحظات طبية")}</label>
                    <textarea 
                      className="glass-input" 
                      placeholder={t("ملاحظات العلاج والتشخيص...")} 
                      style={{ minHeight: 120, padding: 12 }} 
                      value={sessionData.current?.notes || ""} 
                      onChange={e => updateSessionData({ current: { ...sessionData.current, notes: e.target.value } })} 
                    />
                  </div>

                  <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                    <button className="btn-secondary" style={{ flex: 1 }} onClick={() => updateSessionStep(0)}>
                      ← {t("رجوع للخلف")}
                    </button>
                    <button 
                      className="btn-ghost" 
                      style={{ flex: 1, borderColor: "var(--primary)" }} 
                      onClick={() => {
                        if (!sessionData.current?.procedure) return alert(t("يرجى اختيار الإجراء أولاً"));
                        const toothId = sessionData.current.tooth || "General";
                        updateSessionData({
                          treatments: [...sessionData.treatments, { ...sessionData.current, tooth: toothId }],
                          current: { tooth: "", procedure: "", cost: "", notes: "" }
                        });
                        updateSessionStep(0);
                      }}
                    >
                      ➕ {t("حفظ وإضافة سن آخر")}
                    </button>
                  </div>

                  <button 
                    className="btn-primary" 
                    style={{ width: "100%", height: 48 }} 
                    onClick={() => {
                      if (!sessionData.current?.procedure && sessionData.treatments?.length === 0) {
                        return alert(t("يرجى إدخال إجراء واحد على الأقل"));
                      }
                      let finalTreatments = [...sessionData.treatments];
                      if (sessionData.current?.procedure) {
                        const toothId = sessionData.current.tooth || "General";
                        finalTreatments.push({ ...sessionData.current, tooth: toothId });
                      }
                      updateSessionData({
                        treatments: finalTreatments,
                        current: { tooth: "", procedure: "", cost: "", notes: "" }
                      });
                      updateSessionStep(2);
                    }}
                  >
                    {t("حفظ والذهاب للوصفة")} →
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>💊 {t("الخطوة 3: كتابة الوصفة الطبية (اختياري)")}</h3>
                  
                  {activePatient && (
                    <PrescriptionModal 
                      patient={activePatient} 
                      onClose={() => updateSessionStep(3)} 
                      onAdd={(meds) => updateSessionData({ meds })}
                      initialMeds={sessionData.meds || []}
                      initialDiagnosis={sessionData.treatments?.map(t => t.procedure).join(", ")}
                      isWizard
                    />
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 24 }}>
                    <button className="btn-secondary" style={{ padding: "12px 24px" }} onClick={() => updateSessionStep(1)}>
                      ← {t("السابق")}
                    </button>
                    <button className="btn-primary" style={{ padding: "12px 32px" }} onClick={() => updateSessionStep(3)}>
                      {t("التالي: إضافة صورة")} →
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 18, textAlign: "center" }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>📸 {t("الخطوة 4: صورة أو مرفق الجلسة (اختياري)")}</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    {t("يمكنك التقاط صورة سريرية للأسنان أو إرفاق ملف أشعة للمريض في هذه الجلسة.")}
                  </p>
                  
                  <div style={{ margin: "10px 0" }}>
                    <input 
                      type="file" 
                      id="doc-session-photo-upload" 
                      accept="image/*" 
                      hidden 
                      onChange={e => {
                        const f = e.target.files[0];
                        if (f) {
                          const reader = new FileReader();
                          reader.onloadend = () => updateSessionData({ photo: reader.result });
                          reader.readAsDataURL(f);
                        }
                      }} 
                    />
                    <label htmlFor="doc-session-photo-upload" style={{ 
                      display: "block", height: 200, border: "2px dashed var(--primary)", 
                      borderRadius: 16, background: "rgba(0,210,255,0.02)", cursor: "pointer", 
                      overflow: "hidden", position: "relative" 
                    }}>
                      {sessionData.photo ? (
                        <img src={sessionData.photo} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
                          <span style={{ fontSize: 44, marginBottom: 12 }}>📷</span>
                          <span style={{ color: "var(--primary)", fontWeight: 700 }}>{t("انقر هنا لالتقاط أو اختيار صورة")}</span>
                        </div>
                      )}
                    </label>
                    {sessionData.photo && (
                      <button className="btn-ghost" style={{ marginTop: 10, color: "var(--danger)" }} onClick={() => updateSessionData({ photo: null })}>
                        🗑️ {t("إزالة الصورة")}
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 16 }}>
                    <button className="btn-secondary" style={{ padding: "12px 24px" }} onClick={() => updateSessionStep(2)}>
                      ← {t("السابق")}
                    </button>
                    <button className="btn-primary" style={{ padding: "12px 32px" }} onClick={() => updateSessionStep(4)}>
                      {t("التالي: الملخص والحفظ")} →
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>🏁 {t("الخطوة 5: ملخص الجلسة النهائي")}</h3>
                  
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 10 }}>
                      <strong>📝 {t("الإجراءات الطبية:")}</strong>
                      <ul style={{ paddingRight: 20, marginTop: 8, marginLeft: 0 }}>
                        {sessionData.treatments?.map((tr, i) => (
                          <li key={i} style={{ marginBottom: 6 }}>
                            {tr.tooth === "General" ? `🌐 ${t("عام")}` : `#${tr.tooth}`} - <strong>{tr.procedure}</strong> 
                            {tr.cost && ` (${parseFloat(tr.cost).toLocaleString()} د.ع)`}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {sessionData.meds?.length > 0 && (
                      <div style={{ marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 10 }}>
                        <strong>💊 {t("الأدوية الموصوفة:")}</strong>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {sessionData.meds.map((m, i) => (
                            <span key={i} style={{ fontSize: 11, background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: 8 }}>
                              {m.name} ({m.form}) - {m.dose}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <label className="input-label" style={{ fontWeight: 750 }}>💰 {t("المبلغ المقبوض حالياً (إن وجد)")}</label>
                      <input 
                        type="text" 
                        className="glass-input"
                        placeholder={t("أدخل المبلغ المسدد اليوم د.ع")}
                        value={sessionData.paid ? Number(sessionData.paid).toLocaleString() : ""} 
                        onChange={e => updateSessionData({ paid: e.target.value.replace(/\D/g, "") })}
                        style={{ width: "100%", height: 48 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                    <button className="btn-secondary" style={{ flex: 1 }} onClick={() => updateSessionStep(3)}>
                      ← {t("السابق")}
                    </button>
                    <button 
                      className="btn-primary" 
                      disabled={isSavingSession}
                      style={{ 
                        flex: 2, 
                        background: "linear-gradient(135deg, #10b981, #059669)", 
                        boxShadow: "0 8px 25px rgba(16, 185, 129, 0.3)",
                        border: "none",
                        height: 48,
                        fontWeight: 850
                      }}
                      onClick={handleFinishSession}
                    >
                      {isSavingSession ? t("جاري الحفظ والتسجيل...") : t("حفظ وإنهاء الجلسة ✓")}
                    </button>
                  </div>
                </div>
              )}

            </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
