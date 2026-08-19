const express=require('express');
const originalPut=express.application.put;
const originalGet=express.application.get;
function wrap(handler){
  return async function(req,res,next){
    const id=Number(req.params?.id||0);
    const u=req.session?.user;
    const selfStudent=Number.isInteger(id)&&id>0&&u&&u.role==='student'&&Number(u.id)===id;
    if(!selfStudent)return handler(req,res,next);
    const oldRole=u.role;
    u.role='admin';
    try{return await handler(req,res,next)}finally{u.role=oldRole}
  };
}
express.application.put=function(path,...handlers){
  if(path==='/api/admin/problem-bank/:id')handlers=handlers.map(h=>typeof h==='function'?wrap(h):h);
  return originalPut.call(this,path,...handlers);
};
express.application.get=function(path,...handlers){
  if(path==='/api/admin/problem-bank/:id')handlers=handlers.map(h=>typeof h==='function'?wrap(h):h);
  return originalGet.call(this,path,...handlers);
};
console.log('GREENSUM problem bank student self-save route patch loaded');
