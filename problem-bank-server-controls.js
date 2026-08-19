const express=require('express');
const fs=require('fs');

// Final, single response hook for the problem-bank server UI.
// This hook uses sendFile first because /problem-bank.html is normally served
// by express.static(), which bypasses response.send().
const INSTALLED=Symbol.for('greensum.problemBankServerUiV2');
if(!express.response[INSTALLED]){
  express.response[INSTALLED]=true;

  function isPB(req){
    return !!req && (req.path==='/problem-bank.html' || String(req.originalUrl||'').split('?')[0]==='/problem-bank.html');
  }

  function inject(html){
    if(typeof html!=='string' || !html.includes('</body>')) return html;
    if(html.includes('id="problemBankServerControls"')) return html;
    const script=`<script id="problem-bank-server-ui-v2">(function(){
      const params=new URLSearchParams(location.search);
      const studentId=Number(params.get('id')||0);
      const adminTarget=Number.isInteger(studentId)&&studentId>0;
      const api=adminTarget?('/api/admin/problem-bank/'+encodeURIComponent(studentId)):'/api/problem-bank';
      const SCHOOL_KEY='greensum_problem_bank_schools';
      const STATUS_PREFIX='greensum_problem_bank_status_';
      const scopedSuffix='__server_ui_v2_'+(adminTarget?studentId:'session');
      const rawGet=Storage.prototype.getItem;
      const rawSet=Storage.prototype.setItem;
      const rawRemove=Storage.prototype.removeItem;
      const pbKey=k=>k===SCHOOL_KEY||String(k||'').startsWith(STATUS_PREFIX);
      Storage.prototype.getItem=function(k){return pbKey(k)?rawGet.call(localStorage,String(k)+scopedSuffix):rawGet.call(this,k)};
      Storage.prototype.setItem=function(k,v){return pbKey(k)?rawSet.call(localStorage,String(k)+scopedSuffix,v):rawSet.call(this,k,v)};
      Storage.prototype.removeItem=function(k){return pbKey(k)?rawRemove.call(localStorage,String(k)+scopedSuffix):rawRemove.call(this,k)};
      function state(text,ok){
        const e=document.getElementById('pbServerState');
        if(e){e.textContent=text;e.style.color=ok?'#26734d':'#7d8791';}
      }
      function schools(){
        const a=['','',''];
        document.querySelectorAll('#selects select[data-slot]').forEach(e=>{const i=Number(e.dataset.slot);if(i>=0&&i<3)a[i]=e.value||'';});
        return a;
      }
      function status(){
        const a={};
        document.querySelectorAll('.status[data-school][data-prompt]').forEach(e=>{const v=e.value||'미진행';if(v!=='미진행')a[e.dataset.school+'::'+e.dataset.prompt]=v;});
        return a;
      }
      function apply(d){
        rawSet.call(localStorage,SCHOOL_KEY+scopedSuffix,JSON.stringify(Array.isArray(d.schools)?d.schools:['','','']));
        Object.keys(localStorage).filter(k=>k.startsWith(STATUS_PREFIX)&&k.endsWith(scopedSuffix)).forEach(k=>rawRemove.call(localStorage,k));
        Object.entries(d.status||{}).forEach(([k,v])=>rawSet.call(localStorage,STATUS_PREFIX+k+scopedSuffix,v));
        if(typeof window.load==='function')window.load();
        if(typeof window.render==='function')window.render();
        if(typeof window.renderGallery==='function')window.renderGallery();
      }
      async function loadServer(){
        state('서버 불러오는 중…',false);
        try{const r=await fetch(api,{credentials:'same-origin',cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||('HTTP '+r.status));apply(d);state('✓ 서버 데이터 불러옴',true);}
        catch(e){console.error('problem bank server load',e);state('서버 불러오기 실패',false);}
      }
      async function saveServer(){
        state('서버에 저장 중…',false);
        try{const r=await fetch(api,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({schools:schools(),status:status()})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||('HTTP '+r.status));apply(d);state('✓ 서버 저장 완료',true);}
        catch(e){console.error('problem bank server save',e);state('서버 저장 실패',false);}
      }
      function mount(){
        if(document.getElementById('problemBankServerControls'))return true;
        const hero=document.querySelector('.hero');if(!hero)return false;
        const box=document.createElement('div');box.id='problemBankServerControls';box.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid #e4e8ec;width:100%;';
        if(adminTarget){const id=document.createElement('span');id.textContent='학생 ID: '+studentId;id.style.cssText='font-size:12px;font-weight:800;padding:7px 10px;border-radius:8px;background:#f1f4f7;color:#4d5863';box.appendChild(id);}
        const load=document.createElement('button');load.type='button';load.className='btn';load.textContent='☁ 서버 불러오기';load.onclick=loadServer;
        const save=document.createElement('button');save.type='button';save.className='btn primary';save.textContent='☁ 서버 저장';save.onclick=saveServer;
        const st=document.createElement('span');st.id='pbServerState';st.textContent='서버 저장 준비';st.style.cssText='font-size:12px;font-weight:800;margin-left:4px;color:#7d8791';
        box.append(load,save,st);hero.appendChild(box);return true;
      }
      function boot(){mount();setTimeout(mount,50);setTimeout(mount,300);setTimeout(mount,1000);setTimeout(loadServer,120);}
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
      new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});
    })();</script>`;
    return html.replace('</body>',script+'</body>');
  }

  const oldSend=express.response.send;
  const oldSendFile=express.response.sendFile;
  express.response.send=function(body){
    if(isPB(this.req)){
      if(Buffer.isBuffer(body))body=body.toString('utf8');
      if(typeof body==='string')body=inject(body);
    }
    return oldSend.call(this,body);
  };
  express.response.sendFile=function(filePath,options,callback){
    if(isPB(this.req)){
      try{
        const html=fs.readFileSync(filePath,'utf8');
        this.set('Content-Type','text/html; charset=utf-8');
        return this.send(inject(html));
      }catch(e){
        if(typeof callback==='function')return callback(e);
        return this.status(500).send('문제은행 페이지를 불러오지 못했습니다.');
      }
    }
    return oldSendFile.call(this,filePath,options,callback);
  };
}
console.log('GREENSUM problem bank server UI v2 loaded');
