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

(async()=>{
  try{
    // doyean7 is the fixed highest-level administrator.
    await q("UPDATE users SET role='admin' WHERE username='doyean7'");
  }catch(e){console.error('superadmin init',e)}
})();

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
