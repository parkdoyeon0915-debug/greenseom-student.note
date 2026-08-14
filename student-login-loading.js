const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

const script=`<script>(function(){
function install(){
  if(window.__greensumLoginLoadingInstalled)return;
  const original=window.login;
  if(typeof original!=='function')return;
  window.__greensumLoginLoadingInstalled=true;
  const style=document.createElement('style');
  style.textContent='#greensumLoginLoading{position:fixed;inset:0;background:#f5f7faeF;display:none;align-items:center;justify-content:center;z-index:999999;padding:20px}#greensumLoginLoading.show{display:flex}.greensum-login-loading-box{width:min(340px,100%);background:#fff;border:1px solid #dce2e8;border-radius:20px;padding:30px 24px;text-align:center;box-shadow:0 16px 50px #25374a18}.greensum-login-spinner{width:34px;height:34px;border:3px solid #dce2e8;border-top-color:#283a4d;border-radius:50%;margin:0 auto 16px;animation:greensumSpin .8s linear infinite}@keyframes greensumSpin{to{transform:rotate(360deg)}}.greensum-login-title{font-size:18px;font-weight:900;color:#26313b}.greensum-login-sub{margin-top:7px;color:#7d8791;font-size:13px}';
  document.head.appendChild(style);
  const overlay=document.createElement('div');
  overlay.id='greensumLoginLoading';
  overlay.innerHTML='<div class="greensum-login-loading-box"><div class="greensum-login-spinner"></div><div class="greensum-login-title">로그인 중입니다..</div><div class="greensum-login-sub">잠시만 기다려주세요.</div></div>';
  document.body.appendChild(overlay);
  window.login=async function(){
    overlay.classList.add('show');
    const btn=document.querySelector('.loginbox button.primary');
    if(btn)btn.disabled=true;
    try{return await original.apply(this,arguments)}catch(e){overlay.classList.remove('show');if(btn)btn.disabled=false;throw e}
  };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
setTimeout(install,100);
})();</script>`;

fs.readFileSync=function(file,options){let content=originalReadFileSync.call(this,file,options);if(typeof file==='string'&&typeof content==='string'&&file.endsWith('/public/index.html'))content=content.replace('</body>',script+'</body>');return content};
