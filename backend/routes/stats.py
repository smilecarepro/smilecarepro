from flask import Blueprint, request, jsonify, g
from database import db_required
from datetime import datetime

stats_bp = Blueprint("stats", __name__)

def get_sec_permission(key, default):
    row = g.db.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return row['value'] if row else default


@stats_bp.route("/summary", methods=["GET"])
@db_required
def get_summary():
    if g.user.get('role') == 'secretary':
        perm = get_sec_permission('sec_perm_reports', 'none')
        if perm == 'none':
            return jsonify({"error": "Unauthorized"}), 403
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Appointments today
    total_today = g.db.execute("SELECT COUNT(*) FROM appointments WHERE date = ?", (today,)).fetchone()[0]
    
    if g.user.get('role') == 'secretary' and get_sec_permission('sec_perm_reports', 'none') == 'today':
        return jsonify({
            "total_today": total_today,
            "debt_total": 0,
            "total_patients": 0,
            "debt_count": 0
        })

    # Total Patients
    total_patients = g.db.execute("SELECT COUNT(*) FROM patients").fetchone()[0]
    
    # Debt Calculation
    debt_query = "SELECT SUM(debt) FROM patients WHERE debt > 0"
    debt_total = g.db.execute(debt_query).fetchone()[0] or 0
    
    # Debt Count
    debt_count_query = "SELECT COUNT(*) FROM patients WHERE debt > 0"
    debt_count = g.db.execute(debt_count_query).fetchone()[0]
    
    return jsonify({
        "total_today": total_today,
        "debt_total": debt_total,
        "total_patients": total_patients,
        "debt_count": debt_count
    })

@stats_bp.route("/financial", methods=["GET"])
@db_required
def get_financial():
    if g.user.get('role') == 'secretary':
        perm = get_sec_permission('sec_perm_reports', 'none')
        if perm == 'none':
            return jsonify({"error": "Unauthorized"}), 403
        if perm == 'today':
            today = datetime.now().strftime("%Y-%m-%d")
            collected_today = g.db.execute(
                "SELECT SUM(paid_amount) FROM invoices WHERE date = ? AND paid_amount > 0", 
                (today,)
            ).fetchone()[0] or 0
            expenses_today = g.db.execute("SELECT SUM(amount) FROM expenses WHERE date = ?", (today,)).fetchone()[0] or 0
            return jsonify({
                "collected_today": collected_today,
                "collected_month": 0,
                "expenses_today": expenses_today,
                "revenue": collected_today,
                "expenses": expenses_today,
                "net_profit": collected_today - expenses_today,
                "commission_amount": 0,
                "total_debt": 0,
                "cash_revenue": 0,
                "bank_revenue": 0,
                "collection_rate": 100,
                "monthly_growth": []
            })
    today = datetime.now().strftime("%Y-%m-%d")
    month = datetime.now().strftime("%Y-%m")
    
    # Revenue (Collected) — use local date
    collected_today = g.db.execute(
        "SELECT SUM(paid_amount) FROM invoices WHERE date = ? AND paid_amount > 0", 
        (today,)
    ).fetchone()[0] or 0
    collected_month = g.db.execute(
        "SELECT SUM(paid_amount) FROM invoices WHERE date LIKE ? AND paid_amount > 0", 
        (f"{month}%",)
    ).fetchone()[0] or 0
    total_revenue = g.db.execute("SELECT SUM(paid_amount) FROM invoices").fetchone()[0] or 0
    
    # Expenses
    total_expenses = g.db.execute("SELECT SUM(amount) FROM expenses").fetchone()[0] or 0
    expenses_today = g.db.execute("SELECT SUM(amount) FROM expenses WHERE date = ?", (today,)).fetchone()[0] or 0
    
    # Cash vs Bank (Collected Revenue)
    cash_collected = g.db.execute("SELECT SUM(paid_amount) FROM invoices WHERE payment_method = 'Cash'").fetchone()[0] or 0
    bank_collected = g.db.execute("SELECT SUM(paid_amount) FROM invoices WHERE payment_method = 'Bank'").fetchone()[0] or 0
    
    cash_expenses = g.db.execute("SELECT SUM(amount) FROM expenses WHERE payment_method = 'Cash'").fetchone()[0] or 0
    bank_expenses = g.db.execute("SELECT SUM(amount) FROM expenses WHERE payment_method = 'Bank'").fetchone()[0] or 0
    
    cash_balance = cash_collected - cash_expenses
    bank_balance = bank_collected - bank_expenses
    
    # Debt — read directly from patients.debt (maintained by DB triggers)
    # This guarantees Reports and the Debts page always show the same number
    total_debt = g.db.execute("SELECT COALESCE(SUM(debt), 0) FROM patients WHERE debt > 0").fetchone()[0] or 0

    # Agreed total for collection rate calculation
    agreed_total_query = """
        SELECT SUM(total_amt) FROM (
            SELECT COALESCE(p.total_agreed_price, 0) as total_amt
            FROM patients p
        )
    """
    agreed_total = g.db.execute(agreed_total_query).fetchone()[0] or 0

    # Collection Rate
    collection_rate = (total_revenue / agreed_total * 100) if agreed_total > 0 else 100

    # NEW: Center Commission Calculation for affiliated doctors
    commission_amount = 0
    center_id = g.user.get("center_id")
    commission_rate = g.user.get("commission_rate", 0)
    
    if center_id and commission_rate > 0:
        commission_amount = (total_revenue * commission_rate) / 100

    # Adjusted Net Profit: Revenue - Expenses - Commission (if applicable)
    net_profit = total_revenue - total_expenses - commission_amount

    # Monthly Growth (Last 6 Months)
    monthly_growth = []
    current_m = datetime.now().month
    current_y = datetime.now().year
    
    for i in range(5, -1, -1):
        m = current_m - i
        y = current_y
        if m <= 0:
            m += 12
            y -= 1
        m_str = f"{y}-{m:02d}"
        rev = g.db.execute("SELECT SUM(paid_amount) FROM invoices WHERE date LIKE ?", (f"{m_str}%",)).fetchone()[0] or 0
        monthly_growth.append({"name": f"{m:02d}/{y}", "revenue": rev})

    return jsonify({
        "collected_today": collected_today,
        "collected_month": collected_month,
        "expenses_today": expenses_today,
        "revenue": total_revenue,
        "expenses": total_expenses,
        "net_profit": net_profit,
        "commission_amount": commission_amount,
        "total_debt": total_debt,
        "cash_revenue": cash_balance,
        "bank_revenue": bank_balance,
        "collection_rate": round(collection_rate, 1),
        "monthly_growth": monthly_growth
    })

@stats_bp.route("/debts", methods=["GET"])
@db_required
def get_debts():
    if g.user.get('role') == 'secretary':
        perm = get_sec_permission('sec_perm_reports', 'none')
        if perm != 'all':
            return jsonify({"error": "Unauthorized"}), 403
    query = """
        SELECT p.id, p.first_name, p.last_name, p.phone, p.debt, p.total_paid,
               COALESCE(p.total_agreed_price, 0) AS total_amt
        FROM patients p
        WHERE p.debt > 0
        ORDER BY p.debt DESC
    """
    rows = g.db.execute(query).fetchall()
    return jsonify([dict(r) for r in rows])

@stats_bp.route("/invoices/summary", methods=["GET"])
@db_required
def get_invoice_summary():
    if g.user.get('role') == 'secretary':
        perm = get_sec_permission('sec_perm_reports', 'none')
        if perm == 'none':
            return jsonify({"error": "Unauthorized"}), 403
        if perm == 'today':
            today = datetime.now().strftime("%Y-%m-%d")
            today_total = g.db.execute("SELECT SUM(total_amount) FROM invoices WHERE date = ?", (today,)).fetchone()[0] or 0
            today_collected = g.db.execute("SELECT SUM(paid_amount) FROM invoices WHERE date = ?", (today,)).fetchone()[0] or 0
            return jsonify({
                "total": 0,
                "collected": 0,
                "debt": 0,
                "today_total": today_total,
                "today_collected": today_collected
            })
    # Calculate sum of agreed_price per patient
    today = datetime.now().strftime("%Y-%m-%d")
    
    agreed_total_query = """
        SELECT SUM(COALESCE(p.total_agreed_price, 0)) FROM patients p
    """
    agreed_total = g.db.execute(agreed_total_query).fetchone()[0] or 0
    total_collected = g.db.execute("SELECT SUM(paid_amount) FROM invoices").fetchone()[0] or 0
    
    today_total = g.db.execute("SELECT SUM(total_amount) FROM invoices WHERE date = ?", (today,)).fetchone()[0] or 0
    today_collected = g.db.execute("SELECT SUM(paid_amount) FROM invoices WHERE date = ?", (today,)).fetchone()[0] or 0

    return jsonify({
        "total": agreed_total,
        "collected": total_collected,
        "debt": agreed_total - total_collected,
        "today_total": today_total,
        "today_collected": today_collected
    })
@stats_bp.route("/daily-summary/pdf", methods=["GET"])
@db_required
def download_daily_summary_pdf():
    if g.user.get('role') == 'secretary':
        perm = get_sec_permission('sec_perm_daily_summary', '0')
        if perm != '1':
            return jsonify({"error": "Unauthorized"}), 403
    from flask import send_file
    import io
    from pdf_utils import get_pdf_styles, add_header_footer, arabic_text
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from datetime import datetime

    from flask import request
    target_date = request.args.get('date') or datetime.now().strftime("%Y-%m-%d")
    
    # Financial data
    rev_rows = g.db.execute("SELECT i.*, p.first_name || ' ' || p.last_name as p_name FROM invoices i JOIN patients p ON i.patient_id = p.id WHERE i.date = ?", (target_date,)).fetchall()
    exp_rows = g.db.execute("SELECT * FROM expenses WHERE date = ?", (target_date,)).fetchall()
    
    total_rev = sum(r['paid_amount'] for r in rev_rows)
    total_exp = sum(r['amount'] for r in exp_rows)

    settings_rows = g.db.execute("SELECT key, value FROM settings").fetchall()
    clinic = {row["key"]: row["value"] for row in settings_rows}

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=60*mm, bottomMargin=45*mm)
    styles = get_pdf_styles()
    
    styles["title"].alignment = 1
    styles["normal"].alignment = 2 # Right align
    styles["label"].alignment = 2
    styles["value"].alignment = 2

    story = []

    story.append(Paragraph(f"{arabic_text('الملخص المالي اليومي')} - {target_date}", styles["title"]))
    story.append(Spacer(1, 10*mm))

    # Revenue Table
    story.append(Paragraph(arabic_text("الإيرادات (المدفوعات المستلمة)"), styles["label"]))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#10b981")))
    story.append(Spacer(1, 4*mm))
    
    if rev_rows:
        rev_data = [[arabic_text("المبلغ"), arabic_text("طريقة الدفع"), arabic_text("المريض")]]
        for r in rev_rows:
            rev_data.append([
                Paragraph(f"{r['paid_amount']:,.0f}", styles["value"]),
                Paragraph(arabic_text(r['payment_method']), styles["value"]),
                Paragraph(arabic_text(r['p_name']), styles["value"])
            ])
        
        rt = Table(rev_data, colWidths=[35*mm, 35*mm, 100*mm])
        rt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.whitesmoke), 
            ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.lightgrey), 
            ('PADDING', (0,0), (-1,-1), 6),
            ('ALIGN', (0,0), (-1,-1), 'RIGHT')
        ]))
        story.append(rt)
    else:
        story.append(Paragraph(arabic_text("لا توجد إيرادات مسجلة."), styles["normal"]))

    story.append(Spacer(1, 15*mm))

    # Expenses Table
    story.append(Paragraph(arabic_text("المصروفات"), styles["label"]))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#ef4444")))
    story.append(Spacer(1, 4*mm))
    
    if exp_rows:
        exp_data = [[arabic_text("المبلغ"), arabic_text("الوصف"), arabic_text("الفئة")]]
        for e in exp_rows:
            exp_data.append([
                Paragraph(f"{e['amount']:,.0f}", styles["value"]),
                Paragraph(arabic_text(e['description']), styles["value"]),
                Paragraph(arabic_text(e['category']), styles["value"])
            ])
        
        et = Table(exp_data, colWidths=[35*mm, 95*mm, 40*mm])
        et.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.whitesmoke), 
            ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.lightgrey), 
            ('PADDING', (0,0), (-1,-1), 6),
            ('ALIGN', (0,0), (-1,-1), 'RIGHT')
        ]))
        story.append(et)
    else:
        story.append(Paragraph(arabic_text("لا توجد مصروفات مسجلة."), styles["normal"]))

    story.append(Spacer(1, 20*mm))
    
    # Final Totals
    total_data = [
        [f"{total_rev:,.0f} {arabic_text('دينار')}", arabic_text("إجمالي الإيرادات:")],
        [f"{total_exp:,.0f} {arabic_text('دينار')}", arabic_text("إجمالي المصروفات:")],
        [f"{(total_rev - total_exp):,.0f} {arabic_text('دينار')}", arabic_text("صافي التدفق النقدي:")]
    ]
    for val, lbl in total_data:
        row = [Paragraph(f"<b>{val}</b>", styles["value"]), Paragraph(f"<b>{lbl}</b>", styles["normal"])]
        story.append(Table([row], colWidths=[130*mm, 40*mm]))

    doc.build(story, onFirstPage=lambda c, d: add_header_footer(c, d, clinic), onLaterPages=lambda c, d: add_header_footer(c, d, clinic))
    buf.seek(0)
    return send_file(buf, mimetype="application/pdf", as_attachment=False, download_name=f"summary_{target_date}.pdf")
