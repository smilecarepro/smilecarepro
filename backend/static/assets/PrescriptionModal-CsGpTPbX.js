const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./index-DcjttJTH.js","./index-CxTWBb7u.css"])))=>i.map(i=>d[i]);
import{u as K,c as U,r as g,P as X,a3 as Z,a4 as D,j as e,_ as ee,l as te}from"./index-DcjttJTH.js";import{D as ie,g as ne}from"./DrugAdder-mt0mRGmI.js";const b=l=>{if(!l)return"";const s=String(l).toLowerCase();if(s.includes("once daily"))return l.replace(/Once daily/i,"مرة يومياً");if(s.includes("twice daily"))return l.replace(/Twice daily/i,"مرتين يومياً");if(s.includes("three times daily"))return l.replace(/Three times daily/i,"ثلاث مرات يومياً");if(s.includes("four times daily"))return l.replace(/Four times daily/i,"أربع مرات يومياً");if(s.includes("every 8 hours"))return l.replace(/Every 8 hours/i,"كل 8 ساعات");if(s.includes("every 12 hours"))return l.replace(/Every 12 hours/i,"كل 12 ساعة");if(s.includes("as needed"))return l.replace(/As needed/i,"عند اللزوم");if(s==="1 day")return"يوم واحد";if(s==="2 days")return"يومين";if(s==="3 days")return"3 أيام";if(s==="4 days")return"4 أيام";if(s==="5 days")return"5 أيام";if(s==="7 days"||s==="1 week")return"7 أيام";if(s==="10 days")return"10 أيام";if(s==="14 days"||s==="2 weeks")return"14 يوم";if(s==="21 days"||s==="3 weeks")return"21 يوم";if(s==="30 days"||s==="1 month")return"شهر واحد";let y=String(l);return y=y.replace(/\bmg\b/ig,"مجم"),y=y.replace(/\bml\b/ig,"مل"),y=y.replace(/\bg\b/ig,"جم"),y};function le({patient:l,onClose:s,onRefresh:y,existingData:r,isWizard:S=!1,onAdd:T,initialMeds:O,initialDiagnosis:E,isEditing:W=!1}){const{t:v}=K(),{getDynamicList:B}=U(),[N,z]=g.useState(S?1:0),[c,L]=g.useState({}),[a,k]=g.useState({name:(r==null?void 0:r.patient_name)||`${l.first_name} ${l.last_name}`,age:(r==null?void 0:r.age)||l.age,gender:(r==null?void 0:r.gender)||l.gender,date:(r==null?void 0:r.date)||new Date().toLocaleDateString("en-GB")}),[j,H]=g.useState((r==null?void 0:r.diagnosis)||E||""),[x,_]=g.useState(()=>{try{return(r!=null&&r.drugs_json?JSON.parse(r.drugs_json):O||[]).map(n=>({...n,dose:b(n.dose),timing:b(n.timing),duration:b(n.duration)}))}catch(t){return console.error("Prescription parsing error:",t),[]}}),[R,M]=g.useState([]),[J,G]=g.useState([]),[A,$]=g.useState(!1),[f,q]=g.useState(window.innerWidth<768),d=!!r&&!W;g.useEffect(()=>{const t=()=>q(window.innerWidth<768);return window.addEventListener("resize",t),()=>window.removeEventListener("resize",t)},[]),g.useEffect(()=>{X().then(L).catch(console.error),Z().then(t=>M(t||[])).catch(console.error),D().then(t=>G(t||[])).catch(console.error)},[]);function F(t){if(d)return;let n;const o=i=>({...i,dose:b(i.dose),timing:b(i.timing),duration:b(i.duration)});Array.isArray(t)?n=[...x,...t.map(o)]:n=[...x,o(t)],_(n),T&&T(n),z(0)}function Q(t){const n=t.target.value;if(!n)return;const o=R.find(i=>i.id==n);if(o){try{const m=JSON.parse(o.drugs_json||"[]").map(p=>{const u=J.find(h=>h.name===p.name);if(u){const h={...u};try{typeof h.doses=="string"&&(h.doses=JSON.parse(h.doses)),typeof h.warnings=="string"&&(h.warnings=JSON.parse(h.warnings))}catch{}p.warnings=ne(h,a)}else p.warnings=[];return{...p,dose:b(p.dose),timing:b(p.timing),duration:b(p.duration)}});F(m)}catch(i){console.error(i)}t.target.value=""}}function V(t){d||_(n=>n.filter((o,i)=>i!==t))}function C(t,n,o){d||_(i=>i.map((m,p)=>p===t?{...m,[n]:o}:m))}const I=()=>{const t=document.createElement("iframe");t.style.display="none",document.body.appendChild(t);const n=t.contentWindow.document;n.open();const o=x.map((i,m)=>{const p=i.form?{Tablets:"حبوب",Syrup:"شراب",Capsules:"كبسولات",Injection:"حقن",Cream:"كريم",Ointment:"مرهم",Drops:"قطرات",Gel:"جل",Mouthwash:"غسول فم",Spray:"بخاخ",Suspension:"معلق"}[i.form]||i.form:"";return i.warnings&&i.warnings.length>0&&i.warnings.map(u=>`
          <div style="padding: 2px 6px; border-radius: 4px; font-size: 11px; background: ${u.type==="red"?"#fee2e2":u.type==="amber"?"#fef3c7":"#e0f2fe"}; color: ${u.type==="red"?"#991b1b":u.type==="amber"?"#92400e":"#075985"}; display: flex; align-items: center; gap: 4px;">
            <span style="font-weight: 700;">⚠️ ${u.label}:</span>
            <span>${u.text}</span>
          </div>
        `).join(""),`
        <li style="margin-bottom: 12px; font-size: 14px; padding: 10px 12px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; list-style: none;">
           <div style="font-weight: 700; font-size: 15px; color: #1e293b; margin-bottom: 8px; display: flex; align-items: baseline; gap: 6px;">
             <span style="direction: ltr; display: inline-block;">${m+1}. ${i.name}</span>
             ${p?`<span style="font-weight: 400; font-size: 12px; color: #64748b;">(${p})</span>`:""}
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
      `}).join("");n.write(`
      <html>
        <head>
          <title>Prescription - ${a.name}</title>
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
            .rx-box { min-height: 300px; border: 1px solid #f1f5f9; border-radius: 8px; padding: 20px; margin-top: 20px; }
            .signature { margin-top: 40px; text-align: right; padding-right: 40px; }
            @page { size: A4 portrait; margin: 0; }
          </style>
        </head>
        <body>
          <div class="paper">
            ${c!=null&&c.prescription_header?`<img src="${c.prescription_header}" class="header-img" />`:'<div style="height: 120px; border-bottom: 1px solid #e2e8f0;"></div>'}
            
            <div class="content">
              <div class="patient-info">
                <div class="info-col">
                  <div class="info-row"><span class="label">اسم المريض:</span><span class="val">${a.name}</span></div>
                  <div style="display: flex; gap: 20px;">
                    <div class="info-row"><span class="label">العمر:</span><span class="val">${a.age}</span></div>
                    <div class="info-row"><span class="label">الجنس:</span><span class="val">${a.gender==="Male"?"ذكر":a.gender==="Female"?"أنثى":a.gender}</span></div>
                  </div>
                </div>
                <div class="info-row"><span class="label">التاريخ:</span><span class="val">${a.date}</span></div>
              </div>

              ${j?`<div style="font-size: 16px; margin-bottom: 20px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 5px;">${j}</div>`:""}

              <div class="rx-box">
                <div style="font-size: 28px; font-weight: 800; color: #1e293b; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; display: flex; align-items: center; gap: 10px; font-family: serif; font-style: italic;">
                  Rx
                </div>
                <ul style="padding: 0; margin: 0; list-style-type: none;">
                  ${o}
                </ul>
              </div>

              <div class="signature">
                <div style="font-weight: 600; margin-bottom: 40px;">توقيع الطبيب</div>
                <div style="border-top: 1px solid black; width: 150px; display: inline-block;"></div>
              </div>
            </div>

            ${c!=null&&c.prescription_footer?`<img src="${c.prescription_footer}" class="footer-img" />`:'<div style="height: 80px; border-top: 1px solid #e2e8f0; margin-top: auto;"></div>'}
          </div>
        </body>
      </html>
    `),n.close(),setTimeout(()=>{t.contentWindow.focus(),t.contentWindow.print(),setTimeout(()=>document.body.removeChild(t),1e3)},500)};async function Y(){if(!(d||x.length===0)){$(!0);try{if(/[\u0600-\u06FF]/.test(j)){alert("Arabic characters are NOT allowed in the diagnosis. Please use English only."),$(!1);return}const n={patient_id:l.id,diagnosis:j,drugs:x,custom_info:a};let o;if(W&&(r!=null&&r.id)){const{updatePrescription:i}=await ee(async()=>{const{updatePrescription:m}=await import("./index-DcjttJTH.js").then(p=>p.aQ);return{updatePrescription:m}},__vite__mapDeps([0,1]),import.meta.url);o=await i(r.id,n)}else o=await te(n);(o.ok||o.id)&&(I(),y(),s())}catch(t){alert("Error: "+t.message)}finally{$(!1)}}}return N===1?e.jsxs("div",{className:"animate-fade",style:{direction:"ltr",textAlign:"left"},children:[e.jsx("h3",{style:{marginBottom:20},children:"💊 Add Drugs to Prescription"}),e.jsx(ie,{patient:l,onAdd:F}),e.jsx("button",{className:"btn-ghost",style:{width:"100%",marginTop:20},onClick:()=>z(0),children:"Back to Preview"})]}):e.jsxs("div",{className:"animate-fade",style:{direction:"ltr",textAlign:"left",height:"100%",display:"flex",flexDirection:"column"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"flex-end",gap:10,marginBottom:15},children:[!d&&!S&&e.jsx("button",{className:"btn-primary",onClick:Y,disabled:A||x.length===0,children:A?"Saving...":"🖨 Save and Print"}),S&&e.jsxs(e.Fragment,{children:[e.jsxs("button",{className:"btn-ghost",onClick:I,disabled:x.length===0,style:{border:"1px solid #cbd5e1"},children:["🖨 ",v("طباعة الوصفة")]}),e.jsxs("button",{className:"btn-primary",onClick:s,style:{background:"var(--success)"},children:[v("متابعة للملخص")," →"]})]}),d&&e.jsxs("button",{className:"btn-primary",onClick:I,children:["🖨 ",v("طباعة سريعة")]}),!S&&e.jsx("button",{className:"btn-ghost",onClick:s,children:"Close"})]}),e.jsx("div",{style:{flex:1,display:"flex",justifyContent:"center",alignItems:"flex-start",overflowY:"auto",background:"rgba(0,0,0,0.4)",borderRadius:12,padding:f?"10px":"20px"},children:e.jsxs("div",{id:"prescription-paper",style:{width:"100%",maxWidth:f?"100%":"600px",height:"fit-content",minHeight:f?"auto":"800px",background:"white",color:"black",borderRadius:4,boxShadow:"0 10px 40px rgba(0,0,0,0.6)",position:"relative",padding:"0",display:"flex",flexDirection:"column",transform:f?"none":"scale(0.85)",transformOrigin:"top center",marginBottom:f?"0":"-100px"},children:[e.jsx("div",{style:{width:"100%",minHeight:f?80:120,background:"#f8fafc",borderBottom:"1px solid #e2e8f0"},children:c.prescription_header?e.jsx("img",{src:c.prescription_header,style:{width:"100%",maxHeight:180,objectFit:"contain"},alt:"Header"}):e.jsx("div",{style:{padding:40,textAlign:"center",color:"#94a3b8",fontSize:14},children:v("لا توجد صورة رأس للوصفة. يمكنك رفعها من الإعدادات.")})}),e.jsxs("div",{style:{padding:f?"20px 15px":"30px 50px",flex:1,display:"flex",flexDirection:"column"},children:[e.jsxs("div",{style:{display:"flex",flexDirection:f?"column":"row",justifyContent:"space-between",gap:f?15:0,marginBottom:30},children:[e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:10},children:[e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("span",{style:{fontWeight:600},children:"اسم المريض:"}),e.jsx("input",{readOnly:d,value:a.name,onChange:t=>k({...a,name:t.target.value}),style:{...w,width:f?"100%":"auto"}})]}),e.jsxs("div",{style:{display:"flex",gap:20},children:[e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("span",{style:{fontWeight:600},children:"العمر:"}),e.jsx("input",{readOnly:d,type:"number",value:a.age,onChange:t=>k({...a,age:t.target.value}),style:{...w,width:50}})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("span",{style:{fontWeight:600},children:"الجنس:"}),e.jsxs("select",{disabled:d,value:a.gender,onChange:t=>k({...a,gender:t.target.value}),style:w,children:[e.jsx("option",{value:"Male",children:"ذكر"}),e.jsx("option",{value:"Female",children:"أنثى"})]})]})]})]}),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("span",{style:{fontWeight:600},children:"التاريخ:"}),e.jsx("input",{readOnly:d,type:"text",value:a.date,onChange:t=>k({...a,date:t.target.value}),style:{...w,width:100}})]})]}),e.jsx("div",{style:{marginBottom:20,display:"flex",gap:10,alignItems:"center"},children:e.jsx("input",{readOnly:d,placeholder:"التشخيص / الملاحظات...",value:j,onChange:t=>H(t.target.value),style:{...w,flex:1,fontSize:16,borderBottom:"1px dashed #cbd5e1",width:"100%"}})}),e.jsxs("div",{style:{position:"relative",minHeight:300,border:"1px solid #f1f5f9",borderRadius:8,padding:f?"25px 10px 15px 10px":20},children:[e.jsx("div",{style:{fontSize:28,fontWeight:800,color:"#1e293b",marginBottom:20,borderBottom:"2px solid #e2e8f0",paddingBottom:10,display:"flex",alignItems:"center",gap:10,fontFamily:"serif",fontStyle:"italic"},children:"Rx"}),e.jsx("ul",{style:{listStyleType:"none",paddingLeft:0,margin:0},children:x.map((t,n)=>{const o=t.form?{Tablets:"حبوب",Syrup:"شراب",Capsules:"كبسولات",Injection:"حقن",Cream:"كريم",Ointment:"مرهم",Drops:"قطرات",Gel:"جل",Mouthwash:"غسول فم",Spray:"بخاخ",Suspension:"معلق"}[t.form]||t.form:"";return e.jsx("li",{style:{marginBottom:12,fontSize:14,position:"relative",padding:"10px 12px",borderRadius:8,background:"#f8fafc",border:"1px solid #e2e8f0"},children:e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8},children:[e.jsxs("div",{style:{flex:1},children:[e.jsxs("div",{style:{fontWeight:700,fontSize:15,color:"#1e293b",marginBottom:8,display:"flex",alignItems:"baseline",gap:6},children:[e.jsxs("span",{style:{direction:"ltr",display:"inline-block"},children:[n+1,". ",t.name]}),o&&e.jsxs("span",{style:{fontWeight:400,fontSize:12,color:"#64748b"},children:["(",o,")"]})]}),e.jsxs("div",{style:{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:[e.jsx("span",{style:{fontSize:11,color:"#64748b",fontWeight:600},children:"الجرعة:"}),d?e.jsx("span",{style:{fontSize:13,color:"#334155"},children:t.dose}):e.jsx("select",{value:t.dose,onChange:i=>C(n,"dose",i.target.value),style:P,children:(t.doseOptions||[t.dose]).map(i=>e.jsx("option",{value:i,children:i},i))})]}),e.jsx("span",{style:{color:"#cbd5e1"},children:"·"}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:[e.jsx("span",{style:{fontSize:11,color:"#64748b",fontWeight:600},children:"التكرار:"}),d?e.jsx("span",{style:{fontSize:13,color:"#334155"},children:t.timing}):e.jsx("select",{value:t.timing,onChange:i=>C(n,"timing",i.target.value),style:P,children:B("med_frequencies",["مرة يومياً","مرتين يومياً","ثلاث مرات يومياً","أربع مرات يومياً","كل 8 ساعات","كل 12 ساعة","عند اللزوم"]).map(i=>e.jsx("option",{value:i,children:i},i))})]}),e.jsx("span",{style:{color:"#cbd5e1"},children:"·"}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:[e.jsx("span",{style:{fontSize:11,color:"#64748b",fontWeight:600},children:"المدة:"}),d?e.jsx("span",{style:{fontSize:13,color:"#334155"},children:t.duration}):e.jsx("select",{value:t.duration,onChange:i=>C(n,"duration",i.target.value),style:P,children:B("med_durations",["يوم واحد","يومين","3 أيام","4 أيام","5 أيام","7 أيام","10 أيام","14 يوم","21 يوم","شهر واحد"]).map(i=>e.jsx("option",{value:i,children:i},i))})]})]}),e.jsxs("div",{style:{display:"flex",flexWrap:"wrap",alignItems:"center",gap:12,marginTop:8},children:[t.meal_timing&&t.meal_timing!=="لا يهم"&&e.jsxs("div",{style:{fontSize:12,color:"#eab308",fontWeight:"bold"},children:["التوقيت: ",t.meal_timing]}),t.note&&e.jsxs("div",{style:{fontSize:12,color:"#64748b",fontStyle:"italic"},children:["ملاحظة: ",t.note]}),t.warnings&&t.warnings.map((i,m)=>e.jsxs("div",{style:{padding:"2px 6px",borderRadius:4,fontSize:11,background:i.type==="red"?"#fee2e2":i.type==="amber"?"#fef3c7":"#e0f2fe",color:i.type==="red"?"#991b1b":i.type==="amber"?"#92400e":"#075985",display:"flex",alignItems:"center",gap:4},children:[e.jsxs("span",{style:{fontWeight:700},children:["⚠️ ",i.label,":"]}),e.jsx("span",{children:i.text})]},m))]})]}),!d&&e.jsx("button",{onClick:()=>V(n),style:{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:16},children:"🗑"})]})},n)})}),!d&&e.jsxs("div",{style:{display:"flex",gap:12,marginTop:20},children:[e.jsx("button",{onClick:()=>z(1),style:{flex:1,padding:20,border:"2px dashed #cbd5e1",borderRadius:12,background:"none",cursor:"pointer",color:"#94a3b8",display:x.length>5?"none":"block"},children:"+ اضغط هنا لإضافة أدوية"}),e.jsxs("select",{onChange:Q,style:{flex:1,padding:20,border:"2px dashed #cbd5e1",borderRadius:12,background:"none",cursor:"pointer",color:"#94a3b8",outline:"none"},children:[e.jsx("option",{value:"",children:"🌟 قوالب جاهزة..."}),R.map(t=>e.jsx("option",{value:t.id,children:t.name},t.id))]})]})]}),e.jsxs("div",{style:{marginTop:40,textAlign:"right",paddingRight:40},children:[e.jsx("div",{style:{fontWeight:600,marginBottom:40},children:"توقيع الطبيب"}),e.jsx("div",{style:{borderTop:"1px solid black",width:150,display:"inline-block"}})]})]}),e.jsx("div",{style:{width:"100%",minHeight:80,background:"#f8fafc",borderTop:"1px solid #e2e8f0"},children:c.prescription_footer?e.jsx("img",{src:c.prescription_footer,style:{width:"100%",maxHeight:120,objectFit:"contain"},alt:"Footer"}):e.jsx("div",{style:{padding:20,textAlign:"center",color:"#94a3b8",fontSize:12},children:v("لا توجد صورة تذييل للوصفة.")})})]})}),e.jsx("style",{children:`
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
      `})]})}const w={fontSize:"14px",color:"black",borderBottom:"1px solid transparent",transition:"all 0.2s"},P={fontSize:"13px",color:"#1e293b",background:"white",border:"1px solid #cbd5e1",borderRadius:"6px",padding:"2px 6px",cursor:"pointer",fontFamily:"inherit"};export{le as P};
