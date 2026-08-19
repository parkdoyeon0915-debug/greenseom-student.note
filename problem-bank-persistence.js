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

// Student pages use the authenticated session id. Admin target pages may use ?id=N.
const originalSend=express.response.send;
express.response.send=function(body){
  if(typeof body==='string'&&this.req&&this.req.path==='/problem-bank.html'&&body.includes('</body>')){
    const script=`<style id="problem-bank-server-ui-style">
#problemBankServerControls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:16px;padding:14px 0 0;border-top:1px solid #e4e8ec}
#problemBankServerControls .pb-cloud{font-size:18px;line-height:1}
#problemBankServerControls .pb-label{font-size:13px;font-weight:900;color:#26313b;margin-right:auto}
#problemBankServerControls .pb-sub{font-size:11px;font-weight:600;color:#8a939c;display:block;margin-top:2px}
#problemBankServerControls .pb-state{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:7px 10px;border-radius:9px;background:#f5f7fa;color:#7d8791;font-size:12px;font-weight:800}
#problemBankServerControls .pb-state.ok{background:#edf8f1;color:#26734d}
#problemBankServerControls .pb-state.warn{background:#fff7e8;color:#9a6a16}
#problemBankServerControls .pb-state.err{background:#fff0f0;color:#a33b3b}
#problemBankServerControls .pb-btn{min-height:40px}
@media(max-width:700px){#problemBankServerControls{align-items:stretch}.pb-label{width:100%;margin-right:0!important}.pb-state{order:4;width:100%;justify-content:center}.pb-btn{flex:1}}
</style><script id="problem-bank-per-student-sync">(function(){
const params=new URLSearchParams(location.search);
const urlId=Number(params.get('id')||0);
let currentUserId=0;
let currentUserRole='';
let adminTarget=false;
let api='/api/problem-bank';
let scopedSuffix='__student_session';
const SCHOOL_KEY='greensum_problem_bank_schools';
const STATUS_PREFIX='greensum_problem_bank_status_';
const PHOTO_KEY='greensum_problem_bank_photos';
const nativeSet=Storage.prototype.setItem;
const nativeRemove=Storage.prototype.removeItem;
const nativeGet=Storage.prototype.getItem;
const scopedKey=k=>String(k||'')+scopedSuffix;
function isPB(k){return k===SCHOOL_KEY||k===PHOTO_KEY||String(k||'').startsWith(STATUS_PREFIX)}
Storage.prototype.getItem=function(k){return isPB(k)?nativeGet.call(this,scopedKey(k)):nativeGet.call(this,k)};
Storage.prototype.setItem=function(k,v){return isPB(k)?nativeSet.call(this,scopedKey(k),v):nativeSet.call(this,k,v)};
Storage.prototype.removeItem=function(k){return isPB(k)?nativeRemove.call(this,scopedKey(k)):nativeRemove.call(this,k)};
let dirty=false,lastSaved=null;
function state(text,type){const e=document.getElementById('pbServerState');if(!e)return;e.className='pb-state '+(type||'');e.textContent=text}
function markDirty(){dirty=true;state('● 변경사항이 아직 서버에 저장되지 않았어요.','warn')}
function schoolsFromDom(){const out=['','',''];document.querySelectorAll('#selects select[data-slot]').forEach(el=>{const i=Number(el.dataset.slot);if(i>=0&&i<3)out[i]=el.value||''});return out}
function statusFromDom(){const out={};document.querySelectorAll('.status[data-school][data-prompt]').forEach(el=>{const v=el.value||'미진행';if(v&&v!=='미진행')out[String(el.dataset.school)+'::'+String(el.dataset.prompt)]=v});return out}
function setServerData(d){
  nativeSet.call(localStorage,scopedKey(SCHOOL_KEY),JSON.stringify(Array.isArray(d.schools)?d.schools:['','','']));
  const remove=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(STATUS_PREFIX)&&k.endsWith(scopedSuffix))remove.push(k)}remove.forEach(k=>nativeRemove.call(localStorage,k));
  Object.entries(d.status||{}).forEach(([k,v])=>nativeSet.call(localStorage,scopedKey(STATUS_PREFIX+k),v));
  if(typeof window.load==='function')window.load();
  if(typeof window.render==='function')window.render();
  if(typeof window.renderGallery==='function')window.renderGallery();
}
async function identifyUser(){
  const r=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.user)throw Error(d.error||('HTTP '+r.status));
  currentUserId=Number(d.user.id||0);
  currentUserRole=String(d.user.role||'');
  if(!currentUserId)throw Error('학생 계정 ID를 확인할 수 없습니다.');
  // Only an authenticated admin may use ?id=N to open another student's problem bank.
  adminTarget=currentUserRole==='admin'&&Number.isInteger(urlId)&&urlId>0;
  api=adminTarget?('/api/admin/problem-bank/'+encodeURIComponent(urlId)):'/api/problem-bank';
  // Student pages never expose or depend on a student id in the URL.
  if(currentUserRole==='student'&&params.has('id')){
    history.replaceState(null,document.title,location.pathname+location.hash);
  }
  scopedSuffix='__student_'+currentUserId;
}
async function serverLoad(){
  state('서버 데이터를 불러오는 중…','');
  try{
    const r=await fetch(api,{credentials:'same-origin',cache:'no-store'});const d=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(d.error||('HTTP '+r.status));
    setServerData(d);lastSaved=d.updated_at||null;dirty=false;
    if(d.name){document.title=String(d.name)+' · 문제은행 · 그린섬';const b=document.querySelector('.brand');if(b)b.innerHTML='<b>G</b> '+String(d.name)+' · 문제은행';}
    state(lastSaved?'✓ 서버 저장 내용 불러옴':'✓ 서버 연결됨','ok');
    const e=document.getElementById('pbServerLastSaved');if(e)e.textContent=lastSaved?'마지막 저장 · '+new Date(lastSaved).toLocaleString('ko-KR'):'아직 서버에 저장된 기록이 없습니다.';
  }catch(e){console.warn('problem bank server load',e);state('서버를 불러오지 못했습니다. 로그인 상태를 확인해주세요.','err')}
}
async function serverSave(){
  const save=document.getElementById('pbServerSave');if(save)save.disabled=true;
  state('서버에 저장하는 중…','');
  try{
    const r=await fetch(api,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({schools:schoolsFromDom(),status:statusFromDom()})});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw Error((d.error||('HTTP '+r.status))+(d.code?' ['+d.code+']':''));
    setServerData(d);lastSaved=d.updated_at||null;dirty=false;
    state('✓ 서버에 안전하게 저장됨','ok');
    const e=document.getElementById('pbServerLastSaved');if(e)e.textContent=lastSaved?'마지막 저장 · '+new Date(lastSaved).toLocaleString('ko-KR'):'저장 완료';
  }catch(e){console.error('problem bank server save',e);state('저장에 실패했습니다. 다시 시도해주세요.','err')}
  finally{if(save)save.disabled=false}
}
function bindDirty(){document.querySelectorAll('#selects select[data-slot],.status[data-school][data-prompt]').forEach(el=>{if(el.dataset.pbDirtyBound==='1')return;el.dataset.pbDirtyBound='1';el.addEventListener('change',()=>setTimeout(markDirty,0));})}
function mount(){
  if(document.getElementById('problemBankServerControls')){bindDirty();return}
  const hero=document.querySelector('.hero');if(!hero)return;
  const box=document.createElement('div');box.id='problemBankServerControls';
  const label=document.createElement('div');label.className='pb-label';label.innerHTML='☁️ 서버 저장 <span class="pb-sub">학교 선택과 문제은행 진행상황을 학생 계정에 저장합니다.</span>';
  const load=document.createElement('button');load.type='button';load.className='btn pb-btn';load.id='pbServerLoad';load.textContent='서버에서 불러오기';load.onclick=serverLoad;
  const save=document.createElement('button');save.type='button';save.className='btn primary pb-btn';save.id='pbServerSave';save.textContent='서버에 저장';save.onclick=serverSave;
  const st=document.createElement('span');st.id='pbServerState';st.className='pb-state';st.textContent='서버 저장 준비';
  const last=document.createElement('span');last.id='pbServerLastSaved';last.className='pb-sub';last.textContent='아직 저장 내용을 불러오지 않았습니다.';last.style='width:100%;margin-top:-3px';
  box.append(label,load,save,st,last);hero.appendChild(box);bindDirty();
}
async function boot(){
  try{
    await identifyUser();
    mount();
    setTimeout(serverLoad,120);
  }catch(e){
    console.warn('problem bank identify user',e);
    state('로그인 정보를 확인할 수 없습니다.','err');
    mount();
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
new MutationObserver(()=>{mount();}).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='저장하지 않은 문제은행 변경사항이 있습니다.';}});
})();</script>`;
    body=body.replace('</body>',script+'</body>');
  }
  return originalSend.call(this,body);
};
console.log('GREENSUM problem bank per-student server sync loaded');
