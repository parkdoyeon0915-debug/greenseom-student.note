const express=require('express');

// FINAL AUTHORITY: when an admin opens /problem-bank.html?id=STUDENT_ID,
// the server response is the sole source of truth for the visible school/status
// controls. This runs after the older problem-bank patches and deliberately
// rehydrates the DOM from /api/admin/problem-bank/:id several times so stale
// shared localStorage cannot repaint another student's page.
const originalSend=express.response.send;

function installFinal(html){
  if(typeof html!=='string'||!html.includes('</body>'))return html;
  const script=`<script id="problem-bank-final-authority">(function(){
(function(){
  const qs=new URLSearchParams(location.search);
  const id=Number(qs.get('id')||0);
  if(!Number.isInteger(id)||id<=0)return;
  const API='/api/admin/problem-bank/'+encodeURIComponent(id);
  const SCHOOL_KEY='greensum_problem_bank_schools';
  const STATUS_PREFIX='greensum_problem_bank_status_';
  let latest=null;

  function note(text,ok){
    let e=document.getElementById('pbFinalAuthorityState');
    if(!e){e=document.createElement('div');e.id='pbFinalAuthorityState';e.style='position:fixed;right:14px;bottom:14px;z-index:999999;padding:9px 12px;border:1px solid #dce2e8;border-radius:10px;background:#fff;box-shadow:0 8px 24px #0002;font:800 12px -apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif';document.body.appendChild(e)}
    e.textContent=text;e.style.color=ok?'#26734d':'#b42318';
  }

  function setSelectValues(schools){
    const selects=[...document.querySelectorAll('#selects select[data-slot]')];
    if(selects.length<3)return false;
    selects.forEach((el,i)=>{
      const v=Array.isArray(schools)?(schools[i]||''):'';
      if(el.value!==v)el.value=v;
    });
    return true;
  }

  function setStatuses(status){
    const map=status&&typeof status==='object'?status:{};
    document.querySelectorAll('.status[data-school][data-prompt]').forEach(el=>{
      const k=String(el.dataset.school)+'::'+String(el.dataset.prompt);
      const v=map[k]||'미진행';
      if(el.value!==v)el.value=v;
      el.className='status '+(v==='완료'?'s-done':v==='수정필요'?'s-edit':v==='채색중'?'s-color':v==='러프스케치'?'s-rough':v==='디테일스케치'?'s-detail':'');
    });
  }

  function repaint(){
    // render() rebuilds the tables from the page's selected[] variable.
    // The select values are authoritative first; dispatching change updates
    // selected[] and rebuilds the visible school tables.
    const selects=[...document.querySelectorAll('#selects select[data-slot]')];
    if(selects.length<3)return false;
    let changed=false;
    const schools=latest&&Array.isArray(latest.schools)?latest.schools:['','',''];
    selects.forEach((el,i)=>{
      const v=schools[i]||'';
      if(el.value!==v){el.value=v;changed=true;el.dispatchEvent(new Event('change',{bubbles:true}));}
    });
    if(!changed){
      if(typeof window.renderSchools==='function')window.renderSchools();
      else if(typeof window.render==='function')window.render();
    }
    setStatuses(latest.status||{});
    note('✓ 학생 '+id+' 서버 저장값 표시 중',true);
    return true;
  }

  async function load(){
    try{
      const r=await fetch(API,{credentials:'same-origin',cache:'no-store'});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw Error(d.error||('HTTP '+r.status));
      latest=d;
      document.title=String(d.name||('학생 '+id))+' · 문제은행 · 그린섬';
      repaint();
      // A delayed repaint defeats older scripts that finish loading later.
      setTimeout(repaint,150);
      setTimeout(repaint,500);
      setTimeout(repaint,1200);
      setTimeout(repaint,2500);
    }catch(e){
      console.warn('problem bank final authority',e);
      note('문제은행 서버 조회 실패',false);
    }
  }

  function boot(){
    note('학생 '+id+' 서버 저장값 확인 중…',false);
    load();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
})();</script>`;
  return html.replace('</body>',script+'</body>');
}

express.response.send=function(body){
  if(this.req&&this.req.path==='/problem-bank.html'&&typeof body==='string')body=installFinal(body);
  return originalSend.call(this,body);
};
console.log('GREENSUM problem bank FINAL AUTHORITY loaded');
