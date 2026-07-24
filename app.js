/* ============================================================
   ORBIS — app.js
   ★ 배포 전 CONFIG를 확인하세요. 이 파일 하나만 수정하면
     모든 페이지에 동시에 반영됩니다.
   ============================================================ */
window.ORBIS = {
  TEL: "010-7379-5265",
  /* ★ 공식 도메인 이메일 개설 후 교체 (폼 서버 미연결 시 이 주소로 메일 fallback) */
  CONTACT_EMAIL: "spaceblank0100@gmail.com",
  /* ★ 카카오톡 채널 URL (예: "http://pf.kakao.com/_xxxxx") — 입력 시 버튼 자동 연결 */
  KAKAO_CHANNEL: "",
  /* 폼 접수 엔드포인트. 기본값은 함께 포함된 Cloudflare Pages Function(/api/lead).
     Formspree 등 외부 서비스 사용 시 해당 URL로 교체 (예: "https://formspree.io/f/xxxx") */
  LEAD_ENDPOINT: "/api/lead",
  /* GA4 측정 ID (예: "G-XXXXXXXXXX") — 입력 시 자동 로드 */
  GA_ID: ""
};

/* ---------- analytics ---------- */
window.dataLayer = window.dataLayer || [];
function track(ev, params){
  try{
    window.dataLayer.push(Object.assign({event:ev, page:location.pathname}, params||{}));
    if(window.gtag) gtag('event', ev, params||{});
  }catch(e){}
}
(function(){
  var id = ORBIS.GA_ID;
  if(!id) return;
  var s=document.createElement('script'); s.async=true;
  s.src='https://www.googletagmanager.com/gtag/js?id='+id;
  document.head.appendChild(s);
  window.gtag=function(){dataLayer.push(arguments);};
  gtag('js', new Date()); gtag('config', id);
})();

/* ---------- nav ---------- */
(function(){
  var nav=document.getElementById('nav'), top=document.getElementById('toTop');
  function onScroll(){var y=window.scrollY; if(nav)nav.classList.toggle('scrolled',y>28); if(top)top.classList.toggle('show',y>640);}
  window.addEventListener('scroll',onScroll,{passive:true}); onScroll();
  if(top) top.onclick=function(){window.scrollTo({top:0,behavior:'smooth'});};
  var d=document.getElementById('drawer'), open=document.getElementById('hamb'), close=document.getElementById('drawerClose');
  if(d){
    if(open) open.onclick=function(){d.classList.add('open');document.body.style.overflow='hidden';};
    function c(){d.classList.remove('open');document.body.style.overflow='';}
    if(close) close.onclick=c;
    d.querySelectorAll('a').forEach(function(a){a.addEventListener('click',c);});
  }
})();

/* ---------- reveal ---------- */
(function(){
  var els=document.querySelectorAll('.reveal'); if(!els.length) return;
  if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in');});return;}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.1});
  els.forEach(function(el){io.observe(el);});
})();

/* ---------- click tracking (data-track) ---------- */
document.addEventListener('click',function(e){
  var t=e.target.closest('[data-track]'); if(!t) return;
  track(t.getAttribute('data-track'),{label:t.getAttribute('data-label')||t.textContent.trim().slice(0,40)});
});

/* ---------- toast ---------- */
function toast(msg){var t=document.getElementById('toast'); if(!t) return; t.innerHTML=msg; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(function(){t.classList.remove('show');},4600);}

/* ---------- kakao ---------- */
function kakao(){
  track('click_kakao');
  if(ORBIS.KAKAO_CHANNEL){window.open(ORBIS.KAKAO_CHANNEL,'_blank');}
  else{toast('카카오톡 채널 연결 준비 중입니다. 전화(<b>'+ORBIS.TEL+'</b>) 또는 상담 폼을 이용해 주세요.');}
}

/* ---------- lead forms ----------
   <form class="lead" data-type="건물주" data-subject="건물주 1차 진단">
   서버(LEAD_ENDPOINT) 접수 → 실패 시 메일 작성 fallback           */
(function(){
  document.querySelectorAll('form.lead').forEach(function(f){
    var started=false;
    f.addEventListener('input',function(){ if(!started){started=true; track('form_start',{form:f.getAttribute('data-type')||'general'});} },{once:false});
    f.addEventListener('submit',function(e){
      e.preventDefault();
      if(f.querySelector('.hp input') && f.querySelector('.hp input').value){ return; } /* honeypot */
      var data={}; new FormData(f).forEach(function(v,k){ if(v===''||k==='website')return; data[k]= data[k]? data[k]+', '+v : v; });
      data['문의유형']=f.getAttribute('data-type')||data['문의유형']||'일반';
      data['접수페이지']=location.pathname+location.search;
      var btn=f.querySelector('button[type=submit]'); var orig=btn?btn.textContent:'';
      if(btn){btn.disabled=true;btn.textContent='접수 중…';}
      fetch(ORBIS.LEAD_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
        .then(function(r){ if(!r.ok) throw new Error('server'); return r.json(); })
        .then(function(){
          track('form_submit',{form:data['문의유형']});
          var ok=f.parentElement.querySelector('.form-ok');
          if(ok){ ok.classList.add('show'); f.style.display='none'; }
          else toast('상담 신청이 접수되었습니다. 영업시간 내 순차적으로 연락드립니다.');
        })
        .catch(function(){
          /* 서버 미연결 시: 메일 작성 fallback */
          var label=f.getAttribute('data-subject')||data['문의유형']||'문의';
          var lines=['['+label+']']; for(var k in data){ lines.push(k+': '+data[k]); }
          location.href='mailto:'+ORBIS.CONTACT_EMAIL+'?subject='+encodeURIComponent('[오르비스] '+label)+'&body='+encodeURIComponent(lines.join('\n'));
          toast('접수 서버가 아직 연결되지 않아 <b>메일 앱</b>으로 전환합니다. 전송을 완료해 주세요.');
          track('form_submit_fallback',{form:data['문의유형']});
        })
        .finally(function(){ if(btn){btn.disabled=false;btn.textContent=orig;} });
    });
  });
  /* newsletter */
  document.querySelectorAll('form.news').forEach(function(f){
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var email=f.querySelector('input[type=email]').value;
      fetch(ORBIS.LEAD_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({'문의유형':'뉴스레터 구독','이메일':email,'접수페이지':location.pathname})})
        .then(function(r){ if(!r.ok) throw 0; toast('구독 신청이 접수되었습니다. 감사합니다.'); track('newsletter_signup'); f.reset(); })
        .catch(function(){
          location.href='mailto:'+ORBIS.CONTACT_EMAIL+'?subject='+encodeURIComponent('[오르비스] 뉴스레터 구독')+'&body='+encodeURIComponent('구독 이메일: '+email);
          toast('메일 앱에서 전송을 완료해 주세요.');
        });
    });
  });
})();

/* ---------- generic tab switcher: [data-tabs] / [data-panel] ---------- */
function initTabs(rootSel, onChange){
  var root=document.querySelector(rootSel); if(!root) return;
  var tabs=root.querySelectorAll('[data-tab]');
  tabs.forEach(function(t){
    t.addEventListener('click',function(){
      tabs.forEach(function(k){k.classList.remove('active');});
      t.classList.add('active');
      var key=t.getAttribute('data-tab');
      document.querySelectorAll(rootSel+' ~ * [data-panel], [data-panel]').forEach(function(p){
        if(p.closest(rootSel))return;
        p.classList.toggle('show', p.getAttribute('data-panel')===key);
      });
      if(onChange) onChange(key);
    });
  });
}

/* ---------- 1차 시나리오 진단 (owners) ----------
   확정 수치 없이, 입력 조합에 따라 우선 검토 시나리오 카드를 제시 */
var WIZ = {
  step:1, ans:{},
  lib:{
    lease:{t:'임대 재구성 · 테넌트 매칭',d:'현재 임대조건과 수요를 다시 검토하고, 층별·업종별 임차인 구성을 조정하는 방향입니다.',c:['현재 임대료·조건이 시장 사례와 맞는지','층·전면·설비가 어떤 업종에 적합한지','기존 임차인 계약·갱신 일정']},
    opmodel:{t:'공간 운영모델 검토 (공실개발)',d:'일반 임대가 어려운 공간을 공간대여·무인서비스 등 운영형 모델로 전환할 수 있는지 검토합니다.',c:['배후 수요와 경쟁 공간','전력·급배수·소음 등 물리 조건','초기 투자비와 운영 난이도']},
    exit:{t:'매각 준비 · 데이터룸 정리',d:'매각을 검토한다면 가격 협상보다 임대·계약·시설 자료를 먼저 정리해 협상력을 확보하는 단계입니다.',c:['임대차·수익 관련 자료의 정리 상태','매각 전 해소할 리스크','목표 가격대와 일정의 현실성']},
    md:{t:'MD · 업종 구성 재설계',d:'건물 전체의 집객과 임대수익 관점에서 업종 조합과 우선 유치 테넌트를 다시 설계합니다.',c:['타깃 고객과 방문 목적','현재 업종 간 시너지·충돌','우선 교체·유치 대상 층']},
    pmfm:{t:'PM·FM 위탁 관리',d:'임대 운영과 시설 관리를 전문 파트너에게 위탁해 관리 부담과 운영 리스크를 줄이는 방향입니다.',c:['현재 관리 방식과 비용','시설 상태와 법정점검 이행 여부','필요한 관리 범위(임대/시설/보안 등)']},
    remodel:{t:'리모델링 · 용도 검토',d:'물리적 개선이나 용도 변경으로 자산의 활용도를 높일 수 있는지 최유효이용 관점에서 검토합니다.',c:['용도지역·인허가 제약','공사 가능 여부와 예산 범위','공사 기간 중 임대 공백 대응']}
  },
  pick:function(){
    var a=this.ans, out=[];
    if(a.goal==='sell'){ out=['exit','lease']; if(a.state==='vac_all'||a.state==='vac_part') out=['exit','opmodel']; }
    else if(a.goal==='operate'){ out=['opmodel','remodel']; }
    else if(a.goal==='manage'){ out=['pmfm','lease']; }
    else if(a.goal==='lease'){ out=(a.state==='vac_all')?['opmodel','lease']:['lease','md']; }
    else { /* 미정 */ out=(a.state==='sell_consider')?['exit','lease']:(a.state==='vac_all'?['opmodel','exit']:['lease','md']); }
    if(a.invest==='no' ){ out=out.filter(function(k){return k!=='remodel';}); if(out.indexOf('opmodel')>0 && a.state!=='vac_all') out=out.filter(function(k){return k!=='opmodel';}); }
    if(a.involve==='hands_off' && out.indexOf('pmfm')<0) out.push('pmfm');
    if(out.length<2) out.push('lease');
    return out.slice(0,3);
  },
  go:function(n){
    this.step=n;
    document.querySelectorAll('.wiz .q').forEach(function(q){q.classList.toggle('show', +q.getAttribute('data-q')===n);});
    var lab=document.getElementById('wizStep'); if(lab) lab.textContent='STEP '+Math.min(n,3)+' / 3';
    document.getElementById('wizPrev').style.visibility = n>1? 'visible':'hidden';
    document.getElementById('wizNext').textContent = n===3 ? '진단 결과 보기' : '다음';
    document.getElementById('wizResult').classList.remove('show');
    document.getElementById('wizForm').style.display='';
  },
  next:function(){
    var q=document.querySelector('.wiz .q[data-q="'+this.step+'"]');
    var need=q.querySelectorAll('input[required]').length>0;
    var chosen={}; q.querySelectorAll('input:checked').forEach(function(i){chosen[i.name]=i.value;});
    var groups={}; q.querySelectorAll('input').forEach(function(i){groups[i.name]=1;});
    for(var g in groups){ if(!chosen[g]){ toast('항목을 선택해 주세요.'); return; } }
    for(var k in chosen){ this.ans[k]=chosen[k]; }
    if(this.step<3){ this.go(this.step+1); track('form_step',{form:'diagnosis',step:this.step}); return; }
    /* 결과 */
    var keys=this.pick(), lib=this.lib, grid=document.getElementById('wizScn'); grid.innerHTML='';
    keys.forEach(function(k,i){
      var s=lib[k];
      var el=document.createElement('div'); el.className='scn';
      el.innerHTML='<div class="sn">SCENARIO '+String(i+1).padStart(2,'0')+'</div><h4>'+s.t+'</h4><p>'+s.d+'</p><ul>'+s.c.map(function(c){return '<li>'+c+'</li>';}).join('')+'</ul>';
      grid.appendChild(el);
    });
    var names=keys.map(function(k){return lib[k].t;}).join(' / ');
    var pre=document.querySelector('#ownerForm textarea[name="추가 내용"]');
    if(pre && !pre.value) pre.value='[1차 시나리오 진단 결과] '+names;
    document.getElementById('wizForm').style.display='none';
    document.getElementById('wizResult').classList.add('show');
    track('form_submit',{form:'diagnosis'});
  },
  prev:function(){ if(this.step>1) this.go(this.step-1); },
  restart:function(){ this.ans={}; document.querySelectorAll('.wiz input').forEach(function(i){i.checked=false;}); this.go(1); }
};
