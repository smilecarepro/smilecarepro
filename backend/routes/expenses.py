from flask import Blueprint, request, jsonify, g
from database import db_required, log_action

expenses_bp = Blueprint("expenses", __name__)

def get_sec_permission(key, default):
    row = g.db.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return row['value'] if row else default


@expenses_bp.route("/", methods=["GET"])
@db_required
def get_expenses():
    if g.user.get('role') == 'secretary':
        perm = get_sec_permission('sec_perm_expenses', 'today')
        if perm == 'none':
            return jsonify({"error": "Unauthorized"}), 403
        elif perm in ['today', 'today_add']:
            import datetime
            date_filter = datetime.date.today().strftime("%Y-%m-%d")
            rows = g.db.execute("SELECT * FROM expenses WHERE date = ?", (date_filter,)).fetchall()
        else:
            date_filter = request.args.get("date", "").strip()
            if date_filter:
                rows = g.db.execute("SELECT * FROM expenses WHERE date = ?", (date_filter,)).fetchall()
            else:
                rows = g.db.execute("SELECT * FROM expenses ORDER BY date DESC").fetchall()
    else:
        date_filter = request.args.get("date", "").strip()
        if date_filter:
            rows = g.db.execute("SELECT * FROM expenses WHERE date = ?", (date_filter,)).fetchall()
        else:
            rows = g.db.execute("SELECT * FROM expenses ORDER BY date DESC").fetchall()
    return jsonify([dict(r) for r in rows])

@expenses_bp.route("/", methods=["POST"])
@db_required
def add_expense():
    d = request.json
    if g.user.get('role') == 'secretary':
        perm = get_sec_permission('sec_perm_expenses', 'today')
        if perm not in ['today_add', 'all_add']:
            return jsonify({"error": "Unauthorized"}), 403
        if perm == 'today_add':
            import datetime
            d['date'] = datetime.date.today().strftime("%Y-%m-%d")
    g.db.execute("INSERT INTO expenses (category, amount, payment_method, date, notes) VALUES (?,?,?,?,?)",
                 (d['category'], d['amount'], d.get('payment_method', 'Cash'), d['date'], d.get('notes')))
    
    # Audit Log
    log_action("ADD_EXPENSE", target_name=d['category'], description=f"إضافة مصروف جديد: {d['category']} بمبلغ {d['amount']}")
    
    g.db.commit()
    return jsonify({"ok": True})

@expenses_bp.route("/<int:id>", methods=["PUT"])
@db_required
def update_expense(id):
    if g.user.get('role') == 'secretary':
        perm = get_sec_permission('sec_perm_expenses', 'today')
        if perm not in ['today_add', 'all_add']:
            return jsonify({"error": "Unauthorized"}), 403
    """Edit an existing expense entry."""
    d = request.json
    old = g.db.execute("SELECT * FROM expenses WHERE id=?", (id,)).fetchone()
    if not old:
        return jsonify({"error": "NotFound"}), 404

    g.db.execute(
        "UPDATE expenses SET category=?, amount=?, payment_method=?, date=?, notes=? WHERE id=?",
        (
            d.get('category', old['category']),
            d.get('amount', old['amount']),
            d.get('payment_method', old['payment_method']),
            d.get('date', old['date']),
            d.get('notes', old['notes']),
            id
        )
    )
    log_action("UPDATE_EXPENSE", target_name=d.get('category', old['category']),
               description=f"تعديل مصروف رقم {id} من {old['amount']} إلى {d.get('amount', old['amount'])}",
               old_data=dict(old), new_data=d)
    g.db.commit()
    return jsonify({"ok": True})

@expenses_bp.route("/<int:id>", methods=["DELETE"])
@db_required
def delete_expense(id):
    if g.user.get('role') == 'secretary':
        perm = get_sec_permission('sec_perm_expenses', 'today')
        if perm not in ['today_add', 'all_add']:
            return jsonify({"error": "Unauthorized"}), 403
    # Get info before delete for logging
    row = g.db.execute("SELECT category, amount FROM expenses WHERE id=?", (id,)).fetchone()
    if row:
        log_action("DELETE_EXPENSE", target_name=row['category'], description=f"حذف مصروف: {row['category']} بقيمة {row['amount']}")
    
    g.db.execute("DELETE FROM expenses WHERE id = ?", (id,))
    g.db.commit()
    return jsonify({"ok": True})

