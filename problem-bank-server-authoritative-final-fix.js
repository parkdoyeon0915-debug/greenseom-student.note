const express=require('express');
const fs=require('fs');
const path=require('path');

// Final authoritative layer for /problem-bank.html?id=STUDENT_ID.
// The page UI may still use its legacy localStorage implementation, but for
// admin-target pages the server/database is the source of truth. Every load
// comes from the selected student's DB row, and every school/status change is
// written back to that same student's row.
const originalStatic=express.static;
if(!originalStatic.__greensumProblemBankServerAuthoritativeFinal){
  function inject(html){
    const script=`<script id="problem-bank-server-authoritative-final">(function(){
      const params=new URLSearchParams(location.search);
      const targetId=Number(params.get('id')||0);
      if(!Number.isInteger(targetId)||targetId<=0)return;
      const api='/api/admin/problem-bank/'+encodeURIComponent(targetId);
      let saving=false,saveTimer=null,booted=false;
      const SCHOOL_KEY='greensum_problem_bank_schools';
      const STATUS_PREFIX='greensum_problem_bank_status_';
      const PHOTO_KEY='greensum_problem_bank_photos';
      const PHOTO_SCOPE=PHOTO_KEY+'__student_'+targetId;
      const nativeGet=Storage.prototype.getItem;
      const nativeSet=Storage.prototype.setItem;
      const nativeRemove=Storage.prototype.removeItem;
      function statusFromDom(){
        const out={};
        document.querySelectorAll('.status[data-school][data-prompt]').forEach(el=>{
          const v=el.value||'미진행';
          if(v&&v!=='미진행')out[String(el.dataset.school)+'::'+String(el.dataset.prompt)]=v;
        });
        return out;
      }
      function schoolsFromDom(){
        const out=['','',''];
        document.querySelectorAll('#selects select[data-slot]').forEach(el=>{
          const i=Number(el.dataset.slot);
          if(i>=0&&i<3)out[i]=el.value||'';
        });
        return out;
      }
      function toast(text,ok){
        let e=document.getElementById('pbServerState');
        if(!e){e=document.createElement('div');e.id='pbServerState';e.style='position:fixed;right:14px;bottom:14px;z-index:99999;padding:9px 12px;border:1px solid #dce2e8;border-radius:10px;background:#fff;box-shadow:0 8px 24px #0002;font-size:12px;font-weight:800';document.body.appendChild(e)}
        e.textContent=text;e.style.color=ok?'#26734d':'#7d8791';
      }
      function applyServer(d){
        const schools=Array.isArray(d.schools)?d.schools:['','',''];
        localStorage.setItem(SCHOOL_KEY,JSON.stringify(schools));
        const n=localStorage.length,remove=[];
        for(let i=0;i<n;i++){const k=localStorage.key(i);if(k&&k.startsWith(STATUS_PREFIX))remove.push(k)}
        remove.forEach(k=>localStorage.removeItem(k));
        Object.keys(d.status||{}).forEach(k=>localStorage.setItem(STATUS_PREFIX+k,d.status[k]));
        if(d.name){document.title=String(d.name)+' · 문제은행 · 그린섬';const b=document.querySelector('.brand');if(b)b.innerHTML='<b>G</b> '+String(d.name)+' · 문제은행'}
        if(typeof window.load==='function')window.load();
        if(typeof window.render==='function')window.render();
        if(typeof window.renderGallery==='function')window.renderGallery();
      }
      async function loadServer(){
        try{
          const r=await fetch(api,{credentials:'same-origin',cache:'no-store'});
          const d=await r.json().catch(()=>({}));
          if(!r.ok)throw Error(d.error||('HTTP '+r.status));
          applyServer(d);booted=true;toast('✓ 학생별 서버 저장내용 불러옴',true);
        }catch(e){console.warn('problem bank authoritative load',e);toast('학생별 서버 저장내용을 불러오지 못했습니다.',false)}
      }
      async function saveServer(){
        if(!booted||saving)return;
        saving=true;toast('학생별 서버에 저장 중…',false);
        try{
          const payload={schools:schoolsFromDom(),status:statusFromDom()};
          const r=await fetch(api,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(payload)});
          const d=await r.json().catch(()=>({}));
          if(!r.ok)throw Error(d.error||('HTTP '+r.status));
          applyServer(d);toast('✓ 이 학생에게만 저장됨',true);
        }catch(e){console.warn('problem bank authoritative save',e);toast('저장 실패 · 다시 시도해주세요',false)}
        finally{saving=false}
      }
      function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(saveServer,120)}
      function isolatePhotos(){
        try{
          const scoped=nativeGet.call(localStorage,PHOTO_SCOPE);
          if(scoped!==null)nativeSet.call(localStorage,PHOTO_KEY,scoped);
          else nativeRemove.call(localStorage,PHOTO_KEY);
          const oldSet=Storage.prototype.setItem,oldRemove=Storage.prototype.removeItem;
          if(!oldSet.__greensumPhotoScope){
            const wrappedSet=function(k,v){oldSet.call(this,k,v);if(k===PHOTO_KEY)nativeSet.call(this,PHOTO_SCOPE,v)};
            wrappedSet.__greensumPhotoScope=true;Storage.prototype.setItem=wrappedSet;
            const wrappedRemove=function(k){oldRemove.call(this,k);if(k===PHOTO_KEY)nativeRemove.call(this,PHOTO_SCOPE)};
            wrappedRemove.__greensumPhotoScope=true;Storage.prototype.removeItem=wrappedRemove;
          }
        }catch(e){}
      }
      document.addEventListener('change',function(e){
        if(e.target&&e.target.matches&&e.target.matches('#selects select[data-slot],.status[data-school][data-prompt]'))scheduleSave();
      },true);
      async function boot(){
        isolatePhotos();
        await loadServer();
      }
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else setTimeout(boot,0);
    })();</script>`;
    return html.includes('</body>')?html.replace('</body>',script+'</body>'):html+script;
  }
  const wrappedStatic=function(root,options){
    const middleware=originalStatic(root,options);
    return function(req,res,next){
      if(req.path==='/problem-bank.html'&&req.session&&req.session.user&&req.session.user.role==='admin'){
        const id=Number(new URLSearchParams((req.url||'').split('?')[1]||'').get('id')||0);
        if(Number.isInteger(id)&&id>0){
          const file=path.join(root,'problem-bank.html');
          try{
            if(fs.existsSync(file)){
              const html=inject(fs.readFileSync(file,'utf8'));
              return res.type('html').set('Cache-Control','no-store').send(html);
            }
          }catch(e){console.warn('problem bank authoritative static final',e)}
        }
      }
      return middleware(req,res,next);
    };
  };
  wrappedStatic.__greensumProblemBankServerAuthoritativeFinal=true;
  express.static=wrappedStatic;
}
console.log('GREENSUM problem bank server authoritative final fix loaded');
