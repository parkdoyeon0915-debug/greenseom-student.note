const fs=require('fs');
const originalReadFileSync=fs.readFileSync;

const script=`<script>(function(){
  function installLogin(){
    const btn=document.getElementById('loginBtn');
    if(!btn || btn.dataset.stableLogin==='1') return;
    btn.dataset.stableLogin='1';
    const style=document.createElement('style');
    style.textContent='#stableLoginOverlay{position:fixed;inset:0;background:#f5f7faee;display:none;align-items:center;justify-content:center;z-index:999999;padding:20px}.stable-login-box{width:min(320px,100%);background:#fff;border:1px solid #dce2e8;border-radius:18px;padding:28px 22px;text-align:center;box-shadow:0 16px 50px #25374a18}.stable-login-spinner{width:32px;height:32px;border:3px solid #dce2e8;border-top-color:#283a4d;border-radius:50%;margin:0 auto 14px;animation:stableSpin .8s linear infinite}@keyframes stableSpin{to{transform:rotate(360deg)}}.stable-login-title{font-size:18px;font-weight:900}.stable-login-sub{margin-top:6px;color:#7d8791;font-size:13px}';
    document.head.appendChild(style);
    const overlay=document.createElement('div');
    overlay.id='stableLoginOverlay';
    overlay.innerHTML='<div class="stable-login-box"><div class="stable-login-spinner"></div><div class="stable-login-title">로그인중...</div><div class="stable-login-sub">잠시만 기다려주세요.</div></div>';
    document.body.appendChild(overlay);
    btn.addEventListener('click',function(){
      overlay.style.display='flex';
      btn.disabled=true;
      setTimeout(function(){
        const err=document.getElementById('loginErr');
        if(err && err.textContent.trim()) { overlay.style.display='none'; btn.disabled=false; }
      },5000);
    },true);
  }

  function getId(card){
    if(!card) return null;
    if(card.dataset && card.dataset.id) return Number(card.dataset.id);
    const text=card.getAttribute('onclick')||'';
    const m=text.match(/(?:editDiag|openRecord)\\((\\d+)\\)/);
    return m?Number(m[1]):null;
  }

  function escapeHtml(s){return String(s??'').replace(/[&<>\\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\"':'&quot;',"'":'&#39;'}[c]));}
  function parseComments(v){
    if(!v) return [];
    try { const a=JSON.parse(v); return Array.isArray(a)?a.filter(x=>x&&x.comment):[]; }
    catch(e){ return v?[{admin_name:'선생님',comment:String(v)}]:[]; }
  }
  function openDetail(id,record){
    let modal=document.getElementById('stableRecordModal');
    if(!modal){
      modal=document.createElement('div');
      modal.id='stableRecordModal';
      modal.style='position:fixed;inset:0;background:#18212b99;display:none;align-items:center;justify-content:center;padding:14px;z-index:999998';
      document.body.appendChild(modal);
      modal.addEventListener('click',e=>{if(e.target===modal)modal.style.display='none'});
    }
    modal.dataset.recordId=String(id);
    const comments=parseComments(record.teacher_note);
    const commentHtml=comments.length?comments.map(c=>'<div style="border:1px solid #dce2e8;border-radius:10px;padding:12px;margin-top:8px;background:#fff"><b>'+escapeHtml(c.admin_name||'선생님')+'</b><div style="white-space:pre-wrap;line-height:1.6;margin-top:5px">'+escapeHtml(c.comment)+'</div></div>').join(''):'<div style="color:#7d8791">아직 등록된 선생님 코멘트가 없습니다.</div>';
    modal.innerHTML='<div style="width:min(920px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;padding:18px;box-shadow:0 20px 70px #0004"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px"><div><h2 style="margin:0">'+escapeHtml(record.date||'')+' 기록</h2><div style="color:#7d8791;font-size:13px;margin-top:4px">'+escapeHtml(record.subject||'소재 미입력')+' · '+Number(record.total||0)+'/25</div></div><button class="btn" id="stableClose">닫기</button></div>'+(record.photo?'<img src="'+escapeHtml(record.photo)+'" style="width:100%;max-height:48vh;object-fit:contain;background:#f3f5f7;border-radius:12px">':'')+'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px"><div style="border:1px solid #e1e6eb;border-radius:12px;padding:13px"><b>느낀 점</b><div style="white-space:pre-wrap;line-height:1.6;margin-top:7px">'+escapeHtml(record.notes||'기록 없음')+'</div></div><div style="border:1px solid #e1e6eb;border-radius:12px;padding:13px"><b>앞으로 개선할 점</b><div style="white-space:pre-wrap;line-height:1.6;margin-top:7px">'+escapeHtml(record.improve||'기록 없음')+'</div></div></div><div style="margin-top:16px"><h3 style="margin-bottom:8px">선생님들의 코멘트</h3>'+commentHtml+'</div><div id="studentRecordActions" style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"></div></div>';
    modal.style.display='flex';
    document.getElementById('stableClose').onclick=()=>modal.style.display='none';
  }

  async function handleRecordClick(e){
    const card=e.target.closest('#diagList .record,#recentDiag .record');
    if(!card) return;
    if(e.target.closest('.record-actions')) return;
    const id=getId(card);
    if(!id) return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    try{
      const res=await fetch('/api/diagnoses',{credentials:'same-origin',cache:'no-store'});
      const data=await res.json();
      const rows=Array.isArray(data)?data:(data.diagnoses||[]);
      const record=rows.find(x=>Number(x.id)===id);
      if(!record) throw Error('해당 기록을 불러오지 못했습니다.');
      openDetail(id,record);
    }catch(err){alert(err.message||'상세 기록을 불러오지 못했습니다.');}
  }

  function installDetail(){
    if(document.documentElement.dataset.stableDetail==='1') return;
    document.documentElement.dataset.stableDetail='1';
    document.addEventListener('click',handleRecordClick,true);
  }

  function boot(){installLogin();installDetail();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  setTimeout(boot,100);
})();</script>`;

fs.readFileSync=function(file,options){
  let content=originalReadFileSync.call(this,file,options);
  if(typeof file==='string'&&typeof content==='string'&&file.endsWith('/public/index.html')) content=content.replace('</body>',script+'</body>');
  return content;
};
