# 오르비스중개법인 홈페이지

중소형 빌딩·상가·오피스의 매매·임대차를 중심으로 기획, MD, 공실개발, 운영, 자산관리와 매각전략을 연결하는 종합 부동산 중개법인 오르비스중개법인의 공식 홈페이지입니다.

**운영 사이트:** https://orbisestate.pages.dev

---

## 이 저장소를 처음 보신다면

이 저장소는 **정적 웹사이트**입니다. 별도의 빌드 과정 없이 HTML·CSS·JavaScript 파일이 그대로 서비스됩니다.
Cloudflare Pages와 연결되어 있어, 이 저장소의 파일을 수정하면 **1~2분 내에 홈페이지에 자동 반영**됩니다.

처음 배포하시는 경우 [배포가이드.md](배포가이드.md)를 순서대로 따라 하시면 됩니다.

---

## 폴더 구조

```
├── index.html              홈
├── about.html              회사소개
├── leadership.html         대표 소개 (대표 이상민)
├── solutions.html          솔루션 허브
│   ├── solution-transaction.html    거래 자문
│   ├── solution-strategy.html       전략·기획
│   ├── solution-execution.html      공실개발·공간 실행
│   ├── solution-value.html          자산가치·매각전략
│   └── solution-franchise.html      프랜차이즈 출점
├── properties.html         매물·딜
├── projects.html           프로젝트
│   ├── case-sinchon.html            사례 1 — 공실개발
│   └── case-hwagok.html             사례 2 — 점포발굴
├── insights.html           인사이트
│   └── insight-vacancy.html         아티클 — 공실 7가지 원인
├── contact.html            문의·상담 (유형별 브리프)
├── owners.html             건물 1차 진단 (시나리오 진단 위저드)
├── privacy.html            개인정보처리방침
├── terms.html              이용안내
├── ad-notice.html          중개대상물 광고 안내
├── disclaimer.html         면책·저작권 안내
├── 404.html                오류 페이지
│
├── styles.css              전체 디자인 시스템
├── app.js                  ★ 설정(CONFIG) · 폼 전송 · 진단 위저드
├── functions/api/lead.js   상담 접수 서버 함수 (Cloudflare Pages Functions)
├── assets/                 로고 · 지도 · 회사소개서 PDF
├── sitemap.xml             검색엔진용 사이트맵
├── robots.txt
└── _headers                보안 헤더 · 캐시 설정
```

---

## 자주 수정하는 곳

| 무엇을 바꾸고 싶을 때 | 어떤 파일을 여나요 |
|---|---|
| 대표 이메일, 카카오톡 채널, 분석 도구 ID | `app.js` 맨 윗부분 `window.ORBIS = { ... }` |
| 전화번호·주소·등록번호 | 각 HTML 파일 (전체 찾아 바꾸기 권장) |
| 색상·글꼴·여백 | `styles.css` 맨 위 `:root { ... }` |
| 대표 인사말·약력 수정 | `leadership.html` |
| 대표 사진 교체 | `assets/leader-lee.jpg` (3:4 비율 권장) |
| 매물 카드 추가 | `properties.html` |
| 사례 추가 | `projects.html` (카드) + `case-*.html` 복제 |
| 아티클 추가 | `insights.html` (카드) + `insight-*.html` 복제 |
| 회사소개서 PDF 교체 | `assets/orbis_company_profile_2026.pdf` (파일명 유지) |

---

## 배포 전 필수 확인

`app.js` 상단의 설정값 3가지를 확인해 주세요.

```js
window.ORBIS = {
  TEL: "010-7379-5265",
  CONTACT_EMAIL: "spaceblank0100@gmail.com",  // ★ 공식 이메일로 교체
  KAKAO_CHANNEL: "",                          // ★ 카카오톡 채널 URL 입력 시 버튼 자동 연결
  LEAD_ENDPOINT: "/api/lead",
  GA_ID: ""                                   // GA4 사용 시 측정 ID 입력
};
```

상담 접수 알림 연결과 도메인 연결 방법은 [배포가이드.md](배포가이드.md)에 정리되어 있습니다.

---

## 기술 사양

- 정적 HTML / CSS / JavaScript (프레임워크·빌드 도구 없음)
- 호스팅: Cloudflare Pages
- 상담 접수: Cloudflare Pages Functions (`/api/lead`) — 미설정 시 메일 앱으로 자동 전환
- 폰트: Pretendard, Fraunces (CDN)
- SEO: canonical, Open Graph, JSON-LD(RealEstateAgent · BreadcrumbList · Article), sitemap.xml

---

© 2026 ORBIS Real Estate Brokerage. All rights reserved.
중개사무소 등록번호 01-25-2504-60564 · 대표 이상민
