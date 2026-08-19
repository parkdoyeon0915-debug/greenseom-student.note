const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

// problem-bank-link-disable.js is kept for its diagnosis picker, but its old
// navigation patch disabled the student problem-bank link. Restore that link
// after the old patch runs so students can enter the problem bank normally.
fs.readFileSync=function(file,options){
  let html=originalReadFileSync.call(this,file,options);
  if(typeof file==='string'&&typeof html==='string'&&file.endsWith('/public/index.html')){
    html=html.replace(
      '<div class="problem-bank-link" aria-disabled="true">📚 문제은행</div>',
      '<a href="/problem-bank.html" class="problem-bank-link" id="problemBankNav">📚 문제은행</a>'
    );
    html=html.replace(
      '.problem-bank-link{display:block;pointer-events:none;cursor:default;',
      '.problem-bank-link{display:block;'
    );

    // The student page authenticates through /api/login and keeps the logged-in
    // user on the server session. Build the problem-bank URL from /api/me at
    // click time so the actual student DB id is always used.
    const script=`<script id="problem-bank-student-link-id-fix">(function(){
      function bind(){
        const link=document.getElementById('problemBankNav');
        if(!link||link.dataset.studentIdFix==='1')return;
        link.dataset.studentIdFix='1';
        link.addEventListener('click',async function(e){
          e.preventDefault();
          try{
            const r=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});
            const x=await r.json().catch(()=>({}));
            const id=Number(x&&x.user&&x.user.id||0);
            if(!r.ok||!Number.isInteger(id)||id<=0){
              console.warn('problem bank student id unavailable',x);
              window.location.assign('/problem-bank.html');
              return;
            }
            window.location.assign('/problem-bank.html?id='+encodeURIComponent(id));
          }catch(err){
            console.warn('problem bank student link fix',err);
            window.location.assign('/problem-bank.html');
          }
        },true);
      }
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
      setTimeout(bind,100);setTimeout(bind,500);
    })();</script>`;
    html=html.replace('</body>',script+'</body>');
  }
  return html;
};

console.log('GREENSUM student problem bank link restored + student ID URL fix');
