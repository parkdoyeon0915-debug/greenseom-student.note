const express=require('express');
const originalStatic=express.static;
if(!originalStatic.__greensumProblemBankAdminIdSelector){
  const wrappedStatic=function(root,options){
    const middleware=originalStatic(root,options);
    return function(req,res,next){
      if(req.path==='/problem-bank.html'&&req.session&&req.session.user&&req.session.user.role==='admin'){
        const id=Number(new URLSearchParams((req.url||'').split('?')[1]||'').get('id')||0);
        if(!Number.isInteger(id)||id<=0){
          res.type('html').set('Cache-Control','no-store').send(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>학생 문제은행 선택</title><style>body{margin:0;background:#f5f7fa;color:#26313b;font-family:-apple-system,BlinkMacSystemFont,"Malgun Gothic","Noto Sans KR",sans-serif}.box{max-width:520px;margin:12vh auto;background:#fff;border:1px solid #dce2e8;border-radius:18px;padding:28px;box-shadow:0 10px 30px #0001}h1{margin-top:0}.muted{color:#7d8791}.row{display:flex;gap:10px;margin-top:18px}input{flex:1;padding:12px;border:1px solid #d6dde5;border-radius:10px;font:inherit}button{padding:12px 16px;border:0;border-radius:10px;background:#283a4d;color:#fff;font-weight:800;cursor:pointer}</style></head><body><main class="box"><h1>📚 학생 문제은행</h1><p class="muted">학생 ID를 입력하면 해당 학생의 개별 문제은행 주소로 이동합니다.</p><div class="row"><input id="id" type="number" min="1" placeholder="학생 ID"><button id="go">문제은행 열기</button></div></main><script>function go(){const id=Number(document.getElementById('id').value||0);if(!Number.isInteger(id)||id<=0){alert('올바른 학생 ID를 입력해주세요.');return}location.href='/problem-bank.html?id='+encodeURIComponent(id)}document.getElementById('go').onclick=go;document.getElementById('id').addEventListener('keydown',e=>{if(e.key==='Enter')go()});</script></body></html>`);
          return;
        }
      }
      return middleware(req,res,next);
    };
  };
  wrappedStatic.__greensumProblemBankAdminIdSelector=true;
  express.static=wrappedStatic;
}
console.log('GREENSUM problem bank admin ID selector loaded');
