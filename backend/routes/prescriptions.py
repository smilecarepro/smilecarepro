from flask import Blueprint, request, jsonify, g, send_file
from database import db_required
import json, random, string, io, os
from datetime import datetime

prescriptions_bp = Blueprint("prescriptions", __name__)

def gen_rx_number():
    return "RX-" + "".join(random.choices(string.digits, k=6))

@prescriptions_bp.route("/", methods=["POST"])
@db_required
def create_prescription():
    data = request.json
    rx_number = gen_rx_number()
    date_str = datetime.now().strftime("%Y-%m-%d")
    drugs_list = data.get("drugs", [])
    drugs_json = json.dumps(drugs_list, ensure_ascii=False)
    
    meds_summary = "، ".join([d.get("name", "") for d in drugs_list])
    
    cursor = g.db.execute("""
        INSERT INTO prescriptions (patient_id, meds, notes, date, rx_number, diagnosis, drugs_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("patient_id"), meds_summary, data.get("diagnosis", ""), date_str, rx_number, data.get("diagnosis", ""), drugs_json
    ))
    g.db.commit()
    return jsonify({"id": cursor.lastrowid, "rx_number": rx_number}), 201

@prescriptions_bp.route("/<int:rid>/pdf", methods=["GET"])
@db_required
def download_pdf(rid):
    rx = g.db.execute("SELECT * FROM prescriptions WHERE id = ?", (rid,)).fetchone()
    if not rx: return jsonify({"error": "Not found"}), 404
    
    patient = g.db.execute("SELECT * FROM patients WHERE id = ?", (rx["patient_id"],)).fetchone()
    
    settings_rows = g.db.execute("SELECT key, value FROM settings").fetchall()
    clinic = {row["key"]: row["value"] for row in settings_rows}
    
    doc_name = clinic.get("doctor_name", "الدكتور")
    clinic_name = clinic.get("clinic_name", "عيادة الأسنان")
    specialty = clinic.get("specialty", "طب الأسنان")
    address = clinic.get("address", "")
    phone = clinic.get("phone", "")
    
    drugs = json.loads(rx["drugs_json"] or "[]")

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, HRFlowable, Table, TableStyle
        from reportlab.lib.utils import ImageReader
        import base64
        
        from pdf_utils import get_pdf_styles, arabic_text
        
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf, pagesize=A4,
            rightMargin=15*mm, leftMargin=15*mm,
            topMargin=0, bottomMargin=0
        )

        styles = get_pdf_styles()
        normal_style = styles["normal"]
        label_style = styles["label"]
        value_style = styles["value"]
        
        # Set alignment to right for Arabic
        normal_style.alignment = 2
        label_style.alignment = 2
        value_style.alignment = 2

        story = []
        
        # 1. Header Image (Full Width)
        if clinic.get("prescription_header"):
            try:
                img_str = clinic["prescription_header"]
                if "," in img_str: img_str = img_str.split(",")[1]
                header_bin = base64.b64decode(img_str)
                header_img = Image(io.BytesIO(header_bin), width=A4[0], height=60*mm)
                story.append(header_img)
            except: story.append(Spacer(1, 60*mm))
        else:
            story.append(Spacer(1, 60*mm))

        story.append(Spacer(1, 10*mm))

        # 2. Patient Info Table
        p_name = (patient["first_name"] + " " + patient["last_name"]) if patient else ""
        p_age = str(patient["age"]) if patient else ""
        p_gender_raw = str(patient["gender"]) if patient else ""
        p_gender = "ذكر" if p_gender_raw == 'M' else "أنثى" if p_gender_raw == 'F' else p_gender_raw
        date_str = str(rx["date"])
        
        info_data = [
            [arabic_text("التاريخ"), arabic_text("الجنس"), arabic_text("العمر"), arabic_text("اسم المريض")],
            [Paragraph(date_str, value_style), Paragraph(arabic_text(p_gender), value_style), Paragraph(arabic_text(p_age), value_style), Paragraph(arabic_text(p_name), value_style)]
        ]
        
        info_table = Table(info_data, colWidths=[40*mm, 30*mm, 30*mm, 70*mm])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.whitesmoke),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('LINEBELOW', (0, 0), (-1, 0), 1, colors.lightgrey),
            ('ALIGN', (0,0), (-1,-1), 'RIGHT')
        ]))
        story.append(info_table)
        
        if rx["diagnosis"]:
            story.append(Spacer(1, 6*mm))
            story.append(Paragraph(f"<b>{arabic_text('التشخيص:')}</b> {arabic_text(rx['diagnosis'])}", normal_style))
            
        story.append(Spacer(1, 8*mm))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#185FA5")))
        story.append(Spacer(1, 10*mm))

        # 3. Rx Symbol -> Arabic Title
        story.append(Paragraph(f"<font size='18' color='#185FA5'><b>{arabic_text('العلاج المطلوب:')}</b></font>", styles["title"]))
        story.append(Spacer(1, 8*mm))

        # 4. Drugs List
        # Fully Arabic Prescription -> Right Aligned
        drug_name_style = styles["normal"].clone("dn")
        drug_name_style.alignment = 2 # Right align
        drug_name_style.fontSize = 13
        drug_name_style.fontName = styles["fonts"][1] # Bold
        drug_name_style.leading = 18

        drug_detail_style = styles["normal"].clone("dd")
        drug_detail_style.alignment = 2 # Right align
        drug_detail_style.fontSize = 11
        drug_detail_style.color = colors.darkslategray
        drug_detail_style.rightIndent = 10

        drug_note_style = styles["normal"].clone("dnote")
        drug_note_style.alignment = 2 # Right align
        drug_note_style.fontSize = 10
        drug_note_style.color = colors.grey
        drug_note_style.rightIndent = 10
        drug_note_style.topIndent = 2

        for d in drugs:
            name = d.get('name', '')
            dose = d.get('dose', '')
            timing = d.get('timing', '')
            duration = d.get('duration', '')
            form = d.get('form', '')
            
            drug_line = f"<b>{arabic_text(name)}</b>"
            details = []
            if dose: details.append(dose)
            if timing: details.append(timing)
            if duration: details.append(duration)
            if form: details.append(f"({form})")
            
            details_line = " — ".join(details)
            
            story.append(Paragraph(drug_line, drug_name_style))
            story.append(Paragraph(arabic_text(details_line), drug_detail_style))
            
            if d.get("note"):
                story.append(Paragraph(f"<i>{arabic_text('ملاحظة:')} {arabic_text(d.get('note', ''))}</i>", drug_note_style))
            
            story.append(Spacer(1, 8*mm))

        story.append(Spacer(1, 30*mm))

        # 5. Doctor Signature
        sig_style = styles["normal"].clone("sig")
        sig_style.alignment = 1 # Center align
        sig_data = [[Paragraph(f"<b>{arabic_text('توقيع الطبيب')}</b><br/><br/>_______________________", sig_style), ""]]
        sig_table = Table(sig_data, colWidths=[60*mm, 110*mm])
        story.append(sig_table)

        # Build with static footer
        def add_footer(canvas, doc):
            if clinic.get("prescription_footer"):
                try:
                    img_str = clinic["prescription_footer"]
                    if "," in img_str: img_str = img_str.split(",")[1]
                    footer_bin = base64.b64decode(img_str)
                    canvas.drawImage(ImageReader(io.BytesIO(footer_bin)), 0, 0, width=A4[0], height=45*mm)
                except: pass

        doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
        
        buf.seek(0)
        return send_file(
            buf,
            mimetype="application/pdf",
            as_attachment=False,
            download_name=f"prescription_{rx['rx_number']}.pdf"
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@prescriptions_bp.route('/templates', methods=['GET'])
@db_required
def get_templates():
    rows = g.db.execute('SELECT * FROM prescription_templates ORDER BY created_at DESC').fetchall()
    return jsonify([dict(r) for r in rows])

@prescriptions_bp.route('/templates', methods=['POST'])
@db_required
def create_template():
    data = request.json
    name = data.get('name')
    drugs_json = data.get('drugs_json', '[]')
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    try:
        g.db.execute('INSERT INTO prescription_templates (name, drugs_json) VALUES (?, ?)', (name, json.dumps(drugs_json) if isinstance(drugs_json, list) else drugs_json))
        return jsonify({'success': True})
    except Exception as e:
        if 'UNIQUE' in str(e):
            return jsonify({'error': 'Name already exists'}), 400
        return jsonify({'error': str(e)}), 500

@prescriptions_bp.route('/templates/<int:id>', methods=['DELETE'])
@db_required
def delete_template(id):
    g.db.execute('DELETE FROM prescription_templates WHERE id=?', (id,))
    return jsonify({'success': True})
