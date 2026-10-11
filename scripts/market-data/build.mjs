#!/usr/bin/env node
/**
 * 오르비스 상권분석 — 분기 데이터 자동 갱신 스크립트
 * ─────────────────────────────────────────────────────────────
 * GitHub Actions(.github/workflows/market-data.yml)가 주 1회 실행합니다.
 * 새 분기가 공개됐을 때만 데이터를 다시 만들고, 바뀐 파일만 저장소에 커밋합니다.
 * 결과물은 홈페이지와 함께 정적 파일로 배포되므로 방문자 조회 시 API 호출·비용이 없습니다.
 *
 *   data/seoul/index.json        서울 상권 목록(이름·구분·중심좌표·면적) + 업종 코드표
 *   data/seoul/t/{상권코드}.json  상권별 업종 점포·추정매출·유동인구·상주/직장인구·집객시설 + 서울 내 상대 위치(백분위)
 *   data/rone/latest.json        한국부동산원 상업용부동산 임대동향 — 상권별 층별 임대료·공실률 (선택)
 *
 * 환경변수 (GitHub 저장소 → Settings → Secrets and variables → Actions)
 *   SEOUL_API_KEY : 서울 열린데이터광장 인증키 (필수)
 *   REB_API_KEY   : 한국부동산원 R-ONE 오픈API 인증키 (선택)
 *   FORCE=1       : 같은 분기라도 다시 만들기
 *
 * 상권 파일 형식 (data/seoul/t/{상권코드}.json)
 *   u: { 서비스업종코드: [st, sl, ta, ts, p] }
 *     st = [점포수, 유사업종 점포수(=점포+프랜차이즈), 프랜차이즈 점포수, 개업 점포수, 개업률%, 폐업 점포수, 폐업률%]  (최신 분기)
 *     sl = [분기 추정매출(만원), 분기 매출건수, 주중(만원), 주말(만원), 시간대 6구간(만원), 연령대 6구간(만원), 남, 여(만원)] 또는 null
 *     ta = 최근 4분기 추정매출(만원) — qs 순서(최신 → 과거), ts = 같은 분기의 유사업종 점포수
 *     p  = [경쟁 밀도 백분위, 점포당 추정매출 백분위, 폐업률 낮음 백분위] — 서울 전체 상권 중 같은 업종 기준(0~100)
 *   foot·res·wrc·fac = 길단위인구·상주인구·직장인구·집객시설,  p = { foot, pop, fac } 상권 단위 백분위
 *
 * 원천 명세 (실호출로 확인된 사항)
 *   서울: http://openapi.seoul.go.kr:8088/{KEY}/json/{서비스}/{시작}/{끝}/{STDR_YYQU_CD}
 *         1회 최대 1,000건(초과 시 ERROR-336) · 정상 INFO-000 · 미게시 분기 INFO-200
 *         추정매출 THSMON_SELNG_AMT는 이름과 달리 '분기 매출 금액'
 *         유사업종 점포수 SIMILR_INDUTY_STOR_CO = 점포수 + 프랜차이즈 점포수 (개·폐업률의 분모)
 *         상권영역 TbgisTrdarRelm 좌표는 EPSG:5181(중부원점 TM) 중심점
 *   R-ONE: https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do
 *         KEY · STATBL_ID · DTACYCLE_CD=QY · WRTTIME_IDTFR_ID=YYYYQQ(예: 202602) · Type=json · pIndex · pSize≤1000
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(process.env.OUT_DIR || "data");
const SEOUL_KEY = (process.env.SEOUL_API_KEY || "").trim();
const REB_KEY = (process.env.REB_API_KEY || "").trim();
const FORCE = process.env.FORCE === "1" || process.env.FORCE === "true";
const SEOUL_BASE = process.env.SEOUL_API_BASE || "http://openapi.seoul.go.kr:8088";
const RONE_BASE = process.env.RONE_API_BASE || "https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do";
const PAGE = 1000;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ─────────────────────────── 공통 ───────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const n = (v) => { const x = parseFloat(String(v == null ? "" : v).replace(/,/g, "")); return isFinite(x) ? x : 0; };
const r0 = (v) => Math.round(n(v));
const r1 = (v) => Math.round(n(v) * 10) / 10;

async function getJSON(url, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 60000);
      const res = await fetch(url, { signal: ctl.signal, headers: { "User-Agent": "orbis-market-data/1.0" } });
      clearTimeout(t);
      const text = await res.text();
      if (res.status >= 500) throw new Error("HTTP " + res.status);
      try { return JSON.parse(text); } catch (e) { throw new Error("JSON 아님: " + text.slice(0, 160)); }
    } catch (e) {
      last = e;
      await sleep(1500 * (i + 1));
    }
  }
  throw last;
}
const mask = (s) => String(s).replace(SEOUL_KEY || "§", "***").replace(REB_KEY || "§", "***");

// 분기 코드 유틸 (서울: YYYYQ, R-ONE: YYYYQQ)
function quarterNow() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return d.getUTCFullYear() * 10 + (Math.floor(d.getUTCMonth() / 3) + 1);
}
function prevQ(q) { const y = Math.floor(q / 10), k = q % 10; return k === 1 ? (y - 1) * 10 + 4 : y * 10 + k - 1; }
const qDesc = (q) => `${Math.floor(q / 10)}년 ${q % 10}분기`;
const qToRone = (q) => `${Math.floor(q / 10)}0${q % 10}`;

// EPSG:5181(GRS80 · 중부원점 · 원점 38N 127E · 가산 200000/500000) → WGS84 경위도
function tm5181ToWgs84(x, y) {
  const a = 6378137, f = 1 / 298.257222101, k0 = 1, lat0 = 38 * Math.PI / 180, lon0 = 127 * Math.PI / 180, x0 = 200000, y0 = 500000;
  const e2 = 2 * f - f * f, ep2 = e2 / (1 - e2), e4 = e2 * e2, e6 = e4 * e2;
  const M = (p) => a * ((1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * p - (3 * e2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * p) + (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * p) - (35 * e6 / 3072) * Math.sin(6 * p));
  const m = M(lat0) + (y - y0) / k0;
  const mu = m / (a * (1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const p1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const s = Math.sin(p1), c = Math.cos(p1), tn = Math.tan(p1);
  const C1 = ep2 * c * c, T1 = tn * tn, N1 = a / Math.sqrt(1 - e2 * s * s), R1 = a * (1 - e2) / Math.pow(1 - e2 * s * s, 1.5), D = (x - x0) / (N1 * k0);
  const lat = p1 - (N1 * tn / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4 / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6 / 720);
  const lon = lon0 + (D - (1 + 2 * T1 + C1) * D ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5 / 120) / c;
  return [Math.round(lon * 180 / Math.PI * 1e6) / 1e6, Math.round(lat * 180 / Math.PI * 1e6) / 1e6];
}

// 백분위(0~100): 값이 클수록 높음. 동률은 중간 순위.
function percentiles(entries) {
  const vals = entries.map((e) => e[1]).sort((x, y) => x - y);
  const N = vals.length, out = new Map();
  if (!N) return out;
  const lower = (v) => { let lo = 0, hi = N; while (lo < hi) { const mid = (lo + hi) >> 1; if (vals[mid] < v) lo = mid + 1; else hi = mid; } return lo; };
  const upper = (v) => { let lo = 0, hi = N; while (lo < hi) { const mid = (lo + hi) >> 1; if (vals[mid] <= v) lo = mid + 1; else hi = mid; } return lo; };
  for (const [k, v] of entries) {
    const below = lower(v), eq = upper(v) - below;
    out.set(k, N === 1 ? 50 : Math.round(((below + (eq - 1) / 2) / (N - 1)) * 100));
  }
  return out;
}

// ─────────────────────────── 서울 ───────────────────────────
async function seoulPage(service, start, end, q) {
  const url = `${SEOUL_BASE}/${encodeURIComponent(SEOUL_KEY)}/json/${service}/${start}/${end}${q ? "/" + q : ""}`;
  let j;
  try { j = await getJSON(url); } catch (e) { throw new Error(`${service} 호출 실패: ${mask(e.message)}`); }
  const block = j[service];
  if (block) {
    const code = block.RESULT && block.RESULT.CODE;
    if (code && code !== "INFO-000") throw new Error(`${service} 오류 ${code} ${block.RESULT.MESSAGE || ""}`);
    return { total: parseInt(block.list_total_count, 10) || 0, rows: block.row || [] };
  }
  const code = j.RESULT && j.RESULT.CODE;
  if (code === "INFO-200") return { total: 0, rows: [] };
  throw new Error(`${service} 응답 확인 불가: ${code || ""} ${(j.RESULT && j.RESULT.MESSAGE) || JSON.stringify(j).slice(0, 120)}`);
}
async function seoulAll(service, q) {
  const first = await seoulPage(service, 1, PAGE, q);
  let rows = first.rows;
  for (let s = PAGE + 1; s <= first.total; s += PAGE) {
    const p = await seoulPage(service, s, Math.min(s + PAGE - 1, first.total), q);
    rows = rows.concat(p.rows);
    await sleep(60);
  }
  log(`  ${service}${q ? " " + q : ""}: ${rows.length.toLocaleString()}행`);
  return rows;
}
async function seoulLatestQuarter() {
  let q = quarterNow();
  for (let i = 0; i < 8; i++, q = prevQ(q)) {
    const p = await seoulPage("VwsmTrdarSelngQq", 1, 1, q);
    if (p.total > 0) return q;
  }
  throw new Error("최근 2년 안에 공개된 서울 상권 추정매출 분기를 찾지 못했습니다.");
}
// 분기 필터가 없을 수 있는 데이터셋: 분기 지정 → 실패하면 전체를 받아 상권별 최신 분기만 남김
async function seoulLatestPerTrdar(service, q, optional = false) {
  try {
    for (let k = 0, qq = q; k < 4; k++, qq = prevQ(qq)) {
      const rows = await seoulAll(service, qq);
      if (rows.length) return { q: qq, rows };
    }
  } catch (e) {
    log(`  ${service}: 분기 지정 조회 실패 → 전체 조회로 재시도 (${e.message})`);
  }
  try {
    const rows = await seoulAll(service);
    const best = new Map();
    for (const r of rows) {
      const k = String(r.TRDAR_CD), rq = parseInt(r.STDR_YYQU_CD, 10) || 0;
      if (rq <= q && (!best.has(k) || rq > (parseInt(best.get(k).STDR_YYQU_CD, 10) || 0))) best.set(k, r);
    }
    const qs = [...best.values()].map((r) => parseInt(r.STDR_YYQU_CD, 10) || 0);
    return { q: qs.length ? Math.max(...qs) : null, rows: [...best.values()] };
  } catch (e) {
    if (optional) { log(`  ${service}: 건너뜀 (${e.message})`); return { q: null, rows: [] }; }
    throw e;
  }
}

const AGES = ["10", "20", "30", "40", "50", "60_ABOVE"];
const TMS = ["00_06", "06_11", "11_14", "14_17", "17_21", "21_24"];
const DOWS = ["MON", "TUES", "WED", "THUR", "FRI", "SAT", "SUN"];
const pick = (row, keys) => keys.map((k) => r0(row[k]));
const ages = (row, suf) => pick(row, AGES.map((a) => `AGRDE_${a}_${suf}`));
const tms = (row, suf) => pick(row, TMS.map((t) => `TMZON_${t}_${suf}`));
const dows = (row, suf) => pick(row, DOWS.map((d) => `${d}_${suf}`));
const sexes = (row, suf) => pick(row, [`ML_${suf}`, `FML_${suf}`]);
const FAC = {
  PBLOFC_CO: "관공서", BANK_CO: "은행", GNRL_HSPTL_CO: "종합병원", GNRL_CLNC_CO: "일반병원", PARMACY_CO: "약국", KNDRGR_CO: "유치원",
  ELESCH_CO: "초등학교", MSKUL_CO: "중학교", HGSCHL_CO: "고등학교", UNIV_CO: "대학교", DRTS_CO: "백화점", SUPMK_CO: "슈퍼마켓",
  THEAT_CO: "극장", STAYNG_FCLTY_CO: "숙박시설", ARPRT_CO: "공항", RLROAD_STATN_CO: "철도역", BUS_TRMINL_CO: "버스터미널",
  SUBWAY_STATN_CO: "지하철역", BUS_STTN_CO: "버스정류장",
};

async function buildSeoul() {
  if (!SEOUL_KEY) { log("SEOUL_API_KEY 없음 → 서울 데이터 건너뜀"); return { skipped: true }; }
  const dir = path.join(OUT, "seoul");
  const idxPath = path.join(dir, "index.json");
  const prev = fs.existsSync(idxPath) ? JSON.parse(fs.readFileSync(idxPath, "utf8")) : null;

  const q0 = await seoulLatestQuarter();
  log(`서울 최신 공개 분기: ${q0}`);
  if (prev && prev.ready && String(prev.q) === String(q0) && !FORCE) {
    log("이미 최신 분기 데이터입니다. 서울 데이터는 그대로 둡니다.");
    return { skipped: true, q: q0 };
  }
  const qs = [q0, prevQ(q0), prevQ(prevQ(q0)), prevQ(prevQ(prevQ(q0)))];

  log("서울 상권영역");
  const relm = await seoulAll("TbgisTrdarRelm");
  const T = new Map();
  for (const r of relm) {
    const cd = String(r.TRDAR_CD);
    const [lon, lat] = tm5181ToWgs84(n(r.XCNTS_VALUE), n(r.YDNTS_VALUE));
    if (!(lon > 126 && lon < 128 && lat > 37 && lat < 38)) continue;
    T.set(cd, {
      cd, nm: String(r.TRDAR_CD_NM || "").trim(), se: String(r.TRDAR_SE_CD_NM || "").trim(), seCd: String(r.TRDAR_SE_CD || "").trim(),
      gu: String(r.SIGNGU_CD_NM || "").trim(), dong: String(r.ADSTRD_CD_NM || "").trim(), area: r0(r.RELM_AR), lon, lat, u: {},
    });
  }
  if (T.size < 100) throw new Error(`상권영역이 ${T.size}개뿐입니다. 응답 형식을 확인해 주세요.`);
  log(`  유효 상권 ${T.size}개`);

  const induty = {};
  const man = (v) => Math.round(n(v) / 10000);   // 원 → 만원
  log("점포·추정매출 (최근 4분기)");
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    const stor = await seoulAll("VwsmTrdarStorQq", q);
    const sel = await seoulAll("VwsmTrdarSelngQq", q);
    const selBy = new Map(sel.map((r) => [`${r.TRDAR_CD}|${r.SVC_INDUTY_CD}`, r]));
    const touch = (cd, u, nm) => {
      const t = T.get(String(cd));
      if (!t) return null;
      if (nm) induty[u] = String(nm).trim();
      if (!t.u[u]) t.u[u] = { st: null, sl: null, ta: [null, null, null, null], ts: [null, null, null, null] };
      return t.u[u];
    };
    const seen = new Set();
    for (const s of stor) {
      const u = String(s.SVC_INDUTY_CD), e = touch(s.TRDAR_CD, u, s.SVC_INDUTY_CD_NM);
      if (!e) continue;
      const key = `${s.TRDAR_CD}|${u}`;
      seen.add(key);
      const sl = selBy.get(key);
      e.ts[i] = r0(s.SIMILR_INDUTY_STOR_CO);
      e.ta[i] = sl ? man(sl.THSMON_SELNG_AMT) : 0;
      if (i === 0) {
        e.st = [r0(s.STOR_CO), r0(s.SIMILR_INDUTY_STOR_CO), r0(s.FRC_STOR_CO), r0(s.OPBIZ_STOR_CO), r1(s.OPBIZ_RT), r0(s.CLSBIZ_STOR_CO), r1(s.CLSBIZ_RT)];
        if (sl) e.sl = salesDetail(sl);
      }
    }
    for (const sl of sel) {
      const key = `${sl.TRDAR_CD}|${sl.SVC_INDUTY_CD}`;
      if (seen.has(key)) continue;
      const e = touch(sl.TRDAR_CD, String(sl.SVC_INDUTY_CD), sl.SVC_INDUTY_CD_NM);
      if (!e) continue;
      e.ta[i] = man(sl.THSMON_SELNG_AMT);
      if (i === 0) e.sl = salesDetail(sl);
    }
  }

  log("길단위인구·상주인구·직장인구·집객시설");
  const foot = await seoulLatestPerTrdar("VwsmTrdarFlpopQq", q0);
  for (const r of foot.rows) {
    const t = T.get(String(r.TRDAR_CD)); if (!t) continue;
    t.foot = { q: String(r.STDR_YYQU_CD || foot.q), tot: r0(r.TOT_FLPOP_CO), sex: sexes(r, "FLPOP_CO"), age: ages(r, "FLPOP_CO"), tm: tms(r, "FLPOP_CO"), dow: dows(r, "FLPOP_CO") };
  }
  const res = await seoulLatestPerTrdar("VwsmTrdarRepopQq", q0, true);
  for (const r of res.rows) {
    const t = T.get(String(r.TRDAR_CD)); if (!t) continue;
    t.res = { q: String(r.STDR_YYQU_CD || res.q), tot: r0(r.TOT_REPOP_CO), hh: r0(r.TOT_HSHLD_CO), apt: r0(r.APT_HSHLD_CO), sex: sexes(r, "REPOP_CO"), age: ages(r, "REPOP_CO") };
  }
  const wrc = await seoulLatestPerTrdar("VwsmTrdarWrcPopltnQq", q0, true);
  for (const r of wrc.rows) {
    const t = T.get(String(r.TRDAR_CD)); if (!t) continue;
    t.wrc = { q: String(r.STDR_YYQU_CD || wrc.q), tot: r0(r.TOT_WRC_POPLTN_CO), sex: sexes(r, "WRC_POPLTN_CO"), age: ages(r, "WRC_POPLTN_CO") };
  }
  const fac = await seoulLatestPerTrdar("VwsmTrdarFcltyQq", q0, true);
  for (const r of fac.rows) {
    const t = T.get(String(r.TRDAR_CD)); if (!t) continue;
    const items = {};
    for (const k in FAC) if (n(r[k]) > 0) items[FAC[k]] = r0(r[k]);
    t.fac = { q: String(r.STDR_YYQU_CD || fac.q), tot: r0(r.VIATR_FCLTY_CO), items };
  }
  const ix = await seoulLatestPerTrdar("VwsmTrdarIxQq", q0, true);
  for (const r of ix.rows) {
    const t = T.get(String(r.TRDAR_CD)); if (!t) continue;
    const nm = String(r.TRDAR_CHNGE_IX_NM || "").trim();
    if (nm) t.ix = { q: String(r.STDR_YYQU_CD || ix.q), cd: String(r.TRDAR_CHNGE_IX || "").trim(), nm };
  }

  log("서울 내 상대 위치(백분위) 계산");
  const all = [...T.values()];
  const pFoot = percentiles(all.filter((t) => t.foot && t.foot.tot > 0).map((t) => [t.cd, t.foot.tot]));
  const pPop = percentiles(all.filter((t) => (t.res && t.res.tot) || (t.wrc && t.wrc.tot)).map((t) => [t.cd, (t.res ? t.res.tot : 0) + (t.wrc ? t.wrc.tot : 0)]));
  const pFac = percentiles(all.filter((t) => t.fac).map((t) => [t.cd, t.fac.tot]));
  for (const t of all) t.p = { foot: pFoot.get(t.cd) ?? null, pop: pPop.get(t.cd) ?? null, fac: pFac.get(t.cd) ?? null };
  for (const u of Object.keys(induty)) {
    const comp = [], sales = [], stab = [];
    for (const t of all) {
      const e = t.u[u]; if (!e || !e.st) continue;
      const similr = e.st[1];
      if (similr >= 1 && t.area > 0) comp.push([t.cd, similr / (t.area / 1e6)]);
      if (similr >= 1 && e.sl && e.sl[0] > 0) sales.push([t.cd, e.sl[0] / similr]);
      if (similr >= 5) stab.push([t.cd, -e.st[6]]);
    }
    const pc = percentiles(comp), ps = percentiles(sales), pst = percentiles(stab);
    for (const t of all) {
      const e = t.u[u]; if (!e) continue;
      e.p = [pc.get(t.cd) ?? null, ps.get(t.cd) ?? null, pst.get(t.cd) ?? null];
    }
  }

  log("파일 쓰기");
  const tdir = path.join(dir, "t");
  fs.rmSync(tdir, { recursive: true, force: true });
  fs.mkdirSync(tdir, { recursive: true });
  const built = new Date().toISOString();
  const index = {
    v: 1, ready: true, q: String(q0), qDesc: qDesc(q0), qs: qs.map(String), built,
    src: "서울특별시 상권분석서비스(제공: 서울신용보증재단) · 서울 열린데이터광장 · 공공누리 제1유형",
    note: "추정매출(분기)은 카드결제 기반 추정치이며 실제 매출과 다를 수 있습니다.",
    induty,
    fields: ["cd", "nm", "se", "gu", "lon", "lat", "areaM2"],
    t: all.map((t) => [t.cd, t.nm, t.se, t.gu, t.lon, t.lat, t.area]),
  };
  let bytes = 0;
  for (const t of all) {
    const u = {};
    for (const k in t.u) {
      const e = t.u[k];
      const empty = !e.sl && (!e.st || e.st[1] === 0) && e.ta.every((v) => !v) && e.ts.every((v) => !v);
      if (!empty) u[k] = [e.st, e.sl, e.ta, e.ts, e.p];
    }
    const body = { v: 1, q: String(q0), qDesc: qDesc(q0), qs: qs.map(String), cd: t.cd, nm: t.nm, se: t.se, gu: t.gu, dong: t.dong, area: t.area, lon: t.lon, lat: t.lat,
      foot: t.foot || null, res: t.res || null, wrc: t.wrc || null, fac: t.fac || null, ix: t.ix || null, p: t.p, u };
    const s = JSON.stringify(body);
    bytes += s.length;
    fs.writeFileSync(path.join(tdir, `${t.cd}.json`), s);
  }
  fs.writeFileSync(idxPath, JSON.stringify(index));
  log(`  상권 파일 ${all.length}개 · 약 ${(bytes / 1048576).toFixed(1)}MB · 업종 ${Object.keys(induty).length}종`);
  return { q: q0, count: all.length };
}

function salesDetail(r) {
  const m = (v) => Math.round(n(v) / 10000);
  return [m(r.THSMON_SELNG_AMT), r0(r.THSMON_SELNG_CO), m(r.MDWK_SELNG_AMT), m(r.WKEND_SELNG_AMT),
    ...TMS.map((t) => m(r[`TMZON_${t}_SELNG_AMT`])), ...AGES.map((a) => m(r[`AGRDE_${a}_SELNG_AMT`])), m(r.ML_SELNG_AMT), m(r.FML_SELNG_AMT)];
}

// ─────────────────────────── 한국부동산원 R-ONE ───────────────────────────
// 2024년 3분기~ 시리즈의 통계표 ID (실호출 확인값). 층별 임대료·효용비율 표와 지역별 공실률 표.
const RONE_TABLES = {
  중대형상가: { floor: "T241873134863890", vacancy: "T249633134845544" },
  소규모상가: { floor: "T246233134891629", vacancy: "T241833134686576" },
  집합상가: { floor: "T249023134703697", vacancy: "T243283134931290" },
};
async function ronePage(statbl, qid, page, size = PAGE) {
  const url = `${RONE_BASE}?KEY=${encodeURIComponent(REB_KEY)}&Type=json&pIndex=${page}&pSize=${size}&STATBL_ID=${statbl}&DTACYCLE_CD=QY&WRTTIME_IDTFR_ID=${qid}`;
  let j;
  try { j = await getJSON(url); } catch (e) { throw new Error(`R-ONE 호출 실패: ${mask(e.message)}`); }
  const env = j.SttsApiTblData;
  if (!Array.isArray(env)) {
    const code = j.RESULT && j.RESULT.CODE;
    if (code === "INFO-200") return { total: 0, rows: [] };
    throw new Error(`R-ONE 응답 확인 불가: ${code || JSON.stringify(j).slice(0, 120)}`);
  }
  let total = 0, code = "";
  for (const h of (env[0] && env[0].head) || []) {
    if (h.list_total_count != null) total = parseInt(h.list_total_count, 10) || 0;
    if (h.RESULT) code = h.RESULT.CODE;
  }
  if (code && code !== "INFO-000") {
    if (code === "INFO-200") return { total: 0, rows: [] };
    throw new Error(`R-ONE 오류 ${code}`);
  }
  return { total, rows: (env[1] && env[1].row) || [] };
}
async function roneAll(statbl, qid) {
  const first = await ronePage(statbl, qid, 1);
  let rows = first.rows;
  for (let p = 2; (p - 1) * PAGE < first.total && p <= 10; p++) rows = rows.concat((await ronePage(statbl, qid, p)).rows);
  return rows;
}
function floorKey(cls) {
  const s = String(cls || "").replace(/\s/g, "");
  if (/지하/.test(s)) return "-1";
  if (/6층이상|6층~|6층초과/.test(s)) return "6+";
  const m = s.match(/^(\d+)층/);
  return m ? m[1] : null;
}
async function buildRone() {
  if (!REB_KEY) { log("REB_API_KEY 없음 → 부동산원 임대동향 건너뜀"); return { skipped: true }; }
  const dir = path.join(OUT, "rone");
  const p = path.join(dir, "latest.json");
  const prev = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
  let q = quarterNow(), qid = null;
  for (let i = 0; i < 6; i++, q = prevQ(q)) {
    const t = await ronePage(RONE_TABLES["중대형상가"].floor, qToRone(q), 1, 1);
    if (t.total > 0) { qid = qToRone(q); break; }
  }
  if (!qid) throw new Error("최근 공개된 임대동향 분기를 찾지 못했습니다.");
  log(`부동산원 최신 공개 분기: ${qid}`);
  if (prev && prev.ready && prev.q === qid && !FORCE) { log("이미 최신 분기 데이터입니다."); return { skipped: true, q: qid }; }

  const types = {};
  let desc = "", unit = "천원/㎡";
  for (const [type, ids] of Object.entries(RONE_TABLES)) {
    const floor = await roneAll(ids.floor, qid);
    const vac = await roneAll(ids.vacancy, qid).catch((e) => { log(`  ${type} 공실률: ${e.message}`); return []; });
    const by = new Map();
    for (const r of floor) {
      const full = String(r.GRP_FULLNM || r.GRP_NM || "").trim();
      if (!full) continue;
      desc = desc || String(r.WRTTIME_DESC || "");
      if (!by.has(full)) by.set(full, { full, nm: String(r.GRP_NM || full.split(">").pop()).trim(), rent: {}, util: {}, vac: null });
      const e = by.get(full), k = floorKey(r.CLS_NM), item = String(r.ITM_NM || "").trim(), v = parseFloat(r.DTA_VAL);
      if (!k || !isFinite(v) || v <= 0) continue;
      if (item === "임대료") { e.rent[k] = Math.round(v * 100) / 100; if (r.UI_NM) unit = String(r.UI_NM); }
      else if (item === "효용비율") e.util[k] = Math.round(v * 10) / 10;
    }
    const names = new Map();
    for (const e of by.values()) names.set(e.nm, (names.get(e.nm) || 0) + 1);
    for (const r of vac) {
      const v = parseFloat(r.DTA_VAL);
      if (!isFinite(v)) continue;
      const full = String(r.GRP_FULLNM || r.CLS_FULLNM || "").trim();
      const nm = String(r.CLS_NM || r.GRP_NM || "").trim();
      const target = (full && by.get(full)) || (nm && names.get(nm) === 1 ? [...by.values()].find((e) => e.nm === nm) : null);
      if (target) target.vac = Math.round(v * 10) / 10;
    }
    types[type] = [...by.values()].filter((e) => Object.keys(e.rent).length).sort((a, b) => a.full.localeCompare(b.full, "ko"));
    log(`  ${type}: 조사 상권 ${types[type].length}건`);
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify({
    v: 1, ready: true, q: qid, desc: desc || `${qid.slice(0, 4)}년 ${+qid.slice(4)}분기`, built: new Date().toISOString(), unit,
    src: "한국부동산원 상업용부동산 임대동향조사(R-ONE) · 표본조사 통계",
    note: "층별 임대료는 조사 상권의 표본 평균이며, 개별 점포의 임대료와 다를 수 있습니다.",
    types,
  }));
  return { q: qid };
}

// ─────────────────────────── 실행 ───────────────────────────
const result = { started: new Date().toISOString() };
let failed = false;
try { result.seoul = await buildSeoul(); } catch (e) { failed = true; result.seoul = { error: mask(e.message) }; log("서울 데이터 실패:", mask(e.message)); }
try { result.rone = await buildRone(); } catch (e) { result.rone = { error: mask(e.message) }; log("부동산원 데이터 실패(선택 항목):", mask(e.message)); }
log("완료", JSON.stringify(result));
if (failed && SEOUL_KEY) process.exitCode = 1;

export { tm5181ToWgs84, percentiles, floorKey };
