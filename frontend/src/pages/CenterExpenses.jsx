import React, { useState, useEffect } from "react";
import { useLanguage } from "../LanguageContext";
import { req } from "../api"; // We'll use req directly or add to api index
import DatePicker from "../components/DatePicker";

export default function CenterExpenses() {
  const { t } = useLanguage();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: "General",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    notes: "",
    payment_method: "Cash"
  });

  const fetchExpenses = async () => {
    try {
      const data = await req("/center/expenses");
      if (data) setExpenses(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchExpenses(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await req("/center/expenses", "POST", newExpense);
      setNewExpense({ category: "General", amount: "", date: new Date().toISOString().split('T')[0], notes: "", payment_method: "Cash" });
      setShowAddForm(false);
      fetchExpenses();
    } catch (e) { alert("Error saving expense"); }
  };

  const categories = ["Rent", "Electricity", "Water", "Salaries", "Maintenance", "Cleaning", "Marketing", "General"];

  return (
    <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>📉 {t("المصاريف العامة للمركز")}</h2>
          <p style={{ color: "var(--text-dim)" }}>{t("تتبع النفقات التشغيلية للمركز الطبي ككل")}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? t("إغلاق") : `+ ${t("إضافة مصروف مركز")}`}
        </button>
      </header>

      {showAddForm && (
        <div className="glass-panel animate-fade" style={{ padding: 24 }}>
          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div>
              <label style={lblStyle}>{t("التصنيف")}</label>
              <select className="glass-input" style={{ width: "100%" }} value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
                {categories.map(c => <option key={c} value={c}>{t(c)}</option>)}
              </select>
            </div>
            <div>
              <label style={lblStyle}>{t("المبلغ")}</label>
              <input type="number" required className="glass-input" style={{ width: "100%" }} value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
            </div>
            <div>
              <label style={lblStyle}>{t("التاريخ")}</label>
              <DatePicker value={newExpense.date} onChange={val => setNewExpense({...newExpense, date: val})} />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label style={lblStyle}>{t("ملاحظات")}</label>
              <input className="glass-input" style={{ width: "100%" }} value={newExpense.notes} onChange={e => setNewExpense({...newExpense, notes: e.target.value})} />
            </div>
            <button type="submit" className="btn-primary" style={{ gridColumn: "span 2" }}>{t("حفظ المصروف")}</button>
          </form>
        </div>
      )}

      <div className="glass-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("التاريخ")}</th>
              <th>{t("التصنيف")}</th>
              <th>{t("المبلغ")}</th>
              <th>{t("طريقة الدفع")}</th>
              <th>{t("ملاحظات")}</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(exp => (
              <tr key={exp.id}>
                <td>{exp.date}</td>
                <td style={{ fontWeight: 700 }}>{t(exp.category)}</td>
                <td style={{ color: "var(--danger)", fontWeight: 800 }}>{exp.amount.toLocaleString()} د</td>
                <td>{t(exp.payment_method)}</td>
                <td style={{ color: "var(--text-dim)", fontSize: 13 }}>{exp.notes}</td>
              </tr>
            ))}
            {expenses.length === 0 && !loading && (
              <tr><td colSpan="5" style={{ textAlign: "center", padding: 40 }}>{t("لا توجد مصاريف مسجلة للمركز")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const lblStyle = { fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block", fontWeight: 600 };
