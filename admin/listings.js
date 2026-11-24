// 오르비스 관리자 — 매물 관리 · 공동중개(구하는 물건 공고 · 접수함)
// 저장소는 Cloudflare D1(/api/admin/listing 등)이라 저장 즉시 홈페이지에 반영됩니다(깃허브 토큰 불필요).
import { createImport, splitAddr } from './import.js?v=20261124';

export const PY = 3.305785;
export const DEALS = ['임대', '매매', '전대'];
export const CATS = ['오피스', '상가', '빌딩', '토지', '지식산업센터', '공장·창고', '기타'];
export const L_ST = { draft: ['임시 저장', 'draft'], public: ['공개', 'ok'], done: ['거래완료', 'sch'], hidden: ['내림', 'hid'] };
export const SRC = { direct: '직접 의뢰', pm: 'PM사 리스트', cobroke: '공동중개', owner: '홈페이지 접수' };
export const LEGAL = [
  ['kind', '중개대상물 종류', '건축물대장 용도 (예: 업무시설, 제1종 근린생활시설)'],
  ['floor', '해당 층 / 총 층수', '예: 7층 / 지상 15층·지하 4층'],
  ['moveIn', '입주 가능일', '예: 즉시 입주 / 2027년 1월 초순'],
  ['approval', '사용승인일', '예: 2012.05.10'],
  ['parking', '주차대수', '예: 총 120대 (무료 1대)'],
  ['direction', '방향', '주된 출입구 기준 (예: 남향, 주 출입구 기준)'],
  ['baths', '욕실(화장실) 수', '예: 층별 공용 화장실 남·여 각 1'],
  ['violation', '위반건축물 여부', "대장에 위반 표시가 없으면 '해당 없음'"],
];

/** 만원 단위 금액 → '32억 원', '1억 2,000만 원', '650만 원' */
export function won(man) {
  const n = Math.round(Number(man)); if (!isFinite(n) || n <= 0) return '';
  const eok = Math.floor(n / 10000); const rest = n % 10000;
  if (eok && rest) return `${eok.toLocaleString('ko-KR')}억 ${rest.toLocaleString('ko-KR')}만 원`;
  if (eok) return `${eok.toLocaleString('ko-KR')}억 원`;
  return `${rest.toLocaleString('ko-KR')}만 원`;
}
export const py = (m2) => (m2 ? Math.round((m2 / PY) * 10) / 10 : 0);
export function priceText(deal, { price, deposit, rent }) {
  if (deal === '매매') return price ? `매매 ${won(price)}` : '';
  const a = deposit ? `보증금 ${won(deposit)}` : ''; const b = rent ? `월 ${won(rent)}` : '';
  return [a, b].filter(Boolean).join(' / ');
}
export function areaText(d) {
  const part = (label, v) => (v ? `${label} ${Number(v).toLocaleString('ko-KR')}㎡(약 ${py(v).toLocaleString('ko-KR')}평)` : '');
  return [part('전용', d.exclusiveM2), part('임대', d.contractM2), part('대지', d.landM2), part('연면적', d.grossM2)].filter(Boolean).join(' · ');
}
/** 사진 파일을 긴 변 max 픽셀 이하 JPEG dataURL로 줄입니다 */
export async function shrinkImage(file, max = 1600, quality = 0.82) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('이미지를 읽을 수 없습니다.')); i.src = url; });
    let { width: w, height: h } = img; const k = Math.min(1, max / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
    let q = quality; let out = c.toDataURL('image/jpeg', q);
    while (out.length > 1150000 && q > 0.45) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
    return out;
  } finally { URL.revokeObjectURL(url); }
}

export function createListings(ctx) {
  const { api, shell, $, $$, E, fail, toast, geo } = ctx;
  const imp = createImport({ ...ctx, won, py, priceText, areaText, DEALS, CATS, LEGAL });
  const pill = (s) => { const [t, c] = L_ST[s] || [s, 'draft']; return `<span class="pill ${c}">${t}</span>`; };
  const fmtD = (iso) => (iso ? String(iso).slice(0, 10).replace(/-/g, '.') : '-');
  const st = { status: '', deal: '', cat: '', q: '', batch: '', page: 0, sel: new Set() };

  // ------------------------------------------------------------ 매물 목록
  async function list() {
    shell('listings', '<div class="empty">불러오는 중…</div>');
    let d;
    try { d = await api('/listings?' + new URLSearchParams({ status: st.status, deal: st.deal, cat: st.cat, q: st.q, batch: st.batch, page: String(st.page) })); } catch (e) { return fail(e); }
    const c = d.counts || {}; const all = Object.values(c).reduce((a, b) => a + b, 0);
    st.sel = new Set();
    $('#view').innerHTML = `<div class="topline"><div><h2>매물 관리</h2><p>공개로 바꾸면 바로 홈페이지 매물 페이지에 올라갑니다. 내부 정보(정확한 주소·담당자·메모)는 홈페이지에 나가지 않습니다.</p></div>
      <div class="acts"><a class="btn btn-line" href="#/listings/import">엑셀·붙여넣기 일괄 등록</a><a class="btn btn-gold" href="#/listings/new">매물 등록</a></div></div>
      <div class="toolrow"><div class="tabs" id="lt">${[['', `전체 ${all}`], ['public', `공개 ${c.public || 0}`], ['draft', `임시 저장 ${c.draft || 0}`], ['done', `거래완료 ${c.done || 0}`], ['hidden', `내림 ${c.hidden || 0}`]].map(([k, t]) => `<button data-k="${k}" class="${st.status === k ? 'on' : ''}">${t}</button>`).join('')}</div>
        <form class="lsearch" id="lf"><select id="l-deal" aria-label="거래 형태"><option value="">거래 전체</option>${DEALS.map((x) => `<option${st.deal === x ? ' selected' : ''}>${x}</option>`).join('')}</select>
        <select id="l-cat" aria-label="유형"><option value="">유형 전체</option>${CATS.map((x) => `<option${st.cat === x ? ' selected' : ''}>${x}</option>`).join('')}</select>
        ${d.batches && d.batches.length ? `<select id="l-batch" aria-label="일괄 등록 묶음"><option value="">묶음 전체</option>${d.batches.map((b) => `<option value="${E(b.batch)}"${st.batch === b.batch ? ' selected' : ''}>${E(b.batch)} (${b.n})</option>`).join('')}</select>` : ''}
        <input type="search" id="l-q" value="${E(st.q)}" placeholder="제목·동·건물·담당자 검색"><button class="btn btn-line btn-sm">검색</button></form></div>
      <div class="bulkbar hide" id="bulk"><b id="bn">0</b>건 선택 <button class="btn btn-line btn-sm" data-a="public">공개</button><button class="btn btn-line btn-sm" data-a="confirm">오늘 확인함</button><button class="btn btn-line btn-sm" data-a="done">거래완료</button><button class="btn btn-line btn-sm" data-a="hidden">내림</button><button class="btn btn-bad btn-sm" data-a="delete">삭제</button></div>
      <div class="tbl-wrap"><table class="ltbl lst"><thead><tr><th><input type="checkbox" id="all" aria-label="모두 선택"></th><th>매물</th><th>거래·유형</th><th>가격</th><th>면적·층</th><th>상태</th><th>확인일</th><th></th></tr></thead><tbody>
      ${d.items.length ? d.items.map((x) => `<tr><td><input type="checkbox" class="ck" value="${E(x.id)}" aria-label="선택"></td>
        <td><a href="#/listings/${E(x.id)}"><div class="ttl">${E(x.title)}</div></a><div class="sub">${E(x.id)} · ${E([x.sgg, x.dong].filter(Boolean).join(' ') || '소재지 미입력')}${x.building ? ' · ' + E(x.building) : ''} · ${E(SRC[x.source] || '')}${x.batch ? ' · ' + E(x.batch) : ''}</div>${x.missing.length && x.status !== 'public' ? `<div class="sub miss">공개 전 채울 항목: ${E(x.missing.join(', '))}</div>` : ''}</td>
        <td class="nowrap">${E(x.deal)} · ${E(x.category)}${x.cobroke ? ' <span class="pill sch">공동중개</span>' : ''}</td><td>${E(x.priceText || priceText(x.deal, x) || '-')}</td><td>${E(x.areaText || '-')}<div class="sub">${E(x.floor || '')}</div></td>
        <td class="nowrap">${pill(x.status)}${x.featured ? ' <span class="pill warn">추천</span>' : ''}</td><td class="nowrap">${E((x.data && x.data.confirmed) || fmtD(x.updated_at))}</td>
        <td class="nowrap"><a class="btn btn-line btn-sm" href="#/listings/${E(x.id)}">편집</a></td></tr>`).join('') : `<tr><td colspan="8" class="empty">${all ? '조건에 맞는 매물이 없습니다.' : '등록된 매물이 없습니다. 한 건씩 등록하거나, PM사 공실 리스트를 엑셀에서 복사해 한꺼번에 올릴 수 있습니다.'}</td></tr>`}
      </tbody></table></div>
      ${d.total > 50 ? `<div class="pager"><button class="btn btn-line btn-sm" id="pv"${st.page ? '' : ' disabled'}>이전</button><span>${st.page + 1} / ${Math.ceil(d.total / 50)}</span><button class="btn btn-line btn-sm" id="nx"${(st.page + 1) * 50 < d.total ? '' : ' disabled'}>다음</button></div>` : ''}
      <p class="note cool" style="margin-top:14px">인터넷 매물 광고는 공인중개사법 제18조의2와 국토교통부 고시 「중개대상물의 표시·광고 명시사항 세부기준」에 따라 소재지, 면적, 가격, 중개대상물 종류, 거래 형태, 총 층수, 입주 가능일, 욕실 수, 사용승인일, 주차대수, 방향을 빠짐없이 적어야 합니다. 그래서 이 항목이 빈 매물은 '공개'로 바뀌지 않습니다. 실제 의뢰를 받은 매물만 올리고, 거래가 끝나면 바로 '거래완료'나 '내림'으로 바꿔 주세요.</p>`;
    $$('#lt button').forEach((b) => (b.onclick = () => { st.status = b.dataset.k; st.page = 0; list(); }));
    $('#lf').onsubmit = (e) => { e.preventDefault(); st.deal = $('#l-deal').value; st.cat = $('#l-cat').value; st.batch = $('#l-batch') ? $('#l-batch').value : ''; st.q = $('#l-q').value.trim(); st.page = 0; list(); };
    ['#l-deal', '#l-cat', '#l-batch'].forEach((s) => { if ($(s)) $(s).onchange = () => $('#lf').requestSubmit(); });
    if ($('#pv')) $('#pv').onclick = () => { st.page--; list(); };
    if ($('#nx')) $('#nx').onclick = () => { st.page++; list(); };
    const sync = () => { st.sel = new Set($$('.ck:checked').map((x) => x.value)); $('#bn').textContent = st.sel.size; $('#bulk').classList.toggle('hide', !st.sel.size); };
    $$('.ck').forEach((x) => (x.onchange = sync));
    $('#all').onchange = (e) => { $$('.ck').forEach((x) => (x.checked = e.target.checked)); sync(); };
    $$('#bulk [data-a]').forEach((b) => (b.onclick = async () => {
      const a = b.dataset.a;
      if (a === 'delete' && !confirm(`선택한 ${st.sel.size}건을 삭제할까요? 되돌릴 수 없습니다. (거래가 끝난 매물은 '거래완료'로 두는 편이 좋습니다)`)) return;
      try {
        const r = await api('/listings/bulk', { method: 'POST', body: { ids: [...st.sel], action: a } });
        toast(r.skipped && r.skipped.length ? `${r.done}건 처리, ${r.skipped.length}건은 법정 표시사항이 비어 공개하지 못했습니다.` : `${r.done}건 처리했습니다.`, !!(r.skipped && r.skipped.length));
        list();
      } catch (e) { fail(e); }
    }));
  }

  // ------------------------------------------------------------ 매물 편집
  const F = (id, label, value, { ph = '', type = 'text', hint = '', full = false, req = false, attrs = '' } = {}) =>
    `<div class="f${full ? ' full' : ''}"><label for="${id}">${label}${req ? ' *' : ''}</label><input type="${type}" id="${id}" value="${E(value == null ? '' : value)}" placeholder="${E(ph)}" ${attrs}>${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;

  async function edit(id, preset) {
    shell('listings', '<div class="empty">불러오는 중…</div>');
    let x = { status: 'draft', deal: '임대', category: '오피스', source: 'direct', data: {}, private: {}, missing: [] };
    if (id) { try { x = (await api('/listing?id=' + encodeURIComponent(id))).listing; } catch (e) { return fail(e); } }
    else if (preset) x = { ...x, ...preset, data: { ...(preset.data || {}) }, private: { ...(preset.private || {}) } };
    const d = x.data || {}; const p = x.private || {};
    let photos = (d.photos || []).map((ph) => ({ ...ph }));
    $('#view').innerHTML = `<div class="topline"><div><h2>${id ? '매물 편집' : '매물 등록'}</h2><p>${id ? `매물번호 ${E(id)} · ` : ''}* 표시는 공개하려면 꼭 채워야 하는 항목입니다.</p></div>
      <div class="acts"><a class="btn btn-line" href="#/listings">목록</a>${id ? `<a class="btn btn-line" href="/listing/${E(id)}" target="_blank" rel="noopener">홈페이지에서 보기</a><a class="btn btn-line" href="#/reports/new/im?from=listing:${E(id)}">IM 만들기</a><a class="btn btn-line" href="#/reports/new/valuation?from=listing:${E(id)}">매각가 검토</a><button class="btn btn-line" id="dup">복제</button><button class="btn btn-bad" id="rm">삭제</button>` : ''}<button class="btn btn-gold" id="sv">저장</button></div></div>
      <div id="miss"></div>
      <div class="card"><h3>기본</h3><div class="fgrid">
        <div class="f"><label for="x-deal">거래 형태 *</label><select id="x-deal">${DEALS.map((v) => `<option${x.deal === v ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="f"><label for="x-cat">유형 *</label><select id="x-cat">${CATS.map((v) => `<option${x.category === v ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
        ${F('x-title', '제목', x.title, { ph: '예: 역삼역 도보 3분 대로변 7층 사무실', full: true, req: true })}
        ${F('x-summary', '한 줄 소개', d.summary, { ph: '예: 코너 호실, 3면 창, 인테리어 승계 가능', full: true })}
        <div class="f"><label for="x-status">상태</label><select id="x-status">${Object.entries(L_ST).map(([k, [t]]) => `<option value="${k}"${x.status === k ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="f"><span class="lb">표시</span><label class="ckl"><input type="checkbox" id="x-featured"${x.featured ? ' checked' : ''}> 첫 화면 추천 매물</label><label class="ckl"><input type="checkbox" id="x-cobroke"${x.cobroke ? ' checked' : ''}> 공동중개 가능 표시</label></div>
        ${F('x-cobrokeNote', '공동중개 안내 문구', d.cobrokeNote, { ph: '예: 공동중개 환영, 보수는 계약 전에 협의', full: true, hint: '공동중개 가능에 체크한 매물에만 보입니다.' })}
      </div></div>
      <div class="card"><h3>소재지</h3>
        <div class="addrfill"><input type="text" id="x-addrq" value="${E(p.addr || '')}" placeholder="지번 주소를 넣고 '채우기'를 누르세요. 예: 강남구 역삼동 123-4"><button class="btn btn-line" id="x-fill">주소로 채우기</button></div>
        <div id="x-cands" class="cands"></div>
        <div class="fgrid" style="margin-top:12px">${F('x-sido', '시·도', x.sido, { ph: '서울특별시' })}${F('x-sgg', '시·군·구', x.sgg, { ph: '강남구', req: true })}${F('x-dong', '읍·면·동', x.dong, { ph: '역삼동', req: true })}
        ${F('x-building', '건물명 (공개)', d.building, { ph: '공개해도 되는 경우에만' })}${F('x-station', '인근 역', d.station, { ph: '예: 역삼역(2호선) 도보 3분', full: true })}</div>
        <p class="hint2">홈페이지에는 읍·면·동까지만 나갑니다. 정확한 지번·호수는 아래 '내부 정보'에 적어 두세요.</p></div>
      <div class="card"><h3>가격·면적</h3><div class="fgrid g3f">
        ${F('x-price', '매매가 (만원)', x.price, { type: 'number', ph: '320000 = 32억', attrs: 'min="0" step="1" data-sale' })}
        ${F('x-deposit', '보증금 (만원)', x.deposit, { type: 'number', ph: '10000 = 1억', attrs: 'min="0" step="1" data-lease' })}
        ${F('x-rent', '월 임대료 (만원)', x.rent, { type: 'number', ph: '650', attrs: 'min="0" step="1" data-lease' })}
        ${F('x-maintenance', '관리비', d.maintenance, { ph: '예: 월 120만 원 (전기·수도 별도)' })}
        ${F('x-rentFree', '렌트프리·지원 조건', d.rentFree, { ph: '예: 렌트프리 2개월 협의' })}
        ${F('x-yield', '수익률 (매매)', d.yield, { ph: '예: 연 3.8% (현 임대 기준)' })}
        ${F('x-exclusiveM2', '전용면적 (㎡)', d.exclusiveM2, { type: 'number', attrs: 'min="0" step="0.01"' })}
        ${F('x-contractM2', '임대(계약)면적 (㎡)', d.contractM2, { type: 'number', attrs: 'min="0" step="0.01"' })}
        ${F('x-landM2', '대지면적 (㎡)', d.landM2, { type: 'number', attrs: 'min="0" step="0.01"' })}
        ${F('x-grossM2', '연면적 (㎡)', d.grossM2, { type: 'number', attrs: 'min="0" step="0.01"' })}
        <div class="f"><span class="lb">평 → ㎡ 계산</span><div class="pyconv"><input type="number" id="x-pyin" placeholder="평" min="0" step="0.01" aria-label="평"><span id="x-pyout">= 0㎡</span></div></div>
        ${F('x-priceText', '가격 표시', d.priceText, { ph: '비워 두면 위 금액으로 자동 작성', full: true, req: true })}
        ${F('x-areaText', '면적 표시', d.areaText, { ph: '비워 두면 위 면적으로 자동 작성', full: true, req: true })}
      </div></div>
      <div class="card"><div class="kch"><h3>법정 표시사항</h3><button class="btn btn-line btn-sm" id="x-ledger">건축물대장에서 불러오기</button></div><div class="fgrid">
        ${LEGAL.map(([k, label, hint]) => F('x-' + k, label, d[k], { ph: hint, req: true })).join('')}
        ${F('x-use', '특이사항', d.use, { ph: '업종 제한, 용도변경 필요 여부, 인테리어 상태 등', full: true })}
      </div></div>
      <div class="card"><h3>소개</h3><div class="fgrid">
        <div class="f full"><label for="x-highlights">핵심 포인트 (한 줄에 하나, 최대 8개)</label><textarea id="x-highlights" rows="4" placeholder="대로변 코너, 가시성 우수&#10;전용 주차 2대&#10;인테리어 승계 가능">${E((d.highlights || []).join('\n'))}</textarea></div>
        <div class="f full"><label for="x-description">상세 설명</label><textarea id="x-description" rows="6" placeholder="입지, 건물 상태, 임대 조건 등을 사실대로 적습니다.">${E(d.description || '')}</textarea></div>
      </div></div>
      <div class="card"><div class="kch"><h3>사진 (최대 12장)</h3><label class="btn btn-line btn-sm">사진 추가<input type="file" id="x-files" accept="image/*" multiple hidden></label></div>
        <div class="phgrid" id="x-photos"></div><p class="hint2">첫 사진이 목록의 대표 사진입니다. 올릴 때 자동으로 크기를 줄입니다. 이 칸에 사진을 끌어다 놓거나 붙여넣기(Ctrl+V)해도 됩니다.</p></div>
      <div class="card priv"><h3>내부 정보 <span class="pill hid">홈페이지에 나가지 않음</span></h3><div class="fgrid">
        ${F('x-addr', '정확한 주소 (지번·호수)', p.addr, { full: true })}
        <div class="f"><label for="x-source">출처</label><select id="x-source">${Object.entries(SRC).map(([k, t]) => `<option value="${k}"${x.source === k ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
        ${F('x-sourceName', 'PM사·중개사무소명', p.sourceName)}${F('x-owner', '소유자·임대인', p.owner)}${F('x-ownerPhone', '소유자 연락처', p.ownerPhone)}
        ${F('x-contactName', '담당자', p.contactName)}${F('x-contactPhone', '담당자 연락처', p.contactPhone)}
        <div class="f full"><label for="x-memo">메모</label><textarea id="x-memo" rows="3">${E(p.memo || '')}</textarea></div>
      </div></div>`;

    const v = (k) => { const el = $('#x-' + k); return el ? el.value.trim() : ''; };
    const n = (k) => { const s = v(k); return s === '' ? null : Number(s); };
    const collect = () => {
      const data = { summary: v('summary'), building: v('building'), station: v('station'), maintenance: v('maintenance'), rentFree: v('rentFree'), yield: v('yield'), use: v('use'), cobrokeNote: v('cobrokeNote'),
        exclusiveM2: n('exclusiveM2'), contractM2: n('contractM2'), landM2: n('landM2'), grossM2: n('grossM2'), description: v('description'),
        highlights: v('highlights').split('\n').map((s) => s.trim()).filter(Boolean), photos, posted: d.posted || new Date().toISOString().slice(0, 10), confirmed: new Date().toISOString().slice(0, 10) };
      for (const [k] of LEGAL) data[k] = v(k);
      const row = { id: id || undefined, status: v('status'), deal: v('deal'), category: v('cat'), title: v('title'), sido: v('sido'), sgg: v('sgg'), dong: v('dong'), price: n('price'), deposit: n('deposit'), rent: n('rent'),
        cobroke: $('#x-cobroke').checked, featured: $('#x-featured').checked, source: v('source'), batch: x.batch || undefined, data,
        private: { addr: v('addr'), sourceName: v('sourceName'), owner: v('owner'), ownerPhone: v('ownerPhone'), contactName: v('contactName'), contactPhone: v('contactPhone'), memo: v('memo'), raw: p.raw, leadId: p.leadId } };
      data.priceText = v('priceText') || priceText(row.deal, row);
      data.areaText = v('areaText') || areaText(data);
      row.area = data.exclusiveM2 || data.contractM2 || data.grossM2 || data.landM2 || null;
      return row;
    };
    const showMissing = () => {
      const r = collect(); const miss = [];
      if (!r.title) miss.push('제목'); if (!r.sgg || !r.dong) miss.push('소재지(시군구·읍면동)');
      const need = r.category === '토지' ? ['kind'] : LEGAL.map(([k]) => k);
      if (!r.data.areaText) miss.push('면적'); if (!r.data.priceText) miss.push('가격');
      for (const [k, label] of LEGAL) if (need.includes(k) && !r.data[k]) miss.push(label);
      $('#miss').innerHTML = miss.length ? `<p class="note" style="margin-bottom:16px">공개 전 채울 항목: <b>${E(miss.join(', '))}</b> — 지금은 '임시 저장'으로만 저장됩니다.</p>` : '<p class="note cool" style="margin-bottom:16px">법정 표시사항이 모두 채워졌습니다. 상태를 \'공개\'로 바꾸면 홈페이지에 올라갑니다.</p>';
      return miss;
    };
    const dealUi = () => { const sale = v('deal') === '매매'; $$('[data-sale]').forEach((el) => el.closest('.f').classList.toggle('dim', !sale)); $$('[data-lease]').forEach((el) => el.closest('.f').classList.toggle('dim', sale)); };
    $('#view').addEventListener('input', () => { clearTimeout(edit._t); edit._t = setTimeout(showMissing, 250); });
    $('#x-deal').onchange = () => { dealUi(); showMissing(); };
    $('#x-pyin').oninput = (e) => { $('#x-pyout').textContent = `= ${(Math.round(Number(e.target.value || 0) * PY * 100) / 100).toLocaleString('ko-KR')}㎡`; };
    dealUi(); showMissing();

    // 사진
    const drawPhotos = () => {
      $('#x-photos').innerHTML = photos.length ? photos.map((ph, i) => `<figure class="ph"><img src="${E(ph.url)}" alt=""><input type="text" value="${E(ph.caption || '')}" placeholder="사진 설명" data-cap="${i}">
        <div class="ph-a"><button class="btn btn-line btn-sm" data-up="${i}"${i ? '' : ' disabled'} aria-label="앞으로">←</button><button class="btn btn-line btn-sm" data-dn="${i}"${i < photos.length - 1 ? '' : ' disabled'} aria-label="뒤로">→</button><button class="btn btn-bad btn-sm" data-del="${i}">삭제</button></div></figure>`).join('') : '<div class="empty sm">아직 사진이 없습니다.</div>';
      $$('[data-cap]').forEach((el) => (el.oninput = () => { photos[+el.dataset.cap].caption = el.value; }));
      $$('[data-up]').forEach((b) => (b.onclick = () => { const i = +b.dataset.up; [photos[i - 1], photos[i]] = [photos[i], photos[i - 1]]; drawPhotos(); }));
      $$('[data-dn]').forEach((b) => (b.onclick = () => { const i = +b.dataset.dn; [photos[i + 1], photos[i]] = [photos[i], photos[i + 1]]; drawPhotos(); }));
      $$('[data-del]').forEach((b) => (b.onclick = () => { photos.splice(+b.dataset.del, 1); drawPhotos(); }));
    };
    const addFiles = async (files) => {
      for (const f of [...files].filter((f) => /^image\//.test(f.type))) {
        if (photos.length >= 12) { toast('사진은 12장까지 올릴 수 있습니다.', true); break; }
        try { const dataUrl = await shrinkImage(f); const r = await api('/media', { method: 'POST', body: { dataUrl, owner: 'listing:' + (id || 'new') } }); photos.push({ url: r.url, caption: '' }); drawPhotos(); } catch (e) { fail(e); }
      }
    };
    $('#x-files').onchange = (e) => { addFiles(e.target.files); e.target.value = ''; };
    const box = $('#x-photos'); box.addEventListener('dragover', (e) => { e.preventDefault(); box.classList.add('drop'); }); box.addEventListener('dragleave', () => box.classList.remove('drop'));
    box.addEventListener('drop', (e) => { e.preventDefault(); box.classList.remove('drop'); addFiles(e.dataTransfer.files); });
    const onPaste = (e) => { if (!document.body.contains(box)) return document.removeEventListener('paste', onPaste); const fs = [...(e.clipboardData || {}).files || []]; if (fs.length && !/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); addFiles(fs); } };
    document.addEventListener('paste', onPaste);
    drawPhotos();

    // 주소로 채우기
    let pnu = '';
    const applyCand = async (c) => {
      $('#x-sido').value = c.sido; $('#x-sgg').value = c.sgg; $('#x-dong').value = c.dong; $('#x-addr').value = c.addr; pnu = c.pnu; $('#x-cands').innerHTML = '';
      showMissing();
      let lat = c.lat; let lon = c.lon;
      if (!(lat && lon)) { const pr = await geo.parcel(c.pnu); if (pr.ok && pr.center) { lat = pr.center.lat; lon = pr.center.lon; if (pr.land.area && !v('landM2') && v('cat') !== '오피스') $('#x-landM2').value = pr.land.area; } }
      if (lat && lon && !v('station')) { const ss = await geo.nearStations(lat, lon, 2); if (ss.length) { $('#x-station').value = ss.map((s) => `${s.name}${s.line ? `(${s.line})` : ''} 직선 약 ${Math.round(s.dist / 10) * 10}m`).join(', '); toast('주소와 인근 역을 채웠습니다. 인근 역은 직선거리라 도보 시간으로 고쳐 적어 주세요.'); return; } }
      toast('소재지를 채웠습니다.');
    };
    $('#x-fill').onclick = async () => {
      const r = await geo.search($('#x-addrq').value);
      if (!r.ok) return toast(r.message, true);
      if (r.items.length === 1) return applyCand(r.items[0]);
      $('#x-cands').innerHTML = r.items.map((c, i) => `<button class="btn btn-line btn-sm" data-c="${i}">${E(c.label)}</button>`).join('');
      $$('[data-c]').forEach((b) => (b.onclick = () => applyCand(r.items[+b.dataset.c])));
    };
    $('#x-addrq').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#x-fill').click(); } };
    $('#x-ledger').onclick = async () => {
      if (!pnu) { const r = await geo.search(v('addr') || $('#x-addrq').value); if (r.ok && r.items.length) pnu = r.items[0].pnu; }
      if (!pnu) return toast("먼저 위 '주소로 채우기'에 지번 주소를 넣어 주세요.", true);
      const b = await geo.building(pnu);
      if (!b.ok) return toast(b.message, true);
      if (!b.bldg) return toast((b.warnings && b.warnings[0]) || '건축물대장을 찾지 못했습니다.', true);
      const g = b.bldg; const set = (k, val) => { if (val && !v(k)) $('#x-' + k).value = val; };
      set('kind', g.use); set('approval', g.approved ? g.approved.replace(/-/g, '.') : '');
      set('parking', g.parking && g.parking.total ? `총 ${g.parking.total}대` : '');
      if (g.ground && !/\//.test(v('floor'))) $('#x-floor').value = `${v('floor') || '○층'} / 지상 ${g.ground}층${g.under ? `·지하 ${g.under}층` : ''}`;
      if (g.totArea && !v('grossM2') && v('cat') === '빌딩') $('#x-grossM2').value = g.totArea;
      if (g.name && !v('building')) $('#x-building').placeholder = `대장상 건물명: ${g.name}`;
      showMissing(); toast('건축물대장 값으로 빈 칸을 채웠습니다. 방향·욕실 수·위반건축물 여부는 직접 확인해 적어 주세요.');
    };

    $('#sv').onclick = async () => {
      const row = collect(); const miss = showMissing();
      if (!row.title) return toast('제목을 적어 주세요.', true);
      if (row.status === 'public' && miss.length) return toast('공개하려면 법정 표시사항을 모두 채워야 합니다. 지금은 상태를 임시 저장으로 두고 저장해 주세요.', true);
      try { const r = await api('/listing', { method: 'PUT', body: row }); toast(row.status === 'public' ? '저장했습니다. 홈페이지에 바로 반영됩니다.' : '저장했습니다.'); if (!id) location.hash = '#/listings/' + r.id; else edit(id); } catch (e) { fail(e); }
    };
    if ($('#rm')) $('#rm').onclick = async () => { if (!confirm('이 매물을 삭제할까요? 되돌릴 수 없습니다.')) return; try { await api('/listing?id=' + encodeURIComponent(id), { method: 'DELETE' }); toast('삭제했습니다.'); location.hash = '#/listings'; } catch (e) { fail(e); } };
    if ($('#dup')) $('#dup').onclick = () => { const r = collect(); delete r.id; r.status = 'draft'; r.title += ' (복사)'; edit(null, r); toast('복사본을 열었습니다. 고친 뒤 저장하세요.'); };
  }

  // ------------------------------------------------------------ 공동중개: 구하는 물건 공고 · 접수함
  const W_ST = { open: ['모집 중', 'ok'], closed: ['마감', 'draft'], hidden: ['숨김', 'hid'] };
  async function cobroke(tab) {
    shell('cobroke', '<div class="empty">불러오는 중…</div>');
    let w; let inbox;
    try { [w, inbox] = await Promise.all([api('/wanted'), api('/leads?type=' + encodeURIComponent('공동중개') + '&status=all').catch(() => ({ leads: [] }))]); } catch (e) { return fail(e); }
    const leads = inbox.leads || []; const fresh = leads.filter((l) => l.status === 'new').length;
    const cur = tab === 'inbox' ? 'inbox' : 'wanted';
    $('#view').innerHTML = `<div class="topline"><div><h2>공동중개</h2><p>오르비스가 찾고 있는 물건을 공고로 올리면 홈페이지 '공동중개' 페이지에 실리고, 다른 중개사무소가 물건을 접수합니다.</p></div>
      <div class="acts"><a class="btn btn-line" href="/cobroke" target="_blank" rel="noopener">공동중개 페이지 보기</a><a class="btn btn-gold" href="#/cobroke/wanted/new">구하는 물건 공고 쓰기</a></div></div>
      <nav class="ktabs"><a href="#/cobroke" class="${cur === 'wanted' ? 'on' : ''}">구하는 물건 공고 ${w.items.filter((x) => x.status === 'open').length}</a><a href="#/cobroke/inbox" class="${cur === 'inbox' ? 'on' : ''}">접수함 ${leads.length}${fresh ? ` · 새 접수 ${fresh}` : ''}</a></nav>
      ${cur === 'wanted' ? `<div class="tbl-wrap"><table class="ltbl"><thead><tr><th>공고</th><th>구분</th><th>지역</th><th>조건</th><th>상태</th><th>수정일</th><th></th></tr></thead><tbody>
        ${w.items.length ? w.items.map((x) => `<tr><td><a href="#/cobroke/wanted/${E(x.id)}"><div class="ttl">${E(x.title)}</div></a><div class="sub">${E(x.data.client || '')}</div></td><td class="nowrap">${E(x.deal)} · ${E(x.category || '-')}</td><td>${E(x.region || '-')}</td><td>${E([x.data.areaText, x.data.budgetText].filter(Boolean).join(' · ') || '-')}</td><td class="nowrap"><span class="pill ${W_ST[x.status][1]}">${W_ST[x.status][0]}</span></td><td class="nowrap">${fmtD(x.updated_at)}</td><td class="nowrap"><a class="btn btn-line btn-sm" href="#/cobroke/wanted/${E(x.id)}">편집</a></td></tr>`).join('') : '<tr><td colspan="7" class="empty">아직 올린 공고가 없습니다. 임차·매수 의뢰를 받아 찾는 물건이 있으면 공고로 올려 보세요.</td></tr>'}</tbody></table></div>`
      : `<div class="tbl-wrap"><table class="ltbl"><thead><tr><th>접수</th><th>중개사무소·담당</th><th>물건 요약</th><th>상태</th><th></th></tr></thead><tbody>
        ${leads.length ? leads.map((l) => `<tr><td class="nowrap">${fmtD(l.created_at)}<div class="sub">${E(l.id)}</div></td><td><div class="ttl">${E(l.name || '-')}</div><div class="sub">${E(l.phone || '')}</div></td><td>${E(l.summary || '-')}</td><td class="nowrap"><span class="pill ${l.status === 'new' ? 'warn' : 'draft'}">${l.status === 'new' ? '새 접수' : '확인함'}</span></td>
        <td class="nowrap"><a class="btn btn-line btn-sm" href="#/lead/${E(l.id)}">내용 보기</a> <a class="btn btn-line btn-sm" href="#/listings/new?from=lead:${E(l.id)}">매물로 등록</a></td></tr>`).join('') : '<tr><td colspan="5" class="empty">아직 접수된 물건이 없습니다.</td></tr>'}</tbody></table></div>
        <p class="hint2" style="margin-top:10px">다른 중개사무소가 접수한 물건은 그 사무소의 동의 범위 안에서만 홈페이지에 올립니다. 접수 양식의 '홈페이지 게시 동의' 항목을 확인해 주세요.</p>`}`;
  }
  async function wantedEdit(id) {
    shell('cobroke', '<div class="empty">불러오는 중…</div>');
    let x = { status: 'open', deal: '임차', category: '상가', data: { conditions: [] }, private: {} };
    if (id) { try { const w = await api('/wanted'); x = w.items.find((i) => i.id === id) || x; } catch (e) { return fail(e); } }
    const d = x.data || {};
    $('#view').innerHTML = `<div class="topline"><div><h2>${id ? '공고 편집' : '구하는 물건 공고 쓰기'}</h2><p>의뢰인이 누구인지 드러나는 내용은 적지 않습니다. 업종·규모 정도만 밝혀도 충분합니다.</p></div>
      <div class="acts"><a class="btn btn-line" href="#/cobroke">목록</a>${id ? '<button class="btn btn-bad" id="rm">삭제</button>' : ''}<button class="btn btn-gold" id="sv">저장</button></div></div>
      <div class="card"><div class="fgrid">
        ${F('w-title', '제목', x.title, { ph: '예: 강남권 프랜차이즈 카페 1층 30~50평 구합니다', full: true, req: true })}
        <div class="f"><label for="w-deal">구분</label><select id="w-deal"><option${x.deal === '임차' ? ' selected' : ''}>임차</option><option${x.deal === '매수' ? ' selected' : ''}>매수</option></select></div>
        <div class="f"><label for="w-cat">유형</label><select id="w-cat">${['상가', '오피스', '빌딩', '토지', '지식산업센터', '공장·창고', '기타'].map((v) => `<option${x.category === v ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
        ${F('w-region', '희망 지역', x.region, { ph: '예: 강남구·서초구 역세권' })}
        ${F('w-client', '의뢰인 유형 (공개)', d.client, { ph: '예: 프랜차이즈 본사(카페), 중견 IT기업 사옥' })}
        ${F('w-areaText', '면적 조건', d.areaText, { ph: '예: 전용 30~50평, 1층 또는 1~2층 연층' })}
        ${F('w-budgetText', '예산 조건', d.budgetText, { ph: '예: 보증금 2억 원 이내 / 월 1,200만 원 이내' })}
        ${F('w-timing', '시기', d.timing, { ph: '예: 2027년 1분기 오픈 목표' })}
        ${F('w-feeNote', '공동중개 조건', d.feeNote, { ph: '예: 공동중개, 보수는 계약 전에 협의' })}
        <div class="f full"><label for="w-conditions">세부 조건 (한 줄에 하나)</label><textarea id="w-conditions" rows="4" placeholder="전면 6m 이상&#10;테라스 가능하면 우대&#10;주차 2대 이상">${E((d.conditions || []).join('\n'))}</textarea></div>
        <div class="f full"><label for="w-detail">덧붙이는 말</label><textarea id="w-detail" rows="3">${E(d.detail || '')}</textarea></div>
        <div class="f"><label for="w-status">상태</label><select id="w-status">${Object.entries(W_ST).map(([k, [t]]) => `<option value="${k}"${x.status === k ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
      </div></div>
      <div class="card priv"><h3>내부 정보 <span class="pill hid">홈페이지에 나가지 않음</span></h3><div class="fgrid">${F('w-pclient', '의뢰인(실명·회사)', (x.private || {}).client)}<div class="f full"><label for="w-memo">메모</label><textarea id="w-memo" rows="3">${E((x.private || {}).memo || '')}</textarea></div></div></div>`;
    const v = (k) => $('#w-' + k).value.trim();
    $('#sv').onclick = async () => {
      if (!v('title')) return toast('제목을 적어 주세요.', true);
      try {
        await api('/wanted', { method: 'PUT', body: { id: id || undefined, status: v('status'), deal: v('deal'), category: v('cat'), title: v('title'), region: v('region'),
          data: { client: v('client'), areaText: v('areaText'), budgetText: v('budgetText'), timing: v('timing'), feeNote: v('feeNote'), detail: v('detail'), conditions: v('conditions').split('\n').map((s) => s.trim()).filter(Boolean) },
          private: { client: v('pclient'), memo: v('memo') } } });
        toast('저장했습니다. 공동중개 페이지에 바로 반영됩니다.'); location.hash = '#/cobroke';
      } catch (e) { fail(e); }
    };
    if ($('#rm')) $('#rm').onclick = async () => { if (!confirm('이 공고를 삭제할까요?')) return; try { await api('/wanted?id=' + encodeURIComponent(id), { method: 'DELETE' }); location.hash = '#/cobroke'; } catch (e) { fail(e); } };
  }

  // 접수(리드) 내용으로 매물 초안 만들기
  async function fromLead(leadId) {
    let l; try { l = (await api('/lead?id=' + encodeURIComponent(leadId))).lead; } catch (e) { fail(e); return null; }
    const d = l.data || {}; const g = (...ks) => { for (const k of ks) if (d[k]) return String(d[k]); return ''; };
    const isCo = /공동중개/.test(l.type || '');
    const deal = /매매|매각/.test(g('거래 형태', '의뢰 구분', '문의유형')) ? '매매' : '임대';
    const cat = CATS.find((c) => g('물건 유형', '자산유형', '유형').includes(c.replace('·', ''))) || (/(사무|오피스)/.test(g('물건 유형', '자산유형')) ? '오피스' : /(빌딩|건물)/.test(g('물건 유형', '자산유형')) ? '빌딩' : '상가');
    const addr = g('물건 소재지', '자산 소재지', '소재지', '주소');
    const ad = splitAddr(addr);
    return {
      deal, category: cat, title: g('물건 제목') || `${ad.dong || ad.sgg || ''} ${cat} ${deal}`.trim(), sido: ad.sido, sgg: ad.sgg, dong: ad.dong, source: isCo ? 'cobroke' : 'owner', cobroke: false,
      data: { areaText: g('면적'), priceText: g('가격', '희망 가격', '희망 조건'), floor: g('해당 층', '층'), moveIn: g('입주 가능일'), description: g('물건 설명', '추가 내용', '참고사항'), cobrokeNote: '' },
      private: { addr, sourceName: g('중개사무소명', '업체명'), contactName: l.name || '', contactPhone: l.phone || '', leadId: l.id, memo: `접수 ${l.id} (${l.type})${g('홈페이지 게시 동의') ? ' · 홈페이지 게시 동의: ' + g('홈페이지 게시 동의') : ''}${g('중개사무소 등록번호') ? ' · 등록번호 ' + g('중개사무소 등록번호') : ''}` },
    };
  }

  return {
    async view(parts) {
      const [a, b] = parts;
      if (a === 'import') return imp.view(() => list());
      if (a === 'new') {
        const m = /[?&]from=lead:([A-Za-z0-9]+)/.exec(location.hash); let preset = null;
        if (m) preset = await fromLead(m[1]);
        return edit(null, preset);
      }
      if (a) return edit(decodeURIComponent(a));
      return list();
    },
    async cobroke(parts) {
      const [a, b] = parts;
      if (a === 'wanted') return wantedEdit(b && b !== 'new' ? b : null);
      return cobroke(a);
    },
  };
}
