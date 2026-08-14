const fs=require("fs");
const path=require("path");

const serverPath=path.join(__dirname,"server.js");
const runtimePath=path.join(__dirname,".server-runtime.js");
let source=fs.readFileSync(serverPath,"utf8");

source=source.replace(
  '["problem_analysis","form_score","completion","expression","completion","composition"].filter((v,i)=>i<5)',
  '["problem_analysis","form_score","completion","expression","composition"]'
);

// The student page uses a file input for photos. On mobile, selecting a photo can
// replace/recreate that input while the preview is rendered. Keep the actual File
// separately and restore it into the input immediately before saving.
const originalReadFileSync=fs.readFileSync.bind(fs);
fs.readFileSync=function(file,encoding){
  const value=originalReadFileSync(file,encoding);
  if(typeof value==='string' && path.basename(String(file))==='index.html'){
    let html=value;
    const patch=`<script>
(function(){
  function rememberFile(input){
    if(!input || !input.files || !input.files[0]) return;
    if(input.id==='diagFile') window.__GREENSUM_DIAG_FILE=input.files[0];
    if(input.id==='patFile') window.__GREENSUM_PAT_FILE=input.files[0];
    setTimeout(function(){
      var id=input.id, file=input.files[0] || (id==='diagFile'?window.__GREENSUM_DIAG_FILE:window.__GREENSUM_PAT_FILE);
      if(!file) return;
      var box=id==='diagFile'?document.getElementById('diagPhoto'):document.getElementById('patPhoto');
      if(!box) return;
      var old=document.getElementById(id);
      if(!old){ old=document.createElement('input'); old.type='file'; old.accept='image/*'; old.id=id; old.style.display='none'; box.appendChild(old); }
      old.onchange=function(){rememberFile(old)};
      try{ var dt=new DataTransfer(); dt.items.add(file); old.files=dt.files; }catch(e){}
      var img=document.createElement('img'); img.src=URL.createObjectURL(file); img.alt='선택한 사진'; img.style.maxWidth='100%'; img.style.maxHeight='100%'; img.style.objectFit='contain';
      var oldImg=box.querySelector('img'); if(oldImg) oldImg.remove(); box.appendChild(img);
    },0);
  }
  document.addEventListener('change',function(e){
    if(e.target && (e.target.id==='diagFile'||e.target.id==='patFile')) rememberFile(e.target);
  },true);
  var oldSaveDiag=window.saveDiag;
  window.saveDiag=async function(){
    var input=document.getElementById('diagFile'), file=window.__GREENSUM_DIAG_FILE;
    if(file && input){ try{var dt=new DataTransfer();dt.items.add(file);input.files=dt.files;}catch(e){} }
    return oldSaveDiag.apply(this,arguments);
  };
  var oldSavePattern=window.savePattern;
  window.savePattern=async function(){
    var input=document.getElementById('patFile'), file=window.__GREENSUM_PAT_FILE;
    if(file && input){ try{var dt=new DataTransfer();dt.items.add(file);input.files=dt.files;}catch(e){} }
    return oldSavePattern.apply(this,arguments);
  };
})();
</script>`;
    html=html.replace('</body>',patch+'</body>');
    return html;
  }
  return value;
};

fs.writeFileSync(runtimePath,source,"utf8");
require(runtimePath);
