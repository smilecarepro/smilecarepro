from flask import Blueprint, request, jsonify, g
from database import db_required
import json

drugs_bp = Blueprint("drugs", __name__)

@drugs_bp.route("/", methods=["GET"])
@db_required
def get_drugs():
    query = request.args.get("q", "")
    if query:
        rows = g.db.execute("SELECT * FROM drugs WHERE name LIKE ? LIMIT 20", (f"{query}%",)).fetchall()
    else:
        rows = g.db.execute("SELECT * FROM drugs LIMIT 100").fetchall()
    
    drugs = []
    for r in rows:
        warnings = {}
        if r['warn_pregnant']: warnings["pregnant"] = r['warn_pregnant']
        if r['warn_breastfeed']: warnings["breastfeed"] = r['warn_breastfeed']
        if r['warn_renal']: warnings["renal"] = r['warn_renal']
        if r['warn_hepatic']: warnings["hepatic"] = r['warn_hepatic']
        if r.keys() and 'warn_allergy' in r.keys():
            if r['warn_allergy']: warnings["allergy"] = r['warn_allergy']
            if r['warn_diabetes']: warnings["diabetes"] = r['warn_diabetes']
            if r['warn_blood_pressure']: warnings["blood_pressure"] = r['warn_blood_pressure']
        if r.keys() and 'warn_epilepsy' in r.keys():
            if r['warn_epilepsy']: warnings["epilepsy"] = r['warn_epilepsy']
            
        def safe_json_load(data_str):
            if not data_str: return []
            try: return json.loads(data_str)
            except: return [data_str]

        drugs.append({
            "id": r['id'],
            "name": r['name'],
            "category": r['category'],
            "forms": safe_json_load(r['forms']),
            "doses": {
                "adult": safe_json_load(r['doses_adult']),
                "child": safe_json_load(r['doses_child']),
                "adolescent": safe_json_load(r['doses_adolescent']),
                "elderly": safe_json_load(r['doses_elderly'])
            },
            "timing": safe_json_load(r['timing']),
            "duration": safe_json_load(r['duration']),
            "meal_timing": r['meal_timing'],
            "note": r['note'],
            "warnings": warnings,
            "is_custom": bool(r['is_custom']),
            "max_daily_dose": r['max_daily_dose'] if 'max_daily_dose' in r.keys() else 0,
            "is_favorite": bool(r['is_favorite']) if 'is_favorite' in r.keys() else False,
            "stock": r['stock_quantity'] if 'stock_quantity' in r.keys() else 0,
            "min_stock": r['min_quantity'] if 'min_quantity' in r.keys() else 5,
            "unit": r['unit'] if 'unit' in r.keys() else "Piece"
        })
    return jsonify(drugs)

@drugs_bp.route("/", methods=["POST"])
@db_required
def create_drug():
    data = request.json
    try:
        g.db.execute("""
            INSERT INTO drugs (name, category, forms, doses_adult, doses_child, doses_adolescent, doses_elderly, meal_timing, timing, duration, note, warn_pregnant, warn_breastfeed, warn_renal, warn_hepatic, warn_allergy, warn_diabetes, warn_blood_pressure, warn_epilepsy, max_daily_dose, is_favorite, is_custom, stock_quantity, min_quantity, unit)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
        """, (
            data.get("name"), data.get("category", ""), 
            json.dumps(data.get("forms", []), ensure_ascii=False),
            json.dumps(data.get("doses_adult", []), ensure_ascii=False),
            json.dumps(data.get("doses_child", []), ensure_ascii=False),
            json.dumps(data.get("doses_adolescent", []), ensure_ascii=False),
            json.dumps(data.get("doses_elderly", []), ensure_ascii=False),
            data.get("meal_timing", ""),
            json.dumps(data.get("timing", []), ensure_ascii=False),
            json.dumps(data.get("duration", []), ensure_ascii=False),
            data.get("note", ""), data.get("warn_pregnant", ""),
            data.get("warn_breastfeed", ""), data.get("warn_renal", ""),
            data.get("warn_hepatic", ""),
            data.get("warn_allergy", ""), data.get("warn_diabetes", ""),
            data.get("warn_blood_pressure", ""), data.get("warn_epilepsy", ""),
            data.get("max_daily_dose", 0),
            1 if data.get("is_favorite") else 0,
            data.get("stock", 0), data.get("min_stock", 5), data.get("unit", "Piece")
        ))
        g.db.commit()
        return jsonify({"ok": True}), 201
    except Exception as e:
        err = str(e)
        if "UNIQUE constraint failed" in err:
            return jsonify({"error": "هذا الدواء موجود مسبقاً في قاعدة البيانات!"}), 400
        return jsonify({"error": err}), 400

@drugs_bp.route("/<int:did>", methods=["PUT"])
@db_required
def update_drug(did):
    data = request.json
    try:
        g.db.execute("""
            UPDATE drugs SET 
                name=?, category=?, forms=?, doses_adult=?, doses_child=?, doses_adolescent=?, doses_elderly=?, 
                meal_timing=?, timing=?, duration=?, note=?, warn_pregnant=?, warn_breastfeed=?, warn_renal=?, 
                warn_hepatic=?, warn_allergy=?, warn_diabetes=?, warn_blood_pressure=?, warn_epilepsy=?,
                max_daily_dose=?, is_favorite=?, stock_quantity=?, min_quantity=?, unit=?
            WHERE id=?
        """, (
            data.get("name"), data.get("category", ""), 
            json.dumps(data.get("forms", []), ensure_ascii=False),
            json.dumps(data.get("doses_adult", []), ensure_ascii=False),
            json.dumps(data.get("doses_child", []), ensure_ascii=False),
            json.dumps(data.get("doses_adolescent", []), ensure_ascii=False),
            json.dumps(data.get("doses_elderly", []), ensure_ascii=False),
            data.get("meal_timing", ""),
            json.dumps(data.get("timing", []), ensure_ascii=False),
            json.dumps(data.get("duration", []), ensure_ascii=False),
            data.get("note", ""), data.get("warn_pregnant", ""),
            data.get("warn_breastfeed", ""), data.get("warn_renal", ""),
            data.get("warn_hepatic", ""),
            data.get("warn_allergy", ""), data.get("warn_diabetes", ""),
            data.get("warn_blood_pressure", ""), data.get("warn_epilepsy", ""),
            data.get("max_daily_dose", 0),
            1 if data.get("is_favorite") else 0,
            data.get("stock", 0), data.get("min_stock", 5), data.get("unit", "Piece"),
            did
        ))
        g.db.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@drugs_bp.route("/<int:did>/toggle-favorite", methods=["POST"])
@db_required
def toggle_favorite(did):
    try:
        g.db.execute("UPDATE drugs SET is_favorite = 1 - is_favorite WHERE id = ?", (did,))
        g.db.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@drugs_bp.route("/<int:did>/stock", methods=["POST"])
@db_required
def update_stock(did):
    data = request.json
    change = data.get("change", 0) # can be +1 or -1
    try:
        g.db.execute("UPDATE drugs SET stock_quantity = stock_quantity + ? WHERE id = ?", (change, did))
        g.db.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@drugs_bp.route("/<int:did>", methods=["DELETE"])
@db_required
def delete_drug(did):
    g.db.execute("DELETE FROM drugs WHERE id = ?", (did,))
    g.db.commit()
    return jsonify({"ok": True})

@drugs_bp.route("/templates", methods=["GET"])
@db_required
def get_templates():
    rows = g.db.execute("SELECT * FROM prescription_templates ORDER BY name").fetchall()
    return jsonify([dict(r) for r in rows])

@drugs_bp.route("/templates", methods=["POST"])
@db_required
def create_template():
    data = request.json
    try:
        g.db.execute("INSERT INTO prescription_templates (name, description, drugs_json) VALUES (?, ?, ?)",
                     (data.get("name"), data.get("description", ""), data.get("drugs_json", "[]")))
        g.db.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@drugs_bp.route("/templates/<int:tid>", methods=["PUT"])
@db_required
def update_template(tid):
    data = request.json
    try:
        g.db.execute("UPDATE prescription_templates SET name=?, description=?, drugs_json=? WHERE id=?",
                     (data.get("name"), data.get("description", ""), data.get("drugs_json", "[]"), tid))
        g.db.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@drugs_bp.route("/templates/<int:tid>", methods=["DELETE"])
@db_required
def delete_template(tid):
    g.db.execute("DELETE FROM prescription_templates WHERE id = ?", (tid,))
    g.db.commit()
    return jsonify({"ok": True})
