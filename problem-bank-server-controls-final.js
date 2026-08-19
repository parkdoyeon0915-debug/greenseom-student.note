const express=require('express');
const fs=require('fs');

if(!express.response.__greensumProblemBankFinalControls){
  const script=`<style id="problem-bank-final-controls-style">
#problemBankServerControls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid #e4e8ec}
#problemBankServerControls .pb-label{font-size:13px;font-weight:900;color:#26313b;margin-right:auto}
#problemBankServerControls .pb-sub{display:block;margin-top:2px;font-size:11px;font-weight:600;color:#8a939c}
#problemBankServerControls .pb-state{display:inline-flex;align-items:center;min-height:34px;padding:7px 10px;border-radius:9px;background:#f5f7fa;color:#7d8791;font-size:12px;font-weight:800}
#problemBankServerControls .pb-state.ok{background:#edf8f1;color:#26734d}
#problemBankServerControls .pb-state.err{background:#fff0f0;color:#a33b3b}
#problemBankServerControls .pb-btn{min-height:40px}
@media(max-width:700px){#problemBankServerControls{align-items:stretch}.pb-label{width:100%;margin-right:0!important}.pb-state{order:4;width:100%;justify-content:center}.pb-btn{flex:1}}
</style><script id="problem-bank-final-controls">(function(){
const q=new URLSearchParams(location.search),id=Number(q.get('id')||0),adminTarget=Number.isInteger(id)&&id>0;
const api=adminTarget?'/api/admin/problem-bank/'+encodeURIComponent(id):'/api/problem-bank';
const SCHOOL_KEY='greensum_problem_bank_schools',STATUS_PREFIX='greensum_problem_bank_status_',PHOTO_KEY='greensum_problem_bank_photos',suffix='__student_'+(adminTarget?id:'session');
const get=Storage.prototype.getItem,set=Storage.prototype.setItem,rem=Storage.prototype.removeItem;
const pb=k=>k===SCHOOL_KEY||k===PHOTO_KEY||String(k||'').startsWith(STATUS_PREFIX),sc=k=>String(k)+suffix;
Storage.prototype.getItem=function(k){return pb(k)?get.call(this,sc(k)):get.call(this,k)};
Storage.prototype.setItem=function(k,v){return pb(k)?set.call(this,sc(k),v):set.call(this,k,v)};
Storage.prototype.removeItem=function(k){return pb(k)?rem.call(this,sc(k)):rem.call(this,k)};
function state(t,c){const e=document.getElementById('pbServerState');if(e){e.textContent=t;e.className='pb-state '+(c||'')}}
function schools(){const a=['','',''];document.querySelectorAll('#selects select[data-slot]').forEach(e=>{const i=Number(e.dataset.slot);if(i>=0&&i<3)a[i]=e.value||''});return a}
function status(){const a={};document.querySelectorAll('.status[data-school][data-prompt]').forEach(e=>{if(e.value&&e.value!=='미진행')a[e.dataset.school+'::'+e.dataset.prompt]=e.value});return a}
function apply(d){set.call(localStorage,sc(SCHOOL_KEY),JSON.stringify(Array.isArray(d.schools)?d.schools:['','','']));for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.startsWith(STATUS_PREFIX)&&k.endsWith(suffix))rem.call(localStorage,k)}Object.entries(d.status||{}).forEach(([k,v])=>set.call(localStorage,sc(STATUS_PREFIX+k),v));if(typeof window.load==='function')window.load();if(typeof window.render==='function')window.render();if(typeof window.renderGallery==='function')window.renderGallery()}
async function loadServer(){state('서버 불러오는 중…');try{const r=await fetch(api,{credentials:'same-origin',cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||('HTTP '+r.status));apply(d);state('✓ 서버 데이터 불러옴','ok')}catch(e){console.error(e);state('서버 불러오기 실패','err')}}
async function saveServer(){const b=document.getElementById('pbServerSave');if(b)b.disabled=true;state('서버에 저장 중…');try{const r=await fetch(api,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({schools:schools(),status:status()})}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||('HTTP '+r.status));apply(d);state('✓ 이 학생 ID에 서버 저장됨','ok')}catch(e){console.error(e);state('서버 저장 실패','err')}finally{if(b)b.disabled=false}}
function mount(){if(document.getElementById('problemBankServerControls'))return;const hero=document.querySelector('.hero');if(!hero)return;const b=document.createElement('div');b.id='problemBankServerControls';const l=document.createElement('div');l.className='pb-label';l.innerHTML='☁️ 서버 저장 <span class="pb-sub">학생 ID '+(id||'세션')+'의 문제은행 데이터를 서버에 저장합니다.</span>';const load=document.createElement('button');load.type='button';load.className='btn pb-btn';load.textContent='서버에서 불러오기';load.onclick=loadServer;const save=document.createElement('button');save.type='button';save.className='btn primary pb-btn';save.id='pbServerSave';save.textContent='서버 저장';save.onclick=saveServer;const st=document.createElement('span');st.id='pbServerState';st.className='pb-state';st.textContent='서버 저장 준비';b.append(l,load,save,st);hero.appendChild(b)}
function boot(){mount();setTimeout(loadServer,100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});
})();</script>`;
  function inject(body){
    if(typeof body!=='string'||body.includes('id="problem-bank-final-controls"'))return body;
    return body.includes('</body>')?body.replace('</body>',script+'</body>'):body;
  }
  const originalSend=express.response.send;
  express.response.send=function(body){if(this.req&&this.req.path==='/problem-bank.html')body=inject(typeof body==='string'?body:Buffer.isBuffer(body)?body.toString('utf8'):body);return originalSend.call(this,body)};
  const originalSendFile=express.response.sendFile;
  express.response.sendFile=function(filePath,...args){if(this.req&&this.req.path==='/problem-bank.html'){fs.readFile(filePath,'utf8',(err,body)=>{if(err)return this.status(500).send('문제은행 페이지 로드 오류');this.type('html');return originalSend.call(this,inject(body));});return this;}return originalSendFile.call(this,filePath,...args)};
  const originalWrite=express.response.write;
  const originalEnd=express.response.end;
  express.response.write=function(chunk,encoding,callback){if(this.req&&this.req.path==='/problem-bank.html'){if(!this.__greensumPBChunks)this.__greensumPBChunks=[];if(chunk)this.__greensumPBChunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding));return true}return originalWrite.call(this,chunk,encoding,callback)};
  express.response.end=function(chunk,encoding,callback){if(this.req&&this.req.path==='/problem-bank.html'){if(!this.__greensumPBChunks)this.__greensumPBChunks=[];if(chunk)this.__greensumPBChunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding));const body=Buffer.concat(this.__greensumPBChunks).toString('utf8');this.__greensumPBChunks=null;return originalEnd.call(this,inject(body),encoding,callback)}return originalEnd.call(this,chunk,encoding,callback)};
  express.response.__greensumProblemBankFinalControls=true;
}
console.log('GREENSUM final problem bank controls loaded: send + sendFile + static response buffering');
