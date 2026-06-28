import React, { useState, useEffect } from "react";
import { useLanguage } from "../LanguageContext";
import { getAppointments } from "../api";

export default function Messages() {
  const { t, lang } = useLanguage();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAppointments()
      .then(data => {
        // Filter out completed or cancelled appointments, only keep booked/upcoming ones
        const upcoming = data.filter(a => a.status === 'booked' || a.status === 'missed');
        // Sort by date ascending
        upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
        setAppointments(upcoming);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleWhatsApp = (phone) => {
    if (!phone) return alert(t("لا يوجد رقم هاتف"));
    // Format phone number, assuming Iraqi numbers usually start with 07 or +964
    let formatted = phone.trim();
    if (formatted.startsWith('0')) {
      formatted = '+964' + formatted.substring(1);
    }
    window.open(`https://wa.me/${formatted.replace(/\D/g, '')}`, '_blank');
  };

  const handleSMS = (phone) => {
    if (!phone) return alert(t("لا يوجد رقم هاتف"));
    window.open(`sms:${phone.replace(/\D/g, '')}`, '_self');
  };

  return (
    <div className="animate-fade" style={{ padding: 20 }}>
      <div className="glass-panel" style={{ padding: 24, borderRadius: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>📜 {t("جدول المراجعات والمواعيد القادمة")}</h2>
        
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
            <div className="page-loader-spinner" style={{ margin: "0 auto 16px" }} />
            {t("جاري التحميل...")}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="mobile-card-table" style={{ width: "100%", textAlign: lang === "ar" ? "right" : "left", borderCollapse: "collapse" }}>
              <thead style={{ background: "var(--panel-bg)" }}>
                <tr style={{ color: "var(--text-muted)", fontSize: 14 }}>
                  <th style={{ padding: 16, borderBottom: "1px solid var(--glass-border)" }}>#</th>
                  <th style={{ padding: 16, borderBottom: "1px solid var(--glass-border)" }}>{t("أسم المريض")}</th>
                  <th style={{ padding: 16, borderBottom: "1px solid var(--glass-border)" }}>{t("التاريخ والوقت")}</th>
                  <th style={{ padding: 16, borderBottom: "1px solid var(--glass-border)" }}>{t("رقم الهاتف")}</th>
                  <th style={{ padding: 16, borderBottom: "1px solid var(--glass-border)", textAlign: "center" }}>{t("الاجراء")}</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                      📭 {t("لا توجد مواعيد قادمة")}
                    </td>
                  </tr>
                ) : appointments.map((apt, index) => (
                  <tr key={apt.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--panel-bg)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "16px" }}>{index + 1}</td>
                    <td style={{ padding: "16px", fontWeight: 700 }}>{apt.patient_name}</td>
                    <td style={{ padding: "16px", color: "var(--text-muted)" }} dir="ltr">
                      {apt.date} - {apt.time || ""}
                    </td>
                    <td style={{ padding: "16px", color: "var(--text-muted)" }} dir="ltr">{apt.patient_phone || t("غير متوفر")}</td>
                    <td style={{ padding: "16px", display: "flex", gap: 8, justifyContent: "center" }}>
                      <button 
                        onClick={() => handleWhatsApp(apt.patient_phone)}
                        className="btn-ghost" 
                        style={{ background: "rgba(37, 211, 102, 0.1)", color: "#25D366", borderColor: "rgba(37, 211, 102, 0.3)", padding: "8px 16px", fontWeight: 700 }}
                      >
                         تواصل عبر واتساب
                      </button>
                      <button 
                        onClick={() => handleSMS(apt.patient_phone)}
                        className="btn-ghost" 
                        style={{ background: "rgba(0, 210, 255, 0.1)", color: "var(--primary)", borderColor: "rgba(0, 210, 255, 0.3)", padding: "8px 16px", fontWeight: 700 }}
                      >
                         ارسال رسالة SMS
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
