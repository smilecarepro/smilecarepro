import re

with open('frontend/src/pages/SecretaryDashboard.jsx', 'r', encoding='utf-8') as f:
    sec_content = f.read()

# SecretaryDashboard.jsx patient submit logic
sec_patient_submit = """
  const handleAddPatientSubmit = async () => {
    if (!patientForm.first_name) return alert(t("يرجى إدخال اسم المريض"));
    
    if (patientForm.total_agreed_price && parseFloat(patientForm.total_agreed_price) % 500 !== 0) {
      return alert(t("⚠️ السعر الكلي يجب أن يكون من مضاعفات الـ 500 دينار عراقي."));
    }
    if (patientForm.initial_payment && parseFloat(patientForm.initial_payment) % 500 !== 0) {
      return alert(t("⚠️ مبلغ الدفعة الأولى يجب أن يكون من مضاعفات الـ 500 دينار عراقي."));
    }

    try {
      const res = await addPatient(patientForm);
      if (res && res.id) {
        const { saveTeeth, addInvoice } = await import("../api");
        await saveTeeth(res.id, {});
        
        if (patientForm.total_agreed_price || patientForm.initial_payment) {
          await addInvoice({
            patient_id: res.id,
            amount: parseFloat(patientForm.total_agreed_price) || 0,
            paid: parseFloat(patientForm.initial_payment) || 0,
            payment_method: patientForm.payment_method || "Cash",
            date: todayStr,
            notes: t("الاتفاق المالي عند التسجيل")
          });
        }
        setShowAddPatient(false);
        setPatientForm({
          first_name: "", last_name: "", phone: "", gender: "Male", age: "", address: "", case_category: "",
          total_agreed_price: "", initial_payment: "", payment_method: "Cash", notes: ""
        });
        window.dispatchEvent(new CustomEvent('show-toast', { 
          detail: { message: t("تمت إضافة المريض بنجاح ✅"), type: "success" } 
        }));
      }
    } catch (e) {
      console.error(e);
      alert(t("حدث خطأ أثناء إضافة المريض"));
    }
  };
"""

sec_content = re.sub(r'const handleAddPatientSubmit = async \(\) => \{.*?(?=  // Submit appointment add)', sec_patient_submit.strip() + '\n\n', sec_content, flags=re.DOTALL)

with open('frontend/src/pages/SecretaryDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(sec_content)

# Patients.jsx patient submit logic
with open('frontend/src/pages/Patients.jsx', 'r', encoding='utf-8') as f:
    pat_content = f.read()

pat_patient_submit = """
  const handleSave = async () => {
    if (!form.first_name) return alert(t("يرجى إدخال اسم المريض"));
    
    if (form.total_agreed_price && parseFloat(form.total_agreed_price) % 500 !== 0) {
      return alert(t("⚠️ السعر الكلي يجب أن يكون من مضاعفات الـ 500 دينار عراقي."));
    }
    if (form.initial_payment && parseFloat(form.initial_payment) % 500 !== 0) {
      return alert(t("⚠️ مبلغ الدفعة الأولى يجب أن يكون من مضاعفات الـ 500 دينار عراقي."));
    }

    setSaving(true);
    try {
      if (editingId) {
        await updatePatient(editingId, form);
      } else {
        const res = await addPatient(form);
        if (res && res.id) {
          // Keep it identical to SecDash
          const { saveTeeth, addInvoice } = await import("../api");
          await saveTeeth(res.id, {});

          if (form.total_agreed_price || form.initial_payment) {
            await addInvoice({
              patient_id: res.id,
              amount: parseFloat(form.total_agreed_price) || 0,
              paid: parseFloat(form.initial_payment) || 0,
              payment_method: form.payment_method || "Cash",
              date: new Date().toISOString().split('T')[0],
              notes: t("الاتفاق المالي عند التسجيل")
            });
          }
        }
      }
      setModal(false);
      setShowAdd(false);
      load();
    } catch(e) {
      console.error(e);
      alert(t("فشل الحفظ"));
    }
    setSaving(false);
  };
"""

pat_content = re.sub(r'const handleSave = async \(\) => \{.*?(?=  const exportExcel)', pat_patient_submit.strip() + '\n\n', pat_content, flags=re.DOTALL)

with open('frontend/src/pages/Patients.jsx', 'w', encoding='utf-8') as f:
    f.write(pat_content)
