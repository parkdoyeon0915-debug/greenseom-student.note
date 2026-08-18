const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

const script=`<script>(function(){
  function install(){
    if(window.__studentLoginStabilityInstalled)return;
    window.__studentLoginStabilityInstalled=true;
    function getOverlay(){return document.getElementById('stableLoginOverlay')||document.getElementById('greensumLoginLoading')}
    function hide(){const o=getOverlay();if(o){o.style.display='none';o.classList.remove('show')}const b=document.querySelector('.loginbox button.primary');if(b)b.disabled=false}
    function show(){const o=getOverlay();if(o){o.style.display='flex';o.classList.add('show')}}
    function watch(){
      const loginView=document.getElementById('loginView'),app=document.getElementById('app'),err=document.getElementById('loginErr');
      if(app&&app.style.display==='block'){hide();return true}
      if(err&&err.textContent.trim()){hide();return true}
      return false
    }
    function bind(){
      const btn=document.querySelector('.loginbox button.primary');
      if(!btn||btn.dataset.studentLoginStability==='1')return;
      btn.dataset.studentLoginStability='1';
      btn.addEventListener('click',function(){
        show();
        let n=0;
        const timer=setInterval(function(){
          n++;
          if(watch()||n>=100){clearInterval(timer);if(n>=100)hide()}
        },100);
      },true);
    }
    bind();
    watch();
    setTimeout(bind,100);
    setTimeout(bind,500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();</script>`;

fs.readFileSync=function(file,options){
  let content=originalReadFileSync.call(this,file,options);
  if(typeof file==='string'&&typeof content==='string'&&file.endsWith('/public/index.html')) content=content.replace('</body>',script+'</body>');
  return content;
};
