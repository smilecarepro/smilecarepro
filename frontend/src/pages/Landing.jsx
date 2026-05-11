import React from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-container" style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at top right, #1e293b, #0f172a)",
      color: "#f8fafc",
      fontFamily: "'Inter', sans-serif",
      overflowX: "hidden"
    }}>
      {/* Navbar */}
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "24px 8%", position: "fixed", width: "100%", top: 0, zIndex: 100,
        background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        <div style={{ fontSize: "24px", fontWeight: "800", color: "#38bdf8", display: "flex", alignItems: "center", gap: "10px" }}>
          <span>🦷</span> SmileCare
        </div>
        <div style={{ display: "flex", gap: "24px" }}>
          <button onClick={() => navigate("/login")} className="btn-secondary" style={{ padding: "8px 24px", background: "transparent", color: "#38bdf8", border: "1px solid #38bdf8" }}>
            تسجيل الدخول
          </button>
          <button onClick={() => navigate("/register")} className="btn-primary" style={{ padding: "8px 24px", background: "#38bdf8", color: "#0f172a", border: "none" }}>
            ابدأ الآن مجاناً
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        padding: "180px 8% 100px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center"
      }}>
        <h1 style={{ fontSize: "64px", fontWeight: "900", marginBottom: "24px", lineHeight: "1.1", maxWidth: "900px" }}>
          أدِر عيادتك بذكاء مع <span style={{ color: "#38bdf8" }}>SmileCare</span>
        </h1>
        <p style={{ fontSize: "20px", color: "#94a3b8", maxWidth: "700px", marginBottom: "40px", lineHeight: "1.6" }}>
          النظام المتكامل لإدارة عيادات الأسنان: مواعيد، سجلات مرضى، حسابات مالية، وتقارير ذكية، كل ذلك في منصة واحدة آمنة وسهلة الاستخدام.
        </p>
        <div style={{ display: "flex", gap: "16px" }}>
          <button onClick={() => navigate("/register")} style={{ 
            padding: "16px 40px", fontSize: "18px", fontWeight: "700", 
            background: "linear-gradient(135deg, #38bdf8, #818cf8)", border: "none", borderRadius: "12px", color: "white", cursor: "pointer",
            boxShadow: "0 10px 25px rgba(56, 189, 248, 0.3)"
          }}>
            أنشئ حساب عيادتك الآن
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: "80px 8%", background: "rgba(255,255,255,0.02)" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <h2 style={{ fontSize: "36px", fontWeight: "800", marginBottom: "16px" }}>لماذا يختار الأطباء SmileCare؟</h2>
          <div style={{ width: "80px", h: "4px", background: "#38bdf8", margin: "0 auto", height: "4px", borderRadius: "2px" }}></div>
        </div>
        
        <div style={{ 
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px" 
        }}>
          {[
            { t: "إدارة المواعيد", d: "جدول زمني ذكي يمنع تضارب المواعيد وينظم تدفق المرضى.", i: "📅" },
            { t: "سجل مريض شامل", d: "تاريخ مرضي كامل مع صور الأشعة وحالة كل سن على حدة.", i: "🗂️" },
            { t: "المالية والمصروفات", d: "تتبع الديون، الأرباح، ومصاريف العيادة بدقة متناهية.", i: "💰" },
            { t: "تقارير ذكية", d: "إحصائيات فورية عن أداء العيادة ونموها المالي.", i: "📊" },
            { t: "دعم الأوفلاين", d: "يعمل حتى في حال انقطاع الإنترنت ويقوم بالمزامنة لاحقاً.", i: "🔌" },
            { t: "إدارة الموظفين", d: "صلاحيات خاصة للسكرتارية وإدارة كاملة للفريق.", i: "👥" }
          ].map((f, i) => (
            <div key={i} className="glass-panel" style={{ 
              padding: "32px", borderRadius: "24px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
              transition: "transform 0.3s", cursor: "default"
            }}>
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>{f.i}</div>
              <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "12px", color: "#38bdf8" }}>{f.t}</h3>
              <p style={{ color: "#94a3b8", lineHeight: "1.6" }}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "60px 8% 40px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <p style={{ color: "#64748b", fontSize: "14px" }}>
          &copy; 2026 SmileCare Pro. جميع الحقوق محفوظة. نظام إدارة عيادات الأسنان المتطور.
        </p>
        <div style={{ color: "#38bdf8", fontSize: "10px", marginTop: "10px", opacity: 0.5 }}>
          v1.0.2 - Live Update Active ✨
        </div>
      </footer>
    </div>
  );
}
