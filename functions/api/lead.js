/**
 * ORBIS 상담 접수 API — Cloudflare Pages Functions
 * 경로: POST /api/lead
 *
 * 1) Cloudflare D1 데이터베이스에 저장합니다 (관리자 화면 → 상담 접수에서 확인).
 *    Cloudflare → Workers & Pages → orbis-estate → Settings → Bindings → D1 database
 *    변수 이름은 DB 를 권장합니다. (다른 이름이어도 D1 연결이 하나면 자동으로 찾습니다)
 *    표는 첫 접수 때 자동으로 만들어집니다.
 * 2) 새 접수 알림 (선택)
 *    LEAD_WEBHOOK        : 접수 내용을 넘겨받을 주소 (구글 Apps Script 알림 메일, Slack 등)
 *    LEAD_WEBHOOK_SECRET : 위 주소가 진짜 접수만 받도록 함께 보내는 확인 값 (선택)
 *    RESEND_API_KEY + LEAD_TO : Resend 이메일 API를 쓰는 경우 (선택)
 *
 * 저장도 알림도 되지 않으면 501을 돌려주고, 사이트는 방문자의 메일 작성 화면으로 넘어갑니다.
 */

const SITE = 'https://orbis-estate.com';
export const RETENTION_DAYS = 365; // 개인정보처리방침: 수집일로부터 1년 (계약 단계는 제외)
const SUMMARY_KEYS = ['희망 지역', '예상 용도', '희망 면적', '예상 보증금', '예상 월 임대료', '자산 소재지', '자산유형', '관심 지역', '예산', '업종', '검토 주소', '관심 업종', '브랜드', '목표 지역', '문의 구분', '제목'];
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT, type TEXT, name TEXT, phone TEXT, email TEXT, page TEXT, summary TEXT, status TEXT NOT NULL DEFAULT 'new', memo TEXT, data TEXT NOT NULL, notified INTEGER NOT NULL DEFAULT 0, ip_hash TEXT, country TEXT)`,
  `CREATE INDEX IF NOT EXISTS leads_created ON leads(created_at)`,
  `CREATE INDEX IF NOT EXISTS leads_status ON leads(status)`,
];
let schemaReady = false;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export function leadDb(env) {
  if (env.DB && typeof env.DB.prepare === 'function') return env.DB;
  for (const v of Object.values(env || {})) if (v && typeof v.prepare === 'function' && typeof v.batch === 'function') return v;
  return null;
}
export async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch(SCHEMA.map((s) => db.prepare(s)));
  schemaReady = true;
}
async function sha256(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
function summaryOf(d) {
  const seen = new Set(); const out = [];
  for (const k of SUMMARY_KEYS) {
    if (seen.has(k) || !d[k]) continue; seen.add(k);
    out.push(String(d[k]).replace(/\s+/g, ' ').slice(0, 60));
    if (out.length >= 4) break;
  }
  if (!out.length && d['추가 내용']) out.push(String(d['추가 내용']).replace(/\s+/g, ' ').slice(0, 80));
  return out.join(' · ');
}
function clean(v) { return String(v == null ? '' : v).slice(0, 3000); }

async function notify(env, record) {
  let delivered = false;
  const lines = Object.entries(record).filter(([k]) => !['ip_hash', 'user_agent', 'secret'].includes(k)).map(([k, v]) => `${k}: ${v}`).join('\n');
  if (env.LEAD_WEBHOOK) {
    try {
      const r = await fetch(env.LEAD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '📩 오르비스 상담 접수\n' + lines, ...record, secret: env.LEAD_WEBHOOK_SECRET || '' }),
        redirect: 'follow',
      });
      if (r.ok) delivered = true;
    } catch (e) {}
  }
  if (!delivered && env.RESEND_API_KEY && env.LEAD_TO) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.LEAD_FROM || 'onboarding@resend.dev', to: [env.LEAD_TO],
          subject: `[오르비스 상담접수] ${record['문의유형'] || '일반'} · ${record['성함'] || record['담당자'] || ''}`,
          text: lines,
        }),
      });
      if (r.ok) delivered = true;
    } catch (e) {}
  }
  return delivered;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let data;
  try { data = await request.json(); } catch (e) { return json({ ok: false, error: 'invalid_json' }, 400); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ ok: false, error: 'invalid_json' }, 400);

  // 스팸 방지·기본 검증
  if (data.website) return json({ ok: true }); // 봇은 조용히 무시
  const phone = String(data['연락처'] || '').replace(/[^0-9+]/g, '');
  if (!data['성함'] && !data['담당자'] && !data['이메일'] && !phone) return json({ ok: false, error: 'missing_contact' }, 400);
  if (JSON.stringify(data).length > 20000) return json({ ok: false, error: 'too_large' }, 400);

  const now = new Date();
  const id = 'L' + now.getTime().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase();
  const fields = {};
  for (const [k, v] of Object.entries(data)) if (k !== 'website' && v !== '' && v != null) fields[String(k).slice(0, 60)] = clean(v);
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ipHash = ip ? await sha256(`${ip}|${now.toISOString().slice(0, 10)}|${env.ADMIN_SECRET || 'orbis-lead'}`) : '';
  const record = {
    ...fields,
    lead_id: id,
    received_at: now.toISOString(),
    admin_url: `${SITE}/admin/#/lead/${id}`,
    ip_country: request.headers.get('CF-IPCountry') || '',
  };

  // 1) D1 저장
  const db = leadDb(env);
  let stored = false;
  if (db) {
    try {
      await ensureSchema(db);
      if (ipHash) {
        const since = new Date(now.getTime() - 10 * 60e3).toISOString();
        const row = await db.prepare('SELECT COUNT(*) AS n FROM leads WHERE ip_hash = ? AND created_at > ?').bind(ipHash, since).first();
        if (row && row.n >= 6) return json({ ok: false, error: 'too_many', message: '짧은 시간에 접수가 많습니다. 잠시 후 다시 시도하시거나 전화로 연락 주세요.' }, 429);
      }
      await db.prepare('INSERT INTO leads (id, created_at, updated_at, type, name, phone, email, page, summary, status, data, ip_hash, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, record.received_at, record.received_at, fields['문의유형'] || '일반', fields['성함'] || fields['담당자'] || '', fields['연락처'] || '', fields['이메일'] || '',
          fields['접수페이지'] || '', summaryOf(fields), 'new', JSON.stringify(fields), ipHash, record.ip_country)
        .run();
      stored = true;
      // 보유 기간이 지난 접수는 지웁니다 (계약 단계로 표시한 건은 남김)
      const cutoff = new Date(now.getTime() - RETENTION_DAYS * 864e5).toISOString();
      context.waitUntil(db.prepare("DELETE FROM leads WHERE created_at < ? AND status != 'contract'").bind(cutoff).run().catch(() => {}));
    } catch (e) {
      console.log('lead_db_error', e && e.message);
    }
  }

  // 2) 알림 (저장이 됐으면 응답을 기다리게 하지 않습니다)
  if (stored) {
    context.waitUntil(notify(env, record).then((ok) => (ok ? db.prepare('UPDATE leads SET notified = 1 WHERE id = ?').bind(id).run() : null)).catch(() => {}));
    return json({ ok: true, lead_id: id });
  }
  const delivered = await notify(env, record);
  if (!delivered) return json({ ok: false, error: 'not_configured' }, 501);
  return json({ ok: true, lead_id: id });
}

export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
