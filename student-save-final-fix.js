// 학생 페이지 자가진단 저장 버튼 최종 보강
// 수정 화면에서 '서버에 저장' 클릭이 먹지 않는 경우를 방지하기 위해
// 버튼의 클릭 이벤트를 직접 가로채고 저장 API를 확실하게 호출합니다.
const express=require('express');
const originalSend=express.response.send;

const savePatch=`<script id="student-save-final-fix">(function(){
function q(s){return document.querySelector(s)}
function getValue(s){var el=q(s);return el?el.value:''}
function getScore(i){var el=q('input[name=s'+i+']:checked');return el?el.value:'0'}
function currentId(){return Number(window.__studentCurrentEditId||0)}
function setBusy(btn,busy){
  if(!btn)return;
  if(busy){btn.dataset.originalText=btn.textContent;btn.textContent='저장 중...';btn.disabled=true;btn.style.pointerEvents='none'}
  else{btn.textContent=btn.dataset.originalText||'서버에 저장';btn.disabled=false;btn.style.pointerEvents='auto'}
}
async function forceSave(btn){
  var date=getValue('#diagDate');
  if(!date){alert('날짜를 입력해주세요.');return}
  var fd=new FormData();
  fd.append('date',date);
  fd.append('subject',getValue('#diagSubject'));
  fd.append('notes',getValue('#diagNotes'));
  fd.append('improve',getValue('#diagImprove'));
  ['problem_analysis','form_score','completion','expression','composition'].forEach(function(k,i){fd.append(k,getScore(i))});
  var file=q('#diagFile');
  if(file&&file.files&&file.files[0])fd.append('photo',file.files[0]);
  var id=currentId();
  var url=id?('/api/diagnoses/'+encodeURIComponent(id)):'/api/diagnoses';
  var method=id?'PUT':'POST';
  setBusy(btn,true);
  try{
    var response=await fetch(url,{method:method,body:fd,credentials:'same-origin',cache:'no-store'});
    var text=await response.text();
    var data={};
    try{data=JSON.parse(text)}catch(e){data={error:text||'서버 응답을 읽을 수 없습니다.'}}
    if(!response.ok)throw new Error(data.error||('저장에 실패했습니다. (HTTP '+response.status+')'));
    var savedId=Number(data.id||id||0);
    window.__studentCurrentEditId=savedId||null;
    alert(id?'자가진단 기록이 수정되었습니다.':'자가진단 기록이 저장되었습니다.');
    if(typeof window.loadAll==='function')await window.loadAll();
    if(typeof window.loadDiag==='function'&&savedId)await window.loadDiag(savedId);
  }catch(err){
    console.error('student diagnosis final save',err);
    alert(err.message||'서버에 저장하지 못했습니다.');
  }finally{setBusy(btn,false)}
}
function bind(){
  var buttons=document.querySelectorAll('#diagnosis button');
  buttons.forEach(function(btn){
    if(btn.dataset.finalSaveBound==='1')return;
    if(String(btn.textContent||'').trim()!=='서버에 저장')return;
    btn.dataset.finalSaveBound='1';
    btn.type='button';
    btn.addEventListener('click',function(e){
      e.preventDefault();
      e.stopImmediatePropagation();
      forceSave(btn);
    },true);
  });
}
function boot(){bind();new MutationObserver(bind).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();</script>`;

express.response.send=function(body){
  if(typeof body==='string'&&this.req&&(this.req.path==='/'||this.req.path==='/index.html')&&body.includes('</body>'))body=body.replace('</body>',savePatch+'</body>');
  return originalSend.call(this,body);
};
