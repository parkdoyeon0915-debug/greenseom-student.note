const express=require('express');
const originalSend=express.response.send;
const style=`<style id="admin-problem-bank-binding-style">
#students .student{position:relative;flex-wrap:wrap}
#students .student>div:last-child{position:relative;z-index:10002;display:flex!important;gap:8px;flex-wrap:wrap;align-items:center}
#students .student .pb-progress-btn{display:inline-flex!important;position:relative;z-index:10003;pointer-events:auto!important;cursor:pointer!important;touch-action:manipulation!important;text-decoration:none;color:inherit}
</style>`;
const script=`<script id="admin-problem-bank-binding-fix-v7">(function(){
function getId(row){const direct=Number(row.dataset.studentId||0);if(direct)return direct;const el=row.querySelector('[onclick*="show("]');const m=el&&String(el.getAttribute('onclick')||'').match(/show\\(\\s*(\\d+)\\s*\\)/);return m?Number(m[1]):0;}
function addButtons(){document.querySelectorAll('#students .student').forEach(row=>{const id=getId(row);if(!id)return;let btn=row.querySelector('.pb-progress-btn');if(!btn){const actions=row.lastElementChild;if(!actions)return;btn=document.createElement('a');btn.className='btn pb-progress-btn';btn.textContent='문제은행';btn.href='/problem-bank.html?id='+encodeURIComponent(id);btn.dataset.studentId=String(id);actions.appendChild(btn);}else{btn.dataset.studentId=String(id);btn.href='/problem-bank.html?id='+encodeURIComponent(id);btn.textContent='문제은행';}});}
function boot(){addButtons();const root=document.getElementById('students');if(root&&!root.dataset.pbV7Observer){root.dataset.pbV7Observer='1';new MutationObserver(()=>setTimeout(addButtons,0)).observe(root,{childList:true,subtree:true});}setTimeout(addButtons,50);setTimeout(addButtons,300);setTimeout(addButtons,1000);setTimeout(addButtons,2000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();</script>`;
express.response.send=function(body){if(typeof body==='string'&&this.req&&this.req.path==='/admin.html'&&body.includes('</body>'))body=body.replace('</head>',style+'</head>').replace('</body>',script+'</body>');return originalSend.call(this,body);};
console.log('GREENSUM admin problem bank direct student URL v7 loaded');
