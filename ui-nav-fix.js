const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

// Small, isolated UI-only fix for the student navigation bar.
// Do not change routing, data, login, diagnosis, or pattern behavior.
const style=`<style id="greensum-nav-fix">
@media(max-width:900px){
  .side{display:flex;overflow-x:auto;overflow-y:hidden;border-right:0;border-bottom:1px solid #dce2e8;padding:15px;gap:8px;align-items:flex-start;white-space:nowrap;-webkit-overflow-scrolling:touch}
  .side .nav{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:auto;height:auto;min-height:48px;margin:0;padding:12px 16px;white-space:nowrap;line-height:1.2}
}
@media(min-width:901px){
  .side .nav{white-space:nowrap;height:auto}
}
</style>`;

fs.readFileSync=function(file,options){
  let content=originalReadFileSync.call(this,file,options);
  if(typeof file==='string'&&typeof content==='string'&&file.endsWith('/public/index.html')&&!content.includes('id="greensum-nav-fix"')){
    content=content.replace('</head>',style+'</head>');
  }
  // When returning from the standalone problem-bank page, always load the
  // student's home page fresh instead of using history.back(). history.back()
  // can restore the pre-login page snapshot and show the login screen again.
  if(typeof file==='string'&&typeof content==='string'&&file.endsWith('/public/problem-bank.html')){
    const old="document.querySelector('#backHome').onclick=goHome;";
    const fixed="document.querySelector('#backHome').onclick=function(){location.href='/';};";
    if(content.includes(old)) content=content.replace(old,fixed);
  }
  return content;
};

console.log('GREENSUM navigation UI fix loaded');
