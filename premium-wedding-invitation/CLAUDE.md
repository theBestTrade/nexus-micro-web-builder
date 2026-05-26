# Premium Wedding Invitation — CLAUDE.md

## 프로젝트 개요

**Eternal Promise** — AI 기반 프리미엄 모바일 청첩장 웹 애플리케이션

Google Vertex AI (Gemini + Imagen)를 활용한 AI 생성 이미지와 Supabase 실시간 방명록을 갖춘 고급 웨딩 초대장 웹사이트. 모바일 최적화(max-w-md) 세로형 레이아웃으로 설계되었으며, 카카오톡 공유 및 배경 음악 기능을 포함한다.

---

## 기술 스택

### Frontend
| 기술 | 용도 |
|------|------|
| React + TypeScript | UI 프레임워크 |
| Vite | 빌드 도구 |
| Framer Motion | 애니메이션 (스크롤, 페이드, 패럴랙스) |
| Tailwind CSS | 스타일링 |
| Lucide React | 아이콘 |
| canvas-confetti | 히어로 로드 시 꽃가루 이펙트 |
| @google/genai | Gemini AI 텍스트 생성 + Imagen 이미지 생성 |
| @supabase/supabase-js | 실시간 방명록 DB |

### Backend
| 기술 | 용도 |
|------|------|
| Node.js + Express | Vertex AI API 프록시 서버 |
| google-auth-library | Google Cloud ADC 인증 |
| ws (WebSocket) | Bidi 스트리밍 WebSocket 프록시 |
| express-rate-limit | API 남용 방지 (15분/100회) |

---

## 프로젝트 구조

```
premium-wedding-invitation/
├── frontend/
│   ├── App.tsx               # 루트 컴포넌트 (오디오, 공유, 레이아웃 조합)
│   ├── index.tsx             # React 엔트리포인트
│   ├── index.html            # HTML 템플릿
│   ├── constants.ts          # 결혼식 데이터, 갤러리 이미지, 음악 URL
│   ├── types.ts              # TypeScript 타입 정의
│   ├── vite.config.ts        # Vite 설정 (vertex-ai-proxy-interceptor 포함)
│   ├── components/
│   │   ├── Hero.tsx          # 캐러셀 히어로 (AI 생성 이미지, 패럴랙스)
│   │   ├── Invitation.tsx    # 청첩장 본문 (인사말, 혼주 소개)
│   │   ├── Gallery.tsx       # 사진 갤러리 (모자이크 그리드)
│   │   ├── Calendar.tsx      # 예식 날짜 달력 컴포넌트
│   │   ├── Location.tsx      # 장소 안내 (AI 지도 이미지, 대중교통)
│   │   ├── Contact.tsx       # 연락처 + 계좌번호 + 화환 링크
│   │   └── Guestbook.tsx     # AI 축하말 생성 + Supabase 실시간 방명록
│   └── services/
│       ├── gemini.ts         # Gemini 2.5 Flash — 축하 메시지 자동 생성
│       ├── imageService.ts   # Imagen 4.0 — 히어로/지도 이미지 생성
│       └── supabase.ts       # Supabase 클라이언트 설정
├── backend/
│   ├── server.js             # Vertex AI REST/WebSocket 프록시 서버
│   ├── package.json
│   └── .env.local            # Google Cloud 환경 변수 (자동 생성)
├── vertex-ai-proxy-interceptor.js  # Vite 플러그인: API 요청 인터셉트
├── package.json              # 루트 (npm run dev 진입점)
└── README.md
```

---

## 핵심 컴포넌트

### `App.tsx` — 루트 레이아웃
- **플로팅 컨트롤**: 음소거 토글 버튼 + 상단 스크롤 버튼 (우하단 고정)
- **배경 음악**: `<audio loop>` + 클릭으로 재생/정지
- **스크롤 애니메이션**: `useScroll` + `useTransform`으로 컨텐츠 투명도 제어 (scrollY 0→300 시 opacity 0.5→1)
- **confetti 이펙트**: 히어로 이미지 로드 후 800ms 딜레이로 실행
- **카카오 공유**: `window.Kakao.Share.sendDefault()` — Kakao SDK 미초기화 시 Web Share API 폴백
- **링크 복사**: `navigator.clipboard.writeText()` + 토스트 알림 (2초)

### `Hero.tsx` — 히어로 섹션
- 2:3 비율 캐러셀, 5초 자동 전환
- `AnimatePresence`로 이미지 크로스페이드 (1.5초)
- 이미지 Ken Burns 효과: `scale: 1.1 → 1.18, x: -5`
- 스크롤 패럴랙스: `y: 0 → 200` (scrollY 0~1000)
- 텍스트: 신랑·신부 이름(흰색), 날짜(핑크), 장소(파란색)
- **이미지 소스**: `imageService.ts`의 Imagen 4.0 API — 실패 시 Unsplash 폴백

### `Gallery.tsx`
- 10개 이미지의 모자이크 그리드 (col-span, row-span 혼용)
- 이미지 소스: `constants.ts`의 `GALLERY_IMAGES` 배열 (현재 picsum.photos 데모)

### `Calendar.tsx`
- 예식 날짜 달력 렌더링
- 결혼식 날짜 셀에 핑크 원 강조 (scale 0.65 축소 적용)

### `Location.tsx`
- AI 생성 지도 이미지 (Imagen 4.0 — Naver Map 스타일)
- 네이버/카카오 지도 앱 연동 버튼
- 대중교통 안내: 3호선·7호선, 버스 노선

### `Contact.tsx`
- 아코디언 UI로 신랑/신부측 연락처 구분
- 전화 (`tel:`) / 문자 (`sms:`) 링크
- 계좌번호 클립보드 복사 기능
- 화환 보내기 외부 링크 (`WREATH_URL`)

### `Guestbook.tsx`
- **Supabase 연동 시**: 실시간 `postgres_changes` 구독으로 새 메시지 즉시 반영
- **Supabase 미연동 시**: localStorage 폴백 모드
- **AI 축하말 생성**: Gemini 2.5 Flash — 이름+관계(친구/직장동료/친척/지인) 입력 후 자동 생성
- 채팅 버블 스타일 UI, 호버 시 삭제 버튼 표시

---

## AI 서비스 설정

### Gemini (텍스트 생성)
- **파일**: `frontend/services/gemini.ts`
- **모델**: `gemini-2.5-flash`
- **용도**: 방명록 AI 축하 메시지 생성
- **설정**: temperature 0.8, topP 0.95
- **인증**: Vertex AI (`vertexai: true`) — 백엔드 프록시 경유

### Imagen (이미지 생성)
- **파일**: `frontend/services/imageService.ts`
- **모델**: `imagen-4.0-generate-001`
- **용도 1**: 히어로 캐러셀 이미지 3장 생성 (한국인 커플, 야경, 로맨틱 분위기)
- **용도 2**: 지도 이미지 생성 (세인트메리스, 반포대로 222 기준)
- **폴백**: Unsplash / Unsplash 이미지

---

## Supabase 데이터베이스 설정

### 테이블: `guestbook_messages`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | `uuid_generate_v4()` 기본값 |
| name | text | 작성자 이름 (필수) |
| content | text | 축하 메시지 (필수) |
| relation | text | 신랑/신부와의 관계 (선택) |
| timestamp | bigint | Unix timestamp |

### RLS (Row Level Security) 권장 설정
- SELECT: 모든 사용자 허용 (익명 포함)
- INSERT: 모든 사용자 허용
- UPDATE/DELETE: 인증된 관리자만 허용

### 연결 설정 (`frontend/services/supabase.ts`)
```typescript
const supabaseUrl = 'https://your-project-id.supabase.co';  // 교체 필요
const supabaseKey = 'your-anon-key';                        // 교체 필요
```
- URL이 기본값(`your-project-id`)이면 `supabase = null` → localStorage 모드 자동 활성화

---

## 백엔드 프록시 서버

### 역할
프론트엔드에서 Vertex AI API를 직접 호출하는 것을 방지하기 위한 Node.js 인증 프록시.
Google Cloud ADC(Application Default Credentials)로 토큰을 발급해 Vertex AI에 전달.

### 지원 API 클라이언트
| 이름 | 유형 |
|------|------|
| `VertexGenAi:generateContent` | REST (비스트리밍) |
| `VertexGenAi:predict` | REST (비스트리밍) |
| `VertexGenAi:streamGenerateContent` | SSE 스트리밍 |
| `ReasoningEngine:query` | REST (비스트리밍) |
| `ReasoningEngine:streamQuery` | 스트리밍 |

### WebSocket 프록시 (`/ws-proxy`)
- Vertex AI `LlmBidiService/BidiGenerateContent` 양방향 스트리밍 지원
- setup 메시지에 프로젝트/로케이션 자동 주입

### 환경 변수 (`backend/.env.local`)
```env
API_BACKEND_PORT=5000
API_BACKEND_HOST=127.0.0.1
API_PAYLOAD_MAX_SIZE=7mb
GOOGLE_CLOUD_PROJECT=<your-project-id>
GOOGLE_CLOUD_LOCATION=<your-region>
PROXY_HEADER=<secret-header-value>
```

---

## 웨딩 데이터 커스터마이징

**파일**: `frontend/constants.ts`

```typescript
export const WEDDING_DATA: WeddingData = {
  groom: { name, phone, father, mother, account, bank },
  bride:  { name, phone, father, mother, account, bank },
  date: "2026-05-03T12:00:00",   // ISO 형식
  location: { name, address, hall, mapUrl },
  message: "인사말 텍스트"
};

export const WREATH_URL = "화환 업체 링크";
export const BG_MUSIC_URL = "배경 음악 MP3 URL";
export const GALLERY_IMAGES = [ /* { src, span } 10개 배열 */ ];
```

---

## 개발 환경 실행

### 사전 조건
```bash
gcloud init
gcloud auth application-default login
```

### 실행
```bash
# 루트 디렉토리에서 (프론트엔드 + 백엔드 동시 실행)
npm install && npm run dev

# 프론트엔드만 (Vite dev server)
cd frontend && npm install && npm run dev

# 백엔드만
cd backend && npm install && node server.js
```

### 빌드
```bash
cd frontend && npm run build
```

---

## 카카오 SDK 연동

`frontend/App.tsx`에서 Kakao JS 키 설정 필요:
```typescript
window.Kakao.init('YOUR_KAKAO_JS_KEY');  // 실제 키로 교체
```
- SDK 미초기화 시 `navigator.share` Web Share API 폴백 사용
- `index.html`에 Kakao SDK 스크립트 태그 추가 필요

---

## 페이지 섹션 순서

1. **Hero** — 풀스크린 AI 이미지 캐러셀, 이름/날짜/장소 오버레이
2. **Invitation** — 청첩장 인사말, 혼주 소개
3. **Gallery** — 웨딩 사진 모자이크 그리드
4. **Calendar** — 예식 날짜 달력
5. **Location** — 지도 이미지, 대중교통 안내
6. **Contact** — 연락처, 계좌번호, 화환 링크
7. **Guestbook** — AI 축하말 + 실시간 방명록
8. **Footer** — 링크 복사, 카카오 공유

---

## 알려진 설정 필요 항목

| 항목 | 파일 | 현재 상태 |
|------|------|----------|
| Kakao JS Key | `App.tsx` | `'YOUR_KAKAO_JS_KEY'` (미설정) |
| Supabase URL/Key | `services/supabase.ts` | 플레이스홀더 (localStorage 모드로 동작) |
| Google Cloud 환경 변수 | `backend/.env.local` | 다운로드 시 자동 설정 |
| 갤러리 이미지 | `constants.ts` | picsum.photos 데모 이미지 |
| 배경 음악 | `constants.ts` | SoundHelix 데모 MP3 |
| 혼주 연락처 | `Contact.tsx` | `'010-0000-0000'` 하드코딩 |
