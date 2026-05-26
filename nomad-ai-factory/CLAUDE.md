# NOMAD AI Factory — PRD v3 (최신 기획서)

> **이 문서는 2026-05-26 기준 코드베이스를 역분석하여 최신화된 제품 기획서(PRD)입니다.**  
> 신규 기능 개발·리팩터링·AI 작업 시 반드시 이 문서를 기준점으로 삼으세요.

---

## 1. 제품 개요

| 항목 | 내용 |
|------|------|
| **제품명** | NOMAD AI Factory |
| **한 줄 정의** | 미국 구매대행 + AI 콘텐츠 자동화를 통합한 **글로벌 셀러 올인원 플랫폼** |
| **핵심 가치** | 미국(Amazon·eBay 등)에서 상품을 소싱하여 국내 마켓에 판매하는 전 과정을 AI로 자동화하고, 동시에 SNS·블로그 콘텐츠까지 자동 생성·발행하여 수익을 극대화 |
| **벤치마크** | Playauto(플레이오토) — 좌측 네이비 GNB + 우측 대시보드 레이아웃 |
| **디자인 참고** | `aa-extracted/design_handoff_dashboard/` — 대시보드 디자인 핸드오프 (JSX 기반) |

---

## 2. 타겟 유저

| 유형 | 설명 |
|------|------|
| **미국 구매대행 셀러** | Amazon·eBay에서 상품을 소싱해 쿠팡·스마트스토어·11번가에 판매하는 1인 셀러 |
| **시세차익 마케터** | 미국-한국 가격 차이를 이용한 마진 거래를 자동화하려는 유저 |
| **AI 콘텐츠 크리에이터** | 해외 영상·상품 콘텐츠를 AI로 번역·편집하여 SNS·블로그에 자동 발행하는 유저 |
| **디지털 노마드** | 장소에 구애받지 않고 구매대행·콘텐츠 수익을 동시에 창출하는 1인 사업자 |

---

## 3. 핵심 비즈니스 모델

```
[미국 소싱]  Amazon / eBay / Walmart
      │
      ▼
[AI 상품 분석] ─────────────────────────────────────────────────┐
  ├─ 가격 비교 (미국 vs 한국 마진율 자동 계산)                    │
  ├─ 상품 설명 AI 번역·생성 (Gemini / GPT / Claude)              │
  └─ 고마진 상품 자동 알림 (Cron 스케줄)                          │
      │                                                           │
      ▼                                                           ▼
[국내 판매채널 등록]                [AI 콘텐츠 자동 생성·발행]
  쿠팡 / 스마트스토어                ├─ SNS 숏폼 (Instagram Reels / TikTok / YouTube Shorts)
  11번가 / G마켓 / 옥션              ├─ GEO 최적화 블로그 포스팅
  Amazon KR                          └─ 상품 홍보 카피라이팅 + 상세페이지
      │
      ▼
[수익] 판매 마진 + SNS 광고 수익 + 제휴 커머스 링크 수익
```

---

## 4. 페이지 구조 (현재 라우팅)

```
/                           메인 랜딩 페이지 (로그인 모달 포함)
  └─ [로그인 모달]           소셜 로그인 4종 + 이메일 (현재 Mock)

/login                      → / 리다이렉트 (별도 로그인 페이지 없음)

/dashboard                  대시보드 홈 (구매대행 종합 현황)
/dashboard/create           상품 소싱 (영상 컨트롤 패널 → 구매대행 소싱 UI로 전환 예정)
/dashboard/detail           상세페이지 제작 (AI 상품 상세 자동 생성)
/dashboard/results          주문 관리 (결과물 보관함 → 주문 관리 UI로 전환 예정)
/dashboard/workflow         자동화작업 (ReactFlow 노드 에디터 — 전체화면)
/dashboard/settings         → /dashboard 리다이렉트 (설정은 SettingsModal로만 처리)
```

> **인증 규칙**: 비인증 시 `/dashboard/*` 접근 → `/`로 자동 리다이렉트 (ProtectedRoute)  
> **로그인 방식**: 랜딩 페이지에서 모달 팝업 (별도 `/login` 페이지 없음)  
> **라우터**: `HashRouter` — URL은 `#/dashboard` 형태

---

## 5. 주요 기능 상세

### 5-1. 대시보드 홈 (`/dashboard`) ✅ 완료

`aa-extracted/design_handoff_dashboard/` 디자인 핸드오프 기준으로 완전 재구현.

#### 레이아웃 구조 (위→아래)
```
[TopBar] sticky — 검색바 + 알림벨(pulse-dot) + 도움말 + 유저 프로필
[HelloRow] 파란 그라데이션 배너 — 오늘 주문 현황 + CTA 2버튼
[KPI strip] 5개 타일 — 왼쪽 색 bar 강조 + tabular-nums
[QuickActions] 4개 카드 — 그라데이션 아이콘 + badge + 화살표
[Main 12-col grid]
  ├─ col-8: 카테고리별 현황 (2열 리스트 + ProgressBar)
  │          최근 주문 내역 (<table> + ChannelBubble + StatusPill)
  └─ col-4: 배송 파이프라인 (타임라인)
             CS 현황 (2×2 그리드)
             AI 자동화 현황 (pulse-dot + dashed 추가 버튼)
[Bottom 12-col]
  ├─ col-7: 판매 채널 현황 (ChannelBubble + 점유율 바 + 수수료율)
  └─ col-5: 구매대행 시작 가이드 (ProgressBar + 체크리스트 + CTA)
```

| 섹션 | 핵심 데이터 |
|------|------------|
| **KPI 5종** | 오늘 신규주문 / 처리중 주문 / 이달 총매출 / 평균 마진율 / AI 자동화 건수 |
| **카테고리** | 전자제품·명품·건강·뷰티·스포츠·홈·유아·식품 — 주문수 기준 ProgressBar |
| **주문 테이블** | 주문번호(mono) · 상품명 · ChannelBubble · 구매가 · 판매가 · 마진% · StatusPill |
| **파이프라인** | 미국내이동→포워더→국제배송→통관→국내배송 (타임라인 연결선) |
| **CS** | 미답변(rose) / 처리중(amber) / 반품·교환(indigo) / 완료(emerald) |
| **AI 자동화** | 실행중 pulse-dot / 일시중지 회색 dot + 다음실행시간·총횟수 |
| **채널 현황** | 쿠팡·스마트스토어·11번가·G마켓·옥션·Amazon KR — 매출점유율 바 |
| **온보딩** | 5단계 체크리스트 + ProgressBar + "상품 소싱 시작" CTA |

> ⚠️ **TopBar 구현 방식**: `page.tsx` 최상단 `-mt-6 -mx-6 lg:-mt-8 lg:-mx-8` 래퍼로 레이아웃 패딩 상쇄,  
> 내부에 `sticky top-0 z-10` TopBar 배치 → 스크롤 컨테이너 기준으로 고정.

---

### 5-2. 상품 소싱 (`/dashboard/create`) ⚠️ UI 전환 필요

현재 "영상 컨트롤 패널" UI 상태. **구매대행 소싱 UI로 전면 교체 예정**.

**현재 UI (레거시)**:
- `components/forms/CreateForm.tsx` 사용
- 영상 URL 입력 + AI 모델/포맷/톤앤매너 선택 폼

**목표 UI**:

| 파라미터 | 옵션 |
|----------|------|
| 소싱 URL | Amazon / eBay / Walmart 상품 URL 입력 |
| 콘텐츠 타입 | 쇼핑쇼츠-시세차익용 / 상품 리뷰 / 해외 인기 숏폼 / Lo-fi 영상 |
| 타겟 판매채널 | 쿠팡 / 스마트스토어 / 11번가 / G마켓 |
| 타겟 포맷 | 가로형 16:9 / 세로형 9:16 |
| 번역 및 톤앤매너 | 한국어-정보형 / 한국어-감성형 / 일본어-독백형 |
| AI 모델 | Google Gemini 2.5 Flash / OpenAI GPT / Anthropic Claude |

---

### 5-3. 상세페이지 제작 (`/dashboard/detail`) ✅ 신규 구현

`app/dashboard/create/detail/page.tsx` — AI 상품 상세페이지 자동 생성

- **채널 선택**: 쿠팡 / 스마트스토어 / 11번가 / G마켓 / 옥션 / Amazon KR
- **톤앤매너**: 혜택 강조형 / 프리미엄 감성형 / 스펙 비교형 / 후기 공감형 / SEO 최적화형
- **AI 모델**: Gemini 2.5 Flash (권장) / GPT-4o / Claude Opus
- **입력**: 상품 URL + 키워드 + 특이사항 + 이미지 첨부
- **출력**: 마크다운 에디터 (Copy 버튼) + 해시태그 + 최적화 제목 3개

---

### 5-4. 주문 관리 (`/dashboard/results`) ⚠️ UI 전환 필요

현재 "AI 결과물 보관함" UI 상태. **주문 관리 + 결과물 통합 UI로 전환 예정**.

**현재 UI (레거시)**: 영상 뷰어 + 제휴 링크 + 블로그 원고 마크다운 에디터  
**목표 UI**:

| 섹션 | 내용 |
|------|------|
| 주문 현황 | 상태별 필터 탭 (신규접수 / 구매중 / 배송중 / 완료 / 문제발생) |
| 주문 테이블 | 주문번호 · 상품명 · 채널 · 구매가 · 판매가 · 마진 · 상태 · 배송추적 |
| 결과물 보관함 | AI 블로그 원고 · 상세페이지 · 마진 분석 결과 |
| GEO 원고 | 정보형 / 감성형 / 스펙비교형 3버전 마크다운 에디터 |

---

### 5-5. 자동화작업 (`/dashboard/workflow`) ✅ 완료

**ReactFlow 기반 비주얼 노드 에디터** — Make.com / n8n 스타일  
전체화면 캔버스: `DashboardLayout`의 `p-6/p-8`을 `-m-6 lg:-m-8`로 상쇄.

#### 노드 타입 (6종)

| 타입 키 | 컴포넌트 | 색상 | 역할 |
|---------|---------|------|------|
| `source` | SourceNode | 파란색 | 상품/영상 URL 입력 (시작점) |
| `ai` | AiNode | 보라색 | Gemini/GPT 텍스트 생성 |
| `media` | MediaNode | 핑크 | 영상 편집 & TTS |
| `monetize` | MonetizeNode | 초록색 | 쿠팡/네이버 제휴 링크 매칭 |
| `blog` | BlogNode | 주황색 | GEO 블로그 원고 자동 발행 |
| `sns` | SnsNode | 다크/인디고 | YouTube/TikTok/Instagram 발행 |

#### 워크플로우 제어
- **ON/OFF 토글**: 전체 자동화 활성화/비활성화 (`Switch` 컴포넌트)
- **테스트 실행**: 위상 정렬(BFS) 기반 순차 시뮬레이션 (각 노드 RUNNING→SUCCESS)
- **Delete 키 / Trash2 버튼**: 선택 노드 삭제
- **JSON 내보내기**: `.json` 파일로 파이프라인 다운로드
- **노드 팔레트** (`NodePalette.tsx`): 좌측 슬라이드 패널 (토글)
- **미니맵**: 우측 하단 ReactFlow `<MiniMap>`

#### 노드 설정 패널 (`NodeSettingsPanel.tsx` — 우측)
- 프롬프트 / 시스템 지시어
- API 키 오버라이드 (노드별 독립 키)
- Cron 스케줄 (예: `0 9 * * 1-5` = 평일 오전 9시)
- 실행 상태 표시: `IDLE` / `RUNNING` / `SUCCESS` / `ERROR`

---

### 5-6. 설정 모달 (SettingsModal) ✅ 완료

> **중요**: `/dashboard/settings` 라우트는 없음. 사이드바 하단 "설정" 버튼 클릭 시 `SettingsModal` 팝업.

| 탭 | 내용 |
|----|------|
| **계정 설정** | 네이버 / 카카오 / 쿠팡 파트너스 / 네이버 브랜드커넥트 / Amazon Associates / AliExpress |
| **API 설정** | Google Gemini / OpenAI / Anthropic Claude / ElevenLabs / Typecast / TikTok / 샤오홍슈 |
| **영상 설정** | 기본 AI 모델 / 타겟 길이 / 해상도 / 번역 톤앤매너 / 포맷 / TTS 성우 / BGM |

- **Zod 유효성 검사** + **react-hook-form** 연동
- **저장 위치**: `localStorage` (`nomad-ai-settings` 키)

---

## 6. UI/UX 디자인 시스템

### 레이아웃 구조

```
[랜딩 페이지 /]
  └── [로그인 모달] → 인증 성공 → /dashboard

[대시보드 레이아웃 — DashboardLayout]
  ├── [좌측 사이드바 — slate-900 네이비, hidden md:flex]
  │     ├── 로고 (Zap 아이콘 + "NOMAD AI" + "구매대행 자동화")
  │     ├── [상품 소싱 시작] 버튼 (파란색, /dashboard/create로 이동)
  │     ├── 섹션 레이블 "메뉴"
  │     ├── PRIMARY_NAV (5개 NavLink)
  │     │     ├── 홈 (대시보드)       /dashboard
  │     │     ├── 상품 소싱           /dashboard/create
  │     │     ├── 상세페이지 제작     /dashboard/detail
  │     │     ├── 주문 관리           /dashboard/results
  │     │     └── 자동화작업          /dashboard/workflow
  │     ├── 접기/펼치기 버튼 (-right-3 top-[52px])
  │     └── 하단: 설정(모달) · 도움말 · 유저 프로필 · 로그아웃
  │
  └── [우측 콘텐츠 — flex-1 overflow-y-auto p-6 lg:p-8]
        ├── [Header — 모바일 헤더, md:hidden]
        └── [Outlet → 각 page.tsx]
```

### 색상 토큰

| 용도 | 값 | 비고 |
|------|----|------|
| 페이지 배경 | `bg-slate-50` | `hsl(210 20% 98%)` |
| 카드 배경 | `bg-white` | `hsl(0 0% 100%)` |
| 텍스트 primary | `text-slate-900` | `hsl(222 47% 11%)` |
| 텍스트 secondary | `text-slate-500` | muted |
| Primary 버튼 | `bg-blue-600` | `#2563EB` |
| 사이드바 배경 | `bg-slate-900` | `#0F172A` |
| 사이드바 활성 | `bg-blue-600 text-white` | shadow-blue-600/30 |
| 경계선 | `border-slate-200` | `hsl(214 32% 91%)` |
| 랜딩 히어로 배경 | `.hero-aurora` | 다크 + 방사형 그라데이션 |
| 랜딩 텍스트 | `.aurora-text` | 인디고→시안→보라 그라데이션 |

### Tailwind 커스텀 설정 (`index.html` 내 `<script>`)

```js
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Pretendard Variable"', 'Pretendard', 'Inter', ...],
        mono: ['"Geist Mono"', 'ui-monospace', ...],
        inter: ['Inter', 'system-ui', ...],
      },
      colors: {
        ink:   { 900: '#0B1437', 800: '#111c4a', 700: '#1a2761' },
        paper: '#F8FAFC',
        // + shadcn CSS변수 기반 토큰 (border, input, ring, background, ...)
      },
    },
  },
}
```

### CSS 유틸리티 클래스 (index.html `<style>` 정의)

| 클래스 | 용도 |
|--------|------|
| `.hero-aurora` | 랜딩 히어로 — 방사형 그라데이션 다크 배경 |
| `.aurora-text` | 그라데이션 텍스트 (인디고→시안→보라) |
| `.card-soft` | 밝은 테마 카드 (흰 배경 + subtle 그림자) |
| `.card-dark` | 다크 테마 카드 (반투명 + blur) |
| `.bg-dots` | 흰 점 패턴 (다크 배경용) |
| `.bg-dots-light` | 회색 점 패턴 (밝은 배경용) |
| `.stripe-placeholder` | 빗금 패턴 플레이스홀더 |
| `.blob` | `filter: blur(60px)` 글로우 효과 |
| `.marquee-track` | 무한 좌측 스크롤 애니메이션 (30s) |
| `.shadow-card` | 대시보드 카드 기본 그림자 |
| `.shadow-card-md` | 대시보드 카드 호버 그림자 |
| `.pulse-dot` | `::after` 펄스 링 애니메이션 (알림 dot 등) |
| `.tabular-nums` | `font-variant-numeric: tabular-nums` |
| `.no-scrollbar` | 스크롤바 숨김 (수평 목록) |
| `.text-balance` | `text-wrap: balance` |
| `.modal-backdrop` | `backdrop-filter: blur(4px)` |

### 컴포넌트 규칙

```tsx
// 카드
<div className="bg-white rounded-xl border border-slate-200 shadow-card">

// 활성 네비 아이템
className="bg-blue-600 text-white shadow-md shadow-blue-600/30"

// 버튼 Primary
className="bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.98]"

// 버튼 Secondary (outline)
className="border border-slate-200 text-slate-700 hover:bg-slate-50"

// 모달 오버레이
className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"

// 입력 필드
className="border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400"

// StatusPill
className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 ring-inset"

// ProgressBar
<div className="h-[5px] bg-slate-100 rounded-full overflow-hidden">
  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${value}%` }} />
</div>
```

---

## 7. 기술 스택

### Frontend

| 기술 | 버전 | 용도 |
|------|------|------|
| React | latest | UI 프레임워크 |
| TypeScript | latest | 타입 안전성 |
| Vite | latest | 빌드 도구 (포트 5173) |
| Tailwind CSS | **CDN** | 스타일링 — npm 패키지 아님! |
| React Router | latest | `HashRouter` 기반 라우팅 |
| ReactFlow | latest | 자동화작업 노드 에디터 |
| React Hook Form | latest | 폼 상태 관리 |
| Zod | latest | 스키마 유효성 검사 |
| @hookform/resolvers | latest | Zod ↔ RHF 연동 |
| @google/genai | latest | Gemini API SDK |
| lucide-react | latest | 아이콘 라이브러리 |

> ⚠️ **Tailwind**: CDN 버전이므로 `npm install tailwindcss` 불필요.  
> `tailwind.config`는 `index.html` 내 `<script>` 태그에 직접 정의.  
> 커스텀 CSS 클래스(`.hero-aurora` 등)도 `index.html` `<style>` 태그에 정의.

> ⚠️ **lucide-react 주의**: `Chrome`, `Github`, `Youtube` 아이콘 없음.  
> 대체: `Globe`(Chrome 대신), `Code2`(Github 대신), `PlaySquare`(Youtube 대신)

### Backend

| 기술 | 용도 |
|------|------|
| Node.js / Express | Google Cloud Vertex AI 프록시 서버 (포트 5000) |
| ws (WebSocket) | 실시간 스트리밍 프록시 (`/ws-proxy`) |
| express-rate-limit | 15분 100건 제한 |
| google-auth-library | GCP 인증 |
| node-fetch | Vertex AI API 요청 |
| dotenv | 환경변수 로드 |

**Vite 프록시 설정 (`vite.config.ts`)**:
```ts
proxy: {
  '/api-proxy': 'http://localhost:5000',  // REST API
  '/ws-proxy': { target: 'ws://localhost:5000', ws: true },  // WebSocket
}
```

**환경변수 (`backend/.env.local`)**:
```
API_BACKEND_PORT=5000
API_BACKEND_HOST=127.0.0.1
API_PAYLOAD_MAX_SIZE=7mb
GOOGLE_CLOUD_LOCATION=<region>
GOOGLE_CLOUD_PROJECT=<project-id>
PROXY_HEADER=<required>       ← 없으면 서버 시작 실패
```

> ⚠️ `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `PROXY_HEADER` 세 변수가 없으면  
> `server.js`가 `process.exit(1)` 로 즉시 종료됨.

### Database & Auth

| 기술 | 용도 | 현재 상태 |
|------|------|----------|
| Supabase Auth | OAuth 소셜 로그인 | **Mock** — 실제 미연결 |
| Supabase PostgreSQL | 주문·상품·콘텐츠 저장 | **Mock** — 실제 미연결 |
| Supabase Storage | 영상 파일 버킷 | 미구현 |
| `sessionStorage` | 인증 상태 유지 | ✅ 구현됨 (`nomad_ai_session` 키) |
| `localStorage` | API 키 + 앱 설정 | ✅ 구현됨 (`nomad-ai-settings` 키) |

**현재 인증 흐름** (`lib/supabase/auth.tsx`):
1. `login(provider)` → 테스트 유저 객체 생성 → `sessionStorage` 저장
2. 새로고침 시 `useEffect`에서 세션 복원 → `isInitialized = true`
3. `isInitialized = false` 동안 `<InitLoader />` 표시 (오판 리다이렉트 방지)
4. `logout()` → `sessionStorage` 제거 → `ProtectedRoute`가 `/`로 자동 이동

### AI / 외부 API 연동 현황

| 서비스 | 용도 | 현재 상태 |
|--------|------|----------|
| Google Vertex AI (Gemini 2.5 Flash) | 대본·블로그 생성 | 백엔드 프록시 코드 있음, UI 미연결 |
| Google Vertex AI (Gemini 1.5 Pro) | 워크플로우 AI 노드 | 코드 있음 |
| @google/genai SDK | 프론트엔드 직접 호출 | 패키지 설치됨, 미사용 |
| OpenAI GPT | 텍스트 처리 보조 | API 키 설정만 |
| Anthropic Claude | 고급 추론 | API 키 설정만 |
| ElevenLabs | AI TTS | 미구현 |
| Typecast | AI 더빙 | 미구현 |
| 쿠팡 파트너스 | 제휴 링크 | 시뮬레이션 |
| 네이버 브랜드커넥트 | 제휴 링크 | 시뮬레이션 |
| Amazon Associates | 글로벌 제휴 링크 | 시뮬레이션 |

---

## 8. 파일 구조 (전체 코드베이스)

```
nomad-ai-factory/
├── CLAUDE.md                          ← 이 문서 (PRD + 개발 규칙)
│
├── frontend/
│   ├── index.html                     ← HTML 진입점 + Tailwind CDN + CSS 변수 + 커스텀 클래스
│   ├── index.tsx                      ← React 마운트 (ReactDOM.createRoot)
│   ├── App.tsx                        ← HashRouter + ProtectedRoute + PublicRoute + 라우트 정의
│   ├── vite.config.ts                 ← Vite 설정 (proxy: /api-proxy, /ws-proxy)
│   │
│   ├── types/
│   │   └── index.ts                   ← User, AuthContextType, VideoRecord 등 공통 타입
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── auth.tsx               ← AuthContext (sessionStorage 기반 Mock 인증) ✅ 사용 중
│   │   │   └── client.ts              ← Supabase 클라이언트 (미연결)
│   │   ├── ai/index.ts               ← AI API 래퍼 (미구현)
│   │   ├── commerce/index.ts         ← 커머스 링크 유틸 (미구현)
│   │   ├── media/index.ts            ← 미디어 처리 유틸 (미구현)
│   │   ├── actions/index.ts          ← 서버 액션 (미구현)
│   │   └── workflow/
│   │       ├── engine.ts             ← 워크플로우 실행 엔진 (빈 함수)
│   │       └── scheduler.ts          ← Cron 스케줄러 (빈 함수)
│   │
│   ├── pages/                         ⚠️ 레거시 폴더 — App.tsx에서 사용 안 함
│   │   ├── Landing.tsx               ← 메인 랜딩 페이지 ✅ 사용 중 (App.tsx에서 직접 import)
│   │   ├── Login.tsx                 ← 레거시 (미사용)
│   │   ├── Dashboard.tsx             ← 레거시 (미사용)
│   │   └── dashboard/
│   │       ├── Create.tsx            ← 레거시 (미사용)
│   │       ├── VideoPanel.tsx        ← 레거시 (미사용)
│   │       ├── Workflow.tsx          ← 레거시 (미사용)
│   │       ├── ApiSettings.tsx       ← 레거시 (미사용)
│   │       └── Settings.tsx          ← 레거시 (미사용)
│   │
│   ├── app/                           ✅ 현재 사용 중인 라우트 컴포넌트 폴더
│   │   ├── (auth)/login/page.tsx     ← 레거시 (미사용)
│   │   └── dashboard/
│   │       ├── layout.tsx            ← DashboardLayout (Sidebar + Header + Outlet + SettingsModal)
│   │       ├── page.tsx              ← 대시보드 홈 ✅ 완전 재구현 (TopBar+HelloRow+KPI+12-col)
│   │       ├── create/
│   │       │   ├── page.tsx          ← 상품 소싱 ⚠️ 구 "영상 컨트롤 패널" UI
│   │       │   └── detail/
│   │       │       └── page.tsx      ← 상세페이지 제작 ✅ 신규 구현
│   │       ├── results/
│   │       │   └── page.tsx          ← 주문 관리 ⚠️ 구 "결과물 보관함" UI
│   │       ├── workflow/
│   │       │   └── page.tsx          ← 자동화작업 ✅ ReactFlow 캔버스
│   │       └── settings/
│   │           └── page.tsx          ← 레거시 → /dashboard 리다이렉트
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── index.tsx             ← shadcn 스타일 공통 컴포넌트 ✅ 주요 import 대상
│   │   │   └── (ui.tsx)              ← 레거시 (index.tsx로 통합됨)
│   │   ├── auth/
│   │   │   └── LoginModal.tsx        ← 로그인 모달 (소셜 4종 + 이메일)
│   │   ├── settings/
│   │   │   └── SettingsModal.tsx     ← 설정 모달 (3탭 + Zod + localStorage)
│   │   ├── forms/
│   │   │   └── CreateForm.tsx        ← 영상 소싱 폼 (create/page.tsx에서 사용)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx           ← 좌측 GNB (slate-900, 접기/펼치기, 5개 NavLink) ✅
│   │   │   └── Header.tsx            ← 모바일 상단 헤더 (md:hidden)
│   │   └── workflow/
│   │       ├── Canvas.tsx            ← ReactFlow 메인 캔버스 ✅
│   │       ├── NodePalette.tsx       ← 좌측 노드 팔레트 (카테고리별)
│   │       ├── Sidebar.tsx           ⚠️ 구 노드 팔레트 (현재 미사용 — 충돌 주의!)
│   │       ├── nodes/
│   │       │   ├── SourceNode.tsx    ← 소스 입력 노드 (파란색)
│   │       │   ├── AiNode.tsx        ← AI 처리 노드 (보라색)
│   │       │   ├── MediaNode.tsx     ← 미디어 처리 노드 (핑크)
│   │       │   ├── MonetizeNode.tsx  ← 커머스 노드 (초록색)
│   │       │   ├── BlogNode.tsx      ← 블로그 발행 노드 (주황색)
│   │       │   └── SnsNode.tsx       ← SNS 발행 노드 (다크/인디고)
│   │       └── panels/
│   │           └── NodeSettingsPanel.tsx ← 우측 노드 설정 패널
│   │
│   └── package.json
│
├── backend/
│   ├── server.js                      ← Express + Vertex AI 프록시 + WebSocket + RateLimit
│   └── .env.local                     ← 환경변수 (gitignore 대상)
│
└── aa-extracted/                      ← 디자인 핸드오프 참고 자료 (JSX)
    └── design_handoff_dashboard/
        └── design/
            ├── screen-dashboard.jsx   ← 대시보드 홈 디자인 기준
            ├── screen-detail.jsx      ← 상세페이지 제작 디자인 기준
            ├── screen-workflow.jsx    ← 워크플로우 디자인 기준
            ├── ui.jsx                 ← 공통 UI 컴포넌트 (Card, Badge, KPITile 등)
            ├── data.jsx               ← 목 데이터
            ├── sidebar.jsx            ← 사이드바 디자인 기준
            └── icons.jsx              ← 아이콘 매핑
```

---

## 9. 데이터베이스 스키마 (목표 — Supabase PostgreSQL)

```sql
-- 구매대행 주문 (핵심 엔티티)
CREATE TABLE orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  order_no      TEXT UNIQUE NOT NULL,         -- 'ORD-XXXX' 형식
  product_name  TEXT NOT NULL,
  source_url    TEXT,                         -- Amazon/eBay URL
  source_price  INTEGER,                      -- 구매가 (원화)
  sale_price    INTEGER,                      -- 판매가
  margin_rate   NUMERIC(5,2),                 -- 마진율 (%)
  channel       TEXT,                         -- coupang | smartstore | g11st | gmarket | auction | amazon_kr
  category      TEXT,                         -- elec | luxury | health | beauty | sports | home | kids | food
  status        TEXT DEFAULT 'new',           -- new | confirmed | purchasing | shipping_us | customs | shipping_kr | delivered | issue
  metadata      JSONB DEFAULT '{}',           -- 포워딩 정보, 배송 추적번호 등
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- AI 콘텐츠 결과물
CREATE TABLE contents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  order_id      UUID REFERENCES orders(id),  -- nullable
  type          TEXT NOT NULL,               -- video | blog | sns_post | product_desc | detail_page
  source_url    TEXT,
  result_url    TEXT,
  body          TEXT,                        -- 마크다운 / HTML
  metadata      JSONB DEFAULT '{}',          -- 채널·톤·AI모델·해시태그 등
  status        TEXT DEFAULT 'pending',      -- pending | processing | completed | failed
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 제휴 커머스 링크
CREATE TABLE affiliate_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id    UUID REFERENCES contents(id),
  product_name  TEXT,
  coupang_url   TEXT,
  naver_url     TEXT,
  amazon_url    TEXT,
  margin_est    INTEGER,                     -- 예상 시세차익 (원)
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 자동화 워크플로우
CREATE TABLE workflows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  name          TEXT,
  is_active     BOOLEAN DEFAULT false,
  graph_json    JSONB,                       -- ReactFlow nodes + edges
  cron_expr     TEXT,                        -- 전체 워크플로우 Cron
  last_run_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- RLS: 모든 테이블에 적용 (유저는 본인 데이터만 접근)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
```

---

## 10. 현재 구현 상태

### ✅ 완료된 항목

| 기능 | 파일 | 설명 |
|------|------|------|
| **랜딩 페이지** | `pages/Landing.tsx` | aurora 히어로·통계·기능·가격·CTA·마퀴 섹션 |
| **로그인 모달** | `components/auth/LoginModal.tsx` | 소셜 4종 + 이메일 (Mock) |
| **인증 흐름** | `lib/supabase/auth.tsx` | sessionStorage 기반, ProtectedRoute/PublicRoute |
| **대시보드 레이아웃** | `app/dashboard/layout.tsx` | 사이드바 + 모바일 헤더 + Outlet |
| **사이드바** | `components/layout/Sidebar.tsx` | 5개 NavLink, 접기/펼치기, 툴팁, 프로필 |
| **모바일 헤더** | `components/layout/Header.tsx` | md:hidden, 하단 탭 네비 |
| **대시보드 홈** | `app/dashboard/page.tsx` | TopBar + HelloRow + KPI + 12-col 그리드 완전 재구현 |
| **상세페이지 제작** | `app/dashboard/create/detail/page.tsx` | 채널/톤/AI모델 선택 + 마크다운 결과 |
| **설정 모달** | `components/settings/SettingsModal.tsx` | 3탭 + Zod + localStorage |
| **자동화작업** | `app/dashboard/workflow/page.tsx` + `Canvas.tsx` | ReactFlow 전체화면, 6종 노드, 시뮬레이션 |
| **CSS 시스템** | `index.html` | aurora, pulse-dot, marquee, shadow-card 등 |

### ⚠️ UI 전환 필요

| 기능 | 파일 | 현재 상태 | 목표 |
|------|------|----------|------|
| **상품 소싱** | `app/dashboard/create/page.tsx` | 영상 컨트롤 패널 UI | 구매대행 소싱 UI |
| **주문 관리** | `app/dashboard/results/page.tsx` | AI 결과물 보관함 UI | 주문 관리 + 결과물 통합 |

### 🔲 미구현 / 연결 필요

#### 핵심 구매대행 기능
- [ ] Amazon / eBay 상품 URL 파싱 → 가격·이미지·스펙 자동 추출
- [ ] USD/KRW 실시간 환율 연동 + 마진율 자동 계산
- [ ] 쿠팡/스마트스토어/11번가 상품 등록 API 연동
- [ ] 포워딩 업체 배송 추적 (TrackingMore API 등)
- [ ] 주문 CRUD (현재 `console.log`만 — Supabase 미연결)

#### 인증 & 데이터
- [ ] Supabase Auth 실제 OAuth 연동 (Google, GitHub, 카카오, 네이버)
- [ ] Supabase DB 실제 CRUD
- [ ] Supabase Storage (영상 파일 업로드)

#### AI 자동화
- [ ] 워크플로우 실행 엔진 (`lib/workflow/engine.ts` — 빈 함수)
- [ ] Cron 스케줄러 (`lib/workflow/scheduler.ts` — 빈 함수)
- [ ] Gemini API → 상세페이지 실제 생성 (UI 있음, API 미연결)
- [ ] ElevenLabs / Typecast TTS 연동
- [ ] SNS 자동 발행 (YouTube / Instagram / TikTok API)
- [ ] 영상 처리 파이프라인 (ffmpeg → 서버사이드)

---

## 11. 마진율 계산 & 비즈니스 로직

```
마진율(%) = (판매가 - 구매가 - 채널수수료 - 배송비) / 판매가 × 100

채널별 수수료율:
  쿠팡          10.8%  (카테고리마다 다름, 5~15%)
  스마트스토어  12.0%
  11번가         9.5%
  G마켓         11.2%
  옥션          10.0%
  Amazon KR     15.0%

포워딩 요금: 무게(kg) × 지역별 단가 + 부피 초과 요금
환율: USD/KRW 실시간 (대략 1,300~1,400원 범위)
목표 마진율: 25% 이상 (현재 평균 32.6%)
```

---

## 12. 기술적 도전과 해결 방향

| 과제 | 문제 | 해결 방향 |
|------|------|----------|
| **쿠팡 API 부재** | 공개 API 없음 | Playwright 크롤링 or 서드파티 솔루션 |
| **워크플로우 엔진** | ReactFlow 그래프의 비동기 실행 | BFS 위상 정렬 + Promise.all |
| **API 키 보안** | localStorage 평문 저장 | Supabase Vault or 서버사이드 암호화 |
| **영상 처리** | 브라우저에서 ffmpeg 불가 | Cloud Run / Lambda 서버사이드 |
| **실시간 배송 추적** | 주기적 상태 갱신 필요 | 웹훅 or 5분 폴링 |
| **Amazon URL 파싱** | CORS + 봇 감지 | 백엔드 프록시 + Playwright |

---

## 13. 개발 환경 실행

```bash
# 루트에서 프론트 + 백엔드 동시 실행
npm install && npm run dev

# 프론트엔드만 (포트 5173)
cd frontend && npm run dev

# 백엔드만 (포트 5000)
cd backend && npm run dev

# Google Cloud 인증 (Vertex AI 사용 시)
gcloud auth application-default login
```

**접속 URL**
- 프론트엔드: `http://localhost:5173` (또는 포트 충돌 시 5174)
- 백엔드 API: `http://localhost:5000`
- API 프록시: `http://localhost:5173/api-proxy/*`

---

## 14. 주요 개발 규칙 (Claude Code 필독)

### 아이콘
1. `Chrome`, `Github`, `Youtube` 아이콘 **사용 금지** (lucide-react 미포함)
   - 대체: `Globe`(Chrome), `Code2`(Github), `PlaySquare`(Youtube)

### 라우팅
2. **HashRouter** 사용 → URL은 `#/dashboard` 형태
3. 네비게이션: `<NavLink>` 사용 (`<Link>` 금지), 프로그래매틱: `useNavigate`
4. `logout()` 후 명시적 `navigate('/')` **금지** → `ProtectedRoute`가 자동 리다이렉트

### 설정
5. `/dashboard/settings` 라우트 없음 → `SettingsModal` 컴포넌트로만 표시

### 스타일
6. Tailwind **CDN** 사용 → `@apply`, `tailwind.config.js` 파일 없음
   - `tailwind.config`는 `index.html` `<script>` 태그 안에만 정의
   - 커스텀 CSS 클래스(`.hero-aurora` 등)는 `index.html` `<style>` 태그에 정의
7. Hex 색상(`#0B1437`)의 Tailwind 불투명도 수정자(`text-ink-900/60`)는 CSS변수로 정의된 색상에만 동작. 커스텀 Hex에는 `rgba()` 직접 사용

### 컴포넌트
8. 공통 UI: `components/ui/index.tsx`에서 import
9. `Card`, `Button`, `Input`, `Select`, `Textarea`, `Label`, `Switch` 등 이미 구현됨

### 페이지 레이아웃
10. **TopBar가 있는 페이지** (현재: `app/dashboard/page.tsx`):
    - 최상위 래퍼: `-mt-6 -mx-6 lg:-mt-8 lg:-mx-8`로 레이아웃 패딩 상쇄
    - TopBar: `sticky top-0 z-10 h-[58px]`
    - 콘텐츠: 래퍼 내부에 `p-6 lg:p-8`로 패딩 복원
11. **전체화면 페이지** (현재: `app/dashboard/workflow/page.tsx`):
    - 최상위 래퍼: `-m-6 lg:-m-8`로 패딩 완전 상쇄
12. **일반 페이지**: 레이아웃의 `p-6 lg:p-8` 그대로 사용

### 파일 경로 충돌 주의
13. `components/layout/Sidebar.tsx` (GNB) vs `components/workflow/Sidebar.tsx` (구 팔레트, 미사용)
    - import 시 반드시 전체 경로로 구분
14. `contexts/AuthContext.tsx` (레거시, 미사용) vs `lib/supabase/auth.tsx` (실제 사용 중)
    - 인증 관련 코드는 반드시 `lib/supabase/auth.tsx`의 `useAuth()` 사용
15. `pages/` 폴더 (레거시, `Landing.tsx` 제외 미사용) vs `app/` 폴더 (현재 사용 중)

### Mock 데이터
16. 현재 모든 대시보드 데이터는 `page.tsx` 내 상수 Mock 데이터
17. 실제 API 연동 전까지 Mock 상태를 명확히 주석(`// Mock`) 표시

---

*이 문서는 2026-05-26 기준 코드베이스 전체를 역분석하여 최신화되었습니다. (PRD v3)*
