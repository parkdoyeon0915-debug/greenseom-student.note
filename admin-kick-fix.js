const express=require('express');
const originalSend=express.response.send;

const style=`<style id="admin-kick-fix-style">
#students .student{position:relative}
#students .student > div:last-child{position:relative;z-index:10000}
#students .student .danger{position:relative;z-index:10001;pointer-events:auto!important;cursor:pointer!important;touch-action:manipulation!important}
</style>`;

const script=`<script id="admin-kick-fix-script">(function(){
  function parseButton(btn){
    if(!btn)return null;
    const raw=btn.getAttribute('onclick')||'';
    const m=raw.match(/kickStudent\\((\\d+),([\\s\\S]*)\\)/);
    if(!m)return null;
    let name='학생';
    try{name=JSON.parse(m[2]);}catch(e){name=String(m[2]).replace(/^['\"]|['\"]$/g,'');}
    return {id:Number(m[1]),name:name};
  }

  async function doKick(btn,id,name){
    if(!btn||btn.dataset.kickBusy==='1')return;
    if(!window.confirm(name+' 학생을 강퇴할까요?\\n\\n강퇴하면 해당 계정의 로그인이 차단됩니다. 기존 기록은 보존됩니다.'))return;
    btn.dataset.kickBusy='1';
    btn.disabled=true;
    btn.textContent='처리 중...';
    try{
      const r=await fetch('/api/admin/students/'+encodeURIComponent(id),{method:'DELETE',credentials:'same-origin',headers:{'Accept':'application/json'},cache:'no-store'});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j.error||'강퇴에 실패했습니다.');
      const row=btn.closest('.student');
      if(row)row.remove();
      const detail=document.querySelector('#detail');
      if(detail)detail.innerHTML='<div class="muted">학생을 선택해주세요.</div>';
      alert(name+' 학생을 강퇴했습니다.');
    }catch(e){
      btn.disabled=false;
      btn.dataset.kickBusy='';
      btn.textContent='강퇴';
      alert(e.message||'강퇴 처리 중 오류가 발생했습니다.');
    }
  }

  function install(){
    document.querySelectorAll('#students .student .danger').forEach(btn=>{
      if(btn.dataset.kickFix==='1')return;
      const parsed=parseButton(btn);
      if(!parsed)return;
      btn.dataset.kickFix='1';
      btn.dataset.kickId=String(parsed.id);
      btn.dataset.kickName=parsed.name;
      btn.type='button';
      btn.removeAttribute('onclick');
      btn.addEventListener('click',function(e){
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
        doKick(btn,parsed.id,parsed.name);
      },true);
    });
  }

  // Some deployments have a transparent layer above the action area. Capture the
  // pointer at document level and use button geometry so the kick action still
  // works even when the visual button is not the event target.
  function pointerFallback(e){
    if(e.button!==undefined&&e.button!==0)return;
    const x=e.clientX,y=e.clientY;
    document.querySelectorAll('#students .student .danger').forEach(btn=>{
      if(btn.dataset.kickFix!=='1')return;
      const r=btn.getBoundingClientRect();
      if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom){
        e.preventDefault();e.stopPropagation();
        doKick(btn,Number(btn.dataset.kickId),btn.dataset.kickName||'학생');
      }
    });
  }

  function boot(){
    install();
    const root=document.getElementById('students');
    if(root&&!root.dataset.kickObserver){
      root.dataset.kickObserver='1';
      new MutationObserver(install).observe(root,{childList:true,subtree:true});
    }
  }
  document.addEventListener('pointerdown',pointerFallback,true);
  document.addEventListener('mousedown',pointerFallback,true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  setTimeout(boot,50);setTimeout(boot,300);setTimeout(boot,1000);
})();</script>`;

express.response.send=function(body){
  if(typeof body==='string'&&this.req&&this.req.path==='/admin.html'&&body.includes('</body>')){
    body=body.replace('</head>',style+'</head>').replace('</body>',script+'</body>');
  }
  return originalSend.call(this,body);
};

console.log('GREENSUM admin kick UI fix loaded');
