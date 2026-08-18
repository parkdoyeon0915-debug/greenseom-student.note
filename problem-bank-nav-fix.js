const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

// Keep the existing problem-bank page injection, but prevent the server-added
// navigation item from leaving the student page for the separate HTML file.
// problem-bank-page-fixed.js already provides the in-page problem-bank view.
fs.readFileSync=function(file,options){
  let content=originalReadFileSync.call(this,file,options);
  if(typeof file==='string'&&typeof content==='string'&&file.endsWith('/public/index.html')){
    content=content.replace("onclick=\"location.href='/problem-bank.html'\"",'');
  }
  return content;
};
