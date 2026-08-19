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
require('./problem-bank-server-controls.js');

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
function getId(row){const direct=Number(row.dataset.studentId||0);if(direct)return direct;const el=row.querySelector('[onclick*="show("]');const m=el&&String(el.getAttribute('onclick')||'').match(/show\\(\\s*(\\d+)\\s*\\)/);return m?Number(m[1]):0;}
function render(panel,p){
  if(!p){panel.innerHTML='<div class="muted">문제은행 진도를 불러오지 못했습니다.</div>';return;}
  const schools=Array.isArray(p.schools)?p.schools.filter(Boolean):[];const status=p.status&&typeof p.status==='object'?p.status:{};const keys=Object.keys(status);
  if(!schools.length&&!keys.length){panel.innerHTML='<div class="muted">아직 선택하거나 진행한 문제가 없습니다.</div>';return;}
  let html='<div class="pb-summary">선택 학교 '+schools.length+'개'+(p.updated_at?' · 마지막 저장 '+esc(new Date(p.updated_at).toLocaleString('ko-KR')):'')+'</div>';
  schools.forEach(s=>{const entries=keys.filter(k=>k.indexOf(s+'::')===0);html+='<div class="pb-school"><div class="pb-school-title">🏫 '+esc(s)+'</div>';if(!entries.length)html+='<div class="muted">아직 진행 기록이 없습니다.</div>';else html+='<div class="pb-prompts">'+entries.map(k=>{const v=status[k]||'미진행';return '<div class="pb-prompt '+cls(v)+'"><span>'+esc(k.slice(s.length+2))+'</span><b>'+esc(v)+'</b></div>';}).join('')+'</div>';html+='</div>';});
  const unknown=keys.filter(k=>!schools.some(s=>k.indexOf(s+'::')===0));if(unknown.length)html+='<div class="pb-school"><div class="pb-school-title">저장된 기타 진행 기록</div><div class="pb-prompts">'+unknown.map(k=>{const v=status[k]||'미진행';return '<div class="pb-prompt '+cls(v)+'"><span>'+esc(k)+'</span><b>'+esc(v)+'</b></div>';}).join('')+'</div></div>';
  panel.innerHTML=html;
}
async function openProgress(row,btn){
  let panel=row.querySelector('.pb-progress-panel');if(!panel){panel=document.createElement('div');panel.className='pb-progress-panel';row.appendChild(panel);}const opening=!panel.classList.contains('open');panel.classList.toggle('open');if(!opening)return;
  panel.innerHTML='<div class="muted">문제은행 진도를 불러오는 중...</div>';
  try{const id=Number(btn.dataset.studentId);const r=await fetch('/api/admin/problem-bank/'+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store'});const p=await r.json().catch(()=>null);if(r.status===404){render(panel,null);return;}if(!r.ok){const msg=p&&p.error?p.error:('HTTP '+r.status);const code=p&&p.code?'<br><small>오류 코드: '+esc(p.code)+'</small>':'';const detail=p&&p.detail?'<br><small>'+esc(p.detail)+'</small>':'';panel.innerHTML='<div class="muted">'+esc(msg)+code+detail+'</div>';return;}render(panel,p);}catch(e){console.warn('admin problem bank final',e);panel.innerHTML='<div class="muted">문제은행 진도를 불러오지 못했습니다.<br><small>'+esc(e.message||e)+'</small></div>';}
}
function bind(){document.querySelectorAll('#students .student').forEach(row=>{const id=getId(row);if(!id)return;let old=row.querySelector('.pb-progress-btn');if(!old){const actions=row.lastElementChild;if(!actions)return;old=document.createElement('button');old.type='button';old.className='btn pb-progress-btn';old.textContent='문제은행 진도';actions.appendChild(old);}if(old.dataset.finalBound!=='1'){const btn=old.cloneNode(true);btn.dataset.studentId=String(id);btn.dataset.finalBound='1';old.replaceWith(btn);btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openProgress(row,btn)},true);}else if(!old.dataset.studentId)old.dataset.studentId=String(id);});}
function boot(){bind();const root=document.getElementById('students');if(root&&!root.dataset.pbFinalObserver){root.dataset.pbFinalObserver='1';new MutationObserver(()=>setTimeout(bind,0)).observe(root,{childList:true,subtree:true});}setTimeout(bind,50);setTimeout(bind,300);setTimeout(bind,1000);setTimeout(bind,2000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();</script>`;
express.response.send=function(body){if(typeof body==='string'&&this.req&&this.req.path==='/admin.html'&&body.includes('</body>'))body=body.replace('</head>',finalProblemBankAdminStyle+'</head>').replace('</body>',finalProblemBankAdminScript+'</body>');return originalProblemBankAdminSend.call(this,body);};

const originalNavigationSend=express.response.send;
express.response.send=function(body){
  if(typeof body==='string'&&this.req&&this.req.path==='/admin.html'&&body.includes('</body>')){
    const navigationScript=`<script id="admin-problem-bank-navigation-guard">(function(){
      function go(e){
        var btn=e.target&&e.target.closest?e.target.closest('#students .pb-progress-btn'):null;
        if(!btn)return;
        var row=btn.closest('.student');
        var id=Number(btn.dataset.studentId||(row&&row.dataset.studentId)||0);
        if(!id)return;
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation)e.stopImmediatePropagation();
        window.location.assign('/problem-bank.html?id='+encodeURIComponent(id));
      }
      document.addEventListener('click',go,true);
    })();</script>`;
    body=body.replace('</body>',navigationScript+'</body>');
  }
  return originalNavigationSend.call(this,body);
};
console.log('GREENSUM admin problem bank final navigation guard loaded');
