/* ORBIS — 매물 목록·상세, 구하는 물건(공동중개), 인근 실거래 미리보기
   매물은 관리자 화면에서 등록하면 /api/listings 로 바로 내려옵니다. */
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var BLD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 21h18M6 21V5l8-2v18M14 9h4v12M9 8h2M9 12h2M9 16h2"/></svg>';
  var OFFICE = '중개사무소 오르비스중개법인 · 대표 이상민 · 서울특별시 강남구 테헤란로 123, 6층 615호 · 010-7379-5265 · 중개사무소 개설등록번호 11680-2025-00157';
  function getJSON(url) { return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }); }
  function won(man) {
    var n = Math.round(Number(man)); if (!isFinite(n) || n <= 0) return '';
    var eok = Math.floor(n / 10000), rest = n % 10000;
    if (eok && rest) return eok.toLocaleString('ko-KR') + '억 ' + rest.toLocaleString('ko-KR') + '만 원';
    if (eok) return eok.toLocaleString('ko-KR') + '억 원';
    return rest.toLocaleString('ko-KR') + '만 원';
  }
  function priceOf(x) {
    if (x.priceText) return x.priceText;
    if (x.deal === '매매') return x.price ? '매매 ' + won(x.price) : '가격 문의';
    var a = x.deposit ? '보증금 ' + won(x.deposit) : '', b = x.rent ? '월 ' + won(x.rent) : '';
    return [a, b].filter(Boolean).join(' / ') || '가격 문의';
  }
  function fmtDate(iso) { return iso ? String(iso).slice(0, 10).replace(/-/g, '.') : ''; }
  function card(x) {
    var done = x.status === 'done';
    var place = [x.sgg, x.dong].filter(Boolean).join(' ');
    return '<a class="lcard' + (done ? ' done' : '') + '" href="/listing/' + encodeURIComponent(x.id) + '" data-track="listing_open" data-label="' + E(x.id) + '">' +
      '<div class="im">' + (x.thumb ? '<img src="' + E(x.thumb) + '" alt="" loading="lazy">' : '<div class="ph0">' + BLD + '</div>') +
      '<div class="bd"><span class="l-b">' + E(x.deal) + '</span><span class="l-b cat">' + E(x.category) + '</span>' + (x.cobroke ? '<span class="l-b co">공동중개</span>' : '') + (done ? '<span class="l-b done">거래완료</span>' : '') + '</div></div>' +
      '<div class="tx"><span class="pl">' + E(place) + (x.station ? ' · ' + E(x.station.split(',')[0]) : '') + '</span><h3>' + E(x.title) + '</h3>' +
      '<span class="pr">' + E(priceOf(x)) + '</span><span class="ar">' + E([String(x.areaText || '').split(' · ')[0], String(x.floor || '').split(' / ')[0]].filter(Boolean).join(' · ')) + '</span>' +
      '<div class="ft2"><span>매물번호 ' + E(x.id) + '</span><span>' + E(fmtDate(x.published_at || x.updated_at)) + '</span></div></div></a>';
  }

  /* ---------- 첫 화면: 추천·최근 매물 ---------- */
  function initHome() {
    var sec = $('#homeListings'); if (!sec) return;
    getJSON('/api/listings?size=4').then(function (d) {
      var cnt = $('#qaCount'); var total = (d.facets && d.facets.deal || []).reduce(function (a, f) { return a + f.n; }, 0);
      if (cnt && total) cnt.textContent = '공개 매물 ' + total + '건';
      var items = (d.items || []).filter(function (x) { return x.status === 'public'; });
      if (!items.length) return;
      $('#homeListingsGrid').innerHTML = items.map(card).join('');
      sec.hidden = false;
    }).catch(function () {});
  }

  /* ---------- 매물 페이지 ---------- */
  function initList() {
    var root = $('#lsRoot'); if (!root) return;
    var st = { deal: '', cat: '', sgg: '', q: '', page: 0, cobroke: '' };
    try { var qs = new URLSearchParams(location.search); ['deal', 'cat', 'sgg', 'q', 'cobroke'].forEach(function (k) { if (qs.get(k)) st[k] = qs.get(k); }); } catch (e) {}
    var grid = $('#lsGrid'), count = $('#lsCount'), pager = $('#lsPager');
    function load() {
      var p = new URLSearchParams({ size: '12', page: String(st.page) });
      ['deal', 'cat', 'sgg', 'q', 'cobroke'].forEach(function (k) { if (st[k]) p.set(k, st[k]); });
      grid.setAttribute('aria-busy', 'true');
      getJSON('/api/listings?' + p.toString()).then(function (d) {
        grid.removeAttribute('aria-busy');
        var f = d.facets || { deal: [], category: [], sgg: [] };
        var all = f.deal.reduce(function (a, x) { return a + x.n; }, 0);
        var n = function (list, k) { var m = list.filter(function (x) { return x.k === k; })[0]; return m ? m.n : 0; };
        $('#lsDeal').innerHTML = [['', '전체', all], ['임대', '임대', n(f.deal, '임대') + n(f.deal, '전대')], ['매매', '매매', n(f.deal, '매매')]].map(function (c) {
          return '<button type="button" data-k="' + c[0] + '" class="' + (st.deal === c[0] ? 'on' : '') + '">' + c[1] + '<small>' + c[2] + '</small></button>';
        }).join('');
        var cat = $('#lsCat'), sgg = $('#lsSgg');
        cat.innerHTML = '<option value="">유형 전체</option>' + f.category.map(function (x) { return '<option value="' + E(x.k) + '"' + (st.cat === x.k ? ' selected' : '') + '>' + E(x.k) + ' (' + x.n + ')</option>'; }).join('');
        sgg.innerHTML = '<option value="">지역 전체</option>' + f.sgg.map(function (x) { return '<option value="' + E(x.k) + '"' + (st.sgg === x.k ? ' selected' : '') + '>' + E(x.k) + ' (' + x.n + ')</option>'; }).join('');
        Array.prototype.forEach.call($('#lsDeal').children, function (b) { b.onclick = function () { st.deal = b.getAttribute('data-k'); st.page = 0; load(); }; });
        var items = d.items || [];
        if (!items.length) {
          var filtered = st.deal || st.cat || st.sgg || st.q || st.cobroke;
          grid.innerHTML = '<div class="ls-empty"><b>' + (filtered ? '조건에 맞는 공개 매물이 없습니다' : '공개 매물을 준비하고 있습니다') + '</b>' +
            (filtered ? '조건을 바꿔 보시거나, 찾는 조건을 남겨 주시면 공개 전 매물까지 함께 살펴 안내합니다.' : '실제 의뢰를 확인한 매물만 법정 표시사항과 함께 올립니다. 찾는 조건을 남겨 주시면 공개 전 매물까지 함께 살펴 안내합니다.') +
            '<div class="acts"><a class="btn btn-gold" href="/lease-request">맞춤 매물 의뢰 ' + ARROW + '</a><a class="btn btn-outline" href="#request">매입 조건 남기기</a></div></div>';
          count.textContent = ''; pager.innerHTML = ''; return;
        }
        grid.innerHTML = items.map(card).join('');
        count.textContent = '총 ' + d.total + '건' + (d.total > d.size ? ' · ' + (st.page + 1) + ' / ' + Math.ceil(d.total / d.size) + '쪽' : '');
        pager.innerHTML = d.total > d.size ? '<button type="button" class="btn btn-outline sm" id="lsPrev"' + (st.page ? '' : ' disabled') + '>이전</button><span>' + (st.page + 1) + ' / ' + Math.ceil(d.total / d.size) + '</span><button type="button" class="btn btn-outline sm" id="lsNext"' + ((st.page + 1) * d.size < d.total ? '' : ' disabled') + '>다음</button>' : '';
        if ($('#lsPrev')) $('#lsPrev').onclick = function () { st.page--; load(); root.scrollIntoView({ behavior: 'smooth' }); };
        if ($('#lsNext')) $('#lsNext').onclick = function () { st.page++; load(); root.scrollIntoView({ behavior: 'smooth' }); };
      }).catch(function () { grid.removeAttribute('aria-busy'); grid.innerHTML = '<div class="ls-empty"><b>매물 목록을 불러오지 못했습니다</b>잠시 뒤 다시 열어 주세요.</div>'; });
    }
    $('#lsCat').onchange = function (e) { st.cat = e.target.value; st.page = 0; load(); };
    $('#lsSgg').onchange = function (e) { st.sgg = e.target.value; st.page = 0; load(); };
    $('#lsForm').onsubmit = function (e) { e.preventDefault(); st.q = $('#lsQ').value.trim(); st.page = 0; load(); };
    if (st.q) $('#lsQ').value = st.q;
    load();
  }

  /* ---------- 매물 상세 ---------- */
  function initDetail() {
    var root = $('#listingRoot'); if (!root) return;
    var data = null; try { data = JSON.parse($('#listingData').textContent); } catch (e) {}
    function miss() {
      root.innerHTML = '<div class="ld-miss wrap"><p class="eyebrow">Listing</p><h1 style="font-size:28px;color:var(--navy);margin-top:10px">매물을 찾을 수 없습니다</h1><p style="color:var(--slate);margin-top:10px">거래가 끝났거나 내려간 매물일 수 있습니다. 다른 매물을 살펴보시거나 찾는 조건을 남겨 주세요.</p>' +
        '<div class="pcta" style="justify-content:center;margin-top:22px"><a class="btn btn-gold" href="/properties">공개 매물 보기 ' + ARROW + '</a><a class="btn btn-outline" href="/lease-request">맞춤 매물 의뢰</a></div></div>';
    }
    function draw(x) {
      var d = x.data || {}; var photos = d.photos || []; var done = x.status === 'done';
      var place = [x.sido, x.sgg, x.dong].filter(Boolean).join(' ');
      document.title = x.title + ' | ' + x.deal + ' ' + x.category + ' | 오르비스중개법인';
      var rows = [['거래 형태', x.deal], ['중개대상물 종류', d.kind || x.category], ['소재지', place + (d.building ? ' ' + d.building : '')], ['해당 층 / 총 층수', d.floor], ['면적', d.areaText], ['가격', priceOf(x)],
        ['관리비', d.maintenance], ['입주 가능일', d.moveIn], ['사용승인일', d.approval], ['주차대수', d.parking], ['방향', d.direction], ['욕실(화장실) 수', d.baths], ['위반건축물 여부', d.violation], ['수익률', d.yield], ['렌트프리·지원', d.rentFree], ['인근 역', d.station], ['특이사항', d.use]]
        .filter(function (r) { return r[1]; });
      var gal = photos.length
        ? '<div class="main"><img id="ldMain" src="' + E(photos[0].url) + '" alt="' + E(photos[0].caption || x.title) + '"></div><p class="cap" id="ldCap">' + E(photos[0].caption || '') + '</p>' +
          (photos.length > 1 ? '<div class="ld-th">' + photos.map(function (p, i) { return '<button type="button" class="' + (i ? '' : 'on') + '" data-i="' + i + '" aria-label="사진 ' + (i + 1) + '"><img src="' + E(p.url) + '" alt="" loading="lazy"></button>'; }).join('') + '</div>' : '')
        : '<div class="main"><div style="width:64px;height:64px">' + BLD + '</div></div><p class="cap">사진은 상담 때 따로 안내합니다.</p>';
      root.innerHTML = '<article class="ld"><div class="wrap">' +
        '<nav class="crumb" aria-label="현재 위치"><a href="/">홈</a> / <a href="/properties">매물</a> / ' + E(x.id) + '</nav>' +
        '<div class="ld-top" style="margin-top:14px"><span class="l-b">' + E(x.deal) + '</span><span class="l-b cat">' + E(x.category) + '</span>' + (x.cobroke ? '<span class="l-b co">공동중개 가능</span>' : '') + (done ? '<span class="l-b done">거래완료</span>' : '') + '<span>매물번호 ' + E(x.id) + '</span>' + (d.confirmed ? '<span>· 확인일 ' + E(String(d.confirmed).replace(/-/g, '.')) + '</span>' : '') + '</div>' +
        '<h1>' + E(x.title) + '</h1>' + (d.summary ? '<p class="ld-sum">' + E(d.summary) + '</p>' : '') +
        '<div class="ld-grid"><div><div class="ld-gal">' + gal + '</div>' +
        ((d.highlights || []).length ? '<section class="ld-sec"><h2>핵심 포인트</h2><ul class="ld-hl">' + d.highlights.map(function (h) { return '<li>' + E(h) + '</li>'; }).join('') + '</ul></section>' : '') +
        '<section class="ld-sec"><h2>매물 정보</h2><dl class="ld-dl">' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + E(r[1]) + '</dd></div>'; }).join('') + '</dl></section>' +
        (d.description ? '<section class="ld-sec"><h2>상세 설명</h2><p class="ld-desc">' + E(d.description) + '</p></section>' : '') +
        '<p class="ld-office">' + OFFICE + '<br>표시한 내용은 의뢰인이 제공한 자료와 공부(건축물대장 등)를 바탕으로 정리했습니다. 계약 전에 현장과 공부를 다시 확인해 드립니다. 중개보수는 공인중개사법령이 정한 상한 안에서 계약 전에 협의합니다.</p></div>' +
        '<aside class="ld-side"><div class="ld-price"><div class="k">' + E(x.deal) + ' 조건</div><div class="v">' + E(priceOf(x)) + '</div><ul>' +
        (d.maintenance ? '<li>관리비 <b>' + E(d.maintenance) + '</b></li>' : '') + (d.areaText ? '<li>면적 <b>' + E(d.areaText) + '</b></li>' : '') + (d.floor ? '<li>층 <b>' + E(d.floor) + '</b></li>' : '') + (d.moveIn ? '<li>입주 <b>' + E(d.moveIn) + '</b></li>' : '') + '</ul>' +
        (done ? '<p style="margin-top:14px;font-size:14px;color:var(--slate)">거래가 끝난 매물입니다. 비슷한 조건의 매물을 찾아 드립니다.</p><a class="btn btn-navy" href="/lease-request">비슷한 매물 의뢰 ' + ARROW + '</a>'
          : '<a class="btn btn-gold" href="#ldAsk" data-track="cta_click" data-label="listing_ask">이 매물 문의하기 ' + ARROW + '</a><a class="tel" href="tel:010-7379-5265" data-track="click_phone">010-7379-5265</a>') + '</div>' +
        (x.cobroke ? '<div class="ld-co"><b>공동중개 안내</b>' + E(d.cobrokeNote || '공동중개가 가능한 매물입니다. 중개사무소는 매물번호와 함께 연락해 주세요.') + ' <a href="/cobroke" style="font-weight:700;color:var(--gold-t)">공동중개 안내 보기</a></div>' : '') +
        '</aside></div>' +
        (done ? '' : '<section class="ld-sec" id="ldAsk" style="max-width:720px"><h2>이 매물 문의</h2><div class="panel gold-edge" style="margin-top:18px"><form class="lead" data-type="매물 문의" data-subject="매물 문의 ' + E(x.id) + '"><div class="hp" aria-hidden="true"><label>웹사이트<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
          '<input type="hidden" name="매물번호" value="' + E(x.id) + '"><input type="hidden" name="매물" value="' + E(x.title) + '">' +
          '<div class="frow"><div class="field"><label for="la-n">성함 <span class="req">*</span></label><input id="la-n" type="text" name="성함" required></div><div class="field"><label for="la-p">연락처 <span class="req">*</span></label><input id="la-p" type="tel" name="연락처" required placeholder="010-0000-0000"></div></div>' +
          '<div class="frow"><div class="field"><label for="la-k">문의 구분</label><select id="la-k" name="문의 구분"><option>현장 방문 희망</option><option>조건 문의</option><option>자료 요청</option><option>공동중개 문의(중개사무소)</option></select></div><div class="field"><label for="la-t">희망 시기</label><input id="la-t" type="text" name="희망 시기" placeholder="예: 이번 주 평일 오후"></div></div>' +
          '<div class="field"><label for="la-m">문의 내용</label><textarea id="la-m" name="추가 내용" placeholder="사용 용도, 인원, 궁금한 조건 등을 적어 주세요."></textarea></div>' +
          '<label class="consent"><input type="checkbox" required><span>개인정보 수집·이용에 동의합니다. 수집 항목과 보유 기간은 <a href="/privacy" target="_blank">개인정보처리방침</a>을 따릅니다. <span class="req">(필수)</span></span></label>' +
          '<button type="submit" class="btn btn-navy" style="width:100%;justify-content:center">문의 보내기</button></form><div class="form-ok">문의가 접수되었습니다. 담당자가 확인하고 연락드리겠습니다.</div></div></section>') +
        '</div></article>';
      Array.prototype.forEach.call(root.querySelectorAll('.ld-th button'), function (b) {
        b.onclick = function () { var p = photos[+b.getAttribute('data-i')]; $('#ldMain').src = p.url; $('#ldCap').textContent = p.caption || ''; Array.prototype.forEach.call(b.parentNode.children, function (c) { c.classList.toggle('on', c === b); }); };
      });
      if (window.ORBIS_BIND_FORMS) window.ORBIS_BIND_FORMS(root);
    }
    if (data && data.id) return draw(data);
    if (data && data.notFound) return miss();
    var id = ''; try { id = new URLSearchParams(location.search).get('id') || ''; } catch (e) {}
    if (!id) { var m = location.pathname.match(/\/listing\/([^/]+)/); if (m) id = decodeURIComponent(m[1]); }
    if (!id) return miss();
    getJSON('/api/listing?id=' + encodeURIComponent(id)).then(function (d) { if (d.ok) draw(d.listing); else miss(); }).catch(miss);
  }

  /* ---------- 공동중개: 구하는 물건 ---------- */
  function initWanted() {
    var box = $('#wantedGrid'); if (!box) return;
    getJSON('/api/wanted').then(function (d) {
      var items = d.items || [];
      if (!items.length) { box.innerHTML = '<div class="ls-empty"><b>지금 올라온 공고가 없습니다</b>새 공고는 이 자리에 올라옵니다. 공고와 상관없이 소개할 물건이 있으면 아래 양식으로 접수해 주세요.</div>'; return; }
      box.innerHTML = items.map(function (w) {
        var rows = [['의뢰인', w.client], ['희망 지역', w.region], ['면적', w.areaText], ['예산', w.budgetText], ['시기', w.timing], ['공동중개', w.feeNote]].filter(function (r) { return r[1]; });
        var closed = w.status === 'closed';
        return '<article class="wcard' + (closed ? ' closed' : '') + '"><div class="wt"><span class="l-b">' + E(w.deal) + '</span>' + (w.category ? '<span class="l-b cat" style="border:1px solid var(--line)">' + E(w.category) + '</span>' : '') + (closed ? '<span class="l-b done">마감</span>' : '') + '<span>' + E(fmtDate(w.updated_at)) + '</span></div>' +
          '<h3>' + E(w.title) + '</h3><dl>' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + E(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
          ((w.conditions || []).length ? '<ul>' + w.conditions.map(function (c) { return '<li>' + E(c) + '</li>'; }).join('') + '</ul>' : '') + (w.detail ? '<p style="font-size:14px;color:var(--slate);margin-top:10px">' + E(w.detail) + '</p>' : '') +
          '<div class="wf"><span>공고번호 ' + E(w.id) + '</span>' + (closed ? '' : '<a class="btn btn-navy sm" href="#submit" data-wanted="' + E(w.id) + '" data-title="' + E(w.title) + '">맞는 물건 접수 ' + ARROW + '</a>') + '</div></article>';
      }).join('');
      Array.prototype.forEach.call(box.querySelectorAll('[data-wanted]'), function (a) {
        a.addEventListener('click', function () { var f = $('#coRef'); if (f) f.value = a.getAttribute('data-title') + ' (' + a.getAttribute('data-wanted') + ')'; });
      });
    }).catch(function () { box.innerHTML = '<div class="ls-empty"><b>공고를 불러오지 못했습니다</b>잠시 뒤 다시 열어 주세요.</div>'; });
  }

  /* ---------- 매각가 검토: 인근 실거래 미리보기 ---------- */
  function initMarket() {
    var form = $('#vlForm'); if (!form) return;
    var out = $('#vlResult'); var input = $('#vlAddr');
    function eok(v) { var e = v / 1e8; return (e >= 100 ? Math.round(e) : Math.round(e * 10) / 10).toLocaleString('ko-KR') + '억'; }
    function run(bjd) {
      var q = input.value.trim(); if (q.length < 3) { input.focus(); return; }
      var addr = $('#vlFormAddr'); if (addr && !addr.value) addr.value = q;
      out.innerHTML = '<p class="vl-hint">인근 실거래를 찾고 있습니다…</p>';
      getJSON('/api/market?q=' + encodeURIComponent(q) + (bjd ? '&bjd=' + bjd : '')).then(function (d) {
        var choices = (d.choices || []).length > 1 ? '<div class="choice-row">' + d.choices.map(function (c) { return '<button type="button" data-bjd="' + E(c.bjd) + '">' + E(c.label) + '</button>'; }).join('') + '</div>' : '';
        if (!d.ok) { out.innerHTML = '<div class="ls-empty" style="text-align:left"><b>' + E(d.place ? d.place.label : '미리보기를 준비하지 못했습니다') + '</b>' + E(d.message || '') + choices + '</div>'; bind(); if (d.place && addr) addr.value = d.place.label; return; }
        if (addr) addr.value = d.place.label;
        var s = d.stats || {};
        out.innerHTML = '<p class="eyebrow">Comparable Transactions</p><h3 style="font-size:21px;color:var(--navy);margin-top:6px">' + E(d.place.sgg + ' ' + (d.scope === '동' ? d.place.dong : '전체')) + ' 최근 12개월 건물 매매 ' + d.count + '건</h3>' + choices +
          (d.count ? '<div class="vl-stats" style="margin-top:16px"><div class="hl"><span>토지 평당 거래가 중간값</span><b>' + (s.median ? s.median.toLocaleString('ko-KR') + '만 원' : '-') + '</b></div><div><span>가장 낮은 사례</span><b>' + (s.min ? s.min.toLocaleString('ko-KR') + '만 원' : '-') + '</b></div><div><span>가장 높은 사례</span><b>' + (s.max ? s.max.toLocaleString('ko-KR') + '만 원' : '-') + '</b></div></div>' +
          '<div class="vl-tblwrap"><table class="vl-tbl"><thead><tr><th>계약월</th><th>소재지</th><th>거래금액</th><th>대지면적</th><th>연면적</th><th>토지 평당</th><th>건축년도</th><th>용도지역</th></tr></thead><tbody>' +
          d.items.map(function (r) { return '<tr><td>' + E(r.ym.replace('-', '.')) + '</td><td>' + E(r.dong + ' ' + r.jibun) + '</td><td><b>' + eok(r.amt) + '</b></td><td>' + (r.plotAr ? r.plotAr.toLocaleString('ko-KR') + '㎡' : '-') + '</td><td>' + (r.bldAr ? r.bldAr.toLocaleString('ko-KR') + '㎡' : '-') + '</td><td>' + r.landPy.toLocaleString('ko-KR') + '만</td><td>' + (r.built || '-') + '</td><td>' + E(r.zone || '-') + '</td></tr>'; }).join('') + '</tbody></table></div>'
          : '<p class="vl-hint">최근 12개월 안에 신고된 건물 매매가 없습니다. 기간과 범위를 넓혀 리포트로 정리해 드립니다.</p>') +
          '<p class="vl-src">' + E(d.source) + '. 일반 건물의 지번은 원자료에서 일부가 가려져 있습니다. 거래금액을 대지면적으로 나눈 단순 비교값이며, 건물 상태·도로 조건·용도지역에 따라 실제 가격은 달라집니다. 가격 평가(감정평가)가 아닙니다.</p>' +
          '<div class="pcta" style="margin-top:18px"><a class="btn btn-gold" href="#vlRequest" data-track="cta_click" data-label="valuation_request">내 건물 기준으로 리포트 받기 ' + ARROW + '</a></div>';
        bind();
        if (window.track) window.track('valuation_preview', { label: d.place.sgg + ' ' + d.place.dong });
      }).catch(function () { out.innerHTML = '<p class="vl-hint">미리보기를 불러오지 못했습니다. 아래 신청서를 남겨 주시면 정리해 드립니다.</p>'; });
    }
    function bind() { Array.prototype.forEach.call(out.querySelectorAll('[data-bjd]'), function (b) { b.onclick = function () { run(b.getAttribute('data-bjd')); }; }); }
    form.addEventListener('submit', function (e) { e.preventDefault(); run(''); });
    try { var a = new URLSearchParams(location.search).get('addr'); if (a) { input.value = a; run(''); } } catch (e) {}
  }

  function start() { initHome(); initList(); initDetail(); initWanted(); initMarket(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
