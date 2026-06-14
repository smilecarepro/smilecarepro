import{r as o,u as S,a as k,b as N,g as w,c as _,d as $,e as z,f as C,j as e}from"./index-UeEt6VtL.js";const c=({val:g,lbl:p,subMobile:i,subDesktop:d,color:a,icon:x})=>e.jsxs("div",{className:"glass-panel animate-fade stat-card-container",children:[e.jsxs("div",{className:"stat-card-top",children:[e.jsx("div",{className:"stat-card-icon",style:{background:`${a}15`,color:a},children:x}),d&&e.jsx("div",{className:"stat-card-badge desktop-only",style:{background:`${a}15`,color:a},dir:"ltr",children:d})]}),e.jsxs("div",{className:"stat-card-bottom",children:[e.jsx("div",{className:"stat-card-label",children:p}),e.jsx("div",{className:"stat-card-val",children:g}),i&&e.jsx("div",{className:"stat-card-sub mobile-only",style:{color:i.includes("د.ع")?a:"var(--success)"},dir:"ltr",children:i})]})]});function I(){const[g,p]=o.useState({}),[i,d]=o.useState({}),[a,x]=o.useState([]),[u,b]=o.useState([]),m=S(),{t:s}=k(),{settings:D}=N();o.useEffect(()=>{const t=new Date,h=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;w().then(l=>p(l||{})).catch(console.error),_(h).then(l=>x(l||[])).catch(console.error),$().then(l=>d(l||{})).catch(console.error),z().then(l=>{if(Array.isArray(l)){const v=l.filter(f=>f.stock<=f.min_stock);b(v)}else b([])}).catch(console.error)},[]);const{user:r}=C(),n=(r==null?void 0:r.role)==="secretary",[y,j]=o.useState(sessionStorage.getItem("dismissed_low_stock")==="true");return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:24},children:[u.length>0&&!y&&e.jsxs("div",{className:"glass-panel animate-fade",style:{background:"linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))",border:"1px solid rgba(239, 68, 68, 0.3)",padding:"16px 24px",borderRadius:20,display:"flex",flexDirection:"column",gap:12},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,color:"#ef4444",fontWeight:800,fontSize:16},children:[e.jsx("span",{children:"⚠️"})," ",s("تنبيه المخزن: مواد أوشكت على النفاذ")]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12},children:[e.jsxs("button",{onClick:()=>m("/inventory"),className:"view-all-btn",style:{fontWeight:700},children:[s("اذهب للمخزن")," ←"]}),e.jsx("button",{onClick:()=>{j(!0),sessionStorage.setItem("dismissed_low_stock","true")},style:{background:"rgba(255,255,255,0.1)",border:"none",color:"#ef4444",width:24,height:24,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10},children:"✕"})]})]}),e.jsx("div",{style:{display:"flex",flexWrap:"wrap",gap:10},children:u.map(t=>e.jsxs("div",{style:{background:"rgba(255,255,255,0.05)",padding:"6px 12px",borderRadius:10,fontSize:13,display:"flex",alignItems:"center",gap:8,border:"1px solid rgba(255,255,255,0.05)"},children:[e.jsx("span",{style:{fontWeight:700},children:t.name}),e.jsxs("span",{style:{color:"#ef4444",fontWeight:800},children:["(",t.stock," ",t.unit,")"]})]},t.id))})]}),e.jsxs("div",{className:"stats-grid",style:{gridTemplateColumns:i.commission_amount>0?"repeat(auto-fit, minmax(200px, 1fr))":void 0},children:[e.jsx(c,{icon:"📅",color:"#185FA5",lbl:s("مواعيد اليوم"),val:g.total_today||"0",subMobile:"من أمس +2",subDesktop:"+12%"}),e.jsx(c,{icon:"💰",color:"#10b981",lbl:s(n?"إيرادات اليوم":"إجمالي الإيرادات"),val:`${(n?i.collected_today||0:i.revenue||0).toLocaleString()} ${s("د")}`,subMobile:"Gross",subDesktop:i.commission_amount>0?`Rate: %${r.commission_rate}`:"+5.4%"}),i.commission_amount>0&&!n&&e.jsx(c,{icon:"🤝",color:"#f59e0b",lbl:s("عمولة المركز"),val:`${(i.commission_amount||0).toLocaleString()} ${s("د")}`,subMobile:"Center Share",subDesktop:`-%${r.commission_rate}`}),e.jsx(c,{icon:"💸",color:"#ef4444",lbl:s(n?"صرفيات اليوم":"المصاريف"),val:`${(n?i.expenses_today||0:i.expenses||0).toLocaleString()} ${s("د")}`,subMobile:"د.ع"}),!n&&e.jsx(c,{icon:"💎",color:"#00D2FF",lbl:s("صافي الربح"),val:`${(i.net_profit||0).toLocaleString()} ${s("د")}`,subMobile:i.commission_amount>0?"After Commission":"Net",subDesktop:"Stable"})]}),e.jsxs("div",{className:"home-main-grid",children:[e.jsxs("div",{className:"glass-panel home-section-card",children:[e.jsxs("div",{className:"home-section-header",children:[e.jsx("h3",{className:"section-title",children:s("جدول المواعيد الحالية")}),e.jsx("button",{onClick:()=>m("/appointments"),className:"view-all-btn",children:s("عرض الكل")})]}),e.jsx("div",{className:"apt-list",children:a.length===0?e.jsxs("div",{style:{textAlign:"center",padding:40,color:"var(--text-muted)"},children:[e.jsx("div",{style:{fontSize:40,marginBottom:12},children:"☕"}),s("لا توجد مواعيد متبقية لليوم")]}):a.map((t,h)=>e.jsxs("div",{className:"appointment-row",style:{display:"flex",alignItems:"center",gap:12,padding:"14px 0",borderBottom:h<a.length-1?"1px solid rgba(255,255,255,0.05)":"none"},children:[e.jsx("div",{style:{fontSize:11,padding:"4px 10px",borderRadius:12,fontWeight:600,flexShrink:0,background:t.status==="مكتمل"?"rgba(16,185,129,0.1)":"rgba(245,158,11,0.1)",color:t.status==="مكتمل"?"#10b981":"#f59e0b"},children:s(t.status)}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsx("div",{style:{fontSize:14,fontWeight:600,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:t.patient_name}),e.jsx("div",{style:{fontSize:11,color:"var(--text-muted)"},children:s(t.type)})]}),e.jsx("div",{style:{fontSize:13,fontWeight:600,color:"var(--accent)",flexShrink:0,direction:"ltr"},children:t.time})]},t.id))})]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:14},children:[e.jsxs("div",{className:"glass-panel home-section-card",children:[e.jsx("div",{className:"home-section-header",children:e.jsx("h3",{className:"section-title",children:s("الوصول السريع")})}),e.jsxs("div",{className:"quick-grid",children:[!n&&e.jsxs("button",{onClick:()=>m("/daily-summary"),className:"quick-action-btn",style:{gridColumn:"1/-1",background:"rgba(0, 210, 255, 0.08)",border:"1px solid rgba(0, 210, 255, 0.2)",padding:"20px"},children:[e.jsx("div",{className:"quick-icon-box",style:{background:"rgba(0, 210, 255, 0.2)",color:"#00D2FF",width:44,height:44,fontSize:22},children:"📊"}),e.jsxs("div",{style:{textAlign:"right"},children:[e.jsx("div",{style:{fontSize:15,fontWeight:800,color:"#00D2FF"},children:s("ملخص الجرد اليومي")}),e.jsx("div",{style:{fontSize:11,color:"rgba(0, 210, 255, 0.6)",marginTop:2},children:s("جرد المقبوضات والمصاريف والحالات اليوم")})]})]}),[{icon:"👤",label:"مريض جديد",path:"/patients",color:"#8B5CF6"},{icon:"📅",label:"موعد جديد",path:"/appointments",color:"#00D2FF"},{icon:"🧾",label:"فاتورة",path:"/invoices",color:"#10b981"},{icon:"📈",label:"التقارير",path:"/reports",color:"#f59e0b"}].map(t=>e.jsxs("button",{onClick:()=>m(t.path),className:"quick-action-btn",children:[e.jsx("div",{className:"quick-icon-box",style:{background:`${t.color}18`,color:t.color},children:t.icon}),e.jsx("span",{className:"quick-label",children:s(t.label)})]},t.path))]})]}),e.jsxs("div",{className:"glass-panel tip-card",children:[e.jsxs("div",{style:{fontSize:14,fontWeight:600,marginBottom:8},children:["💡 ",s("نصيحة اليوم")]}),e.jsx("p",{style:{fontSize:13,color:"var(--text-muted)",lineHeight:1.6,margin:0},children:s("تأكد من مراجعة الحالات الطبية المسجلة للمريض قبل البدء في أي إجراء جراحي اليوم.")})]})]})]}),e.jsx("style",{children:`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .home-main-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 20px;
          align-items: start;
        }

        .home-section-card {
          padding: 24px;
        }

        .home-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .quick-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 12px; 
        }

        /* ═══ MOBILE ═══ */
        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .home-main-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .quick-grid {
            grid-template-columns: 1fr;
          }
        }
      `})]})}export{I as default};
