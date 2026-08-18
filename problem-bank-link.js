const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

// Problem-bank navigation fix:
// Keep the student page's existing navigation system, but let the problem-bank
// item use its normal href instead of being handled by go() as a SPA page.
fs.readFileSync=function(file,options){
  let html=originalReadFileSync.call(this,file,options);
  const isIndex=String(file).endsWith('/public/index.html')||String(file).endsWith('public\\index.html');
  if(!isIndex||typeof html!=='string')return html;

  // Remove every previously injected problem-bank navigation item.
  html=html
    .replace(/<a[^>]*data-page=["']problemBank["'][^>]*>[\\s\\S]*?<\\/a>/gi,'')
    .replace(/<div[^>]*data-page=["']problemBank["'][^>]*>[\\s\\S]*?<\\/div>/gi,'')
    .replace(/<a[^>]*id=["']problemBankNav["'][^>]*>[\\s\\S]*?<\\/a>/gi,'')
    .replace(/<[^>]*class=["'][^"']*problem-bank-link[^"']*["'][^>]*>[\\s\\S]*?<\\/[^>]+>/gi,'');

  // The original bindNav() treats every .nav as an in-page SPA button.
  // Exclude problemBank so the real <a href="/problem-bank.html"> link can
  // perform normal browser navigation without calling go('problemBank').
  html=html.replace(
    /function bindNav\(\)\{document\.querySelectorAll\('\.nav'\)\.forEach\(n=>n\.onclick=\(\)=>go\(n\.dataset\.page\)\)\}/,
    "function bindNav(){document.querySelectorAll('.nav').forEach(n=>{if(n.dataset.page==='problemBank')return;n.onclick=()=>go(n.dataset.page)})}"
  );

  return html;
};
