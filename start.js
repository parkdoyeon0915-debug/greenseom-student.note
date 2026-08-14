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
    return value.replace(
      "patImages.forEach(f=>fd.append('images',f));// 편집 중에는 새로 선택한 그림만 추가되고 기존 그림은 그대로 유지됩니다.let r=",
      "patImages.forEach(f=>fd.append('images',f));\n// 편집 중에는 새로 선택한 그림만 추가되고 기존 그림은 그대로 유지됩니다.\nlet r="
    );
  }
  return value;
};

fs.writeFileSync(runtimePath,source,"utf8");
require(runtimePath);
