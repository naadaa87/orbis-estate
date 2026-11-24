/** 리포트 공유 주소 — /r/<토큰> → 보기 화면(admin/report-view.html)을 그대로 내보냅니다. 내용은 화면이 /api/report?t= 로 불러옵니다. */
export async function onRequestGet({ request, env }) {
  const res = await env.ASSETS.fetch(new Request(new URL('/admin/report-view', request.url).toString()));
  const h = new Headers(res.headers);
  h.set('X-Robots-Tag', 'noindex, nofollow'); h.set('Cache-Control', 'no-store'); h.set('Referrer-Policy', 'no-referrer');
  return new Response(res.body, { status: res.status, headers: h });
}
