const fs=require('fs');
const originalReadFileSync=fs.readFileSync;
const script=`<script id="problem-bank-student-url-fix">(function(){
async function moveToStudentUrl(){
 if(location.pathname!=='/problem-bank.html')return;
 try{
   const requestedId=Number(new URLSearchParams(location.search).get('id')||0);
   if(Number.isInteger(requestedId)&&requestedId>0)return;
   const r=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});
   const j=await r.json().catch(()=>({}));
   const id=Number(j?.user?.id||0);
   if(r.ok&&j?.user?.role==='student'&&id>0)location.replace('/problem-bank.html?id='+encodeURIComponent(id));
 }catch(e){console.warn('problem bank student url',e);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',moveToStudentUrl);else moveToStudentUrl();
})();</script>`;
fs.readFileSync=function(file,options){let content=originalReadFileSync.call(this,file,options);if(typeof file==='string'&&typeof content==='string'&&file.endsWith('/public/problem-bank.html')&&!content.includes('id="problem-bank-student-url-fix"'))content=content.replace('</body>',script+'</body>');return content;};
console.log('GREENSUM student problem bank URL fix v2 loaded');
