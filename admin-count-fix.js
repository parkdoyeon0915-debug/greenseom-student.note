const express=require('express');
const originalSend=express.response.send;

// Render the live admin student list with real record counts and bind the kick
// action directly to the generated button. Do not rely on inline onclick for
// the kick button because the live page has had click interception issues.
express.response.send=function(body){
  if(typeof body==='string'&&this.req&&this.req.path==='/admin.html'){
    const marker='async function init(){';
    const endMarker='\ninit();';
    const start=body.indexOf(marker);
    const end=start>=0?body.indexOf(endMarker,start):-1;
    if(start>=0&&end>start){
      const replacement=`async function init(){
const m=await(await fetch('/api/me',{credentials:'same-origin',cache:'no-store'})).json();
if(!m.user||m.user.role!=='admin')return location.href='/';
const a=await(await fetch('/api/admin/students',{credentials:'same-origin',cache:'no-store'})).json();
const rows=await Promise.all(a.map(async s=>{
  let diagnoses=Number(s.diagnoses)||0;
  let patterns=Number(s.patterns)||0;
  let lastDate=s.last_date||'-';
  try{
    const x=await(await fetch('/api/admin/students/'+encodeURIComponent(s.id),{credentials:'same-origin',cache:'no-store'})).json();
    if(Array.isArray(x.diagnoses)){
      diagnoses=x.diagnoses.length;
      const dates=x.diagnoses.map(r=>r.date).filter(Boolean).sort();
      if(dates.length)lastDate=dates[dates.length-1];
    }
    if(Array.isArray(x.patterns))patterns=x.patterns.length;
  }catch(e){console.warn('admin student count',s.id,e)}
  return '<div class="student" data-student-id="'+Number(s.id)+'"><div class="student-info" data-show-id="'+Number(s.id)+'" style="flex:1;cursor:pointer"><b>'+esc(s.name)+'</b> · '+esc(s.username)+'<br><small>자가진단 '+diagnoses+'개 · 패턴 '+patterns+'개 · 최근 '+esc(lastDate)+'</small></div><div class="student-actions" style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn view-record" data-show-id="'+Number(s.id)+'">기록 보기</button><button type="button" class="btn danger kick-student" data-kick-id="'+Number(s.id)+'" data-kick-name="'+esc(s.name)+'">강퇴</button></div></div>';
}));
const students=document.querySelector('#students');
students.innerHTML=rows.length?rows.join(''):'학생이 없습니다.';
students.querySelectorAll('.student-info,.view-record').forEach(el=>{
  el.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();show(Number(this.dataset.showId));});
});
students.querySelectorAll('.kick-student').forEach(btn=>{
  btn.addEventListener('click',function(e){
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    kickStudent(Number(this.dataset.kickId),this.dataset.kickName||'학생');
  });
});
await loadTeachers();
}`;
      body=body.slice(0,start)+replacement+body.slice(end);
    }
  }
  return originalSend.call(this,body);
};
console.log('GREENSUM admin student count + kick binding fix loaded');
