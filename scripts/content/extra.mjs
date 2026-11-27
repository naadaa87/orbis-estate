// 검색 노출용 부가 페이지 생성기 — 용어사전 개별 페이지, 계산기, 길잡이, 사이트 검색, llms 파일
// build.mjs가 불러 씁니다. 화면 틀(머리말·헤더·푸터)은 sitegen.mjs의 것을 그대로 씁니다.
import * as G from './sitegen.mjs';
import { TOOLS, GUIDES, KEYWORDS, AS_OF } from './extra-data.mjs';

const { SITE, BRAND, esc } = G;
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const jsonld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
const crumbLd = (items) => jsonld({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE}${path}` })) });
const stripMd = (s) => String(s || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
const cut = (s, n) => { s = String(s || ''); if (s.length <= n) return s; const c = s.slice(0, n); const k = Math.max(c.lastIndexOf('다. '), c.lastIndexOf('. ')); return k > n * 0.5 ? c.slice(0, k + 2).trim() : c.replace(/\s+\S*$/, '') + '…'; };
const firstSentence = (s) => { const m = String(s).match(/^.*?[다요]\.(?=\s|$)/); return m ? m[0] : String(s); };
const ICON = {
  fee: '<path d="M12 3v18M7.5 7.5h6.2a2.8 2.8 0 0 1 0 5.6H9.8a2.8 2.8 0 0 0 0 5.6h6.7"/>',
  shield: '<path d="M12 3l7.5 3v5.6c0 4.4-3 8.2-7.5 9.4-4.5-1.2-7.5-5-7.5-9.4V6z"/><path d="M9 12l2.2 2.2L15.2 10"/>',
  chart: '<path d="M4 20V5M4 20h16M8 16v-4M12 16V8M16 16v-6"/>',
  ruler: '<path d="M4 16.5L16.5 4l3.5 3.5L7.5 20z"/><path d="M8 13l1.6 1.6M10.6 10.4l1.6 1.6M13.2 7.8l1.6 1.6"/>',
  coins: '<ellipse cx="9" cy="7.5" rx="5.5" ry="2.8"/><path d="M3.5 7.5v4.2c0 1.5 2.5 2.8 5.5 2.8M3.5 11.7v4.2c0 1.5 2.5 2.8 5.5 2.8 1 0 1.9-.1 2.7-.4"/><ellipse cx="15.5" cy="14.5" rx="5" ry="2.6"/><path d="M10.5 14.5v3.6c0 1.4 2.2 2.6 5 2.6s5-1.2 5-2.6v-3.6"/>',
  tag: '<path d="M3.5 12.2V4.5h7.7l9.3 9.3-7.7 7.7z"/><circle cx="8" cy="9" r="1.4"/>',
  up: '<path d="M4 18l5.5-6 4 3.5L20 7"/><path d="M15 7h5v5"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM20 17v4H6.5A2.5 2.5 0 0 1 4 18.5"/>',
  route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k] || ICON.book}</svg>`;

// ================================================================ 용어
export function loadTerms(glossaryDoc, extra) {
  const { body } = G.parseDoc(glossaryDoc);
  const terms = []; let group = ''; let cur = null;
  for (const l of body.split('\n')) {
    const g = l.match(/^##\s+(.*)$/); const t = l.match(/^###\s+(.*)$/);
    if (g) { group = g[1].trim(); cur = null; continue; }
    if (t) { cur = { name: t[1].trim(), group, lines: [] }; terms.push(cur); continue; }
    if (cur) cur.lines.push(l);
  }
  const problems = [];
  const out = terms.map((t) => {
    const x = extra[t.name];
    if (!x || !x.slug) { problems.push(`용어 "${t.name}"의 보충 자료(slug)가 glossary-extra.json에 없습니다.`); return null; }
    const base = t.name.replace(/\s*\(.*\)$/, '');
    const raw = t.lines.join(' ').replace(/\s+/g, ' ').trim();
    const rel = []; let def = raw;
    const m = raw.match(/\s*관련 글:\s*(.*)$/);
    if (m) { def = raw.slice(0, m.index).trim(); for (const a of m[1].matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) rel.push({ title: a[1], url: a[2] }); }
    const names = [...new Set([...(x.aka || []), base].filter(Boolean))];
    return { name: t.name, base, group: t.group, slug: x.slug, def, plain: stripMd(def), rel, names, aka: x.aka || [], points: x.points || [], example: x.example || '', tool: x.tool || '', link: x.link || null, auto: x.auto, strict: !!x.strict };
  }).filter(Boolean);
  const seen = new Set();
  for (const t of out) { if (seen.has(t.slug)) problems.push(`용어 주소가 겹칩니다: ${t.slug}`); seen.add(t.slug); }
  for (const k of Object.keys(extra)) if (!k.startsWith('_') && !terms.find((t) => t.name === k)) problems.push(`glossary-extra.json의 "${k}"가 glossary.md에 없습니다.`);
  return { terms: out, problems };
}

const count = (text, names) => names.reduce((n, a) => n + (text.split(a).length - 1), 0);

export function renderTermPage(t, ctx) {
  const { layout, posts, terms } = ctx;
  const path = `/glossary/${t.slug}`;
  const short = firstSentence(t.plain);
  const title = `${t.name} 뜻${t.example ? '과 계산 예시' : '과 확인할 점'} — 부동산 용어사전 | ${BRAND}`;
  const desc = cut(t.plain, 150);
  const tool = t.tool ? TOOLS.find((x) => x.slug === t.tool) : null;
  // 이 용어가 나오는 글: 정의에 적어 둔 글 → 본문에 많이 나오는 순
  const pub = posts.filter((p) => p.status === 'published' && !p.legacy);
  const scored = pub.map((p) => ({ p, n: count(`${p.title} ${p.keywords.join(' ')} ${p.body}`, t.names) + (t.rel.some((r) => r.url === p.url) ? 100 : 0) })).filter((x) => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 4).map((x) => x.p);
  // 관련 질문: 글의 FAQ 가운데 질문에 이 용어가 들어간 것
  const faqs = [];
  for (const p of pub) for (const f of p.faq) { if (faqs.length >= 3) break; if (t.names.some((n) => String(f.q).includes(n))) faqs.push({ q: String(f.q), a: String(f.a), p }); }
  // 함께 보는 용어: 정의·확인할 점에 나오는 용어 → 같은 묶음
  const textAll = `${t.plain} ${t.points.join(' ')}`;
  const others = terms.filter((o) => o.slug !== t.slug);
  const mention = others.filter((o) => o.names.some((n) => n.length >= 2 && textAll.includes(n)));
  const same = others.filter((o) => o.group === t.group && !mention.includes(o));
  const idx = same.findIndex((o) => terms.indexOf(o) > terms.indexOf(t));
  const near = idx < 0 ? same.slice(-4) : [...same.slice(Math.max(0, idx - 2), idx), ...same.slice(idx, idx + 3)];
  const related = [...mention, ...near].slice(0, 8);
  const gi = terms.filter((o) => o.group === t.group); const pos = gi.indexOf(t);
  const prev = gi[pos - 1]; const next = gi[pos + 1];

  const ld = crumbLd([['홈', '/'], ['인사이트', '/insights'], ['부동산 용어사전', '/glossary'], [t.base, path]]) + jsonld({ '@context': 'https://schema.org', '@type': 'DefinedTerm', '@id': `${SITE}${path}#term`, name: t.base, ...(t.aka.length || t.name !== t.base ? { alternateName: [...new Set([t.name, ...t.aka].filter((n) => n !== t.base))] } : {}), description: t.plain, url: `${SITE}${path}`, inLanguage: 'ko-KR', inDefinedTermSet: { '@type': 'DefinedTermSet', '@id': `${SITE}/glossary#set`, name: '오르비스 부동산 용어사전', url: `${SITE}/glossary` } })
    + jsonld({ '@context': 'https://schema.org', '@type': 'WebPage', name: `${t.name} 뜻`, url: `${SITE}${path}`, description: desc, inLanguage: 'ko-KR', isPartOf: { '@id': `${SITE}/#website` }, about: { '@id': `${SITE}${path}#term` }, publisher: { '@id': `${SITE}/#organization` }, dateModified: ctx.glossaryMod || undefined });
  const head = G.headHtml({ title, description: desc, path, layout, extra: ld, image: '/assets/og-glossary.jpg' });

  const toolBox = tool ? `<a class="term-tool" href="/tools/${tool.slug}" data-track="cta_click" data-label="term_tool_${tool.slug}"><span class="ic">${icon(tool.icon)}</span><span><b>${esc(tool.name)}</b><em>${esc(tool.short)}</em></span>${ARROW}</a>` : '';
  const svc = t.link ? `<p class="term-svc">관련 서비스: <a href="${t.link[1]}">${esc(t.link[0])} ${ARROW}</a></p>` : '';
  const main = `<section class="phero"><div class="ring pr1"></div><div class="ring pr2"></div><div class="article" style="padding-top:0">
  <nav class="crumb" aria-label="현재 위치"><a href="/">홈</a> / <a href="/insights">인사이트</a> / <a href="/glossary">부동산 용어사전</a> / ${esc(t.group)}</nav>
  <p class="eyebrow" style="margin-top:14px">용어사전 · ${esc(t.group)}</p>
  <h1>${esc(t.name)}</h1>
  <p class="a-sum">${G.inline(short)}</p>
</div></section>
<section class="section tight"><div class="article"><article class="a-body term">
<h2 id="def">${esc(t.base)}의 뜻</h2>
<p>${G.inline(t.def)}</p>
${t.example ? `<div class="a-callout a-note"><b class="ac-t">계산 예시 (가정)</b><p>${G.inline(t.example)}</p></div>` : ''}
${t.points.length ? `<h2 id="points">실무에서 확인할 점</h2><ul>${t.points.map((p) => `<li>${G.inline(p)}</li>`).join('')}</ul>` : ''}
${toolBox}${svc}
${faqs.length ? `<section class="a-faq" aria-labelledby="tq-h"><h2 id="tq-h">${esc(t.base)} 관련 질문</h2>${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${G.inline(f.a)} <a class="src" href="${f.p.url}">자세히: ${esc(f.p.title)}</a></p></details>`).join('')}</section>` : ''}
${scored.length ? `<h2 id="posts">${esc(t.base)}${/[\uAC00-\uD7A3]$/.test(t.base) && (t.base.charCodeAt(t.base.length - 1) - 0xAC00) % 28 ? '이' : '가'} 나오는 글</h2><ul class="term-posts">${scored.map((p) => `<li><a href="${p.url}"><b>${esc(p.title)}</b><span>${esc(cut(p.description, 78))}</span></a></li>`).join('')}</ul>` : ''}
<h2 id="related">함께 보는 용어</h2>
<div class="chips">${related.map((o) => `<a href="/glossary/${o.slug}">${esc(o.base)}</a>`).join('')}<a class="all" href="/glossary">용어사전 전체 ${ARROW}</a></div>
<nav class="term-nav" aria-label="이전·다음 용어">${prev ? `<a href="/glossary/${prev.slug}"><span>이전 용어</span><b>${esc(prev.base)}</b></a>` : '<span></span>'}${next ? `<a class="nx" href="/glossary/${next.slug}"><span>다음 용어</span><b>${esc(next.base)}</b></a>` : '<span></span>'}</nav>
</article>
<div class="a-disclaimer"><b>안내</b><p>용어 설명은 이해를 돕기 위한 일반적인 정의이며 ${AS_OF} 기준입니다. 법령상 정확한 요건과 적용 범위는 해당 법령 원문과 전문가 확인이 필요합니다.</p></div>
<div style="margin-top:34px">${G.ctaBand(t.group === '상권·입지' ? 'analysis' : t.group === '투자·금융' || t.group === '거래·등기' ? 'investor' : t.group === '임대차' ? 'tenant' : 'owner')}</div>
</div></section>`;
  return G.pageHtml(head, layout, main);
}

// ================================================================ 계산기
const F = (n, label, { unit = '만원', value = '', hint = '', echo = true, step = '' } = {}) => `<div class="cf"><label for="c-${n}">${label}</label><div class="in"><input id="c-${n}" data-n="${n}" type="text" inputmode="decimal" autocomplete="off" value="${value}"${step ? ` data-step="${step}"` : ''}><span>${unit}</span></div>${echo && unit === '만원' ? `<small class="echo" data-echo="${n}"></small>` : ''}${hint ? `<small>${hint}</small>` : ''}</div>`;
const SEG = (name, label, opts) => `<fieldset class="cf seg"><legend>${label}</legend><div>${opts.map(([v, t], i) => `<label><input type="radio" name="${name}" value="${v}"${i === 0 ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div></fieldset>`;
const O = (k, label, cls = '') => `<div class="${cls}"><dt>${label}</dt><dd data-o="${k}">–</dd></div>`;
const MAIN = (k, label, sub = '') => `<div class="co-main"><span>${label}</span><b data-o="${k}">–</b>${sub ? `<em data-o="${sub}"></em>` : ''}</div>`;

const FORMS = {
  brokerage: () => `<div class="calc-form">
${SEG('kind', '거래 대상', [['nonres', '상가·사무실·빌딩·토지'], ['officetel', '주거용 오피스텔(85㎡ 이하)'], ['house', '주택(서울 기준)']])}
${SEG('deal', '거래 형태', [['sale', '매매·교환'], ['lease', '임대차']])}
<div data-show="deal:sale">${F('price', '매매가', { value: '300,000' })}</div>
<div class="cf2" data-show="deal:lease" hidden>${F('deposit', '보증금', { value: '10,000' })}${F('rent', '월세', { value: '500' })}</div>
${F('rate', '협의한 요율 (선택)', { unit: '%', value: '', hint: '비워 두면 상한 요율로 계산합니다.', echo: false })}
</div>
<div class="calc-out" aria-live="polite">${MAIN('fee', '중개보수 상한 (부가세 별도)', 'feeNote')}
<dl>${O('amount', '거래금액')}${O('rateOut', '상한 요율')}${O('vat', '부가세 10% 포함')}${O('agreed', '협의 요율 적용 시', 'opt')}</dl>
<p class="co-note" data-o="note"></p></div>`,
  converted: () => `<div class="calc-form">
<div class="cf"><label for="c-region">지역</label><div class="in sel"><select id="c-region" name="region"><option value="9">서울특별시</option><option value="6.9">과밀억제권역(서울 제외)·부산광역시</option><option value="5.4">광역시·세종·파주·화성·안산·용인·김포·광주</option><option value="3.7">그 밖의 지역</option></select></div></div>
<div class="cf2">${F('deposit', '보증금', { value: '5,000' })}${F('rent', '월세 (부가세 제외)', { value: '300' })}</div>
</div>
<div class="calc-out" aria-live="polite">${MAIN('hwansan', '환산보증금', 'verdict')}
<dl>${O('limit', '지역 기준')}${O('gap', '기준과의 차이')}</dl>
<table class="co-table"><thead><tr><th>보호 내용</th><th>적용 여부</th></tr></thead><tbody>
<tr><td>대항력 (건물주가 바뀌어도 임차권 주장)</td><td class="y">적용</td></tr>
<tr><td>계약갱신요구권 (최대 10년)</td><td class="y">적용</td></tr>
<tr><td>권리금 회수기회 보호</td><td class="y">적용</td></tr>
<tr><td>확정일자에 따른 우선변제권</td><td data-o="r1">–</td></tr>
<tr><td>임대료·보증금 5% 증액 상한</td><td data-o="r2">–</td></tr>
<tr><td>임차권등기명령</td><td data-o="r3">–</td></tr>
</tbody></table></div>`,
  yield: () => `<div class="calc-form">
<div class="cf2">${F('price', '매매가', { value: '450,000' })}${F('deposit', '보증금 합계', { value: '30,000' })}</div>
<div class="cf2">${F('rent', '월 임대료 합계', { value: '1,500' })}${F('vac', '공실·연체 손실률', { unit: '%', value: '5', echo: false })}</div>
<div class="cf2">${F('opex', '연 운영비', { value: '3,000', hint: '관리 인건비·수선비·보험료·재산세 등' })}${F('extra', '취득 부대비용', { value: '25,000', hint: '취득세·중개보수·등기 비용' })}</div>
<div class="cf2">${F('loan', '대출금', { value: '200,000' })}${F('ir', '대출 금리', { unit: '%', value: '4.5', echo: false })}</div>
</div>
<div class="calc-out" aria-live="polite">${MAIN('equityYield', '자기자본 수익률 (세전)', 'eqNote')}
<dl>${O('gross', '표면수익률')}${O('noi', '순영업소득(NOI)')}${O('cap', '캡레이트')}${O('equity', '투입 자기자본')}${O('interest', '연 이자')}${O('cash', '세전 현금흐름')}${O('dscr', 'DSCR (이자 기준)')}${O('stress', '금리 1%p 오르면')}</dl>
<p class="co-note" data-o="note"></p></div>`,
  area: () => `<div class="calc-form">
<div class="cf2">${F('m2', '제곱미터', { unit: '㎡', value: '99.17', echo: false })}${F('py', '평', { unit: '평', value: '30', echo: false })}</div>
<p class="cf-sep">전용률과 평당 비용</p>
<div class="cf2">${F('contract', '계약면적', { unit: '㎡', value: '330', echo: false })}${F('exclusive', '전용면적', { unit: '㎡', value: '165', echo: false })}</div>
<div class="cf2">${F('rent', '월 임대료', { value: '1,000' })}${F('mfee', '월 관리비', { value: '350' })}</div>
</div>
<div class="calc-out" aria-live="polite">${MAIN('ratio', '전용률', 'ratioNote')}
<dl>${O('cpy', '계약면적')}${O('epy', '전용면적')}${O('rentC', '계약 평당 임대료')}${O('rentE', '전용 평당 임대료')}${O('noc', '전용 평당 임대료+관리비 (NOC)')}</dl></div>`,
  acquisition: () => `<div class="calc-form">
${F('price', '매매가', { value: '300,000' })}
<div class="cf2">${F('tax', '취득세율 (농특세·지방교육세 포함)', { unit: '%', value: '4.6', echo: false })}${F('rate', '중개보수 요율', { unit: '%', value: '0.9', echo: false, hint: '0.9% 이내에서 협의' })}</div>
${F('legal', '등기·법무 비용 등', { value: '500', hint: '법무사 보수, 채권 매입 비용, 인지세 등 (직접 입력)' })}
<div class="cf2">${F('loan', '대출금', { value: '150,000' })}${F('deposit', '승계하는 보증금', { value: '20,000' })}</div>
</div>
<div class="calc-out" aria-live="polite">${MAIN('equity', '준비할 자기자본', 'eqNote')}
<dl>${O('taxOut', '취득세 등')}${O('feeOut', '중개보수 (부가세 포함)')}${O('legalOut', '등기·법무 비용 등')}${O('extra', '부대비용 합계')}${O('total', '총 필요 자금')}</dl>
<p class="co-note" data-o="note"></p></div>`,
  effective: () => `<div class="calc-form">
<div class="cf2">${F('rent', '월 임대료', { value: '1,000' })}${F('mfee', '월 관리비', { value: '350' })}</div>
<div class="cf2">${F('months', '계약 기간', { unit: '개월', value: '60', echo: false })}${F('free', '렌트프리', { unit: '개월', value: '6', echo: false })}</div>
<div class="cf2">${F('ti', '인테리어 지원금(TI)', { value: '0' })}${F('py', '전용면적 (선택)', { unit: '평', value: '50', echo: false })}</div>
</div>
<div class="calc-out" aria-live="polite">${MAIN('eff', '실효임대료 (월)', 'effNote')}
<dl>${O('nominal', '계약 기간 명목 임대료')}${O('saved', '렌트프리·TI로 줄어든 금액')}${O('disc', '명목 임대료 대비')}${O('effPy', '전용 평당 실효임대료', 'opt')}${O('nocPy', '전용 평당 실효임대료+관리비', 'opt')}</dl></div>`,
  rentinc: () => `<div class="calc-form">
<p class="cf-sep" style="margin-top:0">5% 증액 상한</p>
<div class="cf2">${F('deposit', '현재 보증금', { value: '5,000' })}${F('rent', '현재 월세', { value: '300' })}</div>
<p class="cf-sep">보증금을 월세로 바꿀 때</p>
<div class="cf2">${F('conv', '월세로 바꿀 보증금', { value: '10,000' })}${F('base', '한국은행 기준금리', { unit: '%', value: '3.00', echo: false, hint: '2026년 10월 22일 결정 기준' })}</div>
</div>
<div class="calc-out" aria-live="polite">${MAIN('rentMax', '올릴 수 있는 월세 상한', 'rentNote')}
<dl>${O('depMax', '보증금 상한')}${O('convRate', '전환율 상한')}${O('convRent', '전환 시 월세 한도')}</dl>
<p class="co-note" data-o="note"></p></div>`,
};

export const toolsForArticles = () => TOOLS.map((t) => ({ slug: t.slug, name: t.name, short: t.short, match: t.match, min: t.min }));

export function renderToolPage(t, ctx) {
  const { layout, posts, terms } = ctx;
  const path = `/tools/${t.slug}`;
  const rel = t.posts.map((s) => posts.find((p) => p.slug === s && p.status === 'published')).filter(Boolean);
  const tms = t.terms.map((n) => terms.find((x) => x.name === n)).filter(Boolean);
  const others = TOOLS.filter((x) => x.slug !== t.slug);
  const ld = crumbLd([['홈', '/'], ['부동산 계산기', '/tools'], [t.name, path]])
    + jsonld({ '@context': 'https://schema.org', '@type': 'WebApplication', name: t.name, url: `${SITE}${path}`, description: t.description, applicationCategory: 'FinanceApplication', operatingSystem: 'Web', browserRequirements: 'JavaScript 필요', inLanguage: 'ko-KR', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, provider: { '@id': `${SITE}/#organization` } })
    + jsonld({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: t.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
  const head = G.headHtml({ title: `${t.seoTitle} | ${BRAND}`, description: t.description, path, layout, extra: ld, image: '/assets/og-tools.jpg' });
  const main = `<section class="phero"><div class="ring pr1"></div><div class="ring pr2"></div><div class="wrap">
  <nav class="crumb" aria-label="현재 위치"><a href="/">홈</a> / <a href="/tools">부동산 계산기</a> / ${esc(t.name)}</nav>
  <p class="eyebrow" style="margin-top:14px">Calculator · ${AS_OF} 기준</p>
  <h1>${esc(t.name)}</h1>
  <p class="pdesc">${esc(t.lead)}</p>
</div></section>
<section class="section tight"><div class="wrap">
  <div class="calc" data-calc="${t.calc}" data-tool="${t.slug}">${FORMS[t.calc]()}</div>
  <p class="calc-foot">입력한 값은 어디에도 저장되지 않습니다. 결과는 ${AS_OF} 현행 기준으로 계산한 참고 수치이며, 실제 금액은 계약 내용과 법령 개정에 따라 달라질 수 있습니다.</p>
</div></section>
<section class="section on-white"><div class="article"><div class="a-body" style="margin-top:0">
${t.sections.map(([h, ps], i) => `<h2 id="s${i + 1}"><span class="no">${String(i + 1).padStart(2, '0')}</span>${esc(h)}</h2><ul>${ps.map((p) => `<li>${G.inline(p)}</li>`).join('')}</ul>`).join('\n')}
<section class="a-faq" aria-labelledby="faq-h"><h2 id="faq-h">자주 묻는 질문</h2>${t.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${G.inline(a)}</p></details>`).join('')}</section>
${tms.length ? `<section class="a-terms"><h2>관련 용어</h2><div class="chips">${tms.map((x) => `<a href="/glossary/${x.slug}">${esc(x.base)}</a>`).join('')}</div></section>` : ''}
${t.sources.length ? `<section class="a-sources" aria-labelledby="src-h"><h2 id="src-h">근거 자료</h2><ul>${t.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('')}</ul><p class="a-src-note">${AS_OF}에 확인한 기준입니다. 이후 개정으로 달라질 수 있습니다.</p></section>` : ''}
<div class="a-disclaimer"><b>안내</b><p>이 계산기는 일반적인 기준으로 만든 참고 도구이며 법률·세무 자문이 아닙니다. 개별 거래는 계약 내용과 최신 법령, 전문가 의견을 확인하시기 바랍니다.</p></div>
</div></div></section>
${rel.length ? `<section class="section"><div class="wrap"><p class="eyebrow">Guides</p><h2 class="sec-title">함께 읽으면 좋은 글</h2><div class="pgrid g3" style="margin-top:28px">${rel.slice(0, 3).map((p) => G.postCard(p)).join('')}</div></div></section>` : ''}
<section class="section on-white"><div class="wrap"><p class="eyebrow">More</p><h2 class="sec-title">다른 계산기</h2><div class="tool-grid" style="margin-top:26px">${others.map((x) => toolCard(x)).join('')}</div></div></section>
<section class="section tight"><div class="wrap">${G.ctaBand(t.slug === 'yield' || t.slug === 'acquisition-cost' ? 'investor' : 'tenant')}</div></section>`;
  return G.pageHtml(head, layout, main, '<script src="/tools.js?v=20261127" defer></script>');
}
const toolCard = (x) => `<a class="tool-card" href="/tools/${x.slug}"><span class="ic">${icon(x.icon)}</span><b>${esc(x.name)}</b><span>${esc(x.short)}</span><em>계산하기 ${ARROW}</em></a>`;

export function renderToolsHub(ctx) {
  const { layout } = ctx; const path = '/tools';
  const title = `부동산 계산기 모음 — 중개보수·환산보증금·수익률·평수 | ${BRAND}`;
  const desc = '상가·사무실·빌딩 거래에 필요한 계산기를 모았습니다. 중개보수 상한, 환산보증금과 상가임대차법 적용 범위, 수익률과 캡레이트, 평수·전용률, 취득 비용, 실효임대료, 임대료 5% 인상 한도를 회원가입 없이 바로 계산합니다.';
  const ld = crumbLd([['홈', '/'], ['부동산 계산기', path]]) + jsonld({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: '부동산 계산기 모음', url: `${SITE}${path}`, description: desc, isPartOf: { '@id': `${SITE}/#website` }, mainEntity: { '@type': 'ItemList', itemListElement: TOOLS.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, url: `${SITE}/tools/${t.slug}` })) } });
  const head = G.headHtml({ title, description: desc, path, layout, extra: ld, image: '/assets/og-tools.jpg' });
  const main = `<section class="phero"><div class="ring pr1"></div><div class="ring pr2"></div><div class="wrap">
  <nav class="crumb" aria-label="현재 위치"><a href="/">홈</a> / 부동산 계산기</nav>
  <p class="eyebrow" style="margin-top:14px">Calculators</p>
  <h1>상가·사무실·빌딩 거래 계산기</h1>
  <p class="pdesc">계약 전에 직접 숫자를 확인할 수 있도록 자주 쓰는 계산을 모았습니다. 회원가입 없이 쓰고, 입력한 값은 저장하지 않습니다. 요율과 기준 금액은 ${AS_OF} 현행 법령을 따랐습니다.</p>
</div></section>
<section class="section"><div class="wrap">
  <div class="tool-grid">${TOOLS.map((t) => toolCard(t)).join('')}</div>
  <div class="grid g2" style="margin-top:34px;align-items:stretch">
    <a class="card kcard" href="/analysis-tool"><div class="num-badge">${icon('route')}</div><h3>상권분석 시스템</h3><p>주소를 넣으면 반경 안의 점포 구성과 업종 경쟁, 층별 임대료 참고값, 주변 실거래를 보여 줍니다.</p><span class="more">상권분석 시작하기 ${ARROW}</span></a>
    <a class="card kcard" href="/valuation"><div class="num-badge">${icon('chart')}</div><h3>매각가 검토 리포트</h3><p>지번을 알려 주시면 인근 거래사례와 공시지가, 건축물대장으로 건물의 매각 가격을 검토합니다.</p><span class="more">거래사례 보기 ${ARROW}</span></a>
  </div>
  <div class="topic-others"><b>함께 보기</b><a href="/guides">실무 길잡이</a><a href="/glossary">부동산 용어사전</a><a href="/insights">인사이트</a><a href="/faq">자주 묻는 질문</a></div>
</div></section>
<section class="section tight"><div class="wrap">${G.ctaBand('owner')}</div></section>`;
  return G.pageHtml(head, layout, main);
}

// ================================================================ 길잡이
function resolveLinks(list, posts) {
  const out = [];
  for (const it of list || []) {
    if (Array.isArray(it)) out.push({ title: it[0], url: it[1], kind: /^\/tools\//.test(it[1]) ? '계산기' : /^\/insight/.test(it[1]) ? '글' : '바로가기' });
    else { const p = posts.find((x) => x.slug === it && x.status === 'published'); if (p) out.push({ title: p.title, url: p.url, kind: '글', post: p }); }
  }
  return out;
}
export function guideProblems(posts) {
  const out = [];
  for (const g of GUIDES) for (const [, , list] of g.steps) for (const it of list) if (!Array.isArray(it) && !posts.find((p) => p.slug === it)) out.push(`길잡이 ${g.slug}: 글 ${it} 없음`);
  return out;
}
export function renderGuidePage(g, ctx) {
  const { layout, posts, terms } = ctx; const path = `/guides/${g.slug}`;
  const steps = g.steps.map(([h, d, list]) => ({ h, d, links: resolveLinks(list, posts) }));
  const used = new Set(steps.flatMap((s) => s.links.filter((l) => l.post).map((l) => l.post.slug)));
  // 길잡이에 아직 넣지 않은 같은 분야의 새 글 (새 글이 올라오면 자동으로 붙습니다)
  const more = posts.filter((p) => p.status === 'published' && !p.legacy && g.cats.includes(p.category) && !used.has(p.slug)).slice(0, 6);
  const tls = (g.tools || []).map((s) => TOOLS.find((t) => t.slug === s)).filter(Boolean);
  const tms = (g.terms || []).map((n) => terms.find((x) => x.name === n)).filter(Boolean);
  // 자주 묻는 질문: 단계에 묶은 글의 첫 질문을 모읍니다
  const faqs = [];
  for (const s of steps) for (const l of s.links) { if (faqs.length >= 6) break; if (l.post && l.post.faq[0] && !faqs.find((f) => f.p === l.post)) faqs.push({ q: String(l.post.faq[0].q), a: String(l.post.faq[0].a), p: l.post }); }
  const mod = [...used].map((s) => posts.find((p) => p.slug === s)).filter(Boolean).reduce((m, p) => (!m || p.date > m ? p.date : m), null);
  const ld = crumbLd([['홈', '/'], ['실무 길잡이', '/guides'], [g.name, path]])
    + jsonld({ '@context': 'https://schema.org', '@type': 'Article', headline: g.h1, description: g.description, url: `${SITE}${path}`, mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}${path}` }, inLanguage: 'ko-KR', image: { '@type': 'ImageObject', url: `${SITE}/assets/og-guides.jpg`, width: 1200, height: 630 }, author: { '@type': 'Organization', '@id': `${SITE}/#organization`, name: BRAND, url: `${SITE}/` }, publisher: { '@type': 'Organization', '@id': `${SITE}/#organization`, name: BRAND, logo: { '@type': 'ImageObject', url: `${SITE}/assets/logo-full.png` } }, datePublished: '2026-11-27T11:00:00+09:00', dateModified: mod ? G.isoKst(mod) : '2026-11-27T11:00:00+09:00', isAccessibleForFree: true })
    + jsonld({ '@context': 'https://schema.org', '@type': 'ItemList', name: `${g.name} 단계`, itemListOrder: 'https://schema.org/ItemListOrderAscending', numberOfItems: steps.length, itemListElement: steps.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.h, description: s.d, url: `${SITE}${path}#step${i + 1}` })) });
  const head = G.headHtml({ title: `${g.seoTitle} | ${BRAND}`, description: g.description, path, layout, extra: ld, image: '/assets/og-guides.jpg', ogType: 'article' });
  const main = `<section class="phero"><div class="ring pr1"></div><div class="ring pr2"></div><div class="article" style="padding-top:0">
  <nav class="crumb" aria-label="현재 위치"><a href="/">홈</a> / <a href="/guides">실무 길잡이</a> / ${esc(g.name)}</nav>
  <p class="eyebrow" style="margin-top:14px">Guide · ${steps.length}단계</p>
  <h1>${G.tidyTitle(g.h1)}</h1>
  <p class="a-sum">${esc(g.lead)}</p>
  <div class="toc"><b>한눈에 보는 순서</b><ol>${steps.map((s, i) => `<li><a href="#step${i + 1}">${esc(s.h)}</a></li>`).join('')}</ol></div>
</div></section>
<section class="section tight"><div class="article"><article class="a-body guide">
${steps.map((s, i) => `<section class="gd-step" id="step${i + 1}"><h2><span class="no">${String(i + 1).padStart(2, '0')}</span>${esc(s.h)}</h2><p>${esc(s.d)}</p>${s.links.length ? `<ul class="gd-links">${s.links.map((l) => `<li><a href="${l.url}"><em>${l.kind}</em><b>${esc(l.title)}</b>${l.post ? `<span>${esc(cut(l.post.description, 70))}</span>` : ''}</a></li>`).join('')}</ul>` : ''}</section>`).join('\n')}
${tls.length || (g.extra || []).length ? `<aside class="a-tools" aria-label="관련 도구"><b>이 과정에서 쓰는 도구</b><div>${tls.map((t) => `<a href="/tools/${t.slug}"><strong>${esc(t.name)}</strong><span>${esc(t.short)}</span></a>`).join('')}${(g.extra || []).map(([n, u]) => `<a href="${u}"><strong>${esc(n)}</strong><span>오르비스 서비스 바로가기</span></a>`).join('')}</div></aside>` : ''}
${faqs.length ? `<section class="a-faq" aria-labelledby="gq-h"><h2 id="gq-h">자주 묻는 질문</h2>${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${G.inline(f.a)} <a class="src" href="${f.p.url}">자세히: ${esc(f.p.title)}</a></p></details>`).join('')}</section>` : ''}
${tms.length ? `<section class="a-terms"><h2>알아 둘 용어</h2><div class="chips">${tms.map((x) => `<a href="/glossary/${x.slug}">${esc(x.base)}</a>`).join('')}<a class="all" href="/glossary">용어사전 전체 ${ARROW}</a></div></section>` : ''}
<div class="a-disclaimer"><b>안내</b><p>${G.DISCLAIMER}</p></div>
</article>
<div style="margin-top:34px">${G.ctaBand(g.cta)}</div>
</div></section>
${more.length ? `<section class="section on-white"><div class="wrap"><p class="eyebrow">More</p><h2 class="sec-title">더 읽을 글</h2><div class="pgrid g3" style="margin-top:28px">${more.slice(0, 6).map((p) => G.postCard(p)).join('')}</div></div></section>` : ''}
<section class="section"><div class="wrap"><div class="topic-others" style="margin-top:0;border-top:0;padding-top:0"><b>다른 길잡이</b>${GUIDES.filter((x) => x.slug !== g.slug).map((x) => `<a href="/guides/${x.slug}">${esc(x.name)}</a>`).join('')}</div></div></section>`;
  return G.pageHtml(head, layout, main);
}
export function renderGuidesHub(ctx) {
  const { layout, posts } = ctx; const path = '/guides';
  const title = `부동산 실무 길잡이 — 매각·매입·임대차·출점·공실 단계별 안내 | ${BRAND}`;
  const desc = '건물 매각, 꼬마빌딩 매입, 상가 임대차, 사무실 임대, 프랜차이즈 출점, 공실 해소, 상권분석까지. 무엇부터 해야 하는지 단계별로 정리하고 단계마다 읽을 글과 계산기를 묶은 오르비스중개법인의 실무 길잡이입니다.';
  const ld = crumbLd([['홈', '/'], ['실무 길잡이', path]]) + jsonld({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: '부동산 실무 길잡이', url: `${SITE}${path}`, description: desc, isPartOf: { '@id': `${SITE}/#website` }, mainEntity: { '@type': 'ItemList', itemListElement: GUIDES.map((g, i) => ({ '@type': 'ListItem', position: i + 1, name: g.name, url: `${SITE}/guides/${g.slug}` })) } });
  const head = G.headHtml({ title, description: desc, path, layout, extra: ld, image: '/assets/og-guides.jpg' });
  const n = (g) => g.steps.reduce((k, s) => k + resolveLinks(s[2], posts).filter((l) => l.post).length, 0);
  const main = `<section class="phero"><div class="ring pr1"></div><div class="ring pr2"></div><div class="wrap">
  <nav class="crumb" aria-label="현재 위치"><a href="/">홈</a> / 실무 길잡이</nav>
  <p class="eyebrow" style="margin-top:14px">Guides</p>
  <h1>무엇부터 해야 하는지,<br>순서대로 정리했습니다</h1>
  <p class="pdesc">건물을 팔 때, 살 때, 빌릴 때, 매장을 낼 때 거치는 과정을 단계로 나누고, 단계마다 읽을 글과 계산기를 묶었습니다. 새 글이 올라오면 해당 길잡이에 함께 실립니다.</p>
</div></section>
<section class="section"><div class="wrap">
  <div class="gd-grid">${GUIDES.map((g) => `<a class="gd-card" href="/guides/${g.slug}"><span class="ic">${icon('route')}</span><b>${esc(g.name)}</b><span>${esc(g.short)}</span><em>${g.steps.length}단계 · 글 ${n(g)}편 ${ARROW}</em></a>`).join('')}</div>
  <div class="topic-others"><b>함께 보기</b><a href="/tools">부동산 계산기</a><a href="/glossary">부동산 용어사전</a><a href="/insights">인사이트 전체</a><a href="/faq">자주 묻는 질문</a></div>
</div></section>
<section class="section tight"><div class="wrap">${G.ctaBand('owner')}</div></section>`;
  return G.pageHtml(head, layout, main);
}

// ================================================================ 사이트 검색
export function renderSearchPage(ctx) {
  const { layout } = ctx; const path = '/search';
  const head = G.headHtml({ title: `검색 | ${BRAND}`, description: '오르비스중개법인 홈페이지의 인사이트 글, 용어사전, 계산기, 길잡이, 자주 묻는 질문을 한 번에 찾습니다.', path, layout, robots: 'noindex,follow', extra: crumbLd([['홈', '/'], ['검색', path]]) });
  const main = `<section class="phero"><div class="ring pr1"></div><div class="ring pr2"></div><div class="wrap">
  <nav class="crumb" aria-label="현재 위치"><a href="/">홈</a> / 검색</nav>
  <h1>무엇을 찾으세요?</h1>
  <form class="sr-form" id="srForm" role="search" action="/search" method="get"><label class="skip" for="srQ">검색어</label><input id="srQ" name="q" type="search" placeholder="예: 환산보증금, 꼬마빌딩 실사, 렌트프리" autocomplete="off" enterkeyhint="search"><button type="submit" class="btn btn-navy">검색</button></form>
  <div class="sr-hints" id="srHints"><span>많이 찾는 말</span><a href="/search?q=환산보증금">환산보증금</a><a href="/search?q=중개보수">중개보수</a><a href="/search?q=권리금">권리금</a><a href="/search?q=수익률">수익률</a><a href="/search?q=공실">공실</a><a href="/search?q=사무실 임대">사무실 임대</a><a href="/search?q=출점">출점</a></div>
</div></section>
<section class="section tight"><div class="wrap">
  <div class="sr-tabs" id="srTabs" role="group" aria-label="종류 고르기" hidden></div>
  <p class="sr-count" id="srCount" aria-live="polite"></p>
  <div class="sr-list" id="srList"></div>
  <noscript><p>검색은 자바스크립트를 켜야 쓸 수 있습니다. <a href="/insights">인사이트</a>, <a href="/glossary">용어사전</a>, <a href="/tools">계산기</a>에서 직접 찾아보실 수 있습니다.</p></noscript>
  <div class="topic-others" id="srBrowse"><b>둘러보기</b><a href="/insights">인사이트</a><a href="/guides">실무 길잡이</a><a href="/tools">부동산 계산기</a><a href="/glossary">용어사전</a><a href="/faq">자주 묻는 질문</a><a href="/properties">매물</a></div>
</div></section>`;
  return G.pageHtml(head, layout, main, '<script src="/search.js?v=20261127" defer></script>');
}

export function buildSearchIndex({ posts, terms, faqGroups, staticPages }) {
  const items = [];
  const heads = (md) => (String(md).match(/^#{2,3}\s+.*$/gm) || []).map((h) => h.replace(/^#+\s+/, '')).join(' ');
  for (const g of GUIDES) items.push({ k: '길잡이', t: g.name, u: `/guides/${g.slug}`, d: g.short, x: g.steps.map((s) => s[0]).join(' ') });
  for (const t of TOOLS) items.push({ k: '계산기', t: t.name, u: `/tools/${t.slug}`, d: t.short, x: `${t.match.replace(/\|/g, ' ')} ${t.faq.map((f) => f[0]).join(' ')}` });
  for (const p of posts.filter((x) => x.status === 'published')) {
    items.push({ k: '글', t: p.title, u: p.url, d: cut(p.description, 110), x: `${(p.keywords || []).join(' ')} ${p.legacy ? '' : heads(p.body)}`, c: G.CATEGORIES[p.category]?.name || '', m: p.date ? G.ymd(p.date) : '' });
    for (const f of p.faq || []) items.push({ k: '질문', t: String(f.q), u: p.url, d: cut(String(f.a), 120), x: p.title });
  }
  for (const t of terms) items.push({ k: '용어', t: t.name, u: `/glossary/${t.slug}`, d: cut(t.plain, 110), x: t.names.join(' ') });
  for (const g of faqGroups || []) for (const it of g.items) items.push({ k: '질문', t: it.q, u: '/faq', d: cut(stripMd(it.a.join(' ')), 120), x: g.name });
  for (const s of staticPages || []) items.push({ k: '페이지', t: s.title, u: s.path, d: cut(s.description, 110), x: s.h1 || '' });
  return items;
}

// ================================================================ llms.txt
export function renderLlms({ posts, terms }) {
  const pub = posts.filter((p) => p.status === 'published');
  return `# 오르비스중개법인 (ORBIS Real Estate Brokerage)

> 서울 강남구 테헤란로의 상업용 부동산 중개법인입니다. 프랜차이즈 임대차, 공실 해소, 자산관리(PM), 중소형 빌딩 매입·매각 자문을 한 흐름으로 맡습니다. 이 파일은 검색·AI 서비스가 사이트 내용을 정확히 읽도록 정리한 요약입니다. 전체 요약본은 ${SITE}/llms-full.txt 에 있습니다.

- 상호: 오르비스중개법인 · 대표 이상민
- 중개사무소 개설등록번호: 11680-2025-00157
- 주소: 서울특별시 강남구 테헤란로 123, 6층 615호
- 전화: 010-7379-5265 · 운영시간: 평일 10:00–18:00
- 홈페이지: ${SITE}
- 주요 지역: 서울, 경기, 인천

## 서비스 (임차인 유치에서 매각까지 4단계)

1. [프랜차이즈 임대차 자문](${SITE}/solution-franchise): 브랜드 출점 기준 정리, 후보지 소싱, 상권분석, 임대차 조건 협상(렌트프리·인도 조건 등).
2. [공실 해소 솔루션](${SITE}/solution-execution): 비어 있는 층의 용도와 임차인 구성(MD)을 다시 짜는 리포지셔닝, 임대 마케팅. 기획 단계는 [리포지셔닝·MD 기획](${SITE}/solution-strategy).
3. [자산관리(PM)](${SITE}/solution-value): 임대차 관리, 시설관리, 운영비(OPEX) 점검으로 순영업소득(NOI) 개선.
4. [매입·매각 자문](${SITE}/solution-transaction): 거래사례 비교로 매각가 검토, 매각 투자안내서(IM) 작성, 매수인 마케팅, 매수의향서(LOI)·매매계약 진행.

기본 생각: 자산가치 ≈ 순영업소득(NOI) ÷ 환원수익률(Cap Rate). 임대수익을 안정시키고 운영비를 줄이는 일이 매각가의 근거가 됩니다. 결과는 자산과 시장 여건에 따라 달라지며 수익을 보장하지 않습니다.

## 바로 쓸 수 있는 것

- [공개 매물](${SITE}/properties): 사무실·상가 임대, 중소형 빌딩 매매. 실제 의뢰받은 매물만 법정 표시사항과 함께 게시합니다.
- [맞춤 매물 의뢰](${SITE}/lease-request): 지역·면적·예산을 남기면 조건에 맞는 공간을 찾아 안내합니다.
- [매각가 검토 리포트](${SITE}/valuation): 지번을 알려 주면 인근 실거래 사례·공시지가·건축물대장으로 매각 가격을 검토합니다. 감정평가서가 아닌 참고자료입니다.
- [공동중개](${SITE}/cobroke): 구하는 물건 공고와 중개사무소 물건 접수.
- [건물 1차 진단](${SITE}/owners): 공실·임대·매각 방향을 무료로 1차 검토합니다.
- [상권분석 시스템](${SITE}/analysis-tool): 주소 반경의 점포 구성, 임대료 참고값, 실거래를 무료로 봅니다.

## 계산기 (${AS_OF} 현행 기준, 무료)

${TOOLS.map((t) => `- [${t.name}](${SITE}/tools/${t.slug}): ${t.short}.`).join('\n')}

## 실무 길잡이 (단계별 안내)

${GUIDES.map((g) => `- [${g.name}](${SITE}/guides/${g.slug}): ${g.short}.`).join('\n')}

## 읽을거리

- [인사이트](${SITE}/insights): 시장 동향·투자·상권분석·계약·법률 실무 글 ${pub.length}편, 매일 새 글.
- [부동산 용어사전](${SITE}/glossary): 임대차·투자·상권·등기 용어 ${terms.length}개, 용어마다 개별 페이지.
- [자주 묻는 질문](${SITE}/faq)
- [회사 소개](${SITE}/about) · [대표 소개](${SITE}/leadership)

### 최근 글

${pub.slice(0, 12).map((p) => `- [${p.title}](${SITE}${p.url}): ${cut(p.description, 90)}`).join('\n')}

## 파트너

- [라운지엑스 파트너사](${SITE}/partner-loungex): 점포개발 상권분석자문.

## 알아 둘 점

- 중개보수는 공인중개사법령이 정한 상한 안에서 계약 전에 협의합니다.
- 사이트의 수치와 사례는 작성 시점 기준이며, 개별 거래의 결과를 약속하지 않습니다.
- 법령·요율·기준금리처럼 바뀌는 값에는 기준 시점을 적었습니다. 인용할 때 기준 시점을 함께 밝혀 주세요.
`;
}

export function renderLlmsFull({ posts, terms, faqGroups }) {
  const pub = posts.filter((p) => p.status === 'published');
  const out = [];
  out.push(`# 오르비스중개법인 전체 요약본 (llms-full.txt)\n\n> ${SITE} 의 핵심 내용을 한 파일로 모았습니다. 회사 정보, 서비스, 계산 기준, 용어 정의, 글 요약과 자주 묻는 질문을 담았습니다. 수치와 법령은 각 항목의 기준 시점을 따릅니다.\n`);
  out.push(`## 회사\n\n오르비스중개법인(대표 이상민, 중개사무소 개설등록번호 11680-2025-00157)은 서울특별시 강남구 테헤란로 123, 6층 615호에 있는 상업용 부동산 중개법인입니다. 전화 010-7379-5265, 평일 10:00–18:00. 서울·경기·인천의 중소형 빌딩, 상가, 오피스를 주로 다루며 프랜차이즈 임대차 → 공실 해소 → 자산관리(PM) → 매입·매각 자문의 네 단계 서비스를 제공합니다. 설계·시공·운영·법무·세무는 관계사와 외부 전문기관이 별도 계약으로 맡습니다. 중개보수는 공인중개사법령이 정한 상한 안에서 계약 전에 협의합니다.\n`);
  out.push(`## 계산 기준 (${AS_OF} 현재)\n\n${TOOLS.map((t) => `### ${t.name}\n${SITE}/tools/${t.slug}\n${t.sections.map(([h, ps]) => `${h}: ${ps.join(' ')}`).join('\n')}\n${t.faq.map(([q, a]) => `Q. ${q}\nA. ${a}`).join('\n')}`).join('\n\n')}\n`);
  out.push(`## 실무 길잡이\n\n${GUIDES.map((g) => `### ${g.h1}\n${SITE}/guides/${g.slug}\n${g.lead}\n${g.steps.map((s, i) => `${i + 1}. ${s[0]}: ${s[1]}`).join('\n')}`).join('\n\n')}\n`);
  out.push(`## 용어사전 (${terms.length}개)\n\n${terms.map((t) => `### ${t.name}\n${SITE}/glossary/${t.slug}\n${t.plain}${t.example ? `\n계산 예시(가정): ${t.example}` : ''}${t.points.length ? `\n확인할 점: ${t.points.join(' ')}` : ''}`).join('\n\n')}\n`);
  out.push(`## 자주 묻는 질문 (회사·서비스)\n\n${(faqGroups || []).map((g) => g.items.map((it) => `Q. ${it.q}\nA. ${stripMd(it.a.join(' '))}`).join('\n\n')).join('\n\n')}\n`);
  out.push(`## 인사이트 글 요약 (${pub.length}편)\n\n${pub.map((p) => `### ${p.title}\n${SITE}${p.url}\n발행 ${p.date ? G.ymd(p.date) : ''}${p.updated && p.updated > p.date ? ` · 수정 ${G.ymd(p.updated)}` : ''} · 분야 ${G.CATEGORIES[p.category]?.name || ''}\n${p.summary || p.description}\n${(p.faq || []).map((f) => `Q. ${f.q}\nA. ${f.a}`).join('\n')}`).join('\n\n')}\n`);
  return out.join('\n');
}

export { TOOLS, GUIDES, KEYWORDS };
