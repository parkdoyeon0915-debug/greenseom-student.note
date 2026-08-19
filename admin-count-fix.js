const express=require('express');
const originalSend=express.response.send;

// The student-list endpoint may not expose aggregate count fields. The detail
// endpoint is authoritative, so hydrate each visible row from the student's
// actual diagnosis/pattern records without changing the database or API.
const script=`<script>(function(){
async function hydrate(){
  const rows=[...document.querySelectorAll('#students .student')];
  await Promise.all(rows.map(async row=>{
    if(row.dataset.countHydrated==='1')return;
    const id=row.dataset.studentId;
    if(!id)return;
    row.dataset.countHydrated='1';
    try{
      const r=await fetch('/api/admin/students/'+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store'});
      if(!r.ok)return;
      const x=await r.json();
      const small=row.querySelector('small');
      if(!small)return;
      const last=(small.textContent.match(/최근\\s*(.*)$/)||[])[1]||'-';
      const diagnoses=Array.isArray(x.diagnoses)?x.diagnoses.length:0;
      const patterns=Array.isArray(x.patterns)?x.patterns.length:0;
      small.textContent='자가진단 '+diagnoses+'개 · 패턴 '+patterns+'개 · 최근 '+last;
    }catch(e){console.warn('admin count hydrate',e)}
  }));
}
function boot(){
  hydrate();
  const box=document.getElementById('students');
  if(box&&!box.dataset.countObserver){
    box.dataset.countObserver='1';
    new MutationObserver(()=>hydrate()).observe(box,{childList:true,subtree:true});
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();</script>`;

express.response.send=function(body){
  if(typeof body==='string'&&this.req&&this.req.path==='/admin.html'&&body.includes('</body>')){
    body=body.replace('</body>',script+'</body>');
  }
  return originalSend.call(this,body);
};
console.log('GREENSUM admin student count hydration loaded');