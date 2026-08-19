const express=require('express');

// READ-ONLY FINAL CHECK:
// Keep server data loading separate from page rendering.
// This layer MUST NOT write localStorage, dispatch change events, call render(),
// or send PUT requests. It only reads the target student's server record and
// reports what the server actually contains so rendering bugs can be isolated.
const originalSend=express.response.send;

function installFinal(html){
  if(typeof html!=='string'||!html.includes('</body>'))return html;
  const script=`<script id="problem-bank-final-authority">(function(){
  const qs=new URLSearchParams(location.search);
  const id=Number(qs.get('id')||0);
  if(!Number.isInteger(id)||id<=0)return;
  const API='/api/admin/problem-bank/'+encodeURIComponent(id);

  function note(text,ok){
    let e=document.getElementById('pbFinalAuthorityState');
    if(!e){
      e=document.createElement('div');
      e.id='pbFinalAuthorityState';
      e.style='position:fixed;right:14px;bottom:14px;z-index:999999;padding:9px 12px;border:1px solid #dce2e8;border-radius:10px;background:#fff;box-shadow:0 8px 24px #0002;font:800 12px -apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif';
      document.body.appendChild(e);
    }
    e.textContent=text;
    e.style.color=ok?'#26734d':'#b42318';
  }

  function describe(d){
    const schools=Array.isArray(d.schools)?d.schools.filter(Boolean):[];
    const status=d.status&&typeof d.status==='object'?d.status:{};
    const statusCount=Object.keys(status).length;
    const schoolText=schools.length?schools.join(' / '):'학교 선택 없음';
    note('서버 확인 · 학생 '+id+' · '+schoolText+' · 진행 '+statusCount+'개',true);
  }

  async function load(){
    try{
      const r=await fetch(API,{credentials:'same-origin',cache:'no-store'});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw Error(d.error||('HTTP '+r.status));
      // IMPORTANT: read only. Do not mutate page state or storage here.
      describe(d);
      console.log('[problem-bank read-only] server data', {id:id, schools:d.schools||[], status:d.status||{}});
    }catch(e){
      console.warn('problem bank read-only final check',e);
      note('서버 데이터 조회 실패',false);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();</script>`;
  return html.replace('</body>',script+'</body>');
}

express.response.send=function(body){
  if(this.req&&this.req.path==='/problem-bank.html'&&typeof body==='string')body=installFinal(body);
  return originalSend.call(this,body);
};
console.log('GREENSUM problem bank FINAL AUTHORITY switched to READ-ONLY verification');
