from flask import Blueprint, request, jsonify, g
from database import db_required, log_action

invoices_bp = Blueprint("invoices", __name__)

def get_sec_permission(key, default):
    row = g.db.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return row['value'] if row else default


@invoices_bp.route("/", methods=["GET"])
@db_required
def get_invoices():
    if g.user.get('role') == 'secretary':
        perm = get_sec_permission('sec_perm_invoices', 'today')
        if perm == 'none':
            return jsonify({"error": "Unauthorized"}), 403
        elif perm in ['today', 'today_add']:
            import datetime
            date_filter = datetime.date.today().strftime("%Y-%m-%d")
            q = request.args.get("q", "").strip()
            status = request.args.get("status", "").strip()
            page = int(request.args.get("page", 1))
            limit = int(request.args.get("limit", 100))
            offset = (page - 1) * limit
        else:
            q = request.args.get("q", "").strip()
            status = request.args.get("status", "").strip()
            date_filter = request.args.get("date", "").strip()
            page = int(request.args.get("page", 1))
            limit = int(request.args.get("limit", 100) if date_filter else request.args.get("limit", 50))
            offset = (page - 1) * limit
    else:
        q = request.args.get("q", "").strip()
        status = request.args.get("status", "").strip()
        date_filter = request.args.get("date", "").strip()
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 100) if date_filter else request.args.get("limit", 50))
        offset = (page - 1) * limit
    
    query = """
        SELECT i.id, i.patient_id, p.first_name || ' ' || p.last_name AS patient_name,
               i.total_amount AS amount, i.paid_amount AS paid, i.date, i.status, i.payment_method, i.notes,
               COALESCE(p.total_agreed_price, 0) AS total_price,
               (COALESCE(p.total_agreed_price, 0) - (SELECT SUM(paid_amount) FROM invoices WHERE patient_id = i.patient_id AND id <= i.id)) AS patient_debt
        FROM invoices i
        LEFT JOIN patients p ON i.patient_id = p.id
        WHERE 1=1
    """
    params = []
    
    if q:
        query += " AND (p.first_name || ' ' || p.last_name LIKE ?)"
        params.append(f"%{q}%")
        
    if status:
        query += " AND i.status = ?"
        params.append(status)

    if date_filter:
        query += " AND i.date = ?"
        params.append(date_filter)
        
    query += " ORDER BY i.date DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    
    rows = g.db.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])

@invoices_bp.route("/", methods=["POST"])
@db_required
def add_invoice():
    d = request.json
    if g.user.get('role') == 'secretary':
        perm = get_sec_permission('sec_perm_invoices', 'today')
        if perm not in ['today_add', 'all_add']:
            return jsonify({"error": "Unauthorized"}), 403
        if perm == 'today_add':
            import datetime
            d['date'] = datetime.date.today().strftime("%Y-%m-%d")
    p_id = d.get('patient_id')
    total = float(d.get('amount') or d.get('total_amount') or 0)
    paid = float(d.get('paid') or d.get('paid_amount') or 0)
    pm = d.get('payment_method', 'Cash')
    
    # Get patient data
    patient = g.db.execute("SELECT first_name, last_name, debt FROM patients WHERE id = ?", (p_id,)).fetchone()
    if not patient: return jsonify({"error": "Patient not found"}), 404
    
    status = "مدفوع" if paid >= total and total > 0 else ("جزئي" if paid > 0 else "غير مدفوع")
    if total == 0 and paid > 0: status = "تسديد دين"

    g.db.execute("INSERT INTO invoices (patient_id, total_amount, paid_amount, payment_method, notes, date, status) VALUES (?,?,?,?,?,?,?)",
                 (p_id, total, paid, pm, d.get('notes', ''), d.get('date', ''), status))
    
    # Recalculate patient's overall remaining debt to ensure correctness and prevent double-subtraction
    _recalc_patient_debt(p_id)
    
    # Audit Log
    p_name = f"{patient['first_name']} {patient['last_name']}"
    log_action("ADD_INVOICE", target_id=p_id, target_name=p_name, description=f"إضافة فاتورة/دفعة جديدة بمبلغ {paid} {pm}")
    
    g.db.commit()
    return jsonify({"ok": True, "message": "تمت العملية بنجاح"})

@invoices_bp.route("/<int:id>/pay", methods=["POST"])
@db_required
def pay_invoice(id):
    if g.user.get('role') == 'secretary':
        perm = get_sec_permission('sec_perm_invoices', 'today')
        if perm not in ['today_add', 'all_add']:
            return jsonify({"error": "Unauthorized"}), 403
    d = request.json
    added = float(d.get('amount') or d.get('paid_amount') or 0)
    
    inv = g.db.execute("SELECT patient_id, total_amount, paid_amount FROM invoices WHERE id = ?", (id,)).fetchone()
    if not inv: return jsonify({"error": "NotFound"}), 404
    
    p_id = inv['patient_id']
    
    # Calculate patient's overall remaining debt
    p_data = g.db.execute("SELECT total_agreed_price FROM patients WHERE id = ?", (p_id,)).fetchone()
    stats = g.db.execute("SELECT SUM(total_amount) as total_charges, SUM(paid_amount) as total_paid FROM invoices WHERE patient_id = ?", (p_id,)).fetchone()
    
    limit = p_data['total_agreed_price']
    total_paid = stats['total_paid']
    
    remaining_patient_debt = limit - total_paid
    
    # Safety check
    if added > remaining_patient_debt:
        added = max(0.0, remaining_patient_debt)
        
    new_paid = inv['paid_amount'] + added
    
    # Update status of THIS invoice
    if new_paid <= 0: status = "غير مدفوع"
    elif new_paid < inv['total_amount']: status = "جزئي"
    else: status = "مدفوع"
    
    # Get old data for diff
    old_row = g.db.execute("SELECT * FROM invoices WHERE id = ?", (id,)).fetchone()
    old_data = dict(old_row) if old_row else {}

    g.db.execute("UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?", (new_paid, status, id))
    
    # Get new data for diff
    new_row = g.db.execute("SELECT * FROM invoices WHERE id = ?", (id,)).fetchone()
    new_data = dict(new_row) if new_row else {}

    # Audit Log with Diff
    p = g.db.execute("SELECT first_name, last_name FROM patients WHERE id=?", (p_id,)).fetchone()
    p_name = f"{p['first_name']} {p['last_name']}" if p else f"Patient #{p_id}"
    log_action("PAY_INVOICE", target_id=p_id, target_name=p_name, 
               description=f"تحصيل مبلغ إضافي {added} لفاتورة رقم {id}",
               old_data=old_data, new_data=new_data)
    
    g.db.commit()
    return jsonify({"ok": True, "message": "تم التسديد بنجاح"})

@invoices_bp.route("/<int:id>", methods=["DELETE"])
@db_required
def delete_invoice(id):
    if g.user.get('role') == 'secretary':
        perm = get_sec_permission('sec_perm_invoices', 'today')
        if perm not in ['today_add', 'all_add']:
            return jsonify({"error": "Unauthorized"}), 403
    # Get info before delete for logging
    inv = g.db.execute("SELECT patient_id, paid_amount, date FROM invoices WHERE id = ?", (id,)).fetchone()
    if not inv:
        return jsonify({"error": "NotFound"}), 404
        
    # Check 24-hour limit (since we only store date, we allow today and yesterday)
    from datetime import datetime, date as dt_date
    try:
        inv_date = datetime.strptime(inv['date'], "%Y-%m-%d").date()
        today = dt_date.today()
        if (today - inv_date).days > 1:
            return jsonify({"error": "Cannot delete invoices older than 24 hours"}), 400
    except Exception as e:
        pass

    p = g.db.execute("SELECT first_name, last_name FROM patients WHERE id=?", (inv['patient_id'],)).fetchone()
    p_name = f"{p['first_name']} {p['last_name']}" if p else "Unknown"
    log_action("DELETE_INVOICE", target_id=inv['patient_id'], target_name=p_name, description=f"حذف فاتورة رقم {id} بقيمة {inv['paid_amount']}")
    
    g.db.execute("DELETE FROM invoices WHERE id = ?", (id,))
    # Recalculate patient debt after deletion
    _recalc_patient_debt(inv['patient_id'])
    g.db.commit()
    return jsonify({"ok": True})

@invoices_bp.route("/<int:id>", methods=["PUT"])
@db_required
def update_invoice(id):
    if g.user.get('role') == 'secretary':
        perm = get_sec_permission('sec_perm_invoices', 'today')
        if perm not in ['today_add', 'all_add']:
            return jsonify({"error": "Unauthorized"}), 403
    """Edit an invoice: amount, paid, method, date, notes. Recalculates patient debt."""
    d = request.json
    old = g.db.execute("SELECT * FROM invoices WHERE id=?", (id,)).fetchone()
    if not old:
        return jsonify({"error": "NotFound"}), 404

    # Check 24-hour limit (since we only store date, we allow today and yesterday)
    from datetime import datetime, date as dt_date
    try:
        inv_date = datetime.strptime(old['date'], "%Y-%m-%d").date()
        today = dt_date.today()
        if (today - inv_date).days > 1:
            return jsonify({"error": "Cannot edit invoices older than 24 hours"}), 400
    except Exception as e:
        pass

    total  = float(d.get('total_amount', old['total_amount']) or 0)
    paid   = float(d.get('paid_amount',  old['paid_amount'])  or 0)
    pm     = d.get('payment_method', old['payment_method'])
    date   = d.get('date', old['date'])
    notes  = d.get('notes', old['notes'])

    # Recalculate status
    if paid >= total and total > 0:   status = "مدفوع"
    elif paid > 0:                     status = "جزئي"
    elif total == 0 and paid > 0:      status = "تسديد دين"
    else:                              status = "غير مدفوع"

    g.db.execute(
        "UPDATE invoices SET total_amount=?, paid_amount=?, payment_method=?, date=?, notes=?, status=? WHERE id=?",
        (total, paid, pm, date, notes, status, id)
    )

    # Recalculate patient debt
    p_id = old['patient_id']
    _recalc_patient_debt(p_id)

    p = g.db.execute("SELECT first_name, last_name FROM patients WHERE id=?", (p_id,)).fetchone()
    p_name = f"{p['first_name']} {p['last_name']}" if p else f"Patient #{p_id}"
    log_action("UPDATE_INVOICE", target_id=p_id, target_name=p_name,
               description=f"تعديل فاتورة رقم {id}",
               old_data=dict(old), new_data={"total_amount": total, "paid_amount": paid, "payment_method": pm, "date": date})
    g.db.commit()
    return jsonify({"ok": True})

def _recalc_patient_debt(patient_id):
    """Recalculate and update patients.debt after invoice changes."""
    p = g.db.execute("SELECT payment_system, total_agreed_price FROM patients WHERE id=?", (patient_id,)).fetchone()
    if not p:
        return
    total_paid = g.db.execute("SELECT COALESCE(SUM(paid_amount),0) FROM invoices WHERE patient_id=?", (patient_id,)).fetchone()[0]
    agreed = p['total_agreed_price'] or 0
    new_debt = max(0, agreed - total_paid)
    g.db.execute("UPDATE patients SET debt=?, total_paid=? WHERE id=?", (new_debt, total_paid, patient_id))


@invoices_bp.route("/<int:id>/pdf", methods=["GET"])
@db_required
def download_invoice_pdf(id):
    from flask import send_file
    import io
    from pdf_utils import get_pdf_styles, add_header_footer, force_english
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4

    inv = g.db.execute("""
        SELECT i.*, p.first_name || ' ' || p.last_name AS patient_name, p.phone, p.total_agreed_price 
        FROM invoices i 
        JOIN patients p ON i.patient_id = p.id 
        WHERE i.id = ?
    """, (id,)).fetchone()
    if not inv: return jsonify({"error": "NotFound"}), 404

    settings_rows = g.db.execute("SELECT key, value FROM settings").fetchall()
    clinic = {row["key"]: row["value"] for row in settings_rows}

    # Calculate debt logic
    stats = g.db.execute("SELECT SUM(total_amount) as total_charges, SUM(paid_amount) as total_paid FROM invoices WHERE patient_id = ?", (inv['patient_id'],)).fetchone()
    limit = inv['total_agreed_price']
    current_total_paid = stats['total_paid']
    
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=60*mm, bottomMargin=45*mm)
    styles = get_pdf_styles()
    story = []

    story.append(Paragraph("Payment Receipt", styles["title"]))
    story.append(Spacer(1, 10*mm))

    # Patient & Invoice Info
    info_data = [
        [Paragraph("Patient Name", styles["label"]), Paragraph("Invoice ID", styles["label"]), Paragraph("Date", styles["label"])],
        [Paragraph(force_english(inv['patient_name']), styles["value"]), Paragraph(f"#{inv['id']}", styles["value"]), Paragraph(inv['date'], styles["value"])]
    ]
    t = Table(info_data, colWidths=[90*mm, 40*mm, 40*mm])
    t.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,0), colors.whitesmoke), ('LINEBELOW', (0,0), (-1,0), 1, colors.lightgrey), ('PADDING', (0,0), (-1,-1), 8)]))
    story.append(t)
    story.append(Spacer(1, 15*mm))

    # Financial Details
    story.append(Paragraph("Financial Details", styles["label"]))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#185FA5")))
    story.append(Spacer(1, 5*mm))

    fin_data = [
        ["Total Treatment Price:", f"{(limit or 0):,.0f} IQD"],
        ["Previous Total Paid:", f"{(current_total_paid - inv['paid_amount']):,.0f} IQD"],
        ["Current Payment:", f"{inv['paid_amount']:,.0f} IQD"],
        ["New Total Paid:", f"{current_total_paid:,.0f} IQD"],
        ["Remaining Balance:", f"{(limit - current_total_paid):,.0f} IQD"]
    ]
    
    for label, val in fin_data:
        row = [Paragraph(label, styles["normal"]), Paragraph(val, styles["value"])]
        ft = Table([row], colWidths=[120*mm, 50*mm])
        ft.setStyle(TableStyle([('ALIGN', (1,0), (1,0), 'RIGHT'), ('BOTTOMPADDING', (0,0), (-1,-1), 10)]))
        story.append(ft)

    story.append(Spacer(1, 20*mm))
    story.append(Paragraph(f"Notes: {force_english(inv['notes']) or '-'}", styles["normal"]))

    doc.build(story, onFirstPage=lambda c, d: add_header_footer(c, d, clinic), onLaterPages=lambda c, d: add_header_footer(c, d, clinic))
    buf.seek(0)
    return send_file(buf, mimetype="application/pdf", as_attachment=False, download_name=f"receipt_{id}.pdf")
