/**
 * 오르비스 관리자 API — Cloudflare Pages Functions
 * 경로: /api/admin/*
 *
 * 관리자 화면(/admin)이 글·매물·설정 파일을 깃허브 저장소에 저장할 때 씁니다.
 * 저장하면 깃허브 Actions(인사이트 발행)가 사이트 파일을 다시 만들고, Cloudflare가 1~2분 안에 배포합니다.
 *
 * ★ Cloudflare → Workers & Pages → 프로젝트 → Settings → Variables and Secrets 에 등록
 *   ADMIN_PASSWORD : 관리자 로그인 비밀번호 (12자 이상 권장, 필수)
 *   GITHUB_TOKEN   : 깃허브 토큰 (fine-grained, 저장소 orbis-estate만 / Contents 읽기·쓰기, Actions 읽기·쓰기) (필수)
 *   GITHUB_REPO    : 기본값 naadaa87/orbis-estate (선택)
 *   GITHUB_BRANCH  : 기본값 main (선택)
 *   ADMIN_SECRET   : 로그인 유지용 서명 키 (선택 — 없으면 위 값들로 만들어 씁니다)
 */

const COOKIE = 'orbis_admin';
const SESSION_HOURS = 12;
const WRITABLE = /^content\/(insights\/[a-z0-9-]+\.md|properties\.json|settings\.json|pages\/(faq|glossary)\.md)$/;
const READABLE = /^(content\/[a-z0-9/_.-]+|sitemap\.xml|rss\.xml)$/;

const enc = new TextEncoder();
const json = (obj, status = 200, headers = {}) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
});

function b64encode(str) {
  const bytes = enc.encode(str); let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64decode(b64) {
  const bin = atob(String(b64).replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
async function hmac(keyStr, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(keyStr), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
async function secretOf(env) {
  if (env.ADMIN_SECRET) return env.ADMIN_SECRET;
  return hmac('orbis-admin-v1', `${env.ADMIN_PASSWORD || ''}|${env.GITHUB_TOKEN || ''}`);
}
function getCookie(req, name) {
  const m = (req.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}
async function isAuthed(req, env) {
  const v = getCookie(req, COOKIE); if (!v) return false;
  const [exp, sig] = v.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(await secretOf(env), `admin|${exp}`));
}

// ---------------------------------------------------------------- GitHub
function gh(env) {
  const repo = env.GITHUB_REPO || 'naadaa87/orbis-estate';
  const branch = env.GITHUB_BRANCH || 'main';
  const call = async (method, path, body) => {
    const r = await fetch(`${env.GITHUB_API_BASE || 'https://api.github.com'}/repos/${repo}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'orbis-admin',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
    if (!r.ok) { const e = new Error((data && data.message) || `GitHub ${r.status}`); e.status = r.status; throw e; }
    return data;
  };
  return {
    repo, branch,
    async read(path) {
      try {
        const d = await call('GET', `/contents/${encodeURI(path)}?ref=${branch}`);
        return { path, sha: d.sha, text: b64decode(d.content) };
      } catch (e) { if (e.status === 404) return null; throw e; }
    },
    async list(path) {
      try { return await call('GET', `/contents/${encodeURI(path)}?ref=${branch}`); } catch (e) { if (e.status === 404) return []; throw e; }
    },
    write(path, text, sha, message) {
      return call('PUT', `/contents/${encodeURI(path)}`, { message, content: b64encode(text), branch, ...(sha ? { sha } : {}) });
    },
    remove(path, sha, message) { return call('DELETE', `/contents/${encodeURI(path)}`, { message, sha, branch }); },
    commits(n = 10) { return call('GET', `/commits?sha=${branch}&per_page=${n}`); },
    runs(file, n = 6) { return call('GET', `/actions/workflows/${file}/runs?per_page=${n}`); },
    dispatch(file) { return call('POST', `/actions/workflows/${file}/dispatches`, { ref: branch }); },
  };
}

// ---------------------------------------------------------------- 검증
// 사이트에 넣지 않기로 한 이름은 저장소에 글자로 남기지 않고, 한글 세 글자 단위 해시로만 비교합니다
const HIDDEN_NAME_HASHES = new Set([0xf09d9743]);
const fnv1a = (str) => { let h = 0x811c9dc5; for (const ch of str) { const c = ch.codePointAt(0); h ^= c & 0xff; h = Math.imul(h, 0x01000193) >>> 0; h ^= c >>> 8; h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
function hasHiddenName(text) {
  const s = [...String(text || '').replace(/[^\uAC00-\uD7A3]/g, '')];
  for (let i = 0; i + 3 <= s.length; i++) if (HIDDEN_NAME_HASHES.has(fnv1a(s[i] + s[i + 1] + s[i + 2]))) return true;
  return false;
}
function checkPost(text) {
  const errors = [];
  if (text.length > 200000) errors.push('글이 너무 깁니다.');
  if (!/^---\n[\s\S]*?\n---/.test(text.replace(/\r\n?/g, '\n'))) errors.push('머리말(---)이 없습니다.');
  if (!/\ntitle:\s*\S/.test(text)) errors.push('제목이 없습니다.');
  if (!/\ncategory:\s*(market|invest|area|brand|legal|asset)\s*\n/.test(text)) errors.push('분야가 올바르지 않습니다.');
  if (hasHiddenName(text)) errors.push('사이트에 넣지 않기로 한 이름이 들어 있습니다.');
  return errors;
}

// ---------------------------------------------------------------- 라우터
export async function onRequest(context) {
  const { request, env, params } = context;
  const route = '/' + [].concat(params.path || []).join('/');
  const method = request.method;
  const url = new URL(request.url);

  if (!env.ADMIN_PASSWORD) return json({ ok: false, error: 'not_configured', message: 'Cloudflare에 ADMIN_PASSWORD가 등록되지 않았습니다.' }, 503);
  if (method !== 'GET' && request.headers.get('X-Orbis-Admin') !== '1') return json({ ok: false, error: 'bad_request' }, 400);

  // 로그인 · 로그아웃
  if (route === '/login' && method === 'POST') {
    let body = {}; try { body = await request.json(); } catch {}
    const ok = safeEqual(String(body.password || ''), env.ADMIN_PASSWORD);
    if (!ok) { await new Promise((r) => setTimeout(r, 900)); return json({ ok: false, error: 'wrong_password', message: '비밀번호가 맞지 않습니다.' }, 401); }
    const exp = Date.now() + SESSION_HOURS * 3600e3;
    const sig = await hmac(await secretOf(env), `admin|${exp}`);
    return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=${exp}.${sig}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}` });
  }
  if (route === '/logout') return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });

  if (!(await isAuthed(request, env))) return json({ ok: false, error: 'login_required' }, 401);
  if (!env.GITHUB_TOKEN) return json({ ok: false, error: 'no_token', message: 'Cloudflare에 GITHUB_TOKEN이 등록되지 않았습니다.' }, 503);
  const G = gh(env);

  try {
    if (route === '/me') return json({ ok: true, repo: G.repo, branch: G.branch, session_hours: SESSION_HOURS });

    // 글 목록: 빌드가 만든 목록 + 아직 빌드 전인 원고 파일
    if (route === '/posts' && method === 'GET') {
      const [man, files] = await Promise.all([G.read('content/insights/index.json'), G.list('content/insights')]);
      const manifest = man ? JSON.parse(man.text) : { posts: [] };
      const mdFiles = (Array.isArray(files) ? files : []).filter((f) => f.name.endsWith('.md')).map((f) => ({ slug: f.name.replace(/\.md$/, ''), sha: f.sha }));
      return json({ ok: true, generatedAt: manifest.generatedAt, posts: manifest.posts || [], files: mdFiles });
    }
    if (route === '/post' && method === 'GET') {
      const slug = url.searchParams.get('slug') || '';
      if (!/^[a-z0-9-]+$/.test(slug)) return json({ ok: false, error: 'bad_slug' }, 400);
      const f = await G.read(`content/insights/${slug}.md`);
      return f ? json({ ok: true, slug, sha: f.sha, text: f.text }) : json({ ok: false, error: 'not_found' }, 404);
    }
    if (route === '/post' && method === 'PUT') {
      const b = await request.json();
      const slug = String(b.slug || '');
      if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(slug)) return json({ ok: false, error: 'bad_slug', message: '주소(슬러그)는 영문 소문자·숫자·하이픈 3자 이상입니다.' }, 400);
      const text = String(b.text || '').replace(/\r\n?/g, '\n');
      const errs = checkPost(text);
      if (errs.length) return json({ ok: false, error: 'invalid', message: errs.join(' ') }, 400);
      const title = (text.match(/\ntitle:\s*"?([^"\n]+)/) || [, slug])[1];
      const r = await G.write(`content/insights/${slug}.md`, text, b.sha || undefined, `인사이트 저장: ${title} (관리자 화면)`);
      return json({ ok: true, sha: r.content.sha, commit: r.commit.sha });
    }
    if (route === '/post' && method === 'DELETE') {
      const slug = url.searchParams.get('slug') || ''; const sha = url.searchParams.get('sha') || '';
      if (!/^[a-z0-9-]+$/.test(slug) || !sha) return json({ ok: false, error: 'bad_request' }, 400);
      await G.remove(`content/insights/${slug}.md`, sha, `인사이트 삭제: ${slug} (관리자 화면)`);
      return json({ ok: true });
    }

    // 매물·설정·고정 페이지 원고
    if (route === '/file' && method === 'GET') {
      const p = url.searchParams.get('path') || '';
      if (!READABLE.test(p) || p.includes('..')) return json({ ok: false, error: 'forbidden' }, 403);
      const f = await G.read(p);
      return f ? json({ ok: true, path: p, sha: f.sha, text: f.text }) : json({ ok: false, error: 'not_found' }, 404);
    }
    if (route === '/file' && method === 'PUT') {
      const b = await request.json();
      const p = String(b.path || '');
      if (!WRITABLE.test(p)) return json({ ok: false, error: 'forbidden' }, 403);
      const text = String(b.text || '');
      if (p.endsWith('.json')) { try { JSON.parse(text); } catch { return json({ ok: false, error: 'invalid_json', message: '저장할 내용의 형식이 올바르지 않습니다.' }, 400); } }
      if (text.length > 300000) return json({ ok: false, error: 'too_large' }, 400);
      const label = p.includes('properties') ? '매물' : p.includes('settings') ? '사이트 설정' : p.includes('faq') ? '자주 묻는 질문' : p.includes('glossary') ? '용어사전' : '파일';
      const r = await G.write(p, text, b.sha || undefined, `${label} 저장 (관리자 화면)`);
      return json({ ok: true, sha: r.content.sha });
    }

    // 배포·발행 상태
    if (route === '/status' && method === 'GET') {
      const out = { ok: true, commits: [], runs: [], runsError: null };
      const cs = await G.commits(8);
      out.commits = cs.map((c) => ({ sha: c.sha.slice(0, 7), message: c.commit.message.split('\n')[0], date: c.commit.author.date, author: c.commit.author.name }));
      try {
        const rs = await G.runs('content-publish.yml', 6);
        out.runs = (rs.workflow_runs || []).map((r) => ({ id: r.id, event: r.event, status: r.status, conclusion: r.conclusion, created: r.created_at, url: r.html_url }));
      } catch (e) { out.runsError = e.message; }
      return json(out);
    }
    if (route === '/rebuild' && method === 'POST') {
      await G.dispatch('content-publish.yml');
      return json({ ok: true });
    }
    return json({ ok: false, error: 'not_found' }, 404);
  } catch (e) {
    const status = e.status === 409 || e.status === 422 ? 409 : e.status === 401 || e.status === 403 ? 502 : 500;
    const message = status === 409 ? '다른 곳에서 먼저 수정했습니다. 새로고침한 뒤 다시 저장해 주세요.'
      : status === 502 ? '깃허브 토큰 권한을 확인해 주세요. (' + e.message + ')' : e.message;
    return json({ ok: false, error: 'github', message }, status);
  }
}
