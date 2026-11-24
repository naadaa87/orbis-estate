// 오르비스 리포트 — 계산·표기·문장 초안 (순수 함수, DOM 사용 안 함)
// 매각 가격 검토 보고서(valuation)와 매각 투자안내서(im)가 함께 씁니다.
// 모든 금액은 원 단위 숫자, 면적은 ㎡, 공시지가는 원/㎡ 입니다.

export const PY = 3.305785; // 1평 = 3.305785㎡
export const CONTACT = { name: '이상민', role: '대표', phone: '010-7379-5265', email: 'flowermin4@gmail.com' };
export const FIRM = { name: '오르비스중개법인', reg: '11680-2025-00157', addr: '서울특별시 강남구 테헤란로 123, 6층 615호', ceo: '이상민', site: 'orbis-estate.com' };
export const DEFAULT_PARAMS = { replCost: 1580000, life: 50, minResidual: 0.1, depositYield: 0.02, loanRate: 0.042, brokerRate: 0.009 };

// ------------------------------------------------------------ 숫자·표기
export function num(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  const n = parseFloat(String(v).replace(/[,\s원㎡%평]/g, ''));
  return isFinite(n) ? n : null;
}
const has = (v) => num(v) != null;
/** 소수 자리를 고정해 적습니다 (141 → 141.00) */
export const fix = (n, d = 2) => (num(n) == null ? '-' : num(n).toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d }));
export const comma = (n, d = 0) => (num(n) == null ? '-' : Number(num(n).toFixed(d)).toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: d }));
export const toPy = (m2) => (has(m2) ? num(m2) / PY : null);
/** 84.8억 · 56억 (소수 한 자리 반올림, 끝자리 0은 생략. keepZero면 100.0억) */
export function eok(v, d = 1, keepZero = false) {
  if (!has(v)) return '-';
  const s = (num(v) / 1e8).toFixed(d);
  return (keepZero ? s : s.replace(/\.0+$/, '')) + '억';
}
/** 83.9억 (소수 한 자리에서 버림 — 대표 금액을 부풀려 적지 않기 위해) */
export function eokF(v, d = 1) {
  if (!has(v)) return '-';
  const k = Math.pow(10, d); const x = Math.floor((num(v) / 1e8) * k + 1e-6) / k;
  return x.toFixed(d).replace(/\.0+$/, '') + '억';
}
/** 83억 9,680만원 (만원 미만 버림. round=true면 반올림) */
export function eokMan(v, round = false) {
  if (!has(v)) return '-';
  const raw = num(v) / 1e4; const neg = raw < 0;
  const a = round ? Math.round(Math.abs(raw)) : Math.floor(Math.abs(raw) + 1e-6);
  const e = Math.floor(a / 1e4); const m = a % 1e4;
  const s = e ? `${e.toLocaleString('ko-KR')}억${m ? ' ' + m.toLocaleString('ko-KR') + '만' : ''}원` : `${m.toLocaleString('ko-KR')}만원`;
  return (neg ? '-' : '') + s;
}
/** 1,490만원 (1억 이상이어도 만원 단위로, 만원 미만 버림) */
export const man = (v) => (has(v) ? Math.floor(num(v) / 1e4 + 1e-6).toLocaleString('ko-KR') + '만원' : '-');
/** 9,210만원 (반올림 — 평당가 같은 단가용) */
export const manR = (v) => (has(v) ? Math.round(num(v) / 1e4).toLocaleString('ko-KR') + '만원' : '-');
/** 공시지가·토지단가: 1,193만 */
export const manM2 = (v) => (has(v) ? Math.round(num(v) / 1e4).toLocaleString('ko-KR') + '만' : '-');
export const pct = (x, d = 2) => (has(x) ? (num(x) * 100).toFixed(d) + '%' : '-');
export const area = (m2, d = 2) => (has(m2) ? `${comma(m2, d)}㎡` : '-');
export const areaPy = (m2) => (has(m2) ? `${comma(m2, 2)}㎡ (${comma(toPy(m2), 2)}평)` : '-');
export const roundEok = (v) => (has(v) ? Math.round(num(v) / 1e8) * 1e8 : null);
export function yearOf(v) {
  if (v == null || v === '') return null;
  const m = String(v).match(/(19|20)\d{2}/);
  return m ? parseInt(m[0], 10) : null;
}
export function dateDot(v) {
  if (!v) return '';
  const m = String(v).match(/((?:19|20)\d{2})\D?(\d{1,2})?\D?(\d{1,2})?/);
  if (!m) return String(v);
  return [m[1], m[2] && m[2].padStart(2, '0'), m[3] && m[3].padStart(2, '0')].filter(Boolean).join('.');
}
export function thisMonth(now = new Date()) {
  const k = new Date(now.getTime() + 9 * 3600e3);
  return k.toISOString().slice(0, 7);
}
export const refYearOf = (doc) => yearOf(doc && doc.date) || new Date().getFullYear();
const monthsBetween = (a, b) => { // 'YYYY-MM' 두 개 사이 개월 수 (b - a)
  const pa = String(a || '').match(/(\d{4})\D?(\d{1,2})/); const pb = String(b || '').match(/(\d{4})\D?(\d{1,2})/);
  if (!pa || !pb) return null;
  return (parseInt(pb[1], 10) - parseInt(pa[1], 10)) * 12 + (parseInt(pb[2], 10) - parseInt(pa[2], 10));
};
export function haversine(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every((x) => has(x))) return null;
  const R = 6371000; const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r; const dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
export function bearingKo(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every((x) => has(x))) return '';
  const r = Math.PI / 180;
  const y = Math.sin((lon2 - lon1) * r) * Math.cos(lat2 * r);
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon2 - lon1) * r);
  const deg = (Math.atan2(y, x) / r + 360) % 360;
  return ['북', '북동', '동', '남동', '남', '남서', '서', '북서'][Math.round(deg / 45) % 8] + '측';
}

// ------------------------------------------------------------ 용도지역별 법정 건폐율·용적률 (서울특별시 도시계획 조례 일반 기준)
const SEOUL_LIMITS = [
  [/제?1종\s*전용/, 50, 100], [/제?2종\s*전용/, 40, 120], [/제?1종\s*일반/, 60, 150], [/제?2종\s*일반/, 60, 200], [/제?3종\s*일반/, 50, 250],
  [/준주거/, 60, 400], [/중심상업/, 60, 1000], [/일반상업/, 60, 800], [/근린상업/, 60, 600], [/유통상업/, 60, 600], [/준공업/, 60, 400],
];
export function zoneLimits(zone, sido) {
  if (!zone || !/서울/.test(String(sido || ''))) return null;
  for (const [re, bcr, far] of SEOUL_LIMITS) if (re.test(zone)) return { bcr, far, basis: '서울특별시 도시계획 조례 일반 기준' };
  return null;
}

// ------------------------------------------------------------ 문서 기본 틀
export function emptyDoc(kind = 'valuation') {
  return {
    v: 1, kind, title: '', date: thisMonth(),
    subject: {
      name: '', headline: '', addr: '', road: '', sido: '', sgg: '', dong: '', jibun: '', pnu: '', bjd: '', lat: null, lon: null,
      land: { area: null, jimok: '', zone: '', zone2: '', etc: '', use: '', road: '', shape: '', terrain: '', price: null, priceYear: null, pricePrev: null, legalBcr: null, legalFar: null, permit: '' },
      bldg: { totArea: null, farArea: null, archArea: null, bcr: null, far: null, use: '', structure: '', roof: '', ground: null, under: null, height: null, parking: '', elevator: '', approved: '', remodel: '' },
      floors: [], owner: { type: '', count: null, transfer: '', landMove: '', units: '', housing: '' },
      stations: [], cover: { src: '', caption: '' },
      maps: { location: { src: '', caption: '' }, comps: { src: '', caption: '' }, cadastral: { src: '', caption: '' } },
    },
    comps: [],
    val: {
      avm: { total: null, land: null, bldg: null, source: '' },
      params: { ...DEFAULT_PARAMS },
      std: { bldgTransfer: null, bldgTransferPrev: null, bldgInherit: null, bldgInheritPrev: null, bldgStd: null, bldgStdPrev: null, resourceTax: null },
      buy: { price: null, brokerRate: DEFAULT_PARAMS.brokerRate, appraisalFee: null, legalFee: null, trafficFee: '', loan: null, loanRate: DEFAULT_PARAMS.loanRate },
      income: { label: '', deposit: null, rent: null, mgmt: null, vacancy: null, opex: null, interest: null },
      pricing: { ask: null, targetLow: null, targetHigh: null, floor: null, step2: null },
      text: { analysis: '', conclusion: '', checkpoint: '', note: '', risk: '', negotiation: '', logic: '', story: '' },
      subs: {},
    },
    im: {
      price: null, vatNote: '건물분 VAT 별도', leaseStatus: '', leaseNote: '',
      keyTitle: '', keyBody: '',
      highlights: [], landUseRows: [], landUseOpinion: '',
      location: [], future: [], futurePoint: '', futureSource: '',
      rentRoll: [], rentNote: '', useIdea: '',
      strengthsLeft: '', strengthsRight: '', strengthsBarLabel: '', strengthsBar: '',
      photoPages: [],
      process: [
        { title: 'IM 검토 · 현장 답사', body: '비밀유지확약서(CA) 제출 후 임대차계약서·도면 등 상세자료를 제공하고 현장 답사를 안내합니다.' },
        { title: '매수의향서(LOI) 제출', body: '매도자가 제출된 매수의향서의 가격과 조건을 검토해 우선협상대상자를 선정합니다.' },
        { title: '매매계약 · 소유권 이전', body: '매매계약 체결과 계약금 지급 후, 중도금·잔금을 거쳐 소유권이전등기를 마칩니다.' },
      ],
      loi: '매수 주체 · 매수가격(건물분 VAT 별도) · 자금조달 계획 · 계약금·중도금·잔금 일정 · 매수 조건',
      subs: {},
    },
    contact: { ...CONTACT },
    source: '',
  };
}
/** 저장된 문서에 빠진 키를 기본 틀로 채웁니다 (배열·값은 덮어쓰지 않음) */
export function normalize(doc) {
  const base = emptyDoc((doc && doc.kind) || 'valuation');
  const merge = (b, d) => {
    if (Array.isArray(b)) return Array.isArray(d) ? d : b;
    if (b && typeof b === 'object') {
      const o = { ...(d && typeof d === 'object' && !Array.isArray(d) ? d : {}) };
      for (const k of Object.keys(b)) o[k] = merge(b[k], d ? d[k] : undefined);
      return o;
    }
    return d === undefined ? b : d;
  };
  return merge(base, doc || {});
}

// ------------------------------------------------------------ 건물 잔존가액
export function bldgResidual({ totArea, builtYear, refYear }, params = DEFAULT_PARAMS) {
  const a = num(totArea); const y = num(builtYear);
  if (!a || !y) return null;
  const p = { ...DEFAULT_PARAMS, ...(params || {}) };
  const age = Math.max(0, (refYear || new Date().getFullYear()) - y);
  const ratio = Math.max(num(p.minResidual) || 0, 1 - age / (num(p.life) || 50));
  return { value: (num(p.replCost) || 0) * a * ratio, age, ratio };
}

// ------------------------------------------------------------ 보유세·취득세
/** 토지분 재산세(별도합산) — 과표 = 공시지가 총액 × 공정시장가액비율 70% */
export function landHoldTax(landTotal) {
  if (!has(landTotal)) return null;
  const base = num(landTotal) * 0.7;
  let tax = 0;
  if (base <= 2e8) tax = base * 0.002;
  else if (base <= 1e9) tax = 4e5 + (base - 2e8) * 0.003;
  else tax = 2.8e6 + (base - 1e9) * 0.004;
  const city = base * 0.0014; const edu = tax * 0.2;
  return { base, tax, city, edu, total: tax + city + edu };
}
/** 건물분 재산세 — 시가표준액 × 70% × 0.25% (+도시지역분 0.14%, 지방교육세 20%, 지역자원시설세 입력값) */
export function bldgHoldTax(std, resourceTax) {
  if (!has(std)) return null;
  const base = num(std) * 0.7; const tax = base * 0.0025; const city = base * 0.0014; const edu = tax * 0.2; const res = num(resourceTax) || 0;
  return { base, tax, city, edu, resource: res, total: tax + city + edu + res };
}
/** 매수자 취득세(주택 외 매매) — 과표 = 매입가 + 중개보수 */
export function acquisition(price, buy = {}) {
  if (!has(price)) return null;
  const rate = has(buy.brokerRate) ? num(buy.brokerRate) : DEFAULT_PARAMS.brokerRate;
  const broker = num(price) * rate; const base = num(price) + broker;
  const acq = base * 0.04; const rural = base * 0.002; const edu = base * 0.004;
  const appraisal = num(buy.appraisalFee) || 0; const legal = num(buy.legalFee) || 0; const traffic = num(buy.trafficFee) || 0;
  const taxes = acq + rural + edu; const etc = broker + appraisal + legal + traffic;
  return { rate, broker, base, acq, rural, edu, taxes, appraisal, legal, traffic, etc, cost: taxes + etc };
}

// ------------------------------------------------------------ 가격 검토 계산 전체
export function calcValuation(docIn) {
  const doc = normalize(docIn);
  const s = doc.subject; const p = { ...DEFAULT_PARAMS, ...(doc.val.params || {}) };
  const refYear = refYearOf(doc);
  const landArea = num(s.land.area); const landPrice = num(s.land.price);
  const landTotal = landArea && landPrice ? landArea * landPrice : null;
  const landPy = toPy(landArea);
  const builtYear = yearOf(s.bldg.approved);
  const resid = bldgResidual({ totArea: s.bldg.totArea, builtYear, refYear }, p);
  const avm = doc.val.avm || {};
  const bldgValue = has(avm.bldg) ? num(avm.bldg) : resid ? resid.value : 0;

  // 사례별 계산
  const comps = (doc.comps || []).filter((c) => c && (has(c.price) || c.addr)).map((c, i) => {
    const price = num(c.price); const la = num(c.landArea); const lp = num(c.landPrice);
    const by = yearOf(c.built);
    const r = has(c.bldgValue) ? { value: num(c.bldgValue) } : bldgResidual({ totArea: c.totArea, builtYear: by, refYear }, p);
    const cb = r ? r.value : 0;
    const landUnit = has(c.landUnit) ? num(c.landUnit) : price && la ? Math.max(0, price - cb) / la : null;
    const ratio = landUnit && lp ? landUnit / lp : null;
    const gap = landPrice && lp ? landPrice / lp : null;
    const adjUnit = landUnit && gap ? landUnit * gap : null;
    const distM = haversine(s.lat, s.lon, c.lat, c.lon);
    const dist = c.dist || (distM != null ? `약 ${Math.round(distM / 10) * 10}m (${bearingKo(s.lat, s.lon, c.lat, c.lon)})` : '');
    const months = monthsBetween(c.date, doc.date);
    return {
      ...c, no: i + 1, tag: '사례 ' + String(i + 1).padStart(2, '0'), price, landArea: la, landPrice: lp, bldgCalc: cb, landUnit, ratio, gap, adjUnit,
      age: by ? refYear - by : null, builtYear: by, distM, dist, months,
      similar: !!(la && landArea && la >= landArea * 0.5 && la <= landArea * 2),
      farCalc: has(c.far) ? num(c.far) : null,
    };
  });
  const withRatio = comps.filter((c) => c.ratio); const withAdj = comps.filter((c) => c.adjUnit); const withUnit = comps.filter((c) => c.landUnit);
  const avg = (arr, k) => (arr.length ? arr.reduce((a, c) => a + c[k], 0) / arr.length : null);
  const avgRatio = avg(withRatio, 'ratio'); const avgAdj = avg(withAdj, 'adjUnit'); const avgUnit = avg(withUnit, 'landUnit');
  const sim = withAdj.filter((c) => c.similar); const simAdj = sim.length && sim.length < withAdj.length ? avg(sim, 'adjUnit') : null;
  const top = withRatio.slice().sort((a, b) => b.ratio - a.ratio)[0] || null;
  const minRatio = withRatio.length ? Math.min(...withRatio.map((c) => c.ratio)) : null;
  const maxRatio = withRatio.length ? Math.max(...withRatio.map((c) => c.ratio)) : null;

  const methods = [];
  const push = (key, label, applied, land) => { if (land) methods.push({ key, label, applied, land, total: land + bldgValue }); };
  if (avgRatio && landTotal) push('avgRatio', '평균 배율 적용', pct(avgRatio), landTotal * avgRatio);
  if (avgAdj && landArea) push('avgAdj', '평균 보정단가 적용', manM2(avgAdj) + '원/㎡', avgAdj * landArea);
  if (simAdj && landArea) push('simAdj', `유사 규모(${sim.map((c) => String(c.no).padStart(2, '0')).join('·')}) 보정단가`, manM2(simAdj) + '원/㎡', simAdj * landArea);
  if (top && landArea && withRatio.length > 1) push('max', `최고 사례(${String(top.no).padStart(2, '0')}) 기준`, `${pct(top.ratio)} / ${manM2(top.adjUnit)}원/㎡`, top.adjUnit * landArea);
  if (!methods.length && avgUnit && landArea) push('avgUnit', '평균 토지단가 적용(공시지가 보정 전)', manM2(avgUnit) + '원/㎡', avgUnit * landArea);
  const mAvg = methods.find((m) => m.key === 'avgRatio') || methods.find((m) => m.key === 'avgAdj') || methods[0] || null;
  const mMax = methods.find((m) => m.key === 'max') || null;
  const normal = methods.filter((m) => m.key !== 'max');
  const range = normal.length ? { low: Math.min(...normal.map((m) => m.total)), high: Math.max(...normal.map((m) => m.total)) } : null;

  // 기준 시세: 외부 AVM 값을 넣었으면 그 값, 아니면 거래사례 비교 추정
  let base = null;
  if (has(avm.total)) {
    const land = has(avm.land) ? num(avm.land) : num(avm.total) - bldgValue;
    base = { source: 'avm', label: 'AVM 추정 시세', short: 'AVM 시세', total: num(avm.total), land, bldg: has(avm.bldg) ? num(avm.bldg) : num(avm.total) - land };
  } else if (mAvg) {
    base = { source: 'comps', method: mAvg.key, label: '거래사례 비교 추정 시세', short: '추정 시세', total: mAvg.total, land: mAvg.land, bldg: bldgValue };
  }
  if (base) {
    base.ratio = landTotal ? base.land / landTotal : null;
    base.landShare = base.total ? base.land / base.total : null;
    base.pyUnit = landPy ? base.total / landPy : null;
    base.landM2 = landArea ? base.land / landArea : null;
  }

  // 보유세
  const lt = landHoldTax(landTotal); const bt = bldgHoldTax(doc.val.std.bldgStd, doc.val.std.resourceTax);
  const holdTax = lt ? { land: lt, bldg: bt, total: lt.total + (bt ? bt.total : 0) } : null;

  // 매입 가정·세금
  const buyPrice = has(doc.val.buy.price) ? num(doc.val.buy.price) : base ? base.total : null;
  const acq = acquisition(buyPrice, doc.val.buy);

  // 임대 수익
  const inc = doc.val.income || {}; let income = null;
  if (has(inc.rent) && buyPrice) {
    const rent = num(inc.rent); const mgmt = num(inc.mgmt) || 0; const deposit = num(inc.deposit) || 0; const vac = (num(inc.vacancy) || 0) / 100;
    const egi = (rent + mgmt) * 12 * (1 - vac) + deposit * (num(p.depositYield) || 0);
    const opex = num(inc.opex) || 0; const noi = egi - opex;
    income = { rent, mgmt, deposit, egi, opex, noi, simpleYield: egi / buyPrice, realYield: buyPrice - deposit > 0 ? (rent * 12) / (buyPrice - deposit) : null, capRate: noi / buyPrice };
  }
  // 자금 조달
  let funding = null;
  if (buyPrice && acq) {
    const deposit = income ? income.deposit : num(inc.deposit) || 0;
    const rate = has(doc.val.buy.loanRate) ? num(doc.val.buy.loanRate) : p.loanRate;
    const loanAuto = !has(doc.val.buy.loan);
    const loan = loanAuto ? (income && rate ? Math.min(income.noi / rate, buyPrice * 0.6) : buyPrice * 0.5) : num(doc.val.buy.loan);
    const interest = has(inc.interest) ? num(inc.interest) : loan * rate;
    funding = { price: buyPrice, cost: acq.cost, deposit, loan, loanAuto, rate, interest, equity: buyPrice + acq.cost - deposit - loan, cash: buyPrice + acq.cost };
  }

  // 용적률 여유
  const lim = zoneLimits(s.land.zone, s.sido || s.addr);
  const legalFar = has(s.land.legalFar) ? num(s.land.legalFar) : lim ? lim.far : null;
  const legalBcr = has(s.land.legalBcr) ? num(s.land.legalBcr) : lim ? lim.bcr : null;
  const far = has(s.bldg.far) ? num(s.bldg.far) : has(s.bldg.farArea) && landArea ? (num(s.bldg.farArea) / landArea) * 100 : null;
  const farArea = has(s.bldg.farArea) ? num(s.bldg.farArea) : far && landArea ? (far / 100) * landArea : null;
  const farInfo = legalFar && far != null && landArea ? { legalFar, legalBcr, far, remain: legalFar - far, maxArea: (landArea * legalFar) / 100, times: farArea ? (landArea * legalFar) / 100 / farArea : null, basis: has(s.land.legalFar) ? '' : lim ? lim.basis : '' } : (legalFar ? { legalFar, legalBcr, far, remain: null, maxArea: landArea ? (landArea * legalFar) / 100 : null, times: null, basis: '' } : null);

  // 가격 전략 (입력값이 없으면 제안값)
  const pr = doc.val.pricing || {}; let pricing = null;
  const refAvg = mAvg ? mAvg.total : base ? base.total : null;
  if (refAvg || has(pr.ask)) {
    const sug = refAvg ? {
      ask: roundEok(mMax ? (mMax.total + refAvg) / 2 : refAvg * 1.1),
      targetLow: roundEok(refAvg * 1.03), targetHigh: roundEok(refAvg * 1.07), floor: roundEok(refAvg),
    } : {};
    const v = (k) => (has(pr[k]) ? num(pr[k]) : sug[k] != null ? sug[k] : null);
    const ask = v('ask'); let tl = v('targetLow'); let th = v('targetHigh'); const floor = v('floor');
    if (tl && th && tl > th) [tl, th] = [th, tl];
    if (ask && th && th > ask) th = ask; if (ask && tl && tl > ask) tl = ask;
    const step2 = has(pr.step2) ? num(pr.step2) : ask && th ? Math.floor((ask + th) / 2 / 1e8) * 1e8 : null;
    const ratioOf = (x) => (x && landTotal ? (x - bldgValue) / landTotal : null);
    const pyOf = (x) => (x && landPy ? x / landPy : null);
    const pos = (r) => {
      if (!r || !withRatio.length) return '';
      if (r >= maxRatio * 0.995) return `최고 사례(${top.name || top.addr || top.tag})와 같은 수준`;
      if (avgRatio && Math.abs(r - avgRatio) / avgRatio <= 0.02) return '사례 평균 수준';
      const sorted = withRatio.slice().sort((a, b) => Math.abs(a.ratio - r) - Math.abs(b.ratio - r));
      const near = sorted.filter((c) => Math.abs(c.ratio - r) / r <= 0.04).slice(0, 2).sort((a, b) => a.no - b.no);
      if (near.length) return `사례 ${near.map((c) => String(c.no).padStart(2, '0')).join('·')} 수준`;
      return r > avgRatio ? '사례 상위권' : r < minRatio ? '사례 범위 아래' : '사례 평균 아래';
    };
    pricing = {
      ask, targetLow: tl, targetHigh: th, floor, step2, suggested: { ask: !has(pr.ask), target: !has(pr.targetLow) || !has(pr.targetHigh), floor: !has(pr.floor) },
      cap: mMax ? mMax.total : null,
      adjTarget: ask && tl && th ? [1 - th / ask, 1 - tl / ask] : null, adjFloor: ask && floor ? 1 - floor / ask : null, adjStep2: ask && step2 ? 1 - step2 / ask : null,
      overBase: ask && base ? ask / base.total - 1 : null,
      rows: [
        mMax ? { key: 'cap', label: '사례 상한', price: mMax.total, py: pyOf(mMax.total), ratio: ratioOf(mMax.total), pos: pos(ratioOf(mMax.total)) } : null,
        ask ? { key: 'ask', label: '권장 호가', price: ask, py: pyOf(ask), ratio: ratioOf(ask), pos: pos(ratioOf(ask)) } : null,
        tl && th ? { key: 'target', label: '목표 체결가', price: [tl, th], py: [pyOf(tl), pyOf(th)], ratio: [ratioOf(tl), ratioOf(th)], pos: pos(ratioOf((tl + th) / 2)) } : null,
        floor ? { key: 'floor', label: '하한선', price: floor, py: pyOf(floor), ratio: ratioOf(floor), pos: pos(ratioOf(floor)) } : null,
      ].filter(Boolean),
    };
  }

  return {
    refYear, landArea, landPy, landPrice, landTotal, landTotalPrev: landArea && has(s.land.pricePrev) ? landArea * num(s.land.pricePrev) : null,
    builtYear, age: builtYear ? refYear - builtYear : null, resid, bldgValue, params: p,
    comps, avgRatio, avgAdj, avgUnit, simAdj, top, minRatio, maxRatio, methods, range, base,
    holdTax, buyPrice, acq, income, funding, farInfo, pricing,
  };
}

// ------------------------------------------------------------ IM 계산
export function calcIM(docIn) {
  const doc = normalize(docIn); const s = doc.subject; const im = doc.im;
  const price = num(im.price); const landPy = toPy(s.land.area); const totPy = toPy(s.bldg.totArea);
  const rows = (im.rentRoll || []).filter((r) => r && (r.floor || r.tenant || has(r.area)));
  const sum = (k) => rows.reduce((a, r) => a + (num(r[k]) || 0), 0);
  // 공실은 '공실'이라고 적힌 줄만 셉니다. 임대 정보가 하나도 없으면(층별 현황만 가져온 상태) 공실률은 알 수 없음으로 둡니다.
  const isVacant = (r) => /공실/.test(String(r.tenant || ''));
  const leasable = rows.filter((r) => !/주차|기계실|공용/.test(String(r.tenant || '')));
  const known = leasable.some((r) => isVacant(r) || has(r.rent) || has(r.deposit));
  const areaAll = known ? leasable.reduce((a, r) => a + (num(r.area) || 0), 0) : 0;
  const areaVac = leasable.filter(isVacant).reduce((a, r) => a + (num(r.area) || 0), 0);
  const rentM = sum('rent') * 1e4; const mgmtM = sum('mgmt') * 1e4; const depM = sum('deposit') * 1e4; // Rent Roll은 만원 단위 입력
  const annual = rentM * 12;
  return {
    price, landPy, totPy,
    landPyUnit: price && landPy ? price / landPy : null, totPyUnit: price && totPy ? price / totPy : null,
    rows, areaSum: sum('area'), depositSum: depM, rentSum: rentM, mgmtSum: mgmtM, annual,
    yield: price && annual ? annual / (price - depM > 0 ? price - depM : price) : null,
    vacancy: areaAll ? areaVac / areaAll : null,
    builtYear: yearOf(s.bldg.approved), age: yearOf(s.bldg.approved) ? refYearOf(doc) - yearOf(s.bldg.approved) : null,
    farInfo: calcValuation(doc).farInfo,
  };
}

// ------------------------------------------------------------ 문장 초안 (데이터에서 나오는 사실만)
const j = (arr, sep = ' ') => arr.filter(Boolean).join(sep);
const scaleText = (b) => j([has(b.under) && num(b.under) > 0 ? `B${num(b.under)}` : '', has(b.ground) ? `${num(b.ground)}F` : ''], ' / ');
export function scaleKo(b) { return j([has(b.under) && num(b.under) > 0 ? `지하 ${num(b.under)}층` : '', has(b.ground) ? `지상 ${num(b.ground)}층` : ''], ' / '); }
export const scaleShort = scaleText;

export function draftValuation(docIn, calcIn) {
  const doc = normalize(docIn); const c = calcIn || calcValuation(doc); const s = doc.subject; const t = {};
  const b = c.base; const name = b ? b.short : '시세';
  // 시세 분석
  if (b) {
    const parts = [];
    if (c.age != null && b.landShare >= 0.85) parts.push(`준공 ${c.age}년차로 건물 잔존가치가 낮아 **가격은 사실상 토지로 결정되는 구조.**`);
    else if (c.age != null) parts.push(`준공 ${c.age}년차 건물로, 시세에서 건물가액이 ${pct(1 - b.landShare, 0)}를 차지.`);
    if (b.ratio && c.avgRatio) {
      const d = b.ratio / c.avgRatio - 1;
      if (b.source === 'avm') parts.push(`${name}의 토지 배율 ${pct(b.ratio)}는 인근 거래사례 평균(${pct(c.avgRatio)})${Math.abs(d) <= 0.03 ? '과 거의 같아 **사례 평균 수준의 평가**로 판단.' : d > 0 ? `보다 ${pct(d, 1)} 높은 수준.` : `보다 ${pct(-d, 1)} 낮아 **사례 대비 보수적인 평가**로 판단.`}`);
      else parts.push(`인근 거래사례 ${c.comps.filter((x) => x.ratio).length}건의 공시지가 대비 배율 평균 ${pct(c.avgRatio)}를 대상 토지에 적용해 산정.`);
    } else if (b.method === 'avgUnit' && c.avgUnit) {
      parts.push(`인근 거래사례 ${c.comps.filter((x) => x.landUnit).length}건의 토지단가 평균(㎡당 ${manM2(c.avgUnit)}원)을 적용한 값으로, 사례별 개별공시지가를 넣으면 공시지가 격차를 반영해 다시 계산됨.`);
    }
    t.analysis = parts.join(' ');
  }
  // 사례 결론
  if (c.range) {
    const parts = [];
    const lo = eok(c.range.low, 1, true); const hi = eok(c.range.high, 1, true);
    const rangeTxt = lo === hi ? `약 ${hi}원` : `약 ${lo.replace('억', '')}~${hi}원`;
    if (b && b.source === 'avm') {
      const d1 = Math.abs(c.range.low / b.total - 1); const d2 = Math.abs(c.range.high / b.total - 1);
      const dl = Math.round(Math.min(d1, d2) * 100); const dh = Math.round(Math.max(d1, d2) * 100);
      parts.push(`사례 평균 기준 시세는 **${rangeTxt}**으로 AVM 시세(${eokF(b.total)}원)와 ${dl === dh ? dl : dl + '~' + dh}% 차이.`);
    } else parts.push(`사례 평균 기준 시세는 **${rangeTxt}** 수준.`);
    const mx = c.methods.find((m) => m.key === 'max');
    if (mx) parts.push(`최고 사례 기준으로는 **약 ${eok(mx.total)}원**까지 근거 제시 가능.`);
    const big = c.comps.filter((x) => x.landArea && c.landArea && x.landArea > c.landArea * 2); const old = c.comps.filter((x) => x.months != null && x.months > 12);
    const cav = [];
    if (big.length) cav.push(`사례 ${big.map((x) => String(x.no).padStart(2, '0')).join('·')}는 대상보다 대지가 2배 이상 큰 물건`);
    if (old.length) cav.push(`사례 ${old.map((x) => String(x.no).padStart(2, '0')).join('·')}는 1년 이상 지난 거래`);
    if (cav.length) parts.push(`단, ${cav.join('이고 ')}라는 한계 있음.`);
    t.conclusion = parts.join(' ');
  }
  // 체크포인트
  {
    const parts = []; const o = s.owner || {};
    if (num(o.count) > 1) parts.push(`**공유자 ${num(o.count)}명** 소유 물건으로, 매각 시 공유자 전원의 매도 의사와 대리 권한 정리가 선행되어야 함.`);
    if (/토지거래/.test(j([s.land.zone2, s.land.etc, s.land.permit]))) parts.push('**토지거래허가구역**에 해당하여 매수자의 실수요 요건과 허가 절차를 매매 일정에 반영 필요.');
    if (c.farInfo && c.farInfo.remain != null && c.farInfo.remain >= 20) parts.push(`현재 용적률 ${comma(c.farInfo.far, 2)}%로 법정 ${comma(c.farInfo.legalFar)}% 대비 여유가 커서 신축 시 연면적 확대 여지 있음.`);
    if (/위반/.test(String(s.bldg.remodel || ''))) parts.push('건축물대장상 위반건축물 표시 여부와 해소 방안 확인 필요.');
    t.checkpoint = parts.join(' ');
  }
  // 세금·투자 주석
  if (c.buyPrice) {
    const parts = [`세액·수익률은 ${has(doc.val.buy.price) ? '가정 매입가' : name}(${eokF(c.buyPrice)}원)${c.income ? '와 입력한 임대 조건' : ''}을 기준으로 산출한 참고값. 실제 Rent Roll과 매수자의 세무 조건, 대출 조건에 따라 달라짐.`];
    if (c.income && c.income.simpleYield < 0.03) parts.push(`수익률이 ${Math.floor(c.income.simpleYield * 100)}%대이므로 매수 타깃은 수익형보다 **사옥·신축 개발 수요**가 적합.`);
    t.note = parts.join(' ');
  }
  // 가격 전략
  const p = c.pricing;
  if (p && p.ask) {
    if (p.adjTarget) t.negotiation = `${eok(p.ask)}원에서 목표가까지 **${pct(p.adjTarget[0], 1).replace('%', '')}~${pct(p.adjTarget[1], 1)}**${p.adjFloor != null ? `, 하한까지 **${pct(p.adjFloor, 1)}**` : ''} 조정 여유. 매수자에게 가격 양보 명분을 주면서 목표가 방어 가능.`;
    const ar = p.rows.find((r) => r.key === 'ask');
    if (ar && ar.ratio && c.minRatio) {
      const inRange = ar.ratio <= c.maxRatio && ar.ratio >= c.minRatio;
      t.logic = `토지 배율 ${pct(ar.ratio, 0)}는 사례 범위(${pct(c.minRatio).replace('%', '')}~${pct(c.maxRatio)}) ${inRange ? '안' : ar.ratio > c.maxRatio ? '위' : '아래'}. ${inRange ? `"비싸다"는 반론에 **${s.dong || '인근'} 상위 거래 수준**으로 대응 가능.` : '사례 범위를 벗어나므로 호가 근거를 별도로 준비해야 함.'}`;
    }
    if (c.farInfo && c.farInfo.remain != null && c.farInfo.remain >= 20) t.story = `법정 용적률 ${comma(c.farInfo.legalFar)}% 대비 현재 ${comma(c.farInfo.far, 2)}%로, 신축 시 지상 연면적 **약 ${comma(c.farInfo.times, 1)}배**까지 확대 여지. 사옥·개발 수요 대상 핵심 매각 포인트.`;
    const parts = [];
    if (p.overBase != null && c.base) parts.push(`호가 ${eok(p.ask)}원은 ${c.base.short}(${eokF(c.base.total)}원)보다 약 ${Math.round(p.overBase * 100)}% ${p.overBase >= 0 ? '높음' : '낮음'}.`);
    if (c.maxRatio) parts.push(`**매수자 측도 같은 거래사례를 조회할 수 있어** 거래사례 배율(최고 ${pct(c.maxRatio)})${t.story ? '과 신축 개발 가치' : ''}를 근거로 함께 제시해야 함.`);
    if (p.floor) parts.push(`매도인과 하한 ${eok(p.floor)}원을 사전 합의${num(s.owner.count) > 1 ? `하고, 공유자 ${num(s.owner.count)}명 전원의 매도 동의를 먼저 정리하는 것을 권함.` : '하는 것을 권함.'}`);
    t.risk = parts.join(' ');
  }
  return t;
}
export function valuationSubs(docIn, calcIn) {
  const doc = normalize(docIn); const c = calcIn || calcValuation(doc); const b = c.base; const p = c.pricing; const out = {};
  out.summary = doc.subject.headline || j([doc.subject.dong, doc.subject.bldg.use]);
  if (b && b.landShare) out.valuation = `토지가액이 시세의 ${pct(b.landShare, 0)} 차지`;
  if (c.avgRatio) out.comps = `사례 평균 배율 ${pct(c.avgRatio)}${b && b.source === 'avm' && b.ratio && Math.abs(b.ratio / c.avgRatio - 1) <= 0.03 ? ', AVM 시세와 부합' : ''}`;
  const ds = c.comps.map((x) => x.distM).filter((x) => x != null);
  out.map = ds.length && ds.length === c.comps.length ? `${c.comps.length}건 모두 반경 약 ${Math.ceil(Math.max(...ds) / 50) * 50}m 내` : `거래사례 ${c.comps.length}건`;
  if (c.farInfo && c.farInfo.remain != null) out.property = `법정 용적률 대비 잔여 ${comma(c.farInfo.remain, 2)}%p`;
  if (c.buyPrice) out.tax = `${has(doc.val.buy.price) ? '가정 매입가' : b ? b.short : '시세'} ${eokF(c.buyPrice)}원 매입 기준`;
  if (p && p.ask) out.pricing = `권장 호가 ${eok(p.ask)}원${p.targetLow && p.targetHigh ? `, 목표 체결 ${eok(p.targetLow).replace('억', '')}~${eok(p.targetHigh)}원` : ''}`;
  return out;
}

export function draftIM(docIn) {
  const doc = normalize(docIn); const s = doc.subject; const c = calcIM(doc); const im = doc.im; const out = {};
  const b = s.bldg; const l = s.land;
  const isNew = c.age != null && c.age <= 5;
  // 투자 포인트 (사실만)
  const hl = [];
  const st = (s.stations || []).filter((x) => x && x.name).slice(0, 2);
  if (st.length) hl.push({ tag: 'LOCATION', title: `${st.map((x) => x.name + (/역$/.test(x.name) ? '' : '역')).join(' · ')} 인접`, body: st.map((x) => `${x.name}${x.line ? `(${x.line})` : ''} 직선 약 ${Math.round(num(x.dist) / 10) * 10}m`).join(', ') });
  if (c.builtYear) hl.push({ tag: 'PHYSICAL', title: j([`${c.builtYear}년 ${isNew ? '신축' : '사용승인'}`, scaleKo(b) || b.use], ' · '), body: j([`**${dateDot(b.approved)} 사용승인**`, has(b.totArea) ? `연면적 ${comma(toPy(b.totArea), 2)}평` : '', b.elevator ? `승강기 ${b.elevator}` : '', b.parking ? `주차 ${b.parking}` : ''], ', ') });
  if (l.zone || has(l.area)) hl.push({ tag: 'LAND', title: j([l.zone, has(l.area) ? `대지 ${comma(toPy(l.area), 2)}평` : ''], ' · '), body: j([l.road ? `도로접면 ${l.road}` : '', l.shape ? `형상 ${l.shape}` : '', l.terrain ? `지세 ${l.terrain}` : ''], ', ') });
  if (c.farInfo && c.farInfo.remain != null && c.farInfo.remain >= 20) hl.push({ tag: 'UPSIDE', title: `용적률 여유 ${comma(c.farInfo.remain, 0)}%p`, body: `법정 ${comma(c.farInfo.legalFar)}% 대비 현재 ${comma(c.farInfo.far, 2)}% (건축사 사전검토 필요)` });
  else if (c.vacancy === 1) hl.push({ tag: 'SPACE', title: '전체 공실 · 즉시 사용 가능', body: '사옥 사용 또는 단일 임차인 통임대 유치 가능' });
  out.highlights = hl.slice(0, 4);
  // 토지이용계획 표
  const lr = [];
  if (l.zone) lr.push({ k: '용도지역 · 지구', v: j([l.zone, l.zone2], ', ') });
  if (l.etc) lr.push({ k: '기타 지역 · 지구', v: l.etc });
  if (l.permit) lr.push({ k: '토지거래허가', v: l.permit });
  const lim = zoneLimits(l.zone, s.sido || s.addr); const lb = has(l.legalBcr) ? num(l.legalBcr) : lim && lim.bcr; const lf = has(l.legalFar) ? num(l.legalFar) : lim && lim.far;
  if (lb && lf) lr.push({ k: '법정 건폐율 · 용적률', v: `${lb}% · ${lf}%${!has(l.legalFar) && lim ? ` (${lim.basis})` : ''}` });
  out.landUseRows = lr;
  // 위치·교통
  out.location = st.length ? [{ tag: 'SUBWAY', title: (s.stations || []).slice(0, 3).map((x) => `${x.line ? x.line + ' ' : ''}${x.name}`).join(' · '), body: (s.stations || []).slice(0, 3).map((x) => `${x.name} 직선 약 ${Math.round(num(x.dist) / 10) * 10}m`).join(', ') }] : [];
  // Rent Roll (층별 현황에서 층·용도·면적만)
  out.rentRoll = (s.floors || []).filter((f) => f && (f.floor || has(f.area))).map((f) => ({ floor: String(f.floor || '').replace(/지하\s*(\d+)층?/, 'B$1').replace(/(\d+)층/, '$1F'), tenant: f.use || '', area: has(f.area) ? Number((num(f.area) / PY).toFixed(2)) : null, deposit: null, rent: null, mgmt: null, expire: '' }));
  // 임대 현황 문구
  out.leaseStatus = c.rows.length ? (c.vacancy === 1 ? '전체 공실' : c.vacancy === 0 ? '전 층 임대 중' : c.vacancy != null ? `공실률 ${pct(c.vacancy, 0)}` : '') : '';
  // 핵심 문구
  out.keyTitle = j([c.builtYear ? `${c.builtYear}년 ${isNew ? '신축' : '준공'}` : '', b.use], ' ');
  out.keyBody = j([has(l.area) ? `대지 ${comma(toPy(l.area), 2)}평` : '', has(b.totArea) ? `연면적 ${comma(toPy(b.totArea), 2)}평` : '', scaleKo(b)], ' · ');
  return out;
}
export function imSubs(docIn) {
  const doc = normalize(docIn); const s = doc.subject; const c = calcIM(doc); const im = doc.im; const out = {};
  const isNew = c.age != null && c.age <= 5;
  out.summary = j([c.builtYear ? `${c.builtYear}년 ${isNew ? '신축' : '준공'}` : '', s.bldg.use ? String(s.bldg.use).replace(/^제\d종/, '') : '', c.price ? `매각가 ${eok(c.price)} 원` : ''], ' ').replace(/(\S) 매각가/, '$1, 매각가');
  out.property = j([has(s.land.area) ? `대지 ${comma(toPy(s.land.area), 2)}평` : '', has(s.bldg.totArea) ? `연면적 ${comma(toPy(s.bldg.totArea), 2)}평` : ''], ' · ');
  out.rentRoll = im.leaseStatus ? j([im.leaseStatus, im.leaseNote], ', ') : '';
  out.process = 'CA → LOI → 매매계약, 3단계 진행';
  out.photos = '';
  return out;
}

/** 리포트 제목 기본값 */
export function defaultTitle(docIn) {
  const doc = normalize(docIn); const s = doc.subject;
  const where = s.name || j([s.dong, s.jibun]) || s.addr || '';
  return doc.kind === 'im' ? j([where, '매각 투자안내서']) : j([where, '매각 가격 검토']);
}
