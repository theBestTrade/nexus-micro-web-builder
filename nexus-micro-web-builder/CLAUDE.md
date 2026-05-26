# CLAUDE.md — Nexus Micro-Web Builder

## 프로젝트 개요

**Nexus Micro-Web Builder**는 소규모 모바일 웹 비즈니스 모델(마이크로 웹)을 기획·시각화하는 분석 도구입니다.  
12가지 프리미엄 모바일 웹 비즈니스 모델(청첩장, 돌잔치, 부고장, 디지털 명함 등)에 대한 수익 구조, 디자인 전략, 영업 로드맵을 시각적으로 제시하며, 각 모델의 모바일 UI 시안을 실시간 미리보기로 보여줍니다.

- Google Vertex AI Studio 앱 기반으로 생성된 프로토타입 프로젝트입니다.
- 프로덕션 배포용이 아닌 데모/프로토타이핑 목적입니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React 18, TypeScript, Vite, Tailwind CSS |
| UI 컴포넌트 | lucide-react (아이콘), recharts (차트), clsx + tailwind-merge (클래스 유틸) |
| 백엔드 | Node.js, Express.js |
| AI API 연동 | Google Cloud Vertex AI (Application Default Credentials) |
| WebSocket | ws 라이브러리 (Vertex AI Bidi 스트리밍 지원) |
| 패키지 관리 | npm Workspaces (monorepo: `frontend/`, `backend/`) |
| 동시 실행 | concurrently |

---

## 프로젝트 구조

```
nexus-micro-web-builder/
├── package.json                  # 루트 workspace 설정, dev 스크립트
├── CLAUDE.md                     # 이 파일
│
├── frontend/                     # Vite + React 앱
│   ├── package.json
│   ├── vite.config.ts            # Vite 설정, /api-proxy → localhost:5000 프록시
│   ├── index.html
│   ├── index.tsx                 # 앱 진입점
│   ├── App.tsx                   # 루트 컴포넌트 (Header + Sidebar + MainContent 레이아웃)
│   ├── types.ts                  # BusinessModel, BusinessModelDetails 타입 정의
│   ├── metadata.json
│   ├── vertex-ai-proxy-interceptor.js  # Vertex AI 요청 인터셉터 (프론트 → 백엔드 프록시)
│   │
│   ├── data/
│   │   └── models.ts             # 12가지 비즈니스 모델 데이터 (아이콘, 가격, 디자인, 영업 전략)
│   │
│   ├── components/
│   │   ├── Sidebar.tsx           # 모델 목록 + 시장 분석 산점도 차트
│   │   ├── MainContent.tsx       # 선택된 모델의 상세 분석 (수익/디자인/영업 벤토 그리드)
│   │   ├── MobileMockup.tsx      # 모델별 모바일 UI 시안 (12종 하드코딩된 목업)
│   │   ├── Calendar.tsx
│   │   └── ui/                   # 공통 UI 컴포넌트 (button, card, input, label)
│   │
│   ├── components/layout/
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   │
│   ├── pages/
│   │   ├── Landing.tsx           # 랜딩 페이지 (Nexus Platform 소개)
│   │   ├── Dashboard.tsx         # 대시보드
│   │   └── Login.tsx             # 로그인 페이지
│   │
│   ├── services/
│   │   └── supabaseMock.ts       # Supabase 모킹 서비스
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx       # 인증 컨텍스트
│   │
│   └── lib/
│       └── utils.ts              # cn() 유틸 (clsx + tailwind-merge)
│
└── backend/
    ├── package.json
    ├── server.js                 # Express 서버, Vertex AI API 프록시, WebSocket 프록시
    └── .env.local                # 환경변수 (자동 생성, 수동 수정 가능)
```

---

## 핵심 컴포넌트 설명

### `frontend/App.tsx`
- 전체 레이아웃 최상위 컴포넌트
- 헤더(고정), 사이드바, 메인 콘텐츠 3열 구조
- `selectedId` state로 현재 선택된 비즈니스 모델 관리

### `frontend/components/Sidebar.tsx`
- 12개 비즈니스 모델 목록 (클릭 → 상세 전환)
- 하단에 Recharts `ScatterChart`로 시장 분석 산점도 표시
  - X축: 시장 수요, Y축: 수익성 (임의 스코어)
  - 선택된 모델은 파란 원(r=8), 나머지는 회색 원(r=4)

### `frontend/components/MainContent.tsx`
- **벤토 그리드** 3카드 구성:
  1. 수익 모델 및 단가 (amber 아이콘)
  2. 디자인 핵심 전략 (dark slate 배경)
  3. 영업 및 마케팅 로드맵 (indigo-violet 그라디언트)
- 하단에 `MobileMockup` + 기획 포인트 분석 3단계

### `frontend/components/MobileMockup.tsx`
- 폰 프레임(340×680px)에 각 모델의 실제 모바일 UI 렌더링
- `modelId` switch로 12가지 케이스 별도 구현
- picsum.photos에서 랜덤 이미지 로드 (데모용)
- `hide-scrollbar` CSS 클래스로 스크롤바 숨김

### `frontend/data/models.ts`
- `BusinessModel[]` 타입의 12개 모델 데이터 정의
- 각 모델: `id`, `title`, `priceRange`, `icon(LucideIcon)`, `details`, `chartData`

### `backend/server.js`
- Express 서버 (기본 포트: 5000)
- **`POST /api-proxy`**: Vertex AI API 요청을 ADC(Application Default Credentials)로 프록시
  - 지원 API: `generateContent`, `predict`, `streamGenerateContent`, `reasoningEngines`
  - Rate Limiting: 15분 윈도우, IP당 최대 100 요청
  - 보안: `x-app-proxy` 커스텀 헤더로 출처 검증
- **`/ws-proxy`**: WebSocket 업그레이드 → Vertex AI `BidiGenerateContent` 엔드포인트 프록시

---

## 비즈니스 모델 목록 (12종)

| ID | 모델명 | 가격대 | 아이콘 |
|----|--------|--------|--------|
| 0 | 모바일 청첩장 (프리미엄) | 80,000 ~ 250,000원 | Heart |
| 1 | 모바일 돌잔치 초대장 | 40,000 ~ 100,000원 | Baby |
| 2 | 모바일 부고장 / 조의장 | 30,000 ~ 60,000원 | FileText |
| 3 | 디지털 명함 (SaaS형) | 월 4,900원 ~ 기업형 | Contact |
| 4 | 소상공인 미니 홈피 | 200,000 ~ 600,000원 | Store |
| 5 | 행사 / 세미나 안내장 | 150,000 ~ 400,000원 | Ticket |
| 6 | 부동산 모바일 전단 | 100,000 ~ 300,000원 | Building |
| 7 | 프리랜서 포트폴리오 | 150,000 ~ 450,000원 | Briefcase |
| 8 | 온라인 롤링페이퍼 | 무료 ~ 9,900원 | MessageSquare |
| 9 | 모바일 메뉴판 (QR) | 세팅 150,000 + 월 15,000 | Utensils |
| 10 | 반려동물 QR 프로필 | 25,000 ~ 45,000원 | Dog |
| 11 | 온라인 전시 / 갤러리 | 300,000 ~ 1,000,000원 | Image |

---

## 환경 설정

### 사전 요구사항
- Node.js & npm
- Google Cloud SDK (`gcloud`)

### Google Cloud 인증
```bash
gcloud init
gcloud auth application-default login
```

### 환경 변수 (`backend/.env.local`)
```
API_BACKEND_PORT=5000
API_PAYLOAD_MAX_SIZE=5mb
GOOGLE_CLOUD_LOCATION=<리전>
GOOGLE_CLOUD_PROJECT=<프로젝트 ID>
PROXY_HEADER=<프록시 헤더 값>
```

---

## 개발 명령어

```bash
# 전체 의존성 설치 (루트에서)
npm install

# 프론트엔드 + 백엔드 동시 실행
npm run dev

# 개별 실행
npm run dev-frontend    # Vite dev server (프론트만)
npm run dev-backend     # Express server (백엔드만)

# 프론트엔드 빌드
npm run build --prefix frontend

# 빌드 미리보기
npm run preview --prefix frontend
```

Vite dev server는 `/api-proxy`와 `/ws-proxy` 경로를 `http://localhost:5000`으로 자동 프록시합니다.

---

## 디자인 시스템

- **컬러**: 인디고(`#4f46e5`)가 주 브랜드 컬러, 각 모델별 고유 컬러 팔레트 적용
- **레이아웃**: 벤토 그리드(Bento Grid) 시스템 (12열 CSS Grid)
- **타이포그래피**: 시스템 폰트, `font-black`(900) ~ `font-light`(300) 혼용
- **반응형**: Tailwind 브레이크포인트 (`md:`, `lg:`) 활용
- **애니메이션**: Tailwind `animate-pulse`, `transition-all`, hover 트랜스폼
- **모바일 시안**: 340×680px 고정 크기 폰 프레임, `rounded-[3.5rem]` 둥근 모서리

---

## 주의사항

- `MobileMockup.tsx`의 이미지는 `picsum.photos` 외부 API를 사용하므로 오프라인 환경에서는 표시되지 않습니다.
- 백엔드는 Vertex AI ADC가 올바르게 설정되어 있어야 기동됩니다 (`GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `PROXY_HEADER` 필수).
- `vertex-ai-proxy-interceptor.js`는 프론트엔드에서 Vertex AI SDK 호출을 백엔드 프록시로 리다이렉트하는 shim입니다.
- 이 프로젝트는 **데모/프로토타이핑 전용**으로, 프로덕션 보안 강화(인증, CORS 등) 없이 배포하지 마십시오.
