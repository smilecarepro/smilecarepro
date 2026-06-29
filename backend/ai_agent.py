import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
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



    def generate_response(self, phone, message):
        state, data = self._get_session(phone)
        message = message.strip()

        # القائمة الرئيسية
        main_menu = (
            f"أهلاً بك في عيادة {self.clinic_info['clinic_name']} 🦷\n"
            "كيف يمكننا مساعدتك اليوم؟\n\n"
            "1- تعديل وإلغاء الموعد\n"
            "2- وسائل التواصل الاجتماعي\n"
            "3- الاستفسارات\n"
            "4- من نحن\n"
            "5- موقع العيادة"
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
                return "يرجى التواصل مع العيادة مباشرة لتعديل أو إلغاء موعدك عبر الرقم: " + self.clinic_info['phone']
            elif message == "2":
                return "تفضل بزيارة صفحاتنا:\nFacebook: [رابط]\nInstagram: [رابط]\nSnapchat: [رابط]"
            elif message == "3":
                self._update_session(phone, "INQUIRY", {})
                return "تفضل بطرح استفسارك الطبي وسيجيبك الذكاء الاصطناعي فوراً:"
            elif message == "4":
                return f"عيادة {self.clinic_info['clinic_name']} تحت إشراف {self.clinic_info['doctor_name']}. نقدم أفضل خدمات تجميل وعلاج الأسنان بأحدث التقنيات."
            elif message == "5":
                return "موقع العيادة:\n[رابط Google Maps]\nالعنوان: [اكتب العنوان هنا]"
            else:
                return "يرجى اختيار رقم من 1 إلى 5، أو اكتب 'قائمة' للعودة."



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



def handle_incoming_message(clinic_username, phone, message):
    agent = ClinicAIAgent(clinic_username)
    return agent.generate_response(phone, message)
