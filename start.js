require('./response-safety.js');
require('./problem-bank-persistence.js');
require('./problem-bank-admin-route-fix.js');
require('./superadmin.js');
require('./stable-core-fix.js');
require('./student-login-stability.js');
require('./ui-nav-fix.js');
require('./problem-bank-link-disable.js');
require('./problem-bank-link-enable.js');
require('./problem-bank-student-url-fix.js');
require('./admin-count-fix.js');
require('./admin-kick-fix.js');
require('./admin-problem-bank-binding-fix.js');
require('./admin-problem-bank-page-fix.js');
require('./admin-problem-bank-static-route-fix.js');
require('./problem-bank-student-context-fix.js');
require('./problem-bank-static-context-final-fix.js');
require('./problem-bank-student-storage-isolation-fix.js');
require('./problem-bank-admin-data-final-fix.js');
require('./problem-bank-server-authoritative-final-fix.js');
require('./problem-bank-final-authority.js');
require('./admin-comment-fix.js');
require('./student-edit-ui-fix.js');

const express=require('express');
const originalProblemBankAdminSend=express.response.send;

// 학생 페이지의 수정/삭제 UI를 마지막 단계에서 강제로 보장합니다.
const finalStudentEditScript=`<style id="final-student-edit-style">
.record-actions{display:flex!important;gap:7px;margin-top:10px;align-items:center}.record-actions .btn{padding:7px 11px;font-size:12px}.record-actions .delete{color:#b42318;border-color:#efb5af}.student-modal-actions{display:flex!important;justify-content:flex-end;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid #e5e9ed}.student-modal-actions .delete{color:#b42318;border-color:#efb5af}
</style><script id="final-student-edit-script">(function(){
function idOf(card){return Number(card&&card.dataset&&card.dataset.id||0)}
function addListActions(){
  document.querySelectorAll('#diagList .record,#recentDiag .record').forEach(function(card){
    if(card.querySelector('.record-actions'))return;
    var id=idOf(card);if(!id)return;
    var box=document.createElement('div');box.className='record-actions';
    var edit=document.createElement('button');edit.type='button';edit.className='btn';edit.textContent='수정';
    edit.onclick=async function(e){e.preventDefault();e.stopPropagation();if(typeof window.loadDiag==='function'){await window.loadDiag(id);if(typeof window.go==='function')window.go('diagnosis')}};
    var del=document.createElement('button');del.type='button';del.className='btn delete';del.textContent='삭제';
    del.onclick=async function(e){e.preventDefault();e.stopPropagation();if(!confirm('이 자가진단 기록을 삭제할까요?'))return;try{var r=await fetch('/api/diagnoses/'+encodeURIComponent(id),{method:'DELETE',credentials:'same-origin'});if(!r.ok){var j=await r.json().catch(function(){return {}});throw new Error(j.error||'삭제에 실패했습니다.')}location.reload()}catch(err){alert(err.message||'삭제 중 오류가 발생했습니다.')}};
    box.append(edit,del);card.appendChild(box);
  });
}
function addModalActions(){
  var modal=document.getElementById('stableRecordModal');if(!modal||modal.style.display==='none')return;
  var host=document.getElementById('studentRecordActions');if(!host||host.dataset.finalReady==='1')return;
  var id=Number(modal.dataset.recordId||0);if(!id)return;
  host.dataset.finalReady='1';host.className='student-modal-actions';
  var edit=document.createElement('button');edit.type='button';edit.className='btn';edit.textContent='수정';
  edit.onclick=async function(e){e.preventDefault();e.stopPropagation();modal.style.display='none';if(typeof window.loadDiag==='function'){await window.loadDiag(id);if(typeof window.go==='function')window.go('diagnosis')}};
  var del=document.createElement('button');del.type='button';del.className='btn delete';del.textContent='삭제';
  del.onclick=async function(e){e.preventDefault();e.stopPropagation();if(!confirm('이 자가진단 기록을 삭제할까요?'))return;try{var r=await fetch('/api/diagnoses/'+encodeURIComponent(id),{method:'DELETE',credentials:'same-origin'});if(!r.ok){var j=await r.json().catch(function(){return {}});throw new Error(j.error||'삭제에 실패했습니다.')}modal.style.display='none';location.reload()}catch(err){alert(err.message||'삭제에 실패했습니다.')}};
  host.append(edit,del);
}
function protectTeacher(){var el=document.getElementById('diagTeacher');if(el){el.readOnly=true;el.classList.add('teacher-readonly')}}
function boot(){addListActions();addModalActions();protectTeacher()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
new MutationObserver(boot).observe(document.body,{childList:true,subtree:true});
})();</script>`;
const finalStudentEditSend=express.response.send;
express.response.send=function(body){
  if(typeof body==='string'&&this.req&&(this.req.path==='/'||this.req.path==='/index.html')&&body.includes('</body>'))body=body.replace('</body>',finalStudentEditScript+'</body>');
  return finalStudentEditSend.call(this,body);
};

const finalProblemBankAdminStyle=`<style id="admin-problem-bank-final-style">
#students .student{position:relative;flex-wrap:wrap}
#students .student>div:last-child{position:relative;z-index:10002;display:flex!important;gap:8px;flex-wrap:wrap;align-items:center}
#students .student .pb-progress-btn{display:inline-flex!important;position:relative;z-index:10003;pointer-events:auto!important;cursor:pointer!important;touch-action:manipulation!important}
#students .student .pb-progress-panel{width:100%;position:relative;z-index:5}
</style>`;
const finalProblemBankAdminScript=`<script id="admin-problem-bank-final-script">(function(){
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function cls(v){return v==='완료'?'pb-done':v==='수정필요'?'pb-edit':v==='채색중'?'pb-color':v==='러프스케치'?'pb-rough':v==='디테일스케치'?'pb-detail':'';}
function getId(row){const direct=Number(row.dataset.studentId||0);if(direct)return direct;const el=row.querySelector('[onclick*="show("]');const m=el&&String(el.getAttribute('onclick')||'').match(/show\(\s*(\d+)\s*\)/);return m?Number(m[1]):0;}
function render(panel,p){
  if(!p){panel.innerHTML='<div class="muted">문제은행 진도를 불러오지 못했습니다.</div>';return;}
  const schools=Array.isArray(p.schools)?p.schools.filter(Boolean):[];const status=p.status&&typeof p.status==='object'?p.status:{};const keys=Object.keys(status);
  if(!schools.length&&!keys.length){panel.innerHTML='<div class="muted">아직 선택하거나 진행한 문제가 없습니다.</div>';return;}
  let html='<div class="pb-summary">선택 학교 '+schools.length+'개'+(p.updated_at?' · 마지막 저장 '+esc(new Date(p.updated_at).toLocaleString('ko-KR')):'')+'</div>';
  schools.forEach(s=>{const entries=keys.filter(k=>k.indexOf(s+'::')===0);html+='<div class="pb-school"><div class="pb-school-title">🏫 '+esc(s)+'</div>';if(!entries.length)html+='<div class="muted">아직 진행 기록이 없습니다.</div>';else html+='<div class="pb-prompts">'+entries.map(k=>{const v=status[k]||'미진행';return '<div class="pb-prompt '+cls(v)+'"><span>'+esc(k.slice(s.length+2))+'</span><b>'+esc(v)+'</b></div>';}).join('')+'</div>';html+='</div>';});
  panel.innerHTML=html;
}
function boot(){
  const rows=document.querySelectorAll('#students .student');
  rows.forEach(row=>{
    const id=getId(row); if(!id||row.dataset.pbFinal==='1')return; row.dataset.pbFinal='1';
    const wrap=document.createElement('div'); wrap.className='pb-progress-panel'; wrap.innerHTML='<div class="muted">문제은행 진도 확인 중...</div>'; row.appendChild(wrap);
    fetch('/api/admin/students/'+encodeURIComponent(id)+'/problem-bank',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()).then(p=>render(wrap,p)).catch(()=>render(wrap,null));
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
new MutationObserver(boot).observe(document.body,{childList:true,subtree:true});
})();</script>`;
const previousSend=express.response.send;
express.response.send=function(body){if(typeof body==='string'&&this.req&&this.req.path==='/admin-problem-bank.html'&&body.includes('</body>'))body=body.replace('</head>',finalProblemBankAdminStyle+'</head>').replace('</body>',finalProblemBankAdminScript+'</body>');return previousSend.call(this,body)};

// 자가진단 수정 저장 서버 라우트를 최종적으로 보강합니다.
// 기존 server.js의 PUT 라우트에는 completion이 중복되어 14개 파라미터가 전달되는 버그가 있습니다.
// 여기서는 app.put 자체를 거치지 않고 this.route(path).put()으로 직접 등록해 기존 monkey-patch와 충돌하지 않게 합니다.
const baseMulter=require('multer');
const diagnosisFinalUpload=baseMulter({storage:baseMulter.memoryStorage(),limits:{fileSize:10*1024*1024},fileFilter:(req,file,cb)=>cb(null,/^image\/(jpeg|png|webp|heic|heif)$/.test(file.mimetype))});
const {Pool:DiagnosisFinalPool}=require('pg');
const diagnosisFinalPool=new DiagnosisFinalPool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:3,idleTimeoutMillis:30000});
const diagnosisFinalPutFallback=express.application.put;
express.application.put=function(path,...handlers){
  if(path==='/api/diagnoses/:id'){
    return this.route(path).put(diagnosisFinalUpload.single('photo'),async(req,res)=>{
      try{
        if(!req.session.user)return res.status(401).json({error:'로그인이 필요합니다.'});
        const old=(await diagnosisFinalPool.query('SELECT * FROM diagnoses WHERE id=$1 AND user_id=$2',[req.params.id,req.session.user.id])).rows[0];
        if(!old)return res.status(404).json({error:'기록을 찾을 수 없습니다.'});
        const b=req.body||{};
        const f=['problem_analysis','form_score','completion','expression','composition'].map(k=>Math.max(0,Math.min(5,Number(b[k])||0)));
        const x=(await diagnosisFinalPool.query('UPDATE diagnoses SET date=$1,subject=$2,photo_data=$3,photo_mime=$4,problem_analysis=$5,form_score=$6,completion=$7,expression=$8,composition=$9,notes=$10,improve=$11 WHERE id=$12 AND user_id=$13 RETURNING *',[b.date||old.date,b.subject||'',req.file?.buffer||old.photo_data,req.file?.mimetype||old.photo_mime,...f,b.notes||'',b.improve||'',req.params.id,req.session.user.id])).rows[0];
        const total=f.reduce((a,v)=>a+v,0);
        res.json({...x,total,photo:x.photo_data?`/api/files/diagnoses/${x.id}`:null});
      }catch(e){console.error('FINAL PUT /api/diagnoses/:id',e);res.status(500).json({error:e.message||'자가진단 수정 저장에 실패했습니다.'});}
    });
  }
  return diagnosisFinalPutFallback.call(this,path,...handlers);
};
