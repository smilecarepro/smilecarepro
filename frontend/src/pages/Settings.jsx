import { useEffect, useState } from "react";
import { useLanguage } from '../LanguageContext';
import { getSettings, updateSettings, getGoogleAuth, downloadBackup, restoreBackup, resetClinic, uploadClinicLogo, BASE } from "../api";

import { useSettings } from "../SettingsContext";
import { useAuth } from "../AuthContext";
import ConfirmModal from "../components/ConfirmModal";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
export default function Settings() {
  const { t, lang, toggleLanguage } = useLanguage();
  const { refreshSettings, getDynamicList } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const DEFAULT_LISTS = {
    treatment_types: ["فحص دوري", "تنظيف أسنان", "حشو ضرس", "خلع ضرس", "علاج عصب", "تلبيس ضرس", "تقويم أسنان", "تبييض أسنان", "زراعة", "أشعة", "استشارة", "أخرى"],
    inventory_categories: ["Composite & Filling", "Bonding & Etching", "Impression Materials", "Endodontic Supplies", "Disposable (Gloves/Masks)", "Sterilization", "Instruments", "Orthodontics", "General"],
    payment_methods: ["نقدي (Cash)", "زين كاش", "مصرفي (Bank)"],
    med_categories: ["مضاد حيوي (Antibiotic)", "مسكن آلام (Analgesic)", "مضاد التهاب", "فيتامينات", "أخرى"],
    med_dosages: ["500 mg", "1 g", "250 mg", "5 ml", "10 ml", "Tab", "Cap"],
    med_frequencies: ["مرتين يومياً (كل 12 ساعة)", "3 مرات يومياً (كل 8 ساعات)", "مرة واحدة يومياً", "عند اللزوم"],
    med_durations: ["لمدة 3 أيام", "لمدة 5 أيام", "لمدة أسبوع", "لمدة 10 أيام", "لمدة أسبوعين"],
    expense_categories: ["إيجار العيادة", "رواتب الموظفين", "كهرباء ومولد", "مشتريات طبية", "صيانة", "أخرى"]
  };
  const [activeTab, setActiveTab] = useState(user?.role === 'secretary' ? "preferences" : "clinic");
  const [form, setForm] = useState({});
  const [secData, setSecData] = useState({ enabled: 0, password: "" });
  const [saving, setSaving] = useState(false);
  const [isLight, setIsLight] = useState(document.body.classList.contains("light-mode"));
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [confirmData, setConfirmData] = useState({ show: false, title: "", message: "", onConfirm: null, danger: false });
  const [resetModal, setResetModal] = useState({ show: false, password: "" });
  const [qrCode, setQrCode] = useState(null);
  const [qrStatus, setQrStatus] = useState("loading");


  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    getSettings().then(setForm).catch(console.error);
    if (user?.role === 'doctor') {
      import("../api").then(api => {
        api.getSecretarySettings().then(setSecData).catch(console.error);
      });
    }
  }, []);

  useEffect(() => {
    let interval;
    if (activeTab === "automation" && qrStatus !== "ready") {
      const fetchQR = async () => {
        try {
          const res = await fetch(`http://localhost:3001/qr/${user?.username}`);
          const data = await res.json();
          setQrStatus(data.status);
          if (data.status === "qr") setQrCode(data.qr);
        } catch (e) { console.error("WA Service not running"); }
      };
      fetchQR();
      interval = setInterval(fetchQR, 5000);
    }
    return () => clearInterval(interval);
  }, [activeTab, qrStatus]);


  const save = async () => {
    setSaving(true);
    await updateSettings(form).catch(console.error);
    refreshSettings();
    setSaving(false);
    alert(t("✓ تم الحفظ"));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("logo", file);
    try {
      setSaving(true);
      const res = await uploadClinicLogo(fd);
      if (res.ok) {
        setForm({ ...form, clinic_logo: res.url });
        refreshSettings();
        alert(t("✓ تم تحديث شعار العيادة بنجاح!"));
      }
    } catch (err) {
      alert("Error uploading logo: " + err.message);
    }
    setSaving(false);
  };

  const tabs = [
    { id: "clinic", label: t("بيانات العيادة"), icon: "🏢", roles: ["doctor"] },
    { id: "medical", label: t("الوصفات والرسائل"), icon: "📄", roles: ["doctor"] },
    { id: "lists", label: t("إدارة القوائم"), icon: "📋", roles: ["doctor"] },
    { id: "security", label: t("الأمان والنسخ"), icon: "🛡️", roles: ["doctor"] },
    { id: "automation", label: t("الأتمتة والذكاء الاصطناعي"), icon: "🤖", roles: ["doctor"] },
    { id: "preferences", label: t("المظهر واللغة"), icon: "🌐", roles: ["doctor", "secretary"] },
  ].filter(tab => tab.roles.includes(user?.role));

  const sidebarTabStyle = (id) => ({
    display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderRadius: 14, cursor: "pointer",
    background: activeTab === id ? "var(--primary)" : "transparent",
    color: activeTab === id ? "white" : "inherit",
    transition: "all 0.2s",
    fontWeight: activeTab === id ? 700 : 500,
    border: activeTab === id ? "none" : "1px solid transparent"
  });

  return (
    <div className="animate-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>⚙️ {t("إعدادات النظام")}</h2>
        <button onClick={save} disabled={saving} className="btn-primary" style={{ minWidth: 140 }}>
           {saving ? t("جاري الحفظ...") : `✨ ${t("حفظ التغييرات")}`}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "280px 1fr", gap: isMobile ? 20 : 40 }}>
        {/* Sidebar Tabs */}
        <div className="glass-panel" style={{ padding: 12, height: "fit-content", display: isMobile ? "flex" : "block", overflowX: isMobile ? "auto" : "visible", gap: 8 }}>
          {tabs.map(tab => (
            <div key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              ...sidebarTabStyle(tab.id),
              flexShrink: 0,
              padding: isMobile ? "10px 16px" : "14px 20px"
            }}>
              <span style={{ fontSize: isMobile ? 16 : 20 }}>{tab.icon}</span>
              <span style={{ fontSize: isMobile ? 12 : 14, whiteSpace: "nowrap" }}>{tab.label}</span>
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {activeTab === "clinic" && (
            <div className="glass-panel animate-fade" style={{ padding: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>🏢 {t("بيانات العيادة العامة")}</h3>
              
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 16 : 32, marginBottom: 32, alignItems: isMobile ? "flex-start" : "center" }}>
                <div style={{ width: 80, height: 80, borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px dashed rgba(255,255,255,0.1)", flexShrink: 0 }}>
                  {form.clinic_logo ? (
                    <img src={BASE + form.clinic_logo} alt="Clinic Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 24 }}>🦷</span>
                  )}
                </div>
                <div>
                  <h4 style={{ margin: "0 0 8px" }}>{t("شعار العيادة (Logo)")}</h4>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px" }}>{t("يستخدم في الفواتير والواجهة الرئيسية (ينصح بمقاس مربع)")}</p>
                  <label className="btn-primary" style={{ cursor: "pointer", padding: "8px 16px", display: "inline-block" }}>
                    {t("رفع شعار جديد")}
                    <input type="file" accept="image/*" hidden onChange={handleLogoUpload} />
                  </label>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 24 }}>
                {[
                  { k: "clinic_name",  l: "اسم العيادة" },
                  { k: "doctor_name",  l: "اسم الطبيب" },
                  { k: "phone",        l: "رقم الهاتف" },
                  { k: "address",      l: "عنوان العيادة" },
                ].map(f => (
                  <div key={f.k}>
                    <label style={lblStyle}>{t(f.l)}</label>
                    <input className="glass-input" style={{ width: "100%" }} 
                      value={form[f.k] || ""} onChange={e => setForm({ ...form, [f.k]: e.target.value })} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "medical" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="animate-fade">
              {/* Prescription Branding */}
              <div className="glass-panel" style={{ padding: 32 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>📜 {t("هوية الوصفة الطبية")}</h3>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 24 }}>
                   <div>
                     <label style={lblStyle}>{t("صورة رأس الوصفة (Header)")}</label>
                     <input type="file" id="h-up" hidden onChange={e => {
                       const f = e.target.files[0];
                       if(f){ const r=new FileReader(); r.onloadend=()=>setForm({...form, prescription_header:r.result}); r.readAsDataURL(f); }
                     }} />
                     <label htmlFor="h-up" className="btn-ghost" style={{ display: "block", height: 120, border: "2px dashed rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden", cursor: "pointer", background: "rgba(255,255,255,0.02)" }}>
                        {form.prescription_header ? <img src={form.prescription_header} style={{ width: "100%", height: "100%", objectFit: "contain", background: "white" }} /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 12, color: "var(--text-muted)" }}>{t("رفع صورة الرأس")}</div>}
                     </label>
                   </div>
                   <div>
                     <label style={lblStyle}>{t("صورة تذييل الوصفة (Footer)")}</label>
                     <input type="file" id="f-up" hidden onChange={e => {
                       const f = e.target.files[0];
                       if(f){ const r=new FileReader(); r.onloadend=()=>setForm({...form, prescription_footer:r.result}); r.readAsDataURL(f); }
                     }} />
                     <label htmlFor="f-up" className="btn-ghost" style={{ display: "block", height: 120, border: "2px dashed rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden", cursor: "pointer", background: "rgba(255,255,255,0.02)" }}>
                        {form.prescription_footer ? <img src={form.prescription_footer} style={{ width: "100%", height: "100%", objectFit: "contain", background: "white" }} /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 12, color: "var(--text-muted)" }}>{t("رفع صورة التذييل")}</div>}
                     </label>
                   </div>
                </div>
              </div>
              
              {/* Receipt Branding */}
              <div className="glass-panel" style={{ padding: 32, marginTop: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>🧾 {t("هوية الوصل المالي")}</h3>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 24 }}>
                   <div>
                     <label style={lblStyle}>{t("صورة رأس الوصل (Receipt Header)")}</label>
                     <input type="file" id="rh-up" hidden onChange={e => {
                       const f = e.target.files[0];
                       if(f){ const r=new FileReader(); r.onloadend=()=>setForm({...form, receipt_header:r.result}); r.readAsDataURL(f); }
                     }} />
                     <label htmlFor="rh-up" className="btn-ghost" style={{ display: "block", height: 120, border: "2px dashed rgba(16, 185, 129, 0.15)", borderRadius: 12, overflow: "hidden", cursor: "pointer", background: "rgba(16, 185, 129, 0.02)" }}>
                        {form.receipt_header ? <img src={form.receipt_header} style={{ width: "100%", height: "100%", objectFit: "contain", background: "white" }} /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 12, color: "#10b981" }}>{t("رفع صورة رأس الوصل")}</div>}
                     </label>
                   </div>
                   <div>
                     <label style={lblStyle}>{t("صورة تذييل الوصل (Receipt Footer)")}</label>
                     <input type="file" id="rf-up" hidden onChange={e => {
                       const f = e.target.files[0];
                       if(f){ const r=new FileReader(); r.onloadend=()=>setForm({...form, receipt_footer:r.result}); r.readAsDataURL(f); }
                     }} />
                     <label htmlFor="rf-up" className="btn-ghost" style={{ display: "block", height: 120, border: "2px dashed rgba(16, 185, 129, 0.15)", borderRadius: 12, overflow: "hidden", cursor: "pointer", background: "rgba(16, 185, 129, 0.02)" }}>
                        {form.receipt_footer ? <img src={form.receipt_footer} style={{ width: "100%", height: "100%", objectFit: "contain", background: "white" }} /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 12, color: "#10b981" }}>{t("رفع صورة تذييل الوصل")}</div>}
                     </label>
                   </div>
                </div>
              </div>

              {/* Messaging Templates */}
              <div className="glass-panel" style={{ padding: 32 }}>
                 <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>💬 {t("قوالب رسائل التواصل")}</h3>
                 <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>{t("استخدم {patient} و {date} و {time} للتخصيص التلقائي.")}</p>
                 <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {[
                      { k: "whatsapp_template_booking",  l: "رسالة تأكيد الموعد" },
                      { k: "whatsapp_template_reminder", l: "رسالة تذكير (اليوم)" },
                      { k: "whatsapp_template_followup", l: "رسالة متابعة بعد العلاج" },
                    ].map(tmp => (
                      <div key={tmp.k}>
                        <label style={lblStyle}>{t(tmp.l)}</label>
                        <textarea className="glass-input" style={{ width: "100%", minHeight: 80, padding: 12, fontSize: 13 }} 
                          value={form[tmp.k] || ""} onChange={e => setForm({ ...form, [tmp.k]: e.target.value })} />
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}


          {activeTab === "security" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="animate-fade">
               {/* Secretary Auth */}
               <div className="glass-panel" style={{ padding: 32 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>🔑 {t("وصول السكرتيرة")}</h3>
                  <div style={{ padding: 24, background: "rgba(0, 210, 255, 0.03)", borderRadius: 16, border: "1px solid rgba(0, 210, 255, 0.1)" }}>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <div>
                           <div style={{ fontWeight: 700 }}>{t("تفعيل حساب السكرتيرة")}</div>
                           <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("السماح بالدخول عبر كلمة مرور مخصصة")}</div>
                        </div>
                        <div onClick={async () => {
                          const n = !secData.enabled; setSecData({...secData, enabled: n});
                          const api = await import("../api"); await api.updateSecretarySettings({...secData, enabled: n?1:0});
                        }} style={{ width: 44, height: 22, borderRadius: 20, background: secData.enabled ? "var(--primary)" : "#475569", position: "relative", cursor: "pointer" }}>
                           <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 2, right: secData.enabled?2:24, transition: "all 0.2s" }} />
                        </div>
                     </div>
                     <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                        <div style={{ flex: 1 }}>
                           <label style={lblStyle}>{t("كلمة مرور السكرتيرة")}</label>
                           <input className="glass-input" style={{ width: "100%" }} type="text" value={secData.password || ""} onChange={e => setSecData({...secData, password: e.target.value})} />
                        </div>
                        <button className="btn-primary" style={{ height: 44, padding: "0 24px" }} onClick={async () => {
                          const api = await import("../api"); await api.updateSecretarySettings({...secData, enabled: secData.enabled?1:0}); alert(t("✓ تم الحفظ"));
                        }}>{t("تحديث")}</button>
                     </div>
                  </div>
               </div>

               {/* Backup & Tools */}
               <div className="glass-panel" style={{ padding: 32 }}>
                   <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>💾 {t("النسخ الاحتياطي والأدوات")}</h3>
                   
                   {/* Google Drive Integration */}
                   <div style={{ marginBottom: 24, padding: 24, background: "rgba(245, 158, 11, 0.03)", borderRadius: 16, border: "1px solid rgba(245, 158, 11, 0.1)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>☁️ {t("نسخ احتياطي شخصي (Google Drive)")}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("رفع نسخة تلقائية لحسابك الشخصي يومياً")}</div>
                        </div>
                        {form.google_refresh_token ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--success)", fontWeight: 700, fontSize: 13 }}>
                             <span>✅ {t("مرتبط حالياً")}</span>
                             <button className="btn-ghost" style={{ color: "var(--danger)", fontSize: 11, padding: "4px 8px" }} onClick={() => {
                               setConfirmData({
                                 show: true, title: t("إلغاء ربط Google Drive"), message: t("هل تريد إلغاء ربط Google Drive؟"),
                                 danger: true, onConfirm: () => { setForm({...form, google_refresh_token: null}); setConfirmData({show: false}); }
                               });
                             }}>{t("إلغاء")}</button>
                          </div>
                        ) : (
                          <button className="btn-primary" style={{ background: "#f59e0b" }} onClick={async () => {
                            try {
                              const data = await getGoogleAuth();
                              if (data.url) {
                                const win = window.open(data.url, "_blank", "width=600,height=700");
                                const timer = setInterval(() => {
                                  if (win.closed) {
                                    clearInterval(timer);
                                    window.location.reload(); // Refresh to get the new token status
                                  }
                                }, 1000);
                              }
                            } catch (e) { alert("Error connecting to Google"); }
                          }}>🔗 {t("ربط الحساب")}</button>
                        )}
                      </div>
                   </div>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                     <button onClick={() => window.open(downloadBackup())} 
                       className="glass-panel" style={{ padding: 20, textAlign: "center", cursor: "pointer", border: "1px solid rgba(255,255,255,0.05)" }}>
                       <div style={{ fontSize: 24, marginBottom: 8 }}>📥</div>
                       <div style={{ fontWeight: 600, fontSize: 13 }}>{t("تحميل نسخة احتياطية")}</div>
                     </button>

                     <button onClick={() => document.getElementById('res-up').click()} 
                       className="glass-panel" style={{ padding: 20, textAlign: "center", cursor: "pointer", border: "1px solid rgba(255,255,255,0.05)" }}>
                       <input type="file" id="res-up" hidden onChange={async (e) => {
                         const f=e.target.files[0]; if(!f) return;
                         setConfirmData({
                           show: true, title: t("استعادة من ملف"), message: t("هل أنت متأكد من استبدال كافة البيانات؟"), danger: true,
                           onConfirm: async () => {
                             setConfirmData({show: false});
                             const fd=new FormData(); fd.append('file',f);
                             await restoreBackup(fd);
                             alert(t("✓ تمت الاستعادة")); window.location.reload();
                           }
                         });
                         e.target.value = null; // reset input
                       }} />
                       <div style={{ fontSize: 24, marginBottom: 8 }}>📤</div>
                       <div style={{ fontWeight: 600, fontSize: 13 }}>{t("استعادة من ملف")}</div>
                     </button>
                  </div>
                  
                  <button onClick={() => navigate("/audit-log")} className="btn-ghost" style={{ width: "100%", marginTop: 24, textAlign: "center" }}>🔍 {t("سجل حركات النظام الكامل")}</button>
                  <button onClick={() => {
                    setConfirmData({
                      show: true, title: t("تصفير بيانات العيادة نهائياً"), message: t("⚠️ تصفير كافة البيانات سيؤدي لحذف كل المرضى والمواعيد. هل تريد المتابعة؟"), danger: true,
                      onConfirm: () => { setConfirmData({show: false}); setResetModal({show: true, password: ""}); }
                    });
                  }} className="btn-ghost" style={{ width: "100%", marginTop: 12, color: "var(--danger)", borderColor: "rgba(239,68,68,0.2)" }}>🗑️ {t("تصفير بيانات العيادة نهائياً")}</button>
               </div>
            </div>
          )}

          {activeTab === "automation" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="animate-fade">
              {/* Gemini AI Settings */}
              <div className="glass-panel" style={{ padding: 32 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🤖 {t("إعدادات الذكاء الاصطناعي (Gemini)")}</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>{t("قم بإدخال مفتاح الـ API الخاص بـ Google Gemini لتفعيل السكرتيرة الذكية.")}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <label style={lblStyle}>{t("Gemini API Key")}</label>
                    <input className="glass-input" type="password" style={{ width: "100%" }} 
                      value={form.gemini_api_key || ""} onChange={e => setForm({ ...form, gemini_api_key: e.target.value })} 
                      placeholder="AIzaSy..." />
                  </div>
                </div>
              </div>

              {/* Self-Hosted WhatsApp Settings */}
              <div className="glass-panel" style={{ padding: 32 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>💬 {t("ربط الواتساب المجاني")}</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>{t("امسح الـ QR Code التالي لربط واتساب العيادة بالنظام مجاناً.")}</p>
                
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: 32, background: "rgba(255,255,255,0.02)", borderRadius: 20, border: "1px dashed rgba(255,255,255,0.1)" }}>
                   {qrStatus === "ready" ? (
                     <div style={{ textAlign: "center", color: "var(--success)" }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                        <div style={{ fontWeight: 700 }}>{t("الواتساب مرتبط حالياً وجاهز للعمل")}</div>
                        <button className="btn-ghost" style={{ marginTop: 16, color: "var(--danger)" }} onClick={() => setQrStatus("loading")}>{t("إلغاء الربط / ربط رقم جديد")}</button>
                     </div>
                   ) : qrStatus === "qr" && qrCode ? (
                     <div style={{ textAlign: "center" }}>
                        <img src={qrCode} alt="WA QR" style={{ width: 200, height: 200, borderRadius: 12, marginBottom: 16, border: "4px solid white" }} />
                        <div style={{ fontSize: 14 }}>{t("افتح واتساب > الأجهزة المرتبطة > ربط جهاز")}</div>
                     </div>
                   ) : (
                     <div style={{ textAlign: "center", opacity: 0.5 }}>
                        <div className="spinner" style={{ marginBottom: 16 }}></div>
                        <div>{t("جاري تشغيل محرك الواتساب...")}</div>
                     </div>
                   )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "lists" && (
            <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
               <div className="glass-panel" style={{ padding: 32 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>📋 {t("إدارة القوائم الديناميكية")}</h3>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>{t("قم بتخصيص الخيارات التي تظهر في المواعيد والمخزن والحسابات.")}</p>
                  
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
                     {[
                       { k: "treatment_types", l: "أنواع العلاجات", icon: "🦷" },
                       { k: "inventory_categories", l: "تصنيفات المخزن", icon: "📦" },
                       { k: "payment_methods", l: "طرق الدفع", icon: "💰" },
                       { k: "med_categories", l: "تصنيفات الأدوية", icon: "💊" },
                       { k: "med_dosages", l: "جرعات الأدوية", icon: "⚖️" },
                       { k: "med_frequencies", l: "تكرار الأدوية", icon: "🔄" },
                       { k: "med_durations", l: "مدة الأدوية", icon: "⏳" },
                       { k: "expense_categories", l: "فئات المصروفات", icon: "💸" },
                     ].map(list => {
                        const currentList = getDynamicList(list.k, DEFAULT_LISTS[list.k]);
                        return (
                          <div key={list.k} className="glass-panel" style={{ padding: 20, background: "rgba(255,255,255,0.02)" }}>
                             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{list.icon} {t(list.l)}</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{currentList.length} {t("عنصر")}</div>
                             </div>
                             
                             <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                                {currentList.map((item, idx) => (
                                  <div key={idx} style={{ 
                                    background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: 8, fontSize: 12,
                                    display: "flex", alignItems: "center", gap: 6, border: "1px solid rgba(255,255,255,0.05)"
                                  }}>
                                     {item}
                                     <span 
                                       onClick={() => {
                                         const newList = currentList.filter((_, i) => i !== idx);
                                         const allLists = JSON.parse(form.dynamic_lists || "{}");
                                         allLists[list.k] = newList;
                                         setForm({ ...form, dynamic_lists: JSON.stringify(allLists) });
                                       }}
                                       style={{ cursor: "pointer", opacity: 0.5, fontSize: 14, color: "var(--danger)" }}
                                     >×</span>
                                  </div>
                                ))}
                             </div>
                             
                             <div style={{ display: "flex", gap: 8 }}>
                                <input 
                                  className="glass-input" 
                                  placeholder={t("إضافة جديد...")} 
                                  style={{ flex: 1, height: 36, fontSize: 12, padding: "0 12px" }} 
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && e.target.value.trim()) {
                                      const val = e.target.value.trim();
                                      if (currentList.includes(val)) return;
                                      const newList = [...currentList, val];
                                      const allLists = JSON.parse(form.dynamic_lists || "{}");
                                      allLists[list.k] = newList;
                                      setForm({ ...form, dynamic_lists: JSON.stringify(allLists) });
                                      e.target.value = "";
                                    }
                                  }}
                                />
                             </div>
                          </div>
                        );
                     })}
                  </div>
               </div>
            </div>
          )}
          {activeTab === "preferences" && (
            <div className="glass-panel animate-fade" style={{ padding: 32 }}>
               <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>🎨 {t("تفضيلات الواجهة واللغة")}</h3>
               <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 20, background: "rgba(255,255,255,0.02)", borderRadius: 16 }}>
                     <div>
                        <div style={{ fontWeight: 700 }}>{t("لغة النظام")}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("تغيير اللغة بين العربية والإنجليزية")}</div>
                     </div>
                     <button onClick={toggleLanguage} className="btn-primary" style={{ minWidth: 120 }}>
                        {lang === "ar" ? "English" : "العربية"}
                     </button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 20, background: "rgba(255,255,255,0.02)", borderRadius: 16 }}>
                     <div>
                        <div style={{ fontWeight: 700 }}>{t("الوضع الليلي")} (Dark Mode)</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("تبديل مظهر الواجهة")}</div>
                     </div>
                     <div onClick={() => {
                        const b=document.body; b.classList.toggle("light-mode");
                        const l=b.classList.contains("light-mode"); localStorage.setItem("light-mode",l); setIsLight(l);
                     }} style={{ width: 44, height: 22, borderRadius: 20, background: isLight ? "#cbd5e1" : "var(--primary)", position: "relative", cursor: "pointer" }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 2, right: isLight?24:2, transition: "all 0.2s" }} />
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
      
      <ConfirmModal 
        show={confirmData.show} 
        title={confirmData.title} 
        message={confirmData.message} 
        danger={confirmData.danger}
        onConfirm={confirmData.onConfirm} 
        onCancel={() => setConfirmData({ ...confirmData, show: false })} 
      />

      {resetModal.show && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
          <div className="glass-panel animate-fade" style={{ width: "100%", maxWidth: 400, padding: 32, textAlign: "center" }}>
            <h3 style={{ fontSize: 20, marginBottom: 16, color: "var(--danger)" }}>{t("تأكيد التصفير")}</h3>
            <p style={{ marginBottom: 20, fontSize: 14, color: "var(--text-muted)" }}>{t("أدخل كلمة المرور لتأكيد العملية:")}</p>
            <input type="password" placeholder={t("كلمة المرور")} className="glass-input" style={{ width: "100%", marginBottom: 20, textAlign: "center" }} value={resetModal.password} onChange={e => setResetModal({...resetModal, password: e.target.value})} />
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setResetModal({ show: false, password: "" })}>{t("إلغاء")}</button>
              <button className="btn-primary" style={{ flex: 1, background: "#ef4444" }} onClick={async () => {
                try {
                  const res = await resetClinic(resetModal.password);
                  if (res.ok) window.location.reload();
                  else alert(res.error || t("كلمة المرور خاطئة"));
                } catch(e) {
                  alert(e.message || t("حدث خطأ"));
                }
              }}>{t("تأكيد التصفير")}</button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
const lblStyle = { display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 };
