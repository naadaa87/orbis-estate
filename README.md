# 오르비스중개법인 홈페이지

중소형 빌딩·상가·오피스의 매매·임대차를 중심으로 점포개발·상권분석, MD·공실개발·자산관리·매각전략까지 연결하는 오르비스중개법인의 공식 홈페이지입니다.

- 대표 주소: https://orbis-estate.com (www.orbis-estate.com, orbis-estate.pages.dev로 들어와도 이 주소로 옮겨집니다)
- 호스팅: Cloudflare Pages — 이 저장소의 `main` 브랜치와 연결되어 있어, 파일을 저장하면 1~2분 안에 홈페이지에 반영됩니다.
- 별도의 빌드 과정 없이 HTML·CSS·JavaScript 파일이 그대로 서비스됩니다.

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
├── functions/api/lead.js      상담 접수 서버 함수 (Cloudflare Pages Functions)
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

## 콘텐츠 표기 원칙

- 실적 수치는 "관계사·핵심 파트너 누적 경험"으로만 표기합니다.
- 매출·수익·거래 성사를 보장하는 표현은 쓰지 않습니다.
- 라운지엑스는 "라운지엑스 파트너사", 오르비스의 역할은 "점포개발 상권분석자문"으로 표기합니다.
- 그 밖의 협력 브랜드는 텍스트로만 표기하고, 로고는 각 브랜드의 승인을 받은 뒤 사용합니다.
- 고객사·파트너의 자료와 사진은 공개 승인을 받은 범위에서만 게시합니다.

---

© 2026 오르비스중개법인 · 대표 이상민 · 중개사무소 개설등록번호 11680-2025-00157
