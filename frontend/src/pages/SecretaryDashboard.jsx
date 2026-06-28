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
import TeethMap3D from "../components/TeethMap3D";
import TimePicker from "../components/TimePicker";

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
  
  // Checkout Wizards states
  const [checkoutApt, setCheckoutApt] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState(0); // 0 = Rx & Summary, 1 = Financials
  const [checkoutPatient, setCheckoutPatient] = useState(null);
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paidToday, setPaidToday] = useState("");
  const [todayCostInput, setTodayCostInput] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Postponed/Absent Wizard states
  const [absentApt, setAbsentApt] = useState(null);
  const [absentStep, setAbsentStep] = useState(0); // 0 = Ask Fine, 1 = Ask Rebook
  const [fineAmount, setFineAmount] = useState("");
  const [savingFine, setSavingFine] = useState(false);

  // Dynamic search state inside modals
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Modal forms
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

  // Load schedule
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
    // Auto-refresh silently every 10 seconds without UI churn
    const interval = setInterval(() => loadSchedule(true), 10000);
    return () => clearInterval(interval);
  }, []);

  // Cycle appointment status
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

  // Search patients inside modals
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      getPatients(searchQuery)
        .then(res => setSearchResults(res || []))
        .catch(console.error);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Trigger Checkout Wizard
  const handleCheckoutClick = async (app) => {
    setCheckoutApt(app);
    setCheckoutStep(0);
    setCheckoutLoading(true);
    try {
      // 1. Get latest session logs & Rx
      const sessionInfo = await getLatestSession(app.patient_id);
      setCheckoutSession(sessionInfo);
      
      // 2. Get patient financial record by exact ID
      const exactPatient = await getPatient(app.patient_id);
      setCheckoutPatient(exactPatient);
      
      // Calculate today session cost
      const sessionCost = sessionInfo.treatments?.reduce((acc, curr) => acc + (parseFloat(curr.cost) || 0), 0) || 0;
      setTodayCostInput(String(sessionCost));
      
      // Default cash input to today's cost or total outstanding
      const outstanding = exactPatient ? exactPatient.debt : 0;
      setPaidToday(outstanding > 0 ? String(outstanding) : "");
      
      setCheckoutLoading(false);
    } catch (e) {
      console.error(e);
      alert(t("فشل تحميل معلومات الجلسة والفواتير"));
      setCheckoutLoading(false);
      setCheckoutApt(null);
    }
  };

  // Print Prescription
  const printPrescription = () => {
    if (checkoutSession?.prescription?.id) {
      window.open(getPrescriptionPDFUrl(checkoutSession.prescription.id), "_blank");
    } else {
      alert(t("لا توجد وصفة طبية مسجلة لهذه الجلسة"));
    }
  };

  // Print Receipt HTML template in iframe
  const printReceiptIframe = (receipt, session) => {
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
            .header-img { width: 100%; max-height: 120px; object-fit: contain; margin-bottom: 20px; }
            .footer-img { width: 100%; max-height: 80px; object-fit: contain; margin-top: 20px; position: fixed; bottom: 0; left: 0; }
            .header-text { text-align: center; border-bottom: 2px solid #00d2ff; padding-bottom: 15px; margin-bottom: 25px; }
            .logo { width: 70px; height: 70px; border-radius: 12px; margin-bottom: 10px; }
            .subtitle { font-size: 16px; color: #00d2ff; font-weight: 700; margin-top: 5px; border: 1px solid #00d2ff; display: inline-block; padding: 4px 20px; border-radius: 20px; }
            .content { padding: 0 10px; }
            .receipt-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 15px; padding: 20px; margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e5e7eb; }
            .row:last-child { border-bottom: none; }
            .label { font-weight: 700; color: #666; }
            .val { font-weight: 700; color: #111; }
            .footer-text { text-align: center; margin-top: 25px; font-size: 13px; color: #555; font-weight: 500; }
            @media print {
              html, body { height: 100%; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${settings?.receipt_header ? `<img src="${settings.receipt_header}" class="header-img" />` : `
            <div class="header-text">
              ${settings?.clinic_logo ? `<img src="${BASE + settings.clinic_logo}" class="logo" />` : ''}
              <h2>${settings?.clinic_name || "SmileCare Clinic"}</h2>
              <div class="subtitle">ملخص الجلسة والوصل المالي</div>
            </div>
          `}
          <div class="content">
            ${settings?.receipt_header ? '<div style="text-align: center; margin-bottom: 10px;"><div class="subtitle">الوصل المالي</div></div>' : ''}
            <div class="receipt-box" style="margin-bottom: 10px;">
              <div class="row"><span class="label">التاريخ:</span><span class="val">${receipt.date}</span></div>
              <div class="row"><span class="label">اسم المريض:</span><span class="val">${receipt.patient_name}</span></div>
            </div>

            <div class="receipt-box">
              <div style="font-weight: 700; color: #00d2ff; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">💰 التفاصيل المالية:</div>
              
              <div class="row"><span class="label">الديون السابقة:</span><span class="val">${receipt.prev_debt.toLocaleString()} د.ع</span></div>
              <div class="row"><span class="label">تكلفة علاج اليوم:</span><span class="val">${receipt.today_cost.toLocaleString()} د.ع</span></div>
              <div class="row" style="background: rgba(0, 210, 255, 0.05); padding: 10px;"><span class="label" style="color: var(--primary);">إجمالي المطلوب:</span><span class="val" style="color: var(--primary);">${receipt.total_outstanding.toLocaleString()} د.ع</span></div>
              
              <div class="row"><span class="label">المبلغ المسدد اليوم:</span><span class="val" style="font-size: 18px; color: #10b981;">${receipt.paid.toLocaleString()} د.ع</span></div>
              <div class="row"><span class="label" style="color: #ef4444;">الدين المتبقي:</span><span class="val" style="color: #ef4444;">${receipt.remaining.toLocaleString()} د.ع</span></div>
            </div>
            <div class="footer-text">شكراً لزيارتكم ونتمنى لكم دوام الصحة والعافية ✨</div>
          </div>
          ${settings?.receipt_footer ? `<img src="${settings.receipt_footer}" class="footer-img" />` : ''}
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

  // Submit Financial checkout
  const submitCheckoutPayment = async () => {
    const paidAmt = parseFloat(paidToday) || 0;
    if (paidAmt % 500 !== 0 && paidAmt > 0) {
      return alert(t("⚠️ عذراً، يجب أن يكون المبلغ المدفوع من مضاعفات الـ 500 دينار عراقي."));
    }

    setSavingPayment(true);
    try {
      const initialSessionCost = checkoutSession.treatments?.reduce((acc, curr) => acc + (parseFloat(curr.cost) || 0), 0) || 0;
      const todayCost = parseFloat(todayCostInput) || 0;

      // Update treatment logs if cost was changed
      if (todayCost !== initialSessionCost && checkoutSession.treatments?.length > 0) {
        for (let i = 0; i < checkoutSession.treatments.length; i++) {
          const tLog = checkoutSession.treatments[i];
          const newCost = i === 0 ? todayCost : 0;
          await updateTreatment(tLog.id, {
            tooth_number: tLog.tooth_number || tLog.tooth,
            procedure: tLog.procedure,
            notes: tLog.notes,
            cost: newCost,
            date: tLog.date
          });
        }
      }

      const prevDebt = checkoutPatient.debt - initialSessionCost;
      const totalOutstanding = prevDebt + todayCost;
      const remainingDebt = totalOutstanding - paidAmt;

      // Add payment invoice if paidAmt > 0
      if (paidAmt > 0) {
        await addInvoice({
          patient_id: checkoutPatient.id,
          total_amount: 0,
          paid_amount: paidAmt,
          payment_method: "Cash",
          notes: t("تصفية مالية لجلسة اليوم"),
          date: todayStr
        });
      }

      // Print Receipt
      printReceiptIframe({
        date: todayStr,
        patient_name: checkoutPatient.first_name + " " + checkoutPatient.last_name,
        prev_debt: prevDebt,
        today_cost: todayCost,
        total_outstanding: totalOutstanding,
        paid: paidAmt,
        remaining: remainingDebt
      }, checkoutSession);

      // Update appointment status to completed in database
      await updateAppointment(checkoutApt.id, { status: "completed" });

      // Hide patient from today list
      const newHidden = [...hiddenIds, checkoutApt.id];
      setHiddenIds(newHidden);
      sessionStorage.setItem('today_hidden_ids', JSON.stringify(newHidden));

      // Close Wizard
      setCheckoutApt(null);
      setCheckoutPatient(null);
      setCheckoutSession(null);
      setPaidToday("");
      setTodayCostInput("");
      loadSchedule();
    } catch (e) {
      console.error(e);
      alert(t("فشل تسجيل الدفعة وإكمال التخليص"));
    } finally {
      setSavingPayment(false);
    }
  };

  // Handle Postponed/Absent checkmark click
  const handleAbsentClick = (app) => {
    setAbsentApt(app);
    setAbsentStep(0);
    setFineAmount("");
  };

  // Submit fine for absent/postponed patient
  const submitAbsentFine = async () => {
    const amt = parseFloat(fineAmount) || 0;
    if (amt > 0) {
      if (amt % 500 !== 0) {
        return alert(t("⚠️ عذراً، يجب أن تكون الغرامة من مضاعفات الـ 500 دينار عراقي."));
      }
      setSavingFine(true);
      try {
        await addFine(absentApt.patient_id, amt, t("غرامة تأجيل/غياب موعد اليوم"));
        setSavingFine(false);
        // Move to reschedule step
        setAbsentStep(1);
      } catch (e) {
        console.error(e);
        alert(t("فشل إضافة الغرامة"));
        setSavingFine(false);
      }
    } else {
      // If no fine, just go to reschedule step
      setAbsentStep(1);
    }
  };

  // Submit patient add
  const handleAddPatientSubmit = async () => {
    if (!patientForm.first_name) return alert(t("يرجى إدخال اسم المريض"));
    


    try {
      const res = await addPatient(patientForm);
      if (res && res.id) {
        const { saveTeeth, addInvoice } = await import("../api");
        await saveTeeth(res.id, {});
        
        
        setShowAddPatient(false);
        setPatientForm({
          first_name: "", last_name: "", phone: "", gender: "Male", age: "", address: "", case_category: "",
          total_agreed_price: "", initial_payment: "", payment_method: "Cash", notes: ""
        });
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: t("تمت إضافة المريض بنجاح ✅"), type: "success" } 
        }));
      }
    } catch (e) {
      console.error(e);
      alert(t("حدث خطأ أثناء إضافة المريض"));
    }
  };

  // Submit appointment add
  const handleAddAptSubmit = async () => {
    const pid = selectedPatient?.id || aptForm.patient_id;
    if (!pid) return alert(t("يرجى اختيار مريض"));
    if (!aptForm.date || !aptForm.time) return alert(t("يرجى تحديد التاريخ والوقت"));
    
    try {
      await addAppointment({
        ...aptForm,
        patient_id: pid,
        patient_name: selectedPatient ? (selectedPatient.first_name + " " + selectedPatient.last_name) : ""
      });
      setShowAddApt(false);
      setSelectedPatient(null);
      setSearchQuery("");
      setAptForm({
        patient_id: "", date: "", time: "", type: "", duration_min: 30, status: "booked", notes: ""
      });
      loadSchedule();
      window.dispatchEvent(new CustomEvent('show-toast', { 
        detail: { message: t("تم حجز الموعد بنجاح ✅"), type: "success" } 
      }));
    } catch (e) {
      console.error(e);
      alert(t("فشل حجز الموعد"));
    }
  };

  // Submit invoice add
  const handleAddInvoiceSubmit = async () => {
    const pid = selectedPatient?.id;
    if (!pid) return alert(t("يرجى اختيار مريض"));
    if (!invoiceForm.paid_amount) return alert(t("يرجى إدخال المبلغ المدفوع"));
    
    try {
      await addInvoice({
        patient_id: pid,
        total_amount: parseFloat(invoiceForm.total_amount) || 0,
        paid_amount: parseFloat(invoiceForm.paid_amount) || 0,
        payment_method: invoiceForm.payment_method,
        notes: invoiceForm.notes,
        date: todayStr
      });
      setShowAddInvoice(false);
      setSelectedPatient(null);
      setSearchQuery("");
      setInvoiceForm({
        patient_id: "", total_amount: "", paid_amount: "", payment_method: "Cash", notes: ""
      });
      window.dispatchEvent(new CustomEvent('show-toast', { 
        detail: { message: t("تمت إضافة الفاتورة والتحصيل بنجاح ✅"), type: "success" } 
      }));
    } catch (e) {
      console.error(e);
      alert(t("فشل إضافة الفاتورة"));
    }
  };

  // Submit expense add
  const handleAddExpenseSubmit = async () => {
    if (!expenseForm.category || !expenseForm.amount) return alert(t("يرجى ملء جميع الحقول المطلوبة"));
    try {
      await addExpense({
        ...expenseForm,
        date: expenseForm.date || todayStr
      });
      setShowAddExpense(false);
      setExpenseForm({
        category: "", amount: "", payment_method: "Cash", date: "", notes: ""
      });
      window.dispatchEvent(new CustomEvent('show-toast', { 
        detail: { message: t("تم تسجيل المصروف بنجاح ✅"), type: "success" } 
      }));
    } catch (e) {
      console.error(e);
      alert(t("فشل تسجيل المصروف"));
    }
  };

  return (
    <div className="animate-fade" style={{ direction: "rtl", textAlign: "right" }}>
      
      {/* 1. Horizontal Quick Action Bar */}
      <div className="glass-panel" style={{ padding: 20, marginBottom: 28, borderRadius: 24 }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 800, color: "var(--primary)" }}>⚡ {t("العمليات السريعة بالاستقبال")}</h3>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(6, 1fr)", 
          gap: 12 
        }}>
          <button onClick={() => setShowAddPatient(true)} className="quick-btn-luxury" style={{ borderColor: "#8B5CF6" }}>
            <span style={{ fontSize: 20 }}>👤</span>
            <strong>{t("إضافة مريض +")}</strong>
          </button>
          
          <button onClick={() => setShowAddApt(true)} className="quick-btn-luxury" style={{ borderColor: "#00D2FF" }}>
            <span style={{ fontSize: 20 }}>📅</span>
            <strong>{t("إضافة موعد +")}</strong>
          </button>
          
          <button onClick={() => setShowAddInvoice(true)} className="quick-btn-luxury" style={{ borderColor: "#10b981" }}>
            <span style={{ fontSize: 20 }}>🧾</span>
            <strong>{t("إضافة فاتورة +")}</strong>
          </button>
          
          <button onClick={() => setShowAddExpense(true)} className="quick-btn-luxury" style={{ borderColor: "#ef4444" }}>
            <span style={{ fontSize: 20 }}>📉</span>
            <strong>{t("إضافة صرفيات +")}</strong>
          </button>
          
          <button onClick={() => nav("/messages")} className="quick-btn-luxury" style={{ borderColor: "#f59e0b" }}>
            <span style={{ fontSize: 20 }}>📜</span>
            <strong>{t("سجل المتابعة")}</strong>
          </button>
          
          <button onClick={() => nav("/prescriptions")} className="quick-btn-luxury" style={{ borderColor: "#ec4899" }}>
            <span style={{ fontSize: 20 }}>📝</span>
            <strong>{t("الوصفات")}</strong>
          </button>
        </div>
      </div>

      {/* 2. Today's Appointments Grid */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 850, margin: 0 }}>📋 {t("جدول مواعيد اليوم")}</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>{todayStr}</p>
          </div>
          <button onClick={loadSchedule} className="btn-secondary" style={{ display: "flex", gap: 6 }}>
            🔄 {t("تحديث")}
          </button>
        </div>

        {loadingSchedule ? (
          <div style={{ textAlign: "center", padding: 80, fontSize: 16, color: "var(--text-muted)" }}>
            <div className="page-loader-spinner" style={{ margin: "0 auto 16px" }} />
            {t("جاري تحميل مواعيد اليوم...")}
          </div>
        ) : appointments.filter(app => !hiddenIds.includes(app.id)).length === 0 ? (
          <div className="glass-panel" style={{ padding: 80, textAlign: "center", color: "var(--text-muted)", fontSize: 16, borderRadius: 20 }}>
            📭 {t("لا توجد مواعيد نشطة متبقية لليوم")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {appointments.filter(app => !hiddenIds.includes(app.id)).map((app, index) => {
              const isNext = index === 0 && app.status === "booked";
              return (
                <div key={app.id} 
                  className="glass-panel list-row-card animate-fade"
                  style={{
                    padding: isMobile ? 16 : 20,
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "stretch" : "center",
                    gap: 16,
                    borderRight: `6px solid ${(STATUS_CONFIG[app.status] || STATUS_CONFIG["booked"]).color}`,
                    borderRadius: 20,
                    background: isNext ? "rgba(24, 95, 165, 0.05)" : "linear-gradient(90deg, rgba(255,255,255,0.01) 0%, transparent 100%)",
                    transition: "all 0.3s"
                  }}
                >
                  {/* Time */}
                  <div style={{
                    fontSize: 20,
                    fontWeight: 900,
                    minWidth: 100,
                    color: "var(--primary)",
                    textAlign: "center",
                    background: "rgba(24, 95, 165, 0.1)",
                    padding: "8px 14px",
                    borderRadius: 14,
                    flexShrink: 0
                  }}>
                    {format12h(app.time, lang)}
                  </div>

                  {/* Patient Name */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "white" }}>{app.patient_name}</h3>
                      {app.status === "treating" && (
                        <span style={{ background: "#10b981", color: "white", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
                          {t("عند الطبيب 🩺")}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 12, color: "var(--text-muted)", fontSize: 12 }}>
                      <span>🦷 {t(app.type)}</span>
                      <span>⏱️ {app.duration_min} {t("دقيقة")}</span>
                      {app.notes && <span style={{ color: "var(--accent)" }}>📝 {app.notes}</span>}
                    </div>
                  </div>

                  {/* Status & Check Action */}
                  <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: isMobile ? "space-between" : "flex-end" }}>
                    
                    {/* Status Button (Cycles) */}
                    <button 
                      onClick={() => cycleStatus(app.id, app.status)}
                      style={{ 
                        padding: "8px 16px", borderRadius: 12, fontSize: 12, fontWeight: 700,
                        background: (STATUS_CONFIG[app.status] || STATUS_CONFIG["booked"]).bg,
                        color: (STATUS_CONFIG[app.status] || STATUS_CONFIG["booked"]).color,
                        border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                      }}
                    >
                      <span>{(STATUS_CONFIG[app.status] || STATUS_CONFIG["booked"]).icon}</span>
                      <span>{t((STATUS_CONFIG[app.status] || STATUS_CONFIG["booked"]).ar)}</span>
                    </button>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 6 }}>
                      {/* Finished Checkout trigger */}
                      {app.status === "finished" && (
                        <button 
                          onClick={() => handleCheckoutClick(app)}
                          style={{
                            width: 38, height: 38, borderRadius: 10, border: "none", 
                            background: "rgba(16, 185, 129, 0.15)", color: "#10b981", 
                            fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                          }}
                          title={t("تخليص الحساب والطباعة")}
                        >
                          ✔️
                        </button>
                      )}

                      {/* Postponed/Absent checkout trigger */}
                      {["postponed", "absent"].includes(app.status) && (
                        <button 
                          onClick={() => handleAbsentClick(app)}
                          style={{
                            width: 38, height: 38, borderRadius: 10, border: "none", 
                            background: "rgba(124, 58, 237, 0.15)", color: "#7c3aed", 
                            fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                          }}
                          title={t("تصفية الموعد")}
                        >
                          ✔️
                        </button>
                      )}

                      {/* Phone links */}
                      {app.patient_phone && (
                        <>
                          <a href={`tel:${app.patient_phone}`} style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", background: "rgba(234, 179, 8, 0.1)", color: "#eab308" }}>📞</a>
                          <a href={`https://wa.me/${app.patient_phone.startsWith('0') ? '964' + app.patient_phone.slice(1).replace(/[^0-9]/g, '') : app.patient_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", background: "rgba(34, 197, 94, 0.1)", color: "#22c55e" }}>💬</a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add Patient Modal ── */}
      {showAddPatient && (
        <Modal title={t("إضافة مريض جديد")} onClose={() => setShowAddPatient(false)}>
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
              <label className="input-label">{t("ملاحظات طبية / عامة")}</label>
              <textarea className="glass-input" style={{ width: "100%", minHeight: 80 }} value={patientForm.notes} onChange={e => setPatientForm({ ...patientForm, notes: e.target.value })} />
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
              <button onClick={() => setShowAddPatient(false)} className="btn-ghost" style={{ width: 120 }}>{t("إلغاء")}</button>
              <button onClick={handleAddPatientSubmit} className="btn-primary" style={{ width: 200 }}>{t("إضافة المريض")}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Add Appointment Modal ── */}
      {showAddApt && (
        <Modal title={t("إضافة موعد جديد")} onClose={() => setShowAddApt(false)}>
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
                <DatePicker value={aptForm.date} onChange={val => setAptForm({...aptForm, date: val})} />
              </div>
              <div>
                <label className="input-label">{t("الوقت *")}</label>
                <TimePicker value={aptForm.time} onChange={val => setAptForm({...aptForm, time: val})} />
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
        </Modal>
      )}

      {/* ── Add Invoice Modal ── */}
      {showAddInvoice && (
        <Modal title={t("إضافة فاتورة وتحصيل مالي")} onClose={() => setShowAddInvoice(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Search Patient Box */}
            <div style={{ position: "relative" }}>
              <label style={lblStyle}>{t("اختر المريض")}</label>
              <input 
                className="glass-input" 
                placeholder={t("اكتب اسم المريض للبحث...")}
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                style={{ width: "100%" }}
              />
              {searchResults.length > 0 && (
                <div style={{ 
                  position: "absolute", top: 70, left: 0, width: "100%", 
                  background: "rgba(15, 23, 42, 0.98)", border: "1px solid var(--glass-border)",
                  borderRadius: 12, zIndex: 100, maxHeight: 150, overflowY: "auto"
                }}>
                  {searchResults.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => {
                        setSelectedPatient(p);
                        setSearchQuery(`${p.first_name} ${p.last_name}`);
                        setSearchResults([]);
                      }}
                      style={{ padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      {p.first_name} {p.last_name} ({p.phone || t("بلا هاتف")})
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedPatient && (
              <div style={{ background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div><strong>{t("الدين المتبقي الحالي:")}</strong> <span style={{ color: "#ef4444", fontWeight: 700 }}>{selectedPatient.debt.toLocaleString()} د.ع</span></div>
              </div>
            )}

            <div>
              <label style={lblStyle}>{t("تكلفة المعالجة / الجلسة")}</label>
              <input type="number" className="glass-input" value={invoiceForm.total_amount} onChange={e => setInvoiceForm({...invoiceForm, total_amount: e.target.value})} style={{ width: "100%" }} />
            </div>

            <div>
              <label style={lblStyle}>{t("المبلغ المقبوض")}</label>
              <input type="number" className="glass-input" value={invoiceForm.paid_amount} onChange={e => setInvoiceForm({...invoiceForm, paid_amount: e.target.value})} style={{ width: "100%" }} />
            </div>

            <div>
              <label style={lblStyle}>{t("طريقة الدفع")}</label>
              <select className="glass-input" value={invoiceForm.payment_method} onChange={e => setInvoiceForm({...invoiceForm, payment_method: e.target.value})} style={{ width: "100%", height: 44 }}>
                <option value="Cash">{t("نقد (Cash)")}</option>
                <option value="Card">{t("بطاقة (Card)")}</option>
              </select>
            </div>

            <div>
              <label style={lblStyle}>{t("ملاحظات")}</label>
              <textarea className="glass-input" value={invoiceForm.notes} onChange={e => setInvoiceForm({...invoiceForm, notes: e.target.value})} style={{ width: "100%", minHeight: 80 }} />
            </div>

            <button className="btn-primary" style={{ height: 48, marginTop: 12 }} onClick={handleAddInvoiceSubmit}>{t("حفظ الفاتورة والوصل المالي")}</button>
          </div>
        </Modal>
      )}

      {/* ── Add Expense Modal ── */}
      {showAddExpense && (
        <Modal title={t("تسجيل مصروف جديد")} onClose={() => setShowAddExpense(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={lblStyle}>{t("تصنيف المصروف")}</label>
              <select className="glass-input" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})} style={{ width: "100%", height: 44 }}>
                <option value="">{t("اختر...")}</option>
                {getDynamicList('expense_categories', ["مواد طبية", "أجور ورواتب", "إيجار وفواتير", "مستلزمات عامة", "صيانة", "أخرى"]).map(c => <option key={c} value={c}>{t(c)}</option>)}
              </select>
            </div>

            <div>
              <label style={lblStyle}>{t("قيمة المصروف")}</label>
              <input type="number" className="glass-input" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} style={{ width: "100%" }} />
            </div>

            <div>
              <label style={lblStyle}>{t("طريقة الدفع")}</label>
              <select className="glass-input" value={expenseForm.payment_method} onChange={e => setExpenseForm({...expenseForm, payment_method: e.target.value})} style={{ width: "100%", height: 44 }}>
                <option value="Cash">{t("نقد (Cash)")}</option>
                <option value="Card">{t("بطاقة (Card)")}</option>
              </select>
            </div>

            <div>
              <label style={lblStyle}>{t("تاريخ الصرف")}</label>
              <DatePicker value={expenseForm.date} onChange={val => setExpenseForm({...expenseForm, date: val})} />
            </div>

            <div>
              <label style={lblStyle}>{t("ملاحظات تفصيلية")}</label>
              <textarea className="glass-input" value={expenseForm.notes} onChange={e => setExpenseForm({...expenseForm, notes: e.target.value})} style={{ width: "100%", minHeight: 80 }} />
            </div>

            <button className="btn-primary" style={{ height: 48, marginTop: 12 }} onClick={handleAddExpenseSubmit}>{t("تسجيل المصروف")}</button>
          </div>
        </Modal>
      )}

      {/* ── Checkout Wizard Modal (Finished Patients) ── */}
      {checkoutApt && (
        <Modal title={t("نافذة التخليص والتحصيل المالي الذكي")} onClose={() => setCheckoutApt(null)} width={700}>
          {checkoutLoading ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <div className="page-loader-spinner" style={{ margin: "0 auto 16px" }} />
              {t("جاري تحميل الملخص الجلسة والوصفة الطبية والديون...")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* Wizard Steps indicator */}
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: checkoutStep >= 0 ? "var(--primary)" : "rgba(255,255,255,0.05)" }} />
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: checkoutStep >= 1 ? "var(--primary)" : "rgba(255,255,255,0.05)" }} />
              </div>

              {/* Step 1: Prescription & Treatments details */}
              {checkoutStep === 0 && (
                <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <h3 style={{ margin: "0 0 12px 0", fontSize: 16, color: "var(--primary)" }}>📝 {t("تقرير الإجراءات الطبية المنفذة")}</h3>
                    {checkoutSession?.treatments?.length > 0 ? (
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "rgba(255,255,255,0.03)", fontSize: 12, color: "var(--text-muted)" }}>
                            <th style={{ padding: 10, textAlign: "right" }}>{t("السن")}</th>
                            <th style={{ padding: 10, textAlign: "right" }}>{t("الإجراء")}</th>
                            <th style={{ padding: 10, textAlign: "right" }}>{t("ملاحظات")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {checkoutSession.treatments.map((tr, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                              <td style={{ padding: 10, fontWeight: 700 }}>{tr.tooth_number === "General" ? t("إجراء عام") : `#${tr.tooth_number}`}</td>
                              <td style={{ padding: 10 }}>{tr.procedure}</td>
                              <td style={{ padding: 10, color: "var(--text-muted)", fontSize: 12 }}>{tr.notes || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>{t("لا توجد علاجات مسجلة في جلسة اليوم.")}</p>
                    )}
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
                    <h3 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#ec4899" }}>💊 {t("الوصفة الطبية المكتوبة")}</h3>
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


      {/* CSS for print Medical Summary */}
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

      {/* Hidden Medical Summary for Print */}
      {paymentSuccess && checkoutPatient && checkoutSession && (
        <div id="printable-session-summary" className="no-print" style={{ background: "white", color: "black", padding: "40px" }}>
          <div style={{ textAlign: "center", borderBottom: "2px solid #3b82f6", paddingBottom: "20px", marginBottom: "30px" }}>
             <h2 style={{ margin: 0, color: "#0f172a" }}>{settings?.clinic_name || 'SmileCare Clinic'}</h2>
             <h3 style={{ margin: "5px 0", color: "#334155" }}>{t("تقرير الجلسة العلاجية")}</h3>
             <div style={{ color: "#64748b" }}>{t("التاريخ")}: {new Date().toLocaleDateString('en-GB')}</div>
          </div>
          <div style={{ display: "flex", gap: "40px", marginBottom: "30px", padding: "15px", background: "#f8fafc", borderRadius: "8px" }}>
            <div><span style={{ color: "#64748b" }}>{t("المريض")}:</span> <strong style={{ fontSize: "16px", marginLeft: "8px" }}>{checkoutPatient.first_name + " " + checkoutPatient.last_name}</strong></div>
            <div><span style={{ color: "#64748b" }}>{t("العمر")}:</span> <strong style={{ fontSize: "16px", marginLeft: "8px" }}>{checkoutPatient.age}</strong></div>
            <div><span style={{ color: "#64748b" }}>{t("الجنس")}:</span> <strong style={{ fontSize: "16px", marginLeft: "8px" }}>{checkoutPatient.gender}</strong></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "18px", color: "#1e293b", marginBottom: "15px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>🦷 {t("الإجراءات المنفذة")}</div>
              {checkoutSession.treatments?.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      <th style={{ padding: "10px", color: "#64748b" }}>{t("السن")}</th>
                      <th style={{ padding: "10px", color: "#64748b" }}>{t("الإجراء الطبي")}</th>
                      <th style={{ padding: "10px", color: "#64748b" }}>{t("التكلفة")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkoutSession.treatments.map((tr, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "12px 10px", fontWeight: "bold", width: "80px" }}>{tr.tooth === "General" ? `🌐 ${t("عام")}` : `#${tr.tooth || tr.tooth_number}`}</td>
                        <td style={{ padding: "12px 10px", color: "#1e293b", fontWeight: 600 }}>{tr.procedure}</td>
                        <td style={{ padding: "12px 10px", color: "#1e293b" }}>{parseFloat(tr.cost || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: "#94a3b8", fontStyle: "italic", padding: "10px" }}>{t("لا توجد إجراءات")}</div>
              )}
            </div>
            <div style={{ display: "flex", gap: "30px", alignItems: "stretch" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "18px", color: "#1e293b", marginBottom: "15px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>🗺️ {t("مخطط الأسنان")}</div>
                <div style={{ position: "relative", width: "100%", height: "250px", background: "#f8fafc", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0", display: "block" }}>
                  <TeethMap3D pid={checkoutPatient.id} data={checkoutPatient.teeth || {}} onChange={() => {}} treatments={checkoutSession.treatments || []} noControls={true} forceFullView={true} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "18px", color: "#1e293b", marginBottom: "15px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>💊 {t("الأدوية الموصوفة")}</div>
                {checkoutSession.prescription?.medications?.length > 0 ? (
                  <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
                    {checkoutSession.prescription.medications.map((m, i) => (
                      <li key={i} style={{ marginBottom: "10px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>{m.name} <span style={{ fontWeight: 400, fontSize: "12px", color: "#64748b" }}>({m.form})</span></div>
                        <div style={{ fontSize: "13px", color: "#334155" }}><strong>{t("الجرعة")}:</strong> {m.dose} | <strong>{t("التكرار")}:</strong> {m.timing} | <strong>{t("المدة")}:</strong> {m.duration}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: "#94a3b8", fontStyle: "italic", padding: "20px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>{t("لم يتم صرف أدوية")}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
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
