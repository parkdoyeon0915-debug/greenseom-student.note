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

fs.writeFileSync(runtimePath,source,"utf8");
require(runtimePath);
