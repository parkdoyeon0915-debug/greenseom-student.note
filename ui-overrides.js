const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

const injectedStudent=`<style>
#teacherCommentsSection{margin-top:18px;border:2px solid #283a4d;border-radius:14px;padding:14px;background:#fafbfc}
#teacherCommentsSection h3{margin:0 0 12px;font-size:18px}
.teacher-comment-card{background:#fff;border:1px solid #dce2e8;border-radius:12px;padding:14px;margin-top:10px}
.teacher-comment-name{font-weight:900;margin-bottom:8px}
.teacher-comment-text{white-space:pre-wrap;line-height:1.65}
@media(max-width:560px){#teacherCommentsSection{padding:14px;margin-top:18px}.teacher-comment-card{padding:14px}.teacher-comment-text{font-size:15px;line-height:1.7}}
</style><script>
(function(){
  function esc2(s){return String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
  function replaceTeacherSection(){
    const ta=document.getElementById('diagTeacher');
    if(!ta||document.getElementById('teacherCommentsSection'))return;
    const holder=document.createElement('div');holder.id='teacherCommentsSection';
    holder.innerHTML='<h3>선생님들의 코멘트</h3><div class="muted">관리자 코멘트를 불러오는 중...</div>';
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
      box.innerHTML='<h3>선생님들의 코멘트</h3>'+(list.length?list.map(c=>'<div class="teacher-comment-card"><div class="teacher-comment-name">'+esc2(c.admin_name)+'</div><div class="teacher-comment-text">'+esc2(c.comment)+'</div></div>').join(''):'<div class="muted">아직 등록된 선생님 코멘트가 없습니다.</div>');
    }catch(e){box.innerHTML='<h3>선생님들의 코멘트</h3><div class="muted">코멘트를 불러오지 못했습니다.</div>'}
  }
  const baseEdit=window.editDiag;
  if(baseEdit){window.editDiag=async function(id){baseEdit(id);replaceTeacherSection();await loadComments(id)}}
  const baseNew=window.newDiag;
  if(baseNew){window.newDiag=function(){baseNew();replaceTeacherSection()}}
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
  function esc3(s){return String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
  let me=null;
  async function getMe(){if(me)return me;try{const r=await fetch('/api/me',{credentials:'same-origin'});const j=await r.json();me=j.user||null}catch(e){me=null}return me}
  async function fillComments(area,id){
    try{
      const [cr,m]=await Promise.all([fetch('/api/diagnoses/'+id+'/comments',{credentials:'same-origin'}),getMe()]);
      const cj=await cr.json();if(!cr.ok)throw new Error(cj.error||'코멘트를 불러오지 못했습니다.');
      const comments=cj.comments||[];const current=comments.find(c=>m&&c.admin_id===m.id);
      area.innerHTML='<h4 class="teacher-comments-title">선생님들의 코멘트</h4>'+
        (comments.length?comments.map(c=>'<div class="admin-comment-card '+(m&&c.admin_id===m.id?'current':'')+'"><div class="admin-comment-name">'+esc3(c.admin_name)+'</div><div class="admin-comment-text">'+esc3(c.comment)+'</div></div>').join(''):'<div class="muted">아직 등록된 선생님 코멘트가 없습니다.</div>')+
        (m?'<div class="admin-comment-card current" style="margin-top:14px"><div class="admin-comment-name">'+esc3(m.name)+' · 내 코멘트</div><textarea class="admin-comment-input" id="admin_comment_'+id+'" placeholder="이 학생에게 남길 코멘트를 입력해주세요.">'+esc3(current?.comment||'')+'</textarea><div class="admin-comment-save"><button class="btn primary" onclick="saveAdminComment('+id+')">내 코멘트 저장</button></div></div>':'');
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
