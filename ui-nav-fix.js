require('./problem-bank-student-route-fix.js');
require('./problem-bank-student-url-fix.js');

const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

// Isolated UI/navigation fix for the student page.
// Keep routing, login, diagnosis, pattern data, and problem-bank behavior unchanged.
const style=`<style id="greensum-nav-fix">
.side{position:relative;z-index:30}
.side .nav{position:relative;z-index:31;pointer-events:auto;cursor:pointer;user-select:none;touch-action:manipulation}
@media(max-width:900px){
  .side{display:flex;overflow-x:auto;overflow-y:hidden;border-right:0;border-bottom:1px solid #dce2e8;padding:15px;gap:8px;align-items:flex-start;white-space:nowrap;-webkit-overflow-scrolling:touch}
  .side .nav{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:auto;height:auto;min-height:48px;margin:0;padding:12px 16px;white-space:nowrap;line-height:1.2}
}
@media(min-width:901px){
  .side .nav{white-space:nowrap;height:auto}
}
</style>`;

// Use delegated click handling as a second, robust path. The original page
// already has bindNav(), but delegation keeps navigation working even if a
// later script replaces the sidebar nodes or an earlier handler is lost.
const script=`<script id="greensum-nav-click-fix">(function(){
  function install(){
    const side=document.querySelector('.side');
    if(!side||side.dataset.navFixInstalled==='1')return;
    side.dataset.navFixInstalled='1';
    side.addEventListener('click',function(e){
      const nav=e.target.closest('.nav[data-page]');
      if(!nav||!side.contains(nav))return;
      e.preventDefault();
      e.stopPropagation();
      const page=nav.dataset.page;
      if(typeof window.go==='function'){
        window.go(page);
        return;
      }
      document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
      const target=document.getElementById(page);
      if(target)target.classList.add('active');
      document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===page));
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  setTimeout(install,500);
})();</script>`;

fs.readFileSync=function(file,options){
  let content=originalReadFileSync.call(this,file,options);
  if(typeof file==='string'&&typeof content==='string'&&file.endsWith('/public/index.html')&&!content.includes('id="greensum-nav-fix"')){
    content=content.replace('</head>',style+'</head>');
    content=content.replace('</body>',script+'</body>');
  }
  // When returning from the standalone problem-bank page, always load the
  // student's home page fresh instead of using history.back(). history.back()
  // can restore the pre-login page snapshot and show the login screen again.
  if(typeof file==='string'&&typeof content==='string'&&file.endsWith('/public/problem-bank.html')){
    const old="document.querySelector('#backHome').onclick=goHome;";
    const fixed="document.querySelector('#backHome').onclick=function(){location.href='/';};";
    if(content.includes(old))content=content.replace(old,fixed);
  }
  return content;
};

console.log('GREENSUM navigation UI fix loaded: reliable sidebar clicks');
