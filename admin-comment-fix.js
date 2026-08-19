// 관리자 코멘트는 관리자별로 누적 저장합니다.
// server.js의 기존 레거시 모달이 admin.html의 새 UI를 덮어쓰는 문제를
// DOMContentLoaded 이후 다시 한 번 새 코멘트 UI로 복원합니다.
(function(){
  function boot(){
    if(!window.fetch) return;

    const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const parseComments=value=>{
      if(!value) return [];
      try{
        const parsed=JSON.parse(value);
        if(Array.isArray(parsed)) return parsed.filter(c=>c&&String(c.comment||'').trim());
        if(parsed&&typeof parsed==='object'&&String(parsed.comment||'').trim()) return [parsed];
      }catch(e){
        if(String(value).trim()) return [{id:'legacy',admin_id:'legacy',admin_name:'선생님',comment:String(value),created_at:null}];
      }
      return [];
    };
    const teacherLabel=c=>{
      const u=window.__greensumAdminUser||{};
      const id=String(c?.admin_id||c?.admin_username||'').toLowerCase();
      if(id==='doyean7') return '도연T';
      if(String(u.username||'').toLowerCase()===id && u.name) return /T$/.test(u.name)?u.name:u.name+'T';
      let n=String(c?.admin_name||'선생님').trim();
      if(!n||n==='관리자'||n==='선생님') return '선생님';
      return /T$/.test(n)?n:n+'T';
    };
    const entry=c=>`<div class="admin-comment-entry"><div class="admin-comment-author">${esc(teacherLabel(c))}</div><div class="admin-comment-text">${esc(c.comment)}</div>${c.created_at?`<div class="admin-comment-date">${esc(new Date(c.created_at).toLocaleString('ko-KR'))}</div>`:''}</div>`;
    const render=(id,value)=>{
      const comments=parseComments(value);
      const u=window.__greensumAdminUser||{};
      const me=teacherLabel({admin_id:u.username||u.id,admin_name:u.name});
      return `<div class="detail-box" style="margin-top:14px" id="teacherCommentsBox"><h4>선생님들의 코멘트 <small style="font-weight:normal;color:#7d8791">관리자 전용</small></h4><div id="teacherCommentsList">${comments.length?comments.map(entry).join(''):'<div class="admin-comment-empty">아직 등록된 선생님 코멘트가 없습니다.</div>'}</div><div class="admin-comment-new"><div class="admin-comment-author">새 코멘트 · ${esc(me)}</div><textarea id="newTeacherComment" class="admin-comment-input" placeholder="이 학생에게 남길 코멘트를 입력해주세요."></textarea><div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn primary" id="saveTeacherCommentBtn">새 코멘트 등록</button></div><div id="teacherCommentStatus" class="admin-comment-status"></div></div></div>`;
    };

    window.openRecord=async function(kind,id){
      try{
        const r=await (await fetch('/api/admin/diagnoses/'+encodeURIComponent(id))).json();
        if(r.error) return alert(r.error);
        window.__greensumCurrentDiagnosisId=Number(id);
        const modal=document.getElementById('recordModal');
        const title=document.getElementById('recordModalTitle');
        const body=document.getElementById('recordModalBody');
        if(!modal||!title||!body) return;
        title.textContent=r.student.name+' · 그림 자가진단';
        body.innerHTML=`${r.photo?`<img class="detail-photo" src="${esc(r.photo)}" alt="학생 그림" id="detailPhoto">`:''}<div class="detail-grid" style="margin-top:15px"><div class="detail-box"><h4>기본 정보</h4><div>날짜 · ${esc(r.date||'-')}</div><div>소재 · ${esc(r.subject||'-')}</div><div>총점 · <b>${Number(r.total)||0} / 25</b></div></div><div class="detail-box"><h4>학생 기록</h4><div style="white-space:pre-wrap">${esc(r.notes||'기록 없음')}</div><hr><h4>앞으로 개선할 점</h4><div style="white-space:pre-wrap">${esc(r.improve||'기록 없음')}</div></div></div>${render(r.id,r.teacher_note)}`;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden','false');
        document.getElementById('detailPhoto')?.addEventListener('click',()=>window.open(r.photo,'_blank'));
        document.getElementById('saveTeacherCommentBtn')?.addEventListener('click',()=>saveComment(r.id));
      }catch(e){alert('기록 상세를 불러오지 못했습니다.\n'+e.message)}
    };

    async function saveComment(id){
      const input=document.getElementById('newTeacherComment');
      const status=document.getElementById('teacherCommentStatus');
      const btn=document.getElementById('saveTeacherCommentBtn');
      const text=(input?.value||'').trim();
      if(!text) return alert('코멘트를 입력해주세요.');
      btn.disabled=true;
      if(status) status.textContent='저장 중...';
      try{
        const latest=await (await fetch('/api/admin/diagnoses/'+encodeURIComponent(id))).json();
        if(latest.error) throw new Error(latest.error);
        const comments=parseComments(latest.teacher_note);
        const u=window.__greensumAdminUser||{};
        comments.push({id:'comment-'+Date.now(),admin_id:u.id||'',admin_username:u.username||'',admin_name:u.name||'관리자',comment:text,created_at:new Date().toISOString()});
        const put=await fetch('/api/admin/diagnoses/'+encodeURIComponent(id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({teacher_note:JSON.stringify(comments)})});
        const saved=await put.json();
        if(!put.ok) throw new Error(saved.error||'저장에 실패했습니다.');
        const box=document.getElementById('teacherCommentsBox');
        if(box) box.outerHTML=render(id,saved.teacher_note);
        document.getElementById('saveTeacherCommentBtn')?.addEventListener('click',()=>saveComment(id));
      }catch(e){
        if(status){status.className='admin-comment-status admin-comment-error';status.textContent='저장에 실패했습니다: '+e.message}
        btn.disabled=false;
      }
    }

    window.show=async function(id){
      try{
        const x=await (await fetch('/api/admin/students/'+encodeURIComponent(id))).json();
        if(x.error) return alert(x.error);
        document.querySelector('#title').textContent=x.student.name+' 학생의 기록';
        const d=(x.diagnoses||[]).map(r=>`<div class="item" style="cursor:pointer" onclick="openRecord('diagnosis',${Number(r.id)})"><div class="thumb">${r.photo?`<img src="${esc(r.photo)}">`:'사진 없음'}</div><b>${esc(r.date)}</b><p>${esc(r.subject||'')} · <strong>${Number(r.total)||0}/25</strong></p><small>${esc(r.notes||'')}</small><br><small>개선: ${esc(r.improve||'-')}</small></div>`).join('');
        const p=(x.patterns||[]).map(r=>`<div class="item"><div class="thumb">${r.photo?`<img src="${esc(r.photo)}">`:'사진 없음'}</div><b>${esc(r.name)}</b><p>적용 그림 ${(r.images||[]).length}장</p><small>${esc(r.must_keep||'')}</small></div>`).join('');
        document.querySelector('#detail').innerHTML='<h3>🎨 그림 자가진단</h3><div class="grid">'+(d||'기록 없음')+'</div><h3>🧵 패턴 연구노트</h3><div class="grid">'+(p||'기록 없음')+'</div>';
      }catch(e){alert('학생 기록을 불러오지 못했습니다.\n'+e.message)}
    };
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else setTimeout(boot,0);
})();
