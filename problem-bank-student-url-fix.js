const express=require('express');
const originalSendFile=express.response.sendFile;
const originalReadFileSync=require('fs').readFileSync;

// The old version tried to inject client-side code with readFileSync, but
// problem-bank.html is normally served with res.sendFile(), so that code was
// never guaranteed to run. Redirect on the server before sendFile instead.
express.response.sendFile=function(file,options,callback){
  try{
    const req=this.req;
    if(req&&req.path==='/problem-bank.html'&&req.session&&req.session.user){
      const requestedId=Number(new URLSearchParams(req.url.split('?')[1]||'').get('id')||0);
      const user=req.session.user;
      if(user.role==='student'&&(!Number.isInteger(requestedId)||requestedId<=0)&&Number(user.id)>0){
        return this.redirect('/problem-bank.html?id='+encodeURIComponent(Number(user.id)));
      }
    }
  }catch(e){console.warn('problem bank student URL redirect',e);}
  return originalSendFile.call(this,file,options,callback);
};

console.log('GREENSUM student problem bank URL fix v3 loaded');
