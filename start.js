const fs=require("fs");
const path=require("path");

const serverPath=path.join(__dirname,"server.js");
const runtimePath=path.join(__dirname,".server-runtime.js");
let source=fs.readFileSync(serverPath,"utf8");

source=source.replace(
  '["problem_analysis","form_score","completion","expression","completion","composition"].filter((v,i)=>i<5)',
  '["problem_analysis","form_score","completion","expression","composition"]'
);

// Return JSON for Multer errors instead of an opaque HTML 500 response.
source=source.replace(
  'app.post("/api/diagnoses",login,upload.single("photo"),async',
  'app.post("/api/diagnoses",login,(req,res,next)=>upload.single("photo")(req,res,err=>{if(err){console.error("UPLOAD diagnoses",err);return res.status(400).json({error:"사진 업로드에 실패했습니다: "+err.message})}next()}),async'
);
source=source.replace(
  'app.put("/api/diagnoses/:id",login,upload.single("photo"),async',
  'app.put("/api/diagnoses/:id",login,(req,res,next)=>upload.single("photo")(req,res,err=>{if(err){console.error("UPLOAD diagnosis update",err);return res.status(400).json({error:"사진 업로드에 실패했습니다: "+err.message})}next()}),async'
);
source=source.replace(
  'app.post("/api/patterns",login,upload.fields([{name:"photo",maxCount:1},{name:"images",maxCount:4}]),async',
  'app.post("/api/patterns",login,(req,res,next)=>upload.fields([{name:"photo",maxCount:1},{name:"images",maxCount:4}])(req,res,err=>{if(err){console.error("UPLOAD patterns",err);return res.status(400).json({error:"패턴 사진 업로드에 실패했습니다: "+err.message})}next()}),async'
);
source=source.replace(
  'app.put("/api/patterns/:id",login,upload.fields([{name:"photo",maxCount:1},{name:"images",maxCount:4}]),async',
  'app.put("/api/patterns/:id",login,(req,res,next)=>upload.fields([{name:"photo",maxCount:1},{name:"images",maxCount:4}])(req,res,err=>{if(err){console.error("UPLOAD pattern update",err);return res.status(400).json({error:"패턴 사진 업로드에 실패했습니다: "+err.message})}next()}),async'
);

// Patch the student page at response time. Keep selected File objects alive and make
// save failures visible instead of looking like a silent button failure.
const originalReadFileSync=fs.readFileSync.bind(fs);
fs.readFileSync=function(file,encoding){
  const value=originalReadFileSync(file,encoding);
  if(typeof value==='string' && path.basename(String(file))==='index.html'){
    let html=value;

    html=html.replace(
      "function filePreview(input,box,placeholder){input.onchange=()=>{const f=input.files[0];if(!f)return;const u=URL.createObjectURL(f);box.innerHTML='<img src=\"'+u+'\">'}}",
      "function filePreview(input,box,placeholder){input.onchange=()=>{const f=input.files[0];if(!f)return;const u=URL.createObjectURL(f);const img=document.createElement('img');img.src=u;img.alt='선택한 사진';box.innerHTML='';box.appendChild(input);box.appendChild(img)}}"
    );

    const oldSave="async function saveDiag(){const fd=new FormData();fd.append('date',$('#diagDate').value);fd.append('subject',$('#diagSubject').value);const vals=scoreVals();scoreNames.forEach((_,i)=>fd.append(['problem_analysis','form_score','completion','expression','composition'][i],vals[i]));fd.append('notes',$('#diagNotes').value);fd.append('improve',$('#diagImprove').value);if($('#diagFile')?.files[0])fd.append('photo',$('#diagFile').files[0]);const url=currentDiagId?'/api/diagnoses/'+currentDiagId:'/api/diagnoses';const r=await fetch(url,{method:currentDiagId?'PUT':'POST',body:fd});const j=await r.json();if(!r.ok)return alert(j.error||'저장에 실패했습니다.');currentDiagId=j.id;await loadAll();editDiag(j.id);alert('저장되었습니다.')}";
    const newSave="async function saveDiag(){try{const fd=new FormData();fd.append('date',$('#diagDate').value);fd.append('subject',$('#diagSubject').value);const vals=scoreVals();scoreNames.forEach((_,i)=>fd.append(['problem_analysis','form_score','completion','expression','composition'][i],vals[i]));fd.append('notes',$('#diagNotes').value);fd.append('improve',$('#diagImprove').value);const f=window.GREENSUM_DIAG_FILE||$('#diagFile')?.files?.[0];if(f)fd.append('photo',f,f.name||'photo.jpg');const url=currentDiagId?'/api/diagnoses/'+currentDiagId:'/api/diagnoses';const r=await fetch(url,{method:currentDiagId?'PUT':'POST',body:fd,credentials:'same-origin'});const text=await r.text();let j;try{j=JSON.parse(text)}catch(e){throw new Error('서버가 JSON이 아닌 응답을 보냈습니다. HTTP '+r.status)}if(!r.ok)throw new Error(j.error||('저장 실패 HTTP '+r.status));currentDiagId=j.id;alert('서버에 저장되었습니다.');await loadAll();editDiag(j.id)}catch(e){console.error(e);alert('서버 저장 실패: '+e.message)}}";
    html=html.replace(oldSave,newSave);

    html=html.replace("function newDiag(){currentDiagId=null;","function newDiag(){window.GREENSUM_DIAG_FILE=null;currentDiagId=null;");
    html=html.replace("function filePreview(input,box,placeholder){", "window.GREENSUM_DIAG_FILE=window.GREENSUM_DIAG_FILE||null;function filePreview(input,box,placeholder){");
    html=html.replace('</body>',`<script>(function(){document.addEventListener('change',function(e){var t=e.target;if(t&&t.type==='file'&&t.id==='diagFile'&&t.files&&t.files[0])window.GREENSUM_DIAG_FILE=t.files[0]},true)})();</script></body>`);
    return html;
  }
  return value;
};

fs.writeFileSync(runtimePath,source,"utf8");
require(runtimePath);
