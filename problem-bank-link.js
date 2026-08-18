const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

// Problem-bank navigation fix: the student page is a SPA, so the problem-bank
// item must leave the SPA before the generic .nav handler can call go().
fs.readFileSync=function(file,options){
  let html=originalReadFileSync.call(this,file,options);
  const isIndex=String(file).endsWith('/public/index.html')||String(file).endsWith('public\\index.html');
  if(!isIndex||typeof html!=='string')return html;

  html=html
    .replace(/<a[^>]*data-page=["']problemBank["'][^>]*>[\\s\\S]*?<\\/a>/gi,'')
    .replace(/<div[^>]*data-page=["']problemBank["'][^>]*>[\\s\\S]*?<\\/div>/gi,'')
    .replace(/<a[^>]*id=["']problemBankNav["'][^>]*>[\\s\\S]*?<\\/a>/gi,'')
    .replace(/<[^>]*class=["'][^"']*problem-bank-link[^"']*["'][^>]*>[\\s\\S]*?<\\/[^>]+>/gi,'');

  const script=`<script>(function(){
    function installProblemBankGuard(){
      if(document.documentElement.dataset.problemBankGuard==='1')return;
      document.documentElement.dataset.problemBankGuard='1';
      document.addEventListener('click',function(e){
        const nav=e.target.closest && e.target.closest('#problemBankNav,.problem-bank-link,[data-page="problemBank"]');
        if(!nav)return;
        e.preventDefault();
        e.stopImmediatePropagation();
        window.location.assign('/problem-bank.html');
      },true);
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installProblemBankGuard);else installProblemBankGuard();
  })();</script>`;

  return html.replace('</body>',script+'</body>');
};
