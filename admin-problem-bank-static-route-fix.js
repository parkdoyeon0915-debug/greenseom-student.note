const fs=require('fs');
const path=require('path');
const express=require('express');
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

// 앱이 /admin.html을 등록할 때도 설치
const originalGet=express.application.get;
express.application.get=function(pathOrSetting,...handlers){
  const result=originalGet.call(this,pathOrSetting,...handlers);
  if(pathOrSetting==='/admin.html')install(this);
  return result;
};

// 혹시 위 훅이 실행되지 않는 경우에도 서버 listen 직전에 반드시 설치
const originalListen=express.application.listen;
express.application.listen=function(...args){
  install(this);
  return originalListen.apply(this,args);
};

module.exports={install};
