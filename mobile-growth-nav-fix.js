const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

const style=`<style>
@media(max-width:560px){
  .side{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;overflow:visible!important;padding:8px 6px!important;gap:4px!important;}
  .side .nav{margin:0!important;padding:10px 2px!important;font-size:11px!important;text-align:center!important;white-space:nowrap!important;line-height:1.25!important;}
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
