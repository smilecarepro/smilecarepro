import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getPatient, saveTeeth, addInvoice, uploadPrescription, updatePatient, addTreatment, deleteTreatment, createSmartPrescription, addAppointment, updateAppointment, getPrescriptionPDFUrl, getPatientReportPDFUrl, BASE, deletePatient, updateTreatment, updatePrescription } from "../api";
import { useAuth } from "../AuthContext";
import { useLanguage } from "../LanguageContext";
import { createPortal } from "react-dom";
import { useSettings } from "../SettingsContext";
import { useSession } from "../SessionContext";
// CasePresentation removed as unused
import PrescriptionModal from "../components/PrescriptionModal";
import TeethMap from "../components/TeethMap";
import TeethMap3D from "../components/TeethMap3D";
import AdvancedMap from "./AdvancedMap";
import DatePicker from "../components/DatePicker";

const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

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

const ReportRow = ({ label, val, unit, color, bold }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
    <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{label}</span>
    <span style={{ fontSize: bold ? 20 : 16, fontWeight: 700, color: color || "white" }}>
      {typeof val === 'number' ? val.toLocaleString() : val} {unit}
    </span>
  </div>
);

export default function PatientProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const { lang, t } = useLanguage();
  const { settings, getDynamicList } = useSettings();
  const { user } = useAuth();
  const { startSession } = useSession() || {};
  const isDoctor = user?.role !== "secretary";
  const canEditPatient = user?.role !== "secretary" || settings?.sec_perm_patients !== "view_only";
  const showMedicalTabs = user?.role !== "secretary" || settings?.sec_perm_medical_history === "1";
  const showFinancials = user?.role !== "secretary" || settings?.sec_perm_invoices !== "none";
  const canAddPayment = user?.role !== "secretary" || settings?.sec_perm_invoices === "today_add" || settings?.sec_perm_invoices === "all_add";
  const [patient, setPatient] = useState(null);
  const [tab, setTab] = useState(null);
  const [trashModal, setTrashModal] = useState(false);
  const [trashLoading, setTrashLoading] = useState(false);
  const [activePage, setActivePage] = useState("info"); // Default page
  const [isOngoing, setIsOngoing] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);
  const [agreedPrice, setAgreedPrice] = useState(0);
  const [payments, setPayments] = useState([]);
  const [payModal, setPayModal] = useState({ show: false, amount: "", session_cost: "", method: "Cash", notes: "" });
  const [localPhone, setLocalPhone] = useState("");
  const [viewingPrescription, setViewingPrescription] = useState(null);
  const [newTreatment, setNewTreatment] = useState({ tooth_number: "", procedure: "", notes: "", cost: "" });
  const [isAddingTreatment, setIsAddingTreatment] = useState(false);
  const [toothFilter, setToothFilter] = useState(null);
  const [timelineDate, setTimelineDate] = useState(localDate());
  const [mapMode, setMapMode] = useState("3D"); 
  const [sessionStep, setSessionStep] = useState(null); // null = not started, 0-4 = steps
  const [sessionData, setSessionData] = useState({ treatments: [], current: { tooth: "", procedure: "", cost: "", notes: "" }, meds: [], paid: "", teeth: null });
  
  // Local states for onBlur saving
  const [localAge, setLocalAge] = useState("");
  const [localOccupation, setLocalOccupation] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [localConditions, setLocalConditions] = useState("");
  const [localNotes, setLocalNotes] = useState("");
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: null });
  const [priceModal, setPriceModal] = useState({ show: false, val: "" });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [editTreatment, setEditTreatment] = useState(null);
  const [editTreatmentForm, setEditTreatmentForm] = useState({ tooth_number: "", procedure: "", notes: "", cost: "", date: "" });
  const [editingPrescription, setEditingPrescription] = useState(null);

  const canEditPrescription = (pr) => {
    if (!pr || !pr.date) return false;
    const now = new Date();
    const [yr, mn, dy] = pr.date.split("-").map(Number);
    const prDate = new Date(yr, mn - 1, dy, 0, 0, 0, 0);
    const diffMs = now.getTime() - prDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours <= 48;
  };

  const saveEditTreatment = async () => {
    const res = await updateTreatment(editTreatment.id, {
      tooth_number: editTreatmentForm.tooth_number,
      procedure: editTreatmentForm.procedure,
      notes: editTreatmentForm.notes,
      cost: parseFloat(editTreatmentForm.cost) || 0,
      date: editTreatmentForm.date
    });
    if (res.ok) {
      setEditTreatment(null);
      load();
    } else {
      alert("فشل تعديل الإجراء");
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Reset tab when activePage changes
    setTab(null);
  }, [activePage]);

  const load = async () => {
    try {
      const data = await getPatient(id);
      setPatient(data);
      setLocalPhone(data.phone || "");
      setLocalAge(data.age || "");
      setLocalOccupation(data.occupation || "");
      setLocalAddress(data.address || "");
      setLocalConditions(data.systemic_conditions || "");
      setLocalNotes(data.notes || "");
      setIsOngoing(!!data.is_ongoing);
      setAgreedPrice(data.total_agreed_price || 0);
      if (data.invoices) {
        setPayments(data.invoices);
      }
    } catch (err) {
      console.error(err);
      nav("/patients");
    }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!showMedicalTabs && (activePage === "treatment" || activePage === "teeth")) {
      setActivePage("info");
    }
  }, [activePage, showMedicalTabs]);

  useEffect(() => {
    const handleOpenAdd = (e) => {
      if (sessionStep !== null) return; // Don't open standalone modal during wizard
      setNewTreatment(prev => ({ ...prev, tooth_number: e.detail || "" }));
      setIsAddingTreatment(true);
    };
    window.addEventListener('openAddTreatment', handleOpenAdd);

    // Auto-start session if redirected from schedule using React Router's location
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'start-session' && sessionStep === null) {
      setSessionStep(0);
      // Clean up URL without refreshing
      nav(location.pathname, { replace: true });
    }

    return () => window.removeEventListener('openAddTreatment', handleOpenAdd);
  }, [location.search, location.pathname, nav, sessionStep]);

  const saveProfile = async (updates) => {
    await updatePatient(id, updates);
    load();
  };

  const printPaymentStatement = () => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Account Statement - ${patient.first_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
            body { direction: rtl; font-family: 'Cairo', sans-serif; margin: 0; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid var(--primary); padding-bottom: 20px; margin-bottom: 30px; }
            .logo { width: 80px; height: 80px; border-radius: 15px; }
            .title { fontSize: 24px; font-weight: 800; color: #111; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f3f4f6; padding: 12px; text-align: right; border-bottom: 2px solid #ddd; }
            td { padding: 12px; border-bottom: 1px solid #eee; }
            .summary { margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 15px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: 700; }
            .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #666; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            ${settings?.clinic_logo ? `<img src="${BASE + settings.clinic_logo}" class="logo" />` : ''}
            <div class="title">${settings?.clinic_name || "SmileCare Clinic"}</div>
            <div style="font-size: 18px; color: #666;">كشف حساب مالي للمريض</div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <div><strong>اسم المريض:</strong> ${patient.first_name} ${patient.last_name}</div>
            <div><strong>تاريخ التقرير:</strong> ${localDate()}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>تاريخ الدفعة</th>
                <th>المبلغ المدفوع</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              \${displayedPayments.map(p => \`
                <tr>
                  <td>\${p.date}</td>
                  <td style="font-weight: 700;">\${(parseFloat(p.paid) || parseFloat(p.paid_amount) || 0).toLocaleString()} د.ع</td>
                  <td>\${p.notes || '-'}</td>
                </tr>
              \`).join('')}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-row"><span>إجمالي السعر المتفق عليه:</span><span>${(agreedPrice || 0).toLocaleString()} د.ع</span></div>
            <div class="summary-row" style="color: #10b981;"><span>إجمالي المبالغ المدفوعة:</span><span>${(totalPaid || 0).toLocaleString()} د.ع</span></div>
            <div class="summary-row" style="color: #ef4444; font-size: 20px; border-top: 2px solid #ddd; padding-top: 10px; margin-top: 10px;">
              <span>المتبقي النهائي (الدين):</span><span>${(remaining || 0).toLocaleString()} د.ع</span>
            </div>
          </div>

          <div class="footer">طبع بواسطة نظام SmileCare - ${new Date().toLocaleString()}</div>
        </body>
      </html>
    `);
    doc.close();
    
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
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
            body { direction: rtl; font-family: 'Cairo', sans-serif; margin: 0; padding: 20px; color: #333; line-height: 1.6; }
            .header-img { width: 100%; max-height: 150px; object-fit: contain; margin-bottom: 20px; }
            .footer-img { width: 100%; max-height: 100px; object-fit: contain; margin-top: 20px; position: fixed; bottom: 0; left: 0; }
            .header-text { text-align: center; border-bottom: 2px solid #00d2ff; padding-bottom: 15px; margin-bottom: 25px; }
            .logo { width: 80px; height: 80px; border-radius: 15px; margin-bottom: 10px; }
            .subtitle { font-size: 18px; color: #00d2ff; font-weight: 700; margin-top: 5px; border: 1px solid #00d2ff; display: inline-block; padding: 4px 20px; borderRadius: 20px; }
            .content { padding: 0 10px; }
            .receipt-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 15px; padding: 20px; margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e5e7eb; }
            .row:last-child { border-bottom: none; }
            .label { font-weight: 700; color: #666; }
            .val { font-weight: 700; color: #111; }
            .footer-text { text-align: center; margin-top: 25px; font-size: 14px; color: #555; font-weight: 500; }
            @media print {
              html, body { height: 100%; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${(settings?.receipt_header || settings?.prescription_header) ? `<img src="${settings.receipt_header || settings.prescription_header}" class="header-img" />` : `
            <div class="header-text">
              ${settings?.clinic_logo ? `<img src="${BASE + settings.clinic_logo}" class="logo" />` : ''}
              <h2>${settings?.clinic_name || "SmileCare Clinic"}</h2>
              <div class="subtitle">وصل استلام مالي (Receipt)</div>
            </div>
          `}
          <div class="content">
            ${(settings?.receipt_header || settings?.prescription_header) ? '<div style="text-align: center; margin-bottom: 10px;"><div class="subtitle">وصل استلام مالي (Receipt)</div></div>' : ''}
            <div class="receipt-box">
              <div class="row"><span class="label">التاريخ:</span><span class="val">${receipt.date}</span></div>
              <div class="row"><span class="label">اسم المريض:</span><span class="val">${receipt.patient_name}</span></div>
              <div class="row"><span class="label">السعر الكلي للعلاج:</span><span class="val">${(receipt.total_price || 0).toLocaleString()} د.ع</span></div>
              <div class="row"><span class="label">الدين الكلي المتبقي (قبل):</span><span class="val">${(receipt.total_debt !== undefined ? receipt.total_debt : ((receipt.patient_debt || 0) + (receipt.paid || 0))).toLocaleString()} د.ع</span></div>
              <div class="row"><span class="label">الدفعة الجديدة:</span><span class="val" style="font-size: 20px; color: #10b981;">${(receipt.paid || 0).toLocaleString()} د.ع</span></div>
              <div class="row"><span class="label" style="color: #ef4444;">الدين الكلي المتبقي الجديد:</span><span class="val" style="color: #ef4444;">${(receipt.patient_debt || 0).toLocaleString()} د.ع</span></div>
            </div>
            <div class="footer-text">شكراً لزيارتكم ونتمنى لكم دوام الصحة والعافية ✨</div>
          </div>
          ${(settings?.receipt_footer || settings?.prescription_footer) ? `<img src="${settings.receipt_footer || settings.prescription_footer}" class="footer-img" />` : ''}
        </body>
      </html>
    `);
    doc.close();
    
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
  };

  const addPayment = async () => {
    if (!payModal.amount) return;
    
    const paidAmt = parseFloat(payModal.amount);
    
    // 500 IQD validation
    if (paidAmt % 500 !== 0) {
      return alert(t("⚠️ عذراً، يجب أن يكون المبلغ المدفوع من مضاعفات الـ 500 دينار عراقي."));
    }

    if (paidAmt > remaining) {
      return alert(t("لا يمكن إدخال مبلغ يتجاوز قيمة الدين المتبقي."));
    }

    await addInvoice({ 
      patient_id: parseInt(id), 
      total_amount: 0, 
      paid_amount: paidAmt,
      payment_method: payModal.method,
      notes: payModal.notes,
      date: localDate()
    });

    // Print receipt after adding
    printReceiptIframe({
      date: localDate(),
      patient_name: patient.first_name + " " + patient.last_name,
      total_price: agreedPrice,
      paid: paidAmt,
      patient_debt: remaining - paidAmt // This is a bit tricky, load() will update the real remaining
    });

    setPayModal({ show: false, amount: "", session_cost: "", method: "Cash", notes: "" });
    load();
  };

  if (!patient) return <div style={{ color: "var(--text-main)", padding: 40 }}>{t("جاري التحميل...")}</div>;

  const totalPaid = payments.reduce((acc, curr) => acc + (parseFloat(curr.paid) || parseFloat(curr.paid_amount) || 0), 0);
  const totalSessionCosts = payments.reduce((acc, curr) => acc + (parseFloat(curr.amount) || parseFloat(curr.total_amount) || 0), 0);
  const remaining = (parseFloat(agreedPrice) || 0) - totalPaid;

  const filterPaymentsOnlyToday = user?.role === "secretary" && (settings?.sec_perm_invoices === "today" || settings?.sec_perm_invoices === "today_add");
  const displayedPayments = filterPaymentsOnlyToday
    ? payments.filter(p => p.date === localDate())
    : payments;

  return (
    <div className="animate-fade" style={{ padding: isMobile ? 0 : 20 }}>

      {/* ── Trash Confirmation Modal ── */}
      {trashModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(6px)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div className="glass-panel" style={{ padding: 32, maxWidth: 420, width: "100%", borderRadius: 20, textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🗑️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{t("نقل المريض لسلة المحذوفات")}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
              {t("سيتم نقل ملف المريض")} <strong>{patient?.first_name} {patient?.last_name}</strong> {t("إلى سلة المحذوفات.")}<br />
              {t("يمكنك استرجاعه من الإعدادات خلال")} <strong>30 {t("يوماً")}</strong>
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setTrashModal(false)}
                disabled={trashLoading}
              >
                {t("إلغاء")}
              </button>
              <button
                style={{
                  flex: 1, background: "#ef4444", color: "white", border: "none",
                  borderRadius: 12, padding: "12px", fontWeight: 700,
                  cursor: trashLoading ? "not-allowed" : "pointer",
                  opacity: trashLoading ? 0.6 : 1, fontSize: 14
                }}
                onClick={async () => {
                  setTrashLoading(true);
                  try {
                    await deletePatient(id);
                    nav("/patients");
                  } catch (e) {
                    alert(t("حدث خطأ أثناء الحذف"));
                    setTrashLoading(false);
                  }
                }}
                disabled={trashLoading}
              >
                {trashLoading ? "..." : `🗑️ ${t("نقل للسلة")}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .profile-layout { display: grid; grid-template-columns: 1fr 340px; gap: 32px; }
        .form-section { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .finance-summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 32px; }
        .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px; }
        .full-width { grid-column: span 2; }
        .action-card { 
          background: rgba(255, 255, 255, 0.03); 
          border: 1px solid rgba(255, 255, 255, 0.08); 
          border-radius: 20px; 
          padding: 20px; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .action-card:hover { 
          background: rgba(255, 255, 255, 0.08); 
          border-color: var(--primary);
          transform: translateY(-4px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
        }
        .input-group { display: flex; flex-direction: column; gap: 10px; }
        .input-label { font-size: 13px; color: var(--text-muted); padding-right: 4px; font-weight: 600; }
        
        .contact-pill {
          display: flex;
          gap: 12px;
          background: rgba(255,255,255,0.03);
          padding: 6px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          align-items: center;
        }
        .icon-btn {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: all 0.2s;
          font-size: 18px;
        }
        .icon-btn.wa { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
        .icon-btn.tel { background: rgba(234, 179, 8, 0.15); color: #eab308; }
        .icon-btn:hover { transform: scale(1.08); filter: brightness(1.2); }

        @media (max-width: 1200px) {
          .profile-layout { grid-template-columns: 1fr 280px; gap: 24px; }
        }
        @media (max-width: 992px) {
          .profile-layout { grid-template-columns: 1fr; }
          .finance-summary-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .form-section { grid-template-columns: 1fr; gap: 20px; }
          .finance-summary-grid { grid-template-columns: 1fr; }
          .grid-2 { grid-template-columns: 1fr; gap: 24px; }
          .full-width { grid-column: span 1; }
        }
      `}</style>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        {/* ── Trash button — Doctor only ── */}
        {isDoctor && (
          <button
            onClick={() => setTrashModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(239,68,68,0.1)", color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10,
              padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
              transition: "all 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(239,68,68,0.2)"}
            onMouseOut={e => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
          >
            🗑️ {t("نقل لسلة المحذوفات")}
          </button>
        )}

        {/* ── Ongoing / Done toggle ── */}
        <div style={{
          background: isOngoing ? "#10b981" : "#64748b",
          padding: isMobile ? "6px 16px" : "8px 24px",
          borderRadius: 30, display: "flex", alignItems: "center", gap: 10,
          cursor: canEditPatient ? "pointer" : "default",
          marginRight: isDoctor ? 0 : "auto"
        }} onClick={() => {
          if (!canEditPatient) return;
          const next = !isOngoing;
          setIsOngoing(next);
          saveProfile({ is_ongoing: next ? 1 : 0 });
        }}>
          <span style={{ fontWeight: 700, color: "var(--text-main)", fontSize: isMobile ? 12 : 14 }}>{isOngoing ? t("مستمر") : t("منتهي")}</span>
          <div style={{ width: isMobile ? 18 : 24, height: isMobile ? 18 : 24, borderRadius: "50%", background: "white" }} />
        </div>
      </div>

      <div style={{ 
        display: "flex", gap: 8, marginBottom: 24, padding: 4, 
        background: "var(--panel-bg)", borderRadius: 16,
        overflowX: "auto", whiteSpace: "nowrap"
      }}>
        {[
          { id: "info", label: t("بيانات المريض والمالية"), icon: "👤" },
          showMedicalTabs && { id: "treatment", label: t("العلاجات والوصفات"), icon: "📋" },
          showMedicalTabs && { id: "teeth", label: t("خريطة الأسنان"), icon: "🦷" },
          { id: "appointments", label: t("المواعيد"), icon: "📅" }
        ].filter(Boolean).map(p => (
          <button 
            key={p.id}
            onClick={() => setActivePage(p.id)}
            style={{
              flex: 1, padding: "12px 20px", borderRadius: 12, border: "none",
              background: activePage === p.id ? "var(--primary)" : "transparent",
              color: activePage === p.id ? "white" : "var(--text-muted)",
              cursor: "pointer", transition: "all 0.3s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontWeight: 600, fontSize: 14
            }}
          >
            <span>{p.icon}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {activePage === "info" && (
        <div className="animate-fade">
          <div className="profile-layout">
            <div className="glass-panel" style={{ padding: 24 }}>
              <div className="form-section">
                <div className="input-group">
                  <label className="input-label">{t("الاسم الكامل")}</label>
                  <input className="glass-input" value={patient.first_name + " " + patient.last_name} readOnly style={{ textAlign: lang==="ar"?"right":"left" }} />
                </div>
                <div className="input-group">
                  <label className="input-label">{t("رقم الهاتف")}</label>
                  <div className="contact-pill">
                    <input className="glass-input" style={{ flex: 1, border: "none", background: "transparent" }} value={localPhone} onChange={e => setLocalPhone(e.target.value)} onBlur={() => canEditPatient && localPhone !== patient.phone && saveProfile({ phone: localPhone })} readOnly={!canEditPatient} />
                    <a href="#" className="icon-btn wa" onClick={(e) => {
                      e.preventDefault();
                      const clean = localPhone.replace(/\D/g, '');
                      const finalPhone = clean.startsWith('0') ? '964' + clean.substring(1) : clean.startsWith('964') ? clean : '964' + clean;
                      const msg = (settings.whatsapp_template_followup || "أهلاً {patient}، نود الاطمئنان عليك").replace(/{patient}/g, patient.first_name);
                      if (!finalPhone || finalPhone === '964') return alert(t("رقم غير صحيح"));
                      window.open(`https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(msg)}`, '_blank');
                    }}>💬</a>
                    <a href={`tel:${localPhone}`} className="icon-btn tel">📞</a>
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">{t("العمر")}</label>
                  <input className="glass-input" type="number" value={localAge} onChange={e => setLocalAge(e.target.value)} onBlur={() => canEditPatient && localAge !== patient.age && saveProfile({ age: localAge })} readOnly={!canEditPatient} />
                </div>
                <div className="input-group">
                  <label className="input-label">{t("الجنس")}</label>
                  <div style={{ display: "flex", gap: 16, height: 44, alignItems: "center", background: "var(--panel-bg)", borderRadius: 12, padding: "0 16px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input type="radio" checked={patient.gender === "Male"} onChange={() => canEditPatient && saveProfile({ gender: "Male" })} disabled={!canEditPatient} /> {t("ذكر")}
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input type="radio" checked={patient.gender === "Female"} onChange={() => canEditPatient && saveProfile({ gender: "Female" })} disabled={!canEditPatient} /> {t("أنثى")}
                    </label>
                  </div>
                </div>
                {showMedicalTabs && (
                  <div className="input-group full-width">
                    <label className="input-label">{t("أمراض مزمنة")}</label>
                    <textarea className="glass-input" style={{ minHeight: 80, padding: 12 }} value={localConditions} onChange={e => setLocalConditions(e.target.value)} onBlur={() => canEditPatient && localConditions !== patient.systemic_conditions && saveProfile({ systemic_conditions: localConditions })} readOnly={!canEditPatient} />
                  </div>
                )}
                <div className="input-group full-width">
                  <label className="input-label">{t("ملاحظات")}</label>
                  <textarea className="glass-input" style={{ minHeight: 80, padding: 12 }} value={localNotes} onChange={e => setLocalNotes(e.target.value)} onBlur={() => canEditPatient && localNotes !== patient.notes && saveProfile({ notes: localNotes })} readOnly={!canEditPatient} />
                </div>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: 20 }}>
              <label className="input-label" style={{ marginBottom: 10, display: "block" }}>{t("نوع الحالة")}</label>
              <select className="glass-input" style={{ width: "100%", height: 44, marginBottom: 16 }} value={patient.case_category || ""} onChange={e => canEditPatient && saveProfile({ case_category: e.target.value })} disabled={!canEditPatient}>
                <option value="">{t("اختر...")}</option>
                {getDynamicList('treatment_types', [
                  "فحص دوري", "تنظيف أسنان", "حشو ضرس", "خلع ضرس", "علاج عصب", "تلبيس ضرس", "تقويم أسنان", "تبييض أسنان", "زراعة", "أشعة", "استشارة", "أخرى"
                ]).map(c => <option key={c} value={c}>{t(c)}</option>)}
              </select>

              {showMedicalTabs && (
                <div className="action-card" onClick={() => setShowTimeline(true)} style={{ background: "rgba(0, 210, 255, 0.1)", borderColor: "rgba(0, 210, 255, 0.3)", marginBottom: 12 }}>
                  <div style={{ fontSize: 24 }}>⏳</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--primary)" }}>{t("السجل الزمني المتكامل")}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("عرض تطور الحالة حسب الجلسات")}</div>
                  </div>
                </div>
              )}

              {showMedicalTabs && (
                <button className="btn-primary" onClick={() => {
                  if (startSession) {
                    startSession(id, patient.first_name + " " + patient.last_name, { teeth: patient.teeth || {} });
                    nav("/home");
                  } else {
                    setSessionData({ treatments: [], current: { tooth: "", procedure: "", cost: "", notes: "" }, meds: [], paid: "", teeth: patient.teeth });
                    setSessionStep(0);
                  }
                }} style={{ width: "100%", height: 50, borderRadius: 12, fontSize: 15, fontWeight: 800, background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 8px 16px rgba(16, 185, 129, 0.2)", border: "none" }}>
                  🚀 {t("بدء جلسة العلاج")}
                </button>
              )}
            </div>
          </div>

          {showFinancials && (
            <div style={{ marginTop: 40, borderTop: "1px solid var(--glass-border)", paddingTop: 40 }}>
              <div className="finance-summary-grid">
                <div className="glass-panel" style={{ padding: 16, textAlign: "center", borderLeft: "4px solid var(--primary)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("السعر الكلي")}</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{agreedPrice.toLocaleString()} {t("د")}</div>
                  {canAddPayment && (
                    <button className="btn-ghost" style={{ fontSize: 10, marginTop: 10 }} onClick={() => setPriceModal({ show: true, val: agreedPrice })}>{t("تعديل")}</button>
                  )}
                </div>
                <div className="glass-panel" style={{ padding: 16, textAlign: "center", borderLeft: "4px solid #10b981" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("المدفوع")}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#10b981" }}>{(totalPaid || 0).toLocaleString()} {t("د")}</div>
                </div>
                <div className="glass-panel" style={{ padding: 16, textAlign: "center", borderLeft: "4px solid #ef4444" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("المتبقي")}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#ef4444" }}>{(remaining || 0).toLocaleString()} {t("د")}</div>
                </div>
              </div>
              <div className="glass-panel" style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                  <h3 style={{ fontSize: 18 }}>{t("سجل الدفعات")}</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-secondary" onClick={printPaymentStatement} style={{ padding: "8px 16px" }}>🖨 {t("طباعة كشف الحساب")}</button>
                    {canAddPayment && (
                      <button className="btn-primary" onClick={() => setPayModal({ show: true, amount: remaining > 0 ? remaining : "", session_cost: "", method: "Cash", notes: "" })}>{t("+ إضافة")}</button>
                    )}
                  </div>
                </div>
                <table className="mobile-card-table" style={{ width: "100%" }}>
                  <thead>
                    <tr style={{ textAlign: lang === "ar" ? "right" : "left", fontSize: 12, color: "var(--text-muted)" }}>
                      <th style={{ padding: 10 }}>{t("التاريخ")}</th>
                      <th style={{ padding: 10 }}>{t("المبلغ")}</th>
                      <th style={{ padding: 10 }}>{t("ملاحظات")}</th>
                      <th style={{ padding: 10 }}>{t("إجراء")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPayments.map((p, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                        <td data-label={t("التاريخ")} style={{ padding: 10 }}>{p.date}</td>
                        <td data-label={t("المبلغ")} style={{ padding: 10, fontWeight: 700, color: (parseFloat(p.paid) || 0) > 0 ? "#10b981" : "var(--text-main)" }}>
                          {(parseFloat(p.paid) || parseFloat(p.paid_amount) || 0).toLocaleString()} د
                        </td>
                        <td data-label={t("ملاحظات")} style={{ padding: 10, color: "var(--text-muted)", fontSize: 13 }}>{p.notes}</td>
                        <td data-label={t("إجراء")} style={{ padding: 10 }}>
                          <button 
                            onClick={() => printReceiptIframe({
                              date: p.date,
                              patient_name: patient.first_name + " " + patient.last_name,
                              total_price: agreedPrice,
                              paid: (parseFloat(p.paid) || parseFloat(p.paid_amount) || 0),
                              patient_debt: p.patient_debt || 0,
                              total_debt: (p.patient_debt || 0) + (parseFloat(p.paid) || parseFloat(p.paid_amount) || 0)
                            })}
                            className="btn-ghost" style={{ padding: "4px 8px" }} title={t("طباعة وصل")}>🖨</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activePage === "treatment" && (
        <div className="animate-fade" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: 24 }}>
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18 }}>📋 {t("العلاجات")}</h3>
              <button className="btn-primary" onClick={() => setIsAddingTreatment(true)}>{t("+ إضافة")}</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(patient.treatments || []).map((tr, i) => (
                <div key={i} style={{ padding: 16, background: "var(--panel-bg)", borderRadius: 12, borderLeft: "4px solid var(--primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {tr.date} - <span style={{ color: "var(--primary)" }}>#{tr.tooth_number}</span>
                      <span style={{ color: "var(--success)", marginRight: 8 }}>{(tr.cost || 0).toLocaleString()} د</span>
                    </div>
                    <div style={{ fontSize: 15, marginTop: 4 }}>{tr.procedure}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{tr.notes}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => {
                      setEditTreatment(tr);
                      setEditTreatmentForm({
                        tooth_number: tr.tooth_number || "",
                        procedure: tr.procedure || "",
                        notes: tr.notes || "",
                        cost: tr.cost || 0,
                        date: tr.date || ""
                      });
                    }} className="btn-ghost" style={{ color: "var(--primary)", padding: "4px 8px" }}>✏️</button>
                    <button onClick={() => setConfirmModal({ show: true, title: t("حذف العلاج"), message: t("هل أنت متأكد من حذف هذا الإجراء؟"), onConfirm: () => deleteTreatment(tr.id).then(load) })} className="btn-ghost" style={{ color: "#ef4444", padding: "4px 8px" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18 }}>💊 {t("الوصفات")}</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-ghost" onClick={() => setTab("smart-prescription")}>📝</button>
                <button className="btn-ghost" onClick={() => setTab("prescriptions")}>📸</button>
              </div>
            </div>
            {(patient.prescriptions || []).map(pr => (
              <div key={pr.id} className="action-card" onClick={() => setViewingPrescription(pr)} style={{ margin: "0 0 10px 0", padding: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{pr.date}</div>
                  <div style={{ fontSize: 14 }}>{pr.meds || t("وصفة مصورة")}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
                  {canEditPrescription(pr) && (
                    <button onClick={() => setEditingPrescription(pr)} className="btn-ghost" style={{ color: "var(--primary)" }}>✏️</button>
                  )}
                  <button onClick={() => window.open(getPrescriptionPDFUrl(pr.id), "_blank")} className="btn-ghost">🖨</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activePage === "teeth" && (
        <div className="animate-fade">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <div style={{ background: "var(--panel-bg)", padding: 6, borderRadius: 16, display: "flex", gap: 8 }}>
              <button onClick={() => setMapMode("2D")} style={{ padding: "8px 24px", borderRadius: 12, border: "none", background: mapMode === "2D" ? "var(--primary)" : "transparent", color: mapMode === "2D" ? "white" : "var(--text-muted)", fontWeight: 700, cursor: "pointer", transition: "0.3s" }}>2D View</button>
              <button onClick={() => setMapMode("3D")} style={{ padding: "8px 24px", borderRadius: 12, border: "none", background: mapMode === "3D" ? "var(--primary)" : "transparent", color: mapMode === "3D" ? "white" : "var(--text-muted)", fontWeight: 700, cursor: "pointer", transition: "0.3s" }}>3D View ✨</button>
            </div>
          </div>
          <div className="glass-panel" style={{ padding: 24 }}>
            {mapMode === "2D" ? (
              <TeethMap pid={id} initial={patient.teeth} treatments={patient.treatments || []} 
                onToothClick={(tid) => { 
                  // Just select it to show history, don't force open the modal!
                }} 
                onAddTreatment={(tid) => {
                  setNewTreatment(prev => ({ ...prev, tooth_number: tid || "" }));
                  setIsAddingTreatment(true);
                }}
              />
            ) : (
              <TeethMap3D 
                pid={id} 
                data={patient.teeth} 
                treatments={patient.treatments || []}
                onChange={(newData) => saveTeeth(id, newData).then(load)}
                onToothClick={(tid) => {
                  console.log("Tooth clicked:", tid);
                  // Disabled automatic popup per user request to test OTA updates
                  // setNewTreatment(prev => ({ ...prev, tooth_number: tid || "" }));
                  // setIsAddingTreatment(true);
                }}
              />
            )}
          </div>
        </div>
      )}

      {activePage === "appointments" && (
        <div className="animate-fade">
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, marginBottom: 20 }}>📅 {t("المواعيد")}</h3>
            {(patient.visits || []).map(v => (
              <div key={v.id} style={{ padding: 16, background: "var(--panel-bg)", borderRadius: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>{v.date} · {format12h(v.time, lang)}</span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: "rgba(0,210,255,0.1)", color: "var(--primary)" }}>{v.status}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{v.type} ({v.duration_min} {t("دقيقة")})</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals and Common Elements */}
      {isAddingTreatment && (
        <Modal title={t("إضافة إجراء")} onClose={() => setIsAddingTreatment(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <input className="glass-input" placeholder={t("رقم السن")} value={newTreatment.tooth_number} onChange={e => setNewTreatment({...newTreatment, tooth_number: e.target.value})} />
            <select className="glass-input" value={newTreatment.procedure} onChange={e => setNewTreatment({...newTreatment, procedure: e.target.value})}>
              <option value="">-- {t("اختر الإجراء")} --</option>
              {getDynamicList('treatment_types', [
                "فحص دوري", "تنظيف أسنان", "حشو ضرس", "خلع ضرس", "علاج عصب", "تلبيس ضرس", "تقويم أسنان", "تبييض أسنان", "زراعة", "أشعة", "استشارة", "أخرى"
              ]).map(c => <option key={c} value={c}>{t(c)}</option>)}
            </select>
            <textarea className="glass-input" placeholder={t("ملاحظات")} value={newTreatment.notes} onChange={e => setNewTreatment({...newTreatment, notes: e.target.value})} />
            <button className="btn-primary" onClick={() => addTreatment(id, { ...newTreatment, cost: 0 }).then(() => { setIsAddingTreatment(false); load(); })}>{t("حفظ")}</button>
          </div>
        </Modal>
      )}

      {tab === "smart-prescription" && <Modal title={t("وصفة ذكية")} onClose={() => setTab(null)}><PrescriptionModal patient={patient} onClose={() => setTab(null)} onRefresh={load} /></Modal>}
      {tab === "prescriptions" && (
        <Modal title={t("رفع وصفة")} onClose={() => setTab(null)}>
          <input type="file" onChange={async (e) => { const fd = new FormData(); fd.append("image", e.target.files[0]); fd.append("date", localDate()); await uploadPrescription(id, fd); load(); setTab(null); }} />
        </Modal>
      )}
      {viewingPrescription && <Modal title={t("عرض")} onClose={() => setViewingPrescription(null)}><PrescriptionModal patient={patient} onClose={() => setViewingPrescription(null)} onRefresh={load} existingData={viewingPrescription} /></Modal>}
      {payModal.show && (
        <Modal title={t("إضافة دفعة")} onClose={() => setPayModal({...payModal, show: false})}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <input type="text" className="glass-input" placeholder={t("المبلغ")} value={payModal.amount ? Number(payModal.amount).toLocaleString() : ""} onChange={e => setPayModal({...payModal, amount: e.target.value.replace(/\D/g, "")})} />
            <input className="glass-input" placeholder={t("ملاحظات")} value={payModal.notes} onChange={e => setPayModal({...payModal, notes: e.target.value})} />
            <button className="btn-primary" onClick={addPayment}>{t("حفظ")}</button>
          </div>
        </Modal>
      )}
      {showTimeline && (
        <Modal title={t("السجل الطبي الزمني")} onClose={() => setShowTimeline(false)} width={1100}>
          <ClinicalTimeline patient={patient} treatments={patient.treatments || []} prescriptions={patient.prescriptions || []} visits={patient.visits || []} pid={id} />
        </Modal>
      )}

      {confirmModal.show && (
        <Modal title={confirmModal.title} onClose={() => setConfirmModal({ ...confirmModal, show: false })}>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ marginBottom: 30, fontSize: 16 }}>{confirmModal.message}</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmModal({ ...confirmModal, show: false })}>{t("إلغاء")}</button>
              <button className="btn-primary" style={{ flex: 1, background: "#ef4444" }} onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, show: false }); }}>{t("تأكيد الحذف")}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Treatment Modal ── */}
      {editTreatment && (
        <Modal title={t("تعديل إجراء")} onClose={() => setEditTreatment(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={lblStyle}>{t("رقم السن")}</label>
              <input className="glass-input" style={{ width: "100%" }} value={editTreatmentForm.tooth_number} onChange={e => setEditTreatmentForm({...editTreatmentForm, tooth_number: e.target.value})} />
            </div>
            <div>
              <label style={lblStyle}>{t("الإجراء")}</label>
              <select className="glass-input" style={{ width: "100%" }} value={editTreatmentForm.procedure} onChange={e => setEditTreatmentForm({...editTreatmentForm, procedure: e.target.value})}>
                <option value="">-- {t("اختر الإجراء")} --</option>
                {getDynamicList('treatment_types', [
                  "فحص دوري", "تنظيف أسنان", "حشو ضرس", "خلع ضرس", "علاج عصب", "تلبيس ضرس", "تقويم أسنان", "تبييض أسنان", "زراعة", "أشعة", "استشارة", "أخرى"
                ]).map(c => <option key={c} value={c}>{t(c)}</option>)}
              </select>
            </div>
            <div>
              <label style={lblStyle}>{t("التكلفة")}</label>
              <input type="number" className="glass-input" style={{ width: "100%" }} value={editTreatmentForm.cost} onChange={e => setEditTreatmentForm({...editTreatmentForm, cost: e.target.value})} />
            </div>
            <div>
              <label style={lblStyle}>{t("التاريخ")}</label>
              <DatePicker value={editTreatmentForm.date} onChange={val => setEditTreatmentForm({...editTreatmentForm, date: val})} />
            </div>
            <div>
              <label style={lblStyle}>{t("ملاحظات")}</label>
              <textarea className="glass-input" style={{ width: "100%", minHeight: 80 }} value={editTreatmentForm.notes} onChange={e => setEditTreatmentForm({...editTreatmentForm, notes: e.target.value})} />
            </div>
            <button className="btn-primary" onClick={saveEditTreatment}>{t("حفظ التعديل")}</button>
          </div>
        </Modal>
      )}

      {/* ── Edit Prescription Modal ── */}
      {editingPrescription && (
        <Modal title={t("تعديل الوصفة الطبية")} onClose={() => setEditingPrescription(null)}>
          <PrescriptionModal 
            patient={patient} 
            onClose={() => setEditingPrescription(null)} 
            onRefresh={load} 
            existingData={editingPrescription} 
            isEditing={true} 
          />
        </Modal>
      )}

      {priceModal.show && (
        <Modal title={t("تعديل السعر الكلي")} onClose={() => setPriceModal({ ...priceModal, show: false })}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label className="input-label">{t("السعر الجديد المتفق عليه")}:</label>
            <input className="glass-input" type="text" value={priceModal.val ? Number(priceModal.val).toLocaleString() : ""} onChange={e => setPriceModal({ ...priceModal, val: e.target.value.replace(/\D/g, "") })} />
            <button className="btn-primary" onClick={() => {
              const amount = parseFloat(priceModal.val) || 0;
              saveProfile({ total_agreed_price: amount });
              setPriceModal({ ...priceModal, show: false });
            }}>{t("حفظ التغيير")}</button>
          </div>
        </Modal>
      )}
      {sessionStep !== null && (
        <Modal title={t("جلسة علاج جديدة")} onClose={() => setSessionStep(null)} width={900}>
          <div style={{ minHeight: 500, display: "flex", flexDirection: "column" }}>
            {/* Wizard Progress Bar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 30 }}>
               {[t("البداية"), t("التشخيص"), t("الإجراء"), t("الوصفة"), t("صورة"), t("الملخص")].map((label, i) => (
                 <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: sessionStep >= i ? "var(--primary)" : "var(--panel-bg)", transition: "0.3s" }} />
               ))}
            </div>

            <div style={{ flex: 1 }}>
                {sessionStep === 0 && (
                  <div className="animate-fade" style={{ textAlign: "center", padding: "40px 0" }}>
                    <div style={{ fontSize: 60, marginBottom: 20 }}>🩺</div>
                    <h2>{t("بدء جلسة جديدة للمريض")}</h2>
                    <p style={{ color: "var(--text-muted)" }}>{patient.first_name} {patient.last_name}</p>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--primary)", marginTop: 20 }}>📅 {localDate()} · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                    
                    <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 40 }}>
                      <button className="btn-primary" style={{ padding: "12px 30px" }} onClick={() => {
                          setSessionData({...sessionData, teeth: patient.teeth || {}});
                          setSessionStep(1);
                      }}>{t("جلسة جديدة")} →</button>
                      
                      {patient.treatments?.length > 0 && (
                        <button className="btn-ghost" 
                          style={{ padding: "12px 30px", borderColor: "var(--primary)", background: "rgba(24, 95, 165, 0.1)" }} 
                          onClick={() => {
                            const last = [...patient.treatments].sort((a,b) => (b.id || 0) - (a.id || 0))[0];
                            const fixedId = String(last.tooth_number);
                            setSessionData({
                              ...sessionData,
                              teeth: patient.teeth || {},
                              current: { ...sessionData.current, tooth: fixedId }
                            });
                            setSessionStep(1); // Goes to map, which now auto-selects by ID
                          }}>
                          🔄 {t("إكمال العمل")} (#{patient.treatments[patient.treatments.length - 1].tooth_number})
                        </button>
                      )}
                    </div>
                  </div>
                )}

               
                {sessionStep > 0 && sessionStep < 5 && (
                  <div className="animate-fade" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, alignItems: "start" }}>
                    
                    {/* Right Panel: Teeth Map (Only in Step 1) */}
                    {sessionStep === 1 && (
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
                                 setSessionData({...sessionData, current: { ...sessionData.current, tooth: "General" }});
                                 setSessionStep(2);
                               }}
                               className="btn-secondary"
                               style={{ padding: "10px 20px", borderRadius: 12, fontWeight: 800 }}
                             >
                               🌐 {t("إجراء عام")}
                             </button>
                             <button className="btn-ghost" onClick={() => setSessionStep(0)}>← {t("إلغاء الجلسة")}</button>
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "center", height: 500, width: "100%" }}>
                          <TeethMap3D 
                            pid={id} 
                            data={sessionData.teeth} 
                            onChange={(newData) => setSessionData({...sessionData, teeth: newData})}
                            treatments={patient.treatments || []} 
                            focusedTooth={sessionData.current.tooth}
                            onToothClick={(tid) => {
                              if (tid !== "Manual") {
                                setSessionData({...sessionData, current: { ...sessionData.current, tooth: tid }});
                                setSessionStep(2);
                              }
                            }} 
                          />
                        </div>

                        {sessionData.treatments.length > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, borderTop: "1px solid var(--glass-border)", paddingTop: 16 }}>
                            <div>
                              <h4 style={{ margin: "0 0 12px 0", fontSize: 14, color: "var(--success)", fontWeight: 800 }}>✅ {t("إجراءات مضافة:")}</h4>
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
                                    {tr.tooth === "General" ? `🌐 ${t("عام")}` : `#${tr.tooth}`}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <button className="btn-primary" onClick={() => setSessionStep(3)} style={{ padding: "10px 24px" }}>
                              {t("التالي: الوصفة الطبية")} →
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Left Panel: Wizard Content */}
                    {(sessionStep > 1) && (
                    <div className="glass-panel animate-fade" style={{ padding: 24, borderRadius: 20 }}>

                       {sessionStep === 2 && (
                         <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                           <h3 style={{ margin: 0, fontSize: 18 }}>📋 {t("خطوة 3: تفاصيل الإجراء")} ({sessionData.current.tooth === "General" ? t("إجراء عام") : `#${sessionData.current.tooth}`})</h3>
                           
                              <label className="input-label" style={{ fontWeight: 700, margin: 0 }}>{t("الإجراء الطبي")}</label>
                              <select 
                                className="glass-input" 
                                value={sessionData.current.procedure} 
                                onChange={e => setSessionData({...sessionData, current: { ...sessionData.current, procedure: e.target.value }})}
                                style={{ width: "100%", height: 48 }}
                              >
                                <option value="" disabled>{t("-- اختر الإجراء --")}</option>
                                {getDynamicList("treatment_types", ["فحص دوري", "تنظيف أسنان", "حشو ضرس", "خلع ضرس", "علاج عصب", "تلبيس ضرس", "تقويم أسنان", "تبييض أسنان", "زراعة", "أشعة", "استشارة", "أخرى"]).map((trt, i) => (
                                  <option key={i} value={trt}>{trt}</option>
                                ))}
                              </select>

                              {/* Previous History for this tooth */}
                              {sessionData.current.tooth && sessionData.current.tooth !== "General" && patient.treatments?.some(tr => String(tr.tooth_number) === String(sessionData.current.tooth)) && (
                                <div style={{ background: "rgba(245, 158, 11, 0.05)", padding: 12, borderRadius: 12, border: "1px solid rgba(245, 158, 11, 0.2)", fontSize: 11 }}>
                                  <div style={{ color: "#f59e0b", fontWeight: 800, marginBottom: 6, fontSize: 10 }}>🕒 {t("تاريخ العمل على هذا السن")}:</div>
                                  {patient.treatments.filter(tr => String(tr.tooth_number) === String(sessionData.current.tooth)).slice(-2).reverse().map((tr, i) => (
                                    <div key={i} style={{ marginBottom: 4, opacity: 0.8 }}>
                                      • {tr.date}: <strong>{tr.procedure}</strong>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              <label className="input-label" style={{ fontWeight: 700, margin: 0 }}>{t("ملاحظات طبية")}</label>
                              <textarea className="glass-input" placeholder={t("ملاحظات طبية")} style={{ minHeight: 120, padding: 12 }} value={sessionData.current.notes} onChange={e => setSessionData({...sessionData, current: { ...sessionData.current, notes: e.target.value }})} />
                              
                              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setSessionStep(1)}>← {t("رجوع")}</button>
                                <button className="btn-ghost" style={{ flex: 1, borderColor: "var(--primary)" }} onClick={() => {
                                    if (!sessionData.current.procedure) return alert(t("يرجى إدخال الإجراء أولاً"));
                                    const fixedToothId = sessionData.current.tooth ? String(sessionData.current.tooth) : "General";
                                    setSessionData({
                                      ...sessionData,
                                      treatments: [...sessionData.treatments, { ...sessionData.current, tooth: fixedToothId }],
                                      current: { tooth: "", procedure: "", notes: "" }
                                    });
                                    setSessionStep(1);
                                 }}>➕ {t("حفظ وإضافة سن آخر")}</button>
                              </div>
                              
                              <button className="btn-primary" style={{ width: "100%", height: 48, marginTop: 10 }} onClick={() => {
                                  if (!sessionData.current.procedure && sessionData.treatments.length === 0) return alert(t("يرجى إدخال إجراء واحد على الأقل"));
                                  let finalTreatments = [...sessionData.treatments];
                                  if (sessionData.current.procedure) {
                                    const fixedToothId = sessionData.current.tooth ? String(sessionData.current.tooth) : "General";
                                    finalTreatments.push({ ...sessionData.current, tooth: fixedToothId });
                                  }
                                  setSessionData({...sessionData, treatments: finalTreatments, current: { tooth: "", procedure: "", notes: "" }});
                                  setSessionStep(3);
                              }}>{t("حفظ والذهاب للوصفة")} →</button>
                         </div>
                       )}

                       {sessionStep === 3 && (
                         <div className="animate-fade">
                           <h3 style={{ marginBottom: 20 }}>💊 {t("خطوة 4: كتابة الوصفة (اختياري)")}</h3>
                           <PrescriptionModal 
                              patient={patient} 
                              onClose={() => setSessionStep(4)} 
                              onAdd={(meds) => setSessionData(prev => ({...prev, meds}))}
                              initialMeds={sessionData.meds}
                              initialDiagnosis={sessionData.treatments.map(t => t.procedure).join(", ")}
                              isWizard
                           />
                           <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20 }}>
                             <button className="btn-secondary" style={{ padding: "12px 30px" }} onClick={() => setSessionStep(2)}>← {t("السابق")}</button>
                             <button className="btn-primary" style={{ padding: "12px 40px" }} onClick={() => setSessionStep(4)}>{t("التالي: إضافة صورة")} →</button>
                           </div>
                         </div>
                       )}

                       {sessionStep === 4 && (
                         <div className="animate-fade" style={{ textAlign: "center" }}>
                           <h3 style={{ marginBottom: 20 }}>📸 {t("خطوة 5: إضافة صورة (اختياري)")}</h3>
                           <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>{t("يمكنك التقاط صورة أو رفع صورة للمريض في هذه الجلسة. هذه الصورة لن تظهر في الطباعة المرفقة.")}</p>
                           
                           <div style={{ marginBottom: 30 }}>
                             <input type="file" id="session-photo-upload" accept="image/*" hidden onChange={e => {
                               const f = e.target.files[0];
                               if (f) {
                                 const reader = new FileReader();
                                 reader.onloadend = () => setSessionData({...sessionData, photo: reader.result});
                                 reader.readAsDataURL(f);
                               }
                             }} />
                             <label htmlFor="session-photo-upload" style={{ 
                               display: "block", height: 200, border: "2px dashed var(--primary)", 
                               borderRadius: 16, background: "rgba(0,210,255,0.05)", cursor: "pointer", 
                               overflow: "hidden", position: "relative" 
                             }}>
                               {sessionData.photo ? (
                                 <img src={sessionData.photo} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                               ) : (
                                 <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
                                   <span style={{ fontSize: 40, marginBottom: 10 }}>📷</span>
                                   <span style={{ color: "var(--primary)", fontWeight: 600 }}>{t("انقر هنا لاختيار أو التقاط صورة")}</span>
                                 </div>
                               )}
                             </label>
                             {sessionData.photo && (
                               <button className="btn-ghost" style={{ marginTop: 10, color: "var(--danger)" }} onClick={() => setSessionData({...sessionData, photo: null})}>
                                 🗑️ {t("إزالة الصورة")}
                               </button>
                             )}
                           </div>

                           <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                             <button className="btn-secondary" style={{ padding: "12px 30px" }} onClick={() => setSessionStep(3)}>← {t("السابق")}</button>
                             <button className="btn-primary" style={{ padding: "12px 40px" }} onClick={() => setSessionStep(5)}>{t("التالي: الملخص النهائي")} →</button>
                           </div>
                         </div>
                       )}
                    </div>
                    )}
                  </div>
                )}

                {sessionStep === 5 && (
                 <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                   <div id="printable-session-summary" style={{ 
                     background: "white", 
                     color: "black", 
                     padding: isMobile ? "20px" : "40px", 
                     borderRadius: "8px", 
                     boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                     width: "100%",
                     maxWidth: "800px",
                     margin: "0 auto",
                     fontFamily: "'Inter', 'Cairo', sans-serif"
                   }}>
                      {/* Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #f1f5f9", paddingBottom: "20px", marginBottom: "20px", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                          {settings?.clinic_logo ? (
                            <img src={BASE + settings.clinic_logo} alt="Logo" style={{ width: 60, height: 60, borderRadius: "8px", objectFit: "contain" }} />
                          ) : (
                            <div style={{ width: 60, height: 60, background: "#f8fafc", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🏥</div>
                          )}
                          <div>
                            <div style={{ fontWeight: 800, fontSize: isMobile ? 18 : 24, color: "#1e293b" }}>{settings?.clinic_name || "SmileCare Clinic"}</div>
                            {settings?.doctor_name && <div style={{ fontSize: isMobile ? 12 : 16, color: "#64748b" }}>{settings.doctor_name}</div>}
                          </div>
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <h2 style={{ margin: 0, color: "#0ea5e9", fontSize: isMobile ? 18 : 24 }}>{t("تقرير الجلسة")}</h2>
                          <div style={{ fontWeight: 600, color: "#64748b", marginTop: 5, fontSize: isMobile ? 12 : 14 }}>{localDate()}</div>
                        </div>
                      </div>
                      
                      {/* Patient Details */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 15 : 40, marginBottom: 30, padding: "15px", background: "#f8fafc", borderRadius: "8px" }}>
                        <div><span style={{ color: "#64748b", fontSize: 13 }}>{t("المريض")}:</span> <strong style={{ fontSize: 16, marginLeft: 8 }}>{patient.first_name + " " + patient.last_name}</strong></div>
                        <div><span style={{ color: "#64748b", fontSize: 13 }}>{t("العمر")}:</span> <strong style={{ fontSize: 16, marginLeft: 8 }}>{patient.age}</strong></div>
                        <div><span style={{ color: "#64748b", fontSize: 13 }}>{t("الجنس")}:</span> <strong style={{ fontSize: 16, marginLeft: 8 }}>{patient.gender}</strong></div>
                      </div>

                      {/* Main Content Grid */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
                        {/* Treatments */}
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 18, color: "#1e293b", marginBottom: 15, borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>🦷 {t("الإجراءات المنفذة")}</div>
                          {sessionData.treatments.length > 0 ? (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ background: "#f1f5f9" }}>
                                  <th style={{ padding: "10px", color: "#64748b", textAlign: "right" }}>{t("السن")}</th>
                                  <th style={{ padding: "10px", color: "#64748b", textAlign: "right" }}>{t("الإجراء الطبي")}</th>
                                  <th style={{ padding: "10px", color: "#64748b", textAlign: "right" }}>{t("ملاحظات")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sessionData.treatments.map((tr, i) => (
                                  <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                    <td style={{ padding: "12px 10px", fontWeight: "bold", width: "80px" }}>{tr.tooth === "General" ? `🌐 ${t("عام")}` : `#${tr.tooth}`}</td>
                                    <td style={{ padding: "12px 10px", color: "#1e293b", fontWeight: 600 }}>{tr.procedure}</td>
                                    <td style={{ padding: "12px 10px", color: "#64748b", fontSize: 13 }}>{tr.notes || "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div style={{ color: "#94a3b8", fontStyle: "italic", padding: "10px" }}>{t("لا توجد إجراءات مسجلة لهذه الجلسة.")}</div>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: 30, alignItems: "stretch", flexWrap: isMobile ? "wrap" : "nowrap" }}>
                          {/* 3D Map */}
                          <div style={{ flex: 1, minWidth: "250px" }}>
                            <div style={{ fontWeight: 800, fontSize: 18, color: "#1e293b", marginBottom: 15, borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>🗺️ {t("مخطط الأسنان")}</div>
                            <div className="summary-3d-container" style={{ position: "relative", width: "100%", height: "250px", background: "#f8fafc", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0", display: "block" }}>
                              <TeethMap3D 
                                 pid={id} 
                                 data={sessionData.teeth} 
                                 onChange={() => {}} 
                                 treatments={sessionData.treatments} 
                                 noControls={true}
                                 forceFullView={true}
                              />
                            </div>
                          </div>

                          {/* Meds */}
                          <div style={{ flex: 1, minWidth: "250px" }}>
                            <div style={{ fontWeight: 800, fontSize: 18, color: "#1e293b", marginBottom: 15, borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>💊 {t("الأدوية الموصوفة")}</div>
                            {sessionData.meds?.length > 0 ? (
                              <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
                                {sessionData.meds.map((m, i) => (
                                  <li key={i} style={{ marginBottom: 10, padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                    <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>{m.name} <span style={{ fontWeight: 400, fontSize: 12, color: "#64748b" }}>({m.form})</span></div>
                                    <div style={{ fontSize: 13, color: "#334155" }}>
                                      <strong>{t("الجرعة")}:</strong> {m.dose} <span style={{ margin: "0 6px", color: "#cbd5e1" }}>|</span> 
                                      <strong>{t("التكرار")}:</strong> {m.timing} <span style={{ margin: "0 6px", color: "#cbd5e1" }}>|</span> 
                                      <strong>{t("المدة")}:</strong> {m.duration}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div style={{ color: "#94a3b8", fontStyle: "italic", padding: "20px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>{t("لم يتم صرف أدوية في هذه الجلسة")}</div>
                            )}
                          </div>
                        </div>
                      </div>

                       <style>{`
                         @media print {
                           body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                           body * { visibility: hidden; }
                           #printable-session-summary, #printable-session-summary * { visibility: visible; }
                           #printable-session-summary { 
                             position: absolute; 
                             left: 0; 
                             top: 0; 
                             width: 100%; 
                             background: white !important; 
                             padding: 20px !important;
                             margin: 0 !important;
                             box-shadow: none !important;
                           }
                           .no-print { display: none !important; visibility: hidden !important; }
                         }
                       `}</style>
                   </div>
                   
                   {sessionData.photo && (
                     <div className="no-print" style={{ background: "var(--panel-bg)", padding: 20, borderRadius: 12, marginTop: 20, textAlign: "center" }}>
                       <div style={{ fontWeight: 600, marginBottom: 10, color: "var(--text-muted)" }}>📸 {t("صورة الجلسة المرفقة (لا تظهر في الطباعة)")}</div>
                       <img src={sessionData.photo} style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8, objectFit: "contain", border: "1px solid var(--glass-border)" }} />
                     </div>
                   )}
                   
                   <div style={{ display: "flex", gap: 12, marginTop: 20 }} className="no-print">
                      <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setSessionStep(4)}>← {t("السابق")}</button>
                      <button className="btn-ghost" style={{ flex: 1, border: "2px solid #cbd5e1", background: "white", color: "#0ea5e9", fontWeight: "bold" }} onClick={() => window.print()}>
                        🖨 {t("طباعة التقرير")}
                      </button>
                      <button className="btn-primary" disabled={isSavingSession} style={{ flex: 2, position: "relative" }} onClick={async () => {
                          setIsSavingSession(true);
                          try {
                            if (sessionData.teeth) await saveTeeth(id, sessionData.teeth);
                            for (const tr of sessionData.treatments) {
                              await addTreatment(id, { 
                                tooth_number: tr.tooth, 
                                procedure: tr.procedure, 
                                cost: parseFloat(tr.cost || 0),
                                notes: tr.notes,
                                date: localDate()
                              });
                            }
                            const today = localDate();
                            const todayApt = patient.visits?.find(v => v.date === today);
                            const teethSnapshot = JSON.stringify(sessionData.teeth);
                            if (todayApt) {
                              await updateAppointment(todayApt.id, { status: 'finished', teeth_snapshot: teethSnapshot, image_url: sessionData.photo });
                            } else {
                              await addAppointment({
                                patient_id: id, date: today,
                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                                type: t("جلسة علاج"), status: 'finished', teeth_snapshot: teethSnapshot, image_url: sessionData.photo
                              });
                            }
                            if (sessionData.paid) {
                               await addInvoice({
                                 patient_id: parseInt(id), total_amount: 0,
                                 paid_amount: parseFloat(sessionData.paid), payment_method: "Cash",
                                 date: localDate(), notes: t("دفعة جلسة تشمل: ") + sessionData.treatments.map(t=>t.tooth).join(", ")
                               });
                            }
                            if (sessionData.meds?.length > 0) {
                               const diagStr = sessionData.treatments.map(t => t.procedure).join(", ");
                               await createSmartPrescription({
                                 patient_id: parseInt(id), diagnosis: diagStr || "Dental Treatment",
                                 drugs: sessionData.meds, custom_info: { name: patient.first_name + " " + patient.last_name, age: patient.age, gender: patient.gender, date: localDate() }
                               });
                            }
                            setSessionStep(null);
                            load();
                          } catch (e) {
                            alert(t("حدث خطأ أثناء الحفظ: ") + e.message);
                          } finally {
                            setIsSavingSession(false);
                          }
                       }}>{isSavingSession ? t("جاري الحفظ...") : t("إنهاء وحفظ الجلسة") + " ✓"}</button>
                   </div>
                 </div>
               )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ClinicalTimeline({ patient, treatments, prescriptions, visits, pid }) {
  const { t, lang } = useLanguage();
  const { settings } = useSettings();
  const [expandedSession, setExpandedSession] = useState(null); // stores 'tooth-date' of expanded session
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 1. Group events by date
  const eventsByDate = {};
  const allEvents = [
    ...treatments.map(t => ({ ...t, type: 'treatment' })),
    ...prescriptions.map(p => ({ ...p, type: 'prescription' })),
    ...visits.map(v => ({ ...v, type: 'visit' }))
  ];

  allEvents.forEach(ev => {
    const dateKey = ev.date ? ev.date.split(' ')[0] : 'Unknown';
    if (!eventsByDate[dateKey]) eventsByDate[dateKey] = { treatments: [], prescriptions: [], visits: [], date: dateKey };
    if (ev.type === 'treatment') eventsByDate[dateKey].treatments.push(ev);
    else if (ev.type === 'prescription') eventsByDate[dateKey].prescriptions.push(ev);
    else if (ev.type === 'visit') eventsByDate[dateKey].visits.push(ev);
  });

  // 2. Map sessions (dates) to Teeth
  const teethHistory = {};
  
  Object.values(eventsByDate).forEach(session => {
    // Collect all unique teeth treated in this session
    const sessionTeeth = new Set();
    if (session.treatments.length === 0) {
      sessionTeeth.add("General");
    } else {
      session.treatments.forEach(tr => {
        const toothNum = tr.tooth_number ? String(tr.tooth_number).trim() : "General";
        if (toothNum.toLowerCase() === "general") {
          sessionTeeth.add("General");
        } else {
          const matches = toothNum.match(/\d+/g);
          if (matches) {
            matches.forEach(m => sessionTeeth.add(m));
          } else {
            sessionTeeth.add(toothNum);
          }
        }
      });
    }

    // Add this session's date to each tooth's history
    sessionTeeth.forEach(tNum => {
      if (!teethHistory[tNum]) {
        teethHistory[tNum] = { tooth: tNum, sessions: new Set(), latestDate: '0000-00-00' };
      }
      teethHistory[tNum].sessions.add(session.date);
      if (session.date > teethHistory[tNum].latestDate) {
        teethHistory[tNum].latestDate = session.date;
      }
    });
  });

  // 3. Sort teeth by the most recent session date
  const sortedTeeth = Object.values(teethHistory).sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate));

  const printSession = (dateKey, toothNum) => {
      const content = document.getElementById(`printable-session-${dateKey}`);
      if (!content) return;
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <html dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
          <head>
            <title>Session Report - ${dateKey}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
              body { font-family: 'Cairo', sans-serif; padding: 40px; background: white; color: black; line-height: 1.6; }
              .glass-panel { padding: 15px; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; }
              .glass-panel div { color: #1e293b !important; } /* Force dark text for print */
              .btn-ghost, .btn-primary, .btn-secondary, button { display: none !important; }
              .no-print { display: none !important; }
              h2, h3, h4 { margin-top: 0; color: #0f172a; }
              img { max-width: 100%; height: auto; }
              .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
            </style>
          </head>
          <body>
            <div class="header">
               <h2>${settings?.clinic_name || 'SmileCare Clinic'}</h2>
               <h3>${t("ملخص جلسة علاج المريض")}: ${patient.first_name} ${patient.last_name}</h3>
               <p style="color: #64748b; margin: 0;">${t("تاريخ الجلسة")}: <strong>${dateKey}</strong> | ${t("السن المعالج")}: <strong>${toothNum}</strong></p>
            </div>
            ${content.innerHTML}
          </body>
        </html>
      `);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
  };

  return (
    <div style={{ minHeight: 600, padding: isMobile ? 10 : 20 }}>
      <h2 style={{ marginBottom: 30, textAlign: "center", fontSize: 24, fontWeight: 800 }}>🦷 {t("السجل العلاجي (حسب السن)")}</h2>
      
      {sortedTeeth.length === 0 ? (
         <div style={{ textAlign: "center", padding: "100px 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📁</div>
            <div>{t("لا توجد إجراءات أو جلسات مسجلة بعد.")}</div>
         </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          {sortedTeeth.map(toothObj => {
             const toothLabel = toothObj.tooth === "General" ? t("إجراء عام (كافة الأسنان)") : `${t("السن رقم")} #${toothObj.tooth}`;
             const sortedSessions = Array.from(toothObj.sessions).sort((a, b) => new Date(b) - new Date(a));
             
             return (
               <div key={toothObj.tooth} className="glass-panel" style={{ padding: 20, borderTop: "4px solid var(--primary)" }}>
                  <h3 style={{ margin: 0, marginBottom: 20, fontSize: 20, color: "var(--text-main)", fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
                     <span style={{ fontSize: 24 }}>🦷</span> {toothLabel}
                  </h3>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                     {sortedSessions.map((dateKey, index) => {
                         const session = eventsByDate[dateKey];
                         const isExpanded = expandedSession === `${toothObj.tooth}-${dateKey}`;
                         
                         // Filters treatments specifically for this tooth in this session
                         const filteredTreatments = session.treatments.filter(tr => 
                           toothObj.tooth === "General" || 
                           String(tr.tooth_number).split(/[\s,]+/).includes(toothObj.tooth)
                         );
                         
                         const sessionPresc = session.prescriptions[0];
                         const diagnosis = sessionPresc?.diagnosis || "";
                         const sessionInvoice = patient.invoices?.find(inv => inv.date === dateKey);

                         return (
                           <div key={dateKey} style={{ 
                             background: "var(--panel-bg)", 
                             borderRadius: 12, 
                             border: isExpanded ? "1px solid var(--primary)" : "1px solid rgba(255,255,255,0.08)",
                             overflow: "hidden",
                             transition: "all 0.3s"
                           }}>
                              {/* Session Header (Clickable Accordion) */}
                              <div 
                                onClick={() => setExpandedSession(isExpanded ? null : `${toothObj.tooth}-${dateKey}`)}
                                style={{ 
                                  padding: "15px 20px", 
                                  cursor: "pointer", 
                                  display: "flex", 
                                  justifyContent: "space-between", 
                                  alignItems: "center",
                                  background: isExpanded ? "rgba(0, 210, 255, 0.05)" : "transparent"
                                }}
                              >
                                 <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                   <div style={{ fontSize: 20 }}>{index === 0 ? "🌟" : "📅"}</div>
                                   <div>
                                      <div style={{ fontWeight: 800, fontSize: 16 }}>{dateKey} {index === 0 && <span style={{ fontSize: 10, background: "var(--success)", padding: "2px 6px", borderRadius: 8, marginLeft: 8 }}>{t("الأحدث")}</span>}</div>
                                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                                        {filteredTreatments.map(t => t.procedure).join(" + ") || t("جلسة مراجعة / فحص")}
                                      </div>
                                   </div>
                                 </div>
                                 <div style={{ fontSize: 20, color: isExpanded ? "var(--primary)" : "var(--text-muted)" }}>
                                   {isExpanded ? "▲" : "▼"}
                                 </div>
                              </div>

                              {/* Expanded Session Summary */}
                              {isExpanded && (
                                <div className="animate-fade" style={{ padding: 20, borderTop: "1px solid var(--glass-border)" }}>
                                   
                                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "center" }}>
                                      <h4 style={{ margin: 0, color: "var(--text-main)", fontSize: 16 }}>📄 {t("ملخص الجلسة الشامل")}</h4>
                                      <button onClick={() => printSession(dateKey, toothLabel)} className="btn-ghost" style={{ padding: "6px 12px", fontSize: 12, border: "1px solid var(--primary)", color: "var(--primary)", borderRadius: 8 }}>
                                         🖨 {t("طباعة الملخص")}
                                      </button>
                                   </div>

                                   <div id={`printable-session-${dateKey}`} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                                      {/* 1. Diagnosis */}
                                      <div className="glass-panel" style={{ padding: 15, borderLeft: "4px solid #f59e0b", marginBottom: 0 }}>
                                         <div style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b", marginBottom: 8 }}>🔍 {t("التشخيص")}</div>
                                         <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>{diagnosis || t("لم يتم تسجيل تشخيص محدد")}</div>
                                      </div>

                                      {/* 2. Treatments */}
                                      <div className="glass-panel" style={{ padding: 15, marginBottom: 0 }}>
                                        <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 13, color: "var(--primary)" }}>📋 {t("الإجراءات المنفذة")}</div>
                                        {filteredTreatments.length > 0 ? filteredTreatments.map((tr, i) => (
                                          <div key={i} style={{ padding: 10, background: "var(--panel-bg)", borderRadius: 8, marginBottom: i !== filteredTreatments.length - 1 ? 8 : 0 }}>
                                             <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)" }}>{tr.procedure}</div>
                                             {tr.notes && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{tr.notes}</div>}
                                          </div>
                                        )) : <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("لا توجد إجراءات مسجلة.")}</div>}
                                      </div>

                                      {/* 3. Prescriptions */}
                                      <div className="glass-panel" style={{ padding: 15, marginBottom: 0 }}>
                                         <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 13, color: "var(--success)" }}>💊 {t("الوصفة الطبية")}</div>
                                         {session.prescriptions.length > 0 ? (
                                           session.prescriptions.map((pr, i) => (
                                             <div key={i} style={{ fontSize: 13 }}>
                                               <div style={{ fontWeight: 700 }}>{pr.meds}</div>
                                               <button onClick={() => window.open(getPrescriptionPDFUrl(pr.id), "_blank")} className="btn-ghost no-print" style={{ padding: "4px 8px", fontSize: 11, marginTop: 8 }}>📄 {t("تحميل PDF")}</button>
                                             </div>
                                           ))
                                         ) : <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("لم يتم صرف أدوية")}</div>}
                                      </div>

                                      {/* 4. Photo */}
                                      {session.visits?.[0]?.image_url && (
                                        <div className="glass-panel no-print" style={{ padding: 15, marginBottom: 0, textAlign: "center" }}>
                                           <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 13, color: "var(--primary)" }}>📸 {t("صورة الجلسة المرفقة")}</div>
                                           <img src={session.visits[0].image_url} style={{ maxWidth: "100%", maxHeight: 250, borderRadius: 8, objectFit: "contain", border: "1px solid var(--glass-border)" }} />
                                        </div>
                                      )}
                                   </div>
                                </div>
                              )}
                           </div>
                         );
                     })}
                  </div>
               </div>
             );
          })}
        </div>
      )}
    </div>
  );
}

function Modal({ title, onClose, children, width = 600 }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
      <div className="glass-panel animate-fade" style={{ width: "100%", maxWidth: width, padding: isMobile ? 16 : 32, maxHeight: "95vh", overflowY: "auto", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <h3 style={{ fontSize: 20 }}>{title}</h3>
          <button onClick={onClose} className="btn-ghost" style={{ fontSize: 20, padding: "0 10px" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  , document.body);
}

const FormInput = ({ label, val, onChange, readOnly, type = "text" }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <input className="glass-input" style={{ width: "100%", textAlign: "center" }} 
      type={type} placeholder={label} value={val || ""} readOnly={readOnly}
      onChange={e => onChange && onChange(e.target.value)} />
  </div>
);

const ActionButton = ({ icon, label, onClick }) => (
  <button className="glass-panel" style={{ 
    display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", 
    width: "100%", textAlign: "left", cursor: "pointer", border: "1px solid var(--glass-border)" 
  }} onClick={onClick}>
    <span style={{ fontSize: 24 }}>{icon}</span>
    <span style={{ fontWeight: 600 }}>{label}</span>
  </button>
);

const lblStyle = { display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 };

const DetailRow = ({ label, val, color }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
    <span style={{ color: "var(--text-muted)" }}>{label}:</span>
    <span style={{ color: color || "white", fontWeight: 500 }}>{val}</span>
  </div>
);

const InfoBox = ({ label, val }) => (
  <div>
    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
    <div style={{ padding: 12, background: "var(--panel-bg)", borderRadius: 8, fontSize: 13 }}>{val || "—"}</div>
  </div>
);
