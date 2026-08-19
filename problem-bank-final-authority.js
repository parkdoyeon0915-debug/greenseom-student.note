const express=require('express');
const prev=express.response.send;
const style=`<style id="pb-server-ui-style">
#problemBankServerControls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:18px;padding-top:16px;border-top:1px solid #e4e8ec}
#problemBankServerControls .pb-label{font-size:14px;font-weight:900;margin-right:auto}
#problemBankServerControls .pb-sub{display:block;color:#8a939c;font-size:11px;font-weight:600;margin-top:3px}
#problemBankServerControls .pb-id{font-size:12px;font-weight:900;background:#f1f4f7;border-radius:999px;padding:7px 10px}
#problemBankServerControls .pb-state{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:8px 11px;border-radius:10px;background:#f5f7fa;color:#7d8791;font-size:12px;font-weight:800}
#problemBankServerControls .ok{background:#edf8f1;color:#26734d}#problemBankServerControls .warn{background:#fff7e8;color:#9a6a16}#problemBankServerControls .err{background:#fff0f0;color:#a33b3b}
@media(max-width:700px){#problemBankServerControls .pb-label{width:100%;margin-right:0}#problemBankServerControls .pb-btn{flex:1}#problemBankServerControls .pb-state{width:100%}}
</style>`;
const script=`<script id="problem-bank-server-ui-script">(function(){
const q=s=>document.querySelector(s),p=new URLSearchParams(location.search),id=Number(p.get('id')||0),admin=Number.isInteger(id)&&id>0;
const api=admin?'/api/admin/problem-bank/'+id:'/api/problem-bank',SK='greensum_problem_bank_schools',PK='greensum_problem_bank_photos',SP='greensum_problem_bank_status_',sf='__student_'+(admin?id:'session');
const get=Storage.prototype.getItem,set=Storage.prototype.setItem,rem=Storage.prototype.removeItem,sc=k=>String(k||'')+sf;
const isPB=k=>k===SK||k===PK||String(k||'').startsWith(SP);
Storage.prototype.getItem=function(k){return isPB(k)?get.call(this,sc(k)):get.call(this,k)};
Storage.prototype.setItem=function(k,v){return isPB(k)?set.call(this,sc(k),v):set.call(this,k,v)};
Storage.prototype.removeItem=function(k){return isPB(k)?rem.call(this,sc(k)):rem.call(this,k)};
let dirty=false;
function state(t,c){const e=q('#pbServerState');if(e){e.className='pb-state '+(c||'');e.textContent=t}}
function dirtyNow(){dirty=true;state('● 변경사항이 아직 서버에 저장되지 않았어요.','warn')}
function screen(){const schools=['','',''];q('#selects')?.querySelectorAll('select[data-slot]').forEach(x=>{schools[+x.dataset.slot]=x.value||''});const status={};document.querySelectorAll('.status[data-school][data-prompt]').forEach(x=>{if(x.value&&x.value!=='미진행')status[x.dataset.school+'::'+x.dataset.prompt]=x.value});return {schools,status}}
function apply(d){set.call(localStorage,sc(SK),JSON.stringify(d.schools||['','','']));const old=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(SP)&&k.endsWith(sf))old.push(k)}old.forEach(k=>rem.call(localStorage,k));Object.entries(d.status||{}).forEach(([k,v])=>set.call(localStorage,sc(SP+k),v));window.load?.();window.render?.();window.renderGallery?.()}
async function loadServer(){const b=q('#pbServerLoad');if(b)b.disabled=true;state('서버 데이터를 불러오는 중…');try{const r=await fetch(api,{credentials:'same-origin',cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error((d.error||'HTTP '+r.status)+(d.code?' ['+d.code+']':''));apply(d);dirty=false;q('#pbStudentId').textContent=d.id?'학생 ID '+d.id:'내 학생 계정';state(d.updated_at?'✓ 서버 저장 내용을 불러왔습니다.':'✓ 서버 연결됨','ok');q('#pbServerLastSaved').textContent=d.updated_at?'마지막 저장 · '+new Date(d.updated_at).toLocaleString('ko-KR'):'아직 서버에 저장된 기록이 없습니다.';if(d.name){document.title=d.name+' · 문제은행 · 그린섬';q('.brand').innerHTML='<b>G</b> '+d.name+' · 문제은행'}}catch(e){state('서버 불러오기에 실패했습니다.','err');q('#pbServerLastSaved').textContent=e.message||e}finally{if(b)b.disabled=false}}
async function saveServer(){const b=q('#pbServerSave');if(b)b.disabled=true;state('서버에 저장하는 중…');try{const r=await fetch(api,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(screen())}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error((d.error||'HTTP '+r.status)+(d.code?' ['+d.code+']':''));apply(d);dirty=false;state('✓ 서버에 저장되었습니다.','ok');q('#pbServerLastSaved').textContent=d.updated_at?'마지막 저장 · '+new Date(d.updated_at).toLocaleString('ko-KR'):'저장 완료'}catch(e){state('서버 저장에 실패했습니다.','err');q('#pbServerLastSaved').textContent=e.message||e}finally{if(b)b.disabled=false}}
function bind(){document.querySelectorAll('#selects select[data-slot],.status[data-school][data-prompt]').forEach(x=>{if(x.dataset.pbBound)return;x.dataset.pbBound='1';x.addEventListener('change',()=>setTimeout(dirtyNow,0))})}
function mount(){const old=q('#problemBankServerControls');if(old?.dataset.pbFinalUi==='1'){bind();return true}if(old)old.remove();const h=q('.hero');if(!h)return false;const box=document.createElement('div');box.id='problemBankServerControls';box.dataset.pbFinalUi='1';box.innerHTML='<div class="pb-label">☁️ 서버 저장 <span class="pb-sub">학생별 학교 선택과 문제은행 진행상황을 서버에 저장합니다.</span></div><span class="pb-id" id="pbStudentId">학생 ID 확인 중</span><button class="btn pb-btn" id="pbServerLoad" type="button">서버에서 불러오기</button><button class="btn primary pb-btn" id="pbServerSave" type="button">서버에 저장</button><span class="pb-state" id="pbServerState">서버 저장 준비</span><span class="pb-sub" id="pbServerLastSaved" style="width:100%;margin-top:-3px">아직 서버 데이터를 불러오지 않았습니다.</span>';h.appendChild(box);q('#pbServerLoad').onclick=loadServer;q('#pbServerSave').onclick=saveServer;bind();return true}
function boot(){if(mount())setTimeout(loadServer,120)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
new MutationObserver(()=>{mount();bind()}).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='저장하지 않은 문제은행 변경사항이 있습니다.'}});
})();</script>`;
express.response.send=function(body){if(typeof body==='string'&&this.req?.path==='/problem-bank.html'&&body.includes('</body>')&&!body.includes('id="problem-bank-server-ui-script"'))body=body.replace('</head>',style+'</head>').replace('</body>',script+'</body>');return prev.call(this,body)};

// /problem-bank.html is currently inside express.static(). Static-file responses do not pass through res.send,
// so intercept only this HTML asset and send it through the normal response.send pipeline above.
const nativeStatic=express.static;
express.static=function(root,options){
  const staticMiddleware=nativeStatic(root,options);
  return function(req,res,next){
    if(req.path==='/problem-bank.html'){
      try{
        const fs=require('fs');
        const path=require('path');
        const html=fs.readFileSync(path.join(root,'problem-bank.html'),'utf8');
        return res.type('html').send(html);
      }catch(e){return next(e)}
    }
    return staticMiddleware(req,res,next);
  };
};

console.log('GREENSUM problem bank server save UI loaded');
