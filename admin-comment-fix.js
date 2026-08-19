const express=require('express');
const originalSend=express.response.send;

// 서버에서 admin.html에 덧붙이는 구버전 관리자 코멘트 제목을 새 명칭으로 통일합니다.
express.response.send=function(body){
  if(typeof body==='string'&&this.req&&this.req.path==='/admin.html'){
    body=body.replaceAll('도연&인혜T의 한마디','선생님들의 코멘트');
  }
  return originalSend.call(this,body);
};
