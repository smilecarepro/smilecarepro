from flask import Blueprint, request, jsonify, g
from database import db_required, log_action
import datetime

inventory_bp = Blueprint("inventory", __name__)

def get_sec_permission(key, default):
    row = g.db.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return row['value'] if row else default


def consume_from_batches(db, item_id, amount_to_consume):
    """FIFO consumption logic for batches: oldest/earliest expiring first, NULLs last."""
    batches = db.execute("""
        SELECT id, quantity, expiry_date FROM inventory_batches 
        WHERE inventory_item_id = ? AND quantity > 0
        ORDER BY CASE WHEN expiry_date IS NULL OR expiry_date = '' THEN 1 ELSE 0 END, expiry_date ASC
    """, (item_id,)).fetchall()
    
    remaining = amount_to_consume
    for b in batches:
        if remaining <= 0:
            break
        qty = b['quantity']
        if qty >= remaining:
            db.execute("UPDATE inventory_batches SET quantity = quantity - ? WHERE id = ?", (remaining, b['id']))
            remaining = 0
        else:
            db.execute("UPDATE inventory_batches SET quantity = 0 WHERE id = ?", (b['id'],))
            remaining -= qty

@inventory_bp.route("/", methods=["GET"])
@db_required
def get_inventory():
    if g.user.get('role') == 'secretary':
        perm = get_sec_permission('sec_perm_inventory', 'view')
        if perm == 'none':
            return jsonify({"error": "Unauthorized"}), 403
    rows = g.db.execute("SELECT * FROM inventory_items ORDER BY category, name").fetchall()
    items = []
    for r in rows:
        batches = g.db.execute("""
            SELECT id, quantity, expiry_date FROM inventory_batches 
            WHERE inventory_item_id = ? AND quantity > 0 
            ORDER BY expiry_date ASC
        """, (r['id'],)).fetchall()
        
        items.append({
            "id": r['id'],
            "name": r['name'],
            "category": r['category'],
            "stock": r['stock_quantity'],
            "min_stock": r['min_quantity'],
            "unit": r['unit'],
            "price": r['purchase_price'],
            "last_updated": r['last_updated'],
            "batches": [dict(b) for b in batches]
        })
    return jsonify(items)

@inventory_bp.route("/", methods=["POST"])
@db_required
def add_item():
    if g.user.get('role') == 'secretary':
        return jsonify({"error": "Unauthorized"}), 403
    data = request.json
    name = data.get("name")
    category = data.get("category", "General")
    stock = float(data.get("stock", 0))
    price = float(data.get("price", 0))
    min_stock = float(data.get("min_stock", 5))
    unit = data.get("unit", "Piece")
    expiry_date = data.get("expiry_date")
    
    try:
        cur = g.db.cursor()
        cur.execute("""
            INSERT INTO inventory_items (name, category, stock_quantity, min_quantity, unit, purchase_price)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (name, category, stock, min_stock, unit, price))
        item_id = cur.lastrowid
        
        if stock > 0 and expiry_date:
            cur.execute("""
                INSERT INTO inventory_batches (inventory_item_id, quantity, expiry_date)
                VALUES (?, ?, ?)
            """, (item_id, stock, expiry_date))
        
        # Log Expense if stock > 0 and price > 0
        if stock > 0 and price > 0:
            total_cost = stock * price
            today = datetime.date.today().isoformat()
            cur.execute("""
                INSERT INTO expenses (category, amount, payment_method, date, notes)
                VALUES (?, ?, 'Cash', ?, ?)
            """, ("Inventory Purchase", total_cost, today, f"Initial stock for: {name}"))
            
        g.db.commit()
        log_action("ADD_INVENTORY_ITEM", target_name=name, description=f"إضافة مادة جديدة للمخزن: {name} بكمية {stock}")
        return jsonify({"ok": True}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@inventory_bp.route("/<int:iid>", methods=["PUT"])
@db_required
def update_item(iid):
    if g.user.get('role') == 'secretary':
        return jsonify({"error": "Unauthorized"}), 403
    data = request.json
    try:
        g.db.execute("""
            UPDATE inventory_items SET name=?, category=?, stock_quantity=?, min_quantity=?, unit=?, purchase_price=?, last_updated=CURRENT_TIMESTAMP
            WHERE id=?
        """, (data.get("name"), data.get("category"), data.get("stock"), data.get("min_stock"), data.get("unit"), data.get("price"), iid))
        g.db.commit()
        log_action("UPDATE_INVENTORY_ITEM", target_id=iid, target_name=data.get("name"), description=f"تعديل بيانات مادة في المخزن: {data.get('name')}")
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@inventory_bp.route("/<int:iid>/stock", methods=["POST"])
@db_required
def update_stock(iid):
    if g.user.get('role') == 'secretary':
        perm = get_sec_permission('sec_perm_inventory', 'view')
        if perm != 'edit':
            return jsonify({"error": "Unauthorized"}), 403
    data = request.json
    change = float(data.get("change", 0))
    try:
        # Get item price for expense logging
        item = g.db.execute("SELECT name, purchase_price FROM inventory_items WHERE id = ?", (iid,)).fetchone()
        if not item: return jsonify({"error": "Item not found"}), 404
        
        g.db.execute("UPDATE inventory_items SET stock_quantity = stock_quantity + ?, last_updated=CURRENT_TIMESTAMP WHERE id = ?", (change, iid))
        
        # Deduct from batches if change is negative (consumption)
        if change < 0:
            consume_from_batches(g.db, iid, abs(change))
            
        # Log Expense if change is positive (restocking)
        if change > 0 and item['purchase_price'] > 0:
            total_cost = change * item['purchase_price']
            today = datetime.date.today().isoformat()
            g.db.execute("""
                INSERT INTO expenses (category, amount, payment_method, date, notes)
                VALUES (?, ?, 'Cash', ?, ?)
            """, ("Inventory Purchase", total_cost, today, f"Restocked: {item['name']} (+{change})"))
            
        g.db.commit()
        action_type = "INCREASE_STOCK" if change > 0 else "DECREASE_STOCK"
        desc = f"زيادة كمية {item['name']} بـ {change}" if change > 0 else f"استهلاك/تنقيص {item['name']} بـ {abs(change)}"
        log_action(action_type, target_id=iid, target_name=item['name'], description=desc)
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@inventory_bp.route("/<int:iid>/batches", methods=["POST"])
@db_required
def add_batch(iid):
    if g.user.get('role') == 'secretary':
        return jsonify({"error": "Unauthorized"}), 403
    data = request.json
    qty = float(data.get("quantity", 0))
    expiry = data.get("expiry_date")
    if qty <= 0 or not expiry:
        return jsonify({"error": "بيانات غير صالحة"}), 400
    try:
        g.db.execute("""
            INSERT INTO inventory_batches (inventory_item_id, quantity, expiry_date)
            VALUES (?, ?, ?)
        """, (iid, qty, expiry))
        g.db.execute("UPDATE inventory_items SET stock_quantity = stock_quantity + ?, last_updated=CURRENT_TIMESTAMP WHERE id = ?", (qty, iid))
        g.db.commit()
        log_action("ADD_BATCH", target_id=iid, description=f"إضافة دفعة جديدة للمادة {iid} بكمية {qty} وصلاحية {expiry}")
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@inventory_bp.route("/batches/<int:bid>", methods=["DELETE"])
@db_required
def delete_batch(bid):
    if g.user.get('role') == 'secretary':
        return jsonify({"error": "Unauthorized"}), 403
    try:
        batch = g.db.execute("SELECT * FROM inventory_batches WHERE id = ?", (bid,)).fetchone()
        if not batch: return jsonify({"error": "الدفعة غير موجودة"}), 404
        
        g.db.execute("DELETE FROM inventory_batches WHERE id = ?", (bid,))
        g.db.execute("UPDATE inventory_items SET stock_quantity = MAX(0, stock_quantity - ?), last_updated=CURRENT_TIMESTAMP WHERE id = ?", (batch['quantity'], batch['inventory_item_id']))
        g.db.commit()
        log_action("DELETE_BATCH", target_id=batch['inventory_item_id'], description=f"حذف دفعة صلاحية رقم {bid} بكمية {batch['quantity']}")
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@inventory_bp.route("/<int:iid>", methods=["DELETE"])
@db_required
def delete_item(iid):
    if g.user.get('role') == 'secretary':
        return jsonify({"error": "Unauthorized"}), 403
    # Get name before delete
    item = g.db.execute("SELECT name FROM inventory_items WHERE id=?", (iid,)).fetchone()
    name = item['name'] if item else f"Item #{iid}"
    
    g.db.execute("DELETE FROM inventory_batches WHERE inventory_item_id = ?", (iid,))
    g.db.execute("DELETE FROM inventory_items WHERE id = ?", (iid,))
    log_action("DELETE_INVENTORY_ITEM", target_id=iid, target_name=name, description=f"حذف مادة من المخزن: {name}")
    g.db.commit()
    return jsonify({"ok": True})

