import React, { useState, useEffect } from 'react';
import { getInventory, getPurchases, createPurchase, updatePurchase, finalizePurchase, deletePurchase } from '../api';
import { useLanguage } from '../LanguageContext';

export default function Purchases() {
  const { t } = useLanguage();
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
    
    // 🚀 Optimistic: إغلاق النافذة وإضافة الطلب للقائمة فوراً
    setShowOrderModal(false);
    setOrders(prev => [tempOrder, ...prev]);
    setCurrentOrder({ items: [], notes: '' });

    try {
      await createPurchase(currentOrder);
      load(); // تحديث نهائي لجلب المعرف الحقيقي من قاعدة البيانات
    } catch (e) { 
      alert("خطأ في حفظ الطلب");
      load();
    }
  };

  const handleUpdateItem = (itemId, field, value) => {
    setViewingOrder(prev => {
        const newItems = prev.items.map(i => i.id === itemId ? { ...i, [field]: parseFloat(value) || 0 } : i);
        return { ...prev, items: newItems };
    });
  };

  const handleFinalize = async (id) => {
    if (!window.confirm("هل أنت متأكد من إتمام الجرد والشراء؟ سيتم تحديث المخزن وإضافة المصاريف.")) return;
    
    // 🚀 Optimistic Update: نغير الحالة محلياً ونغلق النافذة فوراً
    const orderToFinalize = viewingOrder;
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'completed' } : o));
    setViewingOrder(null);

    try {
        await updatePurchase(orderToFinalize.id, { items: orderToFinalize.items });
        await finalizePurchase(id);
        // التحديث الفعلي في الخلفية تم بنجاح
    } catch (e) { 
        alert("خطأ في إتمام العملية، سيتم إعادة تحديث البيانات");
        load(); // إعادة الجلب من السيرفر في حال الفشل
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
          <h2 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: 0 }}>🛒 {t("إدارة المشتريات")}</h2>
          <p style={{ color: 'var(--text-muted)', margin: "4px 0 0 0", fontSize: 14 }}>نظام الطلبات والجرد الذكي المتصل بالمخزن</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setShowOrderModal(true)} className="btn-primary">
            <span>+</span> طلب شراء جديد
          </button>
          <button onClick={load} className="btn-secondary">تحديث البيانات</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24 }}>
        {/* Left: Inventory Needs */}
        <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 20 }}>📦</span>
            <h3 className="section-title">حالة المخزن (النواقص)</h3>
          </div>
          
          <div className="table-container custom-scrollbar" style={{ maxHeight: 600 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>المادة</th>
                  <th>الموجود</th>
                  <th>الحد الأدنى</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => {
                  const isLow = (item.stock_quantity ?? item.stock) <= (item.min_quantity ?? item.min_stock);
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {isLow && <span style={{ color: 'var(--danger-text)' }}>⚠️</span>}
                          <span style={{ color: isLow ? 'var(--danger-text)' : 'white' }}>{item.name}</span>
                        </div>
                      </td>
                      <td style={{ color: isLow ? 'var(--danger-text)' : 'var(--success-text)', fontWeight: 700 }}>
                        {item.stock_quantity !== undefined ? item.stock_quantity : item.stock} <span style={{ fontSize: 10, opacity: 0.7 }}>{item.unit}</span>
                      </td>
                      <td>{item.min_quantity !== undefined ? item.min_quantity : item.min_stock}</td>
                      <td style={{ textAlign: 'left' }}>
                        {currentOrder.items.find(i => i.inventory_item_id === item.id) ? (
                          <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                            ✔️ تمت الإضافة
                          </button>
                        ) : (
                          <button onClick={() => addToOrder(item)} className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }}>
                            إضافة للطلب
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
            <h3 className="section-title">سجل الطلبات</h3>
          </div>

          <div className="custom-scrollbar" style={{ maxHeight: 600, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>لا توجد طلبات شراء مسجلة حالياً</div>
            ) : orders.map(order => (
              <div key={order.id} className="stat-card-container" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>طلب شراء #{order.id}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      📅 {new Date(order.created_at).toLocaleString('ar-EG')}
                    </div>
                  </div>
                  <span className={`badge badge-${order.status === 'pending' ? 'warning' : order.status === 'completed' ? 'success' : 'primary'}`}>
                    {order.status === 'pending' ? 'بانتظار الشراء' : order.status === 'completed' ? 'تم الإتمام' : 'قيد الجرد'}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                  <button onClick={() => setViewingOrder(order)} className="btn-primary" style={{ flex: 1, minHeight: 40, fontSize: 13, background: order.status === 'completed' ? 'var(--bg-surface)' : undefined }}>
                    {order.status === 'completed' ? '📄 عرض التفاصيل' : '🔍 جرد المواد'}
                  </button>
                  <button onClick={() => printOrder(order)} className="btn-secondary" style={{ minWidth: 44, padding: 0, justifyContent: 'center' }}>🖨️</button>
                  {order.status !== 'completed' && (
                    <button onClick={() => { if(window.confirm("حذف الطلب؟")) deletePurchase(order.id).then(load); }} className="btn-danger" style={{ minWidth: 44, padding: 0, justifyContent: 'center' }}>✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Order Modal */}
      {showOrderModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="modal-panel animate-fade" style={{ width: '100%', maxWidth: 700, padding: 32 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>🛒 إنشاء قائمة مشتريات</h3>
            
            <div className="table-container custom-scrollbar" style={{ maxHeight: 350, marginBottom: 24, background: 'rgba(0,0,0,0.2)', borderRadius: 14 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>المادة</th>
                    <th>الكمية</th>
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
                        }} className="btn-danger" style={{ padding: '4px 10px' }}>حذف</button>
                      </td>
                    </tr>
                  ))}
                  {currentOrder.items.length === 0 && (
                    <tr><td colSpan="3" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>أضف مواد من القائمة الجانبية أو مادة جديدة</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={addCustomItem} className="btn-ghost" style={{ marginRight: 'auto' }}>+ مادة جديدة</button>
              <button onClick={() => setShowOrderModal(false)} className="btn-secondary">إلغاء</button>
              <button onClick={handleSaveOrder} className="btn-primary" disabled={currentOrder.items.length === 0}>حفظ القائمة</button>
            </div>
          </div>
        </div>
      )}

      {/* View/Inventory Modal */}
      {viewingOrder && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="modal-panel animate-fade" style={{ width: '100%', maxWidth: 1000, padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
                {viewingOrder.status === 'completed' ? '📄 تفاصيل الفاتورة' : '🔍 جرد المواد المستلمة'}
              </h3>
              <button onClick={() => setViewingOrder(null)} className="btn-secondary" style={{ minHeight: 38 }}>إغلاق</button>
            </div>

            <div className="table-container custom-scrollbar" style={{ maxHeight: 450, background: 'rgba(0,0,0,0.2)', borderRadius: 14 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>المادة</th>
                    <th>المطلوب</th>
                    <th>الواصل فعلياً</th>
                    <th>سعر الوحدة</th>
                    <th>الإجمالي</th>
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
                        {viewingOrder.status === 'completed' ? `${item.price_per_unit.toLocaleString()} د.ع` : (
                          <input 
                            type="text" 
                            className="glass-input" 
                            style={{ width: 140, minHeight: 38 }}
                            value={item.price_per_unit ? Number(item.price_per_unit).toLocaleString() : ""}
                            onChange={(e) => handleUpdateItem(item.id, 'price_per_unit', e.target.value.replace(/\D/g, ""))}
                          />
                        )}
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--primary-light)' }}>
                        {((item.received_qty || 0) * (item.price_per_unit || 0)).toLocaleString()} د.ع
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: 24, borderRadius: 20, border: '1px solid var(--glass-border)' }}>
              <div>
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>المبلغ الإجمالي المستحق:</span>
                <div style={{ fontSize: 32, fontWeight: 900, color: 'white' }}>
                    {viewingOrder.items.reduce((sum, i) => sum + ((i.received_qty || 0) * (i.price_per_unit || 0)), 0).toLocaleString()} <span style={{ fontSize: 16 }}>د.ع</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {viewingOrder.status !== 'completed' && (
                  <>
                    <button onClick={() => updatePurchase(viewingOrder.id, { items: viewingOrder.items }).then(() => {
                         const event = new CustomEvent('show-toast', { detail: { message: "💾 تم حفظ الجرد مؤقتاً", type: "success" } });
                         window.dispatchEvent(event);
                    })} className="btn-secondary">حفظ المسودة</button>
                    <button onClick={() => handleFinalize(viewingOrder.id)} className="btn-primary" style={{ background: 'var(--success)' }}>إتمام الجرد والشراء ✔️</button>
                  </>
                )}
                <button onClick={() => printOrder(viewingOrder)} className="btn-secondary">🖨️ طباعة القائمة</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
