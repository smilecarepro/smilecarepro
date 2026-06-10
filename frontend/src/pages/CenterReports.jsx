import React, { useState, useEffect } from "react";
import { useLanguage } from "../LanguageContext";
import { getCenterFinancialReport } from "../api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function CenterReports() {
  const { t } = useLanguage();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState({
    start_date: new Date(new Date().setDate(1)).toISOString().split('T')[0], // Start of month
    end_date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getCenterFinancialReport(dates);
      setReport(data);
    } catch (error) {
      console.error("Error fetching financial report:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !report) return <div style={{ padding: 40, textAlign: "center" }}>{t("جاري تحميل التقارير المالية...")}</div>;

  const COLORS = ['#185FA5', '#00D2FF', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const chartData = report?.doctors_breakdown?.map(d => ({
    name: d.doctor_name,
    "إيرادات العيادة": d.revenue,
    "عمولة المركز": d.commission_amount
  })) || [];

  const pieData = report?.doctors_breakdown?.map(d => ({
    name: d.doctor_name,
    value: d.commission_amount
  })).filter(d => d.value > 0) || [];

  return (
    <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 30, paddingBottom: 40 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>💰 {t("التقارير المالية والعمولات")}</h2>
          <p style={{ color: "var(--text-dim)" }}>{t("إدارة وتحليل الإيرادات والعمولات وصافي الأرباح")}</p>
        </div>
        
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
             <label style={{ fontSize: 10, color: "var(--text-dim)" }}>{t("من")}</label>
             <input 
               type="date" 
               className="glass-input" 
               value={dates.start_date}
               onChange={e => setDates({...dates, start_date: e.target.value})}
               style={{ padding: "8px 12px", fontSize: 12 }}
             />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
             <label style={{ fontSize: 10, color: "var(--text-dim)" }}>{t("إلى")}</label>
             <input 
               type="date" 
               className="glass-input" 
               value={dates.end_date}
               onChange={e => setDates({...dates, end_date: e.target.value})}
               style={{ padding: "8px 12px", fontSize: 12 }}
             />
          </div>
          <button className="btn-primary" onClick={fetchData} style={{ padding: "10px 20px", marginTop: 14 }}>
            🔄 {t("تحديث")}
          </button>
        </div>
      </header>

      {/* Financial Summary */}
      {report && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
          <div className="glass-panel" style={{ padding: 24, borderTop: "4px solid var(--primary)" }}>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 8 }}>{t("إجمالي إيرادات العيادات")}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "white" }}>{report.summary.total_revenue.toLocaleString()} <span style={{ fontSize: 14 }}>د</span></div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>{t("إجمالي ما تم تحصيله في كل الفروع")}</div>
          </div>
          
          <div className="glass-panel" style={{ padding: 24, borderTop: "4px solid #10b981" }}>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 8 }}>{t("إجمالي عمولات المركز")}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#10b981" }}>{report.summary.total_commission.toLocaleString()} <span style={{ fontSize: 14 }}>د</span></div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>{t("إجمالي حصة المركز قبل المصاريف")}</div>
          </div>

          <div className="glass-panel" style={{ padding: 24, borderTop: "4px solid #ef4444" }}>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 8 }}>{t("مصاريف المركز العامة")}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#ef4444" }}>{report.summary.total_expenses.toLocaleString()} <span style={{ fontSize: 14 }}>د</span></div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>{t("المصاريف الإدارية والتشغيلية للمركز")}</div>
          </div>

          <div className="glass-panel shadow-primary" style={{ padding: 24, background: "linear-gradient(135deg, rgba(24, 95, 165, 0.2), rgba(0, 210, 255, 0.1))", border: "1px solid var(--primary)" }}>
            <div style={{ fontSize: 13, color: "var(--primary-glow)", marginBottom: 8, fontWeight: 700 }}>{t("صافي ربح المركز")}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "white" }}>{report.summary.net_profit.toLocaleString()} <span style={{ fontSize: 14 }}>د</span></div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>{t("الربح الصافي بعد خصم كافة التكاليف")}</div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: 24 }}>
        <div className="glass-panel" style={{ padding: 24, minHeight: 400 }}>
          <h3 style={{ marginBottom: 24, fontSize: 18, fontWeight: 800 }}>📊 {t("مقارنة الأداء بين العيادات")}</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={12} />
                <YAxis stroke="var(--text-dim)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', borderRadius: 12 }}
                  itemStyle={{ fontSize: 12 }}
                />
                <Legend />
                <Bar dataKey="إيرادات العيادة" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="عمولة المركز" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 24, minHeight: 400 }}>
          <h3 style={{ marginBottom: 24, fontSize: 18, fontWeight: 800 }}>🥧 {t("مصادر العمولات (حسب الطبيب)")}</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', borderRadius: 12 }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown Table */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>📋 {t("تفاصيل عمولات الأطباء")}</h3>
          <button className="btn-secondary" style={{ fontSize: 12 }}>📥 {t("تصدير التقرير")}</button>
        </div>
        
        <div className="custom-scrollbar" style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("الطبيب")}</th>
                <th>{t("العيادة")}</th>
                <th style={{ textAlign: "center" }}>{t("نسبة العمولة")}</th>
                <th style={{ textAlign: "right" }}>{t("إيرادات الطبيب")}</th>
                <th style={{ textAlign: "right" }}>{t("حصة المركز")}</th>
                <th style={{ textAlign: "center" }}>{t("المواعيد")}</th>
              </tr>
            </thead>
            <tbody>
              {report?.doctors_breakdown?.map(doc => (
                <tr key={doc.id}>
                  <td style={{ fontWeight: 800 }}>{doc.doctor_name}</td>
                  <td style={{ color: "var(--text-dim)" }}>{doc.clinic_name}</td>
                  <td style={{ textAlign: "center" }}>
                     <span style={{ padding: "4px 8px", background: "rgba(24, 95, 165, 0.1)", borderRadius: 8, color: "var(--primary-glow)", fontWeight: 700 }}>
                        %{doc.commission_rate}
                     </span>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{doc.revenue.toLocaleString()} د</td>
                  <td style={{ textAlign: "right", color: "#10b981", fontWeight: 800 }}>{doc.commission_amount.toLocaleString()} د</td>
                  <td style={{ textAlign: "center" }}>{doc.appointments_count}</td>
                </tr>
              ))}
              {(!report || report.doctors_breakdown.length === 0) && (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: 40, color: "var(--text-dim)" }}>
                    {t("لا توجد بيانات مالية متوفرة للفترة المختارة")}
                  </td>
                </tr>
              )}
            </tbody>
            {report && report.doctors_breakdown.length > 0 && (
              <tfoot style={{ borderTop: "2px solid var(--glass-border)" }}>
                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                  <td colSpan="3" style={{ fontWeight: 800, textAlign: "left" }}>{t("الإجمالي المجمع")}</td>
                  <td style={{ textAlign: "right", fontWeight: 900, color: "white" }}>{report.summary.total_revenue.toLocaleString()} د</td>
                  <td style={{ textAlign: "right", fontWeight: 900, color: "#10b981" }}>{report.summary.total_commission.toLocaleString()} د</td>
                  <td style={{ textAlign: "center", fontWeight: 900 }}>
                    {report.doctors_breakdown.reduce((sum, d) => sum + d.appointments_count, 0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
