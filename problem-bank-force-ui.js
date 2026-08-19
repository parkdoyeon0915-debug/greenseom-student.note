const express=require('express');
const fs=require('fs');
const path=require('path');

function inject(html){
  if(typeof html!=='string'||!html.includes('</body>')||html.includes('id="problemBankServerControls"'))return html;
  const style=`<style id="problem-bank-force-ui-style">
#problemBankServerControls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:18px;padding-top:16px;border-top:1px solid #e4e8ec}
#problemBankServerControls .pb-label{font-size:14px;font-weight:900;margin-right:auto}
#problemBankServerControls .pb-sub{display:block;color:#8a939c;font-size:11px;font-weight:600;margin-top:3px}
#problemBankServerControls .pb-id{font-size:12px;font-weight:900;background:#f1f4f7;border-radius:999px;padding:7px 10px}
#problemBankServerControls .pb-state{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:8px 11px;border-radius:10px;background:#f5f7fa;color:#7d8791;font-size:12px;font-weight:800}
#problemBankServerControls .ok{background:#edf8f1;color:#26734d}.warn{background:#fff7e8;color:#9a6a16}.err{background:#fff0f0;color:#a33b3b}
#problemBankServerControls .pb-btn{min-height:40px}
@media(max-width:700px){#problemBankServerControls .pb-label{width:100%;margin-right:0}#problemBankServerControls .pb-btn{flex:1}#problemBankServerControls .pb-state{width:100%}}
</style>`;
  const script=`<script id="problem-bank-force-ui-script">(function(){
'use strict';
const q=s=>document.querySelector(s);
const id=Number(new URLSearchParams(location.search).get('id')||0);
let api=null;
let me=null;
function state(t,c){const e=q('#pbServerState');if(e){e.className='pb-state '+(c||'');e.textContent=t}}
function read(){const schools=['','',''];document.querySelectorAll('#selects select[data-slot]').forEach(x=>{const i=Number(x.dataset.slot);if(i>=0&&i<3)schools[i]=x.value||''});const status={};document.querySelectorAll('.status[data-school][data-prompt]').forEach(x=>{if(x.value&&x.value!=='미진행')status[x.dataset.school+'::'+x.dataset.prompt]=x.value});return {schools,status}}
function apply(d){const vals=Array.isArray(d.schools)?d.schools:['','',''];const sels=[...document.querySelectorAll('#selects select[data-slot]')];sels.forEach((x,i)=>{x.value=vals[i]||'';x.dispatchEvent(new Event('change',{bubbles:true}))});setTimeout(()=>{Object.entries(d.status||{}).forEach(([k,v])=>{const a=k.split('::'),el=[...document.querySelectorAll('.status[data-school][data-prompt]')].find(x=>x.dataset.school===a[0]&&x.dataset.prompt===a.slice(1).join('::'));if(el){el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}))}})},100)}
async function resolveApi(){
  if(api)return api;
  const r=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});
  const d=await r.json().catch(()=>({}));
  me=d.user||null;
  if(!me)throw Error('로그인이 필요합니다.');
  if(id>0){
    if(me.role==='admin'){
      api='/api/admin/problem-bank/'+encodeURIComponent(id);
    }else if(me.role==='student'&&Number(me.id)===id){
      api='/api/problem-bank';
    }else{
      throw Error('이 학생의 문제은행을 저장하려면 관리자 계정으로 로그인해주세요.');
    }
  }else{
    api='/api/problem-bank';
  }
  return api;
}
async function loadServer(){
  const b=q('#pbServerLoad');if(b)b.disabled=true;state('로그인 권한 확인 중…');
  try{
    const endpoint=await resolveApi();
    const r=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'}),d=await r.json().catch(()=>({}));
    if(!r.ok)throw Error((d.error||'HTTP '+r.status)+(d.code?' ['+d.code+']':''));
    apply(d);
    if(q('#pbStudentId'))q('#pbStudentId').textContent=d.id?'학생 ID '+d.id:(me?.role==='admin'?'관리자':'내 학생 계정');
    state(d.updated_at?'✓ 서버 저장 내용을 불러왔습니다.':'✓ 서버 연결됨','ok');
    if(q('#pbServerLastSaved'))q('#pbServerLastSaved').textContent=d.updated_at?'마지막 저장 · '+new Date(d.updated_at).toLocaleString('ko-KR'):'아직 서버에 저장된 기록이 없습니다.'
  }catch(e){
    state('서버 불러오기 실패','err');
    if(q('#pbServerLastSaved'))q('#pbServerLastSaved').textContent=e.message||e;
  }finally{if(b)b.disabled=false}
}
async function saveServer(){
  const b=q('#pbServerSave');if(b)b.disabled=true;state('서버에 저장하는 중…');
  try{
    const endpoint=await resolveApi();
    const r=await fetch(endpoint,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(read())}),d=await r.json().catch(()=>({}));
    if(!r.ok)throw Error((d.error||'HTTP '+r.status)+(d.code?' ['+d.code+']':''));
    apply(d);
    state('✓ 서버에 저장되었습니다.','ok');
    if(q('#pbServerLastSaved'))q('#pbServerLastSaved').textContent=d.updated_at?'마지막 저장 · '+new Date(d.updated_at).toLocaleString('ko-KR'):'저장 완료'
  }catch(e){
    state('서버 저장 실패','err');
    if(q('#pbServerLastSaved'))q('#pbServerLastSaved').textContent=e.message||e;
  }finally{if(b)b.disabled=false}
}
function mount(){if(q('#problemBankServerControls'))return true;const h=q('.hero');if(!h)return false;const box=document.createElement('div');box.id='problemBankServerControls';box.innerHTML='<div class="pb-label">☁️ 서버 저장 <span class="pb-sub">학교 선택과 문제은행 진행상황을 서버에 저장합니다.</span></div><span class="pb-id" id="pbStudentId">학생 ID 확인 중</span><button class="btn pb-btn" id="pbServerLoad" type="button">서버에서 불러오기</button><button class="btn primary pb-btn" id="pbServerSave" type="button">서버에 저장</button><span class="pb-state" id="pbServerState">서버 저장 준비</span><span class="pb-sub" id="pbServerLastSaved" style="width:100%;margin-top:-3px">아직 서버 데이터를 불러오지 않았습니다.</span>';h.appendChild(box);q('#pbServerLoad').onclick=loadServer;q('#pbServerSave').onclick=saveServer;return true}
function boot(){if(mount())setTimeout(loadServer,150);else setTimeout(boot,100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();</script>`;
  return html.replace('</head>',style+'</head>').replace('</body>',script+'</body>');
}

const originalSendFile=express.response.sendFile;
express.response.sendFile=function(file,options,callback){
  try{
    if(path.basename(String(file||''))==='problem-bank.html'){
      const html=fs.readFileSync(file,'utf8');
      return this.type('html').send(inject(html));
    }
  }catch(e){console.error('problem bank force sendFile UI',e);}
  return originalSendFile.call(this,file,options,callback);
};

const originalStatic=express.static;
express.static=function(root,options){
  const middleware=originalStatic(root,options);
  return function(req,res,next){
    if(req.path==='/problem-bank.html'){
      try{
        const html=fs.readFileSync(path.join(root,'problem-bank.html'),'utf8');
        return res.type('html').send(inject(html));
      }catch(e){console.error('problem bank force static UI',e);return next(e)}
    }
    return middleware(req,res,next);
  };
};

console.log('GREENSUM problem bank force UI loaded: role-aware server save');