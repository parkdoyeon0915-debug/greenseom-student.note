// 학생 페이지 전용: 날짜별 자가진단 기록 수정/삭제 기능을 안정적으로 제공합니다.
// 관리자 페이지에는 적용하지 않습니다.
const express=require('express');
const originalSend=express.response.send;
const patch=`<style id="student-edit-ui-style">
.record-actions{display:flex;gap:7px;margin-top:10px;align-items:center}.record-actions .btn{padding:7px 11px;font-size:12px}.record-actions .delete{color:#b42318;border-color:#efb5af}.teacher-readonly{background:#f6f8fa!important;color:#6d7680!important;cursor:not-allowed}
</style><script id="student-edit-ui-script">
(function(){
function q(s){return document.querySelector(s)}
function qs(s){return document.querySelectorAll(s)}
var currentEditId=null;
function setScores(values){
  qs('input[name^="s"]').forEach(function(x){x.checked=false});
  (values||[]).forEach(function(v,i){var el=q('input[name=s'+i+'][value="'+v+'"]');if(el)el.checked=true});
  calcScores();
}
function calcScores(){var t=0;for(var i=0;i<5;i++){var el=q('input[name=s'+i+']:checked');if(el)t+=Number(el.value)||0}var out=q('#diagTotal');if(out)out.textContent=t;return t}
window.calc=calcScores;
function clearPhoto(){var box=q('#diagPhoto');if(box){var img=box.querySelector('img');if(img)img.remove()}var ph=q('#diagPlaceholder');if(ph)ph.style.display='block'}
function newDiag(){
  currentEditId=null;
  window.__studentCurrentEditId=null;
  var title=q('#diagTitle');if(title)title.textContent='새 자가진단표';
  var d=q('#diagDate');if(d)d.value=new Date().toISOString().slice(0,10);
  ['#diagSubject','#diagNotes','#diagImprove'].forEach(function(s){var el=q(s);if(el)el.value=''});
  setScores([]);clearPhoto();
  var file=q('#diagFile');if(file)file.value='';
}
window.newDiag=newDiag;
async function loadDiag(id){
  try{
    var r=await fetch('/api/diagnoses',{credentials:'same-origin',cache:'no-store'});
    if(!r.ok)throw new Error('자가진단 기록을 불러오지 못했습니다.');
    var data=await r.json();
    var x=data.find(function(a){return Number(a.id)===Number(id)});
    if(!x)throw new Error('선택한 자가진단 기록을 찾지 못했습니다.');
    currentEditId=Number(x.id);window.__studentCurrentEditId=currentEditId;
    var title=q('#diagTitle');if(title)title.textContent=x.date+' 자가진단표';
    if(q('#diagDate'))q('#diagDate').value=x.date||'';
    if(q('#diagSubject'))q('#diagSubject').value=x.subject||'';
    if(q('#diagNotes'))q('#diagNotes').value=x.notes||'';
    if(q('#diagImprove'))q('#diagImprove').value=x.improve||'';
    if(q('#diagTeacher')){q('#diagTeacher').value=x.teacher_note||'';q('#diagTeacher').readOnly=true;q('#diagTeacher').classList.add('teacher-readonly')}
    setScores([x.problem_analysis,x.form_score,x.completion,x.expression,x.composition]);
    clearPhoto();
    if(x.photo){var img=document.createElement('img');img.src=x.photo;q('#diagPhoto').prepend(img);if(q('#diagPlaceholder'))q('#diagPlaceholder').style.display='none'}
    var file=q('#diagFile');if(file)file.value='';
  }catch(e){alert(e.message||'자가진단 기록을 불러오지 못했습니다.')}
}
window.loadDiag=loadDiag;
async function saveDiag(){
  var fd=new FormData();
  fd.append('date',q('#diagDate')?.value||'');
  fd.append('subject',q('#diagSubject')?.value||'');
  fd.append('notes',q('#diagNotes')?.value||'');
  fd.append('improve',q('#diagImprove')?.value||'');
  for(var i=0;i<5;i++){var el=q('input[name=s'+i+']:checked');fd.append(['problem_analysis','form_score','completion','expression','composition'][i],el?el.value:'0')}
  var file=q('#diagFile');if(file&&file.files&&file.files[0])fd.append('photo',file.files[0]);
  try{
    var id=Number(currentEditId||window.__studentCurrentEditId||0);
    var r=await fetch(id?('/api/diagnoses/'+id):'/api/diagnoses',{method:id?'PUT':'POST',body:fd,credentials:'same-origin'});
    var j=await r.json().catch(function(){return {}});
    if(!r.ok)throw new Error(j.error||'서버 저장에 실패했습니다.');
    currentEditId=Number(j.id||id)||null;window.__studentCurrentEditId=currentEditId;
    alert(id?'자가진단 기록이 수정되었습니다.':'자가진단 기록이 저장되었습니다.');
    var all=await (await fetch('/api/diagnoses',{credentials:'same-origin',cache:'no-store'})).json();
    if(window.location.pathname==='/'||window.location.pathname==='/index.html'){var list=q('#diagList');if(list){list.innerHTML=all.map(function(x){return '<div class="record" onclick="loadDiag('+x.id+');go(\\'diagnosis\\')"><div class="thumb">'+(x.photo?'<img src="'+x.photo+'">':'사진 없음')+'</div><b>'+x.date+'</b><div class="muted">'+(x.subject||'오늘의 그림')+' · '+x.total+'/25점</div></div>'}).join('')||'<div class="empty">아직 자가진단 기록이 없습니다.</div>'}}
    if(typeof window.go==='function')window.go('diagnosis');
  }catch(e){alert(e.message||'서버 저장에 실패했습니다.')}
}
window.saveDiag=saveDiag;
async function studentDeleteDiag(ev,id){
  if(ev){ev.preventDefault();ev.stopPropagation()}
  if(!confirm('이 자가진단 기록을 삭제할까요?'))return;
  try{
    var r=await fetch('/api/diagnoses/'+encodeURIComponent(id),{method:'DELETE',credentials:'same-origin'});
    var j=await r.json().catch(function(){return {}});
    if(!r.ok)throw new Error(j.error||'삭제에 실패했습니다.');
    if(Number(currentEditId)===Number(id))newDiag();
    if(typeof window.loadAll==='function')await window.loadAll();
    if(typeof window.go==='function')window.go('diagnosis');
  }catch(e){alert(e.message||'삭제 중 오류가 발생했습니다.')}
}
window.studentDeleteDiag=studentDeleteDiag;
function protectTeacherComment(){var el=q('#diagTeacher');if(!el)return;el.readOnly=true;el.classList.add('teacher-readonly');el.title='선생님 코멘트는 학생이 수정할 수 없습니다.'}
function addDiagActions(){
  var list=q('#diagList');if(!list)return;
  list.querySelectorAll('.record').forEach(function(card){
    if(card.querySelector('.record-actions'))return;
    var clickable=card.querySelector('[onclick*="loadDiag"]');if(!clickable)return;
    var raw=String(clickable.getAttribute('onclick')||'');var match=raw.match(/loadDiag\\(\\s*(\\d+)\\s*\\)/);if(!match)return;
    var id=Number(match[1]);if(!id)return;
    var box=document.createElement('div');box.className='record-actions';
    var edit=document.createElement('button');edit.type='button';edit.className='btn';edit.textContent='수정';edit.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();loadDiag(id);});
    var del=document.createElement('button');del.type='button';del.className='btn delete';del.textContent='삭제';del.addEventListener('click',function(e){studentDeleteDiag(e,id)});
    box.append(edit,del);card.appendChild(box);
  });
}
function boot(){addDiagActions();protectTeacherComment();new MutationObserver(function(){addDiagActions();protectTeacherComment()}).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();</script>`;
express.response.send=function(body){
  if(typeof body==='string'&&this.req&&(this.req.path==='/'||this.req.path==='/index.html')&&body.includes('</body>'))body=body.replace('</body>',patch+'</body>');
  return originalSend.call(this,body);
};
