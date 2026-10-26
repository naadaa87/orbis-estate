// 오르비스 관리자 화면 — 글·매물·설정 관리 (저장하면 깃허브 → 자동 발행 → Cloudflare 배포)
import * as G from './sitegen.mjs?v=20261026';

const API = '/api/admin';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $('#app');
const E = G.esc;
const state = { posts: null, files: null, layout: null };

const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  posts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 19V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M14 3v5h5M8 13h8M8 17h5"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  prop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  seo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/></svg>',
};

// ---------------------------------------------------------------- 공통
function toast(msg, bad = false) {
  const t = $('#toast'); t.textContent = msg; t.classList.toggle('bad', bad); t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), bad ? 6000 : 3800);
}
async function api(path, { method = 'GET', body } = {}) {
  const r = await fetch(API + path, {
    method, credentials: 'same-origin',
    headers: { ...(method !== 'GET' ? { 'X-Orbis-Admin': '1' } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let d = {}; try { d = await r.json(); } catch { d = { ok: false, message: '서버 응답을 읽을 수 없습니다.' }; }
  if (r.status === 401 && d.error === 'login_required') { renderLogin(); throw new Error('login'); }
  if (!r.ok || d.ok === false) { const e = new Error(d.message || d.error || `오류 ${r.status}`); e.data = d; e.status = r.status; throw e; }
  return d;
}
const fail = (e) => { if (e.message !== 'login') toast(e.message || '처리하지 못했습니다.', true); };
const STATUS = { published: ['공개', 'ok'], scheduled: ['예약', 'sch'], draft: ['임시 저장', 'draft'], hidden: ['숨김', 'hid'], blocked: ['점검 오류', 'bad'], building: ['반영 대기', 'warn'] };
const pill = (s) => { const [t, c] = STATUS[s] || [s, 'draft']; return `<span class="pill ${c}">${t}</span>`; };
const fmt = (iso) => { if (!iso) return '-'; const d = new Date(iso); return isNaN(d) ? '-' : `${G.dotDate(d)} ${G.kstParts(d).h}:${G.kstParts(d).mi}`; };
function next11() { const now = new Date(); const k = G.kstParts(now); let d = G.parseKstDate(`${k.y}-${k.m}-${k.d} 11:00`); if (d <= now) d = new Date(d.getTime() + 864e5); return d; }
async function layout() {
  if (state.layout) return state.layout;
  const html = await (await fetch('/insights', { cache: 'no-store' })).text();
  state.layout = G.extractLayout(html); return state.layout;
}
async function loadPosts(force = false) {
  if (state.posts && !force) return state;
  const d = await api('/posts');
  const inMan = new Set(d.posts.map((p) => p.slug));
  const extra = d.files.filter((f) => !inMan.has(f.slug)).map((f) => ({ slug: f.slug, title: f.slug, status: 'building', category: '', date: null, warnings: [], errors: [] }));
  state.posts = [...extra, ...d.posts]; state.files = Object.fromEntries(d.files.map((f) => [f.slug, f.sha])); state.generatedAt = d.generatedAt;
  return state;
}

// ---------------------------------------------------------------- 로그인
function renderLogin(msg = '') {
  app.innerHTML = `<div class="login"><div class="login-card">
    <img src="/assets/logo-icon.png" alt=""><h1>오르비스 관리자</h1><p>홈페이지 글·매물·설정을 관리합니다.</p>
    <form id="lf"><div class="f"><label for="pw">비밀번호</label><input type="password" id="pw" autocomplete="current-password" required></div>
    <div class="err" id="lerr">${E(msg)}</div><button class="btn btn-navy" type="submit">로그인</button></form></div></div>`;
  $('#pw').focus();
  $('#lf').onsubmit = async (e) => {
    e.preventDefault(); const b = e.submitter; b.disabled = true; $('#lerr').textContent = '';
    try { await api('/login', { method: 'POST', body: { password: $('#pw').value } }); state.posts = null; route(); }
    catch (err) { $('#lerr').textContent = err.data?.error === 'not_configured' ? 'Cloudflare에 ADMIN_PASSWORD를 먼저 등록해 주세요.' : err.message; }
    finally { b.disabled = false; }
  };
}

// ---------------------------------------------------------------- 셸
const NAV = [['dashboard', '대시보드', 'home'], ['posts', '인사이트 글', 'posts'], ['new', '새 글 쓰기', 'pen'], ['properties', '매물', 'prop'], ['settings', '사이트 설정', 'gear'], ['seo', '검색노출 점검', 'seo'], ['help', '사용 안내', 'help']];
function shell(active, html) {
  app.innerHTML = `<div class="shell"><aside class="side">
    <div class="brand"><img src="/assets/logo-icon.png" alt=""><div><b>오르비스 관리자</b><span>orbis-estate.com</span></div></div>
    ${NAV.map(([k, t, i]) => `<a class="nv${k === active ? ' on' : ''}" href="#/${k}">${ICON[i]}${t}</a>`).join('')}
    <div class="sp"></div><a class="sm-link" href="/" target="_blank" rel="noopener">사이트 열기 ↗</a><a class="sm-link" href="#" id="logout">로그아웃</a>
  </aside><main class="main" id="view">${html}</main></div>`;
  $('#logout').onclick = async (e) => { e.preventDefault(); try { await api('/logout', { method: 'POST' }); } catch {} renderLogin('로그아웃했습니다.'); };
}

// ---------------------------------------------------------------- 대시보드
async function viewDashboard() {
  shell('dashboard', '<div class="empty">불러오는 중…</div>');
  try {
    const [, st] = await Promise.all([loadPosts(true), api('/status').catch((e) => ({ commits: [], runs: [], runsError: e.message }))]);
    const ps = state.posts; const c = (s) => ps.filter((p) => p.status === s).length;
    const warn = ps.filter((p) => (p.warnings || []).length || (p.errors || []).length).length;
    const sched = ps.filter((p) => p.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date));
    const runTxt = (r) => r.status !== 'completed' ? '<span class="pill run">진행 중</span>' : r.conclusion === 'success' ? '<span class="pill ok">완료</span>' : `<span class="pill bad">${r.conclusion === 'cancelled' ? '취소' : '실패'}</span>`;
    const ev = { schedule: '정기 발행(11시)', push: '저장 후 반영', workflow_dispatch: '수동 실행' };
    $('#view').innerHTML = `<div class="topline"><div><h2>대시보드</h2><p>새 글은 매일 오전 11시에 공개됩니다. 다음 정기 발행: <b>${fmt(G.isoKst(next11()))}</b></p></div>
      <div class="acts"><a class="btn btn-gold" href="#/new">${ICON.pen.replace('<svg', '<svg width="16" height="16"')} 새 글 쓰기</a><button class="btn btn-line" id="rb">지금 다시 반영</button></div></div>
    <div class="grid g4"><div class="card kpi"><b>${c('published')}</b><span>공개 글</span></div><div class="card kpi"><b>${c('scheduled')}</b><span>예약 글</span></div><div class="card kpi"><b>${c('draft')}</b><span>임시 저장</span></div><div class="card kpi gold"><b>${warn}</b><span>점검 알림이 있는 글</span></div></div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h3>발행 처리 기록</h3>${st.runsError ? `<p class="note cool">발행 기록을 읽지 못했습니다. 깃허브 토큰에 Actions 읽기 권한이 있는지 확인해 주세요.</p>` : st.runs.length ? `<div class="list">${st.runs.map((r) => `<div class="row">${runTxt(r)}<span class="t">${ev[r.event] || r.event}</span><time>${fmt(r.created)}</time><a class="btn btn-line btn-sm" href="${E(r.url)}" target="_blank" rel="noopener">기록</a></div>`).join('')}</div>` : '<p class="empty">아직 기록이 없습니다.</p>'}</div>
      <div class="card"><h3>예약된 글</h3>${sched.length ? `<div class="list">${sched.map((p) => `<div class="row"><span class="t"><a href="#/edit/${p.slug}">${E(p.title)}</a></span><time>${fmt(p.date)}</time></div>`).join('')}</div>` : '<p class="empty">예약된 글이 없습니다. 자동 발행 글은 매일 오전 10시에 준비되어 11시에 공개됩니다.</p>'}</div>
      <div class="card"><h3>최근 변경</h3><div class="list">${(st.commits || []).map((m) => `<div class="row"><span class="t">${E(m.message)}</span><time>${fmt(m.date)}</time></div>`).join('') || '<p class="empty">기록 없음</p>'}</div></div>
      <div class="card"><h3>바로가기</h3><div class="links">
        <a href="/insights" target="_blank" rel="noopener">인사이트 페이지<span>공개된 글 목록</span></a>
        <a href="https://github.com/naadaa87/orbis-estate" target="_blank" rel="noopener">깃허브 저장소<span>원고·변경 기록</span></a>
        <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener">Cloudflare<span>배포·환경변수</span></a>
        <a href="https://searchadvisor.naver.com/" target="_blank" rel="noopener">네이버 서치어드바이저<span>수집·노출 현황</span></a>
        <a href="https://search.google.com/search-console" target="_blank" rel="noopener">구글 서치 콘솔<span>색인·검색 실적</span></a>
        <a href="#/settings" id="leadlink">상담 접수 시트<span>설정에서 주소 등록</span></a>
      </div></div>
    </div>`;
    $('#rb').onclick = async (e) => { e.target.disabled = true; try { await api('/rebuild', { method: 'POST' }); toast('반영을 시작했습니다. 1~3분 뒤 사이트에 나타납니다.'); } catch (err) { fail(err); } e.target.disabled = false; };
    api('/file?path=content/settings.json').then((f) => { const s = JSON.parse(f.text); if (s.leadSheetUrl) { const a = $('#leadlink'); a.href = s.leadSheetUrl; a.target = '_blank'; a.querySelector('span').textContent = '구글 시트 열기'; } }).catch(() => {});
  } catch (e) { fail(e); }
}

// ---------------------------------------------------------------- 글 목록
async function viewPosts() {
  shell('posts', '<div class="empty">불러오는 중…</div>');
  try { await loadPosts(true); } catch (e) { return fail(e); }
  let filter = 'all'; let q = '';
  const draw = () => {
    const rows = state.posts.filter((p) => (filter === 'all' || p.status === filter) && (!q || (p.title + p.slug + (p.keywords || []).join(' ')).includes(q)));
    $('#tb').innerHTML = rows.length ? rows.map((p) => {
      const n = (p.errors || []).length + (p.warnings || []).length;
      return `<tr><td><div class="ttl"><a href="#/edit/${p.slug}">${E(p.title)}</a></div><div class="sub">/insights/${p.slug}</div></td>
      <td class="nowrap">${p.category ? E(G.CATEGORIES[p.category]?.name || p.category) : '-'}</td><td class="nowrap">${pill(p.status)}</td><td class="nowrap">${fmt(p.date)}</td>
      <td class="nowrap">${n ? `<span class="pill ${(p.errors || []).length ? 'bad' : 'warn'}">${n}건</span>` : '<span class="pill ok">양호</span>'}</td>
      <td class="nowrap"><a class="btn btn-line btn-sm" href="#/edit/${p.slug}">편집</a> ${p.status === 'published' ? `<a class="btn btn-line btn-sm" href="${p.url || '/insights/' + p.slug}" target="_blank" rel="noopener">보기</a>` : ''}</td></tr>`;
    }).join('') : '<tr><td colspan="6" class="empty">해당하는 글이 없습니다.</td></tr>';
  };
  $('#view').innerHTML = `<div class="topline"><div><h2>인사이트 글</h2><p>목록은 마지막 반영 시점(${fmt(state.generatedAt)}) 기준입니다. 방금 저장한 글은 '반영 대기'로 보입니다.</p></div><div class="acts"><a class="btn btn-gold" href="#/new">새 글 쓰기</a></div></div>
    <div class="toolrow"><div class="tabs" id="ft">${[['all', '전체'], ['published', '공개'], ['scheduled', '예약'], ['draft', '임시 저장'], ['hidden', '숨김'], ['building', '반영 대기']].map(([k, t]) => `<button data-k="${k}" class="${k === 'all' ? 'on' : ''}">${t} ${k === 'all' ? state.posts.length : state.posts.filter((p) => p.status === k).length}</button>`).join('')}</div>
    <input type="search" id="q" placeholder="제목·키워드 검색"></div>
    <div class="tbl-wrap"><table><thead><tr><th>제목</th><th>분야</th><th>상태</th><th>발행 일시</th><th>점검</th><th></th></tr></thead><tbody id="tb"></tbody></table></div>`;
  $$('#ft button').forEach((b) => b.onclick = () => { filter = b.dataset.k; $$('#ft button').forEach((x) => x.classList.toggle('on', x === b)); draw(); });
  $('#q').oninput = (e) => { q = e.target.value.trim(); draw(); };
  draw();
}

// ---------------------------------------------------------------- 글 편집
const defCta = (c) => ({ brand: 'brand', area: 'analysis', legal: 'tenant', invest: 'investor' }[c] || 'owner');
function repItem(kind, a = '', b = '') {
  const L = kind === 'faq' ? ['질문', '답변'] : ['자료 이름', '주소(URL)'];
  return `<div class="it" data-kind="${kind}"><div class="inner"><input type="text" class="ra" placeholder="${L[0]}" value="${E(a)}">${kind === 'faq' ? `<textarea class="rb" rows="2" placeholder="${L[1]}">${E(b)}</textarea>` : `<input type="url" class="rb" placeholder="${L[1]}" value="${E(b)}">`}</div><button type="button" class="btn btn-line btn-sm rx" aria-label="삭제">×</button></div>`;
}
async function viewEditor(slug) {
  const isNew = !slug;
  shell(isNew ? 'new' : 'posts', '<div class="empty">불러오는 중…</div>');
  let sha = null; let meta = {}; let body = '';
  try {
    await loadPosts();
    if (!isNew) { const d = await api('/post?slug=' + encodeURIComponent(slug)); sha = d.sha; ({ meta, body } = G.parseDoc(d.text)); }
  } catch (e) { return fail(e); }
  const date = G.parseKstDate(meta.date);
  const wasPublished = !isNew && meta.status !== 'draft' && meta.status !== 'hidden' && date && date <= new Date();
  const mode = isNew ? 'now' : meta.status === 'draft' ? 'draft' : meta.status === 'hidden' ? 'hidden' : date && date > new Date() ? 'schedule' : 'now';
  const d0 = date && date > new Date() ? date : next11();
  const kd = G.kstParts(d0);
  const others = state.posts.filter((p) => p.slug !== slug && p.status === 'published');
  $('#view').innerHTML = `<div class="topline"><div><h2>${isNew ? '새 글 쓰기' : '글 편집'}</h2><p>${isNew ? '저장하면 깃허브에 원고가 올라가고, 공개 시점에 맞춰 자동으로 페이지가 만들어집니다.' : `/insights/${E(slug)}`}</p></div>
    <div class="acts">${!isNew ? `<button class="btn btn-bad" id="del">삭제</button>` : ''}<button class="btn btn-line" id="pvb">미리보기</button><button class="btn btn-gold" id="save">저장</button></div></div>
  <div class="ed"><div class="grid" style="gap:16px">
    <div class="card"><div class="fgrid">
      <div class="f full"><label for="title">제목</label><input type="text" id="title" value="${E(meta.title || '')}" placeholder="글 맨 위에 보이는 제목 (32자 안팎)"><span class="cnt" data-for="title" data-max="40"></span></div>
      <div class="f full"><label for="seoTitle">검색 결과 제목</label><input type="text" id="seoTitle" value="${E(meta.seoTitle || '')}" placeholder="핵심 검색어를 앞에 (회사명은 자동으로 붙습니다)"><span class="cnt" data-for="seoTitle" data-max="45"></span></div>
      <div class="f full"><label for="description">검색 결과 설명</label><textarea id="description" rows="3" placeholder="검색 결과에 보이는 설명 110~150자">${E(meta.description || '')}</textarea><span class="cnt" data-for="description" data-min="110" data-max="150"></span></div>
      <div class="f"><label for="category">분야</label><select id="category">${G.CATEGORY_KEYS.map((k) => `<option value="${k}"${meta.category === k ? ' selected' : ''}>${G.CATEGORIES[k].name}</option>`).join('')}</select></div>
      <div class="f"><label for="cta">글 아래 상담 연결</label><select id="cta">${Object.entries({ owner: '건물주 (건물 1차 진단)', investor: '매수·투자 상담', tenant: '임차·창업 상담', brand: '브랜드 출점 상담', analysis: '상권분석 시작하기' }).map(([k, t]) => `<option value="${k}"${(meta.cta || defCta(meta.category || 'market')) === k ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="f full"><label for="slug">주소</label><input type="text" id="slug" value="${E(slug || '')}" ${isNew ? '' : 'readonly'} placeholder="영문 소문자·숫자·하이픈 예: lease-renewal-guide"><span class="hint">${isNew ? '저장 후에는 바꿀 수 없습니다. 비워 두면 날짜로 자동 생성합니다.' : '주소는 바꿀 수 없습니다.'}</span></div>
      <div class="f full"><label for="keywords">키워드 (쉼표로 구분, 첫 번째가 핵심 검색어)</label><input type="text" id="keywords" value="${E((meta.keywords || []).join(', '))}" placeholder="상가 임대차, 계약갱신요구권, 환산보증금"></div>
      <div class="f full"><label for="summary">글 첫머리 요약 (2~3문장)</label><textarea id="summary" rows="2">${E(meta.summary || '')}</textarea></div>
    </div></div>
    <div class="card"><div class="f"><span class="lb">본문</span>
      <div class="tb" id="tbar"><button data-ins="h2" type="button">소제목</button><button data-ins="h3" type="button">작은 제목</button><button data-ins="b" type="button">굵게</button><button data-ins="ul" type="button">목록</button><button data-ins="ol" type="button">번호 목록</button><button data-ins="table" type="button">표</button><button data-ins="check" type="button">점검 박스</button><button data-ins="tip" type="button">팁 박스</button><button data-ins="warn" type="button">주의 박스</button><button data-ins="link" type="button">링크</button></div>
      <textarea id="body" spellcheck="false" placeholder="도입 문단부터 쓰세요. 소제목은 '## 소제목'처럼 씁니다.">${E(body)}</textarea>
      <span class="hint">## 소제목 · ### 작은 제목 · **굵게** · - 목록 · [글자](/analysis-tool) 링크 · > [!CHECK] 점검 박스</span></div></div>
    <div class="card"><h3>자주 묻는 질문</h3><div class="rep" id="faq">${(meta.faq || []).map((x) => repItem('faq', x.q, x.a)).join('')}</div><button type="button" class="btn btn-line btn-sm" id="addfaq" style="margin-top:10px">질문 추가</button></div>
    <div class="card"><h3>참고 자료 (출처)</h3><div class="rep" id="src">${(meta.sources || []).map((x) => repItem('src', x.title, x.url)).join('')}</div><button type="button" class="btn btn-line btn-sm" id="addsrc" style="margin-top:10px">자료 추가</button></div>
    <div class="card"><div class="f"><label for="related">함께 읽을 글 (주소를 쉼표로)</label><input type="text" id="related" list="rel-list" value="${E((meta.related || []).join(', '))}"><datalist id="rel-list">${others.map((p) => `<option value="${p.slug}">${E(p.title)}</option>`).join('')}</datalist><span class="hint">비워 두면 같은 분야의 최신 글이 자동으로 붙습니다.</span></div></div>
  </div>
  <div class="ed-side">
    <div class="card"><h3>공개 방식</h3><div class="f" style="gap:8px">
      ${[['now', wasPublished ? '공개 유지 (수정 반영)' : '지금 공개'], ['schedule', '예약 공개'], ['draft', '임시 저장 (공개 안 함)'], ...(isNew ? [] : [['hidden', '숨기기 (사이트에서 내림)']])].map(([k, t]) => `<label style="font-weight:600;display:flex;gap:8px;align-items:center"><input type="radio" name="mode" value="${k}"${mode === k ? ' checked' : ''}> ${t}</label>`).join('')}
      <div id="schedbox" class="fgrid" style="margin-top:6px"><div class="f"><label for="sdate">날짜</label><input type="date" id="sdate" value="${kd.y}-${kd.m}-${kd.d}"></div><div class="f"><label for="stime">시각</label><input type="time" id="stime" value="11:00" step="600"></div></div>
      <p class="hint" id="schedhint">예약 글은 지정한 시각이 지난 뒤 첫 정기 발행(매일 오전 11시) 때 공개됩니다. 오전 11시로 두는 것을 권합니다.</p>
      ${wasPublished ? `<label style="display:flex;gap:8px;align-items:center;font-size:13px"><input type="checkbox" id="upd" checked> 글에 수정일 표시</label>` : ''}
    </div></div>
    <div class="card"><h3>점검</h3><ul class="lint" id="lint"></ul></div>
    <div class="note cool">오르비스 원칙: 수익·매출 보장 표현, 지어낸 사례·통계, 확인하지 않은 수치는 쓰지 않습니다. 법령·수치에는 출처와 기준일을 적어 주세요.</div>
  </div></div>
  <div class="card hide" id="pvwrap" style="margin-top:16px"><div class="toolrow"><h3 style="margin:0">미리보기</h3><button class="btn btn-line btn-sm" id="pvclose">닫기</button></div><iframe class="pv-frame" id="pv" sandbox="allow-same-origin" title="미리보기"></iframe></div>`;

  const counters = () => $$('.cnt').forEach((c) => { const el = $('#' + c.dataset.for); const n = el.value.length; const mx = Number(c.dataset.max); const mn = Number(c.dataset.min || 0); c.textContent = `${n}자`; c.classList.toggle('bad', n > mx || (mn && n && n < mn)); });
  const modeVal = () => $('input[name=mode]:checked').value;
  const syncMode = () => { const m = modeVal(); $('#schedbox').classList.toggle('hide', m !== 'schedule'); $('#schedhint').classList.toggle('hide', m !== 'schedule'); };
  const collect = () => {
    const m = modeVal(); const now = new Date();
    let dateStr = meta.date || '';
    if (m === 'now' && !wasPublished) { const k = G.kstParts(now); dateStr = `${k.y}-${k.m}-${k.d} ${k.h}:${k.mi}`; }
    if (m === 'schedule') dateStr = `${$('#sdate').value} ${$('#stime').value || '11:00'}`;
    if (!dateStr) { const k = G.kstParts(next11()); dateStr = `${k.y}-${k.m}-${k.d} 11:00`; }
    const faq = $$('#faq .it').map((it) => ({ q: $('.ra', it).value.trim(), a: $('.rb', it).value.trim().replace(/\n+/g, ' ') })).filter((x) => x.q && x.a);
    const sources = $$('#src .it').map((it) => ({ title: $('.ra', it).value.trim(), url: $('.rb', it).value.trim() })).filter((x) => x.title);
    const split = (v) => v.split(',').map((x) => x.trim()).filter(Boolean);
    const out = { ...meta, title: $('#title').value.trim(), seoTitle: $('#seoTitle').value.trim(), description: $('#description').value.trim().replace(/\n+/g, ' '),
      category: $('#category').value, date: dateStr, keywords: split($('#keywords').value), summary: $('#summary').value.trim().replace(/\n+/g, ' '),
      cta: $('#cta').value, faq, sources, related: split($('#related').value) };
    out.status = m === 'draft' ? 'draft' : m === 'hidden' ? 'hidden' : undefined;
    if (!out.status) delete out.status;
    if (wasPublished && $('#upd')?.checked) { const k = G.kstParts(now); out.updated = `${k.y}-${k.m}-${k.d}`; }
    return out;
  };
  const curSlug = () => $('#slug').value.trim() || slug || '';
  const lint = () => {
    const m = collect(); const text = G.serializeDoc(m, $('#body').value);
    const p = G.makePost(curSlug() || 'new-post', text); p.meta = m;
    const r = G.lintPost(p);
    $('#lint').innerHTML = [...r.errors.map((x) => `<li class="e">${E(x)}</li>`), ...r.warnings.map((x) => `<li class="w">${E(x)}</li>`), `<li class="o">본문 ${r.length.toLocaleString()}자 · 읽기 약 ${G.readMinutes($('#body').value)}분</li>`].join('');
    return r;
  };
  counters(); syncMode(); lint();
  $$('#view input, #view textarea, #view select').forEach((el) => el.addEventListener('input', () => { counters(); clearTimeout(lint._t); lint._t = setTimeout(lint, 300); }));
  $$('input[name=mode]').forEach((r) => r.onchange = syncMode);
  if (isNew || !meta.cta) $('#category').addEventListener('change', () => { $('#cta').value = defCta($('#category').value); });
  $('#addfaq').onclick = () => $('#faq').insertAdjacentHTML('beforeend', repItem('faq'));
  $('#addsrc').onclick = () => $('#src').insertAdjacentHTML('beforeend', repItem('src'));
  $('#view').addEventListener('click', (e) => { if (e.target.classList.contains('rx')) { e.target.closest('.it').remove(); lint(); } });
  const SNIP = { h2: '\n## 소제목\n', h3: '\n### 작은 제목\n', b: '**굵게**', ul: '\n- 항목\n- 항목\n', ol: '\n1. 첫째\n2. 둘째\n', table: '\n| 항목 | 내용 |\n|---|---|\n| | |\n', check: '\n> [!CHECK] 점검 질문\n> - 질문 1\n> - 질문 2\n', tip: '\n> [!TIP] 실무 팁\n> 내용\n', warn: '\n> [!WARN] 주의\n> 내용\n', link: '[링크 글자](/analysis-tool)' };
  $('#tbar').onclick = (e) => { const k = e.target.dataset.ins; if (!k) return; const ta = $('#body'); const s = ta.selectionStart; ta.setRangeText(SNIP[k], s, ta.selectionEnd, 'end'); ta.focus(); lint(); };
  $('#pvb').onclick = async () => {
    try {
      const L = await layout(); const m = collect(); const text = G.serializeDoc(m, $('#body').value);
      const p = G.makePost(curSlug() || 'preview', text, new Date(8.64e15)); p.status = 'published';
      $('#pv').srcdoc = G.renderArticle(p, { layout: L, posts: [] }).replace('</head>', '<style>.floats,.mbar,.toast{display:none!important}</style></head>');
      $('#pvwrap').classList.remove('hide'); $('#pvwrap').scrollIntoView({ behavior: 'smooth' });
    } catch (err) { toast('미리보기를 만들지 못했습니다: ' + err.message, true); }
  };
  $('#pvclose').onclick = () => $('#pvwrap').classList.add('hide');
  $('#save').onclick = async (e) => {
    const r = lint();
    if (r.errors.length && modeVal() !== 'draft') return toast('점검 오류를 먼저 고쳐 주세요: ' + r.errors[0], true);
    let s = curSlug();
    if (!s) { const k = G.kstParts(new Date()); s = `insight-${k.y}${k.m}${k.d}-${Math.random().toString(36).slice(2, 5)}`; $('#slug').value = s; }
    if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(s)) return toast('주소는 영문 소문자·숫자·하이픈으로 3자 이상 써 주세요.', true);
    if (isNew && state.files && state.files[s]) return toast('같은 주소의 글이 이미 있습니다. 다른 주소를 써 주세요.', true);
    const m = collect(); const text = G.serializeDoc(m, $('#body').value);
    e.target.disabled = true;
    try {
      const d = await api('/post', { method: 'PUT', body: { slug: s, text, sha } });
      sha = d.sha; state.posts = null;
      const md = modeVal();
      toast(md === 'draft' ? '임시 저장했습니다. 사이트에는 공개되지 않습니다.' : md === 'hidden' ? '숨김으로 저장했습니다. 1~2분 뒤 사이트에서 내려갑니다.' : md === 'schedule' ? `예약했습니다. ${m.date} 이후 정기 발행 때 공개됩니다.` : '저장했습니다. 1~2분 뒤 사이트에 반영됩니다.');
      if (isNew) location.hash = '#/edit/' + s;
    } catch (err) { fail(err); }
    e.target.disabled = false;
  };
  const del = $('#del');
  if (del) del.onclick = async () => {
    if (!confirm('이 글의 원고를 삭제합니다. 공개된 페이지도 1~2분 뒤 사라집니다. 계속할까요?')) return;
    try { await api(`/post?slug=${encodeURIComponent(slug)}&sha=${sha}`, { method: 'DELETE' }); state.posts = null; toast('삭제했습니다.'); location.hash = '#/posts'; } catch (err) { fail(err); }
  };
}

// ---------------------------------------------------------------- 매물
async function viewProperties() {
  shell('properties', '<div class="empty">불러오는 중…</div>');
  let f; try { f = await api('/file?path=content/properties.json'); } catch (e) { return fail(e); }
  let data = JSON.parse(f.text); data.items = data.items || []; let sha = f.sha;
  const ST = { public: ['공개', 'ok'], done: ['거래완료', 'draft'], hidden: ['내림', 'hid'] };
  const save = async (msg) => { try { const d = await api('/file', { method: 'PUT', body: { path: 'content/properties.json', text: JSON.stringify(data, null, 2) + '\n', sha } }); sha = d.sha; toast(msg); } catch (e) { fail(e); } };
  const list = () => {
    $('#view').innerHTML = `<div class="topline"><div><h2>매물</h2><p>공개한 매물은 매물·딜 페이지에 법정 표시사항과 함께 게시됩니다. 실제 의뢰를 확인한 자산만 올려 주세요.</p></div><div class="acts"><button class="btn btn-gold" id="add">매물 추가</button></div></div>
    <div class="tbl-wrap"><table><thead><tr><th>매물번호</th><th>제목</th><th>거래</th><th>가격</th><th>상태</th><th>확인일</th><th></th></tr></thead><tbody>${data.items.length ? data.items.map((x, i) => `<tr><td class="nowrap">${E(x.id)}</td><td><div class="ttl">${E(x.title)}</div><div class="sub">${E(x.location || '')}</div></td><td class="nowrap">${E(x.deal || '')}</td><td>${E(x.price || '')}</td><td class="nowrap"><span class="pill ${ST[x.status]?.[1] || 'draft'}">${ST[x.status]?.[0] || x.status}</span></td><td class="nowrap">${E(x.updated || x.posted || '')}</td><td class="nowrap"><button class="btn btn-line btn-sm" data-i="${i}">편집</button></td></tr>`).join('') : '<tr><td colspan="7" class="empty">등록된 매물이 없습니다. 매물이 없으면 페이지에는 \'공개 매물 준비 중\'이 그대로 보입니다.</td></tr>'}</tbody></table></div>
    <p class="note cool" style="margin-top:14px">인터넷 매물 광고는 공인중개사법 제18조의2와 국토교통부 고시 「중개대상물의 표시·광고 명시사항 세부기준」에 따라 소재지(층수 포함), 전용면적, 가격, 중개대상물 종류, 거래 형태, 총 층수, 입주 가능일, 욕실 수, 사용승인일, 주차대수, 방향을 빠짐없이 적고, 위반건축물이면 그 사실도 표시합니다. 실제로 거래할 수 없거나 중개할 의사가 없는 매물은 올리지 않고, 거래가 끝나면 바로 '거래완료' 또는 '내림'으로 바꿔 주세요.</p>`;
    $('#add').onclick = () => edit(-1);
    $$('[data-i]').forEach((b) => b.onclick = () => edit(Number(b.dataset.i)));
  };
  const edit = (i) => {
    const today = G.ymd(new Date());
    const x = i >= 0 ? { ...data.items[i] } : { id: `OR-${today.slice(0, 4)}-${String(data.items.length + 1).padStart(3, '0')}`, status: 'public', posted: today };
    $('#view').innerHTML = `<div class="topline"><div><h2>${i >= 0 ? '매물 편집' : '매물 추가'}</h2><p>* 표시는 공개 시 꼭 적어야 하는 항목입니다.</p></div><div class="acts"><button class="btn btn-line" id="back">목록</button>${i >= 0 ? '<button class="btn btn-bad" id="rm">삭제</button>' : ''}<button class="btn btn-gold" id="sv">저장</button></div></div>
    <div class="card"><div class="fgrid">
      <div class="f"><label for="p-id">매물번호</label><input type="text" id="p-id" value="${E(x.id)}"></div>
      <div class="f"><label for="p-status">상태</label><select id="p-status">${Object.entries(ST).map(([k, [t]]) => `<option value="${k}"${x.status === k ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="f full"><label for="p-title">제목 *</label><input type="text" id="p-title" value="${E(x.title || '')}" placeholder="예: 역삼역 도보 5분 대로변 1층 상가"></div>
      <div class="f full"><label for="p-summary">한 줄 소개</label><input type="text" id="p-summary" value="${E(x.summary || '')}"></div>
      ${G.PROPERTY_FIELDS.map(([k, label, req, hint]) => `<div class="f"><label for="p-${k}">${label}${req ? ' *' : ''}</label><input type="text" id="p-${k}" value="${E(x[k] || '')}" placeholder="${E(hint)}"></div>`).join('')}
      <div class="f"><label for="p-posted">게시일</label><input type="date" id="p-posted" value="${E(x.posted || today)}"></div>
    </div></div>`;
    $('#back').onclick = list;
    if ($('#rm')) $('#rm').onclick = async () => { if (!confirm('이 매물을 목록에서 삭제할까요? (거래완료 표시가 필요하면 상태를 바꾸세요)')) return; data.items.splice(i, 1); await save('삭제했습니다.'); list(); };
    $('#sv').onclick = async () => {
      const y = { ...x, id: $('#p-id').value.trim(), status: $('#p-status').value, title: $('#p-title').value.trim(), summary: $('#p-summary').value.trim(), posted: $('#p-posted').value, updated: today };
      for (const [k] of G.PROPERTY_FIELDS) y[k] = $('#p-' + k).value.trim();
      const miss = G.PROPERTY_FIELDS.filter(([k, , req]) => req && !y[k]).map(([, l]) => l);
      if (y.status === 'public' && (miss.length || !y.title)) return toast('공개하려면 필수 항목을 채워 주세요: ' + (y.title ? '' : '제목 ') + miss.join(', '), true);
      if (i >= 0) data.items[i] = y; else data.items.unshift(y);
      await save('저장했습니다. 1~2분 뒤 매물·딜 페이지에 반영됩니다.'); list();
    };
  };
  list();
}

// ---------------------------------------------------------------- 설정
async function viewSettings() {
  shell('settings', '<div class="empty">불러오는 중…</div>');
  let f; try { f = await api('/file?path=content/settings.json'); } catch (e) { return fail(e); }
  const s = JSON.parse(f.text); s.notice = s.notice || {}; s.autoWrite = { enabled: true, nextTopic: '', ...(s.autoWrite || {}) };
  $('#view').innerHTML = `<div class="topline"><div><h2>사이트 설정</h2><p>저장하면 모든 페이지에 한 번에 반영됩니다.</p></div><div class="acts"><button class="btn btn-gold" id="sv">저장</button></div></div>
  <div class="grid g2">
    <div class="card"><h3>연락처 표시</h3><div class="grid" style="gap:14px">
      <div class="f"><label for="s-email">대표 이메일</label><input type="email" id="s-email" value="${E(s.contactEmail || '')}" placeholder="info@orbis-estate.com"><span class="hint">비워 두면 사이트 전체에서 이메일 표시가 사라집니다. 상담 접수(LEAD_WEBHOOK)가 연결되지 않았다면 비우지 마세요.</span></div>
      <div class="f"><label for="s-kakao">카카오톡 채널 주소</label><input type="url" id="s-kakao" value="${E(s.kakaoChannel || '')}" placeholder="http://pf.kakao.com/_xxxxx/chat"><span class="hint">넣으면 카카오톡 상담 버튼이 나타납니다.</span></div>
    </div></div>
    <div class="card"><h3>상단 공지 띠</h3><div class="grid" style="gap:14px">
      <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="s-nen"${s.notice.enabled ? ' checked' : ''}> 공지 띠 보이기</label>
      <div class="f"><label for="s-ntext">문구</label><input type="text" id="s-ntext" value="${E(s.notice.text || '')}" placeholder="예: 추석 연휴(10.3~10.9)에는 전화 상담만 운영합니다."></div>
      <div class="f"><label for="s-nlink">연결 주소 (선택)</label><input type="text" id="s-nlink" value="${E(s.notice.link || '')}" placeholder="/insights 또는 https://..."></div>
    </div></div>
    <div class="card"><h3>매일 자동 집필</h3><div class="grid" style="gap:14px">
      <label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="s-aw"${s.autoWrite.enabled ? ' checked' : ''}> 매일 오전 10시에 글을 준비해 11시에 공개</label>
      <div class="f"><label for="s-topic">다음 글 주제 (선택)</label><input type="text" id="s-topic" value="${E(s.autoWrite.nextTopic || '')}" placeholder="예: 상가 임대료 감액 요구, 언제 어떻게 하나"><span class="hint">적어 두면 다음 자동 집필 때 이 주제로 먼저 쓰고, 쓴 뒤에는 칸이 비워집니다. 끄면 자동 집필만 쉬고, 관리자 화면에서 직접 예약한 글은 그대로 공개됩니다.</span></div>
    </div></div>
    <div class="card"><h3>관리 연결</h3><div class="grid" style="gap:14px">
      <div class="f"><label for="s-sheet">상담 접수 구글 시트 주소</label><input type="url" id="s-sheet" value="${E(s.leadSheetUrl || '')}" placeholder="https://docs.google.com/spreadsheets/..."><span class="hint">대시보드 바로가기에 연결됩니다. 사이트에는 보이지 않지만 저장소에는 기록되니, 시트 공유 설정은 '제한됨'으로 두세요.</span></div>
      <div class="f"><label for="s-ga">GA4 측정 ID</label><input type="text" id="s-ga" value="${E(s.gaId || '')}" placeholder="G-XXXXXXXXXX"><span class="hint">방문 분석을 켜면 개인정보처리방침의 쿠키 항목도 함께 고쳐야 합니다.</span></div>
    </div></div>
  </div>`;
  $('#sv').onclick = async (e) => {
    const ns = { ...s, contactEmail: $('#s-email').value.trim(), kakaoChannel: $('#s-kakao').value.trim(), gaId: $('#s-ga').value.trim(), leadSheetUrl: $('#s-sheet').value.trim(), notice: { enabled: $('#s-nen').checked, text: $('#s-ntext').value.trim(), link: $('#s-nlink').value.trim() }, autoWrite: { enabled: $('#s-aw').checked, nextTopic: $('#s-topic').value.trim() } };
    if (ns.gaId && !/^G-[A-Z0-9]+$/.test(ns.gaId)) return toast('GA4 측정 ID는 G-로 시작합니다.', true);
    if (ns.gaId && !s.gaId && !confirm('방문 분석(GA4)을 켜면 개인정보처리방침에 쿠키 사용을 적어야 합니다. 방침 수정을 요청하셨나요? 계속 저장할까요?')) return;
    e.target.disabled = true;
    try { await api('/file', { method: 'PUT', body: { path: 'content/settings.json', text: JSON.stringify(ns, null, 2) + '\n', sha: f.sha } }); toast('저장했습니다. 1~2분 뒤 모든 페이지에 반영됩니다.'); viewSettings(); } catch (err) { fail(err); }
    e.target.disabled = false;
  };
}

// ---------------------------------------------------------------- 검색노출 점검
async function viewSeo() {
  shell('seo', '<div class="empty">불러오는 중…</div>');
  try { await loadPosts(true); } catch (e) { return fail(e); }
  const pub = state.posts.filter((p) => p.status === 'published');
  const issues = state.posts.filter((p) => (p.warnings || []).length || (p.errors || []).length);
  const cats = G.CATEGORY_KEYS.map((k) => [k, pub.filter((p) => p.category === k).length]);
  const last7 = pub.filter((p) => p.date && new Date(p.date) > new Date(Date.now() - 7 * 864e5)).length;
  $('#view').innerHTML = `<div class="topline"><div><h2>검색노출 점검</h2><p>글마다 제목·설명 길이, 키워드, 내부 링크, 출처를 자동으로 확인합니다.</p></div></div>
  <div class="grid g4"><div class="card kpi"><b>${pub.length}</b><span>공개 글</span></div><div class="card kpi"><b>${last7}</b><span>최근 7일 발행</span></div><div class="card kpi"><b>${issues.length}</b><span>알림이 있는 글</span></div><div class="card kpi"><b>${cats.filter(([, n]) => n).length}/6</b><span>글이 있는 분야</span></div></div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h3>분야별 글 수</h3><div class="list">${cats.map(([k, n]) => `<div class="row"><span class="t">${G.CATEGORIES[k].title}</span><b>${n}편</b><a class="btn btn-line btn-sm" href="/insights/topics/${k}" target="_blank" rel="noopener">보기</a></div>`).join('')}</div></div>
    <div class="card"><h3>검색엔진 등록 확인</h3><div class="list">
      <div class="row"><span class="t">사이트맵 (구글·네이버에 제출)</span><a class="btn btn-line btn-sm" href="/sitemap.xml" target="_blank" rel="noopener">열기</a></div>
      <div class="row"><span class="t">RSS (네이버 서치어드바이저에 제출)</span><a class="btn btn-line btn-sm" href="/rss.xml" target="_blank" rel="noopener">열기</a></div>
      <div class="row"><span class="t">네이버 서치어드바이저 — 수집 현황·웹 페이지 수집 요청</span><a class="btn btn-line btn-sm" href="https://searchadvisor.naver.com/console/board" target="_blank" rel="noopener">이동</a></div>
      <div class="row"><span class="t">구글 서치 콘솔 — 색인 생성·검색 실적</span><a class="btn btn-line btn-sm" href="https://search.google.com/search-console" target="_blank" rel="noopener">이동</a></div>
      <div class="row"><span class="t">새 글 자동 알림 (IndexNow: 네이버·빙)</span><span class="pill ok">발행 때 자동</span></div>
    </div></div>
  </div>
  <div class="card" style="margin-top:16px"><h3>알림이 있는 글</h3>${issues.length ? `<div class="list">${issues.map((p) => `<div class="row" style="align-items:flex-start"><span class="t" style="white-space:normal"><a href="#/edit/${p.slug}"><b>${E(p.title)}</b></a><br><span style="color:var(--slate);font-size:12.5px">${[...(p.errors || []), ...(p.warnings || [])].map(E).join(' · ')}</span></span>${pill(p.status)}</div>`).join('')}</div>` : '<p class="empty">모든 글이 기준을 통과했습니다.</p>'}</div>`;
}

// ---------------------------------------------------------------- 사용 안내
function viewHelp() {
  shell('help', `<div class="topline"><div><h2>사용 안내</h2><p>관리자 화면이 하는 일과 자동 발행 구조입니다.</p></div></div>
  <div class="card help">
    <h4>저장하면 어떻게 되나요</h4><ol><li>관리자 화면에서 저장하면 원고가 깃허브 저장소(content 폴더)에 올라갑니다.</li><li>깃허브 Actions의 '인사이트 발행'이 글 페이지·목록·사이트맵·RSS를 다시 만듭니다.</li><li>Cloudflare가 새 버전을 배포합니다. 보통 1~3분 걸립니다.</li></ol>
    <h4>매일 자동 발행</h4><p>매일 오전 10시에 Claude가 주제를 고르고 자료를 확인해 글을 써서 '예약 글'로 올립니다. 오전 11시 정기 발행 때 공개되고, 네이버·빙에 새 글 알림(IndexNow)을 보냅니다. 마음에 들지 않는 예약 글은 11시 전에 '임시 저장'으로 바꾸면 공개되지 않습니다. 쓰고 싶은 주제가 있으면 <a href="#/settings" style="text-decoration:underline">사이트 설정</a>의 '다음 글 주제'에 적어 두세요. 같은 곳에서 자동 집필을 잠시 끌 수도 있습니다.</p>
    <h4>예약 글</h4><p>지정한 시각이 지난 뒤 첫 정기 발행(매일 오전 11시) 때 공개됩니다. 다른 글을 저장해도 그때 시각이 지난 예약 글은 함께 공개됩니다.</p>
    <h4>글을 내리고 싶을 때</h4><p>편집 화면에서 '숨기기'로 저장하면 사이트에서 사라지고 원고는 남습니다. '삭제'는 원고까지 지웁니다.</p>
    <h4>점검 오류가 있는 글</h4><p>보장 표현이나 넣지 않기로 한 이름이 있으면 자동 발행에서 빠집니다. 점검 칸의 빨간 항목을 고친 뒤 다시 저장하세요.</p>
    <h4>보안</h4><ul><li>비밀번호는 Cloudflare 환경변수 ADMIN_PASSWORD에서 바꿉니다. 바꾸면 기존 로그인은 모두 풀립니다.</li><li>로그인은 12시간 유지됩니다. 공용 컴퓨터에서는 꼭 로그아웃하세요.</li><li>저장소가 공개 상태이면 임시 저장 원고도 깃허브에서 보일 수 있습니다.</li></ul>
  </div>`);
}

// ---------------------------------------------------------------- 라우팅
async function route() {
  const h = location.hash.replace(/^#\/?/, '') || 'dashboard';
  const [v, arg] = h.split('/');
  try {
    if (v === 'posts') return viewPosts();
    if (v === 'new') return viewEditor(null);
    if (v === 'edit' && arg) return viewEditor(arg);
    if (v === 'properties') return viewProperties();
    if (v === 'settings') return viewSettings();
    if (v === 'seo') return viewSeo();
    if (v === 'help') return viewHelp();
    return viewDashboard();
  } catch (e) { fail(e); }
}
window.addEventListener('hashchange', route);
(async () => {
  try { await api('/me'); route(); }
  catch (e) {
    if (e.message === 'login') return;
    if (e.data?.error === 'not_configured') return renderLogin('관리자 비밀번호(ADMIN_PASSWORD)가 아직 등록되지 않았습니다. 사용 안내 문서를 참고해 Cloudflare에 등록해 주세요.');
    if (e.data?.error === 'no_token') { app.innerHTML = '<div class="login"><div class="login-card"><img src="/assets/logo-icon.png" alt=""><h1>연결 설정이 필요합니다</h1><p style="margin-top:10px">Cloudflare 환경변수에 GITHUB_TOKEN이 아직 없습니다. 오르비스 관리자 설정 가이드의 토큰 등록 단계를 마친 뒤 이 화면을 새로고침해 주세요.</p></div></div>'; return; }
    renderLogin(e.message);
  }
})();
