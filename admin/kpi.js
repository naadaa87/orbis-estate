// 오르비스 관리자 — KPI 현황
// 방문(페이지뷰·방문자·머문 시간), 행동(클릭·전화·양식), 문의, 회원·구독자를 기간별로 봅니다.
// 숫자는 /api/admin/kpi 가 D1(pv·ev·leads 표)에서 계산해 줍니다.

const C1 = '#33609F'; // 기본 계열(파랑)
const C2 = '#C0871C'; // 두 번째 계열(금색)
const C3 = '#3E9E7E'; // 세 번째 계열(청록)
const FUNNEL = ['#184f95', '#256abf', '#3987e5', '#6da7ec'];
const HEAT = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const PERIODS = [['today', '오늘'], ['yesterday', '어제'], ['7d', '최근 7일'], ['30d', '최근 30일'], ['90d', '최근 90일'], ['month', '이번 달'], ['lastmonth', '지난 달']];
const TABS = [['overview', '개요'], ['content', '페이지·콘텐츠'], ['traffic', '유입 경로'], ['leads', '문의·전환'], ['members', '회원·구독자']];
const EVENTS = [
  ['click_phone', '전화 버튼', '전화번호를 누른 횟수'],
  ['click_kakao', '카카오톡 상담', '카카오톡 버튼을 누른 횟수'],
  ['cta_click', '상담·진단 버튼', '상담 신청·1차 진단 같은 주요 버튼'],
  ['form_start', '양식 작성 시작', '문의 양식에 처음 입력한 방문'],
  ['form_submit', '문의 접수 완료', '양식 제출이 끝난 횟수'],
  ['form_invalid', '양식 입력 오류', '필수 항목이 비어 제출이 막힌 횟수'],
  ['newsletter_signup', '뉴스레터 구독', '구독 신청 완료'],
  ['listing_open', '매물 상세 열기', '매물 카드를 눌러 상세를 본 횟수'],
  ['valuation_preview', '매각가 거래사례 조회', '지번으로 인근 거래사례를 조회한 횟수'],
  ['tool_use', '계산기 사용', '계산기에 값을 넣어 본 방문'],
  ['site_search', '사이트 안 검색', '검색 페이지에서 찾아본 횟수(라벨은 검색어)'],
  ['download_profile', '회사소개서 내려받기', '소개서 파일을 연 횟수'],
  ['analysis_run', '상권분석 실행', '상권분석 화면에서 분석을 돌린 횟수'],
  ['analysis_consult', '상권분석 → 상담', '분석 결과로 상담 받기를 누른 횟수'],
  ['report_print', '상권 리포트 인쇄', '리포트 인쇄·PDF 저장'],
  ['video_play', '영상 재생', '페이지 영상을 재생한 횟수'],
  ['click_email', '이메일 주소', '메일 주소를 누른 횟수'],
];
const COUNTRY = { KR: '한국', US: '미국', JP: '일본', CN: '중국', VN: '베트남', SG: '싱가포르', HK: '홍콩', TW: '대만', CA: '캐나다', AU: '호주', DE: '독일', GB: '영국', FR: '프랑스', TH: '태국', PH: '필리핀', XX: '알 수 없음', T1: 'Tor' };
const LEAD_KO = { new: '신규', contacted: '연락함', progress: '진행 중', contract: '계약', closed: '종료', spam: '스팸·무효' };

export function createKpi({ api, shell, $, $$, E, fail }) {
  const st = { range: ss('kpi_range') || '7d', from: ss('kpi_from') || '', to: ss('kpi_to') || '', data: null, members: null, tab: 'overview', key: '' };
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } return null; }

  // ------------------------------------------------------------ 숫자 표기
  const num = (n) => (n == null || isNaN(n) ? '-' : Math.round(n).toLocaleString('ko-KR'));
  const axisNum = (n) => (n >= 10000 ? (n / 10000).toFixed(n % 10000 ? 1 : 0).replace(/\.0$/, '') + '만' : n.toLocaleString('ko-KR'));
  const pct = (a, b, d = 1) => (b ? ((a / b) * 100).toFixed(d).replace(/\.0$/, '') + '%' : '-');
  function dur(ms) {
    if (!ms) return '-';
    const s = Math.round(ms / 1000); if (s < 60) return s + '초';
    const m = Math.floor(s / 60); const r = s % 60; if (m < 60) return r ? `${m}분 ${r}초` : `${m}분`;
    return `${Math.floor(m / 60)}시간 ${m % 60}분`;
  }
  const dlabel = (d) => { const [, m, dd] = d.split('-'); return `${+m}.${+dd}`; };
  const dlong = (d) => { const [y, m, dd] = d.split('-'); const w = DOW[new Date(d + 'T00:00:00Z').getUTCDay()]; return `${y}. ${+m}. ${+dd}. (${w})`; };
  const klabel = (k, unit) => (unit === 'hour' ? `${k}시` : dlabel(k));
  const cleanTitle = (t, path) => (path === '/' ? '홈 (메인)' : String(t || path || '').split(' | ')[0].trim() || path);
  const cleanPage = (p) => String(p || '').split(/[?#]/)[0].replace(/\.html$/, '') || '(기록 없음)';
  function delta(cur, prev, { good = 'up', show = true } = {}) {
    if (!show) return '';
    if (!prev) return cur ? '<span class="kd new">직전 기간 기록 없음</span>' : '<span class="kd">직전 기간과 같음</span>';
    const r = (cur - prev) / prev; if (Math.abs(r) < 0.005) return '<span class="kd">직전 기간과 같음</span>';
    const up = r > 0; const tone = good === 'none' ? '' : (up === (good === 'up') ? ' good' : ' bad');
    return `<span class="kd${tone}">${up ? '▲' : '▼'} ${Math.abs(r * 100).toFixed(Math.abs(r) < 0.1 ? 1 : 0)}%</span>`;
  }
  const textOn = (hex) => { const n = parseInt(hex.slice(1), 16); const L = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; return L > 0.56 ? '#1C1507' : '#fff'; };

  // ------------------------------------------------------------ 툴팁 (값은 textContent로만 넣습니다)
  let tip = document.getElementById('ktip');
  if (!tip) { tip = document.createElement('div'); tip.id = 'ktip'; tip.className = 'ktip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
  function showTip(x, y, title, rows) {
    tip.replaceChildren();
    const h = document.createElement('div'); h.className = 'kt-h'; h.textContent = title; tip.appendChild(h);
    for (const r of rows) {
      const row = document.createElement('div'); row.className = 'kt-r';
      if (r.color) { const k = document.createElement('i'); k.style.background = r.color; row.appendChild(k); }
      const v = document.createElement('b'); v.textContent = r.value; const l = document.createElement('span'); l.textContent = r.label;
      row.append(v, l); tip.appendChild(row);
    }
    tip.classList.add('on');
    const w = tip.offsetWidth; const hh = tip.offsetHeight;
    let left = x + 14; if (left + w > window.innerWidth - 8) left = x - w - 14; if (left < 8) left = 8;
    let top = y - hh - 12; if (top < 8) top = y + 16;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  const hideTip = () => tip.classList.remove('on');

  // ------------------------------------------------------------ 차트
  function niceStep(max, n = 4) {
    const raw = max / n; const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * p) return Math.max(1, m * p);
    return 10 * p;
  }
  function xTickIdx(n, want) {
    if (n <= want) return [...Array(n).keys()];
    const step = Math.ceil((n - 1) / (want - 1)); const out = [];
    for (let i = 0; i < n; i += step) out.push(i);
    if (out[out.length - 1] !== n - 1) { if (n - 1 - out[out.length - 1] < step / 2) out.pop(); out.push(n - 1); }
    return out;
  }
  // 선 차트: 계열 2개까지 (방문자·페이지뷰). 축은 하나만 씁니다.
  function lineChart(host, { keys, unit, series, extra }) {
    const W = Math.max(300, host.clientWidth); const H = 250; const m = { l: 46, r: 16, t: 14, b: 30 };
    const iw = W - m.l - m.r; const ih = H - m.t - m.b; const n = keys.length;
    const step = niceStep(Math.max(1, ...series.flatMap((s) => s.values))); const max = step * 4;
    const x = (i) => m.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1)); const y = (v) => m.t + ih - (v / max) * ih;
    let g = '';
    for (let i = 0; i <= 4; i++) { const yy = y(step * i); g += `<line x1="${m.l}" x2="${W - m.r}" y1="${yy}" y2="${yy}" class="kg"/><text x="${m.l - 8}" y="${yy + 4}" class="ky">${axisNum(step * i)}</text>`; }
    for (const i of xTickIdx(n, W < 520 ? 4 : 7)) g += `<text x="${x(i)}" y="${H - 8}" class="kx">${E(klabel(keys[i], unit))}</text>`;
    let lines = '';
    series.forEach((s, si) => {
      const pts = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
      if (si === 0) lines += `<path d="M${pts[0]} L${pts.join(' L')} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z" fill="${s.color}" opacity=".08"/>`;
      lines += `<polyline points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      lines += `<circle cx="${x(n - 1)}" cy="${y(s.values[n - 1])}" r="4" fill="${s.color}" stroke="#fff" stroke-width="2"/>`;
    });
    host.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${E(series.map((s) => s.name).join(', '))} 추이">${g}${lines}
      <line class="kc" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" style="display:none"/>${series.map((s, si) => `<circle class="kh kh${si}" r="4.5" fill="${s.color}" stroke="#fff" stroke-width="2" style="display:none"/>`).join('')}
      <rect class="ko" x="${m.l - 6}" y="${m.t}" width="${iw + 12}" height="${ih}" fill="transparent" tabindex="0" aria-label="그래프 위에서 날짜별 값을 봅니다. 왼쪽·오른쪽 화살표로 이동"/></svg>`;
    const svg = host.querySelector('svg'); const cross = svg.querySelector('.kc'); const ov = svg.querySelector('.ko'); let cur = n - 1;
    const at = (i, cx, cy) => {
      cur = i; const xx = x(i); cross.setAttribute('x1', xx); cross.setAttribute('x2', xx); cross.style.display = '';
      series.forEach((s, si) => { const c = svg.querySelector('.kh' + si); c.setAttribute('cx', xx); c.setAttribute('cy', y(s.values[i])); c.style.display = ''; });
      const r = svg.getBoundingClientRect();
      showTip(cx ?? r.left + xx, cy ?? r.top + m.t + 10, unit === 'hour' ? `${keys[i]}시` : dlong(keys[i]), [...series.map((s) => ({ color: s.color, value: num(s.values[i]), label: s.name })), ...(extra ? extra(i) : [])]);
    };
    const off = () => { cross.style.display = 'none'; series.forEach((s, si) => (svg.querySelector('.kh' + si).style.display = 'none')); hideTip(); };
    ov.addEventListener('pointermove', (e) => { const r = svg.getBoundingClientRect(); const px = e.clientX - r.left; const i = n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / iw) * (n - 1)))); at(i, e.clientX, e.clientY); });
    ov.addEventListener('pointerleave', off); ov.addEventListener('blur', off);
    ov.addEventListener('focus', () => at(cur));
    ov.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); at(Math.min(n - 1, cur + 1)); } if (e.key === 'ArrowLeft') { e.preventDefault(); at(Math.max(0, cur - 1)); } });
  }
  // 세로 막대: 한 계열 (일별 문의)
  function columnChart(host, { keys, unit, values, color, name }) {
    const W = Math.max(300, host.clientWidth); const H = 150; const m = { l: 46, r: 16, t: 18, b: 30 };
    const iw = W - m.l - m.r; const ih = H - m.t - m.b; const n = keys.length;
    const top = Math.max(1, ...values); const step = Math.max(1, Math.ceil(niceStep(top, 2))); const max = step * 2;
    const slot = iw / n; const bw = Math.max(2, Math.min(24, slot - 2)); const y = (v) => m.t + ih - (v / max) * ih;
    let g = '';
    for (let i = 0; i <= 2; i++) { const yy = y(step * i); g += `<line x1="${m.l}" x2="${W - m.r}" y1="${yy}" y2="${yy}" class="kg"/><text x="${m.l - 8}" y="${yy + 4}" class="ky">${axisNum(step * i)}</text>`; }
    for (const i of xTickIdx(n, W < 520 ? 4 : 7)) g += `<text x="${m.l + slot * i + slot / 2}" y="${H - 8}" class="kx">${E(klabel(keys[i], unit))}</text>`;
    const peak = values.indexOf(top);
    let bars = '';
    values.forEach((v, i) => {
      const cx = m.l + slot * i + slot / 2; const x0 = cx - bw / 2; const yy = y(v); const h = m.t + ih - yy; const r = Math.min(4, bw / 2, h);
      if (v > 0) bars += `<path d="M${x0},${m.t + ih} L${x0},${yy + r} Q${x0},${yy} ${x0 + r},${yy} L${x0 + bw - r},${yy} Q${x0 + bw},${yy} ${x0 + bw},${yy + r} L${x0 + bw},${m.t + ih} Z" fill="${color}"/>`;
      if (v > 0 && i === peak) bars += `<text x="${cx}" y="${yy - 5}" class="kv">${num(v)}</text>`;
      bars += `<rect class="kb" data-i="${i}" x="${m.l + slot * i}" y="${m.t}" width="${slot}" height="${ih}" fill="transparent"/>`;
    });
    host.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${E(name)}">${g}${bars}</svg>`;
    host.querySelectorAll('.kb').forEach((b) => {
      b.addEventListener('pointermove', (e) => { const i = +b.dataset.i; b.setAttribute('fill', 'rgba(20,36,62,.05)'); showTip(e.clientX, e.clientY, unit === 'hour' ? `${keys[i]}시` : dlong(keys[i]), [{ color, value: num(values[i]) + '건', label: name }]); });
      b.addEventListener('pointerleave', () => { b.setAttribute('fill', 'transparent'); hideTip(); });
    });
  }
  // 가로 막대 목록 (순위)
  function barList(items, { color = C1, fmt = num, total, empty = '아직 기록이 없습니다.' } = {}) {
    if (!items.length) return `<p class="empty sm">${empty}</p>`;
    const max = Math.max(...items.map((x) => x.n), 1);
    return `<div class="kbl">${items.map((x) => `<div class="kbr"${x.tip ? ` title="${E(x.tip)}"` : ''}><div class="kbn">${x.html || E(x.name)}</div><div class="kbt"><i style="width:${Math.max(1.5, (x.n / max) * 100)}%;background:${color}"></i></div><div class="kbv">${fmt(x.n)}${total ? `<small>${pct(x.n, total)}</small>` : ''}</div></div>`).join('')}</div>`;
  }
  // 하나를 여러 부분으로 나눈 막대 (기기·신규/재방문)
  function segBar(parts, unit = '') {
    const tot = parts.reduce((a, p) => a + p.n, 0);
    if (!tot) return '<p class="empty sm">아직 기록이 없습니다.</p>';
    const cols = [C1, C2, C3, '#8A94A6'];
    return `<div class="kseg" role="img" aria-label="${E(parts.map((p) => `${p.name} ${pct(p.n, tot)}`).join(', '))}">${parts.filter((p) => p.n).map((p, i) => { const c = cols[parts.indexOf(p)] || cols[3]; const share = p.n / tot; return `<div style="flex:${p.n};background:${c};color:${textOn(c)}" title="${E(`${p.name} ${num(p.n)}${unit} · ${pct(p.n, tot)}`)}">${share >= 0.12 ? pct(p.n, tot, 0) : ''}</div>`; }).join('')}</div>
      <div class="klg">${parts.map((p, i) => `<span><i style="background:${cols[i] || cols[3]}"></i>${E(p.name)} <b>${num(p.n)}</b>${unit}</span>`).join('')}</div>`;
  }
  function heatmap(host, cells) {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const c of cells) grid[c.dow][c.hour] = c.n;
    const max = Math.max(0, ...grid.flat());
    if (!max) { host.innerHTML = '<p class="empty sm">아직 기록이 없습니다.</p>'; return; }
    const order = [1, 2, 3, 4, 5, 6, 0];
    const col = (v) => (v ? HEAT[Math.min(HEAT.length - 1, Math.floor((v / max) * (HEAT.length - 0.001)))] : '#F1F3F6');
    host.innerHTML = `<div class="khm"><div></div>${Array.from({ length: 24 }, (_, h) => `<div class="khx">${h % 3 === 0 ? h : ''}</div>`).join('')}
      ${order.map((d) => `<div class="khy">${DOW[d]}</div>${grid[d].map((v, h) => `<div class="khc" data-d="${d}" data-h="${h}" data-v="${v}" style="background:${col(v)}"></div>`).join('')}`).join('')}</div>
      <div class="khl"><span>적음</span>${HEAT.map((c) => `<i style="background:${c}"></i>`).join('')}<span>많음</span><span class="khn">칸 하나는 그 요일·시간에 시작된 방문 수입니다.</span></div>`;
    host.querySelectorAll('.khc').forEach((c) => {
      c.addEventListener('pointermove', (e) => showTip(e.clientX, e.clientY, `${DOW[+c.dataset.d]}요일 ${c.dataset.h}시대`, [{ value: num(+c.dataset.v) + '회', label: '방문 시작' }]));
      c.addEventListener('pointerleave', hideTip);
    });
  }
  function funnel(steps) {
    const top = steps[0].n || 0;
    return `<div class="kfn">${steps.map((s, i) => `<div class="kfr"><div class="kfl"><b>${E(s.name)}</b><span>${E(s.desc)}</span></div>
      <div class="kft"><i style="width:${top ? Math.max(1.5, (s.n / top) * 100) : 0}%;background:${FUNNEL[i]}"></i></div>
      <div class="kfv"><b>${num(s.n)}</b><small>${i === 0 ? '기준' : `방문의 ${pct(s.n, top)}${i > 1 ? ` · 앞 단계의 ${pct(s.n, steps[i - 1].n)}` : ''}`}</small></div></div>`).join('')}</div>`;
  }

  // ------------------------------------------------------------ 화면 틀
  function frame(d) {
    const R = d.range;
    const sinceNote = d.since && R.from < d.since ? `<p class="note cool ksn">방문 통계는 <b>${dlong(d.since)}</b>부터 쌓였습니다. 그 전 날짜의 방문 숫자는 0으로 보이고, 문의 숫자는 그대로 나옵니다.</p>`
      : !d.since ? '<p class="note cool ksn">아직 쌓인 방문 기록이 없습니다. 이번 업데이트가 배포된 뒤 들어오는 방문부터 집계됩니다. 문의·구독자 숫자는 지금도 볼 수 있습니다.</p>' : '';
    let staff = false; try { staff = localStorage.getItem('orbis_notrack') === '1'; } catch (e) {}
    return `<div class="topline"><div><h2>KPI 현황</h2><p>${R.from === R.to ? dlong(R.from) : `${dlong(R.from)} ~ ${dlong(R.to)} · ${R.days}일`} · 증감은 바로 앞 같은 길이 기간(${dlabel(R.pfrom)}~${dlabel(R.pto)})과 비교합니다.</p></div>
      <div class="acts"><span class="klive"><i></i>지금 접속 <b>${num(d.live)}</b>명</span><button class="btn btn-line btn-sm" id="krf">새로고침</button></div></div>
      <div class="kfilter"><div class="tabs" id="kper">${PERIODS.map(([k, t]) => `<button data-k="${k}" class="${st.range === k ? 'on' : ''}">${t}</button>`).join('')}</div>
        <div class="kcus"><input type="date" id="kf" value="${E(st.range === 'custom' ? R.from : '')}" aria-label="시작일"><span>~</span><input type="date" id="kt" value="${E(st.range === 'custom' ? R.to : '')}" aria-label="종료일"><button class="btn btn-line btn-sm${st.range === 'custom' ? ' on' : ''}" id="kap">기간 적용</button></div></div>
      <nav class="ktabs" id="ktabs">${TABS.map(([k, t]) => `<a href="#/kpi/${k}" class="${st.tab === k ? 'on' : ''}">${t}</a>`).join('')}</nav>
      ${sinceNote}<div id="kv"></div>
      <p class="kstaff">${staff ? '이 브라우저는 관리자 브라우저라서 방문 통계에서 빠집니다.' : '이 브라우저의 방문도 지금은 통계에 들어갑니다.'} <button class="lnk" id="kst">${staff ? '통계에 다시 넣기' : '통계에서 빼기'}</button></p>`;
  }
  function bindFrame() {
    $$('#kper button').forEach((b) => (b.onclick = () => { st.range = b.dataset.k; ss('kpi_range', st.range); load(); }));
    $('#kap').onclick = () => { const f = $('#kf').value; const t = $('#kt').value; if (!f || !t) return fail(new Error('시작일과 종료일을 모두 골라 주세요.')); st.range = 'custom'; st.from = f; st.to = t; ss('kpi_range', 'custom'); ss('kpi_from', f); ss('kpi_to', t); load(); };
    $('#krf').onclick = () => load(true);
    $('#kst').onclick = () => { try { localStorage.setItem('orbis_notrack', localStorage.getItem('orbis_notrack') === '1' ? '0' : '1'); } catch (e) {} paint(); };
  }
  const q = () => `range=${encodeURIComponent(st.range)}${st.range === 'custom' ? `&from=${st.from}&to=${st.to}` : ''}`;

  // ------------------------------------------------------------ 탭: 개요
  function tile(label, value, d, sub = '', tone = '') { return `<div class="card kt${tone}"><span class="kl">${label}</span><b class="kn">${value}</b><div class="ks">${d}${sub ? `<span>${sub}</span>` : ''}</div></div>`; }
  function overview(d) {
    const c = d.summary.cur; const p = d.summary.prev; const ret = c.visitors - c.new_visitors;
    const pts = d.trend.points; const keys = pts.map((x) => x.k); const unit = d.trend.unit;
    const chs = d.channels.map((x) => ({ name: x.channel || '알 수 없음', n: x.n }));
    const topPages = d.pages.slice(0, 6).map((x) => ({ name: cleanTitle(x.title, x.path), n: x.pv, tip: x.path, html: `<a href="${E(x.path)}" target="_blank" rel="noopener">${E(cleanTitle(x.title, x.path))}</a>` }));
    const dev = ['모바일', 'PC', '태블릿'].map((k) => ({ name: k, n: (d.devices.find((x) => x.k === k) || {}).n || 0 }));
    return `<div class="grid g4 kts">
      ${tile('방문자', num(c.visitors), delta(c.visitors, p.visitors), `신규 ${num(c.new_visitors)} · 재방문 ${num(ret)}`)}
      ${tile('방문 수', num(c.sessions), delta(c.sessions, p.sessions), `방문당 ${c.sessions ? (c.pageviews / c.sessions).toFixed(1) : '-'}페이지`)}
      ${tile('페이지뷰', num(c.pageviews), delta(c.pageviews, p.pageviews))}
      ${tile('방문당 머문 시간', dur(c.avg_dur), delta(c.avg_dur, p.avg_dur), `참여한 방문 ${pct(c.engaged, c.sessions, 0)}`)}
      ${tile('문의 접수', num(c.leads) + '<small>건</small>', delta(c.leads, p.leads), `방문 대비 ${pct(c.leads, c.sessions)}`, ' gold')}
      ${tile('전화 버튼', num(c.phone) + '<small>회</small>', delta(c.phone, p.phone), `누른 방문 ${num(c.phone_s)}`)}
      ${tile('양식 작성 시작', num(c.form_start_s) + '<small>회</small>', delta(c.form_start_s, p.form_start_s), c.form_start_s ? `제출까지 ${pct(c.form_submit_s, c.form_start_s, 0)}` : '')}
      ${tile('뉴스레터 신규 구독', num(c.subscribers) + '<small>명</small>', delta(c.subscribers, p.subscribers))}
    </div>
    <div class="card" style="margin-top:16px"><div class="kch"><h3>${unit === 'hour' ? '시간대별' : '날짜별'} 방문 추이</h3><div class="klg"><span><i class="ln" style="background:${C1}"></i>방문자</span><span><i class="ln" style="background:${C2}"></i>페이지뷰</span></div></div>
      <div id="kline" class="kcv"></div>
      <h3 style="margin-top:14px">${unit === 'hour' ? '시간대별' : '날짜별'} 문의 접수</h3><div id="kcol" class="kcv"></div>
      <details class="ktv"><summary>표로 보기</summary><div class="tbl-wrap"><table><thead><tr><th>${unit === 'hour' ? '시간' : '날짜'}</th><th class="r">방문자</th><th class="r">방문</th><th class="r">페이지뷰</th><th class="r">문의</th></tr></thead><tbody>
      ${pts.slice().reverse().map((x) => `<tr><td>${E(unit === 'hour' ? x.k + '시' : dlong(x.k))}</td><td class="r">${num(x.v)}</td><td class="r">${num(x.s)}</td><td class="r">${num(x.pv)}</td><td class="r">${num(x.leads)}</td></tr>`).join('')}</tbody></table></div></details></div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h3>방문에서 문의까지</h3>${funnel([
        { name: '방문', desc: '사이트에 들어온 횟수', n: c.sessions },
        { name: '참여한 방문', desc: '2페이지 이상 보거나 10초 넘게 머묾', n: c.engaged },
        { name: '양식 작성 시작', desc: '문의 양식에 입력을 시작함', n: c.form_start_s },
        { name: '문의 접수', desc: '양식 제출까지 마침', n: c.form_submit_s },
      ])}<p class="khint">같은 기간 전화 버튼을 누른 방문은 <b>${num(c.phone_s)}</b>회입니다. 전화 문의는 양식 접수와 따로 셉니다.</p></div>
      <div class="card"><div class="kch"><h3>유입 채널</h3><a class="lnk" href="#/kpi/traffic">자세히</a></div>${barList(chs, { total: chs.reduce((a, x) => a + x.n, 0) })}</div>
      <div class="card"><div class="kch"><h3>많이 본 페이지</h3><a class="lnk" href="#/kpi/content">전체 보기</a></div>${barList(topPages)}</div>
      <div class="card"><h3>방문자 구성</h3><div class="kmini"><span class="kl">신규·재방문 (방문자 기준)</span>${segBar([{ name: '처음 온 방문자', n: c.new_visitors }, { name: '다시 온 방문자', n: Math.max(0, ret) }], '명')}</div>
        <div class="kmini"><span class="kl">기기 (방문 기준)</span>${segBar(dev, '회')}</div></div>
    </div>
    <div class="card" style="margin-top:16px"><h3>요일·시간대별 방문</h3><div id="kheat"></div></div>`;
  }
  function drawOverview(d) {
    const pts = d.trend.points; const keys = pts.map((x) => x.k); const unit = d.trend.unit;
    const draw = () => {
      const a = $('#kline'); if (!a) return;
      lineChart(a, { keys, unit, series: [{ name: '방문자', color: C1, values: pts.map((x) => x.v) }, { name: '페이지뷰', color: C2, values: pts.map((x) => x.pv) }], extra: (i) => [{ value: num(pts[i].s), label: '방문' }, { value: num(pts[i].leads) + '건', label: '문의' }] });
      columnChart($('#kcol'), { keys, unit, values: pts.map((x) => x.leads), color: C1, name: '문의 접수' });
    };
    draw(); heatmap($('#kheat'), d.heat);
    return draw;
  }

  // ------------------------------------------------------------ 탭: 페이지·콘텐츠
  function pageRows(list, withEntries = true) {
    if (!list.length) return `<tr><td colspan="${withEntries ? 6 : 5}" class="empty">아직 기록이 없습니다.</td></tr>`;
    const max = Math.max(...list.map((x) => x.pv), 1);
    return list.map((x) => `<tr><td><div class="ttl"><a href="${E(x.path)}" target="_blank" rel="noopener">${E(cleanTitle(x.title, x.path))}</a></div><div class="sub">${E(x.path)}</div></td>
      <td class="r"><b>${num(x.pv)}</b><div class="kmb"><i style="width:${Math.max(2, (x.pv / max) * 100)}%"></i></div></td><td class="r">${num(x.v)}</td>${withEntries ? `<td class="r">${num(x.entries)}</td>` : ''}<td class="r">${dur(x.dur)}</td><td class="r">${x.sc ? x.sc + '%' : '-'}</td></tr>`).join('');
  }
  function content(d) {
    const c = d.summary.cur; const p = d.summary.prev;
    const evRows = EVENTS.map(([k, t, desc]) => ({ k, t, desc, n: c.events[k]?.n || 0, s: c.events[k]?.s || 0, pn: p.events[k]?.n || 0 })).filter((x) => x.n || x.pn || ['click_phone', 'cta_click', 'form_start', 'form_submit'].includes(x.k));
    const maxClick = Math.max(1, ...d.clicks.map((x) => x.n));
    return `<div class="card"><div class="kch"><h3>주요 행동</h3><span class="khint">전체 클릭 ${num(c.clicks)}회</span></div>
      <div class="kev">${evRows.map((x) => `<div class="kei"><span class="kl" title="${E(x.desc)}">${E(x.t)}</span><b>${num(x.n)}</b>${delta(x.n, x.pn)}<small>${x.s && x.s !== x.n ? `방문 ${num(x.s)}회에서` : E(x.desc)}</small></div>`).join('')}</div></div>
    <div class="kh3">많이 본 페이지</div>
    <div class="tbl-wrap"><table class="kpt"><thead><tr><th>페이지</th><th class="r">페이지뷰</th><th class="r">방문자</th><th class="r" title="이 페이지로 사이트에 처음 들어온 횟수">첫 페이지</th><th class="r" title="화면을 보고 움직인 시간 평균">평균 머문 시간</th><th class="r" title="페이지를 어디까지 내려 봤는지 평균">스크롤</th></tr></thead><tbody>${pageRows(d.pages)}</tbody></table></div>
    <div class="kh3">많이 읽은 인사이트 글</div>
    <div class="tbl-wrap"><table class="kpt"><thead><tr><th>글</th><th class="r">조회</th><th class="r">읽은 사람</th><th class="r">평균 머문 시간</th><th class="r">스크롤</th></tr></thead><tbody>${pageRows(d.insights, false)}</tbody></table></div>
    <div class="kh3">많이 누른 버튼·링크</div>
    <div class="tbl-wrap"><table class="kpt"><thead><tr><th>버튼·링크 문구</th><th>이동하는 곳</th><th class="r">클릭</th><th class="r">누른 방문</th></tr></thead><tbody>
    ${d.clicks.length ? d.clicks.map((x) => `<tr><td><b>${E(x.label)}</b></td><td class="sub">${E(x.target === 'tel' ? '전화 걸기' : x.target === 'mailto' ? '메일 쓰기' : x.target || '같은 페이지 안')}</td><td class="r"><b>${num(x.n)}</b><div class="kmb"><i style="width:${Math.max(2, (x.n / maxClick) * 100)}%"></i></div></td><td class="r">${num(x.s)}</td></tr>`).join('') : '<tr><td colspan="4" class="empty">아직 기록이 없습니다.</td></tr>'}</tbody></table></div>`;
  }

  // ------------------------------------------------------------ 탭: 유입 경로
  function traffic(d) {
    const tot = d.channels.reduce((a, x) => a + x.n, 0);
    const maxCh = Math.max(1, ...d.channels.map((x) => x.n));
    const src = d.sources.map((x) => ({ name: x.src, n: x.n, html: `${E(x.src)} <span class="sub">${E(x.channel)}</span>` }));
    return `<div class="card"><h3>유입 채널별 방문과 문의</h3>
      <div class="tbl-wrap flat"><table class="kpt"><thead><tr><th>채널</th><th class="r">방문</th><th class="r">비율</th><th class="r">문의 접수</th><th class="r">전화 버튼</th><th class="r" title="문의 접수 또는 전화 버튼을 누른 방문의 비율">연락 전환율</th></tr></thead><tbody>
      ${d.channels.length ? d.channels.map((x) => `<tr><td><b>${E(x.channel || '알 수 없음')}</b></td><td class="r"><b>${num(x.n)}</b><div class="kmb"><i style="width:${Math.max(2, (x.n / maxCh) * 100)}%"></i></div></td><td class="r">${pct(x.n, tot)}</td><td class="r">${num(x.forms)}</td><td class="r">${num(x.calls)}</td><td class="r">${pct(Math.min(x.n, x.forms + x.calls), x.n)}</td></tr>`).join('') : '<tr><td colspan="6" class="empty">아직 기록이 없습니다.</td></tr>'}</tbody></table></div>
      <p class="khint">검색은 네이버·구글·다음 같은 검색 결과에서, SNS·커뮤니티는 블로그·카페·카카오톡·인스타그램에서 온 방문입니다. 주소 뒤에 utm_source를 붙여 공유한 링크는 '캠페인'으로 따로 잡힙니다.</p></div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h3>유입 출처 (검색엔진·사이트)</h3>${barList(src, { total: tot })}</div>
      <div class="card"><h3>캠페인 링크 (utm)</h3>${barList(d.campaigns.map((x) => ({ name: x.src, n: x.n, html: `${E(x.src)}${x.campaign ? ` <span class="sub">${E(x.campaign)}</span>` : ''}` })), { empty: '아직 캠페인 링크로 들어온 방문이 없습니다. 블로그·문자에 링크를 걸 때 ?utm_source=blog 처럼 붙이면 여기서 따로 셉니다.' })}</div>
    </div>
    <div class="kh3">처음 들어온 페이지</div>
    <div class="tbl-wrap"><table class="kpt"><thead><tr><th>첫 페이지</th><th class="r">방문</th><th class="r" title="2페이지 이상 보거나 10초 넘게 머문 방문">참여율</th><th class="r">문의 접수</th><th class="r">전화 버튼</th></tr></thead><tbody>
    ${d.landing.length ? d.landing.map((x) => `<tr><td><div class="ttl"><a href="${E(x.path)}" target="_blank" rel="noopener">${E(cleanTitle(x.title, x.path))}</a></div><div class="sub">${E(x.path)}</div></td><td class="r"><b>${num(x.n)}</b></td><td class="r">${pct(x.eng, x.n, 0)}</td><td class="r">${num(x.forms)}</td><td class="r">${num(x.calls)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">아직 기록이 없습니다.</td></tr>'}</tbody></table></div>
    <div class="grid g3" style="margin-top:16px">
      <div class="card"><h3>기기</h3>${barList(d.devices.map((x) => ({ name: x.k || '알 수 없음', n: x.n })), { total: d.devices.reduce((a, x) => a + x.n, 0) })}</div>
      <div class="card"><h3>브라우저·앱</h3>${barList(d.browsers.map((x) => ({ name: x.k || '알 수 없음', n: x.n })), { total: d.browsers.reduce((a, x) => a + x.n, 0) })}</div>
      <div class="card"><h3>접속 국가 (방문자)</h3>${barList(d.countries.map((x) => ({ name: COUNTRY[x.k] || x.k || '알 수 없음', n: x.n })), { total: d.countries.reduce((a, x) => a + x.n, 0) })}</div>
    </div>`;
  }

  // ------------------------------------------------------------ 탭: 문의·전환
  function leads(d) {
    const c = d.summary.cur; const p = d.summary.prev; const L = d.leads;
    const bs = Object.fromEntries(L.by_status.map((x) => [x.k, x.n]));
    const inRange = L.by_status.reduce((a, x) => a + x.n, 0);
    const pages = {}; for (const x of L.by_page) { const k = cleanPage(x.k); pages[k] = (pages[k] || 0) + x.n; }
    const titleOf = Object.fromEntries(d.pages.map((x) => [x.path, cleanTitle(x.title, x.path)]));
    const chConv = d.channels.filter((x) => x.forms).map((x) => ({ name: x.channel, n: x.forms }));
    return `<div class="grid g4 kts">
      ${tile('기간 내 문의', num(c.leads) + '<small>건</small>', delta(c.leads, p.leads), `방문 대비 ${pct(c.leads, c.sessions)}`, ' gold')}
      ${tile('계약 단계로 넘어간 문의', num(bs.contract || 0) + '<small>건</small>', '', `기간 내 문의의 ${pct(bs.contract || 0, inRange, 0)}`)}
      ${tile('처리 중인 문의 (전체)', num(L.open) + '<small>건</small>', '', '신규·연락함·진행 중')}
      ${tile('하루 넘게 신규로 남은 문의', num(L.stale_new) + '<small>건</small>', L.stale_new ? '<span class="kd bad">⚠ 연락 필요</span>' : '<span class="kd good">✓ 밀린 문의 없음</span>', '', L.stale_new ? ' warn' : '')}
    </div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><div class="kch"><h3>문의 유형별</h3><a class="lnk" href="#/leads">상담 접수로</a></div>${barList(L.by_type.map((x) => ({ name: x.k || '일반', n: x.n })), { total: inRange, empty: '이 기간에 들어온 문의가 없습니다.' })}</div>
      <div class="card"><h3>처리 상태 (기간 내 문의)</h3>${barList(['new', 'contacted', 'progress', 'contract', 'closed'].map((k) => ({ name: LEAD_KO[k], n: bs[k] || 0 })).filter((x) => x.n), { total: inRange, empty: '이 기간에 들어온 문의가 없습니다.' })}</div>
      <div class="card"><h3>문의가 들어온 페이지</h3>${barList(Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => ({ name: titleOf[k] || k, n, tip: k })), { total: inRange, empty: '이 기간에 들어온 문의가 없습니다.' })}</div>
      <div class="card"><h3>문의를 만든 유입 채널</h3>${barList(chConv, { empty: '아직 연결된 기록이 없습니다. 방문 통계가 쌓인 뒤 접수부터 채널이 보입니다.' })}<p class="khint">양식 접수 완료 기준입니다. 전화 문의는 '유입 경로' 탭의 전화 버튼 칸을 보세요.</p></div>
    </div>
    <div class="card" style="margin-top:16px"><h3>방문에서 문의까지</h3>${funnel([
      { name: '방문', desc: '사이트에 들어온 횟수', n: c.sessions },
      { name: '참여한 방문', desc: '2페이지 이상 보거나 10초 넘게 머묾', n: c.engaged },
      { name: '양식 작성 시작', desc: '문의 양식에 입력을 시작함', n: c.form_start_s },
      { name: '문의 접수', desc: '양식 제출까지 마침', n: c.form_submit_s },
    ])}</div>`;
  }

  // ------------------------------------------------------------ 탭: 회원·구독자
  function members(m) {
    const S = m.subscribers; const C = m.customers;
    return `<p class="note cool" style="margin-bottom:16px">홈페이지에는 로그인하는 회원가입이 없습니다. 그래서 <b>뉴스레터 구독자</b>와 <b>문의 고객</b>(연락처가 같으면 한 사람으로 묶음)을 회원 명부로 봅니다. 기간 버튼은 '기간 내 신규' 숫자에만 적용됩니다.</p>
    <div class="grid g4 kts">
      ${tile('뉴스레터 구독자 (누적)', num(S.total) + '<small>명</small>', '', `기간 내 신규 ${num(S.fresh)}명`)}
      ${tile('문의 고객 (누적)', num(C.total) + '<small>명</small>', '', `기간 내 신규 ${num(C.fresh)}명`, ' gold')}
      ${tile('두 번 이상 문의한 고객', num(C.repeat) + '<small>명</small>', '', `고객의 ${pct(C.repeat, C.total, 0)}`)}
      ${tile('기간 내 새로 온 고객', num(C.fresh + S.fresh) + '<small>명</small>', '', '문의 고객 + 구독자')}
    </div>
    <div class="kch kh3"><span>문의 고객 목록</span><a class="btn btn-line btn-sm" href="/api/admin/kpi/members.csv?kind=customers" download>엑셀(CSV) 내려받기</a></div>
    <div class="tbl-wrap"><table class="kpt kmem"><thead><tr><th>성함·업체명</th><th>연락처</th><th class="r">문의 수</th><th>첫 문의</th><th>최근 문의</th><th>최근 유형</th><th>상태</th></tr></thead><tbody>
    ${C.list.length ? C.list.map((x) => `<tr><td><a href="#/lead/${E(x.id)}"><b>${E(x.name || '이름 없음')}</b></a>${x.email ? `<div class="sub">${E(x.email)}</div>` : ''}</td><td class="nowrap">${x.phone ? `<a href="tel:${E(String(x.phone).replace(/[^0-9+]/g, ''))}">${E(x.phone)}</a>` : '-'}</td><td class="r">${num(x.n)}</td><td class="nowrap">${E(fmtD(x.first))}</td><td class="nowrap">${E(fmtD(x.last))}</td><td>${E(x.type || '')}</td><td class="nowrap">${E(LEAD_KO[x.status] || x.status || '')}</td></tr>`).join('') : '<tr><td colspan="7" class="empty">아직 문의 고객이 없습니다.</td></tr>'}</tbody></table></div>
    <div class="kch kh3"><span>뉴스레터 구독자</span><a class="btn btn-line btn-sm" href="/api/admin/kpi/members.csv?kind=subscribers" download>엑셀(CSV) 내려받기</a></div>
    <div class="tbl-wrap"><table class="kpt"><thead><tr><th>이메일</th><th>처음 구독</th><th>최근 신청</th><th class="r">신청 횟수</th></tr></thead><tbody>
    ${S.list.length ? S.list.map((x) => `<tr><td><a href="#/lead/${E(x.id)}"><b>${E(x.email)}</b></a></td><td class="nowrap">${E(fmtD(x.first))}</td><td class="nowrap">${E(fmtD(x.last))}</td><td class="r">${num(x.n)}</td></tr>`).join('') : '<tr><td colspan="4" class="empty">아직 구독자가 없습니다. 인사이트 목록 아래 구독 칸으로 신청할 수 있습니다.</td></tr>'}</tbody></table></div>
    <p class="khint" style="margin-top:12px">구독 해지 요청이 오면 상담 접수에서 해당 건을 '스팸·무효'로 바꾸거나 지우면 목록에서 빠집니다.</p>`;
  }
  function fmtD(iso) { if (!iso) return '-'; const d = new Date(new Date(iso).getTime() + 9 * 3600e3); return isNaN(d) ? '-' : d.toISOString().slice(0, 16).replace('T', ' ').replace(/-/g, '.'); }

  // ------------------------------------------------------------ 그리기·불러오기
  let redraw = null;
  // 좁은 화면에서는 표를 카드처럼 보여 주므로, 칸마다 제목을 붙여 둡니다
  function labelCells(root) {
    root.querySelectorAll('table.kpt').forEach((t) => {
      const hs = [...t.querySelectorAll('thead th')].map((h) => h.textContent.trim());
      t.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((td, i) => { if (hs[i]) td.setAttribute('data-h', hs[i]); }));
    });
  }
  function paint() {
    const d = st.data; if (!d) return;
    $('#view').innerHTML = frame(d); bindFrame(); focusTab();
    const kv = $('#kv'); redraw = null;
    if (st.tab === 'members') {
      if (st.members && st.members._key === st.key) kv.innerHTML = members(st.members);
      else { kv.innerHTML = '<div class="empty">불러오는 중…</div>'; api('/kpi/members?' + q()).then((m) => { m._key = st.key; st.members = m; if (st.tab === 'members' && $('#kv')) { $('#kv').innerHTML = members(m); labelCells($('#kv')); } }).catch(fail); }
      labelCells(kv); return;
    }
    if (st.tab === 'content') kv.innerHTML = content(d);
    else if (st.tab === 'traffic') kv.innerHTML = traffic(d);
    else if (st.tab === 'leads') kv.innerHTML = leads(d);
    else { kv.innerHTML = overview(d); redraw = drawOverview(d); }
    labelCells(kv);
  }
  function focusTab() { const a = $('#ktabs a.on'); if (a && a.scrollIntoView) a.parentElement.scrollLeft = a.offsetLeft - 16; }
  async function load(force = false) {
    const key = q();
    if (!force && st.data && st.key === key) return paint();
    const kv = $('#kv'); if (kv) kv.classList.add('kload');
    try {
      const d = await api('/kpi?' + key);
      st.data = d; st.key = key; if (force) st.members = null; paint();
    } catch (e) {
      if (kv) kv.classList.remove('kload');
      if (e.data?.error === 'no_db') { $('#view').innerHTML = '<div class="topline"><div><h2>KPI 현황</h2></div></div><div class="card"><p class="note">Cloudflare에 D1 데이터베이스(변수 이름 DB)가 연결되지 않아 통계를 볼 수 없습니다.</p></div>'; return; }
      fail(e);
    }
  }
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (redraw && $('#kline')) redraw(); }, 150); });

  return {
    async view(tab) {
      st.tab = TABS.some(([k]) => k === tab) ? tab : 'overview';
      if (st.data && $('#ktabs')) { paint(); return; }
      shell('kpi', '<div class="empty">불러오는 중…</div>');
      st.data = null; await load();
    },
    // 대시보드 맨 위 요약 줄
    async strip(el) {
      try {
        const d = await api('/kpi?range=7d&lite=1'); const c = d.summary.cur; const p = d.summary.prev;
        el.innerHTML = `<div class="lc-head"><h3>최근 7일 홈페이지</h3><a class="btn btn-line btn-sm" href="#/kpi">KPI 현황 보기</a></div>
          <div class="kdash">${[['방문자', c.visitors, p.visitors, '명'], ['페이지뷰', c.pageviews, p.pageviews, ''], ['문의 접수', c.leads, p.leads, '건'], ['전화 버튼', c.phone, p.phone, '회']].map(([t, v, pv, u]) => `<a href="#/kpi" class="lc-k"><b>${num(v)}<small>${u}</small></b><span>${t} ${delta(v, pv)}</span></a>`).join('')}</div>`;
      } catch (e) { el.remove(); }
    },
  };
}
