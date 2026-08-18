const fs=require('fs');
const path=require('path');
const originalReadFileSync=fs.readFileSync;

const schools={
  '강원(삼척)':['텀블러&도시락','물안경&스노우보드','스마트워치&이어폰'],
  '남서울':['트리방울&스프링','볼트너트&깃털','머그컵&책','와인잔&수건','무당벌레&테니스공'],
  '백석':['단추&국자','다트&손거울','주사위&볼링핀','줄자&와인잔','트라이앵글&병뚜껑'],
  '상명(천안)':['테니스채&셔틀콕&스펀지','콘센트&돋보기&만년필','다트&탁구채+공&비커','쪼리신발&전구&나무기차','페인트롤러&나무톱&귤','안경&메모지+압정&호두','발레슈즈&톱니&아이스크림','해바라기&달걀껍질&앵무새','벼&동전&선인장','나사못&조개껍질&도토리','파&노트+펜&옥수수알맹이','리본&색종이+클립&아이스크림','식물줄기&라임&벽돌','옷핀&종이&풍선','파티장식 리본 & 나뭇잎 & 압정','줄자&연필&금붕어','모종삽&핑킹가위&양배추','와인따개+코르크&콘센트&수박','전화선&공책&브로콜리','판사봉&체리&물이 든 유리컵'],
  '한양(에리카)':['가위&팽이','꼬리빗&오레오쿠키','나사못&종이컵','넥타이&합죽선','스페너&빨래집게','스프링&무선마우스','십자드라이버&무지편지봉투','주름스트로우&티백','철제옷걸이&탁구채','케이블타이&밥주걱','병따개&육각너트','손거울&자물쇠','에어캡&모종삽','달걀박스&병따개','연필깎이&주름스트로우'],
  '호서':['사과&자물쇠','종이비행기&스카치테이프','테니스공&만년필','라임&분무기','자물쇠&전선']
};
const statuses=['미진행','러프스케치','디테일스케치','채색중','완료','수정필요'];

const script=`<script>(function(){
  const SCHOOLS=${JSON.stringify(schools)};
  const STATUSES=${JSON.stringify(statuses)};
  const KEY='greensum_problem_bank_v1';
  let state={schools:['','',''],status:{},photos:{}};
  function userKey(){try{return KEY+'_'+(window.currentUser?.username||window.currentUser?.name||document.getElementById('userName')?.textContent||'student')}catch(e){return KEY+'_student'}}
  function load(){try{const x=JSON.parse(localStorage.getItem(userKey())||'null');if(x&&typeof x==='object')state={schools:Array.isArray(x.schools)?x.schools.slice(0,3):['','',''],status:x.status||{},photos:x.photos||{}}}catch(e){}}
  function save(){try{localStorage.setItem(userKey(),JSON.stringify(state))}catch(e){}}
  function esc(s){return String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
  function render(){
    let page=document.getElementById('problem-bank-page');if(!page)return;
    const chosen=state.schools.filter(Boolean);
    page.innerHTML='<div class="pb-hero"><div class="pb-kicker">PROBLEM BANK · PROGRESS</div><h1>문제은행 진행상황</h1><p>지원하는 학교를 선택하고, 제시물별 진행상황을 기록해보세요.</p></div>'+
      '<div class="pb-card"><h2>지원 학교 선택</h2><p class="pb-muted">최대 3개 학교까지 선택할 수 있습니다.</p><div class="pb-selects">'+[0,1,2].map(i=>'<label><span>문제은행 학교 선택 '+(i+1)+'</span><select class="pb-school" data-i="'+i+'"><option value="">학교를 선택해주세요</option>'+Object.keys(SCHOOLS).map(s=>'<option value="'+esc(s)+'" '+(state.schools[i]===s?'selected':'')+'>'+esc(s)+'</option>').join('')+'</select></label>').join('')+'</div></div>'+
      (chosen.length?chosen.map(schoolTable).join(''):'<div class="pb-card pb-empty"><div>📚</div><b>학교를 선택하면 문제은행 진행상황이 표시됩니다.</b></div>')+
      '<div class="pb-card"><div class="pb-headrow"><div><div class="pb-kicker">PHOTO ARCHIVE</div><h2>문제은행 그림 사진보관함</h2><p class="pb-muted">선택한 학교의 제시물별 그림을 사진 보관함에서 선택해 올릴 수 있습니다.</p></div></div><div class="pb-photo-grid">'+(chosen.length?chosen.flatMap(s=>SCHOOLS[s].map((p,idx)=>photoCard(s,idx,p))).join(''):'<div class="pb-empty">먼저 학교를 선택해주세요.</div>')+'</div></div>';
    page.querySelectorAll('.pb-school').forEach(el=>el.onchange=function(){state.schools[+this.dataset.i]=this.value; if(!this.value) return saveRender(); saveRender()});
    page.querySelectorAll('.pb-status').forEach(el=>el.onchange=function(){const k=this.dataset.key;state.status[k]=this.value;save();updateSummary(this.closest('.pb-school-block'))});
    page.querySelectorAll('.pb-photo-input').forEach(el=>el.onchange=function(){const f=this.files?.[0];if(!f)return;if(!f.type.startsWith('image/')){alert('이미지 파일만 선택할 수 있습니다.');this.value='';return}const key=this.dataset.key;const reader=new FileReader();reader.onload=e=>{state.photos[key]=e.target.result;save();render()};reader.readAsDataURL(f)});
    page.querySelectorAll('.pb-photo-remove').forEach(el=>el.onclick=function(){delete state.photos[this.dataset.key];save();render()});
  }
  function saveRender(){save();render()}
  function schoolTable(school){const items=SCHOOLS[school]||[];return '<div class="pb-card pb-school-block"><div class="pb-school-title"><div><div class="pb-kicker">SELECTED SCHOOL</div><h2>'+esc(school)+'</h2></div><div class="pb-progress" data-summary="'+esc(school)+'"></div></div><div class="pb-table-wrap"><table class="pb-table"><thead><tr><th>진행상황</th>'+items.map(p=>'<th>'+esc(p)+'</th>').join('')+'</tr></thead><tbody><tr><th>진행상황 선택</th>'+items.map((p,i)=>{const k=school+'__'+i;return '<td><select class="pb-status" data-key="'+esc(k)+'"><option value="">선택</option>'+STATUSES.map(x=>'<option value="'+esc(x)+'" '+(state.status[k]===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></td>'}).join('')+'</tr></tbody></table></div><div class="pb-status-legend">'+STATUSES.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div></div>'}
  function photoCard(school,idx,p){const k=school+'__'+idx;const src=state.photos[k];return '<div class="pb-photo-card"><div class="pb-photo-title">'+esc(school)+'</div><b>'+esc(p)+'</b><div class="pb-photo-box">'+(src?'<img src="'+esc(src)+'" alt="">':'<div class="pb-photo-placeholder"><span>＋</span><small>사진 선택</small></div>')+'<input class="pb-photo-input" data-key="'+esc(k)+'" type="file" accept="image/*"></div>'+(src?'<button type="button" class="pb-photo-remove" data-key="'+esc(k)+'">사진 삭제</button>':'')+'</div>'}
  function updateSummary(block){if(!block)return;const selects=block.querySelectorAll('.pb-status');const done=[...selects].filter(x=>x.value==='완료').length;const total=selects.length;const box=block.querySelector('.pb-progress');if(box)box.textContent=done+'/'+total+' 완료'}
  function ensure(){
    if(document.getElementById('problem-bank-page')){load();render();return}
    const main=document.querySelector('main.content');if(!main)return;
    const page=document.createElement('section');page.id='problem-bank-page';page.className='page';main.appendChild(page);
    const style=document.createElement('style');style.textContent=`#problem-bank-page{max-width:1180px;width:100%;margin:auto;padding:24px}.pb-hero,.pb-card{background:#fff;border:1px solid #dce2e8;border-radius:18px;padding:22px;margin-bottom:16px}.pb-kicker{font-size:12px;font-weight:900;letter-spacing:.08em;color:#7d8791}.pb-hero h1{font-size:28px;margin:7px 0}.pb-hero p,.pb-muted{color:#7d8791;font-size:13px}.pb-card h2{margin:5px 0 8px}.pb-selects{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.pb-selects label span{display:block;font-size:12px;font-weight:800;margin-bottom:7px}.pb-selects select,.pb-status{width:100%;border:1px solid #d6dde5;background:#fff;border-radius:10px;padding:11px;font:inherit}.pb-school-title{display:flex;align-items:center;justify-content:space-between;gap:12px}.pb-progress{background:#edf3f9;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:900;white-space:nowrap}.pb-table-wrap{overflow-x:auto;margin-top:16px;border:1px solid #dce2e8;border-radius:13px}.pb-table{border-collapse:collapse;width:max-content;min-width:100%}.pb-table th,.pb-table td{border-bottom:1px solid #e4e8ec;border-right:1px solid #e4e8ec;padding:10px;vertical-align:top}.pb-table th{background:#f7f9fb;font-size:12px;min-width:150px;max-width:190px}.pb-table th:first-child{position:sticky;left:0;z-index:2;min-width:105px}.pb-table tbody th{background:#fff}.pb-table td{min-width:150px}.pb-status{font-size:12px}.pb-status-legend{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.pb-status-legend span{font-size:11px;border:1px solid #dce2e8;border-radius:999px;padding:5px 8px;color:#68737e}.pb-photo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.pb-photo-card{border:1px solid #dfe4e9;border-radius:13px;padding:12px}.pb-photo-title{font-size:11px;color:#7d8791;margin-bottom:4px}.pb-photo-box{height:190px;border:2px dashed #cbd3dc;border-radius:11px;background:#fafbfc;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;margin-top:9px}.pb-photo-box img{width:100%;height:100%;object-fit:contain}.pb-photo-box input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}.pb-photo-placeholder{text-align:center;color:#7d8791}.pb-photo-placeholder span{display:block;font-size:34px}.pb-photo-placeholder small{font-size:12px}.pb-photo-remove{margin-top:7px;border:0;background:transparent;color:#b42318;font-size:12px;cursor:pointer}.pb-empty{text-align:center;padding:34px;color:#8a949d}.pb-empty div{font-size:32px;margin-bottom:7px}@media(max-width:760px){#problem-bank-page{padding:10px}.pb-selects{grid-template-columns:1fr}.pb-photo-grid{grid-template-columns:1fr 1fr}.pb-hero h1{font-size:24px}}@media(max-width:480px){.pb-photo-grid{grid-template-columns:1fr}.pb-card{padding:16px}}`;document.head.appendChild(style);
    load();render();
    document.addEventListener('click',function(e){const nav=e.target.closest('.nav');if(!nav||!String(nav.textContent).includes('문제은행'))return;e.preventDefault();e.stopImmediatePropagation();document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));page.classList.add('active');document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x===nav));window.scrollTo({top:0,behavior:'smooth'});},{capture:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure);else ensure();setTimeout(ensure,300);
})();</script>`;

fs.readFileSync=function(file,options){let content=originalReadFileSync.call(this,file,options);if(typeof file==='string'&&typeof content==='string'&&file.endsWith('/public/index.html'))content=content.replace('</body>',script+'</body>');return content};
