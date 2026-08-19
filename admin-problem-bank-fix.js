const express=require('express');
const originalSend=express.response.send;

const style=`<style id="admin-problem-bank-style">
.student{flex-wrap:wrap}.student>div:last-child{z-index:2}.pb-progress-btn{border:1px solid #d6dde5;background:#fff;padding:9px 12px;border-radius:9px;font-weight:800;cursor:pointer;color:#283a4d}.pb-progress-panel{width:100%;margin:0;padding:14px;border:1px solid #dce2e8;border-radius:12px;background:#fafbfc;display:none}.pb-progress-panel.open{display:block}.pb-school{border:1px solid #e1e6eb;border-radius:11px;padding:12px;margin-top:10px;background:#fff}.pb-school:first-child{margin-top:0}.pb-school-title{font-weight:900;margin-bottom:9px}.pb-summary{font-size:12px;color:#7d8791;margin-bottom:9px}.pb-prompts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:7px}.pb-prompt{padding:8px 9px;border-radius:8px;border:1px solid #dce2e8;font-size:12px;display:flex;justify-content:space-between;gap:8px}.pb-done{background:#e9f7ef;border-color:#b8e2c8}.pb-color{background:#fff6e6;border-color:#f2d29b}.pb-rough,.pb-detail{background:#f1f5ff;border-color:#cbd7f4}.pb-edit{background:#fff0f0;border-color:#f0bcbc}
</style>`;

const script=`<script id="admin-problem-bank-script">(function(){
let progressById={};
const prompts={
  '강원(삼척)':['텀블러&도시락','물안경&스노우보드','스마트워치&이어폰'],
  '남서울':['트리방울&스프링','볼트너트&깃털','머그컵&책','와인잔&수건','무당벌레&테니스공'],
  '백석':['단추&국자','다트&손거울','주사위&볼링핀','줄자&와인잔','트라이앵글&병뚜껑'],
  '상명(천안)':['테니스채&셔틀콕&스펀지','콘센트&돋보기&만년필','다트&탁구채+공&비커','쪼리신발&전구&나무기차','페인트롤러&나무톱&귤','안경&메모지+압정&호두','발레슈즈&톱니&아이스크림','해바라기&달걀껍질&앵무새','벼&동전&선인장','나사못&조개껍질&도토리','파&노트+펜&옥수수알맹이','리본&색종이+클립&아이스크림','식물줄기&라임&벽돌','옷핀&종이&풍선','파티장식 리본&나뭇잎&압정','줄자&연필&금붕어','모종삽&핑킹가위&양배추','와인따개+코르크&콘센트&수박','전화선&공책&브로콜리','판사봉&체리&물이 든 유리컵'],
  '청주':['토마토&전기콘센트','스테이플러&실타래','선물상자&커터칼','벽돌&허리벨트','콜라&칫솔','금붕어&물안경','셔틀콕&줄자','목장갑&애견리드줄'],
  '한양(에리카)':['가위&팽이','꼬리빗&오레오쿠키','나사못&종이컵','넥타이&합죽선','스페너&빨래집게','스프링&무선마우스','십자드라이버&무지편지봉투','주름스트로우&티백','철제옷걸이&탁구채','케이블타이&밥주걱','병따개&육각너트','손거울&자물쇠','에어캡&모종삽','달걀박스&병따개','연필깎이&주름스트로우'],
  '호서':['사과&자물쇠','종이비행기&스카치테이프','테니스공&만년필','라임&분무기','자물쇠&전선']
};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cls=v=>v==='완료'?'pb-done':v==='수정필요'?'pb-edit':v==='채색중'?'pb-color':v==='러프스케치'?'pb-rough':v==='디테일스케치'?'pb-detail':'';
function panelHtml(p){
  if(!p)return '<div class="pb-progress-panel"><div class="muted">문제은행 기록이 없습니다.</div></div>';
  const selected=Array.isArray(p.schools)?p.schools.filter(Boolean):[];
  if(!selected.length)return '<div class="pb-progress-panel"><div class="muted">아직 선택한 문제가 없습니다.</div></div>';
  const status=p.status&&typeof p.status==='object'?p.status:{};let total=0,done=0;
  const html=selected.map(s=>{const list=prompts[s]||[];let sd=0;const cards=list.map(pr=>{const v=status[s+'::'+pr]||'미진행';total++;if(v==='완료'){done++;sd++}return '<div class="pb-prompt '+cls(v)+'"><span>'+esc(pr)+'</span><b>'+esc(v)+'</b></div>'}).join('');return '<div class="pb-school"><div class="pb-school-title">🏫 '+esc(s)+'</div><div class="pb-summary">완료 '+sd+' / '+list.length+'개 · 학교 진행률 '+(list.length?Math.round(sd/list.length*100):0)+'%</div><div class="pb-prompts">'+cards+'</div></div>'}).join('');
  return '<div class="pb-progress-panel"><div class="pb-summary">전체 완료 '+done+' / '+total+'개 · 마지막 저장 '+esc(p.updated_at?new Date(p.updated_at).toLocaleString('ko-KR'):'-')+'</div>'+html+'</div>';
}
function install(){document.querySelectorAll('#students .student').forEach(row=>{if(row.dataset.pbInstalled==='1')return;const id=Number(row.dataset.studentId);if(!id)return;row.dataset.pbInstalled='1';const actions=row.querySelector('div:last-child');if(!actions)return;const btn=document.createElement('button');btn.type='button';btn.className='pb-progress-btn';btn.textContent='문제은행 진도';const holder=document.createElement('div');holder.innerHTML=panelHtml(progressById[id]);const p=holder.firstElementChild;btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();p.classList.toggle('open')});actions.appendChild(btn);row.appendChild(p)})}
async function load(){try{const r=await fetch('/api/admin/problem-bank',{credentials:'same-origin',cache:'no-store'});if(!r.ok)return;const a=await r.json();progressById={};a.forEach(x=>progressById[Number(x.id)]=x);install()}catch(e){console.warn('admin problem bank progress',e)}}
function boot(){load();const root=document.getElementById('students');if(root&&!root.dataset.pbObserver){root.dataset.pbObserver='1';new MutationObserver(()=>install()).observe(root,{childList:true,subtree:true)}}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();</script>`;

express.response.send=function(body){if(typeof body==='string'&&this.req&&this.req.path==='/admin.html'&&body.includes('</body>'))body=body.replace('</head>',style+'</head>').replace('</body>',script+'</body>');return originalSend.call(this,body)};
console.log('GREENSUM admin problem bank progress loaded');
