const express=require('express');
const originalSend=express.response.send;

// Fix the admin student-list counts at render time. The previous patch ran
// after the original page script, so the initial undefined values could remain.
// Replace loadStudents so it uses each student's authoritative detail record.
express.response.send=function(body){
  if(typeof body==='string'&&this.req&&this.req.path==='/admin.html'){
    const marker='async function loadStudents(){';
    const start=body.indexOf(marker);
    const endMarker='\nasync function show(id)';
    const end=start>=0?body.indexOf(endMarker,start):-1;
    if(start>=0&&end>start){
      const replacement=`async function loadStudents(){const a=await jsonFetch('/api/admin/students');const rows=await Promise.all(a.map(async s=>{let diagnoses=Number(s.diagnoses)||0;let patterns=Number(s.patterns)||0;let lastDate=s.last_date||'-';try{const x=await jsonFetch('/api/admin/students/'+encodeURIComponent(s.id));diagnoses=Array.isArray(x.diagnoses)?x.diagnoses.length:diagnoses;patterns=Array.isArray(x.patterns)?x.patterns.length:patterns;if(x.diagnoses?.length){lastDate=x.diagnoses.map(r=>r.date).filter(Boolean).sort().pop()||lastDate}}catch(e){console.warn('admin student count',e)}return \`<div class="student" data-student-id="\${Number(s.id)}" role="button" tabindex="0"><div><b>\${esc(s.name)}</b> · \${esc(s.username)}<br><small>자가진단 \${diagnoses}개 · 패턴 \${patterns}개 · 최근 \${esc(lastDate)}</small></div><button class="btn" type="button" data-view-id="\${Number(s.id)}">기록 보기</button></div>\`;}));$('#students').innerHTML=rows.length?rows.join(''):'학생이 없습니다.';document.querySelectorAll('[data-student-id]').forEach(el=>{el.addEventListener('click',e=>{if(!e.target.closest('button'))show(Number(el.dataset.studentId))});el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show(Number(el.dataset.studentId))}})});document.querySelectorAll('[data-view-id]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();show(Number(btn.dataset.viewId))}))}`;
      body=body.slice(0,start)+replacement+body.slice(end);
    }
  }
  return originalSend.call(this,body);
};
console.log('GREENSUM admin student count render fix loaded');