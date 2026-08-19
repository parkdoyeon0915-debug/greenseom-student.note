const express=require('express');
const originalSend=express.response.send;

// The live admin page uses init(), not loadStudents(). Replace that init function
// so the student-list counts come from each student's actual records.
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
  return '<div class="student" data-student-id="'+Number(s.id)+'"><div onclick="show('+Number(s.id)+')" style="flex:1;cursor:pointer"><b>'+esc(s.name)+'</b> · '+esc(s.username)+'<br><small>자가진단 '+diagnoses+'개 · 패턴 '+patterns+'개 · 최근 '+esc(lastDate)+'</small></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" onclick="show('+Number(s.id)+')">기록 보기</button><button class="btn danger" onclick="kickStudent('+Number(s.id)+','+JSON.stringify(s.name)+')">강퇴</button></div></div>';
}));
document.querySelector('#students').innerHTML=rows.length?rows.join(''):'학생이 없습니다.';
await loadTeachers();
}`;
      body=body.slice(0,start)+replacement+body.slice(end);
    }
  }
  return originalSend.call(this,body);
};
console.log('GREENSUM admin student count render fix loaded');
