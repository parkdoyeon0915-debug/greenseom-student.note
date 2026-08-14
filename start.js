const fs=require("fs");
const path=require("path");

const serverPath=path.join(__dirname,"server.js");
const runtimePath=path.join(__dirname,".server-runtime.js");
let source=fs.readFileSync(serverPath,"utf8");

// Keep the diagnosis update route's five score fields aligned.
source=source.replace(
  '["problem_analysis","form_score","completion","expression","completion","composition"].filter((v,i)=>i<5)',
  '["problem_analysis","form_score","completion","expression","composition"]'
);

// Keep the actual File objects independently of the preview DOM. This is important on
// mobile Safari/Chrome because the file input may be recreated while showing a preview.
const originalReadFileSync=fs.readFileSync.bind(fs);
fs.readFileSync=function(file,encoding){
  const value=originalReadFileSync(file,encoding);
  if(typeof value==='string' && path.basename(String(file))==='index.html'){
    let html=value;
    html=html.replace(
      "async function saveDiag(){const fd=new FormData();fd.append('date',$('#diagDate').value);fd.append('subject',$('#diagSubject').value);const vals=scoreVals();scoreNames.forEach((_,i)=>fd.append(['problem_analysis','form_score','completion','expression','composition'][i],vals[i]));fd.append('notes',$('#diagNotes').value);fd.append('improve',$('#diagImprove').value);if($('#diagFile')?.files[0])fd.append('photo',$('#diagFile').files[0]);const url=currentDiagId?'/api/diagnoses/'+currentDiagId:'/api/diagnoses';",
      "async function saveDiag(){const fd=new FormData();fd.append('date',$('#diagDate').value);fd.append('subject',$('#diagSubject').value);const vals=scoreVals();scoreNames.forEach((_,i)=>fd.append(['problem_analysis','form_score','completion','expression','composition'][i],vals[i]));fd.append('notes',$('#diagNotes').value);fd.append('improve',$('#diagImprove').value);const diagPhotoFile=window.GREENSUM_DIAG_FILE||$('#diagFile')?.files[0];if(diagPhotoFile)fd.append('photo',diagPhotoFile);const url=currentDiagId?'/api/diagnoses/'+currentDiagId:'/api/diagnoses';"
    );
    html=html.replace(
      "function newDiag(){currentDiagId=null;",
      "function newDiag(){window.GREENSUM_DIAG_FILE=null;currentDiagId=null;"
    );
    const patch=`<script>(function(){
      document.addEventListener('change',function(e){
        var t=e.target;
        if(t&&t.type==='file'&&t.id==='diagFile'&&t.files&&t.files[0])window.GREENSUM_DIAG_FILE=t.files[0];
      },true);
    })();</script>`;
    html=html.replace('</body>',patch+'</body>');
    return html;
  }
  return value;
};

fs.writeFileSync(runtimePath,source,"utf8");
require(runtimePath);
