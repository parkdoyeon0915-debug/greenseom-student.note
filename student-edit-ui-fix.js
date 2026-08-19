// 학생 페이지 전용: 날짜별 자가진단 기록에 수정/삭제 버튼을 추가합니다.
// 관리자 페이지에는 적용하지 않습니다.
const express=require('express');
const originalSend=express.response.send;
const patch=`<style id="student-edit-ui-style">
.record-actions{display:flex;gap:7px;margin-top:10px;align-items:center}.record-actions .btn{padding:7px 11px;font-size:12px}.record-actions .delete{color:#b42318;border-color:#efb5af}.student-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid #e5e9ed}.student-modal-actions .delete{color:#b42318;border-color:#efb5af}.teacher-readonly{background:#f6f8fa!important;color:#6d7680!important;cursor:not-allowed}
</style><script id="student-edit-ui-script">
(function(){
async function editDiagFromModal(id,modal){
  if(!id)return;
  if(modal)modal.style.display='none';
  try{
    const r=await fetch('/api/diagnoses',{credentials:'same-origin',cache:'no-store'});
    if(!r.ok)throw new Error('자가진단 기록을 불러오지 못했습니다.');
    const data=await r.json();
    const rows=Array.isArray(data)?data:(data.diagnoses||[]);
    const record=rows.find(x=>Number(x.id)===Number(id));
    if(!record)throw new Error('선택한 자가진단 기록을 찾지 못했습니다.');
    // index.html의 전역 lexical 변수/함수는 window 프로퍼티가 아닐 수 있으므로
    // 전역 eval을 통해 원본 앱의 diagnoses, go, loadDiag를 직접 사용합니다.
    window.__studentEditRows=rows;
    window.__studentEditId=Number(id);
    window.eval("diagnoses=window.__studentEditRows; go('diagnosis'); loadDiag(window.__studentEditId);");
    delete window.__studentEditRows;
    delete window.__studentEditId;
  }catch(err){alert(err.message||'수정 화면을 불러오지 못했습니다.');}
}
function addDiagActions(){
  const list=document.getElementById('diagList');if(!list)return;
  list.querySelectorAll('.record').forEach(function(card){
    if(card.querySelector('.record-actions'))return;
    const clickable=card.querySelector('[onclick*="loadDiag"]');if(!clickable)return;
    const raw=String(clickable.getAttribute('onclick')||'');
    const match=raw.match(/loadDiag\\(\\s*(\\d+)\\s*\\)/);if(!match)return;
    const id=Number(match[1]);if(!id)return;
    const box=document.createElement('div');box.className='record-actions';
    const edit=document.createElement('button');edit.type='button';edit.className='btn';edit.textContent='수정';
    edit.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();editDiagFromModal(id,null);});
    const del=document.createElement('button');del.type='button';del.className='btn delete';del.textContent='삭제';
    del.addEventListener('click',function(e){studentDeleteDiag(e,id);});
    box.append(edit,del);card.appendChild(box);
  });
}
function addModalActions(){
  const modal=document.getElementById('stableRecordModal');if(!modal||modal.style.display==='none')return;
  const host=document.getElementById('studentRecordActions');if(!host||host.dataset.ready==='1')return;
  const id=Number(modal.dataset.recordId||0);if(!id)return;
  host.dataset.ready='1';host.className='student-modal-actions';
  const edit=document.createElement('button');edit.type='button';edit.className='btn';edit.textContent='수정';
  edit.onclick=function(e){e.preventDefault();e.stopPropagation();editDiagFromModal(id,modal);};
  const del=document.createElement('button');del.type='button';del.className='btn delete';del.textContent='삭제';
  del.onclick=function(e){studentDeleteDiag(e,id);};
  host.append(edit,del);
}
async function studentDeleteDiag(ev,id){
  if(ev){ev.preventDefault();ev.stopPropagation();}
  if(!confirm('이 자가진단 기록을 삭제할까요?'))return;
  try{
    const r=await fetch('/api/diagnoses/'+encodeURIComponent(id),{method:'DELETE',credentials:'same-origin'});
    if(!r.ok){const j=await r.json().catch(function(){return {};});alert(j.error||'삭제에 실패했습니다.');return;}
    const modal=document.getElementById('stableRecordModal');if(modal)modal.style.display='none';
    if(typeof loadAll==='function')await loadAll();
    if(typeof newDiag==='function')newDiag();
    if(typeof go==='function')go('diagnosis');
  }catch(e){alert('삭제 중 오류가 발생했습니다.');}
}
window.studentDeleteDiag=studentDeleteDiag;
function protectTeacherComment(){const el=document.getElementById('diagTeacher');if(!el)return;el.readOnly=true;el.classList.add('teacher-readonly');el.title='선생님 코멘트는 학생이 수정할 수 없습니다.';}
function boot(){addDiagActions();addModalActions();protectTeacherComment();new MutationObserver(function(){addDiagActions();addModalActions();protectTeacherComment();}).observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();</script>`;
express.response.send=function(body){
  if(typeof body==='string'&&this.req&&(this.req.path==='/'||this.req.path==='/index.html')&&body.includes('</body>'))body=body.replace('</body>',patch+'</body>');
  return originalSend.call(this,body);
};
