const express=require('express');
const originalSend=express.response.send;

const style=`<style id="admin-problem-bank-binding-style">
#students .student{position:relative;flex-wrap:wrap}
#students .student>div:last-child{position:relative;z-index:10002;display:flex!important;gap:8px;flex-wrap:wrap;align-items:center}
#students .student .pb-progress-btn{display:inline-flex!important;position:relative;z-index:10003;pointer-events:auto!important;cursor:pointer!important;touch-action:manipulation!important}
#students .student .pb-progress-panel{width:100%;position:relative;z-index:5}
</style>`;

const script=`<script id="admin-problem-bank-binding-fix-v5">(function(){
function getId(row){
  const direct=Number(row.dataset.studentId||0);if(direct)return direct;
  const el=row.querySelector('[onclick*="show("]');
  const m=el&&String(el.getAttribute('onclick')||'').match(/show\\(\\s*(\\d+)\\s*\\)/);
  if(m)return Number(m[1]);
  return 0;
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function cls(v){return v==='완료'?'pb-done':v==='수정필요'?'pb-edit':v==='채색중'?'pb-color':v==='러프스케치'?'pb-rough':v==='디테일스케치'?'pb-detail':'';}
function renderPanel(panel,p){
  if(!p||!p.updated_at){panel.innerHTML='<div class="muted">이 학생의 문제은행 기록이 없습니다.</div>';return;}
  const schools=Array.isArray(p.schools)?p.schools.filter(Boolean):[];
  const status=p.status&&typeof p.status==='object'?p.status:{};
  if(!schools.length){panel.innerHTML='<div class="muted">아직 선택한 문제가 없습니다.</div>';return;}
  let html='<div class="pb-summary">선택 학교 '+schools.length+'개 · 마지막 저장 '+esc(new Date(p.updated_at).toLocaleString('ko-KR'))+'</div>';
  schools.forEach(s=>{
    const entries=Object.keys(status).filter(k=>k.indexOf(s+'::')===0);
    html+='<div class="pb-school"><div class="pb-school-title">🏫 '+esc(s)+'</div>';
    if(!entries.length){html+='<div class="muted">아직 진행 기록이 없습니다.</div>';}
    else html+='<div class="pb-prompts">'+entries.map(k=>{const v=status[k]||'미진행';return '<div class="pb-prompt '+cls(v)+'"><span>'+esc(k.slice(s.length+2))+'</span><b>'+esc(v)+'</b></div>';}).join('')+'</div>';
    html+='</div>';
  });
  panel.innerHTML=html;
}
function addButtons(){
  document.querySelectorAll('#students .student').forEach(row=>{
    const id=getId(row);if(!id)return;
    let btn=row.querySelector('.pb-progress-btn');
    if(!btn){
      const actions=row.lastElementChild;if(!actions)return;
      btn=document.createElement('button');btn.type='button';btn.className='btn pb-progress-btn';btn.textContent='문제은행 진도';btn.dataset.studentId=String(id);actions.appendChild(btn);
    }else if(!btn.dataset.studentId){btn.dataset.studentId=String(id);}
    if(btn.dataset.pbBound==='1')return;
    btn.dataset.pbBound='1';
    btn.addEventListener('click',async e=>{
      e.preventDefault();e.stopImmediatePropagation();
      let panel=row.querySelector('.pb-progress-panel');
      if(!panel){panel=document.createElement('div');panel.className='pb-progress-panel';row.appendChild(panel);}
      const opening=!panel.classList.contains('open');panel.classList.toggle('open');
      if(!opening)return;
      panel.innerHTML='<div class="muted">문제은행 진도를 불러오는 중...</div>';
      try{
        const studentId=Number(btn.dataset.studentId);
        const r=await fetch('/api/admin/problem-bank/'+encodeURIComponent(studentId),{credentials:'same-origin',cache:'no-store'});
        const p=await r.json().catch(()=>({}));
        if(r.status===404){renderPanel(panel,null);return;}
        if(!r.ok)throw Error(p.error||('HTTP '+r.status));
        renderPanel(panel,p);
      }catch(err){panel.innerHTML='<div class="muted">문제은행 진도를 불러오지 못했습니다.</div>';console.warn('admin problem bank button',err);}
    },true);
  });
}
function boot(){
  addButtons();
  const root=document.getElementById('students');
  if(root&&!root.dataset.pbV5Observer){root.dataset.pbV5Observer='1';new MutationObserver(()=>setTimeout(addButtons,0)).observe(root,{childList:true,subtree:true});}
  setTimeout(addButtons,50);setTimeout(addButtons,300);setTimeout(addButtons,1000);setTimeout(addButtons,2000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();</script>`;

express.response.send=function(body){
  if(typeof body==='string'&&this.req&&this.req.path==='/admin.html'&&body.includes('</body>'))body=body.replace('</head>',style+'</head>').replace('</body>',script+'</body>');
  return originalSend.call(this,body);
};
console.log('GREENSUM admin problem bank binding v5 loaded');
