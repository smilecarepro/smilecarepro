import sys

with open('frontend/src/pages/SecretaryDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Import
content = content.replace(
    'import DatePicker from "../components/DatePicker";',
    'import DatePicker from "../components/DatePicker";\nimport TeethMap3D from "../components/TeethMap3D";'
)

# 2. Add State
content = content.replace(
    'const [savingPayment, setSavingPayment] = useState(false);',
    'const [savingPayment, setSavingPayment] = useState(false);\n  const [paymentSuccess, setPaymentSuccess] = useState(false);'
)

# 3. Revert Receipt
old_receipt = """          <div class="content">
            ${settings?.receipt_header ? '<div style="text-align: center; margin-bottom: 10px;"><div class="subtitle">ملخص الجلسة والوصل المالي</div></div>' : ''}
            <div class="receipt-box" style="margin-bottom: 10px;">
              <div class="row"><span class="label">التاريخ:</span><span class="val">${receipt.date}</span></div>
              <div class="row"><span class="label">اسم المريض:</span><span class="val">${receipt.patient_name}</span></div>
            </div>

            ${session?.treatments?.length > 0 ? `
            <div class="receipt-box" style="margin-bottom: 10px; padding: 15px;">
              <div style="font-weight: 700; color: #00d2ff; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">🦷 تفاصيل الجلسة الطبية:</div>
              <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 14px;">
                <thead>
                  <tr style="background: #f1f5f9;">
                    <th style="padding: 5px; border-bottom: 1px solid #e5e7eb; color: #666;">السن</th>
                    <th style="padding: 5px; border-bottom: 1px solid #e5e7eb; color: #666;">الإجراء</th>
                    <th style="padding: 5px; border-bottom: 1px solid #e5e7eb; color: #666;">التكلفة</th>
                  </tr>
                </thead>
                <tbody>
                  ${session.treatments.map(tr => `
                    <tr>
                      <td style="padding: 5px; border-bottom: 1px dashed #e5e7eb; font-weight: bold;">${tr.tooth === "General" ? '🌐 عام' : '#' + (tr.tooth_number || tr.tooth)}</td>
                      <td style="padding: 5px; border-bottom: 1px dashed #e5e7eb; font-weight: bold;">${tr.procedure}</td>
                      <td style="padding: 5px; border-bottom: 1px dashed #e5e7eb; font-weight: bold;">${parseFloat(tr.cost || 0).toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}

            <div class="receipt-box">
              <div style="font-weight: 700; color: #00d2ff; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">💰 التفاصيل المالية:</div>"""

new_receipt = """          <div class="content">
            ${settings?.receipt_header ? '<div style="text-align: center; margin-bottom: 10px;"><div class="subtitle">الوصل المالي</div></div>' : ''}
            <div class="receipt-box" style="margin-bottom: 10px;">
              <div class="row"><span class="label">التاريخ:</span><span class="val">${receipt.date}</span></div>
              <div class="row"><span class="label">اسم المريض:</span><span class="val">${receipt.patient_name}</span></div>
            </div>

            <div class="receipt-box">
              <div style="font-weight: 700; color: #00d2ff; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">💰 التفاصيل المالية:</div>"""

content = content.replace(old_receipt, new_receipt)

# 4. Success flow in submitCheckoutPayment
old_submit = """      // Update app state
      setAppointments(prev => prev.map(a => a.id === checkoutApt.id ? {...a, status: "completed"} : a));
      
      // Close modal
      setCheckoutApt(null);
      setCheckoutPatient(null);
      
      // Print
      printReceiptIframe(receipt, checkoutSession);
      
      setSavingPayment(false);
    } catch (err) {"""

new_submit = """      // Update app state
      setAppointments(prev => prev.map(a => a.id === checkoutApt.id ? {...a, status: "completed"} : a));
      
      setCheckoutApt({...checkoutApt, paymentDetails: receipt});
      setPaymentSuccess(true);
      setSavingPayment(false);
    } catch (err) {"""

content = content.replace(old_submit, new_submit)

# 5. Modal Checkout Button
old_checkout_modal_header = """      {checkoutApt && (
        <Modal title={t("تخليص حساب المريض")} onClose={() => {
          setCheckoutApt(null);
          setCheckoutPatient(null);
        }}>
          {loadingSession ? ("""

new_checkout_modal_header = """      {checkoutApt && (
        <Modal title={t("تخليص حساب المريض")} onClose={() => {
          setCheckoutApt(null);
          setCheckoutPatient(null);
          setPaymentSuccess(false);
        }}>
          {loadingSession ? ("""

content = content.replace(old_checkout_modal_header, new_checkout_modal_header)

# 6. Modal Step Update
old_modal_content = """          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Step 1: Review Session & Prescriptions */}
              {checkoutStep === 0 && (
                <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: "var(--primary)" }}>📋 {t("الملخص الطبي للجلسة")}</h3>"""

new_modal_content = """          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {paymentSuccess && checkoutPatient ? (
                <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", padding: 20 }}>
                  <div style={{ fontSize: 50, color: "#10b981", marginBottom: 10 }}>✅</div>
                  <h3 style={{ margin: 0, fontSize: 20, color: "#10b981" }}>{t("تم حفظ الجلسة وتسديد الحساب بنجاح!")}</h3>
                  <div style={{ display: "flex", gap: 16, marginTop: 20, width: "100%", flexDirection: "row" }}>
                    <button 
                      className="btn-primary" 
                      onClick={() => printReceiptIframe(checkoutApt.paymentDetails)}
                      style={{ flex: 1, padding: 15 }}
                    >
                      🖨️ {t("طباعة الوصل المالي")}
                    </button>
                    <button 
                      className="btn-primary" 
                      onClick={() => window.print()}
                      style={{ flex: 1, padding: 15, background: "linear-gradient(135deg, #0ea5e9, #2563eb)" }}
                    >
                      🖨️ {t("طباعة الملخص الطبي")}
                    </button>
                  </div>
                  <button className="btn-secondary" style={{ width: "100%", marginTop: 10 }} onClick={() => {
                    setCheckoutApt(null);
                    setCheckoutPatient(null);
                    setPaymentSuccess(false);
                  }}>
                    {t("إغلاق")}
                  </button>
                </div>
              ) : checkoutStep === 0 ? (
                <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: "var(--primary)" }}>📋 {t("الملخص الطبي للجلسة")}</h3>"""

content = content.replace(old_modal_content, new_modal_content)

# 7. Button text Update
old_btn = """                      {savingPayment ? t("جاري التحصيل...") : `🖨️ ${t("تحصيل وطباعة الملخص والوصل")}`}"""
new_btn = """                      {savingPayment ? t("جاري الحفظ...") : `💳 ${t("حفظ وتسديد الحساب")}`}"""
content = content.replace(old_btn, new_btn)

# 8. Add Printable Session Summary at the very end
printable_div = """
      {/* CSS for print Medical Summary */}
      <style>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden; }
          #printable-session-summary, #printable-session-summary * { visibility: visible; }
          #printable-session-summary { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            background: white !important; 
            padding: 20px !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .no-print { display: none !important; visibility: hidden !important; }
        }
      `}</style>

      {/* Hidden Medical Summary for Print */}
      {paymentSuccess && checkoutPatient && checkoutSession && (
        <div id="printable-session-summary" className="no-print" style={{ background: "white", color: "black", padding: "40px" }}>
          <div style={{ textAlign: "center", borderBottom: "2px solid #3b82f6", paddingBottom: "20px", marginBottom: "30px" }}>
             <h2 style={{ margin: 0, color: "#0f172a" }}>{settings?.clinic_name || 'SmileCare Clinic'}</h2>
             <h3 style={{ margin: "5px 0", color: "#334155" }}>{t("تقرير الجلسة العلاجية")}</h3>
             <div style={{ color: "#64748b" }}>{t("التاريخ")}: {new Date().toLocaleDateString('en-GB')}</div>
          </div>
          <div style={{ display: "flex", gap: "40px", marginBottom: "30px", padding: "15px", background: "#f8fafc", borderRadius: "8px" }}>
            <div><span style={{ color: "#64748b" }}>{t("المريض")}:</span> <strong style={{ fontSize: "16px", marginLeft: "8px" }}>{checkoutPatient.first_name + " " + checkoutPatient.last_name}</strong></div>
            <div><span style={{ color: "#64748b" }}>{t("العمر")}:</span> <strong style={{ fontSize: "16px", marginLeft: "8px" }}>{checkoutPatient.age}</strong></div>
            <div><span style={{ color: "#64748b" }}>{t("الجنس")}:</span> <strong style={{ fontSize: "16px", marginLeft: "8px" }}>{checkoutPatient.gender}</strong></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "18px", color: "#1e293b", marginBottom: "15px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>🦷 {t("الإجراءات المنفذة")}</div>
              {checkoutSession.treatments?.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      <th style={{ padding: "10px", color: "#64748b" }}>{t("السن")}</th>
                      <th style={{ padding: "10px", color: "#64748b" }}>{t("الإجراء الطبي")}</th>
                      <th style={{ padding: "10px", color: "#64748b" }}>{t("التكلفة")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkoutSession.treatments.map((tr, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "12px 10px", fontWeight: "bold", width: "80px" }}>{tr.tooth === "General" ? `🌐 ${t("عام")}` : `#${tr.tooth || tr.tooth_number}`}</td>
                        <td style={{ padding: "12px 10px", color: "#1e293b", fontWeight: 600 }}>{tr.procedure}</td>
                        <td style={{ padding: "12px 10px", color: "#1e293b" }}>{parseFloat(tr.cost || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: "#94a3b8", fontStyle: "italic", padding: "10px" }}>{t("لا توجد إجراءات")}</div>
              )}
            </div>
            <div style={{ display: "flex", gap: "30px", alignItems: "stretch" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "18px", color: "#1e293b", marginBottom: "15px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>🗺️ {t("مخطط الأسنان")}</div>
                <div style={{ position: "relative", width: "100%", height: "250px", background: "#f8fafc", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0", display: "block" }}>
                  <TeethMap3D pid={checkoutPatient.id} data={checkoutPatient.teeth || {}} onChange={() => {}} treatments={checkoutSession.treatments || []} noControls={true} forceFullView={true} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "18px", color: "#1e293b", marginBottom: "15px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>💊 {t("الأدوية الموصوفة")}</div>
                {checkoutSession.prescription?.medications?.length > 0 ? (
                  <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
                    {checkoutSession.prescription.medications.map((m, i) => (
                      <li key={i} style={{ marginBottom: "10px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>{m.name} <span style={{ fontWeight: 400, fontSize: "12px", color: "#64748b" }}>({m.form})</span></div>
                        <div style={{ fontSize: "13px", color: "#334155" }}><strong>{t("الجرعة")}:</strong> {m.dose} | <strong>{t("التكرار")}:</strong> {m.timing} | <strong>{t("المدة")}:</strong> {m.duration}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: "#94a3b8", fontStyle: "italic", padding: "20px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>{t("لم يتم صرف أدوية")}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

content = content.replace("    </div>\n  );\n}", printable_div)

with open('frontend/src/pages/SecretaryDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched successfully")
