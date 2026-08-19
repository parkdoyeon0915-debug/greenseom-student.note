const express=require('express');

// OUTERMOST problem-bank isolation. This module is intentionally required LAST
// so none of the older express.static wrappers can bypass this patch.
const originalSend=express.response.send;

function inject(html,targetId){
  const api='/api/admin/problem-bank/'+encodeURIComponent(targetId);
  const suffix='__student_'+targetId;
  const script=`<script id="problem-bank-hard-isolation">(function(){
const API=${JSON.stringify(api)};
const SUFFIX=${JSON.stringify(suffix)};
const SCHOOL_KEY='greensum_problem_bank_schools';
const STATUS_PREFIX='greensum_problem_bank_status_';
const PHOTO_KEY='greensum_problem_bank_photos';
const nativeGet=Storage.prototype.getItem;
const nativeSet=Storage.prototype.setItem;
const nativeRemove=Storage.prototype.removeItem;
const nativeKey=Storage.prototype.key;
const nativeLength=Object.getOwnPropertyDescriptor(Storage.prototype,'length').get;
function isPB(k){return k===SCHOOL_KEY||k===PHOTO_KEY||String(k||'').startsWith(STATUS_PREFIX)}
function scoped(k){return isPB(k)?String(k)+SUFFIX:String(k)}
function visibleKeys(){const out=[];const n=nativeLength.call(localStorage);for(let i=0;i<n;i++){const k=nativeKey.call(localStorage,i);if(k==null)continue;if(k.endsWith(SUFFIX)&&isPB(k.slice(0,-SUFFIX.length)))out.push(k.slice(0,-SUFFIX.length));else if(!isPB(k))out.push(k);}return out;}
Storage.prototype.getItem=function(k){return nativeGet.call(this,scoped(k));};
Storage.prototype.setItem=function(k,v){return nativeSet.call(this,scoped(k),v);};
Storage.prototype.removeItem=function(k){return nativeRemove.call(this,scoped(k));};
Storage.prototype.key=function(i){const a=visibleKeys();return a[i]===undefined?null:a[i];};
Object.defineProperty(Storage.prototype,'length',{configurable:true,get:function(){return visibleKeys().length;}});
try{const n=nativeLength.call(localStorage),stale=[];for(let i=0;i<n;i++){const k=nativeKey.call(localStorage,i);if(k&&isPB(k)&&!k.endsWith(SUFFIX))stale.push(k);}stale.forEach(k=>nativeRemove.call(localStorage,k));}catch(e){}
function schoolsFromDom(){const out=['','',''];document.querySelectorAll('#selects select[data-slot]').forEach(el=>{const i=Number(el.dataset.slot);if(i>=0&&i<3)out[i]=el.value||''});return out;}
function statusFromDom(){const out={};document.querySelectorAll('.status[data-school][data-prompt]').forEach(el=>{const v=el.value||'미진행';if(v&&v!=='미진행')out[el.dataset.school+'::'+el.dataset.prompt]=v});return out;}
let ready=false,saving=false,timer=null;
function toast(t,ok){let e=document.getElementById('pbHardState');if(!e){e=document.createElement('div');e.id='pbHardState';e.style='position:fixed;right:14px;bottom:14px;z-index:99999;padding:9px 12px;border:1px solid #dce2e8;border-radius:10px;background:#fff;box-shadow:0 8px 24px #0002;font-size:12px;font-weight:800';document.body.appendChild(e)}e.textContent=t;e.style.color=ok?'#26734d':'#b42318';}
function apply(d){localStorage.setItem(SCHOOL_KEY,JSON.stringify(Array.isArray(d.schools)?d.schools:['','','']));const n=nativeLength.call(localStorage),keys=[];for(let i=0;i<n;i++){const k=nativeKey.call(localStorage,i);if(k&&k.startsWith(STATUS_PREFIX+SUFFIX))keys.push(k)}keys.forEach(k=>nativeRemove.call(localStorage,k));Object.keys(d.status||{}).forEach(k=>nativeSet.call(localStorage,STATUS_PREFIX+k+SUFFIX,d.status[k]));if(d.name){document.title=String(d.name)+' · 문제은행 · 그린섬';const b=document.querySelector('.brand');if(b)b.innerHTML='<b>G</b> '+String(d.name)+' · 문제은행';}if(typeof window.load==='function')window.load();if(typeof window.render==='function')window.render();if(typeof window.renderGallery==='function')window.renderGallery();}
async function save(){if(!ready||saving)return;saving=true;toast('학생별 서버에 저장 중…',false);try{const r=await fetch(API,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({schools:schoolsFromDom(),status:statusFromDom()})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||('HTTP '+r.status));apply(d);toast('✓ 이 학생에게만 저장됨',true);}catch(e){console.warn('problem-bank-hard-isolation save',e);toast('저장 실패 · 다시 시도해주세요',false);}finally{saving=false;}}
function schedule(){clearTimeout(timer);timer=setTimeout(save,120);}
function bind(){document.querySelectorAll('#selects select[data-slot],.status[data-school][data-prompt]').forEach(el=>{if(el.dataset.pbHardBound==='1')return;el.dataset.pbHardBound='1';el.addEventListener('change',schedule,true);});}
async function boot(){try{const r=await fetch(API,{credentials:'same-origin',cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||('HTTP '+r.status));apply(d);ready=true;bind();toast('✓ 학생별 저장내용 불러옴',true);}catch(e){console.warn('problem-bank-hard-isolation load',e);ready=true;bind();toast('학생별 저장내용을 불러오지 못했습니다.',false);}}
new MutationObserver(bind).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else setTimeout(boot,0);
})();</script>`;
  return html.includes('</head>')?html.replace('</head>',script+'</head>'):html.replace('</body>',script+'</body>');
}

express.response.send=function(body){
  if(typeof body==='string'&&this.req&&this.req.path==='/problem-bank.html'&&this.req.session&&this.req.session.user&&this.req.session.user.role==='admin'){
    const id=Number(new URLSearchParams((this.req.url||'').split('?')[1]||'').get('id')||0);
    if(Number.isInteger(id)&&id>0)body=inject(body,id);
  }
  return originalSend.call(this,body);
};
console.log('GREENSUM problem bank HARD isolation loaded LAST');
