const express=require('express');
const fs=require('fs');
const path=require('path');

// FINAL V2: isolate problem-bank state by the actual student id.
// Admin target pages use /api/admin/problem-bank/:id. Student pages use
// /api/problem-bank with the authenticated student's session id. The legacy
// page uses fixed localStorage keys, so those keys are transparently scoped.
const originalStatic=express.static;
if(!originalStatic.__greensumProblemBankServerAuthoritativeFinalV2){
  function inject(html,mode,targetId){
    const api=mode==='admin'
      ? '/api/admin/problem-bank/'+encodeURIComponent(targetId)
      : '/api/problem-bank';
    const suffix='__pb_student_'+String(targetId);
    const script=`<script id="problem-bank-server-authoritative-final-v2">(function(){
      const API=${JSON.stringify(api)};
      const SUFFIX=${JSON.stringify(suffix)};
      const SCHOOL_KEY='greensum_problem_bank_schools';
      const STATUS_PREFIX='greensum_problem_bank_status_';
      const PHOTO_KEY='greensum_problem_bank_photos';
      const nativeGet=Storage.prototype.getItem;
      const nativeSet=Storage.prototype.setItem;
      const nativeRemove=Storage.prototype.removeItem;
      function isProblemKey(k){return k===SCHOOL_KEY||k===PHOTO_KEY||String(k||'').startsWith(STATUS_PREFIX)}
      function scopedKey(k){return isProblemKey(k)?String(k)+SUFFIX:String(k)}
      Storage.prototype.getItem=function(k){return nativeGet.call(this,scopedKey(k));};
      Storage.prototype.setItem=function(k,v){return nativeSet.call(this,scopedKey(k),v);};
      Storage.prototype.removeItem=function(k){return nativeRemove.call(this,scopedKey(k));};

      let saving=false,saveTimer=null,ready=false;
      function toast(text,ok){
        let e=document.getElementById('pbServerState');
        if(!e){e=document.createElement('div');e.id='pbServerState';e.style='position:fixed;right:14px;bottom:14px;z-index:99999;padding:9px 12px;border:1px solid #dce2e8;border-radius:10px;background:#fff;box-shadow:0 8px 24px #0002;font-size:12px;font-weight:800';document.body.appendChild(e)}
        e.textContent=text;e.style.color=ok?'#26734d':'#b42318';
      }
      function schoolsFromDom(){
        const out=['','',''];
        document.querySelectorAll('#selects select[data-slot]').forEach(el=>{const i=Number(el.dataset.slot);if(i>=0&&i<3)out[i]=el.value||''});
        return out;
      }
      function statusFromDom(){
        const out={};
        document.querySelectorAll('.status[data-school][data-prompt]').forEach(el=>{const v=el.value||'미진행';if(v&&v!=='미진행')out[String(el.dataset.school)+'::'+String(el.dataset.prompt)]=v});
        return out;
      }
      function applyServer(d,initial){
        localStorage.setItem(SCHOOL_KEY,JSON.stringify(Array.isArray(d.schools)?d.schools:['','','']));
        const keys=[];
        for(let i=0;i<localStorage.length;i++){
          const k=localStorage.key(i);
          if(k&&k.startsWith(STATUS_PREFIX+SUFFIX))keys.push(k);
        }
        keys.forEach(k=>nativeRemove.call(localStorage,k));
        Object.keys(d.status||{}).forEach(k=>nativeSet.call(localStorage,STATUS_PREFIX+k+SUFFIX,d.status[k]));
        if(d.name){
          document.title=String(d.name)+' · 문제은행 · 그린섬';
          const b=document.querySelector('.brand');
          if(b)b.innerHTML='<b>G</b> '+String(d.name)+' · 문제은행';
        }
        if(typeof window.load==='function')window.load();
        if(typeof window.render==='function')window.render();
        if(typeof window.renderGallery==='function')window.renderGallery();
        if(!initial)bindChanges();
      }
      async function saveServer(){
        if(!ready||saving)return;
        saving=true;toast('저장 중…',false);
        try{
          const r=await fetch(API,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({schools:schoolsFromDom(),status:statusFromDom()})});
          const d=await r.json().catch(()=>({}));
          if(!r.ok)throw Error(d.error||('HTTP '+r.status));
          applyServer(d,false);
          toast('✓ 학생별로 저장됨',true);
        }catch(e){console.warn('problem bank authoritative save',e);toast('저장 실패 · 다시 시도해주세요',false)}
        finally{saving=false}
      }
      function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(saveServer,120)}
      function bindChanges(){
        document.querySelectorAll('#selects select[data-slot],.status[data-school][data-prompt]').forEach(el=>{
          if(el.dataset.pbServerBound==='1')return;
          el.dataset.pbServerBound='1';
          el.addEventListener('change',scheduleSave,true);
        });
      }
      async function boot(){
        try{
          const r=await fetch(API,{credentials:'same-origin',cache:'no-store'});
          const d=await r.json().catch(()=>({}));
          if(!r.ok)throw Error(d.error||('HTTP '+r.status));
          applyServer(d,true);
          ready=true;
          bindChanges();
          toast('✓ 학생별 저장내용 불러옴',true);
        }catch(e){
          console.warn('problem bank authoritative load',e);
          ready=true;
          bindChanges();
          toast('학생별 저장내용을 불러오지 못했습니다.',false);
        }
      }
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else setTimeout(boot,0);
    })();</script>`;
    return html.includes('</body>')?html.replace('</body>',script+'</body>'):html+script;
  }

  const wrappedStatic=function(root,options){
    const middleware=originalStatic(root,options);
    return function(req,res,next){
      if(req.path==='/problem-bank.html'&&req.session&&req.session.user){
        const user=req.session.user;
        let mode=null,targetId=0;
        if(user.role==='admin'){
          const id=Number(new URLSearchParams((req.url||'').split('?')[1]||'').get('id')||0);
          if(Number.isInteger(id)&&id>0){mode='admin';targetId=id;}
        }else if(user.role==='student'){
          targetId=Number(user.id)||0;
          if(targetId>0)mode='student';
        }
        if(mode&&targetId>0){
          const file=path.join(root,'problem-bank.html');
          try{
            if(fs.existsSync(file)){
              const injected=inject(fs.readFileSync(file,'utf8'),mode,targetId);
              return res.type('html').set('Cache-Control','no-store').send(injected);
            }
          }catch(e){console.warn('problem bank authoritative static final v2',e)}
        }
      }
      return middleware(req,res,next);
    };
  };
  wrappedStatic.__greensumProblemBankServerAuthoritativeFinalV2=true;
  express.static=wrappedStatic;
}
console.log('GREENSUM problem bank server authoritative final v2 loaded');

// This is intentionally required LAST in the problem-bank layer stack.
// It injects a final client-side guard after all earlier static/response wrappers.
require('./problem-bank-hard-isolation.js');
