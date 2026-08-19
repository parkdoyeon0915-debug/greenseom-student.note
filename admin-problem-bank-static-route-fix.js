const fs=require('fs');
const path=require('path');

// 문제은행 관리자 페이지의 실제 URL을 서버에 직접 등록합니다.
// Express prototype을 가로채지 않고, start.js에서 불러온 app에 설치될 수 있도록
// middleware 형태로 내보냅니다.
function install(app){
  if(!app || app.__greensumProblemBankRouteInstalled)return;
  app.__greensumProblemBankRouteInstalled=true;

  app.get('/admin-problem-bank.html',(req,res)=>{
    if(!req.session?.user || req.session.user.role!=='admin')return res.redirect('/');
    const file=path.join(__dirname,'admin-problem-bank.html');
    if(!fs.existsSync(file))return res.status(404).send('문제은행 관리자 페이지 파일을 찾을 수 없습니다.');
    res.sendFile(file);
  });

  console.log('GREENSUM admin problem bank direct route loaded');
}

module.exports={install};
