import React, { useState, useEffect } from "react";
import { getCenterDoctors, addDoctorToCenter, updateDoctorSettings, deleteDoctorFromCenter } from "../api";
import { useLanguage } from "../LanguageContext";
import { useNavigate } from "react-router-dom";
import DatePicker from "../components/DatePicker";

export default function CenterDoctors() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  // ... state ...

  const handleDeleteDoctor = async (id) => {
    if (!window.confirm(t("هل أنت متأكد من حذف هذا الطبيب؟ سيتم مسح بيانات عيادته بالكامل!"))) return;
    try {
      await deleteDoctorFromCenter(id);
      fetchData();
    } catch (error) {
      alert(t("خطأ: ") + error.message);
    }
  };
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [formData, setFormData] = useState({ 
    username: "", 
    password: "", 
    doctor_name: "", 
    clinic_name: "" 
  });
  const [editFormData, setEditFormData] = useState({
    doctor_name: "",
    clinic_name: "",
    expiry_date: "",
    commission_rate: 0,
    password: ""
  });

  const fetchData = async () => {
    try {
      const data = await getCenterDoctors();
      setDoctors(data);
    } catch (error) {
      console.error("Error fetching doctors:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoctorToCenter(formData);
      alert(t("تمت إضافة الطبيب بنجاح"));
      setShowAddForm(false);
      setFormData({ username: "", password: "", doctor_name: "", clinic_name: "" });
      fetchData();
    } catch (error) {
      alert(t("خطأ: ") + error.message);
    }
    setLoading(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoctorSettings(editingDoctor.id, editFormData);
      alert(t("تم تحديث بيانات الطبيب"));
      setEditingDoctor(null);
      fetchData();
    } catch (error) {
      alert(t("خطأ: ") + error.message);
    }
    setLoading(false);
  };

  const handleEnterClinic = (doctor) => {
    localStorage.setItem("activeDoctor", doctor.username);
    localStorage.setItem("activeDoctorName", doctor.doctor_name || doctor.username);
    window.location.href = "/#/home";
  };

  const openSettings = (doctor) => {
    setEditingDoctor(doctor);
    setEditFormData({
      doctor_name: doctor.doctor_name || "",
      clinic_name: doctor.clinic_name || "",
      expiry_date: doctor.expiry_date || "",
      commission_rate: doctor.commission_rate || 0,
      password: ""
    });
  };

  const lblStyle = { fontSize: 12, color: "var(--text-muted)", marginBottom: 8, display: "block", fontWeight: 600 };

  return (
    <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 100 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 900, background: "linear-gradient(90deg, #fff, var(--text-muted))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{t("إدارة أطباء المركز")}</h2>
          <p style={{ color: "var(--text-dim)" }}>{t("أضف أطباء جدد، حدد العمولات، أو ادخل لمشاهدة عياداتهم")}</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
          style={{ padding: "12px 24px", borderRadius: 16, display: "flex", alignItems: "center", gap: 8 }}
        >
          {showAddForm ? <span>✕ {t("إلغاء")}</span> : <span>+ {t("إضافة طبيب جديد")}</span>}
        </button>
      </header>

      {showAddForm && (
        <div className="glass-panel animate-fade" style={{ padding: 32, maxWidth: 800, border: "1px solid var(--primary)" }}>
          <h3 style={{ marginBottom: 24, fontSize: 20 }}>✨ {t("بيانات الطبيب الجديد")}</h3>
          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label style={lblStyle}>{t("اسم الطبيب")}</label>
              <input required className="glass-input" style={{ width: "100%" }} value={formData.doctor_name} onChange={e => setFormData({...formData, doctor_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label style={lblStyle}>{t("اسم العيادة / الفرع")}</label>
              <input required className="glass-input" style={{ width: "100%" }} value={formData.clinic_name} onChange={e => setFormData({...formData, clinic_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label style={lblStyle}>{t("اسم المستخدم")}</label>
              <input required className="glass-input" style={{ width: "100%" }} value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
            </div>
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label style={lblStyle}>{t("كلمة المرور")}</label>
              <input required type="password" className="glass-input" style={{ width: "100%" }} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            <button type="submit" className="btn-primary" style={{ gridColumn: "span 2", padding: 16, fontSize: 16 }} disabled={loading}>
              {loading ? t("جاري الإضافة...") : t("إضافة الطبيب")}
            </button>
          </form>
        </div>
      )}

      {/* Settings Modal */}
      {editingDoctor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 20 }}>
           <div className="glass-panel animate-fade" style={{ width: "100%", maxWidth: 600, padding: 32, border: "1px solid var(--accent)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h3 style={{ fontSize: 22 }}>⚙️ {t("إعدادات الطبيب")}: <span style={{ color: "var(--primary)" }}>{editingDoctor.doctor_name}</span></h3>
                <button onClick={() => setEditingDoctor(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 24, cursor: "pointer" }}>✕</button>
              </div>
              
              <form onSubmit={handleUpdate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={lblStyle}>{t("اسم الطبيب")}</label>
                  <input className="glass-input" style={{ width: "100%" }} value={editFormData.doctor_name} onChange={e => setEditFormData({...editFormData, doctor_name: e.target.value})} />
                </div>
                <div>
                  <label style={lblStyle}>{t("اسم العيادة")}</label>
                  <input className="glass-input" style={{ width: "100%" }} value={editFormData.clinic_name} onChange={e => setEditFormData({...editFormData, clinic_name: e.target.value})} />
                </div>
                <div>
                  <label style={lblStyle}>{t("نسبة العمولة (%)")}</label>
                  <input type="number" className="glass-input" style={{ width: "100%", color: "var(--accent)", fontWeight: 800 }} value={editFormData.commission_rate} onChange={e => setEditFormData({...editFormData, commission_rate: e.target.value})} />
                </div>
                <div>
                  <label style={lblStyle}>{t("تاريخ انتهاء الاشتراك")}</label>
                  <DatePicker value={editFormData.expiry_date} onChange={val => setEditFormData({...editFormData, expiry_date: val})} />
                </div>
                <div>
                  <label style={lblStyle}>{t("تغيير كلمة المرور")}</label>
                  <input type="password" placeholder="اتركه فارغاً للحفظ" className="glass-input" style={{ width: "100%" }} value={editFormData.password} onChange={e => setEditFormData({...editFormData, password: e.target.value})} />
                </div>
                <div style={{ gridColumn: "span 2", display: "flex", gap: 12, marginTop: 10 }}>
                   <button type="submit" className="btn-primary" style={{ flex: 2, padding: 14 }} disabled={loading}>{loading ? t("جاري الحفظ...") : t("حفظ التغييرات")}</button>
                   <button type="button" onClick={() => { setEditingDoctor(null); handleDeleteDoctor(editingDoctor.id); }} style={{ flex: 1, padding: 14, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", borderRadius: 12, cursor: "pointer" }}>{t("حذف الحساب")}</button>
                   <button type="button" onClick={() => setEditingDoctor(null)} style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 12, cursor: "pointer" }}>{t("إلغاء")}</button>
                </div>
              </form>
           </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 24 }}>
        {doctors.length === 0 ? (
          <div className="glass-panel" style={{ gridColumn: "1/-1", padding: 40, textAlign: "center", color: "var(--text-dim)" }}>
            {t("لا يوجد أطباء مضافون حالياً")}
          </div>
        ) : doctors.map(doc => (
          <div key={doc.id} className="glass-panel animate-fade" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
               <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{doc.doctor_name || doc.username}</div>
                  <div style={{ fontSize: 13, color: "var(--text-dim)" }}>{doc.clinic_name}</div>
               </div>
               <span style={{ 
                  padding: "4px 12px", borderRadius: 12, fontSize: 10, fontWeight: 700,
                  background: doc.status === 'active' ? "rgba(16,185,129,0.1)" : "rgba(239, 68, 68, 0.1)", 
                  color: doc.status === 'active' ? "#10b981" : "#ef4444"
               }}>{t(doc.status)}</span>
            </div>
            
            <div style={{ display: "flex", gap: 12 }}>
               <button 
                 onClick={() => handleEnterClinic(doc)}
                 className="btn-primary" 
                 style={{ flex: 1, fontSize: 13 }}
               >
                 👁️ {t("دخول العيادة")}
               </button>
               <button 
                 onClick={() => openSettings(doc)}
                 className="btn-secondary" 
                 style={{ fontSize: 13 }}
               >
                 ⚙️ {t("إعدادات")}
               </button>
            </div>
            
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}>
               <span>💰 {t("العمولة")}: %{doc.commission_rate || 0}</span>
               <span>📅 {doc.expiry_date || t("غير محدد")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
