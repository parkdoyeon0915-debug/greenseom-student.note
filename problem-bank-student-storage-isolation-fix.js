const express=require('express');

// Admin problem-bank pages are opened as /problem-bank.html?id=STUDENT_ID.
// The page itself still uses fixed localStorage keys. Because localStorage is
// shared by every tab on the same origin, opening student A and student B can
// make the two pages display each other's problem-bank state even though the
// server URLs are different.
//
// Scope only the problem-bank keys by target student ID on admin target pages.
// The existing page code can keep using its original keys, while each tab gets
// its own virtual namespace backed by the same browser localStorage.
const originalStatic=express.static;

if(!originalStatic.__greensumProblemBankStorageIsolationFix){
  const wrappedStatic=function(root,options){
    const middleware=originalStatic(root,options);
    return function(req,res,next){
      if(req.path==='/problem-bank.html'&&req.session&&req.session.user&&req.session.user.role==='admin'){
        const rawId=new URLSearchParams((req.url||'').split('?')[1]||'').get('id');
        const targetId=Number(rawId||0);
        if(Number.isInteger(targetId)&&targetId>0){
          const originalSend=res.send.bind(res);
          res.send=function(body){
            if(typeof body==='string')body=injectIsolation(body,targetId);
            return originalSend(body);
          };
        }
      }
      return middleware(req,res,next);
    };
  };

  function injectIsolation(html,targetId){
    const script=`<script id="problem-bank-student-storage-isolation-fix">(function(){
      const targetId=${JSON.stringify(targetId)};
      const SCHOOL_KEY='greensum_problem_bank_schools';
      const STATUS_PREFIX='greensum_problem_bank_status_';
      const PHOTO_KEY='greensum_problem_bank_photos';
      const SCOPE='__student_'+targetId;
      const nativeGet=Storage.prototype.getItem;
      const nativeSet=Storage.prototype.setItem;
      const nativeRemove=Storage.prototype.removeItem;
      const nativeKey=Storage.prototype.key;
      const nativeLength=Object.getOwnPropertyDescriptor(Storage.prototype,'length');
      function isProblemKey(k){
        return k===SCHOOL_KEY||k===PHOTO_KEY||String(k||'').startsWith(STATUS_PREFIX);
      }
      function scopedKey(k){
        k=String(k);
        if(!isProblemKey(k))return k;
        return k+SCOPE;
      }
      function isScopedRaw(k){
        return String(k||'').endsWith(SCOPE)&&isProblemKey(String(k||'').slice(0,-SCOPE.length));
      }
      function unscopedKey(k){
        const s=String(k||'');
        return isScopedRaw(s)?s.slice(0,-SCOPE.length):s;
      }
      function visibleKeys(){
        const out=[];
        const n=nativeLength.get.call(localStorage);
        for(let i=0;i<n;i++){
          const raw=nativeKey.call(localStorage,i);
          if(raw==null)continue;
          if(isScopedRaw(raw))out.push(unscopedKey(raw));
          else if(!isProblemKey(raw))out.push(raw);
        }
        return out;
      }
      Storage.prototype.getItem=function(k){
        return nativeGet.call(this,scopedKey(k));
      };
      Storage.prototype.setItem=function(k,v){
        return nativeSet.call(this,scopedKey(k),v);
      };
      Storage.prototype.removeItem=function(k){
        return nativeRemove.call(this,scopedKey(k));
      };
      Storage.prototype.key=function(i){
        const keys=visibleKeys();
        return keys[i]===undefined?null:keys[i];
      };
      Object.defineProperty(Storage.prototype,'length',{configurable:true,get:function(){return visibleKeys().length;}});
      // Remove only stale unscoped problem-bank keys from this origin. They are
      // no longer used by the admin-target page and would otherwise be shared.
      try{
        const n=nativeLength.get.call(localStorage);
        const stale=[];
        for(let i=0;i<n;i++){
          const raw=nativeKey.call(localStorage,i);
          if(raw&&isProblemKey(raw)&&!isScopedRaw(raw))stale.push(raw);
        }
        stale.forEach(k=>nativeRemove.call(localStorage,k));
      }catch(e){}
      window.__greensumProblemBankStudentId=targetId;
      console.log('GREENSUM problem bank localStorage isolated for student',targetId);
    })();</script>`;
    if(html.includes('</head>'))return html.replace('</head>',script+'</head>');
    return html.includes('</body>')?html.replace('</body>',script+'</body>'):html+script;
  }

  wrappedStatic.__greensumProblemBankStorageIsolationFix=true;
  express.static=wrappedStatic;
}

console.log('GREENSUM problem bank student storage isolation fix loaded');
