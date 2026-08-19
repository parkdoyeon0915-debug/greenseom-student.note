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

const express=require('express');
const originalProblemBankAdminSend=express.response.send;
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
express.response.send=function(body){if(typeof body==='string'&&this.req&&this.req.path==='/admin-problem-bank.html'&&body.includes('</body>'))body=body.replace('</head>',finalProblemBankAdminStyle+'</head>').replace('</body>',finalProblemBankAdminScript+'</body>');return originalProblemBankAdminSend.call(this,body)};
