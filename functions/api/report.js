/** 공유 링크로 여는 리포트 — GET /api/report?t=<토큰> (관리자가 공유를 켠 리포트만) */
import { json } from '../_lib/gov.js';
import { deskDb, sharedReport } from '../_lib/desk.js';

export async function onRequestGet({ request, env }) {
  const db = deskDb(env);
  const t = new URL(request.url).searchParams.get('t') || '';
  if (!db) return json({ ok: false, error: 'not_found' }, 404);
  try {
    const r = await sharedReport(db, t);
    if (!r) return json({ ok: false, error: 'not_found', message: '공유가 끝났거나 주소가 잘못되었습니다.' }, 404);
    return new Response(JSON.stringify({ ok: true, report: r }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  } catch (e) { return json({ ok: false, message: '리포트를 불러오지 못했습니다.' }, 500); }
}
