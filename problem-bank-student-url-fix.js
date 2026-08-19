const express=require('express');
const fs=require('fs');
const path=require('path');
let installed=false;

function injectServerUI(html){
  if(html.includes('id="problemBankServerControls"'))return html;
  const injected=`
<style id="problem-bank-server-ui-style">
#problemBankServerControls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:18px;padding-top:16px;border-top:1px solid #e4e8ec}
#problemBankServerControls .pb-label{font-size:14px;font-weight:900;margin-right:auto}
#problemBankServerControls .pb-sub{display:block;color:#8a939c;font-size:11px;font-weight:600;margin-top:3px}
#problemBankServerControls .pb-id{font-size:12px;font-weight:900;background:#f1f4f7;border-radius:999px;padding:7px 10px}
#problemBankServerControls .pb-state{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:8px 11px;border-radius:10px;background:#f5f7fa;color:#7d8791;font-size:12px;font-weight:800}
#problemBankServerControls .ok{background:#edf8f1;color:#26734d}#problemBankServerControls .warn{background:#fff7e8;color:#9a6a16}#problemBankServerControls .err{background:#fff0f0;color:#a33b3b}
#problemBankServerControls .pb-btn{min-height:40px}
@media(max-width:700px){#problemBankServerControls .pb-label{width:100%;margin-right:0}#problemBankServerControls .pb-btn{flex:1}#problemBankServerControls .pb-state{width:100%}}
</style>
<script id="problem-bank-server-ui-script">(function(){
'use strict';
const q=s=>document.querySelector(s);
const id=Number(new URLSearchParams(location.search).get('id')||0);
const api=id>0?'/api/admin/problem-bank/'+encodeURIComponent(id):'/api/problem-bank';
function state(t,c){const e=q('#pbServerState');if(e){e.className='pb-state '+(c||'');e.textContent=t}}
function screen(){
 const schools=['','',''];
 document.querySelectorAll('#selects select[data-slot]').forEach(x=>{const i=Number(x.dataset.slot);if(i>=0&&i<3)schools[i]=x.value||''});
 const status={};
 document.querySelectorAll('.status[data-school][data-prompt]').forEach(x=>{if(x.value&&x.value!=='미진행')status[x.dataset.school+'::'+x.dataset.prompt]=x.value});
 return {schools,status};
}
function apply(d){
 const sels=[...document.querySelectorAll('#selects select[data-slot]')];
 const vals=Array.isArray(d.schools)?d.schools:['','',''];
 sels.forEach((x,i)=>{x.value=vals[i]||'';x.dispatchEvent(new Event('change',{bubbles:true}))});
 setTimeout(()=>{Object.entries(d.status||{}).forEach(([k,v])=>{const a=k.split('::');const el=[...document.querySelectorAll('.status[data-school][data-prompt]')].find(x=>x.dataset.school===a[0]&&x.dataset.prompt===a.slice(1).join('::'));if(el){el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}))}})},80);
}
async function loadServer(){
 const b=q('#pbServerLoad');if(b)b.disabled=true;state('서버 데이터를 불러오는 중…');
 try{const r=await fetch(api,{credentials:'same-origin',cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'HTTP '+r.status);apply(d);if(q('#pbStudentId'))q('#pbStudentId').textContent=d.id?'학생 ID '+d.id:'내 학생 계정';state(d.updated_at?'✓ 서버 저장 내용을 불러왔습니다.':'✓ 서버 연결됨','ok');if(q('#pbServerLastSaved'))q('#pbServerLastSaved').textContent=d.updated_at?'마지막 저장 · '+new Date(d.updated_at).toLocaleString('ko-KR'):'아직 서버에 저장된 기록이 없습니다.'}catch(e){state('서버 불러오기에 실패했습니다.','err');if(q('#pbServerLastSaved'))q('#pbServerLastSaved').textContent=e.message||e}finally{if(b)b.disabled=false}
}
async function saveServer(){
 const b=q('#pbServerSave');if(b)b.disabled=true;state('서버에 저장하는 중…');
 try{const r=await fetch(api,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(screen())}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'HTTP '+r.status);state('✓ 서버에 저장되었습니다.','ok');if(q('#pbServerLastSaved'))q('#pbServerLastSaved').textContent=d.updated_at?'마지막 저장 · '+new Date(d.updated_at).toLocaleString('ko-KR'):'저장 완료'}catch(e){state('서버 저장에 실패했습니다.','err');if(q('#pbServerLastSaved'))q('#pbServerLastSaved').textContent=e.message||e}finally{if(b)b.disabled=false}
}
function mount(){
 if(q('#problemBankServerControls'))return true;
 const h=q('.hero');if(!h)return false;
 const box=document.createElement('div');box.id='problemBankServerControls';
 box.innerHTML='<div class="pb-label">☁️ 서버 저장 <span class="pb-sub">학교 선택과 문제은행 진행상황을 서버에 저장합니다.</span></div><span class="pb-id" id="pbStudentId">학생 ID 확인 중</span><button class="btn pb-btn" id="pbServerLoad" type="button">서버에서 불러오기</button><button class="btn primary pb-btn" id="pbServerSave" type="button">서버에 저장</button><span class="pb-state" id="pbServerState">서버 저장 준비</span><span class="pb-sub" id="pbServerLastSaved" style="width:100%;margin-top:-3px">아직 서버 데이터를 불러오지 않았습니다.</span>';
 h.appendChild(box);q('#pbServerLoad').onclick=loadServer;q('#pbServerSave').onclick=saveServer;return true;
}
function boot(){if(mount())setTimeout(loadServer,250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();</script>`;
  return html.replace('</body>',injected+'</body>');
}

function install(app){
  if(installed)return;
  installed=true;
  const middleware=async(req,res,next)=>{
    if(req.path!=='/problem-bank.html'||!req.session||!req.session.user)return next();
    try{
      const file=path.join(__dirname,'public','problem-bank.html');
      if(!fs.existsSync(file))return next();
      const html=fs.readFileSync(file,'utf8');
      return res.type('html').send(injectServerUI(html));
    }catch(e){console.error('problem bank direct UI',e);return next(e)}
  };
  const router=app._router||app.router;
  if(router&&Array.isArray(router.stack)){
    const before=router.stack.length;
    app.use(middleware);
    const layer=router.stack.pop();
    if(router.stack.length>=before)router.stack.unshift(layer);
  }else app.use(middleware);
}

const originalListen=express.application.listen;
express.application.listen=function(...args){const app=this;install(app);return originalListen.apply(app,args)};
console.log('GREENSUM problem bank direct server UI fix loaded v3');
