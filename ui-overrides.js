const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

const injectedStudent=`<style>
#teacherCommentsSection{margin-top:18px;border:2px solid #283a4d;border-radius:14px;padding:14px;background:#fafbfc}
#teacherCommentsSection h3{margin:0 0 12px;font-size:18px}
.teacher-comment-card{background:#fff;border:1px solid #dce2e8;border-radius:12px;padding:14px;margin-top:10px}
.teacher-comment-name{font-weight:900;margin-bottom:8px}
.teacher-comment-text{white-space:pre-wrap;line-height:1.65}
#studentRecordModal{position:fixed;inset:0;background:#18212b88;display:none;align-items:center;justify-content:center;padding:14px;z-index:99999}
#studentRecordModal.open{display:flex}
.student-record-box{width:min(760px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;padding:18px;box-shadow:0 20px 70px #0004}
.student-record-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;position:sticky;top:0;background:#fff;padding-bottom:10px;z-index:2}
.student-record-head h2{margin:0;font-size:21px}
.student-record-photo{width:100%;max-height:48vh;object-fit:contain;background:#f3f5f7;border-radius:12px;margin-bottom:14px}
.student-record-info{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.student-record-card{border:1px solid #dce2e8;border-radius:12px;padding:13px;background:#fff}
.student-record-card h4{margin:0 0 8px}
.student-record-text{white-space:pre-wrap;line-height:1.7}
.student-record-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
@media(max-width:560px){#teacherCommentsSection{padding:14px;margin-top:18px}.teacher-comment-card{padding:14px}.teacher-comment-text{font-size:15px;line-height:1.7}.student-record-box{padding:14px;border-radius:16px;max-height:94vh}.student-record-head h2{font-size:18px}.student-record-info{grid-template-columns:1fr}.student-record-photo{max-height:42vh}.student-record-card{padding:13px}.student-record-actions{position:sticky;bottom:0;background:#fff;padding-top:10px}}
</style><script>
(function(){
  function esc2(s){return String(s??'').replace(/[&<>\\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\"':'&quot;',"'":'&#39;'}[c]))}
  function teacherLabel(name,id){
    if(String(id||'')==='doyean7')return '박도연T';
    const n=String(name||'선생님').trim();
    if(n==='관리자')return '선생님';
    return /T$/.test(n)?n:n+'T';
  }
  function replaceTeacherSection(){
    const ta=document.getElementById('diagTeacher');
    if(!ta||document.getElementById('teacherCommentsSection'))return;
    const holder=document.createElement('div');holder.id='teacherCommentsSection';
    holder.innerHTML='<h3>선생님들의 코멘트</h3><div class="muted">선생님 코멘트를 불러오는 중...</div>';
    const p=ta.previousElementSibling;
    if(p)p.replaceWith(holder);else ta.parentNode.insertBefore(holder,ta);
    ta.remove();
  }
  async function loadComments(id){
    replaceTeacherSection();
    const box=document.getElementById('teacherCommentsSection');if(!box)return;
    try{
      const r=await fetch('/api/diagnoses/'+id+'/comments',{credentials:'same-origin'});const j=await r.json();
      if(!r.ok)throw new Error(j.error||'코멘트를 불러오지 못했습니다.');
      const list=j.comments||[];
      box.innerHTML='<h3>선생님들의 코멘트</h3>'+(list.length?list.map(c=>'<div class="teacher-comment-card"><div class="teacher-comment-name">'+esc2(teacherLabel(c.admin_name,c.admin_id))+'</div><div class="teacher-comment-text">'+esc2(c.comment)+'</div></div>').join(''):'<div class="muted">아직 등록된 선생님 코멘트가 없습니다.</div>');
    }catch(e){box.innerHTML='<h3>선생님들의 코멘트</h3><div class="muted">코멘트를 불러오지 못했습니다.</div>'}
  }
  const baseEdit=window.editDiag;
  if(baseEdit){window.editDiag=async function(id){baseEdit(id);replaceTeacherSection();await loadComments(id)}}
  const baseNew=window.newDiag;
  if(baseNew){window.newDiag=function(){baseNew();replaceTeacherSection()}}

  function closeRecordModal(){const m=document.getElementById('studentRecordModal');if(m)m.classList.remove('open')}
  async function openRecordModal(id){
    const r=Array.isArray(window.diags)?window.diags.find(x=>x.id===id):null;
    if(!r)return;
    let comments=[];
    try{const cr=await fetch('/api/diagnoses/'+id+'/comments',{credentials:'same-origin'});const cj=await cr.json();if(cr.ok)comments=cj.comments||[]}catch(e){}
    let m=document.getElementById('studentRecordModal');
    if(!m){m=document.createElement('div');m.id='studentRecordModal';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)closeRecordModal()})}
    const commentsHtml=comments.length?comments.map(c=>'<div class="student-record-card"><h4>'+esc2(teacherLabel(c.admin_name,c.admin_id))+'</h4><div class="student-record-text">'+esc2(c.comment)+'</div></div>').join(''):'<div class="muted">아직 등록된 선생님 코멘트가 없습니다.</div>';
    m.innerHTML='<div class="student-record-box"><div class="student-record-head"><h2>'+esc2(r.date||'')+' 기록</h2><button class="btn" id="closeStudentRecord">닫기</button></div>'+(r.photo?'<img class="student-record-photo" src="'+esc2(r.photo)+'">':'')+'<div class="student-record-info"><div class="student-record-card"><h4>기본 정보</h4><div>날짜 · '+esc2(r.date||'-')+'</div><div>소재 · '+esc2(r.subject||'-')+'</div><div>총점 · <b>'+esc2(r.total||0)+' / 25</b></div></div><div class="student-record-card"><h4>느낀 점</h4><div class="student-record-text">'+esc2(r.notes||'기록 없음')+'</div></div><div class="student-record-card"><h4>앞으로 개선할 점</h4><div class="student-record-text">'+esc2(r.improve||'기록 없음')+'</div></div><div class="student-record-card"><h4>채점</h4><div>문제 분석 · '+esc2(r.problem_analysis||0)+'/5</div><div>형태 · '+esc2(r.form_score||0)+'/5</div><div>완성도 · '+esc2(r.completion||0)+'/5</div><div>표현력 · '+esc2(r.expression||0)+'/5</div><div>구성 · '+esc2(r.composition||0)+'/5</div></div></div><div style="margin-top:14px"><h3 style="margin:0 0 10px">선생님들의 코멘트</h3>'+commentsHtml+'</div><div class="student-record-actions"><button class="btn" id="editStudentRecord">기록 보기 · 수정</button></div></div>';
    m.classList.add('open');
    document.getElementById('closeStudentRecord').onclick=closeRecordModal;
    document.getElementById('editStudentRecord').onclick=()=>{closeRecordModal();window.editDiag(id)};
  }
  function bindRecordClicks(){
    if(window.__greensumRecordClickBound)return;
    window.__greensumRecordClickBound=true;
    document.addEventListener('click',function(e){
      const card=e.target.closest('#diagList .record,#recentDiag .record');
      if(!card)return;
      e.preventDefault();e.stopImmediatePropagation();
      openRecordModal(Number(card.dataset.id));
    },true);
  }
  bindRecordClicks();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',replaceTeacherSection);else replaceTeacherSection();
})();
</script>`;

const injectedAdmin=`<style>
.teacher-comments-title{margin:0 0 12px;font-size:18px}
.admin-comment-card{border:1px solid #dce2e8;border-radius:12px;padding:14px;background:#fff;margin-top:10px}
.admin-comment-card.current{border:2px solid #283a4d;background:#fafbfc}
.admin-comment-name{font-weight:900;margin-bottom:8px}
.admin-comment-text{white-space:pre-wrap;line-height:1.6}
.admin-comment-input{width:100%;min-height:260px;border:1px solid #d6dde5;border-radius:10px;padding:12px;font:inherit;resize:vertical;box-sizing:border-box}
.admin-comment-save{display:flex;justify-content:flex-end;margin-top:10px}
@media(max-width:560px){.admin-comment-input{min-height:360px;font-size:16px;line-height:1.65}.admin-comment-card{padding:14px}.admin-comment-text{font-size:15px}}
</style><script>
(function(){
  function esc3(s){return String(s??'').replace(/[&<>\\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\"':'&quot;',"'":'&#39;'}[c]))}
  function teacherLabel(name,id){
    if(String(id||'')==='doyean7')return '박도연T';
    const n=String(name||'선생님').trim();
    if(n==='관리자')return '선생님';
    return /T$/.test(n)?n:n+'T';
  }
  let me=null;
  async function getMe(){if(me)return me;try{const r=await fetch('/api/me',{credentials:'same-origin'});const j=await r.json();me=j.user||null}catch(e){me=null}return me}
  async function fillComments(area,id){
    try{
      const [cr,m]=await Promise.all([fetch('/api/diagnoses/'+id+'/comments',{credentials:'same-origin'}),getMe()]);
      const cj=await cr.json();if(!cr.ok)throw new Error(cj.error||'코멘트를 불러오지 못했습니다.');
      const comments=cj.comments||[];const current=comments.find(c=>m&&c.admin_id===m.id);
      area.innerHTML='<h4 class="teacher-comments-title">선생님들의 코멘트</h4>'+
        (comments.length?comments.map(c=>'<div class="admin-comment-card '+(m&&c.admin_id===m.id?'current':'')+'"><div class="admin-comment-name">'+esc3(teacherLabel(c.admin_name,c.admin_id))+'</div><div class="admin-comment-text">'+esc3(c.comment)+'</div></div>').join(''):'<div class="muted">아직 등록된 선생님 코멘트가 없습니다.</div>')+
        (m?'<div class="admin-comment-card current" style="margin-top:14px"><div class="admin-comment-name">'+esc3(teacherLabel(m.name,m.id))+' · 내 코멘트</div><textarea class="admin-comment-input" id="admin_comment_'+id+'" placeholder="이 학생에게 남길 코멘트를 입력해주세요.">'+esc3(current?.comment||'')+'</textarea><div class="admin-comment-save"><button class="btn primary" onclick="saveAdminComment('+id+')">내 코멘트 저장</button></div></div>':'');
    }catch(e){area.innerHTML='<h4 class="teacher-comments-title">선생님들의 코멘트</h4><div class="muted">코멘트를 불러오지 못했습니다.</div>'}
  }
  window.saveAdminComment=async function(id){
    const ta=document.getElementById('admin_comment_'+id);if(!ta)return;
    const r=await fetch('/api/admin/diagnoses/'+id+'/comments',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({comment:ta.value})});
    const j=await r.json().catch(()=>({}));if(!r.ok)return alert(j.error||'코멘트 저장에 실패했습니다.');
    const area=ta.closest('.teacher');if(area){const target=area.querySelector('.admin-comments-area');if(target)await fillComments(target,id)}
    alert('코멘트가 저장되었습니다.');
  };
  function upgradeAdminComments(){
    document.querySelectorAll('.teacher textarea[id^="teacher_"]').forEach(ta=>{
      const id=ta.id.replace('teacher_','');
      const parent=ta.closest('.teacher');if(!parent||parent.querySelector('.admin-comments-area'))return;
      parent.innerHTML='<div class="admin-comments-area" data-diag-id="'+id+'"><div class="muted">선생님 코멘트를 불러오는 중...</div></div>';
      fillComments(parent.querySelector('.admin-comments-area'),id);
    });
  }
  const detail=document.getElementById('detail');
  if(detail){new MutationObserver(()=>setTimeout(upgradeAdminComments,0)).observe(detail,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',upgradeAdminComments);else upgradeAdminComments();
})();
</script>`;

fs.readFileSync=function(file,options){
  let content=originalReadFileSync.call(this,file,options);
  if(typeof file==='string'&&typeof content==='string'){
    if(file.endsWith('/public/index.html')){
      content=content.replace('</style>',' #diagTeacher{min-height:380px !important;}@media(max-width:560px){#diagTeacher{min-height:360px !important;}}\n</style>');
      content=content.replace('</body>',injectedStudent+'</body>');
    }
    if(file.endsWith('/public/admin.html'))content=content.replace('</body>',injectedAdmin+'</body>');
  }
  return content;
};
