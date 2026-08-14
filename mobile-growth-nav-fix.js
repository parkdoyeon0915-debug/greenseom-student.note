const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

const style=`<style>
@media(max-width:560px){
  .side{
    display:flex!important;
    flex-wrap:nowrap!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
    -webkit-overflow-scrolling:touch!important;
    scrollbar-width:none!important;
    padding:8px 10px!important;
    gap:6px!important;
    justify-content:flex-start!important;
  }
  .side::-webkit-scrollbar{display:none!important}
  .side .nav{
    flex:0 0 auto!important;
    width:auto!important;
    min-width:max-content!important;
    margin:0!important;
    padding:11px 14px!important;
    font-size:14px!important;
    text-align:center!important;
    white-space:nowrap!important;
    line-height:1.25!important;
    border-radius:12px!important;
  }
  .side .nav[data-page="growth"]{display:block!important;}
}
</style>`;

fs.readFileSync=function(file,options){
  let content=originalReadFileSync.call(this,file,options);
  if(typeof file==='string'&&typeof content==='string'&&file.endsWith('/public/index.html')){
    content=content.replace('</head>',style+'</head>');

    // Add the missing growth tab to the real navigation before the app script runs.
    const patternNav='<div class="nav" data-page="patterns">🧵 패턴 연구노트</div>';
    const growthNav='<div class="nav" data-page="growth">📈 내 성장 그래프</div>';
    if(!content.includes('data-page="growth"')&&content.includes(patternNav)){
      content=content.replace(patternNav,patternNav+growthNav);
    }

    // The growth page is created lazily, so make the normal nav handler create it first.
    const oldNav='function bindNav(){document.querySelectorAll(\'.nav\').forEach(n=>n.onclick=()=>go(n.dataset.page))}function go(p){document.querySelectorAll(\'.page\').forEach(x=>x.classList.remove(\'active\'));$(p).classList.add(\'active\');document.querySelectorAll(\'.nav\').forEach(x=>x.classList.toggle(\'active\',x.dataset.page===p))}';
    const newNav='function bindNav(){document.querySelectorAll(\'.nav\').forEach(n=>n.onclick=()=>go(n.dataset.page))}function go(p){if(p===\'growth\'&&typeof growthPage===\'function\')growthPage();const page=$(p);if(!page)return;document.querySelectorAll(\'.page\').forEach(x=>x.classList.remove(\'active\'));page.classList.add(\'active\');document.querySelectorAll(\'.nav\').forEach(x=>x.classList.toggle(\'active\',x.dataset.page===p));if(p===\'growth\'&&window.innerWidth<=560){const n=document.querySelector(\'.nav[data-page="growth"]\');if(n)n.scrollIntoView({behavior:\'smooth\',inline:\'center\',block:\'nearest\'})}}';
    if(content.includes(oldNav))content=content.replace(oldNav,newNav);
  }
  return content;
};
