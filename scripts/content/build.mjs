#!/usr/bin/env node
// 오르비스중개법인 사이트 콘텐츠 빌드
//   content/insights/*.md  → insights/<slug>.html, 주제 페이지, 인사이트 목록, 홈 최신 글
//   content/pages/*.md     → glossary.html, faq.html
//   content/properties.json → properties.html 공개 매물 목록
//   content/settings.json  → app.js 설정값(이메일·카카오·GA·공지 띠)
//   + sitemap.xml, rss.xml, content/insights/index.json(관리자 화면용 목록)
//
// 사용법: node scripts/content/build.mjs [--now 2026-10-27T11:00:00+09:00] [--check] [--preview 폴더]
//   --check   : 파일을 쓰지 않고 점검만 합니다 (오류가 있으면 종료 코드 1)
//   --preview : 예약 글까지 포함해 지정 폴더에 미리보기 파일을 만듭니다 (저장소 파일은 그대로)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as G from './sitegen.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
const NOW = opt('--now') ? new Date(opt('--now')) : new Date();
const CHECK = !!opt('--check');
const PREVIEW = opt('--preview');
const OUT = PREVIEW ? path.resolve(PREVIEW) : ROOT;

const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const written = [];
function wr(rel, text) {
  if (CHECK) return;
  const full = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const prev = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
  if (prev !== text) { fs.writeFileSync(full, text); written.push(rel); }
}
function replaceBetween(src, start, end, inner, label) {
  const a = src.indexOf(start); const b = src.indexOf(end);
  if (a < 0 || b < 0 || b < a) throw new Error(`${label}: 표시(${start})를 찾을 수 없습니다.`);
  return src.slice(0, a + start.length) + '\n' + inner + '\n' + src.slice(b);
}

// ---------------------------------------------------------------- 읽기
const site = JSON.parse(rd('content/site.json'));
const settings = exists('content/settings.json') ? JSON.parse(rd('content/settings.json')) : {};
const layout = G.extractLayout(rd(site.layoutFrom || 'insights.html'));
if (settings.cssVersion) layout.cssVer = settings.cssVersion;

const dir = path.join(ROOT, 'content/insights');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
const all = [];
const problems = [];
for (const f of files) {
  const slug = f.replace(/\.md$/, '');
  if (slug !== G.slugify(slug)) { problems.push(`${f}: 파일 이름은 영문 소문자·숫자·하이픈만 씁니다.`); continue; }
  const post = G.makePost(slug, fs.readFileSync(path.join(dir, f), 'utf8'), NOW);
  if (PREVIEW && post.status === 'scheduled') post.status = 'published';
  // 대표 이미지를 따로 적지 않았어도 assets/insights/<글주소>.jpg가 있으면 공유 이미지로 씁니다
  if (!post.cover && exists(`assets/insights/${slug}.jpg`)) post.cover = `/assets/insights/${slug}.jpg`;
  const lint = G.lintPost(post);
  post.lint = lint;
  if (lint.errors.length && post.status !== 'draft') problems.push(`${f}: ${lint.errors.join(' / ')}`);
  all.push(post);
}
// 예전 방식으로 만든 글(insight-vacancy 등)도 목록·사이트맵·RSS에 함께 싣습니다
for (const l of site.legacyPosts || []) {
  const date = G.parseKstDate(l.date);
  all.push({ ...l, slug: l.slug, url: l.url, date, updated: null, status: 'published', legacy: true, keywords: [], faq: [], sources: [], related: [], readMin: l.readMin || 6, summary: l.description });
}
const byDate = (a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0);
all.sort(byDate);
const published = all.filter((p) => p.status === 'published');
const ctx = { layout, posts: published, now: NOW };

if (problems.length) {
  console.error('점검에서 막힌 글:\n- ' + problems.join('\n- '));
  if (CHECK) process.exit(1);
}
for (const p of all.filter((x) => !x.legacy)) {
  if (p.lint.warnings.length) console.log(`[참고] ${p.slug}: ${p.lint.warnings.join(' / ')}`);
}
// 오류가 있는 글은 공개하지 않습니다
const blocked = new Set(problems.map((x) => x.split('.md')[0]));
for (const p of all) if (blocked.has(p.slug) && p.status === 'published') p.status = 'blocked';
const live = all.filter((p) => p.status === 'published');
ctx.posts = live;

// ---------------------------------------------------------------- 글 페이지
const liveSlugs = new Set();
for (const p of live.filter((x) => !x.legacy)) {
  wr(`insights/${p.slug}.html`, G.renderArticle(p, ctx));
  liveSlugs.add(p.slug);
}
// 내린 글·삭제한 글의 페이지 정리
if (!CHECK && !PREVIEW && fs.existsSync(path.join(ROOT, 'insights'))) {
  for (const f of fs.readdirSync(path.join(ROOT, 'insights'))) {
    if (f.endsWith('.html') && !liveSlugs.has(f.replace(/\.html$/, ''))) { fs.unlinkSync(path.join(ROOT, 'insights', f)); written.push(`insights/${f} (삭제)`); }
  }
}
for (const k of G.CATEGORY_KEYS) wr(`insights/topics/${k}.html`, G.renderTopic(k, ctx));

// ---------------------------------------------------------------- 인사이트 목록 페이지
{
  const latest = live[0]?.date ? G.dotDate(live[0].date) : '';
  const head = G.headHtml({
    title: '부동산 인사이트 — 시장동향·투자·상권분석·계약 가이드 | 오르비스중개법인',
    description: '부동산 시장동향, 꼬마빌딩·상가 투자, 상권분석과 점포개발, 상가 임대차·권리금 같은 계약·법률, 공실·자산관리까지. 강남 부동산 중개법인 오르비스가 실무 기준으로 정리한 가이드입니다.',
    path: '/insights', layout,
    extra: `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '홈', item: `${G.SITE}/` }, { '@type': 'ListItem', position: 2, name: '인사이트', item: `${G.SITE}/insights` }] })}</script><script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Blog', name: '오르비스중개법인 인사이트', url: `${G.SITE}/insights`, publisher: { '@type': 'Organization', '@id': `${G.SITE}/#organization`, name: G.BRAND }, blogPost: live.slice(0, 20).map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: `${G.SITE}${p.url}`, datePublished: G.isoKst(p.date) })) })}</script>`,
  });
  const main = `<section class="phero"><div class="ring pr1"></div><div class="ring pr2"></div><div class="wrap">
  <nav class="crumb" aria-label="현재 위치"><a href="/">홈</a> / 인사이트</nav><h1>의사결정을 돕는<br>부동산 인사이트</h1><p class="pdesc">건물주와 투자자, 창업자가 실제로 묻는 질문에 답합니다. 공적자료·통계는 출처와 기준일을 표기하고, 추정과 의견은 따로 구분해 씁니다. 새 글은 매일 오전 11시에 올라옵니다.</p>
  <div class="ihero-meta"><span>전체 <b>${live.length}</b>편</span>${latest ? `<span>최근 발행 <b>${latest}</b></span>` : ''}<a href="/rss.xml">RSS 구독</a></div>
</div></section>

<section class="section"><div class="wrap">
  <p class="eyebrow">Topics</p>
  <h2 class="sec-title reveal">분야별로 읽기</h2>
  <div class="tgrid" style="margin-top:28px">${G.topicHubCards(live)}</div>
</div></section>

<section class="section on-white" id="latest"><div class="wrap">
  <p class="eyebrow">Latest</p>
  <h2 class="sec-title">최신 글</h2>
  <div style="margin-top:26px">
<!-- INSIGHTS-LIST:START -->
${G.listingSection(live)}
<!-- INSIGHTS-LIST:END -->
  </div>
  <div style="margin-top:28px"><div class="note cool"><div class="nk">콘텐츠 원칙</div><p>가상의 통계·후기·사례로 채우지 않습니다. 시장 데이터가 필요한 글은 출처·기준일을 확인한 뒤 발행하며, 법령이 바뀌면 글을 고치고 수정일을 표시합니다.</p></div></div>
</div></section>

<section class="section"><div class="wrap">
  <div class="grid g2" style="align-items:stretch">
    <a class="card reveal kcard" href="/glossary"><div class="num-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM20 17v4H6.5A2.5 2.5 0 0 1 4 18.5"/></svg></div><h3>부동산 용어사전</h3><p>환산보증금, 대항력, 렌트롤, 캡레이트, 근린생활시설까지. 계약서와 투자 자료에 자주 나오는 용어를 분야별로 정리했습니다.</p><span class="more">용어사전 보기 ${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'}</span></a>
    <a class="card reveal kcard" href="/faq"><div class="num-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/></svg></div><h3>자주 묻는 질문</h3><p>중개보수, 상담 절차, 상권분석 시스템, 비공개 매물, 건물 1차 진단까지. 오르비스에 처음 문의하실 때 많이 묻는 내용을 모았습니다.</p><span class="more">질문 모음 보기 ${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'}</span></a>
  </div>
</div></section>

<section class="section on-white"><div class="wrap">
  <div class="grid g2" style="align-items:stretch">
    <div class="card reveal" style="display:flex;flex-direction:column;justify-content:space-between">
      <div><div class="num-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0l-5-5m5 5l5-5M4 21h16"/></svg></div><h3>회사소개서 (2026)</h3>
      <p>4대 솔루션, 프로세스, 사례와 파트너 원칙을 담은 24페이지 소개서를 바로 받아보실 수 있습니다.</p></div>
      <a href="/assets/orbis_company_profile_2026.pdf" class="btn btn-navy" style="margin-top:18px;align-self:flex-start" data-track="download_profile" download><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0l-5-5m5 5l5-5M4 21h16"/></svg> PDF 다운로드</a>
    </div>
    <div class="panel reveal">
      <h3>뉴스레터 구독</h3>
      <p class="p-desc">새 글과 리포트, 공개 사례 업데이트를 이메일로 보내드립니다. 광고성 정보는 보내지 않습니다.</p>
      <form class="news"><div class="hp" aria-hidden="true"><label>웹사이트<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
        <div class="field"><label for="fld-1">이메일 <span class="req">*</span></label><input id="fld-1" type="email" required placeholder="you@email.com"></div>
        <label class="consent"><input type="checkbox" required><span>뉴스레터 수신 및 이메일 수집·이용에 동의합니다. (<a href="/privacy" target="_blank">개인정보처리방침</a>)</span></label>
        <button type="submit" class="btn btn-gold" style="width:100%;justify-content:center">구독 신청</button>
      </form>
    </div>
  </div>
</div></section>
<section class="section tight"><div class="wrap">${G.ctaBand('owner')}</div></section>`;
  wr('insights.html', G.pageHtml(head, layout, main, G.LISTING_SCRIPT));
}

// ---------------------------------------------------------------- 홈 최신 글
{
  let home = rd('index.html');
  const cards = live.slice(0, 3).map((p) => G.postCard(p, { reveal: true })).join('\n');
  home = replaceBetween(home, '<!-- HOME-INSIGHTS:START -->', '<!-- HOME-INSIGHTS:END -->', `<div class="pgrid g3" style="margin-top:34px">\n${cards}\n</div>`, 'index.html');
  wr('index.html', home);
}

// ---------------------------------------------------------------- 서비스 페이지의 '관련 가이드' (내부 링크 자동 갱신)
for (const f of fs.readdirSync(ROOT).filter((x) => x.endsWith('.html'))) {
  let html = rd(f);
  if (!html.includes('<!-- RELATED-INSIGHTS:START')) continue;
  html = html.replace(/<!-- RELATED-INSIGHTS:START ([a-z,]+) -->[\s\S]*?<!-- RELATED-INSIGHTS:END -->/g, (_, cats) => {
    const want = cats.split(','); const pick = [];
    for (const c of want) { const p = live.find((x) => x.category === c && !pick.includes(x)); if (p) pick.push(p); }
    for (const p of live.filter((x) => want.includes(x.category))) { if (pick.length >= 3) break; if (!pick.includes(p)) pick.push(p); }
    const inner = pick.length ? `<section class="section on-white related-insights"><div class="wrap"><p class="eyebrow">Guides</p><h2 class="sec-title">함께 보면 좋은 실무 가이드</h2><div class="pgrid g3" style="margin-top:28px">${pick.slice(0, 3).map((p) => G.postCard(p)).join('')}</div><p class="more-line"><a class="more" href="/insights">인사이트 전체 보기 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></p></div></section>` : '';
    return `<!-- RELATED-INSIGHTS:START ${cats} -->\n${inner}\n<!-- RELATED-INSIGHTS:END -->`;
  });
  wr(f, html);
}

// ---------------------------------------------------------------- 용어사전 · FAQ
if (exists('content/pages/glossary.md')) wr('glossary.html', G.renderGlossary(rd('content/pages/glossary.md'), ctx));
if (exists('content/pages/faq.md')) wr('faq.html', G.renderFaq(rd('content/pages/faq.md'), ctx));

// ---------------------------------------------------------------- 매물
if (exists('content/properties.json') && exists('properties.html')) {
  const props = JSON.parse(rd('content/properties.json'));
  let html = rd('properties.html');
  html = replaceBetween(html, '<!-- PROPERTIES:START -->', '<!-- PROPERTIES:END -->', G.renderPropertyCards(props.items || []), 'properties.html');
  // 매물 구분 카드의 상태 표시: 공개 매물이 있으면 '공개 매물 N건'으로 바꿈
  const pubItems = (props.items || []).filter((x) => x && x.status === 'public');
  const cnt = { '매매': pubItems.filter((x) => /매매/.test(x.deal || '')).length, '임대': pubItems.filter((x) => /월세|전세|임대/.test(x.deal || '')).length };
  for (const [h3, n] of Object.entries(cnt)) {
    const k = html.indexOf(`<h3>${h3}</h3>`); if (k < 0) continue;
    const m = html.slice(k).match(/<(span|a) class="status[^"]*"[^>]*><span class="dot"><\/span>[^<]*<\/\1>/);
    if (!m) continue;
    const rep = n ? `<a class="status live" href="#listings"><span class="dot"></span>공개 매물 ${n}건</a>` : '<span class="status prep"><span class="dot"></span>공개 매물 준비 중</span>';
    const at = k + m.index;
    html = html.slice(0, at) + rep + html.slice(at + m[0].length);
  }
  wr('properties.html', html);
}

// ---------------------------------------------------------------- 설정값 → app.js
if (exists('app.js')) {
  let js = rd('app.js');
  const setStr = (key, val) => {
    const re = new RegExp(`(\\n\\s*${key}:\\s*)"[^"\\n]*"`);
    if (re.test(js)) js = js.replace(re, `$1${JSON.stringify(String(val ?? ''))}`);
  };
  if ('contactEmail' in settings) setStr('CONTACT_EMAIL', settings.contactEmail);
  if ('kakaoChannel' in settings) setStr('KAKAO_CHANNEL', settings.kakaoChannel);
  if ('gaId' in settings) setStr('GA_ID', settings.gaId);
  const notice = settings.notice && settings.notice.enabled && settings.notice.text ? { text: settings.notice.text, link: settings.notice.link || '' } : null;
  js = js.replace(/\/\* NOTICE:START \*\/[\s\S]*?\/\* NOTICE:END \*\//, `/* NOTICE:START */window.ORBIS_NOTICE=${JSON.stringify(notice)};/* NOTICE:END */`);
  wr('app.js', js);
}

// ---------------------------------------------------------------- 관리자 화면용 생성기 사본
if (!PREVIEW) wr('admin/sitegen.mjs', '// 자동 생성 파일 — 원본은 scripts/content/sitegen.mjs 입니다. 이 파일은 직접 고치지 마세요.\n' + rd('scripts/content/sitegen.mjs'));

// ---------------------------------------------------------------- sitemap · RSS · 목록 파일
{
  const today = G.ymd(NOW);
  const latest = live[0]?.date ? G.ymd(live[0].date) : today;
  const entries = [];
  for (const s of site.static) {
    const lastmod = s.path === '/' || s.path === '/insights' ? latest : s.lastmod;
    entries.push({ loc: `${G.SITE}${s.path}`, lastmod, changefreq: s.changefreq, priority: s.priority });
  }
  if (exists('content/pages/glossary.md')) entries.push({ loc: `${G.SITE}/glossary`, lastmod: site.pagesLastmod?.glossary || today, changefreq: 'monthly', priority: '0.6' });
  if (exists('content/pages/faq.md')) entries.push({ loc: `${G.SITE}/faq`, lastmod: site.pagesLastmod?.faq || today, changefreq: 'monthly', priority: '0.6' });
  for (const k of G.CATEGORY_KEYS) {
    const lp = live.find((p) => p.category === k);
    entries.push({ loc: `${G.SITE}/insights/topics/${k}`, lastmod: lp ? G.ymd(lp.date) : latest, changefreq: 'weekly', priority: '0.6' });
  }
  for (const p of live) entries.push({ loc: `${G.SITE}${p.url}`, lastmod: G.ymd(p.updated && p.updated > p.date ? p.updated : p.date), changefreq: 'monthly', priority: '0.6' });
  const seen = new Set();
  wr('sitemap.xml', G.renderSitemap(entries.filter((e) => (seen.has(e.loc) ? false : seen.add(e.loc)))));

  const items = [
    ...live.slice(0, 40).map((p) => ({ title: p.title, link: `${G.SITE}${p.url}`, date: p.date, category: G.CATEGORIES[p.category]?.name || '인사이트', description: p.description })),
    ...(site.rssExtra || []).map((x) => ({ ...x, date: G.parseKstDate(x.date) })),
  ].sort(byDate).slice(0, 40);
  // 마지막 갱신 시각은 가장 최근 글의 시각으로 둡니다(새 글이 없으면 파일이 바뀌지 않도록)
  const lastItem = items.reduce((m, it) => (it.date && (!m || it.date > m) ? it.date : m), null);
  wr('rss.xml', G.renderRss(items, lastItem || NOW));

  const manifest = all.filter((p) => !p.legacy).map((p) => ({
    slug: p.slug, title: p.title, category: p.category, status: p.status, url: p.url,
    date: p.date ? G.isoKst(p.date) : null, updated: p.updated ? G.isoKst(p.updated) : null,
    description: p.description, keywords: p.keywords, readMin: p.readMin,
    warnings: p.lint?.warnings || [], errors: p.lint?.errors || [],
  }));
  if (!PREVIEW) {
    // 글 목록이 그대로면 파일을 다시 쓰지 않습니다(정기 발행 때 불필요한 커밋 방지)
    let prevPosts = null;
    try { prevPosts = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/insights/index.json'), 'utf8')).posts; } catch {}
    if (JSON.stringify(prevPosts) !== JSON.stringify(manifest)) wr('content/insights/index.json', JSON.stringify({ generatedAt: G.isoKst(NOW), posts: manifest }, null, 2) + '\n');
  }
}

// 새로 공개된 글 주소 (검색엔진 알림용)
const prevManifestPath = path.join(ROOT, 'content/insights/index.json');
if (!CHECK && !PREVIEW) {
  const newly = written.filter((w) => /^insights\/[a-z0-9-]+\.html$/.test(w)).map((w) => `${G.SITE}/${w.replace(/\.html$/, '')}`);
  const urls = newly.length ? [...newly, `${G.SITE}/insights`, `${G.SITE}/`, `${G.SITE}/sitemap.xml`] : [];
  fs.mkdirSync(path.join(ROOT, 'scripts/content/.out'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'scripts/content/.out/changed-urls.json'), JSON.stringify(urls, null, 2));
}
void prevManifestPath;

console.log(`${CHECK ? '점검' : PREVIEW ? '미리보기' : '빌드'} 완료 — 공개 ${live.length}편 (예약 ${all.filter((p) => p.status === 'scheduled').length}, 임시 ${all.filter((p) => p.status === 'draft').length}, 숨김 ${all.filter((p) => p.status === 'hidden').length}${problems.length ? `, 오류로 보류 ${problems.length}` : ''})`);
if (written.length) console.log('바뀐 파일: ' + written.join(', '));
if (problems.length && CHECK) process.exit(1);
