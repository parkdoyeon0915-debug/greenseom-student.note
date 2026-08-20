const express=require('express');
const fs=require('fs');

// Final admin problem-bank photo fallback.
// Force the dedicated .html page through a no-cache response and let the page
// fetch the already-stored student photos directly from the admin API.
const previousSendFile=express.response.sendFile;

const patch=`<script id="admin-problem-bank-live-photo-fix">(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function src(v){const s=String(v??'').trim();if(!s)return '';if(/^data:/i.test(s)||/^(https?:)?\\/\\//i.test(s)||s.startsWith('/'))return s;if(/^image\\/[a-z0-9.+-]+;base64,/i.test(s))return 'data:'+s;return s}
function render(d){
  const photos=Array.isArray(d?.photos)?d.photos:[];
  let box=document.querySelector('.pb-admin-photos');
  if(!box){box=document.createElement('section');box.className='pb-admin-photos';const card=document.querySelector('.card');if(card)card.appendChild(box)}
  box.innerHTML='<div class="pb-admin-photos-title">📷 학생 등록 사진 ('+photos.length+'장)</div>'+(photos.length?'<div class="pb-admin-photo-grid">'+photos.map((p,i)=>'<div class="pb-admin-photo"><img loading="lazy" src="'+esc(src(p.data))+'" alt="등록 사진 '+(i+1)+'"><div class="pb-admin-photo-meta"><b>'+esc(p.school||'학교 미지정')+'</b>'+esc(p.prompt||'제시물 미지정')+(p.date?' · '+esc(p.date):'')+'</div></div>').join('')+'</div>':'<div class="pb-admin-photo-empty">서버에 저장된 사진이 없습니다.</div>');
  const summary=document.querySelector('.summary');
  if(summary&&!summary.querySelector('[data-photo-count]'))summary.insertAdjacentHTML('beforeend','<span class="pill" data-photo-count>등록 사진 '+photos.length+'장</span>');
}
async function boot(){
  const id=Number(new URLSearchParams(location.search).get('id')||0);if(!Number.isInteger(id)||id<=0)return;
  try{const r=await fetch('/api/admin/problem-bank/'+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||('HTTP '+r.status));render(d);console.log('GREENSUM live admin photo fallback:',Array.isArray(d.photos)?d.photos.length:0)}catch(e){console.warn('GREENSUM live admin photo fallback failed',e)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();</script>`;

express.response.sendFile=function(filePath,...args){
  if(this.req?.path==='/admin-problem-bank.html'&&typeof filePath==='string'){
    try{
      let html=fs.readFileSync(filePath,'utf8');
      if(!html.includes('id="admin-problem-bank-live-photo-fix"'))html=html.replace('</body>',patch+'</body>');
      this.set('Cache-Control','no-store, no-cache, must-revalidate');
      return this.type('html').send(html);
    }catch(e){console.error('admin problem-bank live photo sendFile',e)}
  }
  return previousSendFile.call(this,filePath,...args);
};

console.log('GREENSUM admin problem-bank live photo fallback loaded');
