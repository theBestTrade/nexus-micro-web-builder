# NOMAD Short Factory — AI Agent Context Document
# claude.md v1.2 | 2026-05-27
# Usage: Cursor / Claude Code / Lovable context injection

---

## PROJECT_IDENTITY

```
NAME: NOMAD Short Factory
TYPE: SaaS Web Application (Multi-tenant)
CONCEPT: 중국 도우인(Douyin)·샤오홍수(Xiaohongshu) 인기 숏폼을 AI로 재창작하여
         한국 멀티채널(YouTube Shorts · Instagram Reels · TikTok · 네이버 블로그)에
         자동 배포하고, 커머스 채널(쿠팡·스마트스토어·네이버쇼핑)로 전환하는 플랫폼
         ※ 플랫폼별 계정을 무제한 등록·관리할 수 있는 멀티 계정 구조 지원

REVENUE_TRACKS:
  - Track A: 중드 리컷 쇼츠 → 유튜브 광고 수익 (트래픽 자산)
  - Track B: 쇼핑 리뷰 쇼츠 → 쿠팡 파트너스 · 스마트스토어 · 네이버쇼핑 커넥트 커머스 전환
  - Track C: SaaS 외부 판매 → 크리에이터·에이전시 월정액 구독
  - Track D: AI 생성 블로그 포스트 → 네이버 블로그 자동 등록 (SEO 트래픽 + 커머스 전환)

BRAND_COLORS:
  primary:   #00C9A7  (Jade Mint)
  secondary: #2563EB  (Electric Denim)
  accent:    #F59E0B  (Amber Gold)
  highlight: #F43F5E  (Coral Red)
  bg:        #0F172A  (dark surface)

FONTS:
  heading: Bebas Neue
  body:    Noto Sans KR
```

---

## TECH_STACK

```yaml
frontend:
  framework: Next.js 14 (App Router)
  styling: Tailwind CSS + Shadcn UI
  state: Zustand
  query: TanStack Query v5
  lang: TypeScript

backend:
  framework: FastAPI (Python 3.11+)
  task_queue: Celery + Redis
  lang: Python

database:
  primary: Supabase (PostgreSQL)
  cache: Redis
  storage: Supabase Storage (video / image files)

ai_services:
  stt: OpenAI Whisper v3 (large-v3)
  llm: Anthropic Claude claude-sonnet-4-6
  tts: Edge-TTS (기본) / CLOVA Voice (프리미엄)
  audio_separation: demucs (Meta, htdemucs model)  # Spleeter → demucs 대체 (Python 3.11+ 호환)

media_processing:
  video: FFmpeg (subtitle overlay, encoding)
  crawler: Playwright (headless Chromium)          # 모든 웹 자동화·크롤링의 단일 도구
  proxy:  Playwright proxy 옵션 사용               # 프록시 서버 연동 지원
  downloader_ref:
    douyin: Douyin_TikTok_Download_API (Evil0ctal)
    xiaohongshu: XHS-Downloader (JoeanAmier)

naver_integration:
  blog: Playwright 자동화 (네이버 블로그 스마트에디터 3.0)  # 공식 API 미제공 → Playwright 대체
  shopping_connect: 네이버쇼핑 커넥트 API (CPS 제휴)
  search_ad: 네이버 검색광고 API (키워드 리서치용, 선택)

deployment:
  frontend: Vercel
  backend: Railway (or Fly.io)
  cdn: Cloudflare

auth: Supabase Auth (OAuth + Email)
payments: 토스페이먼츠
```

---

## DIRECTORY_STRUCTURE

```
/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx            # 사이드바 + 헤더 공통 레이아웃
│   │   ├── dashboard/page.tsx    # 메인 대시보드 (통계 카드)
│   │   ├── sourcing/page.tsx     # Target Finder 화면
│   │   ├── studio/page.tsx       # Adaptation Studio 화면
│   │   ├── publisher/page.tsx    # Publisher Matrix 화면 (영상 + 블로그)
│   │   └── settings/page.tsx     # 쿠키·채널·커머스·프록시 설정
│   ├── api/                      # Next.js API Routes (프록시용)
│   │   └── [...]/route.ts
│   └── page.tsx                  # 랜딩 페이지
├── components/
│   ├── ui/                       # Shadcn 자동생성 컴포넌트
│   ├── sourcing/                 # 소싱 관련 컴포넌트
│   ├── studio/                   # 스튜디오 관련 컴포넌트
│   ├── publisher/                # 배포 관련 컴포넌트
│   │   ├── VideoPublisher.tsx
│   │   └── BlogPublisher.tsx     # Track D 블로그 배포 UI
│   └── shared/                   # 공통 컴포넌트
├── lib/
│   ├── supabase/                 # Supabase 클라이언트·서버 설정
│   ├── api/                      # FastAPI 통신 헬퍼
│   └── utils/
├── backend/                      # FastAPI 서비스
│   ├── main.py
│   ├── routers/
│   │   ├── sourcing.py           # 소싱 엔드포인트
│   │   ├── studio.py             # AI 변환 엔드포인트
│   │   ├── publisher.py          # 영상 배포 엔드포인트
│   │   ├── blog.py               # Track D: 네이버 블로그 엔드포인트
│   │   └── commerce.py           # Track B: 커머스 연동 엔드포인트
│   ├── services/
│   │   ├── account_manager.py    # 멀티 계정 CRUD·암호화·기본 계정 관리
│   │   ├── downloader.py         # 무워터마크 다운로더
│   │   ├── stt.py                # Whisper STT
│   │   ├── audio_separator.py    # demucs 음성 분리
│   │   ├── script_adapter.py     # LLM 대본 각색 (Track A/B/D 분기)
│   │   ├── blog_writer.py        # Track D: LLM 블로그 포스트 생성
│   │   ├── tts.py                # TTS 합성
│   │   ├── video_editor.py       # FFmpeg 자막·인코딩
│   │   ├── channel_publisher.py  # 멀티채널 영상 배포
│   │   ├── naver_blog.py         # Track D: Playwright 네이버 블로그 자동 등록
│   │   ├── naver_shopping.py     # Track B: 네이버쇼핑 커넥트 API
│   │   └── proxy_manager.py      # 프록시 풀 관리 (Playwright 연동)
│   ├── tasks/                    # Celery 비동기 태스크
│   │   ├── pipeline.py           # 영상 파이프라인 오케스트레이터
│   │   ├── blog_pipeline.py      # Track D: 블로그 파이프라인 오케스트레이터
│   │   └── workers.py
│   └── models/                   # Pydantic 스키마
└── reference/                    # 오픈소스 레퍼런스 (git clone)
    ├── Douyin_TikTok_Download_API/
    └── XHS-Downloader/
```

---

## DATABASE_SCHEMA

```sql
-- ─────────────────────────────────────────
-- 사용자
-- ─────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free','basic','pro')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 통합 계정 테이블 (멀티 계정 핵심)
-- 소싱(douyin/xiaohongshu) + 배포(youtube/instagram/tiktok/naver_blog)
-- + 커머스(naver_shopping_connect/coupang_partners/smartstore) 계정 통합 관리
-- 동일 platform에 여러 행 허용 → 멀티 계정
-- ─────────────────────────────────────────
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- 플랫폼 구분
  platform TEXT NOT NULL CHECK (platform IN (
    -- 소싱 플랫폼
    'douyin', 'xiaohongshu',
    -- 배포 채널
    'youtube', 'instagram', 'tiktok', 'naver_blog',
    -- 커머스 제휴
    'naver_shopping_connect', 'coupang_partners', 'smartstore'
  )),

  -- 계정 식별
  alias TEXT NOT NULL,               -- 사용자 지정 별명 (예: "메인 블로그", "서브 유튜브")
  display_name TEXT,                 -- 플랫폼에서 가져온 실제 채널/계정명
  avatar_url TEXT,                   -- 계정 프로필 이미지 URL
  platform_account_id TEXT,          -- 플랫폼별 고유 ID (youtube channel_id, naver blog_id 등)

  -- OAuth 기반 인증 (youtube / instagram / tiktok)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- 자격증명 기반 인증 (naver_blog / douyin / xiaohongshu — Playwright 세션)
  -- 값은 AES-256 암호화 후 저장, 복호화 키는 ENV에서만 참조
  credentials_encrypted JSONB,       -- { "id": "암호화값", "pw": "암호화값" }

  -- 커머스 계정 전용
  partner_id TEXT,                   -- 네이버쇼핑 파트너 ID / 쿠팡 파트너스 ID
  affiliate_url TEXT,                -- 스마트스토어 URL 등

  -- 계정 상태
  is_default BOOLEAN DEFAULT false,  -- 플랫폼별 기본 계정 (user_id + platform 조합으로 1개만 true)
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  health_status TEXT DEFAULT 'unknown'
    CHECK (health_status IN ('unknown','healthy','cookie_expired','token_expired','banned','error')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 동일 user + platform + alias 중복 방지
  UNIQUE (user_id, platform, alias)
);

-- 플랫폼별 기본 계정은 1개만 허용 (부분 유니크 인덱스)
CREATE UNIQUE INDEX idx_accounts_default
  ON accounts (user_id, platform)
  WHERE is_default = true;

-- ─────────────────────────────────────────
-- 쿠키 관리 (Playwright 세션, 계정별 독립 관리)
-- ─────────────────────────────────────────
CREATE TABLE platform_cookies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,  -- 계정별 1:1
  cookies JSONB NOT NULL,            -- Playwright context.cookies() 결과
  refreshed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,            -- 예상 만료 시각 (플랫폼별 정책 반영)
  UNIQUE (account_id)                -- 계정당 쿠키 1행
);

-- ─────────────────────────────────────────
-- 소싱된 영상
-- ─────────────────────────────────────────
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sourcing_account_id UUID REFERENCES accounts(id),  -- 소싱에 사용된 계정 (douyin/xiaohongshu)
  platform TEXT NOT NULL CHECK (platform IN ('douyin','xiaohongshu')),
  track TEXT NOT NULL CHECK (track IN ('A','B','D')),
  original_url TEXT NOT NULL,
  file_path TEXT,
  title_cn TEXT,
  viral_score INTEGER,
  likes INTEGER,
  shares INTEGER,
  status TEXT DEFAULT 'sourced'
    CHECK (status IN ('sourced','downloading','downloaded','processing','ready','published')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- AI 변환 결과 (영상)
-- ─────────────────────────────────────────
CREATE TABLE scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  raw_stt TEXT,
  adapted_script TEXT,
  tts_audio_path TEXT,
  final_video_path TEXT,
  bgm_preserved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Track D: 블로그 포스트
-- ─────────────────────────────────────────
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  script_id UUID REFERENCES scripts(id),
  publish_account_id UUID REFERENCES accounts(id),   -- 등록에 사용할 naver_blog 계정
  title_ko TEXT NOT NULL,
  body_html TEXT NOT NULL,
  thumbnail_path TEXT,
  tags TEXT[],
  commerce_links JSONB,              -- { coupang?: str, smartstore?: str, naver_shopping?: str }
  naver_post_url TEXT,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','generating','ready','publishing','published','failed')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 배포 작업 (영상)
-- ─────────────────────────────────────────
CREATE TABLE publish_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id),
  publish_account_id UUID REFERENCES accounts(id),   -- 배포에 사용할 계정
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','scheduled','uploading','published','failed')),
  platform_video_id TEXT,
  commerce_link TEXT,
  naver_shopping_product_id TEXT,
  geo_metadata JSONB,
  error_msg TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 프록시 풀 관리
-- ─────────────────────────────────────────
CREATE TABLE proxy_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  proxy_url TEXT NOT NULL,           -- "http://user:pass@host:port"
  proxy_type TEXT DEFAULT 'http' CHECK (proxy_type IN ('http','https','socks5')),
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  fail_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Track B: 네이버쇼핑 커넥트 커미션 로그
-- ─────────────────────────────────────────
CREATE TABLE naver_shopping_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commerce_account_id UUID REFERENCES accounts(id),  -- 어느 커넥트 계정의 수익인지
  video_id UUID REFERENCES videos(id),
  product_id TEXT,
  product_name TEXT,
  commission_rate NUMERIC(5,2),
  click_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  estimated_revenue NUMERIC(12,2),
  logged_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 멀티 계정 설계 원칙

```
accounts 테이블 = 모든 플랫폼 계정의 단일 진실 공급원(Single Source of Truth)

계정 유형별 사용 필드:
┌──────────────────────────┬──────────────────────────────────────────────────┐
│ platform                 │ 주요 사용 필드                                    │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ youtube / instagram      │ access_token, refresh_token, token_expires_at    │
│ tiktok                   │ access_token, refresh_token, platform_account_id │
│ naver_blog / douyin /    │ credentials_encrypted (id/pw),                   │
│ xiaohongshu              │ → platform_cookies 테이블에 세션 쿠키 별도 저장  │
│ naver_shopping_connect   │ partner_id, access_token (API 키)                │
│ coupang_partners         │ partner_id, credentials_encrypted (API Key/Secret│
│ smartstore               │ affiliate_url, credentials_encrypted             │
└──────────────────────────┴──────────────────────────────────────────────────┘

is_default 규칙:
- 같은 user + platform 조합에서 is_default=true 는 1개만 허용 (부분 유니크 인덱스)
- 새 계정 추가 시 기존 계정이 없으면 자동으로 is_default=true
- 발행/배포 시 account_id 미지정 → is_default=true 계정 자동 사용

credentials_encrypted 암호화:
- AES-256-GCM 사용 (services/account_manager.py)
- 암호화 키: ENV CREDENTIALS_ENCRYPTION_KEY (32byte hex)
- DB에는 { "iv": "...", "tag": "...", "data": "..." } 형태로 저장
```

---

## API_ENDPOINTS

```
# FastAPI Backend (base: http://localhost:8000)

## ─────────────────────────────────────────
## 계정 관리 모듈 (멀티 계정)
## ─────────────────────────────────────────

GET  /api/accounts
  query: { platform?: str }
  returns: [ { id, platform, alias, display_name, avatar_url, is_default,
               is_active, health_status, last_used_at } ]
  note: credentials_encrypted / access_token 은 응답에 포함하지 않음 (보안)

POST /api/accounts
  body: {
    platform: str,
    alias: str,
    # OAuth 계정 (youtube/instagram/tiktok)
    access_token?: str, refresh_token?: str, token_expires_at?: datetime,
    platform_account_id?: str, display_name?: str, avatar_url?: str,
    # 자격증명 계정 (naver_blog/douyin/xiaohongshu)
    login_id?: str, login_pw?: str,          # 서버에서 암호화 후 저장
    # 커머스 계정 (naver_shopping_connect/coupang_partners/smartstore)
    partner_id?: str, affiliate_url?: str,
    api_key?: str, api_secret?: str,         # 서버에서 암호화 후 저장
    is_default?: bool
  }
  returns: { account }

PUT  /api/accounts/{account_id}
  body: { alias?, login_id?, login_pw?, is_default?, is_active? }
  returns: { account }
  note: is_default=true 설정 시 같은 platform의 기존 default 자동 해제

DELETE /api/accounts/{account_id}
  returns: { success: bool }

POST /api/accounts/{account_id}/set-default
  returns: { account }
  note: 같은 user + platform 내 기존 default 계정을 false로 변경

POST /api/accounts/{account_id}/test
  body: { proxy_id?: str }
  returns: { success: bool, health_status: str, latency_ms?: int, error?: str }
  note: Playwright 로그인 또는 API 호출로 계정 연결 상태 실시간 확인
  action: 결과를 accounts.health_status 에 업데이트

POST /api/accounts/{account_id}/cookie/refresh
  body: { proxy_id?: str }
  returns: { success: bool, expires_at?: datetime }
  note: 자격증명 계정(naver_blog/douyin/xiaohongshu)의 Playwright 쿠키 갱신

GET  /api/accounts/{account_id}/cookie
  returns: { refreshed_at, expires_at, health_status }
  note: 쿠키 원문은 반환하지 않음

## ─────────────────────────────────────────
## 소싱 모듈
## ─────────────────────────────────────────

POST /api/sourcing/search
  body: {
    keyword: str,
    platform: "douyin"|"xiaohongshu",
    track: "A"|"B"|"D",
    limit: int,
    account_id?: str,   # 미지정 시 해당 platform의 is_default 계정 사용
    proxy_id?: str
  }
  returns: [ { video_id, title_cn, thumbnail, likes, shares, viral_score, original_url } ]

POST /api/sourcing/download
  body: { video_id: str, account_id?: str, proxy_id?: str }
  returns: { task_id: str, status: "queued" }

GET  /api/sourcing/status/{task_id}
  returns: { status, progress, file_path? }

## ─────────────────────────────────────────
## AI 변환 모듈
## ─────────────────────────────────────────

POST /api/studio/transcribe
  body: { video_id: str }
  returns: { task_id: str }

POST /api/studio/adapt
  body: { video_id: str, track: "A"|"B"|"D", tone?: str }
  returns: { task_id: str }
  note:
    Track A → "기승전결 압축·도파민형"
    Track B → "위트 리뷰어 톤 + 커머스 전환"
    Track D → "블로그 포스트용 상세 리뷰 톤"

POST /api/studio/synthesize-tts
  body: { script_id: str, voice: "edge-tts"|"clova", voice_id: str }
  returns: { task_id: str }

POST /api/studio/render
  body: { script_id: str, font: str, subtitle_style: obj }
  returns: { task_id: str }

## ─────────────────────────────────────────
## 영상 배포 모듈
## ─────────────────────────────────────────

POST /api/publisher/schedule
  body: {
    script_id: str,
    publish_targets: [
      {
        account_id: str,     # 배포할 계정 (youtube/instagram/tiktok/naver_blog 중 선택)
        scheduled_at: datetime
      }
    ],
    commerce_link?: str,
    proxy_id?: str
  }
  returns: { job_ids: [ str ] }

GET  /api/publisher/jobs
  query: { account_id?: str }   # 특정 계정 필터링
  returns: [ publish_job ]

POST /api/publisher/geo-metadata
  body: { script_id: str }
  returns: { title, description, tags, context_summary, faq_schema }

## ─────────────────────────────────────────
## Track B: 네이버쇼핑 커넥트 모듈
## ─────────────────────────────────────────

POST /api/commerce/naver-shopping/search
  body: {
    keyword: str,
    category_id?: str,
    limit: int,
    account_id?: str    # 미지정 시 naver_shopping_connect is_default 계정
  }
  returns: [ { product_id, product_name, price, commission_rate, product_url, thumbnail } ]

POST /api/commerce/naver-shopping/link
  body: { video_id: str, product_id: str, account_id?: str }
  returns: { tracking_url: str, commission_rate: float }

GET  /api/commerce/naver-shopping/stats
  query: { account_id?: str, from: date, to: date }
  returns: [ naver_shopping_log ]

## ─────────────────────────────────────────
## Track D: 네이버 블로그 모듈
## ─────────────────────────────────────────

POST /api/blog/generate
  body: { video_id: str, script_id?: str, style: "review"|"info"|"story" }
  returns: { task_id: str }
  note: LLM이 영상 대본 기반으로 블로그 HTML 본문 생성

GET  /api/blog/preview/{blog_post_id}
  returns: { title_ko, body_html, tags, commerce_links }

PUT  /api/blog/{blog_post_id}
  body: { title_ko?, body_html?, tags?, commerce_links?, publish_account_id? }
  returns: { blog_post }

POST /api/blog/publish
  body: {
    blog_post_id: str,
    account_id: str,         # naver_blog 계정 (멀티 계정 중 선택)
    scheduled_at?: datetime,
    proxy_id?: str
  }
  returns: { task_id: str }
  note: Playwright로 네이버 블로그 스마트에디터에 자동 등록

GET  /api/blog/jobs
  query: { account_id?: str }
  returns: [ { blog_post_id, status, naver_post_url, published_at,
               account: { alias, display_name } } ]

## ─────────────────────────────────────────
## 프록시 관리 모듈
## ─────────────────────────────────────────

GET  /api/proxy/list
  returns: [ proxy_pool ]

POST /api/proxy/add
  body: { proxy_url: str, proxy_type: "http"|"https"|"socks5", label?: str }
  returns: { proxy }

DELETE /api/proxy/{proxy_id}

POST /api/proxy/test
  body: { proxy_id: str, target_url: str }
  returns: { success: bool, latency_ms: int, error?: str }
  note: Playwright로 실제 접속 테스트
```

---

## USER_FLOW

```
랜딩 페이지(/)
  └─ 회원가입 / 로그인 (/login)
       └─ 대시보드 (/dashboard)
            │  통계 카드: 소싱 수·완성 영상·블로그 포스트 수·배포 수·수익 추정
            │
            ├─ Target Finder (/sourcing)
            │    1. 플랫폼 선택 (도우인 | 샤오홍수) 탭
            │    2. Track 선택 (A: 중드 | B: 쇼핑 | D: 블로그 전환) 필터 칩
            │    3. 키워드 검색 → 바이럴 스코어 정렬 그리드
            │    4. 카드 선택 → "다운로드" 버튼 → Celery 큐 진입
            │
            ├─ Adaptation Studio (/studio)
            │    1. 다운로드 완료 영상 리스트
            │    2. 선택 → 좌: 원본 플레이어 / 우: AI 대본 에디터
            │    3. STT 실행 → LLM 각색 (Track 별 톤 분기) → 인라인 수정
            │    4. TTS 성우 콤보박스 선택 → 미리듣기 → 렌더링
            │    5. Track D: "블로그 포스트 생성" 버튼 → blog_writer 파이프라인 진입
            │
            ├─ Publisher Matrix (/publisher)
            │    ┌─ [영상 배포] 탭
            │    │    1. 완성 영상 카드 그리드
            │    │    2. 배포 계정 멀티선택
            │    │       - 플랫폼별 드롭다운 (등록된 계정 목록 표시)
            │    │       - 기본 계정 🏷 표시, 계정별 예약 시간 입력
            │    │    3. GEO 메타데이터 검토 탭 (수동 수정 가능)
            │    │    4. Track B: 커머스 링크 입력
            │    │       - 쿠팡 파트너스 URL
            │    │       - 스마트스토어 URL
            │    │       - 네이버쇼핑 커넥트: 계정 선택 → 상품 검색 → 트래킹 URL 자동 생성
            │    │    5. "예약 배포" → 스케줄러 등록
            │    │
            │    └─ [블로그 배포] 탭  ← Track D
            │         1. 생성된 블로그 포스트 카드 그리드
            │         2. 포스트 선택 → 미리보기 (HTML 렌더링)
            │         3. 제목·본문·태그 인라인 수정
            │         4. 커머스 링크 입력
            │            - 쿠팡 파트너스 URL
            │            - 스마트스토어 URL
            │            - 네이버쇼핑 커넥트 트래킹 URL
            │         5. 네이버 블로그 계정 선택 드롭다운
            │            (등록된 naver_blog 계정 전체 표시, 기본 계정 🏷 표시)
            │         6. 예약 시간 입력
            │         7. "예약 등록" → Playwright 블로그 배포 큐 진입
            │
            └─ Settings (/settings)
                 │
                 ├─ [계정 관리] 탭 ← 멀티 계정 핵심 화면
                 │   플랫폼 그룹별 아코디언 UI
                 │   ┌─ 소싱 계정 (도우인 / 샤오홍수)
                 │   │   - 계정 카드 목록: 별명·로그인ID·쿠키 상태·마지막 사용일
                 │   │   - [+ 계정 추가] → 별명·ID·PW 입력 모달
                 │   │   - 계정 카드 액션: [기본 설정] [쿠키 갱신] [연결 테스트] [삭제]
                 │   │   - 기본 계정: 별명 옆 🏷 뱃지
                 │   │
                 │   ├─ 배포 채널 (YouTube / Instagram / TikTok)
                 │   │   - 계정 카드: 채널명·썸네일·OAuth 상태·토큰 만료일
                 │   │   - [+ 채널 추가] → OAuth 흐름 팝업
                 │   │   - 계정 카드 액션: [기본 설정] [토큰 갱신] [연결 테스트] [삭제]
                 │   │
                 │   ├─ 네이버 블로그 계정
                 │   │   - 계정 카드: 블로그명·네이버ID·쿠키 상태·예상 만료일
                 │   │   - [+ 계정 추가] → 별명·네이버ID·PW 입력 모달
                 │   │     (PW는 AES-256-GCM 암호화 후 저장, 화면에 재노출 안 함)
                 │   │   - 계정 카드 액션: [기본 설정] [쿠키 갱신] [연결 테스트] [삭제]
                 │   │
                 │   └─ 커머스 계정
                 │       ┌─ 네이버쇼핑 커넥트: 파트너ID·API키·상태
                 │       ├─ 쿠팡 파트너스: 파트너ID·API Key/Secret
                 │       └─ 스마트스토어: 스토어 URL·API 자격증명
                 │       → 각각 [+ 계정 추가] 버튼으로 여러 계정 등록 가능
                 │
                 └─ [프록시 설정] 탭
                      - 프록시 URL 목록 관리 (추가·삭제·테스트)
                      - 자동 프록시 로테이션 ON/OFF
```

---

## PIPELINE_LOGIC

```python
# Celery 영상 파이프라인 (pipeline.py)

PIPELINE_STAGES = [
  "download",          # 무워터마크 MP4 추출
  "stt",               # Whisper 중국어 음성→텍스트
  "audio_separate",    # demucs BGM/보이스 분리
  "adapt_script",      # LLM 대본 각색 (Track A/B/D 분기)
  "tts",               # 한국어 TTS 합성
  "render",            # FFmpeg 자막 오버레이 + 오디오 믹싱
  "geo_metadata",      # GEO Context Summary 생성
  "publish",           # 채널 API 업로드
]

# Celery Track D 블로그 파이프라인 (blog_pipeline.py)
BLOG_PIPELINE_STAGES = [
  "download",          # 영상 다운로드 (공유)
  "stt",               # STT (공유)
  "generate_blog",     # LLM 블로그 포스트 HTML 생성
  "attach_commerce",   # 커머스 링크 삽입 (쿠팡·스마트스토어·네이버쇼핑)
  "upload_images",     # 썸네일·본문 이미지 Supabase Storage 업로드
  "publish_blog",      # Playwright 네이버 블로그 자동 등록
]

# ─────────────────────────────────────────
# Track 분기 LLM 프롬프트 시스템
# ─────────────────────────────────────────

TRACK_A_SYSTEM = """
너는 한국 유튜브 쇼츠 편집자야. 중국어 드라마 클립의 STT 텍스트를 받아,
한국 시청자가 3초 내 이탈하지 않도록 기승전결을 극대화하고
도파민을 유도하는 한국어 대본으로 재구성해.
출력: 한국어 대본만. 설명 없이.
"""

TRACK_B_SYSTEM = """
너는 한국 인플루언서 리뷰어야. 중국 쇼핑 영상의 STT 텍스트를 받아,
위트 있는 '내돈내산 리뷰' 또는 '정보성 꿀팁' 톤앤매너로 변환해.
상품 핵심 장점 3가지를 자연스럽게 녹여내고,
영상 말미에 "아래 링크에서 구매할 수 있어요!" 형태의 CTA를 자연스럽게 삽입해.
출력: 한국어 대본만. 설명 없이.
"""

TRACK_D_BLOG_SYSTEM = """
너는 한국 파워블로거야. 중국 쇼핑 영상의 STT 텍스트 또는 영상 대본을 받아,
네이버 블로그에 최적화된 상세 리뷰 포스트를 HTML 형식으로 작성해.

작성 규칙:
1. 제목: 검색 유입 키워드 포함, 30자 이내
2. 도입부: 구매 배경·공감 스토리 (3~4문장)
3. 본문 구성:
   - 상품 스펙 요약 (표 또는 리스트)
   - 장점 3가지 + 단점 1가지 (신뢰감 형성)
   - 실사용 후기 (구체적 수치·비교 포함)
4. 마무리: 구매 추천 대상 + CTA (링크 플레이스홀더: {{COMMERCE_LINK}})
5. 태그: 핵심 키워드 10개 이내 (쉼표 구분)

출력 형식:
---TITLE---
{제목}
---BODY_HTML---
{HTML 본문}
---TAGS---
{태그1,태그2,...}
---
"""
```

---

## PLAYWRIGHT_PROXY_SPEC

```python
# ─────────────────────────────────────────
# Playwright 프록시 설정 표준 (proxy_manager.py)
# ─────────────────────────────────────────

# 프록시 풀에서 라운드로빈 또는 가중치 기반 선택
# Playwright launch 옵션에 proxy 파라미터로 주입

# 기본 프록시 설정 구조
PROXY_CONFIG_EXAMPLE = {
    "server": "http://host:port",          # 또는 socks5://host:port
    "username": "user",                    # 인증이 필요한 경우
    "password": "pass",
}

# proxy_manager.py 핵심 로직
class ProxyManager:
    """
    - DB의 proxy_pool 테이블에서 활성 프록시 목록 조회
    - fail_count >= 3 이면 자동 비활성화
    - get_proxy() → 가장 최근에 사용되지 않은 프록시 반환 (라운드로빈)
    - mark_failed(proxy_id) → fail_count 증가
    - mark_success(proxy_id) → fail_count 초기화, last_used_at 갱신
    """
    async def get_proxy(self, user_id: str) -> dict | None: ...
    async def mark_failed(self, proxy_id: str) -> None: ...
    async def mark_success(self, proxy_id: str) -> None: ...

# Playwright 호출 예시 (서비스 공통 패턴)
async def launch_browser_with_proxy(proxy_id: str | None = None):
    proxy_cfg = None
    if proxy_id:
        proxy = await proxy_manager.get_proxy(proxy_id)
        if proxy:
            proxy_cfg = {
                "server": proxy["proxy_url"],
                # username/password는 URL에 포함된 경우 자동 파싱
            }
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            proxy=proxy_cfg,         # None이면 직접 연결
        )
        return browser

# 적용 대상 서비스
PLAYWRIGHT_SERVICES = [
    "downloader.py",       # 도우인·샤오홍수 다운로드
    "naver_blog.py",       # 네이버 블로그 자동 등록
    "platform_cookies.py", # 쿠키 자동 갱신
]

# 프록시 미설정 시: 직접 연결 (proxy=None)
# 프록시 설정 시: 모든 Playwright 세션에 자동 주입
```

---

## NAVER_BLOG_AUTOMATION_SPEC

```python
# ─────────────────────────────────────────
# 네이버 블로그 Playwright 자동 등록 (naver_blog.py)
# ─────────────────────────────────────────

# 네이버 블로그는 공식 외부 API 미제공
# → Playwright headless Chromium으로 스마트에디터 3.0 조작

NAVER_BLOG_FLOW = [
    "0. accounts 테이블에서 account_id로 계정 조회 → credentials_encrypted 복호화",
    "1. platform_cookies에서 account_id로 쿠키 조회 → 만료 시 자동 재로그인",
    "2. https://blog.naver.com/{platform_account_id}/postwrite 접근",
    "3. 스마트에디터 3.0 iframe 내 contenteditable 영역에 HTML 삽입",
    "4. 제목 입력 (input#subject)",
    "5. 태그 입력 (최대 10개)",
    "6. 대표 이미지 업로드 (파일 드롭 또는 첨부 버튼)",
    "7. '발행' 버튼 클릭",
    "8. 발행 완료 URL 파싱 → DB blog_posts.naver_post_url 저장",
    "9. accounts.last_used_at, health_status='healthy' 업데이트",
]

# 멀티 계정 처리: account_id별로 독립된 Playwright context 사용
# (같은 프로세스에서 여러 네이버 계정 동시 운용 가능)

# 스마트에디터 HTML 삽입 전략
# - iframe: #mainFrame 내부의 contenteditable div
# - page.frame('mainFrame').evaluate() 로 innerHTML 주입
# - 이미지: Supabase Storage CDN URL 사용 (외부 이미지 그대로 삽입)

# 봇 감지 회피 전략
ANTI_BOT_MEASURES = [
    "random.uniform(1.5, 4.0) 초 딜레이 (타이핑 시뮬레이션)",
    "page.mouse.move() 랜덤 이동",
    "user_agent: 최신 Chrome 실제 UA 문자열 사용",
    "viewport: 1920x1080 고정",
    "proxy 로테이션 (ProxyManager 연동)",
]

# 네이버 블로그 쿠키 갱신 주기
COOKIE_REFRESH_INTERVAL_DAYS = 25  # 30일 만료 전 5일 여유
```

---

## NAVER_SHOPPING_CONNECT_SPEC

```
# ─────────────────────────────────────────
# 네이버쇼핑 커넥트 CPS 제휴 연동 (naver_shopping.py)
# ─────────────────────────────────────────

# 네이버쇼핑 커넥트: CPS(Cost Per Sale) 방식 제휴 마케팅
# 공식 API: https://shopping.naver.com/connect (제휴사 신청 필요)

NAVER_SHOPPING_FLOW:
  1. 제휴사 가입 및 API 키 발급 (네이버쇼핑 커넥트 파트너센터)
  2. 상품 검색 API로 키워드 관련 상품 조회
  3. 트래킹 URL 생성 (제휴 ID 파라미터 포함)
  4. 영상 고정 댓글 / 블로그 포스트 본문에 트래킹 URL 삽입
  5. 전환 성과 조회 API로 수익 집계

API_BASE: https://api.shopping.naver.com/connect/v1
HEADERS:
  Authorization: Bearer {NAVER_SHOPPING_CONNECT_API_KEY}
  X-Partner-Id: {NAVER_SHOPPING_PARTNER_ID}

ENDPOINTS:
  GET  /products/search?keyword={kw}&limit={n}
  POST /tracking-url
    body: { product_id: str, partner_id: str, sub_id?: str }
    returns: { tracking_url: str }
  GET  /stats?from={date}&to={date}
    returns: [ { product_id, clicks, conversions, revenue } ]

# Track B 커머스 우선순위
COMMERCE_PRIORITY = ["naver_shopping_connect", "coupang_partners", "smartstore"]
# → 네이버쇼핑 커넥트 상품이 있으면 우선 삽입, 없으면 쿠팡/스마트스토어 폴백
```

---

## GEO_METADATA_SPEC

```
# GEO (Generative Engine Optimization) 메타데이터 구조
# AI 검색 엔진(ChatGPT Search, Perplexity, Gemini)의 딥인덱싱을 위한 구조화 텍스트
# 유튜브 영상 설명란 상단 + 네이버 블로그 포스트 하단에 삽입

FORMAT:
---
[영상 요약]
{2~3문장 핵심 가치 요약 — 명확한 주어·술어 구조}

[주요 정보]
- 콘텐츠 유형: {드라마 리컷 | 쇼핑 리뷰 | 블로그 리뷰}
- 주요 키워드: {entity1}, {entity2}, {entity3}
- 대상 시청자: {타겟 페르소나}

[FAQ]
Q: {핵심 질문 1}
A: {간결한 답변}

Q: {핵심 질문 2}
A: {간결한 답변}
---
```

---

## EDGE_CASES

```
# 반드시 처리해야 할 엣지케이스 목록

1. COOKIE_EXPIRY
   - 증상: 도우인·샤오홍수·네이버 블로그 세션 만료로 작업 실패
   - 처리: /settings 쿠키 관리 UI에서 Playwright 자동 캡처 트리거
   - 폴백: 오류 알림 토스트 + 수동 갱신 안내
   - 네이버 블로그: 30일 주기 만료 → 25일마다 자동 갱신 시도

2. BGM_VOICE_SEPARATION
   - 도구: demucs (Meta, htdemucs model) — Python 3.11+ 호환
   - 전략: BGM 트랙 보존 + vocals 트랙 제거 → 한국어 TTS 레이어 믹싱

3. RATE_LIMIT
   - Celery 태스크에 random.uniform(2, 5) 초 딜레이 적용
   - 실패 시 exponential backoff 재시도 (max 3회)
   - 네이버 블로그: 일 1회 이상 포스팅 시 프록시 로테이션 권장

4. VIDEO_QUALITY
   - 최소 해상도: 720p (1280×720)
   - 최대 용량: 500MB (Supabase Storage 제한 고려)
   - 거부 시: "해상도 부족" 경고 배지 표시

5. TTS_SYNC
   - TTS 오디오 길이 > 원본 영상 길이인 경우 FFmpeg -atempo로 속도 조정
   - 허용 범위: ±20%

6. CHANNEL_TOKEN_EXPIRY
   - OAuth 토큰 만료 7일 전 대시보드 배너 경고
   - 만료 시 자동 refresh_token 갱신 시도

7. COPYRIGHT_SAFEGUARD
   - 원본 source_url DB 저장 필수
   - 서비스 이용약관에 재창작 가이드라인 명시
   - 상업적 재배포가 아닌 "참고·벤치마킹" 목적 명시

8. PROXY_FAILURE
   - 프록시 접속 실패 시 fail_count 증가 → 3회 이상 자동 비활성화
   - 활성 프록시 0개인 경우: 직접 연결로 폴백 + 대시보드 경고 배지
   - proxy_pool 테이블에서 실시간 상태 조회

9. DUPLICATE_ACCOUNT
   - 동일 user + platform + alias 등록 시도: UNIQUE 제약으로 DB에서 차단
   - API 레이어: 409 Conflict + "이미 같은 별명의 계정이 있습니다" 메시지
   - alias가 다르면 동일 platform에 계정 무제한 추가 가능

10. ACCOUNT_IS_DEFAULT_CONFLICT
    - is_default=true 설정 시 같은 user + platform의 기존 default를 트랜잭션으로 false 처리
    - 레이스 컨디션 방지: 부분 유니크 인덱스(idx_accounts_default) + DB 트랜잭션

11. ACCOUNT_DELETION_SAFETY
    - 배포 진행 중(publish_jobs.status IN ('scheduled','uploading'))인 계정 삭제 시도: 409 반환
    - publish_jobs, blog_posts의 publish_account_id는 ON DELETE SET NULL (기록 보존)
    - is_default 계정 삭제 후 남은 계정이 있으면 가장 오래된 계정을 자동으로 default 지정

12. NAVER_BLOG_BOT_DETECTION
    - 네이버가 자동화 감지 시: CAPTCHA 화면으로 리다이렉트
    - 처리: 작업 실패로 마킹 + 사용자에게 수동 처리 요청 토스트
    - 예방: 타이핑 딜레이·마우스 이동·프록시 로테이션 적용

13. NAVER_SHOPPING_PRODUCT_NOT_FOUND
    - 키워드 검색 결과 없음 → 쿠팡 파트너스 URL 폴백
    - 트래킹 URL 만료 → 주기적 재생성 (매월 1회 Celery beat)

14. BLOG_HTML_INJECTION_FAIL
    - 스마트에디터 3.0 iframe 로딩 실패 또는 DOM 구조 변경
    - 처리: 재시도 1회 → 실패 시 draft 상태 유지 + 사용자 알림
    - 모니터링: 스마트에디터 셀렉터 변경 감지 로직 (월 1회 셀렉터 검증)
```

---

## UI_COMPONENT_RULES

```
# Shadcn UI 컴포넌트 사용 원칙

LAYOUT: 메인(랜딩) → 로그인 → 대시보드 (이 순서 고정)

SIDEBAR:
  - 항목: Target Finder / Adaptation Studio / Publisher Matrix / Settings
  - 아이콘: Lucide React
  - 활성 상태: Electric Denim (#2563EB) 강조

DASHBOARD_CARDS:
  - 소싱된 영상 수 / 완성 영상 수 / 블로그 포스트 수 / 배포 완료 / 예상 수익
  - 각각 Shadcn Card + Badge

VIDEO_GRID:
  - 썸네일 + 플랫폼 뱃지 (도우인=빨강, 샤오홍수=분홍) + 트랙 뱃지 + 바이럴 스코어
  - Shadcn AspectRatio + Badge

TRACK_BADGE_COLORS:
  Track A → Electric Denim (#2563EB)
  Track B → Amber Gold (#F59E0B)
  Track D → Jade Mint (#00C9A7)  ← 블로그 트랙

STUDIO_LAYOUT:
  - 좌우 분할: ResizablePanelGroup (Shadcn)
  - 좌: 원본 비디오 플레이어 (HTML5 <video>)
  - 우: Textarea (대본) + Select (TTS 성우) + Button (미리듣기)
  - Track D 추가 버튼: "블로그 포스트 생성" (Jade Mint 색상)

PUBLISHER_TABS:
  - [영상 배포] / [블로그 배포] Tabs 컴포넌트로 분리

ACCOUNT_CARD:
  - 컴포넌트: Shadcn Card + Avatar + Badge (상태)
  - 기본 계정 표시: 별명 옆 🏷 뱃지 (Jade Mint 배경)
  - health_status 색상:
      healthy        → green dot
      cookie_expired → amber dot + "쿠키 갱신 필요" 툴팁
      token_expired  → red dot + "토큰 갱신 필요" 툴팁
      banned         → red dot + "계정 차단됨" 툴팁
      unknown        → gray dot
  - 카드 액션 버튼 (아이콘 버튼 row):
      [기본 설정] [쿠키/토큰 갱신] [연결 테스트] [수정] [삭제]
  - [+ 계정 추가] 버튼: Shadcn Dialog 모달로 입력 폼 표시

ACCOUNT_SELECTOR (Publisher/Sourcing에서 계정 선택):
  - Shadcn Select 드롭다운
  - 옵션 렌더링: Avatar + 별명 + 플랫폼 + 기본계정 🏷
  - 기본값: is_default=true 계정 자동 선택

STATUS_BADGES:
  sourced      → gray
  downloading  → blue (animate-pulse)
  processing   → amber (animate-pulse)
  ready        → green
  published    → teal
  failed       → red
  # 블로그 전용
  draft        → gray
  generating   → amber (animate-pulse)
  publishing   → blue (animate-pulse)

TOAST:
  - 성공: Jade Mint (#00C9A7)
  - 실패: Coral Red (#F43F5E)
  - 경고: Amber Gold (#F59E0B)
  - Shadcn Sonner 사용
```

---

## ENV_VARIABLES

```bash
# .env.local (Next.js)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# .env (FastAPI backend)
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
REDIS_URL=redis://localhost:6379
CELERY_BROKER_URL=redis://localhost:6379/0
CLOVA_API_KEY=
TOSS_SECRET_KEY=

# OAuth (채널 연동)
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# 계정 자격증명 암호화 키 (AES-256-GCM, accounts.credentials_encrypted)
CREDENTIALS_ENCRYPTION_KEY=           # 32byte hex (openssl rand -hex 32 로 생성)

# ※ 네이버 ID/PW, 쇼핑커넥트 API 키, 쿠팡 API Key/Secret 등
#   개별 계정 자격증명은 ENV에 하드코딩하지 않고
#   /api/accounts POST 를 통해 DB(accounts 테이블)에 암호화 저장

# 프록시 (기본 프록시, DB proxy_pool로 다중 관리)
DEFAULT_PROXY_URL=                     # 선택: "http://user:pass@host:port"
```

---

## CODING_RULES

```
1. 모든 API 통신은 TanStack Query useMutation / useQuery 사용
2. Supabase 클라이언트: server-side는 createServerClient, client-side는 createBrowserClient
3. FastAPI 라우터는 반드시 APIRouter로 모듈 분리
4. Celery 태스크는 @app.task(bind=True) 데코레이터, 상태는 DB에 저장
5. 에러 처리: FastAPI HTTPException + Next.js toast (Sonner)
6. TypeScript strict mode 활성화
7. 환경변수는 반드시 .env에서만 참조, 하드코딩 금지
8. 영상·이미지 파일은 Supabase Storage에만 저장, 로컬 /tmp는 처리 중간 파일만
9. 컴포넌트 네이밍: PascalCase, 훅: use prefix, 유틸: camelCase
10. Shadcn 커스텀 시 globals.css CSS 변수만 수정, 컴포넌트 직접 수정 금지
11. 모든 웹 자동화·크롤링은 Playwright (headless Chromium) 단일 도구 사용
    - requests/selenium/puppeteer 혼용 금지
    - 프록시는 반드시 ProxyManager를 통해 주입, 하드코딩 금지
12. 계정 자격증명(ID/PW/API Key)은 반드시 accounts.credentials_encrypted에 AES-256-GCM으로 저장
    - 복호화는 services/account_manager.py 에서만 처리
    - API 응답에 credentials_encrypted, access_token, login_pw 절대 포함 금지
13. 멀티 계정 기본값 처리: account_id 미지정 시 → accounts WHERE is_default=true AND platform=? AND user_id=? 자동 조회
14. 네이버 관련 Playwright 세션: 쿠키는 platform_cookies 테이블에 암호화 저장 (account_id 연결 필수)
15. demucs 모델: htdemucs (4-stem) 사용, GPU 없으면 CPU 모드로 폴백
```

---

## QUICK_START_COMMANDS

```bash
# 레퍼런스 다운로더 클론
git clone https://github.com/Evil0ctal/Douyin_TikTok_Download_API reference/Douyin_TikTok_Download_API
git clone https://github.com/JoeanAmier/XHS-Downloader reference/XHS-Downloader

# 프론트엔드 세팅
npx create-next-app@latest nomad-short-factory --typescript --tailwind --app
cd nomad-short-factory
npx shadcn@latest init
npx shadcn@latest add button card input tabs badge select dialog textarea resizable sonner

# 백엔드 세팅
cd backend
pip install fastapi uvicorn httpx pydantic \
    playwright openai anthropic \
    celery redis \
    demucs torch torchaudio \
    moviepy \
    cryptography  # 네이버 자격증명 암호화
python -m playwright install chromium

# 개발 서버 실행
# 터미널 1: Next.js
npm run dev

# 터미널 2: FastAPI
uvicorn main:app --reload --port 8000

# 터미널 3: Celery worker
celery -A tasks.workers worker --loglevel=info

# 터미널 4: Celery beat (주기 태스크 — 쿠키 갱신, 쇼핑 트래킹 URL 갱신)
celery -A tasks.workers beat --loglevel=info
```

---

## PHASE_KICKOFF_PROMPTS

```
# Cursor/Claude Code에 직접 붙여넣기

## Phase 0 착수 (멀티 계정 기반)
"이 claude.md를 전체 컨텍스트로 읽고,
Phase 0을 시작해. 멀티 계정 시스템의 기반이 되는
services/account_manager.py (AES-256-GCM 암호화·복호화, CRUD, is_default 관리)와
routers/accounts.py (GET/POST/PUT/DELETE /api/accounts, /test, /set-default, /cookie/refresh)를 먼저 구현해.
DATABASE_SCHEMA의 accounts, platform_cookies 테이블 DDL도 Supabase에 적용해."

## Phase 1 착수 (소싱 엔진)
"이 claude.md를 전체 컨텍스트로 읽고,
Phase 1을 시작해. reference/Douyin_TikTok_Download_API를 참고하여
FastAPI routers/sourcing.py와 services/downloader.py를 먼저 구현해.
services/proxy_manager.py도 함께 구현하여 Playwright 호출 시 프록시를 주입할 수 있게 해.
소싱 시 account_id 파라미터를 받아 멀티 계정을 선택할 수 있도록 구현해.
POST /api/sourcing/search, POST /api/sourcing/download 엔드포인트 완성."

## Phase 2 착수 (AI 변환)
"claude.md 컨텍스트 기반으로 Phase 2를 시작해.
services/stt.py (Whisper v3), services/audio_separator.py (demucs htdemucs),
services/script_adapter.py (Claude API, Track A/B/D 분기 프롬프트),
services/tts.py (Edge-TTS), services/video_editor.py (FFmpeg) 순서로 구현해."

## Phase 3 착수 (Next.js 대시보드)
"claude.md 컨텍스트 기반으로 Phase 3를 시작해.
Shadcn UI 컴포넌트 규칙을 엄격히 따라서
/sourcing, /studio, /publisher (영상+블로그 탭) 3개 페이지를 USER_FLOW 순서대로 구현해."

## Phase 4 착수 (Track D: 네이버 블로그 자동화)
"claude.md 컨텍스트 기반으로 Phase 4를 시작해.
NAVER_BLOG_AUTOMATION_SPEC과 PLAYWRIGHT_PROXY_SPEC을 엄격히 따라서
services/naver_blog.py (Playwright 스마트에디터 자동 등록),
services/blog_writer.py (LLM 블로그 포스트 생성),
tasks/blog_pipeline.py (Celery 블로그 파이프라인),
routers/blog.py (API 엔드포인트) 순서로 구현해."

## Phase 5 착수 (Track B 확장: 네이버쇼핑 커넥트)
"claude.md 컨텍스트 기반으로 Phase 5를 시작해.
NAVER_SHOPPING_CONNECT_SPEC을 참고하여
services/naver_shopping.py (커넥트 API 래퍼),
routers/commerce.py (상품 검색·트래킹 URL·통계 엔드포인트)를 구현해.
COMMERCE_PRIORITY 순서대로 Track B 커머스 링크 우선순위 로직도 포함해."
```
