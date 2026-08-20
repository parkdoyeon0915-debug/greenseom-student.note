const express=require('express');

// Absolute final student guard for the problem-bank page.
// The repository currently contains several historical UI patches that can
// choose /api/admin/problem-bank/:id before the authenticated role is known.
// This last-loaded layer makes the authenticated session authoritative:
// students always use /api/problem-bank; admins may use ?id=N.
const previousSend=express.response.send;

const patch=`<script id="problem-bank-student-absolute-final">(function(){
'use strict';
const nativeFetch=window.fetch.bind(window);
let rolePromise=null;

function getRole(){
  if(rolePromise)return rolePromise;
  rolePromise=nativeFetch('/api/me',{credentials:'same-origin',cache:'no-store'})
    .then(r=>r.json().catch(()=>({})))
    .then(d=>String(d&&d.user&&d.user.role||''));
  return rolePromise;
}

function requestUrl(input){
  try{
    if(typeof input==='string')return new URL(input,location.origin).pathname;
    if(input&&input.url)return new URL(input.url,location.origin).pathname;
  }catch(e){}
  return '';
}

// This intercept is deliberately based on the logged-in role, not on URL id.
// That prevents a stale ?id=N script from sending a student to the admin API.
window.fetch=function(input,init){
  const path=requestUrl(input);
  if(path.indexOf('/api/admin/problem-bank/')===0){
    return getRole().then(function(role){
      if(role==='student'){
        return nativeFetch('/api/problem-bank',init);
      }
      return nativeFetch(input,init);
    });
  }
  return nativeFetch(input,init);
};

async function finalStudentGuard(){
  const role=await getRole().catch(()=> '');
  if(role!=='student')return;

  // A student page is never an admin target page.
  if(new URLSearchParams(location.search).has('id')){
    history.replaceState(null,document.title,location.pathname+location.hash);
  }

  const box=document.getElementById('problemBankServerControls');
  if(!box)return;
  box.dataset.absoluteFinal='1';

  const state=document.getElementById('pbServerState');
  const last=document.getElementById('pbServerLastSaved');
  const save=document.getElementById('pbServerSave');
  const load=document.getElementById('pbServerLoad');

  async function loadStudent(){
    if(load)load.disabled=true;
    if(state){state.className='pb-state';state.textContent='서버 데이터를 불러오는 중…';}
    try{
      const r=await nativeFetch('/api/problem-bank',{credentials:'same-origin',cache:'no-store'});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw Error(d.error||('HTTP '+r.status));
      apply(d);
      if(state){state.className='pb-state ok';state.textContent=d.updated_at?'✓ 서버 저장 내용 불러옴':'✓ 서버 연결됨';}
      if(last)last.textContent=d.updated_at?'마지막 저장 · '+new Date(d.updated_at).toLocaleString('ko-KR'):'아직 서버에 저장된 기록이 없습니다.';
    }catch(e){
      if(state){state.className='pb-state err';state.textContent='서버 불러오기 실패';}
      if(last)last.textContent=e.message||String(e);
    }finally{if(load)load.disabled=false;}
  }

  function readScreen(){
    const schools=['','',''];
    document.querySelectorAll('#selects select[data-slot]').forEach(function(el){
      const i=Number(el.dataset.slot);if(i>=0&&i<3)schools[i]=el.value||'';
    });
    const status={};
    document.querySelectorAll('.status[data-school][data-prompt]').forEach(function(el){
      const v=el.value||'미진행';
      if(v&&v!=='미진행')status[String(el.dataset.school)+'::'+String(el.dataset.prompt)]=v;
    });
    return {schools,status};
  }

  function apply(d){
    const schools=Array.isArray(d.schools)?d.schools:['','',''];
    const sels=[...document.querySelectorAll('#selects select[data-slot]')];
    sels.forEach(function(el,i){
      el.value=schools[i]||'';
      el.dispatchEvent(new Event('change',{bubbles:true}));
    });
    setTimeout(function(){
      Object.entries(d.status||{}).forEach(function(entry){
        const k=entry[0],v=entry[1],parts=k.split('::');
        const el=[...document.querySelectorAll('.status[data-school][data-prompt]')].find(function(x){
          return x.dataset.school===parts[0]&&x.dataset.prompt===parts.slice(1).join('::');
        });
        if(el){el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));}
      });
    },80);
    const id=document.getElementById('pbStudentId');
    if(id)id.textContent=d.id?'학생 ID '+d.id:'내 학생 계정';
    if(d.name){
      document.title=String(d.name)+' · 문제은행 · 그린섬';
      const brand=document.querySelector('.brand');if(brand)brand.innerHTML='<b>G</b> '+String(d.name)+' · 문제은행';
    }
  }

  async function saveStudent(){
    if(save)save.disabled=true;
    if(state){state.className='pb-state';state.textContent='서버에 저장하는 중…';}
    try{
      const r=await nativeFetch('/api/problem-bank',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(readScreen())});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw Error((d.error||('HTTP '+r.status))+(d.code?' ['+d.code+']':''));
      apply(d);
      if(state){state.className='pb-state ok';state.textContent='✓ 서버에 안전하게 저장됨';}
      if(last)last.textContent=d.updated_at?'마지막 저장 · '+new Date(d.updated_at).toLocaleString('ko-KR'):'저장 완료';
    }catch(e){
      if(state){state.className='pb-state err';state.textContent='서버 저장 실패';}
      if(last)last.textContent=e.message||String(e);
    }finally{if(save)save.disabled=false;}
  }

  if(load)load.onclick=loadStudent;
  if(save)save.onclick=saveStudent;
  // Capture phase prevents an older click handler from winning the race.
  if(save&&!save.dataset.absoluteClickGuard){
    save.dataset.absoluteClickGuard='1';
    save.addEventListener('click',function(e){
      e.preventDefault();e.stopImmediatePropagation();
      saveStudent();
    },true);
  }

  // Replace any old admin error text left by historical patches.
  if(state&&state.textContent.indexOf('관리자 권한')>=0)state.textContent='서버 저장 준비';
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',finalStudentGuard,{once:true});
else finalStudentGuard();
})();</script>`;

express.response.send=function(body){
  if(typeof body==='string'&&this.req&&this.req.path==='/problem-bank.html'&&body.includes('</body>')){
    body=body.replace('</body>',patch+'</body>');
  }
  return previousSend.call(this,body);
};

console.log('GREENSUM problem bank absolute student final guard loaded');
