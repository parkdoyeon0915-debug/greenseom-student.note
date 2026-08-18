const express=require("express");
const session=require("express-session");
const PgSession=require("connect-pg-simple")(session);
const bcrypt=require("bcryptjs");
const {Pool}=require("pg");
const multer=require("multer");
const path=require("path"),fs=require("fs");

const app=express();
const PORT=process.env.PORT||3000;
const ROOT=__dirname;

if(!process.env.DATABASE_URL){
  console.error("DATABASE_URL is required. Create a Render Postgres database and connect it to this service.");
  process.exit(1);
}

const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:5,idleTimeoutMillis:30000});
const q=(text,params=[])=>pool.query(text,params);

async function initDb(){
  await q(`CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS diagnoses(
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    subject TEXT,
    photo_data BYTEA,
    photo_mime TEXT,
    problem_analysis INTEGER DEFAULT 0,
    form_score INTEGER DEFAULT 0,
    completion INTEGER DEFAULT 0,
    expression INTEGER DEFAULT 0,
    composition INTEGER DEFAULT 0,
    notes TEXT,
    improve TEXT,
    teacher_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS patterns(
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    photo_data BYTEA,
    photo_mime TEXT,
    must_keep TEXT,
    cautions TEXT,
    self_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS pattern_images(
    id SERIAL PRIMARY KEY,
    pattern_id INTEGER NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    photo_data BYTEA,
    photo_mime TEXT
  );`);
  const adminId=process.env.ADMIN_ID||"admin";
  const adminPw=process.env.ADMIN_PASSWORD||"change-me-now";
  const exists=await q("SELECT id FROM users WHERE username=$1",[adminId]);
  if(!exists.rowCount) await q("INSERT INTO users(username,password_hash,name,role) VALUES($1,$2,'관리자','admin')",[adminId,bcrypt.hashSync(adminPw,12)]);
}

app.use(express.json({limit:"3mb"}));
app.use(express.urlencoded({extended:true,limit:"3mb"}));
app.use(session({
  store:new PgSession({pool,tableName:"user_sessions",createTableIfMissing:true}),
  secret:process.env.SESSION_SECRET||"change-this-session-secret",
  resave:false,
  saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:"lax",secure:false,maxAge:7*24*60*60*1000}
}));

function sendBrandedPage(file,res){
  let html=fs.readFileSync(path.join(ROOT,"public",file),"utf8").replaceAll("GREENSEOM","GREENSUM");
  if(file==="index.html"){
    html=html.replace("</aside>",`<div class="nav" data-page="problemBank" onclick="location.href='/problem-bank.html'">📚 문제은행</div></aside>`);
    html=html.replace("</body>",`<script>(function(){function lockTeacher(){var t=document.getElementById('diagTeacher');if(!t)return;var b=t.previousElementSibling;if(b)b.textContent='도연&인혜T의 한마디';t.readOnly=true;t.placeholder='관리자만 작성할 수 있습니다.';t.title='관리자만 작성할 수 있습니다.'}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',lockTeacher);else lockTeacher();})();</script></body>`);
  }
  if(file==="admin.html") html=html.replace("</body>",`<style>#recordModal{position:fixed;inset:0;background:#18212b88;display:none;align-items:center;justify-content:center;padding:20px;z-index:9999}#recordModal.open{display:flex}.record-modal-box{width:min(920px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;padding:24px;box-shadow:0 20px 70px #0004}.record-modal-head{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:18px}.record-modal-head h2{margin:0}.detail-photo{width:100%;max-height:55vh;object-fit:contain;background:#f3f5f7;border-radius:12px;cursor:zoom-in}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.detail-box{border:1px solid #e1e6eb;border-radius:12px;padding:14px}.detail-box h4{margin:0 0 8px}.admin-note{width:100%;min-height:110px;border:1px solid #d6dde5;border-radius:11px;padding:12px;font:inherit;resize:vertical;box-sizing:border-box}@media(max-width:700px){.detail-grid{grid-template-columns:1fr}}</style><div id="recordModal"><div class="record-modal-box"><div class="record-modal-head"><h2 id="recordModalTitle">기록 상세</h2><button class="btn" onclick="closeRecord()">닫기</button></div><div id="recordModalBody"></div></div></div><script>(function(){window.closeRecord=function(){document.getElementById('recordModal').classList.remove('open')};window.openRecord=async function(kind,id){var r=await(await fetch('/api/admin/diagnoses/'+id)).json();if(r.error)return alert(r.error);document.getElementById('recordModalTitle').textContent=r.student.name+' · 그림 자가진단';document.getElementById('recordModalBody').innerHTML='<img class="detail-photo" src="'+(r.photo||'')+'" onclick="window.open(this.src,\'_blank\')" style="'+(r.photo?'':'display:none')+'"><div class="detail-grid" style="margin-top:15px"><div class="detail-box"><h4>기본 정보</h4><div>날짜 · '+(r.date||'-')+'</div><div>소재 · '+(r.subject||'-')+'</div><div>총점 · <b>'+r.total+' / 25</b></div></div><div class="detail-box"><h4>학생 기록</h4><div style="white-space:pre-wrap">'+(r.notes||'기록 없음')+'</div><hr><h4>앞으로 개선할 점</h4><div style="white-space:pre-wrap">'+(r.improve||'기록 없음')+'</div></div></div><div class="detail-box" style="margin-top:14px"><h4>도연&인혜T의 한마디 <small style="font-weight:normal;color:#7d8791">관리자 전용</small></h4><textarea id="adminTeacherNote" class="admin-note" placeholder="관리자만 작성할 수 있습니다.">'+(r.teacher_note||'')+'</textarea><div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn primary" onclick="saveTeacherNote('+r.id+')">저장</button></div></div>';document.getElementById('recordModal').classList.add('open')};window.saveTeacherNote=async function(id){var note=document.getElementById('adminTeacherNote').value;var q=await fetch('/api/admin/diagnoses/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({teacher_note:note})});var j=await q.json();if(!q.ok)return alert(j.error||'저장에 실패했습니다.');alert('도연&인혜T의 한마디가 저장되었습니다.')};window.show=async function(id){var x=await(await fetch('/api/admin/students/'+id)).json();document.querySelector('#title').textContent=x.student.name+' 학생의 기록';var d=x.diagnoses.map(r=>'<div class="item" style="cursor:pointer" onclick="openRecord(\\'diagnosis\\','+r.id+')"><div class="thumb">'+(r.photo?'<img src="'+r.photo+'">':'사진 없음')+'</div><b>'+r.date+'</b><p>'+(r.subject||'')+' · <strong>'+r.total+'/25</strong></p><small>'+(r.notes||'')+'</small><br><small>개선: '+(r.improve||'-')+'</small></div>').join('');var p=x.patterns.map(r=>'<div class="item"><div class="thumb">'+(r.photo?'<img src="'+r.photo+'">':'사진 없음')+'</div><b>'+r.name+'</b><p>적용 그림 '+r.images.length+'장</p><small>'+(r.must_keep||'')+'</small></div>').join('');document.querySelector('#detail').innerHTML='<h3>🎨 그림 자가진단</h3><div class="grid">'+(d||'기록 없음')+'</div><h3>🧵 패턴 연구노트</h3><div class="grid">'+(p||'기록 없음')+'</div>'};document.getElementById('recordModal')?.addEventListener('click',function(e){if(e.target===this)closeRecord()})})();</script></body>`);
  res.type("html").send(html);
}

app.get("/",(req,res)=>{if(req.session.user?.role==="admin")return res.redirect("/admin.html");sendBrandedPage("index.html",res)});
app.get("/index.html",(req,res)=>{if(req.session.user?.role==="admin")return res.redirect("/admin.html");sendBrandedPage("index.html",res)});
app.get("/admin.html",(req,res)=>{if(req.session.user?.role!=="admin")return res.redirect("/");sendBrandedPage("admin.html",res)});
app.use(express.static(path.join(ROOT,"public")));

const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024},fileFilter:(req,file,cb)=>cb(null,/^image\/(jpeg|png|webp|heic|heif)$/.test(file.mimetype))});
function login(req,res,next){if(!req.session.user)return res.status(401).json({error:"로그인이 필요합니다."});next()}
function admin(req,res,next){if(!req.session.user||req.session.user.role!=="admin")return res.status(403).json({error:"관리자 권한이 필요합니다."});next()}
function score(r){return [r.problem_analysis,r.form_score,r.completion,r.expression,r.composition].reduce((a,b)=>a+(+b||0),0)}
function photoUrl(type,id){return `/api/files/${type}/${id}`}
function diagOut(r){return {...r,total:score(r),photo:r.photo_data?photoUrl("diagnoses",r.id):null}}
function patternOut(r){return {...r,photo:r.photo_data?photoUrl("patterns",r.id):null}}

app.get("/api/me",(req,res)=>res.json({user:req.session.user||null}));
app.post("/api/signup",async(req,res)=>{try{const{username,password,name}=req.body;if(!username||!password||!name)return res.status(400).json({error:"이름, 아이디, 비밀번호를 모두 입력해주세요."});if(!/^[A-Za-z0-9_-]{3,30}$/.test(username))return res.status(400).json({error:"아이디는 영문/숫자/_/- 3~30자로 입력해주세요."});if(password.length<6)return res.status(400).json({error:"비밀번호는 6자 이상이어야 합니다."});await q("INSERT INTO users(username,password_hash,name,role) VALUES($1,$2,$3,'student')",[username,bcrypt.hashSync(password,12),name.trim()]);res.json({ok:true})}catch(e){console.error("signup",e);res.status(409).json({error:"이미 사용 중인 아이디입니다."})}});
app.post("/api/admin/signup",async(req,res)=>{try{const{username,password,name,code}=req.body;const signupCode=process.env.ADMIN_SIGNUP_CODE||"greensum2026";if(String(code||"")!==signupCode)return res.status(403).json({error:"관리자 가입코드가 올바르지 않습니다."});if(!username||!password||!name)return res.status(400).json({error:"이름, 아이디, 비밀번호를 모두 입력해주세요."});if(!/^[A-Za-z0-9_-]{3,30}$/.test(username))return res.status(400).json({error:"아이디는 영문/숫자/_/- 3~30자로 입력해주세요."});if(password.length<6)return res.status(400).json({error:"비밀번호는 6자 이상이어야 합니다."});await q("INSERT INTO users(username,password_hash,name,role) VALUES($1,$2,$3,'admin')",[username,bcrypt.hashSync(password,12),name.trim()]);res.json({ok:true})}catch(e){console.error("admin signup",e);if(e.code==='23505')return res.status(409).json({error:"이미 사용 중인 아이디입니다."});res.status(500).json({error:"관리자 계정 생성 중 서버 오류가 발생했습니다."})}});
app.post("/api/login",async(req,res)=>{try{const u=(await q("SELECT * FROM users WHERE username=$1",[req.body.username])).rows[0];if(!u||u.role==="suspended"||!bcrypt.compareSync(req.body.password,u.password_hash))return res.status(401).json({error:"아이디 또는 비밀번호가 맞지 않습니다."});req.session.user={id:u.id,username:u.username,name:u.name,role:u.role};req.session.save(err=>{if(err){console.error("session save",err);return res.status(500).json({error:"로그인 세션 저장에 실패했습니다."})}res.json({user:req.session.user})})}catch(e){console.error("login",e);res.status(500).json({error:"로그인 처리 중 서버 오류가 발생했습니다."})}});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));

app.get("/api/diagnoses",login,async(req,res)=>{try{const rows=(await q("SELECT * FROM diagnoses WHERE user_id=$1 ORDER BY date DESC,id DESC",[req.session.user.id])).rows;res.json(rows.map(diagOut))}catch(e){console.error("GET diagnoses",e);res.status(500).json({error:"자가진단 기록을 불러오지 못했습니다."})}});
app.post("/api/diagnoses",login,upload.single("photo"),async(req,res)=>{try{const b=req.body;const f=["problem_analysis","form_score","completion","expression","composition"].map(k=>Math.max(0,Math.min(5,+b[k]||0)));if(!b.date)return res.status(400).json({error:"날짜를 입력해주세요."});const x=await q(`INSERT INTO diagnoses(user_id,date,subject,photo_data,photo_mime,problem_analysis,form_score,completion,expression,composition,notes,improve,teacher_note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,[req.session.user.id,b.date,b.subject||"",req.file?.buffer||null,req.file?.mimetype||null,...f,b.notes||"",b.improve||"",""]);res.status(201).json(diagOut(x.rows[0]))}catch(e){console.error("POST diagnoses",e);res.status(500).json({error:"서버 저장에 실패했습니다. Render 로그에서 POST /api/diagnoses 오류를 확인해주세요."})}});
app.put("/api/diagnoses/:id",login,upload.single("photo"),async(req,res)=>{try{const old=(await q("SELECT * FROM diagnoses WHERE id=$1 AND user_id=$2",[req.params.id,req.session.user.id])).rows[0];if(!old)return res.status(404).json({error:"기록을 찾을 수 없습니다."});const b=req.body;const f=["problem_analysis","form_score","completion","expression","composition"].map(k=>Math.max(0,Math.min(5,+b[k]||0)));const x=await q(`UPDATE diagnoses SET date=$1,subject=$2,photo_data=$3,photo_mime=$4,problem_analysis=$5,form_score=$6,completion=$7,expression=$8,composition=$9,notes=$10,improve=$11 WHERE id=$12 AND user_id=$13 RETURNING *`,[b.date,b.subject||"",req.file?.buffer||old.photo_data,req.file?.mimetype||old.photo_mime,...f,b.notes||"",b.improve||"",req.params.id,req.session.user.id]);res.json(diagOut(x.rows[0]))}catch(e){console.error("PUT diagnoses",e);res.status(500).json({error:"자가진단 수정 저장에 실패했습니다."})}});
app.delete("/api/diagnoses/:id",login,async(req,res)=>{await q("DELETE FROM diagnoses WHERE id=$1 AND user_id=$2",[req.params.id,req.session.user.id]);res.json({ok:true})});

app.get("/api/patterns",login,async(req,res)=>{try{const rows=(await q("SELECT * FROM patterns WHERE user_id=$1 ORDER BY id DESC",[req.session.user.id])).rows;for(const r of rows){r.images=(await q("SELECT id FROM pattern_images WHERE pattern_id=$1 ORDER BY id",[r.id])).rows.map(x=>({id:x.id,photo:photoUrl("pattern_images",x.id)}))}res.json(rows.map(patternOut))}catch(e){console.error("GET patterns",e);res.status(500).json({error:"패턴 기록을 불러오지 못했습니다."})}});
app.post("/api/patterns",login,upload.fields([{name:"photo",maxCount:1},{name:"images",maxCount:20}]),async(req,res)=>{try{const b=req.body;if(!b.name)return res.status(400).json({error:"패턴 이름을 입력해주세요."});const x=await q(`INSERT INTO patterns(user_id,name,photo_data,photo_mime,must_keep,cautions,self_feedback) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[req.session.user.id,b.name,req.files?.photo?.[0]?.buffer||null,req.files?.photo?.[0]?.mimetype||null,b.must_keep||"",b.cautions||"",b.self_feedback||""]);for(const f of req.files?.images||[])await q("INSERT INTO pattern_images(pattern_id,photo_data,photo_mime) VALUES($1,$2,$3)",[x.rows[0].id,f.buffer,f.mimetype]);res.status(201).json(patternOut(x.rows[0]))}catch(e){console.error("POST patterns",e);res.status(500).json({error:"패턴 저장에 실패했습니다."})}});
app.put("/api/patterns/:id",login,upload.fields([{name:"photo",maxCount:1},{name:"images",maxCount:20}]),async(req,res)=>{try{const old=(await q("SELECT * FROM patterns WHERE id=$1 AND user_id=$2",[req.params.id,req.session.user.id])).rows[0];if(!old)return res.status(404).json({error:"패턴을 찾을 수 없습니다."});const b=req.body;const f=req.files?.photo?.[0];const x=await q(`UPDATE patterns SET name=$1,photo_data=$2,photo_mime=$3,must_keep=$4,cautions=$5,self_feedback=$6 WHERE id=$7 AND user_id=$8 RETURNING *`,[b.name, f?.buffer||old.photo_data, f?.mimetype||old.photo_mime,b.must_keep||"",b.cautions||"",b.self_feedback||"",req.params.id,req.session.user.id]);for(const img of req.files?.images||[])await q("INSERT INTO pattern_images(pattern_id,photo_data,photo_mime) VALUES($1,$2,$3)",[req.params.id,img.buffer,img.mimetype]);res.json(patternOut(x.rows[0]))}catch(e){console.error("PUT patterns",e);res.status(500).json({error:"패턴 수정 저장에 실패했습니다."})}});
app.delete("/api/patterns/:id",login,async(req,res)=>{await q("DELETE FROM patterns WHERE id=$1 AND user_id=$2",[req.params.id,req.session.user.id]);res.json({ok:true})});

app.get("/api/files/:type/:id",async(req,res)=>{const map={diagnoses:["diagnoses","id"],patterns:["patterns","id"],pattern_images:["pattern_images","id"]};const m=map[req.params.type];if(!m)return res.status(404).end();const r=(await q(`SELECT photo_data,photo_mime FROM ${m[0]} WHERE id=$1`,[req.params.id])).rows[0];if(!r||!r.photo_data)return res.status(404).end();res.type(r.photo_mime||"image/jpeg").send(r.photo_data)});

app.get("/api/admin/students",admin,async(req,res)=>{const rows=(await q("SELECT id,username,name,role,created_at FROM users WHERE role<>'admin' ORDER BY name, id")).rows;res.json(rows)});
app.get("/api/admin/students/:id",admin,async(req,res)=>{const s=(await q("SELECT id,username,name,role FROM users WHERE id=$1",[req.params.id])).rows[0];if(!s)return res.status(404).json({error:"학생을 찾을 수 없습니다."});const d=(await q("SELECT * FROM diagnoses WHERE user_id=$1 ORDER BY date DESC,id DESC",[s.id])).rows.map(diagOut);const p=(await q("SELECT * FROM patterns WHERE user_id=$1 ORDER BY id DESC",[s.id])).rows;for(const r of p)r.images=(await q("SELECT id FROM pattern_images WHERE pattern_id=$1 ORDER BY id",[r.id])).rows.map(x=>({id:x.id,photo:photoUrl("pattern_images",x.id)}));res.json({student:s,diagnoses:d,patterns:p.map(patternOut)})});
app.get("/api/admin/diagnoses/:id",admin,async(req,res)=>{const r=(await q("SELECT d.*,u.name,u.username FROM diagnoses d JOIN users u ON u.id=d.user_id WHERE d.id=$1",[req.params.id])).rows[0];if(!r)return res.status(404).json({error:"기록을 찾을 수 없습니다."});res.json({...diagOut(r),student:{name:r.name,username:r.username}})});
app.put("/api/admin/diagnoses/:id",admin,async(req,res)=>{const r=await q("UPDATE diagnoses SET teacher_note=$1 WHERE id=$2 RETURNING *",[req.body.teacher_note||"",req.params.id]);if(!r.rowCount)return res.status(404).json({error:"기록을 찾을 수 없습니다."});res.json(diagOut(r.rows[0]))});

initDb().then(()=>app.listen(PORT,()=>console.log(`greensum server listening on ${PORT}`))).catch(e=>{console.error(e);process.exit(1)});
