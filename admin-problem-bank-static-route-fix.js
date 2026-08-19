const fs=require('fs');
const path=require('path');
let installed=false;

function install(app){
  if(installed)return;
  installed=true;
  app.get('/admin-problem-bank.html',(req,res)=>{
    if(!req.session.user||req.session.user.role!=='admin')return res.redirect('/');
    const file=path.join(__dirname,'admin-problem-bank.html');
    if(!fs.existsSync(file))return res.status(404).send('문제은행 관리자 페이지 파일을 찾을 수 없습니다.');
    res.sendFile(file);
  });
  console.log('GREENSUM admin problem bank static route loaded');
}

// start.js가 로드될 때 이미 생성된 Express 앱에도 적용되고,
// 이후 생성되는 앱에도 적용되도록 express.application.get을 감싼다.
const express=require('express');
const originalGet=express.application.get;
express.application.get=function(pathOrSetting,...handlers){
  const result=originalGet.call(this,pathOrSetting,...handlers);
  if(pathOrSetting==='/admin.html')install(this);
  return result;
};

module.exports={install};
