const express=require('express');
const originalSend=express.response.send;
const script=`<script id="admin-comment-runtime-fix"><(function(){
function boot(){
  const body=document.getElementById('recordModalBody');
  if(!body)return;
  const oldOpen=window.openRecord;
  if(typeof oldOpen==='function'&&!window.__greensumOpenRecordWrapped){
    window.__greensumOpenRecordWrapped=true;
    window.openRecord=async function(kind,id){
      window.__greensumCurrentDiagnosisId=Number(id||0);
      return oldOpen.apply(this,arguments);
    };
  }
  patch();
  if(!body.__commentRuntimeObserver){
    body.__commentRuntimeObserver=true;
    new MutationObserver(()=>setTimeout(patch,0)).observe(body,{childList:true,subtree:true});
  }
}
function parse(v){
  if(!v)return[];
  try{const a=JSON.parse(v);return Array.isArray(a)?a.filter(x=>x&&String(x.comment||'').trim()):[]}
  catch(e){return String(v).trim()?[{id:'legacy',admin_id:'legacy',admin_name:'선생님',comment:String(v),created_at:null}]:[]}
}
function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
function label(c){const id=String(c?.admin_id||c?.admin_username||'').toLowerCase();if(id==='doyean7')return'도연T';let n=String(c?.admin_name||'선생님').trim();if(!n||n==='관리자'||n==='선생님')return'선생님';return /T$/.test(n)?n:n+'T'}
function render(c){return '<div class="admin-comment-entry"><div class="admin-comment-author">'+esc(label(c))+'</div><div class="admin-comment-text">'+esc(c.comment)+'</div>'+(c.created_at?'<div class="admin-comment-date">'+esc(new Date(c.created_at).toLocaleString('ko-KR'))+'</div>':'')+'</div>'}
async function patch(){
  const ta=document.getElementById('adminTeacherNote');
  const id=Number(window.__greensumCurrentDiagnosisId||0);
  if(!ta||!id)return;
  const box=ta.closest('.detail-box');
  if(!box||box.dataset.commentRuntimeFixed==='1')return;
  box.dataset.commentRuntimeFixed='1';
  try{
    const r=await fetch('/api/admin/diagnoses/'+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store'});
    const d=await r.json();
    if(!r.ok)throw Error(d.error||'진단 기록을 불러오지 못했습니다.');
    const comments=parse(d.teacher_note);
    const u=window.__greensumAdminUser||{};
    box.innerHTML='<h4>선생님들의 코멘트 <small style="font-weight:normal;color:#7d8791">관리자 전용</small></h4><div class="admin-comment-list">'+(comments.length?comments.map(render).join(''):'<div class="admin-comment-empty">아직 등록된 선생님 코멘트가 없습니다.</div>')+'</div><div class="admin-comment-new"><div class="admin-comment-author">새 코멘트 · '+esc(label({admin_id:u.username||u.id,admin_name:u.name}))+'</div><textarea id="runtimeTeacherComment" class="admin-comment-input" placeholder="이 학생에게 남길 코멘트를 입력해주세요."></textarea><div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn primary" id="runtimeTeacherCommentSave">새 코멘트 등록</button></div><div id="runtimeTeacherCommentStatus" style="margin-top:8px;color:#7d8791;font-size:12px"></div></div>';
    document.getElementById('runtimeTeacherCommentSave').onclick=()=>save(id,box);
  }catch(e){console.error('admin comment runtime fix',e);box.dataset.commentRuntimeFixed='';}
}
async function save(id,box){
  const input=document.getElementById('runtimeTeacherComment');
  const status=document.getElementById('runtimeTeacherCommentStatus');
  const text=(input?.value||'').trim();
  if(!text){alert('코멘트를 입력해주세요.');return}
  const btn=document.getElementById('runtimeTeacherCommentSave');btn.disabled=true;status.textContent='저장 중...';
  try{
    const r=await fetch('/api/admin/diagnoses/'+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store'});
    const d=await r.json();if(!r.ok)throw Error(d.error||'기록을 불러오지 못했습니다.');
    const comments=parse(d.teacher_note);const u=window.__greensumAdminUser||{};
    comments.push({id:'local-'+Date.now()+'-'+Math.random().toString(36).slice(2),admin_id:u.username||u.id||'',admin_username:u.username||'',admin_name:u.name||'관리자',comment:text,created_at:new Date().toISOString()});
    const put=await fetch('/api/admin/diagnoses/'+encodeURIComponent(id),{method:'PUT',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({teacher_note:JSON.stringify(comments)})});
    const out=await put.json().catch(()=>({}));if(!put.ok)throw Error(out.error||'코멘트 저장에 실패했습니다.');
    box.dataset.commentRuntimeFixed='';
    await patch();
  }catch(e){btn.disabled=false;status.textContent='저장에 실패했습니다: '+e.message;console.error('runtime comment save',e)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();</script>`;
express.response.send=function(body){
  if(typeof body==='string'&&this.req&&this.req.path==='/admin.html'&&body.includes('</body>'))body=body.replace('</body>',script+'</body>');
  return originalSend.call(this,body);
};
