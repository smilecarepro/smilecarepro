import React, { useState, useEffect } from "react";
import { getCenterSecretaries, addCenterSecretary, mapSecretaryToDoctor, getCenterDoctors } from "../api";
import { useLanguage } from "../LanguageContext";

export default function CenterSecretaries() {
  const { t } = useLanguage();
  const [secretaries, setSecretaries] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "", full_name: "" });

  const fetchData = async () => {
    try {
      const secData = await getCenterSecretaries();
      setSecretaries(secData);
      const docData = await getCenterDoctors();
      setDoctors(docData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addCenterSecretary(formData);
      alert(t("تم إنشاء حساب السكرتيرة بنجاح"));
      setShowAddForm(false);
      setFormData({ username: "", password: "", full_name: "" });
      fetchData();
    } catch (error) {
      alert(t("خطأ: ") + error.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("هل أنت متأكد من حذف حساب السكرتيرة؟ سيتم فك ارتباطها بجميع الأطباء!"))) return;
    try {
      await deleteSecretaryFromCenter(id);
      fetchData();
    } catch (error) {
      alert(t("خطأ: ") + error.message);
    }
  };

  const toggleMapping = async (secUsername, doctorId, isAssigned) => {
    try {
      await mapSecretaryToDoctor({
        secretary_username: secUsername,
        doctor_id: doctorId,
        action: isAssigned ? "remove" : "add"
      });
      fetchData();
    } catch (error) {
      alert(t("خطأ في تحديث الربط: ") + error.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>{t("إدارة سكرتارية المركز")}</h2>
          <p style={{ color: "var(--text-dim)" }}>{t("أنشئ حسابات السكرتارية في قاعدة بيانات مستقلة")}</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary"
          style={{ padding: "12px 24px" }}
        >
          {showAddForm ? t("إلغاء") : t("إضافة سكرتيرة جديدة")}
        </button>
      </header>

      {showAddForm && (
        <div className="glass-panel animate-fade" style={{ padding: 24, maxWidth: 500 }}>
          <h3 style={{ marginBottom: 20 }}>{t("حساب سكرتيرة جديد")}</h3>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
              <label>{t("الاسم الكامل")}</label>
              <input 
                required
                className="glass-input"
                placeholder={t("مثال: سكرتيرة العيادة أ")}
                value={formData.full_name} 
                onChange={e => setFormData({...formData, full_name: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label>{t("اسم المستخدم")}</label>
              <input 
                required
                className="glass-input"
                value={formData.username} 
                onChange={e => setFormData({...formData, username: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label>{t("كلمة المرور")}</label>
              <input 
                required
                type="password"
                className="glass-input"
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? t("جاري الحفظ...") : t("إنشاء الحساب")}
            </button>
          </form>
        </div>
      )}

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 20 }}>
        {secretaries.length === 0 ? (
          <div className="glass-panel" style={{ gridColumn: "1/-1", padding: 40, textAlign: "center", color: "var(--text-dim)" }}>
            {t("لا توجد سكرتيرات مضافات حالياً")}
          </div>
        ) : secretaries.map(sec => (
          <div key={sec.id} className="glass-panel animate-fade" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
               <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{sec.full_name}</div>
                  <div style={{ fontSize: 13, color: "var(--primary)" }}>@{sec.username}</div>
               </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                   <span style={{ 
                      padding: "4px 12px", borderRadius: 12, fontSize: 10, fontWeight: 700,
                      background: "rgba(16,185,129,0.1)", color: "#10b981"
                   }}>{t("نشط")}</span>
                   <button onClick={() => handleDelete(sec.id)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 16 }}>🗑️</button>
                </div>
            </div>

            <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700 }}>{t("الأطباء المخصصون لهذه السكرتيرة")}:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
               {doctors.map(doc => {
                  const isAssigned = sec.assigned_doctors?.some(a => a.id === doc.id);
                  return (
                    <button 
                      key={doc.id}
                      onClick={() => toggleMapping(sec.username, doc.id, isAssigned)}
                      style={{
                        padding: "6px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                        border: "1px solid",
                        borderColor: isAssigned ? "var(--primary)" : "rgba(255,255,255,0.1)",
                        background: isAssigned ? "rgba(var(--primary-h), 85%, 65%, 0.1)" : "transparent",
                        color: isAssigned ? "var(--primary)" : "var(--text-dim)",
                        transition: "all 0.2s"
                      }}
                    >
                      {isAssigned ? "✅" : "➕"} {doc.doctor_name}
                    </button>
                  );
               })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
