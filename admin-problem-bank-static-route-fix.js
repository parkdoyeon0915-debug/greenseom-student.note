const express=require('express');
const fs=require('fs');
const path=require('path');
let installed=false;
function routeHandler(req,res){
  if(!req.session.user||req.session.user.role!=='admin')return res.redirect('/');
  const file=path.join(__dirname,'admin-problem-bank.html');
  if(!fs.existsSync(file))return res.status(404).send('문제은행 관리자 페이지 파일을 찾을 수 없습니다.');
  res.sendFile(file);
}
function install(app){
  if(installed)return;
  installed=true;
  app.get('/admin-problem-bank.html',routeHandler);
}
const originalGet=express.application.get;
express.application.get=function(pathOrSetting,...handlers){
  const result=originalGet.call(this,pathOrSetting,...handlers);
  if(pathOrSetting==='/admin.html')install(this);
  return result;
};
console.log('GREENSUM admin problem bank static route loaded');
