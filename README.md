# 오르비스중개법인 홈페이지

중소형 빌딩·상가·오피스의 매매·임대차를 중심으로 상권분석 시스템 기반의 점포개발·출점 전략, MD·공실개발·자산관리·매각전략까지 연결하는 오르비스중개법인의 공식 홈페이지입니다.

- 대표 주소: https://orbis-estate.com (www.orbis-estate.com, orbis-estate.pages.dev로 들어와도 이 주소로 옮겨집니다)
- 호스팅: Cloudflare Pages — 이 저장소의 `main` 브랜치와 연결되어 있어, 파일을 저장하면 1~2분 안에 홈페이지에 반영됩니다.
- 별도의 빌드 과정 없이 HTML·CSS·JavaScript 파일이 그대로 서비스됩니다.
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
├── projects.html              프로젝트
│   ├── case-sinchon.html           공실개발 사례
│   └── case-hwagok.html            점포발굴 사례
├── insights.html              인사이트
│   └── insight-vacancy.html        아티클
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
├── sitemap.xml · robots.txt   검색엔진용
├── _headers                   보안 헤더 · 캐시 설정
└── _redirects                 주소 이동 규칙
```

---

## 자주 바꾸는 곳

| 바꿀 내용 | 파일 |
|---|---|
| 홈페이지에 표시할 이메일, 카카오톡 채널, 방문 분석(GA4) | `app.js` 맨 위 `window.ORBIS = { ... }` |
| 대표 사진 | `assets/ceo-lee-sangmin.jpg` (세로 3:4 비율, 파일명 유지) |
| 회사소개서 PDF | `assets/orbis_company_profile_2026.pdf` (파일명 유지) |
| 매물 카드 | `properties.html` |
| 사례 · 아티클 추가 | `projects.html`, `insights.html` + 상세 페이지 복제 |

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

## 상담 접수 연결

Cloudflare Pages 프로젝트 → **Settings → Variables and Secrets** 에 `LEAD_WEBHOOK`(접수 내용을 받을 웹훅 주소)을 넣으면, 홈페이지 상담 신청이 바로 접수됩니다.
설정하기 전에는 상담 신청 내용이 방문자의 메일 작성 화면으로 넘어가는 방식으로 동작합니다.

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
