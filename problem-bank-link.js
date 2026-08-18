const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

fs.readFileSync=function(file,options){
  let html=originalReadFileSync.apply(this,arguments);
  const isIndex=String(file).endsWith('/public/index.html')||String(file).endsWith('public\\index.html');
  if(!isIndex)return html;
  const text=Buffer.isBuffer(html)?html.toString('utf8'):String(html);
  const cleaned=text.replace(/<div[^>]*class=["'][^"']*\\bnav\\b[^"']*["'][^>]*>\\s*📚\\s*문제은행\\s*<\\/div>/g,'');
  const injected=cleaned.replace('</aside>',`<div class="nav" id="problemBankNav">📚 문제은행</div></aside>`);
  const navStyle=`<style>@media(max-width:900px){.side{align-items:center;padding:10px 12px;gap:6px}.side .nav{white-space:nowrap;flex:0 0 auto;margin:0;padding:10px 12px}}</style>`;
  const script=`<script>(function(){
    function cleanupAndBind(){
      document.querySelectorAll('.nav').forEach(function(n){
        if(n.id!=='problemBankNav' && (n.textContent||'').replace(/\\s/g,'').includes('문제은행')) n.remove();
      });
      const nav=document.getElementById('problemBankNav');
      if(!nav)return;
      if(nav.dataset.problemBankBound!=='1'){
        nav.dataset.problemBankBound='1';
        nav.addEventListener('click',function(e){
          e.preventDefault();e.stopPropagation();
          window.location.assign('/problem-bank.html');
        },true);
      }
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cleanupAndBind);else cleanupAndBind();
    setTimeout(cleanupAndBind,100);
    setTimeout(cleanupAndBind,500);
  })();</script>`;
  const result=injected.replace('</head>',navStyle+'</head>').replace('</body>',script+'</body>');
  return Buffer.isBuffer(html)?Buffer.from(result):result;
};
