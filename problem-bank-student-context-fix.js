const express=require('express');
const {Pool}=require('pg');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2,idleTimeoutMillis:30000});
let installed=false;
let tableReady=null;

async function ensureTable(){
  if(!tableReady){
    tableReady=pool.query(`CREATE TABLE IF NOT EXISTS problem_bank_progress(
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      schools JSONB NOT NULL DEFAULT '[]'::jsonb,
      status JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`).catch(err=>{tableReady=null;throw err;});
  }
  return tableReady;
}
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

function install(app){
  if(installed)return;
  installed=true;

  app.put('/api/admin/problem-bank/:id',async(req,res)=>{
    try{
      if(!req.session.user||req.session.user.role!=='admin')return res.status(403).json({error:'관리자 권한이 필요합니다.',code:'PB_ADMIN_PUT_AUTH'});
      await ensureTable();
      const id=Number(req.params.id);
      if(!Number.isInteger(id)||id<=0)return res.status(400).json({error:'학생 번호가 올바르지 않습니다.',code:'PB_ADMIN_PUT_ID'});
      const student=(await pool.query(`SELECT id,name,username FROM users WHERE id=$1 AND role='student'`,[id])).rows[0];
      if(!student)return res.status(404).json({error:'학생을 찾을 수 없습니다.',code:'PB_ADMIN_PUT_NOT_FOUND'});
      const schools=cleanSchools(req.body?.schools);
      const status=cleanStatus(req.body?.status);
      const row=(await pool.query(`INSERT INTO problem_bank_progress(user_id,schools,status,updated_at) VALUES($1,$2::jsonb,$3::jsonb,NOW()) ON CONFLICT(user_id) DO UPDATE SET schools=EXCLUDED.schools,status=EXCLUDED.status,updated_at=NOW() RETURNING schools,status,updated_at`,[id,JSON.stringify(schools),JSON.stringify(status)])).rows[0];
      res.set('Cache-Control','no-store');
      return res.json({ok:true,id:student.id,name:student.name,username:student.username,schools:cleanSchools(row.schools),status:cleanStatus(row.status),updated_at:row.updated_at});
    }catch(e){
      console.error('admin problem bank PUT target',e);
      return res.status(500).json({error:'학생별 문제은행 저장에 실패했습니다.',code:'PB_ADMIN_PUT_500',detail:String(e?.message||e).slice(0,240)});
    }
  });

  const originalSend=express.response.send;
  express.response.send=function(body){
    if(typeof body==='string'&&this.req&&this.req.path==='/problem-bank.html'&&body.includes('</body>')){
      const script=`<script id="problem-bank-student-context-fix">(function(){
        const params=new URLSearchParams(location.search);
        const targetId=Number(params.get('id')||0);
        if(!Number.isInteger(targetId)||targetId<=0)return;
        const originalFetch=window.fetch.bind(window);
        const originalSetItem=Storage.prototype.setItem;
        const originalRemoveItem=Storage.prototype.removeItem;
        let active=false;
        function targetUrl(){return '/api/admin/problem-bank/'+encodeURIComponent(targetId)}
        function rewrite(input,init){
          const raw=typeof input==='string'?input:(input&&input.url)||'';
          if(raw!=='/api/problem-bank'&&!raw.endsWith('/api/problem-bank'))return [input,init];
          if(typeof input==='string')return [targetUrl(),init];
          try{return [new Request(targetUrl(),input),init]}catch(e){return [targetUrl(),init]}
        }
        window.fetch=function(input,init){
          if(!active)return originalFetch(input,init);
          const pair=rewrite(input,init);
          return originalFetch(pair[0],pair[1]);
        };
        Storage.prototype.setItem=function(k,v){
          originalSetItem.call(this,k,v);
          if(active&&k==='greensum_problem_bank_photos')originalSetItem.call(this,'greensum_problem_bank_photos_student_'+targetId,v);
        };
        Storage.prototype.removeItem=function(k){
          originalRemoveItem.call(this,k);
          if(active&&k==='greensum_problem_bank_photos')originalRemoveItem.call(this,'greensum_problem_bank_photos_student_'+targetId);
        };
        async function boot(){
          try{
            const meR=await originalFetch('/api/me',{credentials:'same-origin',cache:'no-store'});
            const me=await meR.json().catch(()=>({}));
            if(!meR.ok||!me.user||me.user.role!=='admin'){
              active=false;
              return;
            }
            active=true;
            const r=await originalFetch(targetUrl(),{credentials:'same-origin',cache:'no-store'});
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
          }catch(e){
            console.warn('problem bank student context fix',e);
          }
        }
        if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
      })();</script>`;
      body=body.replace('</body>',script+'</body>');
    }
    return originalSend.call(this,body);
  };
}

const originalListen=express.application.listen;
express.application.listen=function(...args){
  const app=this;
  install(app);
  return originalListen.apply(app,args);
};

console.log('GREENSUM problem bank student context fix loaded');
