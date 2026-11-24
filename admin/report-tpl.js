// 오르비스 리포트 — 쪽 그리기 (매각 가격 검토 보고서 A4 / 매각 투자안내서 IM 16:9)
// renderReport(doc) → { kind, size, pages: [쪽 HTML…], html } — 내용이 없는 쪽·블록은 자동으로 빠집니다.
import * as C from './report-calc.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\r?\n/g, '<br>');
const has = (v) => v != null && String(v).trim() !== '';
const j = (arr, sep = ' ') => arr.filter((x) => has(x)).join(sep);
const dash = (v) => (has(v) ? esc(v) : '-');
const safeSrc = (src) => (typeof src === 'string' && /^(\/api\/media\/|\/assets\/|https:\/\/|data:image\/|blob:)/.test(src) ? src : '');
const img = (o, cls = '') => { const s = safeSrc(o && o.src); return s ? `<img class="${cls}" src="${esc(s)}" alt="${esc((o && o.caption) || '')}">` : ''; };
const ymDot = (v) => { const m = String(v || '').match(/(\d{4})\D?(\d{1,2})?/); return m ? m[1] + (m[2] ? '.' + m[2].padStart(2, '0') : '') : ''; };
/** "제목줄 + 내용" 묶음: 빈 줄로 나눈 덩어리의 첫 줄은 굵은 제목, 나머지는 내용 */
const blocks = (text) => String(text || '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).map((b) => { const [h, ...r] = b.split(/\n/); return { h: h.trim(), p: r.join('\n').trim() }; });

const LOGO = '<div class="ph-logo"><img src="/assets/logo-icon.png" alt=""><span>REAL ESTATE<br>BROKERAGE</span></div>';
function footer(doc, no) {
  const c = { ...C.CONTACT, ...(doc.contact || {}) };
  return `<footer class="pf"><div class="pf-l">${C.FIRM.name} · 중개사무소 등록번호 ${C.FIRM.reg}<br>${C.FIRM.addr} | 대표 ${C.FIRM.ceo}</div>
  <div class="pf-r">Contact : ${esc(j([c.role, c.name]))} | ${esc(c.phone)} / ${esc(c.email)}<b>${String(no).padStart(2, '0')}</b></div></footer>`;
}
function page(doc, size, no, head, body, cls = '') {
  return `<section class="pg ${size} ${cls}" data-no="${no}"><i class="pg-bar"></i>
  <header class="ph"><div class="ph-t"><p class="ph-eye">${esc(head.eye)}</p><h2>${esc(head.title)}${has(head.sub) ? `<span>${esc(head.sub)}</span>` : ''}</h2></div>${LOGO}</header>
  <div class="pb">${body}</div>${footer(doc, no)}</section>`;
}
const st = (t) => `<h3 class="st">${esc(t)}</h3>`;
const kv = (rows, cls = '') => { const r = rows.filter((x) => x && has(x[1]) && x[1] !== '-'); return r.length ? `<table class="kv ${cls}"><tbody>${r.map(([k, v, b]) => `<tr><th>${esc(k)}</th><td${b ? ' class="b"' : ''}>${v}</td></tr>`).join('')}</tbody></table>` : ''; };
const card = (label, value, sub = '', cls = '') => `<div class="cd ${cls}"><span class="cd-l">${esc(label)}</span><b class="cd-v">${value}</b>${has(sub) ? `<span class="cd-s">${sub}</span>` : ''}</div>`;
const box = (label, text, cls = '') => (has(text) ? `<div class="bx ${cls}"><b class="bx-l">${esc(label)}</b><p>${md(text)}</p></div>` : '');
const src = (parts) => { const t = j(parts, ', '); return t ? `<p class="src">[ 출처: ${esc(t)} ]</p>` : ''; };
const dt = (head, rows, cls = '') => `<table class="dt ${cls}"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;

// ============================================================ 매각 가격 검토 보고서 (A4)
function valuationPages(doc) {
  const c = C.calcValuation(doc); const s = doc.subject; const l = s.land; const b = s.bldg; const v = doc.val;
  const draft = C.draftValuation(doc, c); const subsAuto = C.valuationSubs(doc, c);
  const T = (k) => (has(v.text && v.text[k]) ? v.text[k] : draft[k] || '');
  const S = (k) => (has(v.subs && v.subs[k]) ? v.subs[k] : subsAuto[k] || '');
  const base = c.base; const P = []; const SZ = 'pg-a4';
  const where = j([s.dong, s.jibun]) || s.addr || s.name || '';
  const title = doc.title || C.defaultTitle(doc);
  const avmSrc = v.avm && v.avm.source; const month = ymDot(doc.date);
  const scale = C.scaleKo(b);
  const cover = safeSrc(s.cover && s.cover.src);
  const addrLine = j([s.addr, has(s.road) ? `(${s.road})` : '']);
  const specLine = j([has(l.area) ? `대지 ${C.comma(l.area, 2)}㎡(${C.comma(C.toPy(l.area), 2)}평)` : '', has(b.totArea) ? `연면적 ${C.comma(b.totArea, 2)}㎡(${C.comma(C.toPy(b.totArea), 2)}평)` : '', scale], ' · ');
  const specLine2 = j([c.builtYear ? `${c.builtYear}년 준공` : '', b.use, l.zone], ' · ');

  // 1. 표지
  P.push(`<section class="pg ${SZ} cv ${cover ? '' : 'cv-plain'}" data-no="1">
    ${cover ? `<div class="cv-photo"><img src="${esc(cover)}" alt=""></div>` : '<div class="cv-deco"><i></i><i></i></div>'}
    <div class="cv-body"><p class="cv-eye">COMMERCIAL REAL ESTATE ANALYSIS REPORT</p><h1>상업용부동산 분석보고서</h1><p class="cv-sub">${esc(title)}</p><i class="cv-rule"></i>
      <p class="cv-info">${esc(addrLine)}${specLine ? '<br>' + esc(specLine) : ''}${specLine2 ? '<br>' + esc(specLine2) : ''}</p>
      <img class="cv-logo" src="/assets/logo-full.png" alt="orbis real estate brokerage">
      <p class="cv-foot">ORBIS REAL ESTATE BROKERAGE · ${esc(month)} · STRICTLY CONFIDENTIAL</p></div></section>`);

  // 2. 물건 요약
  {
    const map = safeSrc(s.maps.location && s.maps.location.src);
    const rows = [
      ['소재지', dash(j([s.sgg, s.dong, s.jibun]) || s.addr)], ['용도지역', dash(l.zone)],
      ['대지면적', has(l.area) ? esc(C.areaPy(l.area)) : ''], ['연면적', has(b.totArea) ? esc(C.areaPy(b.totArea)) : ''],
      ['규모', dash(scale)], ['주용도', dash(b.use)],
      ['사용승인', has(b.approved) ? esc(C.dateDot(b.approved) + (c.age != null ? ` (${c.age}년차)` : '')) : ''],
      ['건폐율 / 용적률', has(b.bcr) || has(b.far) ? `${has(b.bcr) ? C.comma(b.bcr, 2) + '%' : '-'} / ${has(b.far) ? C.comma(b.far, 2) + '%' : '-'}` : ''],
      ['도로접면', dash(l.road)], ['보유세(연)', c.holdTax ? esc(C.man(c.holdTax.total)) : ''],
    ];
    const body = `${cover ? `<figure class="fig grow"><img src="${esc(cover)}" alt="">${has(s.cover.caption) ? `<figcaption>${esc(s.cover.caption)}</figcaption>` : ''}</figure>` : ''}
      <div class="row">${map ? `<div class="col w46">${st('위치도')}<figure class="fig map"><img src="${esc(map)}" alt="">${has(s.maps.location.caption) ? `<figcaption>${esc(s.maps.location.caption)}</figcaption>` : ''}</figure></div>` : ''}
      <div class="col">${st('물건 개요')}${kv(rows, 'tall')}</div></div>
      ${src([avmSrc, '건축물대장', map ? '지도 서비스' : '', doc.source])}`;
    P.push(page(doc, SZ, P.length + 1, { eye: '01 · SUMMARY', title: '물건 요약', sub: S('summary') }, body));
  }

  // 3. 시세 추정
  if (base) {
    const isAvm = base.source === 'avm';
    const cards = [
      card(base.label, `${C.eokF(base.total)}원`, esc(C.eokMan(base.total)), 'navy'),
      card('토지가액', `${C.eokF(base.land)}원`, `시세의 ${C.pct(base.landShare, 0)}${base.landM2 ? ` · ㎡당 약 ${C.manM2(base.landM2)}원` : ''}`),
      card('건물가액', `${C.eokF(base.bldg)}원`, j([`시세의 ${C.pct(1 - base.landShare, 0)}`, c.age != null ? `경과연수 ${c.age}년` : ''], ' · ')),
      base.ratio ? card('공시지가 대비 배율', C.pct(base.ratio), c.landPrice ? `개별공시지가 ${C.manM2(c.landPrice)}원/㎡` : '') : '',
    ].join('');
    const rows = [
      `<tr><th>토지가액</th><td>${base.method === 'avgUnit' ? `사례 평균 토지단가 ${C.manM2(c.avgUnit)}원/㎡ × ${C.comma(c.landArea, 2)}㎡` : c.landTotal && base.ratio ? `개별공시지가 ${esc(C.eokMan(c.landTotal))} × ${isAvm ? '' : '사례 평균 배율 '}${C.pct(base.ratio)}` : '거래사례 토지단가 적용'}</td><td>${esc(C.eokMan(base.land))}</td><td>${C.pct(base.landShare, 0)}</td></tr>`,
      `<tr><th>건물가액</th><td>${c.age != null ? `경과연수 ${c.age}년 잔존가치` : '잔존가치'}</td><td>${esc(C.eokMan(base.bldg))}</td><td>${C.pct(1 - base.landShare, 0)}</td></tr>`,
      `<tr class="sum"><th>${esc(base.label)}</th><td>토지가액 + 건물가액</td><td>${esc(C.eokMan(base.total))}</td><td>100%</td></tr>`,
      base.pyUnit ? `<tr><th>대지 평당가</th><td>시세 ÷ 대지 ${C.comma(c.landPy, 2)}평</td><td>약 ${esc(C.eokMan(base.pyUnit, true))}</td><td>-</td></tr>` : '',
    ];
    // 배율 비교 막대
    const bars = c.comps.filter((x) => x.ratio).map((x) => ({ label: x.tag, r: x.ratio }));
    if (base.ratio) bars.push({ label: isAvm ? '대상(AVM)' : '대상(추정)', r: base.ratio, me: true });
    bars.sort((a, b2) => a.r - b2.r);
    const mx = Math.max(...bars.map((x) => x.r), 0.0001);
    let posTxt = '';
    if (base.ratio && c.minRatio != null && c.comps.filter((x) => x.ratio).length >= 2) {
      const t = (base.ratio - c.minRatio) / (c.maxRatio - c.minRatio || 1);
      posTxt = `대상 배율은 사례 범위(${C.pct(c.minRatio).replace('%', '')}~${C.pct(c.maxRatio)})의 <b>${t < 0 ? '아래' : t > 1 ? '위' : t < 0.34 ? '하단 수준' : t > 0.66 ? '상단 수준' : '중간 수준'}.</b>`;
    }
    const chart = bars.length >= 2 ? `<div class="col">${st('공시지가 대비 배율 비교')}<div class="chart"><div class="chart-in">${bars.map((x) => `<div class="br ${x.me ? 'me' : ''}"><span>${esc(x.label)}</span><div><i style="width:${Math.max(4, (x.r / mx) * 100).toFixed(1)}%"></i></div><b>${C.pct(x.r)}</b></div>`).join('')}</div>${posTxt ? `<p class="chart-n">${posTxt}</p>` : ''}</div></div>` : '';
    const h = c.holdTax;
    const hold = h ? `<div class="col">${st(`보유세 (${c.refYear}년, 연)`)}${kv([
      ['토지분 재산세', esc(C.man(h.land.tax)), 1], ['토지분 도시지역분', esc(C.man(h.land.city)), 1], ['토지분 지방교육세', esc(C.man(h.land.edu)), 1],
      h.bldg ? ['건물분 소계', esc(C.man(h.bldg.total)), 1] : null, ['합계', esc(C.man(h.total)) + (h.bldg ? '' : ' <small>(토지분)</small>'), 1],
    ], chart ? 'fill' : '')}</div>` : '';
    const body = `<div class="cards c4">${cards}</div>${st('시세 산정 구조')}${dt(['구분', '산정 기준', '금액', '비중'], rows, 'calc')}
      ${box('ANALYSIS', T('analysis'))}
      ${chart || hold ? `<div class="row ${chart ? 'grow' : ''}">${chart}${hold}${chart ? '' : '<div class="col"></div>'}</div>` : ''}
      ${src([avmSrc, isAvm ? '' : '국토교통부 실거래가 공개자료', '오르비스 분석 · 단위: 원', doc.source])}`;
    P.push(page(doc, SZ, P.length + 1, { eye: '02 · VALUATION', title: isAvm ? 'AVM 시세 추정' : '시세 추정', sub: S('valuation') }, body));
  }

  // 4. 유사 거래사례
  if (c.comps.length) {
    const cs = c.comps.slice(0, 6); const two = (a, b2) => j([a, b2], '<br>');
    const line = (label, subj, f, cls = '') => `<tr class="${cls}"><th>${label}</th><td class="me">${subj}</td>${cs.map((x) => `<td>${f(x)}</td>`).join('')}</tr>`;
    const rows = [
      line('소재지', `<b>${esc(where)}</b>`, (x) => two(dash(x.addr), has(x.name) ? esc(x.name) : '')),
      line('거래가액', base ? `<b>${C.eokF(base.total)}</b><br><b>${esc(base.short)}</b>` : '-', (x) => (x.price ? C.eok(x.price) : '-')),
      line('거래일자', '-', (x) => dash(ymDot(x.date))),
      line('토지 ㎡당 단가', base && base.landM2 ? `<b>${C.manM2(base.landM2)}</b>` : '-', (x) => (x.landUnit ? C.manM2(x.landUnit) : '-')),
      line('공시지가 대비 배율', base && base.ratio ? `<b>${C.pct(base.ratio)}</b>` : '-', (x) => (x.ratio ? C.pct(x.ratio) : '-'), 'sep'),
      line('개별공시지가(㎡)', c.landPrice ? `<b>${C.manM2(c.landPrice)}</b>` : '-', (x) => (x.landPrice ? C.manM2(x.landPrice) : '-')),
      line('격차율(대상/사례)', '-', (x) => (x.gap ? C.pct(x.gap) : '-')),
      line('토지면적', c.landArea ? `<b>${C.comma(c.landArea, 2)}㎡</b>` : '-', (x) => (x.landArea ? C.comma(x.landArea, 2) + '㎡' : '-')),
      line('도로접면 / 형상', `<b>${two(dash(l.road), has(l.shape) ? esc(l.shape) : '')}</b>`, (x) => two(dash(x.road), has(x.shape) ? esc(x.shape) : '')),
      line('연면적 / 용적률', `<b>${two(has(b.totArea) ? C.comma(b.totArea, 2) + '㎡' : '-', has(b.far) ? C.comma(b.far, 2) + '%' : '')}</b>`, (x) => two(has(x.totArea) ? C.comma(x.totArea, 2) + '㎡' : '-', has(x.far) ? C.comma(x.far, 2) + '%' : '')),
      line('주용도 / 규모', `<b>${two(dash(String(b.use || '').replace(/^제(\d)종근린생활시설$/, '$1종근생')), esc(C.scaleShort(b).replace(/\s/g, '')))}</b>`, (x) => two(dash(x.use), has(x.scale) ? esc(x.scale) : '')),
      line('사용승인', c.builtYear ? `<b>${c.builtYear} (${c.age}년차)</b>` : '-', (x) => (x.builtYear ? `${x.builtYear} (${x.age}년차)` : '-')),
      line('보정 토지단가', '-', (x) => (x.adjUnit ? C.manM2(x.adjUnit) : '-')),
    ];
    const head = ['구분', '대상', ...cs.map((x) => esc(x.tag))];
    const mrows = c.methods.map((m) => `<tr><th>${esc(m.label)}</th><td>${esc(m.applied)}</td><td>${C.eok(m.land, 1, true)}원</td><td><b>약 ${C.eok(m.total, 1, true)}원</b></td></tr>`);
    const body = `${dt(head, rows, `cmp n${cs.length}`)}
      ${mrows.length ? `${st('사례 비준 검증 (사례 토지단가 × 대상/사례 공시지가 격차율)')}${dt(['검증 방식', '적용값', '토지가액', `추정 시세 (건물 ${C.eokF(c.bldgValue)} 포함)`], mrows, 'calc m')}` : '<p class="hint">사례의 개별공시지가를 넣으면 공시지가 대비 배율과 비준 검증이 계산됩니다.</p>'}
      ${box('CONCLUSION', T('conclusion'))}
      ${src([avmSrc ? avmSrc + ' 유사 거래사례' : '국토교통부 실거래가 공개자료', '오르비스 분석', doc.source])}`;
    P.push(page(doc, SZ, P.length + 1, { eye: '02 · COMPARABLES', title: '유사 거래사례', sub: S('comps') }, body));
  }

  // 5. 거래사례 위치도 (지도 이미지가 있을 때만)
  const cmap = safeSrc(s.maps.comps && s.maps.comps.src);
  if (c.comps.length && cmap) {
    const rows = [`<tr class="me"><th>대상</th><td><b>${esc(where)}</b></td><td><b>${base ? `${C.eokF(base.total)} (${base.source === 'avm' ? 'AVM' : '추정'})` : '-'}</b></td><td>-</td><td><b>${c.landArea ? C.comma(c.landArea, 2) + '㎡' : '-'}</b></td><td><b>${base && base.ratio ? C.pct(base.ratio) : '-'}</b></td><td>-</td></tr>`,
      ...c.comps.slice(0, 6).map((x) => `<tr><th>${esc(x.tag)}</th><td>${esc(j([x.addr, x.name]))}</td><td>${x.price ? C.eok(x.price) : '-'}</td><td>${dash(ymDot(x.date))}</td><td>${x.landArea ? C.comma(x.landArea, 2) + '㎡' : '-'}</td><td>${x.ratio ? C.pct(x.ratio) : '-'}</td><td>${dash(x.dist)}</td></tr>`)];
    const body = `<figure class="fig grow map"><img src="${esc(cmap)}" alt="">${has(s.maps.comps.caption) ? `<figcaption>${esc(s.maps.comps.caption)}</figcaption>` : ''}</figure>
      ${st('대상 및 사례별 거리')}${dt(['구분', '소재지', '거래가액', '거래일자', '토지면적', '공시지가 배율', '대상 기준 직선거리'], rows, 'calc dist')}
      ${src([avmSrc ? avmSrc + ' 유사 거래사례' : '국토교통부 실거래가 공개자료', '지도 서비스 · 거리는 지도 좌표 기준 직선거리', doc.source])}`;
    P.push(page(doc, SZ, P.length + 1, { eye: '02 · COMPARABLES MAP', title: '거래사례 위치도', sub: S('map') }, body));
  }

  // 6. 부동산 개요
  {
    const fi = c.farInfo;
    const land = kv([
      ['지목', dash(l.jimok)], ['토지면적', has(l.area) ? esc(C.areaPy(l.area)) : ''], ['용도지역', dash(l.zone)], ['기타 지역지구', dash(l.zone2)], ['기타 법률', dash(l.etc)],
      ['이용상황', dash(l.use)], ['도로접면', dash(l.road)], ['지형 높이 / 형상', has(l.terrain) || has(l.shape) ? esc(j([l.terrain, l.shape], ' / ')) : ''],
      ['개별공시지가', has(l.price) ? `${C.manM2(l.price)}원/㎡` : ''], ['법정 용적률', fi && fi.legalFar ? `${C.comma(fi.legalFar)}%` : ''],
    ]);
    const bld = kv([
      ['연면적', has(b.totArea) ? esc(C.areaPy(b.totArea)) : ''], ['용적률 산정면적', has(b.farArea) ? C.comma(b.farArea, 2) + '㎡' : ''], ['건축면적', has(b.archArea) ? C.comma(b.archArea, 2) + '㎡' : ''],
      ['건폐율 / 용적률', has(b.bcr) || has(b.far) ? `${has(b.bcr) ? C.comma(b.bcr, 2) + '%' : '-'} / ${has(b.far) ? C.comma(b.far, 2) + '%' : '-'}` : ''],
      ['주용도', dash(b.use)], ['구조 / 지붕', has(b.structure) || has(b.roof) ? esc(j([b.structure, b.roof], ' / ')) : ''],
      ['규모 / 높이', has(scale) ? esc(j([C.scaleShort(b), has(b.height) ? C.comma(b.height, 2) + 'm' : ''], ' · ')) : ''],
      ['주차 / 승강기', has(b.parking) || has(b.elevator) ? esc(j([b.parking, b.elevator], ' / ')) : ''], ['사용승인일', has(b.approved) ? esc(C.dateDot(b.approved)) : ''], ['대수선(리모델링)', dash(b.remodel)],
    ]);
    const flAll = (s.floors || []).filter((f) => f && (has(f.floor) || has(f.area)));
    const flTotal = flAll.reduce((a, f) => a + (C.num(f.area) || 0), 0);
    let fl = flAll.map((f) => ({ ...f }));
    if (fl.length > 10) { // 기준층이 반복되는 건물: '14층~2층 · 412.33 × 13개 층'
      const out = [];
      for (const f of fl) {
        const last = out[out.length - 1];
        if (last && last.use === f.use && last.structure === f.structure && C.num(last.unit) === C.num(f.area) && last.floor !== f.floor) { last.to = f.floor; last.n += 1; } else out.push({ ...f, unit: f.area, n: 1 });
      }
      fl = out.map((f) => (f.n > 1 ? { floor: `${f.floor}~${f.to}`, use: f.use, structure: f.structure, areaText: `${C.fix(f.unit, 2)} × ${f.n}개 층` } : f));
    }
    const flCut = fl.length > 13 ? fl.length - 12 : 0; if (flCut) fl = fl.slice(0, 12);
    let floors = '';
    if (fl.length) {
      const span = fl.map((f, i) => (i > 0 && fl[i - 1].floor === f.floor ? 0 : fl.slice(i).findIndex((g, k) => k > 0 && g.floor !== f.floor)));
      floors = dt(['층', '용도', '면적(㎡)', '구조'], [...fl.map((f, i) => `<tr>${span[i] === 0 ? '' : `<td${span[i] > 1 || (span[i] === -1 && fl.length - i > 1) ? ` rowspan="${span[i] === -1 ? fl.length - i : span[i]}"` : ''}>${dash(f.floor)}</td>`}<td>${dash(f.use)}</td><td>${has(f.areaText) ? esc(f.areaText) : has(f.area) ? C.fix(f.area, 2) : '-'}</td><td>${dash(f.structure)}</td></tr>`),
        flCut ? `<tr><td colspan="4">외 ${flCut}줄 (합계에 포함 · 전체는 건축물대장 참조)</td></tr>` : '',
        `<tr class="sum"><td colspan="2">합계</td><td>${C.fix(flTotal, 2)}</td><td></td></tr>`], `fl ${fl.length > 8 ? 'dense' : ''}`);
    }
    const o = s.owner || {};
    const own = kv([['소유구분', dash(o.type)], ['공유자 수', has(o.count) ? `${C.comma(o.count)}명` : '', 1], ['소유권 이전일', has(o.transfer) ? esc(C.dateDot(o.transfer)) : ''], ['토지 이동', dash(o.landMove)], ['세대 / 가구 / 호', dash(o.units)], ['주택분 면적', dash(o.housing)]], floors ? 'fill' : '');
    const cards = fi && fi.remain != null ? `<div class="cards c4">${[
      card('법정 용적률', `${C.comma(fi.legalFar)}%`, esc(l.zone || '')), card('현재 용적률', `${C.comma(fi.far, 2)}%`, has(b.farArea) ? `산정면적 ${C.comma(b.farArea, 2)}㎡` : ''),
      card('잔여 용적률', `${C.comma(fi.remain, 2)}%p`, '신축 시 확대 여지', 'navy'), card('법정 최대 산정면적', `약 ${C.comma(fi.maxArea, 1)}㎡`, fi.times ? `현재의 약 ${C.comma(fi.times, 1)}배` : ''),
    ].join('')}</div>` : '';
    const body = `<div class="row">${land ? `<div class="col">${st('토지 현황')}${land}</div>` : ''}${bld ? `<div class="col">${st('건물 현황')}${bld}</div>` : ''}</div>
      ${floors || own ? `<div class="row ${floors && own ? 'grow' : ''}">${floors ? `<div class="col">${st('층별 현황')}${floors}</div>` : ''}${own ? `<div class="col">${st('소유권 현황')}${own}</div>` : '<div class="col"></div>'}</div>` : ''}
      ${cards}${box('CHECK POINT', T('checkpoint'))}
      ${src([avmSrc, '토지대장 · 건축물대장', fi && fi.basis ? `법정 용적률은 ${fi.basis}` : '', doc.source])}`;
    if (land || bld) P.push(page(doc, SZ, P.length + 1, { eye: '03 · PROPERTY', title: '부동산 개요', sub: S('property') }, body));
  }

  // 7. 세금 및 투자 분석
  if (c.buyPrice && c.acq) {
    const sd = v.std || {}; const a = c.acq; const f = c.funding; const inc = c.income; const prevY = c.refYear - 1;
    const trow = (label, prev, cur) => (has(prev) || has(cur) ? `<tr><th>${label}</th><td>${has(prev) ? esc(C.eokMan(prev)) : '-'}</td><td><b>${has(cur) ? esc(C.eokMan(cur)) : '-'}</b></td></tr>` : '');
    const trs = [trow('개별공시지가(토지)', c.landTotalPrev, c.landTotal), trow('건물 기준시가(양도)', sd.bldgTransferPrev, sd.bldgTransfer), trow('건물 기준시가(상속·증여)', sd.bldgInheritPrev, sd.bldgInherit), trow('건물 시가표준액(주택 외)', sd.bldgStdPrev, sd.bldgStd)].filter(Boolean);
    const taxKv = kv([['취득세', esc(C.eokMan(a.acq)), 1], ['농어촌특별세', esc(C.eokMan(a.rural)), 1], ['지방교육세', esc(C.eokMan(a.edu)), 1], ['세액 소계', esc(C.eokMan(a.taxes)), 1]]);
    const etcKv = kv([[`중개보수(상한 ${C.comma(a.rate * 100, 1)}% 예시)`, esc(C.eokMan(a.broker)), 1], a.appraisal ? ['감정평가수수료', esc(C.eokMan(a.appraisal)), 1] : null, a.legal ? ['법무사보수', esc(C.eokMan(a.legal)), 1] : null,
      has(v.buy.trafficFee) ? ['교통유발부담금', C.num(v.buy.trafficFee) != null && /^[\d,.\s]+$/.test(String(v.buy.trafficFee)) ? esc(C.eokMan(v.buy.trafficFee)) : esc(v.buy.trafficFee), 1] : null]);
    const cards = `<div class="cards ${inc ? 'c3w' : 'c1'}">${card('매입 시 필요현금', `${C.eokF(f.cash)}원`, `매입가 + 취득비용 ${esc(C.eokMan(a.cost))}`, 'navy')}${inc ? card('순영업소득(NOI)', esc(C.eokMan(inc.noi)), `유효총수익 ${esc(C.eokMan(inc.egi))}`) + card('단순 수익률', C.pct(inc.simpleYield), inc.realYield ? `실질 임대수익률 ${C.pct(inc.realYield)}` : '') : ''}</div>`;
    const fund = kv([['매입 가정 금액', esc(C.eokMan(f.price)), 1], ['취득비용', esc(C.eokMan(f.cost)), 1], f.deposit ? ['보증금 승계', esc(C.eokMan(f.deposit)), 1] : null, [`대출금액${f.loanAuto ? ' (가정)' : ''}`, esc(C.eokMan(f.loan)), 1], ['필요 자기자금', esc(C.eokMan(f.equity)), 1]], inc ? 'fill' : '');
    const rent = inc ? kv([['보증금', esc(C.eokMan(inc.deposit)), 1], ['월임대료', esc(C.man(inc.rent)), 1], inc.mgmt ? ['월관리비', esc(C.man(inc.mgmt)), 1] : null, inc.opex ? ['영업경비(연)', esc(C.man(inc.opex)), 1] : null, [`대출이자(연, ${C.comma(f.rate * 100, 1)}%)`, esc(C.eokMan(f.interest)), 1]], 'fill') : '';
    const body = `${trs.length ? `${st('과세 기준가액')}${dt(['구분', `${prevY}년`, `${c.refYear}년`], trs, 'calc tax')}` : ''}
      <div class="row"><div class="col">${st('매수자 취득세 (주택 외)')}${taxKv}</div><div class="col">${st('기타 거래 비용')}${etcKv}</div></div>
      ${cards}
      <div class="row ${rent ? 'grow' : ''}"><div class="col">${st('자금조달계획')}${fund}</div>${rent ? `<div class="col">${st(v.income.label || '임대 수익 (입력 조건 기준)')}${rent}</div>` : '<div class="col"></div>'}</div>
      ${box('NOTE', T('note'))}
      ${src([avmSrc ? avmSrc + ' 세금·투자분석' : '', '세율은 일반 기준 예시이며 개별 세무 판단은 세무 전문가 확인 필요', doc.source])}`;
    P.push(page(doc, SZ, P.length + 1, { eye: '04 · TAX & INVESTMENT', title: '세금 및 투자 분석', sub: S('tax') }, body));
  }

  // 8. 매도 가격 전략
  const pr = c.pricing;
  if (pr && pr.ask) {
    const askRow = pr.rows.find((r) => r.key === 'ask');
    const fmtP = (x) => (Array.isArray(x) ? `${C.eok(x[0]).replace('억', '')}~${C.eok(x[1])}` : (x != null ? C.eok(x) : '-'));
    const fmtPy = (x) => (Array.isArray(x) ? `약 ${C.manR(x[0]).replace('원', '')}~${C.manR(x[1])}` : x != null ? `약 ${C.eokMan(x, true)}` : '-');
    const fmtR = (x) => (Array.isArray(x) ? `${C.pct(x[0], 1).replace('%', '')}~${C.pct(x[1], 1)}` : x != null ? C.pct(x, 1) : '-');
    const cards = `<div class="cards c3p">${card(`권장 호가${pr.suggested.ask ? ' (제안값)' : ''}`, `${C.eok(pr.ask)}원`, askRow ? j([askRow.py ? `대지 평당 약 ${C.eokMan(askRow.py, true)}` : '', askRow.ratio ? `공시지가 배율 ${C.pct(askRow.ratio, 1)}` : ''], ' · ') : '', 'navy big')}
      ${pr.targetLow && pr.targetHigh ? card(`목표 체결가${pr.suggested.target ? ' (제안값)' : ''}`, `${fmtP([pr.targetLow, pr.targetHigh])}원`, pr.adjTarget ? `호가 대비 ${C.pct(pr.adjTarget[0], 1).replace('%', '')}~${C.pct(pr.adjTarget[1], 1)} 조정` : '') : ''}
      ${pr.floor ? card(`하한선${pr.suggested.floor ? ' (제안값)' : ''}`, `${C.eok(pr.floor)}원`, c.range ? `사례 평균 기준 ${C.eok(c.range.low, 1, true) === C.eok(c.range.high, 1, true) ? '' : C.eok(c.range.low, 1, true).replace('억', '') + '~'}${C.eok(c.range.high, 1, true)}원` : '') : ''}</div>`;
    const rows = pr.rows.map((r) => `<tr class="${r.key === 'ask' ? 'me' : ''}"><th>${esc(r.label)}</th><td>${r.key === 'floor' || r.key === 'cap' ? (r.key === 'floor' ? '약 ' : '') + fmtP(r.price) : fmtP(r.price)}</td><td>${fmtPy(r.py)}</td><td>${fmtR(r.ratio)}</td><td>${esc(r.pos || '-')}</td></tr>`);
    const trio = [['NEGOTIATION', '네고 여지 확보', T('negotiation'), 'navy'], ['LOGIC', '사례 범위 내 호가', T('logic'), ''], ['STORY', '신축 개발 가치', T('story'), '']].filter((x) => has(x[2]));
    const steps = [['호가 제시', pr.ask, '매물 공개 · 자료 배포', ''], pr.step2 && pr.step2 < pr.ask && pr.step2 > (pr.targetHigh || 0) ? ['1차 조정', pr.step2, `LOI 접수 시 -${C.pct(pr.adjStep2, 1)}`, ''] : null,
      pr.targetLow && pr.targetHigh ? ['목표 체결', [pr.targetLow, pr.targetHigh], `호가 대비 -${C.pct(pr.adjTarget[0], 1).replace('%', '')}~${C.pct(pr.adjTarget[1], 1)}`, 'on'] : null, pr.floor ? ['하한선', pr.floor, '매도인 사전 합의선', ''] : null].filter(Boolean);
    const body = `${cards}${st('매도인 관점 가격 구간')}${dt(['구분', '금액', `대지 평당가<br>(${C.comma(c.landPy, 2)}평 기준)`, '공시지가 배율<br>(토지)', '사례 대비 위치'], rows, 'calc band')}
      <p class="fn">* 공시지가 배율 = (금액 − 건물가액 ${esc(C.eokMan(c.bldgValue))}) ÷ 개별공시지가 ${esc(C.eokMan(c.landTotal))}${pr.suggested.ask || pr.suggested.target || pr.suggested.floor ? ' · (제안값)은 거래사례 기준 자동 제안이며 매도인과 협의해 확정' : ''}</p>
      ${trio.length ? `<div class="trio n${trio.length}">${trio.map(([e, t, p, k]) => `<div class="tr ${k}"><span>${e}</span><b>${t}</b><p>${md(p)}</p></div>`).join('')}</div>` : ''}
      ${st('협상 단계 시나리오')}<div class="steps n${steps.length}">${steps.map(([t, x, d, k], i) => `<div class="sp ${k}"><span>STEP ${String(i + 1).padStart(2, '0')}</span><em>${t}</em><b>${fmtP(x)}</b><small>${esc(d)}</small></div>`).join('<i class="arw"></i>')}</div>
      ${box('RISK', T('risk'))}
      ${src([avmSrc, '오르비스 분석 · 감정평가가 아닌 시장 분석 의견', doc.source])}`;
    P.push(page(doc, SZ, P.length + 1, { eye: '05 · PRICING STRATEGY', title: '매도 가격 전략', sub: S('pricing') }, body));
  }

  // 9. 문의·고지
  const ct = { ...C.CONTACT, ...(doc.contact || {}) };
  const srcNote = avmSrc ? `오토밸류에이션(AVM) 사이트 산출값과 공공데이터(토지대장·건축물대장·개별공시지가 등)` : '공공데이터(토지대장·건축물대장·개별공시지가·실거래가 등)';
  P.push(`<section class="pg ${SZ} end" data-no="${P.length + 1}"><div class="cv-deco"><i></i><i></i></div>
    <div class="end-top"><img src="/assets/logo-full.png" alt="orbis"><p class="cv-eye">CONTACT</p><h2>매각 문의</h2><i class="cv-rule"></i><p class="end-name">${esc(j([ct.role, ct.name]))}</p><p class="end-ct">${esc(ct.phone)} · ${esc(ct.email)}</p></div>
    <div class="end-dis"><p class="cv-eye">DISCLAIMER</p><ol>
      <li>본 보고서는 오르비스중개법인이 매각 검토 목적으로 작성한 참고자료로, 「감정평가 및 감정평가사에 관한 법률」에 따른 감정평가서가 아님.</li>
      <li>시세·세금·수익률 등 수치는 ${esc(srcNote)}를 기초로 산출한 추정치이며, 정확성과 완전성을 보증하지 않음.</li>
      <li>실제 거래가격은 시장 상황, 매수자 조건, 협상 결과에 따라 본 보고서의 가격과 달라질 수 있음.</li>
      <li>세액은 일반 기준에 따른 예시이며, 개별 세무 판단은 세무 전문가의 확인이 필요함.</li>
      <li>본 보고서의 내용은 작성일 기준이며, 이후의 시장·법령·공부 변경 사항은 반영되어 있지 않음.</li>
      <li>본 보고서는 수령인에 한해 제공되며, 오르비스중개법인의 사전 동의 없이 복제·배포하거나 제3자에게 제공할 수 없음.</li>
      <li>본 보고서를 근거로 한 매매·투자 의사결정과 그 결과에 대한 책임은 이용자에게 있음.</li></ol></div>
    <p class="end-foot">${C.FIRM.name} · 중개사무소 등록번호 ${C.FIRM.reg}<br>${C.FIRM.addr} | 대표 ${C.FIRM.ceo}</p></section>`);
  return P;
}

// ============================================================ 매각 투자안내서 IM (16:9)
function imPages(doc) {
  const s = doc.subject; const l = s.land; const b = s.bldg; const im = doc.im; const c = C.calcIM(doc); const d = C.draftIM(doc); const subsAuto = C.imSubs(doc);
  const S = (k) => (has(im.subs && im.subs[k]) ? im.subs[k] : subsAuto[k] || '');
  const SZ = 'pg-w'; const P = []; const month = ymDot(doc.date).replace('.', '. ');
  const name = s.name || j([s.dong, s.jibun]) || '매각 자산';
  const cover = safeSrc(s.cover && s.cover.src);
  const scale = C.scaleShort(b);
  const leaseStatus = has(im.leaseStatus) ? im.leaseStatus : d.leaseStatus;

  // 1. 표지
  P.push(`<section class="pg ${SZ} cvw ${cover ? '' : 'cv-plain'}" data-no="1"><div class="cvw-l"><img class="cvw-logo" src="/assets/logo-full.png" alt="orbis">
    <p class="cv-eye">INFORMATION MEMORANDUM</p><h1>${esc(name)}<br>매각 투자안내서</h1><i class="cv-rule"></i><p class="cvw-addr">${esc(s.addr || '')}</p>
    <p class="cv-foot">ORBIS REAL ESTATE BROKERAGE · ${esc(month)}<br>STRICTLY CONFIDENTIAL</p></div>
    ${cover ? `<div class="cvw-r"><img src="${esc(cover)}" alt=""></div>` : '<div class="cv-deco"><i></i><i></i></div>'}</section>`);

  // 본문 쪽을 먼저 만들고, 목차는 실제로 들어간 장만 적습니다
  const body = []; const toc = [];
  const add = (chap, tocTitle, tocSub, head, html, cls = '') => { if (!toc.find((t) => t.no === chap)) toc.push({ no: chap, title: tocTitle, sub: [tocSub] }); else if (tocSub) toc.find((t) => t.no === chap).sub.push(tocSub); body.push({ chap, head, html, cls }); };

  // 01 매각 개요
  {
    const cards = `<div class="cards c4">${card('매각가', has(c.price) ? `${C.eok(c.price)} 원` : '협의', esc(im.vatNote || ''), 'navy')}
      ${card('대지 평단가', c.landPyUnit ? `${C.manR(c.landPyUnit).replace('만원', '만 원')}` : '-', c.landPy ? `대지 ${C.comma(c.landPy, 2)}평 기준` : '')}
      ${card('연면적 평단가', c.totPyUnit ? `${C.manR(c.totPyUnit).replace('만원', '만 원')}` : '-', c.totPy ? `연면적 ${C.comma(c.totPy, 2)}평 기준` : '')}
      ${card('임대 현황', dash(leaseStatus), esc(im.leaseNote || ''))}</div>`;
    const rows = [['소재지', dash(s.addr)], ['지역지구', dash(j([l.zone, l.zone2], ', '))], ['대지 / 연면적', has(l.area) || has(b.totArea) ? `${has(l.area) ? C.comma(l.area, 2) + '㎡' : '-'} / ${has(b.totArea) ? C.comma(b.totArea, 2) + '㎡' : '-'}` : ''],
      ['규모 / 사용승인', has(scale) || has(b.approved) ? esc(j([scale, c.builtYear ? `${c.builtYear}년 ${Number(String(C.dateDot(b.approved)).split('.')[1] || 0) || ''}${String(C.dateDot(b.approved)).split('.')[1] ? '월' : ''}${c.age != null && c.age <= 5 ? ' (신축)' : ''}`.replace('년 월', '년') : ''], ' · ')) : ''],
      ['임대차 현황', has(leaseStatus) ? esc(`${leaseStatus} (${ymDot(doc.date)} 기준)`) : '']].filter((r) => has(r[1]) && r[1] !== '-');
    const kt = has(im.keyTitle) ? im.keyTitle : d.keyTitle; const kb = has(im.keyBody) ? im.keyBody : d.keyBody;
    const html = `${cards}<div class="row grow"><div class="col w55">${dt(['구분', '내용'], rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`), 'info')}</div>
      <div class="col"><div class="key"><span>KEY POINT</span><b>${md(kt)}</b><p>${md(kb)}</p></div></div></div>`;
    add('01', '매각 개요', '매각 조건', { eye: '01 · EXECUTIVE SUMMARY', title: '매각 개요', sub: S('summary') }, html);
  }
  // 01 투자 포인트
  {
    const hl = (im.highlights && im.highlights.filter((x) => x && (has(x.title) || has(x.body))).length ? im.highlights : d.highlights).filter((x) => x && (has(x.title) || has(x.body))).slice(0, 4);
    if (hl.length) add('01', '매각 개요', '투자 포인트', { eye: '01 · INVESTMENT HIGHLIGHTS', title: '투자 포인트', sub: S('highlights') },
      `<div class="hl n${hl.length}">${hl.map((x, i) => `<div class="hc"><em>${String(i + 1).padStart(2, '0')}</em><span>${esc(x.tag || '')}</span><b>${esc(x.title || '')}</b><p>${md(x.body || '')}</p></div>`).join('')}</div>`);
  }
  // 02 매각 자산 개요
  {
    const land = [['소재지', dash(j([s.sgg, s.dong, s.jibun]) || s.addr)], ['지목', dash(l.jimok)], ['대지면적', has(l.area) ? esc(C.areaPy(l.area)) : ''], ['지역지구', dash(j([l.zone, l.zone2], ', '))],
      ['개별공시지가', has(l.price) ? `${C.comma(l.price)}원/㎡${has(l.priceYear) ? ` (${esc(l.priceYear)}.01 기준)` : ''}` : ''], ['도로접면', dash(l.road)], ['형상 · 지세', has(l.shape) || has(l.terrain) ? esc(j([l.shape, l.terrain], ' · ')) : ''], ['토지거래허가', dash(l.permit)]].filter((r) => has(r[1]) && r[1] !== '-');
    const bld = [['건축면적', has(b.archArea) ? esc(C.areaPy(b.archArea)) : ''], ['연면적', has(b.totArea) ? esc(C.areaPy(b.totArea)) : ''], ['건폐율', has(b.bcr) ? C.comma(b.bcr, 2) + '%' : ''],
      ['용적률', has(b.far) ? `${C.comma(b.far, 2)}%${has(b.farArea) ? ` (용적률산정 ${C.comma(b.farArea, 2)}㎡)` : ''}` : ''], ['주용도', dash(b.use)], ['규모 / 주구조', has(scale) || has(b.structure) ? esc(j([scale, b.structure], ' · ')) : ''],
      ['사용승인일', has(b.approved) ? esc(C.dateDot(b.approved)) : ''], ['승강기 / 주차', has(b.elevator) || has(b.parking) ? esc(j([b.elevator, b.parking], ' / ')) : '']].filter((r) => has(r[1]) && r[1] !== '-');
    const t = (rows) => dt(['구분', '내용'], rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`), 'info');
    if (land.length || bld.length) add('02', '매각 자산 개요', '토지 · 건물 현황', { eye: '02 · PROPERTY OVERVIEW', title: '매각 자산 개요', sub: S('property') },
      `<div class="row">${land.length ? `<div class="col"><h3 class="wt">토지 현황</h3>${t(land)}</div>` : ''}${bld.length ? `<div class="col"><h3 class="wt">건물 현황</h3>${t(bld)}</div>` : ''}</div>${src(['건축물대장 · 토지대장', '토지이음', doc.source])}`);
  }
  // 02 토지이용계획·지적도
  {
    const rows = (im.landUseRows && im.landUseRows.filter((r) => r && has(r.k) && has(r.v)).length ? im.landUseRows : d.landUseRows).filter((r) => r && has(r.k) && has(r.v));
    const cad = safeSrc(s.maps.cadastral && s.maps.cadastral.src);
    if (rows.length || cad) {
      const tbl = rows.length ? dt(['구분', '내용'], rows.map((r) => `<tr><th>${esc(r.k)}</th><td>${md(r.v)}</td></tr>`), 'info') : '';
      const op = has(im.landUseOpinion) ? `<div class="bar"><b>검토 의견</b><p>${md(im.landUseOpinion)}</p></div>` : '';
      add('02', '매각 자산 개요', '토지이용계획', { eye: '02 · LAND USE PLAN', title: cad ? '토지이용계획 및 지적도' : '토지이용계획', sub: S('landUse') },
        `<div class="row grow">${cad ? `<div class="col w50"><figure class="fig fill"><img src="${esc(cad)}" alt="">${has(s.maps.cadastral.caption) ? `<figcaption>${esc(s.maps.cadastral.caption)}</figcaption>` : ''}</figure></div>` : ''}<div class="col between">${tbl}${op}</div></div>${src(['토지이음 토지이용계획', doc.source])}`);
    }
  }
  // 03 위치·교통
  {
    const items = (im.location && im.location.filter((x) => x && (has(x.title) || has(x.body))).length ? im.location : d.location).filter((x) => x && (has(x.title) || has(x.body))).slice(0, 4);
    const map = safeSrc(s.maps.location && s.maps.location.src);
    if (items.length || map) add('03', '입지 분석', '교통', { eye: '03 · LOCATION', title: '위치 및 교통', sub: S('location') },
      `<div class="row grow">${map ? `<div class="col w53"><figure class="fig fill"><img src="${esc(map)}" alt="">${has(s.maps.location.caption) ? `<figcaption>${esc(s.maps.location.caption)}</figcaption>` : ''}</figure></div>` : ''}
      <div class="col between loc">${items.map((x) => `<div class="lc"><span>${esc(x.tag || '')}</span><b>${esc(x.title || '')}</b><p>${md(x.body || '')}</p></div>`).join('')}</div></div>${src([map ? '지도 서비스' : '', doc.source])}`);
  }
  // 03 개발 호재·미래가치 (직접 쓴 내용이 있을 때만)
  {
    const cards = (im.future || []).filter((x) => x && (has(x.title) || has(x.body))).slice(0, 3);
    if (cards.length) add('03', '입지 분석', '개발 호재 · 미래가치', { eye: '03 · FUTURE VALUE', title: '개발 호재 및 미래 투자가치', sub: S('future') },
      `<div class="fu n${cards.length}">${cards.map((x, i) => `<div class="fc ${cards.length === 3 && i === 1 ? 'dark' : ''}"><em>${String(i + 1).padStart(2, '0')}</em><span>${esc(x.tag || '')}</span><b>${esc(x.title || '')}</b><div class="fb">${blocks(x.body).map((k) => `<p><strong>${md(k.h)}</strong>${has(k.p) ? `<br>${md(k.p)}` : ''}</p>`).join('')}</div></div>`).join('')}</div>
      ${has(im.futurePoint) ? `<div class="bar"><b>POINT</b><p>${md(im.futurePoint)}</p></div>` : ''}${src([im.futureSource, doc.source])}`);
  }
  // 04 임대차 현황
  if (c.rows.length) {
    const n = (x) => (C.num(x) != null ? C.comma(x, 0) : '–');
    const rowsAll = c.rows.map((r) => `<tr><th>${dash(r.floor)}</th><td class="l">${dash(r.tenant)}</td><td>${C.num(r.area) != null ? C.fix(r.area, 2) : '–'}</td><td>${n(r.deposit)}</td><td>${n(r.rent)}</td><td>${n(r.mgmt)}</td><td>${has(r.expire) ? esc(r.expire) : '–'}</td></tr>`);
    const sumRow = (`<tr class="sum"><th>합계</th><td></td><td>${C.fix(c.areaSum, 2)}</td><td>${c.depositSum ? C.comma(c.depositSum / 1e4) : '–'}</td><td>${c.rentSum ? C.comma(c.rentSum / 1e4) : '–'}</td><td>${c.mgmtSum ? C.comma(c.mgmtSum / 1e4) : '–'}</td><td></td></tr>`);
    const cards = `<div class="cards c4 sm">${card('연 임대료', c.annual ? esc(C.eokMan(c.annual)) : '–')}${card('수익률', c.yield ? C.pct(c.yield) : '–', c.yield ? '연 임대료 ÷ (매각가 − 보증금)' : '')}${card('공실률', c.vacancy != null ? C.pct(c.vacancy, 0) : '–', '', 'gold')}${card('활용 방안', has(im.useIdea) ? esc(im.useIdea) : '–')}</div>`;
    const RH = ['층', '공부상 용도 / 임차인', '면적(평)', '임대보증금(만 원)', '월 임대료(만 원)', '월 관리비(만 원)', '임대기간 만료'];
    const rest = rowsAll.slice(); const chunks = [];
    while (rest.length > 7) chunks.push(rest.splice(0, Math.min(11, rest.length - Math.min(7, Math.floor(rest.length / 2)))));
    chunks.forEach((ch, i) => add('04', '임대차 현황', 'Rent Roll · 공실 현황', { eye: '04 · RENT ROLL', title: '임대차 현황', sub: S('rentRoll') }, `${dt(RH, ch, 'info rr')}<p class="src">${i + 1} / ${chunks.length + 1} · 다음 쪽에 이어집니다</p>`));
    add('04', '임대차 현황', 'Rent Roll · 공실 현황', { eye: '04 · RENT ROLL', title: '임대차 현황', sub: S('rentRoll') },
      `${dt(RH, [...rest, sumRow], 'info rr')}${cards}${src([im.rentNote || `${ymDot(doc.date)} 기준`, doc.source])}`);
  }
  // 05 물건 강점 분석
  {
    const L = blocks(im.strengthsLeft); const R = blocks(im.strengthsRight);
    if (L.length || R.length) {
      const col = (arr) => arr.map((k) => `<div><b>${md(k.h)}</b>${has(k.p) ? `<p>${md(k.p)}</p>` : ''}</div>`).join('');
      add('05', '물건 강점 분석', '물건 강점 · 투자 가치', { eye: '05 · STRENGTHS & VALUE', title: '물건 강점 분석', sub: S('strengths') },
        `<div class="row grow">${L.length ? `<div class="col"><div class="sg dark"><span>PROPERTY · 물건 강점</span>${col(L)}</div></div>` : ''}${R.length ? `<div class="col"><div class="sg"><span>VALUE · 투자 가치</span>${col(R)}</div></div>` : ''}</div>
        ${has(im.strengthsBar) ? `<div class="bar"><b>${esc(im.strengthsBarLabel || '활용 제안')}</b><p>${md(im.strengthsBar)}</p></div>` : ''}`);
    }
  }
  // 06 현장 사진 (한 쪽에 6장까지, 넘치면 다음 쪽으로)
  {
    const pages = [];
    for (const pg of im.photoPages || []) {
      const ph = (pg.photos || []).filter((x) => x && safeSrc(x.src));
      for (let i = 0; i < ph.length; i += 6) pages.push({ title: pg.title || '현장 사진', sub: pg.sub || '', photos: ph.slice(i, i + 6) });
    }
    pages.forEach((pg) => add('06', '매각 절차', '현장 사진', { eye: '06 · PHOTOS', title: pg.title, sub: pg.sub },
      `<div class="pgd n${pg.photos.length}">${pg.photos.map((x) => `<figure class="fig"><img src="${esc(safeSrc(x.src))}" alt="">${has(x.caption) ? `<figcaption>${esc(x.caption)}</figcaption>` : ''}</figure>`).join('')}</div>`));
  }
  // 06 매각 절차
  {
    const steps = (im.process || []).filter((x) => x && (has(x.title) || has(x.body))).slice(0, 4);
    if (steps.length) add('06', '매각 절차', '절차 · Contact', { eye: '06 · PROCESS', title: '매각 절차', sub: S('process') },
      `<div class="fu n${steps.length} proc">${steps.map((x, i) => `<div class="fc"><em>STEP ${String(i + 1).padStart(2, '0')}</em><b>${esc(x.title || '')}</b><p>${md(x.body || '')}</p></div>`).join('')}</div>
      ${has(im.loi) ? `<div class="bar"><b>LOI 포함 사항</b><p>${md(im.loi)}</p></div>` : ''}<p class="src">매각 절차와 일정은 매도자 사정과 시장 상황에 따라 변경될 수 있습니다.</p>`);
  }

  // 2. 목차 + 고지
  // 빠진 장이 있으면 장 번호를 01부터 다시 매깁니다
  const renum = {}; toc.forEach((t, i) => { renum[t.no] = String(i + 1).padStart(2, '0'); });
  const hasProc = body.some((x) => /PROCESS$/.test(x.head.eye));
  body.forEach((x) => { x.head = { ...x.head, eye: x.head.eye.replace(/^\d{2}/, renum[x.chap]) }; });
  const tocFix = toc.map((t) => ({ ...t, no: renum[t.no], title: t.no === '06' && !hasProc ? '현장 사진' : t.title, sub: [...new Set(t.sub.filter(Boolean))].join(' · ') }));
  P.push(page(doc, SZ, 2, { eye: 'CONTENTS', title: '목차' }, `<div class="row grow"><div class="col toc">${tocFix.map((t) => `<div><em>${t.no}</em><b>${esc(t.title)}</b><span>${esc(t.sub)}</span></div>`).join('')}</div>
    <div class="col w46"><div class="dis"><span>DISCLAIMER</span><p>오르비스중개법인(이하 ‘매각자문사’)은 매도자가 보유한 본 자산의 매각과 관련하여, 잠재매수자에게 정보를 제공할 목적으로 본 IM을 작성하였습니다.</p>
    <p>본 IM은 별도의 검증절차를 거치지 않았으며 매도자와 매각자문사는 그 정확성을 보장하지 않습니다. 잠재매수자는 자체 조사와 분석을 거쳐 판단하여야 하며, 사전 서면 동의 없이 복사 · 인용 · 배포할 수 없습니다.</p></div></div></div>`, 'toc-pg'));
  body.forEach((x) => P.push(page(doc, SZ, P.length + 1, x.head, x.html, x.cls)));

  // 마지막. Contact
  const ct = { ...C.CONTACT, ...(doc.contact || {}) };
  P.push(`<section class="pg ${SZ} endw" data-no="${P.length + 1}"><div class="endw-ring"><i></i><i></i><img src="/assets/logo-full.png" alt="orbis"></div>
    <div class="endw-r"><p class="cv-eye">CONTACT POINT</p><h2>매각 문의</h2><i class="cv-rule"></i><p class="end-name">${esc(j([ct.name, ct.role]))}</p><p class="end-ct">${esc(ct.phone)}</p><p class="end-ct">${esc(ct.email)}</p>
    <p class="endw-firm">${C.FIRM.name} · ${C.FIRM.addr} · ${C.FIRM.site}<br>중개사무소 등록번호 ${C.FIRM.reg}</p></div></section>`);
  return P;
}

// ============================================================ 내보내기
export const SIZES = { valuation: { cls: 'pg-a4', w: 210, h: 297, page: 'A4 portrait', label: 'A4 세로' }, im: { cls: 'pg-w', w: 338.67, h: 190.5, page: '338.67mm 190.5mm', label: '16:9 가로' } };
export function renderReport(docIn) {
  const doc = C.normalize(docIn);
  const kind = doc.kind === 'im' ? 'im' : 'valuation';
  const pages = kind === 'im' ? imPages(doc) : valuationPages(doc);
  return { kind, size: SIZES[kind], pages, html: pages.join('\n'), title: doc.title || C.defaultTitle(doc) };
}
