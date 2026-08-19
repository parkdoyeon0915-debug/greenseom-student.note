const express=require('express');
const originalSend=express.response.send;

// Normalize the student-list count fields without changing the API or database.
function countFor(student,kind){
  const direct=kind==='diagnoses'
    ? ['diagnoses','diagnosis_count','diagnoses_count','diagnosisCount','diagnosesCount','diag_count','diagCount']
    : ['patterns','pattern_count','patterns_count','patternCount','patternsCount'];
  const pools=[student,student?.counts,student?.count,student?.stats];
  for(const obj of pools){
    if(!obj||typeof obj!=='object')continue;
    for(const key of direct){
      const v=obj[key];
      if(Array.isArray(v))return v.length;
      if(typeof v==='number'&&Number.isFinite(v))return v;
      if(typeof v==='string'&&/^\d+$/.test(v.trim()))return Number(v);
    }
  }
  return 0;
}

const script=`<script>(function(){
function fixCounts(){
  document.querySelectorAll('#students .student').forEach(row=>{
    const text=row.querySelector('small');
    if(!text)return;
    // If the server already rendered real numbers, leave them alone.
    if(/자가진단\s+\d+개\s+·\s*패턴\s+\d+개/.test(text.textContent))return;
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fixCounts);else fixCounts();
})();</script>`;

express.response.send=function(body){
  if(typeof body==='string'&&this.req&&this.req.path==='/admin.html'&&body.includes('</body>')){
    // Replace the fragile direct property access with a frontend fallback that
    // understands the common count field names returned by the admin endpoint.
    body=body.replace(
      "자가진단 '+s.diagnoses+'개 · 패턴 '+s.patterns+'개",
      "자가진단 '+(s.diagnoses??s.diagnosis_count??s.diagnoses_count??s.diagnosisCount??0)+'개 · 패턴 '+(s.patterns??s.pattern_count??s.patterns_count??s.patternCount??0)+'개"
    );
    body=body.replace(
      "자가진단 "+'${s.diagnoses}'+'개 · 패턴 '+ '${s.patterns}' +'개',
      "자가진단 "+'${s.diagnoses??s.diagnosis_count??s.diagnoses_count??s.diagnosisCount??0}'+'개 · 패턴 '+ '${s.patterns??s.pattern_count??s.patterns_count??s.patternCount??0}' +'개'
    );
  }
  return originalSend.call(this,body);
};
console.log('GREENSUM admin student count fallback loaded');
