import { useEffect, useState } from "react";
import { useLanguage } from '../LanguageContext';
import { getSettings, updateSettings, getGoogleAuth, downloadBackup, restoreBackup, resetClinic, uploadClinicLogo, BASE, getTrashPatients, restorePatient, permanentDeletePatient } from "../api";

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
  const [trashList, setTrashList] = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [qrStatus, setQrStatus] = useState("loading");
  const [testingBackup, setTestingBackup] = useState(false);
  const [backupDiagResults, setBackupDiagResults] = useState(null);

  const handleTestBackup = async () => {
    setTestingBackup(true);
    setBackupDiagResults(null);
    try {
      const api = await import("../api");
      const res = await api.testBackupDiagnostics();
      setBackupDiagResults(res);
    } catch (e) {
      alert("حدث خطأ أثناء إجراء فحص النسخ الاحتياطي: " + e.message);
    }
    setTestingBackup(false);
  };


  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    getSettings().then(setForm).catch(console.error);
    if (user?.role === 'doctor' && user?.account_type !== 'center_manager') {
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

  const handleDownloadBackup = async () => {
    try {
      const activeDoctor = localStorage.getItem("activeDoctor");
      const headers = {
        "Authorization": `Bearer ${JSON.parse(localStorage.getItem("clinic_user") || "{}").token || ""}`
      };
      if (activeDoctor) {
        headers["X-Active-Doctor"] = activeDoctor;
      }
      
      const response = await fetch(downloadBackup(), { headers });
      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || t("فشل تحميل النسخة الاحتياطية"));
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const disposition = response.headers.get('content-disposition');
      let filename = `SmileCare_Backup_${new Date().toISOString().split('T')[0]}.db`;
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) { 
          filename = matches[1].replace(/['"]/g, '');
        }
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(t("فشل تحميل النسخة الاحتياطية") + ": " + e.message);
    }
  };

  const tabs = user?.account_type === 'center_manager' ? [
    { id: "clinic", label: t("بيانات المركز"), icon: "🏢", roles: ["center_manager"] },
    { id: "security", label: t("الأمان والنسخ"), icon: "🛡️", roles: ["center_manager"] },
    { id: "preferences", label: t("المظهر واللغة"), icon: "🌐", roles: ["center_manager"] },
  ] : [
    { id: "clinic", label: t("بيانات العيادة"), icon: "🏢", roles: ["doctor"] },
    { id: "medical", label: t("الوصفات والرسائل"), icon: "📄", roles: ["doctor"] },
    { id: "lists", label: t("إدارة القوائم"), icon: "📋", roles: ["doctor"] },
    { id: "security", label: t("الأمان والنسخ"), icon: "🛡️", roles: ["doctor"] },
    { id: "automation", label: t("الأتمتة والذكاء الاصطناعي"), icon: "🤖", roles: ["doctor"] },
    { id: "trash", label: t("سلة المحذوفات"), icon: "🗑️", roles: ["doctor"] },
    { id: "preferences", label: t("المظهر واللغة"), icon: "🌐", roles: ["doctor", "secretary"] },
  ].filter(tab => tab.roles.includes(user?.role) || (user?.account_type === 'center_manager' && tab.roles.includes('center_manager')));

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
                <div style={{ width: 80, height: 80, borderRadius: 16, overflow: "hidden", background: "var(--panel-bg)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px dashed var(--glass-border)", flexShrink: 0 }}>
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
                  { k: "clinic_name",  l: user?.account_type === 'center_manager' ? "اسم المركز" : "اسم العيادة" },
                  { k: "doctor_name",  l: user?.account_type === 'center_manager' ? "اسم المدير المسئول" : "اسم الطبيب" },
                  { k: "phone",        l: "رقم الهاتف" },
                  { k: "address",      l: user?.account_type === 'center_manager' ? "عنوان المركز الرئيسي" : "عنوان العيادة" },
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
                     <label htmlFor="h-up" className="btn-ghost" style={{ display: "block", height: 120, border: "2px dashed var(--glass-border)", borderRadius: 12, overflow: "hidden", cursor: "pointer", background: "var(--panel-bg)" }}>
                        {form.prescription_header ? <img src={form.prescription_header} style={{ width: "100%", height: "100%", objectFit: "contain", background: "white" }} /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 12, color: "var(--text-muted)" }}>{t("رفع صورة الرأس")}</div>}
                     </label>
                   </div>
                   <div>
                     <label style={lblStyle}>{t("صورة تذييل الوصفة (Footer)")}</label>
                     <input type="file" id="f-up" hidden onChange={e => {
                       const f = e.target.files[0];
                       if(f){ const r=new FileReader(); r.onloadend=()=>setForm({...form, prescription_footer:r.result}); r.readAsDataURL(f); }
                     }} />
                     <label htmlFor="f-up" className="btn-ghost" style={{ display: "block", height: 120, border: "2px dashed var(--glass-border)", borderRadius: 12, overflow: "hidden", cursor: "pointer", background: "var(--panel-bg)" }}>
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

               {/* Secretary Permissions (Dynamically Configured) */}
               <div className="glass-panel" style={{ padding: 32 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>⚙️ {t("صلاحيات السكرتيرة")}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 24 }}>
                     {/* Patients */}
                     <div>
                       <label style={lblStyle}>👥 {t("ملفات المرضى")}</label>
                       <select className="glass-input" style={{ width: "100%", height: 44 }}
                         value={form.sec_perm_patients || "view_edit"}
                         onChange={e => setForm({ ...form, sec_perm_patients: e.target.value })}
                       >
                         <option value="view_only">{t("عرض فقط (بدون إضافة أو تعديل)")}</option>
                         <option value="view_edit">{t("عرض + تعديل البيانات")}</option>
                         <option value="view_edit_add">{t("عرض + تعديل + إضافة مريض جديد")}</option>
                       </select>
                     </div>

                     {/* Invoices */}
                     <div>
                       <label style={lblStyle}>🧾 {t("الفواتير والمدفوعات")}</label>
                       <select className="glass-input" style={{ width: "100%", height: 44 }}
                         value={form.sec_perm_invoices || "today"}
                         onChange={e => setForm({ ...form, sec_perm_invoices: e.target.value })}
                       >
                         <option value="none">{t("مخفي بالكامل")}</option>
                         <option value="today">{t("عرض دفعات اليوم فقط")}</option>
                         <option value="today_add">{t("دفعات اليوم + إضافة/تسجيل دفعة")}</option>
                         <option value="all">{t("عرض كل الدفعات السابقة (عرض فقط)")}</option>
                         <option value="all_add">{t("عرض الكل + إضافة/تسجيل دفعة")}</option>
                       </select>
                     </div>

                     {/* Expenses */}
                     <div>
                       <label style={lblStyle}>💰 {t("المصاريف التشغيلية")}</label>
                       <select className="glass-input" style={{ width: "100%", height: 44 }}
                         value={form.sec_perm_expenses || "today"}
                         onChange={e => setForm({ ...form, sec_perm_expenses: e.target.value })}
                       >
                         <option value="none">{t("مخفي بالكامل")}</option>
                         <option value="today">{t("عرض مصاريف اليوم فقط")}</option>
                         <option value="today_add">{t("مصاريف اليوم + إضافة مصروف")}</option>
                         <option value="all">{t("عرض كل المصاريف (عرض فقط)")}</option>
                         <option value="all_add">{t("عرض الكل + إضافة مصروف")}</option>
                       </select>
                     </div>

                     {/* Inventory */}
                     <div>
                       <label style={lblStyle}>📦 {t("مخزن مواد العيادة")}</label>
                       <select className="glass-input" style={{ width: "100%", height: 44 }}
                         value={form.sec_perm_inventory || "view"}
                         onChange={e => setForm({ ...form, sec_perm_inventory: e.target.value })}
                       >
                         <option value="none">{t("مخفي بالكامل")}</option>
                         <option value="view">{t("عرض فقط (بدون تعديل الكميات)")}</option>
                         <option value="edit">{t("عرض + تعديل كميات المواد (+/-)")}</option>
                       </select>
                     </div>

                     {/* Reports */}
                     <div>
                       <label style={lblStyle}>📊 {t("التقارير والإحصائيات")}</label>
                       <select className="glass-input" style={{ width: "100%", height: 44 }}
                         value={form.sec_perm_reports || "none"}
                         onChange={e => setForm({ ...form, sec_perm_reports: e.target.value })}
                       >
                         <option value="none">{t("مخفي بالكامل")}</option>
                         <option value="today">{t("تقارير اليوم فقط (المالية اليومية)")}</option>
                         <option value="all">{t("التقارير والإحصائيات الكاملة (العامة والتراكمية)")}</option>
                       </select>
                     </div>

                     {/* Binary Toggles Grid */}
                     <div style={{ gridColumn: isMobile ? "span 1" : "span 2", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20, marginTop: 12 }}>
                        {/* Messages Toggle */}
                        <div style={{ padding: 16, background: "var(--panel-bg)", borderRadius: 12, border: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>💬 {t("سجل المتابعة الداخلية")}</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{t("شات سجل المتابعة")}</div>
                          </div>
                          <div onClick={() => {
                            const current = form.sec_perm_messages !== "0" ? "0" : "1";
                            setForm({ ...form, sec_perm_messages: current });
                          }} style={{ width: 40, height: 20, borderRadius: 20, background: (form.sec_perm_messages !== "0") ? "var(--primary)" : "#475569", position: "relative", cursor: "pointer", transition: "0.2s" }}>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "white", position: "absolute", top: 2, right: (form.sec_perm_messages !== "0") ? 2 : 22, transition: "all 0.2s" }} />
                          </div>
                        </div>

                        {/* Medical History Toggle */}
                        <div style={{ padding: 16, background: "var(--panel-bg)", borderRadius: 12, border: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>🩺 {t("السجل الطبي")}</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{t("العلاجات وخريطة الأسنان")}</div>
                          </div>
                          <div onClick={() => {
                            const current = form.sec_perm_medical_history === "1" ? "0" : "1";
                            setForm({ ...form, sec_perm_medical_history: current });
                          }} style={{ width: 40, height: 20, borderRadius: 20, background: (form.sec_perm_medical_history === "1") ? "var(--primary)" : "#475569", position: "relative", cursor: "pointer", transition: "0.2s" }}>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "white", position: "absolute", top: 2, right: (form.sec_perm_medical_history === "1") ? 2 : 22, transition: "all 0.2s" }} />
                          </div>
                        </div>

                        {/* Daily Summary Toggle */}
                        <div style={{ padding: 16, background: "var(--panel-bg)", borderRadius: 12, border: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>📋 {t("الملخص اليومي")}</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{t("لوحة الجرد اليومي")}</div>
                          </div>
                          <div onClick={() => {
                            const current = form.sec_perm_daily_summary === "1" ? "0" : "1";
                            setForm({ ...form, sec_perm_daily_summary: current });
                          }} style={{ width: 40, height: 20, borderRadius: 20, background: (form.sec_perm_daily_summary === "1") ? "var(--primary)" : "#475569", position: "relative", cursor: "pointer", transition: "0.2s" }}>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "white", position: "absolute", top: 2, right: (form.sec_perm_daily_summary === "1") ? 2 : 22, transition: "all 0.2s" }} />
                          </div>
                        </div>

                        {/* Daily Schedule Toggle */}
                        <div style={{ padding: 16, background: "var(--panel-bg)", borderRadius: 12, border: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>📅 {t("الجدول اليومي")}</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{t("جدول مواعيد اليوم ومتابعة الجلسات")}</div>
                          </div>
                          <div onClick={() => {
                            const current = form.sec_perm_daily_schedule === "1" ? "0" : "1";
                            setForm({ ...form, sec_perm_daily_schedule: current });
                          }} style={{ width: 40, height: 20, borderRadius: 20, background: (form.sec_perm_daily_schedule === "1") ? "var(--primary)" : "#475569", position: "relative", cursor: "pointer", transition: "0.2s" }}>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "white", position: "absolute", top: 2, right: (form.sec_perm_daily_schedule === "1") ? 2 : 22, transition: "all 0.2s" }} />
                          </div>
                        </div>
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

                    {/* Cloud Backups Diagnostic Panel */}
                    <div style={{ marginBottom: 24, padding: 24, background: "rgba(16, 185, 129, 0.03)", borderRadius: 16, border: "1px solid rgba(16, 185, 129, 0.1)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: backupDiagResults ? 16 : 0, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0, textAlign: isMobile ? "center" : "right" }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>🔗 {t("فحص وتشخيص الاتصال السحابي")}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{t("التحقق من اتصال النسخ الاحتياطي لـ R2 و Google Drive")}</div>
                        </div>
                        <button className="btn-primary" disabled={testingBackup} style={{ background: "#10b981", minWidth: 160 }} onClick={handleTestBackup}>
                          {testingBackup ? t("جاري الفحص والرفع...") : `⚡ ${t("فحص الآن")}`}
                        </button>
                      </div>

                      {backupDiagResults && (
                        <div style={{ fontSize: 13, background: "rgba(0,0,0,0.2)", padding: 16, borderRadius: 12, display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--glass-border)", paddingBottom: 8, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 4 : 0 }}>
                            <span style={{ fontWeight: 600 }}>☁️ Cloudflare R2 (النسخ الاحتياطي المركزي للشركة):</span>
                            <span style={{ fontWeight: 700, color: backupDiagResults.r2?.status === "Success" ? "#10b981" : "#ef4444" }}>
                              {backupDiagResults.r2?.status === "Success" ? "✅ ناجح ومؤمن" : `❌ فشل (${backupDiagResults.r2?.error || "خطأ في الاتصال"})`}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 4 : 0 }}>
                            <span style={{ fontWeight: 600 }}>📁 Google Drive (النسخ الاحتياطي الشخصي للطبيب):</span>
                            <span style={{ fontWeight: 700, color: backupDiagResults.google_drive?.status === "Success" ? "#10b981" : (backupDiagResults.google_drive?.status === "Not Linked" ? "#64748b" : "#ef4444") }}>
                              {backupDiagResults.google_drive?.status === "Success" ? "✅ ناجح ومؤمن" : (backupDiagResults.google_drive?.status === "Not Linked" ? "⚠️ غير مرتبط بعد" : `❌ فشل (${backupDiagResults.google_drive?.error || "خطأ في التفويض"})`)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                     <button onClick={handleDownloadBackup} 
                       className="glass-panel" style={{ padding: 20, textAlign: "center", cursor: "pointer", border: "1px solid var(--glass-border)" }}>
                       <div style={{ fontSize: 24, marginBottom: 8 }}>📥</div>
                       <div style={{ fontWeight: 600, fontSize: 13 }}>{t("تحميل نسخة احتياطية")}</div>
                     </button>

                     <button onClick={() => document.getElementById('res-up').click()} 
                       className="glass-panel" style={{ padding: 20, textAlign: "center", cursor: "pointer", border: "1px solid var(--glass-border)" }}>
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
                
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: 32, background: "var(--panel-bg)", borderRadius: 20, border: "1px dashed var(--glass-border)" }}>
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
                          <div key={list.k} className="glass-panel" style={{ padding: 20, background: "var(--panel-bg)" }}>
                             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{list.icon} {t(list.l)}</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{currentList.length} {t("عنصر")}</div>
                             </div>
                             
                             <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                                {currentList.map((item, idx) => (
                                  <div key={idx} style={{ 
                                    background: "var(--panel-bg)", padding: "4px 10px", borderRadius: 8, fontSize: 12,
                                    display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--glass-border)"
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
          {activeTab === "trash" && (
            <div className="glass-panel animate-fade" style={{ padding: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>🗑️ {t("سلة المحذوفات")}</h3>
                <button className="btn-ghost" style={{ fontSize: 13 }} onClick={async () => {
                  setTrashLoading(true);
                  const data = await getTrashPatients();
                  setTrashList(data || []);
                  setTrashLoading(false);
                }}>
                  {trashLoading ? "..." : "🔄 تحديث"}
                </button>
              </div>

              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#fca5a5" }}>
                ⚠️ {t("يتم حذف المرضى تلقائياً بعد 30 يوماً من تاريخ الحذف. الحذف النهائي لا يمكن التراجع عنه.")}
              </div>

              {trashList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🗃️</div>
                  <div style={{ fontSize: 15 }}>{t("سلة المحذوفات فارغة")}</div>
                  <div style={{ fontSize: 12, marginTop: 8 }}>{t("اضغط تحديث لجلب القائمة")}</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {trashList.map(p => (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 18px", background: "var(--panel-bg)",
                      borderRadius: 14, border: "1px solid var(--glass-border)",
                      gap: 12, flexWrap: "wrap"
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{p.first_name} {p.last_name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                          📅 {t("تاريخ الحذف")}: {new Date(p.deleted_at).toLocaleDateString("ar-IQ")}
                          {p.phone && <span style={{ marginRight: 12 }}>📞 {p.phone}</span>}
                        </div>
                      </div>
                      {/* Days remaining badge */}
                      <div style={{
                        padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: p.days_remaining <= 5 ? "rgba(239,68,68,0.2)" : p.days_remaining <= 10 ? "rgba(245,158,11,0.15)" : "rgba(100,116,139,0.15)",
                        color: p.days_remaining <= 5 ? "#ef4444" : p.days_remaining <= 10 ? "#f59e0b" : "#94a3b8"
                      }}>
                        ⏳ {p.days_remaining} {t("يوم متبقي")}
                      </div>
                      {/* Restore button */}
                      <button
                        className="btn-ghost"
                        style={{ color: "#10b981", borderColor: "rgba(16,185,129,0.3)", fontSize: 13, padding: "7px 16px", fontWeight: 700 }}
                        onClick={async () => {
                          await restorePatient(p.id);
                          setTrashList(prev => prev.filter(x => x.id !== p.id));
                        }}
                      >
                        ↩️ {t("استرجاع")}
                      </button>
                      {/* Permanent Delete button */}
                      <button
                        style={{
                          background: "rgba(239,68,68,0.12)", color: "#ef4444",
                          border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10,
                          padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700
                        }}
                        onClick={() => setConfirmData({
                          show: true,
                          title: t("حذف نهائي"),
                          message: `${t("سيتم حذف ملف")} ${p.first_name} ${p.last_name} ${t("نهائياً ولا يمكن التراجع عنه. هل أنت متأكد؟")}`,
                          danger: true,
                          onConfirm: async () => {
                            await permanentDeletePatient(p.id);
                            setTrashList(prev => prev.filter(x => x.id !== p.id));
                          }
                        })}
                      >
                        🗑️ {t("حذف نهائي")}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === "preferences" && (
            <div className="glass-panel animate-fade" style={{ padding: 32 }}>
               <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>🎨 {t("تفضيلات الواجهة واللغة")}</h3>
               <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 20, background: "var(--panel-bg)", borderRadius: 16 }}>
                     <div>
                        <div style={{ fontWeight: 700 }}>{t("لغة النظام")}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("تغيير اللغة بين العربية والإنجليزية")}</div>
                     </div>
                     <button onClick={toggleLanguage} className="btn-primary" style={{ minWidth: 120 }}>
                        {lang === "ar" ? "English" : "العربية"}
                     </button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 20, background: "var(--panel-bg)", borderRadius: 16 }}>
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
