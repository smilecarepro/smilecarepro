import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStats, getAppointments, getFinancialStats, getLowStock } from "../api";
import { useLanguage } from "../LanguageContext";
import { useSettings } from "../SettingsContext";
import { useAuth } from "../AuthContext";

const StatCard = ({ val, lbl, subMobile, subDesktop, color, icon }) => (
  <div className="glass-panel animate-fade stat-card-container">
    <div className="stat-card-top">
      <div className="stat-card-icon" style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      {subDesktop && (
        <div className="stat-card-badge desktop-only" style={{ background: `${color}15`, color }} dir="ltr">
          {subDesktop}
        </div>
      )}
    </div>
    <div className="stat-card-bottom">
      <div className="stat-card-label">{lbl}</div>
      <div className="stat-card-val">{val}</div>
      {subMobile && <div className="stat-card-sub mobile-only" style={{ color: subMobile.includes("د.ع") ? color : "var(--success)" }} dir="ltr">{subMobile}</div>}
    </div>
  </div>
);

export default function Home() {
  const [stats, setStats] = useState({});
  const [fin, setFin] = useState({});
  const [apts, setApts] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const nav = useNavigate();
  const { t } = useLanguage();
  const { settings } = useSettings();

  useEffect(() => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    getStats().then(res => setStats(res || {})).catch(console.error);
    getAppointments(today).then(res => setApts(res || [])).catch(console.error);
    getFinancialStats().then(res => setFin(res || {})).catch(console.error);
    
    // Fetch low stock items
    getLowStock()
      .then(items => {
        if (Array.isArray(items)) {
          const low = items.filter(i => i.stock <= i.min_stock);
          setLowStockItems(low);
        } else {
          setLowStockItems([]);
        }
      })
      .catch(console.error);
  }, []);


  const { user } = useAuth();
  const isSecretary = user?.role === "secretary";

  const [dismissedLowStock, setDismissedLowStock] = useState(sessionStorage.getItem("dismissed_low_stock") === "true");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ⚠️ Low Stock Alert Panel */}
      {lowStockItems.length > 0 && !dismissedLowStock && (
        <div className="glass-panel animate-fade" style={{ 
          background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          padding: "16px 24px",
          borderRadius: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#ef4444", fontWeight: 800, fontSize: 16 }}>
                <span>⚠️</span> {t("تنبيه المخزن: مواد أوشكت على النفاذ")}
             </div>
             <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => nav("/inventory")} className="view-all-btn" style={{ fontWeight: 700 }}>{t("اذهب للمخزن")} ←</button>
                <button 
                  onClick={() => {
                    setDismissedLowStock(true);
                    sessionStorage.setItem("dismissed_low_stock", "true");
                  }} 
                  style={{ 
                    background: "rgba(255,255,255,0.1)", border: "none", color: "#ef4444", 
                    width: 24, height: 24, borderRadius: "50%", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10
                  }}
                >✕</button>
             </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
             {lowStockItems.map(item => (
                <div key={item.id} style={{ 
                  background: "rgba(255,255,255,0.05)", 
                  padding: "6px 12px", 
                  borderRadius: 10, 
                  fontSize: 13, 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 8,
                  border: "1px solid rgba(255,255,255,0.05)"
                }}>
                   <span style={{ fontWeight: 700 }}>{item.name}</span>
                   <span style={{ color: "#ef4444", fontWeight: 800 }}>({item.stock} {item.unit})</span>
                </div>
             ))}
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ gridTemplateColumns: fin.commission_amount > 0 ? "repeat(auto-fit, minmax(200px, 1fr))" : undefined }}>
        <StatCard icon="📅" color="#185FA5" lbl={t("مواعيد اليوم")} val={stats.total_today || "0"} subMobile="من أمس +2" subDesktop="+12%" />
        
        <StatCard 
          icon="💰" 
          color="#10b981" 
          lbl={isSecretary ? t("إيرادات اليوم") : t("إجمالي الإيرادات")} 
          val={`${(isSecretary ? (fin.collected_today || 0) : (fin.revenue || 0)).toLocaleString()} ${t("د")}`} 
          subMobile="Gross" 
          subDesktop={fin.commission_amount > 0 ? `Rate: %${user.commission_rate}` : "+5.4%"} 
        />

        {fin.commission_amount > 0 && !isSecretary && (
          <StatCard 
            icon="🤝" 
            color="#f59e0b" 
            lbl={t("عمولة المركز")} 
            val={`${(fin.commission_amount || 0).toLocaleString()} ${t("د")}`} 
            subMobile="Center Share" 
            subDesktop={`-%${user.commission_rate}`}
          />
        )}

        <StatCard icon="💸" color="#ef4444" lbl={isSecretary ? t("صرفيات اليوم") : t("المصاريف")} val={`${(isSecretary ? (fin.expenses_today || 0) : (fin.expenses || 0)).toLocaleString()} ${t("د")}`} subMobile="د.ع" />
        
        {!isSecretary && (
          <StatCard 
            icon="💎" 
            color="#00D2FF" 
            lbl={t("صافي الربح")} 
            val={`${(fin.net_profit || 0).toLocaleString()} ${t("د")}`} 
            subMobile={fin.commission_amount > 0 ? "After Commission" : "Net"} 
            subDesktop="Stable" 
          />
        )}
      </div>

      <div className="home-main-grid">
        <div className="glass-panel home-section-card">
          <div className="home-section-header">
            <h3 className="section-title">{t("جدول المواعيد الحالية")}</h3>
            <button onClick={() => nav("/appointments")} className="view-all-btn">{t("عرض الكل")}</button>
          </div>
          <div className="apt-list">
            {apts.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>☕</div>
                {t("لا توجد مواعيد متبقية لليوم")}
              </div>
            ) : apts.map((a, i) => (
              <div key={a.id} className="appointment-row" style={{
                display: "flex", alignItems: "center", gap: 12, padding: "14px 0",
                borderBottom: i < apts.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none"
              }}>
                <div style={{
                  fontSize: 11, padding: "4px 10px", borderRadius: 12, fontWeight: 600, flexShrink: 0,
                  background: a.status === "مكتمل" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                  color: a.status === "مكتمل" ? "#10b981" : "#f59e0b"
                }}>{t(a.status)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.patient_name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t(a.type)}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", flexShrink: 0, direction: "ltr" }}>{a.time}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="glass-panel home-section-card">
            <div className="home-section-header">
              <h3 className="section-title">{t("الوصول السريع")}</h3>
            </div>
            <div className="quick-grid">
              {!isSecretary && (
                <button onClick={() => nav("/daily-summary")} className="quick-action-btn" style={{ gridColumn: "1/-1", background: "rgba(0, 210, 255, 0.08)", border: "1px solid rgba(0, 210, 255, 0.2)", padding: "20px" }}>
                  <div className="quick-icon-box" style={{ background: "rgba(0, 210, 255, 0.2)", color: "#00D2FF", width: 44, height: 44, fontSize: 22 }}>📊</div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#00D2FF" }}>{t("ملخص الجرد اليومي")}</div>
                    <div style={{ fontSize: 11, color: "rgba(0, 210, 255, 0.6)", marginTop: 2 }}>{t("جرد المقبوضات والمصاريف والحالات اليوم")}</div>
                  </div>
                </button>
              )}
              {[
                { icon: "👤", label: "مريض جديد", path: "/patients", color: "#8B5CF6" },
                { icon: "📅", label: "موعد جديد", path: "/appointments", color: "#00D2FF" },
                { icon: "🧾", label: "فاتورة", path: "/invoices", color: "#10b981" },
                { icon: "📈", label: "التقارير", path: "/reports", color: "#f59e0b" },
              ].map(action => (
                <button key={action.path} onClick={() => nav(action.path)} className="quick-action-btn">
                  <div className="quick-icon-box" style={{ background: `${action.color}18`, color: action.color }}>{action.icon}</div>
                  <span className="quick-label">{t(action.label)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel tip-card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>💡 {t("نصيحة اليوم")}</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
              {t("تأكد من مراجعة الحالات الطبية المسجلة للمريض قبل البدء في أي إجراء جراحي اليوم.")}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .home-main-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 20px;
          align-items: start;
        }

        .home-section-card {
          padding: 24px;
        }

        .home-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .quick-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 12px; 
        }

        /* ═══ MOBILE ═══ */
        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .home-main-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .quick-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
