const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

// Keep the problem-bank UI visible in the student page, but remove its navigation link.
fs.readFileSync=function(file,options){
  let html=originalReadFileSync.call(this,file,options);
  if(typeof file==='string'&&typeof html==='string'&&file.endsWith('/public/index.html')){
    html=html.replace(
      '<a href="/problem-bank.html" class="problem-bank-link" id="problemBankNav">📚 문제은행</a>',
      '<div class="problem-bank-link" aria-disabled="true">📚 문제은행</div>'
    );
    html=html.replace(
      '.problem-bank-link{display:block;',
      '.problem-bank-link{display:block;pointer-events:none;cursor:default;'
    );
  }
  return html;
};

console.log('GREENSUM problem bank link disabled; UI preserved');
