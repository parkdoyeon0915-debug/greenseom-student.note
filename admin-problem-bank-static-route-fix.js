const express=require('express');
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
}
const originalListen=express.application.listen;
express.application.listen=function(...args){const app=this;install(app);return originalListen.apply(app,args)};
console.log('GREENSUM admin problem bank static route loaded');
