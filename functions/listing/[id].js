/**
 * 매물 상세 — /listing/<매물번호>
 * 정적 틀(listing.html)을 불러와 제목·설명·공유 이미지와 매물 데이터를 넣어 내보냅니다(검색·카카오톡 공유 미리보기용).
 * 화면 그리기는 listing.html 안의 스크립트가 합니다.
 */
import { deskDb, publicListingById } from '../_lib/desk.js';

const SITE = 'https://orbis-estate.com';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function onRequestGet({ request, env, params }) {
  const id = String(params.id || '').slice(0, 30);
  const tpl = await env.ASSETS.fetch(new Request(new URL('/listing', request.url).toString()));
  let html = await tpl.text();
  let item = null;
  try { const db = deskDb(env); if (db) item = await publicListingById(db, id); } catch (e) {}
  if (!item) {
    html = html.replace('<script id="listingData" type="application/json">null</script>', '<script id="listingData" type="application/json">{"notFound":true}</script>');
    return new Response(html, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  }
  const d = item.data || {};
  const place = [item.sido, item.sgg, item.dong].filter(Boolean).join(' ');
  // 검색 제목: 매물 제목 — 지역(구·동) 종류 거래형태 (예: … — 강남구 역삼동 상가 임대)
  const title = `${item.title} — ${[item.sgg, item.dong, item.category, item.deal].filter(Boolean).join(' ')} | 오르비스중개법인`;
  const desc = [place, d.floor, d.areaText, d.priceText, d.summary].filter(Boolean).join(' · ').slice(0, 155);
  const url = `${SITE}/listing/${encodeURIComponent(item.id)}`;
  const image = item.thumb ? SITE + item.thumb : `${SITE}/assets/og-image.jpg`;
  const rep = (re, v) => { html = html.replace(re, v); };
  rep(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  rep(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`);
  rep(/<meta name="robots" content="[^"]*">/, `<meta name="robots" content="${item.status === 'done' ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">`);
  rep(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`);
  rep(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(item.title)}">`);
  rep(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`);
  rep(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
  rep(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${esc(image)}">`);
  const jsonText = JSON.stringify(item).replace(/</g, '\\u003c');
  rep('<script id="listingData" type="application/json">null</script>', `<script id="listingData" type="application/json">${jsonText}</script>`);
  // 구조화 데이터(매물): 검색엔진이 소재지·가격·게시일을 읽을 수 있게 합니다
  const won = (v) => (Number(v) > 0 ? Math.round(Number(v) * 10000) : null);
  const sale = /매매/.test(item.deal || '');
  const price = sale ? won(item.price) : won(item.rent);
  const ld = {
    '@context': 'https://schema.org', '@type': 'RealEstateListing', name: item.title, description: desc, url, inLanguage: 'ko-KR', image,
    ...(item.published_at ? { datePosted: item.published_at } : {}), ...(item.updated_at ? { dateModified: item.updated_at } : {}),
    mainEntity: { '@type': 'Place', name: item.title, address: { '@type': 'PostalAddress', addressCountry: 'KR', ...(item.sido ? { addressRegion: item.sido } : {}), ...(item.sgg ? { addressLocality: item.sgg } : {}), ...(item.dong ? { streetAddress: item.dong } : {}) } },
    offers: { '@type': 'Offer', priceCurrency: 'KRW', ...(price ? { price } : {}), ...(d.priceText ? { description: String(d.priceText) } : {}), businessFunction: sale ? 'http://purl.org/goodrelations/v1#Sell' : 'http://purl.org/goodrelations/v1#LeaseOut', availability: item.status === 'done' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock', seller: { '@id': `${SITE}/#organization` } },
    provider: { '@id': `${SITE}/#organization` },
  };
  rep('</head>', `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n</head>`);
  // 스크립트 없이 읽는 검색 로봇을 위한 기본 내용
  const facts = [['거래 형태', item.deal], ['종류', d.kind || item.category], ['소재지', place], ['층', d.floor], ['면적', d.areaText], ['가격', d.priceText], ['입주 가능일', d.moveIn]].filter(([, v]) => v);
  const ssr = `<h1>${esc(item.title)}</h1>${d.summary ? `<p>${esc(d.summary)}</p>` : ''}<dl>${facts.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
  rep('<!--LISTING_SSR-->', ssr);
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=120' } });
}
