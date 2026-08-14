const fs=require('fs');
const originalReadFileSync=fs.readFileSync;
const style=`<style>@media(max-width:560px){.growth-only-chart{overflow-x:auto}.growth-only-chart svg{min-width:680px}}</style>`;
const script=`<script>(function(){
function loadGrowth(){
 const main=document.querySelector('main.content'); if(!main)return;
 let p=document.getElementById('growth');
 if(!p){p=document.createElement('section');p.id='growth';p.className='page';main.appendChild(p)}
 document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));p.classList.add('active');
 document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page==='growth'));
 p.innerHTML='<div class="hero"><div class="muted">MY PROGRESS</div><h1>내 성장 그래프</h1><p class="muted">최근 10회의 자가진단 기록으로 나의 변화를 확인해보세요.</p></div><div class="section"><h2>성장 데이터를 불러오는 중...</h2></div>';
 fetch('/api/diagnoses',{credentials:'same-origin',cache:'no-store'}).then(r=>{if(!r.ok)throw Error('기록을 불러오지 못했어요.');return r.json()}).then(data=>{
  const rs=(Array.isArray(data)?data:(data.diagnoses||data.records||[])).sort((a,b)=>new Date(a.date||0)-new Date(b.date||0)).slice(-10);
  const keys=['problem_analysis','form_score','completion','expression','composition'], names=['문제 분석','형태','완성도','표현력','구성'];
  const total=r=>Number.isFinite(Number(r.total))?Number(r.total):keys.reduce((s,k)=>s+(Number(r[k])||0),0);
  if(rs.length<2){p.innerHTML='<div class="hero"><div class="muted">MY PROGRESS</div><h1>내 성장 그래프</h1></div><div class="section"><div class="empty">자가진단 기록이 2회 이상 쌓이면 성장 그래프가 나타나요.</div></div>';return}
  const first=rs[0],last=rs[rs.length-1],avg=rs.reduce((s,r)=>s+total(r),0)/rs.length,delta=total(last)-total(first);
  p.innerHTML='<div class="hero"><div class="muted">MY PROGRESS</div><h1>내 성장 그래프</h1><p class="muted">최근 10회의 기록을 기준으로 나의 변화를 보여줘요.</p></div><div class="section"><h2>최근 '+rs.length+'회 성장 추이</h2><div class="growth-only-chart"><svg viewBox="0 0 760 320" width="100%" height="320">'+chart(rs,keys)+'</svg></div><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px">'+names.map((n,i)=>'<span><b>●</b> '+n+'</span>').join('')+'</div></div><div class="section"><h2>나의 변화</h2><div class="grid"><div class="card"><div class="muted">최근 평균</div><h2>'+avg.toFixed(1)+' / 25</h2></div><div class="card"><div class="muted">최고점</div><h2>'+Math.max(...rs.map(total))+' / 25</h2></div><div class="card"><div class="muted">첫 기록 → 최근</div><h2>'+((delta>=0?'+':'')+delta)+'점</h2></div></div></div><div class="section"><h2>나의 성장 리포트</h2><div class="card"><b>가장 많이 성장한 항목</b><div style="margin-top:8px">'+bestItem(rs,keys,names)+'</div><div style="margin-top:16px"><b>아직 보완이 필요한 항목</b><div style="margin-top:8px">'+weakItem(rs,keys,names)+'</div></div></div></div>';
 }).catch(e=>{p.innerHTML='<div class="hero"><h1>내 성장 그래프</h1></div><div class="section"><div class="empty">'+String(e.message||'오류가 발생했어요.')+'</div></div>'});
}
function chart(rs,keys){const W=760,H=320,L=44,R=16,T=18,B=44,cw=W-L-R,ch=H-T-B,colors=['#283a4d','#c72525','#6b7280','#8b5cf6','#059669'];let o='';for(let y=0;y<=5;y++){let yy=T+ch-y*ch/5;o+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="#e5e9ed"/><text x="'+(L-8)+'" y="'+(yy+4)+'" text-anchor="end" font-size="11">'+y+'</text>'}keys.forEach((k,s)=>{let pts=rs.map((r,i)=>{let x=L+(rs.length===1?cw/2:i*cw/(rs.length-1)),v=Math.max(0,Math.min(5,Number(r[k])||0)),y=T+ch-v*ch/5;return[x,y]});o+='<polyline points="'+pts.map(p=>p[0]+','+p[1]).join(' ')+'" fill="none" stroke="'+colors[s]+'" stroke-width="3"/>';pts.forEach(p=>o+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3" fill="'+colors[s]+'"/>')});rs.forEach((r,i)=>{let x=L+(rs.length===1?cw/2:i*cw/(rs.length-1));o+='<text x="'+x+'" y="302" text-anchor="middle" font-size="10">'+String(r.date||'').slice(5)+'</text>'});return o}
function bestItem(rs,keys,names){let best=-Infinity,idx=0;keys.forEach((k,i)=>{let d=(Number(rs[rs.length-1][k])||0)-(Number(rs[0][k])||0);if(d>best){best=d;idx=i}});return best>0?'🟢 '+names[idx]+' +'+best.toFixed(1):'아직 뚜렷한 상승 항목이 없어요.'}
function weakItem(rs,keys,names){let worst=Infinity,idx=0;keys.forEach((k,i)=>{let d=(Number(rs[rs.length-1][k])||0)-(Number(rs[0][k])||0);if(d<worst){worst=d;idx=i}});return '🟡 '+names[idx]}
function install(){const side=document.querySelector('.side');if(!side)return;let n=side.querySelector('[data-growth-only]');if(!n){n=document.createElement('div');n.className='nav';n.dataset.growthOnly='1';n.dataset.page='growth';n.textContent='📈 내 성장 그래프';side.appendChild(n)}if(n.dataset.growthBound!=='1'){n.dataset.growthBound='1';n.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();loadGrowth()},true)}}
function boot(){install();new MutationObserver(install).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();</script>`;
fs.readFileSync=function(file,options){let content=originalReadFileSync.call(this,file,options);if(typeof file==='string'&&typeof content==='string'&&file.endsWith('/public/index.html')){content=content.replace('</head>',style+'</head>');content=content.replace('</body>',script+'</body>')}return content};
