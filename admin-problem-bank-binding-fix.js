const express=require('express');
const originalSend=express.response.send;
const script=`<script id="admin-problem-bank-binding-fix">(function(){
function getId(row){
  const el=row.querySelector('[onclick*="show("]');
  const raw=el&&el.getAttribute('onclick')||'';
  const m=raw.match(/show\((\d+)\)/);
  return m?Number(m[1]):0;
}
function addButtons(){
  document.querySelectorAll('#students .student').forEach(row=>{
    if(row.querySelector('.pb-progress-btn'))return;
    const id=getId(row); if(!id)return;
    const actions=row.querySelector('div:last-child'); if(!actions)return;
    const btn=document.createElement('button');
    btn.type='button'; btn.className='btn pb-progress-btn'; btn.textContent='문제은행 진도';
    const panel=document.createElement('div');
    panel.className='pb-progress-panel';
    panel.innerHTML='<div class="muted">불러오는 중...</div>';
    btn.addEventListener('click',async e=>{
      e.preventDefault(); e.stopPropagation();
      panel.classList.toggle('open');
      if(!panel.dataset.loaded){
        panel.dataset.loaded='1';
        try{
          const r=await fetch('/api/admin/problem-bank',{credentials:'same-origin',cache:'no-store'});
          const all=await r.json();
          const p=Array.isArray(all)?all.find(x=>Number(x.id)===id):null;
          if(!p){panel.innerHTML='<div class="muted">이 학생의 문제은행 기록이 없습니다.</div>';return;}
          const schools=Array.isArray(p.schools)?p.schools.filter(Boolean):[];
          const status=p.status&&typeof p.status==='object'?p.status:{};
          let html='<div class="pb-summary">선택 학교 '+schools.length+'개</div>';
          schools.forEach(s=>{
            const entries=Object.keys(status).filter(k=>k.startsWith(s+'::')).map(k=>[k.slice(s.length+2),status[k]]);
            html+='<div class="pb-school"><div class="pb-school-title">🏫 '+String(s).replace(/[&<>]/g,'')+'</div>';
            html+=entries.length?'<div class="pb-prompts">'+entries.map(e=>'<div class="pb-prompt"><span>'+String(e[0]).replace(/[&<>]/g,'')+'</span><b>'+String(e[1]).replace(/[&<>]/g,'')+'</b></div>').join('')+'</div>':'<div class="muted">아직 진행 기록이 없습니다.</div>';
            html+='</div>';
          });
          panel.innerHTML=schools.length?html:'<div class="muted">아직 선택한 문제가 없습니다.</div>';
        }catch(err){panel.innerHTML='<div class="muted">문제은행 진도를 불러오지 못했습니다.</div>';}
      }
    });
    actions.appendChild(btn); row.appendChild(panel);
  });
}
function boot(){
  addButtons();
  const root=document.getElementById('students');
  if(root&&!root.dataset.pbBindObserver){root.dataset.pbBindObserver='1';new MutationObserver(()=>setTimeout(addButtons,0)).observe(root,{childList:true,subtree:true});}
  setTimeout(addButtons,100);setTimeout(addButtons,500);setTimeout(addButtons,1500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();</script>`;
express.response.send=function(body){if(typeof body==='string'&&this.req&&this.req.path==='/admin.html'&&body.includes('</body>'))body=body.replace('</body>',script+'</body>');return originalSend.call(this,body)};
console.log('GREENSUM admin problem bank button binding fix loaded');
