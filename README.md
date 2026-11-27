# 오르비스중개법인 홈페이지

중소형 빌딩·상가·오피스의 매매·임대차를 중심으로 상권분석 시스템 기반의 점포개발·출점 전략, MD·공실개발·자산관리·매각전략까지 연결하는 오르비스중개법인의 공식 홈페이지입니다.

- 대표 주소: https://orbis-estate.com (www.orbis-estate.com, orbis-estate.pages.dev로 들어와도 이 주소로 옮겨집니다)
- 호스팅: Cloudflare Pages — 이 저장소의 `main` 브랜치와 연결되어 있어, 파일을 저장하면 1~2분 안에 홈페이지에 반영됩니다.
- HTML·CSS·JavaScript 파일이 그대로 서비스됩니다. 인사이트 글·매물·설정은 `content/` 폴더의 원고를 깃허브 Actions가 페이지로 바꿔 저장합니다.
- 관리자 화면: https://orbis-estate.com/admin/ (비밀번호 로그인)
- 상권분석 데이터 연결 방법은 함께 드린 「상권분석 시스템 연결 가이드」를 따라 하시면 됩니다.

---

## 폴더 구성

```
├── index.html                 홈
├── about.html                 회사 개요
├── leadership.html            대표 소개
├── solutions.html             솔루션 전체
│   ├── solution-transaction.html   거래 자문
│   ├── solution-strategy.html      전략·기획
│   ├── solution-execution.html     공실개발·공간 실행
│   └── solution-value.html         자산가치·매각전략
├── analysis.html              상권분석 시스템 소개
│   ├── analysis-tool.html          상권분석 시작하기 (실제 분석 화면)
│   ├── strategy.html               브랜딩·확장·오픈 전략
│   └── analysis-data.html          데이터·지표 안내 (출처 · 계산 방식)
├── partners.html              협력사업 개요 (점포개발 · 상권분석 · 협력 브랜드)
│   ├── partner-loungex.html        라운지엑스 파트너 페이지
│   └── solution-franchise.html     프랜차이즈 출점
├── properties.html            매물·딜
│   └── lease-request.html          맞춤 매물 의뢰 (임차 조건 입력 · 서울 구 지도 선택, lease-request.js)
├── projects.html              프로젝트
│   ├── case-sinchon.html           공실개발 사례
│   └── case-hwagok.html            점포발굴 사례
├── insights.html              인사이트 목록 (자동 생성)
│   ├── insights/<글주소>.html      인사이트 글 (자동 생성)
│   ├── insights/topics/*.html      분야별 모음 6개 (자동 생성)
│   └── insight-vacancy.html        첫 아티클 (예전 방식, 그대로 유지)
├── glossary.html · faq.html   부동산 용어사전 · 자주 묻는 질문 (자동 생성)
├── owners.html                건물 1차 진단
├── contact.html               문의 (유형별 상담 양식)
├── privacy.html · terms.html · ad-notice.html · disclaimer.html   법적 고지
├── 404.html                   없는 주소로 들어왔을 때 보이는 화면
│
├── styles.css                 전체 디자인
├── app.js                     설정값 · 메뉴 · 상담 양식 전송
├── analysis.css · analysis.js 상권분석 화면 전용 디자인 · 동작
├── functions/api/lead.js      상담 접수 서버 함수 (Cloudflare Pages Functions)
├── functions/api/analysis/    상권분석 서버 함수 — 공공데이터 중계 (인증키는 서버에만 보관)
│   ├── status.js                   연결 상태 확인 (/api/analysis/status?check=1)
│   ├── stores.js                   반경 내 점포 (소상공인시장진흥공단)
│   ├── zones.js                    주요상권 경계 (소상공인시장진흥공단)
│   ├── realprice.js                상업업무용 매매 실거래 (국토교통부)
│   └── geocode.js                  주소 검색 보조 (카카오 REST, 선택)
├── scripts/market-data/build.mjs   서울 상권·부동산원 임대동향 분기 데이터 만들기
├── .github/workflows/market-data.yml  위 스크립트를 매주 자동 실행 (GitHub Actions)
├── data/                      (자동 생성) 서울 상권 지표 · 임대동향 — 직접 고치지 않습니다
├── assets/                    로고 · 사진 · 회사소개서 PDF
│   ├── partners/                   라운지엑스 로고 · 매장 사진
│   └── video/                      라운지엑스 영상 3편
├── admin/                     관리자 화면 (글·매물·설정·검색노출 점검)
├── functions/api/admin/       관리자 화면이 쓰는 서버 함수 (깃허브에 원고 저장)
├── content/                   ★ 원고와 설정 — 사이트에 직접 보이지 않습니다
│   ├── insights/*.md               인사이트 글 원고 (머리말 + 본문)
│   ├── insights/index.json         글 목록 (자동 생성)
│   ├── pages/faq.md · glossary.md  자주 묻는 질문 · 용어사전 원고
│   ├── properties.json             공개 매물
│   ├── settings.json               이메일 · 카카오톡 · GA · 상단 공지 띠
│   ├── site.json                   사이트맵·RSS에 넣을 고정 페이지 목록
│   └── editorial/                  편집 가이드(GUIDE.md) · 주제 목록(topics.md)
├── scripts/content/           원고 → 페이지 생성기 (build.mjs · sitegen.mjs) · 대표 이미지 · IndexNow
├── .github/workflows/content-publish.yml  인사이트 발행 (저장할 때 + 매일 오전 11시)
├── sitemap.xml · rss.xml · robots.txt   검색엔진용 (sitemap·rss는 자동 생성)
├── _headers                   보안 헤더 · 캐시 설정
└── _redirects                 주소 이동 규칙
```

---

## 자주 바꾸는 곳

| 바꿀 내용 | 파일 |
|---|---|
| 인사이트 글 쓰기·예약·내리기 | 관리자 화면 → 인사이트 글 (또는 `content/insights/*.md`) |
| 공개 매물 | 관리자 화면 → 매물 (`content/properties.json`) |
| 맞춤 매물 의뢰서 항목·문구 | `lease-request.html` (선택지·조건 목록은 `lease-request.js` 위쪽) |
| 이메일, 카카오톡 채널, 방문 분석(GA4), 상단 공지 띠 | 관리자 화면 → 사이트 설정 (`content/settings.json` → `app.js`에 자동 반영) |
| 대표 사진 | `assets/ceo-lee-sangmin.jpg` (세로 3:4 비율, 파일명 유지) |
| 회사소개서 PDF | `assets/orbis_company_profile_2026.pdf` (파일명 유지) |
| 사례 추가 | `projects.html` + 상세 페이지 복제 |
| 자주 묻는 질문 · 용어사전 | `content/pages/faq.md` · `glossary.md` |

`app.js` 설정값 예시

```js
window.ORBIS = {
  TEL: "010-7379-5265",
  CONTACT_EMAIL: "",      // 비워 두면 홈페이지 전체에서 이메일 표시가 사라집니다
  KAKAO_CHANNEL: "",      // 카카오톡 채널 주소를 넣으면 카카오톡 버튼이 나타납니다
  LEAD_ENDPOINT: "/api/lead",
  GA_ID: ""               // GA4 측정 ID (G-XXXXXXX)
};
```

---

## 인사이트 자동 발행과 관리자 화면

| 어디에 | 이름 | 무엇 |
|---|---|---|
| Cloudflare Pages → Settings → Variables and Secrets | `ADMIN_PASSWORD` | 관리자 화면 비밀번호 (12자 이상) |
| 〃 | `GITHUB_TOKEN` | 깃허브 fine-grained 토큰 — 저장소 orbis-estate만, Contents 읽기·쓰기, Actions 읽기·쓰기 |

- 관리자 화면에서 저장 → `content/`에 원고 커밋 → 깃허브 Actions 「인사이트 발행」이 페이지·목록·사이트맵·RSS를 만들어 커밋 → Cloudflare 배포(1~3분).
- 매일 오전 10시에 Claude가 그날의 글을 '예약 글'로 올리고, 오전 11시 정기 발행에서 공개합니다. 공개된 글 주소는 IndexNow로 네이버 서치어드바이저·빙에 자동으로 알립니다(키 파일: 저장소 맨 위 `*.txt`).
- 손으로 빌드하려면: `node scripts/content/build.mjs` (점검만: `--check`, 예약 글까지 미리보기: `--preview 폴더`)
- 글 원고 형식과 작성 원칙은 `content/editorial/GUIDE.md`에 있습니다.

---

## 상담 접수 연결

| 어디에 | 이름 | 무엇 |
|---|---|---|
| Cloudflare Pages → Settings → Bindings → D1 database | `DB` | 상담 접수 저장소. 관리자 화면 → 상담 접수에서 목록·상태·메모·CSV 내려받기 (표는 첫 접수 때 자동 생성) |
| Cloudflare Pages → Settings → Variables and Secrets | `LEAD_WEBHOOK` | (선택) 새 접수 알림을 보낼 주소 — 구글 Apps Script로 Gmail 알림 (`scripts/lead-alert/Code.gs`) |
| 〃 | `LEAD_WEBHOOK_SECRET` | (선택) 알림 주소가 홈페이지에서 온 요청만 받도록 함께 보내는 확인 값 |

- 접수는 D1에 먼저 저장하고, 알림은 그 뒤에 보냅니다. 알림이 실패해도 접수는 남습니다.
- 접수일로부터 1년이 지난 건은 자동으로 지웁니다(상태가 '계약'인 건은 보관).
- D1도 알림도 없으면 방문자의 메일 작성 화면으로 넘어가는 방식으로 동작합니다.

---

## 매물 · 공동중개 · 리포트 (2026-11-24)

관리자 화면에서 등록하면 저장 즉시 홈페이지에 반영됩니다. 상담 접수와 같은 D1(`DB`)을 쓰고, 깃허브 토큰은 필요 없습니다.

| 어디서 | 무엇 |
|---|---|
| 관리자 → **매물 관리** | 매물 등록·수정·사진, 상태(임시 저장/공개/거래완료/내림). 법정 표시사항이 빈 매물은 공개되지 않습니다 |
| 관리자 → 매물 관리 → **엑셀·붙여넣기 일괄 등록** | PM사 공실 리스트 등 표 자료를 오르비스 양식으로 변환. 담당자·연락처는 내부 정보로만 보관 |
| 관리자 → **공동중개** | 구하는 물건 공고 작성, 중개사무소가 접수한 물건(접수함) → '매물로 등록' |
| 관리자 → **리포트** | 지번 입력 → 매각 가격 검토 보고서(A4)·매각 투자안내서 IM(16:9) 작성, PDF 저장, 공유 링크(`/r/<토큰>`) |
| 홈페이지 `/properties` · `/listing/<매물번호>` | 공개 매물 목록·상세 (검색·공유 미리보기용 제목은 서버에서 넣음) |
| 홈페이지 `/cobroke` | 구하는 물건 공고 + 공동중개 물건 접수 양식 |
| 홈페이지 `/valuation` | 인근 실거래 미리보기 + 매각가 검토 신청 |

| 파일 | 하는 일 |
|---|---|
| `functions/_lib/desk.js` | D1 표(`listings`·`wanted`·`reports`·`media`)와 관리자·공개 조회 처리. 공개 API는 내부 정보(`private`)를 내보내지 않습니다 |
| `functions/_lib/gov.js` | 법정동코드(지번→PNU), 건축물대장, 실거래가, 브이월드 조회 |
| `functions/api/listings.js` `listing.js` `wanted.js` `media/[id].js` `report.js` `market.js` | 공개 API |
| `functions/listing/[id].js` `functions/r/[token].js` `functions/sitemap-listings.xml.js` | 매물 상세·리포트 공유·매물 사이트맵 |
| `admin/listings.js` `admin/import.js` `admin/geo.js` | 매물 관리·일괄 등록·공공데이터 조회 화면 |
| `admin/reports.js` `report-calc.js` `report-tpl.js` `report.css` `report-view.html` | 리포트 편집기·산식·양식·보기(인쇄) 화면 |
| `listings.js` | 홈페이지 매물 목록·상세·공고·실거래 미리보기 |
| `data/bjd.txt` `data/stations.json` | 법정동코드(행정표준코드, 2024.8.1 기준) · 수도권 전철역 좌표 |

### 리포트 자동 채움에 필요한 키 (선택 — 없어도 직접 입력해 같은 양식으로 만들 수 있습니다)

| Cloudflare 환경변수 | 발급처 | 쓰는 곳 |
|---|---|---|
| `DATA_GO_KR_KEY` | 공공데이터포털(data.go.kr) → 아래 API를 각각 '활용신청' → 마이페이지의 일반 인증키 | 건축물대장(면적·층별·사용승인일·주차), 실거래가(거래사례), 홈페이지 `/valuation` 미리보기 |
| `VWORLD_KEY` | 브이월드(vworld.kr) → 오픈API → 인증키 발급 (서비스 URL: `https://orbis-estate.com`) | 토지 면적·지목·용도지역·개별공시지가·토지이용계획·소유 구분, 사례 지번 찾기, 위치도 |

- 공공데이터포털에서 신청할 API: **국토교통부_건축HUB_건축물대장정보 서비스**, **국토교통부_상업업무용 부동산 매매 실거래가 자료** (선택: 단독/다가구 매매 실거래가, 토지 매매 실거래가). 승인 뒤 키가 살아나기까지 1~2시간 걸릴 수 있습니다.
- 브이월드 키를 만들 때 활용 API에 **2D 데이터 API, 검색 API, 이미지(Static Map) API, 국가중점데이터(토지특성·개별공시지가·토지이용계획·토지소유)** 를 고릅니다.
- 등록한 뒤에는 Deployments에서 다시 배포해야 적용됩니다.
- 실거래 원자료에서 일반 건물의 지번은 `6**`처럼 가려져 있습니다. 브이월드 키가 있으면 같은 동에서 대지면적이 맞는 필지를 찾아 지번·공시지가를 채웁니다(여러 필지 거래 등은 직접 입력).
- 리포트는 매각 검토용 참고자료이며 「감정평가 및 감정평가사에 관한 법률」에 따른 감정평가서가 아닙니다. 마지막 쪽 고지 문구를 지우지 마세요.

### 매물 광고 기준

- 인터넷 매물 광고는 공인중개사법 제18조의2와 「중개대상물의 표시·광고 명시사항 세부기준」을 따릅니다. 그래서 종류·층·면적·가격·입주 가능일·사용승인일·주차·방향·욕실 수·위반건축물 여부가 빈 매물은 서버가 '공개'로 바꾸지 않습니다.
- PM사 리스트는 임대 의뢰(광고 동의)를 받은 매물만 공개합니다. 다른 중개사무소가 접수한 물건은 접수 양식의 '홈페이지 게시 동의'를 확인한 뒤에만 올립니다.
- 사진은 브라우저에서 줄여 D1에 저장합니다(장당 약 1MB 이하). 사진이 수천 장으로 늘면 R2로 옮기는 것을 검토하세요.

---

## 검색 노출 (SEO · AI 검색) 구조 (2026-11-27)

글과 페이지가 네이버·구글·빙·다음 검색과 ChatGPT·퍼플렉시티 같은 AI 답변에 잘 잡히도록 만든 장치입니다. 모두 `node scripts/content/build.mjs` 한 번으로 다시 만들어집니다.

| 주소 | 무엇 | 원본 |
|---|---|---|
| `/glossary/<주소>` (70개) | 용어마다 뜻·계산 예시·확인할 점·관련 글·관련 질문을 모은 개별 페이지 | `content/pages/glossary.md` + `glossary-extra.json` |
| `/tools`, `/tools/<주소>` (7개) | 중개보수·환산보증금·수익률·평수/전용률·취득 비용·실효임대료·임대료 인상 계산기 | `scripts/content/extra-data.mjs`(글) + `tools.js`(계산) |
| `/guides`, `/guides/<주소>` (7개) | 매각·매입·임대차·사무실·출점·공실·상권분석 단계별 길잡이. 단계마다 인사이트 글을 묶음 | `scripts/content/extra-data.mjs` |
| `/search` | 글·용어·질문·계산기·길잡이·페이지를 한 번에 찾는 사이트 안 검색 | `search.js` + 빌드가 만드는 `search-index.json` |
| `/llms.txt`, `/llms-full.txt` | AI 서비스용 사이트 요약 (빌드 때 자동 갱신) | `scripts/content/extra.mjs` |
| `/sitemap.xml` | 전체 페이지 + 글 대표 이미지 | 빌드 |

- **본문 자동 링크**: 인사이트 글에 용어사전의 용어가 나오면 처음 한 번 용어 페이지로 연결합니다(글마다 최대 8개). 글 끝에는 '이 글에 나온 용어'와 관련 계산기가 붙습니다.
- **용어를 추가할 때**: `glossary.md`에 `### 용어`와 설명을 쓰고, `glossary-extra.json`에 같은 이름으로 `slug`(영문 주소)를 넣습니다. 둘 중 하나만 있으면 빌드 점검에서 알려 줍니다.
- **요율·기준 금액이 바뀌면**: `tools.js`의 숫자와 `extra-data.mjs`의 설명(`AS_OF` 포함), `glossary-extra.json`의 해당 문장을 함께 고칩니다.
- **robots.txt**: 검색엔진과 AI 검색 로봇(OAI-SearchBot, PerplexityBot, Claude-SearchBot 등)을 명시해 허용합니다. Cloudflare의 'AI Crawler and Agent access policies'가 켜져 있으면 Cloudflare가 파일 앞에 AI 학습 로봇 차단 규칙을 덧붙입니다(관리자 → 검색노출 점검에서 현재 상태 확인).
- **IndexNow**: 글뿐 아니라 고정 페이지·용어·계산기·길잡이가 바뀌어도 네이버 서치어드바이저와 빙에 자동으로 알립니다(`scripts/content/indexnow.mjs`).
- **관리자 → 검색노출 점검**: 로봇 접근 진단, 색인 확인 링크, 전체 페이지 점검(제목·설명·대표 주소·구조화 데이터), 목표 검색어 표.
- 검색어만 바꾼 비슷한 페이지를 대량으로 늘리지 않습니다. 구글은 이를 스팸(대량 생성 콘텐츠)으로 봅니다.

---

## 방문 통계와 KPI 현황

관리자 화면 → **KPI 현황**에서 방문자·페이지뷰·머문 시간·유입 경로·인기 페이지·클릭·문의 전환·회원(구독자·문의 고객)을 기간별로 봅니다. 따로 설정할 것은 없고, 상담 접수와 같은 D1(`DB`)을 씁니다.

| 파일 | 하는 일 |
|---|---|
| `app.js` (방문 통계 부분) | 페이지를 열 때·떠날 때·버튼을 누를 때 `/api/t`로 짧은 기록을 보냅니다 |
| `functions/api/t.js` | 기록을 D1 `pv`(페이지 조회)·`ev`(행동) 표에 저장하고, KPI 숫자를 계산합니다 |
| `functions/api/admin/[[path]].js` | `/api/admin/kpi`, `/api/admin/kpi/members`, `/api/admin/kpi/members.csv` (로그인 필요) |
| `admin/kpi.js` | KPI 현황 화면 (개요 · 페이지·콘텐츠 · 유입 경로 · 문의·전환 · 회원·구독자) |

- 개인을 알아볼 수 있는 정보는 저장하지 않습니다. IP 주소는 남기지 않고 국가 코드만, 방문자 구분은 브라우저에 만든 임의 번호로만 합니다.
- 관리자 화면에 로그인한 브라우저, 추적 거부(Do Not Track·GPC)를 켠 브라우저, 개인정보처리방침 8항에서 '통계 제외'를 누른 브라우저, 검색 로봇, `pages.dev` 미리보기 주소의 방문은 세지 않습니다.
- 기록은 13개월(400일)이 지나면 자동으로 지웁니다.
- 홈페이지에는 로그인 회원가입이 없어서, 회원 명부는 뉴스레터 구독자와 문의 고객(연락처가 같으면 한 사람)으로 대신합니다.
- 블로그·문자·광고에 링크를 걸 때 `?utm_source=blog&utm_campaign=11월이벤트`처럼 붙이면 '캠페인'으로 따로 집계됩니다. `utm_medium=cpc`이면 '광고'로 잡힙니다.

---

## 상권분석 시스템 연결 (요약)

| 어디에 | 이름 | 무엇 |
|---|---|---|
| Cloudflare Pages → Settings → Variables and Secrets | `DATA_GO_KR_KEY` | 공공데이터포털 인증키 (소진공 상가정보 · 국토부 실거래) |
| 〃 | `KAKAO_JS_KEY` | 카카오맵 JavaScript 키 (지도 · 주소 검색) |
| 〃 | `KAKAO_REST_KEY` | (선택) 카카오 REST API 키 — 지도 없이 주소 검색 |
| GitHub 저장소 → Settings → Secrets and variables → Actions | `SEOUL_API_KEY` | 서울 열린데이터광장 인증키 (서울 상권 지표) |
| 〃 | `REB_API_KEY` | (선택) 한국부동산원 R-ONE 인증키 (층별 임대료 · 공실률) |

- 설정 후 `https://orbis-estate.com/api/analysis/status?check=1` 을 열면 항목별 연결 상태를 한국어로 확인할 수 있습니다.
- 키가 아직 없어도 화면은 정상으로 열리고, 연결되지 않은 항목만 "연결 준비 중"으로 표시됩니다.
- 서울 상권 지표와 임대동향은 GitHub Actions의 「상권 데이터 갱신」이 매주 화요일 아침 새 분기를 확인해 `data/` 폴더에 저장합니다.

---

## 콘텐츠 표기 원칙

- 실적 수치는 "관계사·핵심 파트너 누적 경험"으로만 표기합니다.
- 매출·수익·거래 성사를 보장하는 표현은 쓰지 않습니다.
- 라운지엑스는 "라운지엑스 파트너사", 오르비스의 역할은 "점포개발 상권분석자문"으로 표기합니다.
- 그 밖의 협력 브랜드는 텍스트로만 표기하고, 로고는 각 브랜드의 승인을 받은 뒤 사용합니다.
- 고객사·파트너의 자료와 사진은 공개 승인을 받은 범위에서만 게시합니다.
- 상권분석 수치에는 제공 기관과 기준 시점을 함께 적고, 추정치·참고용·비보장 안내를 유지합니다.
- 브랜드 디자인·시공·마케팅 등 실행 업무는 협력사의 별도 계약으로 표기합니다 (공인중개사법상 업무 범위).

---

© 2026 오르비스중개법인 · 대표 이상민 · 중개사무소 개설등록번호 11680-2025-00157
