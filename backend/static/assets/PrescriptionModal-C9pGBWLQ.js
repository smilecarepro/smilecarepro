const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./index-C7exSyMl.js","./index-CxTWBb7u.css"])))=>i.map(i=>d[i]);
import{u as Y,c as K,r as c,P as U,a3 as X,a4 as Z,j as e,_ as D,l as ee}from"./index-C7exSyMl.js";import{D as te,g as ne}from"./DrugAdder-BcZEY-S4.js";function re({patient:y,onClose:j,onRefresh:R,existingData:o,isWizard:b=!1,onAdd:C,initialMeds:B,initialDiagnosis:E,isEditing:P=!1}){const{t:m}=Y(),{getDynamicList:W}=K(),[F,w]=c.useState(b?1:0),[d,O]=c.useState({}),[r,v]=c.useState({name:(o==null?void 0:o.patient_name)||`${y.first_name} ${y.last_name}`,age:(o==null?void 0:o.age)||y.age,gender:(o==null?void 0:o.gender)||y.gender,date:(o==null?void 0:o.date)||new Date().toLocaleDateString("en-GB")}),[h,L]=c.useState((o==null?void 0:o.diagnosis)||E||""),[f,S]=c.useState(()=>{try{return o!=null&&o.drugs_json?JSON.parse(o.drugs_json):B||[]}catch(t){return console.error("Prescription parsing error:",t),[]}}),[T,H]=c.useState([]),[M,J]=c.useState([]),[I,k]=c.useState(!1),[p,q]=c.useState(window.innerWidth<768),l=!!o&&!P;c.useEffect(()=>{const t=()=>q(window.innerWidth<768);return window.addEventListener("resize",t),()=>window.removeEventListener("resize",t)},[]),c.useEffect(()=>{U().then(O).catch(console.error),X().then(t=>H(t||[])).catch(console.error),Z().then(t=>J(t||[])).catch(console.error)},[]);function A(t){if(l)return;let s;Array.isArray(t)?s=[...f,...t]:s=[...f,t],S(s),C&&C(s),w(0)}function G(t){const s=t.target.value;if(!s)return;const n=T.find(i=>i.id==s);if(n){try{const x=JSON.parse(n.drugs_json||"[]").map(a=>{const N=M.find(g=>g.name===a.name);if(N){const g={...N};try{typeof g.doses=="string"&&(g.doses=JSON.parse(g.doses)),typeof g.warnings=="string"&&(g.warnings=JSON.parse(g.warnings))}catch{}a.warnings=ne(g,r)}else a.warnings=[];return a});A(x)}catch(i){console.error(i)}t.target.value=""}}function Q(t){l||S(s=>s.filter((n,i)=>i!==t))}function z(t,s,n){l||S(i=>i.map((x,a)=>a===t?{...x,[s]:n}:x))}const _=()=>{const t=document.createElement("iframe");t.style.display="none",document.body.appendChild(t);const s=t.contentWindow.document;s.open();const n=f.map((i,x)=>(i.warnings&&i.warnings.length>0&&i.warnings.map(a=>`
          <div style="padding: 2px 6px; border-radius: 4px; font-size: 11px; background: ${a.type==="red"?"#fee2e2":a.type==="amber"?"#fef3c7":"#e0f2fe"}; color: ${a.type==="red"?"#991b1b":a.type==="amber"?"#92400e":"#075985"}; display: flex; align-items: center; gap: 4px;">
            <span style="font-weight: 700;">⚠️ ${a.label}:</span>
            <span>${a.text}</span>
          </div>
        `).join(""),`
        <li style="margin-bottom: 12px; font-size: 14px; padding: 10px 12px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; list-style: none;">
           <div style="font-weight: 700; font-size: 15px; color: #1e293b; margin-bottom: 8px;">
             ${x+1}. ${i.name} <span style="font-weight: 400; font-size: 12px; color: #64748b; margin-left: 6px;">(${i.form})</span>
           </div>
           <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
             <div style="display: flex; align-items: center; gap: 4px;">
               <span style="font-size: 11px; color: #64748b; font-weight: 600;">الجرعة:</span>
               <span style="font-size: 13px; color: #334155;">${i.dose}</span>
             </div>
             <span style="color: #cbd5e1;">&middot;</span>
             <div style="display: flex; align-items: center; gap: 4px;">
               <span style="font-size: 11px; color: #64748b; font-weight: 600;">التكرار:</span>
               <span style="font-size: 13px; color: #334155;">${i.timing}</span>
             </div>
             <span style="color: #cbd5e1;">&middot;</span>
             <div style="display: flex; align-items: center; gap: 4px;">
               <span style="font-size: 11px; color: #64748b; font-weight: 600;">المدة:</span>
               <span style="font-size: 13px; color: #334155;">${i.duration}</span>
             </div>
           </div>
           
           <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 8px;">
             ${i.meal_timing&&i.meal_timing!=="لا يهم"?`<div style="font-size: 12px; color: #eab308; font-weight: bold;">التوقيت: ${i.meal_timing}</div>`:""}
             ${i.note?`<div style="font-size: 12px; color: #64748b; font-style: italic;">ملاحظة: ${i.note}</div>`:""}
           </div>
        </li>
      `)).join("");s.write(`
      <html>
        <head>
          <title>Prescription - ${r.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #333; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .paper { width: 100%; max-width: 210mm; min-height: 297mm; margin: 0 auto; display: flex; flex-direction: column; }
            .header-img { width: 100%; max-height: 180px; object-fit: contain; }
            .footer-img { width: 100%; max-height: 120px; object-fit: contain; margin-top: auto; }
            .content { padding: 30px 50px; flex: 1; }
            .patient-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .info-col { display: flex; flex-direction: column; gap: 10px; }
            .info-row { display: flex; gap: 8px; align-items: center; }
            .label { font-weight: 600; font-size: 14px; }
            .val { font-size: 14px; border-bottom: 1px solid transparent; }
            .rx-box { position: relative; min-height: 300px; border: 1px solid #f1f5f9; border-radius: 8px; padding: 20px; margin-top: 20px; }
            .rx-mark { position: absolute; top: 10px; left: 15px; font-size: 32px; font-weight: 800; opacity: 0.1; }
            .signature { margin-top: 40px; text-align: right; padding-right: 40px; }
            @page { size: A4 portrait; margin: 0; }
          </style>
        </head>
        <body>
          <div class="paper">
            ${d!=null&&d.prescription_header?`<img src="${d.prescription_header}" class="header-img" />`:'<div style="height: 120px; border-bottom: 1px solid #e2e8f0;"></div>'}
            
            <div class="content">
              <div class="patient-info">
                <div class="info-col">
                  <div class="info-row"><span class="label">اسم المريض:</span><span class="val">${r.name}</span></div>
                  <div style="display: flex; gap: 20px;">
                    <div class="info-row"><span class="label">العمر:</span><span class="val">${r.age}</span></div>
                    <div class="info-row"><span class="label">الجنس:</span><span class="val">${r.gender==="Male"?"ذكر":r.gender==="Female"?"أنثى":r.gender}</span></div>
                  </div>
                </div>
                <div class="info-row"><span class="label">التاريخ:</span><span class="val">${r.date}</span></div>
              </div>

              ${h?`<div style="font-size: 16px; margin-bottom: 20px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 5px;">${h}</div>`:""}

              <div class="rx-box">
                <div class="rx-mark">الوصفة</div>
                <ul style="padding: 0; margin: 0;">
                  ${n}
                </ul>
              </div>

              <div class="signature">
                <div style="font-weight: 600; margin-bottom: 40px;">توقيع الطبيب</div>
                <div style="border-top: 1px solid black; width: 150px; display: inline-block;"></div>
              </div>
            </div>

            ${d!=null&&d.prescription_footer?`<img src="${d.prescription_footer}" class="footer-img" />`:'<div style="height: 80px; border-top: 1px solid #e2e8f0; margin-top: auto;"></div>'}
          </div>
        </body>
      </html>
    `),s.close(),setTimeout(()=>{t.contentWindow.focus(),t.contentWindow.print(),setTimeout(()=>document.body.removeChild(t),1e3)},500)};async function V(){if(!(l||f.length===0)){k(!0);try{if(/[\u0600-\u06FF]/.test(h)){alert("Arabic characters are NOT allowed in the diagnosis. Please use English only."),k(!1);return}const s={patient_id:y.id,diagnosis:h,drugs:f,custom_info:r};let n;if(P&&(o!=null&&o.id)){const{updatePrescription:i}=await D(async()=>{const{updatePrescription:x}=await import("./index-C7exSyMl.js").then(a=>a.aQ);return{updatePrescription:x}},__vite__mapDeps([0,1]),import.meta.url);n=await i(o.id,s)}else n=await ee(s);(n.ok||n.id)&&(_(),R(),j())}catch(t){alert("Error: "+t.message)}finally{k(!1)}}}return F===1?e.jsxs("div",{className:"animate-fade",style:{direction:"ltr",textAlign:"left"},children:[e.jsx("h3",{style:{marginBottom:20},children:"💊 Add Drugs to Prescription"}),e.jsx(te,{patient:y,onAdd:A}),e.jsx("button",{className:"btn-ghost",style:{width:"100%",marginTop:20},onClick:()=>w(0),children:"Back to Preview"})]}):e.jsxs("div",{className:"animate-fade",style:{direction:"ltr",textAlign:"left",height:"100%",display:"flex",flexDirection:"column"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"flex-end",gap:10,marginBottom:15},children:[!l&&!b&&e.jsx("button",{className:"btn-primary",onClick:V,disabled:I||f.length===0,children:I?"Saving...":"🖨 Save and Print"}),b&&e.jsxs(e.Fragment,{children:[e.jsxs("button",{className:"btn-ghost",onClick:_,disabled:f.length===0,style:{border:"1px solid #cbd5e1"},children:["🖨 ",m("طباعة الوصفة")]}),e.jsxs("button",{className:"btn-primary",onClick:j,style:{background:"var(--success)"},children:[m("متابعة للملخص")," →"]})]}),l&&e.jsxs("button",{className:"btn-primary",onClick:_,children:["🖨 ",m("طباعة سريعة")]}),!b&&e.jsx("button",{className:"btn-ghost",onClick:j,children:"Close"})]}),e.jsx("div",{style:{flex:1,display:"flex",justifyContent:"center",alignItems:"flex-start",overflowY:"auto",background:"rgba(0,0,0,0.4)",borderRadius:12,padding:p?"10px":"20px"},children:e.jsxs("div",{id:"prescription-paper",style:{width:"100%",maxWidth:p?"100%":"600px",height:"fit-content",minHeight:p?"auto":"800px",background:"white",color:"black",borderRadius:4,boxShadow:"0 10px 40px rgba(0,0,0,0.6)",position:"relative",padding:"0",display:"flex",flexDirection:"column",transform:p?"none":"scale(0.85)",transformOrigin:"top center",marginBottom:p?"0":"-100px"},children:[e.jsx("div",{style:{width:"100%",minHeight:p?80:120,background:"#f8fafc",borderBottom:"1px solid #e2e8f0"},children:d.prescription_header?e.jsx("img",{src:d.prescription_header,style:{width:"100%",maxHeight:180,objectFit:"contain"},alt:"Header"}):e.jsx("div",{style:{padding:40,textAlign:"center",color:"#94a3b8",fontSize:14},children:m("لا توجد صورة رأس للوصفة. يمكنك رفعها من الإعدادات.")})}),e.jsxs("div",{style:{padding:p?"20px 15px":"30px 50px",flex:1,display:"flex",flexDirection:"column"},children:[e.jsxs("div",{style:{display:"flex",flexDirection:p?"column":"row",justifyContent:"space-between",gap:p?15:0,marginBottom:30},children:[e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:10},children:[e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("span",{style:{fontWeight:600},children:"اسم المريض:"}),e.jsx("input",{readOnly:l,value:r.name,onChange:t=>v({...r,name:t.target.value}),style:{...u,width:p?"100%":"auto"}})]}),e.jsxs("div",{style:{display:"flex",gap:20},children:[e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("span",{style:{fontWeight:600},children:"العمر:"}),e.jsx("input",{readOnly:l,type:"number",value:r.age,onChange:t=>v({...r,age:t.target.value}),style:{...u,width:50}})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("span",{style:{fontWeight:600},children:"الجنس:"}),e.jsxs("select",{disabled:l,value:r.gender,onChange:t=>v({...r,gender:t.target.value}),style:u,children:[e.jsx("option",{value:"Male",children:"ذكر"}),e.jsx("option",{value:"Female",children:"أنثى"})]})]})]})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("span",{style:{fontWeight:600},children:"التاريخ:"}),e.jsx("input",{readOnly:l,type:"text",value:r.date,onChange:t=>v({...r,date:t.target.value}),style:{...u,width:100}})]})]}),e.jsx("div",{style:{marginBottom:20,display:"flex",gap:10,alignItems:"center"},children:e.jsx("input",{readOnly:l,placeholder:"التشخيص / الملاحظات...",value:h,onChange:t=>L(t.target.value),style:{...u,flex:1,fontSize:16,borderBottom:"1px dashed #cbd5e1",width:"100%"}})}),e.jsxs("div",{style:{position:"relative",minHeight:300,border:"1px solid #f1f5f9",borderRadius:8,padding:p?"25px 10px 15px 10px":20},children:[e.jsx("div",{style:{position:"absolute",top:10,left:15,fontSize:32,fontWeight:800,opacity:.1},children:"الوصفة"}),e.jsx("ul",{style:{listStyleType:"none",paddingLeft:0,margin:0},children:f.map((t,s)=>e.jsx("li",{style:{marginBottom:12,fontSize:14,position:"relative",padding:"10px 12px",borderRadius:8,background:"#f8fafc",border:"1px solid #e2e8f0"},children:e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8},children:[e.jsxs("div",{style:{flex:1},children:[e.jsxs("div",{style:{fontWeight:700,fontSize:15,color:"#1e293b",marginBottom:8},children:[s+1,". ",t.name,e.jsxs("span",{style:{fontWeight:400,fontSize:12,color:"#64748b",marginLeft:6},children:["(",t.form,")"]})]}),e.jsxs("div",{style:{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:[e.jsx("span",{style:{fontSize:11,color:"#64748b",fontWeight:600},children:"الجرعة:"}),l?e.jsx("span",{style:{fontSize:13,color:"#334155"},children:t.dose}):e.jsx("select",{value:t.dose,onChange:n=>z(s,"dose",n.target.value),style:$,children:(t.doseOptions||[t.dose]).map(n=>e.jsx("option",{value:n,children:n},n))})]}),e.jsx("span",{style:{color:"#cbd5e1"},children:"·"}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:[e.jsx("span",{style:{fontSize:11,color:"#64748b",fontWeight:600},children:"Frequency:"}),l?e.jsx("span",{style:{fontSize:13,color:"#334155"},children:t.timing}):e.jsx("select",{value:t.timing,onChange:n=>z(s,"timing",n.target.value),style:$,children:W("med_frequencies",["Once daily","Twice daily","Three times daily","Four times daily","Every 8 hours","Every 12 hours","As needed"]).map(n=>e.jsx("option",{value:n,children:n},n))})]}),e.jsx("span",{style:{color:"#cbd5e1"},children:"·"}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:[e.jsx("span",{style:{fontSize:11,color:"#64748b",fontWeight:600},children:"المدة:"}),l?e.jsx("span",{style:{fontSize:13,color:"#334155"},children:t.duration}):e.jsx("select",{value:t.duration,onChange:n=>z(s,"duration",n.target.value),style:$,children:W("med_durations",["1 day","2 days","3 days","4 days","5 days","7 days","10 days","14 days","21 days","30 days"]).map(n=>e.jsx("option",{value:n,children:n},n))})]})]}),e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",alignItems:"center",gap:12,marginTop:8},children:[t.meal_timing&&t.meal_timing!=="لا يهم"&&e.jsxs("div",{style:{fontSize:12,color:"#eab308",fontWeight:"bold"},children:["التوقيت: ",t.meal_timing]}),t.note&&e.jsxs("div",{style:{fontSize:12,color:"#64748b",fontStyle:"italic"},children:["ملاحظة: ",t.note]}),t.warnings&&t.warnings.map((n,i)=>e.jsxs("div",{style:{padding:"2px 6px",borderRadius:4,fontSize:11,background:n.type==="red"?"#fee2e2":n.type==="amber"?"#fef3c7":"#e0f2fe",color:n.type==="red"?"#991b1b":n.type==="amber"?"#92400e":"#075985",display:"flex",alignItems:"center",gap:4},children:[e.jsxs("span",{style:{fontWeight:700},children:["⚠️ ",n.label,":"]}),e.jsx("span",{children:n.text})]},i))]})]}),!l&&e.jsx("button",{onClick:()=>Q(s),className:"delete-btn",style:{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:16,flexShrink:0},children:"✕"})]})},s))}),!l&&e.jsxs("div",{style:{display:"flex",gap:12,marginTop:20},children:[e.jsx("button",{onClick:()=>w(1),style:{flex:1,padding:20,border:"2px dashed #cbd5e1",borderRadius:12,background:"none",cursor:"pointer",color:"#94a3b8",display:f.length>5?"none":"block"},children:"+ اضغط هنا لإضافة أدوية"}),e.jsxs("select",{onChange:G,style:{flex:1,padding:20,border:"2px dashed #cbd5e1",borderRadius:12,background:"none",cursor:"pointer",color:"#94a3b8",outline:"none"},children:[e.jsx("option",{value:"",children:"🌟 قوالب جاهزة..."}),T.map(t=>e.jsx("option",{value:t.id,children:t.name},t.id))]})]})]}),e.jsxs("div",{style:{marginTop:40,textAlign:"right",paddingRight:40},children:[e.jsx("div",{style:{fontWeight:600,marginBottom:40},children:"توقيع الطبيب"}),e.jsx("div",{style:{borderTop:"1px solid black",width:150,display:"inline-block"}})]})]}),e.jsx("div",{style:{width:"100%",minHeight:80,background:"#f8fafc",borderTop:"1px solid #e2e8f0"},children:d.prescription_footer?e.jsx("img",{src:d.prescription_footer,style:{width:"100%",maxHeight:120,objectFit:"contain"},alt:"Footer"}):e.jsx("div",{style:{padding:20,textAlign:"center",color:"#94a3b8",fontSize:12},children:m("لا توجد صورة تذييل للوصفة.")})})]})}),e.jsx("style",{children:`
        #prescription-paper input, #prescription-paper select {
          border: none;
          background: transparent;
          color: black;
          font-family: inherit;
          padding: 2px 4px;
        }
        #prescription-paper input:hover, #prescription-paper select:hover {
          background: #f1f5f9;
        }
        #prescription-paper input:focus {
          outline: none;
          background: #f1f5f9;
          border-bottom: 1px solid #185FA5;
        }
        .delete-btn { opacity: 0; transition: opacity 0.2s; }
        li:hover .delete-btn { opacity: 1; }
      `})]})}const u={fontSize:"14px",color:"black",borderBottom:"1px solid transparent",transition:"all 0.2s"},$={fontSize:"13px",color:"#1e293b",background:"white",border:"1px solid #cbd5e1",borderRadius:"6px",padding:"2px 6px",cursor:"pointer",fontFamily:"inherit"};export{re as P};
