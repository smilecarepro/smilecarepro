import React, { useState, useEffect } from "react";
import { useLanguage } from "../LanguageContext";
import { useAuth } from "../AuthContext";
import { getCenterStats, getCenterLowStock } from "../api";
import { Link } from "react-router-dom";

export default function CenterDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_revenue: 0,
    total_patients: 0,
    total_appointments_today: 0,
    doctors_count: 0
  });
  const [lowStock, setLowStock] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    getCenterStats()
      .then(data => {
        if (data) setStats(data);
      })
      .catch(console.error);
    
    getCenterLowStock()
      .then(setLowStock)
      .catch(console.error);
      
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatNum = (num) => (num || 0).toLocaleString();

  return (
    <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ color: "var(--primary)", fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
            {currentTime.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px" }}>{t("لوحة تحكم المركز")}</h2>
          <p style={{ color: "var(--text-dim)", marginTop: 4 }}>{t("نظرة شاملة على أداء المركز الطبي والعيادات التابعة")}</p>
        </div>
        <div className="glass-panel" style={{ padding: "10px 20px", fontSize: 24, fontWeight: 800, color: "var(--primary)" }}>
          {currentTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </header>

      {/* Primary Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
         <div className="glass-panel stat-card" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -10, top: -10, fontSize: 80, opacity: 0.05 }}>👥</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 12, fontWeight: 600 }}>{t("إجمالي الأطباء")}</div>
            <div style={{ fontSize: 36, fontWeight: 900 }}>{formatNum(stats.doctors_count)}</div>
            <div style={{ fontSize: 11, color: "#10b981", marginTop: 8 }}>↑ {t("عيادات نشطة")}</div>
         </div>

         <div className="glass-panel stat-card" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -10, top: -10, fontSize: 80, opacity: 0.05 }}>📅</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 12, fontWeight: 600 }}>{t("موعد اليوم")}</div>
            <div style={{ fontSize: 36, fontWeight: 900 }}>{formatNum(stats.total_appointments_today)}</div>
            <div style={{ fontSize: 11, color: "var(--primary)", marginTop: 8 }}>{t("في جميع العيادات")}</div>
         </div>

         <div className="glass-panel stat-card" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -10, top: -10, fontSize: 80, opacity: 0.05 }}>💰</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 12, fontWeight: 600 }}>{t("الإيرادات الكلية")}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#10b981" }}>{formatNum(stats.total_revenue)} <span style={{ fontSize: 16 }}>د</span></div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 8 }}>{t("إجمالي التحصيلات")}</div>
         </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
        {/* Quick Access Menu */}
        <div className="glass-panel" style={{ padding: 24, gridColumn: "span 2" }}>
          <h3 style={{ marginBottom: 20, fontSize: 18, fontWeight: 800 }}>{t("إجراءات سريعة")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <Link to="/center/doctors" className="glass-panel hover-card" style={{ padding: 20, textAlign: "center", textDecoration: "none", color: "inherit" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👨‍⚕️</div>
              <div style={{ fontWeight: 700 }}>{t("إدارة الأطباء")}</div>
            </Link>
            <Link to="/center/secretaries" className="glass-panel hover-card" style={{ padding: 20, textAlign: "center", textDecoration: "none", color: "inherit" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👩‍💻</div>
              <div style={{ fontWeight: 700 }}>{t("السكرتارية")}</div>
            </Link>
            <Link to="/center/reports" className="glass-panel hover-card" style={{ padding: 20, textAlign: "center", textDecoration: "none", color: "inherit" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📈</div>
              <div style={{ fontWeight: 700 }}>{t("التقارير المالية")}</div>
            </Link>
            <Link to="/center/audit-log" className="glass-panel hover-card" style={{ padding: 20, textAlign: "center", textDecoration: "none", color: "inherit" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔎</div>
              <div style={{ fontWeight: 700 }}>{t("سجل العمليات")}</div>
            </Link>
            <Link to="/inventory" className="glass-panel hover-card" style={{ padding: 20, textAlign: "center", textDecoration: "none", color: "inherit" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
              <div style={{ fontWeight: 700 }}>{t("المخزن")}</div>
            </Link>
            <Link to="/center/announcements" className="glass-panel hover-card" style={{ padding: 20, textAlign: "center", textDecoration: "none", color: "inherit" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📢</div>
              <div style={{ fontWeight: 700 }}>{t("الإعلانات")}</div>
            </Link>
          </div>
        </div>

        {/* Global Operations Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="glass-panel" style={{ padding: 24, flex: 1, background: "linear-gradient(135deg, rgba(var(--primary-h), 0.1), transparent)" }}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>{t("المصاريف العامة")}</h3>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{formatNum(0)} <span style={{ fontSize: 12 }}>د</span></div>
            <div style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 16 }}>{t("مصاريف المركز غير المرتبطة بطبيب")}</div>
            <Link to="/center/expenses" className="btn-secondary" style={{ width: "100%", fontSize: 12, display: "block", textAlign: "center", textDecoration: "none" }}>{t("إدارة مصاريف المركز")}</Link>
          </div>
          
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>{t("آخر التنبيهات")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 300, overflowY: "auto" }} className="custom-scrollbar">
              {lowStock.length > 0 ? lowStock.map((item, idx) => (
                <div key={idx} style={{ 
                  fontSize: 12, borderLeft: "2px solid var(--danger)", paddingLeft: 10,
                  background: "rgba(239, 68, 68, 0.05)", padding: 8, borderRadius: "0 8px 8px 0"
                }}>
                  <div style={{ fontWeight: 800, color: "var(--danger)" }}>⚠️ {item.name}</div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
                    {t("الرصيد:")} {item.stock} {item.unit} | {item.clinic_name}
                  </div>
                </div>
              )) : (
                <div style={{ fontSize: 12, color: "var(--text-dim)", borderLeft: "2px solid var(--primary)", paddingLeft: 10 }}>
                  {t("لا توجد تنبيهات حالياً للمخزن.")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
