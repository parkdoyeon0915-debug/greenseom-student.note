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
   if(user&&user.role==='student'&&endpoint!=='/api/problem-bank')throw Error('학생 계정 저장 경로가 잘못 지정되었습니다.');
   const r=await fetch(endpoint,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(readScreen())});
   const d=await r.json().catch(()=>({}));if(!r.ok)throw Error((d.error||'HTTP '+r.status)+(d.code?' ['+d.code+']':''));
   applyServer(d);state('✓ 서버에 안전하게 저장되었습니다.','ok');const last=q('#pbServerLastSaved');if(last)last.textContent=d.updated_at?'마지막 저장 · '+new Date(d.updated_at).toLocaleString('ko-KR'):'저장 완료';
 }catch(e){console.error('problem-bank student final save',e);state('서버 저장 실패','err');const last=q('#pbServerLastSaved');if(last)last.textContent=e.message||String(e)}finally{if(b)b.disabled=false}
}

// 모바일 사진 저장 보강:
// 원본 사진은 모바일 localStorage 용량을 쉽게 초과할 수 있으므로 자동 축소/압축합니다.
// 또한 원래 페이지가 파일 input의 value를 비우기 때문에, 선택한 File 객체를 별도로 보존합니다.
const PHOTO_KEY='greensum_problem_bank_photos';
let photoSaveBusy=false;
let selectedPhotoFile=null;
function readPhotoList(){try{const v=JSON.parse(nativeGet.call(localStorage,PHOTO_KEY)||'[]');return Array.isArray(v)?v:[]}catch(e){return []}}
function writePhotoList(list){
  try{nativeSet.call(localStorage,PHOTO_KEY,JSON.stringify(list));return true}
  catch(e){console.error('problem-bank photo localStorage save failed',e);return false}
}
function capturePhotoFile(){
 const input=q('#file');
 if(!input)return false;
 if(input.dataset.pbPhotoCapture==='1')return true;
 input.dataset.pbPhotoCapture='1';
 input.addEventListener('change',function(){selectedPhotoFile=this.files&&this.files[0]?this.files[0]:null},true);
 return true;
}
function compressFile(file,maxSide=1600,quality=.78){
 return new Promise((resolve,reject)=>{
   if(!file)return reject(new Error('사진 파일을 찾을 수 없습니다.'));
   const done=(source,w,h)=>{
     try{
       const scale=Math.min(1,maxSide/Math.max(w,h));
       const cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));
       const canvas=document.createElement('canvas');canvas.width=cw;canvas.height=ch;
       const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('이미지 처리 기능을 사용할 수 없습니다.');
       ctx.drawImage(source,0,0,cw,ch);
       canvas.toBlob(blob=>{if(!blob)return reject(new Error('사진 압축에 실패했습니다.'));resolve(blob)},'image/jpeg',quality);
     }catch(e){reject(e)}
   };
   if(typeof createImageBitmap==='function'){
     createImageBitmap(file,{imageOrientation:'from-image'}).then(bitmap=>{done(bitmap,bitmap.width,bitmap.height);if(bitmap.close)bitmap.close()}).catch(()=>fallback());
   }else fallback();
   function fallback(){
     const url=URL.createObjectURL(file),img=new Image();
     img.onload=()=>{done(img,img.naturalWidth,img.naturalHeight);URL.revokeObjectURL(url)};
     img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('사진을 읽을 수 없습니다.'))};img.src=url;
   }
 });
}
function blobToDataURL(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('사진 변환에 실패했습니다.'));r.readAsDataURL(blob)})}
async function savePhotoMobile(){
 if(photoSaveBusy)return;photoSaveBusy=true;
 const btn=q('#savePhoto');if(btn)btn.disabled=true;
 try{
   const file=selectedPhotoFile||q('#file')?.files?.[0];
   const school=q('#photoSchool')?.value||'';
   const prompt=q('#photoPrompt')?.value||'';
   if(!file)throw new Error('사진을 다시 선택해주세요.');
   if(!school||!prompt)throw new Error('학교와 제시물을 선택해주세요.');
   const blob=await compressFile(file);
   const data=await blobToDataURL(blob);
   const list=readPhotoList();
   list.unshift({school,prompt,data,date:new Date().toLocaleDateString('ko-KR')});
   if(!writePhotoList(list))throw new Error('사진 저장 공간이 부족합니다. 사진첩에서 오래된 사진을 먼저 삭제해주세요.');
   selectedPhotoFile=null;
   if(typeof window.load==='function')window.load();
   if(typeof window.renderGallery==='function')window.renderGallery();
   const modal=q('#modal');if(modal)modal.classList.remove('open');
   const preview=q('#preview');if(preview){preview.style.display='none';preview.src=''}
   state('✓ 사진이 저장되었습니다.','ok');
 }catch(e){
   console.error('problem-bank mobile photo save',e);
   alert(e&&e.message?e.message:'사진 저장에 실패했습니다.');
 }finally{photoSaveBusy=false;if(btn)btn.disabled=false}
}
function installPhotoSaveCapture(){
 if(window.__greensumProblemBankPhotoSaveCapture)return;
 window.__greensumProblemBankPhotoSaveCapture=true;
 capturePhotoFile();
 document.addEventListener('click',function(e){
   const b=e.target&&e.target.closest?e.target.closest('#savePhoto'):null;
   if(!b)return;
   e.preventDefault();
   e.stopPropagation();
   if(e.stopImmediatePropagation)e.stopImmediatePropagation();
   savePhotoMobile();
 },true);
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
   if(e.stopImmediatePropagation)e.stopImmediatePropagation();
   save();
 },true);
}
async function boot(){
 installSaveCapture();
 installPhotoSaveCapture();
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
