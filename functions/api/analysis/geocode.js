/**
 * 상권분석 · 주소/장소 검색과 좌표 → 행정구역 변환 (카카오 로컬 REST, 보조 경로)
 * GET /api/analysis/geocode?q=테헤란로 123          → 후보 목록
 * GET /api/analysis/geocode?lon=127.03&lat=37.50    → 법정동·행정동 코드와 주소
 *
 * 화면은 기본적으로 브라우저의 카카오맵 JavaScript SDK(services)로 검색합니다.
 * 이 함수는 지도 키가 없거나 SDK를 불러오지 못했을 때를 위한 보조 경로입니다.
 * 필요한 환경변수: KAKAO_REST_KEY (카카오 디벨로퍼스 → 앱 키 → REST API 키)
 * 카카오 로컬 API 응답은 약관상 영구 저장하지 않으며, 짧게(1일) 캐시만 합니다.
 */
const BASE = "https://dapi.kakao.com/v2/local";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!sameOrigin(request)) return json({ ok: false, code: "FORBIDDEN", message: "허용되지 않은 호출입니다." }, 403);
  const key = (env.KAKAO_REST_KEY || "").trim();
  if (!key) return json({ ok: false, code: "NO_KEY", message: "주소 검색 연결 준비 중입니다." }, 503);
  const u = new URL(request.url);
  const q = (u.searchParams.get("q") || "").trim().slice(0, 80);
  const lon = parseFloat(u.searchParams.get("lon")), lat = parseFloat(u.searchParams.get("lat"));
  const headers = { Authorization: `KakaoAK ${key}` };

  try {
    if (q) {
      const [a, k] = await Promise.all([
        getJSON(`${BASE}/search/address.json?query=${encodeURIComponent(q)}&size=5`, headers),
        getJSON(`${BASE}/search/keyword.json?query=${encodeURIComponent(q)}&size=7`, headers),
      ]);
      if (a.status === 401 || k.status === 401) return json({ ok: false, code: "AUTH", message: "카카오 REST 키 확인이 필요합니다." }, 502);
      if (a.status === 429 || k.status === 429) return json({ ok: false, code: "LIMIT", message: "검색 한도 초과" }, 429);
      const seen = new Set();
      const out = [];
      for (const d of (a.body && a.body.documents) || []) {
        const name = d.road_address ? d.road_address.address_name : d.address_name;
        push(out, seen, { name, addr: d.address_name || "", road: (d.road_address && d.road_address.address_name) || "", lon: +d.x, lat: +d.y, kind: "주소" });
      }
      for (const d of (k.body && k.body.documents) || []) {
        push(out, seen, { name: d.place_name, addr: d.address_name || "", road: d.road_address_name || "", lon: +d.x, lat: +d.y, kind: d.category_group_name || "장소" });
      }
      return json({ ok: true, items: out.slice(0, 10) }, 200, "private, max-age=86400");
    }
    if (isFinite(lon) && isFinite(lat) && lon > 124 && lon < 132 && lat > 33 && lat < 39) {
      const [r, a] = await Promise.all([
        getJSON(`${BASE}/geo/coord2regioncode.json?x=${lon}&y=${lat}`, headers),
        getJSON(`${BASE}/geo/coord2address.json?x=${lon}&y=${lat}`, headers),
      ]);
      if (r.status === 401) return json({ ok: false, code: "AUTH", message: "카카오 REST 키 확인이 필요합니다." }, 502);
      const docs = (r.body && r.body.documents) || [];
      const b = docs.find((d) => d.region_type === "B") || {};
      const h = docs.find((d) => d.region_type === "H") || {};
      const ad = ((a.body && a.body.documents) || [])[0] || {};
      return json({
        ok: true,
        region: {
          bCode: b.code || "", bName: b.address_name || "", hCode: h.code || "", hName: h.region_3depth_name || "",
          sido: b.region_1depth_name || h.region_1depth_name || "", sgg: b.region_2depth_name || h.region_2depth_name || "",
          dong: b.region_3depth_name || "",
        },
        address: (ad.road_address && ad.road_address.address_name) || (ad.address && ad.address.address_name) || b.address_name || "",
      }, 200, "private, max-age=86400");
    }
    return json({ ok: false, code: "BAD_INPUT", message: "검색어 또는 좌표가 필요합니다." }, 400);
  } catch (e) {
    return json({ ok: false, code: "UPSTREAM_TIMEOUT", message: "검색 응답이 지연되고 있습니다." }, 504);
  }
}

export async function onRequest(context) {
  if (context.request.method === "GET") return onRequestGet(context);
  return new Response("Method Not Allowed", { status: 405 });
}

function push(out, seen, item) {
  if (!isFinite(item.lon) || !isFinite(item.lat)) return;
  const k = item.lon.toFixed(5) + "," + item.lat.toFixed(5);
  if (seen.has(k)) return;
  seen.add(k);
  out.push(item);
}
async function getJSON(url, headers) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 7000);
  try {
    const res = await fetch(url, { headers, signal: ctl.signal });
    let body = null;
    try { body = await res.json(); } catch (e) {}
    return { status: res.status, body };
  } finally { clearTimeout(t); }
}
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
