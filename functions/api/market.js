/**
 * 인근 실거래 미리보기 — GET /api/market?q=역삼동 659-10   (매각가 검토 페이지)
 *
 * 지번 주소에서 법정동을 찾아, 같은 동(사례가 적으면 같은 구)의 최근 12개월 상업업무용 건물(통건물) 매매 실거래를 보여 줍니다.
 * 국토교통부 실거래가 공개 자료를 그대로 정리한 것이고, 가격 평가가 아닙니다. 일반 건물의 지번은 원자료에서 일부 가려져 있습니다.
 * DATA_GO_KR_KEY 가 없으면 code:'NO_KEY' 를 돌려주고, 화면은 신청 양식만 보여 줍니다.
 */
import { json, sameOrigin, parseJibunAddress, deals } from '../_lib/gov.js';

const PY = 3.305785;
export async function onRequestGet(context) {
  const { request, env } = context;
  if (!sameOrigin(request)) return json({ ok: false, code: 'FORBIDDEN', message: '허용되지 않은 호출입니다.' }, 403);
  const u = new URL(request.url);
  const q = (u.searchParams.get('q') || '').trim().slice(0, 80);
  if (q.length < 3) return json({ ok: false, code: 'BAD_INPUT', message: '주소를 지번까지 적어 주세요. 예: 강남구 역삼동 659-10' }, 400);
  try {
    const cands = await parseJibunAddress(env, request, q);
    if (!cands.length) return json({ ok: false, code: 'NOT_FOUND', message: '지번 주소를 알아보지 못했습니다. "구 + 동 + 번지" 순서로 적어 주세요. 예: 강남구 역삼동 659-10' });
    const pick = u.searchParams.get('bjd') ? cands.find((c) => c.bjd === u.searchParams.get('bjd')) || cands[0] : cands[0];
    const choices = cands.length > 1 ? cands.slice(0, 6).map((c) => ({ bjd: c.bjd, label: `${c.sido} ${c.sgg} ${c.dong}` })) : [];
    const place = { label: pick.label, sido: pick.sido, sgg: pick.sgg, dong: pick.dong, jibun: pick.jibun };
    const r = await deals(context, { lawd: pick.bjd.slice(0, 5), months: 12, kinds: ['nrg'], wholeOnly: true });
    if (!r.ok) return json({ ok: false, code: r.code, message: r.code === 'NO_KEY' ? '실거래 미리보기는 준비 중입니다. 아래 신청서를 남겨 주시면 거래사례를 정리해 드립니다.' : '실거래 자료를 잠시 불러오지 못했습니다.', place, choices });
    const whole = r.deals.filter((d) => !d.share && d.plotAr > 0 && d.amt > 0);
    let list = whole.filter((d) => d.dong === pick.dong); let scope = '동';
    if (list.length < 3) { list = whole; scope = '구'; }
    const withPy = list.map((d) => ({ ym: d.ym, dong: d.dong, jibun: d.jibun, use: d.use, zone: d.zone, amt: d.amt, plotAr: d.plotAr, bldAr: d.bldAr, built: d.built, landPy: Math.round(d.amt / (d.plotAr / PY) / 10000) }));
    const pys = withPy.map((d) => d.landPy).sort((a, b) => a - b);
    const mid = pys.length ? (pys.length % 2 ? pys[(pys.length - 1) / 2] : Math.round((pys[pys.length / 2 - 1] + pys[pys.length / 2]) / 2)) : null;
    return json({
      ok: true, place, choices, scope, count: withPy.length, items: withPy.slice(0, 10),
      stats: { n: pys.length, median: mid, min: pys[0] ?? null, max: pys[pys.length - 1] ?? null },
      source: '국토교통부 실거래가 공개시스템 · 상업업무용 부동산 매매(일반 건물, 지분 거래·해제 건 제외) · 최근 12개월',
    }, 200, 'public, max-age=3600');
  } catch (e) { return json({ ok: false, code: 'ERROR', message: '조회 중 오류가 났습니다.' }, 500); }
}
