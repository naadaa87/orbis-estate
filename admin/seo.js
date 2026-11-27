// 관리자 '검색노출 점검' 화면 — 수집기 접근 진단, 색인 확인, 목표 검색어, 전 페이지 점검, 글 점검
// admin.js가 필요할 때 불러옵니다. 깃허브 토큰이 없어도 글 점검을 뺀 나머지는 모두 동작합니다.
const SITE = 'https://orbis-estate.com';
const BOTS = [
  ['Yeti', '네이버 검색', '검색'], ['Googlebot', '구글 검색 · AI 개요', '검색'], ['Bingbot', '빙 · 코파일럿', '검색'], ['Daum', '다음 검색', '검색'],
  ['OAI-SearchBot', 'ChatGPT 검색', 'AI 검색'], ['ChatGPT-User', 'ChatGPT가 답할 때 열람', 'AI 검색'], ['PerplexityBot', '퍼플렉시티', 'AI 검색'], ['Claude-SearchBot', 'Claude 검색', 'AI 검색'], ['Claude-User', 'Claude가 답할 때 열람', 'AI 검색'],
  ['GPTBot', 'OpenAI 모델 학습', 'AI 학습'], ['ClaudeBot', 'Anthropic 모델 학습', 'AI 학습'], ['Google-Extended', '제미나이 학습·근거 자료', 'AI 학습'], ['Applebot-Extended', '애플 AI 학습', 'AI 학습'], ['CCBot', '커먼크롤(여러 AI가 학습에 사용)', 'AI 학습'], ['meta-externalagent', '메타 AI 학습', 'AI 학습'],
];
function parseRobots(txt) {
  const groups = []; let cur = null; let lastUA = false;
  for (let line of String(txt).split(/\r?\n/)) {
    line = line.replace(/#.*$/, '').trim(); if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/); if (!m) continue;
    const k = m[1].toLowerCase(); const v = m[2].trim();
    if (k === 'user-agent') { if (!lastUA || !cur) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(v.toLowerCase()); lastUA = true; } else { if ((k === 'allow' || k === 'disallow') && cur) cur.rules.push([k, v]); lastUA = false; }
  }
  return groups;
}
function botStatus(groups, name) {
  const n = name.toLowerCase(); let mine = groups.filter((g) => g.agents.includes(n));
  if (!mine.length) mine = groups.filter((g) => g.agents.includes('*'));
  const rules = mine.flatMap((g) => g.rules);
  const dis = rules.some(([k, v]) => k === 'disallow' && v === '/'); const al = rules.some(([k, v]) => k === 'allow' && v === '/');
  return dis && al ? 'mixed' : dis ? 'blocked' : 'ok';
}
async function pool(items, n, fn) { let i = 0; const run = async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } }; await Promise.all(Array.from({ length: n }, run)); }

export function createSeo({ shell, $, E, state, loadPosts, G, pill }) {
  const q = (s) => encodeURIComponent(s);
  const serp = (kw) => `<a class="btn btn-line btn-sm" href="https://search.naver.com/search.naver?query=${q(kw)}" target="_blank" rel="noopener">네이버</a> <a class="btn btn-line btn-sm" href="https://www.google.com/search?q=${q(kw)}" target="_blank" rel="noopener">구글</a>`;

  async function robotsCard() {
    const box = $('#seo-robots'); if (!box) return;
    try {
      const txt = await (await fetch('/robots.txt', { cache: 'no-store' })).text();
      const groups = parseRobots(txt); const managed = /Cloudflare Managed/i.test(txt);
      const rows = BOTS.map(([n, svc, kind]) => ({ n, svc, kind, st: botStatus(groups, n) }));
      const bad = (k) => rows.filter((r) => r.kind === k && r.st !== 'ok');
      const lab = { ok: '<span class="pill ok">수집 허용</span>', blocked: '<span class="pill bad">차단</span>', mixed: '<span class="pill warn">규칙 충돌</span>' };
      let note = '';
      if (bad('검색').length || bad('AI 검색').length) note = `<p class="note" style="margin-top:12px"><b>확인이 필요합니다.</b> 검색엔진이나 AI 검색 로봇이 막혀 있습니다: ${[...bad('검색'), ...bad('AI 검색')].map((r) => r.n).join(', ')}. robots.txt와 Cloudflare 설정을 확인해 주세요.</p>`;
      else if (bad('AI 학습').length) note = `<p class="note" style="margin-top:12px">검색엔진과 AI 검색 로봇은 모두 들어올 수 있습니다. 다만 ${managed ? 'Cloudflare의 AI 학습 차단 정책이 켜져 있어' : 'robots.txt 설정으로'} <b>AI 학습용 로봇(${bad('AI 학습').map((r) => r.n).join(', ')})은 막혀 있습니다.</b> 검색 노출에는 영향이 없지만, ChatGPT·Claude·제미나이 같은 AI가 오르비스의 글을 배우지 못합니다. AI 답변에 회사와 글이 더 자주 나오게 하려면 Cloudflare → 도메인 선택 → Security → Settings → Bot traffic → <b>AI Crawler and Agent access policies</b>에서 Training을 Allow로 바꾸면 됩니다. 글이 학습에 쓰이는 것을 원하지 않으면 그대로 두셔도 됩니다.</p>`;
      else note = '<p class="note" style="margin-top:12px">검색엔진, AI 검색, AI 학습 로봇이 모두 사이트를 읽을 수 있습니다.</p>';
      box.innerHTML = `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>로봇</th><th>어디에 쓰이나</th><th>구분</th><th>상태</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${r.n}</b></td><td>${r.svc}</td><td class="nowrap">${r.kind}</td><td class="nowrap">${lab[r.st]}</td></tr>`).join('')}</tbody></table></div>${note}`;
    } catch (e) { box.innerHTML = '<p class="empty">robots.txt를 읽지 못했습니다.</p>'; }
  }

  async function auditPages() {
    const out = $('#seo-audit'); const btn = $('#seo-audit-btn'); if (!out) return;
    btn.disabled = true; out.innerHTML = '<p class="empty">사이트맵을 읽는 중…</p>';
    let urls = [];
    try { const xml = await (await fetch('/sitemap.xml', { cache: 'no-store' })).text(); urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&')).filter((u) => u.startsWith(SITE)); } catch (e) {}
    if (!urls.length) { out.innerHTML = '<p class="empty">사이트맵을 읽지 못했습니다.</p>'; btn.disabled = false; return; }
    const res = []; let done = 0;
    await pool(urls, 6, async (u) => {
      const path = u.slice(SITE.length) || '/'; const iss = [];
      try {
        const r = await fetch(path, { cache: 'no-store' });
        if (!r.ok) iss.push(`열리지 않음(${r.status})`);
        else {
          const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
          const t = (doc.querySelector('title') || {}).textContent || ''; const d = (doc.querySelector('meta[name="description"]') || { getAttribute: () => '' }).getAttribute('content') || '';
          const c = (doc.querySelector('link[rel="canonical"]') || { getAttribute: () => '' }).getAttribute('href') || '';
          const rb = (doc.querySelector('meta[name="robots"]') || { getAttribute: () => '' }).getAttribute('content') || '';
          if (!t) iss.push('제목 없음'); else if (t.length > 62) iss.push(`제목 ${t.length}자(길어서 잘릴 수 있음)`); else if (t.length < 12) iss.push(`제목 ${t.length}자(짧음)`);
          if (!d) iss.push('설명 없음'); else if (d.length < 60) iss.push(`설명 ${d.length}자(짧음)`); else if (d.length > 165) iss.push(`설명 ${d.length}자(김)`);
          if (c !== u) iss.push('대표 주소(canonical)가 다름');
          if (/noindex/i.test(rb)) iss.push('검색 제외(noindex)인데 사이트맵에 있음');
          const h1 = doc.querySelectorAll('h1').length; if (h1 !== 1) iss.push(`큰제목(H1) ${h1}개`);
          if (!doc.querySelector('meta[property="og:image"]')) iss.push('공유 이미지 없음');
          let ld = 0; doc.querySelectorAll('script[type="application/ld+json"]').forEach((s) => { try { JSON.parse(s.textContent); ld++; } catch (e) { iss.push('구조화 데이터 오류'); } });
          if (!ld) iss.push('구조화 데이터 없음');
          res.push({ path, t, tl: t.length, dl: d.length, iss });
        }
      } catch (e) { iss.push('불러오기 실패'); }
      if (!res.find((x) => x.path === path)) res.push({ path, t: '', tl: 0, dl: 0, iss });
      done++; if (done % 10 === 0) out.innerHTML = `<p class="empty">점검 중… ${done} / ${urls.length}</p>`;
    });
    const bad = res.filter((r) => r.iss.length).sort((a, b) => b.iss.length - a.iss.length);
    const titles = new Map(); for (const r of res) if (r.t) titles.set(r.t, (titles.get(r.t) || []).concat(r.path));
    const dup = [...titles.entries()].filter(([, v]) => v.length > 1);
    out.innerHTML = `<div class="grid g4" style="margin-bottom:14px"><div class="card kpi"><b>${res.length}</b><span>점검한 페이지</span></div><div class="card kpi"><b>${res.length - bad.length}</b><span>문제 없음</span></div><div class="card kpi"><b>${bad.length}</b><span>확인할 페이지</span></div><div class="card kpi"><b>${dup.length}</b><span>제목이 겹치는 묶음</span></div></div>
    ${bad.length ? `<div class="list">${bad.map((r) => `<div class="row" style="align-items:flex-start"><span class="t" style="white-space:normal"><a href="${E(r.path)}" target="_blank" rel="noopener"><b>${E(r.path)}</b></a><br><span style="color:var(--slate);font-size:12.5px">${r.iss.map(E).join(' · ')}</span></span></div>`).join('')}</div>` : '<p class="empty">사이트맵의 모든 페이지가 제목·설명·대표 주소·큰제목·구조화 데이터 기준을 통과했습니다.</p>'}
    ${dup.length ? `<h4 style="margin:16px 0 8px">제목이 같은 페이지</h4><div class="list">${dup.map(([t, v]) => `<div class="row"><span class="t" style="white-space:normal"><b>${E(t)}</b><br><span style="color:var(--slate);font-size:12.5px">${v.map(E).join(' · ')}</span></span></div>`).join('')}</div>` : ''}`;
    btn.disabled = false; btn.textContent = '다시 점검';
  }

  async function view() {
    shell('seo', `<div class="topline"><div><h2>검색노출 점검</h2><p>검색엔진과 AI 서비스가 사이트를 제대로 읽는지, 페이지마다 검색용 정보가 갖춰졌는지 확인합니다.</p></div></div>
    <div class="grid g4" id="seo-counts"><div class="card kpi"><b>–</b><span>검색에 내놓은 페이지</span></div><div class="card kpi"><b>–</b><span>인사이트 글</span></div><div class="card kpi"><b>–</b><span>용어 페이지</span></div><div class="card kpi"><b>–</b><span>계산기 · 길잡이</span></div></div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h3>검색엔진·AI 로봇 접근</h3><p style="color:var(--slate);font-size:13px;margin:-4px 0 10px">지금 사이트의 robots.txt를 읽어 판정합니다.</p><div id="seo-robots"><p class="empty">확인 중…</p></div></div>
      <div class="card"><h3>검색엔진 등록·색인 확인</h3><div class="list">
        <div class="row"><span class="t">구글에 색인된 페이지 보기</span><a class="btn btn-line btn-sm" href="https://www.google.com/search?q=site%3Aorbis-estate.com" target="_blank" rel="noopener">열기</a></div>
        <div class="row"><span class="t">네이버에 수집된 페이지 보기</span><a class="btn btn-line btn-sm" href="https://search.naver.com/search.naver?query=site%3Aorbis-estate.com" target="_blank" rel="noopener">열기</a></div>
        <div class="row"><span class="t">빙 · 다음에 수집된 페이지 보기</span><span><a class="btn btn-line btn-sm" href="https://www.bing.com/search?q=site%3Aorbis-estate.com" target="_blank" rel="noopener">빙</a> <a class="btn btn-line btn-sm" href="https://search.daum.net/search?q=site%3Aorbis-estate.com" target="_blank" rel="noopener">다음</a></span></div>
        <div class="row"><span class="t">구글 서치 콘솔 — 색인·검색 실적·AI 기능 실적</span><a class="btn btn-line btn-sm" href="https://search.google.com/search-console" target="_blank" rel="noopener">이동</a></div>
        <div class="row"><span class="t">네이버 서치어드바이저 — 수집 현황·사이트맵·RSS 제출</span><a class="btn btn-line btn-sm" href="https://searchadvisor.naver.com/console/board" target="_blank" rel="noopener">이동</a></div>
        <div class="row"><span class="t">빙 웹마스터 도구 (코파일럿·ChatGPT 검색의 바탕)</span><a class="btn btn-line btn-sm" href="https://www.bing.com/webmasters" target="_blank" rel="noopener">이동</a></div>
        <div class="row"><span class="t">사이트맵 · RSS · AI용 요약 파일</span><span><a class="btn btn-line btn-sm" href="/sitemap.xml" target="_blank" rel="noopener">사이트맵</a> <a class="btn btn-line btn-sm" href="/rss.xml" target="_blank" rel="noopener">RSS</a> <a class="btn btn-line btn-sm" href="/llms.txt" target="_blank" rel="noopener">llms.txt</a></span></div>
        <div class="row"><span class="t">새 글·바뀐 페이지 자동 알림 (IndexNow: 네이버·빙)</span><span class="pill ok">발행 때 자동</span></div>
      </div></div>
    </div>
    <div class="card" style="margin-top:16px"><h3>전체 페이지 점검</h3><p style="color:var(--slate);font-size:13px;margin:-4px 0 12px">사이트맵에 있는 모든 페이지를 열어 제목·설명 길이, 대표 주소, 큰제목, 구조화 데이터를 확인합니다. 1분쯤 걸립니다.</p><button type="button" class="btn btn-navy" id="seo-audit-btn">점검 시작</button><div id="seo-audit" style="margin-top:14px"></div></div>
    <div class="card" style="margin-top:16px"><h3>목표 검색어와 담당 페이지</h3><p style="color:var(--slate);font-size:13px;margin:-4px 0 12px">검색어마다 어느 페이지가 답하는지 정해 둔 표입니다. 네이버·구글 버튼으로 지금 몇 번째에 나오는지 확인해 보세요. 순위는 보통 몇 주에 걸쳐 움직입니다.</p><div id="seo-kw"><p class="empty">불러오는 중…</p></div></div>
    <div class="card" style="margin-top:16px"><h3>글 점검</h3><div id="seo-posts"><p class="empty">불러오는 중…</p></div></div>
    <div class="card help" style="margin-top:16px"><h4>검색 노출을 위해 직접 해 두면 좋은 일</h4><ol>
      <li><b>구글 서치 콘솔</b>에 사이트를 등록하고 사이트맵(<code>sitemap.xml</code>)을 제출합니다. 구글 AI 개요·AI 모드 실적도 여기서 봅니다.</li>
      <li><b>네이버 서치어드바이저</b>에 사이트맵과 RSS(<code>rss.xml</code>)를 제출하고, 새 페이지는 '웹 페이지 수집 요청'을 넣습니다.</li>
      <li><b>빙 웹마스터 도구</b>에 등록합니다(구글 서치 콘솔에서 가져오기로 1분). ChatGPT 검색과 코파일럿이 빙 색인을 씁니다.</li>
      <li><b>네이버 스마트플레이스 · 카카오맵 · 구글 비즈니스 프로필</b>에 상호·주소·전화번호를 홈페이지와 똑같이 등록합니다. 지역 검색과 지도 노출의 바탕입니다.</li>
      <li><b>네이버 블로그</b>에 인사이트 글을 요약해 올리고 원문 링크를 겁니다. 네이버 AI 브리핑은 블로그·카페 글을 많이 인용합니다.</li>
    </ol></div>`);
    $('#seo-audit-btn').addEventListener('click', auditPages);
    robotsCard();
    // 숫자와 목표 검색어
    try {
      const d = await (await fetch('/admin/seo-data.json', { cache: 'no-store' })).json();
      const c = d.counts || {}; const k = $('#seo-counts').querySelectorAll('.kpi b');
      k[0].textContent = c.pages ?? '–'; k[1].textContent = c.posts ?? '–'; k[2].textContent = c.terms ?? '–'; k[3].textContent = `${c.tools ?? '–'} · ${c.guides ?? '–'}`;
      $('#seo-kw').innerHTML = (d.keywords || []).map(([g, list]) => `<h4 style="margin:14px 0 8px">${E(g)}</h4><div class="list">${list.map(([kw, url]) => `<div class="row"><span class="t"><b>${E(kw)}</b> <a href="${E(url)}" target="_blank" rel="noopener" style="color:var(--slate);font-size:12.5px;margin-left:6px">${E(url)}</a></span><span>${serp(kw)}</span></div>`).join('')}</div>`).join('');
    } catch (e) { $('#seo-kw').innerHTML = '<p class="empty">목표 검색어 표를 불러오지 못했습니다.</p>'; }
    // 글 점검 (깃허브 토큰이 있을 때)
    try {
      await loadPosts(true);
      const pub = state.posts.filter((p) => p.status === 'published');
      const issues = state.posts.filter((p) => (p.warnings || []).length || (p.errors || []).length);
      const cats = G.CATEGORY_KEYS.map((key) => [key, pub.filter((p) => p.category === key).length]);
      const last7 = pub.filter((p) => p.date && new Date(p.date) > new Date(Date.now() - 7 * 864e5)).length;
      $('#seo-posts').innerHTML = `<p style="color:var(--slate);font-size:13.5px;margin-bottom:10px">공개 글 <b>${pub.length}</b>편 · 최근 7일 <b>${last7}</b>편 · ${cats.map(([key, n]) => `${G.CATEGORIES[key].name} ${n}`).join(' · ')}</p>
      ${issues.length ? `<div class="list">${issues.map((p) => `<div class="row" style="align-items:flex-start"><span class="t" style="white-space:normal"><a href="#/edit/${p.slug}"><b>${E(p.title)}</b></a><br><span style="color:var(--slate);font-size:12.5px">${[...(p.errors || []), ...(p.warnings || [])].map(E).join(' · ')}</span></span>${pill(p.status)}</div>`).join('')}</div>` : '<p class="empty">모든 글이 제목·설명·키워드·내부 링크·출처 기준을 통과했습니다.</p>'}`;
    } catch (e) { $('#seo-posts').innerHTML = '<p class="empty">글 목록은 깃허브 토큰(GITHUB_TOKEN)을 등록한 뒤 볼 수 있습니다.</p>'; }
  }
  return { view };
}
