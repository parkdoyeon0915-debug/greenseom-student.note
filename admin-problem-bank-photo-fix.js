const express=require('express');
const fs=require('fs');

// Final admin photo visibility fix.
// The student page stores photos in problem_bank_progress.photos and
// /api/admin/problem-bank/:id returns them. The dedicated admin page renders
// its progress asynchronously, so the photo block must be re-attached after
// that render instead of being inserted only at DOMContentLoaded.
const previousSend=express.response.send;

const style=`<style id="admin-problem-bank-photo-fix-style">
.pb-admin-photos{margin-top:18px;border-top:1px solid #e1e6eb;padding-top:16px}.pb-admin-photos-title{font-size:16px;font-weight:900;margin-bottom:10px}.pb-admin-photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.pb-admin-photo{border:1px solid #dce2e8;border-radius:12px;background:#fff;overflow:hidden}.pb-admin-photo img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;background:#f2f4f6}.pb-admin-photo-meta{padding:8px 9px;font-size:11px;line-height:1.45;color:#5f6b76}.pb-admin-photo-meta b{display:block;color:#26313b;font-size:12px;margin-bottom:2px}.pb-admin-photo-empty{padding:12px;border:1px dashed #dce2e8;border-radius:10px;color:#7b8791;font-size:12px}
</style>`;

const script=`<script id="admin-problem-bank-photo-fix-script">(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function idFromPath(){const m=location.pathname.match(/admin-problem-bank(?:\\.html)?\\/(\\d+)$/);if(m)return Number(m[1]);const q=new URLSearchParams(location.search);return Number(q.get('id')||0)}
async function getPhotoData(id){const r=await fetch('/api/admin/problem-bank/'+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||('HTTP '+r.status));return d}
function photoHtml(photos){
 if(!Array.isArray(photos)||!photos.length)return '<div class="pb-admin-photo-empty">학생이 등록한 사진이 없습니다.</div>';
 return '<div class="pb-admin-photo-grid">'+photos.map((p,i)=>'<div class="pb-admin-photo"><img loading="lazy" src="'+esc(p.data)+'" alt="등록 사진 '+(i+1)+'"><div class="pb-admin-photo-meta"><b>'+esc(p.school||'학교 미지정')+'</b>'+esc(p.prompt||'제시물 미지정')+(p.date?' · '+esc(p.date):'')+'</div></div>').join('')+'</div>';
}
async function dedicated(){
 const id=idFromPath();if(!id)return;
 try{
   const d=await getPhotoData(id);
   const content=document.getElementById('content');
   if(!content)return;
   const render=()=>{
     let box=document.getElementById('pbAdminPhotos');
     if(!box){box=document.createElement('div');box.id='pbAdminPhotos';box.className='pb-admin-photos';content.appendChild(box)}
     box.innerHTML='<div class="pb-admin-photos-title">📷 학생 등록 사진 ('+(Array.isArray(d.photos)?d.photos.length:0)+')</div>'+photoHtml(d.photos);
   };
   // The dedicated page renders progress asynchronously and replaces #content.innerHTML.
   // Observe that render and restore the photo block after each replacement.
   const observer=new MutationObserver(()=>{
     if(!document.getElementById('pbAdminPhotos'))render();
   });
   observer.observe(content,{childList:true,subtree:true});
   render();
 }catch(e){console.warn('admin problem bank photos',e)}
}
async function listPage(){
 const rows=document.querySelectorAll('#students .student');
 rows.forEach(async row=>{if(row.dataset.pbPhotoFix==='1')return;const id=Number(row.dataset.studentId||0);if(!id)return;row.dataset.pbPhotoFix='1';const panel=row.querySelector('.pb-progress-panel');if(!panel)return;try{const d=await getPhotoData(id);let box=panel.querySelector('.pb-admin-photos');if(!box){box=document.createElement('div');box.className='pb-admin-photos';panel.appendChild(box)}box.innerHTML='<div class="pb-admin-photos-title">📷 등록 사진 ('+(Array.isArray(d.photos)?d.photos.length:0)+')</div>'+photoHtml(d.photos)}catch(e){console.warn('admin student list photos',e)}});
}
function boot(){if(location.pathname==='/admin-problem-bank.html'||location.pathname.indexOf('/admin-problem-bank/')===0)dedicated();if(location.pathname==='/admin.html')listPage()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
new MutationObserver(()=>{if(location.pathname==='/admin.html')listPage()}).observe(document.documentElement,{childList:true,subtree:true});
})();</script>`;

express.response.send=function(body){
 if(typeof body==='string'&&this.req&&body.includes('</body>')){
   if(this.req.path==='/admin-problem-bank.html')body=body.replace('</head>',style+'</head>').replace('</body>',script+'</body>');
   else if(this.req.path==='/admin.html')body=body.replace('</head>',style+'</head>').replace('</body>',script+'</body>');
 }
 return previousSend.call(this,body);
};

// admin-problem-bank.html is served through res.sendFile(), which bypasses res.send.
// Convert only that page to res.send so the same photo UI injection is applied.
const previousSendFile=express.response.sendFile;
express.response.sendFile=function(filePath,...args){
 if(this.req?.path==='/admin-problem-bank.html'){
   try{
     let body=fs.readFileSync(filePath,'utf8');
     body=body.replace('</head>',style+'</head>').replace('</body>',script+'</body>');
     return this.type('html').send(body);
   }catch(e){return args[1]&&typeof args[1]==='function'?args[1](e):this.status(500).send('관리자 문제은행 페이지를 불러오지 못했습니다.');}
 }
 return previousSendFile.call(this,filePath,...args);
};
console.log('GREENSUM admin problem bank photo visibility fix loaded');
