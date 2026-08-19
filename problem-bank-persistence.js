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

// Client state is isolated by the student id in the URL (admin target page)
// or by the authenticated student id. Server save/load is explicit and never
// calls the page's renderer until the scoped local state has been replaced.
const originalSend=express.response.send;
express.response.send=function(body){
  if(typeof body==='string'&&this.req&&this.req.path==='/problem-bank.html'&&body.includes('</body>')){
    const script=`<script id="problem-bank-per-student-sync">(function(){
const params=new URLSearchParams(location.search);
const urlId=Number(params.get('id')||0);
const adminTarget=Number.isInteger(urlId)&&urlId>0;
let targetId=adminTarget?urlId:0;
let api=adminTarget?('/api/admin/problem-bank/'+encodeURIComponent(urlId)):'/api/problem-bank';
const SCHOOL_KEY='greensum_problem_bank_schools';
const STATUS_PREFIX='greensum_problem_bank_status_';
const PHOTO_KEY='greensum_problem_bank_photos';
const nativeGet=Storage.prototype.getItem;
const nativeSet=Storage.prototype.setItem;
const nativeRemove=Storage.prototype.removeItem;
const suffixBase='__student_';
let scopedSuffix=suffixBase+(adminTarget?urlId:'session');
const scopedKey=k=>String(k||'')+scopedSuffix;
function isPB(k){return k===SCHOOL_KEY||k===PHOTO_KEY||String(k||'').startsWith(STATUS_PREFIX)}
Storage.prototype.getItem=function(k){return isPB(k)?nativeGet.call(this,scopedKey(k)):nativeGet.call(this,k)};
Storage.prototype.setItem=function(k,v){return isPB(k)?nativeSet.call(this,scopedKey(k),v):nativeSet.call(this,k,v)};
Storage.prototype.removeItem=function(k){return isPB(k)?nativeRemove.call(this,scopedKey(k)):nativeRemove.call(this,k)};
function notify(text,ok){let e=document.getElementById('problemBankServerState');if(!e){e=document.createElement('span');e.id='problemBankServerState';e.style='font-size:12px;font-weight:800;margin-left:auto;align-self:center';const bar=document.getElementById('problemBankServerControls');if(bar)bar.appendChild(e)}e.textContent=text;e.style.color=ok?'#26734d':'#7d8791';}
function schoolsFromDom(){const out=['','',''];document.querySelectorAll('#selects select[data-slot]').forEach(el=>{const i=Number(el.dataset.slot);if(i>=0&&i<3)out[i]=el.value||''});return out}
function statusFromDom(){const out={};document.querySelectorAll('.status[data-school][data-prompt]').forEach(el=>{const v=el.value||'미진행';if(v&&v!=='미진행')out[String(el.dataset.school)+'::'+String(el.dataset.prompt)]=v});return out}
function setServerData(d){
  nativeSet.call(localStorage,scopedKey(SCHOOL_KEY),JSON.stringify(Array.isArray(d.schools)?d.schools:['','','']));
  const remove=[];
  const n=localStorage.length;
  for(let i=0;i<n;i++){const k=localStorage.key(i);if(k&&k.startsWith(STATUS_PREFIX)&&k.endsWith(scopedSuffix))remove.push(k)}
  remove.forEach(k=>nativeRemove.call(localStorage,k));
  Object.entries(d.status||{}).forEach(([k,v])=>nativeSet.call(localStorage,scopedKey(STATUS_PREFIX+k),v));
  if(typeof window.load==='function')window.load();
  if(typeof window.render==='function')window.render();
  if(typeof window.renderGallery==='function')window.renderGallery();
}
async function serverLoad(){
  notify('서버 내용 불러오는 중…',false);
  try{
    const r=await fetch(api,{credentials:'same-origin',cache:'no-store'});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(d.error||('HTTP '+r.status));
    if(!adminTarget&&d.id)targetId=Number(d.id)||0;
    setServerData(d);
    if(d.name){document.title=String(d.name)+' · 문제은행 · 그린섬';const b=document.querySelector('.brand');if(b)b.innerHTML='<b>G</b> '+String(d.name||'학생')+' · 문제은행';}
    notify('✓ 서버 내용 불러옴',true);
  }catch(e){console.warn('problem bank server load',e);notify('서버 불러오기 실패',false)}
}
async function serverSave(){
  notify('서버에 저장 중…',false);
  try{
    const payload={schools:schoolsFromDom(),status:statusFromDom()};
    const r=await fetch(api,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(payload)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(d.error||('HTTP '+r.status));
    setServerData(d);
    notify('✓ 이 학생 ID에 서버 저장됨',true);
  }catch(e){console.warn('problem bank server save',e);notify('서버 저장 실패',false)}
}
function addControls(){
  if(document.getElementById('problemBankServerControls'))return;
  const hero=document.querySelector('.hero');
  if(!hero)return;
  const bar=document.createElement('div');
  bar.id='problemBankServerControls';
  bar.style='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid #e4e8ec';
  const loadBtn=document.createElement('button');loadBtn.className='btn';loadBtn.textContent='☁ 서버 불러오기';loadBtn.onclick=serverLoad;
  const saveBtn=document.createElement('button');saveBtn.className='btn primary';saveBtn.textContent='☁ 서버 저장';saveBtn.onclick=serverSave;
  bar.appendChild(loadBtn);bar.appendChild(saveBtn);hero.appendChild(bar);
}
function boot(){addControls();setTimeout(serverLoad,80)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
new MutationObserver(addControls).observe(document.documentElement,{childList:true,subtree:true});
})();</script>`;
    body=body.replace('</body>',script+'</body>');
  }
  return originalSend.call(this,body);
};
console.log('GREENSUM problem bank per-student server sync loaded');
