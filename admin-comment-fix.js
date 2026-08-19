const fs = require('fs');
const path = require('path');
const originalReadFileSync = fs.readFileSync.bind(fs);

fs.readFileSync = function(filePath, ...args) {
  let html = originalReadFileSync(filePath, ...args);
  if (String(filePath).endsWith(path.join('public', 'admin.html')) && typeof html === 'string') {
    const patch = `<script>
(function(){
  function install(){
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    async function getMe(){ try { return (await fetch('/api/me')).user || {}; } catch(e) { return {}; } }
    function parse(v){
      if(!v) return [];
      try { const a=JSON.parse(v); return Array.isArray(a) ? a.filter(x=>x && String(x.comment||'').trim()) : []; }
      catch(e){ return [{admin_name:'선생님',comment:String(v),created_at:null}]; }
    }
    function label(c,me){
      const id=String(c.admin_username||c.admin_id||'').toLowerCase();
      if(id==='doyean7') return '도연T';
      let n=String(c.admin_name||'선생님').trim();
      if(me.username && id===String(me.username).toLowerCase() && me.name) n=me.name;
      return /T$/.test(n) ? n : n+'T';
    }
    async function openNew(kind,id){
      const r=await (await fetch('/api/admin/diagnoses/'+encodeURIComponent(id))).json();
      if(r.error) return alert(r.error);
      const me=await getMe();
      const comments=parse(r.teacher_note);
      const entries=comments.length ? comments.map(c=>'<div style="border:1px solid #e1e6eb;border-radius:10px;padding:12px;margin-top:8px"><b>'+esc(label(c,me))+'</b><div style="white-space:pre-wrap;margin-top:6px">'+esc(c.comment)+'</div>'+(c.created_at?'<small style="color:#7d8791">'+esc(new Date(c.created_at).toLocaleString('ko-KR'))+'</small>':'')+'</div>').join('') : '<div style="color:#7d8791">아직 등록된 선생님 코멘트가 없습니다.</div>';
      const body=document.getElementById('recordModalBody');
      const title=document.getElementById('recordModalTitle');
      const modal=document.getElementById('recordModal');
      if(!body||!title||!modal) return;
      title.textContent=r.student.name+' · 그림 자가진단';
      body.innerHTML=(r.photo?'<img class="detail-photo" src="'+esc(r.photo)+'" alt="학생 그림">':'')+'<div class="detail-grid" style="margin-top:15px"><div class="detail-box"><h4>기본 정보</h4><div>날짜 · '+esc(r.date||'-')+'</div><div>소재 · '+esc(r.subject||'-')+'</div><div>총점 · <b>'+Number(r.total||0)+' / 25</b></div></div><div class="detail-box"><h4>학생 기록</h4><div style="white-space:pre-wrap">'+esc(r.notes||'기록 없음')+'</div><hr><h4>앞으로 개선할 점</h4><div style="white-space:pre-wrap">'+esc(r.improve||'기록 없음')+'</div></div></div><div class="detail-box" style="margin-top:14px"><h4>선생님들의 코멘트 <small style="font-weight:normal;color:#7d8791">· 관리자 전용</small></h4><div id="teacherCommentsList">'+entries+'</div><div style="margin-top:14px;padding-top:14px;border-top:1px solid #e1e6eb"><b>새 코멘트 · '+esc(me.name ? (/T$/.test(me.name)?me.name:me.name+'T') : '선생님')+'</b><textarea id="newTeacherComment" class="admin-note" placeholder="이 학생에게 남길 코멘트를 입력해주세요."></textarea><div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn primary" id="saveTeacherCommentBtn">새 코멘트 등록</button></div></div></div>';
      modal.classList.add('open');
      document.getElementById('saveTeacherCommentBtn').onclick=async function(){
        const text=document.getElementById('newTeacherComment').value.trim();
        if(!text) return alert('코멘트를 입력해주세요.');
        const latest=await (await fetch('/api/admin/diagnoses/'+encodeURIComponent(id))).json();
        const arr=parse(latest.teacher_note);
        arr.push({id:'comment-'+Date.now(),admin_id:me.id||'',admin_username:me.username||'',admin_name:me.name||'관리자',comment:text,created_at:new Date().toISOString()});
        const q=await fetch('/api/admin/diagnoses/'+encodeURIComponent(id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({teacher_note:JSON.stringify(arr)})});
        const j=await q.json();
        if(!q.ok) return alert(j.error||'저장에 실패했습니다.');
        openNew(kind,id);
      };
    }
    window.openRecord=openNew;
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});
  else setTimeout(install,0);
})();
</script>`;
    html = html.replace('</body>', patch + '</body>');
  }
  return html;
};
