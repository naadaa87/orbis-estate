/** 공개 매물 사이트맵 — /sitemap-listings.xml (robots.txt에 등록) */
import { deskDb, ensureDeskSchema } from './_lib/desk.js';

export async function onRequestGet({ env }) {
  let rows = [];
  try {
    const db = deskDb(env);
    if (db) { await ensureDeskSchema(db); rows = (await db.prepare("SELECT id, updated_at FROM listings WHERE status = 'public' ORDER BY updated_at DESC LIMIT 2000").all()).results; }
  } catch (e) {}
  const urls = rows.map((r) => `<url><loc>https://orbis-estate.com/listing/${encodeURIComponent(r.id)}</loc><lastmod>${String(r.updated_at).slice(0, 10)}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
