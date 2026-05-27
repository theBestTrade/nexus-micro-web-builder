# NOMAD Short Factory 🎬

> 중국 도우인(抖音)·샤오홍수(小红书) 인기 숏폼을 AI로 재창작하여  
> 한국 멀티채널(YouTube Shorts · Instagram Reels · TikTok · 네이버 블로그)에 자동 배포하고  
> 커머스(쿠팡 파트너스·스마트스토어·네이버쇼핑 커넥트)로 전환하는 SaaS 플랫폼

---

## 📌 목차

1. [기능 개요](#기능-개요)
2. [수익 트랙](#수익-트랙)
3. [기술 스택](#기술-스택)
4. [디렉토리 구조](#디렉토리-구조)
5. [빠른 시작](#빠른-시작)
6. [환경 변수 설정](#환경-변수-설정)
7. [데이터베이스 마이그레이션](#데이터베이스-마이그레이션)
8. [개발 서버 실행](#개발-서버-실행)
9. [Docker로 실행](#docker로-실행)
10. [배포](#배포)
11. [주요 API](#주요-api)

---

## 기능 개요

| 모듈 | 설명 |
|------|------|
| **Target Finder** | 도우인·샤오홍수에서 키워드 기반 바이럴 영상 검색 및 무워터마크 다운로드 |
| **Adaptation Studio** | Whisper STT → Claude AI 대본 각색 → Edge-TTS 합성 → FFmpeg 렌더링 |
| **Publisher Matrix** | YouTube · Instagram · TikTok · 네이버 블로그 멀티채널 예약 배포 |
| **Settings** | 소싱·배포·커머스 계정 멀티 관리, 프록시 풀 관리 |

---

## 수익 트랙

```
Track A │ 중드 리컷 쇼츠 → YouTube Shorts 광고 수익 (트래픽 자산)
Track B │ 쇼핑 리뷰 쇼츠 → 쿠팡 파트너스 · 네이버쇼핑 커넥트 CPS 전환
Track D │ AI 블로그 포스트 → 네이버 블로그 자동 등록 (SEO + 커머스)
```

---

## 기술 스택

### 프론트엔드

| 기술 | 용도 |
|------|------|
| Next.js 14 (App Router) | 프레임워크 |
| Tailwind CSS + Shadcn UI | 스타일링 |
| TanStack Query v5 | 서버 상태 관리 |
| Zustand | 클라이언트 상태 관리 |
| TypeScript | 타입 안전성 |

### 백엔드

| 기술 | 용도 |
|------|------|
| FastAPI (Python 3.11+) | REST API |
| Celery + Redis | 비동기 태스크 큐 |
| Supabase (PostgreSQL) | DB + 스토리지 + Auth |
| Playwright | 웹 자동화 (도우인·네이버 블로그) |

### AI 서비스

| 기술 | 용도 |
|------|------|
| OpenAI Whisper v3 | 중국어 STT |
| Anthropic Claude claude-sonnet-4-6 | 대본 각색 · 블로그 생성 |
| Edge-TTS | 한국어 TTS (기본) |
| demucs (htdemucs) | BGM/보컬 분리 |
| FFmpeg | 자막 오버레이 · 인코딩 |

---

## 디렉토리 구조

```
Youtube_shots_Maker/
├── app/                    # Next.js App Router
│   ├── (auth)/             # 로그인 · 회원가입
│   ├── (dashboard)/        # 대시보드 레이아웃
│   │   ├── dashboard/      # 통계 메인 화면
│   │   ├── sourcing/       # Target Finder
│   │   ├── studio/         # Adaptation Studio
│   │   ├── publisher/      # Publisher Matrix (영상 + 블로그)
│   │   └── settings/       # 계정 · 프록시 설정
│   └── page.tsx            # 랜딩 페이지
├── components/
│   ├── ui/                 # Shadcn UI 커스텀 컴포넌트
│   └── layout/             # 사이드바 등 레이아웃 컴포넌트
├── lib/
│   ├── api/                # FastAPI 통신 헬퍼
│   └── supabase/           # Supabase 클라이언트
├── backend/
│   ├── main.py             # FastAPI 앱 진입점
│   ├── routers/            # API 라우터
│   ├── services/           # 비즈니스 로직
│   ├── tasks/              # Celery 태스크
│   ├── models/             # Pydantic 스키마
│   └── database/           # DB 클라이언트 · 마이그레이션
├── docker-compose.yml      # 로컬 개발 스택
├── start.ps1               # Windows 원클릭 개발 서버
└── vercel.json             # Vercel 프론트엔드 배포 설정
```

---

## 빠른 시작

### 사전 요구사항

- **Node.js** 18+
- **Python** 3.11+
- **Redis** 7+ (또는 Docker)
- **FFmpeg** (PATH에 등록)
- **Supabase** 계정 (무료 플랜 가능)

### 1. 레포지토리 클론

```bash
git clone <repo-url>
cd Youtube_shots_Maker
```

### 2. 프론트엔드 의존성 설치

```bash
npm install
```

### 3. 백엔드 가상환경 설정

```bash
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
python -m playwright install chromium
```

---

## 환경 변수 설정

### 프론트엔드 (`.env.local`)

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### 백엔드 (`backend/.env`)

```bash
cp backend/.env.example backend/.env
```

```env
# Supabase
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...

# AI 서비스
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Redis / Celery
REDIS_URL=redis://localhost:6379
CELERY_BROKER_URL=redis://localhost:6379/0

# 계정 자격증명 암호화 키 (AES-256-GCM)
# 생성: openssl rand -hex 32
CREDENTIALS_ENCRYPTION_KEY=your-32-byte-hex-key

# OAuth (채널 연동)
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# TTS (선택)
CLOVA_API_KEY=

# 결제 (선택)
TOSS_SECRET_KEY=
```

---

## 데이터베이스 마이그레이션

Supabase SQL Editor에서 순서대로 실행하세요:

```
backend/database/migrations/
  001_create_accounts.sql
  002_create_videos.sql
  003_create_scripts.sql
  004_create_publish_jobs.sql
  005_create_proxy_pool.sql
  006_create_naver_shopping_logs.sql
```

---

## 개발 서버 실행

### Windows (권장) — 원클릭 실행

```powershell
# Redis + FastAPI + Next.js 동시 실행
.\start.ps1 -WithRedis

# Celery Worker 포함
.\start.ps1 -WithRedis -WithCelery
```

### 수동 실행 (터미널 4개)

```bash
# 터미널 1: Redis (Docker 필요)
docker run -d -p 6379:6379 redis:alpine

# 터미널 2: FastAPI
cd backend
uvicorn main:app --reload --port 8000

# 터미널 3: Celery Worker
cd backend
celery -A tasks.workers worker --loglevel=info --pool=solo

# 터미널 4: Next.js
npm run dev
```

접속:
- 프론트엔드: http://localhost:3000
- Swagger API 문서: http://localhost:8000/docs

---

## Docker로 실행

```bash
# 전체 스택 (Redis + FastAPI + Celery + Beat) 실행
docker compose up -d

# 로그 확인
docker compose logs -f api

# 종료
docker compose down
```

> Next.js는 Vercel 배포를 권장하므로 docker-compose에 포함되지 않습니다.

---

## 배포

### 프론트엔드 — Vercel

```bash
npx vercel --prod
```

`vercel.json`이 이미 구성되어 있습니다. Vercel 환경 변수에 `.env.local` 내용을 추가하세요.

### 백엔드 — Railway

1. [Railway](https://railway.app)에 GitHub 레포 연결
2. `backend/` 디렉토리를 루트로 설정
3. 환경 변수 (`backend/.env`) 등록
4. `railway.toml`이 빌드·실행 명령을 자동으로 적용

---

## 주요 API

Swagger 문서: `http://localhost:8000/docs`

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET`  | `/api/accounts` | 계정 목록 조회 |
| `POST` | `/api/accounts` | 계정 추가 |
| `POST` | `/api/accounts/{id}/set-default` | 기본 계정 설정 |
| `POST` | `/api/accounts/{id}/cookie/refresh` | Playwright 쿠키 갱신 |
| `POST` | `/api/sourcing/search` | 영상 검색 (도우인/샤오홍수) |
| `POST` | `/api/sourcing/download` | 영상 다운로드 (무워터마크) |
| `POST` | `/api/studio/transcribe` | Whisper STT 실행 |
| `POST` | `/api/studio/adapt` | Claude 대본 각색 |
| `POST` | `/api/studio/synthesize-tts` | TTS 합성 |
| `POST` | `/api/studio/render` | FFmpeg 렌더링 |
| `POST` | `/api/publisher/schedule` | 멀티채널 예약 배포 |
| `POST` | `/api/blog/generate` | 블로그 포스트 AI 생성 |
| `POST` | `/api/blog/publish` | 네이버 블로그 자동 등록 |
| `GET`  | `/api/proxy/list` | 프록시 목록 |
| `POST` | `/api/proxy/test` | 프록시 연결 테스트 |

---

## 멀티 계정 구조

모든 플랫폼 계정은 `accounts` 테이블에서 통합 관리됩니다.

```
소싱 계정    : douyin, xiaohongshu      → Playwright 쿠키 인증
배포 채널    : youtube, instagram, tiktok → OAuth 2.0
블로그       : naver_blog               → Playwright 쿠키 인증
커머스       : naver_shopping_connect,   → API Key
              coupang_partners,
              smartstore
```

- 동일 플랫폼에 계정 **무제한** 등록 가능
- `alias`(별명)으로 계정 구분
- `is_default=true` 계정이 기본으로 자동 선택됨
- 자격증명은 AES-256-GCM으로 암호화 후 DB 저장

---

## 주의사항

- **저작권**: 원본 영상의 출처 URL은 반드시 DB에 저장됩니다. 재창작은 참고·벤치마킹 목적으로만 사용하세요.
- **봇 감지**: 도우인·샤오홍수·네이버 블로그 자동화는 플랫폼 정책에 따라 제한될 수 있습니다. 프록시 로테이션과 딜레이를 반드시 활성화하세요.
- **쿠키 만료**: Playwright 세션 쿠키는 약 25-30일마다 갱신이 필요합니다.

---

## 라이선스

MIT License — 상업적 이용 가능

---

*Built with ❤️ by NOMAD Labs — 2026*
