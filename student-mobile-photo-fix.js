const fs = require('fs');
const path = require('path');

// Diagnosis photo preview only. Upload/save behavior is untouched.
try {
  const file = path.join(__dirname, 'public', 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  const marker = 'GREENSUM_DIAG_PHOTO_PREVIEW_V4';
  if (!html.includes(marker)) {
    const script = `<script id="${marker}">
(function(){
  function install(){
    var input=document.getElementById('diagFile');
    var box=document.getElementById('diagPhoto');
    if(!input||!box||input.dataset.previewV4==='1') return;
    input.dataset.previewV4='1';
    input.addEventListener('change',function(){
      var file=input.files&&input.files[0];
      if(!file || !/^image\\//i.test(file.type)) return;
      window.diagSelectedFile=file;
      var old=box.querySelector('[data-diag-preview-v4]');
      if(old) old.remove();
      var reader=new FileReader();
      reader.onload=function(ev){
        var img=document.createElement('img');
        img.setAttribute('data-diag-preview-v4','1');
        img.src=ev.target.result;
        img.alt='선택한 그림 사진';
        img.style.cssText='position:absolute;inset:0;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;background:#fafbfc;z-index:10;display:block;';
        box.appendChild(img);
        var ph=box.querySelector('.photo-placeholder');
        if(ph) ph.style.visibility='hidden';
      };
      reader.readAsDataURL(file);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  setTimeout(install,500);setTimeout(install,1500);
})();
</script>`;
    html = html.replace('</body>',script+'</body>');
    fs.writeFileSync(file,html,'utf8');
    console.log('[student-mobile-photo-fix] V4 diagnosis photo preview installed');
  } else console.log('[student-mobile-photo-fix] V4 already installed');
} catch(err){ console.error('[student-mobile-photo-fix] failed:',err.message); }
