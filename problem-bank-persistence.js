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
async function getStudent(id){
  return (await pool.query(`SELECT id,name,username FROM users WHERE id=$1 AND role='student'`,[id])).rows[0];
}
async function saveForUser(userId,schools,status){
  const row=(await pool.query(`INSERT INTO problem_bank_progress(user_id,schools,status,updated_at) VALUES($1,$2::jsonb,$3::jsonb,NOW()) ON CONFLICT(user_id) DO UPDATE SET schools=EXCLUDED.schools,status=EXCLUDED.status,updated_at=NOW() RETURNING schools,status,updated_at`,[userId,JSON.stringify(cleanSchools(schools)),JSON.stringify(cleanStatus(status))])).rows[0];
  return row;
}

function install(app){
  if(installed)return;
  installed=true;

  app.get('/api/problem-bank',async(req,res)=>{
    try{
      if(!req.session.user)return res.status(401).json({error:'로그인이 필요합니다.'});
      await ensureTable();
      const row=(await pool.query('SELECT schools,status,updated_at FROM problem_bank_progress WHERE user_id=$1',[req.session.user.id])).rows[0];
      res.set('Cache-Control','no-store');
      res.json({id:req.session.user.id,name:req.session.user.name,username:req.session.user.username,schools:cleanSchools(row?.schools),status:cleanStatus(row?.status),updated_at:row?.updated_at||null});
    }catch(e){
      console.error('problem bank GET',e);
      res.status(500).json({error:'문제은행 저장 내용을 불러오지 못했습니다.',code:'PB_GET_500'});
    }
  });

  app.get('/api/admin/problem-bank',async(req,res)=>{
    try{
      if(!req.session.user||req.session.user.role!=='admin')return res.status(403).json({error:'관리자 권한이 필요합니다.'});
      await ensureTable();
      const rows=(await pool.query(`SELECT u.id,u.name,u.username,u.role,p.schools,p.status,p.updated_at FROM users u LEFT JOIN problem_bank_progress p ON p.user_id=u.id WHERE u.role='student' ORDER BY u.id ASC`)).rows;
      res.set('Cache-Control','no-store');
      res.json(rows.map(r=>({id:r.id,name:r.name,username:r.username,schools:cleanSchools(r.schools),status:cleanStatus(r.status),updated_at:r.updated_at||null})));
    }catch(e){
      console.error('admin problem bank GET',e);
      res.status(500).json({error:'학생별 문제은행 진행상황을 불러오지 못했습니다.',code:'PB_ADMIN_LIST_500'});
    }
  });

  app.get('/api/admin/problem-bank/:id',async(req,res)=>{
    try{
      if(!req.session.user||req.session.user.role!=='admin')return res.status(403).json({error:'관리자 권한이 필요합니다.',code:'PB_ADMIN_AUTH'});
      await ensureTable();
      const id=Number(req.params.id);
      if(!Number.isInteger(id)||id<=0)return res.status(400).json({error:'학생 번호가 올바르지 않습니다.',code:'PB_ADMIN_ID'});
      const student=await getStudent(id);
      if(!student)return res.status(404).json({error:'학생을 찾을 수 없습니다.',code:'PB_ADMIN_NOT_FOUND'});
      const row=(await pool.query(`SELECT schools,status,updated_at FROM problem_bank_progress WHERE user_id=$1`,[id])).rows[0];
      res.set('Cache-Control','no-store');
      return res.json({id:student.id,name:student.name,username:student.username,schools:cleanSchools(row?.schools),status:cleanStatus(row?.status),updated_at:row?.updated_at||null});
    }catch(e){
      console.error('admin problem bank detail GET',e);
      return res.status(500).json({error:'문제은행 진행상황을 불러오지 못했습니다.',code:'PB_ADMIN_DETAIL_500',detail:String(e?.message||e).slice(0,240)});
    }
  });

  // IMPORTANT: admin-target pages are opened with /problem-bank.html?id=STUDENT_ID.
  // Their browser session is the admin session, so the normal PUT /api/problem-bank
  // would otherwise save into the admin's own user_id. This route explicitly targets
  // the student ID from the URL and is the only write path used by admin-target pages.
  app.put('/api/admin/problem-bank/:id',async(req,res)=>{
    try{
      if(!req.session.user||req.session.user.role!=='admin')return res.status(403).json({error:'관리자 권한이 필요합니다.',code:'PB_ADMIN_PUT_AUTH'});
      await ensureTable();
      const id=Number(req.params.id);
      if(!Number.isInteger(id)||id<=0)return res.status(400).json({error:'학생 번호가 올바르지 않습니다.',code:'PB_ADMIN_PUT_ID'});
      const student=await getStudent(id);
      if(!student)return res.status(404).json({error:'학생을 찾을 수 없습니다.',code:'PB_ADMIN_PUT_NOT_FOUND'});
      const schools=cleanSchools(req.body?.schools);
      const status=cleanStatus(req.body?.status);
      const row=await saveForUser(id,schools,status);
      res.set('Cache-Control','no-store');
      return res.json({ok:true,id:student.id,name:student.name,username:student.username,schools:cleanSchools(row.schools),status:cleanStatus(row.status),updated_at:row.updated_at});
    }catch(e){
      console.error('admin problem bank PUT',e);
      return res.status(500).json({error:'학생별 문제은행 진행상황 저장에 실패했습니다.',code:'PB_ADMIN_PUT_500',detail:String(e?.message||e).slice(0,240)});
    }
  });

  app.put('/api/problem-bank',async(req,res)=>{
    try{
      if(!req.session.user)return res.status(401).json({error:'로그인이 필요합니다.'});
      await ensureTable();
      const schools=cleanSchools(req.body?.schools);
      const status=cleanStatus(req.body?.status);
      const row=await saveForUser(req.session.user.id,schools,status);
      res.set('Cache-Control','no-store');
      res.json({ok:true,id:req.session.user.id,name:req.session.user.name,username:req.session.user.username,schools:cleanSchools(row.schools),status:cleanStatus(row.status),updated_at:row.updated_at});
    }catch(e){
      console.error('problem bank PUT',e);
      res.status(500).json({error:'문제은행 진행상황 저장에 실패했습니다.',code:'PB_PUT_500',detail:String(e?.message||e).slice(0,240)});
    }
  });
}

const originalListen=express.application.listen;
express.application.listen=function(...args){
  const app=this;
  install(app);
  ensureTable().then(()=>originalListen.apply(app,args)).catch(err=>{
    console.error('problem bank table init',err);
    process.exit(1);
  });
};

const originalSend=express.response.send;
express.response.send=function(body){
  if(typeof body==='string'&&this.req&&this.req.path==='/problem-bank.html'&&body.includes('</body>')){
    const script=`<script id="problem-bank-server-sync-v7">(function(){
let syncing=false,timer=null;
const SCHOOL_KEY='greensum_problem_bank_schools';
const STATUS_PREFIX='greensum_problem_bank_status_';
const params=new URLSearchParams(location.search);
const targetId=Number(params.get('id')||0);
const isAdminTarget=Number.isInteger(targetId)&&targetId>0;
const apiBase=isAdminTarget?('/api/admin/problem-bank/'+encodeURIComponent(targetId)):'/api/problem-bank';
function state(t,ok){let e=document.getElementById('problemBankSaveState');if(!e){e=document.createElement('div');e.id='problemBankSaveState';e.style='position:fixed;right:14px;bottom:14px;z-index:9999;padding:9px 12px;border-radius:10px;background:#fff;border:1px solid #dce2e8;box-shadow:0 8px 24px #00000012;font-size:12px;font-weight:800';document.body.appendChild(e)}e.textContent=t;e.style.color=ok?'#26734d':'#7d8791';}
function schools(){try{const v=JSON.parse(localStorage.getItem(SCHOOL_KEY)||'[]');return Array.isArray(v)&&v.length===3?v:['','',''];}catch(e){return ['','',''];}}
function statuses(){const out={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k||!k.startsWith(STATUS_PREFIX))continue;const v=localStorage.getItem(k)||'';if(v&&v!=='미진행')out[k.slice(STATUS_PREFIX.length)]=v;}document.querySelectorAll('.status[data-school][data-prompt]').forEach(el=>{const k=el.dataset.school+'::'+el.dataset.prompt;const v=el.value||'미진행';if(v&&v!=='미진행')out[k]=v;});return out;}
async function sync(){if(syncing)return;syncing=true;try{const payload={schools:schools(),status:statuses()};const r=await fetch(apiBase,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});if(!r.ok){const j=await r.json().catch(()=>({}));throw Error(j.error||'save');}state('✓ 학생별 문제은행 저장됨',true);return await r.json();}catch(e){console.warn('problem bank sync',e);state('저장 실패 · 다시 시도해주세요',false);return null;}finally{syncing=false;}}
function schedule(){clearTimeout(timer);timer=setTimeout(sync,150);state('저장 중…',false);}
function bind(){document.querySelectorAll('.status').forEach(e=>{if(e.dataset.serverBound)return;e.dataset.serverBound='1';e.addEventListener('change',()=>{localStorage.setItem(STATUS_PREFIX+e.dataset.school+'::'+e.dataset.prompt,e.value);schedule();});});if(typeof window.saveSchools==='function'&&!window.saveSchools.__serverBound){const old=window.saveSchools;const wrapped=function(){const r=old.apply(this,arguments);schedule();return r};wrapped.__serverBound=true;window.saveSchools=wrapped;}}
async function loadServer(){try{const r=await fetch(apiBase,{credentials:'same-origin',cache:'no-store'});if(!r.ok){const j=await r.json().catch(()=>({}));throw Error(j.error||'load');}const d=await r.json();localStorage.setItem(SCHOOL_KEY,JSON.stringify(Array.isArray(d.schools)?d.schools:['','','']));for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.startsWith(STATUS_PREFIX))localStorage.removeItem(k);}Object.keys(d.status||{}).forEach(k=>localStorage.setItem(STATUS_PREFIX+k,d.status[k]));if(isAdminTarget){document.title=(d.name||'학생')+' · 문제은행 · 그린섬';const brand=document.querySelector('.brand');if(brand)brand.innerHTML='<b>G</b> '+String(d.name||'학생')+' · 문제은행';}if(typeof window.load==='function')window.load();if(typeof window.render==='function')window.render();if(typeof window.renderGallery==='function')window.renderGallery();bind();state(d.updated_at?'✓ 학생별 저장내용 불러옴':'✓ 학생별 문제은행 자동 저장 준비',true);}catch(e){console.warn('problem bank load',e);bind();state('문제은행 연결 실패',false);}}
function boot(){setTimeout(loadServer,80);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
new MutationObserver(bind).observe(document.body,{childList:true,subtree:true});
})();</script>`;
    body=body.replace('</body>',script+'</body>');
  }
  return originalSend.call(this,body);
};
console.log('GREENSUM problem bank persistence v7 loaded');
