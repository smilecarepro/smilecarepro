import React, { useState } from "react";
import DrugManagement from "../components/DrugManagement";
import TemplateManagement from "../components/TemplateManagement";
import { useLanguage } from "../LanguageContext";

export default function DrugStore() {
  const { t } = useLanguage();
  const [tab, setTab] = useState("drugs"); // "drugs" or "templates"
  
  return (
    <div className="animate-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>💊 {t("إدارة الأدوية والقوالب")}</h2>
        
        <div style={{ display: "flex", background: "rgba(0,0,0,0.05)", borderRadius: 8, padding: 4 }}>
          <button 
            onClick={() => setTab("drugs")}
            style={{ padding: "8px 16px", border: "none", borderRadius: 6, background: tab === "drugs" ? "var(--primary)" : "transparent", color: tab === "drugs" ? "white" : "var(--text-color)", fontWeight: 700, cursor: "pointer", transition: "0.2s" }}
          >
            الأدوية
          </button>
          <button 
            onClick={() => setTab("templates")}
            style={{ padding: "8px 16px", border: "none", borderRadius: 6, background: tab === "templates" ? "var(--primary)" : "transparent", color: tab === "templates" ? "white" : "var(--text-color)", fontWeight: 700, cursor: "pointer", transition: "0.2s" }}
          >
            قوالب الوصفات
          </button>
        </div>
      </div>
      
      {tab === "drugs" ? <DrugManagement /> : <TemplateManagement />}
    </div>
  );
}
