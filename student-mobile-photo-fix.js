const fs = require('fs');
const path = require('path');

try {
  const file = path.join(__dirname, 'public', 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  const marker = '/* GREENSUM_MOBILE_PHOTO_FIX_V3 */';

  if (!html.includes(marker)) {
    const start = html.indexOf('function bindPhoto(');
    const end = html.indexOf('function newDiag(', start);

    if (start === -1 || end === -1) {
      throw new Error('bindPhoto/newDiag boundary was not found in public/index.html');
    }

    const replacement = `${marker}
function bindPhoto(id,boxId,type){
const input=$(id),box=$(boxId);if(!input||!box)return;
const handle=()=>{
  const f=input.files&&input.files[0];
  if(!f)return;
  if(!f.type||!f.type.startsWith('image/')){alert('이미지 파일만 선택할 수 있습니다.');input.value='';return}
  if(type==='diag')diagSelectedFile=f;else patSelectedFile=f;
  let img=box.querySelector('.preview-photo');
  if(!img){
    img=document.createElement('img');
    img.className='preview-photo';
    img.alt='선택한 사진';
    img.style.cssText='position:absolute;inset:0;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;z-index:1;background:#fafbfc;';
    box.appendChild(img);
  }
  const ph=box.querySelector('.photo-placeholder,.pattern-placeholder');
  if(ph)ph.style.display='none';
  try{
    if(img.dataset.objectUrl)URL.revokeObjectURL(img.dataset.objectUrl);
    const url=URL.createObjectURL(f);
    img.dataset.objectUrl=url;
    img.src=url;
  }catch(e){
    const reader=new FileReader();
    reader.onload=ev=>{img.src=ev.target.result};
    reader.readAsDataURL(f);
  }
};
input.addEventListener('change',handle);
input.addEventListener('input',handle);
}
`;

    html = html.slice(0, start) + replacement + html.slice(end);
    fs.writeFileSync(file, html, 'utf8');
    console.log('[student-mobile-photo-fix] V3 mobile diagnosis photo picker patched');
  } else {
    console.log('[student-mobile-photo-fix] V3 patch already applied');
  }
} catch (err) {
  console.error('[student-mobile-photo-fix] failed:', err.message);
}
