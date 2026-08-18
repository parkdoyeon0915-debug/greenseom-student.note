const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

// Clean, single-purpose link only. The problem-bank UI itself lives in
// public/problem-bank.html and is not injected into the student SPA.
fs.readFileSync=function(file,options){
  let html=originalReadFileSync.call(this,file,options);
  if(typeof file==='string'&&typeof html==='string'&&file.endsWith('/public/index.html')){
    const link='<a href="/problem-bank.html" class="nav" id="problemBankNav">📚 문제은행</a>';
    if(!html.includes('id="problemBankNav"')) html=html.replace('</aside>',link+'</aside>');
  }
  return html;
};
