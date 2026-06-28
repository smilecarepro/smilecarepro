import React, { useState, useEffect, lazy, Suspense as ReactSuspense } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { BASE } from "./api";
import { AuthProvider, useAuth }  from "./AuthContext";
import { LanguageProvider, useLanguage } from "./LanguageContext";
import { SettingsProvider, useSettings }       from "./SettingsContext";
import { SessionProvider } from "./SessionContext";
import Layout        from "./components/Layout";
import Login         from "./pages/Login";
import Register      from "./pages/Register";


const Home = lazy(() => import("./pages/Home"));
const Patients = lazy(() => import("./pages/Patients"));
const PatientProfile = lazy(() => import("./pages/PatientProfile"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Debts = lazy(() => import("./pages/Debts"));
const Prescriptions = lazy(() => import("./pages/Prescriptions"));
const Admin = lazy(() => import("./pages/Admin"));
const DrugStore = lazy(() => import("./pages/DrugStore"));
const TodaySchedule = lazy(() => import("./pages/TodaySchedule"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Messages = lazy(() => import("./pages/Messages"));
const CenterAnnouncements = lazy(() => import("./pages/CenterAnnouncements"));
const DailySummary = lazy(() => import("./pages/DailySummary"));
const CenterDashboard = lazy(() => import("./pages/CenterDashboard"));
const CenterDoctors = lazy(() => import("./pages/CenterDoctors"));
const CenterSecretaries = lazy(() => import("./pages/CenterSecretaries"));
const CenterExpenses = lazy(() => import("./pages/CenterExpenses"));
const CenterReports = lazy(() => import("./pages/CenterReports"));


function ProtectedApp() {
  const { user, logout } = useAuth();
  const { lang } = useLanguage();
  const { settings } = useSettings();
  
  const canViewReports = user?.role !== 'secretary' || (settings?.sec_perm_reports && settings?.sec_perm_reports !== 'none');
  const canViewInvoices = user?.role !== 'secretary' || (settings?.sec_perm_invoices && settings?.sec_perm_invoices !== 'none');
  const canViewExpenses = user?.role !== 'secretary' || (settings?.sec_perm_expenses && settings?.sec_perm_expenses !== 'none');
  const canViewInventory = user?.role !== 'secretary' || (settings?.sec_perm_inventory && settings?.sec_perm_inventory !== 'none');
  const canViewMessages = user?.role !== 'secretary' || (settings?.sec_perm_messages !== '0');
  const canViewDailySummary = user?.role !== 'secretary' || (settings?.sec_perm_daily_summary === '1');
  const canViewDailySchedule = user?.role !== 'secretary';
  
  
  if (!user) return <Navigate to="/" replace />;
  
  // If an admin somehow lands in the clinic layout, redirect them immediately to their dashboard
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  
  // If a center manager logs in, make sure they are on the center dashboard (unless they are viewing a specific doctor's clinic)
  const isViewingClinic = !!localStorage.getItem("activeDoctor");
  if (user.account_type === 'center_manager' && !isViewingClinic && !window.location.hash.includes('#/center') && !window.location.hash.includes('#/settings') && !window.location.hash.includes('#/inventory') && !window.location.hash.includes('#/purchases') && !window.location.hash.includes('#/messages')) {
     return <Navigate to="/center" replace />;
  }

  // Check subscription/status (Only for non-admin)
  const isInactive = user?.role !== 'admin' && user?.status === 'inactive';
  const isExpired = user?.role !== 'admin' && user?.expiry_date && new Date(user.expiry_date) < new Date();

  
  if (isInactive || isExpired) {
    return (
      <div style={{ 
        height: "100vh", width: "100vw", background: "var(--bg-dark)", 
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        color: "var(--text-light)", padding: "20px", textAlign: "center"
      }}>
        <div className="glass-panel" style={{ padding: "40px", maxWidth: "500px" }}>
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>⚠️</div>
          <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>الحساب معطل أو انتهى الاشتراك</h1>
          <p style={{ color: "var(--text-muted)", marginBottom: "32px", lineHeight: "1.6" }}>
            عذراً، لا يمكنك الوصول إلى النظام حالياً. يرجى الاتصال بالإدارة لتجديد اشتراكك أو تفعيل الحساب عبر الرقم التالي:<br/>
            <strong style={{ color: "var(--accent)", fontSize: "20px" }}>{user.support_phone}</strong>
          </p>
          <button className="btn-secondary" onClick={logout}>تسجيل الخروج</button>
        </div>
      </div>
    );
  }
  
  return (
    <Layout>
      <Routes>
        <Route path="/home"           element={(user?.account_type === 'center_manager' && !isViewingClinic) ? <Navigate to="/center" /> : <Home />} />
        <Route path="/center"         element={user?.account_type === 'center_manager' ? <CenterDashboard /> : <Navigate to="/home" />} />
        <Route path="/center/doctors" element={user?.account_type === 'center_manager' ? <CenterDoctors /> : <Navigate to="/home" />} />
        <Route path="/center/secretaries" element={user?.account_type === 'center_manager' ? <CenterSecretaries /> : <Navigate to="/home" />} />
        <Route path="/patients"       element={<Patients />} />
        <Route path="/patients/:id"   element={<PatientProfile />} />
        <Route path="/appointments"   element={<Appointments />} />
        <Route path="/today-schedule" element={canViewDailySchedule ? <TodaySchedule /> : <Navigate to="/home" replace />} />
        <Route path="/invoices"       element={canViewInvoices ? <Invoices /> : <Navigate to="/home" />} />
        <Route path="/reports"        element={canViewReports ? <Reports /> : <Navigate to="/home" />} />
        <Route path="/expenses"       element={canViewExpenses ? <Expenses /> : <Navigate to="/home" />} />
        <Route path="/debts"          element={canViewReports ? <Debts /> : <Navigate to="/home" />} />
        <Route path="/prescriptions"  element={<Prescriptions />} />
        <Route path="/drugs"          element={user?.role === 'secretary' ? <Navigate to="/home" /> : <DrugStore />} />
        <Route path="/settings"       element={<Settings />} />
        <Route path="/inventory"      element={canViewInventory ? <Inventory /> : <Navigate to="/home" />} />
        <Route path="/purchases"      element={user?.role === 'secretary' ? <Navigate to="/home" /> : <Purchases />} />
        <Route path="/center/expenses"    element={user?.account_type === 'center_manager' ? <CenterExpenses /> : <Navigate to="/home" />} />
        <Route path="/center/reports"     element={user?.account_type === 'center_manager' ? <CenterReports /> : <Navigate to="/home" />} />
        <Route path="/center/announcements" element={user?.account_type === 'center_manager' ? <CenterAnnouncements /> : <Navigate to="/home" />} />
        <Route path="/messages"       element={canViewMessages ? <Messages /> : <Navigate to="/home" />} />
        <Route path="/daily-summary"  element={canViewDailySummary ? <DailySummary /> : <Navigate to="/home" />} />
        <Route path="/audit-log"      element={user?.role === 'secretary' ? <Navigate to="/home" /> : <AuditLog />} />
        <Route path="/"               element={<Navigate to="/home" replace />} />
        <Route path="*"               element={<Navigate to="/home" />} />
      </Routes>
    </Layout>
  );
}

function AuthRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* Guest Entrance */}
      <Route path="/" element={user ? <Navigate to={user.role === 'admin' ? "/admin" : (user.account_type === 'center_manager' ? "/center" : "/home")} replace /> : <Login />} />
      
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? "/admin" : (user.account_type === 'center_manager' ? "/center" : "/home")} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={user.role === 'admin' ? "/admin" : (user.account_type === 'center_manager' ? "/center" : "/home")} replace /> : <Register />} />
      
      <Route path="/admin" element={
        <ProtectedAdmin>
          <Admin />
        </ProtectedAdmin>
      } />
      
      {/* Protected Clinic App */}
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  );
}

export default function App() {
  const [announcement, setAnnouncement] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // 🎨 Theme Persistence Logic
    const savedLightMode = localStorage.getItem("light-mode") === "true";
    if (savedLightMode) {
      document.body.classList.add("light-mode");
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    fetch(`${BASE}/auth/announcement`)
      .then(r => r.json())
      .then(d => { if (d.message) setAnnouncement(d.message); })
      .catch(() => {});

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <SettingsProvider>
          <SessionProvider>
            <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
              {!isOnline && (
                <div style={{
                  background: 'linear-gradient(90deg, #ff416c, #ff4b2b)',
                  color: "var(--text-main)",
                  padding: '8px 20px',
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: '700',
                  zIndex: 1000003,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '16px' }}>🔌</span>
                  أنت تعمل حالياً في وضع عدم الاتصال. سيتم حفظ التغييرات محلياً ومزامنتها عند عودة الإنترنت.
                </div>
              )}
              {announcement && (

                <div style={{
                  background: 'linear-gradient(90deg, #0061ff, #6033ff)',
                  color: "var(--text-main)",
                  padding: '10px 20px',
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                  position: 'relative',
                  zIndex: 1000002,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '16px' }}>📢</span>
                  {announcement}
                  <button 
                    onClick={() => setAnnouncement("")}
                    style={{ position: 'absolute', right: '15px', background: "var(--panel-bg-hover)", border: 'none', color: 'white', cursor: 'pointer', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}
                  >✕</button>
                </div>
              )}
              <HashRouter>
                <ReactSuspense fallback={<PageLoader />}>
                  <AuthRoutes />
                </ReactSuspense>
              </HashRouter>
            </div>
          </SessionProvider>
        </SettingsProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

const PageLoader = () => (
  <div style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    width: "100%",
    color: "var(--text-main)",
    gap: "16px"
  }}>
    <div style={{
      width: "40px",
      height: "40px",
      border: "3px solid rgba(0, 210, 255, 0.1)",
      borderTop: "3px solid var(--primary, #00D2FF)",
      borderRadius: "50%",
      animation: "spin 1s linear infinite"
    }} />
    <span style={{ fontSize: "14px", fontWeight: "600", opacity: 0.8 }}>جاري التحميل...</span>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);


function ProtectedAdmin({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin') return <Navigate to="/" />;
  return children;
}
