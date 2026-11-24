/** 구하는 물건(공동중개 요청 공고) — GET /api/wanted */
import { json } from '../_lib/gov.js';
import { deskDb, publicWanted } from '../_lib/desk.js';

export async function onRequestGet({ env }) {
  const db = deskDb(env);
  if (!db) return json({ ok: true, items: [] }, 200, 'public, max-age=60');
  try { return json(await publicWanted(db), 200, 'public, max-age=60'); }
  catch (e) { return json({ ok: false, message: '공고를 불러오지 못했습니다.' }, 500); }
}
