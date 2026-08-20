const express=require('express');

// Admin list photo visibility fix only.
// The dedicated /admin-problem-bank.html page now renders photos directly
// from the API response, so it does not need DOM injection or MutationObserver.
const previousSend=express.response.send;

const style=`<style id="admin-problem-bank-photo-fix-style">
.pb-admin-photos{margin-top:18px;border-top:1px solid #e1e6eb;padding-top:16px}.pb-admin-photos-title{font-size:16px;font-weight:900;margin-bottom:10px}.pb-admin-photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.pb-admin-photo{border:1px solid #dce2e8;border-radius:12px;background:#fff;overflow:hidden}.pb-admin-photo img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;background:#f2f4f6}.pb-admin-photo-meta{padding:8px 9px;font-size:11px;line-height:1.45;color:#5f6b76}.pb-admin-photo-meta b{display:block;color:#26313b;font-size:12px;margin-bottom:2px}.pb-admin-photo-empty{padding:12px;border:1px dashed #dce2e8;border-radius:10px;color:#7b8791;font-size:12px}
</style>`;

const script=`<script id="admin-problem-bank-photo-fix-script">(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function getPhotoData(id){const r=await fetch('/api/admin/problem-bank/'+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||('HTTP '+r.status));return d}
function photoHtml(photos){
 if(!Array.isArray(photos)||!photos.length)return '<div class="pb-admin-photo-empty">학생이 등록한 사진이 없습니다.</div>';
 return '<div class="pb-admin-photo-grid">'+photos.map((p,i)=>'<div class="pb-admin-photo"><img loading="lazy" src="'+esc(p.data)+'" alt="등록 사진 '+(i+1)+'"><div class="pb-admin-photo-meta"><b>'+esc(p.school||'학교 미지정')+'</b>'+esc(p.prompt||'제시물 미지정')+(p.date?' · '+esc(p.date):'')+'</div></div>').join('')+'</div>';
}
async function listPage(){
 const rows=document.querySelectorAll('#students .student');
 rows.forEach(async row=>{if(row.dataset.pbPhotoFix==='1')return;const id=Number(row.dataset.studentId||0);if(!id)return;row.dataset.pbPhotoFix='1';const panel=row.querySelector('.pb-progress-panel');if(!panel)return;try{const d=await getPhotoData(id);let box=panel.querySelector('.pb-admin-photos');if(!box){box=document.createElement('div');box.className='pb-admin-photos';panel.appendChild(box)}box.innerHTML='<div class="pb-admin-photos-title">📷 등록 사진 ('+(Array.isArray(d.photos)?d.photos.length:0)+')</div>'+photoHtml(d.photos)}catch(e){console.warn('admin student list photos',e)}});
}
function boot(){if(location.pathname==='/admin.html')listPage()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
new MutationObserver(()=>{if(location.pathname==='/admin.html')listPage()}).observe(document.documentElement,{childList:true,subtree:true});
})();</script>`;

express.response.send=function(body){
 if(typeof body==='string'&&this.req?.path==='/admin.html'&&body.includes('</body>')){
   body=body.replace('</head>',style+'</head>').replace('</body>',script+'</body>');
 }
 return previousSend.call(this,body);
};

console.log('GREENSUM admin student-list photo fix loaded');
