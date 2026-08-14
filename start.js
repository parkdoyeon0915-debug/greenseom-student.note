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

    // Keep the selected photo input alive. The original preview function replaced
    // box.innerHTML, which removed the <input type=file> and left FormData empty.
    html=html.replace(
      "function filePreview(input,box,placeholder){input.onchange=()=>{const f=input.files[0];if(!f)return;const u=URL.createObjectURL(f);box.innerHTML='<img src=\"'+u+'\">'}}",
      "function filePreview(input,box,placeholder){if(!input)return;input.onchange=()=>{const f=input.files[0];if(!f)return;const u=URL.createObjectURL(f);let img=box.querySelector('img');if(!img){img=document.createElement('img');box.appendChild(img)}img.src=u;let ph=box.querySelector('#diagPlaceholder,#patPH');if(ph)ph.style.display='none'}}"
    );

    // Keep the diagnosis/pattern replacement inputs usable after an existing
    // record is opened. Existing records previously rendered only the old image.
    html=html.replace(
      "$('#diagPhoto').innerHTML=r.photo?'<img src=\"'+r.photo+'\">':'<input id=\"diagFile\" type=\"file\" accept=\"image/*\"><div id=\"diagPlaceholder\" onclick=\"$(\\'#diagFile\\').click()\" style=\"text-align:center;cursor:pointer\"><div class=\"plus\">＋</div><b>그림 사진</b><div class=\"muted\">사진 촬영 또는 사진 보관함에서 선택</div></div>';if($('#diagFile'))filePreview($('#diagFile'),$('#diagPhoto));",
      "$('#diagPhoto').innerHTML='<input id=\"diagFile\" type=\"file\" accept=\"image/*\"><div id=\"diagPlaceholder\" onclick=\"$(\\'#diagFile\\').click()\" style=\"text-align:center;cursor:pointer\"><div class=\"plus\">＋</div><b>'+(r.photo?'사진 교체':'그림 사진')+'</b><div class=\"muted\">사진 촬영 또는 사진 보관함에서 선택</div></div>'+(r.photo?'<img src=\"'+r.photo+'\" style=\"max-width:100%;max-height:100%;object-fit:contain\">':'');if($('#diagFile'))filePreview($('#diagFile'),$('#diagPhoto'));"
    );
    html=html.replace(
      "$('#patPhoto').innerHTML=r.photo?'<img src=\"'+r.photo+'\">':'<input id=\"patFile\" type=\"file\" accept=\"image/*\"><div id=\"patPH\" onclick=\"$(\\'#patFile\\').click()\" style=\"text-align:center;cursor:pointer\"><div class=\"plus\">＋</div><b>패턴 사진 부착</b></div>';if($('#patFile'))filePreview($('#patFile'),$('#patPhoto));",
      "$('#patPhoto').innerHTML='<input id=\"patFile\" type=\"file\" accept=\"image/*\"><div id=\"patPH\" onclick=\"$(\\'#patFile\\').click()\" style=\"text-align:center;cursor:pointer\"><div class=\"plus\">＋</div><b>'+(r.photo?'사진 교체':'패턴 사진 부착')+'</b></div>'+(r.photo?'<img src=\"'+r.photo+'\" style=\"max-width:100%;max-height:100%;object-fit:contain\">':'');if($('#patFile'))filePreview($('#patFile'),$('#patPhoto'));"
    );

    return html;
  }
  return value;
};

fs.writeFileSync(runtimePath,source,"utf8");
require(runtimePath);
