const express=require('express');
const {Pool}=require('pg');

const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2,idleTimeoutMillis:30000});
let installed=false;

async function ensureTable(){
  await pool.query(`CREATE TABLE IF NOT EXISTS problem_bank_progress(
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    schools JSONB NOT NULL DEFAULT '[]'::jsonb,
    status JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}

function parseJson(v,fallback){
  if(v===null||v===undefined)return fallback;
  if(typeof v==='object')return v;
  try{return JSON.parse(String(v));}catch(e){return fallback;}
}
function cleanSchools(v){
  const parsed=parseJson(v,[]);
  const a=Array.isArray(parsed)?parsed.slice(0,3).map(x=>typeof x==='string'?x:''):[];
  while(a.length<3)a.push('');
  return a;
}
function cleanStatus(v){
  const parsed=parseJson(v,{});
  const out={};
  if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)){
    for(const [k,x] of Object.entries(parsed)){
      if(typeof k==='string'&&typeof x==='string'&&k.length<300&&x.length<50&&x!=='미진행')out[k]=x;
    }
  }
  return out;
}

function install(app){
  if(installed)return;
  installed=true;

  app.get('/api/admin/problem-bank/:id',async(req,res)=>{
    try{
      if(!req.session.user||req.session.user.role!=='admin')return res.status(403).json({error:'관리자 권한이 필요합니다.'});
      const id=Number(req.params.id);
      if(!Number.isInteger(id)||id<=0)return res.status(400).json({error:'학생 번호가 올바르지 않습니다.'});
      await ensureTable();

      const student=(await pool.query('SELECT id,name,username FROM users WHERE id=$1 AND role=\'student\'',[id])).rows[0];
      if(!student)return res.status(404).json({error:'학생을 찾을 수 없습니다.'});

      // JSONB를 직접 객체로 받지 않고 text로 받아 한 번 더 안전하게 파싱한다.
      // 특정 학생의 JSON 데이터가 이상해도 관리자 화면 전체가 실패하지 않도록 한다.
      const progress=(await pool.query(`
        SELECT schools::text AS schools_text,status::text AS status_text,updated_at
        FROM problem_bank_progress
        WHERE user_id=$1
      `,[id])).rows[0];

      res.set('Cache-Control','no-store');
      return res.json({
        id:student.id,
        name:student.name,
        username:student.username,
        schools:cleanSchools(progress?.schools_text),
        status:cleanStatus(progress?.status_text),
        updated_at:progress?.updated_at||null
      });
    }catch(err){
      console.error('problem bank admin detail fix',err);
      return res.status(500).json({error:'문제은행 진행상황 조회 서버 오류',code:'PB_ADMIN_DETAIL_500'});
    }
  });

  app.get('/api/admin/problem-bank',async(req,res)=>{
    try{
      if(!req.session.user||req.session.user.role!=='admin')return res.status(403).json({error:'관리자 권한이 필요합니다.'});
      await ensureTable();
      const rows=(await pool.query(`
        SELECT u.id,u.name,u.username,p.schools::text AS schools_text,p.status::text AS status_text,p.updated_at
        FROM users u
        LEFT JOIN problem_bank_progress p ON p.user_id=u.id
        WHERE u.role='student'
        ORDER BY u.id ASC
      `)).rows;
      res.set('Cache-Control','no-store');
      return res.json(rows.map(r=>({
        id:r.id,name:r.name,username:r.username,
        schools:cleanSchools(r.schools_text),
        status:cleanStatus(r.status_text),
        updated_at:r.updated_at||null
      })));
    }catch(err){
      console.error('problem bank admin list fix',err);
      return res.status(500).json({error:'문제은행 전체 진행상황 조회 서버 오류',code:'PB_ADMIN_LIST_500'});
    }
  });
}

const originalListen=express.application.listen;
express.application.listen=function(...args){
  const app=this;
  install(app);
  return originalListen.apply(app,args);
};

console.log('GREENSUM problem bank admin route fix v2 loaded');
