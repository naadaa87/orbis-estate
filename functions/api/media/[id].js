/** 사진·지도 이미지 — GET /api/media/<id> */
import { deskDb, mediaResponse } from '../../_lib/desk.js';

export async function onRequestGet({ env, params }) {
  const db = deskDb(env);
  if (!db) return new Response('Not Found', { status: 404 });
  try { return await mediaResponse(db, String(params.id || '')); }
  catch (e) { return new Response('Not Found', { status: 404 }); }
}
