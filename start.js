const fs=require("fs");
const path=require("path");

const serverPath=path.join(__dirname,"server.js");
const runtimePath=path.join(__dirname,".server-runtime.js");
let source=fs.readFileSync(serverPath,"utf8");

// Safety fix: keep the diagnosis update route's five score fields aligned.
source=source.replace(
  '["problem_analysis","form_score","completion","expression","completion","composition"].filter((v,i)=>i<5)',
  '["problem_analysis","form_score","completion","expression","composition"]'
);

const originalReadFileSync=fs.readFileSync.bind(fs);
fs.readFileSync=function(file,encoding){
  const value=originalReadFileSync(file,encoding);
  if(typeof value==='string' && path.basename(String(file))==='index.html'){
    let html=value;

    // Make sure saving a diagnosis immediately refreshes the date-by-date list.
    // Keep the existing server reload, but also update the in-memory list with the
    // saved record so the new card is rendered even if the refresh request is slow.
    html=html.replace(
      "async function saveDiag(){const fd=new FormData();fd.append('date',$('#diagDate').value);fd.append('subject',$('#diagSubject').value);const vals=scoreVals();scoreNames.forEach((_,i)=>fd.append(['problem_analysis','form_score','completion','expression','composition'][i],vals[i]));fd.append('notes',$('#diagNotes').value);fd.append('improve',$('#diagImprove').value);if($('#diagFile')?.files[0])fd.append('photo',$('#diagFile').files[0]);const url=currentDiagId?'/api/diagnoses/'+currentDiagId:'/api/diagnoses';const r=await fetch(url,{method:currentDiagId?'PUT':'POST',body:fd});const j=await r.json();if(!r.ok)return alert(j.error||'저장에 실패했습니다.');currentDiagId=j.id;await loadAll();editDiag(j.id);alert('저장되었습니다.')}",
      "async function saveDiag(){const fd=new FormData();fd.append('date',$('#diagDate').value);fd.append('subject',$('#diagSubject').value);const vals=scoreVals();scoreNames.forEach((_,i)=>fd.append(['problem_analysis','form_score','completion','expression','composition'][i],vals[i]));fd.append('notes',$('#diagNotes').value);fd.append('improve',$('#diagImprove').value);if($('#diagFile')?.files[0])fd.append('photo',$('#diagFile').files[0]);const url=currentDiagId?'/api/diagnoses/'+currentDiagId:'/api/diagnoses';const r=await fetch(url,{method:currentDiagId?'PUT':'POST',body:fd});const j=await r.json();if(!r.ok)return alert(j.error||'저장에 실패했습니다.');currentDiagId=j.id;const idx=diags.findIndex(x=>x.id===j.id);if(idx>=0)diags[idx]=j;else diags.unshift(j);renderAll();editDiag(j.id);await loadAll();editDiag(j.id);renderAll();alert('저장되었습니다.') }"
    );

    // Fix the student-page script typo that commented out the closing brace of savePattern().
    html=html.replace(
      "patImages.forEach(f=>fd.append('images',f));// 편집 중에는 새로 선택한 그림만 추가되고 기존 그림은 그대로 유지됩니다.let r=",
      "patImages.forEach(f=>fd.append('images',f));\n// 편집 중에는 새로 선택한 그림만 추가되고 기존 그림은 그대로 유지됩니다.\nlet r="
    );

    // Keep selected image files alive when the student edits an existing diagnosis/pattern.
    const photoPatch=`<script>(function(){
      var kept={diagFile:null,patFile:null};
      function restore(id,parentId){
        var old=document.getElementById(id);
        if(old)return;
        var file=kept[id];
        if(!file)return;
        var parent=document.getElementById(parentId);
        if(!parent)return;
        var input=document.createElement('input');
        input.type='file';input.id=id;input.accept='image/*';input.style.display='none';
        try{var dt=new DataTransfer();dt.items.add(file);input.files=dt.files;}catch(e){}
        parent.insertBefore(input,parent.firstChild);
      }
      function bind(id){
        var el=document.getElementById(id);if(!el||el.dataset.photoPatch)return;
        el.dataset.photoPatch='1';
        el.addEventListener('change',function(){if(this.files&&this.files[0])kept[id]=this.files[0];});
        if(kept[id]&&!el.files.length){try{var dt=new DataTransfer();dt.items.add(kept[id]);el.files=dt.files;}catch(e){}}
      }
      function tick(){
        bind('diagFile');bind('patFile');
        restore('diagFile','diagPhoto');restore('patFile','patPhoto');
      }
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick);else tick();
      new MutationObserver(tick).observe(document.documentElement,{childList:true,subtree:true});
    })();</script>`;
    return html.replace('</body>',photoPatch+'</body>');
  }
  return value;
};

fs.writeFileSync(runtimePath,source,"utf8");
require(runtimePath);
