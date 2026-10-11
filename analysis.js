/* ============================================================
   ORBIS — analysis.js (상권분석 시작하기 · 2026.10)

   화면 흐름
     주소 검색 → 위치 확정 → 반경 점포(소진공) · 주요상권 · 서울 상권 지표
     · 부동산원 임대동향 · 국토부 실거래를 각각 불러와 섹션별로 그립니다.
   데이터 경로
     /api/analysis/*      Cloudflare Pages Functions (인증키는 서버에만 있음)
     /data/seoul/*.json   서울시 상권분석서비스 분기 데이터 (GitHub Actions가 갱신)
     /data/rone/latest.json 한국부동산원 임대동향 (GitHub Actions가 갱신)
   어떤 데이터가 아직 연결되지 않았어도 나머지는 그대로 동작하도록 만들었습니다.
   ============================================================ */
(function () {
  'use strict';
  var form = document.getElementById('azForm');
  if (!form) return;

  /* ───────────── 공통 도우미 ───────────── */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nf(v, d) { if (v == null || !isFinite(v)) return '-'; return Number(v).toLocaleString('ko-KR', { maximumFractionDigits: d || 0 }); }
  function pct(a, b) { return b ? a / b * 100 : null; }
  function pf(v, d) { return v == null || !isFinite(v) ? '-' : nf(v, d == null ? 1 : d) + '%'; }
  function won(man) {
    if (man == null || !isFinite(man)) return '-';
    var v = Math.round(man), eok = Math.floor(v / 10000), rest = v % 10000;
    if (eok && rest) return nf(eok) + '억 ' + nf(rest) + '만 원';
    if (eok) return nf(eok) + '억 원';
    return nf(rest) + '만 원';
  }
  function mlabel(d) {
    if (d == null || !isFinite(d)) return '-';
    if (d >= 1000) return (d / 1000).toFixed(1) + 'km';
    if (d < 100) return Math.max(5, Math.round(d / 5) * 5) + 'm';
    return Math.round(d / 10) * 10 + 'm';
  }
  function rlabel(r) { return r >= 1000 ? (r / 1000) + 'km' : r + 'm'; }
  function tops(p) {
    if (p == null || !isFinite(p)) return null;
    return p >= 50 ? '상위 ' + Math.max(1, Math.round(100 - p)) + '%' : '하위 ' + Math.max(1, Math.round(p)) + '%';
  }
  function josa(w, a, b) {
    w = String(w || ''); var c = w.charCodeAt(w.length - 1);
    if (c >= 0xAC00 && c <= 0xD7A3) return w + (((c - 0xAC00) % 28) ? a : b);
    return w + a + '(' + b + ')';
  }
  function qj(w, a, b) { w = String(w || ''); var t = josa(w, a, b); return '‘' + esc(w) + '’' + t.slice(w.length); }
  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ''); }
  function stem(s) { return String(s || '').replace(/(특별자치시|특별자치도|특별시|광역시|자치구)$/, '').replace(/(\d+)?(동|가|읍|면|리|구|시|군)$/, '').replace(/\d+$/, ''); }
  function today() { var d = new Date(); return d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + '.'; }
  function ymLabel(s) { s = String(s || ''); return s.length >= 6 ? s.slice(0, 4) + '년 ' + (+s.slice(4, 6)) + '월' : s; }
  function qShort(q) { q = String(q || ''); return q.length === 5 ? q.slice(2, 4) + '.' + q.slice(4) + 'Q' : q; }
  function debounce(fn, ms) { var t; return function () { var a = arguments, me = this; clearTimeout(t); t = setTimeout(function () { fn.apply(me, a); }, ms); }; }
  function say(msg) { if (typeof window.toast === 'function') window.toast(msg); }
  function tr(ev, p) { if (typeof window.track === 'function') window.track(ev, p || {}); }
  function store(kind) { try { var s = window[kind]; var k = '__az'; s.setItem(k, '1'); s.removeItem(k); return s; } catch (e) { return null; } }
  var LS = store('localStorage'), SS = store('sessionStorage');

  function getJSON(url, ms) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 15000);
    return fetch(url, { signal: ctl ? ctl.signal : undefined, headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then(function (r) {
        var ct = r.headers.get('content-type') || '';
        var body = ct.indexOf('json') >= 0 ? r.json().catch(function () { return null; }) : Promise.resolve(null);
        return body.then(function (j) {
          if (!r.ok) {
            var e = new Error((j && j.message) || ('HTTP ' + r.status));
            e.code = (j && j.code) || (r.status === 404 ? 'NOT_FOUND' : 'HTTP_' + r.status); e.status = r.status; throw e;
          }
          if (j == null) { var e2 = new Error('응답 형식 오류'); e2.code = 'BAD_JSON'; throw e2; }
          return j;
        });
      })
      .catch(function (e) {
        if (e && e.name === 'AbortError') { var t = new Error('응답 지연'); t.code = 'TIMEOUT'; throw t; }
        if (e && !e.code) e.code = 'NETWORK';
        throw e;
      })
      .finally(function () { clearTimeout(timer); });
  }
  var ERR = {
    NO_KEY: '데이터 연결을 마무리하고 있습니다.',
    DENIED: '공공데이터 활용 승인을 기다리고 있습니다.',
    AUTH: '데이터 인증 설정을 확인하고 있습니다.',
    EXPIRED: '데이터 이용 기간을 갱신하고 있습니다.',
    LIMIT: '오늘 조회할 수 있는 횟수를 모두 사용했습니다. 내일 다시 시도해 주세요.',
    UPSTREAM_TIMEOUT: '공공데이터 서버 응답이 늦어지고 있습니다. 잠시 뒤 다시 시도해 주세요.',
    TIMEOUT: '응답이 늦어지고 있습니다. 잠시 뒤 다시 시도해 주세요.',
    NETWORK: '네트워크 연결을 확인해 주세요.',
    NOT_FOUND: '데이터 연결을 준비하고 있습니다.',
    UPSTREAM: '공공데이터 서버에서 응답을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
    IP: '데이터 제공기관의 접속 허용 설정을 확인하고 있습니다.',
    FORBIDDEN: '이 화면에서만 조회할 수 있습니다. 페이지를 새로 고쳐 주세요.'
  };
  function errText(e) { return (e && ERR[e.code]) || '데이터를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.'; }

  var ICON = {
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>'
  };
  function empty(title, text, icon) {
    return '<div class="az-empty"><span class="ic">' + (ICON[icon] || ICON.info) + '</span><div><b>' + title + '</b><p>' + text + '</p></div></div>';
  }
  var CONSULT = '<a href="contact?type=analysis" data-az-consult>상권분석 상담</a>';

  /* ───────────── 상태 ───────────── */
  var S = {
    status: null, kakao: null, geocoder: null, places: null, map: null, ov: [], cluster: null,
    loc: null, r: 500, kw: '', mode: 'open', token: 0,
    stores: null, storesErr: null, agg: null, sel: null, zones: null,
    seoulIdx: undefined, seoulCand: [], seoulT: null, seoulCd: null, seoulU: null,
    rone: undefined, roneSel: null, deals: null, dealsErr: null, dealSame: true,
    p: {}
  };
  var MAXP = { 300: 6, 500: 10, 1000: 15 };
  var RINGS = { 300: [100, 200, 300], 500: [100, 300, 500], 1000: [200, 500, 1000] };

  /* ───────────── 업종 키워드 ───────────── */
  var SYN = {
    '카페': ['카페', '커피'], '커피': ['카페', '커피'], '디저트': ['디저트', '카페', '제과', '빵'], '베이커리': ['빵', '제과', '베이커리'], '빵': ['빵', '제과'], '제과': ['빵', '제과'],
    '편의점': ['편의점'], '슈퍼': ['슈퍼', '마트'], '마트': ['슈퍼', '마트'],
    '치킨': ['치킨'], '피자': ['피자'], '버거': ['버거', '패스트'], '햄버거': ['버거', '패스트'], '분식': ['분식', '김밥'], '김밥': ['김밥', '분식'],
    '한식': ['한식', '백반', '국밥'], '중식': ['중식', '중국'], '일식': ['일식', '초밥', '돈가스'], '양식': ['양식', '파스타', '경양식'],
    '술집': ['주점', '호프', '바'], '호프': ['호프', '주점'], '주점': ['주점', '호프'],
    '세탁': ['세탁', '빨래'], '빨래방': ['빨래', '세탁'], '코인세탁': ['빨래', '세탁'],
    '미용실': ['미용', '헤어'], '미용': ['미용', '헤어'], '헤어': ['미용', '헤어'], '네일': ['네일'], '피부': ['피부'],
    '헬스': ['헬스', '체력', '피트니스', '스포츠클럽'], '피트니스': ['헬스', '체력', '피트니스', '스포츠클럽'], '필라테스': ['필라테스', '요가', '스포츠 강습', '스포츠강습'], '요가': ['요가', '필라테스'],
    '학원': ['학원', '교습'], '교습소': ['교습', '학원'], '약국': ['약국', '의약품'], '병원': ['의원', '병원'], '의원': ['의원'], '치과': ['치과'], '한의원': ['한의원'], '동물병원': ['동물병원', '수의'],
    '부동산': ['부동산'], '안경': ['안경'], '꽃': ['꽃', '화초'], '반려동물': ['애완', '반려', '펫'], '반려': ['애완', '반려', '펫'], '애견': ['애완', '반려', '펫'],
    '노래방': ['노래'], 'pc방': ['pc', '피시', '인터넷'], '스터디카페': ['독서실', '스터디'], '독서실': ['독서실', '스터디'],
    '아이스크림': ['아이스크림', '빙과'], '의류': ['의류', '옷'], '옷': ['의류', '옷'], '화장품': ['화장품'], '문구': ['문구'], '반찬': ['반찬'], '정육': ['정육', '육류'], '과일': ['과일', '청과']
  };
  function kwTerms(kw) {
    var k = norm(kw); if (!k) return [];
    if (SYN[k]) return SYN[k];
    var out = [];
    Object.keys(SYN).forEach(function (s) { if (k.indexOf(s) >= 0) out = out.concat(SYN[s]); });
    if (!out.length) out = [k.replace(/(점|업|전문점)$/, '') || k];
    return out.filter(function (v, i, a) { return a.indexOf(v) === i; });
  }
  var LIFE = [['편의점', ['편의점']], ['카페', ['카페']], ['베이커리', ['빵', '제과']], ['세탁', ['세탁', '빨래']], ['약국', ['약국']], ['미용실', ['미용', '헤어']], ['반찬', ['반찬']], ['정육', ['정육', '육류']],
    ['과일·채소', ['과일', '채소', '청과']], ['꽃집', ['꽃', '화초']], ['안경', ['안경']], ['동물병원', ['동물병원', '수의']], ['헬스·필라테스', ['헬스', '체력', '필라테스', '요가']], ['학원', ['학원', '교습']], ['치과', ['치과']], ['의원', ['의원']]];

  /* ───────────── 연결 상태 ───────────── */
  function loadStatus() {
    if (!S.p.status) S.p.status = getJSON('/api/analysis/status', 8000).then(function (j) { S.status = j; return j; })
      .catch(function () { S.status = { ok: false, ready: {}, offline: true }; return S.status; });
    return S.p.status;
  }
  function ready(k) { return !!(S.status && S.status.ready && S.status.ready[k]); }
  function loadSeoulIdx() {
    if (!S.p.seoul) S.p.seoul = getJSON('/data/seoul/index.json', 20000).then(function (j) { S.seoulIdx = j && j.ready && j.t && j.t.length ? j : null; return S.seoulIdx; })
      .catch(function () { S.seoulIdx = null; return null; });
    return S.p.seoul;
  }
  function loadRone() {
    if (!S.p.rone) S.p.rone = getJSON('/data/rone/latest.json', 20000).then(function (j) { S.rone = j && j.ready && j.types ? j : null; return S.rone; })
      .catch(function () { S.rone = null; return null; });
    return S.p.rone;
  }
  function renderConn() {
    var el = $('#azConn'); if (!el) return;
    var st = S.status || {}, rows = [];
    function c(on, name, txt) { rows.push('<span class="c ' + (on === true ? 'on' : on === 'wait' ? 'wait' : '') + '"><b>' + name + '</b> ' + txt + '</span>'); }
    if (st.offline) {
      c(false, '실시간 데이터', '연결 준비 중');
    } else {
      c(ready('stores') ? true : false, '점포·업종', ready('stores') ? '연결됨' : '준비 중');
      c(S.kakao ? true : (ready('map') && !S.kakaoFail ? 'wait' : false), '지도', S.kakao ? '카카오맵' : (ready('map') && !S.kakaoFail ? '불러오는 중' : '간이 지도'));
      c(ready('realprice') ? true : false, '실거래', ready('realprice') ? '연결됨' : '준비 중');
    }
    if (S.seoulIdx === undefined) c('wait', '서울 상권 지표', '확인 중');
    else c(!!S.seoulIdx, '서울 상권 지표', S.seoulIdx ? esc(S.seoulIdx.qDesc || S.seoulIdx.q) + ' 기준' : '준비 중');
    if (S.rone === undefined) c('wait', '임대동향', '확인 중');
    else c(!!S.rone, '임대동향', S.rone ? esc(S.rone.desc || S.rone.q) + ' 기준' : '준비 중');
    el.innerHTML = rows.join('');
  }

  /* ───────────── 카카오맵 ───────────── */
  function loadKakao(key) {
    return new Promise(function (res, rej) {
      if (window.kakao && window.kakao.maps && window.kakao.maps.services) return res(window.kakao);
      var s = document.createElement('script');
      s.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + encodeURIComponent(key) + '&libraries=services,clusterer&autoload=false';
      s.async = true;
      var to = setTimeout(function () { rej(new Error('timeout')); }, 10000);
      s.onload = function () {
        try { window.kakao.maps.load(function () { clearTimeout(to); res(window.kakao); }); }
        catch (e) { clearTimeout(to); rej(e); }
      };
      s.onerror = function () { clearTimeout(to); rej(new Error('load')); };
      document.head.appendChild(s);
    });
  }
  function kq(fn) {
    return new Promise(function (res) {
      var done = false, t = setTimeout(function () { if (!done) { done = true; res([]); } }, 7000);
      try {
        fn(function (data, status) {
          if (done) return; done = true; clearTimeout(t);
          res(status === window.kakao.maps.services.Status.OK && data ? data : []);
        });
      } catch (e) { if (!done) { done = true; clearTimeout(t); res([]); } }
    });
  }

  /* ───────────── 주소·장소 검색 ───────────── */
  function shortCat(c) { c = String(c || ''); var p = c.split('>'); return (p[p.length - 1] || '장소').trim(); }
  function seoulNameSearch(q) {
    var idx = S.seoulIdx; if (!idx) return [];
    var k = norm(q).replace(/역$/, ''); if (k.length < 2) return [];
    var out = [];
    idx.t.forEach(function (t) {
      var n = norm(t[1]); var i = n.indexOf(k);
      if (i >= 0) out.push({ score: (n === k || n === k + '역' ? 0 : i === 0 ? 1 : 2), it: { name: t[1], addr: '서울 ' + t[3] + ' · ' + t[2], road: '', lon: t[4], lat: t[5], kind: '서울 상권', gu: t[3] } });
    });
    out.sort(function (a, b) { return a.score - b.score; });
    return out.slice(0, 6).map(function (o) { return o.it; });
  }
  function search(q) {
    q = String(q || '').trim();
    if (q.length < 2) return Promise.resolve([]);
    var out = [];
    function push(it) {
      if (!isFinite(it.lon) || !isFinite(it.lat)) return;
      if (out.some(function (o) { return Math.abs(o.lon - it.lon) < 0.0002 && Math.abs(o.lat - it.lat) < 0.0002; })) return;
      out.push(it);
    }
    var chain = Promise.resolve();
    if (S.kakao && S.geocoder) {
      chain = kq(function (cb) { S.geocoder.addressSearch(q, cb, { size: 8 }); }).then(function (a) {
        a.forEach(function (r) {
          var road = r.road_address ? r.road_address.address_name : '';
          push({ name: (r.road_address && r.road_address.building_name) || r.address_name, addr: r.address_name, road: road, lon: +r.x, lat: +r.y, kind: '주소' });
        });
        if (out.length >= 3) return;
        return kq(function (cb) { S.places.keywordSearch(q, cb, { size: 10 }); }).then(function (k) {
          k.forEach(function (p) { push({ name: p.place_name, addr: p.address_name, road: p.road_address_name, lon: +p.x, lat: +p.y, kind: shortCat(p.category_name) }); });
        });
      });
    } else if (ready('geocodeServer')) {
      chain = getJSON('/api/analysis/geocode?q=' + encodeURIComponent(q), 8000).then(function (j) { (j.items || []).forEach(push); }).catch(function () {});
    }
    return chain.then(function () {
      if (out.length) return out.slice(0, 8);
      return loadSeoulIdx().then(function () { seoulNameSearch(q).forEach(push); return out.slice(0, 8); });
    });
  }
  function resolveRegion(loc) {
    if (S.kakao && S.geocoder) {
      return Promise.all([
        kq(function (cb) { S.geocoder.coord2RegionCode(loc.lon, loc.lat, cb); }),
        kq(function (cb) { S.geocoder.coord2Address(loc.lon, loc.lat, cb); })
      ]).then(function (r) {
        var B = r[0].filter(function (x) { return x.region_type === 'B'; })[0], H = r[0].filter(function (x) { return x.region_type === 'H'; })[0];
        if (B) loc.region = { bCode: B.code, sido: B.region_1depth_name, sgg: B.region_2depth_name, dong: B.region_3depth_name, hName: H ? H.region_3depth_name : '' };
        var a = r[1][0];
        if (a) loc.addr = (a.road_address && a.road_address.address_name) || (a.address && a.address.address_name) || loc.addr;
        if (a && a.road_address && a.road_address.road_name) loc.roadName = a.road_address.road_name;
        return loc;
      });
    }
    if (ready('geocodeServer')) {
      return getJSON('/api/analysis/geocode?lon=' + loc.lon + '&lat=' + loc.lat, 8000).then(function (j) {
        if (j && j.ok && j.region) { loc.region = j.region; if (j.address) loc.addr = j.address; }
        return loc;
      }).catch(function () { return loc; });
    }
    return Promise.resolve(loc);
  }

  /* 검색창 자동완성 */
  var sugg = $('#azSugg'), qIn = $('#azQ'), suggItems = [], suggIdx = -1, picked = null;
  function closeSugg() { sugg.hidden = true; qIn.setAttribute('aria-expanded', 'false'); suggIdx = -1; }
  function showSugg(items, q) {
    suggItems = items; suggIdx = -1;
    if (!items.length) { sugg.innerHTML = '<li class="none" role="option" aria-disabled="true">' + (q ? '‘' + esc(q) + '’ 검색 결과가 없습니다. 도로명 주소나 역 이름으로 다시 찾아 주세요.' : '') + '</li>'; }
    else sugg.innerHTML = items.map(function (it, i) {
      return '<li role="option" id="azS' + i + '" data-i="' + i + '" aria-selected="false"><b>' + esc(it.name) + (it.kind ? '<span class="k">' + esc(it.kind) + '</span>' : '') + '</b><span>' + esc(it.road || it.addr || '') + '</span></li>';
    }).join('');
    sugg.hidden = false; qIn.setAttribute('aria-expanded', 'true');
  }
  function moveSugg(d) {
    if (sugg.hidden || !suggItems.length) return;
    suggIdx = (suggIdx + d + suggItems.length) % suggItems.length;
    $$('li', sugg).forEach(function (li, i) { li.setAttribute('aria-selected', i === suggIdx ? 'true' : 'false'); if (i === suggIdx) li.scrollIntoView({ block: 'nearest' }); });
    qIn.setAttribute('aria-activedescendant', 'azS' + suggIdx);
  }
  var lastQ = '';
  var liveSearch = debounce(function () {
    var q = qIn.value.trim(); picked = null;
    if (q.length < 2) { closeSugg(); return; }
    lastQ = q;
    search(q).then(function (items) { if (qIn.value.trim() === lastQ && document.activeElement === qIn) showSugg(items, q); });
  }, 280);
  qIn.addEventListener('input', liveSearch);
  qIn.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSugg(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSugg(-1); }
    else if (e.key === 'Escape') { closeSugg(); }
    else if (e.key === 'Enter' && !sugg.hidden && suggIdx >= 0) { e.preventDefault(); choose(suggItems[suggIdx]); }
  });
  sugg.addEventListener('mousedown', function (e) {
    var li = e.target.closest('li[data-i]'); if (!li) return;
    e.preventDefault(); choose(suggItems[+li.getAttribute('data-i')]);
  });
  qIn.addEventListener('blur', function () { setTimeout(closeSugg, 150); });
  function choose(it) {
    if (!it) return;
    picked = it; qIn.value = it.name; closeSugg();
    start({ lon: it.lon, lat: it.lat, label: it.name, addr: it.road || it.addr || '', gu: it.gu });
  }

  /* 폼 */
  function readOpts() {
    var r = +(($('input[name=r]:checked', form) || {}).value || 500);
    var mode = (($('input[name=mode]:checked', form) || {}).value) || 'open';
    return { r: r, mode: mode, kw: $('#azKw').value.trim() };
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = qIn.value.trim();
    if (picked && picked.name === q) { start({ lon: picked.lon, lat: picked.lat, label: picked.name, addr: picked.road || picked.addr || '' }); return; }
    if (q.length < 2) { heroMsg('분석할 주소나 장소를 두 글자 이상 입력해 주세요.'); qIn.focus(); return; }
    setBusy(true);
    search(q).then(function (items) {
      setBusy(false);
      if (!items.length) {
        if (!S.kakao && !ready('geocodeServer') && !S.seoulIdx) {
          heroMsg('지금은 주소 검색 연결을 준비하고 있습니다. 분석을 원하시는 주소를 남겨 주시면 담당자가 정리해 연락드립니다. <a href="contact?type=analysis" data-az-consult>상권분석 상담 신청</a>', true);
          stash({ text: '검토 주소: ' + q });
        } else showSugg([], q);
        return;
      }
      choose(items[0]);
    });
  });
  $$('.az-try button').forEach(function (b) {
    b.addEventListener('click', function () { qIn.value = b.getAttribute('data-q'); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })); });
  });
  function setBusy(on) { var b = $('#azGo'); b.disabled = on; b.textContent = on ? '찾는 중…' : '분석하기'; }
  var heroBox = null;
  function heroMsg(html, keep) {
    if (!heroBox) { heroBox = document.createElement('div'); heroBox.className = 'az-alert'; heroBox.setAttribute('role', 'status'); form.parentNode.insertBefore(heroBox, $('#azConn')); }
    heroBox.innerHTML = html; heroBox.hidden = false;
    clearTimeout(heroBox._t); if (!keep) heroBox._t = setTimeout(function () { heroBox.hidden = true; }, 6000);
  }

  // 반경·관점·업종 변경 → 결과가 있으면 바로 반영
  $$('input[name=r]', form).forEach(function (i) { i.addEventListener('change', function () { if (S.loc) start(S.loc, true); }); });
  $$('input[name=mode]', form).forEach(function (i) { i.addEventListener('change', function () { if (!S.loc) return; S.mode = readOpts().mode; renderAll(); syncUrl(); }); });
  $('#azKw').addEventListener('change', function () { if (!S.loc) return; setKw(this.value.trim()); });
  function setKw(kw) {
    S.kw = kw; $('#azKw').value = kw;
    S.sel = S.agg ? matchSel(kw) : null; S.seoulU = null;
    renderKpis(); renderComp(); renderSeoul(); renderSummary(); renderMapLayers(); syncUrl();
  }

  /* ───────────── 분석 실행 ───────────── */
  function start(loc, keepLoc) {
    var o = readOpts();
    S.r = o.r; S.mode = o.mode; S.kw = o.kw;
    var token = ++S.token;
    if (!keepLoc) {
      S.loc = { lon: +(+loc.lon).toFixed(6), lat: +(+loc.lat).toFixed(6), label: loc.label || '선택한 위치', addr: loc.addr || '' };
      if (loc.gu) S.loc.region = { sido: '서울특별시', sgg: loc.gu, dong: '', hName: '' };
    }
    S.stores = null; S.storesErr = null; S.agg = null; S.sel = null; S.zones = null; S.seoulCand = []; S.seoulT = null; S.seoulCd = null; S.seoulU = null; S.deals = null; S.dealsErr = null; S.roneSel = null;
    if (heroBox) heroBox.hidden = true;
    $('#azIntro').hidden = true; $('#azCmpEmpty').hidden = true;
    var res = $('#azResult'); res.hidden = false;
    progress('위치와 행정구역을 확인하고 있습니다');
    renderAll();
    $('#azTitle').focus({ preventScroll: true });
    var top = res.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top: top, behavior: 'smooth' });
    tr('analysis_run', { r: S.r, mode: S.mode, kw: S.kw || '' });

    var L = S.loc;
    var pRegion = keepLoc ? Promise.resolve(L) : resolveRegion(L);
    var pStores = ready('stores') ? fetchStores(L, S.r, token) : Promise.resolve(null);
    var pZones = ready('zones') ? getJSON('/api/analysis/zones?lon=' + L.lon.toFixed(3) + '&lat=' + L.lat.toFixed(3) + '&r=' + Math.max(500, S.r), 15000).catch(function () { return null; }) : Promise.resolve(null);

    pRegion.then(function () { if (token !== S.token) return; renderHead(); });
    pStores.then(function (st) {
      if (token !== S.token) return;
      S.stores = st;
      if (!ready('stores')) S.storesErr = { code: S.status && S.status.offline ? 'NOT_FOUND' : 'NO_KEY' };
      if (st) { S.agg = aggregate(st); S.sel = matchSel(S.kw); }
      if (st && st.near && (!L.region || !L.region.dong)) L.region = { bCode: st.near.ldongCd, sido: st.near.ctprvnNm, sgg: st.near.signguNm, dong: st.near.ldongNm, hName: st.near.adongNm };
      renderHead(); renderKpis(); renderMix(); renderComp(); renderMapLayers(); renderSummary(); renderSources();
    }, function (e) {
      if (token !== S.token) return;
      S.storesErr = e; renderKpis(); renderMix(); renderComp(); renderSummary();
    });
    pZones.then(function (z) { if (token !== S.token) return; S.zones = z && z.ok ? z.zones : null; renderMapLayers(); renderSources(); });

    // 서울 상권 지표
    loadSeoulIdx().then(function () {
      if (token !== S.token) return;
      S.seoulCand = nearTrdar(L, S.r);
      renderSeoul();
      if (S.seoulCand.length) pickTrdar(S.seoulCand[0].cd, token);
    });
    // 임대동향
    Promise.all([loadRone(), pRegion]).then(function () { if (token !== S.token) return; pickRone(); renderRent(); renderKpis(); renderSummary(); });
    // 실거래 (시군구 코드가 필요)
    Promise.all([pRegion, pStores.catch(function () { return null; })]).then(function () {
      if (token !== S.token) return;
      var lawd = lawdOf(L);
      if (!ready('realprice') || !lawd) { S.dealsErr = { code: ready('realprice') ? 'NO_REGION' : (S.status && S.status.offline ? 'NOT_FOUND' : 'NO_KEY') }; renderDeal(); return; }
      renderDeal();
      getJSON('/api/analysis/realprice?lawd=' + lawd + '&months=12', 30000).then(function (j) {
        if (token !== S.token) return; S.deals = j; renderDeal(); renderSources();
      }, function (e) { if (token !== S.token) return; S.dealsErr = e; renderDeal(); });
    });
    Promise.all([pStores.catch(function () {}), pRegion, loadSeoulIdx(), loadRone()]).then(function () {
      if (token !== S.token) return; progress(null); syncUrl();
    });
    syncUrl();
  }
  var SEOUL_GU = { '종로구': '11110', '중구': '11140', '용산구': '11170', '성동구': '11200', '광진구': '11215', '동대문구': '11230', '중랑구': '11260', '성북구': '11290', '강북구': '11305', '도봉구': '11320', '노원구': '11350', '은평구': '11380', '서대문구': '11410',
    '마포구': '11440', '양천구': '11470', '강서구': '11500', '구로구': '11530', '금천구': '11545', '영등포구': '11560', '동작구': '11590', '관악구': '11620', '서초구': '11650', '강남구': '11680', '송파구': '11710', '강동구': '11740' };
  function lawdOf(L) {
    var c = (L.region && L.region.bCode) || '';
    if (/^\d{10}$/.test(c)) return c.slice(0, 5);
    if (S.stores && S.stores.near && /^\d{5}$/.test(S.stores.near.signguCd || '')) return S.stores.near.signguCd;
    var r = L.region || {};
    if (SEOUL_GU[r.sgg] && (!r.sido || /^서울/.test(r.sido))) return SEOUL_GU[r.sgg];
    return '';
  }
  function progress(txt) {
    var p = $('#azProgress'); if (!txt) { p.hidden = true; return; }
    p.hidden = false; $('#azProgressTx').textContent = txt;
  }
  function fetchStores(L, r, token) {
    var base = '/api/analysis/stores?lon=' + L.lon.toFixed(4) + '&lat=' + L.lat.toFixed(4) + '&r=' + r;
    progress('반경 ' + rlabel(r) + ' 안의 점포를 모으고 있습니다');
    return getJSON(base + '&page=1', 25000).then(function (first) {
      var total = first.total || 0, need = Math.ceil(total / 1000), pages = Math.min(need, MAXP[r] || 15);
      var res = { total: total, stdr: first.stdr || '', cats: { L: {}, M: {}, S: {} }, items: [], near: first.near, pages: Math.max(pages, 1), done: 1, partial: need > pages, failed: 0 };
      function merge(j) {
        ['L', 'M', 'S'].forEach(function (k) { var c = (j.cats || {})[k] || {}; for (var x in c) if (!res.cats[k][x]) res.cats[k][x] = c[x]; });
        (j.items || []).forEach(function (it) { res.items.push(it); });
        if (j.near && (!res.near || (j.near.dist || 9e9) < (res.near.dist || 9e9))) res.near = j.near;
      }
      merge(first);
      var next = 2;
      function worker() {
        if (next > pages || token !== S.token) return Promise.resolve();
        var p = next++;
        return getJSON(base + '&page=' + p, 25000).then(merge, function () { res.failed++; }).then(function () {
          res.done++; if (token === S.token) progress('점포 데이터 ' + nf(res.items.length) + '건 확인 (' + res.done + '/' + pages + ')');
          return worker();
        });
      }
      return Promise.all([worker(), worker(), worker()]).then(function () { if (res.failed) res.partial = true; return res; });
    });
  }

  /* ───────────── 계산 ───────────── */
  function geo(L) {
    var k = Math.cos(L.lat * Math.PI / 180) * 111320;
    return function (lon, lat) { var dx = (lon - L.lon) * k, dy = (lat - L.lat) * 110574; return [dx, dy, Math.sqrt(dx * dx + dy * dy)]; };
  }
  function isF1(f) { return String(f || '').replace(/층|지상|\s/g, '') === '1'; }
  function floorGroup(f) {
    var s = String(f || '').replace(/\s/g, '');
    if (!s) return '미상';
    if (/^(b|지하|지|-)/i.test(s)) return '지하';
    var n = parseInt(s.replace(/[^0-9]/g, ''), 10);
    if (!isFinite(n)) return '미상';
    return n <= 1 ? '1층' : n === 2 ? '2층' : '3층 이상';
  }
  function aggregate(st) {
    var g = geo(S.loc), L = {}, M = {}, SC = {}, fl = { '지하': 0, '1층': 0, '2층': 0, '3층 이상': 0, '미상': 0 }, br = 0;
    st.items.forEach(function (it) {
      var p = g(it[4], it[5]); it.d = p[2]; it.x = p[0]; it.y = p[1];
      L[it[1]] = (L[it[1]] || 0) + 1; M[it[2]] = (M[it[2]] || 0) + 1; SC[it[3]] = (SC[it[3]] || 0) + 1;
      fl[floorGroup(it[6])]++; if (it[7]) br++;
    });
    var n = st.items.length, area = Math.PI * S.r * S.r / 1e6;
    function sorted(o) { return Object.keys(o).map(function (k) { return [k, o[k]]; }).sort(function (a, b) { return b[1] - a[1]; }); }
    var known = n - fl['미상'];
    return { n: n, area: area, L: sorted(L), M: M, S: sorted(SC), fl: fl, f1: known ? fl['1층'] / known * 100 : null, br: n ? br / n * 100 : null };
  }
  function matchSel(kw) {
    var st = S.stores; if (!st || !kw) return null;
    var cats = st.cats, t = kwTerms(kw);
    if (/^[SM]:/.test(kw)) { var lv = kw[0], cd = kw.slice(2); return { level: lv, codes: [cd], label: (cats[lv] || {})[cd] || cd, raw: kw }; }
    var codes = Object.keys(cats.S).filter(function (c) { var n = norm(cats.S[c]); return t.some(function (x) { return n.indexOf(x) >= 0; }); });
    if (codes.length) return { level: 'S', codes: codes, label: kw, raw: kw };
    codes = Object.keys(cats.M).filter(function (c) { var n = norm(cats.M[c]); return t.some(function (x) { return n.indexOf(x) >= 0; }); });
    return { level: 'M', codes: codes, label: kw, raw: kw };
  }
  function selItems() {
    var sel = S.sel; if (!sel || !S.stores) return [];
    var idx = sel.level === 'S' ? 3 : 2, set = {};
    sel.codes.forEach(function (c) { set[c] = 1; });
    return S.stores.items.filter(function (it) { return set[it[idx]]; });
  }
  function lifeCheck() {
    var st = S.stores; if (!st) return [];
    var names = {}; Object.keys(st.cats.S).forEach(function (c) { names[c] = norm(st.cats.S[c]); });
    var cnt = {}; S.agg.S.forEach(function (e) { cnt[e[0]] = e[1]; });
    return LIFE.map(function (L) {
      var n = 0; Object.keys(names).forEach(function (c) { if (L[1].some(function (x) { return names[c].indexOf(x) >= 0; })) n += cnt[c] || 0; });
      return [L[0], n];
    });
  }

  /* 서울 상권 */
  function nearTrdar(L, r) {
    var idx = S.seoulIdx; if (!idx) return [];
    var g = geo(L), out = [];
    idx.t.forEach(function (t) {
      var d = g(t[4], t[5])[2], rad = Math.sqrt((t[6] || 0) / Math.PI);
      if (d - rad <= r + 200) out.push({ cd: t[0], nm: t[1], se: t[2], gu: t[3], d: d, area: t[6] });
    });
    out.sort(function (a, b) { return a.d - b.d; });
    if (!out.length) {
      idx.t.forEach(function (t) { var d = g(t[4], t[5])[2]; if (d <= 2000) out.push({ cd: t[0], nm: t[1], se: t[2], gu: t[3], d: d, area: t[6], far: true }); });
      out.sort(function (a, b) { return a.d - b.d; });
      out = out.slice(0, 3);
    }
    return out.slice(0, 6);
  }
  function pickTrdar(cd, token) {
    S.seoulCd = cd; S.seoulT = null; S.seoulU = null; renderSeoul();
    getJSON('/data/seoul/t/' + encodeURIComponent(cd) + '.json', 15000).then(function (j) {
      if (token != null && token !== S.token) return;
      if (S.seoulCd !== cd) return;
      S.seoulT = j; renderSeoul(); renderSummary(); renderKpis(); pickRone(true); renderRent();
    }, function () { if (S.seoulCd === cd) { S.seoulT = false; renderSeoul(); } });
  }
  function seoulUCode() {
    var t = S.seoulT; if (!t || !t.u) return null;
    if (S.seoulU && t.u[S.seoulU]) return S.seoulU;
    var ind = (S.seoulIdx && S.seoulIdx.induty) || {}, terms = kwTerms(S.kw), best = null, bestN = -1;
    if (!terms.length) return null;
    Object.keys(t.u).forEach(function (u) {
      var n = norm(ind[u] || ''); if (!terms.some(function (x) { return n.indexOf(x) >= 0; })) return;
      var st = t.u[u][0], c = st ? st[1] : 0; if (c > bestN) { bestN = c; best = u; }
    });
    return best;
  }

  /* 부동산원 임대동향 */
  var SIDO = { '서울': '서울', '부산': '부산', '대구': '대구', '인천': '인천', '광주': '광주', '대전': '대전', '울산': '울산', '세종': '세종', '경기': '경기', '강원': '강원', '충청북': '충북', '충북': '충북', '충청남': '충남', '충남': '충남', '전북': '전북', '전라북': '전북', '전라남': '전남', '전남': '전남', '경상북': '경북', '경북': '경북', '경상남': '경남', '경남': '경남', '제주': '제주' };
  function sidoShort(s) { s = String(s || ''); for (var k in SIDO) if (s.indexOf(k) === 0) return SIDO[k]; return ''; }
  function roneList() {
    var R = S.rone; if (!R) return [];
    var out = [];
    ['중대형상가', '소규모상가', '집합상가'].forEach(function (type) { (R.types[type] || []).forEach(function (e) { out.push({ type: type, e: e }); }); });
    return out;
  }
  function pickRone(soft) {
    if (!S.rone) { S.roneSel = null; return; }
    if (soft && S.roneSel && S.roneSel.manual) return;
    var L = S.loc, reg = L.region || {}, sd = sidoShort(reg.sido);
    var toks = [];
    function add(w, s) { w = stem(w); if (w && w.length >= 2) toks.push([w, s]); }
    if (L.roadName) add(L.roadName.replace(/(\d+)?(번?길)$/, ''), 6);
    String(L.addr || '').split(/\s+/).forEach(function (w) { if (/(로|길)$/.test(w)) add(w.replace(/(\d+)?(번?길)$/, ''), 5); });
    add(reg.dong, 4); add(reg.hName, 4);
    if (S.seoulT && S.seoulT.nm) add(String(S.seoulT.nm).split(/[\s(]/)[0].replace(/역$/, ''), 5);
    S.seoulCand.slice(0, 3).forEach(function (c) { add(String(c.nm).split(/[\s(]/)[0].replace(/역$/, ''), 3); });
    add(reg.sgg, 2);
    var best = null, bestS = 0;
    roneList().forEach(function (o, i) {
      var full = o.e.full || '', parts = full.split('>');
      if (sd && parts[0] !== sd) return;
      var nm = o.e.nm || parts[parts.length - 1], sc = 0;
      toks.forEach(function (t) { if (nm.indexOf(t[0]) >= 0 || t[0].indexOf(nm) >= 0) sc = Math.max(sc, t[1] + 1); else if (full.indexOf(t[0]) >= 0) sc = Math.max(sc, t[1] - 1); });
      if (o.type === '중대형상가') sc += 0.3;
      if (sc > bestS) { bestS = sc; best = i; }
    });
    S.roneSel = best != null && bestS >= 3 ? { i: best, manual: false } : null;
  }
  function roneCur() { var l = roneList(); return S.roneSel ? l[S.roneSel.i] : null; }

  /* ───────────── 렌더링 ───────────── */
  function renderAll() {
    renderHead(); renderKpis(); renderMix(); renderComp(); renderSeoul(); renderRent(); renderDeal(); renderCheck(); renderCompare(); renderMapLayers(); renderSummary(); renderSources();
  }
  function placeName() { var L = S.loc; return L.label && L.label !== '선택한 위치' ? L.label : (L.addr || '선택한 위치'); }
  function renderHead() {
    var L = S.loc; if (!L) return;
    $('#azTitle').textContent = placeName();
    var reg = L.region || {}, chips = [];
    if (L.addr && L.addr !== L.label) chips.push('<span class="az-chip">' + esc(L.addr) + '</span>');
    if (reg.hName || reg.dong) chips.push('<span class="az-chip">' + esc([reg.sgg, reg.hName || reg.dong].filter(Boolean).join(' ')) + '</span>');
    chips.push('<span class="az-chip g">반경 ' + rlabel(S.r) + '</span>');
    chips.push('<span class="az-chip">' + (S.mode === 'owner' ? '건물주·임대 관점' : '창업·출점 관점') + '</span>');
    if (S.kw) chips.push('<span class="az-chip">관심 업종 · ' + esc(S.kw) + '</span>');
    $('#azChips').innerHTML = chips.join('');
    $('#azPrintMeta').textContent = placeName() + (L.addr && L.addr !== L.label ? ' (' + L.addr + ')' : '') + ' · 반경 ' + rlabel(S.r) + ' · ' + today() + ' 작성';
  }
  function kpi(l, v, s, cls) { return '<div class="az-kpi ' + (cls || '') + '"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="s">' + (s || '&nbsp;') + '</div></div>'; }
  function renderKpis() {
    var el = $('#azKpis'), A = S.agg, st = S.stores, out = [];
    if (!S.loc) return;
    if (!A) {
      if (S.storesErr || !ready('stores')) {
        var ec = (S.storesErr && S.storesErr.code) || 'NO_KEY', prep = ec === 'NO_KEY' || ec === 'NOT_FOUND';
        out.push(kpi('반경 내 점포', '<span class="na">' + (prep ? '연결 준비 중' : '불러오지 못함') + '</span>', prep ? '점포 데이터 연결 후 표시됩니다' : errText(S.storesErr), 'hl'));
        out.push(kpi('분석 반경', rlabel(S.r), '중심점 기준 원형 범위'));
      } else {
        for (var i = 0; i < 6; i++) out.push(kpi('불러오는 중', '0000', '데이터 확인 중', 'sk'));
      }
    } else {
      var top = A.L[0];
      out.push(kpi('반경 ' + rlabel(S.r) + ' 내 점포', nf(st.total) + '<small>곳</small>', st.partial ? '이 중 ' + nf(A.n) + '곳 기준으로 비율 계산' : (st.stdr ? ymLabel(st.stdr) + ' 기준' : '소상공인시장진흥공단'), 'hl'));
      out.push(kpi('점포 밀도', nf(st.total / A.area) + '<small>곳/㎢</small>', '반경 면적 ' + nf(A.area, 2) + '㎢ 기준'));
      out.push(kpi('가장 많은 업종', top ? esc(st.cats.L[top[0]] || top[0]) : '-', top ? pf(pct(top[1], A.n)) + ' · ' + nf(top[1]) + '곳' : ''));
      out.push(kpi('1층 점포 비중', pf(A.f1), '층 정보가 있는 점포 기준'));
      out.push(kpi('지점명 등록 점포', pf(A.br), '체인·프랜차이즈로 볼 수 있는 점포'));
      var rc = roneCur();
      if (S.mode === 'owner' && rc && rc.e.rent['1'] != null) {
        out.push(kpi('1층 참고 임대료', nf(rc.e.rent['1'], 1) + '<small>천원/㎡</small>', esc(rc.e.nm) + ' · 부동산원 표본'));
      } else if (S.sel) {
        var it = selItems(), near = it.reduce(function (m, x) { return Math.min(m, x.d); }, Infinity);
        out.push(kpi('관심 업종 · ' + esc(S.kw), nf(st.partial ? it.length * st.total / Math.max(A.n, 1) : it.length) + '<small>곳' + (st.partial ? ' 추정' : '') + '</small>', it.length ? '가장 가까운 곳 ' + mlabel(near) : '반경 안에서 찾지 못했습니다'));
      } else {
        out.push(kpi('관심 업종', '<span class="na">아직 고르지 않음</span>', '업종을 넣으면 경쟁 분석이 열립니다'));
      }
    }
    el.innerHTML = out.join('');
  }

  function bars(rows, opt) {
    opt = opt || {};
    var max = rows.reduce(function (m, r) { return Math.max(m, r.v); }, 0) || 1;
    return '<ul class="az-bars">' + rows.map(function (r) {
      var inner = '<span class="n" title="' + esc(r.n) + '">' + esc(r.n) + (r.btn ? '<svg class="az-cv" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>' : '') + '</span><span class="t"><span class="f" style="width:' + (r.v / max * 100).toFixed(1) + '%"></span></span><span class="c"><b>' + nf(r.v) + '</b>' + (r.p != null ? ' · ' + pf(r.p) : '') + '</span>';
      if (r.btn) return '<li><button type="button" class="az-bar' + (r.hl ? ' hl' : '') + '" aria-expanded="false" data-l="' + esc(r.btn) + '">' + inner + '</button><div class="az-subbars" hidden></div></li>';
      return '<li class="az-bar' + (r.hl ? ' hl' : '') + '">' + inner + '</li>';
    }).join('') + '</ul>';
  }
  function storesState(el) {
    if (S.agg) return true;
    if (S.storesErr || !ready('stores')) {
      var e = S.storesErr || { code: 'NO_KEY' };
      el.innerHTML = empty(e.code === 'NO_KEY' || e.code === 'NOT_FOUND' ? '반경 점포 데이터는 연결을 마무리하고 있습니다' : '점포 데이터를 불러오지 못했습니다',
        (e.code === 'NO_KEY' || e.code === 'NOT_FOUND' ? '연결이 끝나면 이 자리에 업종 구성이 표시됩니다. 그 전에 분석이 필요하시면 ' + CONSULT + '을 남겨 주세요. 담당자가 정리해 드립니다.' : errText(e) + ' 계속 같은 문제가 생기면 ' + CONSULT + '으로 알려 주세요.'), 'clock');
    } else el.innerHTML = '<p class="az-p">점포 데이터를 모으고 있습니다…</p>';
    return false;
  }
  function renderMix() {
    var el = $('#azMixB'); if (!S.loc || !storesState(el)) return;
    var A = S.agg, st = S.stores, cats = st.cats;
    var selL = {};
    if (S.sel) selItems().forEach(function (it) { selL[it[1]] = 1; });
    var Lrows = A.L.map(function (e) { return { n: cats.L[e[0]] || e[0], v: e[1], p: pct(e[1], A.n), btn: e[0], hl: !!selL[e[0]] }; });
    var Srows = A.S.slice(0, 12).map(function (e) { return { n: cats.S[e[0]] || e[0], v: e[1], p: pct(e[1], A.n), hl: S.sel && S.sel.level === 'S' && S.sel.codes.indexOf(e[0]) >= 0 }; });
    var fl = A.fl, Frows = ['지하', '1층', '2층', '3층 이상', '미상'].map(function (k) { return { n: k, v: fl[k], p: pct(fl[k], A.n) }; }).filter(function (r) { return r.v > 0; });
    var life = lifeCheck();
    el.innerHTML =
      (st.partial ? '<p class="az-alert" style="margin:0 0 16px">반경 안 점포가 ' + nf(st.total) + '곳으로 많아, 이 중 ' + nf(A.n) + '곳을 기준으로 비율을 계산했습니다. 업종별 수는 이 범위 안의 값입니다.</p>' : '') +
      '<div class="az-cols"><div><h4 class="az-sub">대분류 <small style="font-weight:600;color:var(--slate2);font-size:12.5px">· 눌러서 중분류 보기</small></h4>' + bars(Lrows) + '</div>' +
      '<div><h4 class="az-sub">세부 업종 상위 12</h4>' + bars(Srows) + '</div></div>' +
      '<div class="az-cols" style="margin-top:10px"><div><h4 class="az-sub">층별 분포</h4>' + bars(Frows) + '<p class="az-muted">층 정보는 상가업소 등록 자료 기준이라 실제와 다를 수 있습니다.</p></div>' +
      '<div><h4 class="az-sub">생활 밀착 업종 점검</h4><div class="az-tags">' + life.map(function (l) { return '<span class="az-tag' + (l[1] ? '' : ' g') + '">' + esc(l[0]) + '<small>' + (l[1] ? nf(l[1]) + '곳' : '없음') + '</small></span>'; }).join('') + '</div>' +
      '<p class="az-muted">' + (S.mode === 'owner' ? '반경 안에 없거나 적은 생활 업종은 유치 후보로 검토해 볼 수 있습니다. 실제 수요는 배후 세대와 동선을 함께 봐야 합니다.' : '동네 상권에서 자주 찾는 업종이 반경 안에 얼마나 있는지 정리했습니다.') + '</p></div></div>';
    $$('button.az-bar', el).forEach(function (b) {
      b.addEventListener('click', function () {
        var box = b.nextElementSibling, open = b.getAttribute('aria-expanded') === 'true';
        b.setAttribute('aria-expanded', open ? 'false' : 'true');
        if (open) { box.hidden = true; return; }
        var lc = b.getAttribute('data-l'), M = {};
        st.items.forEach(function (it) { if (it[1] === lc) M[it[2]] = (M[it[2]] || 0) + 1; });
        var rows = Object.keys(M).map(function (k) { return { n: cats.M[k] || k, v: M[k], p: pct(M[k], A.n) }; }).sort(function (a, b2) { return b2.v - a.v; }).slice(0, 10);
        box.innerHTML = bars(rows); box.hidden = false;
      });
    });
  }

  function selOptions() {
    var st = S.stores, A = S.agg, o = ['<option value="">업종 고르기</option>'];
    A.S.slice(0, 40).forEach(function (e) { o.push('<option value="S:' + esc(e[0]) + '"' + (S.sel && S.sel.level === 'S' && S.sel.codes.length === 1 && S.sel.codes[0] === e[0] ? ' selected' : '') + '>' + esc(st.cats.S[e[0]] || e[0]) + ' (' + nf(e[1]) + ')</option>'); });
    return o.join('');
  }
  function renderComp() {
    var el = $('#azCompB'); if (!S.loc || !storesState(el)) return;
    var st = S.stores, A = S.agg;
    var head = '<div class="az-pick"><label for="azSelS">업종 선택</label><select id="azSelS" class="az-sel">' + selOptions() + '</select>' +
      (S.sel && S.sel.level && S.sel.raw && !/^[SM]:/.test(S.sel.raw) && S.sel.codes.length ? '<span class="az-muted" style="margin:0">‘' + esc(S.kw) + '’ 검색 → ' + S.sel.codes.map(function (c) { return esc((st.cats[S.sel.level] || {})[c] || c); }).join(', ') + '</span>' : '') + '</div>';
    if (!S.sel) {
      el.innerHTML = head + empty('관심 업종을 고르면 경쟁 분석이 나타납니다', '검색창의 ‘관심 업종’에 입력하거나 위 목록에서 골라 주세요. 반경 안 동종 점포 수와 거리, 체인 비중을 정리해 드립니다.');
      bindSel(el); return;
    }
    var it = selItems().slice().sort(function (a, b) { return a.d - b.d; });
    if (!it.length) {
      el.innerHTML = head + empty('반경 ' + rlabel(S.r) + ' 안에서 ' + qj(S.sel.label, '을', '를') + ' 찾지 못했습니다', '업종 이름을 바꿔 검색하거나 반경을 넓혀 보세요. 정말 없는 업종이라면 수요가 없어서인지, 아직 들어오지 않은 것인지 현장에서 확인할 필요가 있습니다.');
      bindSel(el); return;
    }
    var n = it.length, scale = st.partial ? st.total / Math.max(A.n, 1) : 1;
    var br = it.filter(function (x) { return x[7]; }).length, f1k = it.filter(function (x) { return floorGroup(x[6]) !== '미상'; }), f1 = f1k.filter(function (x) { return isF1(x[6]); }).length;
    var rings = RINGS[S.r] || [100, 300, S.r];
    var ringHtml = rings.map(function (rr) { var c = it.filter(function (x) { return x.d <= rr; }).length; return '<div class="az-stat"><div class="l">' + rlabel(rr) + ' 이내</div><div class="v">' + nf(c * scale) + '<small>곳</small></div></div>'; }).join('');
    el.innerHTML = head +
      '<div class="az-stats">' +
      '<div class="az-stat"><div class="l">' + esc(S.sel.label) + ' 점포</div><div class="v">' + nf(n * scale) + '<small>곳' + (scale > 1 ? ' 추정' : '') + '</small></div><div class="s">반경 내 점포의 ' + pf(pct(n, A.n)) + '</div></div>' +
      '<div class="az-stat"><div class="l">경쟁 밀도</div><div class="v">' + nf(n * scale / A.area, 0) + '<small>곳/㎢</small></div><div class="s">반경 면적 기준</div></div>' +
      '<div class="az-stat"><div class="l">가장 가까운 동종 점포</div><div class="v">' + mlabel(it[0].d) + '</div><div class="s">' + esc(it[0][0]) + '</div></div>' +
      '<div class="az-stat"><div class="l">지점명 등록 비중</div><div class="v">' + pf(pct(br, n), 0) + '</div><div class="s">1층 비중 ' + pf(pct(f1, f1k.length), 0) + '</div></div>' +
      '</div>' +
      '<div class="az-comp"><div><div class="az-dist"><span class="cap">반경 ' + rlabel(S.r) + ' · ' + esc(S.sel.label) + ' 분포</span>' + svgMap(it, true) + '</div></div>' +
      '<div><h4 class="az-sub">거리별 동종 점포</h4><div class="az-rings">' + ringHtml + '</div>' +
      '<h4 class="az-sub">가까운 순서</h4><ul class="az-near">' + it.slice(0, 8).map(function (x) { return '<li><span>' + esc(x[0]) + (x[6] ? ' <small style="color:var(--slate2)">' + esc(floorLabel(x[6])) + '</small>' : '') + '</span><em>' + mlabel(x.d) + '</em></li>'; }).join('') + '</ul>' +
      '<p class="az-muted">' + (S.mode === 'owner' ? '같은 업종이 가까이 몰려 있으면 수요가 있다는 신호지만, 같은 업종 임차인을 새로 들일 때는 비교할 곳이 많아 조건 협상이 까다로워질 수 있습니다.' : '동종 점포가 가까운 것이 항상 불리하지는 않습니다. 상권 전체의 집객이 큰 곳에서는 군집이 오히려 수요를 모으기도 합니다. 현장에서 대기 줄과 피크 시간 회전을 함께 보세요.') + '</p></div></div>';
    bindSel(el);
  }
  function floorLabel(f) {
    var s = String(f || '').replace(/\s/g, ''), m = s.match(/^(?:b|지하|지|-)(\d+)/i);
    if (m) return '지하 ' + m[1] + '층';
    return /층$/.test(s) ? s : s + '층';
  }
  function bindSel(el) {
    var s = $('#azSelS', el); if (!s) return;
    s.addEventListener('change', function () {
      if (!s.value) return;
      var lv = s.value[0], cd = s.value.slice(2), name = (S.stores.cats[lv] || {})[cd] || cd;
      S.kw = name; $('#azKw').value = name;
      S.sel = { level: lv, codes: [cd], label: name, raw: s.value }; S.seoulU = null;
      renderHead(); renderKpis(); renderMix(); renderComp(); renderSeoul(); renderSummary(); renderMapLayers(); syncUrl();
    });
  }

  /* SVG 분포도 (지도 키가 없거나 인쇄할 때도 쓰임) */
  function svgMap(hi, focus) {
    var r = S.r, W = 600, C = 300, sc = 270 / r, st = S.stores;
    var items = st ? st.items : [], step = items.length > 4000 ? Math.ceil(items.length / 4000) : 1;
    var parts = ['<svg class="az-svgmap-in" viewBox="0 0 ' + W + ' ' + W + '" role="img" aria-label="반경 ' + rlabel(r) + ' 점포 분포도" xmlns="http://www.w3.org/2000/svg">'];
    parts.push('<rect width="600" height="600" fill="#F7F8FA"/>');
    for (var g = 50; g < 600; g += 50) parts.push('<path d="M' + g + ' 0V600M0 ' + g + 'H600" stroke="#E9ECF1" stroke-width="1"/>');
    if (S.zones && !focus) S.zones.forEach(function (z) {
      var gg = geo(S.loc);
      (z.rings || []).forEach(function (ring) {
        var d = ring.map(function (p, i) { var q = gg(p[0], p[1]); return (i ? 'L' : 'M') + (C + q[0] * sc).toFixed(1) + ' ' + (C - q[1] * sc).toFixed(1); }).join('') + 'Z';
        parts.push('<path d="' + d + '" fill="rgba(39,64,107,.10)" stroke="rgba(39,64,107,.5)" stroke-width="1.2"/>');
      });
    });
    (RINGS[r] || []).forEach(function (rr, i, a) {
      var rad = rr * sc, last = i === a.length - 1;
      parts.push('<circle cx="300" cy="300" r="' + rad.toFixed(1) + '" fill="' + (last ? 'rgba(20,36,62,.035)' : 'none') + '" stroke="' + (last ? '#C5A15A' : '#C9D1DE') + '" stroke-width="' + (last ? 2 : 1.2) + '"' + (last ? '' : ' stroke-dasharray="5 5"') + '/>');
      parts.push('<text x="' + (300 + rad * 0.707 + 4).toFixed(1) + '" y="' + (300 - rad * 0.707 - 4).toFixed(1) + '" font-size="13" font-family="Pretendard Variable,Pretendard,sans-serif" font-weight="700" fill="#8A93A3">' + rlabel(rr) + '</text>');
    });
    for (var i = 0; i < items.length; i += step) {
      var it = items[i]; if (it.x == null) continue;
      parts.push('<circle cx="' + (C + it.x * sc).toFixed(1) + '" cy="' + (C - it.y * sc).toFixed(1) + '" r="2.3" fill="#AEB7C5" fill-opacity=".55"/>');
    }
    var hr = (hi || []).length > 600 ? 3.2 : (hi || []).length > 200 ? 4 : 5;
    (hi || []).forEach(function (it) {
      parts.push('<circle cx="' + (C + it.x * sc).toFixed(1) + '" cy="' + (C - it.y * sc).toFixed(1) + '" r="' + hr + '" fill="#C5A15A" stroke="#fff" stroke-width="' + (hr < 4 ? 1 : 1.6) + '"><title>' + esc(it[0]) + ' · ' + mlabel(it.d) + '</title></circle>');
    });
    parts.push('<circle cx="300" cy="300" r="8" fill="#14243E" stroke="#fff" stroke-width="3"/>');
    parts.push('<g font-family="Pretendard Variable,Pretendard,sans-serif" font-size="13" font-weight="800" fill="#5F6A7B"><text x="574" y="34" text-anchor="middle">N</text></g><path d="M574 40l-6 14h12z" fill="#5F6A7B"/>');
    parts.push('</svg>');
    return parts.join('');
  }
  function renderMapLayers() {
    var box = $('#azMap'); if (!S.loc || !box) return;
    var hi = S.sel ? selItems() : [];
    var legend = ['<span><i style="background:#14243E"></i>분석 위치</span>', '<span><i class="ring"></i>반경 ' + rlabel(S.r) + '</span>'];
    if (S.stores) legend.push('<span><i style="background:#AEB7C5"></i>전체 점포</span>');
    if (hi.length) legend.push('<span><i style="background:#C5A15A"></i>' + esc(S.sel.label) + '</span>');
    if (S.zones && S.zones.length) legend.push('<span><i class="zone"></i>주요상권(소진공)</span>');
    $('#azMapLegend').innerHTML = legend.join('');
    var svg = '<div class="az-svgwrap"' + (S.kakao ? ' style="display:none"' : '') + '>' + svgMap(hi, false).replace('az-svgmap-in', 'az-svgmap') + '</div>';
    if (!S.kakao) {
      box.classList.remove('has-kakao');
      box.innerHTML = svg + (S.stores ? '' : '<span class="az-mapnote">' + (ready('map') && !S.kakaoFail ? '지도를 불러오는 중입니다' : '간이 지도 · 지도 연결 후 실제 지도로 표시됩니다') + '</span>');
      return;
    }
    drawKakao(hi, svg);
  }
  function drawKakao(hi, svg) {
    var k = window.kakao.maps, box = $('#azMap'), L = S.loc;
    box.classList.add('has-kakao');
    var km = $('.az-kmap', box);
    if (!km) { box.innerHTML = '<div class="az-kmap" style="position:absolute;inset:0"></div>'; km = $('.az-kmap', box); S.map = null; }
    var old = $('.az-svgwrap', box); if (old) old.remove();
    box.insertAdjacentHTML('beforeend', svg);
    var center = new k.LatLng(L.lat, L.lon);
    if (!S.map) {
      S.map = new k.Map(km, { center: center, level: 4 }); S.cluster = null;
      try { S.map.addControl(new k.ZoomControl(), k.ControlPosition.RIGHT); } catch (e) {}
    }
    S.map.relayout();
    S.ov.forEach(function (o) { try { o.setMap(null); } catch (e) {} });
    S.ov = [];
    if (S.cluster) { try { S.cluster.clear(); } catch (e) {} }
    var circle = new k.Circle({ center: center, radius: S.r, strokeWeight: 2, strokeColor: '#C5A15A', strokeOpacity: 0.95, strokeStyle: 'solid', fillColor: '#14243E', fillOpacity: 0.05 });
    circle.setMap(S.map); S.ov.push(circle);
    (S.zones || []).forEach(function (z) {
      (z.rings || []).forEach(function (ring) {
        var pg = new k.Polygon({ path: ring.map(function (p) { return new k.LatLng(p[1], p[0]); }), strokeWeight: 1.5, strokeColor: '#27406B', strokeOpacity: 0.55, fillColor: '#27406B', fillOpacity: 0.08 });
        pg.setMap(S.map); S.ov.push(pg);
      });
    });
    var pin = document.createElement('div'); pin.className = 'az-pin'; pin.title = placeName();
    var po = new k.CustomOverlay({ position: center, content: pin, zIndex: 5 }); po.setMap(S.map); S.ov.push(po);
    var tip = new k.CustomOverlay({ position: center, content: '<div></div>', yAnchor: 1, zIndex: 6 }); S.ov.push(tip);
    var dots = hi.slice(0, 1500).map(function (it) {
      var el = document.createElement('div'); el.className = 'az-dot'; el.title = it[0];
      var ov = new k.CustomOverlay({ position: new k.LatLng(it[5], it[4]), content: el, zIndex: 3 });
      el.addEventListener('click', function () {
        var t = document.createElement('div'); t.className = 'az-tip'; t.textContent = it[0] + ' · ' + mlabel(it.d);
        tip.setContent(t); tip.setPosition(new k.LatLng(it[5], it[4])); tip.setMap(S.map);
      });
      return ov;
    });
    if (dots.length > 250 && k.MarkerClusterer) {
      if (!S.cluster) S.cluster = new k.MarkerClusterer({ map: S.map, averageCenter: true, minLevel: 4, styles: [{ width: '36px', height: '36px', background: 'rgba(197,161,90,.92)', border: '2px solid #fff', borderRadius: '18px', color: '#fff', textAlign: 'center', fontWeight: '800', lineHeight: '32px', fontSize: '12px' }] });
      S.cluster.addMarkers(dots);
    } else dots.forEach(function (o) { o.setMap(S.map); S.ov.push(o); });
    try { S.map.setBounds(circle.getBounds(), 20, 20, 20, 20); } catch (e) { S.map.setCenter(center); }
  }

  /* 서울 상권 지표 */
  function gauge(label, p, sub) {
    if (p == null || !isFinite(p)) return '<div class="az-gauge na"><div class="l">' + label + '</div><div class="v">자료 없음</div><div class="s">' + (sub || '') + '</div></div>';
    return '<div class="az-gauge"><div class="l">' + label + '</div><div class="v">' + tops(p) + '<small>서울 상권 중</small></div><div class="tr"><i style="width:' + p + '%"></i><b style="left:' + p + '%"></b></div><div class="s">' + (sub || '') + '</div></div>';
  }
  function mini(vals, labels, opt) {
    opt = opt || {};
    var tot = vals.reduce(function (a, b) { return a + (b || 0); }, 0), max = Math.max.apply(null, vals.map(function (v) { return v || 0; })) || 1;
    var mi = vals.indexOf(max);
    return '<div class="az-mini">' + vals.map(function (v, i) {
      var h = (v || 0) / max * 100;
      return '<div class="b' + (i === mi && opt.hl !== false ? ' hl' : '') + '"><em>' + (opt.raw ? opt.raw(v) : pf(pct(v || 0, tot), 0)) + '</em><i style="height:' + Math.max(2, h * 0.62).toFixed(1) + '%"></i><span>' + labels[i] + '</span></div>';
    }).join('') + '</div>';
  }
  var TM = ['0–6시', '6–11시', '11–14시', '14–17시', '17–21시', '21–24시'], AG = ['10대', '20대', '30대', '40대', '50대', '60대+'], DW = ['월', '화', '수', '목', '금', '토', '일'];
  var IX = { '다이나믹': '새로 여는 점포와 닫는 점포가 모두 많아 변화가 빠른 흐름', '상권확장': '신규 점포를 중심으로 상권이 넓어지는 흐름', '정체': '점포 교체가 적고 기존 점포가 오래 유지되는 흐름', '상권축소': '새로 들어온 점포가 오래 버티기 어려운 흐름' };
  function renderSeoul() {
    var el = $('#azSeoulB'); if (!S.loc) return;
    if (S.seoulIdx === undefined) { el.innerHTML = '<p class="az-p">서울 상권 데이터를 확인하고 있습니다…</p>'; return; }
    var reg = S.loc.region || {}, inSeoul = /^서울/.test(reg.sido || '') || S.seoulCand.length > 0;
    if (!S.seoulIdx) {
      el.innerHTML = empty('서울 상권 지표는 분기 데이터 연결을 마무리하고 있습니다', '유동인구·배후인구·업종별 추정매출 지표가 이 자리에 표시될 예정입니다. 지금 필요하시면 ' + CONSULT + '으로 요청해 주세요.', 'clock');
      return;
    }
    if (!S.seoulCand.length) {
      el.innerHTML = empty(inSeoul ? '반경 안에 서울시 지정 상권이 없습니다' : '서울시 상권분석서비스 지표는 서울만 제공됩니다',
        inSeoul ? '서울시 상권분석서비스는 1,600여 개 상권 단위로 집계합니다. 반경을 넓히면 가까운 상권이 잡힐 수 있습니다.' : '다른 지역은 상담 시 해당 지자체 공개 자료와 현장 조사로 보완해 드립니다.', 'map');
      return;
    }
    var cand = '<div class="az-trdar" role="group" aria-label="서울 상권 선택">' + S.seoulCand.map(function (c) {
      return '<button type="button" data-cd="' + esc(c.cd) + '" aria-pressed="' + (c.cd === S.seoulCd ? 'true' : 'false') + '">' + esc(c.nm) + '<small>' + esc(c.se) + ' · ' + (c.d < 60 ? '바로 이 위치' : mlabel(c.d)) + (c.far ? ' (반경 밖)' : '') + '</small></button>';
    }).join('') + '</div>';
    var t = S.seoulT;
    if (t === null) { el.innerHTML = cand + '<p class="az-p">상권 지표를 불러오고 있습니다…</p>'; bindTrdar(el); return; }
    if (t === false) { el.innerHTML = cand + empty('이 상권의 지표 파일을 불러오지 못했습니다', '잠시 뒤 다시 시도해 주세요.'); bindTrdar(el); return; }
    var N = nf(S.seoulIdx.t.length), p = t.p || {};
    var fac = t.fac && t.fac.items ? Object.keys(t.fac.items).sort(function (a, b) { return t.fac.items[b] - t.fac.items[a]; }).slice(0, 3).map(function (k) { return k + ' ' + t.fac.items[k]; }).join(' · ') : '';
    var popTxt = (t.res ? '상주 ' + nf(t.res.tot) + '명' : '') + (t.res && t.wrc ? ' + ' : '') + (t.wrc ? '직장 ' + nf(t.wrc.tot) + '명' : '');
    var html = cand +
      '<p class="az-p" style="margin-bottom:14px"><b>' + esc(t.nm) + '</b> · ' + esc(t.se) + ' · ' + esc([t.gu, t.dong].filter(Boolean).join(' ')) + (t.area ? ' · 면적 ' + nf(t.area / 1e6, 2) + '㎢' : '') + ' · ' + esc(t.qDesc) + ' 기준' +
      (t.ix && t.ix.nm ? ' &nbsp;<span class="az-ix" title="' + esc(IX[t.ix.nm] || '') + '">상권변화지표 · ' + esc(t.ix.nm) + '</span>' : '') + '</p>' +
      (t.ix && IX[t.ix.nm] ? '<p class="az-muted" style="margin:-6px 0 14px">상권변화지표 ‘' + esc(t.ix.nm) + '’: ' + IX[t.ix.nm] + '입니다. 점포의 평균 운영 기간과 폐업 점포의 평균 영업 기간을 서울 평균과 비교해 네 유형으로 나눈 것입니다.</p>' : '') +
      '<div class="az-gauges">' +
      gauge('유동인구', p.foot, '서울 상권 ' + N + '곳 중 상대 위치') +
      gauge('배후인구 (상주+직장)', p.pop, popTxt) +
      gauge('집객시설', p.fac, t.fac ? '시설 ' + nf(t.fac.tot) + '곳' + (fac ? ' · ' + esc(fac) : '') : '') +
      '</div>';
    if (t.foot) {
      html += '<div class="az-cols3" style="margin-top:14px">' +
        '<div class="az-box"><h4>시간대별 유동인구</h4>' + mini(t.foot.tm, TM) + '</div>' +
        '<div class="az-box"><h4>요일별 유동인구</h4>' + mini(t.foot.dow, DW) + '</div>' +
        '<div class="az-box"><h4>연령대별 유동인구</h4>' + mini(t.foot.age, AG) + '</div></div>';
    }
    // 업종
    var u = seoulUCode(), ind = S.seoulIdx.induty || {};
    var opts = Object.keys(t.u || {}).filter(function (k) { return t.u[k][0]; }).sort(function (a, b) { return (t.u[b][0][1] || 0) - (t.u[a][0][1] || 0); });
    html += '<h4 class="az-sub" style="margin-top:26px">업종별 지표</h4><div class="az-pick"><label for="azSelU">서울시 업종</label><select id="azSelU" class="az-sel"><option value="">업종 고르기</option>' +
      opts.map(function (k) { return '<option value="' + esc(k) + '"' + (k === u ? ' selected' : '') + '>' + esc(ind[k] || k) + ' (' + nf(t.u[k][0][1]) + ')</option>'; }).join('') + '</select></div>';
    if (u && t.u[u]) html += seoulIndustry(t, u, ind[u] || u);
    else html += empty('업종을 고르면 매출·개폐업 지표가 나타납니다', S.kw ? '‘' + esc(S.kw) + '’에 맞는 서울시 업종 분류를 찾지 못했습니다. 위 목록에서 가장 가까운 업종을 골라 주세요.' : '서울시 상권분석서비스의 업종 분류(외식·서비스·소매 100여 개) 기준입니다.');
    // 업종 기회표
    html += opportunity(t, ind);
    html += '<p class="az-muted">' + esc(S.seoulIdx.note || '') + ' 백분위는 같은 업종이 있는 서울 상권끼리 비교한 값입니다.</p>';
    el.innerHTML = html;
    bindTrdar(el);
    var su = $('#azSelU', el);
    if (su) su.addEventListener('change', function () { S.seoulU = su.value || null; renderSeoul(); });
  }
  function bindTrdar(el) {
    $$('.az-trdar button', el).forEach(function (b) { b.addEventListener('click', function () { if (b.getAttribute('data-cd') !== S.seoulCd) pickTrdar(b.getAttribute('data-cd'), S.token); }); });
  }
  function seoulIndustry(t, u, name) {
    var e = t.u[u], st = e[0] || [], sl = e[1], ta = e[2] || [], ts = e[3] || [], pp = e[4] || [];
    var similr = st[1] || 0, q = sl ? sl[0] : null;
    var perStore = q != null && similr ? q / 3 / similr : null;
    var h = '<div class="az-stats">' +
      '<div class="az-stat"><div class="l">' + esc(name) + ' 점포</div><div class="v">' + nf(similr) + '<small>곳</small></div><div class="s">프랜차이즈 ' + nf(st[2]) + '곳 포함 · 유사업종 기준</div></div>' +
      '<div class="az-stat"><div class="l">개업률 · 폐업률</div><div class="v">' + pf(st[4]) + ' <small>/</small> ' + pf(st[6]) + '</div><div class="s">분기 개업 ' + nf(st[3]) + ' · 폐업 ' + nf(st[5]) + '곳</div></div>' +
      '<div class="az-stat"><div class="l">상권 내 월 추정매출</div><div class="v">' + (q != null ? won(q / 3) : '-') + '</div><div class="s">분기 ' + (q != null ? won(q) : '-') + ' ÷ 3</div></div>' +
      '<div class="az-stat"><div class="l">점포당 월 추정매출</div><div class="v">' + (perStore != null ? won(perStore) : '-') + '</div><div class="s">카드결제 기반 추정 · 참고용</div></div>' +
      '</div>';
    h += '<div class="az-gauges" style="margin-top:12px">' +
      gauge('경쟁 밀도', pp[0], '면적당 같은 업종 점포 수 · 높을수록 촘촘함') +
      gauge('점포당 매출', pp[1], '점포 한 곳당 추정매출 기준') +
      gauge('영업 안정성', pp[2], '폐업률이 낮을수록 높게 나옵니다') + '</div>';
    var qs = (t.qs || []).slice(0, 4).reverse(), taR = ta.slice(0, 4).reverse(), tsR = ts.slice(0, 4).reverse();
    h += '<div class="az-cols3" style="margin-top:14px">' +
      '<div class="az-box"><h4>분기별 추정매출 흐름</h4>' + mini(taR, qs.map(qShort), { raw: function (v) { return v ? nf(v / 10000, 1) + '억' : '-'; } }) + '<p class="az-p">점포 수: ' + tsR.map(function (v) { return v == null ? '-' : nf(v); }).join(' → ') + '</p></div>';
    if (sl) {
      h += '<div class="az-box"><h4>시간대별 매출 비중</h4>' + mini(sl.slice(4, 10), TM) + '<p class="az-p">주중 ' + pf(pct(sl[2], sl[2] + sl[3]), 0) + ' · 주말 ' + pf(pct(sl[3], sl[2] + sl[3]), 0) + '</p></div>' +
        '<div class="az-box"><h4>연령대별 매출 비중</h4>' + mini(sl.slice(10, 16), AG) + '<p class="az-p">남성 ' + pf(pct(sl[16], sl[16] + sl[17]), 0) + ' · 여성 ' + pf(pct(sl[17], sl[16] + sl[17]), 0) + '</p></div>';
    } else h += '<div class="az-box"><h4>매출 구성</h4><p class="az-p">이 업종은 이번 분기 추정매출이 공개되지 않았습니다.</p></div>';
    return h + '</div>';
  }
  function opportunity(t, ind) {
    var rows = [];
    Object.keys(t.u || {}).forEach(function (k) {
      var e = t.u[k], st = e[0], pp = e[4] || [];
      if (!st || st[1] < 3 || pp[0] == null || pp[1] == null) return;
      rows.push({ k: k, n: ind[k] || k, c: st[1], comp: pp[0], sales: pp[1], stab: pp[2], cl: st[6], s: pp[1] - pp[0] });
    });
    if (rows.length < 3) return '';
    rows.sort(function (a, b) { return b.s - a.s; });
    var open = S.mode === 'owner';
    return '<details class="az-box" style="margin-top:16px"' + (open ? ' open' : '') + '><summary style="cursor:pointer;font-weight:800;color:var(--navy);font-size:14px">' + (open ? '업종 1차 검토표 — 유치 후보 업종' : '업종 1차 검토표 — 점포당 매출 대비 경쟁이 덜한 업종') + '</summary>' +
      '<p class="az-p" style="margin:8px 0 10px">점포당 추정매출 백분위가 높고 경쟁 밀도 백분위가 낮은 순서로 정리했습니다. 업종을 정하기 전 후보를 좁히는 용도이며, 실제 유치 가능성은 면적·층·설비 조건과 함께 따져야 합니다.</p>' +
      '<div class="az-tbl"><table><thead><tr><th>업종</th><th class="num">점포 수</th><th class="num">점포당 매출</th><th class="num">경쟁 밀도</th><th class="num">폐업률</th></tr></thead><tbody>' +
      rows.slice(0, 8).map(function (r) { return '<tr><td>' + esc(r.n) + '</td><td class="num">' + nf(r.c) + '</td><td class="num">' + (tops(r.sales) || '-') + '</td><td class="num">' + (tops(r.comp) || '-') + '</td><td class="num">' + pf(r.cl) + '</td></tr>'; }).join('') +
      '</tbody></table></div></details>';
  }

  /* 임대료·비용 */
  var FLOORS = [['-1', '지하'], ['1', '1층'], ['2', '2층'], ['3', '3층'], ['4', '4층'], ['5', '5층'], ['6+', '6층 이상']];
  var LAW = [
    { k: 'seoul', n: '서울특별시', v: 90000 },
    { k: 'metro', n: '과밀억제권역(서울 제외)·부산', v: 69000 },
    { k: 'city', n: '광역시(과밀억제권역·군 지역 제외)·세종·파주·화성·안산·용인·김포·광주(경기)', v: 54000 },
    { k: 'etc', n: '그 밖의 지역', v: 37000 }
  ];
  function lawDefault() {
    var sd = sidoShort((S.loc.region || {}).sido);
    if (sd === '서울') return 'seoul';
    if (sd === '부산') return 'metro';
    if (sd === '인천' || sd === '경기') return '';
    if (['대구', '광주', '대전', '울산', '세종'].indexOf(sd) >= 0) return /군$/.test((S.loc.region || {}).sgg || '') ? 'etc' : 'city';
    return sd ? 'etc' : '';
  }
  var sim = { area: '', floor: '1', dep: '', rent: '', fee: '', sales: '', ratio: '', law: '', lawManual: false };
  function renderRent() {
    var el = $('#azRentB'); if (!S.loc) return;
    if (!sim.lawManual) sim.law = lawDefault();
    var R = S.rone, cur = roneCur(), h = '';
    if (S.rone === undefined) h += '<p class="az-p">임대동향 데이터를 확인하고 있습니다…</p>';
    else if (!R) h += empty('층별 임대료 참고값은 데이터 연결을 마무리하고 있습니다', '아래 계산기는 지금도 쓸 수 있습니다. 같은 상권의 실제 임대 사례는 상담에서 확인해 드립니다.', 'clock');
    else {
      var sd = sidoShort((S.loc.region || {}).sido), list = roneList();
      var groups = {};
      list.forEach(function (o, i) { if (sd && (o.e.full || '').split('>')[0] !== sd) return; (groups[o.type] = groups[o.type] || []).push('<option value="' + i + '"' + (S.roneSel && S.roneSel.i === i ? ' selected' : '') + '>' + esc((o.e.full || o.e.nm).split('>').slice(1).join(' › ') || o.e.nm) + '</option>'); });
      h += '<div class="az-pick"><label for="azSelR">비교할 조사 상권</label><select id="azSelR" class="az-sel"><option value="">상권 고르기</option>' +
        Object.keys(groups).map(function (g) { return '<optgroup label="' + esc(g) + '">' + groups[g].join('') + '</optgroup>'; }).join('') + '</select>' +
        (cur && !S.roneSel.manual ? '<span class="az-muted" style="margin:0">위치와 가장 가까워 보이는 조사 상권을 골랐습니다. 다르면 바꿔 주세요.</span>' : '') + '</div>';
      if (cur) {
        var e = cur.e, fl = FLOORS.filter(function (f) { return e.rent[f[0]] != null; });
        h += '<div class="az-tbl"><table><thead><tr><th>' + esc(cur.type) + ' · ' + esc(e.nm) + '</th>' + fl.map(function (f) { return '<th class="num">' + f[1] + '</th>'; }).join('') + '</tr></thead><tbody>' +
          '<tr><td>월 임대료 (' + esc(R.unit || '천원/㎡') + ')</td>' + fl.map(function (f) { return '<td class="num' + (f[0] === sim.floor ? ' hl' : '') + '">' + nf(e.rent[f[0]], 1) + '</td>'; }).join('') + '</tr>' +
          (Object.keys(e.util || {}).length ? '<tr><td>층별 효용비율 (1층=100)</td>' + fl.map(function (f) { return '<td class="num">' + (e.util[f[0]] != null ? nf(e.util[f[0]], 1) : '-') + '</td>'; }).join('') + '</tr>' : '') +
          '</tbody></table></div>' +
          '<p class="az-muted">공실률 ' + (e.vac != null ? '<b style="color:var(--navy)">' + nf(e.vac, 1) + '%</b>' : '자료 없음') + ' · ' + esc(R.desc || '') + ' 기준 · ' + esc(R.note || '') + '</p>';
      } else h += empty('비교할 조사 상권을 골라 주세요', '한국부동산원 임대동향조사는 표본 상권 단위로 집계합니다. 위치와 가까운 상권을 목록에서 고르면 층별 임대료가 표시됩니다.');
    }
    // 계산기
    var lawOpts = '<option value="">지역 고르기</option>' + LAW.map(function (l) { return '<option value="' + l.k + '"' + (sim.law === l.k ? ' selected' : '') + '>' + esc(l.n) + ' · ' + won(l.v) + '</option>'; }).join('');
    h += '<h4 class="az-sub" style="margin-top:26px">임대 조건 점검</h4>' +
      '<p class="az-p">검토 중인 점포의 조건을 넣어 보세요. 임대료 비율의 적정선은 업종과 운영 방식마다 달라서 기본값을 넣어 두지 않았습니다.</p>' +
      '<div class="az-sim"><form id="azSim" onsubmit="return false">' +
      '<div class="frow"><div class="field"><label for="azA">전용면적</label><div class="az-unit"><input id="azA" inputmode="decimal" value="' + esc(sim.area) + '" placeholder="예: 66"><em>㎡</em></div><p class="hint" id="azAp">&nbsp;</p></div>' +
      '<div class="field"><label for="azF">층</label><select id="azF">' + FLOORS.map(function (f) { return '<option value="' + f[0] + '"' + (sim.floor === f[0] ? ' selected' : '') + '>' + f[1] + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="frow"><div class="field"><label for="azD">보증금</label><div class="az-unit"><input id="azD" inputmode="numeric" value="' + esc(sim.dep) + '" placeholder="예: 5000"><em>만원</em></div></div>' +
      '<div class="field"><label for="azR">월 임대료</label><div class="az-unit"><input id="azR" inputmode="numeric" value="' + esc(sim.rent) + '" placeholder="부가세 별도"><em>만원</em></div></div></div>' +
      '<div class="frow"><div class="field"><label for="azM">월 관리비</label><div class="az-unit"><input id="azM" inputmode="numeric" value="' + esc(sim.fee) + '"><em>만원</em></div></div>' +
      '<div class="field"><label for="azS">예상 월매출 <small style="font-weight:600;color:var(--slate2)">(선택)</small></label><div class="az-unit"><input id="azS" inputmode="numeric" value="' + esc(sim.sales) + '"><em>만원</em></div></div></div>' +
      '<div class="frow"><div class="field"><label for="azT">목표 임대료 비율 <small style="font-weight:600;color:var(--slate2)">(선택)</small></label><div class="az-unit"><input id="azT" inputmode="decimal" value="' + esc(sim.ratio) + '" placeholder="직접 입력"><em>%</em></div></div>' +
      '<div class="field"><label for="azW">환산보증금 기준 지역</label><select id="azW">' + lawOpts + '</select></div></div>' +
      '</form><div class="az-out" id="azOut"></div></div>';
    el.innerHTML = h;
    var sr = $('#azSelR', el);
    if (sr) sr.addEventListener('change', function () { S.roneSel = sr.value === '' ? null : { i: +sr.value, manual: true }; renderRent(); renderKpis(); renderSummary(); });
    var f = $('#azSim', el);
    f.addEventListener('input', function () { readSim(); calcSim(); });
    f.addEventListener('change', function () { readSim(); calcSim(); renderRentTableHl(); });
    calcSim();
  }
  function renderRentTableHl() {
    var cur = roneCur(); if (!cur) return;
    var fl = FLOORS.filter(function (f) { return cur.e.rent[f[0]] != null; });
    var row = $('#azRentB .az-tbl tbody tr'); if (!row) return;
    $$('td.num', row).forEach(function (td, i) { td.classList.toggle('hl', fl[i] && fl[i][0] === sim.floor); });
  }
  function num(v) { v = String(v || '').replace(/[,\s]/g, ''); var n = parseFloat(v); return isFinite(n) && n >= 0 ? n : null; }
  function readSim() {
    sim.area = $('#azA').value; sim.floor = $('#azF').value; sim.dep = $('#azD').value; sim.rent = $('#azR').value; sim.fee = $('#azM').value;
    sim.sales = $('#azS').value; sim.ratio = $('#azT').value;
    if ($('#azW').value !== sim.law) { sim.law = $('#azW').value; sim.lawManual = true; }
  }
  function calcSim() {
    var out = $('#azOut'); if (!out) return;
    var a = num(sim.area), d = num(sim.dep), r = num(sim.rent), m = num(sim.fee) || 0, s = num(sim.sales), t = num(sim.ratio);
    $('#azAp').textContent = a ? '약 ' + nf(a / 3.3058, 1) + '평' : ' ';
    var cur = roneCur(), ref = cur && cur.e.rent[sim.floor] != null ? cur.e.rent[sim.floor] : null;
    var rows = [];
    function row(l, v, sub, cls) { rows.push('<div class="r' + (cls ? ' ' + cls : '') + '"><span>' + l + '</span><b>' + v + (sub ? '<small>' + sub + '</small>' : '') + '</b></div>'); }
    if (ref != null && a) row('조사 상권 표본 평균으로 본 월 임대료', '약 ' + won(a * ref / 10), esc(cur.e.nm) + ' ' + floorName(sim.floor) + ' ㎡당 ' + nf(ref, 1) + '천 원 기준');
    if (r != null && a) {
      var my = r * 10 / a;
      row('입력한 임대료의 ㎡당 금액', nf(my, 1) + '천 원', ref != null ? '표본 평균의 ' + nf(my / ref * 100, 0) + '% 수준' : '', ref != null ? 'hl' : '');
    }
    if (r != null) {
      row('월 점유비용 (임대료+관리비)', won(r + m), '연 ' + won((r + m) * 12));
      if (s) row('매출 대비 점유비용', pf((r + m) / s * 100), '예상 월매출 ' + won(s) + ' 기준', 'hl');
      if (t) row('목표 비율을 맞추는 데 필요한 월매출', won((r + m) / (t / 100)), '점유비용 ÷ ' + nf(t, 1) + '%', 'hl');
    }
    var lawTxt = '';
    if (d != null && r != null) {
      var conv = d + r * 100, law = LAW.filter(function (l) { return l.k === sim.law; })[0];
      row('환산보증금 (보증금 + 월세×100)', won(conv), law ? (conv <= law.v ? '기준 ' + won(law.v) + ' 이내' : '기준 ' + won(law.v) + ' 초과') : '지역을 고르면 기준과 비교합니다', law ? 'hl' : '');
      if (law) lawTxt = '<div class="az-law"><b>' + (conv <= law.v ? '환산보증금이 기준 이내입니다.' : '환산보증금이 기준을 넘습니다.') + '</b> 기준을 넘으면 우선변제권, 차임 증액 상한(5%) 같은 일부 보호 규정이 적용되지 않습니다. 대항력, 계약갱신요구권, 권리금 회수기회 보호는 금액과 관계없이 적용됩니다. 기준 금액은 상가건물 임대차보호법 시행령(2019. 4. 2. 시행) 기준이며, 계약 전 최신 법령과 개별 사정은 전문가와 확인해 주세요.</div>';
      else if (!sim.law && sidoShort((S.loc.region || {}).sido) && /인천|경기/.test(sidoShort(S.loc.region.sido))) lawTxt = '<div class="az-law">인천·경기는 시·군과 동에 따라 과밀억제권역 여부가 달라 기준 금액이 다릅니다. 해당 지역을 직접 골라 주세요.</div>';
    }
    if (ref != null && r != null && a) lawTxt += '<p class="az-muted" style="margin:10px 2px 6px">부동산원 임대료는 보증금 반영 방식과 면적 기준이 개별 계약과 다를 수 있어, 표본 평균과의 비교는 대략적인 수준으로만 봐 주세요.</p>';
    if (!rows.length) rows.push('<p class="az-p" style="padding:10px 0 12px">면적·보증금·임대료를 넣으면 ㎡당 금액, 월 점유비용, 환산보증금이 계산됩니다.' + (ref != null ? ' 면적만 넣어도 조사 상권 표본 평균 기준 임대료를 볼 수 있습니다.' : '') + '</p>');
    out.innerHTML = rows.join('') + lawTxt;
  }
  function floorName(k) { var f = FLOORS.filter(function (x) { return x[0] === k; })[0]; return f ? f[1] : ''; }

  /* 실거래 */
  function dealRows() {
    var j = S.deals; if (!j || !j.deals) return [];
    var f = j.fields || [];
    return j.deals.map(function (d) { var o = {}; f.forEach(function (k, i) { o[k] = d[i]; }); return o; });
  }
  function median(a) { if (!a.length) return null; a = a.slice().sort(function (x, y) { return x - y; }); var m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
  function renderDeal() {
    var el = $('#azDealB'); if (!S.loc) return;
    if (S.dealsErr) {
      var c = S.dealsErr.code;
      el.innerHTML = c === 'NO_KEY' || c === 'NOT_FOUND' ? empty('실거래 데이터는 연결을 마무리하고 있습니다', '국토교통부 상업업무용 부동산 매매 신고 자료가 이 자리에 표시됩니다.', 'clock')
        : c === 'NO_REGION' ? empty('시군구를 확인하지 못해 실거래를 불러오지 못했습니다', '주소로 다시 검색해 주세요.')
          : empty('실거래 데이터를 불러오지 못했습니다', errText(S.dealsErr));
      return;
    }
    if (!S.deals) { el.innerHTML = '<p class="az-p">최근 12개월 신고 자료를 불러오고 있습니다…</p>'; return; }
    var all = dealRows(), reg = S.loc.region || {}, dong = reg.dong || '';
    var same = dong ? all.filter(function (d) { return d.umd === dong; }) : [];
    var useSame = S.dealSame && same.length > 0, rows = useSame ? same : all;
    var per = rows.filter(function (d) { return d.bldAr > 0 && d.amtManwon > 0 && !d.share; }).map(function (d) { return d.amtManwon / d.bldAr; });
    var months = (S.deals.months || []).slice().reverse(), by = {};
    rows.forEach(function (d) { by[d.ym] = (by[d.ym] || 0) + 1; });
    var h = '<div class="az-pick" role="group" aria-label="범위">' +
      (dong ? '<div class="az-seg"><label><input type="radio" name="azDs" value="1"' + (useSame ? ' checked' : '') + (same.length ? '' : ' disabled') + '><span>' + esc(dong) + '만</span></label><label><input type="radio" name="azDs" value="0"' + (useSame ? '' : ' checked') + '><span>' + esc(reg.sgg || '시군구') + ' 전체</span></label></div>' : '') +
      '<span class="az-muted" style="margin:0">최근 12개월 · 해제된 거래 ' + nf(S.deals.cancelled || 0) + '건 제외</span></div>';
    if (!rows.length) {
      el.innerHTML = h + empty('최근 12개월 신고된 상업업무용 매매가 없습니다', '거래가 드문 지역은 기간을 넓히거나 인근 시군구와 함께 보는 것이 좋습니다.');
      bindDeal(el); return;
    }
    h += '<div class="az-stats">' +
      '<div class="az-stat"><div class="l">거래 건수</div><div class="v">' + nf(rows.length) + '<small>건</small></div><div class="s">' + (useSame ? esc(dong) : esc(reg.sgg || '시군구')) + ' · 12개월</div></div>' +
      '<div class="az-stat"><div class="l">중위 거래금액</div><div class="v">' + won(median(rows.map(function (d) { return d.amtManwon; }))) + '</div><div class="s">지분 거래 포함</div></div>' +
      '<div class="az-stat"><div class="l">건물면적 ㎡당 중위</div><div class="v">' + (per.length ? won(median(per)) : '-') + '</div><div class="s">지분 거래 제외 ' + nf(per.length) + '건</div></div>' +
      '<div class="az-stat"><div class="l">가장 최근 계약</div><div class="v" style="font-size:18px">' + esc(ymLabel(rows[0].ym)) + ' ' + esc(rows[0].day || '') + '일</div><div class="s">' + esc(rows[0].umd || '') + ' · ' + esc(rows[0].use || rows[0].type || '') + '</div></div>' +
      '</div>';
    h += '<div class="az-box" style="margin-top:12px"><h4>월별 신고 건수</h4>' + mini(months.map(function (m) { return by[m] || 0; }), months.map(function (m) { return (+String(m).slice(4)) + '월'; }), { raw: function (v) { return v ? String(v) : ''; }, hl: false }) + '</div>';
    h += '<div class="az-tbl" style="margin-top:12px"><table><thead><tr><th>계약</th><th>법정동</th><th>지번</th><th>유형</th><th>용도</th><th class="num">층</th><th class="num">거래금액</th><th class="num">건물면적</th><th class="num">㎡당</th><th class="num">건축</th><th>구분</th></tr></thead><tbody>' +
      rows.slice(0, 20).map(function (d) {
        return '<tr><td>' + esc(String(d.ym).slice(2, 4) + '.' + String(d.ym).slice(4) + '.' + (d.day ? String(d.day).padStart(2, '0') : '')) + '</td><td>' + esc(d.umd) + '</td><td>' + esc(d.jibun || '-') + '</td><td>' + esc(d.type || '-') + '</td><td>' + esc(d.use || '-') + '</td><td class="num">' + esc(d.floor ? (/^-/.test(d.floor) ? '지하' + d.floor.slice(1) : d.floor) : '-') + '</td><td class="num">' + won(d.amtManwon) + '</td><td class="num">' + (d.bldAr ? nf(d.bldAr, 1) + '㎡' : '-') + '</td><td class="num">' + (d.bldAr && !d.share ? won(d.amtManwon / d.bldAr) : '-') + '</td><td class="num">' + esc(d.buildYear || '-') + '</td><td>' + esc([d.dealing, d.share ? '지분' : ''].filter(Boolean).join(' · ') || '-') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="az-muted">국토교통부 신고 자료입니다. 개인정보 보호를 위해 지번은 일부만 공개되고, 집합건물은 전유부분 거래가 포함됩니다. 건물 유형과 면적이 서로 달라 금액을 바로 비교하기보다는 거래 흐름을 보는 용도로 써 주세요.' + (S.deals.failed && S.deals.failed.length ? ' 일부 월(' + S.deals.failed.length + '개월)은 불러오지 못했습니다.' : '') + '</p>';
    el.innerHTML = h; bindDeal(el);
  }
  function bindDeal(el) { $$('input[name=azDs]', el).forEach(function (i) { i.addEventListener('change', function () { S.dealSame = i.value === '1'; renderDeal(); }); }); }

  /* 체크리스트 */
  var CHECK = {
    open: [
      ['출입구와 간판', '양쪽 50m 떨어진 곳에서 출입구와 간판 자리가 보이는지'],
      ['시간대별 통행', '평일 점심·저녁, 주말 오후에 각각 10분씩 지나가는 사람 수 세어 보기'],
      ['동종 점포', '가까운 경쟁점의 영업시간, 가격대, 피크 시간 대기 줄'],
      ['동선 연결', '지하철 출구·버스정류장·대형 매장에서 오는 길이 끊기지 않는지'],
      ['전면 폭과 층고', '외부 노출에 필요한 전면 길이, 천장 높이, 기둥 위치'],
      ['설비 조건', '전기 용량, 급배수, 배기·덕트, 가스 인입 가능 여부'],
      ['용도와 인허가', '건축물대장상 용도로 영업신고가 가능한지, 위반건축물 표시는 없는지'],
      ['임대 조건', '보증금·월세·관리비 포함 항목, 렌트프리, 인테리어 공사 기간'],
      ['권리금과 시설', '기존 시설 상태와 권리금 산정 근거, 원상복구 범위'],
      ['권리관계', '등기부 소유자, 근저당 금액, 선순위 임차인 여부']
    ],
    owner: [
      ['공실 층의 노출', '외부에서 보이는 간판 자리, 엘리베이터·계단 접근성'],
      ['비슷한 층의 시세', '같은 상권 비슷한 층의 호가와 실제 계약 수준, 공실 기간'],
      ['현재 임차 구성', '건물 안 업종이 서로 손님을 나눠 갖는지, 모아 주는지'],
      ['배후 수요', '상주·직장 인구와 시간대별 유동에 맞는 업종군'],
      ['설비 여건', '전기 용량, 급배수, 배기, 주차와 하역 공간'],
      ['용도 변경', '유치하려는 업종에 맞는 건축물대장 용도와 인허가 조건'],
      ['조건 경쟁력', '렌트프리, 인테리어 지원 같은 조건이 주변과 비교해 어떤지'],
      ['운영형 대안', '장기 공실이라면 공간대여·무인 서비스 같은 운영형 모델 검토'],
      ['계약 리스크', '원상복구, 권리금, 갱신 조건에서 생길 수 있는 분쟁'],
      ['관리 상태', '관리비 구성, 청소·보안·하자 관리 수준']
    ]
  };
  function renderCheck() {
    var el = $('#azCheckB'); if (!S.loc) return;
    var list = CHECK[S.mode] || CHECK.open;
    el.innerHTML = '<p class="az-p" style="margin-bottom:12px">' + (S.mode === 'owner' ? '임차인을 찾기 전에 건물 쪽에서 먼저 정리해 두면 협상이 빨라지는 항목입니다.' : '데이터로는 보이지 않지만 계약 전에 반드시 눈으로 확인해야 하는 항목입니다.') + ' 리포트로 저장하면 현장에서 그대로 체크할 수 있습니다.</p>' +
      '<ul class="az-checks">' + list.map(function (c, i) { return '<li><label><input type="checkbox" id="azC' + i + '"><span><b>' + esc(c[0]) + '</b> — ' + esc(c[1]) + '</span></label></li>'; }).join('') + '</ul>';
  }

  /* 요약 문장 */
  function summaryText() {
    var L = S.loc, A = S.agg, st = S.stores, out = [];
    if (!L) return '';
    var place = placeName();
    if (A && st) {
      out.push('‘' + esc(place) + '’ 반경 ' + rlabel(S.r) + ' 안에는 점포 <b>' + nf(st.total) + '곳</b>이 있습니다.');
      var a = A.L[0], b = A.L[1];
      if (a) out.push('업종은 ' + esc(josa(st.cats.L[a[0]] || a[0], '이', '가')) + ' ' + pf(pct(a[1], A.n), 0) + '로 가장 많고' + (b ? ', ' + esc(josa(st.cats.L[b[0]] || b[0], '이', '가')) + ' ' + pf(pct(b[1], A.n), 0) + '로 뒤를 잇습니다.' : ' 그 밖의 업종은 많지 않습니다.'));
      if (S.sel) {
        var it = selItems().sort(function (x, y) { return x.d - y.d; });
        if (it.length) out.push('관심 업종 ' + qj(S.sel.label, '은', '는') + ' <b>' + nf(st.partial ? it.length * st.total / Math.max(A.n, 1) : it.length) + '곳</b>' + (st.partial ? '(추정)' : '') + '이고, 가장 가까운 곳은 약 ' + mlabel(it[0].d) + ' 떨어져 있습니다.');
        else out.push('관심 업종 ' + qj(S.sel.label, '은', '는') + ' 반경 안에서 찾지 못했습니다.');
      }
    } else if (L) out.push('‘' + esc(place) + '’ 중심 반경 ' + rlabel(S.r) + ' 범위를 정리했습니다.');
    var t = S.seoulT;
    if (t && t.p && t.p.foot != null) out.push('가까운 서울 상권 ‘' + esc(t.nm) + '’의 유동인구는 서울 상권 가운데 ' + tops(t.p.foot) + ' 수준입니다.');
    var rc = roneCur();
    if (rc && rc.e.rent['1'] != null && S.mode === 'owner') out.push('부동산원 임대동향 기준 ‘' + esc(rc.e.nm) + '’ 상권의 1층 임대료는 ㎡당 월 ' + nf(rc.e.rent['1'], 1) + '천 원' + (rc.e.vac != null ? ', 공실률은 ' + nf(rc.e.vac, 1) + '%' : '') + '입니다.');
    return out.join(' ');
  }
  function renderSummary() { var el = $('#azSummary'); if (el) el.innerHTML = S.loc ? summaryText() : ''; }

  /* 출처 */
  function renderSources() {
    var list = [], st = S.stores;
    list.push('소상공인시장진흥공단 「상가(상권)정보」 · 공공데이터포털 오픈API' + (st && st.stdr ? ' · ' + ymLabel(st.stdr) + ' 기준' : ''));
    if (S.zones && S.zones.length) list.push('주요상권 경계: 소상공인시장진흥공단 「상가(상권)정보」 주요상권');
    if (S.seoulIdx) list.push('서울특별시 「서울시 상권분석서비스」 · 서울 열린데이터광장 · ' + esc(S.seoulIdx.qDesc || '') + ' 기준 · 공공누리 제1유형');
    if (S.rone) list.push('한국부동산원 「상업용부동산 임대동향조사」 · R-ONE · ' + esc(S.rone.desc || '') + ' 기준');
    if (S.deals) list.push('국토교통부 「상업업무용 부동산 매매 실거래가」 · 공공데이터포털 · 최근 12개월 신고분(' + today() + ' 조회)');
    list.push(S.kakao ? '지도·주소 검색: 카카오맵' : '분포도: 오르비스 자체 작성(공공데이터 좌표 기준)');
    $('#azSrcList').innerHTML = list.map(function (s) { return '<li>' + s + '</li>'; }).join('');
    $$('.az-src[data-src]').forEach(function (p) {
      var k = p.getAttribute('data-src');
      p.textContent = k === 'stores' ? '소상공인시장진흥공단 상가(상권)정보' + (st && st.stdr ? ' · ' + ymLabel(st.stdr) : '')
        : k === 'seoul' ? '서울시 상권분석서비스' + (S.seoulIdx ? ' · ' + (S.seoulIdx.qDesc || '') : '')
          : k === 'rone' ? '한국부동산원 상업용부동산 임대동향조사' + (S.rone ? ' · ' + (S.rone.desc || '') : '')
            : '국토교통부 상업업무용 실거래가 · 최근 12개월';
    });
  }

  /* ───────────── 비교 ───────────── */
  var CK = 'orbis_az_compare_v1';
  function cmpLoad() { if (!LS) return []; try { var a = JSON.parse(LS.getItem(CK) || '[]'); return Array.isArray(a) ? a.slice(0, 3) : []; } catch (e) { return []; } }
  function cmpSave(a) { if (!LS) return false; try { LS.setItem(CK, JSON.stringify(a.slice(0, 3))); return true; } catch (e) { return false; } }
  function snapshot() {
    var L = S.loc, A = S.agg, st = S.stores, it = S.sel ? selItems().sort(function (x, y) { return x.d - y.d; }) : [], t = S.seoulT, rc = roneCur();
    return {
      id: Date.now(), label: placeName(), addr: L.addr || '', lon: L.lon, lat: L.lat, r: S.r, kw: S.kw, mode: S.mode, at: today(),
      k: {
        total: st ? st.total : null, dens: A && st ? st.total / A.area : null, top: A && A.L[0] ? (st.cats.L[A.L[0][0]] || '') + ' ' + pf(pct(A.L[0][1], A.n), 0) : null,
        f1: A ? A.f1 : null, br: A ? A.br : null,
        kwN: S.sel ? (st && st.partial ? Math.round(it.length * st.total / Math.max(A.n, 1)) : it.length) : null, kwD: it.length ? it[0].d : null,
        tr: t ? t.nm : null, foot: t && t.p ? t.p.foot : null, pop: t && t.p ? t.p.pop : null, fac: t && t.p ? t.p.fac : null,
        rent1: rc && rc.e.rent['1'] != null ? rc.e.rent['1'] : null, rentNm: rc ? rc.e.nm : null, vac: rc ? rc.e.vac : null,
        deals: S.deals && S.deals.count != null ? S.deals.count : null
      }
    };
  }
  function renderCompare() {
    var a = cmpLoad(), h;
    var targets = [$('#azCmpB'), $('#azCmpB2')];
    if (!a.length) h = empty('아직 담아 둔 후보지가 없습니다', '분석 결과 위쪽의 ‘비교에 담기’를 누르면 최대 3곳까지 나란히 비교할 수 있습니다. 목록은 이 브라우저에만 저장됩니다.');
    else {
      var R = [
        ['위치', function (s) { return '<b style="color:var(--navy)">' + esc(s.label) + '</b>' + (s.addr && s.addr !== s.label ? '<br><small style="color:var(--slate2)">' + esc(s.addr) + '</small>' : ''); }],
        ['반경 · 분석일', function (s) { return rlabel(s.r) + ' · ' + esc(s.at); }],
        ['다른 후보와 거리', function (s, i) {
          if (a.length < 2) return '-';
          var g = geo({ lon: s.lon, lat: s.lat });
          return a.map(function (o, j) {
            if (j === i) return '';
            var d = g(o.lon, o.lat)[2];
            return '후보 ' + (j + 1) + ' · ' + mlabel(d) + (d < s.r + o.r ? ' <small style="color:var(--gold-t);font-weight:800">반경 겹침</small>' : '');
          }).filter(Boolean).join('<br>');
        }],
        ['반경 내 점포', function (s) { return s.k.total != null ? nf(s.k.total) + '곳' : '-'; }],
        ['점포 밀도', function (s) { return s.k.dens != null ? nf(s.k.dens) + '곳/㎢' : '-'; }],
        ['가장 많은 업종', function (s) { return esc(s.k.top || '-'); }],
        ['관심 업종', function (s) { return s.kw ? esc(s.kw) + ' ' + (s.k.kwN != null ? nf(s.k.kwN) + '곳' : '-') + (s.k.kwD != null ? ' · 최근접 ' + mlabel(s.k.kwD) : '') : '-'; }],
        ['1층 · 지점명 등록', function (s) { return pf(s.k.f1, 0) + ' · ' + pf(s.k.br, 0); }],
        ['서울 상권', function (s) { return s.k.tr ? esc(s.k.tr) : '-'; }],
        ['유동 · 배후 · 집객', function (s) { return s.k.tr ? [tops(s.k.foot), tops(s.k.pop), tops(s.k.fac)].map(function (v) { return v || '-'; }).join(' / ') : '-'; }],
        ['1층 참고 임대료', function (s) { return s.k.rent1 != null ? nf(s.k.rent1, 1) + '천원/㎡' + (s.k.rentNm ? ' <small style="color:var(--slate2)">(' + esc(s.k.rentNm) + ')</small>' : '') : '-'; }],
        ['조사 상권 공실률', function (s) { return s.k.vac != null ? nf(s.k.vac, 1) + '%' : '-'; }],
        ['시군구 실거래 (12개월)', function (s) { return s.k.deals != null ? nf(s.k.deals) + '건' : '-'; }],
        ['', function (s) { return '<button type="button" class="go" data-go="' + s.id + '">다시 분석</button><button type="button" class="x" data-x="' + s.id + '">빼기</button>'; }]
      ];
      h = '<div class="az-tbl az-cmp"><table><thead><tr><th>항목</th>' + a.map(function (s, i) { return '<th>후보 ' + (i + 1) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        R.map(function (r) { return '<tr><td>' + r[0] + '</td>' + a.map(function (s, i) { return '<td>' + r[1](s, i) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
        '<p class="az-muted">분석한 날의 데이터 기준으로 저장됩니다. 같은 반경으로 비교해야 점포 수와 밀도를 공정하게 볼 수 있습니다. 운영 중인 매장을 함께 담아 두면 새 후보지와 상권이 겹치는지도 바로 확인할 수 있습니다.</p>';
    }
    targets.forEach(function (el) {
      if (!el) return; el.innerHTML = h;
      $$('[data-x]', el).forEach(function (b) { b.addEventListener('click', function () { cmpSave(cmpLoad().filter(function (s) { return String(s.id) !== b.getAttribute('data-x'); })); renderCompare(); }); });
      $$('[data-go]', el).forEach(function (b) {
        b.addEventListener('click', function () {
          var s = cmpLoad().filter(function (x) { return String(x.id) === b.getAttribute('data-go'); })[0]; if (!s) return;
          setOpts(s.r, s.mode, s.kw); qIn.value = s.label;
          start({ lon: s.lon, lat: s.lat, label: s.label, addr: s.addr });
        });
      });
    });
    if (!S.loc) $('#azCmpEmpty').hidden = !a.length;
    var cs = $('#azCmp'); if (cs) cs.classList.toggle('az-noprint', !a.length);
  }
  function setOpts(r, mode, kw) {
    $$('input[name=r]', form).forEach(function (i) { i.checked = +i.value === +r; });
    $$('input[name=mode]', form).forEach(function (i) { i.checked = i.value === mode; });
    $('#azKw').value = kw || '';
  }
  $('#azSave').addEventListener('click', function () {
    if (!S.loc) return;
    if (!LS) { say('이 브라우저에서는 비교 목록을 저장할 수 없습니다.'); return; }
    var a = cmpLoad(), snap = snapshot();
    var dup = a.filter(function (s) { return Math.abs(s.lon - snap.lon) < 0.0003 && Math.abs(s.lat - snap.lat) < 0.0003 && s.r === snap.r; })[0];
    if (dup) a = a.map(function (s) { return s === dup ? snap : s; });
    else { if (a.length >= 3) a.shift(); a.push(snap); }
    cmpSave(a); renderCompare(); tr('analysis_compare_add');
    say(dup ? '같은 위치의 비교 정보를 새 결과로 바꿨습니다.' : '비교 목록에 담았습니다. <b>후보지 비교</b>에서 나란히 볼 수 있습니다.');
  });

  /* ───────────── 공유·상담·리포트 ───────────── */
  function shareUrl() {
    var L = S.loc, p = new URLSearchParams();
    p.set('lat', L.lat.toFixed(6)); p.set('lon', L.lon.toFixed(6)); p.set('r', S.r);
    if (S.kw) p.set('kw', S.kw); if (S.mode !== 'open') p.set('mode', S.mode);
    if (L.label) p.set('label', L.label);
    return location.origin + location.pathname + '?' + p.toString();
  }
  function syncUrl() { if (!S.loc || !history.replaceState) return; try { history.replaceState(null, '', shareUrl()); } catch (e) {} }
  $('#azShare').addEventListener('click', function () {
    var u = shareUrl();
    function ok() { say('분석 링크를 복사했습니다. 받는 분도 같은 조건으로 볼 수 있습니다.'); tr('analysis_share'); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(ok, function () { window.prompt('아래 링크를 복사해 주세요.', u); });
    else window.prompt('아래 링크를 복사해 주세요.', u);
  });
  function plainSummary() { var d = document.createElement('div'); d.innerHTML = summaryText(); return d.textContent; }
  function stash(extra) {
    if (!SS) return;
    var L = S.loc || {}, o = { at: today() };
    if (S.loc) {
      o.place = placeName(); o.addr = L.addr || ''; o.r = rlabel(S.r); o.kw = S.kw; o.mode = S.mode === 'owner' ? '건물주·임대' : '창업·출점';
      o.text = plainSummary(); o.url = shareUrl();
    }
    for (var k in extra || {}) o[k] = extra[k];
    try { SS.setItem('orbis_analysis_summary', JSON.stringify(o)); } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('#azConsult,[data-az-consult]'); if (!a) return;
    if (S.loc) stash(); tr('analysis_consult');
  });

  var modal = $('#azModal'), lastFocus = null;
  function openModal() {
    lastFocus = document.activeElement; modal.hidden = false; document.body.style.overflow = 'hidden';
    setTimeout(function () { $('#azLn').focus(); }, 30);
  }
  function closeModal() { modal.hidden = true; document.body.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $$('[data-close]', modal).forEach(function (b) { b.addEventListener('click', closeModal); });
  modal.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') {
      var f = $$('a[href],button:not([disabled]),input:not([tabindex="-1"]),select,textarea', modal).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  $('#azReport').addEventListener('click', function () { if (S.loc) openModal(); });
  function doPrint() {
    closeModal();
    $$('.reveal').forEach(function (x) { x.classList.add('in'); });
    renderHead(); tr('report_print');
    setTimeout(function () { window.print(); }, 250);
  }
  $('#azPrintOnly').addEventListener('click', doPrint);
  $('#azLead').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, err = $('#azLerr');
    if (f.website && f.website.value) return;
    var name = $('#azLn').value.trim(), tel = $('#azLp').value.trim();
    if (!name || !tel || !$('#azLc').checked) { err.textContent = !name ? '성함을 입력해 주세요.' : !tel ? '연락처를 입력해 주세요.' : '개인정보 수집·이용에 동의해 주세요.'; err.hidden = false; return; }
    err.hidden = true;
    var data = { '문의유형': '상권분석 리포트', '성함': name, '연락처': tel, '고객 유형': $('#azLt').value, '분석 위치': placeName() + (S.loc.addr ? ' (' + S.loc.addr + ')' : ''), '분석 반경': rlabel(S.r), '관점': S.mode === 'owner' ? '건물주·임대' : '창업·출점', '분석 요약': plainSummary(), '분석 링크': shareUrl(), '접수페이지': location.pathname };
    var em = $('#azLe').value.trim(); if (em) data['이메일'] = em;
    if (S.kw) data['관심 업종'] = S.kw;
    var b = $('#azLsend'), o = b.textContent; b.disabled = true; b.textContent = '접수 중…';
    var ep = (window.ORBIS && window.ORBIS.LEAD_ENDPOINT) || '/api/lead';
    fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw new Error('x'); tr('form_submit', { form: '상권분석 리포트' }); say('접수되었습니다. 담당자가 결과를 확인한 뒤 연락드립니다.'); })
      .catch(function () { tr('form_submit_fallback', { form: '상권분석 리포트' }); say('지금은 온라인 접수가 어렵습니다. 리포트는 그대로 저장되며, 상담은 <b>010-7379-5265</b>로 연락 주세요.'); })
      .finally(function () { b.disabled = false; b.textContent = o; doPrint(); });
  });

  /* 결과 바로가기 표시 */
  if ('IntersectionObserver' in window) {
    var links = $$('#azTabs a'), io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); }); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    links.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) io.observe(s); });
  }

  /* ───────────── 시작 ───────────── */
  function init() {
    renderCompare();
    loadStatus().then(function () {
      renderConn();
      Promise.all([loadSeoulIdx(), loadRone()]).then(renderConn);
      var key = S.status && S.status.kakaoJsKey;
      var pk = key ? loadKakao(key).then(function (k) {
        S.kakao = k; S.geocoder = new k.maps.services.Geocoder(); S.places = new k.maps.services.Places();
        renderConn(); if (S.loc) renderMapLayers();
      }).catch(function () { S.kakao = null; S.kakaoFail = true; renderConn(); if (S.loc) renderMapLayers(); }) : Promise.resolve();
      var q = new URLSearchParams(location.search);
      var lat = parseFloat(q.get('lat')), lon = parseFloat(q.get('lon'));
      if (q.get('r') || q.get('mode') || q.get('kw')) setOpts(q.get('r') || 500, q.get('mode') === 'owner' ? 'owner' : 'open', q.get('kw') || '');
      if (isFinite(lat) && isFinite(lon) && lat > 33 && lat < 39 && lon > 124 && lon < 132) {
        qIn.value = q.get('label') || '';
        pk.then(function () { start({ lon: lon, lat: lat, label: q.get('label') || '공유받은 위치', addr: '' }); });
      } else if (q.get('q')) {
        qIn.value = q.get('q');
        pk.then(function () { form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })); });
      }
    });
  }
  init();
})();
