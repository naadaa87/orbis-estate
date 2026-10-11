/**
 * 상권분석 · 반경 내 주요상권(소진공) 조회
 * GET /api/analysis/zones?lon=127.0276&lat=37.4979&r=1000
 *
 * 원천: 소상공인시장진흥공단_상가(상권)정보 API — storeZoneInRadius
 * 상권좌표(coords)는 "경도,위도|경도,위도|…" 형식이며, 링이 여러 개면 ")|(" 로 나뉜다.
 * 지도에 그리기 좋도록 링마다 점을 최대 240개로 줄여 돌려준다.
 */
const API = "https://apis.data.go.kr/B553077/api/open/sdsc2/storeZoneInRadius";
const CACHE_SEC = 14 * 24 * 3600;
const RADII = [300, 500, 1000, 1500, 2000];

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!sameOrigin(request)) return json({ ok: false, code: "FORBIDDEN", message: "허용되지 않은 호출입니다." }, 403);
  const key = (env.DATA_GO_KR_KEY || "").trim();
  if (!key) return json({ ok: false, code: "NO_KEY", message: "주요상권 데이터 연결 준비 중입니다." }, 503);

  const u = new URL(request.url);
  const lon = round(parseFloat(u.searchParams.get("lon")), 3);
  const lat = round(parseFloat(u.searchParams.get("lat")), 3);
  const r = snap(parseInt(u.searchParams.get("r"), 10) || 1000, RADII);
  if (!inKorea(lon, lat)) return json({ ok: false, code: "BAD_INPUT", message: "좌표가 올바르지 않습니다." }, 400);

  const cacheKey = new Request(new URL(`/__cache/analysis/zones?lon=${lon}&lat=${lat}&r=${r}&v=2`, request.url).toString());
  const cache = caches.default;
  try {
    const hit = await cache.match(cacheKey);
    if (hit) return withHeaders(hit, { "X-Orbis-Cache": "HIT" });
  } catch (e) {}

  const url = `${API}?serviceKey=${keyParam(key)}&pageNo=1&numOfRows=100&radius=${r}&cx=${lon}&cy=${lat}&type=json`;
  let text, res;
  try {
    res = await fetchT(url, 9000);
    text = await res.text();
  } catch (e) {
    return json({ ok: false, code: "UPSTREAM_TIMEOUT", message: "공공데이터포털 응답이 지연되고 있습니다." }, 504);
  }
  const parsed = parseDataGoKr(text, res.status);
  if (!parsed.ok) return json(parsed, parsed.code === "LIMIT" ? 429 : 502);

  const zones = parsed.items.map((z) => {
    const rings = parseRings(str(z.coords));
    let cx = NaN, cy = NaN;
    if (rings.length) {
      const pts = rings[0];
      cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
      cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    }
    return {
      no: str(z.trarNo), nm: str(z.mainTrarNm), sido: str(z.ctprvnNm), sgg: str(z.signguNm),
      area: num(z.trarArea), stdr: str(z.stdrDt), c: isFinite(cx) ? [round(cx, 6), round(cy, 6)] : null, rings,
    };
  });

  const body = JSON.stringify({ ok: true, source: "소상공인시장진흥공단 상가(상권)정보 · 주요상권", r, count: zones.length, zones });
  const fresh = new Response(body, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": `public, max-age=${CACHE_SEC}` } });
  try { context.waitUntil(cache.put(cacheKey, fresh.clone())); } catch (e) {}
  return withHeaders(fresh, { "X-Orbis-Cache": "MISS" });
}

export async function onRequest(context) {
  if (context.request.method === "GET") return onRequestGet(context);
  return new Response("Method Not Allowed", { status: 405 });
}

/** "경도,위도|경도,위도|…)|(경도,위도|…" → [[[lon,lat],…], …]  (한국 범위를 벗어나면 그 링은 버림) */
function parseRings(text) {
  if (!text) return [];
  const rings = [];
  for (const raw of text.split(")|(")) {
    const pts = [];
    for (const tok of raw.replace(/[()]/g, "").split("|")) {
      const p = tok.split(",");
      if (p.length !== 2) continue;
      const x = parseFloat(p[0]), y = parseFloat(p[1]);
      if (inKorea(x, y)) pts.push([round(x, 6), round(y, 6)]);
    }
    if (pts.length >= 3) {
      const step = Math.ceil(pts.length / 240);
      rings.push(step > 1 ? pts.filter((_, i) => i % step === 0) : pts);
    }
  }
  return rings.slice(0, 12);
}

/* ---------- 공통 도우미 ---------- */
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
function withHeaders(res, extra) {
  const h = new Headers(res.headers);
  h.set("Cache-Control", "private, max-age=3600");
  for (const k in extra) h.set(k, extra[k]);
  return new Response(res.body, { status: res.status, headers: h });
}
function sameOrigin(request) {
  const host = new URL(request.url).host;
  if (request.headers.get("Sec-Fetch-Site") === "same-origin") return true;
  for (const h of ["Origin", "Referer"]) {
    const v = request.headers.get(h);
    if (v) { try { if (new URL(v).host === host) return true; } catch (e) {} }
  }
  return false;
}
function keyParam(k) { return /%[0-9A-Fa-f]{2}/.test(k) ? k : encodeURIComponent(k); }
function round(n, d) { const p = Math.pow(10, d); return Math.round(n * p) / p; }
function snap(v, list) { return list.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a)); }
function inKorea(lon, lat) { return isFinite(lon) && isFinite(lat) && lon > 124 && lon < 132 && lat > 33 && lat < 39; }
function str(v) { return v == null ? "" : String(v).trim(); }
function num(v) { const n = parseFloat(String(v == null ? "" : v).replace(/,/g, "")); return isFinite(n) ? n : null; }
async function fetchT(url, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { signal: ctl.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; ORBIS-Analysis/1.0)", Accept: "application/json, application/xml;q=0.9, */*;q=0.8" } });
  } finally { clearTimeout(t); }
}
const REASONS = {
  "1": ["UPSTREAM", "제공기관 서비스 오류"], "10": ["BAD_PARAM", "요청 값 오류"], "12": ["NO_SERVICE", "해당 오픈API 서비스가 없거나 폐기됨"],
  "20": ["DENIED", "이 API의 활용 신청이 승인되지 않음(공공데이터포털에서 활용 신청 필요)"],
  "22": ["LIMIT", "일일 호출 한도 초과"], "30": ["AUTH", "등록되지 않은 인증키(발급 직후라면 활성화까지 기다려 주세요)"],
  "31": ["EXPIRED", "활용 기간 만료"], "32": ["IP", "등록되지 않은 IP"], "99": ["UPSTREAM", "알 수 없는 오류"],
};
function gatewayError(text, status) {
  const code = (text.match(/<returnReasonCode>\s*(\d+)\s*</) || [])[1];
  const auth = (text.match(/<returnAuthMsg>\s*([^<]+)</) || [])[1];
  if (code || auth) {
    const m = REASONS[code] || ["UPSTREAM", auth || "제공기관 오류"];
    return { ok: false, code: m[0], message: m[1], detail: (auth || "").trim() };
  }
  if (status === 401 || status === 403) return { ok: false, code: "AUTH", message: "인증키 확인이 필요합니다.", detail: text.slice(0, 120) };
  if (status === 429) return { ok: false, code: "LIMIT", message: "일일 호출 한도 초과", detail: "" };
  return null;
}
function xmlItems(text) {
  const out = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(text))) {
    const o = {};
    const fr = /<(\w+)>([^<]*)<\/\1>/g;
    let f;
    while ((f = fr.exec(m[1]))) o[f[1]] = f[2].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    out.push(o);
  }
  return out;
}
function parseDataGoKr(text, status) {
  const t = (text || "").trim();
  const g = gatewayError(t, status);
  if (g) return g;
  if (!t) return { ok: false, code: "UPSTREAM", message: "빈 응답", detail: String(status) };
  if (t[0] === "<") {
    const rc = (t.match(/<resultCode>\s*([^<]+)</) || [])[1] || "";
    const rm = (t.match(/<resultMsg>\s*([^<]+)</) || [])[1] || "";
    if (rc === "03") return { ok: true, items: [], total: 0 };
    if (rc && rc !== "00" && rc !== "000") return { ok: false, code: "UPSTREAM", message: rm || "제공기관 오류", detail: rc };
    return { ok: true, items: xmlItems(t), total: parseInt((t.match(/<totalCount>\s*(\d+)/) || [])[1] || "0", 10) };
  }
  let j;
  try { j = JSON.parse(t); } catch (e) { return { ok: false, code: "UPSTREAM", message: "응답 형식 오류", detail: t.slice(0, 120) }; }
  const header = j.header || (j.response && j.response.header) || {};
  const body = j.body || (j.response && j.response.body) || {};
  const rc = str(header.resultCode);
  if (rc === "03") return { ok: true, items: [], total: 0 };
  if (rc && rc !== "00" && rc !== "000") return { ok: false, code: "UPSTREAM", message: str(header.resultMsg) || "제공기관 오류", detail: rc };
  let items = body.items;
  if (items && !Array.isArray(items)) items = items.item;
  if (items && !Array.isArray(items)) items = [items];
  return { ok: true, items: items || [], total: parseInt(body.totalCount, 10) || (items ? items.length : 0) };
}
