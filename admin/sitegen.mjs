// 자동 생성 파일 — 원본은 scripts/content/sitegen.mjs 입니다. 이 파일은 직접 고치지 마세요.
// 오르비스중개법인 콘텐츠 생성기 — 순수 함수 모음 (Node·브라우저 공용, 파일 입출력 없음)
// build.mjs(저장소 빌드), 관리자 화면 미리보기, 관리 API가 같은 규칙으로 글을 만듭니다.

export const SITE = 'https://orbis-estate.com';
export const BRAND = '오르비스중개법인';
export const TEL = '010-7379-5265';

export const CATEGORIES = {
  market: { name: '시장동향', title: '부동산 시장동향', accent: '#27406B',
    intro: '금리, 임대가격지수, 공실률, 실거래 같은 공개 지표로 중소형 빌딩·상가·오피스 시장을 읽는 법을 정리합니다. 수치에는 출처와 기준 시점을 함께 적습니다.' },
  invest: { name: '투자전략', title: '부동산 투자전략', accent: '#866829',
    intro: '꼬마빌딩과 상가를 사고, 보유하고, 파는 과정에서 따져야 할 수익률·실사·출구 전략을 다룹니다. 결과를 약속하는 대신 판단 기준과 계산 방법을 보여 드립니다.' },
  area: { name: '상권분석', title: '상권분석·입지', accent: '#2F6F6A',
    intro: '배후수요와 유동, 경쟁, 임대료 부담을 어떤 순서로 보는지, 현장에서 무엇을 다시 확인해야 하는지 정리합니다. 오르비스 상권분석 시스템과 함께 읽으면 좋습니다.' },
  brand: { name: '브랜드·출점', title: '브랜드·점포개발', accent: '#A8513A',
    intro: '브랜드 첫 매장부터 다점포 출점까지, 출점기준표와 후보지 비교, 점포 조건과 임대차 협상을 실무 관점에서 다룹니다.' },
  legal: { name: '계약·법률', title: '부동산 계약·법률', accent: '#3D4E6E',
    intro: '상가 임대차, 권리금, 중개보수, 등기부 확인처럼 계약 전에 알아야 할 법과 절차를 조문 근거와 함께 설명합니다. 개별 사안은 전문가 확인이 필요합니다.' },
  asset: { name: '공실·자산관리', title: '공실·자산관리', accent: '#5B6A3A',
    intro: '공실 원인 진단, 임차인 구성(MD), 임대 조건 협상, 매각 준비처럼 건물의 가치를 지키는 관리 실무를 다룹니다.' },
};
export const CATEGORY_KEYS = Object.keys(CATEGORIES);

export const CTA = {
  owner: { eyebrow: 'Next Step', h: '건물 상황에 맞는 방향이 궁금하다면', p: '주소와 층별 현황을 남겨 주시면 우선 확인할 항목과 검토 방향을 정리해 회신드립니다.', btn: '건물 1차 진단 신청', href: '/owners', label: 'article_owner' },
  investor: { eyebrow: 'Next Step', h: '매입을 검토 중인 자산이 있다면', p: '예산과 조건을 알려 주시면 공개·비공개 자산 가운데 맞는 후보와 먼저 확인할 항목을 안내합니다.', btn: '매수·투자 상담', href: '/contact?type=investor', label: 'article_investor' },
  tenant: { eyebrow: 'Next Step', h: '계약 전에 한 번 더 확인하고 싶다면', p: '검토 중인 점포나 사무실의 조건을 남겨 주시면 계약 전에 짚어야 할 항목을 함께 확인해 드립니다.', btn: '임차·창업 상담', href: '/contact?type=brand', label: 'article_tenant' },
  brand: { eyebrow: 'Next Step', h: '다음 매장 입지를 같은 기준으로 비교합니다', p: '브랜드와 목표 지역, 표준 점포 조건을 알려 주시면 후보 상권과 점포를 한 틀에서 비교해 드립니다.', btn: '출점 브리프 보내기', href: '/contact?type=franchise', label: 'article_brand' },
  analysis: { eyebrow: 'Try It', h: '후보지가 있다면 지금 바로 분석해 보세요', p: '주소 하나로 반경 상권의 업종 구성과 경쟁, 층별 임대료 참고값을 무료로 확인할 수 있습니다.', btn: '상권분석 시작하기', href: '/analysis-tool', label: 'article_analysis', btn2: '분석 상담 신청', href2: '/contact?type=analysis' },
};

export const DISCLAIMER = '이 글은 일반적인 정보 제공을 위해 작성했으며, 특정 자산에 대한 투자 권유나 법률·세무 자문이 아닙니다. 법령과 기준은 바뀔 수 있으니 계약·투자 전에는 최신 법령과 전문가 의견을 확인하시기 바랍니다. 오르비스중개법인은 임대수익·매각가 등 어떠한 결과도 보장하지 않습니다.';

const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>';

// ---------------------------------------------------------------- 공통 유틸
export function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const escAttr = esc;

export function slugify(s) {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
}

// '2026-10-26 11:00' 또는 '2026-10-26' → Date (한국 시간 기준)
export function parseKstDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, h = '09', mi = '00'] = m;
  const d0 = new Date(`${y}-${mo}-${d}T${h}:${mi}:00+09:00`);
  return isNaN(d0) ? null : d0;
}
export function kstParts(date) {
  const t = new Date(date.getTime() + 9 * 3600e3);
  const p = (n) => String(n).padStart(2, '0');
  return { y: t.getUTCFullYear(), m: p(t.getUTCMonth() + 1), d: p(t.getUTCDate()), h: p(t.getUTCHours()), mi: p(t.getUTCMinutes()), wd: t.getUTCDay() };
}
export function isoKst(date) { const k = kstParts(date); return `${k.y}-${k.m}-${k.d}T${k.h}:${k.mi}:00+09:00`; }
export function ymd(date) { const k = kstParts(date); return `${k.y}-${k.m}-${k.d}`; }
export function dotDate(date) { const k = kstParts(date); return `${k.y}.${k.m}.${k.d}`; }
export function rfc822(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const k = kstParts(date);
  return `${days[k.wd]}, ${k.d} ${mons[Number(k.m) - 1]} ${k.y} ${k.h}:${k.mi}:00 +0900`;
}

// ---------------------------------------------------------------- 머리말(front matter) 파서
function splitInline(s) {
  const out = []; let cur = ''; let q = null;
  for (const ch of s) {
    if (q) { if (ch === q) q = null; cur += ch; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === ',') { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}
function scalar(v) {
  v = String(v).trim();
  if (v.startsWith('[') && v.endsWith(']')) return splitInline(v.slice(1, -1)).map(scalar);
  if ((v.startsWith('"') && v.endsWith('"') && v.length > 1) || (v.startsWith("'") && v.endsWith("'") && v.length > 1)) {
    return v.slice(1, -1).replace(/\\"/g, '"');
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v) && v.length < 10) return Number(v);
  return v;
}
export function parseYaml(src) {
  const lines = src.split('\n'); const out = {}; let i = 0;
  const keyRe = /^([A-Za-z_][\w-]*):(?:\s+(.*)|\s*)$/;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
    const m = line.match(keyRe);
    if (!m) { i++; continue; }
    const key = m[1]; const rest = (m[2] ?? '').trim();
    if (rest !== '') { out[key] = scalar(rest); i++; continue; }
    const items = []; i++;
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) { i++; continue; }
      const lm = l.match(/^(\s*)-\s+(.*)$/);
      if (!lm) break;
      const indent = lm[1].length; const val = lm[2];
      const kv = val.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (kv) {
        const obj = {}; obj[kv[1]] = scalar(kv[2]); i++;
        while (i < lines.length) {
          const cm = lines[i].match(/^(\s+)([A-Za-z_][\w-]*):\s*(.*)$/);
          if (cm && cm[1].length > indent && !/^\s*-\s/.test(lines[i])) { obj[cm[2]] = scalar(cm[3]); i++; } else break;
        }
        items.push(obj);
      } else { items.push(scalar(val)); i++; }
    }
    out[key] = items;
  }
  return out;
}
export function parseDoc(text) {
  text = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!text.startsWith('---\n')) return { meta: {}, body: text.trim() };
  const end = text.indexOf('\n---', 4);
  if (end < 0) return { meta: {}, body: text.trim() };
  const fm = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^[^\n]*\n/, '').replace(/^\n+/, '');
  return { meta: parseYaml(fm), body: body.trim() };
}
function yamlVal(v) {
  if (v == null) return '""';
  const s = String(v);
  if (s === '' || /[:#\[\]{},"']|^\s|\s$|^[-?]/.test(s)) return '"' + s.replace(/"/g, '\\"') + '"';
  return s;
}
// 관리자 화면에서 저장할 때 쓰는 직렬화 (머리말 + 본문)
export function serializeDoc(meta, body) {
  const order = ['title', 'seoTitle', 'description', 'category', 'date', 'updated', 'status', 'keywords', 'summary', 'cover', 'cta', 'faq', 'sources', 'related'];
  const keys = [...order.filter((k) => k in meta), ...Object.keys(meta).filter((k) => !order.includes(k))];
  const lines = ['---'];
  for (const k of keys) {
    const v = meta[k];
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue;
    if (Array.isArray(v)) {
      if (v.every((x) => typeof x !== 'object')) { lines.push(`${k}: [${v.map((x) => yamlVal(x)).join(', ')}]`); continue; }
      lines.push(`${k}:`);
      for (const obj of v) {
        const ks = Object.keys(obj).filter((kk) => obj[kk] != null && obj[kk] !== '');
        ks.forEach((kk, j) => lines.push(`${j === 0 ? '  - ' : '    '}${kk}: ${yamlVal(obj[kk])}`));
      }
      continue;
    }
    lines.push(`${k}: ${yamlVal(v)}`);
  }
  lines.push('---', '', String(body || '').trim(), '');
  return lines.join('\n');
}

// ---------------------------------------------------------------- 마크다운 → HTML
function safeUrl(u) {
  u = String(u || '').trim();
  if (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(u)) return u;
  if (/^[a-z0-9-]+(\?.*)?(#.*)?$/i.test(u)) return '/' + u;
  return '#';
}
export function termId(t) { return String(t).replace(/\s*\(.*\)$/, '').replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').slice(0, 40); }

export function inline(s) {
  let t = esc(s);
  const codes = [];
  t = t.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, url) => {
    const u = safeUrl(url.replace(/&amp;/g, '&'));
    const ext = /^https?:\/\//i.test(u) && !u.startsWith(SITE);
    return `<a href="${escAttr(u)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${txt}</a>`;
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  t = t.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  t = t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
  return t;
}
const CALLOUT = { CHECK: ['a-check', '점검 질문'], TIP: ['a-tip', '실무 팁'], WARN: ['a-warn', '주의'], NOTE: ['a-note', '참고'], SUMMARY: ['a-summary', '핵심 요약'] };

function renderList(lines, start) {
  // lines: [{indent, ordered, text}] — 2단계까지
  const items = [];
  let i = start; const baseIndent = lines[start].indent; const ordered = lines[start].ordered;
  while (i < lines.length && lines[i].indent >= baseIndent) {
    const it = lines[i];
    if (it.indent === baseIndent) { items.push({ text: it.text, children: [] }); i++; continue; }
    const sub = []; while (i < lines.length && lines[i].indent > baseIndent) { sub.push({ ...lines[i], indent: lines[i].indent }); i++; }
    if (items.length) items[items.length - 1].children.push(renderList(sub, 0).html);
  }
  const tag = ordered ? 'ol' : 'ul';
  return { html: `<${tag}>` + items.map((x) => `<li>${inline(x.text)}${x.children.join('')}</li>`).join('') + `</${tag}>`, next: i };
}

export function mdToHtml(md, opts = {}) {
  const numbered = opts.numbered !== false;
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
  const out = []; const toc = []; let h2n = 0; let para = [];
  const usedIds = new Set();
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const mkId = (text, fallback) => {
    let id = opts.headingIds === 'text' && !/^s\d+$/.test(text) ? termId(text) : fallback;
    if (!id) id = fallback;
    let k = id; let n = 2; while (usedIds.has(k)) k = `${id}-${n++}`; usedIds.add(k); return k;
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { flush(); i++; continue; }
    let m;
    if ((m = line.match(/^(#{2,4})\s+(.*)$/))) {
      flush();
      const lv = m[1].length; const text = m[2].trim();
      if (lv === 2) {
        h2n++; const id = mkId(`s${h2n}`, `s${h2n}`);
        toc.push({ id, text });
        const no = numbered ? `<span class="no">${String(h2n).padStart(2, '0')}</span>` : '';
        out.push(`<h2 id="${id}">${no}${inline(text)}</h2>`);
      } else {
        const id = opts.headingIds === 'text' ? ` id="${mkId(text, 't' + i)}"` : '';
        out.push(`<h${lv}${id}>${inline(text)}</h${lv}>`);
      }
      i++; continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { flush(); out.push('<hr>'); i++; continue; }
    if (line.startsWith('>')) {
      flush();
      const block = [];
      while (i < lines.length && lines[i].startsWith('>')) { block.push(lines[i].replace(/^>\s?/, '')); i++; }
      const head = block[0].match(/^\[!(\w+)\]\s*(.*)$/);
      if (head && CALLOUT[head[1].toUpperCase()]) {
        const [cls, def] = CALLOUT[head[1].toUpperCase()];
        const title = head[2].trim() || def;
        const inner = mdToHtml(block.slice(1).join('\n'), { numbered: false }).html;
        out.push(`<div class="a-callout ${cls}"><b class="ac-t">${inline(title)}</b>${inner}</div>`);
      } else {
        out.push(`<blockquote>${mdToHtml(block.join('\n'), { numbered: false }).html}</blockquote>`);
      }
      continue;
    }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      flush();
      const row = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      const headCells = row(line); i += 2; const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(row(lines[i])); i++; }
      out.push(`<div class="a-table c${Math.min(headCells.length, 5)}"><table><thead><tr>${headCells.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^\s*([-*]|\d+[.)])\s+/.test(line)) {
      flush();
      const items = [];
      while (i < lines.length && (/^\s*([-*]|\d+[.)])\s+/.test(lines[i]))) {
        const lm = lines[i].match(/^(\s*)([-*]|\d+[.)])\s+(.*)$/);
        const ind = lm[1].replace(/\t/g, '  ').length >= 2 ? Math.floor(lm[1].length / 2) : 0; const ord = /\d/.test(lm[2]);
        if (items.length && ind === 0 && ord !== items[0].ordered) break;
        items.push({ indent: ind, ordered: ord, text: lm[3] });
        i++;
        while (i < lines.length && lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+[.)])\s+/.test(lines[i])) { items[items.length - 1].text += ' ' + lines[i].trim(); i++; }
      }
      out.push(renderList(items, 0).html);
      continue;
    }
    para.push(line.trim()); i++;
  }
  flush();
  return { html: out.join('\n'), toc };
}

export function textLength(md) {
  return String(md || '').replace(/^#+\s.*$/gm, '').replace(/[>|*`#\-\[\]()]/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().length;
}
export function readMinutes(md) { return Math.max(3, Math.round(textLength(md) / 650)); }

// ---------------------------------------------------------------- 글 객체
export function makePost(slug, text, now = new Date()) {
  const { meta, body } = parseDoc(text);
  const date = parseKstDate(meta.date) || null;
  const updated = parseKstDate(meta.updated) || null;
  let status = String(meta.status || 'published');
  if (status !== 'draft' && status !== 'hidden') status = date && date > now ? 'scheduled' : 'published';
  if (!date && status === 'published') status = 'draft';
  const category = CATEGORIES[meta.category] ? meta.category : 'asset';
  const list = (v) => (Array.isArray(v) ? v : v ? String(v).split(',').map((x) => x.trim()) : []).filter(Boolean);
  return {
    slug, meta, body, status, date, updated, category,
    title: String(meta.title || slug), seoTitle: String(meta.seoTitle || meta.title || slug),
    description: String(meta.description || ''), summary: String(meta.summary || meta.description || ''),
    keywords: list(meta.keywords), faq: Array.isArray(meta.faq) ? meta.faq.filter((f) => f && f.q && f.a) : [],
    sources: Array.isArray(meta.sources) ? meta.sources.filter((s) => s && s.title) : [],
    related: list(meta.related), cover: meta.cover ? String(meta.cover) : '', cta: CTA[meta.cta] ? meta.cta : (category === 'brand' ? 'brand' : category === 'area' ? 'analysis' : category === 'legal' ? 'tenant' : category === 'invest' ? 'investor' : 'owner'),
    url: `/insights/${slug}`, readMin: Number(meta.readMin) || readMinutes(body), legacy: false,
  };
}

// ---------------------------------------------------------------- 점검(검색노출·표기 원칙)
const BANNED = [
  [/수익(을|이)?\s*보장(합니다|해\s*드|됩니다|된다)/, '수익 보장 표현'], [/무조건/, '"무조건"'], [/확실한\s*수익/, '"확실한 수익"'], [/대박/, '"대박"'],
  [/100\s*%\s*(성공|보장|수익)/, '100% 표현'], [/원금\s*보장/, '원금 보장'], [/업계\s*(1위|최고)/, '업계 1위·최고'],
];
// 사이트에 넣지 않기로 한 이름은 저장소에 글자로 남기지 않고, 한글 세 글자 단위 해시로만 비교합니다
const HIDDEN_NAME_HASHES = new Set([0xf09d9743]);
const fnv1a = (str) => { let h = 0x811c9dc5; for (const ch of str) { const c = ch.codePointAt(0); h ^= c & 0xff; h = Math.imul(h, 0x01000193) >>> 0; h ^= c >>> 8; h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
export function hasHiddenName(text) {
  const s = [...String(text || '').replace(/[^\uAC00-\uD7A3]/g, '')];
  for (let i = 0; i + 3 <= s.length; i++) if (HIDDEN_NAME_HASHES.has(fnv1a(s[i] + s[i + 1] + s[i + 2]))) return true;
  return false;
}
export function lintPost(p) {
  const errors = []; const warnings = [];
  const all = [p.title, p.seoTitle, p.description, p.summary, p.body, ...p.faq.map((f) => f.q + ' ' + f.a)].join('\n');
  for (const [re, label] of BANNED) if (re.test(all)) errors.push(`금지 표현: ${label}`);
  if (hasHiddenName(all + '\n' + (p.keywords || []).join(' '))) errors.push('사이트에 넣지 않기로 한 이름이 들어 있습니다.');
  if (/(?<!않[는을]?\s?|지\s?)보장(합니다|해\s*드립니다|됩니다)/.test(all.replace(/보장하지/g, ''))) warnings.push('"보장" 표현이 있습니다. 결과 보장으로 읽히지 않는지 확인하세요.');
  if (!p.meta.title) errors.push('제목이 없습니다.');
  if (!p.date && p.status !== 'draft') errors.push('발행일(date)이 없습니다.');
  if (!CATEGORIES[p.meta.category]) errors.push('분야(category)가 올바르지 않습니다.');
  const tl = p.seoTitle.length; if (tl > 45) warnings.push(`검색 제목이 깁니다 (${tl}자, 40자 안팎 권장).`);
  const dl = p.description.length; if (dl < 70 || dl > 160) warnings.push(`설명문 길이 ${dl}자 (110~150자 권장).`);
  if (p.keywords.length < 3) warnings.push('키워드를 3개 이상 넣어 주세요.');
  const len = textLength(p.body); if (len < 2500) warnings.push(`본문이 짧습니다 (${len}자, 4,000자 이상 권장).`);
  const h2 = (p.body.match(/^##\s/gm) || []).length; if (h2 < 3) warnings.push('소제목(##)을 3개 이상 두세요.');
  if (!/\]\(\/[a-z]/.test(p.body)) warnings.push('사이트 내부 링크가 없습니다 (예: /analysis-tool, /owners).');
  if (!p.sources.length) warnings.push('참고 자료(sources)가 없습니다. 수치·법령은 출처를 적어 주세요.');
  if (p.keywords[0] && !(p.title + p.seoTitle).includes(p.keywords[0].split(' ')[0])) warnings.push('첫 번째 키워드가 제목에 없습니다.');
  return { errors, warnings, length: len };
}

// ---------------------------------------------------------------- 레이아웃 (머리말·헤더·푸터)
// 기준 페이지(insights.html)의 헤더·푸터를 가져와 하위 폴더에서도 깨지지 않게 절대 경로로 바꿉니다.
export function absolutize(html) {
  return html.replace(/(\s(?:href|src))="([^"]*)"/g, (m, attr, url) => {
    if (!url || /^(https?:|\/|#|mailto:|tel:|javascript:|data:)/i.test(url)) return m;
    return `${attr}="/${url}"`;
  });
}
export function extractLayout(refHtml) {
  const b = refHtml.indexOf('<body'); const bEnd = refHtml.indexOf('>', b) + 1;
  const mStart = refHtml.indexOf('<main'); const mEnd = refHtml.indexOf('</main>') + '</main>'.length;
  const header = absolutize(refHtml.slice(bEnd, mStart));
  // 푸터는 app.js 스크립트까지만 (페이지별 스크립트는 빼고 가져옴)
  const appAt = refHtml.search(/<script src="\/?app\.js[^"]*"><\/script>/);
  const fEnd = appAt >= 0 ? refHtml.indexOf('</script>', appAt) + '</script>'.length : refHtml.indexOf('</body>');
  const footer = absolutize(refHtml.slice(mEnd, fEnd));
  const org = (refHtml.match(/<script type="application\/ld\+json">\{"@context":"https:\/\/schema.org","@type":"RealEstateAgent".*?<\/script>/s) || [''])[0];
  const cssVer = (refHtml.match(/styles\.css\?v=([\w.-]+)/) || [, ''])[1];
  return { header, footer, org, cssVer };
}

function jsonld(obj) { return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`; }
const ORG_REF = { '@type': 'Organization', '@id': `${SITE}/#organization`, name: BRAND, url: `${SITE}/` };

export function headHtml({ title, description, path, ogType = 'website', image, extra = '', robots = 'index,follow,max-image-preview:large', layout, article }) {
  const url = `${SITE}${path}`;
  const img = image ? (image.startsWith('http') ? image : `${SITE}${image}`) : `${SITE}/assets/og-image.jpg`;
  const art = article ? [
    `<meta property="article:published_time" content="${article.published}">`,
    article.modified ? `<meta property="article:modified_time" content="${article.modified}">` : '',
    `<meta property="article:section" content="${esc(article.section)}">`,
    ...(article.tags || []).slice(0, 6).map((t) => `<meta property="article:tag" content="${esc(t)}">`),
  ].filter(Boolean).join('\n') : '';
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script>(function(h){if(h==='www.orbis-estate.com'||h==='orbis-estate.pages.dev'){location.replace('https://orbis-estate.com'+location.pathname+location.search+location.hash);}})(location.hostname);</script>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${url}">
<link rel="alternate" type="application/rss+xml" title="오르비스중개법인 소식" href="${SITE}/rss.xml">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${BRAND}">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
${art}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ffffff">
<meta name="format-detection" content="telephone=no">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css?v=${layout.cssVer}">
<script>document.documentElement.classList.add('js');</script>
${layout.org}${extra}
</head>
<body>`;
}
export function pageHtml(head, layout, main, scripts = '') {
  return `${head}${layout.header}<main id="main" tabindex="-1">\n${main}\n</main>${layout.footer.replace('</body>', '')}${scripts}\n</body>\n</html>\n`;
}

function crumbLd(items) {
  return jsonld({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE}${path}` })) });
}

export function ctaBand(kind) {
  const c = CTA[kind] || CTA.owner;
  const second = c.btn2 ? `<a href="${c.href2}" class="btn btn-ghost-light lg" data-track="cta_click" data-label="${c.label}_2">${esc(c.btn2)}</a>` : `<a href="tel:${TEL}" class="btn btn-ghost-light lg" data-track="click_phone">${PHONE}전화 상담</a>`;
  return `<div class="ctaband reveal"><div class="cbring"></div><div class="cbring2"></div><div class="inner">
    <div><div class="eyebrow">${c.eyebrow}</div><h2>${esc(c.h)}</h2><p>${esc(c.p)}</p>
    <a class="tel" href="tel:${TEL}" data-track="click_phone">${PHONE}${TEL}</a></div>
    <div class="acts"><a href="${c.href}" class="btn btn-gold lg" data-track="cta_click" data-label="${c.label}">${esc(c.btn)} ${ARROW}</a>${second}</div>
  </div></div>`;
}

// ---------------------------------------------------------------- 카드
// 제목의 가운뎃점(·) 앞뒤에서 줄이 바뀌지 않게 합니다(화면 표시용)
export const tidyTitle = (t) => esc(t).replace(/·/g, '\u2060·\u2060');

export function postCard(p, { reveal = false, headingLevel = 3 } = {}) {
  const cat = CATEGORIES[p.category] || CATEGORIES.asset;
  const date = p.date ? `<time datetime="${ymd(p.date)}">${dotDate(p.date)}</time>` : '';
  return `<a class="pcard${reveal ? ' reveal' : ''}" href="${p.url}" data-cat="${p.category}" style="--pc:${cat.accent}">
  <div class="pc-top"><span class="pc-cat">${esc(cat.name)}</span><span class="pc-read">읽기 ${p.readMin}분</span></div>
  <h${headingLevel}>${tidyTitle(p.title)}</h${headingLevel}>
  <p>${esc(p.description || p.summary)}</p>
  <div class="pc-foot">${date}<span class="more">읽기 ${ARROW}</span></div>
</a>`;
}

// ---------------------------------------------------------------- 글 페이지
export function renderArticle(p, ctx) {
  const { layout, posts = [] } = ctx;
  const cat = CATEGORIES[p.category];
  const { html, toc } = mdToHtml(p.body);
  const published = isoKst(p.date);
  const modified = p.updated && p.updated > p.date ? isoKst(p.updated) : null;
  const title = `${p.seoTitle} | ${BRAND}`;
  const image = p.cover || '/assets/og-image.jpg';
  const ld = [
    crumbLd([['홈', '/'], ['인사이트', '/insights'], [cat.name, `/insights/topics/${p.category}`], [p.title, p.url]]),
    jsonld({ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.description, datePublished: published, dateModified: modified || published,
      author: ORG_REF, publisher: { ...ORG_REF, logo: { '@type': 'ImageObject', url: `${SITE}/assets/logo-full.png` } },
      mainEntityOfPage: `${SITE}${p.url}`, image: `${SITE}${image}`, keywords: p.keywords.join(', '), articleSection: cat.name, inLanguage: 'ko-KR', wordCount: textLength(p.body) }),
    p.faq.length ? jsonld({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map((f) => ({ '@type': 'Question', name: String(f.q), acceptedAnswer: { '@type': 'Answer', text: String(f.a) } })) }) : '',
  ].join('');
  const head = headHtml({ title, description: p.description, path: p.url, ogType: 'article', image, extra: ld, layout,
    article: { published, modified, section: cat.name, tags: p.keywords } });

  const tocHtml = toc.length >= 3 ? `<div class="toc"><b>CONTENTS</b><ol>${toc.map((t) => `<li><a href="#${t.id}">${inline(t.text)}</a></li>`).join('')}</ol></div>` : '';
  const meta = `<div class="a-meta"><span>작성 <b>${BRAND}</b></span><span>발행 <b><time datetime="${published}">${dotDate(p.date)}</time></b></span>${modified ? `<span>수정 <b><time datetime="${modified}">${dotDate(p.updated)}</time></b></span>` : ''}<span>분야 <b><a href="/insights/topics/${p.category}">${cat.name}</a></b></span><span>읽기 <b>약 ${p.readMin}분</b></span></div>`;
  const kw = p.keywords.length ? `<div class="a-tags">${p.keywords.map((k) => `<span>#${esc(k)}</span>`).join('')}</div>` : '';
  const faq = p.faq.length ? `<section class="a-faq" aria-labelledby="faq-h"><h2 id="faq-h">자주 묻는 질문</h2>${p.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${inline(String(f.a))}</p></details>`).join('')}</section>` : '';
  const src = p.sources.length ? `<section class="a-sources" aria-labelledby="src-h"><h2 id="src-h">참고 자료</h2><ul>${p.sources.map((s) => `<li>${s.url ? `<a href="${escAttr(safeUrl(s.url))}" target="_blank" rel="noopener">${esc(s.title)}</a>` : esc(s.title)}${s.date ? ` <span>(${esc(s.date)} 확인)</span>` : ''}</li>`).join('')}</ul><p class="a-src-note">출처의 수치와 법령은 위 기준 시점의 것입니다. 이후 개정·발표로 달라질 수 있습니다.</p></section>` : '';
  // 관련 글: 지정한 글 → 같은 분야 최신 글 순
  const pub = posts.filter((x) => x.slug !== p.slug && x.status === 'published');
  const rel = [];
  for (const s of p.related) { const r = pub.find((x) => x.slug === s); if (r && !rel.includes(r)) rel.push(r); }
  for (const r of pub.filter((x) => x.category === p.category)) { if (rel.length >= 3) break; if (!rel.includes(r)) rel.push(r); }
  for (const r of pub) { if (rel.length >= 3) break; if (!rel.includes(r)) rel.push(r); }
  const relHtml = rel.length ? `<section class="section on-white"><div class="wrap"><p class="eyebrow">Related</p><h2 class="sec-title">함께 읽으면 좋은 글</h2><div class="pgrid g3" style="margin-top:28px">${rel.slice(0, 3).map((r) => postCard(r)).join('')}</div><p class="more-line"><a href="/insights/topics/${p.category}" class="more">${cat.name} 글 모두 보기 ${ARROW}</a></p></div></section>` : '';

  const main = `<section class="phero"><div class="ring pr1"></div><div class="ring pr2"></div><div class="article" style="padding-top:0">
  <nav class="crumb" aria-label="현재 위치"><a href="/">홈</a> / <a href="/insights">인사이트</a> / <a href="/insights/topics/${p.category}">${cat.name}</a></nav>
  <h1>${tidyTitle(p.title)}</h1>
  ${meta}
  ${p.summary ? `<p class="a-sum">${inline(p.summary)}</p>` : ''}
  ${tocHtml}
</div></section>
<section class="section tight"><div class="article"><article class="a-body">
${html}
${faq}
${src}
<div class="a-disclaimer"><b>안내</b><p>${DISCLAIMER}</p></div>
${kw}
</article>
<div style="margin-top:34px">${ctaBand(p.cta)}</div>
</div></section>
${relHtml}`;
  return pageHtml(head, layout, main);
}

// ---------------------------------------------------------------- 목록 · 주제 페이지
export function listingSection(posts, { limit = 12 } = {}) {
  const pub = posts.filter((p) => p.status === 'published');
  const counts = Object.fromEntries(CATEGORY_KEYS.map((k) => [k, pub.filter((p) => p.category === k).length]));
  const chips = `<div class="ifilter" role="group" aria-label="분야 고르기"><button type="button" class="on" data-cat="all" aria-pressed="true">전체 <span>${pub.length}</span></button>${CATEGORY_KEYS.map((k) => `<button type="button" data-cat="${k}" aria-pressed="false">${CATEGORIES[k].name} <span>${counts[k]}</span></button>`).join('')}</div>`;
  return `${chips}
  <div class="pgrid g3" id="ilist">${pub.map((p, i) => postCard(p)).join('\n')}</div>
  <div class="center" style="margin-top:26px"><button type="button" class="btn btn-outline" id="imore"${pub.length > limit ? '' : ' hidden'}>글 더 보기</button></div>`;
}
export const LISTING_SCRIPT = `<script>
(function(){var LIM=12,cur='all',shown=LIM,bs=document.querySelectorAll('.ifilter button'),cs=[].slice.call(document.querySelectorAll('#ilist .pcard')),more=document.getElementById('imore');
function apply(){var n=0;cs.forEach(function(c){var ok=cur==='all'||c.getAttribute('data-cat')===cur;if(ok){n++;c.hidden=n>shown;}else{c.hidden=true;}});if(more)more.hidden=n<=shown;}
bs.forEach(function(b){b.addEventListener('click',function(){cur=b.getAttribute('data-cat');shown=LIM;bs.forEach(function(x){var on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on?'true':'false');});apply();});});
if(more)more.addEventListener('click',function(){shown+=LIM;apply();});
var h=(location.hash||'').replace('#','');if(h){var t=document.querySelector('.ifilter button[data-cat="'+h+'"]');if(t)t.click();}
apply();})();
</script>`;

export function topicHubCards(posts) {
  const pub = posts.filter((p) => p.status === 'published');
  return CATEGORY_KEYS.map((k) => {
    const c = CATEGORIES[k]; const n = pub.filter((p) => p.category === k).length;
    return `<a class="tcard" href="/insights/topics/${k}" style="--pc:${c.accent}"><b>${c.title}</b><span>${esc(c.intro.split('. ')[0].replace(/\.$/, ''))}.</span><em>글 ${n}편 ${ARROW}</em></a>`;
  }).join('');
}

export function renderTopic(key, ctx) {
  const { layout, posts } = ctx; const c = CATEGORIES[key];
  const pub = posts.filter((p) => p.status === 'published' && p.category === key);
  const path = `/insights/topics/${key}`;
  const title = `${c.title} 가이드 — ${pub.length ? pub.length + '편의 실무 글' : '실무 글 모음'} | ${BRAND}`;
  const desc = `${c.intro}`.slice(0, 150);
  const ld = crumbLd([['홈', '/'], ['인사이트', '/insights'], [c.name, path]]) + jsonld({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${c.title} 가이드`, description: desc, url: `${SITE}${path}`, isPartOf: { '@type': 'WebSite', url: `${SITE}/`, name: BRAND },
    mainEntity: { '@type': 'ItemList', itemListElement: pub.slice(0, 30).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}${p.url}`, name: p.title })) } });
  const head = headHtml({ title, description: desc, path, layout, extra: ld });
  const others = CATEGORY_KEYS.filter((k) => k !== key).map((k) => `<a href="/insights/topics/${k}">${CATEGORIES[k].name}</a>`).join('');
  const main = `<section class="phero"><div class="ring pr1"></div><div class="ring pr2"></div><div class="wrap">
  <nav class="crumb" aria-label="현재 위치"><a href="/">홈</a> / <a href="/insights">인사이트</a> / ${c.name}</nav>
  <p class="eyebrow" style="margin-top:14px">Insights · ${c.name}</p><h1>${c.title} 가이드</h1><p class="pdesc">${esc(c.intro)}</p>
</div></section>
<section class="section"><div class="wrap">
  ${pub.length ? `<div class="pgrid g3">${pub.map((p) => postCard(p, { headingLevel: 2 })).join('\n')}</div>` : '<div class="note cool"><div class="nk">준비 중</div><p>이 분야의 글을 준비하고 있습니다.</p></div>'}
  <div class="topic-others"><b>다른 분야</b>${others}<a href="/glossary">부동산 용어사전</a><a href="/faq">자주 묻는 질문</a></div>
</div></section>
<section class="section tight"><div class="wrap">${ctaBand(key === 'brand' ? 'brand' : key === 'area' ? 'analysis' : key === 'legal' ? 'tenant' : key === 'invest' ? 'investor' : 'owner')}</div></section>`;
  return pageHtml(head, layout, main);
}

// ---------------------------------------------------------------- 용어사전 · FAQ 페이지
export function renderGlossary(doc, ctx) {
  const { layout } = ctx; const { meta, body } = parseDoc(doc);
  const { html } = mdToHtml(body, { numbered: false, headingIds: 'text' });
  const groups = []; const terms = [];
  body.split('\n').forEach((l) => { const g = l.match(/^##\s+(.*)$/); const t = l.match(/^###\s+(.*)$/); if (g) groups.push(g[1].trim()); if (t) terms.push(t[1].trim()); });
  const path = '/glossary';
  const ld = crumbLd([['홈', '/'], ['인사이트', '/insights'], ['부동산 용어사전', path]]) + jsonld({ '@context': 'https://schema.org', '@type': 'DefinedTermSet', name: meta.title || '부동산 용어사전', url: `${SITE}${path}`,
    hasDefinedTerm: terms.map((t) => ({ '@type': 'DefinedTerm', name: t.replace(/\s*\(.*\)$/, ''), url: `${SITE}${path}#${termId(t)}` })) });
  const head = headHtml({ title: `${meta.seoTitle || meta.title} | ${BRAND}`, description: meta.description || '', path, layout, extra: ld });
  const nav = `<div class="g-nav">${groups.map((g, i) => `<a href="#s${i + 1}">${esc(g)}</a>`).join('')}</div>`;
  const main = `<section class="phero"><div class="ring pr1"></div><div class="ring pr2"></div><div class="article" style="padding-top:0">
  <nav class="crumb" aria-label="현재 위치"><a href="/">홈</a> / <a href="/insights">인사이트</a> / 부동산 용어사전</nav>
  <h1>${esc(meta.title || '부동산 용어사전')}</h1><p class="a-sum">${esc(meta.summary || meta.description || '')}</p>${nav}
</div></section>
<section class="section tight"><div class="article"><div class="a-body glossary">${html.replace(/<h2 id="s(\d+)">/g, '<h2 id="s$1">')}</div>
<div class="a-disclaimer"><b>안내</b><p>용어 설명은 이해를 돕기 위한 일반적인 정의입니다. 법령상 정확한 요건과 적용 범위는 해당 법령 원문과 전문가 확인이 필요합니다.</p></div>
<div style="margin-top:34px">${ctaBand('owner')}</div></div></section>`;
  return pageHtml(head, layout, main);
}

export function renderFaq(doc, ctx) {
  const { layout } = ctx; const { meta, body } = parseDoc(doc);
  // ## 묶음 → ### 질문 → 답변 문단
  const groups = []; let g = null; let q = null;
  for (const l of body.split('\n')) {
    const gm = l.match(/^##\s+(.*)$/); const qm = l.match(/^###\s+(.*)$/);
    if (gm) { g = { name: gm[1].trim(), items: [] }; groups.push(g); q = null; continue; }
    if (qm && g) { q = { q: qm[1].trim(), a: [] }; g.items.push(q); continue; }
    if (q) q.a.push(l);
  }
  const all = groups.flatMap((x) => x.items);
  const path = '/faq';
  const ld = crumbLd([['홈', '/'], ['자주 묻는 질문', path]]) + jsonld({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: all.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a.join(' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim() } })) });
  const head = headHtml({ title: `${meta.seoTitle || meta.title} | ${BRAND}`, description: meta.description || '', path, layout, extra: ld });
  const nav = `<div class="g-nav">${groups.map((x, i) => `<a href="#g${i + 1}">${esc(x.name)}</a>`).join('')}</div>`;
  const main = `<section class="phero"><div class="ring pr1"></div><div class="ring pr2"></div><div class="article" style="padding-top:0">
  <nav class="crumb" aria-label="현재 위치"><a href="/">홈</a> / 자주 묻는 질문</nav>
  <h1>${esc(meta.title || '자주 묻는 질문')}</h1><p class="a-sum">${esc(meta.summary || meta.description || '')}</p>${nav}
</div></section>
<section class="section tight"><div class="article"><div class="a-body faqpage">
${groups.map((x, i) => `<h2 id="g${i + 1}">${esc(x.name)}</h2>${x.items.map((it) => `<details><summary>${esc(it.q)}</summary>${mdToHtml(it.a.join('\n'), { numbered: false }).html}</details>`).join('')}`).join('\n')}
</div>
<div style="margin-top:34px">${ctaBand('owner')}</div></div></section>`;
  return pageHtml(head, layout, main);
}

// ---------------------------------------------------------------- sitemap · RSS
export function renderSitemap(entries) {
  const rows = entries.map((e) => `  <url><loc>${esc(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}${e.changefreq ? `<changefreq>${e.changefreq}</changefreq>` : ''}${e.priority ? `<priority>${e.priority}</priority>` : ''}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}
export function renderRss(items, now) {
  const body = items.map((it) => `    <item>
      <title>${esc(it.title)}</title>
      <link>${esc(it.link)}</link>
      <guid isPermaLink="true">${esc(it.link)}</guid>
      <pubDate>${rfc822(it.date)}</pubDate>
      <category>${esc(it.category)}</category>
      <description>${esc(it.description)}</description>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>오르비스중개법인 인사이트</title>
    <link>${SITE}/</link>
    <description>강남 부동산 중개법인 오르비스의 부동산 시장동향·투자·상권분석·점포개발·계약/법률·자산관리 가이드</description>
    <language>ko</language>
    <lastBuildDate>${rfc822(now)}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>
${body}
  </channel>
</rss>
`;
}

// ---------------------------------------------------------------- 매물 (중개대상물 표시·광고)
export const PROPERTY_FIELDS = [
  // [키, 라벨, 필수 여부(공개 시), 안내] — 「중개대상물의 표시·광고 명시사항 세부기준」(국토교통부 고시) 건축물 항목 기준
  ['kind', '중개대상물 종류', true, '건축물대장 용도 (예: 제1종 근린생활시설, 업무시설)'],
  ['deal', '거래 형태', true, '매매 / 교환 / 전세 / 월세'],
  ['location', '소재지', true, '읍·면·동까지 (예: 서울특별시 강남구 역삼동)'],
  ['floor', '해당 층 / 총 층수', true, '층수는 반드시 표시 (예: 1층 / 지상 5층)'],
  ['area', '면적', true, '전용면적 ㎡ (예: 전용 66.12㎡). 대장 확인이 어려우면 실측임을 함께 표시'],
  ['price', '가격', true, '단일가격 (예: 매매 32억 원 / 보증금 5,000만 원·월 300만 원)'],
  ['maintenance', '관리비', false, '금액과 포함 항목 (상가·사무실은 생략할 수 있지만 표시를 권합니다)'],
  ['moveIn', '입주 가능일', true, '예: 즉시입주 / 2026년 12월 초순'],
  ['approval', '사용승인일', true, '건축물대장의 사용승인일 (예: 2012.05.10)'],
  ['parking', '주차대수', true, '예: 총 6대 (대장상 대수와 실제 가능 대수가 다르면 함께)'],
  ['direction', '방향', true, '주된 출입구 기준 8방위 (예: 남향, 주된 출입구 기준)'],
  ['baths', '방 수 / 욕실 수', true, '상가·사무실은 방 수를 빼고 욕실(화장실) 수만 적어도 됩니다 (예: 화장실 1개, 층 공용)'],
  ['violation', '위반건축물 여부', true, "건축물대장에 위반 표시가 있으면 '위반건축물', 없으면 '해당 없음'"],
  ['use', '특이사항', false, '업종 제한, 용도변경 필요 여부 등'],
];
export function renderPropertyCards(items) {
  const pub = (items || []).filter((x) => x && (x.status === 'public' || x.status === 'done'));
  if (!pub.length) return '';
  return `<section class="section on-white" id="listings"><div class="wrap">
  <p class="eyebrow">Listings</p><h2 class="sec-title">공개 매물</h2>
  <p class="sec-sub">실제 의뢰를 확인한 자산만 법정 표시사항과 함께 게시합니다. 거래가 끝난 자산은 '거래완료'로 표시합니다.</p>
  <div class="plist">${pub.map((x) => {
    const done = x.status === 'done';
    const rows = PROPERTY_FIELDS.filter(([k]) => x[k]).map(([k, label]) => `<div><dt>${label}</dt><dd>${esc(x[k])}</dd></div>`).join('');
    return `<article class="prop${done ? ' done' : ''}" id="p-${esc(x.id || '')}">
  <div class="prop-top"><span class="prop-deal">${esc(x.deal || '')}</span>${done ? '<span class="prop-st">거래완료</span>' : ''}<span class="prop-id">매물번호 ${esc(x.id || '-')}</span></div>
  <h3>${esc(x.title || '')}</h3>${x.summary ? `<p class="prop-sum">${esc(x.summary)}</p>` : ''}
  <dl class="prop-dl">${rows}</dl>
  <div class="prop-foot"><span>게시 ${esc(x.posted || '')}${x.updated ? ` · 확인 ${esc(x.updated)}` : ''}</span>${done ? '' : `<a class="btn btn-navy sm" href="/contact?type=investor&amp;ref=${encodeURIComponent(x.id || '')}" data-track="cta_click" data-label="prop_${esc(x.id || '')}">이 매물 문의 ${ARROW}</a>`}</div>
</article>`;
  }).join('\n')}</div>
  <p class="prop-legal">중개사무소 ${BRAND} · 대표 이상민 · 서울특별시 강남구 테헤란로 123, 6층 615호 · ${TEL} · 중개사무소 개설등록번호 11680-2025-00157</p>
</div></section>`;
}
