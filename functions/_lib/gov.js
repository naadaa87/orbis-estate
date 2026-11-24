/**
 * 공공데이터 조회 공통 모듈 (라우트 아님 — 다른 Functions가 불러 씁니다)
 *
 *  - 법정동코드: /data/bjd.txt (행정표준코드 법정동, 2024.8.1 기준) → 주소 글자에서 PNU(필지고유번호) 만들기
 *  - 건축물대장: 국토교통부 건축HUB 건축물대장정보 (공공데이터포털, DATA_GO_KR_KEY)
 *  - 실거래가  : 국토교통부 상업업무용·단독다가구·토지 매매 실거래가 (공공데이터포털, DATA_GO_KR_KEY)
 *  - 브이월드  : 토지특성·개별공시지가·연속지적도·지도 이미지 (VWORLD_KEY) — 관리자 화면이 이 서버를 거쳐 부릅니다
 *
 * 키가 없으면 code:'NO_KEY'를 돌려주고, 화면은 직접 입력 방식으로 계속 쓸 수 있습니다.
 */

export const json = (obj, status = 200, cacheControl = 'no-store') =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cacheControl } });

export function sameOrigin(request) {
  const host = new URL(request.url).host;
  if (request.headers.get('Sec-Fetch-Site') === 'same-origin') return true;
  for (const h of ['Origin', 'Referer']) {
    const v = request.headers.get(h);
    if (v) { try { if (new URL(v).host === host) return true; } catch (e) {} }
  }
  return false;
}
export const str = (v) => (v == null ? '' : String(v).trim());
export const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/,/g, '').trim()); return isFinite(n) ? n : null; };
const pad2 = (v) => String(parseInt(v, 10) || 0).padStart(2, '0');
export const keyParam = (k) => (/%[0-9A-Fa-f]{2}/.test(k) ? k : encodeURIComponent(k));

export async function fetchT(url, ms = 9000, headers = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ORBIS-Desk/1.0)', Accept: 'application/json, application/xml;q=0.9, */*;q=0.8', ...headers } });
  } finally { clearTimeout(t); }
}

/* ---------------------------------------------------------------- 공공데이터포털 응답 해석 */
const REASONS = {
  1: ['UPSTREAM', '제공기관 서비스 오류'], 10: ['BAD_PARAM', '요청 값 오류'], 12: ['NO_SERVICE', '해당 오픈API 서비스가 없거나 폐기됨'],
  20: ['DENIED', '이 API의 활용 신청이 승인되지 않았습니다(공공데이터포털에서 활용 신청 필요)'],
  22: ['LIMIT', '일일 호출 한도 초과'], 30: ['AUTH', '등록되지 않은 인증키(발급 직후라면 활성화까지 1~2시간 기다려 주세요)'],
  31: ['EXPIRED', '활용 기간 만료'], 32: ['IP', '등록되지 않은 IP'], 99: ['UPSTREAM', '알 수 없는 오류'],
};
function gatewayError(text, status) {
  const code = (text.match(/<returnReasonCode>\s*(\d+)\s*</) || [])[1];
  const auth = (text.match(/<returnAuthMsg>\s*([^<]+)</) || [])[1];
  if (code || auth) {
    const m = REASONS[parseInt(code, 10)] || ['UPSTREAM', auth || '제공기관 오류'];
    return { ok: false, code: m[0], message: m[1], detail: (auth || '').trim() };
  }
  if (status === 401 || status === 403) return { ok: false, code: 'AUTH', message: '인증키 확인이 필요합니다.', detail: text.slice(0, 120) };
  if (status === 429) return { ok: false, code: 'LIMIT', message: '일일 호출 한도 초과', detail: '' };
  return null;
}
function xmlItems(text) {
  const out = []; const re = /<item>([\s\S]*?)<\/item>/g; let m;
  while ((m = re.exec(text))) {
    const o = {}; const fr = /<(\w+)>([^<]*)<\/\1>/g; let f;
    while ((f = fr.exec(m[1]))) o[f[1]] = f[2].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    out.push(o);
  }
  return out;
}
export function parseDataGoKr(text, status) {
  const t = (text || '').trim();
  const g = gatewayError(t, status);
  if (g) return g;
  if (!t) return { ok: false, code: 'UPSTREAM', message: '빈 응답', detail: String(status) };
  if (t[0] === '<') {
    const rc = (t.match(/<resultCode>\s*([^<]+)</) || [])[1] || '';
    const rm = (t.match(/<resultMsg>\s*([^<]+)</) || [])[1] || '';
    if (rc === '03') return { ok: true, items: [], total: 0 };
    if (rc && rc !== '00' && rc !== '000') return { ok: false, code: 'UPSTREAM', message: rm || '제공기관 오류', detail: rc };
    return { ok: true, items: xmlItems(t), total: parseInt((t.match(/<totalCount>\s*(\d+)/) || [])[1] || '0', 10) };
  }
  let j;
  try { j = JSON.parse(t); } catch (e) { return { ok: false, code: 'UPSTREAM', message: '응답 형식 오류', detail: t.slice(0, 120) }; }
  const header = j.header || (j.response && j.response.header) || {};
  const body = j.body || (j.response && j.response.body) || {};
  const rc = str(header.resultCode);
  if (rc === '03') return { ok: true, items: [], total: 0 };
  if (rc && rc !== '00' && rc !== '000') return { ok: false, code: 'UPSTREAM', message: str(header.resultMsg) || '제공기관 오류', detail: rc };
  let items = body.items;
  if (items && !Array.isArray(items)) items = items.item;
  if (items && !Array.isArray(items)) items = [items];
  return { ok: true, items: items || [], total: parseInt(body.totalCount, 10) || (items ? items.length : 0) };
}

/* ---------------------------------------------------------------- 법정동코드 · 주소 → PNU */
let BJD = null;
const SIDO_ALIAS = { 서울: '서울특별시', 서울시: '서울특별시', 부산: '부산광역시', 부산시: '부산광역시', 대구: '대구광역시', 대구시: '대구광역시', 인천: '인천광역시', 인천시: '인천광역시', 광주: '광주광역시', 대전: '대전광역시', 대전시: '대전광역시', 울산: '울산광역시', 울산시: '울산광역시', 세종: '세종특별자치시', 세종시: '세종특별자치시', 경기: '경기도', 강원: '강원특별자치도', 강원도: '강원특별자치도', 충북: '충청북도', 충남: '충청남도', 전북: '전북특별자치도', 전라북도: '전북특별자치도', 전남: '전라남도', 경북: '경상북도', 경남: '경상남도', 제주: '제주특별자치도', 제주도: '제주특별자치도' };

export async function loadBjd(env, request) {
  if (BJD) return BJD;
  const res = await env.ASSETS.fetch(new Request(new URL('/data/bjd.txt', request.url).toString()));
  if (!res.ok) throw new Error('법정동코드 파일을 읽지 못했습니다.');
  const text = await res.text();
  const rows = []; const byLast = new Map();
  for (const line of text.split('\n')) {
    const i = line.indexOf('\t'); if (i !== 10) continue;
    const code = line.slice(0, 10); const name = line.slice(11).trim();
    if (code.slice(5) === '00000') continue; // 시도·시군구 단위는 필지 조회 대상이 아님
    const parts = name.split(' ');
    const row = { code, name, parts };
    rows.push(row);
    const last = parts[parts.length - 1];
    if (!byLast.has(last)) byLast.set(last, []);
    byLast.get(last).push(row);
  }
  BJD = { rows, byLast };
  return BJD;
}

export function makePnu(bjd, san, bun, ji) {
  return `${bjd}${san ? '2' : '1'}${String(parseInt(bun, 10) || 0).padStart(4, '0')}${String(parseInt(ji, 10) || 0).padStart(4, '0')}`;
}
export function splitPnu(pnu) {
  const p = String(pnu || '').replace(/\D/g, '');
  if (p.length !== 19) return null;
  return { bjd: p.slice(0, 10), sgg5: p.slice(0, 5), dong5: p.slice(5, 10), san: p[10] === '2', bun: p.slice(11, 15), ji: p.slice(15, 19) };
}

/** "서울 강남구 역삼동 659-10" 같은 지번 주소를 필지 후보로 바꿉니다. 도로명 주소는 여기서 풀지 못합니다(브이월드 검색 사용). */
export async function parseJibunAddress(env, request, q) {
  const s = str(q).replace(/[(),]/g, ' ').replace(/\s+/g, ' ').replace(/번지$/, '').trim();
  const m = s.match(/^(.*?)(?:\s+|^)(산\s*)?(\d{1,4})(?:\s*-\s*(\d{1,4}))?(?:\s*번지)?(?:\s+.*)?$/);
  if (!m) return [];
  const region = m[1].trim(); if (!region) return [];
  const san = !!m[2]; const bun = m[3]; const ji = m[4] || '0';
  let tokens = region.split(' ').filter(Boolean).map((t) => SIDO_ALIAS[t] || t);
  const last = tokens[tokens.length - 1];
  if (!/(동|리|가|읍|면|로)$/.test(last) && !/\d가$/.test(last)) return [];
  const { byLast } = await loadBjd(env, request);
  const cands = byLast.get(last) || [];
  const others = tokens.slice(0, -1);
  const scored = [];
  for (const r of cands) {
    let score = 0; let ok = true;
    for (const t of others) {
      if (r.parts.slice(0, -1).some((p) => p === t || p.startsWith(t) || (t.length >= 2 && p.includes(t)))) score += 2; else { ok = false; break; }
    }
    if (!ok) continue;
    if (r.name.startsWith('서울특별시')) score += 0.5; else if (r.name.startsWith('경기도') || r.name.startsWith('인천광역시')) score += 0.2;
    scored.push({ r, score });
  }
  scored.sort((a, b) => b.score - a.score || a.r.code.localeCompare(b.r.code));
  return scored.slice(0, 8).map(({ r }) => {
    const jibun = `${san ? '산 ' : ''}${parseInt(bun, 10)}${parseInt(ji, 10) ? '-' + parseInt(ji, 10) : ''}`;
    const sido = r.parts[0]; const dong = r.parts.slice(-1)[0];
    const sgg = r.parts.slice(1, -1).join(' ');
    return { label: `${r.name} ${jibun}`, addr: `${r.name} ${jibun}`, road: '', sido, sgg, dong, jibun, san, pnu: makePnu(r.code, san, bun, ji), bjd: r.code, lat: null, lon: null, source: '법정동코드' };
  });
}
export async function bjdName(env, request, code) {
  const { rows } = await loadBjd(env, request);
  const r = rows.find((x) => x.code === code);
  return r ? r.name : '';
}

/* ---------------------------------------------------------------- 건축물대장 (건축HUB) */
const BLD = 'https://apis.data.go.kr/1613000/BldRgstHubService';
async function bldCall(key, op, p, rows = 100) {
  const url = `${BLD}/${op}?serviceKey=${keyParam(key)}&sigunguCd=${p.sgg5}&bjdongCd=${p.dong5}&platGbCd=${p.san ? 1 : 0}&bun=${p.bun}&ji=${p.ji}&numOfRows=${rows}&pageNo=1&_type=json`;
  try {
    const res = await fetchT(url, 9000);
    return parseDataGoKr(await res.text(), res.status);
  } catch (e) { return { ok: false, code: 'UPSTREAM_TIMEOUT', message: '건축물대장 응답 지연' }; }
}
const ymd = (v) => { const s = str(v).replace(/\D/g, ''); return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : (s.length === 6 ? `${s.slice(0, 4)}-${s.slice(4, 6)}` : ''); };

export async function building(env, pnu) {
  const key = str(env.DATA_GO_KR_KEY);
  if (!key) return { ok: false, code: 'NO_KEY', message: '건축물대장 연결 키(DATA_GO_KR_KEY)가 아직 등록되지 않았습니다. 건물 정보는 직접 입력해 주세요.' };
  const p = splitPnu(pnu);
  if (!p) return { ok: false, code: 'BAD_INPUT', message: '필지 번호가 올바르지 않습니다.' };
  const [title, recap, flr] = await Promise.all([bldCall(key, 'getBrTitleInfo', p, 50), bldCall(key, 'getBrRecapTitleInfo', p, 10), bldCall(key, 'getBrFlrOulnInfo', p, 200)]);
  if (!title.ok) return title;
  const warnings = [];
  if (!title.items.length) return { ok: true, bldg: null, floors: [], buildings: 0, warnings: ['이 지번으로 등록된 건축물대장(표제부)이 없습니다. 나대지이거나 다른 지번에 올라 있을 수 있습니다.'] };
  const mains = title.items.slice().sort((a, b) => (num(b.totArea) || 0) - (num(a.totArea) || 0));
  const t = mains.find((x) => /주건축물/.test(str(x.mainAtchGbCdNm))) || mains[0];
  const r = recap.ok && recap.items[0] ? recap.items[0] : null;
  if (title.items.length > 1) warnings.push(`이 지번에 건축물대장이 ${title.items.length}동 있습니다. 가장 큰 주건축물 기준으로 채웠고, 면적 합계는 총괄표제부가 있으면 그 값을 썼습니다.`);
  const pick = (k) => (r && num(r[k]) ? num(r[k]) : num(t[k]));
  const park = { indoor: (num(t.indrAutoUtcnt) || 0), outdoor: (num(t.oudrAutoUtcnt) || 0), mech: (num(t.indrMechUtcnt) || 0) + (num(t.oudrMechUtcnt) || 0) };
  park.total = r && num(r.totPkngCnt) ? num(r.totPkngCnt) : park.indoor + park.outdoor + park.mech;
  const bldg = {
    name: str(t.bldNm), platArea: pick('platArea'), archArea: pick('archArea'), totArea: pick('totArea'), farArea: pick('vlRatEstmTotArea'),
    bcr: pick('bcRat'), far: pick('vlRat'), use: str(t.mainPurpsCdNm), etcUse: str(t.etcPurps), structure: str(t.strctCdNm) || str(t.etcStrct), roof: str(t.roofCdNm) || str(t.etcRoof),
    ground: num(t.grndFlrCnt), under: num(t.ugrndFlrCnt), height: num(t.heit), elevator: (num(t.rideUseElvtCnt) || 0) + (num(t.emgenUseElvtCnt) || 0),
    parking: park, approved: ymd(t.useAprDay), units: { hhld: num(t.hhldCnt) || 0, fmly: num(t.fmlyCnt) || 0, ho: num(t.hoCnt) || 0 },
    road: str(t.newPlatPlc), violation: null,
  };
  let floors = [];
  if (flr.ok) {
    const pk = str(t.mgmBldrgstPk);
    const mine = flr.items.filter((f) => !pk || str(f.mgmBldrgstPk) === pk);
    floors = (mine.length ? mine : flr.items).map((f) => ({
      gb: /지하/.test(str(f.flrGbCdNm)) ? '지하' : (/옥탑/.test(str(f.flrGbCdNm)) ? '옥탑' : '지상'), no: num(f.flrNo) || 0,
      label: str(f.flrNoNm) || `${/지하/.test(str(f.flrGbCdNm)) ? '지하 ' : ''}${num(f.flrNo) || ''}층`,
      use: str(f.mainPurpsCdNm), etc: str(f.etcPurps), structure: str(f.strctCdNm) || str(f.etcStrct), area: num(f.area),
    }));
    const rank = (f) => (f.gb === '옥탑' ? 1000 + f.no : f.gb === '지상' ? f.no : -f.no);
    floors.sort((a, b) => rank(b) - rank(a));
  }
  return { ok: true, bldg, floors, buildings: title.items.length, warnings, source: '국토교통부 건축물대장(건축HUB)' };
}

/* ---------------------------------------------------------------- 실거래가 */
const RTMS = {
  nrg: ['https://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade', '상업업무용'],
  sh: ['https://apis.data.go.kr/1613000/RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade', '단독·다가구'],
  land: ['https://apis.data.go.kr/1613000/RTMSDataSvcLandTrade/getRTMSDataSvcLandTrade', '토지'],
};
export function monthList(n) {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  let y = now.getUTCFullYear(); let m = now.getUTCMonth() + 1; const out = [];
  for (let i = 0; i < n; i++) { out.push(String(y) + pad2(m)); m--; if (m === 0) { m = 12; y--; } }
  return out;
}
async function rtmsMonth(context, kind, key, lawd, ym, recent) {
  const cache = caches.default;
  const cacheKey = new Request(new URL(`/__cache/desk/rtms?k=${kind}&lawd=${lawd}&ym=${ym}&v=1`, context.request.url).toString());
  try { const hit = await cache.match(cacheKey); if (hit) return await hit.json(); } catch (e) {}
  let all = []; let page = 1; let total = 0;
  try {
    do {
      const url = `${RTMS[kind][0]}?serviceKey=${keyParam(key)}&LAWD_CD=${lawd}&DEAL_YMD=${ym}&numOfRows=1000&pageNo=${page}&_type=json`;
      const res = await fetchT(url, 9000);
      const parsed = parseDataGoKr(await res.text(), res.status);
      if (!parsed.ok) return parsed;
      all = all.concat(parsed.items); total = parsed.total; page++;
    } while (all.length < total && page <= 3);
  } catch (e) { return { ok: false, code: 'UPSTREAM_TIMEOUT', message: '공공데이터포털 응답 지연' }; }
  const deals = [];
  for (const d of all) {
    if (str(d.cdealType).toUpperCase() === 'O') continue; // 해제된 거래
    const amt = num(d.dealAmount); if (!amt) continue;
    deals.push({
      ym: `${str(d.dealYear) || ym.slice(0, 4)}-${pad2(d.dealMonth || ym.slice(4))}`, day: parseInt(d.dealDay, 10) || 0,
      dong: str(d.umdNm), jibun: str(d.jibun),
      type: kind === 'nrg' ? str(d.buildingType) : RTMS[kind][1], use: str(d.buildingUse) || str(d.houseType) || str(d.jimok), zone: str(d.landUse),
      floor: str(d.floor), amt: Math.round(amt * 10000), bldAr: num(d.buildingAr) ?? num(d.totalFloorAr), plotAr: num(d.plottageAr) ?? num(d.dealArea),
      built: parseInt(d.buildYear, 10) || null, share: !!str(d.shareDealingType), dealing: str(d.dealingGbn), kind,
    });
  }
  const out = { ok: true, deals };
  const ttl = recent ? 12 * 3600 : 14 * 24 * 3600;
  try { context.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttl}` } }))); } catch (e) {}
  return out;
}
/** 시군구 단위 매매 실거래. kinds: nrg(상업업무용)·sh(단독다가구)·land(토지) */
export async function deals(context, { lawd, months = 24, kinds = ['nrg'], dong = '', wholeOnly = true }) {
  const key = str(context.env.DATA_GO_KR_KEY);
  if (!key) return { ok: false, code: 'NO_KEY', message: '실거래가 연결 키(DATA_GO_KR_KEY)가 아직 등록되지 않았습니다. 거래사례는 직접 입력해 주세요.' };
  if (!/^\d{5}$/.test(lawd)) return { ok: false, code: 'BAD_INPUT', message: '시군구 코드가 올바르지 않습니다.' };
  kinds = kinds.filter((k) => RTMS[k]); if (!kinds.length) kinds = ['nrg'];
  months = Math.min(Math.max(months, 1), kinds.length > 1 ? 18 : 36);
  const yms = monthList(months);
  const jobs = []; for (const k of kinds) yms.forEach((ym, i) => jobs.push([k, ym, i < 2]));
  const results = await Promise.all(jobs.map(([k, ym, recent]) => rtmsMonth(context, k, key, lawd, ym, recent)));
  let list = []; let firstErr = null; let failed = 0;
  results.forEach((r) => { if (!r.ok) { failed++; if (!firstErr && r.code !== 'UPSTREAM_TIMEOUT') firstErr = r; return; } list = list.concat(r.deals); });
  if (failed === results.length) { const e = firstErr || { code: 'UPSTREAM', message: '실거래 데이터를 불러오지 못했습니다.' }; return { ok: false, code: e.code, message: e.message, detail: e.detail || '' }; }
  if (wholeOnly) list = list.filter((d) => d.kind !== 'nrg' || d.type !== '집합');
  if (dong) list = list.filter((d) => d.dong === dong);
  list.sort((a, b) => (b.ym + pad2(b.day)).localeCompare(a.ym + pad2(a.day)));
  return { ok: true, deals: list.slice(0, 2500), total: list.length, months: yms.length, failed, source: '국토교통부 실거래가 공개시스템(공공데이터포털)' };
}

/* ---------------------------------------------------------------- 브이월드 (서버 경유) */
const VW_ALLOWED = /^\/(req\/(search|address|data)|ned\/data\/(getLandCharacteristics|getIndvdLandPriceAttr|getLandUseAttr|getPossessionAttr))$/;
export async function vworld(env, request, path, params) {
  const key = str(env.VWORLD_KEY);
  if (!key) return { ok: false, code: 'NO_KEY', message: '브이월드 키(VWORLD_KEY)가 아직 등록되지 않았습니다.' };
  if (!VW_ALLOWED.test(path)) return { ok: false, code: 'BAD_INPUT', message: '허용되지 않은 조회입니다.' };
  const host = new URL(request.url).hostname;
  const u = new URL('https://api.vworld.kr' + path);
  for (const [k, v] of Object.entries(params || {})) { if (k === 'key' || k === 'domain' || k === 'callback' || k === 'path') continue; u.searchParams.set(k, v); }
  u.searchParams.set('key', key); u.searchParams.set('domain', str(env.VWORLD_DOMAIN) || host);
  if (!u.searchParams.get('format')) u.searchParams.set('format', 'json');
  try {
    const res = await fetchT(u.toString(), 9000, { Referer: `https://${str(env.VWORLD_DOMAIN) || host}/` });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch (e) { return { ok: false, code: 'UPSTREAM', message: '브이월드가 예상과 다른 응답을 보냈습니다.', detail: text.slice(0, 160) }; }
    return { ok: true, data };
  } catch (e) { return { ok: false, code: 'UPSTREAM_TIMEOUT', message: '브이월드 응답 지연(서버 경유). 브라우저에서 직접 다시 시도합니다.' }; }
}

/** 지도 이미지를 받아 Uint8Array로 돌려줍니다(브이월드 Static Map). */
export async function staticMap(env, request, { lat, lon, zoom = 17, w = 800, h = 600, markers = [] }) {
  const key = str(env.VWORLD_KEY);
  if (!key) return { ok: false, code: 'NO_KEY', message: '브이월드 키가 없어 지도를 자동으로 넣을 수 없습니다. 지도 화면을 캡처해 붙여 넣어 주세요.' };
  if (!(lat > 32 && lat < 39.5 && lon > 124 && lon < 132)) return { ok: false, code: 'BAD_INPUT', message: '좌표가 올바르지 않습니다.' };
  const host = str(env.VWORLD_DOMAIN) || new URL(request.url).hostname;
  w = Math.min(Math.max(parseInt(w, 10) || 800, 200), 1024); h = Math.min(Math.max(parseInt(h, 10) || 600, 200), 1024);
  zoom = Math.min(Math.max(parseInt(zoom, 10) || 17, 6), 18);
  const u = new URL('https://api.vworld.kr/req/image');
  const q = { service: 'image', request: 'getmap', key, domain: host, format: 'png', basemap: 'GRAPHIC', center: `${lon},${lat}`, crs: 'EPSG:4326', zoom: String(zoom), size: `${w},${h}` };
  for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
  let url = u.toString();
  const ms = (markers && markers.length ? markers : [{ lat, lon }]).slice(0, 12);
  for (const m of ms) url += `&marker=${encodeURIComponent(`point:${m.lon} ${m.lat}|image:img01`)}`;
  try {
    const res = await fetchT(url, 10000, { Referer: `https://${host}/`, Accept: 'image/png,image/*' });
    const type = res.headers.get('Content-Type') || '';
    if (!res.ok || !/^image\//.test(type)) return { ok: false, code: 'UPSTREAM', message: '지도 이미지를 받지 못했습니다. 지도 화면을 캡처해 붙여 넣어 주세요.', detail: (await res.text()).slice(0, 160) };
    return { ok: true, bytes: new Uint8Array(await res.arrayBuffer()), mime: type.split(';')[0] };
  } catch (e) { return { ok: false, code: 'UPSTREAM_TIMEOUT', message: '지도 이미지 응답 지연. 지도 화면을 캡처해 붙여 넣어 주세요.' }; }
}
