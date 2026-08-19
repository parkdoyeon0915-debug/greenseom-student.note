const express=require('express');
const originalSend=express.response.send;
const style=`<style>
.admin-comment-entry{border:1px solid #dce2e8;border-radius:11px;padding:12px;background:#fff;margin-top:9px}.admin-comment-author{font-weight:900;margin-bottom:6px}.admin-comment-text{white-space:pre-wrap;line-height:1.6}.admin-comment-date{margin-top:7px;font-size:11px;color:#929aa2}.admin-comment-empty{padding:13px;border:1px dashed #d6dde5;border-radius:10px;color:#7d8791}.admin-comment-new{margin-top:12px;padding:12px;border:1px solid #dce2e8;border-radius:11px;background:#fff}.admin-comment-input{width:100%;min-height:120px;border:1px solid #d6dde5;border-radius:10px;padding:12px;font:inherit;resize:vertical;box-sizing:border-box}.photo-error{padding:20px;text-align:center}
</style>`;
const script=`<script>(function(){
const esc=s=>String(s??'').replace(/[&<>\\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\"':'&quot;',"'":'&#39;'}[c]));
const parseLegacy=v=>{if(!v)return[];try{const a=JSON.parse(v);return Array.isArray(a)?a.filter(x=>x&&x.comment):[]}catch(e){return[{id:'legacy',admin_id:'legacy',admin_name:'선생님',comment:String(v),created_at:new Date(0).toISOString()}]}};
const teacherLabel=c=>{const id=String(c?.admin_id||c?.admin_username||'').toLowerCase();if(id==='doyean7')return'도연T';let n=String(c?.admin_name||'선생님').trim();if(!n||n==='관리자'||n==='선생님')return'선생님';return /T$/.test(n)?n:n+'T'};
const commentBox=c=>'<div class="admin-comment-entry"><div class="admin-comment-author">'+esc(teacherLabel(c))+'</div><div class="admin-comment-text">'+esc(c.comment)+'</div><div class="admin-comment-date">'+esc(c.created_at?new Date(c.created_at).toLocaleString('ko-KR'):'')+'</div></div>';
async function me(){const r=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});const j=await r.json();return j.user||null}
async function get(id){const r=await fetch('/api/admin/diagnoses/'+id,{credentials:'same-origin',cache:'no-store'});const j=await r.json();if(!r.ok)throw Error(j.error||'기록을 불러오지 못했습니다.');return j}
async function getComments(id){const r=await fetch('/api/admin/diagnoses/'+id+'/teacher-comments',{credentials:'same-origin',cache:'no-store'});const j=await r.json();if(!r.ok)throw Error(j.error||'선생님 코멘트를 불러오지 못했습니다.');return Array.isArray(j.comments)?j.comments:[]}
async function saveComment(id,text){const r=await fetch('/api/admin/diagnoses/'+id+'/teacher-comments',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({comment:text})});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'코멘트 저장에 실패했습니다.');return j}
async function fixCounts(){
  const rows=[...document.querySelectorAll('#students .student')];
  await Promise.all(rows.map(async row=>{
    const id=Number(row.dataset.studentId);
    const small=row.querySelector('small');
    if(!id||!small)return;
    try{
      const r=await fetch('/api/admin/students/'+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store'});
      const x=await r.json();
      if(!r.ok)throw Error(x.error||'student detail failed');
      const diagnoses=Array.isArray(x.diagnoses)?x.diagnoses.length:0;
      const patterns=Array.isArray(x.patterns)?x.patterns.length:0;
      const dates=Array.isArray(x.diagnoses)?x.diagnoses.map(v=>v.date).filter(Boolean).sort():[];
      const last=dates.length?dates[dates.length-1]:'-';
      small.textContent='자가진단 '+diagnoses+'개 · 패턴 '+patterns+'개 · 최근 '+last;
    }catch(e){
      console.warn('admin count final fix',id,e);
      small.textContent='자가진단 0개 · 패턴 0개 · 최근 -';
    }
  }));
}
async function patchTeacher(sec,id){if(sec.dataset.commentFix==='1')return;sec.dataset.commentFix='1';try{const[u,comments]=await Promise.all([me(),getComments(id)]);sec.innerHTML='<h4 style="margin:0 0 12px">선생님들의 코멘트 <span class="muted">· 관리자 전용</span></h4><div class="admin-comment-list">'+(comments.length?comments.map(commentBox).join(''):'<div class="admin-comment-empty">아직 등록된 선생님 코멘트가 없습니다.</div>')+'</div><div class="admin-comment-new"><div class="admin-comment-author">새 코멘트 · '+esc(teacherLabel({admin_id:u?.username||u?.id,admin_name:u?.name}))+'</div><textarea class="admin-comment-input" placeholder="이 학생에게 남길 코멘트를 입력해주세요."></textarea><div class="actions"><button class="btn primary admin-comment-save">새 코멘트 등록</button></div></div>';sec.querySelector('.admin-comment-save').onclick=async()=>{const text=sec.querySelector('.admin-comment-input').value.trim();if(!text)return alert('코멘트를 입력해주세요.');try{await saveComment(id,text);sec.dataset.commentFix='';await patchTeacher(sec,id);alert('코멘트가 저장되었습니다.')}catch(e){console.error('teacher comment save',e);alert(e.message||'코멘트 저장에 실패했습니다.')}}}catch(e){console.error('admin comment fix',e);sec.dataset.commentFix='';const msg=document.createElement('div');msg.className='admin-comment-empty';msg.textContent='선생님 코멘트를 불러오지 못했습니다. '+(e.message||'');sec.innerHTML=msg}}
function patchAll(){document.querySelectorAll('.teacher').forEach(sec=>{const ta=sec.querySelector('textarea[id^="teacher_"]');if(ta)patchTeacher(sec,Number(ta.id.replace('teacher_','')))});document.querySelectorAll('.photo img,.patternHero img,.patternImgs img').forEach(img=>{if(img.dataset.photoFix)return;img.dataset.photoFix='1';img.addEventListener('error',()=>{img.style.display='none';const p=img.parentElement;if(p&&!p.querySelector('.photo-error')){const d=document.createElement('span');d.className='photo-error muted';d.textContent='사진을 불러오지 못했습니다.';p.appendChild(d)}})})}
function boot(){fixCounts();patchAll();const d=document.getElementById('detail');const s=document.getElementById('students');if(d&&!d.dataset.commentObserver){d.dataset.commentObserver='1';new MutationObserver(()=>patchAll()).observe(d,{childList:true,subtree:true)}if(s&&!s.dataset.countObserver){s.dataset.countObserver='1';new MutationObserver(()=>fixCounts()).observe(s,{childList:true,subtree:true})}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();</script>`;
express.response.send=function(body){if(typeof body==='string'&&this.req&&this.req.path==='/admin.html'&&body.includes('</body>'))body=body.replace('</head>',style+'</head>').replace('</body>',script+'</body>');return originalSend.call(this,body)};
