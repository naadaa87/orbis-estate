/** 공개 매물 상세 — GET /api/listing?id=OB2611-0001 */
import { json } from '../_lib/gov.js';
import { deskDb, publicListingById } from '../_lib/desk.js';

export async function onRequestGet({ request, env }) {
  const db = deskDb(env);
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!db || !id) return json({ ok: false, error: 'not_found' }, 404);
  try {
    const item = await publicListingById(db, id);
    if (!item) return json({ ok: false, error: 'not_found', message: '매물을 찾을 수 없습니다. 거래가 끝났거나 내려간 매물일 수 있습니다.' }, 404);
    return json({ ok: true, listing: item }, 200, 'public, max-age=60');
  } catch (e) { return json({ ok: false, message: '매물을 불러오지 못했습니다.' }, 500); }
}
