const express=require('express');
const fs=require('fs');

// Final problem-bank page integration.
// This REPLACES the previous static-middleware hook. The page may be served
// through sendFile/res.send/res.end, so we intercept the response itself.
const originalSend=express.response.send;
const originalSendFile=express.response.sendFile;
const originalEnd=express.response.end;
const INSTALLED=Symbol.for('greensum.problemBankFinalControls');

if(!express.response[INSTALLED]){
  express.response[INSTALLED]=true;

  function isProblemBank(req){
    return !!req && (req.path==='/problem-bank.html' || String(req.originalUrl||'').split('?')[0]==='/problem-bank.html');
  }

  function inject(html){
    if(typeof html!=='string' || !html.includes('</body>')) return html;
    if(html.includes('id="problemBankServerControls"')) return html;

    const script=`<script id="problem-bank-final-server-ui">(function(){
(function(){
  const params=new URLSearchParams(location.search);
  const studentId=Number(params.get('id')||0);
  const api=studentId>0?('/api/admin/problem-bank/'+encodeURIComponent(studentId)):'/api/problem-bank';
  const adminTarget=studentId>0;

  function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}
  function statusFromPage(){
    const out={};
    document.querySelectorAll('.status[data-school][data-prompt]').forEach(el=>{
      const v=el.value||'미진행';
      if(v!=='미진행')out[String(el.dataset.school)+'::'+String(el.dataset.prompt)]=v;
    });
    return out;
  }
  function schoolsFromPage(){
    const out=['','',''];
    document.querySelectorAll('#selects select[data-slot]').forEach(el=>{
      const i=Number(el.dataset.slot);
      if(i>=0&&i<3)out[i]=el.value||'';
    });
    return out;
  }
  function applyData(d){
    if(Array.isArray(d.schools)){
      localStorage.setItem('greensum_problem_bank_schools',JSON.stringify(d.schools));
    }
    Object.keys(localStorage).filter(k=>String(k).startsWith('greensum_problem_bank_status_')).forEach(k=>localStorage.removeItem(k));
    Object.entries(d.status&&typeof d.status==='object'?d.status:{}).forEach(([k,v])=>localStorage.setItem('greensum_problem_bank_status_'+k,v));
    if(typeof window.load==='function')window.load();
    if(typeof window.render==='function')window.render();
    if(typeof window.renderGallery==='function')window.renderGallery();
  }
  function state(t,ok){
    const e=document.getElementById('pbServerState');
    if(!e)return;
    e.textContent=t;e.style.color=ok?'#26734d':'#7d8791';
  }
  async function loadServer(){
    state('서버 불러오는 중…',false);
    try{
      const r=await fetch(api,{credentials:'same-origin',cache:'no-store'});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw Error(d.error||('HTTP '+r.status));
      applyData(d);state('✓ 서버 데이터 불러옴',true);
    }catch(e){console.error(e);state('서버 불러오기 실패',false);alert('서버 데이터를 불러오지 못했습니다.\\n'+(e.message||e));}
  }
  async function saveServer(){
    state('서버에 저장 중…',false);
    try{
      const r=await fetch(api,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({schools:schoolsFromPage(),status:statusFromPage()})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw Error((d.error||('HTTP '+r.status))+(d.code?' ['+d.code+']':''));
      applyData(d);state('✓ 학생 '+(d.id||studentId)+' 서버 저장 완료',true);
    }catch(e){console.error(e);state('서버 저장 실패',false);alert('서버 저장에 실패했습니다.\\n'+(e.message||e));}
  }
  function mount(){
    if(document.getElementById('problemBankServerControls'))return;
    const hero=document.querySelector('.hero');
    if(!hero)return;
    const box=document.createElement('div');
    box.id='problemBankServerControls';
    box.style='display:flex!important;align-items:center!important;gap:8px!important;flex-wrap:wrap!important;margin-top:16px!important;padding-top:14px!important;border-top:1px solid #e4e8ec!important;width:100%!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:20!important;';
    if(adminTarget){
      const id=document.createElement('span');
      id.textContent='학생 ID: '+studentId;
      id.style='font-size:12px;font-weight:800;padding:7px 10px;border-radius:8px;background:#f1f4f7;color:#4d5863';
      box.appendChild(id);
    }
    const load=document.createElement('button');
    load.type='button';load.className='btn';load.textContent='☁ 서버 불러오기';load.onclick=loadServer;
    const save=document.createElement('button');
    save.type='button';save.className='btn primary';save.textContent='☁ 서버 저장';save.onclick=saveServer;
    const st=document.createElement('span');
    st.id='pbServerState';st.textContent='서버 저장 준비';st.style='font-size:12px;font-weight:800;margin-left:4px;color:#7d8791';
    box.append(load,save,st);hero.appendChild(box);
    if(adminTarget)setTimeout(loadServer,80);
  }
  function boot(){mount();setTimeout(mount,50);setTimeout(mount,300);setTimeout(mount,1000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});
})();
})();</script>`;
    return html.replace('</body>',script+'</body>');
  }

  express.response.send=function(body){
    if(isProblemBank(this.req)){
      if(Buffer.isBuffer(body)) body=body.toString('utf8');
      if(typeof body==='string') body=inject(body);
    }
    return originalSend.call(this,body);
  };

  express.response.sendFile=function(filePath,options,callback){
    if(isProblemBank(this.req)){
      try{
        const html=fs.readFileSync(filePath,'utf8');
        this.set('Content-Type','text/html; charset=utf-8');
        return this.send(inject(html));
      }catch(err){
        if(typeof callback==='function')return callback(err);
        return this.status(500).send('문제은행 페이지를 불러오지 못했습니다.');
      }
    }
    return originalSendFile.call(this,filePath,options,callback);
  };

  express.response.end=function(chunk,encoding,callback){
    if(isProblemBank(this.req) && chunk!==undefined){
      const text=Buffer.isBuffer(chunk)?chunk.toString('utf8'):String(chunk);
      if(text.includes('</body>')){
        return originalEnd.call(this,inject(text),encoding,callback);
      }
    }
    return originalEnd.call(this,chunk,encoding,callback);
  };
}

console.log('GREENSUM problem bank FINAL response integration loaded');
