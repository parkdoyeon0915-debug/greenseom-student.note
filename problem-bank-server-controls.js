const express=require('express');
const fs=require('fs');
const path=require('path');

// Visible server controls for the problem-bank page.
// This module is intentionally a small, final UI layer: it does not replace
// the existing problem-bank API or page renderer. It only makes the explicit
// server load/save actions visible and sends data to the current student's
// scoped endpoint.
const originalStatic=express.static;
if(!originalStatic.__greensumProblemBankServerControls){
  function inject(html){
    if(typeof html!=='string'||!html.includes('</body>'))return html;
    const script=`<script id="problem-bank-server-controls">(function(){
      const params=new URLSearchParams(location.search);
      const requestedId=Number(params.get('id')||0);
      const isAdminTarget=Number.isInteger(requestedId)&&requestedId>0;
      const API=isAdminTarget?('/api/admin/problem-bank/'+encodeURIComponent(requestedId)):'/api/problem-bank';
      const SCHOOL_KEY='greensum_problem_bank_schools';
      const STATUS_PREFIX='greensum_problem_bank_status_';
      const PHOTO_KEY='greensum_problem_bank_photos';
      let busy=false;

      function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}
      function statusFromPage(){
        const out={};
        document.querySelectorAll('.status[data-school][data-prompt]').forEach(el=>{
          const value=el.value||'미진행';
          if(value!=='미진행')out[String(el.dataset.school)+'::'+String(el.dataset.prompt)]=value;
        });
        return out;
      }
      function schoolsFromPage(){
        const out=['','',''];
        document.querySelectorAll('#selects select[data-slot]').forEach(el=>{
          const i=Number(el.dataset.slot);
          if(i>=0&&i<3)out[i]=el.value||'';
        });
        return out;
      }
      function applyData(data){
        const schools=Array.isArray(data.schools)?data.schools:['','',''];
        localStorage.setItem(SCHOOL_KEY,JSON.stringify(schools));
        const remove=[];
        for(let i=0;i<localStorage.length;i++){
          const k=localStorage.key(i);
          if(k&&k.startsWith(STATUS_PREFIX))remove.push(k);
        }
        remove.forEach(k=>localStorage.removeItem(k));
        Object.entries(data.status&&typeof data.status==='object'?data.status:{}).forEach(([k,v])=>localStorage.setItem(STATUS_PREFIX+k,v));
        if(typeof window.load==='function')window.load();
        if(typeof window.render==='function')window.render();
        if(typeof window.renderGallery==='function')window.renderGallery();
      }
      function setState(text,ok){
        const el=document.getElementById('pbServerState');
        if(!el)return;
        el.textContent=text;
        el.style.color=ok?'#26734d':'#7d8791';
      }
      async function loadServer(){
        if(busy)return;
        busy=true;setState('서버 불러오는 중…',false);
        try{
          const r=await fetch(API,{credentials:'same-origin',cache:'no-store'});
          const data=await r.json().catch(()=>({}));
          if(!r.ok)throw Error(data.error||('HTTP '+r.status));
          applyData(data);
          setState('✓ 서버 데이터 불러옴',true);
        }catch(e){
          console.error('problem-bank server load',e);
          setState('서버 불러오기 실패',false);
          alert('서버 데이터를 불러오지 못했습니다.\\n'+(e.message||e));
        }finally{busy=false;}
      }
      async function saveServer(){
        if(busy)return;
        busy=true;setState('서버에 저장 중…',false);
        try{
          const payload={schools:schoolsFromPage(),status:statusFromPage()};
          const r=await fetch(API,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(payload)});
          const data=await r.json().catch(()=>({}));
          if(!r.ok)throw Error((data.error||('HTTP '+r.status))+(data.code?' ['+data.code+']':''));
          applyData(data);
          setState('✓ 이 학생 ID에 서버 저장됨',true);
        }catch(e){
          console.error('problem-bank server save',e);
          setState('서버 저장 실패',false);
          alert('서버 저장에 실패했습니다.\\n'+(e.message||e));
        }finally{busy=false;}
      }
      function mount(){
        if(document.getElementById('problemBankServerControls'))return;
        const hero=document.querySelector('.hero');
        if(!hero)return;
        const box=document.createElement('div');
        box.id='problemBankServerControls';
        box.style='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:18px;padding-top:14px;border-top:1px solid #e4e8ec';
        const loadBtn=document.createElement('button');
        loadBtn.type='button';loadBtn.className='btn';loadBtn.textContent='☁ 서버 불러오기';loadBtn.onclick=loadServer;
        const saveBtn=document.createElement('button');
        saveBtn.type='button';saveBtn.className='btn primary';saveBtn.textContent='☁ 서버 저장';saveBtn.onclick=saveServer;
        const state=document.createElement('span');
        state.id='pbServerState';state.textContent='서버 저장을 사용하세요';state.style='font-size:12px;font-weight:800;margin-left:auto;color:#7d8791';
        box.appendChild(loadBtn);box.appendChild(saveBtn);box.appendChild(state);hero.appendChild(box);
      }
      function boot(){mount();}
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
      new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});
    })();</script>`;
    return html.replace('</body>',script+'</body>');
  }

  const wrappedStatic=function(root,options){
    const middleware=originalStatic(root,options);
    return function(req,res,next){
      if(req.path==='/problem-bank.html'){
        const originalSend=res.send.bind(res);
        res.send=function(body){return originalSend(inject(body));};
      }
      return middleware(req,res,next);
    };
  };
  wrappedStatic.__greensumProblemBankServerControls=true;
  express.static=wrappedStatic;
}
console.log('GREENSUM problem bank server controls loaded');
