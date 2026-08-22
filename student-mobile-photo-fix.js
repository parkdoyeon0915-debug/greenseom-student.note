const fs = require('fs');
const path = require('path');

try {
  const file = path.join(__dirname, 'public', 'index.html');
  let html = fs.readFileSync(file, 'utf8');

  const marker = "/* GREENSUM_MOBILE_PHOTO_FIX_V2 */";
  if (!html.includes(marker)) {
    const pattern = /function bindPhoto\(id,boxId,type\)\{.*?\nfunction newDiag\(\)/s;
    const replacement = `${marker}\nfunction bindPhoto(id,boxId,type){\nconst input=$(id),box=$(boxId);if(!input||!box)return;\nconst handle=()=>{\n  const f=input.files&&input.files[0];\n  if(!f)return;\n  if(!f.type||!f.type.startsWith('image/')){alert('이미지 파일만 선택할 수 있습니다.');input.value='';return}\n  if(type==='diag')diagSelectedFile=f;else patSelectedFile=f;\n  let img=box.querySelector('.preview-photo');\n  if(!img){img=document.createElement('img');img.className='preview-photo';img.alt='선택한 사진';img.style.cssText='position:absolute;inset:0;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;z-index:1;background:#fafbfc;';box.appendChild(img)}\n  const ph=box.querySelector('.photo-placeholder,.pattern-placeholder');if(ph)ph.style.display='none';\n  try{\n    const url=URL.createObjectURL(f);\n    img.src=url;\n    img.onload=()=>{try{URL.revokeObjectURL(url)}catch(e){}};\n  }catch(e){\n    const reader=new FileReader();\n    reader.onload=ev=>{img.src=ev.target.result};\n    reader.readAsDataURL(f);\n  }\n};\ninput.addEventListener('change',handle);\ninput.addEventListener('input',handle);\n}\nfunction newDiag()`;

    if (!pattern.test(html)) {
      throw new Error('bindPhoto function was not found in public/index.html');
    }

    html = html.replace(pattern, replacement);
    fs.writeFileSync(file, html, 'utf8');
    console.log('[student-mobile-photo-fix] mobile diagnosis photo picker patched');
  } else {
    console.log('[student-mobile-photo-fix] patch already applied');
  }
} catch (err) {
  console.error('[student-mobile-photo-fix] failed:', err.message);
}
