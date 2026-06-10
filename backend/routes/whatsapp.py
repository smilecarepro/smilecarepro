from flask import Blueprint, request, jsonify
import requests
from ai_agent import handle_incoming_message
from database import get_db, MASTER_DB_PATH
import sqlite3

whatsapp_bp = Blueprint("whatsapp", __name__)

def send_whatsapp_message(to_phone, message, clinic_username):
    """Utility to send message via Local Node.js Service."""
    import os
    whatsapp_url = os.getenv("WHATSAPP_SERVICE_URL", "http://localhost:3001")
    url = f"{whatsapp_url.rstrip('/')}/send"
    payload = {
        "clinicId": clinic_username,
        "to": to_phone,
        "message": message
    }
    try:
        response = requests.post(url, json=payload)
        return response.json()
    except Exception as e:
        print(f"Error sending WhatsApp via local service: {e}")
        return None

@whatsapp_bp.route("/webhook", methods=["POST"])
def webhook():
    """
    Incoming webhook from WhatsApp provider.
    Expects JSON with 'from' (patient phone), 'to' (clinic phone), and 'body' (message).
    """
    data = request.json
    if not data:
        return "No Data", 400

    # These fields depend on your provider (e.g., UltraMsg uses 'data' key)
    # Adjusting for UltraMsg common format
    incoming_msg = data.get('body')
    patient_phone = data.get('from')
    clinic_whatsapp_number = data.get('to') # Or identify by some ID in URL

    if not incoming_msg or not patient_phone:
        return "Missing fields", 200 # Always return 200 to provider to avoid retries

    # 1. Identify which clinic this belongs to
    # We'll search in master.db or settings to find which clinic owns this WhatsApp number/Instance
    # For now, let's assume we can identify it by a clinic_id passed in the URL or settings
    # PRO TIP: You can set the webhook URL in UltraMsg to include the clinic username:
    # Example: https://your-site.com/api/whatsapp/webhook?clinic=doctor123
    clinic_username = request.args.get('clinic')
    
    if not clinic_username:
        # Fallback: try to find by instance_id if provider sends it
        instance_id = data.get('instance_id')
        # Here you would query your DB to find which user has this instance_id
        # For this demo, let's assume it's passed in the URL.
        return "Clinic not identified", 200

    # 2. Get AI Response
    ai_reply = handle_incoming_message(clinic_username, patient_phone, incoming_msg)

    # 3. Send Reply back to Patient via Local Service
    try:
        send_whatsapp_message(patient_phone, ai_reply, clinic_username)
    except Exception as e:
        print(f"Error in webhook processing: {e}")

    return jsonify({"status": "success"}), 200
