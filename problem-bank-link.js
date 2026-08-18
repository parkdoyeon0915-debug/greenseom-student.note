const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

fs.readFileSync=function(file,options){
  const html=originalReadFileSync.apply(this,arguments);
  const isIndex=String(file).endsWith('/public/index.html')||String(file).endsWith('public\\index.html');
  if(!isIndex)return html;

  const text=Buffer.isBuffer(html)?html.toString('utf8'):String(html);
  let cleaned=text
    .replace(/<div[^>]*class=["'][^"']*\\bnav\\b[^"']*["'][^>]*>\\s*📚\\s*문제은행\\s*<\\/div>/g,'')
    .replace(/<a[^>]*class=["'][^"']*problem-bank-link[^"']*["'][^>]*>[\\s\\S]*?<\\/a>/g,'');

  const nav=`<a class="nav problem-bank-link" href="/problem-bank.html" data-page="problemBank">📚 문제은행</a>`;
  cleaned=cleaned.replace('</aside>',nav+'</aside>');

  const style=`<style id="problem-bank-link-style">
.problem-bank-link{display:block;text-decoration:none;color:inherit}
@media(max-width:900px){.problem-bank-link{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;white-space:nowrap}}
</style>`;

  const result=cleaned.replace('</head>',style+'</head>');
  return Buffer.isBuffer(html)?Buffer.from(result):result;
};
