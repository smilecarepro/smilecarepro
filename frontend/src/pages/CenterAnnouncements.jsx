import React, { useState, useEffect } from "react";
import { useLanguage } from "../LanguageContext";
import { useAuth } from "../AuthContext";
import { getAnnouncement, updateAnnouncement } from "../api";

export default function CenterAnnouncements() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAnnouncement()
      .then(data => {
        if (data && data.message) setMsg(data.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAnnouncement({ message: msg });
      alert(t("✓ تم تحديث الإعلان بنجاح"));
      // Force refresh for other users would happen via their polling or page reload
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (user?.account_type !== 'center_manager') return <div style={{ padding: 40, textAlign: "center" }}>Unauthorized</div>;

  return (
    <div className="animate-fade">
      <header style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>📢 {t("إدارة إعلانات النظام")}</h2>
        <p style={{ color: "var(--text-dim)" }}>{t("إرسال رسائل وتنبيهات فورية لجميع الأطباء والموظفين في المركز")}</p>
      </header>

      <div className="glass-panel" style={{ padding: 32, maxWidth: 800 }}>
        <h3 style={{ marginBottom: 20, fontSize: 18 }}>{t("محتوى الإعلان الحالي")}</h3>
        
        <textarea 
          className="glass-input"
          style={{ width: "100%", minHeight: 150, padding: 20, fontSize: 16, lineHeight: 1.6, marginBottom: 24 }}
          placeholder={t("اكتب الإعلان هنا... سيظهر في أعلى لوحة تحكم الجميع")}
          value={msg}
          onChange={e => setMsg(e.target.value)}
        />

        <div style={{ background: "var(--panel-bg)", padding: 20, borderRadius: 16, marginBottom: 32, border: "1px dashed var(--glass-border)" }}>
           <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 24 }}>💡</div>
              <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                {t("نصيحة: استخدم الإعلانات لإبلاغ الطاقم بالتحديثات الهامة، الإجازات الرسمية، أو الاجتماعات الطارئة. لإزالة الإعلان، اترك الحقل فارغاً واحفظ.")}
              </div>
           </div>
        </div>

        <button 
          className="btn-primary" 
          style={{ padding: "12px 40px", fontSize: 16 }}
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? t("جاري الحفظ...") : `✨ ${t("نشر الإعلان للجميع")}`}
        </button>
      </div>

      <div style={{ marginTop: 40 }}>
         <h3 style={{ marginBottom: 20, fontSize: 18 }}>{t("كيف سيظهر الإعلان؟")}</h3>
         <div className="glass-panel" style={{ padding: 12, border: "1px solid var(--primary-glow)", background: "rgba(var(--primary-h), 0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 10px" }}>
              <span style={{ fontSize: 20 }}>📢</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{msg || t("لا يوجد إعلان حالي")}</span>
            </div>
         </div>
      </div>
    </div>
  );
}
