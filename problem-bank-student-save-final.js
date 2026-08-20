const express=require('express');

// 문제은행 최종 저장 경로 보정:
// 학생 계정은 URL에 남아 있던 ?id=N 값과 관계없이 반드시 /api/problem-bank를 사용합니다.
// 기존 force-ui 스크립트가 id를 먼저 캡처해 관리자 API를 호출하는 충돌을 제거합니다.
const originalSend=express.response.send;

const patch=`<script id="problem-bank-student-save-final">(function(){
'use strict';
function q(s){return document.querySelector(s)}
let user=null,api=null,loaded=false;
const SK='greensum_problem_bank_schools',SP='greensum_problem_bank_status_',suffixKey='__student_';
const nativeGet=Storage.prototype.getItem,nativeSet=Storage.prototype.setItem,nativeRemove=Storage.prototype.removeItem;
let scope='__student_session';
const isPB=k=>k===SK||String(k||'').startsWith(SP);
const scoped=k=>String(k||'')+scope;
Storage.prototype.getItem=function(k){return isPB(k)?nativeGet.call(this,scoped(k)):nativeGet.call(this,k)};
Storage.prototype.setItem=function(k,v){return isPB(k)?nativeSet.call(this,scoped(k),v):nativeSet.call(this,k,v)};
Storage.prototype.removeItem=function(k){return isPB(k)?nativeRemove.call(this,scoped(k)):nativeRemove.call(this,k)};
function state(text,cls){const e=q('#pbServerState');if(e){e.className='pb-state '+(cls||'');e.textContent=text}}
function readScreen(){
 const schools=['','',''];document.querySelectorAll('#selects select[data-slot]').forEach(el=>{const i=Number(el.dataset.slot);if(i>=0&&i<3)schools[i]=el.value||''});
 const status={};document.querySelectorAll('.status[data-school][data-prompt]').forEach(el=>{const v=el.value||'미진행';if(v&&v!=='미진행')status[String(el.dataset.school)+'::'+String(el.dataset.prompt)]=v});
 return {schools,status};
}
function applyServer(d){
 nativeSet.call(localStorage,scoped(SK),JSON.stringify(Array.isArray(d.schools)?d.schools:['','','']));
 const remove=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(SP)&&k.endsWith(scope))remove.push(k)}remove.forEach(k=>nativeRemove.call(localStorage,k));
 Object.entries(d.status||{}).forEach(([k,v])=>nativeSet.call(localStorage,scoped(SP+k),v));
 if(typeof window.load==='function')window.load();
 if(typeof window.render==='function')window.render();
 if(typeof window.renderGallery==='function')window.renderGallery();
}
async function resolve(){
 const r=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});const d=await r.json().catch(()=>({}));
 if(!r.ok||!d.user)throw Error(d.error||'로그인이 필요합니다.');
 user=d.user;scope=suffixKey+Number(user.id||0);
 const urlId=Number(new URLSearchParams(location.search).get('id')||0);
 if(user.role==='student'){
   api='/api/problem-bank';
   if(urlId)history.replaceState(null,document.title,location.pathname+location.hash);
 }else if(user.role==='admin'&&Number.isInteger(urlId)&&urlId>0){
   api='/api/admin/problem-bank/'+encodeURIComponent(urlId);
 }else{
   api='/api/problem-bank';
 }
 return api;
}
async function load(){
 state('서버 데이터를 불러오는 중…');
 try{const endpoint=await resolve();const r=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error((d.error||'HTTP '+r.status)+(d.code?' ['+d.code+']':''));applyServer(d);loaded=true;const id=q('#pbStudentId');if(id)id.textContent=d.id?'학생 ID '+d.id:'학생 계정';state('✓ 서버 저장 내용을 불러왔습니다.','ok');const last=q('#pbServerLastSaved');if(last)last.textContent=d.updated_at?'마지막 저장 · '+new Date(d.updated_at).toLocaleString('ko-KR'):'아직 서버에 저장된 기록이 없습니다.';if(d.name){document.title=d.name+' · 문제은행 · 그린섬';const brand=q('.brand');if(brand)brand.innerHTML='<b>G</b> '+String(d.name)+' · 문제은행'}}catch(e){state('서버 불러오기 실패','err');const last=q('#pbServerLastSaved');if(last)last.textContent=e.message||String(e)}}
async function save(){
 const b=q('#pbServerSave');if(b)b.disabled=true;state('서버에 저장하는 중…');
 try{const endpoint=await resolve();
   // 학생 계정에서는 절대 관리자 endpoint로 저장하지 않도록 최종 검증합니다.
   if(user&&user.role==='student'&&endpoint!=='/api/problem-bank')throw Error('학생 계정 저장 경로가 잘못 지정되었습니다.');
   const r=await fetch(endpoint,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(readScreen())});
   const d=await r.json().catch(()=>({}));if(!r.ok)throw Error((d.error||'HTTP '+r.status)+(d.code?' ['+d.code+']':''));
   applyServer(d);state('✓ 서버에 안전하게 저장되었습니다.','ok');const last=q('#pbServerLastSaved');if(last)last.textContent=d.updated_at?'마지막 저장 · '+new Date(d.updated_at).toLocaleString('ko-KR'):'저장 완료';
 }catch(e){console.error('problem-bank student final save',e);state('서버 저장 실패','err');const last=q('#pbServerLastSaved');if(last)last.textContent=e.message||String(e)}finally{if(b)b.disabled=false}
}
function replaceControls(){
 const box=q('#problemBankServerControls');if(!box)return false;
 const oldLoad=q('#pbServerLoad'),oldSave=q('#pbServerSave');
 if(oldLoad&&!oldLoad.dataset.studentFinal){const n=oldLoad.cloneNode(true);n.dataset.studentFinal='1';n.onclick=load;oldLoad.replaceWith(n)}
 if(oldSave&&!oldSave.dataset.studentFinal){const n=oldSave.cloneNode(true);n.dataset.studentFinal='1';n.onclick=save;oldSave.replaceWith(n)}
 return true;
}
function installSaveCapture(){
 if(window.__greensumProblemBankSaveCapture)return;
 window.__greensumProblemBankSaveCapture=true;
 document.addEventListener('click',function(e){
   const b=e.target&&e.target.closest?e.target.closest('#pbServerSave'):null;
   if(!b)return;
   if(b.disabled){b.disabled=false}
   e.preventDefault();
   e.stopPropagation();
   save();
 },true);
}
async function boot(){
 installSaveCapture();
 if(!replaceControls()){setTimeout(boot,100);return}
 try{await load()}catch(e){console.error(e)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();</script>`;

express.response.send=function(body){
 if(typeof body==='string'&&this.req&&this.req.path==='/problem-bank.html'&&body.includes('</body>')){
   body=body.replace('</body>',patch+'</body>');
 }
 return originalSend.call(this,body);
};
console.log('GREENSUM problem bank student save final loaded');
