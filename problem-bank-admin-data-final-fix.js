const express=require('express');
const {Pool}=require('pg');

// FINAL fix: admin target pages (/problem-bank.html?id=STUDENT_ID) must edit
// the selected student's DB row, not the admin session's row, and must not
// share the page's fixed localStorage keys with another student tab.
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2,idleTimeoutMillis:30000});
let installed=false;

function cleanSchools(value){
  let v=value;
  if(typeof v==='string'){try{v=JSON.parse(v);}catch(e){v=[];}}
  const out=Array.isArray(v)?v.slice(0,3).map(x=>typeof x==='string'?x:''):[];
  while(out.length<3)out.push('');
  return out;
}
function cleanStatus(value){
  let v=value;
  if(typeof v==='string'){try{v=JSON.parse(v);}catch(e){v={};}}
  const out={};
  if(v&&typeof v==='object'&&!Array.isArray(v)){
    Object.entries(v).forEach(([k,x])=>{
      if(typeof k==='string'&&typeof x==='string'&&k.length<300&&x.length<50&&x!=='미진행')out[k]=x;
    });
  }
  return out;
}
async function ensureTable(){
  await pool.query(`CREATE TABLE IF NOT EXISTS problem_bank_progress(
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    schools JSONB NOT NULL DEFAULT '[]'::jsonb,
    status JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}
function install(app){
  if(installed)return;
  installed=true;
  app.put('/api/admin/problem-bank/:id',async(req,res)=>{
    try{
      if(!req.session.user||req.session.user.role!=='admin')return res.status(403).json({error:'관리자 권한이 필요합니다.',code:'PB_ADMIN_PUT_AUTH'});
      const id=Number(req.params.id);
      if(!Number.isInteger(id)||id<=0)return res.status(400).json({error:'학생 번호가 올바르지 않습니다.',code:'PB_ADMIN_PUT_ID'});
      const student=(await pool.query(`SELECT id,name,username FROM users WHERE id=$1 AND role='student'`,[id])).rows[0];
      if(!student)return res.status(404).json({error:'학생을 찾을 수 없습니다.',code:'PB_ADMIN_PUT_NOT_FOUND'});
      await ensureTable();
      const schools=cleanSchools(req.body?.schools);
      const status=cleanStatus(req.body?.status);
      const row=(await pool.query(`INSERT INTO problem_bank_progress(user_id,schools,status,updated_at) VALUES($1,$2::jsonb,$3::jsonb,NOW()) ON CONFLICT(user_id) DO UPDATE SET schools=EXCLUDED.schools,status=EXCLUDED.status,updated_at=NOW() RETURNING schools,status,updated_at`,[id,JSON.stringify(schools),JSON.stringify(status)])).rows[0];
      res.set('Cache-Control','no-store');
      res.json({ok:true,id:student.id,name:student.name,username:student.username,schools:cleanSchools(row.schools),status:cleanStatus(row.status),updated_at:row.updated_at});
    }catch(e){
      console.error('admin problem bank PUT final',e);
      res.status(500).json({error:'학생 문제은행 저장에 실패했습니다.',code:'PB_ADMIN_PUT_500',detail:String(e?.message||e).slice(0,240)});
    }
  });
}
const previousListen=express.application.listen;
express.application.listen=function(...args){
  const app=this;
  install(app);
  return previousListen.apply(app,args);
};

const previousSend=express.response.send;
express.response.send=function(body){
  if(typeof body==='string'&&this.req&&this.req.path==='/problem-bank.html'&&body.includes('</body>')){
    const script=`<script id="problem-bank-admin-data-final-fix">(function(){
      const params=new URLSearchParams(location.search);
      const targetId=Number(params.get('id')||0);
      if(!Number.isInteger(targetId)||targetId<=0)return;
      const SCHOOLS='greensum_problem_bank_schools';
      const STATUS='greensum_problem_bank_status_';
      const PHOTOS='greensum_problem_bank_photos';
      const suffix='__student_'+targetId;
      const nativeGet=Storage.prototype.getItem;
      const nativeSet=Storage.prototype.setItem;
      const nativeRemove=Storage.prototype.removeItem;
      const nativeKey=Storage.prototype.key;
      const nativeLength=Object.getOwnPropertyDescriptor(Storage.prototype,'length').get;
      function problem(k){return k===SCHOOLS||k===PHOTOS||String(k||'').startsWith(STATUS);}
      function scoped(k){return problem(k)?String(k)+suffix:String(k);}
      function visible(){
        const out=[];const n=nativeLength.call(localStorage);
        for(let i=0;i<n;i++){const k=nativeKey.call(localStorage,i);if(k==null)continue;if(k.endsWith(suffix)&&problem(k.slice(0,-suffix.length)))out.push(k.slice(0,-suffix.length));else if(!problem(k))out.push(k);}
        return out;
      }
      Storage.prototype.getItem=function(k){return nativeGet.call(this,scoped(k));};
      Storage.prototype.setItem=function(k,v){return nativeSet.call(this,scoped(k),v);};
      Storage.prototype.removeItem=function(k){return nativeRemove.call(this,scoped(k));};
      Storage.prototype.key=function(i){const a=visible();return a[i]===undefined?null:a[i];};
      Object.defineProperty(Storage.prototype,'length',{configurable:true,get:function(){return visible().length;}});
      // Never use the old shared keys on an admin target page.
      try{
        const n=nativeLength.call(localStorage);const stale=[];
        for(let i=0;i<n;i++){const k=nativeKey.call(localStorage,i);if(k&&problem(k)&&!k.endsWith(suffix))stale.push(k);}
        stale.forEach(k=>nativeRemove.call(localStorage,k));
      }catch(e){}

      const originalFetch=window.fetch.bind(window);
      const api='/api/admin/problem-bank/'+encodeURIComponent(targetId);
      window.fetch=function(input,init){
        const raw=typeof input==='string'?input:(input&&input.url)||'';
        const method=((init&&init.method)||(input&&input.method)||'GET').toUpperCase();
        // Any admin-target problem-bank save must stay bound to targetId.
        if(raw==='/api/problem-bank'&&method==='PUT')return originalFetch(api,init);
        return originalFetch(input,init);
      };

      async function boot(){
        try{
          const r=await originalFetch(api,{credentials:'same-origin',cache:'no-store'});
          const d=await r.json().catch(()=>({}));
          if(!r.ok)throw Error(d.error||('HTTP '+r.status));
          localStorage.setItem(SCHOOLS,JSON.stringify(Array.isArray(d.schools)?d.schools:['','','']));
          for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.startsWith(STATUS))localStorage.removeItem(k);}
          Object.keys(d.status||{}).forEach(k=>localStorage.setItem(STATUS+k,d.status[k]));
          document.title=(d.name||'학생')+' · 문제은행 · 그린섬';
          const brand=document.querySelector('.brand');if(brand)brand.innerHTML='<b>G</b> '+String(d.name||'학생')+' · 문제은행';
          if(typeof window.load==='function')window.load();
          if(typeof window.render==='function')window.render();
          if(typeof window.renderGallery==='function')window.renderGallery();
        }catch(e){console.warn('problem bank admin final load',e);}
      }
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else setTimeout(boot,0);
    })();</script>`;
    body=body.replace('</body>',script+'</body>');
  }
  return previousSend.call(this,body);
};
console.log('GREENSUM problem bank admin data final fix loaded');
