const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

// Keep the problem-bank UI visible in the student page, but remove its navigation link.
fs.readFileSync=function(file,options){
  let html=originalReadFileSync.call(this,file,options);
  if(typeof file==='string'&&typeof html==='string'&&file.endsWith('/public/index.html')){
    html=html.replace(
      '<a href="/problem-bank.html" class="problem-bank-link" id="problemBankNav">📚 문제은행</a>',
      '<div class="problem-bank-link" aria-disabled="true">📚 문제은행</div>'
    );
    html=html.replace(
      '.problem-bank-link{display:block;',
      '.problem-bank-link{display:block;pointer-events:none;cursor:default;'
    );
    const script=`<script>(function(){
const S={
"강원(삼척)":['텀블러&도시락','물안경&스노우보드','스마트워치&이어폰'],
"남서울":['트리방울&스프링','볼트너트&깃털','머그컵&책','와인잔&수건','무당벌레&테니스공'],
"백석":['단추&국자','다트&손거울','주사위&볼링핀','줄자&와인잔','트라이앵글&병뚜껑'],
"상명(천안)":['테니스채&셔틀콕&스펀지','콘센트&돋보기&만년필','다트&탁구채+공&비커','쪼리신발&전구&나무기차','페인트롤러&나무톱&귤','안경&메모지+압정&호두','발레슈즈&톱니&아이스크림','해바라기&달걀껍질&앵무새','벼&동전&선인장','나사못&조개껍질&도토리','파&노트+펜&옥수수알맹이','리본&색종이+클립&아이스크림','식물줄기&라임&벽돌','옷핀&종이&풍선','파티장식 리본&나뭇잎&압정','줄자&연필&금붕어','모종삽&핑킹가위&양배추','와인따개+코르크&콘센트&수박','전화선&공책&브로콜리','판사봉&체리&물이 든 유리컵'],
"청주":['토마토&전기콘센트','스테이플러&실타래','선물상자&커터칼','벽돌&허리벨트','콜라&칫솔','금붕어&물안경','셔틀콕&줄자','목장갑&애견리드줄'],
"한양(에리카)":['가위&팽이','꼬리빗&오레오쿠키','나사못&종이컵','넥타이&합죽선','스페너&빨래집게','스프링&무선마우스','십자드라이버&무지편지봉투','주름스트로우&티백','철제옷걸이&탁구채','케이블타이&밥주걱','병따개&육각너트','손거울&자물쇠','에어캡&모종삽','달걀박스&병따개','연필깎이&주름스트로우'],
"호서":['사과&자물쇠','종이비행기&스카치테이프','테니스공&만년필','라임&분무기','자물쇠&전선']};
function init(){
 const file=document.getElementById('diagFile'), photo=document.getElementById('diagPhoto');
 if(!file||!photo||document.getElementById('diagProblemInfo')) return;
 const style=document.createElement('style');style.textContent='.diag-problem-info{display:none;margin-top:12px;padding:14px;border:1px solid #dce2e8;border-radius:12px;background:#f8fafc}.diag-problem-info.show{display:block}.diag-problem-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.diag-problem-grid label{display:block;font-size:12px;font-weight:800;margin-bottom:6px}.diag-problem-grid select{width:100%;padding:11px;border:1px solid #d8dee5;border-radius:10px;background:#fff;font:inherit}@media(max-width:560px){.diag-problem-grid{grid-template-columns:1fr}}';document.head.appendChild(style);
 const box=document.createElement('div');box.id='diagProblemInfo';box.className='diag-problem-info';box.innerHTML='<div style="font-weight:900;margin-bottom:9px">📚 문제은행 정보</div><div class="muted" style="margin-bottom:10px">사진을 넣은 뒤 학교와 제시물을 선택하면 소재란에 자동으로 기록됩니다.</div><div class="diag-problem-grid"><div><label for="diagSchool">내가 쓰는 학교</label><select id="diagSchool"><option value="">학교를 선택해주세요</option></select></div><div><label for="diagPrompt">제시물</label><select id="diagPrompt" disabled><option value="">학교를 먼저 선택해주세요</option></select></div></div>';
 photo.insertAdjacentElement('afterend',box);
 const school=document.getElementById('diagSchool'), prompt=document.getElementById('diagPrompt'), subject=document.getElementById('diagSubject');
 Object.keys(S).forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;school.appendChild(o)});
 const savedSchool=localStorage.getItem('greensum_diag_school')||'';if(savedSchool&&S[savedSchool])school.value=savedSchool;
 function prompts(){prompt.innerHTML='<option value="">제시물을 선택해주세요</option>';if(!school.value){prompt.disabled=true;return}prompt.disabled=false;S[school.value].forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;prompt.appendChild(o)});}
 school.addEventListener('change',function(){localStorage.setItem('greensum_diag_school',school.value);prompts();subject.value='';});
 prompt.addEventListener('change',function(){if(prompt.value)subject.value=school.value+' · '+prompt.value;});
 file.addEventListener('change',function(){if(file.files&&file.files.length){box.classList.add('show');prompts();}});
 prompts();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
setTimeout(init,300);setTimeout(init,1000);
})();</script>`;
    html=html.replace('</body>',script+'</body>');
  }
  return html;
};

console.log('GREENSUM problem bank UI patch + diagnosis school/prompt picker enabled');
