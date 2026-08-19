const express=require('express');
const fs=require('fs');
const originalSend=express.response.send;
const originalSendFile=express.response.sendFile;
if(!express.response.__greensumProblemBankFinalControls){
const script=`<script id="problem-bank-final-controls">(function(){
const q=new URLSearchParams(location.search),id=Number(q.get('id')||0),api=id?'/api/admin/problem-bank/'+encodeURIComponent(id):'/api/problem-bank';
const SK='greensum_problem_bank_schools',SP='greensum_problem_bank_status_',PK='greensum_problem_bank_photos',suffix='__student_'+(id||'session');
const get=Storage.prototype.getItem,set=Storage.prototype.setItem,rem=Storage.prototype.removeItem;
const pb=k=>k===SK||k===PK||String(k||'').startsWith(SP),sc=k=>String(k)+suffix;
Storage.prototype.getItem=function(k){return pb(k)?get.call(this,sc(k)):get.call(this,k)};
Storage.prototype.setItem=function(k,v){return pb(k)?set.call(this,sc(k),v):set.call(this,k,v)};
Storage.prototype.removeItem=function(k){return pb(k)?rem.call(this,sc(k)):rem.call(this,k)};
function pageSchools(){const a=['','',''];document.querySelectorAll('#selects select[data-slot]').forEach(e=>{const i=Number(e.dataset.slot);if(i>=0&&i<3)a[i]=e.value||''});return a}
function pageStatus(){const a={};document.querySelectorAll('.status[data-school][data-prompt]').forEach(e=>{if(e.value&&e.value!=='미진행')a[e.dataset.school+'::'+e.dataset.prompt]=e.value});return a}
function apply(d){set.call(localStorage,sc(SK),JSON.stringify(Array.isArray(d.schools)?d.schools:['','','']));for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.startsWith(SP)&&k.endsWith(suffix))rem.call(localStorage,k)}Object.entries(d.status||{}).forEach(([k,v])=>set.call(localStorage,sc(SP+k),v));if(typeof window.load==='function')window.load();if(typeof window.render==='function')window.render();if(typeof window.renderGallery==='function')window.renderGallery()}
function state(t,ok){const e=document.getElementById('pbServerState');if(e){e.textContent=t;e.style.color=ok?'#26734d':'#7d8791'}}
async function loadServer(){state('서버 불러오는 중…',false);try{const r=await fetch(api,{credentials:'same-origin',cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||('HTTP '+r.status));apply(d);state('✓ 서버 데이터 불러옴',true)}catch(e){console.error(e);state('서버 불러오기 실패',false)}}
async function saveServer(){state('서버에 저장 중…',false);try{const r=await fetch(api,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({schools:pageSchools(),status:pageStatus()})}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||('HTTP '+r.status));apply(d);state('✓ 이 학생 ID에 서버 저장됨',true)}catch(e){console.error(e);state('서버 저장 실패',false)}}
function mount(){if(document.getElementById('problemBankServerControls'))return;const hero=document.querySelector('.hero');if(!hero)return;const b=document.createElement('div');b.id='problemBankServerControls';b.style='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:18px;padding-top:14px;border-top:1px solid #e4e8ec';const idbox=document.createElement('strong');idbox.textContent='학생 ID: '+(id||'없음');idbox.style='font-size:14px;margin-right:6px';const l=document.createElement('button');l.type='button';l.className='btn';l.textContent='☁ 서버 불러오기';l.onclick=loadServer;const s=document.createElement('button');s.type='button';s.className='btn primary';s.textContent='☁ 서버 저장';s.onclick=saveServer;const st=document.createElement('span');st.id='pbServerState';st.textContent='서버 저장 준비';st.style='font-size:12px;font-weight:800;margin-left:auto;color:#7d8791';b.append(idbox,l,s,st);hero.appendChild(b)}
function boot(){mount();setTimeout(loadServer,100)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});
})();</script>`;
function inject(body){return typeof body==='string'&&body.includes('</body>')?body.replace('</body>',script+'</body>'):body}
express.response.send=function(body){if(this.req&&this.req.path==='/problem-bank.html')body=inject(body);return originalSend.call(this,body)};
express.response.sendFile=function(filePath,...args){if(this.req&&this.req.path==='/problem-bank.html'){fs.readFile(filePath,'utf8',(err,body)=>{if(err)return this.status(500).send('문제은행 페이지 로드 오류');this.type('html');return originalSend.call(this,inject(body));});return this;}return originalSendFile.call(this,filePath,...args)};
express.response.__greensumProblemBankFinalControls=true;
}
console.log('GREENSUM final problem bank controls loaded: send + sendFile');
