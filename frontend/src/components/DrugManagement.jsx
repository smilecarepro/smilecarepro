import React, { useState, useEffect, useRef } from "react";
import { getDrugs, addDrug, deleteDrug, updateDrug, toggleFavoriteDrug } from "../api";
import { useLanguage } from "../LanguageContext";
import { useSettings } from "../SettingsContext";
import ConfirmModal from "./ConfirmModal";

const CATEGORIES = [
  "Analgesics",
  "Antibiotics",
  "Anti-inflammatories",
  "Antivirals & Antifungals",
  "Corticosteroids",
  "Others"
];

const PHARMA_FORMS = [
  "Tablets", "Capsules", "Syrup", "Injection", "Drops", "Ointment", "Cream", "Gel", "Suppositories", "Spray", "Patch", "Mouthwash"
];

const TIMINGS = [
  "مرة يومياً",
  "مرتين يومياً",
  "3 مرات يومياً",
  "4 مرات يومياً",
  "كل 8 ساعات",
  "كل 12 ساعة",
  "عند الحاجة"
];

const DURATIONS = [
  "يوم واحد", "يومان", "3 أيام", "4 أيام", "5 أيام", "أسبوع", "10 أيام", "أسبوعان"
];

export default function DrugManagement() {
  const { t } = useLanguage();
  const { getDynamicList } = useSettings();
  
  const dynamicCategories = getDynamicList("med_categories", CATEGORIES);
  const dynamicTimings = getDynamicList("med_frequencies", TIMINGS);
  const dynamicDurations = getDynamicList("med_durations", DURATIONS);
  const dynamicForms = getDynamicList("med_forms", PHARMA_FORMS);
  const dynamicDosages = getDynamicList("med_dosages", []);
  const [drugs, setDrugs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [confirmData, setConfirmData] = useState({ show: false, message: "", onConfirm: null });
  const formRef = useRef(null);
  
  const [newDrug, setNewDrug] = useState({
    name: "", category: "", forms: [], doseValue: "", doses_child: "", doses_adolescent: "", doses_elderly: "", max_daily_dose: "", timing: "", duration: "", meal_timing: "",
    note: "", warn_pregnant: "", warn_breastfeed: "", warn_renal: "", warn_hepatic: "",
    warn_allergy: "", warn_diabetes: "", warn_blood_pressure: "", warn_epilepsy: ""
  });

  const load = async () => {
    try {
      const res = await getDrugs(query);
      setDrugs(res);
    } catch(e) { console.error(e); }
  };


  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [query]);

  const toggleForm = (form) => {
    setNewDrug(prev => {
      const isSelected = prev.forms.includes(form);
      return { ...prev, forms: isSelected ? prev.forms.filter(f => f !== form) : [...prev.forms, form] };
    });
  };

  const [activeList, setActiveList] = useState("favorites"); // favorites or all

  const toggleFav = async (id) => {
    try {
      await toggleFavoriteDrug(id);
      load();
    } catch(e) { console.error(e); }
  };

  const handleSave = async () => {
    if(!newDrug.name) return;
    setLoading(true);
    try {
      const fullDose = newDrug.doseValue ? newDrug.doseValue : "";
      const payload = {
        ...newDrug,
        max_daily_dose: parseFloat(newDrug.max_daily_dose) || 0,
        is_favorite: newDrug.is_favorite ? 1 : 0,
        doses_adult: [fullDose].filter(Boolean),
        doses_child: [newDrug.doses_child].filter(Boolean),
        doses_adolescent: [newDrug.doses_adolescent].filter(Boolean),
        doses_elderly: [newDrug.doses_elderly].filter(Boolean),
        timing: [newDrug.timing].filter(Boolean),
        duration: [newDrug.duration].filter(Boolean),
        meal_timing: newDrug.meal_timing || "",
      };
      
      if (editingId) {
        await updateDrug(editingId, payload);
        setEditingId(null);
      } else {
        await addDrug(payload);
      }
      
      setNewDrug({ 
        name: "", category: "", forms: [], doseValue: "", doses_child: "", doses_adolescent: "", doses_elderly: "", max_daily_dose: "", timing: "", duration: "", meal_timing: "", note: "", 
        warn_pregnant: "", warn_breastfeed: "", warn_renal: "", warn_hepatic: "",
        warn_allergy: "", warn_diabetes: "", warn_blood_pressure: "", warn_epilepsy: "", is_favorite: false
      });
      load();
    } catch(e) { alert(e.message); } finally { setLoading(false); }
  };

  const handleEdit = (d) => {
    setEditingId(d.id);
    setNewDrug({
      name: d.name || "",
      category: d.category || "",
      forms: d.forms || [],
      doseValue: d.doses?.adult?.[0] || "",
      doses_child: d.doses?.child?.[0] || "",
      doses_adolescent: d.doses?.adolescent?.[0] || "",
      doses_elderly: d.doses?.elderly?.[0] || "",
      max_daily_dose: d.max_daily_dose || "",
      is_favorite: d.is_favorite || false,
      timing: d.timing?.[0] || "",
      duration: d.duration?.[0] || "",
      meal_timing: d.meal_timing || "",
      note: d.note || "",
      warn_pregnant: d.warnings?.pregnant || "",
      warn_breastfeed: d.warnings?.breastfeed || "",
      warn_renal: d.warnings?.renal || "",
      warn_hepatic: d.warnings?.hepatic || "",
      warn_allergy: d.warnings?.allergy || "",
      warn_diabetes: d.warnings?.diabetes || "",
      warn_blood_pressure: d.warnings?.blood_pressure || "",
      warn_epilepsy: d.warnings?.epilepsy || ""
    });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewDrug({ 
      name: "", category: "", forms: [], doseValue: "", doses_child: "", doses_adolescent: "", doses_elderly: "", max_daily_dose: "", timing: "", duration: "", meal_timing: "", note: "", 
      warn_pregnant: "", warn_breastfeed: "", warn_renal: "", warn_hepatic: "",
      warn_allergy: "", warn_diabetes: "", warn_blood_pressure: "", warn_epilepsy: "", is_favorite: false
    });
  };

  const handleRemove = (id) => {
    setConfirmData({
      show: true,
      message: t("هل أنت متأكد من حذف هذا الدواء؟"),
      onConfirm: async () => {
        setConfirmData({ show: false });
        await deleteDrug(id);
        load();
      }
    });
  };

  const filteredDrugs = drugs.filter(d => {
    const matchCat = filterCategory === "" || d.category === filterCategory;
    if (activeList === "favorites") return d.is_favorite && matchCat;
    return matchCat;
  });

  return (
    <div className="animate-fade" style={{ direction: "ltr", textAlign: "left" }} ref={formRef}>
      <div className="glass-panel" style={{ padding: 0, marginBottom: 32, overflow: "hidden", border: editingId ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ background: editingId ? "var(--primary)" : "var(--panel-bg)", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: editingId ? "white" : "inherit" }}>
            {editingId ? t("تعديل بيانات الدواء") : t("إضافة دواء جديد للقاعدة")}
          </h3>
          {!editingId && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--text-muted)", fontSize: 13 }}>
              <input type="checkbox" checked={newDrug.is_favorite} onChange={e => setNewDrug({...newDrug, is_favorite: e.target.checked})} />
              ⭐ {t("إضافة للمفضلة مباشرة")}
            </label>
          )}
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20, marginBottom: 24 }}>
            <div>
              <label style={lblStyle}>{t("اسم الدواء")} *</label>
              <input className="glass-input" style={{ width: "100%" }} value={newDrug.name} onChange={e => setNewDrug({...newDrug, name: e.target.value})} placeholder="Amoxicillin..." />
            </div>
            <div>
              <label style={lblStyle}>{t("التصنيف")}</label>
              <select className="glass-input" style={{ width: "100%", padding: 10 }} value={newDrug.category} onChange={e => setNewDrug({...newDrug, category: e.target.value})}>
                <option value="">{t("اختر التصنيف...")}</option>
                {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ ...lblStyle, marginBottom: 12 }}>{t("الأشكال الصيدلانية")}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {dynamicForms.map(form => (
                <button key={form} onClick={() => toggleForm(form)} style={{
                    padding: "8px 16px", borderRadius: "12px", fontSize: 13, cursor: "pointer", border: "1px solid", transition: "all 0.2s",
                    borderColor: newDrug.forms.includes(form) ? "var(--primary)" : "var(--panel-bg-hover)",
                    background: newDrug.forms.includes(form) ? "var(--primary)" : "var(--panel-bg)",
                    color: newDrug.forms.includes(form) ? "white" : "var(--text-muted)",
                  }}> {form} </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 32, padding: 20, background: "var(--panel-bg)", borderRadius: 16 }}>
            <div>
              <label style={lblStyle}>{t("الجرعة القياسية للبالغين (17-65)")}</label>
              <div style={{ display: "flex", alignItems: "center" }}>
                <input list="dosages-list" type="text" className="glass-input" style={{ width: "100%" }} value={newDrug.doseValue} onChange={e => setNewDrug({...newDrug, doseValue: e.target.value})} placeholder={t("اختر أو اكتب الجرعة...")} />
              </div>
            </div>
            <div>
              <label style={lblStyle}>{t("جرعة الأطفال (0-12)")}</label>
              <div style={{ display: "flex", alignItems: "center" }}>
                <input list="dosages-list" type="text" className="glass-input" style={{ width: "100%" }} value={newDrug.doses_child} onChange={e => setNewDrug({...newDrug, doses_child: e.target.value})} placeholder={t("اختياري...")} />
              </div>
            </div>
            <div>
              <label style={lblStyle}>{t("جرعة اليافعين (12-16)")}</label>
              <div style={{ display: "flex", alignItems: "center" }}>
                <input list="dosages-list" type="text" className="glass-input" style={{ width: "100%" }} value={newDrug.doses_adolescent} onChange={e => setNewDrug({...newDrug, doses_adolescent: e.target.value})} placeholder={t("اختياري...")} />
              </div>
            </div>
            <div>
              <label style={lblStyle}>{t("جرعة كبار السن (فوق 65)")}</label>
              <div style={{ display: "flex", alignItems: "center" }}>
                <input list="dosages-list" type="text" className="glass-input" style={{ width: "100%" }} value={newDrug.doses_elderly} onChange={e => setNewDrug({...newDrug, doses_elderly: e.target.value})} placeholder={t("اختياري...")} />
                <datalist id="dosages-list">
                  {dynamicDosages.map(d => <option key={d} value={d} />)}
                </datalist>
              </div>
            </div>
            <div>
              <label style={lblStyle}>{t("التكرار")}</label>
              <select className="glass-input" style={{ width: "100%", padding: 10 }} value={newDrug.timing} onChange={e => setNewDrug({...newDrug, timing: e.target.value})}>
                <option value="">{t("اختر...")}</option>
                {dynamicTimings.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lblStyle}>{t("المدة")}</label>
              <select className="glass-input" style={{ width: "100%", padding: 10 }} value={newDrug.duration} onChange={e => setNewDrug({...newDrug, duration: e.target.value})}>
                <option value="">{t("اختر...")}</option>
                {dynamicDurations.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={lblStyle}>{t("توقيت الدواء (مع الطعام)")}</label>
              <select className="glass-input" style={{ width: "100%", padding: 10 }} value={newDrug.meal_timing} onChange={e => setNewDrug({...newDrug, meal_timing: e.target.value})}>
                <option value="">{t("لا يهم")}</option>
                <option value="قبل الأكل">قبل الأكل</option>
                <option value="بعد الأكل">بعد الأكل</option>
                <option value="مع الأكل">مع الأكل</option>
              </select>
            </div>
            <div>
              <label style={lblStyle}>{t("الجرعة اليومية القصوى (ملغ)")}</label>
              <input type="number" className="glass-input" style={{ width: "100%" }} value={newDrug.max_daily_dose} onChange={e => setNewDrug({...newDrug, max_daily_dose: e.target.value})} placeholder="4000" />
            </div>
            <div>
              <label style={lblStyle}>{t("الملاحظات والآثار الجانبية")}</label>
              <input type="text" className="glass-input" style={{ width: "100%" }} value={newDrug.note} onChange={e => setNewDrug({...newDrug, note: e.target.value})} placeholder={t("اكتب أي ملاحظات إضافية...")} />
            </div>
          </div>

          <div style={{ border: "1px solid rgba(239,68,68,0.2)", borderRadius: 16, padding: 20, background: "rgba(239,68,68,0.02)" }}>
            <h4 style={{ fontSize: 14, marginTop: 0, marginBottom: 20, color: "#ef4444" }}>⚠️ {t("تحذيرات وحالات خاصة")}</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {[
                { key: "warn_pregnant", label: "الحمل" },
                { key: "warn_breastfeed", label: "الرضاعة" },
                { key: "warn_renal", label: "مرضى الكلى" },
                { key: "warn_hepatic", label: "مرضى الكبد" },
                { key: "warn_allergy", label: "الحساسية" },
                { key: "warn_diabetes", label: "السكري" },
                { key: "warn_blood_pressure", label: "ضغط الدم" },
                { key: "warn_epilepsy", label: "صرع" }
              ].map(w => (
                <div key={w.key}>
                  <label style={warnLblStyle}>{w.label}</label>
                  <input className="glass-input warn-input" value={newDrug[w.key]} onChange={e => setNewDrug({...newDrug, [w.key]: e.target.value})} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
            <button className="btn-primary" onClick={handleSave} disabled={loading || !newDrug.name} style={{ padding: "12px 40px", fontSize: 16 }}>
              {loading ? t("جاري الحفظ...") : editingId ? t("تحديث") : t("حفظ")}
            </button>
            {editingId && <button className="btn-secondary" onClick={cancelEdit} style={{ padding: "12px 24px" }}> {t("إلغاء")} </button>}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button 
            onClick={() => setActiveList("favorites")}
            className={activeList === "favorites" ? "btn-primary" : "btn-ghost"}
            style={{ padding: "10px 24px", borderRadius: 12 }}
          > ⭐ {t("المفضلة")} </button>
          <button 
            onClick={() => setActiveList("all")}
            className={activeList === "all" ? "btn-primary" : "btn-ghost"}
            style={{ padding: "10px 24px", borderRadius: 12 }}
          > 📦 {t("كافة الأدوية")} </button>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <select className="glass-input" style={{ width: 180 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">{t("كافة التصنيفات")}</option>
            {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="glass-input" style={{ width: 200 }} placeholder={t("بحث...")} value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
              <th style={{ padding: 12, color: "var(--text-muted)", fontSize: 12 }}>{t("الحالة")}</th>
              <th style={{ padding: 12, color: "var(--text-muted)", fontSize: 12 }}>{t("الاسم والتصنيف")}</th>
              <th style={{ padding: 12, color: "var(--text-muted)", fontSize: 12 }}>{t("الجرعة والنمط")}</th>
              <th style={{ padding: 12, color: "var(--text-muted)", fontSize: 12 }}>{t("الإجراءات")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrugs.map(d => (
              <tr key={d.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                <td style={{ padding: 12 }}>
                  <button onClick={() => toggleFav(d.id)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>
                    {d.is_favorite ? "⭐" : "☆"}
                  </button>
                </td>
                <td style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.category || "—"}</div>
                </td>
                <td style={{ padding: 12, fontSize: 12 }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                    {(d.forms || []).map(f => <span key={f} style={{background: "var(--panel-bg-hover)", padding: "2px 6px", borderRadius: 4}}>{f}</span>)}
                  </div>
                  <div style={{ color: "var(--primary)", fontWeight: "bold" }}>{d.doses?.adult?.[0]}</div>
                </td>
                <td style={{ padding: 12, width: 160 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleEdit(d)} className="btn-ghost" style={{ color: "var(--primary)", padding: "4px 12px", border: "1px solid var(--glass-border)", fontSize: 12 }}>{t("تعديل")}</button>
                    <button onClick={() => handleRemove(d.id)} className="btn-ghost" style={{ color: "#ef4444", padding: "4px 12px", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12 }}>{t("حذف")}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredDrugs.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            {activeList === "favorites" ? t("لا توجد أدوية مفضلة بعد. يمكنك إضافة أدوية من القائمة الشاملة.") : t("لا توجد أدوية مطابقة للبحث.")}
          </div>
        )}
      </div>

      <ConfirmModal 
        show={confirmData.show} 
        title={t("تأكيد الحذف")} 
        message={confirmData.message} 
        danger={true}
        onConfirm={confirmData.onConfirm} 
        onCancel={() => setConfirmData({ ...confirmData, show: false })} 
      />
    </div>
  );
}

const lblStyle = { fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block", fontWeight: 600 };
const warnLblStyle = { fontSize: 11, color: "#991b1b", marginBottom: 4, display: "block", fontWeight: 700 };
