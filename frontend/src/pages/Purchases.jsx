import React, { useState, useEffect } from 'react';
import { getInventory, getPurchases, createPurchase, updatePurchase, finalizePurchase, deletePurchase } from '../api';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../AuthContext';
import DatePicker from "../components/DatePicker";

export default function Purchases() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState({ items: [], notes: '' });
  const [viewingOrder, setViewingOrder] = useState(null);

  useEffect(() => { 
    load();
    const handleAdd = (e) => {
      addToOrder(e.detail);
      setShowOrderModal(true);
    };
    window.addEventListener('add-to-purchases', handleAdd);
    return () => window.removeEventListener('add-to-purchases', handleAdd);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [invData, ordData] = await Promise.all([getInventory(), getPurchases()]);
      const sortedInv = [...invData].sort((a, b) => {
        const aStock = a.stock_quantity ?? a.stock ?? 0;
        const aMin = a.min_quantity ?? a.min_stock ?? 0;
        const bStock = b.stock_quantity ?? b.stock ?? 0;
        const bMin = b.min_quantity ?? b.min_stock ?? 0;
        
        const aLow = aStock <= aMin;
        const bLow = bStock <= bMin;
        
        if (aLow && !bLow) return -1;
        if (!aLow && bLow) return 1;
        return 0;
      });
      setInventory(sortedInv);
      setOrders(ordData);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const addToOrder = (item) => {
    const existing = currentOrder.items.find(i => i.inventory_item_id === item.id);
    if (existing) return;
    setCurrentOrder({
      ...currentOrder,
      items: [...currentOrder.items, { inventory_item_id: item.id, name: item.name, requested_qty: 1 }]
    });
  };

  const addCustomItem = () => {
    const name = prompt("اسم المادة الجديدة:");
    if (!name) return;
    setCurrentOrder({
      ...currentOrder,
      items: [...currentOrder.items, { inventory_item_id: null, name, requested_qty: 1 }]
    });
  };

  const handleSaveOrder = async () => {
    if (currentOrder.items.length === 0) return;
    const tempOrder = { ...currentOrder, id: 'temp-' + Date.now(), status: 'pending', created_at: new Date().toISOString() };
    
    setShowOrderModal(false);
    setOrders(prev => [tempOrder, ...prev]);
    setCurrentOrder({ items: [], notes: '' });

    try {
      await createPurchase(currentOrder);
      load();
    } catch (e) { 
      alert("خطأ في حفظ الطلب");
      load();
    }
  };

  const handleUpdateItem = (itemId, field, value) => {
    setViewingOrder(prev => {
      const newItems = prev.items.map(i => {
        if (i.id === itemId) {
          let val = value;
          if (field === 'received_qty' || field === 'price_per_unit') {
            val = parseFloat(value) || 0;
          }
          return { ...i, [field]: val };
        }
        return i;
      });
      return { ...prev, items: newItems };
    });
  };

  const handleFinalize = async (id) => {
    if (!window.confirm("هل أنت متأكد من إتمام الجرد والشراء؟ سيتم تحديث المخزن وإضافة المصاريف.")) return;
    
    const orderToFinalize = viewingOrder;
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'completed' } : o));
    setViewingOrder(null);

    try {
        await updatePurchase(orderToFinalize.id, { items: orderToFinalize.items });
        await finalizePurchase(id);
    } catch (e) { 
        alert("خطأ في إتمام العملية، سيتم إعادة تحديث البيانات");
        load();
    }
  };

  const printOrder = (order) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>قائمة مشتريات - ${order.id}</title>
          <style>
            body { direction: rtl; font-family: 'Cairo', sans-serif; padding: 40px; background: #fff; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
            th { background: #f8fafc; color: #64748b; font-size: 12px; }
            h2 { color: #185FA5; border-bottom: 2px solid #185FA5; padding-bottom: 10px; }
            .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; border-top: 1px dashed #ccc; padding-top: 20px; }
          </style>
        </head>
        <body>
          <h2>قائمة مشتريات رقم: ${order.id}</h2>
          <p>التاريخ: ${new Date(order.created_at).toLocaleDateString('ar-SA')}</p>
          <table>
            <thead>
              <tr>
                <th>المادة</th>
                <th>الكمية المطلوبة</th>
                <th>الكمية المستلمة</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(i => `
                <tr>
                  <td>${i.name}</td>
                  <td>${i.requested_qty}</td>
                  <td>${i.received_qty || '---'}</td>
                  <td></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">توقيع المسؤول: ............................</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  return (
    <div className="animate-fade" style={{ padding: "20px 0", maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
            🛒 {user?.account_type === 'center_manager' ? t("المشتريات المركزية للمركز") : t("إدارة المشتريات")}
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: "4px 0 0 0", fontSize: 14 }}>{t("نظام الطلبات والجرد الذكي المتصل بالمخزن")}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setShowOrderModal(true)} className="btn-primary">
            <span>+</span> {t("طلب شراء جديد")}
          </button>
          <button onClick={load} className="btn-secondary">{t("تحديث البيانات")}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24 }}>
        {/* Left: Inventory Needs */}
        <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 20 }}>📦</span>
            <h3 className="section-title">{t("حالة المخزن (النواقص)")}</h3>
          </div>
          
          <div className="table-container custom-scrollbar" style={{ maxHeight: 600 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("المادة")}</th>
                  <th>{t("الموجود")}</th>
                  <th>{t("الحد الأدنى")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => {
                  const itemStock = item.stock_quantity ?? item.stock ?? 0;
                  const itemMin = item.min_quantity ?? item.min_stock ?? 5;
                  const isLow = itemStock <= itemMin;
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {isLow && <span style={{ color: 'var(--danger-text)' }}>⚠️</span>}
                          <span style={{ color: isLow ? 'var(--danger-text)' : 'var(--text-main)' }}>{item.name}</span>
                        </div>
                      </td>
                      <td style={{ color: isLow ? 'var(--danger-text)' : 'var(--success-text)', fontWeight: 700 }}>
                        {itemStock} <span style={{ fontSize: 10, opacity: 0.7 }}>{item.unit}</span>
                      </td>
                      <td>{itemMin}</td>
                      <td style={{ textAlign: 'left' }}>
                        {currentOrder.items.find(i => i.inventory_item_id === item.id) ? (
                          <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                            ✔️ {t("تمت الإضافة")}
                          </button>
                        ) : (
                          <button onClick={() => addToOrder(item)} className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }}>
                            {t("إضافة للطلب")}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Orders Record */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 20 }}>📋</span>
            <h3 className="section-title">{t("سجل الطلبات")}</h3>
          </div>

          <div className="custom-scrollbar" style={{ maxHeight: 600, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>{t("لا توجد طلبات شراء مسجلة حالياً")}</div>
            ) : orders.map(order => (
              <div key={order.id} className="stat-card-container" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-main)" }}>{t("طلب شراء")} #{order.id}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      📅 {new Date(order.created_at).toLocaleString('ar-EG')}
                    </div>
                  </div>
                  <span className={`badge badge-${order.status === 'pending' ? 'warning' : order.status === 'completed' ? 'success' : 'primary'}`}>
                    {order.status === 'pending' ? t('بانتظار الشراء') : order.status === 'completed' ? t('تم الإتمام') : t('قيد الجرد')}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                  <button onClick={() => setViewingOrder(order)} className="btn-primary" style={{ flex: 1, minHeight: 40, fontSize: 13, background: order.status === 'completed' ? 'var(--bg-surface)' : undefined }}>
                    {order.status === 'completed' ? `📄 ${t("عرض التفاصيل")}` : `🔍 ${t("جرد المواد")}`}
                  </button>
                  <button onClick={() => printOrder(order)} className="btn-secondary" style={{ minWidth: 44, padding: 0, justifyContent: 'center' }}>🖨️</button>
                  {order.status !== 'completed' && (
                    <button onClick={() => { if(window.confirm(t("حذف الطلب؟"))) deletePurchase(order.id).then(load); }} className="btn-danger" style={{ minWidth: 44, padding: 0, justifyContent: 'center' }}>✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showOrderModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="modal-panel animate-fade" style={{ width: '100%', maxWidth: 700, padding: 32 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>🛒 {t("إنشاء قائمة مشتريات")}</h3>
            
            <div className="table-container custom-scrollbar" style={{ maxHeight: 350, marginBottom: 24, background: 'rgba(0,0,0,0.2)', borderRadius: 14 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("المادة")}</th>
                    <th>{t("الكمية")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.name}</td>
                      <td>
                        <input 
                          type="number" 
                          value={item.requested_qty} 
                          onChange={(e) => {
                            const newItems = [...currentOrder.items];
                            newItems[idx].requested_qty = parseFloat(e.target.value) || 0;
                            setCurrentOrder({ ...currentOrder, items: newItems });
                          }}
                          className="glass-input" 
                          style={{ width: 100, minHeight: 38 }}
                        />
                      </td>
                      <td>
                        <button onClick={() => {
                          const newItems = currentOrder.items.filter((_, i) => i !== idx);
                          setCurrentOrder({ ...currentOrder, items: newItems });
                        }} className="btn-danger" style={{ padding: '4px 10px' }}>{t("حذف")}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={addCustomItem} className="btn-ghost" style={{ marginRight: 'auto' }}>+ {t("مادة جديدة")}</button>
              <button onClick={() => setShowOrderModal(false)} className="btn-secondary">{t("إلغاء")}</button>
              <button onClick={handleSaveOrder} className="btn-primary" disabled={currentOrder.items.length === 0}>{t("حفظ القائمة")}</button>
            </div>
          </div>
        </div>
      )}

      {viewingOrder && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="modal-panel animate-fade" style={{ width: '100%', maxWidth: 1100, padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
                {viewingOrder.status === 'completed' ? `📄 ${t("تفاصيل الفاتورة")}` : `🔍 ${t("جرد المواد المستلمة")}`}
              </h3>
              <button onClick={() => setViewingOrder(null)} className="btn-secondary" style={{ minHeight: 38 }}>{t("إغلاق")}</button>
            </div>

            <div className="table-container custom-scrollbar" style={{ maxHeight: 400, background: 'rgba(0,0,0,0.2)', borderRadius: 14 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("المادة")}</th>
                    <th>{t("المطلوب")}</th>
                    <th>{t("الواصل فعلياً")}</th>
                    <th>{t("سعر الوحدة")}</th>
                    <th>{t("تاريخ الصلاحية")}</th>
                    <th>{t("الإجمالي")}</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>{item.requested_qty}</td>
                      <td>
                        {viewingOrder.status === 'completed' ? item.received_qty : (
                          <input 
                            type="number" 
                            className="glass-input" 
                            style={{ width: 100, minHeight: 38 }}
                            value={item.received_qty || 0}
                            onChange={(e) => handleUpdateItem(item.id, 'received_qty', e.target.value)}
                          />
                        )}
                      </td>
                      <td>
                        {viewingOrder.status === 'completed' ? `${(item.price_per_unit || 0).toLocaleString()} ${t("د")}` : (
                          <input 
                            type="text" 
                            className="glass-input" 
                            style={{ width: 140, minHeight: 38 }}
                            value={item.price_per_unit ? Number(item.price_per_unit).toLocaleString() : ""}
                            onChange={(e) => handleUpdateItem(item.id, 'price_per_unit', e.target.value.replace(/\D/g, ""))}
                          />
                        )}
                      </td>
                      <td>
                        {viewingOrder.status === 'completed' ? (item.expiry_date || '---') : (
                          <DatePicker value={item.expiry_date || ""} onChange={val => handleUpdateItem(item.id, 'expiry_date', val)} />
                        )}
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--primary-light)' }}>
                        {((item.received_qty || 0) * (item.price_per_unit || 0)).toLocaleString()} {t("د")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: "var(--panel-bg)", padding: 24, borderRadius: 20, border: '1px solid var(--glass-border)' }}>
              <div>
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{t("المبلغ الإجمالي المستحق:")}</span>
                <div style={{ fontSize: 32, fontWeight: 900, color: "var(--text-main)" }}>
                    {viewingOrder.items.reduce((sum, i) => sum + ((i.received_qty || 0) * (i.price_per_unit || 0)), 0).toLocaleString()} <span style={{ fontSize: 16 }}>{t("د")}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {viewingOrder.status !== 'completed' && (
                  <>
                    <button onClick={() => updatePurchase(viewingOrder.id, { items: viewingOrder.items }).then(() => {
                         const event = new CustomEvent('show-toast', { detail: { message: t("💾 تم حفظ الجرد مؤقتاً"), type: "success" } });
                         window.dispatchEvent(event);
                    })} className="btn-secondary">{t("حفظ المسودة")}</button>
                    <button onClick={() => handleFinalize(viewingOrder.id)} className="btn-primary" style={{ background: 'var(--success)' }}>{t("إتمام الجرد والشراء")} ✔️</button>
                  </>
                )}
                <button onClick={() => printOrder(viewingOrder)} className="btn-secondary">🖨️ {t("طباعة القائمة")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
