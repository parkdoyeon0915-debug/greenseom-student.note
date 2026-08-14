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

// Fix the student-page script typo that commented out the closing brace of savePattern().
const originalReadFileSync=fs.readFileSync.bind(fs);
fs.readFileSync=function(file,encoding){
  const value=originalReadFileSync(file,encoding);
  if(typeof value==='string' && path.basename(String(file))==='index.html'){
    let html=value.replace(
      "patImages.forEach(f=>fd.append('images',f));// 편집 중에는 새로 선택한 그림만 추가되고 기존 그림은 그대로 유지됩니다.let r=",
      "patImages.forEach(f=>fd.append('images',f));\n// 편집 중에는 새로 선택한 그림만 추가되고 기존 그림은 그대로 유지됩니다.\nlet r="
    );

    // Keep selected image files alive when the student edits an existing diagnosis/pattern.
    // Some preview code replaces the file input element; this patch restores it with the
    // same File object so the subsequent FormData request can still upload the new photo.
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
