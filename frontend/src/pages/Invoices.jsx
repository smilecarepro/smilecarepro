import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../LanguageContext";
import { useAuth } from "../AuthContext";
import { 
  getInvoices, 
  getInvoiceSummary, 
  addInvoice, 
  payInvoice, 
  getPatients, 
  getInvoicePDFUrl, 
  getDailySummaryPDFUrl, 
  BASE,
  updateInvoice,
  deleteInvoice
} from "../api";
import { useSettings } from "../SettingsContext";
import DatePicker from "../components/DatePicker";

const localDate = () => { 
  const d = new Date(); 
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; 
};

const StatItem = ({ label, value, color }) => {
  const { t } = useLanguage();
  return (
    <div className="glass-panel" style={{ padding: 16 }}>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>{t(label)}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || "var(--text-main)" }}>{value}</div>
    </div>
  );
};

const lblStyle = { display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 };

export default function Invoices() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { settings } = useSettings();
  const searchRef = useRef(null);
  const isSecretary = user?.role === "secretary";
  const canAddInvoice = user?.role !== "secretary" || settings?.sec_perm_invoices === "today_add" || settings?.sec_perm_invoices === "all_add";
  const filterOnlyToday = isSecretary && (settings?.sec_perm_invoices === "today" || settings?.sec_perm_invoices === "today_add");
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({});
  const [patients, setPatients] = useState([]);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState({ 
    patient_id: "", 
    agreed_price: "", 
    paid: "", 
    payment_method: "Cash", 
    date: localDate(), 
    notes: "" 
  });
  const [editForm, setEditForm] = useState({
    total_amount: "",
    paid_amount: "",
    payment_method: "Cash",
    date: "",
    notes: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);

  const load = () => {
    getInvoices(q, "").then(setInvoices).catch(console.error);
    getInvoiceSummary().then(setSummary).catch(console.error);
    getPatients().then(setPatients).catch(console.error);
  };
  
  useEffect(() => { load(); }, [q]);
  useEffect(() => { getPatients().then(setPatients).catch(console.error); }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const save = async () => {
    if (!form.patient_id || !form.agreed_price) return alert(t("أدخل المريض والمبلغ"));

    if (form.paid && parseFloat(form.paid) % 500 !== 0) {
      return alert(t("⚠️ عذراً، يجب أن يكون مبلغ الدفعة من مضاعفات الـ 500 دينار عراقي."));
    }

    const paidAmt = parseFloat(form.paid) || 0;
    const requiredAmt = parseFloat(form.agreed_price) || 0;

    if (paidAmt > requiredAmt) {
      return alert(t("⚠️ لا يمكن إدخال مبلغ يتجاوز مديونية المريض المتبقية (") + requiredAmt + " " + t("د)"));
    }

    const selectedP = patients.find(p => p.id == form.patient_id);
    const patientTotal = selectedP?.total_price || requiredAmt;

    const res = await addInvoice({
      patient_id: parseInt(form.patient_id),
      total_amount: patientTotal,
      paid_amount: paidAmt,
      payment_method: form.payment_method,
      notes: form.notes,
      date: form.date
    });

    setModal(false); load();
    setSearchTerm("");
  };

  const canEditInvoice = (invoiceDateStr) => {
    if (!invoiceDateStr) return false;
    const now = new Date();
    const [yr, mn, dy] = invoiceDateStr.split("-").map(Number);
    const invoiceDate = new Date(yr, mn - 1, dy);
    
    const today = new Date();
    today.setHours(0,0,0,0);
    invoiceDate.setHours(0,0,0,0);
    
    const diffTime = today.getTime() - invoiceDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    return diffDays <= 1;
  };

  const handleEdit = (invoice) => {
    setEditModal(invoice);
    setEditForm({
      total_amount: invoice.amount || 0,
      paid_amount: invoice.paid || 0,
      payment_method: invoice.payment_method || "Cash",
      date: invoice.date || "",
      notes: invoice.notes || ""
    });
  };

  const saveEdit = async () => {
    if (editForm.paid_amount && parseFloat(editForm.paid_amount) % 500 !== 0) {
      return alert(t("⚠️ عذراً، يجب أن يكون مبلغ الدفعة من مضاعفات الـ 500 دينار عراقي."));
    }
    
    const res = await updateInvoice(editModal.id, {
      total_amount: parseFloat(editForm.total_amount) || 0,
      paid_amount: parseFloat(editForm.paid_amount) || 0,
      payment_method: editForm.payment_method,
      date: editForm.date,
      notes: editForm.notes
    });

    if (res.ok) {
      setEditModal(null);
      load();
    } else {
      alert("فشل تعديل الفاتورة");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(t("هل أنت متأكد من حذف هذه الفاتورة؟ سيتم إعادة حساب مديونية المريض."))) {
      const res = await deleteInvoice(id);
      if (res.ok) {
        load();
      } else {
        alert("فشل حذف الفاتورة");
      }
    }
  };

  const printPDFReceipt = async (invoiceId) => {
    const url = getInvoicePDFUrl(invoiceId);
    try {
      const user = JSON.parse(localStorage.getItem("clinic_user") || "{}");
      const res = await fetch(url, { headers: { "Authorization": `Bearer ${user.token}` } });
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), "_blank");
    } catch (e) {
      console.error("PDF error:", e);
      alert("فشل في استرداد وصل الاستلام");
    }
  };

  const filteredPatients = patients.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.includes(searchTerm)
  );

  const displayedInvoices = filterOnlyToday
    ? invoices.filter(i => i.date === localDate())
    : invoices;

  return (
    <div className="animate-fade">
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>{t("الفواتير والمدفوعات")}</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={async () => {
            const url = getDailySummaryPDFUrl();
            try {
              const user = JSON.parse(localStorage.getItem("clinic_user") || "{}");
              const res = await fetch(url, { headers: { "Authorization": `Bearer ${user.token}` } });
              const blob = await res.blob();
              window.open(URL.createObjectURL(blob), "_blank");
            } catch (e) {
              console.error("PDF error:", e);
              alert("فشل في استرداد ملخص اليوم");
            }
          }} className="btn-secondary" style={{ padding: "8px 16px" }}>🖨 {t("طباعة التقرير")}</button>
          {canAddInvoice && (
            <button onClick={() => { setForm({ patient_id: "", agreed_price: "", paid: "", payment_method: "Cash", date: localDate(), notes: "" }); setSearchTerm(""); setModal(true); }} className="btn-primary">
              <span>+</span> {t("إصدار فاتورة جديدة")}
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${filterOnlyToday ? 2 : 3}, 1fr)`, gap: 12, marginBottom: 20 }}>
        <StatItem label={filterOnlyToday ? "إجمالي فواتير اليوم" : "إجمالي الفواتير"} value={(filterOnlyToday ? (summary.today_total || 0) : (summary.total || 0)).toLocaleString() + " د"} />
        <StatItem label={filterOnlyToday ? "المبالغ المحصلة اليوم" : "المبالغ المحصلة"} value={(filterOnlyToday ? (summary.today_collected || 0) : (summary.collected || 0)).toLocaleString() + " د"} color="var(--success)" />
        {!filterOnlyToday && <StatItem label="الديون المتبقية" value={(summary.debt || 0).toLocaleString() + " د"} color="var(--danger)" />}
      </div>

      <div className="glass-panel" style={{ padding: 16, marginBottom: 20 }}>
        <input className="glass-input" placeholder={t("ابحث باسم المريض...")} value={q} onChange={e => setQ(e.target.value)} style={{ width: "100%" }} />
      </div>

      <div className="glass-panel">
        <div className="table-container">
          <table className="mobile-card-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--panel-bg)" }}>
                {[t("المريض"), t("التاريخ"), t("السعر الكلي للعلاج"), t("المدفوع الآن"), t("دين المريض الكلي"), t("طريقة الدفع"), t("الحالة"), t("إجراء")].map(h => (
                  <th key={h} style={{ padding: "16px 20px", textAlign: "right", fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedInvoices.map(i => (
                <tr key={i.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <td data-label={t("المريض")} style={{ padding: "14px 20px", fontWeight: 500 }}>{i.patient_name}</td>
                  <td data-label={t("التاريخ")} style={{ padding: "14px 20px", fontSize: 13, color: "var(--text-muted)" }}>{i.date}</td>
                  <td data-label={t("السعر الكلي للعلاج")} style={{ padding: "14px 20px", fontSize: 13 }}>{(i.total_price || 0).toLocaleString()} د</td>
                  <td data-label={t("المدفوع الآن")} style={{ padding: "14px 20px", fontSize: 13, color: "var(--success)" }}>{(i.paid || 0).toLocaleString()} د</td>
                  <td data-label={t("دين المريض الكلي")} style={{ padding: "14px 20px", fontSize: 13, color: "var(--danger)", fontWeight: 700 }}>{Math.max(0, i.patient_debt || 0).toLocaleString()} د</td>
                  <td data-label={t("طريقة الدفع")} style={{ padding: "14px 20px", fontSize: 13, color: "var(--text-muted)" }}>{t(i.payment_method)}</td>
                  <td data-label={t("الحالة")} style={{ padding: "14px 20px" }}>
                    <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: i.status === "مدفوع" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)", color: i.status === "مدفوع" ? "#10b981" : "#f59e0b" }}>{t(i.status)}</span>
                  </td>
                  <td data-label={t("إجراء")} style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => printPDFReceipt(i.id)} className="btn-ghost" style={{ padding: "5px 10px", fontSize: 12 }} title={t("طباعة")}>🖨</button>
                      {!isSecretary && canEditInvoice(i.date) && (
                        <>
                          <button onClick={() => handleEdit(i)} className="btn-ghost" style={{ padding: "5px 10px", fontSize: 12, color: "var(--primary)" }} title={t("تعديل")}>✏️</button>
                          <button onClick={() => handleDelete(i.id)} className="btn-ghost" style={{ padding: "5px 10px", fontSize: 12, color: "var(--danger)" }} title={t("حذف")}>🗑️</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Invoice Modal ── */}
      {modal && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel animate-fade" style={{ width: "100%", maxWidth: 520, padding: 32 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>{t("إصدار فاتورة جديدة")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ position: "relative" }} ref={searchRef}>
                <label style={lblStyle}>{t("المريض")}</label>
                <div style={{ position: "relative" }}>
                  <input className="glass-input" style={{ width: "100%", paddingRight: 40 }} placeholder={t("بحث عن مريض...")} value={searchTerm} onFocus={() => setShowResults(true)} onChange={e => { setSearchTerm(e.target.value); setShowResults(true); if (!e.target.value) setForm({ ...form, patient_id: "" }); }} />
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.5 }}>🔍</span>
                </div>
                {showResults && searchTerm && (
                  <div className="glass-panel" style={{ position: "absolute", top: "105%", left: 0, right: 0, zIndex: 100, maxHeight: 240, overflowY: "auto", padding: 8, boxShadow: "0 20px 50px rgba(0,0,0,0.6)", border: "1px solid var(--glass-border)" }}>
                    {filteredPatients.length === 0 ? <div style={{ padding: 12, color: "var(--text-muted)", textAlign: "center", fontSize: 13 }}>{t("لا يوجد نتائج")}</div> : filteredPatients.map(p => (
                      <div key={p.id} onClick={() => { setForm({ ...form, patient_id: p.id, agreed_price: p.debt || 0 }); setSearchTerm(`${p.first_name} ${p.last_name}`); setShowResults(false); }} style={{ padding: "10px 16px", cursor: "pointer", borderRadius: 10, background: form.patient_id == p.id ? "rgba(24, 95, 165, 0.3)" : "transparent", marginBottom: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div><div style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</div>{p.phone && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>📞 {p.phone}</div>}</div>
                          {p.debt > 0 && <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 700 }}>{(p.debt || 0).toLocaleString()} {t("د")}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><label style={lblStyle}>{t("المبلغ المطلوب (الدين)")}</label><input type="text" readOnly className="glass-input" style={{ width: "100%", background: "var(--panel-bg)" }} value={form.agreed_price ? Number(form.agreed_price).toLocaleString() : ""} /></div>
                <div><label style={lblStyle}>{t("الدفعة الحالية")}</label><input type="text" className="glass-input" style={{ width: "100%" }} value={form.paid ? Number(form.paid).toLocaleString() : ""} onChange={e => setForm({ ...form, paid: e.target.value.replace(/\D/g, "") })} /></div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={lblStyle}>{t("طريقة الدفع")}</label>
                  <select className="glass-input" style={{ width: "100%" }} value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                    <option value="Cash">{t("نقداً")}</option>
                    <option value="Card">{t("بطاقة")}</option>
                  </select>
                </div>
                <div><label style={lblStyle}>{t("التاريخ")}</label><DatePicker value={form.date} onChange={val => setForm({ ...form, date: val })} /></div>
              </div>
              <div><label style={lblStyle}>{t("ملاحظات")}</label><input className="glass-input" style={{ width: "100%" }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={() => setModal(false)} className="btn-ghost" style={{ flex: 1 }}>{t("إلغاء")}</button>
              <button onClick={save} className="btn-primary" style={{ flex: 1 }}>{t("حفظ الفاتورة")}</button>
            </div>
          </div>
        </div>
        , document.body)}

      {/* ── Edit Invoice Modal ── */}
      {editModal && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel animate-fade" style={{ width: "100%", maxWidth: 520, padding: 32 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>{t("تعديل الفاتورة")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={lblStyle}>{t("المريض")}</label>
                <input type="text" readOnly className="glass-input" style={{ width: "100%", background: "var(--panel-bg)" }} value={editModal.patient_name || ""} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={lblStyle}>{t("المبلغ المطلوب للفاتورة")}</label>
                  <input 
                    type="number" 
                    className="glass-input" 
                    style={{ width: "100%" }} 
                    value={editForm.total_amount} 
                    onChange={e => setEditForm({ ...editForm, total_amount: e.target.value })} 
                  />
                </div>
                <div>
                  <label style={lblStyle}>{t("المبلغ المدفوع")}</label>
                  <input 
                    type="number" 
                    className="glass-input" 
                    style={{ width: "100%" }} 
                    value={editForm.paid_amount} 
                    onChange={e => setEditForm({ ...editForm, paid_amount: e.target.value })} 
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={lblStyle}>{t("طريقة الدفع")}</label>
                  <select className="glass-input" style={{ width: "100%" }} value={editForm.payment_method} onChange={e => setEditForm({ ...editForm, payment_method: e.target.value })}>
                    <option value="Cash">{t("نقداً")}</option>
                    <option value="Card">{t("بطاقة")}</option>
                  </select>
                </div>
                <div><label style={lblStyle}>{t("التاريخ")}</label><DatePicker value={editForm.date} onChange={val => setEditForm({ ...editForm, date: val })} /></div>
              </div>
              <div><label style={lblStyle}>{t("ملاحظات")}</label><input className="glass-input" style={{ width: "100%" }} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={() => setEditModal(null)} className="btn-ghost" style={{ flex: 1 }}>{t("إلغاء")}</button>
              <button onClick={saveEdit} className="btn-primary" style={{ flex: 1 }}>{t("حفظ التعديلات")}</button>
            </div>
          </div>
        </div>
        , document.body)}
    </div>
  );
}
