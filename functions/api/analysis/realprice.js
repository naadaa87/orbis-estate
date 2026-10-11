/**
 * 상권분석 · 상업업무용 부동산 매매 실거래 (국토교통부)
 * GET /api/analysis/realprice?lawd=11680&months=12
 *
 * 원천: 국토교통부_상업업무용 부동산 매매 실거래가 자료 (공공데이터포털)
 *       https://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade
 *       LAWD_CD = 법정동코드 앞 5자리(시군구), DEAL_YMD = 계약년월(YYYYMM)
 * 실측으로 알려진 특징:
 *   - 정상 resultCode는 '000' (3자리)
 *   - dealAmount는 만원 단위 + 콤마 문자열('136,000' = 13.6억)
 *   - cdealType='O'는 해제된 거래 → 통계에서 제외
 *   - 일반(통건물) 거래의 지번은 '6**'처럼 일부 가려져 공개됨
 * 필요한 환경변수: DATA_GO_KR_KEY (상가정보와 같은 키, 이 API도 별도 활용 신청 필요)
 */
const API = "https://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!sameOrigin(request)) return json({ ok: false, code: "FORBIDDEN", message: "허용되지 않은 호출입니다." }, 403);
  const key = (env.DATA_GO_KR_KEY || "").trim();
  if (!key) return json({ ok: false, code: "NO_KEY", message: "실거래 데이터 연결 준비 중입니다." }, 503);

  const u = new URL(request.url);
  const lawd = (u.searchParams.get("lawd") || "").replace(/\D/g, "").slice(0, 5);
  const months = Math.min(Math.max(parseInt(u.searchParams.get("months"), 10) || 12, 1), 24);
  if (lawd.length !== 5) return json({ ok: false, code: "BAD_INPUT", message: "시군구 코드가 올바르지 않습니다." }, 400);

  const yms = monthList(months);
  const cache = caches.default;
  const results = await Promise.all(yms.map((ym, i) => fetchMonth(context, cache, key, lawd, ym, i < 2)));

  const failed = [];
  let deals = [], cancelled = 0, authErr = null;
  const byMonth = {};
  results.forEach((r, i) => {
    if (!r.ok) { failed.push(yms[i]); if (!authErr && r.code !== "UPSTREAM_TIMEOUT") authErr = r; return; }
    byMonth[yms[i]] = r.deals.length;
    cancelled += r.cancelled;
    deals = deals.concat(r.deals);
  });
  if (failed.length === yms.length) {
    const e = authErr || { code: "UPSTREAM", message: "실거래 데이터를 불러오지 못했습니다." };
    return json({ ok: false, code: e.code, message: e.message, detail: e.detail || "" }, e.code === "LIMIT" ? 429 : 502);
  }
  deals.sort((a, b) => (b[0] * 100 + b[1]) - (a[0] * 100 + a[1]));
  return json({
    ok: true, source: "국토교통부 상업업무용 부동산 매매 실거래가", lawd, months: yms, byMonth, failed,
    count: deals.length, cancelled,
    fields: ["ym", "day", "umd", "jibun", "type", "use", "landUse", "floor", "amtManwon", "bldAr", "plotAr", "buildYear", "dealing", "share"],
    deals: deals.slice(0, 400),
  }, 200, "private, max-age=1800");
}

export async function onRequest(context) {
  if (context.request.method === "GET") return onRequestGet(context);
  return new Response("Method Not Allowed", { status: 405 });
}

async function fetchMonth(context, cache, key, lawd, ym, recent) {
  const cacheKey = new Request(new URL(`/__cache/analysis/rtms?lawd=${lawd}&ym=${ym}&v=2`, context.request.url).toString());
  try {
    const hit = await cache.match(cacheKey);
    if (hit) return await hit.json();
  } catch (e) {}
  let all = [], page = 1, total = 0;
  try {
    do {
      const url = `${API}?serviceKey=${keyParam(key)}&LAWD_CD=${lawd}&DEAL_YMD=${ym}&numOfRows=1000&pageNo=${page}&_type=json`;
      const res = await fetchT(url, 9000);
      const parsed = parseDataGoKr(await res.text(), res.status);
      if (!parsed.ok) return parsed;
      all = all.concat(parsed.items);
      total = parsed.total;
      page++;
    } while (all.length < total && page <= 3);
  } catch (e) {
    return { ok: false, code: "UPSTREAM_TIMEOUT", message: "공공데이터포털 응답 지연" };
  }
  let cancelled = 0;
  const deals = [];
  for (const d of all) {
    if (str(d.cdealType).toUpperCase() === "O") { cancelled++; continue; }
    const amt = num(d.dealAmount);
    if (!amt) continue;
    deals.push([
      parseInt(str(d.dealYear) + pad(d.dealMonth), 10) || parseInt(ym, 10), parseInt(d.dealDay, 10) || 0,
      str(d.umdNm), str(d.jibun), str(d.buildingType), str(d.buildingUse), str(d.landUse), str(d.floor),
      amt, num(d.buildingAr), num(d.plottageAr), parseInt(d.buildYear, 10) || null, str(d.dealingGbn), str(d.shareDealingType) ? 1 : 0,
    ]);
  }
  const out = { ok: true, deals, cancelled };
  const ttl = recent ? 12 * 3600 : 7 * 24 * 3600;
  try {
    context.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${ttl}` } })));
  } catch (e) {}
  return out;
}

function monthList(n) {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  let y = now.getUTCFullYear(), m = now.getUTCMonth() + 1;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(String(y) + pad(m));
    m--; if (m === 0) { m = 12; y--; }
  }
  return out;
}

/* ---------- 공통 도우미 ---------- */
function json(obj, status = 200, cacheControl = "no-store") {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": cacheControl } });
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
function pad(v) { return String(parseInt(v, 10) || 0).padStart(2, "0"); }
function str(v) { return v == null ? "" : String(v).trim(); }
function num(v) { const n = parseFloat(String(v == null ? "" : v).replace(/,/g, "").trim()); return isFinite(n) ? n : null; }
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
