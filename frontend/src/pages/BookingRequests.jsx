import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBookingRequests, deleteBookingRequest } from '../api';

export default function BookingRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // تحديث كل 30 ثانية
    return () => clearInterval(interval);
  }, []);

  const load = () => {
    setLoading(true);
    getBookingRequests()
      .then(data => setRequests(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleConfirm = (req) => {
    console.log("--- NAVIGATING TO APPOINTMENTS WITH PARAMS ---", req);
    // استخدام Query Params لضمان الوصول
    const params = new URLSearchParams({
      autoOpen: 'true',
      patientName: req.patient_name,
      date: req.requested_date,
      whatsappRequestId: req.id,
      phone: req.phone
    }).toString();
    
    navigate(`/appointments?${params}`);
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: '#fff', margin: 0 }}>📋 طلبات الحجز من الواتساب</h2>
        <button onClick={load} className="glass-btn" style={{ padding: '8px 15px' }}>تحديث</button>
      </div>

      {loading ? (
        <div style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>جاري التحميل...</div>
      ) : requests.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 50, color: '#aaa' }}>
          لا توجد طلبات حجز معلقة حالياً
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {requests.map(r => (
            <div key={r.id} className="glass-card" style={{ position: 'relative' }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 5 }}>{r.patient_name}</div>
              <div style={{ color: '#00d4ff', marginBottom: 10 }}>📱 {r.phone}</div>
              <div style={{ fontSize: 14, color: '#ccc', marginBottom: 15 }}>
                📅 اليوم المطلوب: <strong>{r.requested_date}</strong>
              </div>
              <div style={{ fontSize: 13, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8, marginBottom: 15, border: '1px solid rgba(255,255,255,0.1)' }}>
                📝 {r.notes || "لا توجد ملاحظات"}
              </div>
              
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  onClick={() => handleConfirm(r)}
                  className="glass-btn" 
                  style={{ flex: 1, backgroundColor: 'rgba(0, 212, 255, 0.2)', color: '#00d4ff' }}
                >
                  تأكيد الحجز
                </button>
                <button 
                  onClick={() => { if(window.confirm("حذف الطلب؟")) deleteBookingRequest(r.id).then(load); }}
                  style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid rgba(255,100,100,0.3)', backgroundColor: 'rgba(255,100,100,0.1)', color: '#ff6464', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
