const fs=require('fs');
const originalReadFileSync=fs.readFileSync;
fs.readFileSync=function(file,options){
  let content=originalReadFileSync.call(this,file,options);
  if(typeof file==='string'&&file.endsWith('/public/index.html')&&typeof content==='string'){
    content=content.replace('</style>',' #diagTeacher{min-height:300px !important;}@media(max-width:560px){#diagTeacher{min-height:280px !important;}}\n</style>');
  }
  return content;
};
