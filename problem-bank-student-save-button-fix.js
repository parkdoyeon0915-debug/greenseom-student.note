const express=require('express');

// 최종 문제은행 학생 저장 버튼 클릭 보정.
// 기존 final 스크립트가 capture 단계에서 stopImmediatePropagation()을 걸어
// onclick=save가 실행되지 않는 문제를 제거하고, 버튼 자체를 새로 만들어
// 확실하게 /api/problem-bank PUT을 호출합니다.
const originalSend=express.response.send;

const patch=`<script id="problem-bank-student-save-button-fix">(function(){
'use strict';
function q(s){return document.querySelector(s)}
function read(){
 const schools=['','',''];
 document.querySelectorAll('#selects select[data-slot]').forEach(function(el){const i=Number(el.dataset.slot);if(i>=0&&i<3)schools[i]=el.value||''});
 const status={};
 document.querySelectorAll('.status[data-school][data-prompt]').forEach(function(el){const v=el.value||'미진행';if(v&&v!=='미진행')status[String(el.dataset.school)+'::'+String(el.dataset.prompt)]=v});
 return {schools,status};
}
async function save(btn){
 if(btn.dataset.saving==='1')return;
 btn.dataset.saving='1';btn.disabled=true;
 const state=q('#pbServerState');
 const last=q('#pbServerLastSaved');
 if(state){state.className='pb-state';state.textContent='서버에 저장하는 중…'}
 try{
   const me=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});
   const md=await me.json().catch(function(){return {}});
   if(!me.ok||!md.user)throw Error(md.error||'로그인이 필요합니다.');
   if(String(md.user.role)!=='student')throw Error('학생 계정으로 로그인되어 있지 않습니다.');
   const r=await fetch('/api/problem-bank',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(read())});
   const d=await r.json().catch(function(){return {}});
   if(!r.ok)throw Error((d.error||('HTTP '+r.status))+(d.code?' ['+d.code+']':''));
   if(state){state.className='pb-state ok';state.textContent='✓ 서버에 안전하게 저장됨'}
   if(last)last.textContent=d.updated_at?'마지막 저장 · '+new Date(d.updated_at).toLocaleString('ko-KR'):'저장 완료';
 }catch(e){
   console.error('problem-bank student save button fix',e);
   if(state){state.className='pb-state err';state.textContent='서버 저장 실패: '+(e.message||String(e))}
   if(last)last.textContent='저장 실패';
 }finally{
   btn.disabled=false;btn.dataset.saving='';
 }
}
function replace(){
 const old=q('#pbServerSave');
 if(!old||old.dataset.buttonFix==='1')return;
 const fresh=old.cloneNode(true);
 fresh.dataset.buttonFix='1';
 fresh.removeAttribute('onclick');
 fresh.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();save(fresh)});
 old.replaceWith(fresh);
}
function boot(){replace();new MutationObserver(function(){replace()}).observe(document.documentElement,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();</script>`;

express.response.send=function(body){
 if(typeof body==='string'&&this.req&&this.req.path==='/problem-bank.html'&&body.includes('</body>'))body=body.replace('</body>',patch+'</body>');
 return originalSend.call(this,body);
};
console.log('GREENSUM problem bank student save button fix loaded');
