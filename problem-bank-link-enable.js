const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

// problem-bank-link-disable.js is kept for its diagnosis picker, but its old
// navigation patch disabled the student problem-bank link. Restore that link
// after the old patch runs so students can enter the problem bank normally.
fs.readFileSync=function(file,options){
  let html=originalReadFileSync.call(this,file,options);
  if(typeof file==='string'&&typeof html==='string'&&file.endsWith('/public/index.html')){
    html=html.replace(
      '<div class="problem-bank-link" aria-disabled="true">📚 문제은행</div>',
      '<a href="/problem-bank.html" class="problem-bank-link" id="problemBankNav">📚 문제은행</a>'
    );
    html=html.replace(
      '.problem-bank-link{display:block;pointer-events:none;cursor:default;',
      '.problem-bank-link{display:block;'
    );
  }
  return html;
};

console.log('GREENSUM student problem bank link restored');
