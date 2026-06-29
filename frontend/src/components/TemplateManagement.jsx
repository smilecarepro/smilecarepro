import React, { useState, useEffect } from "react";
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, getDrugs } from "../api";
import { useLanguage } from "../LanguageContext";
import { useSettings } from "../SettingsContext";
import DrugAdder from "./DrugAdder";

export default function TemplateManagement() {
  const { t } = useLanguage();
  const { getDynamicList } = useSettings();
  const [templates, setTemplates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  
  // Builder state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prescriptionDrugs, setPrescriptionDrugs] = useState([]); // This stores the current drugs in the template

  const load = async () => {
    try {
      const data = await getTemplates();
      setTemplates(data || []);
    } catch(e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const handleAddDrug = (drugList) => {
    // Similar to how PrescriptionModal works, append drugs
    const newDrugs = Array.isArray(drugList) ? drugList : [drugList];
    setPrescriptionDrugs(prev => [...prev, ...newDrugs]);
  };

  const removeDrug = (index) => {
    setPrescriptionDrugs(prev => prev.filter((_, i) => i !== index));
  };

  const updateDrug = (index, field, value) => {
    setPrescriptionDrugs(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const handleSave = async () => {
    if (!name.trim()) return alert("الرجاء كتابة اسم القالب");
    if (prescriptionDrugs.length === 0) return alert("لا يمكن حفظ قالب فارغ");

    const payload = {
      name,
      description,
      drugs_json: JSON.stringify(prescriptionDrugs)
    };

    try {
      if (editingId) {
        await updateTemplate(editingId, payload);
      } else {
        await createTemplate(payload);
      }
      setName("");
      setDescription("");
      setPrescriptionDrugs([]);
      setEditingId(null);
      load();
    } catch(e) {
      console.error(e);
      alert("حدث خطأ أثناء حفظ القالب");
    }
  };

  const handleEdit = (tmpl) => {
    setEditingId(tmpl.id);
    setName(tmpl.name);
    setDescription(tmpl.description || "");
    try {
      setPrescriptionDrugs(JSON.parse(tmpl.drugs_json || "[]"));
    } catch(e) { setPrescriptionDrugs([]); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if(!window.confirm("هل أنت متأكد من حذف هذا القالب؟")) return;
    try {
      await deleteTemplate(id);
      load();
    } catch(e) { console.error(e); }
  };

  const rxSelectStyle = { 
    background: "transparent", border: "none", color: "var(--primary)", 
    fontWeight: 700, fontSize: 13, cursor: "pointer", padding: "0", margin: "0", 
    outline: "none", WebkitAppearance: "none", MozAppearance: "none", appearance: "none" 
  };

  return (
    <div className="animate-fade" style={{ direction: "rtl", textAlign: "right" }}>
      
      {/* Template Builder */}
      <div className="glass-panel" style={{ padding: 0, marginBottom: 32, overflow: "hidden", border: editingId ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ background: editingId ? "var(--primary)" : "var(--panel-bg)", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: editingId ? "white" : "inherit" }}>
            {editingId ? "تعديل القالب" : "إنشاء قالب جديد"}
          </h3>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20, marginBottom: 24 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>اسم القالب *</label>
              <input className="glass-input" style={{ width: "100%" }} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: قالب قلع جراحي" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>وصف (اختياري)</label>
              <input className="glass-input" style={{ width: "100%" }} value={description} onChange={e => setDescription(e.target.value)} placeholder="مثال: لحالات القلع الجراحي للبالغين" />
            </div>
          </div>

          <div style={{ padding: 16, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12, background: "rgba(0,0,0,0.02)", marginBottom: 24 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>الأدوية في هذا القالب</h4>
            
            {prescriptionDrugs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: 13 }}>لا توجد أدوية في القالب. استخدم البحث أدناه لإضافة الأدوية.</div>
            ) : (
              <ul style={{ listStyleType: "none", paddingLeft: 0, margin: 0 }}>
                {prescriptionDrugs.map((d, i) => (
                  <li key={i} style={{ marginBottom: 12, fontSize: 14, position: "relative", padding: "10px 12px", borderRadius: 8, background: "var(--bg-color)", border: "1px solid rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                          {i + 1}. {d.name} <span style={{ fontWeight: 400, fontSize: 12, color: "var(--text-muted)", marginLeft: 6 }}>({d.form})</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>الجرعة:</span>
                            <select value={d.dose} onChange={e => updateDrug(i, "dose", e.target.value)} style={rxSelectStyle}>
                              {(d.doseOptions || [d.dose]).map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                          <span style={{ color: "rgba(0,0,0,0.1)" }}>·</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>التكرار:</span>
                            <select value={d.timing} onChange={e => updateDrug(i, "timing", e.target.value)} style={rxSelectStyle}>
                              {getDynamicList('med_frequencies', ["Once daily", "Twice daily", "Three times daily"]).map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                          <span style={{ color: "rgba(0,0,0,0.1)" }}>·</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>المدة:</span>
                            <select value={d.duration} onChange={e => updateDrug(i, "duration", e.target.value)} style={rxSelectStyle}>
                              {getDynamicList('med_durations', ["1 day", "2 days", "3 days", "5 days"]).map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 8 }}>
                           {d.meal_timing && d.meal_timing !== "لا يهم" && (
                             <div style={{ fontSize: 12, color: "#eab308", fontWeight: "bold" }}>التوقيت: {d.meal_timing}</div>
                           )}
                           {d.note && (
                             <div style={{ fontSize: 12, color: "#64748b", fontStyle: "italic" }}>ملاحظة: {d.note}</div>
                           )}
                         </div>
                      </div>
                      <button onClick={() => removeDrug(i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DrugAdder patient={{ age: 30, gender: "Male", systemic_conditions: "" }} onAdd={handleAddDrug} />

          <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "flex-end" }}>
            {editingId && (
              <button className="btn-secondary" onClick={() => { setEditingId(null); setName(""); setDescription(""); setPrescriptionDrugs([]); }}>إلغاء</button>
            )}
            <button className="btn-primary" onClick={handleSave} style={{ minWidth: 150 }}>
              {editingId ? "حفظ التعديلات" : "حفظ كقالب"}
            </button>
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px 0" }}>القوالب المحفوظة ({templates.length})</h3>
        
        {templates.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>لا توجد قوالب محفوظة بعد.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {templates.map(tmpl => {
              const drugs = JSON.parse(tmpl.drugs_json || "[]");
              return (
                <div key={tmpl.id} style={{ padding: 16, borderRadius: 12, border: "1px solid rgba(0,0,0,0.05)", background: "var(--bg-color)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{tmpl.name}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleEdit(tmpl)} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: 14 }}>✏️</button>
                      <button onClick={() => handleDelete(tmpl.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14 }}>🗑️</button>
                    </div>
                  </div>
                  {tmpl.description && <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>{tmpl.description}</div>}
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>الأدوية ({drugs.length}):</div>
                  <ul style={{ padding: 0, margin: 0, listStylePosition: "inside", fontSize: 13 }}>
                    {drugs.map((d, i) => (
                      <li key={i}>{d.name} <span style={{ color: "var(--text-muted)" }}>({d.dose})</span></li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
