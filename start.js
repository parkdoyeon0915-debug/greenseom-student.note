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

// Fix photo preview without destroying the file input. The previous preview code
// replaced box.innerHTML, which removed the selected File from the form before save.
const originalReadFileSync=fs.readFileSync.bind(fs);
fs.readFileSync=function(file,encoding){
  const value=originalReadFileSync(file,encoding);
  if(typeof value==='string' && path.basename(String(file))==='index.html'){
    let html=value;

    html=html.replace(
      "function filePreview(input,box,placeholder){input.onchange=()=>{const f=input.files[0];if(!f)return;const u=URL.createObjectURL(f);box.innerHTML='<img src=\"'+u+'\">'}}",
      "function filePreview(input,box,placeholder){input.onchange=()=>{const f=input.files[0];if(!f)return;const u=URL.createObjectURL(f);const img=document.createElement('img');img.src=u;img.alt='선택한 사진';box.innerHTML='';box.appendChild(input);box.appendChild(img)}}"
    );

    // When editing an existing record, keep a file input available so a new photo
    // can replace the old one. If no new file is selected, the server keeps the old photo.
    html=html.replace(
      "$('#diagPhoto').innerHTML=r.photo?'<img src=\"'+r.photo+'\">':'<input id=\"diagFile\" type=\"file\" accept=\"image/*\"><div id=\"diagPlaceholder\" onclick=\"$(\\'#diagFile\\').click()\" style=\"text-align:center;cursor:pointer\"><div class=\"plus\">＋</div><b>그림 사진</b><div class=\"muted\">사진 촬영 또는 사진 보관함에서 선택</div></div>';if($('#diagFile'))filePreview($('#diagFile'),$('#diagPhoto'));",
      "$('#diagPhoto').innerHTML='<input id=\"diagFile\" type=\"file\" accept=\"image/*\" style=\"display:none\"><div id=\"diagExistingPhoto\" style=\"width:100%;height:100%;display:flex;align-items:center;justify-content:center\">'+(r.photo?'<img src=\"'+r.photo+'\">':'<div id=\"diagPlaceholder\" style=\"text-align:center;cursor:pointer\"><div class=\"plus\">＋</div><b>그림 사진</b><div class=\"muted\">사진 촬영 또는 사진 보관함에서 선택</div></div>')+'</div>';$('#diagExistingPhoto').onclick=function(){ $('#diagFile').click() };filePreview($('#diagFile'),$('#diagPhoto'));"
    );

    html=html.replace(
      "$('#patPhoto').innerHTML=r.photo?'<img src=\"'+r.photo+'\">':'<input id=\"patFile\" type=\"file\" accept=\"image/*\"><div id=\"patPH\" onclick=\"$(\\'#patFile\\').click()\" style=\"text-align:center;cursor:pointer\"><div class=\"plus\">＋</div><b>패턴 사진 부착</b></div>';if($('#patFile'))filePreview($('#patFile'),$('#patPhoto'));",
      "$('#patPhoto').innerHTML='<input id=\"patFile\" type=\"file\" accept=\"image/*\" style=\"display:none\"><div id=\"patExistingPhoto\" style=\"width:100%;height:100%;display:flex;align-items:center;justify-content:center\">'+(r.photo?'<img src=\"'+r.photo+'\">':'<div id=\"patPH\" style=\"text-align:center;cursor:pointer\"><div class=\"plus\">＋</div><b>패턴 사진 부착</b></div>')+'</div>';$('#patExistingPhoto').onclick=function(){ $('#patFile').click() };filePreview($('#patFile'),$('#patPhoto'));"
    );

    return html;
  }
  return value;
};

fs.writeFileSync(runtimePath,source,"utf8");
require(runtimePath);
