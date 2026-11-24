/**
 * 공개 매물 목록 — GET /api/listings?deal=&cat=&sgg=&q=&sort=&page=&size=&featured=1&cobroke=1
 * 공개(public)·거래완료(done) 매물의 공개 정보만 내보냅니다. 내부 정보(정확한 주소·담당자)는 포함하지 않습니다.
 */
import { json } from '../_lib/gov.js';
import { deskDb, publicListings } from '../_lib/desk.js';

export async function onRequestGet({ request, env }) {
  const db = deskDb(env);
  if (!db) return json({ ok: true, items: [], total: 0, page: 0, size: 12, facets: { deal: [], category: [], sgg: [] } }, 200, 'public, max-age=60');
  try {
    const q = Object.fromEntries(new URL(request.url).searchParams);
    return json(await publicListings(db, q), 200, 'public, max-age=60');
  } catch (e) { return json({ ok: false, message: '매물 목록을 불러오지 못했습니다.' }, 500); }
}
