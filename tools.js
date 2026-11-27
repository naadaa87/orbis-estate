/* 오르비스중개법인 — 부동산 계산기 (/tools/*)
   요율·기준 금액은 2026년 11월 현행 법령 기준입니다. 바뀌면 이 파일과 scripts/content/extra-data.mjs를 함께 고칩니다. */
(function () {
  'use strict';
  var MAN = 10000, PY = 3.305785;
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; }
  function comma(n) { return Math.round(n).toLocaleString('ko-KR'); }
  function won(w) {
    if (!isFinite(w)) return '–';
    w = Math.round(w); var neg = w < 0; w = Math.abs(w);
    var eok = Math.floor(w / 1e8), man = Math.floor((w % 1e8) / 1e4), rest = w % 1e4, s = [];
    if (eok) s.push(comma(eok) + '억'); if (man) s.push(comma(man) + '만'); if (rest || !s.length) s.push(comma(rest));
    return (neg ? '−' : '') + s.join(' ') + '원';
  }
  function pct(x, d) { if (!isFinite(x)) return '–'; return x.toFixed(d == null ? 2 : d) + '%'; }
  function fix(x, d) { if (!isFinite(x)) return '–'; return Number(x.toFixed(d == null ? 2 : d)).toLocaleString('ko-KR', { maximumFractionDigits: d == null ? 2 : d }); }

  // 주택 중개보수 (서울특별시 조례, 2021.12.30 시행): [미만 금액, 요율%, 한도액]
  var HOUSE = {
    sale: [[5e7, 0.6, 25e4], [2e8, 0.5, 80e4], [9e8, 0.4, 0], [12e8, 0.5, 0], [15e8, 0.6, 0], [Infinity, 0.7, 0]],
    lease: [[5e7, 0.5, 20e4], [1e8, 0.4, 30e4], [6e8, 0.3, 0], [12e8, 0.4, 0], [15e8, 0.5, 0], [Infinity, 0.6, 0]]
  };

  var CALC = {
    brokerage: function (g) {
      var kind = g.s('kind'), deal = g.s('deal'), amount, note = [];
      if (deal === 'sale') amount = g.n('price') * MAN;
      else {
        var d = g.n('deposit') * MAN, r = g.n('rent') * MAN; amount = d + r * 100;
        if (amount < 5e7) { amount = d + r * 70; note.push('보증금 + 월세 × 100이 5천만원 미만이어서 월세 × 70으로 계산했습니다.'); }
      }
      var rate, cap = 0;
      if (kind === 'nonres') rate = 0.9;
      else if (kind === 'officetel') rate = deal === 'sale' ? 0.5 : 0.4;
      else { var row = HOUSE[deal].filter(function (x) { return amount < x[0]; })[0]; rate = row[1]; cap = row[2]; }
      var fee = amount * rate / 100;
      if (cap && fee > cap) { fee = cap; note.push('이 구간은 한도액 ' + won(cap) + '이 적용됩니다.'); }
      var out = { amount: won(amount), rateOut: pct(rate, 1) + ' 이내', fee: won(fee), vat: won(fee * 1.1), feeNote: kind === 'nonres' ? '0.9% 이내에서 협의' : kind === 'officetel' ? '요건을 갖춘 오피스텔 기준' : '서울특별시 조례 기준' };
      var custom = g.n('rate');
      if (custom > 0) {
        if (custom > rate) note.push('입력한 요율이 상한(' + pct(rate, 1) + ')보다 높습니다. 상한을 넘겨 받을 수 없습니다.');
        else { var a = amount * custom / 100; if (cap && a > cap) a = cap; out.agreed = won(a) + ' (부가세 포함 ' + won(a * 1.1) + ')'; }
      }
      if (!out.agreed) out.agreed = '';
      if (kind === 'house') note.push('주택 요율은 시·도 조례로 정합니다. 서울 외 지역은 해당 시·도의 요율표를 확인하세요.');
      out.note = note.join(' ');
      return out;
    },
    converted: function (g) {
      var limit = num(g.s('region')) * 1e8, h = g.n('deposit') * MAN + g.n('rent') * MAN * 100, inb = h <= limit;
      return {
        hwansan: won(h), limit: won(limit) + ' 이하', gap: inb ? '기준보다 ' + won(limit - h) + ' 낮음' : '기준보다 ' + won(h - limit) + ' 높음',
        verdict: inb ? '기준 이내 — 상가건물 임대차보호법 전체 적용' : '기준 초과 — 일부 조항만 적용',
        r1: inb ? '적용' : '적용 안 됨', r2: inb ? '적용' : '적용 안 됨', r3: inb ? '적용' : '적용 안 됨', _cls: inb ? 'is-in' : 'is-over'
      };
    },
    'yield': function (g) {
      var price = g.n('price') * MAN, dep = g.n('deposit') * MAN, rentY = g.n('rent') * MAN * 12, vac = g.n('vac') / 100, opex = g.n('opex') * MAN,
        extra = g.n('extra') * MAN, loan = g.n('loan') * MAN, ir = g.n('ir') / 100;
      var noi = rentY * (1 - vac) - opex, interest = loan * ir, equity = price + extra - dep - loan, cash = noi - interest;
      var ey = equity > 0 ? cash / equity * 100 : NaN, cash2 = noi - loan * (ir + 0.01), ey2 = equity > 0 ? cash2 / equity * 100 : NaN;
      var cap = price > 0 ? noi / price * 100 : NaN, note = [];
      if (equity <= 0) note.push('보증금과 대출금의 합이 매입 금액보다 커서 자기자본 수익률을 계산할 수 없습니다.');
      else if (loan > 0 && isFinite(cap)) note.push(ir * 100 > cap ? '대출 금리가 캡레이트보다 높아 대출을 쓸수록 자기자본 수익률이 낮아지는 구조(역레버리지)입니다.' : '대출 금리가 캡레이트보다 낮아 대출이 자기자본 수익률을 높이는 구조입니다.');
      return {
        equityYield: pct(ey), eqNote: '이자만 내는 대출 가정', gross: pct(price > 0 ? rentY / price * 100 : NaN), noi: won(noi) + ' / 년', cap: pct(cap),
        equity: won(equity), interest: won(interest), cash: won(cash) + ' / 년', dscr: interest > 0 ? fix(noi / interest, 2) + '배' : '대출 없음',
        stress: loan > 0 ? '자기자본 수익률 ' + pct(ey2) : '대출 없음', note: note.join(' ')
      };
    },
    area: function (g, src) {
      if (src === 'm2') g.set('py', fix(g.n('m2') / PY, 2));
      else if (src === 'py') g.set('m2', fix(g.n('py') * PY, 2));
      var c = g.n('contract'), e = g.n('exclusive'), rent = g.n('rent') * MAN, fee = g.n('mfee') * MAN, cpy = c / PY, epy = e / PY;
      return {
        ratio: c > 0 ? pct(e / c * 100, 1) : '–', ratioNote: e > c && c > 0 ? '전용면적이 계약면적보다 큽니다. 값을 확인하세요.' : '전용면적 ÷ 계약면적',
        cpy: fix(c, 2) + '㎡ (약 ' + fix(cpy, 1) + '평)', epy: fix(e, 2) + '㎡ (약 ' + fix(epy, 1) + '평)',
        rentC: cpy > 0 ? won(rent / cpy) + ' / 평' : '–', rentE: epy > 0 ? won(rent / epy) + ' / 평' : '–', noc: epy > 0 ? won((rent + fee) / epy) + ' / 평' : '–'
      };
    },
    acquisition: function (g) {
      var price = g.n('price') * MAN, tax = price * g.n('tax') / 100, rate = Math.min(g.n('rate'), 0.9), fee = price * rate / 100 * 1.1, legal = g.n('legal') * MAN,
        extra = tax + fee + legal, total = price + extra, equity = total - g.n('loan') * MAN - g.n('deposit') * MAN, note = [];
      if (g.n('rate') > 0.9) note.push('중개보수 요율은 상한인 0.9%로 계산했습니다.');
      note.push('부대비용은 매매가의 ' + pct(price > 0 ? extra / price * 100 : NaN, 2) + '입니다.');
      return { equity: won(equity), eqNote: '총 필요 자금 − 대출금 − 승계 보증금', taxOut: won(tax), feeOut: won(fee), legalOut: won(legal), extra: won(extra), total: won(total), note: note.join(' ') };
    },
    effective: function (g) {
      var rent = g.n('rent') * MAN, fee = g.n('mfee') * MAN, m = Math.max(1, Math.round(g.n('months'))), free = Math.min(m, Math.max(0, g.n('free'))), ti = g.n('ti') * MAN, py = g.n('py');
      var nominal = rent * m, saved = rent * free + ti, eff = (nominal - saved) / m;
      return {
        eff: won(eff), effNote: '명목 임대료 ' + won(rent) + ' 기준', nominal: won(nominal), saved: won(saved), disc: rent > 0 ? pct((1 - eff / rent) * 100, 1) + ' 낮음' : '–',
        effPy: py > 0 ? won(eff / py) + ' / 평' : '', nocPy: py > 0 ? won((eff + fee) / py) + ' / 평' : ''
      };
    },
    rentinc: function (g) {
      var dep = g.n('deposit') * MAN, rent = g.n('rent') * MAN, conv = g.n('conv') * MAN, base = g.n('base');
      var rate = Math.min(12, base * 4.5), by = base * 4.5 < 12 ? '기준금리 × 4.5배' : '연 12%';
      return {
        rentMax: won(rent * 1.05), rentNote: '최대 ' + won(rent * 0.05) + ' 인상 (5%)', depMax: won(dep * 1.05) + ' (최대 ' + won(dep * 0.05) + ' 인상)',
        convRate: '연 ' + pct(rate, 2) + ' (' + by + ' 적용)', convRent: '월 ' + won(conv * rate / 100 / 12),
        note: '환산보증금이 지역별 기준 이내인 임대차에 적용되는 상한입니다.'
      };
    }
  };

  function setup(box) {
    var type = box.getAttribute('data-calc'), fn = CALC[type]; if (!fn) return;
    var out = box.querySelector('.calc-out');
    var g = {
      n: function (k) { var el = box.querySelector('[data-n="' + k + '"]'); return el ? num(el.value) : 0; },
      s: function (k) { var r = box.querySelector('input[name="' + k + '"]:checked') || box.querySelector('select[name="' + k + '"]'); return r ? r.value : ''; },
      set: function (k, v) { var el = box.querySelector('[data-n="' + k + '"]'); if (el && document.activeElement !== el) el.value = v; }
    };
    function run(src) {
      box.querySelectorAll('[data-show]').forEach(function (el) { var p = el.getAttribute('data-show').split(':'); el.hidden = g.s(p[0]) !== p[1]; });
      box.querySelectorAll('[data-echo]').forEach(function (el) { var v = g.n(el.getAttribute('data-echo')); el.textContent = v ? won(v * MAN) : ''; });
      var r = fn(g, src);
      Object.keys(r).forEach(function (k) {
        if (k.charAt(0) === '_') return;
        box.querySelectorAll('[data-o="' + k + '"]').forEach(function (el) {
          el.textContent = r[k];
          var row = el.closest('.opt'); if (row) row.hidden = !r[k];
          if (el.tagName === 'TD') el.className = r[k] === '적용' ? 'y' : 'n';
          if (el.classList.contains('co-note')) el.hidden = !r[k];
        });
      });
      if (out && r._cls) { out.classList.remove('is-in', 'is-over'); out.classList.add(r._cls); }
    }
    var sent = false;
    box.addEventListener('input', function (e) {
      var k = e.target.getAttribute && e.target.getAttribute('data-n'); run(k);
      if (!sent) { sent = true; document.dispatchEvent(new CustomEvent('orbis:track', { detail: { ev: 'tool_use', label: box.getAttribute('data-tool') } })); }
    });
    box.addEventListener('change', function () { run(); });
    box.addEventListener('focusout', function (e) {
      var el = e.target; if (!el.matches || !el.matches('input[data-n]')) return;
      var raw = el.value.trim(); if (!raw) return;
      var v = num(raw), dec = (raw.split('.')[1] || '').replace(/[^0-9]/g, '').length;
      el.value = v.toLocaleString('ko-KR', { minimumFractionDigits: Math.min(dec, 2), maximumFractionDigits: 2 });
    });
    run();
  }
  function init() { document.querySelectorAll('.calc[data-calc]').forEach(setup); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
