// 오르비스 관리자 — 리포트 (매각 가격 검토 보고서 · 매각 투자안내서 IM)
// 지번(주소)이나 매각가만 넣으면 공공데이터로 자동 채우고, 고쳐서 PDF로 저장하거나 링크로 공유합니다.
// 쪽 그리기는 report-tpl.js, 계산·문장 초안은 report-calc.js, 화면 스타일은 report.css 에 있습니다.
import * as C from './report-calc.js?v=20261124';

const VER = '20261124';
const KIND = { valuation: ['매각 가격 검토 보고서', 'A4 세로 · 9쪽 안팎'], im: ['매각 투자안내서(IM)', '16:9 가로 · 15쪽 안팎'] };
const ensureCss = () => { if (!document.getElementById('rp-css')) { const l = document.createElement('link'); l.id = 'rp-css'; l.rel = 'stylesheet'; l.href = '/admin/report.css?v=' + VER; document.head.appendChild(l); } };
const trim = (n, d = 4) => String(Number(Number(n).toFixed(d)));
const getP = (o, path) => path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
function setP(o, path, v) { const ks = path.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) { if (a[ks[i]] == null) a[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[ks[i]]; } a[ks[ks.length - 1]] = v; }
function parseMoney(s, unit) {
  const x = String(s).replace(/[,\s원]/g, '');
  if (/[억만]/.test(x)) {
    let tot = 0; const e = x.match(/([\d.]+)억/); const m = x.match(/([\d.]+)만/);
    if (e) tot += parseFloat(e[1]) * 1e8; if (m) tot += parseFloat(m[1]) * 1e4;
    const rest = x.replace(/[\d.]+억/, '').replace(/[\d.]+만/, '');
    if (/^[\d.]+$/.test(rest)) tot += parseFloat(rest) * (e && !m ? 1e4 : 1); // "83억9680" → 9,680만
    return isFinite(tot) ? tot : null;
  }
  const n = C.num(x); if (n == null) return null;
  return unit === 'eok' ? n * 1e8 : unit === 'man' ? n * 1e4 : n;
}
function parseVal(s, t) {
  s = String(s == null ? '' : s); if (t === 'txt') return s;
  if (s.trim() === '') return null;
  if (t === 'eok' || t === 'man' || t === 'won') return parseMoney(s, t);
  if (t === 'pct') { const n = C.num(s); return n == null ? null : n / 100; }
  return C.num(s);
}
const fmtTime = (iso) => { const d = iso ? new Date(iso) : new Date(); const k = new Date(d.getTime() + 9 * 3600e3); return isNaN(k) ? '' : k.toISOString().slice(5, 16).replace('T', ' ').replace('-', '.'); };

/** 사진을 긴 변 1600px 이하 JPEG로 줄여 data URL로 돌려줍니다 (한 장 900KB 이하) */
async function shrinkImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('이미지를 읽지 못했습니다.')); i.src = url; });
    let max = 1600; let q = 0.82; let out = '';
    for (let n = 0; n < 5; n++) {
      const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
      const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(im.naturalWidth * k)); cv.height = Math.max(1, Math.round(im.naturalHeight * k));
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(im, 0, 0, cv.width, cv.height);
      out = cv.toDataURL('image/jpeg', q);
      if (out.length * 0.75 <= 880 * 1024) break;
      if (q > 0.62) q -= 0.1; else max = Math.round(max * 0.8);
    }
    return out;
  } finally { URL.revokeObjectURL(url); }
}

export function createReports(ctx) {
  const { api, shell, $, $$, E, fail, geo } = ctx;
  const toast = ctx.toast || ((m) => console.log(m));
  let st = null; // 편집 중인 리포트 상태
  let hooked = false;

  const partsOf = (a) => (Array.isArray(a) ? a : a ? [a] : []).map((x) => String(x).split('?')[0]).filter(Boolean);
  const hashQuery = () => new URLSearchParams((location.hash.split('?')[1] || ''));

  // ================================================================ 목록
  async function list() {
    st = null; ensureCss();
    shell('reports', '<div class="empty">불러오는 중…</div>');
    let items = []; let keys = { ok: false };
    try { [items, keys] = await Promise.all([api('/reports').then((d) => d.items || []), geo ? geo.keys() : { ok: false }]); } catch (e) { fail(e); }
    const keyNote = !geo ? '' : keys.datagokr && keys.vworld ? '<p class="note cool" style="margin-bottom:16px">공공데이터가 연결돼 있습니다. 지번만 넣으면 토지·건축물대장·인근 실거래가를 불러와 자동으로 채웁니다.</p>'
      : `<p class="note" style="margin-bottom:16px">공공데이터 키가 아직 다 등록되지 않았습니다(${[keys.vworld ? '' : '토지·공시지가(브이월드)', keys.datagokr ? '' : '건축물대장·실거래가(공공데이터포털)'].filter(Boolean).join(', ')}). 키가 없어도 값을 직접 넣어 리포트를 만들 수 있고, 키를 등록하면 지번만으로 자동 채워집니다.</p>`;
    $('#view').innerHTML = `<div class="topline"><div><h2>리포트</h2><p>지번이나 매각가만 넣으면 오르비스 양식의 보고서가 만들어집니다. 고친 뒤 PDF로 저장하거나 링크로 보낼 수 있습니다.</p></div></div>
      <div class="rp-new">${Object.entries(KIND).map(([k, [t, s]]) => `<a href="#/reports/new/${k}"><em>${s}</em><b>${t} 만들기</b><span>${k === 'im' ? '매각가와 지번으로 매각 개요·자산 개요·Rent Roll·사진·매각 절차를 한 번에 구성합니다.' : '인근 거래사례로 시세를 추정하고 보유세·취득세, 권장 호가·목표가·하한선까지 정리합니다.'}</span></a>`).join('')}</div>
      ${keyNote}
      ${items.length ? `<div class="rp-list">${items.map((x) => `<a class="rp-item" href="#/reports/${E(x.id)}"><div class="ft"><span class="pill ${x.kind === 'im' ? 'sch' : 'ok'}">${E((KIND[x.kind] || [x.kind])[0])}</span>${x.share ? '<span class="pill warn">링크 공유 중</span>' : ''}</div><h3>${E(x.title || '제목 없음')}</h3><p>${E(x.addr || '주소 미입력')}</p><p>수정 ${E(fmtTime(x.updated_at || x.created_at))}</p></a>`).join('')}</div>`
    : '<div class="empty">아직 만든 리포트가 없습니다. 위에서 종류를 골라 시작해 주세요.</div>'}`;
  }

  // ================================================================ 편집기
  async function editor(id, kind) {
    ensureCss();
    shell('reports', '<div class="empty">불러오는 중…</div>');
    st = { id: null, kind: kind === 'im' ? 'im' : 'valuation', doc: null, share: null, dirty: false, saving: false, savedAt: null, timer: null, pvTimer: null, deals: null, dealsMsg: '', log: [], cands: null, compCands: {}, open: new Set(['auto', 'basic']), tab: 'form', q: '' };
    if (id) {
      try { const d = await api('/report?id=' + encodeURIComponent(id)); const r = d.report; st.id = r.id; st.kind = r.kind === 'im' ? 'im' : 'valuation'; st.share = r.share || null; st.savedAt = r.updated_at; st.doc = C.normalize({ ...(r.data || {}), kind: st.kind }); if (!st.doc.title) st.doc.title = r.title || ''; }
      catch (e) { fail(e); $('#view').innerHTML = '<div class="empty">리포트를 불러오지 못했습니다. <a class="lnk" href="#/reports">목록으로</a></div>'; return; }
    } else st.doc = C.emptyDoc(st.kind);
    st.q = st.doc.subject.addr || '';
    paint();
    if (!id) prefillFrom();
  }

  const doc = () => st.doc;
  const isIM = () => st.kind === 'im';
  const calc = () => (isIM() ? C.calcIM(st.doc) : C.calcValuation(st.doc));

  // ---------------------------------------------------------------- 입력 칸 도우미
  const fid = (p) => 'rp-' + p.replace(/[^a-zA-Z0-9]/g, '-');
  function shown(path, t) { const v = getP(st.doc, path); if (v == null || v === '') return ''; if (t === 'eok') return trim(v / 1e8, 4); if (t === 'man') return trim(v / 1e4, 2); if (t === 'pct') return trim(v * 100, 3); return v; }
  function calcText(path, t) { const v = getP(st.doc, path); if (v == null || v === '') return ''; return t === 'm2' ? `= ${C.manM2(v)}원/㎡` : t === 'area' ? `= ${C.comma(C.toPy(v), 2)}평` : `= ${C.eokMan(v)}`; }
  const inp = (path, o = {}) => `<input type="text" id="${fid(path)}" data-p="${path}" data-t="${o.t || 'txt'}"${o.t && o.t !== 'txt' ? ' inputmode="decimal"' : ''} value="${E(shown(path, o.t))}" placeholder="${E(o.ph || '')}" autocomplete="off">`;
  const F = (path, label, o = {}) => `<div class="rp-f ${o.cls || ''}"><label for="${fid(path)}">${label}</label>${o.unit ? `<div class="u">${inp(path, o)}<span>${o.unit}</span></div>` : inp(path, o)}${o.calc ? `<span class="calc" data-calc="${path}" data-ct="${o.calc}">${E(calcText(path, o.calc))}</span>` : ''}${o.hint ? `<span class="hint">${o.hint}</span>` : ''}</div>`;
  const TA = (path, label, o = {}) => `<div class="rp-f ${o.cls || 'full'}"><div class="rp-h"><label for="${fid(path)}">${label}</label>${o.draft ? `<button type="button" class="btn btn-line btn-sm" data-act="draft" data-path="${path}" data-key="${o.draft}">초안 넣기</button>` : ''}</div><textarea id="${fid(path)}" data-p="${path}" data-t="txt" rows="${o.rows || 3}" placeholder="${E(o.ph || '')}">${E(getP(st.doc, path) || '')}</textarea>${o.hint ? `<span class="hint">${o.hint}</span>` : ''}</div>`;
  const BLOCK_HINT = '빈 줄로 덩어리를 나누면 덩어리의 첫 줄이 굵은 제목이 됩니다. **굵게** 표시도 쓸 수 있습니다.';
  function imgSlot(path, label, o = {}) {
    const v = getP(st.doc, path) || {};
    return `<div class="rp-f full"><span class="lb">${label}</span><div class="rp-img" tabindex="0" data-img="${path}"><div class="th" style="${v.src ? `background-image:url('${E(v.src)}')` : ''}">${v.src ? '' : '이미지 없음'}</div>
      <div class="ctl"><div class="bts"><label class="btn btn-line btn-sm">파일 선택<input type="file" accept="image/*" hidden data-file="${path}"></label>${o.map ? `<button type="button" class="btn btn-line btn-sm" data-act="map" data-path="${path}" data-map="${o.map}">지도 자동 넣기</button>` : ''}${v.src ? `<button type="button" class="btn btn-line btn-sm" data-act="img-clear" data-path="${path}">지우기</button>` : ''}</div>
      <span class="rp-hint">이 칸을 누른 뒤 Ctrl+V로 캡처를 붙이거나, 파일을 끌어다 놓으세요.${o.hint ? ' ' + o.hint : ''}</span>
      <input type="text" data-p="${path}.caption" data-t="txt" value="${E(v.caption || '')}" placeholder="설명 문구(선택)"></div></div></div>`;
  }
  // 줄 추가·삭제가 되는 표
  function rowsTable(path, cols, o = {}) {
    const arr = getP(st.doc, path) || [];
    return `<div class="rp-tw"><table class="rp-t"><thead><tr>${cols.map((c) => `<th${c.w ? ` style="width:${c.w}"` : ''}>${c.label}</th>`).join('')}<th></th></tr></thead><tbody>
      ${arr.map((r, i) => `<tr>${cols.map((c) => `<td>${c.ta ? `<textarea rows="2" data-p="${path}.${i}.${c.k}" data-t="txt">${E(r[c.k] || '')}</textarea>` : `<input type="text" data-p="${path}.${i}.${c.k}" data-t="${c.t || 'txt'}"${c.t ? ' inputmode="decimal"' : ''} value="${E(r[c.k] == null ? '' : r[c.k])}" placeholder="${E(c.ph || '')}">`}</td>`).join('')}<td><button type="button" class="x" data-act="row-del" data-arr="${path}" data-i="${i}" aria-label="이 줄 삭제">×</button></td></tr>`).join('') || `<tr><td class="n" colspan="${cols.length + 1}">${o.empty || '아직 없습니다.'}</td></tr>`}
      </tbody></table></div><div><button type="button" class="btn btn-line btn-sm" data-act="row-add" data-arr="${path}">+ 줄 추가</button></div>`;
  }
  // 카드 묶음 (투자 포인트·교통·호재·절차)
  function cardList(path, fields, o = {}) {
    const arr = getP(st.doc, path) || [];
    return `<div class="rp-cards">${arr.map((r, i) => `<div class="rp-card"><button type="button" class="x" data-act="row-del" data-arr="${path}" data-i="${i}" aria-label="삭제">×</button><div class="rp-g">${fields.map((f) => (f.ta ? TA(`${path}.${i}.${f.k}`, f.label, { rows: f.rows || 3, hint: f.hint, cls: 'full' }) : F(`${path}.${i}.${f.k}`, f.label, { cls: f.cls || '', ph: f.ph }))).join('')}</div></div>`).join('')}</div>
      ${arr.length < (o.max || 9) ? `<div><button type="button" class="btn btn-line btn-sm" data-act="row-add" data-arr="${path}">+ ${o.add || '추가'}</button></div>` : ''}`;
  }

  // ---------------------------------------------------------------- 섹션
  const landSec = () => `<div class="rp-g">
      ${F('subject.land.area', '토지면적', { t: 'num', unit: '㎡', calc: 'area' })}${F('subject.land.jimok', '지목', { ph: '대' })}${F('subject.land.zone', '용도지역', { ph: '제3종일반주거지역', cls: 'w2' })}
      ${F('subject.land.zone2', '기타 지역·지구', { cls: 'w2' })}${F('subject.land.etc', '기타 법률상 제한', { cls: 'w2' })}
      ${F('subject.land.use', '이용상황', { ph: '상업용' })}${F('subject.land.road', '도로접면', { ph: '세로한면(가)' })}${F('subject.land.shape', '형상', { ph: '세로장방' })}${F('subject.land.terrain', '지형 높이', { ph: '평지' })}
      ${F('subject.land.price', '개별공시지가', { t: 'won', unit: '원/㎡', calc: 'm2' })}${F('subject.land.priceYear', '공시 기준연도', { t: 'num' })}${F('subject.land.pricePrev', '전년도 공시지가', { t: 'won', unit: '원/㎡', calc: 'm2' })}
      ${F('subject.land.legalBcr', '법정 건폐율', { t: 'num', unit: '%' })}${F('subject.land.legalFar', '법정 용적률', { t: 'num', unit: '%', hint: '비우면 서울은 조례 일반 기준으로 자동 적용' })}${F('subject.land.permit', '토지거래허가', { cls: 'w2', ph: '해당 없음 / 허가구역(기간)' })}
    </div>`;
  const bldgSec = () => `<div class="rp-g">
      ${F('subject.bldg.totArea', '연면적', { t: 'num', unit: '㎡', calc: 'area' })}${F('subject.bldg.farArea', '용적률 산정면적', { t: 'num', unit: '㎡' })}${F('subject.bldg.archArea', '건축면적', { t: 'num', unit: '㎡' })}
      ${F('subject.bldg.bcr', '건폐율', { t: 'num', unit: '%' })}${F('subject.bldg.far', '용적률', { t: 'num', unit: '%' })}${F('subject.bldg.use', '주용도', { ph: '제1종근린생활시설', cls: 'w2' })}
      ${F('subject.bldg.structure', '구조', { ph: '철근콘크리트조' })}${F('subject.bldg.roof', '지붕', { ph: '슬라브' })}${F('subject.bldg.ground', '지상 층수', { t: 'num' })}${F('subject.bldg.under', '지하 층수', { t: 'num' })}${F('subject.bldg.height', '높이', { t: 'num', unit: 'm' })}
      ${F('subject.bldg.parking', '주차', { ph: '자주식 옥외 5대' })}${F('subject.bldg.elevator', '승강기', { ph: '승용 1대 / 없음' })}${F('subject.bldg.approved', '사용승인일', { ph: '1993-09-25' })}${F('subject.bldg.remodel', '대수선(리모델링)', { ph: '해당 없음' })}
    </div>`;
  const floorSec = () => rowsTable('subject.floors', [{ k: 'floor', label: '층', ph: '3층', w: '18%' }, { k: 'use', label: '용도', ph: '근린생활시설' }, { k: 'area', label: '면적(㎡)', t: 'num', w: '18%' }, { k: 'structure', label: '구조', ph: '철근콘크리트조' }], { empty: '건축물대장을 불러오면 자동으로 채워집니다. 직접 줄을 추가해도 됩니다.' });
  const ownerSec = () => `<div class="rp-g">${F('subject.owner.type', '소유구분', { ph: '개인 / 법인' })}${F('subject.owner.count', '공유자 수', { t: 'num', unit: '명' })}${F('subject.owner.transfer', '소유권 이전일', { ph: '2020-08-12' })}${F('subject.owner.landMove', '토지 이동', { ph: '구획정리 완료 등', cls: 'w2' })}${F('subject.owner.units', '세대 / 가구 / 호', { ph: '0 / 0 / 0' })}${F('subject.owner.housing', '주택분 면적', { ph: '없음' })}</div><p class="rp-hint">등기부를 확인한 내용만 적어 주세요. 비운 항목은 보고서에서 빠집니다.</p>`;
  const contactSec = () => `<div class="rp-g">${F('contact.name', '담당자')}${F('contact.role', '직함')}${F('contact.phone', '연락처')}${F('contact.email', '이메일', { cls: 'w2' })}${F('source', '출처 추가 문구', { cls: 'full', ph: '예: 디스코 열람(2026.11)' })}</div>`;

  function kpis() {
    const c = calc(); const out = [];
    if (isIM()) {
      if (c.landPyUnit) out.push(['대지 평단가', C.manR(c.landPyUnit)]); if (c.totPyUnit) out.push(['연면적 평단가', C.manR(c.totPyUnit)]);
      if (c.vacancy != null) out.push(['공실률', C.pct(c.vacancy, 0)]); if (c.yield) out.push(['수익률', C.pct(c.yield)]);
    } else {
      if (c.base) out.push([c.base.label, C.eokF(c.base.total) + '원']); if (c.avgRatio) out.push(['사례 평균 배율', C.pct(c.avgRatio)]);
      if (c.range) { const lo = C.eok(c.range.low, 1, true); const hi = C.eok(c.range.high, 1, true); out.push(['사례 평균 기준', lo === hi ? `${hi}원` : `${lo.replace('억', '')}~${hi}원`]); }
      if (c.pricing && c.pricing.ask) out.push([`권장 호가${c.pricing.suggested.ask ? '(제안)' : ''}`, C.eok(c.pricing.ask) + '원']);
      if (c.holdTax) out.push(['보유세(연)', C.man(c.holdTax.total)]);
    }
    return out.length ? out.map(([k, v]) => `<span>${k} <b>${E(v)}</b></span>`).join('') : '<span>값을 넣으면 여기에 계산 결과가 보입니다.</span>';
  }

  // 거래사례
  const COMP_NEW = () => ({ addr: '', name: '', price: null, date: '', landArea: null, landPrice: null, road: '', shape: '', totArea: null, far: null, use: '', scale: '', built: null, dist: '', lat: null, lon: null, landUnit: null });
  function dealRank(d) { const a = C.num(doc().subject.land.area); const same = d.dong && d.dong === doc().subject.dong ? 0 : 1; const sim = a && d.plotAr ? Math.abs(Math.log(d.plotAr / a)) : 1.5; return same * 2 + sim; }
  function compSec() {
    const c = C.calcValuation(st.doc); const comps = st.doc.comps || [];
    const cand = (st.deals || []).filter((d) => d.type !== '집합' && !d.share && d.plotAr > 0 && d.amt > 0).sort((a, b) => dealRank(a) - dealRank(b) || String(b.ym).localeCompare(String(a.ym))).slice(0, 40);
    const picked = new Set(comps.map((x) => x._deal).filter(Boolean));
    const dealTbl = st.deals ? (cand.length ? `<div class="rp-h"><span>인근 실거래 후보 ${cand.length}건 <small class="rp-hint">같은 동 먼저, 대지면적이 비슷한 순 · 같은 구 안에서 찾습니다 (통건물만, 지분 거래 제외)</small></span></div>
      <div class="rp-deals"><table><thead><tr><th></th><th>거래</th><th>소재</th><th>금액</th><th>대지</th><th>연면적</th><th>준공</th><th>토지단가</th><th>용도지역</th></tr></thead><tbody>
      ${cand.map((d) => { const key = dealKey(d); const on = picked.has(key); return `<tr class="${on ? 'on' : ''}"><td><button type="button" class="btn btn-sm ${on ? 'btn-navy' : 'btn-line'}" data-act="deal-toggle" data-key="${E(key)}">${on ? '선택됨' : '선택'}</button></td><td class="nowrap">${E(d.ym)}</td><td>${E(d.dong)} ${E(d.jibun)}</td><td class="nowrap">${C.eok(d.amt)}</td><td class="nowrap">${C.comma(d.plotAr, 1)}㎡</td><td class="nowrap">${d.bldAr ? C.comma(d.bldAr, 1) + '㎡' : '-'}</td><td>${E(d.built || '-')}</td><td class="nowrap">${C.manM2(d.amt / d.plotAr)}/㎡</td><td>${E(d.zone || '')}</td></tr>`; }).join('')}
      </tbody></table></div><p class="rp-hint">실거래 공개자료는 통건물의 지번을 '6**'처럼 가려 줍니다. 선택하면 같은 동에서 대지면적이 맞는 필지를 찾아 지번과 공시지가를 채우고, 못 찾으면 아래 칸에 직접 넣으면 됩니다.</p>` : '<p class="rp-hint">조건에 맞는 인근 실거래가 없습니다. 아래에서 사례를 직접 추가해 주세요.</p>')
      : `<p class="rp-hint">${E(st.dealsMsg || '위 [자동 채우기]를 하면 최근 24개월 인근 실거래 후보가 여기에 나옵니다. 사례를 직접 추가해도 됩니다.')}</p>`;
    const cards = comps.map((x, i) => {
      const cc = c.comps[i] || {}; const cands = st.compCands[i];
      return `<div class="rp-card"><button type="button" class="x" data-act="row-del" data-arr="comps" data-i="${i}" aria-label="삭제">×</button>
        <div class="rp-h"><span>사례 ${String(i + 1).padStart(2, '0')} ${cc.ratio ? `<small class="rp-hint">토지단가 ${C.manM2(cc.landUnit)}/㎡ · 배율 ${C.pct(cc.ratio)} · 보정 ${C.manM2(cc.adjUnit)}/㎡</small>` : cc.landUnit ? `<small class="rp-hint">토지단가 ${C.manM2(cc.landUnit)}/㎡ · 공시지가를 넣으면 배율이 계산됩니다</small>` : ''}</span>
        <button type="button" class="btn btn-line btn-sm" data-act="comp-resolve" data-i="${i}">지번·공시지가 찾기</button></div>
        ${cands && cands.length > 1 ? `<div class="rp-cand">${cands.map((k, n) => `<button type="button" data-act="comp-cand" data-i="${i}" data-n="${n}"><b>${E(k.addr || k.jibun)}</b><span>${C.comma(k.area, 1)}㎡ · 공시지가 ${C.manM2(k.price)}원/㎡</span></button>`).join('')}<p class="rp-hint">면적이 비슷한 필지가 여러 곳입니다. 맞는 지번을 골라 주세요.</p></div>` : ''}
        <div class="rp-g">${F(`comps.${i}.addr`, '소재지', { ph: '역삼동 123-4' })}${F(`comps.${i}.name`, '건물명(선택)')}${F(`comps.${i}.price`, '거래가', { t: 'eok', unit: '억', calc: 'won' })}${F(`comps.${i}.date`, '거래월', { ph: '2026-07' })}
        ${F(`comps.${i}.landArea`, '토지면적', { t: 'num', unit: '㎡' })}${F(`comps.${i}.landPrice`, '개별공시지가', { t: 'won', unit: '원/㎡', calc: 'm2' })}${F(`comps.${i}.totArea`, '연면적', { t: 'num', unit: '㎡' })}${F(`comps.${i}.far`, '용적률', { t: 'num', unit: '%' })}
        ${F(`comps.${i}.built`, '사용승인 연도', { t: 'num' })}${F(`comps.${i}.use`, '주용도', { ph: '1종근생' })}${F(`comps.${i}.scale`, '규모', { ph: 'B1/5F' })}${F(`comps.${i}.road`, '도로접면')}${F(`comps.${i}.shape`, '형상')}${F(`comps.${i}.dist`, '대상과의 거리', { ph: cc.dist || '약 250m (북측)' })}
        ${F(`comps.${i}.landUnit`, '토지단가 직접 입력(선택)', { t: 'won', unit: '원/㎡', hint: '비우면 (거래가 − 건물 잔존가액) ÷ 토지면적' })}</div></div>`;
    }).join('');
    return `<div class="rp-kpis" data-kpi>${kpis()}</div>${dealTbl}<div class="rp-cards">${cards}</div>
      <div><button type="button" class="btn btn-line btn-sm" data-act="row-add" data-arr="comps">+ 사례 직접 추가</button></div>
      ${imgSlot('subject.maps.comps', '거래사례 위치도 (넣으면 위치도 쪽이 추가됩니다)', { map: 'comps' })}
      ${TA('val.text.conclusion', '사례 결론 문구', { draft: 'conclusion', ph: '비우면 계산 결과로 자동 작성됩니다.' })}`;
  }
  const dealKey = (d) => [d.ym, d.day, d.dong, d.jibun, d.amt, d.plotAr].join('|');

  function valueSec() {
    return `<div class="rp-kpis" data-kpi>${kpis()}</div>
      <div class="rp-h"><span>외부 AVM 참고값 <small class="rp-hint">선택 — 비우면 거래사례 비교 추정이 기준 시세가 됩니다</small></span></div>
      <div class="rp-g">${F('val.avm.total', 'AVM 추정 시세', { t: 'eok', unit: '억', calc: 'won', ph: '85억 5000만' })}${F('val.avm.land', '그중 토지가액', { t: 'eok', unit: '억', calc: 'won' })}${F('val.avm.bldg', '그중 건물가액', { t: 'eok', unit: '억', calc: 'won' })}${F('val.avm.source', '출처 표기', { cls: 'w2', ph: '참조한 AVM 서비스 이름과 조회일' })}</div>
      <div class="rp-h"><span>건물 잔존가액 가정</span></div>
      <div class="rp-g">${F('val.params.replCost', '재조달원가', { t: 'won', unit: '원/㎡', calc: 'm2' })}${F('val.params.life', '내용연수', { t: 'num', unit: '년' })}${F('val.params.minResidual', '잔가율 하한', { t: 'num', hint: '0.1 = 10%' })}</div>
      ${TA('val.text.analysis', '시세 분석 문구', { draft: 'analysis', ph: '비우면 계산 결과로 자동 작성됩니다.' })}
      <div class="rp-h"><span>과세 기준가액 <small class="rp-hint">선택 — 넣은 줄만 표에 나옵니다. 건물 시가표준액을 넣으면 건물분 보유세가 계산됩니다</small></span></div>
      <div class="rp-g">${F('val.std.bldgStd', '건물 시가표준액(올해)', { t: 'man', unit: '만원' })}${F('val.std.bldgStdPrev', '건물 시가표준액(전년)', { t: 'man', unit: '만원' })}${F('val.std.resourceTax', '지역자원시설세(연)', { t: 'man', unit: '만원' })}
        ${F('val.std.bldgTransfer', '건물 기준시가·양도(올해)', { t: 'man', unit: '만원' })}${F('val.std.bldgTransferPrev', '건물 기준시가·양도(전년)', { t: 'man', unit: '만원' })}${F('val.std.bldgInherit', '기준시가·상속증여(올해)', { t: 'man', unit: '만원' })}${F('val.std.bldgInheritPrev', '기준시가·상속증여(전년)', { t: 'man', unit: '만원' })}</div>
      <div class="rp-h"><span>매수자 관점 비용·자금 <small class="rp-hint">세금·투자 분석 쪽에 쓰입니다</small></span></div>
      <div class="rp-g">${F('val.buy.price', '가정 매입가', { t: 'eok', unit: '억', calc: 'won', hint: '비우면 기준 시세' })}${F('val.buy.brokerRate', '중개보수 요율(상한 예시)', { t: 'pct', unit: '%' })}${F('val.buy.appraisalFee', '감정평가수수료', { t: 'man', unit: '만원' })}${F('val.buy.legalFee', '법무사보수', { t: 'man', unit: '만원' })}${F('val.buy.trafficFee', '교통유발부담금', { ph: '해당 없음 / 금액(원)' })}
        ${F('val.buy.loan', '대출금액', { t: 'eok', unit: '억', calc: 'won', hint: '비우면 가정값' })}${F('val.buy.loanRate', '대출 금리', { t: 'pct', unit: '%' })}</div>
      <div class="rp-h"><span>임대 수익 <small class="rp-hint">선택 — 월임대료를 넣으면 NOI·수익률이 계산됩니다</small></span></div>
      <div class="rp-g">${F('val.income.label', '블록 제목', { cls: 'w2', ph: '동일상권 임대 환산 수익 / 현재 Rent Roll 기준' })}${F('val.income.deposit', '보증금 합계', { t: 'man', unit: '만원' })}${F('val.income.rent', '월임대료 합계', { t: 'man', unit: '만원' })}${F('val.income.mgmt', '월관리비 합계', { t: 'man', unit: '만원' })}${F('val.income.vacancy', '공실·대손 가정', { t: 'num', unit: '%' })}${F('val.income.opex', '영업경비(연)', { t: 'man', unit: '만원' })}${F('val.income.interest', '대출이자(연)', { t: 'man', unit: '만원', hint: '비우면 대출금액 × 금리' })}</div>
      ${TA('val.text.checkpoint', '체크포인트(부동산 개요 쪽)', { draft: 'checkpoint', ph: '비우면 공유자 수·허가구역·용적률 여유로 자동 작성됩니다.' })}
      ${TA('val.text.note', '세금·투자 주석', { draft: 'note', ph: '비우면 자동 작성됩니다.' })}`;
  }
  function pricingSec() {
    const c = C.calcValuation(st.doc); const p = c.pricing || {}; const sg = (k) => (p[k] ? `제안값 ${C.eok(p[k])}` : '');
    return `<div class="rp-kpis" data-kpi>${kpis()}</div><p class="rp-hint">비워 두면 거래사례 기준 제안값이 '(제안값)' 표시와 함께 들어갑니다. 매도인과 협의한 금액으로 바꿔 주세요.</p>
      <div class="rp-g">${F('val.pricing.ask', '권장 호가', { t: 'eok', unit: '억', calc: 'won', ph: sg('ask') })}${F('val.pricing.targetLow', '목표 체결가(하단)', { t: 'eok', unit: '억', calc: 'won', ph: sg('targetLow') })}${F('val.pricing.targetHigh', '목표 체결가(상단)', { t: 'eok', unit: '억', calc: 'won', ph: sg('targetHigh') })}${F('val.pricing.floor', '하한선', { t: 'eok', unit: '억', calc: 'won', ph: sg('floor') })}${F('val.pricing.step2', '1차 조정가', { t: 'eok', unit: '억', calc: 'won', ph: sg('step2') })}</div>
      ${TA('val.text.negotiation', '네고 여지', { draft: 'negotiation', rows: 2, ph: '비우면 자동 작성' })}${TA('val.text.logic', '호가 논리', { draft: 'logic', rows: 2, ph: '비우면 자동 작성' })}${TA('val.text.story', '신축 개발 가치', { draft: 'story', rows: 2, ph: '용적률 여유가 있으면 자동 작성' })}${TA('val.text.risk', '리스크', { draft: 'risk', ph: '비우면 자동 작성' })}`;
  }
  const basicSec = () => (isIM() ? `<div class="rp-kpis" data-kpi>${kpis()}</div><div class="rp-g">
      ${F('subject.name', '자산 이름', { cls: 'w2', ph: '건물명 또는 별칭 (표지 제목)' })}${F('im.price', '매각가', { t: 'eok', unit: '억', calc: 'won', ph: '100' })}${F('im.vatNote', '매각가 아래 문구', { ph: '건물분 VAT 별도' })}
      ${F('title', '리포트 제목', { cls: 'w2', ph: C.defaultTitle(st.doc) })}${F('date', '작성 기준월', { ph: '2026-11' })}${F('im.leaseStatus', '임대 현황', { ph: '전체 공실 / 전 층 임대 중' })}${F('im.leaseNote', '임대 현황 보조 문구', { cls: 'w2', ph: '사옥 사용 · 통임대 유치 가능' })}
      ${F('im.subs.summary', '매각 개요 쪽 부제', { cls: 'w2', ph: C.imSubs(st.doc).summary || '비우면 자동' })}</div>
      ${TA('im.keyTitle', 'KEY POINT 제목', { rows: 2, ph: C.draftIM(st.doc).keyTitle || '자산의 핵심을 한두 줄로 (예: ○○역 도보권 신축 근생 빌딩)' })}${TA('im.keyBody', 'KEY POINT 설명', { rows: 2, ph: C.draftIM(st.doc).keyBody })}
      ${imgSlot('subject.cover', '표지 사진 (없으면 네이비 표지)')}`
    : `<div class="rp-g">${F('title', '리포트 제목(표지 부제)', { cls: 'w2', ph: C.defaultTitle(st.doc) })}${F('date', '작성 기준월', { ph: '2026-11' })}${F('subject.name', '건물명(선택)')}
      ${F('subject.headline', '한 줄 요약', { cls: 'full', ph: '○○역 도보권 이면 근린생활시설' })}${F('subject.addr', '소재지', { cls: 'w2' })}${F('subject.road', '도로명 주소', { cls: 'w2' })}${F('subject.sgg', '시군구')}${F('subject.dong', '법정동')}${F('subject.jibun', '지번')}</div>
      ${imgSlot('subject.cover', '건물 사진 (표지·물건 요약에 들어갑니다)')}${imgSlot('subject.maps.location', '위치도', { map: 'location' })}`);
  // IM 전용
  const hlSec = () => `<p class="rp-hint">네 가지까지. 비워 두면 공부에서 확인되는 사실(사용승인·규모·용도지역·역 거리)만으로 초안이 들어갑니다.</p>${cardList('im.highlights', [{ k: 'tag', label: '영문 꼬리표', ph: 'LOCATION' }, { k: 'title', label: '제목', cls: 'w2' }, { k: 'body', label: '설명', ta: true, rows: 2 }], { max: 4, add: '투자 포인트 추가' })}
      <div class="rp-g">${F('im.subs.highlights', '쪽 부제', { cls: 'full', ph: '입지 · 건물 · 임대 · 개발 여지' })}</div><div><button type="button" class="btn btn-line btn-sm" data-act="im-draft" data-what="highlights">공부 사실로 초안 채우기</button></div>`;
  const landUseSec = () => `${rowsTable('im.landUseRows', [{ k: 'k', label: '구분', w: '28%', ph: '용도지역 · 지구' }, { k: 'v', label: '내용', ta: true }], { empty: '비워 두면 토지 정보로 자동 구성됩니다.' })}
      <div><button type="button" class="btn btn-line btn-sm" data-act="im-draft" data-what="landUseRows">토지 정보로 채우기</button></div>
      ${TA('im.landUseOpinion', '검토 의견', { rows: 3, ph: '규제 변화·증축 여지 등 확인한 내용만 적어 주세요. (건축사 검토 필요 여부 포함)' })}
      <div class="rp-g">${F('im.subs.landUse', '쪽 부제', { cls: 'full' })}</div>${imgSlot('subject.maps.cadastral', '지적도·토지이용계획 확인도면', { hint: '토지이음 화면을 캡처해 붙이면 됩니다.' })}`;
  const locSec = () => `${cardList('im.location', [{ k: 'tag', label: '영문 꼬리표', ph: 'SUBWAY / BUS / ROAD' }, { k: 'title', label: '제목', cls: 'w2' }, { k: 'body', label: '설명', ta: true, rows: 2 }], { max: 4, add: '교통 항목 추가' })}
      <div><button type="button" class="btn btn-line btn-sm" data-act="im-draft" data-what="location">가까운 역으로 초안 채우기</button></div>
      <div class="rp-g">${F('im.subs.location', '쪽 부제', { cls: 'full' })}</div>${imgSlot('subject.maps.location', '위치도', { map: 'location' })}`;
  const futureSec = () => `<p class="rp-hint">개발 호재는 고시·보도 등으로 확인한 내용만 직접 적어 주세요. 자동으로 지어내지 않으며, 비워 두면 이 쪽은 빠집니다. 세 칸이면 가운데 카드가 네이비로 강조됩니다.</p>
      ${cardList('im.future', [{ k: 'tag', label: '영문 꼬리표', ph: 'SCARCITY / UPSIDE / REGION' }, { k: 'title', label: '제목', cls: 'w2' }, { k: 'body', label: '내용', ta: true, rows: 5, hint: BLOCK_HINT }], { max: 3, add: '호재 카드 추가' })}
      ${TA('im.futurePoint', 'POINT 한 줄', { rows: 1 })}<div class="rp-g">${F('im.futureSource', '출처', { cls: 'w2', ph: '○○시 도시계획조례(개정 연월) · ○○구 고시' })}${F('im.subs.future', '쪽 부제', { cls: 'w2' })}</div>`;
  const rentSec = () => `<div class="rp-kpis" data-kpi>${kpis()}</div>${rowsTable('im.rentRoll', [{ k: 'floor', label: '층', w: '9%', ph: '3F' }, { k: 'tenant', label: '공부상 용도 / 임차인', ph: '일반음식점 / 공실' }, { k: 'area', label: '면적(평)', t: 'num', w: '11%' }, { k: 'deposit', label: '보증금(만 원)', t: 'num', w: '13%' }, { k: 'rent', label: '월 임대료(만 원)', t: 'num', w: '13%' }, { k: 'mgmt', label: '월 관리비(만 원)', t: 'num', w: '13%' }, { k: 'expire', label: '만료', w: '12%', ph: '2027.06' }], { empty: '층별 현황에서 가져오거나 줄을 추가해 주세요.' })}
      <div><button type="button" class="btn btn-line btn-sm" data-act="im-draft" data-what="rentRoll">층별 현황에서 가져오기</button></div>
      <div class="rp-g">${F('im.useIdea', '활용 방안(카드)', { ph: '사옥 · 통임대' })}${F('im.rentNote', '표 아래 주석', { cls: 'w2', ph: '2026.11 기준 · 층별 면적은 건축물대장 기준' })}${F('im.subs.rentRoll', '쪽 부제', { cls: 'w2' })}</div>`;
  const strengthSec = () => `${TA('im.strengthsLeft', '물건 강점 (왼쪽 네이비 상자)', { rows: 7, hint: BLOCK_HINT, ph: '[입지] 제목\n설명\n\n[건물] 제목\n설명' })}${TA('im.strengthsRight', '투자 가치 (오른쪽 상자)', { rows: 7, hint: BLOCK_HINT })}
      <div class="rp-g">${F('im.strengthsBarLabel', '아래 띠 제목', { ph: '통임대 강점' })}${F('im.subs.strengths', '쪽 부제', { cls: 'w2' })}</div>${TA('im.strengthsBar', '아래 띠 내용', { rows: 2 })}<p class="rp-hint">두 상자를 모두 비우면 이 쪽은 빠집니다.</p>`;
  function photoSec() {
    const pages = st.doc.im.photoPages || [];
    return `<p class="rp-hint">한 쪽에 6장까지 들어가고, 장수에 따라 배치가 자동으로 바뀝니다(4장이면 큰 사진 1 + 작은 사진 3).</p>${pages.map((pg, i) => `<div class="rp-card"><button type="button" class="x" data-act="row-del" data-arr="im.photoPages" data-i="${i}" aria-label="이 쪽 삭제">×</button>
      <div class="rp-g">${F(`im.photoPages.${i}.title`, '쪽 제목', { ph: '현장 사진 · 외관 및 조망' })}${F(`im.photoPages.${i}.sub`, '쪽 부제', { cls: 'w2' })}</div>
      <div class="rp-photos">${(pg.photos || []).map((ph, n) => `<div class="rp-ph"><div class="th" style="background-image:url('${E(ph.src)}')"></div><div class="mv">${n > 0 ? `<button type="button" data-act="ph-mv" data-i="${i}" data-n="${n}" data-d="-1" aria-label="앞으로">‹</button>` : ''}${n < pg.photos.length - 1 ? `<button type="button" data-act="ph-mv" data-i="${i}" data-n="${n}" data-d="1" aria-label="뒤로">›</button>` : ''}</div><button type="button" class="x" data-act="ph-del" data-i="${i}" data-n="${n}" aria-label="사진 삭제">×</button><input type="text" data-p="im.photoPages.${i}.photos.${n}.caption" data-t="txt" value="${E(ph.caption || '')}" placeholder="사진 설명"></div>`).join('')}</div>
      <label class="rp-drop" tabindex="0" data-drop="im.photoPages.${i}.photos">사진 여러 장 선택 · 끌어놓기 · 이 칸을 누른 뒤 Ctrl+V<input type="file" accept="image/*" multiple hidden data-files="im.photoPages.${i}.photos"></label></div>`).join('')}
      <div><button type="button" class="btn btn-line btn-sm" data-act="row-add" data-arr="im.photoPages">+ 사진 쪽 추가</button></div>`;
  }
  const procSec = () => `${cardList('im.process', [{ k: 'title', label: '단계 제목', cls: 'w2' }, { k: 'body', label: '설명', ta: true, rows: 2 }], { max: 4, add: '단계 추가' })}${TA('im.loi', 'LOI 포함 사항', { rows: 2 })}`;

  const SECTIONS = () => (isIM() ? [
    ['basic', '매각 개요', basicSec], ['land', '토지', landSec], ['bldg', '건물', bldgSec], ['floors', '층별 현황', floorSec], ['hl', '투자 포인트', hlSec], ['landuse', '토지이용계획 · 지적도', landUseSec], ['loc', '위치 · 교통', locSec],
    ['future', '개발 호재 · 미래가치', futureSec], ['rent', '임대차 현황 (Rent Roll)', rentSec], ['strength', '물건 강점 분석', strengthSec], ['photos', '현장 사진', photoSec], ['proc', '매각 절차', procSec], ['contact', '연락처 · 출처', contactSec],
  ] : [
    ['basic', '대상 요약 · 사진 · 위치도', basicSec], ['land', '토지', landSec], ['bldg', '건물', bldgSec], ['floors', '층별 현황', floorSec], ['owner', '소유권', ownerSec], ['comps', '거래사례', compSec], ['value', '시세 · 세금 · 투자', valueSec], ['pricing', '가격 전략', pricingSec], ['contact', '연락처 · 출처', contactSec],
  ]);
  const ROW_NEW = { 'subject.floors': () => ({ floor: '', use: '', area: null, structure: '' }), comps: COMP_NEW, 'im.highlights': () => ({ tag: '', title: '', body: '' }), 'im.location': () => ({ tag: '', title: '', body: '' }), 'im.future': () => ({ tag: '', title: '', body: '' }), 'im.landUseRows': () => ({ k: '', v: '' }), 'im.rentRoll': () => ({ floor: '', tenant: '', area: null, deposit: null, rent: null, mgmt: null, expire: '' }), 'im.photoPages': () => ({ title: '현장 사진', sub: '', photos: [] }), 'im.process': () => ({ title: '', body: '' }) };
  const SEC_OF = (path) => (path.startsWith('comps') || path === 'subject.maps.comps' ? 'comps' : path.startsWith('subject.floors') ? 'floors' : path.startsWith('im.highlights') ? 'hl' : path.startsWith('im.location') ? 'loc' : path.startsWith('im.future') ? 'future' : path.startsWith('im.landUseRows') || path === 'subject.maps.cadastral' ? 'landuse' : path.startsWith('im.rentRoll') ? 'rent' : path.startsWith('im.photoPages') ? 'photos' : path.startsWith('im.process') ? 'proc' : path === 'subject.maps.location' ? (isIM() ? 'loc' : 'basic') : path.startsWith('subject.cover') ? 'basic' : null);

  // ---------------------------------------------------------------- 화면 그리기
  function autoBox() {
    return `<div class="rp-auto" data-auto><div class="rp-h"><span>주소(지번)로 자동 채우기</span></div>
      <div class="rp-line"><input type="text" id="rp-q" value="${E(st.q || '')}" placeholder="예: 강남구 역삼동 123-4" autocomplete="off" aria-label="주소 또는 지번"><button type="button" class="btn btn-gold" data-act="autofill">자동 채우기</button></div>
      ${st.cands && st.cands.length > 1 ? `<div class="rp-cand">${st.cands.map((x, i) => `<button type="button" data-act="pick" data-i="${i}"><b>${E(x.label || x.addr)}</b><span>선택</span></button>`).join('')}</div>` : ''}
      ${st.log.length ? `<div class="rp-log">${st.log.map(([ok, t]) => `<div class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '·'} ${E(t)}</div>`).join('')}</div>` : `<p class="rp-hint">토지(면적·용도지역·개별공시지가), 건축물대장(면적·층별 현황·사용승인), 최근 24개월 인근 실거래를 불러옵니다. 불러오지 못한 항목은 아래 칸에 직접 넣으면 됩니다.${isIM() ? ' IM은 매각가만 넣어도 평단가가 계산됩니다.' : ''}</p>`}</div>`;
  }
  function secHtml([key, title, fn]) { return `<details class="rp-sec" data-sec="${key}"${st.open.has(key) ? ' open' : ''}><summary>${title}</summary><div class="rp-body">${st.open.has(key) ? fn() : ''}</div></details>`; }
  function paint() {
    const title = st.doc.title || C.defaultTitle(st.doc) || '새 리포트';
    $('#view').innerHTML = `<div class="rp-top"><div><a class="lnk" href="#/reports" style="font-size:12.5px">‹ 리포트 목록</a><h2 id="rp-ttl">${E(title)}</h2><span class="rp-st" id="rp-st"></span></div>
        <div class="acts"><button type="button" class="btn btn-line btn-sm" data-act="dup">복제</button>${st.id ? '<button type="button" class="btn btn-bad btn-sm" data-act="del">삭제</button>' : ''}<button type="button" class="btn btn-line" data-act="share">공유 링크</button><button type="button" class="btn btn-line" data-act="pdf">PDF로 저장</button><button type="button" class="btn btn-gold" data-act="save">저장</button></div></div>
      <div id="rp-share"></div>
      <div class="rp-mtabs"><button type="button" data-act="tab" data-tab="form" class="${st.tab === 'form' ? 'on' : ''}">입력</button><button type="button" data-act="tab" data-tab="pv" class="${st.tab === 'pv' ? 'on' : ''}">미리보기</button></div>
      <div class="rp-wrap" id="rp-wrap" data-tab="${st.tab}"><div class="rp-form" id="rp-form">${autoBox()}${SECTIONS().map(secHtml).join('')}</div>
        <div class="rp-pv"><div class="rp-pv-h"><span>${E(KIND[st.kind][0])} · <b id="rp-pages">-</b>쪽</span><span>${E(KIND[st.kind][1].split(' · ')[0])}</span></div><iframe id="rp-frame" title="리포트 미리보기" src="/admin/report-view?embed=1&v=${VER}"></iframe></div></div>`;
    bind(); status(); shareBox();
  }
  function reSec(key) {
    const el = $(`.rp-sec[data-sec="${key}"]`); const s = SECTIONS().find((x) => x[0] === key);
    if (el && s && el.open) el.querySelector('.rp-body').innerHTML = s[2]();
  }
  function reAuto() { const el = $('[data-auto]'); if (el) el.outerHTML = autoBox(); }
  function reAll() { const form = $('#rp-form'); if (!form) return; form.innerHTML = autoBox() + SECTIONS().map(secHtml).join(''); }
  function status(msg, bad) {
    const el = $('#rp-st'); if (!el) return;
    el.classList.toggle('bad', !!bad);
    el.textContent = msg || (st.saving ? '저장 중…' : st.dirty ? '저장하지 않은 변경이 있습니다 (잠시 뒤 자동 저장)' : st.savedAt ? `저장됨 ${fmtTime(st.savedAt)}` : '아직 저장하지 않았습니다');
    const t = $('#rp-ttl'); if (t) t.textContent = st.doc.title || C.defaultTitle(st.doc) || '새 리포트';
  }
  function shareBox() {
    const el = $('#rp-share'); if (!el) return;
    el.innerHTML = st.share ? `<div class="rp-share" style="margin-bottom:12px"><b>공유 중</b><input type="text" readonly value="${E(location.origin + '/r/' + st.share)}" aria-label="공유 링크"><button type="button" class="btn btn-line btn-sm" data-act="share-copy">복사</button><button type="button" class="btn btn-line btn-sm" data-act="share-off">공유 끄기</button><span class="rp-hint">링크를 아는 사람은 로그인 없이 볼 수 있습니다. 저장하면 링크 내용도 바로 바뀝니다.</span></div>` : '';
  }
  function post() { const f = $('#rp-frame'); if (f && f.contentWindow) f.contentWindow.postMessage({ type: 'orbis-report', doc: st.doc }, location.origin); }
  function changed(now) {
    st.dirty = true; status();
    clearTimeout(st.pvTimer); st.pvTimer = setTimeout(post, now ? 0 : 350);
    clearTimeout(st.timer); st.timer = setTimeout(() => { if (st && st.dirty && alive() && (st.doc.subject.addr || st.doc.title || st.id)) save(true); }, 4000);
    $$('[data-kpi]').forEach((el) => { el.innerHTML = kpis(); });
  }
  const alive = () => !!(st && document.getElementById('rp-form'));

  // ---------------------------------------------------------------- 저장·공유
  async function save(quiet) {
    if (!st || st.saving) return !!(st && st.id);
    st.saving = true; status();
    const snap = JSON.stringify(st.doc); const s = st;
    try {
      const d0 = JSON.parse(snap); (d0.comps || []).forEach((c) => { for (const k of Object.keys(c)) if (k[0] === '_') delete c[k]; });
      const d = await api('/report', { method: 'PUT', body: { id: s.id || undefined, kind: s.kind, title: d0.title || C.defaultTitle(d0) || '제목 없음', addr: d0.subject.addr || '', status: 'draft', data: d0 } });
      const first = !s.id; s.id = d.id; s.savedAt = d.updated_at || new Date().toISOString();
      if (JSON.stringify(s.doc) === snap) s.dirty = false;
      if (first && st === s && alive()) { history.replaceState(null, '', '#/reports/' + d.id); const a = $('.rp-top .acts'); if (a && !a.querySelector('[data-act=del]')) a.insertAdjacentHTML('afterbegin', '<button type="button" class="btn btn-bad btn-sm" data-act="del">삭제</button>'); }
      s.saving = false; if (st === s) status(); if (!quiet) toast('저장했습니다.');
      return true;
    } catch (e) { s.saving = false; if (st === s) status('저장하지 못했습니다: ' + (e.message || ''), true); if (!quiet) fail(e); return false; }
  }
  async function ensureSaved() { if (st.dirty || !st.id) return save(true); return true; }

  // ---------------------------------------------------------------- 자동 채우기
  async function autofill() {
    const q = ($('#rp-q') || {}).value || ''; st.q = q.trim(); st.log = []; st.cands = null;
    if (!geo) { st.log.push([false, '공공데이터 연결 모듈을 찾지 못했습니다. 아래 칸에 직접 입력해 주세요.']); return reAuto(); }
    if (st.q.length < 2) { st.log.push([false, '주소를 적어 주세요. 예: 강남구 역삼동 123-4']); return reAuto(); }
    st.log.push([true, '주소를 찾는 중…']); reAuto();
    const r = await geo.search(st.q);
    if (!alive()) return;
    st.log = [];
    if (!r.ok || !(r.items || []).length) {
      st.log.push([false, r.message || '주소를 찾지 못했습니다.']);
      st.log.push([false, '소재지·토지면적·개별공시지가·연면적·사용승인일을 아래 칸에 직접 넣으면 그대로 계산됩니다.']);
      if (!st.doc.subject.addr) { st.doc.subject.addr = st.q; changed(); reSec('basic'); }
      return reAuto();
    }
    if (r.items.length > 1) { st.cands = r.items; st.log.push([true, `후보 ${r.items.length}곳을 찾았습니다. 맞는 주소를 골라 주세요.`]); return reAuto(); }
    return pick(r.items[0]);
  }
  async function pick(it) {
    const s = st; const d = s.doc; const sub = d.subject; s.cands = null; s.log = [[true, `${it.label || it.addr} — 자료를 불러오는 중…`]]; reAuto();
    Object.assign(sub, { addr: it.addr || sub.addr, road: it.road || sub.road || '', sido: it.sido || '', sgg: it.sgg || '', dong: it.dong || '', jibun: it.jibun || '', pnu: it.pnu || '', bjd: it.bjd || '', lat: it.lat != null ? it.lat : sub.lat, lon: it.lon != null ? it.lon : sub.lon });
    s.q = sub.addr;
    const [pa, bu] = await Promise.all([it.pnu ? geo.parcel(it.pnu) : { ok: false, message: '필지 번호가 없어 토지 정보를 불러오지 못했습니다.' }, it.pnu ? geo.building(it.pnu) : { ok: false, message: '필지 번호가 없어 건축물대장을 불러오지 못했습니다.' }]);
    if (st !== s || !alive()) return;
    const log = [[true, `주소: ${sub.addr}`]];
    if (pa.ok && pa.land) {
      const L = pa.land; const got = [];
      for (const k of ['area', 'jimok', 'zone', 'zone2', 'etc', 'use', 'road', 'shape', 'terrain', 'price', 'priceYear']) if (L[k] != null && L[k] !== '') { sub.land[k] = L[k]; }
      if (Array.isArray(L.prices) && L.prices.length > 1) { const prev = L.prices.filter((x) => x.year < (L.priceYear || 9999)).sort((a, b) => b.year - a.year)[0]; if (prev) sub.land.pricePrev = prev.price; }
      if (L.addr && !sub.addr) sub.addr = L.addr;
      if (pa.center && sub.lat == null) { sub.lat = pa.center.lat; sub.lon = pa.center.lon; }
      if (pa.owner) { if (pa.owner.type) sub.owner.type = pa.owner.type; if (pa.owner.count) sub.owner.count = pa.owner.count; if (pa.owner.changed) sub.owner.transfer = pa.owner.changed; }
      const lim = (geo.zoneLimits && geo.zoneLimits(sub.land.zone, sub.sido)) || C.zoneLimits(sub.land.zone, sub.sido);
      if (lim) { if (sub.land.legalBcr == null) sub.land.legalBcr = lim.bcr; if (sub.land.legalFar == null) sub.land.legalFar = lim.far; }
      if (L.area) got.push('면적'); if (L.zone) got.push('용도지역'); if (L.price) got.push('개별공시지가'); if (pa.owner) got.push('소유 구분');
      log.push([true, `토지: ${got.join(' · ') || '일부 항목'} 불러옴`]); (pa.warnings || []).forEach((w) => log.push([false, w]));
    } else log.push([false, `토지: ${pa.message || '불러오지 못했습니다.'}${/직접/.test(pa.message || '') ? '' : ' → [토지] 칸에 면적·용도지역·개별공시지가를 직접 넣어 주세요.'}`]);
    if (bu.ok && bu.bldg) {
      const B = bu.bldg; const b = sub.bldg;
      for (const k of ['totArea', 'farArea', 'archArea', 'bcr', 'far', 'structure', 'roof', 'ground', 'under', 'height', 'approved']) if (B[k] != null && B[k] !== '') b[k] = B[k];
      if (B.use) b.use = B.use; if (B.name && !sub.name) sub.name = B.name;
      if (B.elevator != null) b.elevator = B.elevator > 0 ? `승용 ${B.elevator}대` : '없음';
      if (B.parking) { const p = B.parking; const parts = [p.indoor ? `옥내 자주식 ${p.indoor}대` : '', p.outdoor ? `옥외 자주식 ${p.outdoor}대` : '', p.mech ? `기계식 ${p.mech}대` : ''].filter(Boolean); b.parking = parts.join(' · ') || (p.total ? `총 ${p.total}대` : '없음'); }
      if (B.violation === true) b.remodel = '건축물대장상 위반건축물 표시';
      if (sub.land.area == null && B.platArea) sub.land.area = B.platArea;
      if (Array.isArray(bu.floors) && bu.floors.length) sub.floors = bu.floors.slice().sort((x, y) => (x.gb === y.gb ? (x.gb === '지하' ? x.no - y.no : y.no - x.no) : x.gb === '지하' ? 1 : -1)).map((f) => ({ floor: f.label || `${f.gb === '지하' ? '지하 ' : ''}${f.no}층`, use: f.etc || f.use || '', area: f.area, structure: f.structure || '' }));
      log.push([true, `건축물대장: 면적·규모·사용승인${sub.floors.length ? ` · 층별 ${sub.floors.length}줄` : ''} 불러옴${bu.buildings > 1 ? ` (대장 ${bu.buildings}동 중 주건축물 기준)` : ''}`]); (bu.warnings || []).forEach((w) => log.push([false, w]));
    } else log.push([false, `건축물대장: ${bu.message || '불러오지 못했습니다.'}${/직접/.test(bu.message || '') ? '' : ' → [건물]·[층별 현황] 칸에 직접 넣어 주세요.'}`]);
    // 가까운 역
    if (sub.lat != null && geo.nearStations) { try { const ss = await geo.nearStations(sub.lat, sub.lon); if (ss && ss.length) { sub.stations = ss; log.push([true, `가까운 역: ${ss.slice(0, 2).map((x) => `${x.name} 약 ${Math.round(x.dist / 10) * 10}m`).join(', ')}`]); } } catch (e) {} }
    if (!sub.headline && sub.stations && sub.stations[0] && sub.bldg.use) sub.headline = `${sub.stations[0].name} 직선 약 ${Math.round(sub.stations[0].dist / 10) * 10}m · ${sub.bldg.use}`;
    if (st !== s || !alive()) return;
    // 인근 실거래 (가격 검토 보고서)
    if (!isIM() && it.pnu) {
      const dl = await geo.deals({ pnu: it.pnu, months: 24, kinds: 'nrg' });
      if (st !== s || !alive()) return;
      if (dl.ok) { s.deals = dl.deals || []; s.dealsMsg = ''; log.push([true, `인근 실거래: 최근 24개월 ${s.deals.length}건 불러옴 → [거래사례]에서 5건 안팎을 골라 주세요.`]); s.open.add('comps'); }
      else { s.deals = null; s.dealsMsg = `실거래를 불러오지 못했습니다(${dl.message || '연결 실패'}). 사례를 직접 추가해 주세요.`; log.push([false, `인근 실거래: ${dl.message || '불러오지 못했습니다.'}${/직접/.test(dl.message || '') ? '' : ' → [거래사례]에 직접 추가해 주세요.'}`]); }
    }
    // IM: 빈 칸에 사실 기반 초안
    if (isIM()) imDraft(['highlights', 'landUseRows', 'location', 'rentRoll', 'leaseStatus'], true);
    s.log = log; changed(true); reAll();
    // 위치도 자동 (기다리지 않음)
    if (sub.lat != null && geo.staticMap && !(sub.maps.location && sub.maps.location.src)) autoMap('subject.maps.location', 'location', true);
  }
  function imDraft(what, onlyEmpty) {
    const d = C.draftIM(st.doc); const im = st.doc.im;
    const emptyArr = (a) => !a || !a.filter((x) => x && Object.values(x).some((v) => v != null && v !== '' && !(Array.isArray(v) && !v.length))).length;
    for (const k of what) {
      if (k === 'leaseStatus') { if (!im.leaseStatus && d.leaseStatus) im.leaseStatus = d.leaseStatus; continue; }
      if (!d[k] || !d[k].length) continue;
      if (onlyEmpty && !emptyArr(im[k])) continue;
      im[k] = JSON.parse(JSON.stringify(d[k]));
    }
  }
  async function autoMap(path, kind, quiet) {
    const s = st; const sub = s.doc.subject;
    if (sub.lat == null || sub.lon == null) { if (!quiet) toast('좌표가 없어 지도를 만들 수 없습니다. 주소로 자동 채우기를 먼저 하거나 캡처를 붙여 주세요.', true); return; }
    let markers = [{ lat: sub.lat, lon: sub.lon, label: '대상' }]; let zoom = 17;
    if (kind === 'comps') { const cs = (s.doc.comps || []).filter((c) => c.lat != null && c.lon != null); if (!cs.length) { if (!quiet) toast('사례의 좌표가 없습니다. [지번·공시지가 찾기]로 좌표를 채우거나 지도 캡처를 붙여 주세요.', true); return; } markers = markers.concat(cs.map((c, i) => ({ lat: c.lat, lon: c.lon, label: String((s.doc.comps || []).indexOf(c) + 1).padStart(2, '0') }))); zoom = 16; }
    let url = '';
    try { url = await geo.staticMap({ lat: sub.lat, lon: sub.lon, zoom, w: kind === 'comps' ? 1000 : 800, h: kind === 'comps' ? 780 : 600, markers, owner: 'report:' + (s.id || 'new') }); } catch (e) { url = ''; }
    if (st !== s || !alive()) return;
    if (!url) { if (!quiet) toast('지도를 자동으로 만들지 못했습니다. 지도 화면을 캡처해 이 칸에 붙여 주세요(Ctrl+V).', true); return; }
    const cur = getP(s.doc, path) || {}; setP(s.doc, path, { src: url, caption: cur.caption || '' });
    changed(true); const k = SEC_OF(path); if (k) reSec(k);
  }

  // 실거래 후보 → 사례
  async function bjdOf(dong) {
    const sub = st.doc.subject; if (!dong || dong === sub.dong) return sub.bjd || '';
    st.bjdCache = st.bjdCache || {}; if (st.bjdCache[dong] != null) return st.bjdCache[dong];
    const r = await geo.search(`${sub.sido || ''} ${sub.sgg || ''} ${dong} 1`.trim());
    st.bjdCache[dong] = (r.ok && r.items && r.items[0] && r.items[0].bjd) || ''; return st.bjdCache[dong];
  }
  async function toggleDeal(key) {
    const s = st; const comps = s.doc.comps; const at = comps.findIndex((c) => c._deal === key);
    if (at >= 0) { comps.splice(at, 1); s.compCands = {}; changed(true); return reSec('comps'); }
    const d = (s.deals || []).find((x) => dealKey(x) === key); if (!d) return;
    if (comps.length >= 6) return toast('사례는 6건까지 넣을 수 있습니다.', true);
    const c = { ...COMP_NEW(), _deal: key, _mask: d.jibun, _dong: d.dong, addr: `${d.dong} ${d.jibun}`.trim(), price: d.amt, date: d.ym, landArea: d.plotAr, totArea: d.bldAr || null, built: d.built || null, use: String(d.use || '').replace(/^제(\d)종근린생활시설?$/, '$1종근생').replace('근린생활시설', '근생') };
    comps.push(c); changed(true); reSec('comps');
    await resolveComp(comps.indexOf(c), true);
  }
  async function resolveComp(i, quiet) {
    const s = st; const c = s.doc.comps[i]; if (!c) return;
    if (!C.num(c.landArea)) { if (!quiet) toast('토지면적을 먼저 넣어 주세요.', true); return; }
    const m = String(c.addr || '').match(/^(.*?)\s*((?:산\s*)?[\d*]+(?:-[\d*]+)?)\s*$/);
    const dong = c._dong || (m && m[1].trim().split(/\s+/).pop()) || s.doc.subject.dong; const mask = c._mask || (m && m[2]) || '';
    if (!mask) { if (!quiet) toast('소재지에 "동 + 지번"을 적어 주세요. 예: 역삼동 123-4', true); return; }
    const bjd = await bjdOf(dong);
    const r = await geo.resolveComp({ bjd, jibunMask: mask, plotAr: c.landArea });
    if (st !== s || !alive() || s.doc.comps[i] !== c) return;
    if (!r.ok || !(r.items || []).length) { if (!quiet) toast(r.message || '면적이 맞는 필지를 찾지 못했습니다. 지번과 공시지가를 직접 넣어 주세요.', true); return; }
    s.compCands[i] = r.items; applyCand(i, 0, true);
    if (r.items.length > 1 && !quiet) toast(`면적이 비슷한 필지가 ${r.items.length}곳입니다. 맞는 지번을 골라 주세요.`);
  }
  function applyCand(i, n, keepList) {
    const c = st.doc.comps[i]; const k = (st.compCands[i] || [])[n]; if (!c || !k) return;
    const dong = c._dong || String(c.addr || '').replace(/\s*[\d*-]+\s*$/, '');
    c.addr = `${dong} ${k.jibun}`.trim(); if (k.price) c.landPrice = k.price; c.lat = k.lat; c.lon = k.lon; c.pnu = k.pnu;
    if (!keepList || (st.compCands[i] || []).length === 1) delete st.compCands[i];
    changed(true); reSec('comps');
  }

  // ---------------------------------------------------------------- 사진 올리기
  const imageFiles = (dt) => [...((dt && dt.files) || [])].filter((f) => /^image\//.test(f.type));
  async function upload(file) { const dataUrl = await shrinkImage(file); const d = await api('/media', { method: 'POST', body: { dataUrl, owner: 'report:' + (st.id || 'new') } }); return d.url; }
  async function putImage(path, file, el) {
    const s = st; if (el) el.classList.add('busy');
    try { const url = await upload(file); if (st !== s) return; const cur = getP(s.doc, path) || {}; setP(s.doc, path, { src: url, caption: cur.caption || '' }); changed(true); }
    catch (e) { fail(e); } finally { if (el) el.classList.remove('busy'); const k = SEC_OF(path); if (k && alive()) reSec(k); }
  }
  async function addPhotos(path, files, el) {
    const s = st; if (el) el.classList.add('busy');
    try { for (const f of files) { const url = await upload(f); if (st !== s) return; const arr = getP(s.doc, path) || []; arr.push({ src: url, caption: '' }); setP(s.doc, path, arr); changed(true); } }
    catch (e) { fail(e); } finally { if (alive()) reSec('photos'); }
  }

  // ---------------------------------------------------------------- 이벤트
  function bind() {
    const view = $('#view');
    view.oninput = (e) => {
      const el = e.target; const p = el.dataset && el.dataset.p; if (!p || !st) return;
      setP(st.doc, p, parseVal(el.value, el.dataset.t || 'txt'));
      const cal = el.closest('.rp-f') && el.closest('.rp-f').querySelector('[data-calc]'); if (cal) cal.textContent = calcText(cal.dataset.calc, cal.dataset.ct);
      changed();
    };
    view.onkeydown = (e) => { if (e.key === 'Enter' && e.target.id === 'rp-q') { e.preventDefault(); autofill(); } };
    view.ontoggle = null;
    view.addEventListener('toggle', (e) => { const d = e.target; if (!st || !d.classList || !d.classList.contains('rp-sec')) return; const k = d.dataset.sec; if (d.open) { st.open.add(k); const b = d.querySelector('.rp-body'); if (!b.innerHTML.trim()) reSec(k); } else st.open.delete(k); }, true);
    view.onchange = (e) => {
      const el = e.target; if (!st) return;
      if (el.dataset.file && el.files[0]) putImage(el.dataset.file, el.files[0], el.closest('.rp-img'));
      if (el.dataset.files && el.files.length) addPhotos(el.dataset.files, [...el.files], el.closest('.rp-drop'));
    };
    view.ondragover = (e) => { const z = e.target.closest && e.target.closest('.rp-img,.rp-drop'); if (z) { e.preventDefault(); z.classList.add('over'); } };
    view.ondragleave = (e) => { const z = e.target.closest && e.target.closest('.rp-img,.rp-drop'); if (z) z.classList.remove('over'); };
    view.ondrop = (e) => { const z = e.target.closest && e.target.closest('.rp-img,.rp-drop'); if (!z) return; e.preventDefault(); z.classList.remove('over'); const fs = imageFiles(e.dataTransfer); if (!fs.length) return; if (z.dataset.img) putImage(z.dataset.img, fs[0], z); else addPhotos(z.dataset.drop, fs, z); };
    view.onpaste = (e) => { const z = e.target.closest && e.target.closest('.rp-img,.rp-drop'); if (!z) return; const fs = imageFiles(e.clipboardData); if (!fs.length) return; e.preventDefault(); if (z.dataset.img) putImage(z.dataset.img, fs[0], z); else addPhotos(z.dataset.drop, fs, z); };
    view.onclick = async (e) => {
      const b = e.target.closest && e.target.closest('[data-act]'); if (!b || !st) return;
      const a = b.dataset.act; const s = st;
      if (a === 'tab') { st.tab = b.dataset.tab; $('#rp-wrap').dataset.tab = st.tab; $$('.rp-mtabs button').forEach((x) => x.classList.toggle('on', x.dataset.tab === st.tab)); if (st.tab === 'pv') post(); return; }
      if (a === 'autofill') return autofill();
      if (a === 'pick') return pick(st.cands[+b.dataset.i]);
      if (a === 'save') return save();
      if (a === 'pdf') { const w = window.open('about:blank', '_blank'); const ok = await ensureSaved(); if (ok && s.id) { if (w) w.location = `/admin/report-view?id=${encodeURIComponent(s.id)}&print=1`; else location.href = `/admin/report-view?id=${encodeURIComponent(s.id)}`; } else if (w) w.close(); return; }
      if (a === 'share') { if (!(await ensureSaved())) return; try { const d = await api('/report/share', { method: 'POST', body: { id: s.id, on: true } }); s.share = d.share; shareBox(); toast('공유 링크를 만들었습니다.'); } catch (err) { fail(err); } return; }
      if (a === 'share-off') { try { await api('/report/share', { method: 'POST', body: { id: s.id, on: false } }); s.share = null; shareBox(); toast('공유를 껐습니다. 기존 링크는 더 이상 열리지 않습니다.'); } catch (err) { fail(err); } return; }
      if (a === 'share-copy') { const v = location.origin + '/r/' + s.share; try { await navigator.clipboard.writeText(v); toast('링크를 복사했습니다.'); } catch (err) { const i = $('#rp-share input'); if (i) { i.select(); document.execCommand('copy'); toast('링크를 복사했습니다.'); } } return; }
      if (a === 'dup') { if (!(await ensureSaved())) return; try { const d0 = JSON.parse(JSON.stringify(s.doc)); d0.title = (d0.title || C.defaultTitle(d0)) + ' (복제)'; const d = await api('/report', { method: 'PUT', body: { kind: s.kind, title: d0.title, addr: d0.subject.addr || '', status: 'draft', data: d0 } }); toast('복제했습니다.'); location.hash = '#/reports/' + d.id; } catch (err) { fail(err); } return; }
      if (a === 'del') { if (!s.id || !confirm('이 리포트를 삭제할까요? 공유 링크도 함께 닫힙니다.')) return; try { clearTimeout(s.timer); await api('/report?id=' + encodeURIComponent(s.id), { method: 'DELETE' }); st = null; toast('삭제했습니다.'); location.hash = '#/reports'; } catch (err) { fail(err); } return; }
      if (a === 'row-add') { const p = b.dataset.arr; const arr = getP(s.doc, p) || []; arr.push((ROW_NEW[p] || (() => ({})))()); setP(s.doc, p, arr); changed(true); return reSec(SEC_OF(p)); }
      if (a === 'row-del') { const p = b.dataset.arr; const arr = getP(s.doc, p) || []; arr.splice(+b.dataset.i, 1); if (p === 'comps') s.compCands = {}; changed(true); return reSec(SEC_OF(p)); }
      if (a === 'draft') { const d = C.draftValuation(s.doc); const v = d[b.dataset.key] || ''; if (!v) return toast('아직 초안을 만들 자료가 부족합니다. 거래사례와 공시지가를 먼저 넣어 주세요.', true); setP(s.doc, b.dataset.path, v); const ta = document.getElementById(fid(b.dataset.path)); if (ta) ta.value = v; return changed(true); }
      if (a === 'im-draft') { const w = b.dataset.what; const before = JSON.stringify(s.doc.im[w]); imDraft([w], false); if (JSON.stringify(s.doc.im[w]) === before) toast('채울 자료가 아직 없습니다. 토지·건물·층별 현황을 먼저 넣어 주세요.', true); changed(true); return reSec(SEC_OF('im.' + w)); }
      if (a === 'img-clear') { const cur = getP(s.doc, b.dataset.path) || {}; setP(s.doc, b.dataset.path, { src: '', caption: cur.caption || '' }); changed(true); return reSec(SEC_OF(b.dataset.path)); }
      if (a === 'map') { b.disabled = true; await autoMap(b.dataset.path, b.dataset.map); b.disabled = false; return; }
      if (a === 'deal-toggle') return toggleDeal(b.dataset.key);
      if (a === 'comp-resolve') { b.disabled = true; await resolveComp(+b.dataset.i); if (b.isConnected) b.disabled = false; return; }
      if (a === 'comp-cand') return applyCand(+b.dataset.i, +b.dataset.n);
      if (a === 'ph-del') { s.doc.im.photoPages[+b.dataset.i].photos.splice(+b.dataset.n, 1); changed(true); return reSec('photos'); }
      if (a === 'ph-mv') { const arr = s.doc.im.photoPages[+b.dataset.i].photos; const n = +b.dataset.n; const t = n + (+b.dataset.d); if (t >= 0 && t < arr.length) { [arr[n], arr[t]] = [arr[t], arr[n]]; changed(true); reSec('photos'); } return; }
    };
    if (!hooked) {
      hooked = true;
      window.addEventListener('message', (e) => { if (e.origin !== location.origin || !st || !e.data) return; if (e.data.type === 'orbis-report-ready') post(); if (e.data.type === 'orbis-report-pages') { const el = document.getElementById('rp-pages'); if (el) el.textContent = e.data.n; } });
      window.addEventListener('beforeunload', (e) => { if (st && st.dirty && alive()) { e.preventDefault(); e.returnValue = ''; } });
      // 다른 메뉴로 나갈 때 저장하지 않은 변경이 있으면 바로 저장합니다
      window.addEventListener('hashchange', () => { if (st && st.dirty && !st.saving && (st.id || st.doc.subject.addr || st.doc.title)) { clearTimeout(st.timer); save(true); } });
    }
  }

  // ---------------------------------------------------------------- 매물·접수 건에서 시작
  async function prefillFrom() {
    const from = hashQuery().get('from') || ''; const m = from.match(/^(listing|lead):(.+)$/); if (!m) return;
    const s = st; let addr = ''; let note = '';
    try {
      if (m[1] === 'listing') {
        const d = await api('/listing?id=' + encodeURIComponent(m[2])); const l = d.listing || {}; const p = l.private || {};
        addr = p.addr || p.address || [l.sido, l.sgg, l.dong].filter(Boolean).join(' ');
        if (l.title && !s.doc.subject.name) s.doc.subject.name = l.title;
        if (isIM() && l.price) s.doc.im.price = Number(l.price) * 1e4; // 매물의 매매가는 만원 단위
        note = `매물 "${l.title || m[2]}"에서 시작했습니다.`;
      } else {
        const d = await api('/lead?id=' + encodeURIComponent(m[2])); const l = d.lead || {}; const data = l.data || {};
        const key = ['자산 소재지', '소재지', '물건 소재지', '매물 소재지', '검토 주소', '주소'].find((k) => data[k]) || Object.keys(data).find((k) => /소재지|주소/.test(k) && data[k]);
        addr = key ? String(data[key]) : '';
        const pk = Object.keys(data).find((k) => /매각\s*희망가|희망\s*매각가|희망가|매각가/.test(k) && data[k]);
        if (pk) { const v = parseMoney(String(data[pk]), 'eok'); if (v && v > 1e7) { if (isIM()) s.doc.im.price = v; else s.doc.val.pricing.ask = v; } }
        note = `접수 건(${l.name || data['성함'] || m[2]})에서 시작했습니다.`;
      }
    } catch (e) { return fail(e); }
    if (st !== s || !alive()) return;
    s.q = addr; s.log = [[true, note + (addr ? '' : ' 주소가 없어 직접 적어 주세요.')]]; changed(true); reAll();
    if (addr && /\d/.test(addr)) autofill();
  }

  return {
    async view(...args) {
      const p = partsOf(args.flat());
      if (!p.length) return list();
      if (p[0] === 'new') return editor(null, p[1] === 'im' ? 'im' : 'valuation');
      if (st && st.id === p[0] && alive()) return; // 첫 저장 뒤 주소만 바뀐 경우
      return editor(p[0]);
    },
  };
}
