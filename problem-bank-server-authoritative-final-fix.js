const express=require('express');
const originalSend=express.response.send;
const script=`<script id="greensum-photo-persistence-final">(function(){
'use strict';
const PHOTO_KEY='greensum_problem_bank_photos';
const BACKUP_PREFIX='greensum_problem_bank_photos_user_';
const prevGet=Storage.prototype.getItem;
const prevSet=Storage.prototype.setItem;
let uid=0;
function backupKey(){return BACKUP_PREFIX+uid}
function restore(){
 if(!uid)return;
 try{
  const data=prevGet.call(localStorage,backupKey());
  if(!data)return;
  prevSet.call(localStorage,PHOTO_KEY,data);
  if(typeof window.load==='function')window.load();
  if(typeof window.renderGallery==='function')window.renderGallery();
 }catch(e){console.warn('photo restore',e)}
}
Storage.prototype.setItem=function(k,v){
 const r=prevSet.call(this,k,v);
 if(k===PHOTO_KEY&&uid){try{prevSet.call(this,backupKey(),v)}catch(e){}}
 return r;
};
async function boot(){
 try{
  const r=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});
  const d=await r.json().catch(()=>({}));
  uid=Number(d.user&&d.user.id||0);
  if(!uid)return;
  const old=prevGet.call(localStorage,PHOTO_KEY);
  if(old&&!prevGet.call(localStorage,backupKey()))prevSet.call(localStorage,backupKey(),old);
  restore();
  setTimeout(restore,500);
  setTimeout(restore,1500);
 }catch(e){console.warn('photo persistence boot',e)}
}
boot();
})();</script>`;
express.response.send=function(body){
 if(typeof body==='string'&&this.req&&this.req.path==='/problem-bank.html'&&body.includes('</body>'))body=body.replace('</body>',script+'</body>');
 return originalSend.call(this,body);
};
console.log('GREENSUM mobile photo persistence final loaded');
