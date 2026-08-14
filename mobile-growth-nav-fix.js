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
  }
  return content;
};
