const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

fs.readFileSync=function(file,options){
  let html=originalReadFileSync.apply(this,arguments);
  const isIndex=String(file).endsWith('/public/index.html')||String(file).endsWith('public\\index.html');
  if(!isIndex)return html;
  const text=Buffer.isBuffer(html)?html.toString('utf8'):String(html);

  // Remove every previous problem-bank menu injection so there can only be one.
  const cleaned=text.replace(/<div[^>]*class=["'][^"']*\\bnav\\b[^"']*["'][^>]*>\\s*📚\\s*문제은행\\s*<\\/div>/g,'');

  // Add one dedicated external-page menu item.
  const injected=cleaned.replace('</aside>',`<div class="nav" id="problemBankNav">📚 문제은행</div></aside>`);
  const script=`<script>(function(){
    function bindProblemBank(){
      const nav=document.getElementById('problemBankNav');
      if(!nav||nav.dataset.problemBankBound==='1')return;
      nav.dataset.problemBankBound='1';
      nav.addEventListener('click',function(e){
        e.preventDefault();
        e.stopPropagation();
        window.location.href='/problem-bank.html';
      },true);
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindProblemBank);else bindProblemBank();
    setTimeout(bindProblemBank,100);
  })();</script>`;
  const result=injected.replace('</body>',script+'</body>');
  return Buffer.isBuffer(html)?Buffer.from(result):result;
};
