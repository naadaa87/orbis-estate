// 오르비스 관리자 — 매물 일괄 등록 (PM사 월간 공실 리스트 등)
// 엑셀에서 표를 복사해 붙여 넣거나 파일(.xlsx·.csv)을 고르면, 열을 자동으로 맞추고
// 담당자·연락처는 내부 정보로만 보관한 뒤 오르비스 매물 양식으로 바꿔 등록합니다.

const PY = 3.305785;
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

// [키, 화면 이름, 머리글에서 찾을 말(정규식), 내부 전용 여부]
const FIELDS = [
  ['building', '건물명', /(빌딩|건물|자산|물건)\s*명|^빌딩$|^건물$|building/i],
  ['addr', '주소', /주소|소재지|^위치$|address/i],
  ['region', '권역', /권역|^지역$|^구$/],
  ['floor', '해당 층', /해당\s*층|임대\s*층|공실\s*층|^층$|^층수$|floor/i],
  ['totalFloors', '건물 규모(총 층수)', /규모|총\s*층|지상.*지하|층수\s*\(/],
  ['exclusive', '전용면적', /전용\s*(면적|평|㎡)?$|전용면적/],
  ['contract', '임대(계약)면적', /임대\s*면적|계약\s*면적|공급\s*면적|^임대\s*(평|㎡)|^면적$/],
  ['deposit', '보증금', /보증금|deposit/i],
  ['rent', '임대료', /임대료|월세|월\s*임대|rent/i],
  ['mgmt', '관리비', /관리비|maintenance/i],
  ['price', '매매가', /매매가|매각가|희망가|매도가/],
  ['land', '대지면적', /대지\s*면적|토지\s*면적/],
  ['gross', '연면적', /연\s*면적/],
  ['moveIn', '입주 가능일', /입주|가능\s*시기|공실\s*시기|명도/],
  ['approval', '사용승인(준공)', /준공|사용\s*승인|건축\s*년/],
  ['parking', '주차', /주차/],
  ['direction', '방향', /방향|^향$/],
  ['baths', '욕실(화장실)', /화장실|욕실/],
  ['kind', '용도', /^용도$|건물\s*용도|주\s*용도/],
  ['note', '비고·특이사항', /비고|특이|메모|조건|remark|note/i],
  ['contactName', '담당자', /담당|성명|이름|manager/i, true],
  ['contactPhone', '연락처', /연락처|전화|휴대|핸드폰|h\.?p|mobile|tel|phone/i, true],
  ['contactEmail', '이메일', /메일|e-?mail/i, true],
  ['company', '관리사·PM사', /관리\s*사|pm\s*사|임대\s*대행|^회사|소속/i, true],
];
const FLABEL = Object.fromEntries(FIELDS.map(([k, l]) => [k, l]));
const PRIVATE = new Set(FIELDS.filter((f) => f[3]).map((f) => f[0]));
const GRID = [['title', '제목', 220], ['sgg', '시군구', 80], ['dong', '읍면동', 80], ['floor', '층 / 총 층수', 150], ['areaText', '면적', 190], ['priceText', '가격', 210], ['maintenance', '관리비', 150], ['moveIn', '입주 가능일', 110], ['approval', '사용승인일', 100], ['parking', '주차', 100], ['direction', '방향', 110], ['baths', '욕실', 120], ['violation', '위반건축물', 100], ['kind', '종류', 100]];
const SAMPLE = '권역\t빌딩명\t주소\t준공\t규모\t층\t전용면적(평)\t임대면적(평)\t보증금(평당)\t임대료(평당)\t관리비(평당)\t입주가능\t주차\t담당자\t연락처\t비고\nGBD\t가나타워\t서울 강남구 역삼동 100-1\t2012\tB5/18F\t7F\t152.3\t289.6\t950,000\t95,000\t38,000\t즉시\t무료 1대/50평\t김담당 과장\t010-1234-5678\t렌트프리 2개월 협의, 담당 김담당 010-1234-5678\nGBD\t가나타워\t서울 강남구 역삼동 100-1\t2012\tB5/18F\t12F\t152.3\t289.6\t950,000\t97,000\t38,000\t2027.01\t무료 1대/50평\t김담당 과장\t010-1234-5678\t인테리어 일부 잔존\nCBD\t다라빌딩\t서울 중구 을지로2가 50\t1998\tB3/15F\t3F\t98.5\t201.2\t800,000\t80,000\t35,000\t즉시\t무료 1대/100평\t이담당 대리\t02-123-4567\t';

const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/[,\s원₩]/g, '')); return isFinite(n) ? n : null; };
const clean = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();

/** 탭·쉼표로 나뉜 글 → 2차원 배열 (엑셀 복사본의 따옴표·셀 안 줄바꿈 처리) */
export function parseTable(text) {
  text = String(text || '').replace(/\r\n?/g, '\n');
  const delim = text.includes('\t') ? '\t' : ',';
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"' && cell === '') { q = true; continue; }
    if (c === delim) { row.push(cell); cell = ''; continue; }
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map(clean)).filter((r) => r.some((c) => c !== ''));
}
/** 머리글 행 찾기: 앞쪽 15행 가운데 아는 말이 가장 많은 행 */
export function findHeader(rows) {
  let best = 0; let score = -1;
  rows.slice(0, 15).forEach((r, i) => { const s = r.filter((c) => c && FIELDS.some((f) => f[2].test(c))).length; if (s > score) { score = s; best = i; } });
  // 두 줄짜리 머리글(윗줄: '평당(원)', 아랫줄: '보증금')이면 윗줄 글을 붙여 단위를 읽습니다
  const up = best > 0 ? rows[best - 1] : []; let carry = '';
  const labels = rows[best].map((c, i) => { if (up[i]) carry = up[i]; return { text: c, ctx: `${carry} ${c}`.trim() }; });
  return { index: best, labels, score };
}
export function autoMap(labels) {
  const map = {}; const used = new Set();
  for (const [k, , re] of FIELDS) {
    const i = labels.findIndex((l, idx) => !used.has(idx) && l.text && re.test(l.text));
    if (i >= 0) { map[k] = i; used.add(i); }
  }
  return map;
}
const unitOfArea = (ctx, vals) => (/㎡|m2|m²|제곱/.test(ctx) ? 'm2' : /평|py/i.test(ctx) ? 'py' : (median(vals) > 400 ? 'm2' : 'py'));
function median(vals) { const a = vals.filter((v) => v != null && v > 0).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : 0; }
function moneyGuess(ctx, vals, kind) {
  const m = median(vals);
  let unit = /억/.test(ctx) ? 'eok' : /만\s*원/.test(ctx) ? 'man' : /천\s*원/.test(ctx) ? 'chun' : /원/.test(ctx) ? 'won' : null;
  let per = /평당|\/\s*평|@|㎡당|py/i.test(ctx) ? 'py' : null;
  if (!unit) unit = m >= 5000 ? 'won' : kind === 'price' ? (m < 2000 ? 'eok' : 'man') : (m < 400 && kind !== 'deposit' ? 'chun' : 'man');
  if (!per) {
    const perPyWon = { deposit: [100000, 5000000], rent: [15000, 600000], mgmt: [5000, 120000] }[kind];
    const k = { won: 1, chun: 1000, man: 10000, eok: 1e8 }[unit];
    per = perPyWon && m * k >= perPyWon[0] && m * k <= perPyWon[1] ? 'py' : 'total';
  }
  return { unit, per };
}
const toMan = (v, unit) => (v == null ? null : v * { won: 0.0001, chun: 0.1, man: 1, eok: 10000 }[unit]);
const wonText = (v) => `${Math.round(v).toLocaleString('ko-KR')}원`;

/** 공개 문구에서 전화번호·이메일·담당자 표기를 지웁니다 */
export function scrub(text, extra = []) {
  let s = String(text || ''); let n = 0;
  const cut = (re) => { s = s.replace(re, () => { n++; return ' '; }); };
  cut(/(?:\+82[-\s]?)?0\d{1,2}[-.\s)]{0,2}\d{3,4}[-.\s]?\d{4}/g);
  cut(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);
  cut(/(담당자?|문의|연락처|tel|h\.?p)\s*[:：]?\s*[가-힣]{2,4}\s*(사원|주임|대리|과장|차장|부장|팀장|실장|이사|상무|매니저|프로)?/gi);
  cut(/[가-힣]{2,4}\s*(사원|주임|대리|과장|차장|부장|팀장|실장|매니저)(?=[\s,)/]|$)/g);
  for (const w of extra) if (w) cut(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
  s = s.replace(/\(\s*\)/g, ' ').replace(/\s*[,·/]\s*(?=[,·/]|$)/g, ' ').replace(/^[\s,·/:-]+|[\s,·/:-]+$/g, '').replace(/\s{2,}/g, ' ').trim();
  return { text: s, removed: n };
}
function floorText(v) {
  const s = clean(v).toUpperCase(); if (!s) return '';
  const range = s.match(/^(B?)(\d+)\s*[~\-]\s*(B?)(\d+)\s*(F|층)?$/);
  if (range) return `${range[1] ? '지하 ' : ''}${range[2]}~${range[3] ? '지하 ' : ''}${range[4]}층`;
  const m = s.match(/^(B|지하\s*)?(\d+)\s*(F|층)?$/);
  if (m) return `${m[1] ? '지하 ' : ''}${m[2]}층`;
  return clean(v);
}
function totalFloorsText(v) {
  const s = clean(v).toUpperCase(); if (!s) return '';
  const b = s.match(/B\s*(\d+)|지하\s*(\d+)/); const g = s.match(/(\d+)\s*F|지상\s*(\d+)/);
  if (b || g) return `${g ? `지상 ${g[1] || g[2]}층` : ''}${b && g ? '·' : ''}${b ? `지하 ${b[1] || b[2]}층` : ''}`;
  return /^\d+$/.test(s) ? `지상 ${s}층` : clean(v);
}
const SIDO = { 서울: '서울특별시', 서울시: '서울특별시', 경기: '경기도', 인천: '인천광역시', 부산: '부산광역시', 대구: '대구광역시', 대전: '대전광역시', 광주: '광주광역시', 울산: '울산광역시', 세종: '세종특별자치시' };
const SEOUL_GU = new Set(['강남구', '서초구', '송파구', '강동구', '마포구', '용산구', '성동구', '광진구', '종로구', '영등포구', '동작구', '관악구', '금천구', '구로구', '양천구', '은평구', '서대문구', '성북구', '강북구', '도봉구', '노원구', '중랑구', '동대문구']);
export function splitAddr(addr) {
  const t = clean(addr).replace(/[(),]/g, ' ').split(' ').filter(Boolean); const out = { sido: '', sgg: '', dong: '' };
  if (!t.length) return out;
  if (SIDO[t[0]] || /(특별시|광역시|특별자치시|특별자치도|[가-힣]도)$/.test(t[0])) out.sido = SIDO[t[0]] || t[0];
  const sg = t.filter((x) => /^[가-힣]+(시|군|구)$/.test(x) && x !== out.sido && !SIDO[x] && x !== t[0]).concat(/^[가-힣]+(시|군|구)$/.test(t[0]) && !out.sido ? [t[0]] : []);
  if (sg.length) out.sgg = sg.slice(0, 2).join(' ');
  if (!out.sido && SEOUL_GU.has(out.sgg)) out.sido = '서울특별시'; // 중구·강서구처럼 다른 시에도 있는 이름은 자동으로 정하지 않습니다
  const dg = t.find((x) => /^[가-힣]+\d*(동|가|리)$/.test(x) && !/(시|군|구)$/.test(x));
  if (dg) out.dong = dg;
  return out;
}

function loadXlsx() {
  return new Promise((res, rej) => {
    if (window.XLSX) return res(window.XLSX);
    const s = document.createElement('script'); s.src = XLSX_URL; s.onload = () => (window.XLSX ? res(window.XLSX) : rej(new Error('load')));
    s.onerror = () => rej(new Error('load')); document.head.appendChild(s);
  });
}

export function createImport(ctx) {
  const { api, shell, $, $$, E, fail, toast, geo, won, DEALS, CATS } = ctx;
  let S = null;
  const reset = () => { S = { step: 1, rows: [], head: null, map: {}, opt: { deal: '임대', category: '오피스', areaUnit: { exclusive: 'py', contract: 'py', land: 'py', gross: 'py' }, money: {}, showBuilding: true, kind: '업무시설', baths: '', violation: '', direction: '', sourceName: '', batch: '', hideWords: '', publish: false, consent: false, replace: '' }, items: [], sheets: null, fileName: '' }; };
  const pyOf = (v, unit) => (v == null ? null : unit === 'm2' ? v / PY : v);
  const m2Of = (v, unit) => (v == null ? null : unit === 'm2' ? v : v * PY);
  const r2 = (v) => Math.round(v * 100) / 100;

  function setRows(rows, name) {
    if (rows.length < 2) return toast('표를 알아보지 못했습니다. 머리글 행과 내용 행을 함께 복사해 붙여 넣어 주세요.', true);
    S.rows = rows; S.fileName = name || '';
    S.head = findHeader(rows); S.map = autoMap(S.head.labels);
    const body = rows.slice(S.head.index + 1); const col = (k) => (S.map[k] == null ? [] : body.map((r) => num(r[S.map[k]])));
    for (const k of ['exclusive', 'contract', 'land', 'gross']) if (S.map[k] != null) S.opt.areaUnit[k] = unitOfArea(S.head.labels[S.map[k]].ctx, col(k));
    for (const k of ['deposit', 'rent', 'mgmt', 'price']) if (S.map[k] != null) S.opt.money[k] = moneyGuess(S.head.labels[S.map[k]].ctx, col(k), k);
    if (S.map.price != null && S.map.rent == null) { S.opt.deal = '매매'; S.opt.category = '빌딩'; S.opt.kind = ''; }
    const comp = S.map.company != null ? body.map((r) => r[S.map.company]).find(Boolean) : '';
    const ym = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 7);
    S.opt.sourceName = comp || ''; S.opt.batch = `${ym} ${comp || (name ? name.replace(/\.[a-z]+$/i, '') : 'PM사')} 리스트`.slice(0, 56);
    S.step = 2; draw();
  }

  function build() {
    const o = S.opt; const body = S.rows.slice(S.head.index + 1); const g = (r, k) => (S.map[k] == null ? '' : clean(r[S.map[k]]));
    const words = o.hideWords.split(',').map((s) => s.trim()).filter(Boolean);
    let last = {};
    S.items = body.map((r) => {
      // 병합 셀로 비어 있는 건물명·주소는 윗행 값을 이어받습니다
      const b = g(r, 'building') || (g(r, 'floor') ? last.building : ''); const ad = g(r, 'addr') || (g(r, 'floor') && !g(r, 'building') ? last.addr : '');
      if (g(r, 'building')) last = { building: g(r, 'building'), addr: g(r, 'addr') || '', approval: g(r, 'approval'), totalFloors: g(r, 'totalFloors'), parking: g(r, 'parking'), region: g(r, 'region') };
      const inherit = (k) => g(r, k) || (b && b === last.building ? last[k] || '' : '');
      const ex = pyOf(num(g(r, 'exclusive')), o.areaUnit.exclusive); const ct = pyOf(num(g(r, 'contract')), o.areaUnit.contract);
      const basePy = ct || ex;
      const money = (k) => { const v = num(g(r, k)); const m = o.money[k]; if (v == null || !m) return { man: null, perWon: null }; const man = toMan(v, m.unit); return m.per === 'py' ? { man: basePy ? man * basePy : null, perWon: man * 10000 } : { man, perWon: basePy ? (man * 10000) / basePy : null }; };
      const dep = money('deposit'); const rent = money('rent'); const mg = money('mgmt'); const price = money('price');
      const a = splitAddr(ad || inherit('addr'));
      const fl = floorText(g(r, 'floor')); const tf = totalFloorsText(inherit('totalFloors'));
      const data = {};
      if (o.showBuilding && b) data.building = b;
      data.kind = g(r, 'kind') || o.kind; data.floor = fl ? (tf ? `${fl} / ${tf}` : fl) : '';
      if (ex) data.exclusiveM2 = r2(ex * PY); if (ct) data.contractM2 = r2(ct * PY);
      const land = m2Of(num(g(r, 'land')), o.areaUnit.land); const gross = m2Of(num(g(r, 'gross')), o.areaUnit.gross);
      if (land) data.landM2 = r2(land); if (gross) data.grossM2 = r2(gross);
      data.areaText = [ex ? `전용 ${r2(ex * PY).toLocaleString('ko-KR')}㎡(약 ${r2(ex)}평)` : '', ct ? `임대 ${r2(ct * PY).toLocaleString('ko-KR')}㎡(약 ${r2(ct)}평)` : '', land ? `대지 ${r2(land).toLocaleString('ko-KR')}㎡` : '', gross ? `연면적 ${r2(gross).toLocaleString('ko-KR')}㎡` : ''].filter(Boolean).join(' · ');
      const depMan = dep.man ? Math.round(dep.man) : null; const rentMan = rent.man ? Math.round(rent.man) : null; const priceMan = price.man ? Math.round(price.man) : null;
      data.priceText = o.deal === '매매' ? (priceMan ? `매매 ${won(priceMan)}` : '') : [depMan ? `보증금 ${won(depMan)}` : '', rentMan ? `월 ${won(rentMan)}` : ''].filter(Boolean).join(' / ');
      data.maintenance = mg.man ? `월 ${won(Math.round(mg.man))}${mg.perWon ? ` (평당 ${wonText(mg.perWon)})` : ''}` : '';
      const perNote = [rent.perWon ? `임대료 평당 ${wonText(rent.perWon)}` : '', dep.perWon ? `보증금 평당 ${wonText(dep.perWon)}` : ''].filter(Boolean).join(' · ');
      data.summary = perNote ? `${perNote}${ct ? ' (임대면적 기준)' : ''}` : '';
      const mv = g(r, 'moveIn'); data.moveIn = /^즉시|공실|immediate/i.test(mv) ? '즉시 입주' : mv;
      const ap = inherit('approval'); data.approval = /^\d{4}$/.test(ap) ? `${ap}년` : ap;
      data.parking = inherit('parking'); data.direction = g(r, 'direction') || o.direction; data.baths = g(r, 'baths') || o.baths; data.violation = o.violation;
      const sc = scrub(g(r, 'note'), words); data.use = sc.text;
      const label = o.category === '오피스' ? '사무실' : o.category;
      const sizeNote = ex ? `전용 ${Math.round(ex)}평` : ct ? `임대 ${Math.round(ct)}평` : '';
      const title = scrub([o.showBuilding && b ? b : (a.dong || inherit('region') || a.sgg), fl, label, o.deal === '매매' ? '매매' : '임대', !o.showBuilding && sizeNote ? `(${sizeNote})` : ''].filter(Boolean).join(' '), words).text;
      const raw = {}; S.head.labels.forEach((l, i) => { if (l.text && r[i]) raw[l.text] = r[i]; });
      return {
        on: !!(title && (data.areaText || data.priceText)), scrubbed: sc.removed,
        deal: o.deal, category: o.category, title, sido: a.sido, sgg: a.sgg, dong: a.dong, price: priceMan, deposit: depMan, rent: rentMan, area: data.exclusiveM2 || data.contractM2 || data.grossM2 || data.landM2 || null,
        source: 'pm', cobroke: false, data,
        private: { addr: ad || inherit('addr'), sourceName: o.sourceName || g(r, 'company'), contactName: g(r, 'contactName'), contactPhone: [g(r, 'contactPhone'), g(r, 'contactEmail')].filter(Boolean).join(' / '), memo: g(r, 'note') !== sc.text ? `원문 비고: ${g(r, 'note')}` : '', raw },
      };
    }).filter((it) => it.title);
  }
  const missing = (it) => {
    const m = []; if (!it.sgg || !it.dong) m.push('소재지');
    const need = it.category === '토지' ? ['kind', 'areaText', 'priceText'] : ['kind', 'floor', 'areaText', 'priceText', 'moveIn', 'approval', 'parking', 'direction', 'baths', 'violation'];
    const L = { kind: '종류', floor: '층', areaText: '면적', priceText: '가격', moveIn: '입주 가능일', approval: '사용승인일', parking: '주차', direction: '방향', baths: '욕실', violation: '위반건축물' };
    for (const k of need) if (!it.data[k]) m.push(L[k]);
    return m;
  };

  function draw() {
    const o = S.opt;
    const steps = ['표 가져오기', '열 맞추기', '확인·등록'];
    const head = `<div class="topline"><div><h2>매물 일괄 등록</h2><p>PM사 공실 리스트처럼 표로 된 자료를 오르비스 매물 양식으로 한꺼번에 바꿔 올립니다. 담당자·연락처는 내부 정보로만 보관됩니다.</p></div><div class="acts"><a class="btn btn-line" href="#/listings">매물 목록</a></div></div>
      <ol class="steps">${steps.map((t, i) => `<li class="${S.step === i + 1 ? 'on' : S.step > i + 1 ? 'done' : ''}"><b>${i + 1}</b>${t}</li>`).join('')}</ol>`;
    if (S.step === 1) {
      $('#view').innerHTML = `${head}<div class="card"><h3>엑셀에서 복사해 붙여 넣기</h3>
        <p class="hint2" style="margin:0 0 10px">엑셀·구글 시트에서 <b>머리글 행부터 마지막 행까지</b> 끌어서 복사(Ctrl+C)한 뒤, 아래 칸을 누르고 붙여넣기(Ctrl+V) 하세요.</p>
        <textarea id="i-paste" rows="9" placeholder="여기에 붙여 넣으세요" spellcheck="false" style="font-size:12.5px;white-space:pre;overflow:auto"></textarea>
        <div class="acts" style="margin-top:12px"><button class="btn btn-gold" id="i-go">다음: 열 맞추기</button><label class="btn btn-line">파일에서 가져오기 (.xlsx · .csv)<input type="file" id="i-file" accept=".xlsx,.xls,.csv,.tsv,.txt" hidden></label><button class="btn btn-line" id="i-sample">예시 표로 해 보기</button></div>
        <div id="i-sheets"></div></div>
        <p class="note cool" style="margin-top:14px">PM사·임대인에게서 임대 의뢰(광고 동의)를 받은 매물만 공개해 주세요. 의뢰받지 않은 매물을 광고하면 공인중개사법상 부당한 표시·광고가 됩니다. 확인 전이라면 '임시 저장'으로 올려 내부 자료로만 쓸 수 있습니다.</p>`;
      $('#i-go').onclick = () => setRows(parseTable($('#i-paste').value), '');
      $('#i-sample').onclick = () => { $('#i-paste').value = SAMPLE; toast('예시 표를 넣었습니다. 가상의 값입니다.'); };
      $('#i-file').onchange = async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try {
          if (/\.(csv|tsv|txt)$/i.test(f.name)) return setRows(parseTable(await f.text()), f.name);
          const X = await loadXlsx(); const wb = X.read(await f.arrayBuffer(), { type: 'array' });
          const read = (n) => X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' }).map((r) => r.map(clean)).filter((r) => r.some((c) => c !== ''));
          if (wb.SheetNames.length === 1) return setRows(read(wb.SheetNames[0]), f.name);
          $('#i-sheets').innerHTML = `<p class="hint2" style="margin-top:14px">시트를 골라 주세요.</p><div class="cands">${wb.SheetNames.map((n, i) => `<button class="btn btn-line btn-sm" data-s="${i}">${E(n)} (${read(n).length}행)</button>`).join('')}</div>`;
          $$('[data-s]').forEach((b) => (b.onclick = () => setRows(read(wb.SheetNames[+b.dataset.s]), `${f.name} ${wb.SheetNames[+b.dataset.s]}`)));
        } catch (err) { toast('파일을 읽지 못했습니다. 엑셀에서 표를 복사해 붙여 넣는 방법을 써 주세요.', true); }
      };
      return;
    }
    if (S.step === 2) {
      const labels = S.head.labels; const first = S.rows[S.head.index + 1] || [];
      const sel = (i) => `<select data-col="${i}"><option value="">쓰지 않음</option>${FIELDS.map(([k, l, , pv]) => `<option value="${k}"${S.map[k] === i ? ' selected' : ''}>${l}${pv ? ' (비공개)' : ''}</option>`).join('')}</select>`;
      const unitSel = (k) => `<select data-au="${k}"><option value="py"${o.areaUnit[k] === 'py' ? ' selected' : ''}>평</option><option value="m2"${o.areaUnit[k] === 'm2' ? ' selected' : ''}>㎡</option></select>`;
      const monSel = (k) => { const m = o.money[k] || { unit: 'won', per: 'total' }; return `<select data-mu="${k}">${[['won', '원'], ['chun', '천원'], ['man', '만원'], ['eok', '억원']].map(([v, t]) => `<option value="${v}"${m.unit === v ? ' selected' : ''}>${t}</option>`).join('')}</select><select data-mp="${k}"><option value="py"${m.per === 'py' ? ' selected' : ''}>평당</option><option value="total"${m.per === 'total' ? ' selected' : ''}>총액</option></select>`; };
      $('#view').innerHTML = `${head}<div class="card"><h3>열 맞추기 <span class="sub">— 자동으로 맞춘 결과입니다. 틀린 곳만 고쳐 주세요.</span></h3>
        <div class="tbl-wrap flat"><table class="maptbl"><thead><tr><th>표의 머리글</th><th>첫 행 값</th><th>오르비스 항목</th><th>단위</th></tr></thead><tbody>
        ${labels.map((l, i) => { if (!l.text && !first[i]) return ''; const k = Object.keys(S.map).find((x) => S.map[x] === i) || ''; const u = ['exclusive', 'contract', 'land', 'gross'].includes(k) ? unitSel(k) : ['deposit', 'rent', 'mgmt', 'price'].includes(k) ? monSel(k) : ''; return `<tr class="${PRIVATE.has(k) ? 'pv' : ''}"><td><b>${E(l.text || '(이름 없음)')}</b>${l.ctx !== l.text ? `<div class="sub">${E(l.ctx)}</div>` : ''}</td><td class="sub">${E(String(first[i] || '').slice(0, 40))}</td><td>${sel(i)}</td><td class="nowrap">${u}${PRIVATE.has(k) ? '<span class="pill hid">내부 보관</span>' : ''}</td></tr>`; }).join('')}
        </tbody></table></div></div>
        <div class="card" style="margin-top:16px"><h3>공통 값</h3><div class="fgrid g3f">
          <div class="f"><label for="o-deal">거래 형태</label><select id="o-deal">${DEALS.map((v) => `<option${o.deal === v ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="f"><label for="o-category">유형</label><select id="o-category">${CATS.map((v) => `<option${o.category === v ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="f"><label for="o-kind">중개대상물 종류</label><input type="text" id="o-kind" value="${E(o.kind)}" placeholder="예: 업무시설"></div>
          <div class="f"><label for="o-sourceName">PM사·출처 (내부)</label><input type="text" id="o-sourceName" value="${E(o.sourceName)}" placeholder="예: ○○자산관리"></div>
          <div class="f"><label for="o-batch">묶음 이름</label><input type="text" id="o-batch" value="${E(o.batch)}"><span class="hint">매물 목록에서 이 이름으로 모아 볼 수 있습니다.</span></div>
          <div class="f"><label for="o-hideWords">공개 문구에서 지울 말</label><input type="text" id="o-hideWords" value="${E(o.hideWords)}" placeholder="쉼표로 구분 (예: ○○자산관리, 김담당)"><span class="hint">전화번호·이메일·'담당 ○○○ 과장' 표기는 자동으로 지웁니다.</span></div>
          <div class="f"><span class="lb">건물명</span><label class="ckl"><input type="checkbox" id="o-showBuilding"${o.showBuilding ? ' checked' : ''}> 건물명을 홈페이지에 표시</label></div>
        </div></div>
        <div class="acts" style="margin-top:16px"><button class="btn btn-line" id="i-back">이전</button><button class="btn btn-gold" id="i-next">다음: 변환 결과 확인</button></div>`;
      $$('[data-col]').forEach((el) => (el.onchange = () => { const i = +el.dataset.col; for (const k of Object.keys(S.map)) if (S.map[k] === i) delete S.map[k]; if (el.value) S.map[el.value] = i; draw(); }));
      $$('[data-au]').forEach((el) => (el.onchange = () => { o.areaUnit[el.dataset.au] = el.value; }));
      $$('[data-mu]').forEach((el) => (el.onchange = () => { o.money[el.dataset.mu] = { ...(o.money[el.dataset.mu] || { per: 'total' }), unit: el.value }; }));
      $$('[data-mp]').forEach((el) => (el.onchange = () => { o.money[el.dataset.mp] = { ...(o.money[el.dataset.mp] || { unit: 'won' }), per: el.value }; }));
      const keep = () => { for (const k of ['deal', 'category', 'kind', 'sourceName', 'batch', 'hideWords']) o[k] = $('#o-' + k).value.trim(); o.showBuilding = $('#o-showBuilding').checked; };
      $('#i-back').onclick = () => { reset(); draw(); };
      $('#i-next').onclick = () => { keep(); if (S.map.building == null && S.map.addr == null) return toast('건물명이나 주소 열을 하나는 맞춰 주세요.', true); build(); if (!S.items.length) return toast('변환할 행을 찾지 못했습니다. 열 맞추기를 확인해 주세요.', true); S.step = 3; draw(); };
      return;
    }
    // 3단계
    const okN = S.items.filter((it) => it.on && !missing(it).length).length; const onN = S.items.filter((it) => it.on).length;
    const scr = S.items.reduce((a, it) => a + it.scrubbed, 0);
    const val = (it, k) => (['title', 'sgg', 'dong'].includes(k) ? it[k] : it.data[k]) || '';
    $('#view').innerHTML = `${head}<div class="card"><div class="kch"><h3>변환 결과 <span class="sub">— ${S.items.length}행 · 칸을 눌러 바로 고칠 수 있습니다</span></h3>
        <div class="fillbar"><select id="g-col" aria-label="채울 열">${GRID.filter(([k]) => k !== 'title').map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select><input type="text" id="g-val" placeholder="넣을 값" aria-label="넣을 값"><button class="btn btn-line btn-sm" id="g-fill">빈 칸에 한꺼번에 채우기</button>${S.items.some((it) => !it.dong) ? '<button class="btn btn-line btn-sm" id="g-dong">주소로 읍면동 찾기</button>' : ''}</div></div>
      ${scr ? `<p class="note cool" style="margin-bottom:12px">비고에서 전화번호·담당자 표기 ${scr}곳을 지웠습니다. 원문은 내부 메모에 남겨 둡니다.</p>` : ''}
      <div class="tbl-wrap grid-wrap"><table class="gridtbl"><thead><tr><th></th>${GRID.map(([, l, w]) => `<th style="min-width:${w}px">${l}</th>`).join('')}<th>상태</th></tr></thead><tbody>
      ${S.items.map((it, i) => { const m = missing(it); return `<tr class="${it.on ? '' : 'off'}"><td><input type="checkbox" data-on="${i}"${it.on ? ' checked' : ''} aria-label="등록"></td>${GRID.map(([k]) => `<td><input type="text" data-r="${i}" data-k="${k}" value="${E(val(it, k))}"></td>`).join('')}<td class="nowrap" data-st="${i}">${m.length ? `<span class="pill warn" title="${E(m.join(', '))}">임시 · 빈 칸 ${m.length}</span>` : '<span class="pill ok">공개 가능</span>'}</td></tr>`; }).join('')}
      </tbody></table></div>
      <p class="hint2" style="margin-top:10px">방향·욕실 수·위반건축물 여부처럼 리스트에 없는 법정 표시사항은 확인한 값을 위 '한꺼번에 채우기'로 넣을 수 있습니다. 비어 있는 행은 '임시 저장'으로만 올라갑니다.</p></div>
      <div class="card" style="margin-top:16px"><h3>등록</h3>
        <label class="ckl"><input type="checkbox" id="f-consent"${o.consent ? ' checked' : ''}> 이 매물들은 PM사·임대인에게서 임대 의뢰(광고 동의)를 받았습니다.</label>
        <div class="radios"><label class="ckl"><input type="radio" name="pub" value="0"${o.publish ? '' : ' checked'}> 모두 임시 저장으로 올리기 (내부 자료)</label><label class="ckl"><input type="radio" name="pub" value="1"${o.publish ? ' checked' : ''}> 법정 표시사항이 다 채워진 ${okN}건은 바로 공개, 나머지는 임시 저장</label></div>
        <div class="f" style="max-width:420px;margin-top:12px"><label for="f-replace">지난 리스트 교체 (선택)</label><select id="f-replace"><option value="">교체하지 않음</option></select><span class="hint">고르면 새 리스트를 올린 뒤 그 묶음의 매물을 지웁니다.</span></div>
        <div class="acts" style="margin-top:16px"><button class="btn btn-line" id="i-back">이전</button><button class="btn btn-gold" id="i-save">${onN}건 등록하기</button></div></div>`;
    api('/listings?source=pm').then((d) => { const s = $('#f-replace'); if (!s) return; for (const b of d.batches || []) { const op = document.createElement('option'); op.value = b.batch; op.textContent = `${b.batch} (${b.n}건)`; s.appendChild(op); } }).catch(() => {});
    const restat = (i) => { const m = missing(S.items[i]); const td = $(`[data-st="${i}"]`); if (td) td.innerHTML = m.length ? `<span class="pill warn" title="${E(m.join(', '))}">임시 · 빈 칸 ${m.length}</span>` : '<span class="pill ok">공개 가능</span>'; };
    $$('[data-r]').forEach((el) => (el.oninput = () => { const it = S.items[+el.dataset.r]; const k = el.dataset.k; if (['title', 'sgg', 'dong'].includes(k)) it[k] = el.value.trim(); else it.data[k] = el.value.trim(); restat(+el.dataset.r); }));
    $$('[data-on]').forEach((el) => (el.onchange = () => { S.items[+el.dataset.on].on = el.checked; el.closest('tr').classList.toggle('off', !el.checked); }));
    $('#g-fill').onclick = () => { const k = $('#g-col').value; const v = $('#g-val').value.trim(); if (!v) return toast('넣을 값을 적어 주세요.', true); let n = 0; S.items.forEach((it) => { const cur = ['sgg', 'dong'].includes(k) ? it[k] : it.data[k]; if (!cur) { if (['sgg', 'dong'].includes(k)) it[k] = v; else it.data[k] = v; n++; } }); toast(`${n}칸을 채웠습니다.`); draw(); };
    if ($('#g-dong')) $('#g-dong').onclick = async () => {
      const k = await geo.keys(); let n = 0; const cache = new Map();
      for (const it of S.items) {
        if (it.dong || !it.private.addr) continue;
        if (!cache.has(it.private.addr)) cache.set(it.private.addr, await geo.search(it.private.addr));
        const r = cache.get(it.private.addr);
        if (r.ok && r.items[0]) { it.sido = it.sido || r.items[0].sido; it.sgg = r.items[0].sgg; it.dong = r.items[0].dong; n++; }
      }
      toast(n ? `${n}행의 읍면동을 채웠습니다.` : (k.vworld ? '주소에서 읍면동을 찾지 못했습니다. 직접 적어 주세요.' : '도로명 주소는 브이월드 키를 등록한 뒤에 자동으로 찾을 수 있습니다. 지금은 직접 적어 주세요.'), !n); draw();
    };
    $('#i-back').onclick = () => { S.step = 2; draw(); };
    $('#i-save').onclick = async (e) => {
      o.consent = $('#f-consent').checked; o.publish = $('[name=pub]:checked').value === '1'; const replace = $('#f-replace').value;
      if (o.publish && !o.consent) return toast('공개하려면 임대 의뢰(광고 동의)를 받은 매물인지 확인하고 체크해 주세요.', true);
      const items = S.items.filter((it) => it.on).map(({ on, scrubbed, ...it }) => ({ ...it, status: o.publish && !missing(it).length ? 'public' : 'draft' }));
      if (!items.length) return toast('등록할 행을 골라 주세요.', true);
      e.target.disabled = true;
      try {
        const r = await api('/listings/import', { method: 'POST', body: { batch: o.batch, items } });
        if (replace && replace !== r.batch) await api('/listings/bulk', { method: 'POST', body: { batch: replace, action: 'delete' } }).catch(() => {});
        $('#view').innerHTML = `<div class="topline"><div><h2>등록을 마쳤습니다</h2><p>묶음 '${E(r.batch)}'</p></div></div>
          <div class="grid g4"><div class="card kpi"><b>${r.saved}</b><span>등록한 매물</span></div><div class="card kpi gold"><b>${r.published}</b><span>바로 공개</span></div><div class="card kpi"><b>${r.draft}</b><span>임시 저장</span></div></div>
          <div class="acts" style="margin-top:18px"><a class="btn btn-gold" href="#/listings">매물 목록에서 확인</a><a class="btn btn-line" href="/properties" target="_blank" rel="noopener">홈페이지 매물 페이지 보기</a><button class="btn btn-line" id="again">다른 리스트 올리기</button></div>`;
        $('#again').onclick = () => { reset(); draw(); };
      } catch (err) { e.target.disabled = false; fail(err); }
    };
  }

  return {
    view() { shell('listings', '<div class="empty">불러오는 중…</div>'); if (!S || S.step === 3) reset(); draw(); },
  };
}
