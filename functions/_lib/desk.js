/**
 * 매물 · 공동중개(구하는 물건) · 리포트 · 사진 저장소 (라우트 아님 — 공개 API와 관리자 API가 불러 씁니다)
 *
 * 상담 접수와 같은 D1(DB)을 씁니다. 표는 처음 쓸 때 자동으로 만들어집니다.
 *   listings : 매물. 공개 정보(data)와 내부 정보(private: 정확한 주소·소유자·PM 담당자·메모)를 따로 둡니다.
 *              공개 API는 private을 절대 내보내지 않습니다.
 *   wanted   : 구하는 물건(공동중개 요청 공고)
 *   reports  : 매각 가격 검토 보고서 · 매각 투자안내서(IM)
 *   media    : 사진·지도 이미지 (브라우저에서 줄여 올린 JPEG/PNG)
 */
import * as gov from './gov.js';

const { json, str, num } = gov;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS listings (id TEXT PRIMARY KEY, seq INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, published_at TEXT, status TEXT NOT NULL DEFAULT 'draft', deal TEXT NOT NULL, category TEXT NOT NULL, title TEXT NOT NULL, sido TEXT, sgg TEXT, dong TEXT, price INTEGER, deposit INTEGER, rent INTEGER, area REAL, cobroke INTEGER NOT NULL DEFAULT 0, featured INTEGER NOT NULL DEFAULT 0, source TEXT, batch TEXT, data TEXT NOT NULL, private TEXT)`,
  `CREATE INDEX IF NOT EXISTS listings_status ON listings(status, published_at)`,
  `CREATE INDEX IF NOT EXISTS listings_batch ON listings(batch)`,
  `CREATE TABLE IF NOT EXISTS wanted (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', deal TEXT NOT NULL, category TEXT, title TEXT NOT NULL, region TEXT, data TEXT NOT NULL, private TEXT)`,
  `CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, kind TEXT NOT NULL, title TEXT, addr TEXT, status TEXT NOT NULL DEFAULT 'draft', share TEXT, data TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS reports_share ON reports(share)`,
  `CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, owner TEXT, bytes BLOB NOT NULL)`,
];
let ready = false;
export async function ensureDeskSchema(db) {
  if (ready) return;
  await db.batch(SCHEMA.map((s) => db.prepare(s)));
  ready = true;
}
export function deskDb(env) {
  if (env.DB && typeof env.DB.prepare === 'function') return env.DB;
  for (const v of Object.values(env || {})) if (v && typeof v.prepare === 'function' && typeof v.batch === 'function') return v;
  return null;
}

export const DEALS = ['매매', '임대', '전대'];
export const CATEGORIES = ['오피스', '상가', '빌딩', '토지', '지식산업센터', '공장·창고', '기타'];
export const LISTING_STATUS = ['draft', 'public', 'done', 'hidden'];
// 「중개대상물의 표시·광고 명시사항 세부기준」(국토교통부 고시) 건축물 항목 — 공개(광고)하려면 모두 채워야 합니다
export const LEGAL_FIELDS = [
  ['kind', '중개대상물 종류'], ['floor', '해당 층 / 총 층수'], ['areaText', '면적'], ['priceText', '가격'], ['moveIn', '입주 가능일'],
  ['approval', '사용승인일'], ['parking', '주차대수'], ['direction', '방향'], ['baths', '욕실(화장실) 수'], ['violation', '위반건축물 여부'],
];
const LAND_LEGAL = ['kind', 'areaText', 'priceText'];
const PUBLIC_KEYS = ['summary', 'building', 'kind', 'floor', 'areaText', 'priceText', 'maintenance', 'moveIn', 'approval', 'parking', 'direction', 'baths', 'violation', 'use', 'station', 'description', 'cobrokeNote', 'exclusiveM2', 'contractM2', 'landM2', 'grossM2', 'rentFree', 'yield', 'posted', 'confirmed'];
const PRIVATE_KEYS = ['addr', 'owner', 'ownerPhone', 'sourceName', 'contactName', 'contactPhone', 'memo', 'raw', 'leadId'];

// 사이트에 넣지 않기로 한 이름은 글자로 남기지 않고 한글 세 글자 해시로만 비교합니다
const HIDDEN = new Set([0xf09d9743]);
const fnv1a = (s) => { let h = 0x811c9dc5; for (const ch of s) { const c = ch.codePointAt(0); h ^= c & 0xff; h = Math.imul(h, 0x01000193) >>> 0; h ^= c >>> 8; h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
export function hasHiddenName(text) {
  const s = [...String(text || '').replace(/[^가-힣]/g, '')];
  for (let i = 0; i + 3 <= s.length; i++) if (HIDDEN.has(fnv1a(s[i] + s[i + 1] + s[i + 2]))) return true;
  return false;
}

const now = () => new Date().toISOString();
const rid = (p) => p + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
const cut = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
const int = (v) => { const n = num(v); return n == null ? null : Math.round(n); };
const parse = (s, d = {}) => { try { const v = JSON.parse(s); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } };
const kstYm = () => { const k = new Date(Date.now() + 9 * 3600e3); return String(k.getUTCFullYear()).slice(2) + String(k.getUTCMonth() + 1).padStart(2, '0'); };

/* ---------------------------------------------------------------- 매물: 정리·검증 */
function cleanListing(b) {
  const data = {}; const priv = {};
  const d = b.data && typeof b.data === 'object' ? b.data : {};
  for (const k of PUBLIC_KEYS) if (d[k] != null && d[k] !== '') data[k] = ['exclusiveM2', 'contractM2', 'landM2', 'grossM2'].includes(k) ? num(d[k]) : cut(d[k], k === 'description' ? 4000 : 300);
  data.highlights = (Array.isArray(d.highlights) ? d.highlights : []).map((x) => cut(x, 120)).filter(Boolean).slice(0, 8);
  data.photos = (Array.isArray(d.photos) ? d.photos : []).filter((p) => p && /^\/api\/media\/[A-Za-z0-9]+$/.test(str(p.url))).map((p) => ({ url: str(p.url), caption: cut(p.caption, 80) })).slice(0, 12);
  const p = b.private && typeof b.private === 'object' ? b.private : {};
  for (const k of PRIVATE_KEYS) if (p[k] != null && p[k] !== '') priv[k] = k === 'raw' ? (typeof p[k] === 'object' ? p[k] : cut(p[k], 3000)) : cut(p[k], k === 'memo' ? 3000 : 300);
  const row = {
    status: LISTING_STATUS.includes(b.status) ? b.status : 'draft',
    deal: DEALS.includes(b.deal) ? b.deal : '임대',
    category: CATEGORIES.includes(b.category) ? b.category : '기타',
    title: cut(b.title, 120), sido: cut(b.sido, 20), sgg: cut(b.sgg, 30), dong: cut(b.dong, 30),
    price: int(b.price), deposit: int(b.deposit), rent: int(b.rent), area: num(b.area),
    cobroke: b.cobroke ? 1 : 0, featured: b.featured ? 1 : 0,
    source: ['direct', 'pm', 'cobroke', 'owner'].includes(b.source) ? b.source : 'direct', batch: cut(b.batch, 60) || null,
    data, private: priv,
  };
  return row;
}
export function missingLegal(row) {
  const miss = [];
  if (!row.title) miss.push('제목');
  if (!row.sgg || !row.dong) miss.push('소재지(시군구·읍면동)');
  const need = row.category === '토지' ? LAND_LEGAL : LEGAL_FIELDS.map(([k]) => k);
  for (const [k, label] of LEGAL_FIELDS) if (need.includes(k) && !row.data[k]) miss.push(label);
  return miss;
}
function publicListing(r, detail = false) {
  const d = parse(r.data);
  const base = {
    id: r.id, status: r.status, deal: r.deal, category: r.category, title: r.title, sido: r.sido || '', sgg: r.sgg || '', dong: r.dong || '',
    price: r.price, deposit: r.deposit, rent: r.rent, area: r.area, cobroke: !!r.cobroke, featured: !!r.featured,
    published_at: r.published_at, updated_at: r.updated_at,
    summary: d.summary || '', building: d.building || '', floor: d.floor || '', areaText: d.areaText || '', priceText: d.priceText || '', station: d.station || '', kind: d.kind || '',
    thumb: (d.photos && d.photos[0] && d.photos[0].url) || '',
  };
  if (!detail) return base;
  return { ...base, data: d };
}
async function nextSeq(db) { return (((await db.prepare('SELECT COALESCE(MAX(seq), 0) AS m FROM listings').first()) || {}).m || 0) + 1; }
const listingId = (seq) => `OB${kstYm()}-${String(seq).padStart(4, '0')}`;

/* ---------------------------------------------------------------- 공개 조회 */
export async function publicListings(db, q) {
  await ensureDeskSchema(db);
  const where = ["status IN ('public','done')"]; const args = [];
  if (DEALS.includes(q.deal)) { where.push('deal = ?'); args.push(q.deal); }
  if (CATEGORIES.includes(q.cat)) { where.push('category = ?'); args.push(q.cat); }
  if (q.sgg) { where.push('sgg = ?'); args.push(cut(q.sgg, 30)); }
  if (q.cobroke === '1') where.push('cobroke = 1');
  if (q.featured === '1') where.push('featured = 1');
  if (q.q) { where.push('(title LIKE ? OR dong LIKE ? OR sgg LIKE ? OR id LIKE ? OR data LIKE ?)'); const l = `%${cut(q.q, 30)}%`; args.push(l, l, l, l, l); }
  const size = Math.min(Math.max(parseInt(q.size, 10) || 12, 1), 48);
  const page = Math.max(parseInt(q.page, 10) || 0, 0);
  const order = q.sort === 'area' ? 'area DESC' : q.sort === 'low' ? 'COALESCE(rent, price) ASC' : "CASE status WHEN 'public' THEN 0 ELSE 1 END, featured DESC, COALESCE(published_at, updated_at) DESC";
  const w = where.join(' AND ');
  const [rows, total, fDeal, fCat, fSgg] = await db.batch([
    db.prepare(`SELECT * FROM listings WHERE ${w} ORDER BY ${order} LIMIT ? OFFSET ?`).bind(...args, size, page * size),
    db.prepare(`SELECT COUNT(*) AS n FROM listings WHERE ${w}`).bind(...args),
    db.prepare("SELECT deal AS k, COUNT(*) AS n FROM listings WHERE status = 'public' GROUP BY deal"),
    db.prepare("SELECT category AS k, COUNT(*) AS n FROM listings WHERE status = 'public' GROUP BY category"),
    db.prepare("SELECT sgg AS k, COUNT(*) AS n FROM listings WHERE status = 'public' AND sgg != '' GROUP BY sgg ORDER BY n DESC LIMIT 30"),
  ]);
  return { ok: true, items: rows.results.map((r) => publicListing(r)), total: (total.results[0] || {}).n || 0, page, size, facets: { deal: fDeal.results, category: fCat.results, sgg: fSgg.results } };
}
export async function publicListingById(db, id) {
  await ensureDeskSchema(db);
  const r = await db.prepare("SELECT * FROM listings WHERE id = ? AND status IN ('public','done')").bind(cut(id, 30)).first();
  return r ? publicListing(r, true) : null;
}
export async function publicWanted(db) {
  await ensureDeskSchema(db);
  const rows = await db.prepare("SELECT id, created_at, updated_at, status, deal, category, title, region, data FROM wanted WHERE status IN ('open','closed') ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, updated_at DESC LIMIT 60").all();
  return { ok: true, items: rows.results.map((r) => ({ id: r.id, status: r.status, deal: r.deal, category: r.category || '', title: r.title, region: r.region || '', updated_at: r.updated_at, ...parse(r.data) })) };
}
export async function mediaResponse(db, id) {
  await ensureDeskSchema(db);
  const r = await db.prepare('SELECT mime, bytes FROM media WHERE id = ?').bind(cut(id, 40)).first();
  if (!r) return new Response('Not Found', { status: 404 });
  const b = r.bytes instanceof ArrayBuffer ? new Uint8Array(r.bytes) : (ArrayBuffer.isView(r.bytes) ? r.bytes : Uint8Array.from(r.bytes));
  return new Response(b, { headers: { 'Content-Type': r.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
}
export async function sharedReport(db, token) {
  await ensureDeskSchema(db);
  if (!/^[a-z0-9]{20,40}$/.test(str(token))) return null;
  const r = await db.prepare('SELECT kind, title, addr, updated_at, data FROM reports WHERE share = ?').bind(token).first();
  return r ? { kind: r.kind, title: r.title, addr: r.addr, updated_at: r.updated_at, data: parse(r.data) } : null;
}
export async function saveMedia(db, bytes, mime, owner) {
  const id = rid('M').toLowerCase() + Math.random().toString(36).slice(2, 8);
  await db.prepare('INSERT INTO media (id, created_at, mime, size, owner, bytes) VALUES (?, ?, ?, ?, ?, ?)').bind(id, now(), mime, bytes.byteLength, cut(owner, 60), bytes).run();
  return { id, url: `/api/media/${id}` };
}

/* ---------------------------------------------------------------- 관리자 API */
const WANTED_KEYS = ['client', 'areaText', 'budgetText', 'timing', 'feeNote', 'detail'];
function cleanWanted(b) {
  const d = b.data && typeof b.data === 'object' ? b.data : b;
  const data = {}; for (const k of WANTED_KEYS) if (d[k]) data[k] = cut(d[k], k === 'detail' ? 2000 : 200);
  data.conditions = (Array.isArray(d.conditions) ? d.conditions : String(d.conditions || '').split('\n')).map((x) => cut(x, 140)).filter(Boolean).slice(0, 10);
  return {
    status: ['open', 'closed', 'hidden'].includes(b.status) ? b.status : 'open', deal: ['임차', '매수'].includes(b.deal) ? b.deal : '임차',
    category: cut(b.category, 30), title: cut(b.title, 120), region: cut(b.region, 80), data, private: { memo: cut((b.private || {}).memo, 2000), client: cut((b.private || {}).client, 200) },
  };
}

export async function handleDesk(route, request, env, url, context) {
  const known = /^\/(desk\/summary|listings(\/bulk|\/import)?|listing|wanted|reports?|report\/share|media|geo\/[a-z]+)$/;
  if (!known.test(route)) return null;
  const method = request.method;
  const q = Object.fromEntries(url.searchParams);

  // ---- 공공데이터 조회 (DB 없이도 동작)
  if (route.startsWith('/geo/')) {
    try {
      if (route === '/geo/keys') return json({ ok: true, datagokr: !!str(env.DATA_GO_KR_KEY), vworld: !!str(env.VWORLD_KEY), vworldKey: str(env.VWORLD_KEY), vworldDomain: str(env.VWORLD_DOMAIN) || url.hostname });
      if (route === '/geo/search') return json({ ok: true, items: await gov.parseJibunAddress(env, request, q.q || '') });
      if (route === '/geo/bjdname') return json({ ok: true, name: await gov.bjdName(env, request, str(q.code)) });
      if (route === '/geo/building') return json(await gov.building(env, q.pnu));
      if (route === '/geo/deals') {
        const p = gov.splitPnu(q.pnu); const lawd = p ? p.sgg5 : str(q.lawd);
        return json(await gov.deals(context, { lawd, months: parseInt(q.months, 10) || 24, kinds: str(q.kinds || 'nrg').split(','), dong: str(q.dong), wholeOnly: q.all !== '1' }));
      }
      if (route === '/geo/vw') { const { path, ...rest } = q; return json(await gov.vworld(env, request, str(path), rest)); }
      if (route === '/geo/staticmap' && method === 'POST') {
        const db = deskDb(env); if (!db) return json({ ok: false, code: 'NO_DB', message: 'D1 데이터베이스가 연결되지 않았습니다.' }, 503);
        let b = {}; try { b = await request.json(); } catch (e) {}
        const r = await gov.staticMap(env, request, b);
        if (!r.ok) return json(r);
        await ensureDeskSchema(db);
        return json({ ok: true, ...(await saveMedia(db, r.bytes, r.mime, cut(b.owner, 60) || 'map')) });
      }
    } catch (e) { return json({ ok: false, code: 'ERROR', message: '조회 중 오류가 났습니다. (' + e.message + ')' }); }
    return json({ ok: false, error: 'not_found' }, 404);
  }

  const db = deskDb(env);
  if (!db) return json({ ok: false, error: 'no_db', message: 'Cloudflare에 D1 데이터베이스가 연결되지 않았습니다. (Settings → Bindings → D1, 변수 이름 DB)' }, 503);
  try {
    await ensureDeskSchema(db);
    let body = {};
    if (method !== 'GET' && method !== 'DELETE') { try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'invalid_json', message: '보낸 내용을 읽을 수 없습니다.' }, 400); } }

    if (route === '/desk/summary') {
      const r = await db.batch([
        db.prepare('SELECT status, COUNT(*) AS n FROM listings GROUP BY status'),
        db.prepare("SELECT COUNT(*) AS n FROM wanted WHERE status = 'open'"),
        db.prepare('SELECT COUNT(*) AS n FROM reports'),
      ]);
      const ls = {}; for (const x of r[0].results) ls[x.status] = x.n;
      const inbox = {};
      try {
        const rows = await db.prepare("SELECT type, COUNT(*) AS n FROM leads WHERE status = 'new' AND (type LIKE '공동중개%' OR type LIKE '매각가 검토%' OR type LIKE '매물 등록%') GROUP BY type").all();
        for (const x of rows.results) inbox[x.type] = x.n;
      } catch (e) {}
      return json({ ok: true, listings: ls, wanted: (r[1].results[0] || {}).n || 0, reports: (r[2].results[0] || {}).n || 0, inbox });
    }

    /* ---- 매물 */
    if (route === '/listings' && method === 'GET') {
      const where = []; const args = [];
      if (LISTING_STATUS.includes(q.status)) { where.push('status = ?'); args.push(q.status); }
      if (DEALS.includes(q.deal)) { where.push('deal = ?'); args.push(q.deal); }
      if (CATEGORIES.includes(q.cat)) { where.push('category = ?'); args.push(q.cat); }
      if (q.source) { where.push('source = ?'); args.push(cut(q.source, 20)); }
      if (q.batch) { where.push('batch = ?'); args.push(cut(q.batch, 60)); }
      if (q.q) { where.push('(title LIKE ? OR dong LIKE ? OR sgg LIKE ? OR id LIKE ? OR data LIKE ? OR private LIKE ?)'); const l = `%${cut(q.q, 30)}%`; args.push(l, l, l, l, l, l); }
      const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
      const page = Math.max(parseInt(q.page, 10) || 0, 0);
      const [rows, total, counts, batches] = await db.batch([
        db.prepare(`SELECT * FROM listings ${w} ORDER BY updated_at DESC LIMIT 50 OFFSET ?`).bind(...args, page * 50),
        db.prepare(`SELECT COUNT(*) AS n FROM listings ${w}`).bind(...args),
        db.prepare('SELECT status, COUNT(*) AS n FROM listings GROUP BY status'),
        db.prepare("SELECT batch, COUNT(*) AS n, MAX(created_at) AS at, SUM(status = 'public') AS pub FROM listings WHERE batch IS NOT NULL GROUP BY batch ORDER BY at DESC LIMIT 24"),
      ]);
      const c = {}; for (const x of counts.results) c[x.status] = x.n;
      return json({
        ok: true, page, total: (total.results[0] || {}).n || 0, counts: c, batches: batches.results,
        items: rows.results.map((r) => { const row = { ...publicListing(r), source: r.source, batch: r.batch, created_at: r.created_at, data: parse(r.data), private: parse(r.private) }; row.missing = missingLegal(row); return row; }),
      });
    }
    if (route === '/listing' && method === 'GET') {
      const r = await db.prepare('SELECT * FROM listings WHERE id = ?').bind(str(q.id)).first();
      if (!r) return json({ ok: false, error: 'not_found', message: '매물을 찾을 수 없습니다.' }, 404);
      const row = { ...publicListing(r), source: r.source, batch: r.batch, created_at: r.created_at, data: parse(r.data), private: parse(r.private) };
      return json({ ok: true, listing: { ...row, missing: missingLegal(row) } });
    }
    if (route === '/listing' && method === 'PUT') {
      const row = cleanListing(body);
      if (!row.title) return json({ ok: false, error: 'invalid', message: '제목을 적어 주세요.' }, 400);
      if (hasHiddenName(JSON.stringify([row.title, row.data]))) return json({ ok: false, error: 'invalid', message: '사이트에 넣지 않기로 한 이름이 들어 있습니다.' }, 400);
      const miss = missingLegal(row);
      if (row.status === 'public' && miss.length) return json({ ok: false, error: 'missing_legal', message: '공개하려면 법정 표시사항을 모두 채워야 합니다: ' + miss.join(', '), missing: miss }, 400);
      const t = now();
      if (body.id) {
        const old = await db.prepare('SELECT id, status, published_at FROM listings WHERE id = ?').bind(str(body.id)).first();
        if (!old) return json({ ok: false, error: 'not_found', message: '매물을 찾을 수 없습니다.' }, 404);
        const pub = row.status === 'public' ? (old.published_at || t) : old.published_at;
        await db.prepare('UPDATE listings SET updated_at=?, published_at=?, status=?, deal=?, category=?, title=?, sido=?, sgg=?, dong=?, price=?, deposit=?, rent=?, area=?, cobroke=?, featured=?, source=?, batch=COALESCE(?, batch), data=?, private=? WHERE id=?')
          .bind(t, pub, row.status, row.deal, row.category, row.title, row.sido, row.sgg, row.dong, row.price, row.deposit, row.rent, row.area, row.cobroke, row.featured, row.source, row.batch, JSON.stringify(row.data), JSON.stringify(row.private), old.id).run();
        return json({ ok: true, id: old.id, updated_at: t, missing: miss });
      }
      const seq = await nextSeq(db); const id = listingId(seq);
      await db.prepare('INSERT INTO listings (id, seq, created_at, updated_at, published_at, status, deal, category, title, sido, sgg, dong, price, deposit, rent, area, cobroke, featured, source, batch, data, private) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, seq, t, t, row.status === 'public' ? t : null, row.status, row.deal, row.category, row.title, row.sido, row.sgg, row.dong, row.price, row.deposit, row.rent, row.area, row.cobroke, row.featured, row.source, row.batch, JSON.stringify(row.data), JSON.stringify(row.private)).run();
      return json({ ok: true, id, updated_at: t, missing: miss });
    }
    if (route === '/listing' && method === 'DELETE') {
      await db.prepare('DELETE FROM listings WHERE id = ?').bind(str(q.id)).run();
      return json({ ok: true });
    }
    if (route === '/listings/bulk' && method === 'POST') {
      const ids = (Array.isArray(body.ids) ? body.ids : []).map((x) => cut(x, 30)).filter(Boolean).slice(0, 300);
      const act = str(body.action); const t = now();
      if (!ids.length && !body.batch) return json({ ok: false, error: 'invalid', message: '대상을 골라 주세요.' }, 400);
      let rows;
      if (body.batch && !ids.length) rows = (await db.prepare('SELECT * FROM listings WHERE batch = ?').bind(cut(body.batch, 60)).all()).results;
      else rows = (await db.prepare(`SELECT * FROM listings WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all()).results;
      let done = 0; const skipped = []; const stmts = [];
      for (const r of rows) {
        if (act === 'delete') { stmts.push(db.prepare('DELETE FROM listings WHERE id = ?').bind(r.id)); done++; continue; }
        if (act === 'public') {
          const row = { ...r, data: parse(r.data) }; const miss = missingLegal(row);
          if (miss.length) { skipped.push({ id: r.id, title: r.title, missing: miss }); continue; }
          stmts.push(db.prepare("UPDATE listings SET status = 'public', updated_at = ?, published_at = COALESCE(published_at, ?) WHERE id = ?").bind(t, t, r.id)); done++; continue;
        }
        if (['draft', 'done', 'hidden'].includes(act)) { stmts.push(db.prepare('UPDATE listings SET status = ?, updated_at = ? WHERE id = ?').bind(act, t, r.id)); done++; continue; }
        if (act === 'confirm') { const d = parse(r.data); d.confirmed = t.slice(0, 10); stmts.push(db.prepare('UPDATE listings SET data = ?, updated_at = ? WHERE id = ?').bind(JSON.stringify(d), t, r.id)); done++; }
      }
      for (let i = 0; i < stmts.length; i += 40) await db.batch(stmts.slice(i, i + 40));
      return json({ ok: true, done, skipped });
    }
    if (route === '/listings/import' && method === 'POST') {
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 400);
      if (!items.length) return json({ ok: false, error: 'invalid', message: '등록할 행이 없습니다.' }, 400);
      const batch = cut(body.batch, 60) || `일괄 ${now().slice(0, 10)}`;
      if (body.replace === true) await db.prepare("DELETE FROM listings WHERE batch = ? AND source = 'pm'").bind(batch).run();
      let seq = await nextSeq(db); const t = now(); const stmts = []; let pub = 0; let draft = 0; const ids = [];
      for (const it of items) {
        const row = cleanListing({ ...it, batch });
        if (!row.title || hasHiddenName(JSON.stringify([row.title, row.data]))) continue;
        const miss = missingLegal(row);
        if (row.status === 'public' && miss.length) row.status = 'draft';
        if (row.status === 'public') pub++; else draft++;
        const id = listingId(seq); ids.push(id);
        stmts.push(db.prepare('INSERT INTO listings (id, seq, created_at, updated_at, published_at, status, deal, category, title, sido, sgg, dong, price, deposit, rent, area, cobroke, featured, source, batch, data, private) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(id, seq, t, t, row.status === 'public' ? t : null, row.status, row.deal, row.category, row.title, row.sido, row.sgg, row.dong, row.price, row.deposit, row.rent, row.area, row.cobroke, row.featured, row.source, row.batch, JSON.stringify(row.data), JSON.stringify(row.private)));
        seq++;
      }
      for (let i = 0; i < stmts.length; i += 40) await db.batch(stmts.slice(i, i + 40));
      return json({ ok: true, batch, saved: ids.length, published: pub, draft, ids });
    }

    /* ---- 구하는 물건 (공동중개 요청 공고) */
    if (route === '/wanted' && method === 'GET') {
      const rows = await db.prepare('SELECT * FROM wanted ORDER BY CASE status WHEN \'open\' THEN 0 WHEN \'closed\' THEN 1 ELSE 2 END, updated_at DESC LIMIT 200').all();
      return json({ ok: true, items: rows.results.map((r) => ({ id: r.id, status: r.status, deal: r.deal, category: r.category || '', title: r.title, region: r.region || '', created_at: r.created_at, updated_at: r.updated_at, data: parse(r.data), private: parse(r.private) })) });
    }
    if (route === '/wanted' && method === 'PUT') {
      const row = cleanWanted(body);
      if (!row.title) return json({ ok: false, error: 'invalid', message: '제목을 적어 주세요.' }, 400);
      if (hasHiddenName(JSON.stringify([row.title, row.region, row.data]))) return json({ ok: false, error: 'invalid', message: '사이트에 넣지 않기로 한 이름이 들어 있습니다.' }, 400);
      const t = now();
      if (body.id) {
        await db.prepare('UPDATE wanted SET updated_at=?, status=?, deal=?, category=?, title=?, region=?, data=?, private=? WHERE id=?').bind(t, row.status, row.deal, row.category, row.title, row.region, JSON.stringify(row.data), JSON.stringify(row.private), str(body.id)).run();
        return json({ ok: true, id: str(body.id) });
      }
      const id = rid('W');
      await db.prepare('INSERT INTO wanted (id, created_at, updated_at, status, deal, category, title, region, data, private) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, t, t, row.status, row.deal, row.category, row.title, row.region, JSON.stringify(row.data), JSON.stringify(row.private)).run();
      return json({ ok: true, id });
    }
    if (route === '/wanted' && method === 'DELETE') { await db.prepare('DELETE FROM wanted WHERE id = ?').bind(str(q.id)).run(); return json({ ok: true }); }

    /* ---- 리포트 */
    if (route === '/reports' && method === 'GET') {
      const rows = await db.prepare('SELECT id, kind, title, addr, status, share, created_at, updated_at FROM reports ORDER BY updated_at DESC LIMIT 200').all();
      return json({ ok: true, items: rows.results });
    }
    if (route === '/report' && method === 'GET') {
      const r = await db.prepare('SELECT * FROM reports WHERE id = ?').bind(str(q.id)).first();
      if (!r) return json({ ok: false, error: 'not_found', message: '리포트를 찾을 수 없습니다.' }, 404);
      return json({ ok: true, report: { id: r.id, kind: r.kind, title: r.title, addr: r.addr, status: r.status, share: r.share, created_at: r.created_at, updated_at: r.updated_at, data: parse(r.data) } });
    }
    if (route === '/report' && method === 'PUT') {
      const kind = body.kind === 'im' ? 'im' : 'valuation';
      const data = body.data && typeof body.data === 'object' ? body.data : {};
      const text = JSON.stringify(data);
      if (text.length > 900000) return json({ ok: false, error: 'too_large', message: '리포트 내용이 너무 큽니다. 사진은 파일로 올린 뒤 주소만 넣어 주세요.' }, 400);
      if (hasHiddenName(text) || hasHiddenName(body.title)) return json({ ok: false, error: 'invalid', message: '사이트에 넣지 않기로 한 이름이 들어 있습니다.' }, 400);
      const t = now(); const title = cut(body.title, 160); const addr = cut(body.addr, 200); const status = ['draft', 'final'].includes(body.status) ? body.status : 'draft';
      if (body.id) {
        const old = await db.prepare('SELECT id FROM reports WHERE id = ?').bind(str(body.id)).first();
        if (!old) return json({ ok: false, error: 'not_found', message: '리포트를 찾을 수 없습니다.' }, 404);
        await db.prepare('UPDATE reports SET updated_at=?, kind=?, title=?, addr=?, status=?, data=? WHERE id=?').bind(t, kind, title, addr, status, text, old.id).run();
        return json({ ok: true, id: old.id, updated_at: t });
      }
      const id = rid('R');
      await db.prepare('INSERT INTO reports (id, created_at, updated_at, kind, title, addr, status, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id, t, t, kind, title, addr, status, text).run();
      return json({ ok: true, id, updated_at: t });
    }
    if (route === '/report/share' && method === 'POST') {
      const id = str(body.id);
      const token = body.on ? [...crypto.getRandomValues(new Uint8Array(18))].map((b) => (b % 36).toString(36)).join('') + Date.now().toString(36) : null;
      const r = await db.prepare('UPDATE reports SET share = ? WHERE id = ?').bind(token, id).run();
      if (!r.meta || !r.meta.changes) return json({ ok: false, error: 'not_found', message: '리포트를 찾을 수 없습니다.' }, 404);
      return json({ ok: true, share: token });
    }
    if (route === '/report' && method === 'DELETE') {
      const id = str(q.id);
      await db.batch([db.prepare('DELETE FROM reports WHERE id = ?').bind(id), db.prepare('DELETE FROM media WHERE owner = ?').bind(`report:${id}`)]);
      return json({ ok: true });
    }

    /* ---- 사진 */
    if (route === '/media' && method === 'POST') {
      const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(str(body.dataUrl));
      if (!m) return json({ ok: false, error: 'invalid', message: '이미지 파일(JPG·PNG)만 올릴 수 있습니다.' }, 400);
      const bin = atob(m[2]);
      if (bin.length > 1300000) return json({ ok: false, error: 'too_large', message: '사진이 너무 큽니다. 한 장 1MB 안팎으로 줄여 올려 주세요.' }, 400);
      const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return json({ ok: true, ...(await saveMedia(db, bytes, m[1], body.owner)) });
    }
    if (route === '/media' && method === 'DELETE') { await db.prepare('DELETE FROM media WHERE id = ?').bind(str(q.id)).run(); return json({ ok: true }); }
  } catch (e) {
    return json({ ok: false, error: 'db', message: '저장소 처리 중 오류가 났습니다. (' + e.message + ')' }, 500);
  }
  return json({ ok: false, error: 'not_found' }, 404);
}
