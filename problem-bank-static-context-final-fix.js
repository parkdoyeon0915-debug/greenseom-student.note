const express=require('express');
const fs=require('fs');
const path=require('path');

// problem-bank.html is normally served by express.static(), so response.send()
// hooks do not reliably run. Wrap express.static itself and handle the page
// before the static middleware gets a chance to serve it.
const originalStatic=express.static;
if(!originalStatic.__greensumProblemBankContextFinalFix){
  function injectAdminContext(html){
    const script=`<script id="problem-bank-static-context-final-fix">(function(){
      const params=new URLSearchParams(location.search);
      const targetId=Number(params.get('id')||0);
      if(!Number.isInteger(targetId)||targetId<=0)return;
      const originalFetch=window.fetch.bind(window);
      const targetUrl='/api/admin/problem-bank/'+encodeURIComponent(targetId);
      let active=false;
      function rewrite(input,init){
        const raw=typeof input==='string'?input:(input&&input.url)||'';
        if(raw!=='/api/problem-bank'&&!raw.endsWith('/api/problem-bank'))return [input,init];
        if(typeof input==='string')return [targetUrl,init];
        try{return [new Request(targetUrl,input),init]}catch(e){return [targetUrl,init]}
      }
      window.fetch=function(input,init){
        if(!active)return originalFetch(input,init);
        const pair=rewrite(input,init);
        return originalFetch(pair[0],pair[1]);
      };
      async function boot(){
        try{
          const meR=await originalFetch('/api/me',{credentials:'same-origin',cache:'no-store'});
          const me=await meR.json().catch(()=>({}));
          if(!meR.ok||!me.user||me.user.role!=='admin')return;
          active=true;
          const r=await originalFetch(targetUrl,{credentials:'same-origin',cache:'no-store'});
          const p=await r.json().catch(()=>({}));
          if(!r.ok)throw Error(p.error||('HTTP '+r.status));
          localStorage.setItem('greensum_problem_bank_schools',JSON.stringify(Array.isArray(p.schools)?p.schools:['','','']));
          for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.startsWith('greensum_problem_bank_status_'))localStorage.removeItem(k);}
          Object.keys(p.status||{}).forEach(k=>localStorage.setItem('greensum_problem_bank_status_'+k,p.status[k]));
          const photoNamespace='greensum_problem_bank_photos_student_'+targetId;
          const photos=localStorage.getItem(photoNamespace);
          if(photos!==null)localStorage.setItem('greensum_problem_bank_photos',photos);
          else localStorage.removeItem('greensum_problem_bank_photos');
          document.title=(p.name||'학생')+' · 문제은행 · 그린섬';
          const brand=document.querySelector('.brand');
          if(brand)brand.innerHTML='<b>G</b> '+String(p.name||'학생')+' · 문제은행';
          if(typeof window.load==='function')window.load();
          if(typeof window.render==='function')window.render();
          if(typeof window.renderGallery==='function')window.renderGallery();
        }catch(e){console.warn('problem bank static context final fix',e);}
      }
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
    })();</script>`;
    return html.includes('</body>')?html.replace('</body>',script+'</body>'):html+script;
  }

  const wrappedStatic=function(root,options){
    const middleware=originalStatic(root,options);
    return function(req,res,next){
      if(req.path==='/problem-bank.html'&&req.session&&req.session.user){
        const user=req.session.user;
        const rawId=new URLSearchParams((req.url||'').split('?')[1]||'').get('id');
        const requestedId=Number(rawId||0);

        // Students can only use their own problem-bank context. If they enter
        // the page without an id, attach their logged-in DB user id.
        if(user.role==='student'){
          if(Number.isInteger(Number(user.id))&&Number(user.id)>0&&requestedId!==Number(user.id)){
            return res.redirect('/problem-bank.html?id='+encodeURIComponent(Number(user.id)));
          }
          return middleware(req,res,next);
        }

        // Admin URLs may target a specific student with ?id=123. Serve the
        // page with a small bootstrap script that loads that student's data.
        if(user.role==='admin'&&Number.isInteger(requestedId)&&requestedId>0){
          const file=path.join(root,'problem-bank.html');
          try{
            if(fs.existsSync(file)){
              const html=injectAdminContext(fs.readFileSync(file,'utf8'));
              res.type('html').set('Cache-Control','no-store').send(html);
              return;
            }
          }catch(e){console.warn('problem bank admin static context',e);}
        }
      }
      return middleware(req,res,next);
    };
  };
  wrappedStatic.__greensumProblemBankContextFinalFix=true;
  express.static=wrappedStatic;
}

console.log('GREENSUM problem bank static context final fix loaded');
