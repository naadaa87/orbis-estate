/**
 * ORBIS 방문 통계 수집 — Cloudflare Pages Functions
 * 경로: POST /api/t   (app.js가 페이지마다 보냅니다)
 *
 * 관리자 화면 → KPI 현황에서 보는 숫자의 원천입니다. 상담 접수와 같은 D1 데이터베이스(DB)에 저장합니다.
 *  - pv : 페이지를 한 번 볼 때마다 한 줄 (머문 시간·스크롤 깊이는 페이지를 떠날 때 채움)
 *  - ev : 버튼·링크 클릭, 양식 작성 시작·접수, 전화 버튼 같은 행동
 *
 * 개인을 알아볼 수 있는 정보는 저장하지 않습니다.
 *  - IP 주소는 저장하지 않고 국가 코드만 남깁니다.
 *  - 방문자 구분은 브라우저에 만든 임의 번호(localStorage)로만 합니다.
 *  - 보관 기간은 13개월이고, 지난 기록은 자동으로 지웁니다.
 */
import { leadDb } from './lead.js';

export const STATS_RETENTION_DAYS = 400;
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS pv (id TEXT PRIMARY KEY, ts TEXT NOT NULL, day TEXT NOT NULL, hour INTEGER NOT NULL, dow INTEGER NOT NULL, vid TEXT NOT NULL, sid TEXT NOT NULL, entry INTEGER NOT NULL DEFAULT 0, is_new INTEGER NOT NULL DEFAULT 0, path TEXT NOT NULL, title TEXT, ref TEXT, channel TEXT, src TEXT, campaign TEXT, device TEXT, browser TEXT, os TEXT, country TEXT, dur INTEGER NOT NULL DEFAULT 0, scroll INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS pv_day ON pv(day)`,
  `CREATE INDEX IF NOT EXISTS pv_sid ON pv(sid)`,
  `CREATE TABLE IF NOT EXISTS ev (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, day TEXT NOT NULL, pv_id TEXT, vid TEXT, sid TEXT, path TEXT, name TEXT NOT NULL, label TEXT, target TEXT)`,
  `CREATE INDEX IF NOT EXISTS ev_day ON ev(day, name)`,
];
let schemaReady = false;
export async function ensureStatsSchema(db) {
  if (schemaReady) return;
  await db.batch(SCHEMA.map((s) => db.prepare(s)));
  schemaReady = true;
}

const ID = /^[a-z0-9]{6,24}$/;
const EV_NAME = /^[a-z][a-z0-9_]{1,39}$/;
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pagespeed|gtmetrix|python|curl|wget|httpclient|axios|node-fetch|go-http|java\/|okhttp|phantom|selenium|puppeteer|playwright|yeti|daumoa|scrapy|semrush|ahrefs|mj12|petal|bytespider|gptbot|claude|perplexity|preview/i;
const nocontent = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
const cut = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

// 같은 IP에서 짧은 시간에 너무 많이 들어오는 요청은 버립니다 (서버 한 대 안에서만 세는 간이 장치)
const hits = new Map();
function tooMany(ip) {
  if (!ip) return false;
  const m = Math.floor(Date.now() / 60000);
  const k = ip + '|' + m;
  const n = (hits.get(k) || 0) + 1; hits.set(k, n);
  if (hits.size > 5000) for (const key of hits.keys()) { if (!key.endsWith('|' + m)) hits.delete(key); }
  return n > 150;
}

function kstNow(now = new Date()) {
  const k = new Date(now.getTime() + 9 * 3600e3);
  return { day: k.toISOString().slice(0, 10), hour: k.getUTCHours(), dow: k.getUTCDay() };
}

// 주소 정리: /about.html → /about, 끝 슬래시 제거
export function cleanPath(p) {
  let s = cut(p, 200).split(/[?#]/)[0] || '/';
  if (!s.startsWith('/')) s = '/' + s;
  s = s.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
  if (s.length > 1) s = s.replace(/\/+$/, '');
  return s || '/';
}

const SEARCH = [
  [/(^|\.)search\.naver\.com$|(^|\.)m\.search\.naver\.com$|^naver\.com$|^www\.naver\.com$|^m\.naver\.com$/, '네이버'],
  [/(^|\.)google\.[a-z.]+$/, '구글'],
  [/(^|\.)daum\.net$|(^|\.)search\.daum\.net$/, '다음'],
  [/(^|\.)bing\.com$/, '빙'],
  [/(^|\.)zum\.com$/, '줌'],
  [/(^|\.)yahoo\.[a-z.]+$/, '야후'],
  [/(^|\.)duckduckgo\.com$/, '덕덕고'],
  [/(^|\.)ecosia\.org$/, '에코시아'],
  [/(^|\.)baidu\.com$/, '바이두'],
];
const SOCIAL = [
  [/(^|\.)blog\.naver\.com$/, '네이버 블로그'],
  [/(^|\.)cafe\.naver\.com$/, '네이버 카페'],
  [/(^|\.)band\.us$/, '밴드'],
  [/(^|\.)kakao\.com$|(^|\.)kakaocdn\.net$|(^|\.)daum\.cf$/, '카카오'],
  [/(^|\.)instagram\.com$/, '인스타그램'],
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)fb\.me$/, '페이스북'],
  [/(^|\.)threads\.(net|com)$/, '스레드'],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, '유튜브'],
  [/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/, '링크드인'],
  [/(^|\.)t\.co$|(^|\.)twitter\.com$|(^|\.)x\.com$/, 'X(트위터)'],
  [/(^|\.)tistory\.com$/, '티스토리'],
  [/(^|\.)brunch\.co\.kr$/, '브런치'],
];
const AI = [[/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, 'ChatGPT'], [/(^|\.)perplexity\.ai$/, '퍼플렉시티'], [/(^|\.)claude\.ai$/, 'Claude'], [/(^|\.)gemini\.google\.com$/, '제미나이'], [/(^|\.)copilot\.microsoft\.com$/, '코파일럿']];

// 유입 채널: 검색 · SNS·커뮤니티 · AI 답변 · 다른 사이트 · 광고·캠페인 · 직접 방문
export function classify(ref, ownHost, utm, ua) {
  const us = cut(utm.us, 60).toLowerCase();
  const um = cut(utm.um, 60).toLowerCase();
  const uc = cut(utm.uc, 80);
  if (us) {
    const paid = /cpc|ppc|paid|ad|display|banner|광고/.test(um);
    return { channel: paid ? '광고' : '캠페인', src: us, campaign: uc || um, ref: '' };
  }
  let host = '';
  try { host = ref ? new URL(ref).hostname.toLowerCase().replace(/^www\./, '') : ''; } catch (e) { host = ''; }
  const own = ownHost.replace(/^www\./, '');
  if (host && (host === own || host.endsWith('.pages.dev') || host === 'localhost')) return { channel: '내부 이동', src: '', campaign: '', ref: '' };
  if (!host) {
    // 앱 안에서 연 링크는 출처가 비어 있어 브라우저 정보로 구분합니다
    if (/KAKAOTALK/i.test(ua)) return { channel: 'SNS·커뮤니티', src: '카카오톡', campaign: '', ref: '' };
    if (/Instagram/i.test(ua)) return { channel: 'SNS·커뮤니티', src: '인스타그램', campaign: '', ref: '' };
    if (/FBAN|FBAV/i.test(ua)) return { channel: 'SNS·커뮤니티', src: '페이스북', campaign: '', ref: '' };
    if (/BAND\//i.test(ua)) return { channel: 'SNS·커뮤니티', src: '밴드', campaign: '', ref: '' };
    return { channel: '직접 방문', src: '', campaign: '', ref: '' };
  }
  for (const [re, name] of SOCIAL) if (re.test(host)) return { channel: 'SNS·커뮤니티', src: name, campaign: '', ref: host };
  for (const [re, name] of SEARCH) if (re.test(host)) return { channel: '검색', src: name, campaign: '', ref: host };
  for (const [re, name] of AI) if (re.test(host)) return { channel: 'AI 답변', src: name, campaign: '', ref: host };
  return { channel: '다른 사이트', src: host, campaign: '', ref: host };
}

export function parseUA(ua) {
  let device = 'PC';
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) device = '태블릿';
  else if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua)) device = '모바일';
  let browser = '기타';
  if (/KAKAOTALK/i.test(ua)) browser = '카카오톡';
  else if (/NAVER\(inapp/i.test(ua)) browser = '네이버 앱';
  else if (/Instagram/i.test(ua)) browser = '인스타그램';
  else if (/SamsungBrowser/i.test(ua)) browser = '삼성 인터넷';
  else if (/Whale/i.test(ua)) browser = '웨일';
  else if (/Edg\//i.test(ua)) browser = '엣지';
  else if (/Firefox|FxiOS/i.test(ua)) browser = '파이어폭스';
  else if (/CriOS|Chrome/i.test(ua)) browser = '크롬';
  else if (/Safari/i.test(ua)) browser = '사파리';
  let os = '기타';
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = '안드로이드';
  else if (/Windows/i.test(ua)) os = '윈도우';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = '리눅스';
  return { device, browser, os };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  // 미리보기 주소(pages.dev)에서 들어온 방문은 세지 않습니다
  if (url.hostname.endsWith('.pages.dev') && !env.STATS_ALLOW_PREVIEW) return nocontent();
  const ua = request.headers.get('User-Agent') || '';
  if (!ua || BOT.test(ua)) return nocontent();
  const origin = request.headers.get('Origin') || request.headers.get('Referer') || '';
  let oh = ''; try { oh = new URL(origin).hostname; } catch (e) {}
  if (!oh || oh !== url.hostname) return nocontent();
  if (tooMany(request.headers.get('CF-Connecting-IP') || '')) return nocontent();

  let d;
  try { const t = await request.text(); if (t.length > 4000) return nocontent(); d = JSON.parse(t); } catch (e) { return nocontent(); }
  if (!d || typeof d !== 'object') return nocontent();
  const db = leadDb(env); if (!db) return nocontent();
  const pid = String(d.p || '');
  if (!ID.test(pid)) return nocontent();

  const now = new Date();
  const ts = now.toISOString();
  const k = kstNow(now);
  try {
    await ensureStatsSchema(db);
    if (d.t === 'pv') {
      const vid = String(d.v || ''); const sid = String(d.s || '');
      if (!ID.test(vid) || !ID.test(sid)) return nocontent();
      const src = classify(cut(d.r, 400), url.hostname, { us: d.us, um: d.um, uc: d.uc }, ua);
      if (d.e && src.channel === '내부 이동') src.channel = '직접 방문'; // 오래 쉬었다가 이어 본 경우
      const u = parseUA(ua);
      const title = cut(d.ti, 140);
      await db.prepare('INSERT OR IGNORE INTO pv (id, ts, day, hour, dow, vid, sid, entry, is_new, path, title, ref, channel, src, campaign, device, browser, os, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(pid, ts, k.day, k.hour, k.dow, vid, sid, d.e ? 1 : 0, d.n ? 1 : 0, cleanPath(d.u), title, src.ref, src.channel, cut(src.src, 80), cut(src.campaign, 80), u.device, u.browser, u.os, cut(request.headers.get('CF-IPCountry') || '', 4))
        .run();
      if (Math.random() < 0.01) {
        const cutoff = new Date(now.getTime() - STATS_RETENTION_DAYS * 864e5);
        const cd = kstNow(cutoff).day;
        context.waitUntil(db.batch([db.prepare('DELETE FROM pv WHERE day < ?').bind(cd), db.prepare('DELETE FROM ev WHERE day < ?').bind(cd)]).catch(() => {}));
      }
    } else if (d.t === 'end') {
      const dur = Math.max(0, Math.min(1800000, parseInt(d.d, 10) || 0));
      const sc = Math.max(0, Math.min(100, parseInt(d.sc, 10) || 0));
      await db.prepare('UPDATE pv SET dur = MAX(dur, ?), scroll = MAX(scroll, ?) WHERE id = ?').bind(dur, sc, pid).run();
    } else if (d.t === 'ev') {
      const name = String(d.e || '');
      const vid = String(d.v || ''); const sid = String(d.s || '');
      if (!EV_NAME.test(name) || !ID.test(vid) || !ID.test(sid)) return nocontent();
      await db.prepare('INSERT INTO ev (ts, day, pv_id, vid, sid, path, name, label, target) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(ts, k.day, pid, vid, sid, cleanPath(d.u), name, cut(d.lb, 80), cut(d.h, 200))
        .run();
    }
  } catch (e) {
    console.log('stats_error', e && e.message);
  }
  return nocontent();
}

export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context);
  return new Response('Method Not Allowed', { status: 405 });
}

// ================================================================ KPI 집계 (관리자 화면 → KPI 현황)
// 관리자 API(/api/admin/kpi)가 불러 씁니다. 여기서는 숫자만 계산하고, 로그인 확인은 관리자 API가 합니다.
const NEWS = '뉴스레터 구독';
const LEADQ = `status != 'spam' AND type != '${NEWS}'`;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
function dayAdd(day, n) { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function dayDiff(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5); }
const kstStartUtc = (day) => new Date(Date.parse(day + 'T00:00:00+09:00')).toISOString();

export function resolveRange(q = {}) {
  const today = kstNow().day;
  let range = String(q.range || '7d'); let f; let t;
  if (range === 'today') { f = t = today; }
  else if (range === 'yesterday') { f = t = dayAdd(today, -1); }
  else if (range === '30d') { f = dayAdd(today, -29); t = today; }
  else if (range === '90d') { f = dayAdd(today, -89); t = today; }
  else if (range === 'month') { f = today.slice(0, 8) + '01'; t = today; }
  else if (range === 'lastmonth') { t = dayAdd(today.slice(0, 8) + '01', -1); f = t.slice(0, 8) + '01'; }
  else if (range === 'custom' && DAY.test(q.from || '') && DAY.test(q.to || '')) {
    f = q.from; t = q.to; if (f > t) [f, t] = [t, f];
    if (t > today) t = today;
    if (dayDiff(f, t) > STATS_RETENTION_DAYS) f = dayAdd(t, -STATS_RETENTION_DAYS);
  } else { range = '7d'; f = dayAdd(today, -6); t = today; }
  const days = dayDiff(f, t) + 1;
  const pto = dayAdd(f, -1); const pfrom = dayAdd(f, -days);
  return { range, from: f, to: t, days, today, pfrom, pto,
    u: [kstStartUtc(f), kstStartUtc(dayAdd(t, 1))], pu: [kstStartUtc(pfrom), kstStartUtc(f)] };
}

function summaryStmts(db, a, u) {
  const S = (sql, ...args) => db.prepare(sql).bind(...args);
  return [
    S('SELECT COUNT(*) AS pv, COUNT(DISTINCT vid) AS visitors, COUNT(DISTINCT sid) AS sessions, COUNT(DISTINCT CASE WHEN is_new = 1 THEN vid END) AS new_visitors FROM pv WHERE day BETWEEN ? AND ?', ...a),
    S('SELECT COUNT(*) AS sessions, SUM(CASE WHEN n >= 2 OR d >= 10000 THEN 1 ELSE 0 END) AS engaged, AVG(d) AS avg_dur FROM (SELECT sid, COUNT(*) AS n, SUM(dur) AS d FROM pv WHERE day BETWEEN ? AND ? GROUP BY sid)', ...a),
    S("SELECT name, COUNT(*) AS n, COUNT(DISTINCT sid) AS s FROM ev WHERE day BETWEEN ? AND ? GROUP BY name", ...a),
    S(`SELECT COUNT(*) AS n FROM leads WHERE ${LEADQ} AND created_at >= ? AND created_at < ?`, ...u),
    S(`SELECT COUNT(*) AS n FROM leads WHERE type = '${NEWS}' AND status != 'spam' AND created_at >= ? AND created_at < ?`, ...u),
  ];
}
function shapeSummary(r) {
  const a = r[0].results[0] || {}; const b = r[1].results[0] || {};
  const ev = {}; for (const x of r[2].results) ev[x.name] = { n: x.n, s: x.s };
  const g = (k) => (ev[k] ? ev[k].n : 0); const gs = (k) => (ev[k] ? ev[k].s : 0);
  const sessions = b.sessions || 0;
  return {
    visitors: a.visitors || 0, new_visitors: a.new_visitors || 0, sessions, pageviews: a.pv || 0,
    engaged: b.engaged || 0, avg_dur: Math.round(b.avg_dur || 0),
    clicks: g('click'), phone: g('click_phone'), phone_s: gs('click_phone'), kakao: g('click_kakao'),
    form_start_s: gs('form_start'), form_submit_s: gs('form_submit'),
    leads: r[3].results[0]?.n || 0, subscribers: r[4].results[0]?.n || 0,
    events: Object.fromEntries(Object.entries(ev).filter(([k]) => k !== 'click')),
  };
}

export async function computeKpi(db, q = {}) {
  await ensureStatsSchema(db);
  const R = resolveRange(q);
  const A = [R.from, R.to];
  const S = (sql, ...args) => db.prepare(sql).bind(...args);
  const stmts = [...summaryStmts(db, A, R.u), ...summaryStmts(db, [R.pfrom, R.pto], R.pu)];
  const out = { ok: true, range: R };
  if (q.lite) {
    const r = await db.batch(stmts);
    out.summary = { cur: shapeSummary(r.slice(0, 5)), prev: shapeSummary(r.slice(5, 10)) };
    return out;
  }
  const hourly = R.days === 1;
  const conv = `LEFT JOIN (SELECT sid, MAX(name = 'form_submit') AS f, MAX(name IN ('click_phone', 'click_kakao')) AS c FROM ev WHERE day BETWEEN ? AND ? AND name IN ('form_submit', 'click_phone', 'click_kakao') GROUP BY sid) c ON c.sid = p.sid`;
  const live = new Date(Date.now() - 5 * 60e3).toISOString();
  const yday = dayAdd(R.today, -1);
  const stale = new Date(Date.now() - 24 * 3600e3).toISOString();
  const more = [
    // 10 추이
    hourly ? S('SELECT hour AS k, COUNT(*) AS pv, COUNT(DISTINCT vid) AS v, COUNT(DISTINCT sid) AS s FROM pv WHERE day BETWEEN ? AND ? GROUP BY hour', ...A)
      : S('SELECT day AS k, COUNT(*) AS pv, COUNT(DISTINCT vid) AS v, COUNT(DISTINCT sid) AS s FROM pv WHERE day BETWEEN ? AND ? GROUP BY day', ...A),
    hourly ? S(`SELECT CAST(strftime('%H', created_at, '+9 hours') AS INTEGER) AS k, COUNT(*) AS n FROM leads WHERE ${LEADQ} AND created_at >= ? AND created_at < ? GROUP BY k`, ...R.u)
      : S(`SELECT strftime('%Y-%m-%d', created_at, '+9 hours') AS k, COUNT(*) AS n FROM leads WHERE ${LEADQ} AND created_at >= ? AND created_at < ? GROUP BY k`, ...R.u),
    // 12 페이지
    S('SELECT path, MAX(title) AS title, COUNT(*) AS pv, COUNT(DISTINCT vid) AS v, SUM(entry) AS entries, AVG(CASE WHEN dur > 0 THEN dur END) AS dur, AVG(CASE WHEN scroll > 0 THEN scroll END) AS sc FROM pv WHERE day BETWEEN ? AND ? GROUP BY path ORDER BY pv DESC LIMIT 40', ...A),
    S("SELECT path, MAX(title) AS title, COUNT(*) AS pv, COUNT(DISTINCT vid) AS v, AVG(CASE WHEN dur > 0 THEN dur END) AS dur, AVG(CASE WHEN scroll > 0 THEN scroll END) AS sc FROM pv WHERE day BETWEEN ? AND ? AND path LIKE '/insights/%' GROUP BY path ORDER BY pv DESC LIMIT 20", ...A),
    // 14 클릭
    S("SELECT label, target, COUNT(*) AS n, COUNT(DISTINCT sid) AS s FROM ev WHERE day BETWEEN ? AND ? AND name = 'click' AND label != '' GROUP BY label, target ORDER BY n DESC LIMIT 25", ...A),
    // 15 채널 (방문 시작 기준) + 전환
    S(`SELECT p.channel AS channel, COUNT(*) AS n, SUM(COALESCE(c.f, 0)) AS forms, SUM(COALESCE(c.c, 0)) AS calls FROM pv p ${conv} WHERE p.day BETWEEN ? AND ? AND p.entry = 1 GROUP BY p.channel ORDER BY n DESC`, ...A, ...A),
    S("SELECT channel, src, COUNT(*) AS n FROM pv WHERE day BETWEEN ? AND ? AND entry = 1 AND src != '' GROUP BY channel, src ORDER BY n DESC LIMIT 20", ...A),
    S("SELECT src, campaign, COUNT(*) AS n FROM pv WHERE day BETWEEN ? AND ? AND entry = 1 AND channel IN ('캠페인', '광고') GROUP BY src, campaign ORDER BY n DESC LIMIT 15", ...A),
    // 18 첫 페이지(랜딩)
    S(`SELECT p.path AS path, MAX(p.title) AS title, COUNT(*) AS n, SUM(CASE WHEN s.n >= 2 OR s.d >= 10000 THEN 1 ELSE 0 END) AS eng, SUM(COALESCE(c.f, 0)) AS forms, SUM(COALESCE(c.c, 0)) AS calls
       FROM pv p JOIN (SELECT sid, COUNT(*) AS n, SUM(dur) AS d FROM pv WHERE day BETWEEN ? AND ? GROUP BY sid) s ON s.sid = p.sid ${conv}
       WHERE p.day BETWEEN ? AND ? AND p.entry = 1 GROUP BY p.path ORDER BY n DESC LIMIT 15`, ...A, ...A, ...A),
    // 19 기기·브라우저·국가
    S('SELECT device AS k, COUNT(DISTINCT sid) AS n FROM pv WHERE day BETWEEN ? AND ? GROUP BY device ORDER BY n DESC', ...A),
    S('SELECT browser AS k, COUNT(DISTINCT sid) AS n FROM pv WHERE day BETWEEN ? AND ? GROUP BY browser ORDER BY n DESC LIMIT 8', ...A),
    S('SELECT country AS k, COUNT(DISTINCT vid) AS n FROM pv WHERE day BETWEEN ? AND ? GROUP BY country ORDER BY n DESC LIMIT 8', ...A),
    // 22 요일·시간
    S('SELECT dow, hour, COUNT(*) AS n FROM pv WHERE day BETWEEN ? AND ? AND entry = 1 GROUP BY dow, hour', ...A),
    // 23 문의
    S(`SELECT type AS k, COUNT(*) AS n FROM leads WHERE ${LEADQ} AND created_at >= ? AND created_at < ? GROUP BY type ORDER BY n DESC`, ...R.u),
    S(`SELECT status AS k, COUNT(*) AS n FROM leads WHERE ${LEADQ} AND created_at >= ? AND created_at < ? GROUP BY status`, ...R.u),
    S(`SELECT page AS k, COUNT(*) AS n FROM leads WHERE ${LEADQ} AND created_at >= ? AND created_at < ? GROUP BY page ORDER BY n DESC LIMIT 20`, ...R.u),
    S(`SELECT COUNT(*) AS n FROM leads WHERE ${LEADQ} AND status = 'new' AND created_at < ?`, stale),
    S(`SELECT COUNT(*) AS n FROM leads WHERE ${LEADQ} AND status IN ('new', 'contacted', 'progress')`),
    // 28 실시간 · 수집 시작일
    S('SELECT COUNT(DISTINCT vid) AS n FROM (SELECT vid FROM pv WHERE day >= ? AND ts > ? UNION ALL SELECT vid FROM ev WHERE day >= ? AND ts > ?)', yday, live, yday, live),
    S('SELECT MIN(day) AS d FROM pv'),
  ];
  const r = await db.batch([...stmts, ...more]);
  const rows = (i) => r[i].results;
  const summary = { cur: shapeSummary(r.slice(0, 5)), prev: shapeSummary(r.slice(5, 10)) };

  // 빈 날·빈 시간도 0으로 채워 돌려줍니다
  const keys = hourly ? Array.from({ length: 24 }, (_, i) => i) : Array.from({ length: R.days }, (_, i) => dayAdd(R.from, i));
  const tm = new Map(rows(10).map((x) => [x.k, x])); const lm = new Map(rows(11).map((x) => [x.k, x.n]));
  out.trend = { unit: hourly ? 'hour' : 'day', points: keys.map((k) => ({ k, pv: tm.get(k)?.pv || 0, v: tm.get(k)?.v || 0, s: tm.get(k)?.s || 0, leads: lm.get(k) || 0 })) };
  const dur = (x) => (x == null ? null : Math.round(x));
  out.pages = rows(12).map((x) => ({ ...x, dur: dur(x.dur), sc: dur(x.sc) }));
  out.insights = rows(13).map((x) => ({ ...x, dur: dur(x.dur), sc: dur(x.sc) }));
  out.clicks = rows(14);
  out.channels = rows(15);
  out.sources = rows(16); out.campaigns = rows(17); out.landing = rows(18);
  out.devices = rows(19); out.browsers = rows(20); out.countries = rows(21);
  out.heat = rows(22);
  out.leads = { by_type: rows(23), by_status: rows(24), by_page: rows(25), stale_new: rows(26)[0]?.n || 0, open: rows(27)[0]?.n || 0 };
  out.live = rows(28)[0]?.n || 0;
  out.since = rows(29)[0]?.d || null;
  out.summary = summary;
  return out;
}

// 회원·구독자: 홈페이지에 로그인 회원가입이 없어서 뉴스레터 구독자와 문의 고객(연락처 기준 중복 제거)을 명부로 씁니다
const PH = "replace(replace(replace(replace(replace(replace(phone, '-', ''), ' ', ''), '.', ''), '(', ''), ')', ''), '+82', '0')";
const CUST = `WITH c AS (SELECT CASE WHEN length(${PH}) >= 8 THEN ${PH} ELSE lower(trim(email)) END AS k, id, created_at, name, phone, email, type, status FROM leads WHERE ${LEADQ}),
  g AS (SELECT k, COUNT(*) AS n, MIN(created_at) AS first FROM c WHERE k != '' GROUP BY k),
  l AS (SELECT c.*, ROW_NUMBER() OVER (PARTITION BY k ORDER BY created_at DESC) AS rn FROM c WHERE k != '')`;
export async function computeMembers(db, q = {}) {
  await ensureStatsSchema(db);
  const R = resolveRange(q);
  const S = (sql, ...args) => db.prepare(sql).bind(...args);
  const lim = q.all ? 10000 : 300;
  const r = await db.batch([
    S(`SELECT lower(trim(email)) AS email, MIN(created_at) AS first, MAX(created_at) AS last, COUNT(*) AS n, MAX(id) AS id FROM leads WHERE type = '${NEWS}' AND status != 'spam' AND trim(email) != '' GROUP BY lower(trim(email)) ORDER BY first DESC LIMIT ?`, lim),
    S(`SELECT COUNT(*) AS total, SUM(CASE WHEN first >= ? AND first < ? THEN 1 ELSE 0 END) AS fresh FROM (SELECT MIN(created_at) AS first FROM leads WHERE type = '${NEWS}' AND status != 'spam' AND trim(email) != '' GROUP BY lower(trim(email)))`, ...R.u),
    S(`${CUST} SELECT l.id, l.created_at AS last, l.name, l.phone, l.email, l.type, l.status, g.n, g.first FROM l JOIN g ON g.k = l.k WHERE l.rn = 1 ORDER BY l.created_at DESC LIMIT ?`, lim),
    S(`${CUST} SELECT COUNT(*) AS total, SUM(CASE WHEN first >= ? AND first < ? THEN 1 ELSE 0 END) AS fresh, SUM(CASE WHEN n >= 2 THEN 1 ELSE 0 END) AS repeat FROM g`, ...R.u),
  ]);
  const a = r[1].results[0] || {}; const b = r[3].results[0] || {};
  return {
    ok: true, range: R,
    subscribers: { total: a.total || 0, fresh: a.fresh || 0, list: r[0].results },
    customers: { total: b.total || 0, fresh: b.fresh || 0, repeat: b.repeat || 0, list: r[2].results },
  };
}
