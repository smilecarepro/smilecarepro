import React, { useState, useEffect } from "react";
import { useLanguage } from "../LanguageContext";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import { getInventory, addInventoryItem, updateInventoryItem, updateInventoryStock, deleteInventoryItem, getPurchases, addInventoryBatch, deleteInventoryBatch } from "../api";
import ConfirmModal from "../components/ConfirmModal";
import { useSettings } from "../SettingsContext";
import DatePicker from "../components/DatePicker";

export default function Inventory() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { settings, getDynamicList } = useSettings();
  const isSecretary = user?.role === 'secretary';
  const canEditStock = user?.role !== 'secretary' || settings?.sec_perm_inventory === 'edit';
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [pendingItems, setPendingItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmData, setConfirmData] = useState({ show: false, message: "", onConfirm: null });
  const [activeAddBatchId, setActiveAddBatchId] = useState(null);
  
  const [newItem, setNewItem] = useState({
    name: "", category: "General", stock: 0, min_stock: 5, unit: "Piece", price: 0, expiry_date: ""
  });

  const categories = getDynamicList('inventory_categories', [
    "Composite & Filling", "Bonding & Etching", "Impression Materials", 
    "Endodontic Supplies", "Disposable (Gloves/Masks)", "Sterilization", "Instruments", "Orthodontics", "General"
  ]);

  const load = async () => {
    setLoading(true);
    try {
      const [data, purch] = await Promise.all([getInventory(), getPurchases()]);
      setItems(data);
      
      const pending = {};
      purch.filter(o => o.status === 'pending' || o.status === 'processing').forEach(o => {
        o.items.forEach(i => {
          if (i.inventory_item_id) {
            pending[i.inventory_item_id] = (pending[i.inventory_item_id] || 0) + (i.requested_qty || 0);
          }
        });
      });
      setPendingItems(pending);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if(!newItem.name) return;
    
    try {
      if (editingId) {
        await updateInventoryItem(editingId, newItem);
      } else {
        await addInventoryItem(newItem);
      }
      setNewItem({ name: "", category: "General", stock: 0, min_stock: 5, unit: "Piece", price: 0, expiry_date: "" });
      setEditingId(null);
      setShowAddForm(false);
      load();
    } catch(e) { alert(e.message); }
  };

  const handleStockChange = async (id, change) => {
    // 🚀 Optimistic Update: تحديث الواجهة فوراً
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, stock: (item.stock || 0) + change } : item
    ));

    try {
      await updateInventoryStock(id, change);
      // لا حاجة لعمل load() بالكامل هنا لأننا حدثنا الحالة محلياً
    } catch(e) { 
      console.error(e);
      // في حال الفشل، نعيد القيمة كما كانت
      load(); 
      alert("فشل تحديث المخزن، يرجى المحاولة مرة أخرى");
    }
  };

  const handleAddBatch = async (itemId, quantity, expiryDate) => {
    if (quantity <= 0 || !expiryDate) return;
    try {
      await addInventoryBatch(itemId, { quantity, expiry_date: expiryDate });
      setActiveAddBatchId(null);
      load();
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: t("تمت إضافة الوجبة بنجاح"), type: "success" } }));
    } catch (e) {
      alert(e.message || "فشل إضافة الوجبة");
    }
  };

  const handleDeleteBatch = async (batchId) => {
    try {
      await deleteInventoryBatch(batchId);
      load();
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: t("تم حذف الوجبة بنجاح"), type: "success" } }));
    } catch (e) {
      alert(e.message || "فشل حذف الوجبة");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setNewItem({ ...item, expiry_date: "" });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => {
    setConfirmData({
      show: true,
      message: t("هل أنت متأكد من حذف هذه المادة؟"),
      onConfirm: async () => {
        setConfirmData({ show: false });
        await deleteInventoryItem(id);
        load();
      }
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const expiredBatches = [];
  const expiringSoonBatches = [];

  items.forEach(item => {
    if (item.batches) {
      item.batches.forEach(b => {
        if (b.expiry_date) {
          if (b.expiry_date < todayStr) {
            expiredBatches.push({ ...b, itemName: item.name });
          } else if (b.expiry_date <= thirtyDaysFromNow) {
            expiringSoonBatches.push({ ...b, itemName: item.name });
          }
        }
      });
    }
  });

  return (
    <div className="animate-fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          📦 {user?.account_type === 'center_manager' ? t("المخزن المركزي للمركز") : t("مخزن مواد العيادة")}
        </h2>
        <div style={{ display: "flex", gap: 12 }}>
          {!isSecretary && (
            <button className="btn-secondary" onClick={() => navigate("/purchases")} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              🛒 {t("إدارة المشتريات")}
            </button>
          )}
          {!isSecretary && (
            <button className="btn-primary" onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); setNewItem({ name: "", category: "General", stock: 0, min_stock: 5, unit: "Piece", price: 0, expiry_date: "" }); }}>
               {showAddForm ? t("إغلاق") : `+ ${t("إضافة مادة جديدة")}`}
            </button>
          )}
        </div>
      </div>

      {/* Expiry Warning Banners */}
      {(expiredBatches.length > 0 || expiringSoonBatches.length > 0) && (
        <div className="glass-panel animate-fade" style={{ padding: 20, marginBottom: 24, border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {expiredBatches.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ef4444', fontWeight: 700, fontSize: 13 }}>
                <span>🚨</span>
                <span>
                  {t("وجبات منتهية الصلاحية:")} {expiredBatches.map(b => `${b.itemName} (${b.quantity} - ${b.expiry_date})`).join('، ')}
                </span>
              </div>
            )}
            {expiringSoonBatches.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f59e0b', fontWeight: 700, fontSize: 13 }}>
                <span>⚠️</span>
                <span>
                  {t("وجبات تنتهي صلاحيتها قريباً:")} {expiringSoonBatches.map(b => `${b.itemName} (${b.quantity} - ينتهي في ${b.expiry_date})`).join('، ')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="glass-panel animate-fade" style={{ padding: 24, marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, marginBottom: 20 }}>{editingId ? t("تعديل مادة") : t("إضافة مادة جديدة")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
             <div>
                <label style={lblStyle}>{t("اسم المادة")}</label>
                <input className="glass-input" style={{ width: "100%" }} value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Composite A2..." />
             </div>
             <div>
                <label style={lblStyle}>{t("التصنيف")}</label>
                <select className="glass-input" style={{ width: "100%", padding: 10 }} value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                   {categories.map(c => <option key={c} value={c}>{t(c)}</option>)}
                </select>
             </div>
             <div>
                <label style={lblStyle}>{t("سعر الشراء (للوحدة)")}</label>
                <input type="number" className="glass-input" style={{ width: "100%" }} value={newItem.price} onChange={e => setNewItem({...newItem, price: parseFloat(e.target.value)})} />
             </div>
             <div>
                <label style={lblStyle}>{t("الكمية الحالية")}</label>
                <input type="number" className="glass-input" style={{ width: "100%" }} value={newItem.stock} onChange={e => setNewItem({...newItem, stock: parseFloat(e.target.value)})} />
             </div>
             {!editingId && (
               <div>
                  <label style={lblStyle}>{t("تاريخ صلاحية الرصيد")}</label>
                  <DatePicker value={newItem.expiry_date || ""} onChange={val => setNewItem({...newItem, expiry_date: val})} />
               </div>
             )}
             <div>
                <label style={lblStyle}>{t("تنبيه عند نقص الكمية")}</label>
                <input type="number" className="glass-input" style={{ width: "100%" }} value={newItem.min_stock} onChange={e => setNewItem({...newItem, min_stock: parseFloat(e.target.value)})} />
             </div>
             <div>
                <label style={lblStyle}>{t("الوحدة")}</label>
                <input className="glass-input" style={{ width: "100%" }} value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} placeholder="Tube, Box, Piece..." />
             </div>
          </div>
          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
             <button className="btn-primary" onClick={handleSave} style={{ padding: "10px 32px" }}>{t("حفظ")}</button>
             <button className="btn-ghost" onClick={() => setShowAddForm(false)}>{t("إلغاء")}</button>
          </div>
        </div>
      )}

      {/* Grid view for inventory items */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {items.map(item => (
          <div key={item.id} className="glass-panel" style={{ 
            padding: 24, 
            border: item.stock <= item.min_stock ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(255,255,255,0.05)",
            background: item.stock <= item.min_stock ? "rgba(239, 68, 68, 0.03)" : "rgba(255,255,255,0.02)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
               <div>
                  <div style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>{t(item.category)}</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{item.name}</div>
               </div>
               {!isSecretary && (
                 <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleEdit(item)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>✏️</button>
                    <button onClick={() => handleDelete(item.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>🗑️</button>
                 </div>
               )}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.02)", padding: 16, borderRadius: 16 }}>
               <div style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>{t("الرصيد الحالي")}</div>
                   <div style={{ fontSize: 24, fontWeight: 900, color: item.stock <= item.min_stock ? "var(--danger)" : "var(--primary)" }}>
                      {item.stock} <span style={{ fontSize: 12, fontWeight: 400 }}>{item.unit}</span>
                   </div>
                   {pendingItems[item.id] > 0 && (
                     <div style={{ fontSize: 10, color: "var(--warning-text)", fontWeight: 700, marginTop: 4 }}>
                        📦 قيد الطلب: {pendingItems[item.id]}
                     </div>
                   )}
                   <div style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)" }}>{t("السعر:")} {item.price} {t("د")}</div>
               </div>

               <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => {
                    const event = new CustomEvent('add-to-purchases', { detail: item });
                    window.dispatchEvent(event);
                    navigate('/purchases');
                  }} className="btn-ghost" style={{ width: 40, height: 40, borderRadius: 12, padding: 0, fontSize: 18, color: 'var(--primary-light)', borderColor: 'var(--primary-glow)' }} title="إضافة لقائمة المشتريات">🛒</button>
                  {canEditStock && <button onClick={() => handleStockChange(item.id, -1)} className="btn-ghost" style={{ width: 40, height: 40, borderRadius: 12, padding: 0, fontSize: 20 }}>-</button>}
                  {canEditStock && <button onClick={() => handleStockChange(item.id, 1)} className="btn-ghost" style={{ width: 40, height: 40, borderRadius: 12, padding: 0, fontSize: 20 }}>+</button>}
               </div>
            </div>

            {/* Batches List */}
            {item.batches && item.batches.length > 0 && (
              <div style={{ marginTop: 16, borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: 12 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 700 }}>{t("وجبات الصلاحية:")}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {item.batches.map(b => {
                    const isExpired = b.expiry_date < todayStr;
                    const isNear = !isExpired && b.expiry_date <= thirtyDaysFromNow;
                    let badgeColor = 'rgba(16, 185, 129, 0.1)';
                    let textColor = '#10b981';
                    let statusText = t("صالحة");
                    
                    if (isExpired) {
                      badgeColor = 'rgba(239, 68, 68, 0.1)';
                      textColor = '#ef4444';
                      statusText = t("منتهية");
                    } else if (isNear) {
                      badgeColor = 'rgba(245, 158, 11, 0.1)';
                      textColor = '#f59e0b';
                      statusText = t("قريبة الانتهاء");
                    }
                    
                    return (
                      <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, background: 'rgba(0,0,0,0.15)', padding: '6px 10px', borderRadius: 8 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: 'white' }}>{b.quantity} {item.unit}</span>
                          <span style={{ color: 'var(--text-muted)' }}>- {b.expiry_date}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ background: badgeColor, color: textColor, padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>
                            {statusText}
                          </span>
                          {!isSecretary && (
                            <button 
                              onClick={() => handleDeleteBatch(b.id)} 
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 10, padding: 0 }}
                              title={t("حذف الوجبة")}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add Batch Form */}
            {activeAddBatchId === item.id ? (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: 'white' }}>➕ {t("إضافة دفعة جديدة")}</div>
                <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input 
                      type="number" 
                      placeholder={t("الكمية")} 
                      className="glass-input" 
                      style={{ flex: 1, minHeight: 34, padding: '4px 8px', fontSize: 12 }} 
                      id={`new-batch-qty-${item.id}`}
                    />
                    <DatePicker value={""} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => setActiveAddBatchId(null)} 
                      className="btn-ghost" 
                      style={{ padding: '4px 8px', fontSize: 11, minHeight: 28 }}
                    >
                      {t("إلغاء")}
                    </button>
                    <button 
                      onClick={() => {
                        const qty = parseFloat(document.getElementById(`new-batch-qty-${item.id}`).value) || 0;
                        const expiry = document.getElementById(`new-batch-expiry-${item.id}`).value;
                        handleAddBatch(item.id, qty, expiry);
                      }} 
                      className="btn-primary" 
                      style={{ padding: '4px 12px', fontSize: 11, minHeight: 28 }}
                    >
                      {t("حفظ")}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              !isSecretary && (
                <button 
                  onClick={() => setActiveAddBatchId(item.id)} 
                  className="btn-ghost" 
                  style={{ width: '100%', marginTop: 12, padding: '6px 12px', fontSize: 11, borderStyle: 'dashed' }}
                >
                  📅 {t("إضافة دفعة صلاحية جديدة")}
                </button>
              )
            )}
            
            {item.stock <= item.min_stock && (
              <div style={{ marginTop: 16, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, textAlign: "center" }}>
                ⚠️ {t("تحذير: المخزون أوشك على النفاذ!")}
              </div>
            )}
            
            <div style={{ marginTop: 16, fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>
               {t("آخر تحديث:")} {new Date(item.last_updated).toLocaleString(t("ar-SA"))}
            </div>
          </div>
        ))}
        {items.length === 0 && !loading && (
          <div style={{ gridColumn: "1/-1", padding: 60, textAlign: "center", opacity: 0.5 }}>
             <div style={{ fontSize: 40, marginBottom: 16 }}>📦</div>
             {t("المخزن فارغ حالياً. ابدأ بإضافة موادك الطبية.")}
          </div>
        )}
      </div>

      <ConfirmModal 
        show={confirmData.show} 
        title={t("تأكيد الحذف")} 
        message={confirmData.message} 
        danger={true}
        onConfirm={confirmData.onConfirm} 
        onCancel={() => setConfirmData({ ...confirmData, show: false })} 
      />
    </div>
  );
}

const lblStyle = { fontSize: 12, color: "var(--text-muted)", marginBottom: 6, display: "block", fontWeight: 600 };
