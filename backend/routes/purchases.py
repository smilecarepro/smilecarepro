from flask import Blueprint, request, jsonify, g
from database import db_required, log_action
from datetime import datetime

purchases_bp = Blueprint("purchases", __name__)

@purchases_bp.route("/", methods=["GET"])
@db_required
def get_purchases():
    orders = g.db.execute("SELECT * FROM purchase_orders ORDER BY created_at DESC").fetchall()
    result = []
    for o in orders:
        items = g.db.execute("SELECT * FROM purchase_items WHERE order_id = ?", (o['id'],)).fetchall()
        order_dict = dict(o)
        order_dict['items'] = [dict(i) for i in items]
        result.append(order_dict)
    return jsonify(result)

@purchases_bp.route("/", methods=["POST"])
@db_required
def create_purchase():
    d = request.json
    items = d.get('items', [])
    if not items: return jsonify({"error": "No items"}), 400
    
    cur = g.db.cursor()
    cur.execute("INSERT INTO purchase_orders (status, notes) VALUES ('pending', ?)", (d.get('notes', ''),))
    order_id = cur.lastrowid
    
    for item in items:
        cur.execute(
            "INSERT INTO purchase_items (order_id, inventory_item_id, name, requested_qty) VALUES (?,?,?,?)",
            (order_id, item.get('inventory_item_id'), item.get('name'), item.get('requested_qty'))
        )
    
    g.db.commit()
    return jsonify({"ok": True, "order_id": order_id})

@purchases_bp.route("/<int:id>", methods=["PUT"])
@db_required
def update_purchase(id):
    d = request.json
    status = d.get('status')
    items = d.get('items', [])
    
    if status:
        g.db.execute("UPDATE purchase_orders SET status = ? WHERE id = ?", (status, id))
    
    if items:
        # Update received_qty and price_per_unit for items
        for item in items:
            g.db.execute(
                "UPDATE purchase_items SET received_qty = ?, price_per_unit = ? WHERE id = ?",
                (item.get('received_qty'), item.get('price_per_unit'), item.get('id'))
            )
            
    g.db.commit()
    return jsonify({"ok": True})

@purchases_bp.route("/<int:id>/finalize", methods=["POST"])
@db_required
def finalize_purchase(id):
    order = g.db.execute("SELECT * FROM purchase_orders WHERE id = ?", (id,)).fetchone()
    if not order: return jsonify({"error": "Not found"}), 404
    
    items = g.db.execute("SELECT * FROM purchase_items WHERE order_id = ?", (id,)).fetchall()
    total_cost = 0
    
    for item in items:
        qty = item['received_qty'] or 0
        price = item['price_per_unit'] or 0
        total_cost += qty * price
        
        # Update Inventory
        if item['inventory_item_id']:
            g.db.execute(
                "UPDATE inventory_items SET stock_quantity = stock_quantity + ?, purchase_price = ? WHERE id = ?",
                (qty, price, item['inventory_item_id'])
            )
        else:
            # Create new inventory item if doesn't exist
            g.db.execute(
                "INSERT INTO inventory_items (name, stock_quantity, purchase_price, category) VALUES (?,?,?,?)",
                (item['name'], qty, price, 'مشتريات جديدة')
            )
            
    # Add to Expenses
    g.db.execute(
        "INSERT INTO expenses (category, amount, date, notes) VALUES (?,?,?,?)",
        ('مشتريات طبية', total_cost, datetime.now().strftime("%Y-%m-%d"), f"فاتورة مشتريات رقم {id}")
    )
    
    g.db.execute("UPDATE purchase_orders SET status = 'completed', total_price = ? WHERE id = ?", (total_cost, id))
    
    log_action("FINALIZE_PURCHASE", target_id=id, description=f"إتمام جرد وشراء فاتورة رقم {id} بإجمالي {total_cost}")
    
    g.db.commit()
    return jsonify({"ok": True})

@purchases_bp.route("/<int:id>", methods=["DELETE"])
@db_required
def delete_purchase(id):
    g.db.execute("DELETE FROM purchase_items WHERE order_id = ?", (id,))
    g.db.execute("DELETE FROM purchase_orders WHERE id = ?", (id,))
    g.db.commit()
    return jsonify({"ok": True})
