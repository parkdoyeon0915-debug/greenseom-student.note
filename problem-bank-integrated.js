const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

// Integrate the standalone problem-bank UI into the logged-in student SPA.
// This only changes the student index HTML; existing diagnosis/pattern logic stays intact.
fs.readFileSync=function(file,options){
  let html=originalReadFileSync.call(this,file,options);
  const isIndex=String(file).endsWith('/public/index.html')||String(file).endsWith('public\\index.html');
  if(!isIndex||typeof html!=='string')return html;

  // Remove any older problem-bank menu injected by previous fixes.
  html=html
    .replace(/<a[^>]*data-page=["']problemBank["'][^>]*>[\\s\\S]*?<\\/a>/gi,'')
    .replace(/<div[^>]*data-page=["']problemBank["'][^>]*>[\\s\\S]*?<\\/div>/gi,'')
    .replace(/<a[^>]*id=["']problemBankNav["'][^>]*>[\\s\\S]*?<\\/a>/gi,'')
    .replace(/<[^>]*class=["'][^"']*problem-bank-link[^"']*["'][^>]*>[\\s\\S]*?<\\/[^>]+>/gi,'');

  const nav='<div class="nav" data-page="problemBank">📚 문제은행</div>';
  html=html.replace('</aside>',nav+'</aside>');

  const css=`<style id="problem-bank-integrated-style">
.pb-section{display:none}.pb-section.active{display:block}.pb-hero,.pb-box{background:#fff;border:1px solid #dce2e8;border-radius:18px}.pb-hero{padding:24px;margin-bottom:16px}.pb-eyebrow{font-size:12px;color:#7d8791;font-weight:800;letter-spacing:.04em}.pb-hero h1{margin:6px 0 8px;font-size:28px}.pb-muted{color:#7d8791;font-size:13px}.pb-box{padding:20px}.pb-box h2{margin:0 0 6px}.pb-selects{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:20px}.pb-field label{display:block;font-size:13px;font-weight:900;margin-bottom:7px}.pb-select{width:100%;padding:14px 12px;border:1px solid #d8dee5;border-radius:11px;background:#fff;font:inherit;font-weight:700}.pb-next{margin-top:18px;padding:14px;border-radius:12px;background:#f6f8fa;color:#7d8791;font-size:13px}.pb-next.ready{background:#edf3f9;color:#26313b;font-weight:800}@media(max-width:700px){.pb-selects{grid-template-columns:1fr}.pb-hero h1{font-size:25px}}
</style>`;
  html=html.replace('</head>',css+'</head>');

  const section=`<section id="problemBank" class="page pb-section"><div class="pb-hero"><div class="pb-eyebrow">PROBLEM BANK</div><h1>📚 문제은행 진행상황</h1><p class="pb-muted">먼저 지원하는 학교를 선택해주세요.</p></div><div class="pb-box"><h2>지원 학교 선택</h2><p class="pb-muted">문제은행을 준비할 학교를 최대 3곳까지 선택할 수 있어요.</p><div class="pb-selects"><div class="pb-field"><label>문제은행 학교 선택 1</label><select id="pbSchool1" class="pb-select"><option value="">학교를 선택해주세요</option></select></div><div class="pb-field"><label>문제은행 학교 선택 2</label><select id="pbSchool2" class="pb-select"><option value="">학교를 선택해주세요</option></select></div><div class="pb-field"><label>문제은행 학교 선택 3</label><select id="pbSchool3" class="pb-select"><option value="">학교를 선택해주세요</option></select></div></div><div id="pbNext" class="pb-next">학교를 선택하면 다음 단계가 준비됩니다.</div></div></section>`;
  html=html.replace('</main>',section+'</main>');

  const script=`<script id="problem-bank-integrated-script">(function(){
const schools=['강원(삼척)','남서울','백석','상명(천안)','청주','한양(에리카)','호서'];
function initProblemBank(){
 const page=document.getElementById('problemBank');if(!page)return;
 const selects=['pbSchool1','pbSchool2','pbSchool3'].map(id=>document.getElementById(id));const next=document.getElementById('pbNext');
 if(!selects.every(Boolean)||!next)return;
 selects.forEach(s=>{if(s.dataset.ready==='1')return;s.dataset.ready='1';schools.forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;s.appendChild(o)});s.addEventListener('change',update)});
 try{const saved=JSON.parse(localStorage.getItem('greensum_problem_bank_schools')||'[]');selects.forEach((s,i)=>{if(saved[i])s.value=saved[i]})}catch(e){}
 update();
 function update(){const picked=selects.map(s=>s.value).filter(Boolean);next.classList.toggle('ready',picked.length>0);next.textContent=picked.length?'선택한 학교: '+picked.join(' · '):'학교를 선택하면 다음 단계가 준비됩니다.';localStorage.setItem('greensum_problem_bank_schools',JSON.stringify(selects.map(s=>s.value)))}
}
const originalGo=window.go;
window.go=function(p){if(p==='problemBank'){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));const target=document.getElementById('problemBank');if(target)target.classList.add('active');document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page==='problemBank'));initProblemBank();return}return originalGo.apply(this,arguments)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initProblemBank);else initProblemBank();
})();</script>`;
  return html.replace('</body>',script+'</body>');
};
