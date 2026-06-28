with open('frontend/src/pages/SecretaryDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix submitCheckoutPayment (don't close modal, set paymentSuccess)
old_submit = '''      // Print Receipt
      printReceiptIframe({
        date: todayStr,
        patient_name: checkoutPatient.first_name + " " + checkoutPatient.last_name,
        prev_debt: prevDebt,
        today_cost: todayCost,
        total_outstanding: totalOutstanding,
        paid: paidAmt,
        remaining: remainingDebt
      }, checkoutSession);

      // Update appointment status to completed in database
      await updateAppointment(checkoutApt.id, { status: "completed" });

      // Hide patient from today list
      const newHidden = [...hiddenIds, checkoutApt.id];
      setHiddenIds(newHidden);
      sessionStorage.setItem('today_hidden_ids', JSON.stringify(newHidden));

      // Close Wizard
      setCheckoutApt(null);
      setCheckoutPatient(null);
      setCheckoutSession(null);
      setPaidToday("");
      setTodayCostInput("");
      loadSchedule();
    } catch (e) {
      console.error(e);
      alert(t("فشل تسجيل الدفعة وإكمال التخليص"));
    } finally {
      setSavingPayment(false);
    }
  };'''

new_submit = '''      // Update appointment status to completed in database
      await updateAppointment(checkoutApt.id, { status: "completed" });

      // Hide patient from today list
      const newHidden = [...hiddenIds, checkoutApt.id];
      setHiddenIds(newHidden);
      sessionStorage.setItem('today_hidden_ids', JSON.stringify(newHidden));

      setCheckoutApt({...checkoutApt, paymentDetails: {
        date: todayStr,
        patient_name: checkoutPatient.first_name + " " + checkoutPatient.last_name,
        prev_debt: prevDebt,
        today_cost: todayCost,
        total_outstanding: totalOutstanding,
        paid: paidAmt,
        remaining: remainingDebt
      }});
      setPaymentSuccess(true);
      setSavingPayment(false);
      loadSchedule();
    } catch (e) {
      console.error(e);
      alert(t("فشل تسجيل الدفعة وإكمال التخليص"));
      setSavingPayment(false);
    }
  };'''

if old_submit in content:
    content = content.replace(old_submit, new_submit)
    print('Fixed submitCheckoutPayment')
else:
    print('Could not find old_submit')

# 2. Inject paymentSuccess UI into the modal
old_modal = '''      {/* ── Checkout Wizard Modal (Finished Patients) ── */}
      {checkoutApt && (
        <Modal title={t("نافذة التخليص والتحصيل المالي الذكي")} onClose={() => setCheckoutApt(null)} width={700}>
          {checkoutLoading ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <div className="page-loader-spinner" style={{ margin: "0 auto 16px" }} />
              {t("جاري تحميل الملخص الجلسة والوصفة الطبية والديون...")}
            </div>
          ) : ('''

new_modal = '''      {/* ── Checkout Wizard Modal (Finished Patients) ── */}
      {checkoutApt && (
        <Modal title={paymentSuccess ? t("✅ تمت العملية بنجاح") : t("نافذة التخليص والتحصيل المالي الذكي")} onClose={() => {
          setCheckoutApt(null);
          setPaymentSuccess(false);
        }} width={700}>
          {checkoutLoading ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <div className="page-loader-spinner" style={{ margin: "0 auto 16px" }} />
              {t("جاري تحميل الملخص الجلسة والوصفة الطبية والديون...")}
            </div>
          ) : paymentSuccess ? (
            <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: 20, textAlign: "center", padding: "20px 0" }}>
              <div style={{ 
                width: 80, height: 80, background: "rgba(16, 185, 129, 0.1)", borderRadius: "50%", 
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto",
                color: "#10b981", fontSize: 40, border: "2px solid rgba(16, 185, 129, 0.3)"
              }}>✓</div>
              <h3 style={{ margin: 0, fontSize: 22, color: "var(--text-light)" }}>{t("تم تسجيل الدفعة وحفظ الجلسة بنجاح!")}</h3>
              <p style={{ color: "var(--text-muted)", margin: 0 }}>{t("ماذا تود أن تطبع الآن؟")}</p>
              
              <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1, padding: "16px", height: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #3b82f6, #2563eb)", border: "none" }}
                  onClick={() => printReceiptIframe(checkoutApt.paymentDetails, checkoutSession)}
                >
                  <span style={{ fontSize: 24 }}>🧾</span>
                  <span>{t("طباعة الوصل المالي")}</span>
                </button>

                <button 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: "16px", height: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, borderColor: "rgba(16, 185, 129, 0.3)", color: "#10b981", background: "rgba(16, 185, 129, 0.05)" }}
                  onClick={() => window.print()}
                >
                  <span style={{ fontSize: 24 }}>📋</span>
                  <span>{t("طباعة الملخص الطبي")}</span>
                </button>
              </div>

              <button 
                className="btn-secondary" 
                style={{ marginTop: 10, width: "100%", padding: "12px", border: "none", background: "rgba(255,255,255,0.05)" }}
                onClick={() => {
                  setCheckoutApt(null);
                  setPaymentSuccess(false);
                }}
              >
                {t("إنهاء وإغلاق")}
              </button>
            </div>
          ) : ('''

if old_modal in content:
    content = content.replace(old_modal, new_modal)
    print('Fixed Modal rendering')
else:
    print('Could not find old_modal')

with open('frontend/src/pages/SecretaryDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
