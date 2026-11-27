/* 오르비스중개법인 — 사이트 안 검색 (/search)
   build.mjs가 만든 /search-index.json(글·용어·질문·계산기·길잡이·페이지)을 받아 브라우저에서 찾습니다. */
(function () {
  'use strict';
  var form = document.getElementById('srForm'), input = document.getElementById('srQ'), list = document.getElementById('srList'),
    count = document.getElementById('srCount'), tabs = document.getElementById('srTabs'), hints = document.getElementById('srHints'), browse = document.getElementById('srBrowse');
  if (!form || !input || !list) return;
  var DATA = null, kind = '전체', ORDER = ['전체', '길잡이', '계산기', '글', '용어', '질문', '페이지'], timer = null, sentQ = '';
  function norm(s) { return String(s || '').toLowerCase().replace(/[\s·,.\-()\/]+/g, ''); }
  function escH(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mark(text, toks) {
    var out = escH(text);
    toks.forEach(function (t) { if (t.length < 2) return; var re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); out = out.replace(re, function (m) { return '<mark>' + m + '</mark>'; }); });
    return out;
  }
  function search(q) {
    var toks = q.trim().split(/\s+/).filter(Boolean), nt = toks.map(norm).filter(Boolean), whole = norm(q);
    if (!nt.length) return [];
    var res = [];
    DATA.forEach(function (it) {
      var sc = 0, all = true;
      nt.forEach(function (t) {
        var s = 0;
        if (it._t.indexOf(t) >= 0) s += 6; if (it._x.indexOf(t) >= 0) s += 3; if (it._d.indexOf(t) >= 0) s += 2;
        if (!s) all = false; sc += s;
      });
      if (!all) return;
      if (it._t.indexOf(whole) >= 0) sc += 8; if (it._t === whole) sc += 20;
      sc += { '길잡이': 3, '계산기': 3, '용어': 2, '글': 2, '페이지': 1, '질문': 0 }[it.k] || 0;
      res.push({ it: it, sc: sc });
    });
    res.sort(function (a, b) { return b.sc - a.sc || (b.it.m || '').localeCompare(a.it.m || ''); });
    return res.map(function (r) { return r.it; });
  }
  function render() {
    var q = input.value.trim();
    if (hints) hints.hidden = !!q;
    if (!q) { list.innerHTML = ''; count.textContent = ''; tabs.hidden = true; if (browse) browse.hidden = false; return; }
    if (!DATA) { count.textContent = '검색 자료를 불러오는 중입니다…'; return; }
    var toks = q.split(/\s+/).filter(Boolean), all = search(q), by = {};
    all.forEach(function (it) { by[it.k] = (by[it.k] || 0) + 1; });
    if (kind !== '전체' && !by[kind]) kind = '전체';
    tabs.hidden = !all.length;
    tabs.innerHTML = ORDER.filter(function (k) { return k === '전체' || by[k]; }).map(function (k) { return '<button type="button" data-k="' + k + '" class="' + (k === kind ? 'on' : '') + '" aria-pressed="' + (k === kind) + '">' + k + ' <span>' + (k === '전체' ? all.length : by[k]) + '</span></button>'; }).join('');
    var shown = all.filter(function (it) { return kind === '전체' || it.k === kind; }).slice(0, 60);
    count.textContent = all.length ? '"' + q + '" 검색 결과 ' + all.length + '건' : '"' + q + '"에 맞는 내용을 찾지 못했습니다. 다른 말로 찾아보시거나 아래에서 둘러보세요.';
    if (browse) browse.hidden = !!all.length;
    list.innerHTML = shown.map(function (it) {
      return '<a class="sr-item" href="' + it.u + '"><em class="k k-' + ORDER.indexOf(it.k) + '">' + it.k + (it.c ? ' · ' + escH(it.c) : '') + '</em><b>' + mark(it.t, toks) + '</b><span>' + mark(it.d || '', toks) + '</span></a>';
    }).join('');
    if (q !== sentQ && q.length >= 2) { sentQ = q; clearTimeout(timer); timer = setTimeout(function () { document.dispatchEvent(new CustomEvent('orbis:track', { detail: { ev: 'site_search', label: q.slice(0, 40) } })); }, 1500); }
  }
  tabs.addEventListener('click', function (e) { var b = e.target.closest('button[data-k]'); if (!b) return; kind = b.getAttribute('data-k'); render(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); var q = input.value.trim(); try { history.replaceState(null, '', q ? '/search?q=' + encodeURIComponent(q) : '/search'); } catch (err) {} render(); });
  input.addEventListener('input', function () { kind = '전체'; render(); });
  var q0 = ''; try { q0 = new URLSearchParams(location.search).get('q') || ''; } catch (e) {}
  input.value = q0; if (!q0) { try { input.focus({ preventScroll: true }); } catch (e) {} }
  fetch('/search-index.json').then(function (r) { return r.json(); }).then(function (j) {
    DATA = (j.items || []).map(function (it) { it._t = norm(it.t); it._d = norm(it.d); it._x = norm(it.x); return it; });
    render();
  }).catch(function () { count.textContent = '검색 자료를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.'; });
  render();
})();
