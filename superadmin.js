const Module=require('module');
const originalLoad=Module._load;
let app=null;

// Capture the Express app created by server.js without changing its existing routes.
Module._load=function(request,parent,isMain){
  if(request==='express'){
    const express=originalLoad.apply(this,arguments);
    const wrapped=function(){app=express();return app};
    Object.assign(wrapped,express);
    wrapped.application=express.application;
    wrapped.request=express.request;
    wrapped.response=express.response;
    wrapped.Router=express.Router;
    wrapped.json=express.json;
    wrapped.urlencoded=express.urlencoded;
    return wrapped;
  }
  return originalLoad.apply(this,arguments);
};

require('./server.js');
Module._load=originalLoad;

const {Pool}=require('pg');
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:2,idleTimeoutMillis:30000});
const q=(text,params=[])=>pool.query(text,params);

function superAdmin(req,res,next){
  if(!req.session.user||req.session.user.role!=='admin'||req.session.user.username!=='doyean7'){
    return res.status(403).json({error:'최고관리자 권한이 필요합니다.'});
  }
  next();
}

// Separate comment for each administrator on each student diagnosis.
let commentsReady;
async function ensureTeacherComments(){
  if(!commentsReady){
    commentsReady=q(`CREATE TABLE IF NOT EXISTS teacher_comments(
      id SERIAL PRIMARY KEY,
      diagnosis_id INTEGER NOT NULL REFERENCES diagnoses(id) ON DELETE CASCADE,
      admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      comment TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(diagnosis_id,admin_id)
    );`);
  }
  return commentsReady;
}

(async()=>{
  try{
    // doyean7 is the fixed highest-level administrator.
    await q("UPDATE users SET role='admin' WHERE username='doyean7'");
    await ensureTeacherComments();
  }catch(e){console.error('superadmin init',e)}
})();

// Student/admin shared endpoint: return all administrator comments for one diagnosis.
app.get('/api/diagnoses/:id/comments',async(req,res)=>{
  try{
    if(!req.session.user)return res.status(401).json({error:'로그인이 필요합니다.'});
    await ensureTeacherComments();
    const diagnosis=(await q("SELECT id,user_id,teacher_note FROM diagnoses WHERE id=$1",[req.params.id])).rows[0];
    if(!diagnosis)return res.status(404).json({error:'기록을 찾을 수 없습니다.'});
    if(req.session.user.role!=='admin'&&diagnosis.user_id!==req.session.user.id)return res.status(403).json({error:'접근 권한이 없습니다.'});
    const rows=(await q(`SELECT tc.id,tc.diagnosis_id,tc.admin_id,tc.comment,tc.created_at,tc.updated_at,u.name admin_name,u.username admin_username
      FROM teacher_comments tc JOIN users u ON u.id=tc.admin_id
      WHERE tc.diagnosis_id=$1 AND u.role='admin' ORDER BY tc.created_at,tc.id`,[diagnosis.id])).rows;
    // Preserve the old single teacher_note instead of silently losing it.
    if(diagnosis.teacher_note&&String(diagnosis.teacher_note).trim()&&!rows.some(r=>String(r.comment||'').trim()===String(diagnosis.teacher_note).trim())){
      rows.unshift({id:0,diagnosis_id:diagnosis.id,admin_id:null,comment:diagnosis.teacher_note,created_at:null,updated_at:null,admin_name:'기존 코멘트',admin_username:''});
    }
    res.json({comments:rows});
  }catch(e){
    console.error('teacher comments GET',e);
    res.status(500).json({error:'선생님 코멘트를 불러오지 못했습니다.'});
  }
});

// Each admin can create/update only their own section.
app.post('/api/admin/diagnoses/:id/comments',async(req,res)=>{
  try{
    if(!req.session.user||req.session.user.role!=='admin')return res.status(403).json({error:'관리자 권한이 필요합니다.'});
    await ensureTeacherComments();
    const diagnosis=(await q("SELECT id FROM diagnoses WHERE id=$1",[req.params.id])).rows[0];
    if(!diagnosis)return res.status(404).json({error:'기록을 찾을 수 없습니다.'});
    const comment=String(req.body?.comment||'').trim();
    const row=(await q(`INSERT INTO teacher_comments(diagnosis_id,admin_id,comment,updated_at)
      VALUES($1,$2,$3,NOW())
      ON CONFLICT(diagnosis_id,admin_id) DO UPDATE SET comment=EXCLUDED.comment,updated_at=NOW()
      RETURNING *`,[diagnosis.id,req.session.user.id,comment])).rows[0];
    res.json({ok:true,comment:{...row,admin_name:req.session.user.name,admin_username:req.session.user.username}});
  }catch(e){
    console.error('teacher comments POST',e);
    res.status(500).json({error:'선생님 코멘트 저장 중 오류가 발생했습니다.'});
  }
});

app.get('/api/superadmin/teachers',superAdmin,async(req,res)=>{
  try{
    const rows=(await q(`SELECT id,username,name,role,created_at FROM users WHERE role='admin' AND username<>'doyean7' ORDER BY name,created_at`)).rows;
    res.json(rows.map(r=>({id:r.id,username:r.username,name:r.name,role:r.role,created_at:r.created_at})));
  }catch(e){
    console.error('superadmin teachers',e);
    res.status(500).json({error:'선생님 계정 목록을 불러오지 못했습니다.'});
  }
});

app.delete('/api/superadmin/teachers/:id',superAdmin,async(req,res)=>{
  try{
    const target=(await q("SELECT id,username,name FROM users WHERE id=$1 AND role='admin'",[req.params.id])).rows[0];
    if(!target)return res.status(404).json({error:'선생님 계정을 찾을 수 없습니다.'});
    if(target.username==='doyean7')return res.status(403).json({error:'최고관리자 계정은 탈퇴시킬 수 없습니다.'});
    await q("DELETE FROM users WHERE id=$1 AND role='admin'",[target.id]);
    res.json({ok:true,name:target.name});
  }catch(e){
    console.error('superadmin delete teacher',e);
    res.status(500).json({error:'선생님 계정 탈퇴 처리 중 오류가 발생했습니다.'});
  }
});

console.log('GREENSUM superadmin controls loaded: doyean7');
