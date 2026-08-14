const express=require("express");
const session=require("express-session");
const bcrypt=require("bcryptjs");
const Database=require("better-sqlite3");
const multer=require("multer");
const path=require("path"),fs=require("fs");

const app=express(),PORT=process.env.PORT||3000;
const ROOT=__dirname,DATA=path.join(ROOT,"data"),UPLOADS=path.join(ROOT,"uploads");
fs.mkdirSync(DATA,{recursive:true});fs.mkdirSync(UPLOADS,{recursive:true});
const db=new Database(path.join(DATA,"greenseom.db"));
db.pragma("journal_mode=WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'student',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS diagnoses(
 id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,date TEXT NOT NULL,
 subject TEXT,photo TEXT,problem_analysis INTEGER DEFAULT 0,form_score INTEGER DEFAULT 0,
 completion INTEGER DEFAULT 0,expression INTEGER DEFAULT 0,composition INTEGER DEFAULT 0,
 notes TEXT,improve TEXT,teacher_note TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS patterns(
 id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,name TEXT NOT NULL,
 photo TEXT,must_keep TEXT,cautions TEXT,self_feedback TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS pattern_images(
 id INTEGER PRIMARY KEY AUTOINCREMENT,pattern_id INTEGER NOT NULL,photo TEXT,
 FOREIGN KEY(pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
);`);

const adminId=process.env.ADMIN_ID||"admin";
const adminPw=process.env.ADMIN_PASSWORD||"change-me-now";
if(!db.prepare("SELECT id FROM users WHERE username=?").get(adminId)){
 db.prepare("INSERT INTO users(username,password_hash,name,role) VALUES(?,?,?,'admin')")
 .run(adminId,bcrypt.hashSync(adminPw,12),"관리자");
}

app.use(express.json({limit:"3mb"}));
app.use(express.urlencoded({extended:true,limit:"3mb"}));
app.use(session({
 secret:process.env.SESSION_SECRET||"change-this-session-secret",
 resave:false,saveUninitialized:false,
 cookie:{httpOnly:true,sameSite:"lax",secure:false,maxAge:7*24*60*60*1000}
}));
app.use("/uploads",express.static(UPLOADS));

// 화면에 표시되는 영문 브랜드만 GREENSUM으로 통일한다. 저장된 데이터와 URL은 건드리지 않는다.
function sendBrandedPage(file,res){
 const html=fs.readFileSync(path.join(ROOT,"public",file),"utf8").replaceAll("GREENSEOM","GREENSUM");
 res.type("html").send(html);
}
app.get("/",(req,res)=>sendBrandedPage("index.html",res));
app.get("/index.html",(req,res)=>sendBrandedPage("index.html",res));
app.get("/admin.html",(req,res)=>sendBrandedPage("admin.html",res));
app.use(express.static(path.join(ROOT,"public")));

const storage=multer.diskStorage({
 destination:(req,file,cb)=>cb(null,UPLOADS),
 filename:(req,file,cb)=>cb(null,Date.now()+"-"+Math.random().toString(36).slice(2)+path.extname(file.originalname).toLowerCase())
});
const upload=multer({
 storage,limits:{fileSize:10*1024*1024},
 fileFilter:(req,file,cb)=>cb(null,/^image\/(jpeg|png|webp|heic|heif)$/.test(file.mimetype))
});

function login(req,res,next){if(!req.session.user)return res.status(401).json({error:"로그인이 필요합니다."});next()}
function admin(req,res,next){if(!req.session.user||req.session.user.role!=="admin")return res.status(403).json({error:"관리자 권한이 필요합니다."});next()}
function score(r){return [r.problem_analysis,r.form_score,r.completion,r.expression,r.composition].reduce((a,b)=>a+(+b||0),0)}
function cleanPhoto(p){return p?"/uploads/"+p:null}

app.get("/api/me",(req,res)=>res.json({user:req.session.user||null}));
app.post("/api/signup",(req,res)=>{
 const {username,password,name}=req.body;
 if(!username||!password||!name)return res.status(400).json({error:"이름, 아이디, 비밀번호를 모두 입력해주세요."});
 if(!/^[A-Za-z0-9_-]{3,30}$/.test(username))return res.status(400).json({error:"아이디는 영문/숫자/_/- 3~30자로 입력해주세요."});
 if(password.length<6)return res.status(400).json({error:"비밀번호는 6자 이상이어야 합니다."});
 try{db.prepare("INSERT INTO users(username,password_hash,name,role) VALUES(?,?,?,'student')").run(username,bcrypt.hashSync(password,12),name.trim());res.json({ok:true})}
 catch(e){res.status(409).json({error:"이미 사용 중인 아이디입니다."})}
});
app.post("/api/login",(req,res)=>{
 const u=db.prepare("SELECT * FROM users WHERE username=?").get(req.body.username);
 if(!u||!bcrypt.compareSync(req.body.password,u.password_hash))return res.status(401).json({error:"아이디 또는 비밀번호가 맞지 않습니다."});
 req.session.user={id:u.id,username:u.username,name:u.name,role:u.role};res.json({user:req.session.user});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));

app.get("/api/diagnoses",login,(req,res)=>{
 const rows=db.prepare("SELECT * FROM diagnoses WHERE user_id=? ORDER BY date DESC,id DESC").all(req.session.user.id);
 res.json(rows.map(r=>({...r,total:score(r),photo:cleanPhoto(r.photo)})));
});
app.post("/api/diagnoses",login,upload.single("photo"),(req,res)=>{
 const b=req.body, f=["problem_analysis","form_score","completion","expression","composition"].map(k=>Math.max(0,Math.min(5,+b[k]||0)));
 const p=req.file?.filename||null;
 const x=db.prepare(`INSERT INTO diagnoses(user_id,date,subject,photo,problem_analysis,form_score,completion,expression,composition,notes,improve,teacher_note)
 VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(req.session.user.id,b.date,b.subject||"",p,...f,b.notes||"",b.improve||"",b.teacher_note||"");
 const r=db.prepare("SELECT * FROM diagnoses WHERE id=?").get(x.lastInsertRowid);
 res.json({...r,total:score(r),photo:cleanPhoto(r.photo)});
});
app.put("/api/diagnoses/:id",login,upload.single("photo"),(req,res)=>{
 const old=db.prepare("SELECT * FROM diagnoses WHERE id=? AND user_id=?").get(req.params.id,req.session.user.id);
 if(!old)return res.status(404).json({error:"기록을 찾을 수 없습니다."});
 let p=old.photo;if(req.file){if(p)fs.rmSync(path.join(UPLOADS,p),{force:true});p=req.file.filename}
 const b=req.body,f=["problem_analysis","form_score","completion","expression","composition"].map(k=>Math.max(0,Math.min(5,+b[k]||0)));
 db.prepare(`UPDATE diagnoses SET date=?,subject=?,photo=?,problem_analysis=?,form_score=?,completion=?,expression=?,composition=?,notes=?,improve=?,teacher_note=? WHERE id=?`)
 .run(b.date,b.subject||"",p,...f,b.notes||"",b.improve||"",b.teacher_note||"",old.id);
 const r=db.prepare("SELECT * FROM diagnoses WHERE id=?").get(old.id);res.json({...r,total:score(r),photo:cleanPhoto(r.photo)});
});
app.delete("/api/diagnoses/:id",login,(req,res)=>{
 const r=db.prepare("SELECT * FROM diagnoses WHERE id=? AND user_id=?").get(req.params.id,req.session.user.id);
 if(!r)return res.status(404).json({error:"기록을 찾을 수 없습니다."});
 db.prepare("DELETE FROM diagnoses WHERE id=?").run(r.id);if(r.photo)fs.rmSync(path.join(UPLOADS,r.photo),{force:true});res.json({ok:true});
});

app.get("/api/patterns",login,(req,res)=>{
 const ps=db.prepare("SELECT * FROM patterns WHERE user_id=? ORDER BY id DESC").all(req.session.user.id);
 res.json(ps.map(p=>({...p,photo:cleanPhoto(p.photo),images:db.prepare("SELECT id,photo FROM pattern_images WHERE pattern_id=? ORDER BY id").all(p.id).map(x=>({...x,photo:cleanPhoto(x.photo)}))})));
});
app.post("/api/patterns",login,upload.fields([{name:"photo",maxCount:1},{name:"images"}]),(req,res)=>{
 const b=req.body, p=req.files?.photo?.[0]?.filename||null;
 const x=db.prepare("INSERT INTO patterns(user_id,name,photo,must_keep,cautions,self_feedback) VALUES(?,?,?,?,?,?)")
 .run(req.session.user.id,b.name||"새 패턴",p,b.must_keep||"",b.cautions||"",b.self_feedback||"");
 for(const f of (req.files?.images||[]))db.prepare("INSERT INTO pattern_images(pattern_id,photo) VALUES(?,?)").run(x.lastInsertRowid,f.filename);
 const row=db.prepare("SELECT * FROM patterns WHERE id=?").get(x.lastInsertRowid);
 res.json({...row,photo:cleanPhoto(row.photo),images:db.prepare("SELECT id,photo FROM pattern_images WHERE pattern_id=?").all(row.id).map(i=>({...i,photo:cleanPhoto(i.photo)}))});
});
app.put("/api/patterns/:id",login,upload.fields([{name:"photo",maxCount:1},{name:"images"}]),(req,res)=>{
 const old=db.prepare("SELECT * FROM patterns WHERE id=? AND user_id=?").get(req.params.id,req.session.user.id);
 if(!old)return res.status(404).json({error:"패턴을 찾을 수 없습니다."});
 let p=old.photo;if(req.files?.photo?.[0]){if(p)fs.rmSync(path.join(UPLOADS,p),{force:true});p=req.files.photo[0].filename}
 const b=req.body;
 db.prepare("UPDATE patterns SET name=?,photo=?,must_keep=?,cautions=?,self_feedback=? WHERE id=?").run(b.name||"새 패턴",p,b.must_keep||"",b.cautions||"",b.self_feedback||"",old.id);
 // 기존 적용 그림은 유지하고, 이번에 새로 선택한 그림만 계속 추가한다.
 for(const f of (req.files?.images||[]))db.prepare("INSERT INTO pattern_images(pattern_id,photo) VALUES(?,?)").run(old.id,f.filename);
 const row=db.prepare("SELECT * FROM patterns WHERE id=?").get(old.id);
 res.json({...row,photo:cleanPhoto(row.photo),images:db.prepare("SELECT id,photo FROM pattern_images WHERE pattern_id=?").all(row.id).map(i=>({...i,photo:cleanPhoto(i.photo)}))});
});
app.delete("/api/patterns/:id",login,(req,res)=>{
 const p=db.prepare("SELECT * FROM patterns WHERE id=? AND user_id=?").get(req.params.id,req.session.user.id);
 if(!p)return res.status(404).json({error:"패턴을 찾을 수 없습니다."});
 const imgs=db.prepare("SELECT photo FROM pattern_images WHERE pattern_id=?").all(p.id);
 imgs.forEach(i=>fs.rmSync(path.join(UPLOADS,i.photo),{force:true}));if(p.photo)fs.rmSync(path.join(UPLOADS,p.photo),{force:true});
 db.prepare("DELETE FROM patterns WHERE id=?").run(p.id);res.json({ok:true});
});

app.get("/api/admin/students",admin,(req,res)=>{
 res.json(db.prepare(`SELECT u.id,u.username,u.name,COUNT(d.id) diagnoses,COUNT(DISTINCT p.id) patterns,MAX(d.date) last_date
 FROM users u LEFT JOIN diagnoses d ON d.user_id=u.id LEFT JOIN patterns p ON p.user_id=u.id
 WHERE u.role='student' GROUP BY u.id ORDER BY u.name`).all());
});
app.get("/api/admin/students/:id",admin,(req,res)=>{
 const u=db.prepare("SELECT id,username,name FROM users WHERE id=? AND role='student'").get(req.params.id);
 if(!u)return res.status(404).json({error:"학생을 찾을 수 없습니다."});
 const ds=db.prepare("SELECT * FROM diagnoses WHERE user_id=? ORDER BY date DESC,id DESC").all(u.id);
 const ps=db.prepare("SELECT * FROM patterns WHERE user_id=? ORDER BY id DESC").all(u.id);
 res.json({student:u,diagnoses:ds.map(r=>({...r,total:score(r),photo:cleanPhoto(r.photo)})),patterns:ps.map(p=>({...p,photo:cleanPhoto(p.photo),images:db.prepare("SELECT id,photo FROM pattern_images WHERE pattern_id=?").all(p.id).map(i=>({...i,photo:cleanPhoto(i.photo)}))}))});
});

app.listen(PORT,()=>console.log("http://localhost:"+PORT));
