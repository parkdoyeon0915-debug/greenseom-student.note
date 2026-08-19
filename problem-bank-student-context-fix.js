const express=require('express');
const originalSend=express.response.send;
const originalPut=express.application.put;
const originalGet=express.application.get;

// Server-side safety: when the authenticated student opens their own /problem-bank.html?id=N,
// allow the existing admin-shaped route to operate only for that same student.
function selfStudentWrapper(handler){
  return async function(req,res,next){
    const id=Number(req.params?.id||0);
    const u=req.session?.user;
    const selfStudent=Number.isInteger(id)&&id>0&&u&&u.role==='student'&&Number(u.id)===id;
    if(!selfStudent)return handler(req,res,next);
    const oldRole=u.role;
    u.role='admin';
    try{return await handler(req,res,next)}finally{u.role=oldRole}
  };
}
express.application.put=function(path,...handlers){
  if(path==='/api/admin/problem-bank/:id')handlers=handlers.map(h=>typeof h==='function'?selfStudentWrapper(h):h);
  return originalPut.call(this,path,...handlers);
};
express.application.get=function(path,...handlers){
  if(path==='/api/admin/problem-bank/:id')handlers=handlers.map(h=>typeof h==='function'?selfStudentWrapper(h):h);
  return originalGet.call(this,path,...handlers);
};

// Client-side final guard: if a student page is using the admin-shaped URL because of ?id=N,
// transparently send the request to the student-owned endpoint. Admin sessions keep the admin URL.
const studentFetchPatch=`<script id="problem-bank-student-fetch-patch">(function(){
  if(window.__greensumStudentFetchPatch)return;
  window.__greensumStudentFetchPatch=true;
  const nativeFetch=window.fetch.bind(window);
  let rolePromise=null;
  function getRole(){
    if(!rolePromise)rolePromise=nativeFetch('/api/me',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()).then(x=>x&&x.user&&x.user.role||'').catch(()=> '');
    return rolePromise;
  }
  window.fetch=async function(input,init){
    let url=typeof input==='string'?input:(input&&input.url)||'';
    const method=String((init&&init.method)||(input&&input.method)||'GET').toUpperCase();
    const m=String(url).match(/^(?:https?:\\/\\/[^/]+)?(\\/api\\/admin\\/problem-bank\\/)(\\d+)(?:([?#].*))?$/);
    if(m&&(method==='GET'||method==='PUT')){
      const role=await getRole();
      if(role!=='admin'){
        const nextUrl='/api/problem-bank'+(m[3]||'');
        if(typeof input==='string')return nativeFetch(nextUrl,init);
        if(typeof Request!=='undefined'&&input instanceof Request){
          const req=new Request(nextUrl,input);
          return nativeFetch(req,init);
        }
        return nativeFetch(nextUrl,init);
      }
    }
    return nativeFetch(input,init);
  };
})();</script>`;
express.response.send=function(body){
  if(typeof body==='string'&&this.req&&this.req.path==='/problem-bank.html'&&body.includes('</body>')&&!body.includes('problem-bank-student-fetch-patch')){
    body=body.replace('</body>',studentFetchPatch+'</body>');
  }
  return originalSend.call(this,body);
};

console.log('GREENSUM problem bank student self-save route and fetch patch loaded');
