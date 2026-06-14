import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useLanguage } from "../LanguageContext";
import { useAuth } from "../AuthContext";
import { useSettings } from "../SettingsContext";
import { BASE } from "../api";

const links = [
  { to: "/", label: "الرئيسية", icon: "🏠", mobile: true },
  { to: "/patients", label: "المرضى", icon: "👥", mobile: true },
  { to: "/appointments", label: "المواعيد", icon: "📅", mobile: true },
  { to: "/booking-requests", label: "طلبات الحجز", icon: "📩", mobile: true },
  { to: "/invoices", label: "الفواتير", icon: "💰", mobile: true },
  { to: "/prescriptions", label: "الوصفات", icon: "📝" },
  { to: "/messages", label: "المراسلات", icon: "💬", mobile: true },
  {
    label: "المزيد", icon: "📂", isDropdown: true, children: [
      { to: "/reports", label: "التقارير", icon: "📈" },
      { to: "/drugs", label: "الأدوية", icon: "💊" },
      { to: "/inventory", label: "المخزن", icon: "📦" },
      { to: "/expenses", label: "المصاريف", icon: "📉" },
      { to: "/purchases", label: "المشتريات", icon: "🛒" },
    ]
  },
  { to: "/settings", label: "الإعدادات", icon: "⚙️" },
  { to: "/admin", label: "إدارة النظام", icon: "🛡️", adminOnly: true },
];

const badgeStyle = {
  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
  background: "#ff4444", color: "white", borderRadius: "50%",
  minWidth: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 10, fontWeight: 800, border: "2px solid var(--bg-dark)", boxShadow: "0 4px 10px rgba(255, 68, 68, 0.4)"
};

const centerLinks = [
  { to: "/center", label: "لوحة المركز", icon: "📊", mobile: true },
  { to: "/center/doctors", label: "الأطباء", icon: "👨‍⚕️", mobile: true },
  { to: "/center/secretaries", label: "السكرتارية", icon: "👩‍💼", mobile: true },
  { to: "/center/reports", label: "التقارير المجمعة", icon: "📈", mobile: true },
  { to: "/center/announcements", label: "إعلانات النظام", icon: "📢", mobile: true },
  { to: "/center/audit-log", label: "سجل العمليات", icon: "🔎" },
  { to: "/inventory", label: "المخزن المركزي", icon: "📦", mobile: true },
  { to: "/purchases", label: "المشتريات المركزية", icon: "🛒", mobile: true },
  { to: "/center/expenses", label: "المصاريف العامة", icon: "📉" },
  { to: "/messages", label: "المراسلات", icon: "💬", mobile: true },
  { to: "/settings", label: "الإعدادات", icon: "⚙️" },
];

import ChatWidget from "./ChatWidget";

export default function Layout({ children }) {
  const { t, toggleLanguage, lang } = useLanguage();
  const { logout, user, switchActiveDoctor } = useAuth();
  const { settings } = useSettings();
  const [showMore, setShowMore] = useState(false);
  const [desktopMoreOpen, setDesktopMoreOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handleToast = (e) => {
      setToast(e.detail);
      setTimeout(() => setToast(null), 3000);
    };
    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [requestCount, setRequestCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const api = await import("../api");
        const [reqData, unreadData] = await Promise.all([
          api.getBookingRequests(),
          api.getUnreadMessagesCount()
        ]);
        if (Array.isArray(reqData)) setRequestCount(reqData.filter(r => r.status === 'pending').length);
        if (unreadData && typeof unreadData.count === 'number') setUnreadMsgCount(unreadData.count);
      } catch (e) {
        console.error("Layout fetchData error:", e);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
    weekday: "short", day: "numeric", month: "short"
  });

  const isViewingClinic = !!localStorage.getItem("activeDoctor");
  const menuLinks = (user?.account_type === 'center_manager' && !isViewingClinic) ? centerLinks : links;

  const filteredLinks = menuLinks.map(l => {
    if (l.isDropdown) {
      const filteredChildren = l.children.filter(child => {
        if (child.adminOnly && user?.role !== "admin") return false;

        // Hide Purchases/Reports from Center Doctors/Secretaries
        const restrictedForCenterStaff = ["المشتريات", "التقارير"];
        if (user?.account_type === 'single_doctor' && user?.center_id && restrictedForCenterStaff.includes(child.label)) return false;
        if (user?.role === "secretary" && restrictedForCenterStaff.includes(child.label)) return false;

        return true;
      });
      return { ...l, children: filteredChildren };
    }
    return l;
  }).filter(l => {
    if (l.adminOnly && user?.role !== "admin") return false;

    // Hide Messaging for Single Doctor accounts
    if (user?.account_type === 'single_doctor' && l.label === "المراسلات") return false;

    const restrictedForCenterStaff = ["المشتريات", "التقارير"];
    if (user?.account_type === 'single_doctor' && user?.center_id && restrictedForCenterStaff.includes(l.label)) return false;
    if (user?.role === "secretary" && restrictedForCenterStaff.includes(l.label)) return false;

    if (l.isDropdown && l.children.length === 0) return false;
    return true;
  });

  const flattenedLinks = filteredLinks.reduce((acc, curr) => {
    if (curr.isDropdown) return [...acc, ...curr.children];
    return [...acc, curr];
  }, []);

  const mobilePrimaryLinks = flattenedLinks.filter(l => l.mobile);
  const mobileSecondaryLinks = flattenedLinks.filter(l => !l.mobile);

  return (
    <div
      className={isMobile ? "mobile-mode" : ""}
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        minHeight: "100vh",
        direction: lang === "ar" ? "rtl" : "ltr"
      }}
    >
      {/* ── Sidebar (Desktop only) ── */}
      {!isMobile && (
        <aside className="glass-panel desktop-nav no-print">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40, padding: "0 10px" }}>
            {settings?.clinic_logo ? (
              <img src={BASE + settings.clinic_logo} alt="Logo" style={{ width: 40, height: 40, borderRadius: 12, objectFit: "cover" }} />
            ) : (
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: "linear-gradient(135deg, #185FA5, #00D2FF)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
              }}>🦷</div>
            )}
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.5 }}>
              {settings?.clinic_name || t("SmileCare")}
            </div>
          </div>

          <nav className="custom-scrollbar" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, width: "100%", overflowY: "auto", paddingRight: 4 }}>
            {filteredLinks.map(l => {
              if (l.isDropdown) {
                return (
                  <div key="dropdown-more">
                    <div onClick={() => setDesktopMoreOpen(!desktopMoreOpen)} className="nav-link" style={{ padding: "10px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <span style={{ fontSize: 18 }}>{l.icon}</span>
                        {t(l.label)}
                      </div>
                      <span style={{ fontSize: 10, opacity: 0.5 }}>{desktopMoreOpen ? "▲" : "▼"}</span>
                    </div>
                    {desktopMoreOpen && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingRight: 24, marginTop: 4, borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                        {l.children.map(child => (
                          <NavLink key={child.to} to={child.to}
                            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                            style={{ padding: "8px 16px", fontSize: 13 }}
                          >
                            <span style={{ fontSize: 16 }}>{child.icon}</span>
                            {t(child.label)}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink key={l.to} to={l.to} end={l.to === "/"}
                  className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                  style={{ padding: "10px 16px", position: "relative" }}
                >
                  <span style={{ fontSize: 18 }}>{l.icon}</span>
                  {t(l.label)}
                  {l.label === "طلبات الحجز" && requestCount > 0 && (
                    <span style={badgeStyle}>{requestCount}</span>
                  )}
                  {l.label === "المراسلات" && unreadMsgCount > 0 && (
                    <span style={badgeStyle}>{unreadMsgCount}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </aside>
      )}

      {/* ── Main content ── */}
      <main style={{
        flex: 1,
        overflowY: "auto",
        width: "100%",
        padding: isMobile ? 0 : "24px 32px 24px 16px",
        display: isMobile ? "flex" : "block",
        justifyContent: "center",
        background: isMobile && window.innerWidth >= 600 ? "#050810" : "transparent"
      }}>
        <div style={{
          width: "100%",
          maxWidth: isMobile ? "100%" : "100%",
          background: "var(--bg-dark)",
          minHeight: "100vh",
          position: "relative",
          padding: isMobile
            ? "20px 14px calc(90px + env(safe-area-inset-bottom, 16px)) 14px"
            : 0,
          margin: "0 auto",
          boxShadow: isMobile && window.innerWidth >= 600 ? "0 0 50px rgba(0,0,0,0.5)" : "none",
          borderLeft: isMobile && window.innerWidth >= 600 ? "1px solid rgba(255,255,255,0.05)" : "none",
          borderRight: isMobile && window.innerWidth >= 600 ? "1px solid rgba(255,255,255,0.05)" : "none",
        }}>

          {/* Top Header — هيدر عصري */}
          <header className="no-print" style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: isMobile ? 24 : 40, padding: isMobile ? "0" : "0 8px"
          }}>
            {/* Proxy Mode Banner for Center Manager */}
            {localStorage.getItem("activeDoctor") && user?.account_type === 'center_manager' && (
              <div className="glass-panel animate-fade" style={{
                position: "fixed", top: 0, left: 0, width: "100%", zIndex: 10002,
                background: "linear-gradient(90deg, #185FA5, #00D2FF)", padding: "10px 20px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                color: "white", fontWeight: 800, border: "none", borderRadius: 0,
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>👁️</span>
                  <span>{t("أنت تشاهد حالياً بيانات عيادة:")} {localStorage.getItem("activeDoctorName")} ({t("وضع المشاهدة فقط")})</span>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem("activeDoctor");
                    localStorage.removeItem("activeDoctorName");
                    window.location.href = "/center";
                  }}
                  className="btn-primary"
                  style={{ background: "rgba(255,255,255,0.2)", border: "1px solid white", padding: "6px 16px", fontSize: 13 }}
                >
                  🚪 {t("خروج والعودة للمركز")}
                </button>
              </div>
            )}

            {/* Context Switcher for Center Secretary */}
            {user?.account_type === 'center_secretary' && user?.assigned_doctors?.length > 0 && (
              <div className="glass-panel" style={{
                position: "fixed", top: 80, left: isMobile ? 10 : 310, zIndex: 1000,
                padding: "8px 16px", borderRadius: 20, display: "flex", alignItems: "center", gap: 12,
                border: "1px solid var(--primary)", background: "rgba(15, 23, 42, 0.9)"
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>👩‍💼 {t("تبديل الطبيب")}:</span>
                <select
                  value={user.activeDoctor || ""}
                  onChange={(e) => {
                    switchActiveDoctor(e.target.value);
                    window.location.reload(); // Refresh to clear previous state and fetch new data
                  }}
                  className="glass-input"
                  style={{ padding: "4px 8px", fontSize: 13, background: "transparent", border: "none", color: "white" }}
                >
                  <option value="">-- {t("اختر الطبيب")} --</option>
                  {user.assigned_doctors.map(d => (
                    <option key={d.username} value={d.username}>{d.doctor_name} ({d.clinic_name})</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 600, marginBottom: 4, letterSpacing: 0.5 }}>{today}</div>
              <h1 style={{
                fontSize: isMobile ? 20 : 28,
                fontWeight: 850,
                lineHeight: 1.1,
                margin: 0,
                color: "var(--text-main)",
                letterSpacing: "-0.5px"
              }}>
                {isMobile
                  ? (settings?.clinic_name || t("عيادة سمايل كير"))
                  : `${t("أهلاً بك")}، ${user?.role === "admin" ? "مدير النظام" : (user?.account_type === 'center_manager' ? "مدير المركز" : (user?.role === "secretary" ? t("سكرتيرة العيادة") : (settings?.doctor_name || t("دكتور"))))}`
                }
              </h1>
            </div>

            {!isMobile && (
              <div style={{ flex: 1, minWidth: 200, display: "flex", justifyContent: "center", padding: "0 20px" }}>
                <div style={{ position: "relative", width: "100%", maxWidth: 360 }}>
                  <input type="text" placeholder={t("بحث عام عن مريض...")} className="glass-input"
                    style={{ width: "100%", padding: "12px 20px", paddingLeft: 44, borderRadius: 24, background: "hsla(var(--bg-h), var(--bg-s), 15%, 0.4)", border: "1px solid var(--glass-border)" }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') window.location.href = `/patients?q=${encodeURIComponent(e.target.value)}`;
                    }}
                  />
                  <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", opacity: 0.5, fontSize: 18 }}>🔍</span>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
              {!isMobile && (
                <button onClick={() => setIsMobile(true)} className="glass-panel" style={{
                  width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, border: "1px solid var(--glass-border)",
                  background: "hsla(0, 0%, 100%, 0.03)", color: "white",
                  cursor: "pointer", borderRadius: 12, transition: "var(--transition)"
                }}>📱</button>
              )}

              <button onClick={logout} className="glass-panel" style={{
                width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, border: "1px solid hsla(0, 85%, 60%, 0.2)",
                background: "hsla(0, 85%, 60%, 0.05)", cursor: "pointer", borderRadius: 12, color: "#ff4444", transition: "var(--transition)"
              }}>🚪</button>
            </div>
          </header>

          <div className="animate-fade">{children}</div>

          {toast && (
            <div className="animate-fade" style={{
              position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
              padding: "12px 24px", borderRadius: 12, zIndex: 10000,
              background: toast.type === 'error' ? 'var(--danger)' : 'var(--success)',
              color: 'white', fontWeight: 600, boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
              display: "flex", alignItems: "center", gap: 10
            }}>
              <span style={{ fontSize: 18 }}>{toast.type === 'error' ? '⚠️' : '✅'}</span>
              <span>{toast.message}</span>
            </div>
          )}
        </div>
      </main>
      {user?.account_type !== 'single_doctor' && <ChatWidget />}

      {/* ── Bottom Nav (Mobile only) ── */}
      {isMobile && (
        <>
          {showMore && (
            <div className="mobile-more-popup" style={{
              position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
              width: "calc(100% - 32px)", maxWidth: 406, zIndex: 10001,
              transformOrigin: "bottom center"
            }}>
              <div className="glass-panel" style={{
                padding: "20px 16px",
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
                boxShadow: "0 25px 80px rgba(0,0,0,0.7)",
                background: "rgba(15, 23, 42, 0.98)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "28px"
              }}>
                <div style={{ gridColumn: "1/-1", fontSize: 11, fontWeight: 800, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1, textAlign: "center", opacity: 0.7 }}>{t("جميع الأقسام")}</div>
                {mobileSecondaryLinks.map(l => (
                  <NavLink key={l.to} to={l.to} onClick={() => setShowMore(false)}
                    className="nav-link" style={{
                      background: "rgba(255,255,255,0.03)", padding: "16px 8px",
                      borderRadius: "20px", flexDirection: "column",
                      justifyContent: "center", gap: 8, border: "1px solid rgba(255,255,255,0.05)",
                      textAlign: "center"
                    }}>
                    <span style={{ fontSize: 26, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))" }}>{l.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "white" }}>{t(l.label)}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          {showMore && <div onClick={() => setShowMore(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 10000 }}></div>}

          <nav className="mobile-nav no-print">
            {mobilePrimaryLinks.map(l => (
              <NavLink key={l.to} to={l.to} end={l.to === "/"} onClick={() => setShowMore(false)}
                className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                style={{ position: "relative" }}
              >
                <span className="nav-icon">{l.icon}</span>
                <span className="nav-label">{t(l.label)}</span>
                {l.label === "طلبات الحجز" && requestCount > 0 && (
                  <span style={{
                    position: "absolute", right: "20%", top: 5,
                    background: "#ff4444", color: "white", borderRadius: "50%",
                    minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 800, border: "2px solid #050810"
                  }}>{requestCount}</span>
                )}
              </NavLink>
            ))}
            <button
              onClick={() => setShowMore(!showMore)}
              className={showMore ? "nav-link active" : "nav-link"}
              style={{ background: "transparent", border: "none", cursor: "pointer", flex: 1 }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                background: showMore ? "var(--accent)" : "rgba(255,255,255,0.05)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: showMore ? "rotate(135deg)" : "rotate(0)",
                boxShadow: showMore ? "0 0 20px var(--accent-glow)" : "none",
                marginBottom: 4
              }}>
                <span style={{ fontSize: 24, color: "white" }}>+</span>
              </div>
              <span className="nav-label">{t("المزيد")}</span>
            </button>
          </nav>
        </>
      )}

      <style>{`
        .desktop-nav {
          width: 280px;
          margin: 20px;
          display: flex;
          flex-direction: column;
          padding: 32px 20px;
          position: sticky;
          top: 20px;
          height: calc(100vh - 40px);
          flex-shrink: 0;
          overflow: hidden;
          background: hsla(var(--bg-h), var(--bg-s), 10%, 0.4) !important;
          backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
        }

        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--glass-border-hover); border-radius: 10px; }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 20px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          text-decoration: none;
          font-size: 15px;
          font-weight: 600;
          transition: var(--transition);
          margin-bottom: 4px;
          border: 1px solid transparent;
        }

        .nav-link:hover { 
          background: hsla(var(--bg-h), var(--bg-s), 20%, 0.3);
          color: var(--text-main);
          border-color: var(--glass-border);
          transform: translateX(4px);
        }

        .nav-link.active { 
          background: hsla(var(--primary-h), 85%, 65%, 0.1) !important;
          color: var(--primary) !important;
          border-color: hsla(var(--primary-h), 85%, 65%, 0.2) !important;
          box-shadow: 0 4px 20px hsla(var(--primary-h), 85%, 65%, 0.1);
        }

        .mobile-nav {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 40px);
          max-width: 440px;
          height: 72px;
          display: flex;
          align-items: center;
          padding: 0 8px;
          z-index: 9999;
          border-radius: 24px;
          background: hsla(var(--bg-h), var(--bg-s), 15%, 0.8) !important;
          backdrop-filter: blur(20px) saturate(1.8);
          border: 1px solid hsla(0, 0%, 100%, 0.1);
          box-shadow: 0 12px 40px rgba(0,0,0,0.6);
        }

        .mobile-nav .nav-link {
          flex-direction: column;
          gap: 4px;
          padding: 8px 0;
          flex: 1;
          justify-content: center;
          background: transparent !important;
          box-shadow: none !important;
          border-radius: 0;
          font-size: 11px;
          font-weight: 700;
          min-height: 60px;
          margin-bottom: 0;
        }

        .mobile-nav .nav-link:hover { transform: none; }
        
        .mobile-nav .nav-link.active {
          color: var(--primary) !important;
        }
        
        .mobile-nav .nav-link.active .nav-icon {
          transform: translateY(-6px) scale(1.15);
          filter: drop-shadow(0 4px 12px var(--primary-glow));
        }
      `}</style>
    </div>
  );
}
