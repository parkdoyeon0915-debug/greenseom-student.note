const express=require('express');
const fs=require('fs');
const path=require('path');
let installed=false;
function install(app){
  if(installed)return;
  installed=true;
  app.get('/problem-bank/:id',(req,res)=>{
    try{
      if(!req.session.user)return res.redirect('/');
      const id=Number(req.params.id);
      if(!Number.isInteger(id)||id<=0)return res.status(400).send('학생 번호가 올바르지 않습니다.');
      if(req.session.user.role!=='admin' && Number(req.session.user.id)!==id)return res.status(403).send('본인 문제은행만 확인할 수 있습니다.');
      const file=path.join(__dirname,'public','problem-bank.html');
      if(!fs.existsSync(file))return res.status(404).send('문제은행 페이지 파일을 찾을 수 없습니다.');
      return res.sendFile(file);
    }catch(e){
      console.error('student problem bank route',e);
      return res.status(500).send('문제은행 페이지를 불러오지 못했습니다.');
    }
  });
}
const originalListen=express.application.listen;
express.application.listen=function(...args){const app=this;install(app);return originalListen.apply(app,args);};
console.log('GREENSUM student problem bank id route loaded');
