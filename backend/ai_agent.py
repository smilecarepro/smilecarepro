import google.generativeai as genai
import os
import requests
import json
import re
from database import get_db, get_master_db
from datetime import datetime, timedelta

print("--- SYSTEM: AI AGENT VERSION 4.0 (STATEFUL) LOADED ---")

class ClinicAIAgent:
    def __init__(self, clinic_username):
        self.clinic_username = clinic_username
        self.api_key = self._get_setting("gemini_api_key")
        self.clinic_info = self._get_clinic_info()

    def _get_setting(self, key):
        try:
            conn = get_db(self.clinic_username)
            row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
            conn.close()
            return row['value'] if row else None
        except: return None

    def _get_clinic_info(self):
        try:
            master_conn = get_master_db()
            row = master_conn.execute("SELECT clinic_name, doctor_name, phone FROM doctors WHERE username = ?", (self.clinic_username,)).fetchone()
            master_conn.close()
            return dict(row) if row else {"clinic_name": "العيادة", "doctor_name": "الدكتور", "phone": ""}
        except: return {"clinic_name": "العيادة", "doctor_name": "الدكتور", "phone": ""}

    def _get_session(self, phone):
        conn = get_db(self.clinic_username)
        row = conn.execute("SELECT current_state, collected_data FROM whatsapp_sessions WHERE phone_number = ?", (phone,)).fetchone()
        conn.close()
        if row:
            return row['current_state'], json.loads(row['collected_data'])
        return "START", {}

    def _update_session(self, phone, state, data):
        conn = get_db(self.clinic_username)
        conn.execute("INSERT OR REPLACE INTO whatsapp_sessions (phone_number, current_state, collected_data, last_interaction) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                     (phone, state, json.dumps(data)))
        conn.commit()
        conn.close()

    def _clear_session(self, phone):
        conn = get_db(self.clinic_username)
        conn.execute("DELETE FROM whatsapp_sessions WHERE phone_number = ?", (phone,))
        conn.commit()
        conn.close()

    def _validate_text(self, text, max_len=50):
        # منع العلامات الخاصة
        if re.search(r"[^\w\s\u0621-\u064A\d]", text):
            return False, "عذراً، يرجى إعادة الكتابة بدون استخدام رموز أو علامات خاصة."
        # منع تخطي الطول
        if len(text) > max_len:
            return False, f"عذراً، النص طويل جداً (الحد الأقصى {max_len} حرف)."
        return True, ""

    def _get_available_days(self):
        days_ar = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]
        available = []
        now = datetime.now()
        
        conn = get_db(self.clinic_username)
        for i in range(10):
            target_date = now + timedelta(days=i)
            date_str = target_date.strftime("%Y-%m-%d")
            # التحقق من وجود شاغر (بسيط: أقل من 20 موعد في اليوم مثلاً)
            count = conn.execute("SELECT COUNT(*) as count FROM appointments WHERE date = ?", (date_str,)).fetchone()['count']
            if count < 20:
                day_name = days_ar[target_date.weekday()]
                available.append(f"{len(available)+1}- يوم {day_name} تاريخ {target_date.strftime('%d/%m/%Y')}")
        conn.close()
        return available

    def generate_response(self, phone, message):
        state, data = self._get_session(phone)
        message = message.strip()

        # القائمة الرئيسية
        main_menu = (
            f"أهلاً بك في عيادة {self.clinic_info['clinic_name']} 🦷\n"
            "كيف يمكننا مساعدتك اليوم؟\n\n"
            "1- حجز موعد\n"
            "2- تعديل وإلغاء الموعد\n"
            "3- وسائل التواصل الاجتماعي\n"
            "4- الاستفسارات\n"
            "5- من نحن\n"
            "6- موقع العيادة"
        )

        # إذا كانت الرسالة "خروج" أو "قائمة" نعود للبداية
        if message in ["0", "خروج", "قائمة", "menu"]:
            self._clear_session(phone)
            return main_menu

        # الحالة الابتدائية: أي رسالة تظهر القائمة
        if state == "START":
            self._update_session(phone, "AWAITING_MENU", {})
            return main_menu

        # معالجة اختيار القائمة
        if state == "AWAITING_MENU":
            if message == "1":
                self._update_session(phone, "BOOKING_TYPE", {})
                return "حجز موعد جديد:\n\n1- هل هذا أول موعد لك؟\n2- زرت العيادة مسبقاً"
            elif message == "2":
                return "يرجى التواصل مع العيادة مباشرة لتعديل أو إلغاء موعدك عبر الرقم: " + self.clinic_info['phone']
            elif message == "3":
                return "تفضل بزيارة صفحاتنا:\nFacebook: [رابط]\nInstagram: [رابط]\nSnapchat: [رابط]"
            elif message == "4":
                self._update_session(phone, "INQUIRY", {})
                return "تفضل بطرح استفسارك الطبي وسيجيبك الذكاء الاصطناعي فوراً:"
            elif message == "5":
                return f"عيادة {self.clinic_info['clinic_name']} تحت إشراف {self.clinic_info['doctor_name']}. نقدم أفضل خدمات تجميل وعلاج الأسنان بأحدث التقنيات."
            elif message == "6":
                return "موقع العيادة:\n[رابط Google Maps]\nالعنوان: [اكتب العنوان هنا]"
            else:
                return "يرجى اختيار رقم من 1 إلى 6، أو اكتب 'قائمة' للعودة."

        # معالجة مسار الحجز - نوع الزيارة
        if state == "BOOKING_TYPE":
            if message in ["1", "2"]:
                data['is_new'] = (message == "1")
                self._update_session(phone, "ASK_NAME", data)
                return "يرجى كتابة اسمك الثلاثي (بدون رموز، بحد أقصى 50 حرف):"
            return "يرجى اختيار 1 أو 2."

        # معالجة طلب الاسم
        if state == "ASK_NAME":
            valid, err = self._validate_text(message, 50)
            if not valid: return err
            
            data['patient_name'] = message
            self._update_session(phone, "ASK_PHONE", data)
            return "شكراً. يرجى إرسال رقم هاتفك (أرقام فقط، بحد أقصى 12 رقم):"

        # معالجة طلب الهاتف
        if state == "ASK_PHONE":
            # تنظيف الرقم من أي شيء غير الأرقام
            clean_phone = re.sub(r"\D", "", message)
            if len(clean_phone) > 12 or len(clean_phone) < 8:
                return "عذراً، يرجى إرسال رقم هاتف صحيح (أرقام فقط، بحد أقصى 12 رقم)."
            
            data['patient_phone'] = clean_phone
            
            # تنفيذ منطق إضافة مريض جديد أو البحث عن قديم
            conn = get_db(self.clinic_username)
            patient_id = None
            is_potential_match = False

            if data['is_new']:
                # إضافة مريض جديد فوراً
                name_parts = data['patient_name'].split(" ", 1)
                f_name = name_parts[0]
                l_name = name_parts[1] if len(name_parts) > 1 else ""
                
                cursor = conn.execute(
                    "INSERT INTO patients (first_name, last_name, phone, notes) VALUES (?, ?, ?, ?)",
                    (f_name, l_name, clean_phone, "تمت الإضافة عبر الواتساب - أول زيارة")
                )
                patient_id = cursor.lastrowid
            else:
                # بحث تقريبي للمريض السابق
                match = conn.execute("SELECT id FROM patients WHERE first_name || ' ' || last_name LIKE ?", (f"%{data['patient_name']}%",)).fetchone()
                if match:
                    patient_id = match['id']
                else:
                    is_potential_match = True
                    # إذا لم يجده، نسجله كجديد مؤقتاً
                    name_parts = data['patient_name'].split(" ", 1)
                    cursor = conn.execute(
                        "INSERT INTO patients (first_name, last_name, phone, notes) VALUES (?, ?, ?, ?)",
                        (name_parts[0], name_parts[1] if len(name_parts) > 1 else "", clean_phone, "ادعى الزيارة مسبقاً ولم يتم العثور على سجل")
                    )
                    patient_id = cursor.lastrowid

            conn.commit()
            conn.close()

            # عرض الأيام المتاحة
            days = self._get_available_days()
            data['available_days'] = days
            data['is_potential_match'] = is_potential_match
            self._update_session(phone, "ASK_DATE", data)
            
            return "الأيام المتاحة للحجز (اختر رقم اليوم):\n\n" + "\n".join(days)

        # معالجة اختيار اليوم
        if state == "ASK_DATE":
            try:
                idx = int(message) - 1
                days = data['available_days']
                if idx < 0 or idx >= len(days): raise ValueError()
                
                chosen_day_text = days[idx] # يوم السبت تاريخ 00/00/0000
                date_part = re.search(r"(\d{2}/\d{2}/\d{4})", chosen_day_text).group(1)
                
                # حفظ الطلب في قاعدة البيانات
                conn = get_db(self.clinic_username)
                
                # 1. إذا كان جديداً، أضفه للمرضى
                note = "أول زيارة للمريض" if data['is_new'] else "زرت العيادة مسبقاً"
                if data.get('is_potential_match'):
                    note += " (ملاحظة: المريض يدعي الزيارة مسبقاً ولكن لم نجد سجله)"
                
                conn.execute("INSERT INTO appointment_requests (patient_name, phone, requested_date, notes) VALUES (?, ?, ?, ?)",
                             (data['patient_name'], data['patient_phone'], date_part, note))
                conn.commit()
                conn.close()
                
                # إرسال تنبيه للطبيب
                self._notify_doctor(data['patient_name'], data['patient_phone'], chosen_day_text)
                
                self._clear_session(phone)
                return "تم إرسال طلب حجز للعيادة وسنرسل لك رسالة تأكيد الحجز والوقت بالضبط.\n\nشكراً لك!"
            except:
                return "يرجى اختيار رقم صحيح من القائمة."

        # معالجة الاستفسارات عبر Gemini
        if state == "INQUIRY":
            return self._handle_gemini_inquiry(message)

        return main_menu

    def _handle_gemini_inquiry(self, query):
        if not self.api_key: return "الاستفسارات غير متاحة حالياً، يرجى الاتصال بالعيادة."
        try:
            genai.configure(api_key=self.api_key)
            all_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
            model = genai.GenerativeModel(all_models[0])
            
            prompt = f"أنت سكرتير طبي لعيادة {self.clinic_info['clinic_name']}. أجب على سؤال المريض باختصار ومهنية:\n{query}"
            response = model.generate_content(prompt)
            return response.text + "\n\n(اكتب 'قائمة' للعودة للخيارات الرئيسية)"
        except Exception as e:
            return "عذراً، لم أستطع معالجة طلبك حالياً. يرجى المحاولة لاحقاً."

    def _notify_doctor(self, name, phone, day):
        clinic_phone = self.clinic_info.get('phone')
        if clinic_phone:
            try:
                whatsapp_url = os.getenv("WHATSAPP_SERVICE_URL", "http://localhost:3001")
                requests.post(f"{whatsapp_url.rstrip('/')}/send", json={
                    "clinicId": self.clinic_username,
                    "to": clinic_phone,
                    "message": f"🔔 طلب حجز جديد:\n👤 المريض: {name}\n📱 الهاتف: {phone}\n📅 اليوم المطلوب: {day}\n\nيرجى مراجعة صفحة 'طلبات الحجز' في لوحة التحكم."
                })
            except: pass

def handle_incoming_message(clinic_username, phone, message):
    agent = ClinicAIAgent(clinic_username)
    return agent.generate_response(phone, message)
