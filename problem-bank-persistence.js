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
    );`);
  }
  return tableReady;
}

function install(app){
  if(installed)return;
  installed=true;

  app.get('/api/problem-bank',async(req,res)=>{
    try{
      if(!req.session.user)return res.status(401).json({error:'로그인이 필요합니다.'});
      await ensureTable();
      const row=(await pool.query('SELECT schools,status,updated_at FROM problem_bank_progress WHERE user_id=$1',[req.session.user.id])).rows[0];
      res.json({schools:row?.schools||['','',''],status:row?.status||{},updated_at:row?.updated_at||null});
    }catch(e){
      console.error('problem bank GET',e);
      res.status(500).json({error:'문제은행 저장 내용을 불러오지 못했습니다.'});
    }
  });

  // 관리자용: 학생별 문제은행 학교 선택/제시물 진행상황 조회
  app.get('/api/admin/problem-bank',async(req,res)=>{
    try{
      if(!req.session.user||req.session.user.role!=='admin')return res.status(403).json({error:'관리자 권한이 필요합니다.'});
      await ensureTable();
      const rows=(await pool.query(`
        SELECT u.id,u.name,u.username,u.role,p.schools,p.status,p.updated_at
        FROM users u
        LEFT JOIN problem_bank_progress p ON p.user_id=u.id
        WHERE u.role='student'
        ORDER BY u.id ASC
      `)).rows;
      res.json(rows.map(r=>({
        id:r.id,name:r.name,username:r.username,
        schools:Array.isArray(r.schools)?r.schools:['','',''],
        status:r.status&&typeof r.status==='object'?r.status:{},
        updated_at:r.updated_at||null
      })));
    }catch(e){
      console.error('admin problem bank GET',e);
      res.status(500).json({error:'학생별 문제은행 진행상황을 불러오지 못했습니다.'});
    }
  });

  app.put('/api/problem-bank',async(req,res)=>{
    try{
      if(!req.session.user)return res.status(401).json({error:'로그인이 필요합니다.'});
      await ensureTable();
      const schools=Array.isArray(req.body?.schools)?req.body.schools.slice(0,3).map(v=>typeof v==='string'?v:''):['','',''];
      while(schools.length<3)schools.push('');
      const rawStatus=req.body?.status&&typeof req.body.status==='object'&&!Array.isArray(req.body.status)?req.body.status:{};
      const status={};
      Object.entries(rawStatus).forEach(([k,v])=>{if(typeof k==='string'&&typeof v==='string'&&k.length<300&&v.length<50)status[k]=v});
      const row=(await pool.query(`INSERT INTO problem_bank_progress(user_id,schools,status,updated_at)
        VALUES($1,$2::jsonb,$3::jsonb,NOW())
        ON CONFLICT(user_id) DO UPDATE SET schools=EXCLUDED.schools,status=EXCLUDED.status,updated_at=NOW()
        RETURNING schools,status,updated_at`,[req.session.user.id,JSON.stringify(schools),JSON.stringify(status)])).rows[0];
      res.json({ok:true,...row});
    }catch(e){
      console.error('problem bank PUT',e);
      res.status(500).json({error:'문제은행 진행상황 저장에 실패했습니다.'});
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
    const script=`<script>(function(){
      const localKey='greensum_problem_bank_guest';
      let syncing=false;
      let timer=null;
      function setSaveState(text,ok){
        let el=document.getElementById('problemBankSaveState');
        if(!el){
          el=document.createElement('div');
          el.id='problemBankSaveState';
          el.style='position:fixed;right:14px;bottom:14px;z-index:9999;padding:9px 12px;border-radius:10px;background:#fff;border:1px solid #dce2e8;box-shadow:0 8px 24px #00000012;font-size:12px;font-weight:800;color:#7d8791';
          document.body.appendChild(el);
        }
        el.textContent=text;
        el.style.color=ok?'#26734d':'#7d8791';
      }
      async function getServer(){
        const r=await fetch('/api/problem-bank',{credentials:'same-origin',cache:'no-store'});
        if(!r.ok)throw Error('문제은행 저장 내용을 불러오지 못했습니다.');
        return r.json();
      }
      async function syncServer(){
        if(syncing)return;
        syncing=true;
        try{
          const r=await fetch('/api/problem-bank',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({schools:selected,status:status})});
          if(!r.ok)throw Error('저장 실패');
          setSaveState('✓ 문제은행 저장됨',true);
        }catch(e){
          setSaveState('저장 대기 · 다시 시도해주세요',false);
        }finally{syncing=false;}
      }
      async function loadServer(){
        try{
          const data=await getServer();
          let hasServer=!!data.updated_at;
          if(hasServer){
            if(Array.isArray(data.schools))selected=data.schools;
            status=data.status&&typeof data.status==='object'?data.status:{};
          }else{
            let local=null;
            try{local=JSON.parse(localStorage.getItem(localKey)||'null')}catch(e){}
            if(local&&Array.isArray(local.selected)&&(local.selected.some(Boolean)||Object.keys(local.status||{}).length)){
              selected=local.selected;
              status=local.status&&typeof local.status==='object'?local.status:{};
              await syncServer();
              hasServer=true;
            }
          }
          localStorage.setItem(localKey,JSON.stringify({selected:selected,status:status,photos:photos||[]}));
          renderSelectors();renderTables();renderPhotoSelectors();renderGallery();
          setSaveState(hasServer?'✓ 저장된 진행상황 불러옴':'새 문제은행 · 자동 저장',true);
        }catch(e){
          setSaveState('오프라인 저장 모드',false);
        }
      }
      const oldSave=save;
      save=function(){
        oldSave();
        clearTimeout(timer);
        timer=setTimeout(syncServer,120);
        setSaveState('저장 중…',false);
      };
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadServer);else loadServer();
    })();</script>`;
    body=body.replace('</body>',script+'</body>');
  }
  return originalSend.call(this,body);
};

console.log('GREENSUM problem bank persistence loaded');
