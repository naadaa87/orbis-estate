// 오르비스 관리자 — 공공데이터 조회 도우미 (리포트 자동 채움, 매물 등록 보조)
//  · 지번 → 필지(PNU)        : 서버의 법정동코드 표
//  · 건축물대장 · 실거래가    : 공공데이터포털 (서버 경유, DATA_GO_KR_KEY)
//  · 토지특성 · 공시지가 · 지적 · 지도 : 브이월드 (서버 경유 → 안 되면 브라우저에서 직접, VWORLD_KEY)
// 모든 함수는 실패해도 예외를 던지지 않고 { ok:false, code, message } 를 돌려줍니다.

const M_LAT = (lat) => 111132.92 - 559.82 * Math.cos(2 * lat * Math.PI / 180) + 1.175 * Math.cos(4 * lat * Math.PI / 180);
const M_LON = (lat) => 111412.84 * Math.cos(lat * Math.PI / 180) - 93.5 * Math.cos(3 * lat * Math.PI / 180);
const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(n) ? n : null; };
const str = (v) => (v == null ? '' : String(v).trim());

// 서울시 도시계획 조례 기준 건폐율·용적률 상한(%) — 다른 지자체는 조례가 달라 직접 확인이 필요합니다
const SEOUL_LIMITS = {
  제1종전용주거지역: [50, 100], 제2종전용주거지역: [40, 120], 제1종일반주거지역: [60, 150], 제2종일반주거지역: [60, 200], 제3종일반주거지역: [50, 250],
  준주거지역: [60, 400], 중심상업지역: [60, 1000], 일반상업지역: [60, 800], 근린상업지역: [60, 600], 유통상업지역: [60, 600],
  준공업지역: [60, 400], 일반공업지역: [60, 200], 전용공업지역: [60, 200], 자연녹지지역: [20, 50], 생산녹지지역: [20, 50], 보전녹지지역: [20, 50],
};
export function zoneLimits(zone, sido) {
  const z = str(zone).replace(/\s/g, '');
  if (!/서울/.test(str(sido)) || !SEOUL_LIMITS[z]) return null;
  return { bcr: SEOUL_LIMITS[z][0], far: SEOUL_LIMITS[z][1], note: '서울시 도시계획 조례 기준' };
}

function ringArea(ring, lat0) {
  const kx = M_LON(lat0); const ky = M_LAT(lat0); let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] * kx) * (ring[i][1] * ky) - (ring[i][0] * kx) * (ring[j][1] * ky);
  return a / 2;
}
/** GeoJSON(Polygon·MultiPolygon, 경위도) → { area(㎡), lat, lon } */
export function geomInfo(geom) {
  if (!geom || !geom.coordinates) return null;
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
  let area = 0; let sx = 0; let sy = 0; let n = 0;
  for (const poly of polys) {
    if (!poly.length || !poly[0].length) continue;
    const lat0 = poly[0][0][1];
    poly.forEach((ring, i) => { const a = Math.abs(ringArea(ring, lat0)); area += i === 0 ? a : -a; });
    for (const pt of poly[0]) { sx += pt[0]; sy += pt[1]; n++; }
  }
  if (!n) return null;
  return { area: Math.round(area * 100) / 100, lon: sx / n, lat: sy / n };
}
export function distanceM(lat1, lon1, lat2, lon2) {
  const dx = (lon2 - lon1) * M_LON((lat1 + lat2) / 2); const dy = (lat2 - lat1) * M_LAT((lat1 + lat2) / 2);
  return Math.sqrt(dx * dx + dy * dy);
}
export function bearingKo(lat1, lon1, lat2, lon2) {
  const dx = (lon2 - lon1) * M_LON(lat1); const dy = (lat2 - lat1) * M_LAT(lat1);
  const deg = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
  return ['북', '북동', '동', '남동', '남', '남서', '서', '북서'][Math.round(deg / 45) % 8] + '측';
}

function jsonp(url, params, ms = 9000) {
  return new Promise((resolve, reject) => {
    const cb = '__orbis_vw_' + Math.random().toString(36).slice(2);
    const u = new URL(url); for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    u.searchParams.set('callback', cb);
    const s = document.createElement('script'); let done = false;
    const end = (fn, v) => { if (done) return; done = true; clearTimeout(t); try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); fn(v); };
    const t = setTimeout(() => end(reject, new Error('timeout')), ms);
    window[cb] = (data) => end(resolve, data);
    s.onerror = () => end(reject, new Error('network'));
    s.src = u.toString(); document.head.appendChild(s);
  });
}
// 브이월드 응답에서 오류 문구를 찾습니다(서비스마다 모양이 달라 넓게 봅니다)
function vwError(d) {
  if (!d || typeof d !== 'object') return '응답 없음';
  const r = d.response;
  if (r && r.status === 'ERROR') return (r.error && (r.error.text || r.error.code)) || '오류';
  for (const v of Object.values(d)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && v.resultCode && !/^(0+|OK|INFO-000|NORMAL)/i.test(String(v.resultCode)) && !v.field) return v.resultMsg || v.resultCode;
  }
  return '';
}
// NED 응답에서 행 배열을 꺼냅니다 ({ xxxs: { field: [...] } } 모양)
function nedRows(d) {
  if (!d || typeof d !== 'object') return [];
  for (const v of Object.values(d)) {
    if (v && typeof v === 'object') {
      if (Array.isArray(v.field)) return v.field;
      if (v.field && typeof v.field === 'object') return [v.field];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

export function createGeo({ api }) {
  let K = null; let vwMode = ''; let stations = null;
  try { vwMode = sessionStorage.getItem('orbis_vw_mode') || ''; } catch (e) {}
  const call = (path, opt) => api(path, opt).catch((e) => (e.data && typeof e.data === 'object' ? { ok: false, code: e.data.code || e.data.error || 'ERROR', message: e.data.message || e.message } : { ok: false, code: 'ERROR', message: e.message || '조회하지 못했습니다.' }));

  async function keys(force) {
    if (K && !force) return K;
    K = await call('/geo/keys');
    if (!K.ok) K = { ok: false, datagokr: false, vworld: false, vworldKey: '', vworldDomain: location.hostname, message: K.message };
    return K;
  }
  // 브이월드 호출: 서버 경유 → 실패하면 브라우저에서 직접(JSONP)
  async function vw(path, params) {
    const k = await keys();
    if (!k.vworld) return { ok: false, code: 'NO_KEY', message: '브이월드 키(VWORLD_KEY)가 아직 등록되지 않았습니다. 토지 정보는 직접 입력해 주세요.' };
    const p = { ...params }; if (!p.format) p.format = 'json';
    if (vwMode !== 'direct') {
      const r = await call('/geo/vw?' + new URLSearchParams({ path, ...p }).toString());
      if (r.ok && !vwError(r.data)) return { ok: true, data: r.data, via: 'server' };
    }
    try {
      const data = await jsonp('https://api.vworld.kr' + path, { ...p, key: k.vworldKey, domain: k.vworldDomain || location.hostname });
      const err = vwError(data);
      if (err) return { ok: false, code: 'UPSTREAM', message: '브이월드가 조회를 거절했습니다: ' + err + ' (키의 서비스 URL에 이 사이트 주소가 등록돼 있는지 확인해 주세요)' };
      if (vwMode !== 'direct') { vwMode = 'direct'; try { sessionStorage.setItem('orbis_vw_mode', 'direct'); } catch (e) {} }
      return { ok: true, data, via: 'direct' };
    } catch (e) {
      return { ok: false, code: 'UPSTREAM', message: '브이월드에 연결하지 못했습니다. 잠시 뒤 다시 시도하거나 직접 입력해 주세요.' };
    }
  }
  const wfs = (attrFilter, size = 1, page = 1, geometry = true) => vw('/req/data', { service: 'data', request: 'GetFeature', version: '2.0', data: 'LP_PA_CBND_BUBUN', attrFilter, geometry: geometry ? 'true' : 'false', attribute: 'true', crs: 'EPSG:4326', size: String(size), page: String(page), errorformat: 'json' });
  const features = (r) => (((((r.data || {}).response || {}).result || {}).featureCollection || {}).features) || [];

  async function search(q) {
    q = str(q); if (q.length < 2) return { ok: false, code: 'BAD_INPUT', message: '주소를 적어 주세요. 예: 강남구 역삼동 659-10' };
    const base = await call('/geo/search?q=' + encodeURIComponent(q));
    let items = (base.ok && base.items) || [];
    const k = await keys();
    if (!items.length && k.vworld) {
      // 도로명 주소·건물명 → 브이월드 주소 검색
      for (const category of ['road', 'parcel']) {
        const r = await vw('/req/search', { service: 'search', request: 'search', version: '2.0', crs: 'EPSG:4326', size: '6', page: '1', query: q, type: 'address', category, errorformat: 'json' });
        const list = (r.ok && ((r.data.response || {}).result || {}).items) || [];
        for (const it of list.slice(0, 5)) {
          const parcel = str((it.address || {}).parcel); const road = str((it.address || {}).road);
          let found = null;
          if (/^\d{19}$/.test(str(it.id))) {
            const m = parcel.match(/^(\S+)\s+(.*?)\s+(\S+)\s+(산\s*)?(\d+)(?:-(\d+))?$/);
            if (m) found = { label: parcel, addr: parcel, sido: m[1], sgg: m[2], dong: m[3], jibun: `${m[4] ? '산 ' : ''}${m[5]}${m[6] ? '-' + m[6] : ''}`, san: !!m[4], pnu: str(it.id), bjd: str(it.id).slice(0, 10), source: '브이월드' };
          }
          if (!found && parcel) { const b = await call('/geo/search?q=' + encodeURIComponent(parcel)); found = b.ok && b.items && b.items[0]; }
          if (!found) continue;
          const bld = str((it.address || {}).bldnm);
          items.push({ ...found, road, label: `${found.addr}${road ? ` (${road}${bld ? ' ' + bld : ''})` : ''}`, lat: num((it.point || {}).y), lon: num((it.point || {}).x) });
        }
        if (items.length) break;
      }
    }
    if (!items.length) return { ok: false, code: 'NOT_FOUND', message: k.vworld ? '주소를 찾지 못했습니다. "구 + 동 + 번지" 순서의 지번 주소로 다시 적어 주세요.' : '지번 주소를 알아보지 못했습니다. "구 + 동 + 번지" 순서로 적어 주세요. 예: 강남구 역삼동 659-10 (도로명 주소 검색은 브이월드 키 등록 뒤에 됩니다)' };
    const seen = new Set(); items = items.filter((x) => (seen.has(x.pnu) ? false : seen.add(x.pnu)));
    return { ok: true, items };
  }

  async function parcel(pnu) {
    pnu = str(pnu).replace(/\D/g, '');
    if (pnu.length !== 19) return { ok: false, code: 'BAD_INPUT', message: '필지 번호가 올바르지 않습니다.' };
    const k = await keys();
    if (!k.vworld) return { ok: false, code: 'NO_KEY', message: '브이월드 키(VWORLD_KEY)가 아직 등록되지 않았습니다. 토지 면적·용도지역·개별공시지가는 직접 입력해 주세요.' };
    const [f, ch, pr, use, pos] = await Promise.all([
      wfs(`pnu:=:${pnu}`),
      vw('/ned/data/getLandCharacteristics', { pnu, numOfRows: '30', pageNo: '1' }),
      vw('/ned/data/getIndvdLandPriceAttr', { pnu, numOfRows: '40', pageNo: '1' }),
      vw('/ned/data/getLandUseAttr', { pnu, numOfRows: '100', pageNo: '1' }),
      vw('/ned/data/getPossessionAttr', { pnu, numOfRows: '10', pageNo: '1' }),
    ]);
    const warnings = []; const land = { area: null, jimok: '', zone: '', zone2: '', etc: '', use: '', road: '', shape: '', terrain: '', price: null, priceYear: null, prices: [], plans: [] };
    let center = null; let owner = null; let got = false;
    if (f.ok) {
      const ft = features(f)[0];
      if (ft) {
        got = true; const p = ft.properties || {}; const g = geomInfo(ft.geometry);
        if (g) { center = { lat: g.lat, lon: g.lon }; land.areaGeom = g.area; }
        if (num(p.jiga)) { land.price = num(p.jiga); land.priceYear = parseInt(p.gosi_year, 10) || null; }
        const jm = str(p.jibun).match(/[가-힣]+$/); if (jm) land.jimok = jm[0];
        land.addr = str(p.addr);
      }
    }
    if (ch.ok) {
      const rows = nedRows(ch.data).slice().sort((a, b) => (parseInt(b.stdrYear, 10) || 0) - (parseInt(a.stdrYear, 10) || 0));
      const c = rows[0];
      if (c) {
        got = true;
        land.area = num(c.lndpclAr) ?? land.area; land.jimok = str(c.lndcgrCodeNm) || land.jimok;
        land.zone = str(c.prposArea1Nm); land.zone2 = /지정되지/.test(str(c.prposArea2Nm)) ? '' : str(c.prposArea2Nm);
        land.use = str(c.ladUseSittnNm); land.terrain = str(c.tpgrphHgCodeNm); land.shape = str(c.tpgrphFrmCodeNm); land.road = str(c.roadSideCodeNm);
        if (num(c.pblntfPclnd)) { land.price = num(c.pblntfPclnd); land.priceYear = parseInt(c.stdrYear, 10) || land.priceYear; }
      }
    }
    if (pr.ok) {
      const rows = nedRows(pr.data).map((x) => ({ year: parseInt(x.stdrYear, 10) || null, price: num(x.pblntfPclnd) })).filter((x) => x.year && x.price);
      rows.sort((a, b) => b.year - a.year); const seen = new Set();
      land.prices = rows.filter((x) => (seen.has(x.year) ? false : seen.add(x.year))).slice(0, 10);
      if (land.prices[0] && (!land.priceYear || land.prices[0].year >= land.priceYear)) { land.price = land.prices[0].price; land.priceYear = land.prices[0].year; }
    }
    if (use.ok) {
      const seen = new Set();
      for (const x of nedRows(use.data)) {
        const name = str(x.prposAreaDstrcCodeNm); if (!name || seen.has(name)) continue; seen.add(name);
        const how = str(x.cnflcAtNm); land.plans.push(how && how !== '포함' ? `${name}(${how})` : name);
      }
      const zoneRe = /(주거지역|상업지역|공업지역|녹지지역|관리지역|농림지역|자연환경보전지역)$/;
      if (!land.zone) land.zone = (land.plans.find((x) => zoneRe.test(x)) || '');
      land.etc = land.plans.filter((x) => x !== land.zone && x !== '도시지역' && x !== land.zone2).slice(0, 12).join(', ');
    }
    if (pos.ok) {
      const o = nedRows(pos.data)[0];
      if (o) { const dt = str(o.ownshipChgDe).replace(/\D/g, ''); owner = { type: str(o.posesnSeCodeNm), count: num(o.cnrsPsnCo) || 0, changed: dt.length === 8 ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6)}` : str(o.ownshipChgDe), cause: str(o.ownshipChgCauseCodeNm) }; }
    }
    if (land.area == null && land.areaGeom) { land.area = land.areaGeom; warnings.push('토지 면적은 지적도 도형으로 계산한 값입니다. 토지대장 면적으로 확인해 주세요.'); }
    if (!got) return { ok: false, code: f.code || ch.code || 'NOT_FOUND', message: f.message || ch.message || '이 지번의 토지 정보를 찾지 못했습니다.' };
    return { ok: true, land, center, owner, warnings, source: '브이월드(토지특성·개별공시지가·토지이용계획)' };
  }

  const building = (pnu) => call('/geo/building?pnu=' + encodeURIComponent(str(pnu)));
  const deals = ({ pnu = '', lawd = '', months = 24, kinds = 'nrg', dong = '', all = false } = {}) =>
    call('/geo/deals?' + new URLSearchParams({ pnu: str(pnu), lawd: str(lawd), months: String(months), kinds: Array.isArray(kinds) ? kinds.join(',') : kinds, dong, all: all ? '1' : '' }).toString());

  /** 실거래 원자료의 가려진 지번('6**')을, 같은 동 안에서 대지면적이 맞는 필지로 찾아 지번·공시지가를 채웁니다. */
  async function resolveComp({ bjd, jibunMask, plotAr }) {
    const k = await keys();
    if (!k.vworld) return { ok: false, code: 'NO_KEY', message: '브이월드 키가 없어 사례 지번·공시지가를 자동으로 찾지 못합니다. 직접 입력해 주세요.', items: [] };
    const area = num(plotAr); const mask = str(jibunMask).replace(/\s/g, '');
    if (!/^\d{10}$/.test(str(bjd)) || !area || !mask) return { ok: false, code: 'BAD_INPUT', message: '사례의 법정동·대지면적이 필요합니다.', items: [] };
    const san = mask.startsWith('산'); const main = mask.replace(/^산/, '').split('-')[0];
    let like;
    if (/^\d+$/.test(main)) { // 지번이 가려지지 않은 경우
      const sub = mask.replace(/^산/, '').split('-')[1] || '0';
      like = `${bjd}${san ? 2 : 1}${main.padStart(4, '0')}${/^\d+$/.test(sub) ? sub.padStart(4, '0') : ''}`;
    } else {
      const known = (main.match(/^\d+/) || [''])[0]; const len = Math.min(main.length, 4);
      like = `${bjd}${san ? 2 : 1}${'0'.repeat(4 - len)}${known}`;
    }
    const out = [];
    for (let page = 1; page <= 3; page++) {
      const r = await wfs(`pnu:like:${like}`, 1000, page);
      if (!r.ok) { if (page === 1) return { ok: false, code: r.code, message: r.message, items: [] }; break; }
      const fs = features(r);
      for (const ft of fs) {
        const p = ft.properties || {}; if (!str(p.pnu).startsWith(like)) continue;
        const g = geomInfo(ft.geometry); if (!g) continue;
        const diff = (g.area - area) / area * 100;
        if (Math.abs(diff) > 3 && Math.abs(g.area - area) > 2) continue;
        out.push({ pnu: str(p.pnu), addr: str(p.addr), jibun: str(p.jibun).replace(/\s*[가-힣]+$/, ''), area: g.area, price: num(p.jiga), priceYear: parseInt(p.gosi_year, 10) || null, lat: g.lat, lon: g.lon, diffPct: Math.round(diff * 10) / 10 });
      }
      const total = parseInt((((r.data.response || {}).record || {}).total), 10) || 0;
      if (fs.length < 1000 || page * 1000 >= total) break;
    }
    out.sort((a, b) => Math.abs(a.diffPct) - Math.abs(b.diffPct));
    return { ok: true, items: out.slice(0, 5) };
  }

  /** 지도 이미지를 저장소에 올리고 주소를 돌려줍니다. 키가 없거나 실패하면 ''. */
  async function staticMap({ lat, lon, zoom = 17, w = 800, h = 600, markers = [], owner = '' } = {}) {
    if (!(lat && lon)) return '';
    const r = await call('/geo/staticmap', { method: 'POST', body: { lat, lon, zoom, w, h, markers, owner } });
    return r.ok && r.url ? r.url : '';
  }

  async function nearStations(lat, lon, limit = 3) {
    if (!(lat && lon)) return [];
    if (!stations) { try { stations = await (await fetch('/data/stations.json')).json(); } catch (e) { stations = []; } }
    return stations.map((s) => ({ name: s.n + (s.n.endsWith('역') ? '' : '역'), line: (s.l || []).join('·'), dist: Math.round(distanceM(lat, lon, s.y, s.x)), dir: bearingKo(lat, lon, s.y, s.x) }))
      .filter((s) => s.dist <= 2000).sort((a, b) => a.dist - b.dist).slice(0, limit);
  }

  return { keys, search, parcel, building, deals, resolveComp, staticMap, nearStations, zoneLimits, distanceM, bearingKo, vw };
}
