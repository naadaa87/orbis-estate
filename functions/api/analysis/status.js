/**
 * 상권분석 · 연결 상태
 *
 * GET /api/analysis/status
 *   화면이 처음 열릴 때 부릅니다. 어떤 데이터가 연결돼 있는지(키 등록 여부)와
 *   카카오맵 JavaScript 키(공개용 · 도메인 제한 키)를 알려줍니다. 외부 호출은 하지 않습니다.
 *
 * GET /api/analysis/status?check=1
 *   운영자 점검용. 브라우저 주소창에 그대로 입력하면 각 공공 API를 실제로 1번씩 호출해
 *   "정상 / 오류 사유"를 한국어로 보여줍니다. 결과는 1분간 캐시되며, 키를 새로 등록하면 바로 다시 점검합니다.
 *
 * 환경변수 (Cloudflare Pages → Settings → Variables and Secrets)
 *   DATA_GO_KR_KEY : 공공데이터포털 인증키 — 소진공 상가(상권)정보, 국토부 상업업무용 실거래
 *   KAKAO_JS_KEY   : 카카오 디벨로퍼스 JavaScript 키 — 지도 표시·주소 검색
 *   KAKAO_REST_KEY : (선택) 카카오 REST API 키 — 지도 없이 주소 검색이 필요할 때의 보조 경로
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const u = new URL(request.url);
  const dataKey = (env.DATA_GO_KR_KEY || "").trim();
  const kakaoJs = (env.KAKAO_JS_KEY || "").trim();
  const kakaoRest = (env.KAKAO_REST_KEY || "").trim();

  if (u.searchParams.get("check") !== "1") {
    return json({
      ok: true,
      ready: { stores: !!dataKey, zones: !!dataKey, realprice: !!dataKey, map: !!kakaoJs, geocode: !!(kakaoJs || kakaoRest), geocodeServer: !!kakaoRest },
      kakaoJsKey: kakaoJs,
    }, 200, "private, max-age=60");
  }

  const cache = caches.default;
  const keyFlags = `${dataKey ? 1 : 0}${kakaoJs ? 1 : 0}${kakaoRest ? 1 : 0}`;
  const cacheKey = new Request(new URL(`/__cache/analysis/status-check?v=3&k=${keyFlags}`, request.url).toString());
  try {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  } catch (e) {}

  const rows = [];
  const ym = prevMonth();
  if (!dataKey) {
    rows.push(row("공공데이터포털 인증키 (DATA_GO_KR_KEY)", false, "미등록", "Cloudflare 환경변수에 DATA_GO_KR_KEY를 등록한 뒤 다시 배포해 주세요."));
  } else {
    rows.push(await probe("소진공 상가(상권)정보 · 반경 내 점포",
      `https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius?serviceKey=${keyParam(dataKey)}&pageNo=1&numOfRows=1&radius=100&cx=127.0276&cy=37.4979&type=json`,
      (p) => `강남역 반경 100m 점포 ${p.total}곳 · 기준년월 ${p.stdr || "-"}`));
    rows.push(await probe("소진공 상가(상권)정보 · 주요상권",
      `https://apis.data.go.kr/B553077/api/open/sdsc2/storeZoneInRadius?serviceKey=${keyParam(dataKey)}&pageNo=1&numOfRows=1&radius=500&cx=127.0276&cy=37.4979&type=json`,
      (p) => `강남역 반경 500m 주요상권 ${p.total}곳`));
    rows.push(await probe("국토부 상업업무용 부동산 매매 실거래",
      `https://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade?serviceKey=${keyParam(dataKey)}&LAWD_CD=11680&DEAL_YMD=${ym}&numOfRows=1&pageNo=1&_type=json`,
      (p) => `강남구 ${ym.slice(0, 4)}년 ${+ym.slice(4)}월 신고 ${p.total}건`));
  }
  rows.push(row("카카오맵 JavaScript 키 (KAKAO_JS_KEY)", !!kakaoJs, kakaoJs ? "등록됨" : "미등록",
    kakaoJs ? "지도가 보이지 않으면 카카오 디벨로퍼스 → 앱 → 플랫폼 → Web에 사이트 도메인(https://orbis-estate.com)이 등록돼 있는지 확인해 주세요." : "지도와 주소 검색을 쓰려면 등록이 필요합니다."));
  if (kakaoRest) {
    const t0 = Date.now();
    try {
      const r = await fetchT("https://dapi.kakao.com/v2/local/search/address.json?query=" + encodeURIComponent("테헤란로 123") + "&size=1", 7000, { Authorization: `KakaoAK ${kakaoRest}` });
      rows.push(row("카카오 REST 키 (KAKAO_REST_KEY · 선택)", r.ok, r.ok ? "정상" : "오류", r.ok ? "주소 검색 보조 경로 사용 가능" : `HTTP ${r.status} — 키 또는 카카오맵 API 활성화 상태를 확인해 주세요.`, Date.now() - t0));
    } catch (e) {
      rows.push(row("카카오 REST 키 (KAKAO_REST_KEY · 선택)", false, "오류", "응답 지연", Date.now() - t0));
    }
  } else {
    rows.push(row("카카오 REST 키 (KAKAO_REST_KEY · 선택)", true, "미사용", "선택 항목입니다. 지도 키만으로도 검색이 됩니다."));
  }
  rows.push(await staticData(env, request, "/data/seoul/index.json", "서울시 상권분석 데이터 (분기 자동 갱신)",
    (d) => `${d.qDesc || d.q} 기준 · 상권 ${(d.t || []).length.toLocaleString("ko-KR")}곳 · ${String(d.built || "").slice(0, 10)} 갱신`,
    "GitHub 저장소의 Actions에서 '상권 데이터 갱신'을 실행하면 채워집니다(SEOUL_API_KEY 필요)."));
  rows.push(await staticData(env, request, "/data/rone/latest.json", "한국부동산원 임대동향 (분기 자동 갱신 · 선택)",
    (d) => `${d.desc || d.q} 기준 · 조사 상권 ${Object.values(d.types || {}).reduce((a, v) => a + v.length, 0).toLocaleString("ko-KR")}건`,
    "선택 항목입니다. REB_API_KEY를 GitHub 비밀값으로 등록하면 함께 갱신됩니다."));

  const res = json({ ok: rows.every((r) => r.ok), 점검시각: new Date(Date.now() + 9 * 3600 * 1000).toISOString().replace("T", " ").slice(0, 19) + " (KST)", 결과: rows }, 200, "public, max-age=60");
  try { context.waitUntil(cache.put(cacheKey, res.clone())); } catch (e) {}
  return res;
}

export async function onRequest(context) {
  if (context.request.method === "GET") return onRequestGet(context);
  return new Response("Method Not Allowed", { status: 405 });
}

async function probe(name, url, describe) {
  const t0 = Date.now();
  try {
    const res = await fetchT(url, 9000);
    const p = parseDataGoKr(await res.text(), res.status);
    if (!p.ok) return row(name, false, "오류", `${p.message}${p.detail ? " (" + p.detail + ")" : ""}`, Date.now() - t0);
    return row(name, true, "정상", describe(p), Date.now() - t0);
  } catch (e) {
    return row(name, false, "오류", "응답 지연 또는 연결 실패", Date.now() - t0);
  }
}
async function staticData(env, request, path, name, describe, hint) {
  try {
    const req = new Request(new URL(path, request.url).toString());
    const res = env.ASSETS ? await env.ASSETS.fetch(req) : await fetch(req);
    if (!res.ok) return row(name, false, "없음", hint);
    const d = await res.json();
    if (!d || !d.ready) return row(name, false, "준비 전", hint);
    return row(name, true, "준비됨", describe(d));
  } catch (e) {
    return row(name, false, "없음", hint);
  }
}
function row(항목, ok, 상태, 설명, ms) {
  const r = { 항목, ok, 상태, 설명 };
  if (ms != null) r.소요ms = ms;
  return r;
}
function prevMonth() {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  let y = now.getUTCFullYear(), m = now.getUTCMonth();
  if (m === 0) { m = 12; y--; }
  return String(y) + String(m).padStart(2, "0");
}

/* ---------- 공통 도우미 ---------- */
function json(obj, status = 200, cacheControl = "no-store") {
  return new Response(JSON.stringify(obj, null, 2), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": cacheControl } });
}
function keyParam(k) { return /%[0-9A-Fa-f]{2}/.test(k) ? k : encodeURIComponent(k); }
function str(v) { return v == null ? "" : String(v).trim(); }
async function fetchT(url, ms, headers) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { signal: ctl.signal, headers: headers || { "User-Agent": "Mozilla/5.0 (compatible; ORBIS-Analysis/1.0)", Accept: "application/json, application/xml;q=0.9, */*;q=0.8" } });
  } finally { clearTimeout(t); }
}
const REASONS = {
  "1": ["UPSTREAM", "제공기관 서비스 오류"], "10": ["BAD_PARAM", "요청 값 오류"], "12": ["NO_SERVICE", "해당 오픈API 서비스가 없거나 폐기됨"],
  "20": ["DENIED", "이 API의 활용 신청이 승인되지 않음(공공데이터포털에서 활용 신청 필요)"],
  "22": ["LIMIT", "일일 호출 한도 초과"], "30": ["AUTH", "등록되지 않은 인증키(발급 직후라면 활성화까지 기다려 주세요)"],
  "31": ["EXPIRED", "활용 기간 만료"], "32": ["IP", "등록되지 않은 IP"], "99": ["UPSTREAM", "알 수 없는 오류"],
};
function parseDataGoKr(text, status) {
  const t = (text || "").trim();
  const code = (t.match(/<returnReasonCode>\s*(\d+)\s*</) || [])[1];
  const auth = (t.match(/<returnAuthMsg>\s*([^<]+)</) || [])[1];
  if (code || auth) {
    const m = REASONS[code] || ["UPSTREAM", auth || "제공기관 오류"];
    return { ok: false, code: m[0], message: m[1], detail: (auth || "").trim() };
  }
  if (status === 401 || status === 403) return { ok: false, code: "AUTH", message: "인증키 확인이 필요합니다.", detail: t.slice(0, 120) };
  if (status === 429) return { ok: false, code: "LIMIT", message: "일일 호출 한도 초과", detail: "" };
  if (!t) return { ok: false, code: "UPSTREAM", message: "빈 응답", detail: String(status) };
  if (t[0] === "<") {
    const rc = (t.match(/<resultCode>\s*([^<]+)</) || [])[1] || "";
    const rm = (t.match(/<resultMsg>\s*([^<]+)</) || [])[1] || "";
    if (rc && rc !== "00" && rc !== "000" && rc !== "03") return { ok: false, code: "UPSTREAM", message: rm || "제공기관 오류", detail: rc };
    return { ok: true, total: parseInt((t.match(/<totalCount>\s*(\d+)/) || [])[1] || "0", 10), stdr: (t.match(/<stdrYm>\s*([^<]+)</) || [])[1] || "" };
  }
  let j;
  try { j = JSON.parse(t); } catch (e) { return { ok: false, code: "UPSTREAM", message: "응답 형식 오류", detail: t.slice(0, 120) }; }
  const header = j.header || (j.response && j.response.header) || {};
  const body = j.body || (j.response && j.response.body) || {};
  const rc = str(header.resultCode);
  if (rc && rc !== "00" && rc !== "000" && rc !== "03") return { ok: false, code: "UPSTREAM", message: str(header.resultMsg) || "제공기관 오류", detail: rc };
  return { ok: true, total: parseInt(body.totalCount, 10) || 0, stdr: str(header.stdrYm) };
}
