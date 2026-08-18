const fs=require('fs');
const originalReadFileSync=fs.readFileSync;
fs.readFileSync=function(file,options){
  let html=originalReadFileSync.apply(this,arguments);
  const isIndex=String(file).endsWith('/public/index.html')||String(file).endsWith('public\\index.html');
  if(!isIndex)return html;
  const text=Buffer.isBuffer(html)?html.toString('utf8'):String(html);
  if(text.includes("data-page=\"problemBankLink\""))return html;
  const injected=text.replace('</aside>',`<div class="nav" data-page="problemBankLink" onclick="location.href='/problem-bank.html'">📚 문제은행</div></aside>`);
  return Buffer.isBuffer(html)?Buffer.from(injected):injected;
};
