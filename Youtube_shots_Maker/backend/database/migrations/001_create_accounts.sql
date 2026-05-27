-- ============================================================
-- Migration 001: accounts + platform_cookies
-- NOMAD Short Factory — Phase 0 (멀티 계정 기반)
-- Run in: Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. users (Supabase Auth 동기화)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  plan  TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- auth.users 신규 가입 시 public.users 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 2. accounts (통합 멀티 계정)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounts (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 플랫폼 구분
  platform TEXT NOT NULL CHECK (platform IN (
    'douyin',
    'xiaohongshu',
    'youtube',
    'instagram',
    'tiktok',
    'naver_blog',
    'naver_shopping_connect',
    'coupang_partners',
    'smartstore'
  )),

  -- 계정 식별
  alias               TEXT NOT NULL,         -- 사용자 지정 별명
  display_name        TEXT,                  -- 플랫폼에서 가져온 실제 계정명
  avatar_url          TEXT,                  -- 계정 프로필 이미지
  platform_account_id TEXT,                  -- 플랫폼 고유 ID (youtube channel_id, naver blog_id 등)

  -- OAuth 인증 (youtube / instagram / tiktok)
  access_token     TEXT,
  refresh_token    TEXT,
  token_expires_at TIMESTAMPTZ,

  -- 자격증명 인증 (naver_blog / douyin / xiaohongshu / 커머스)
  -- AES-256-GCM 암호화: { "iv": "hex", "tag": "hex", "data": "hex" }
  credentials_encrypted JSONB,

  -- 커머스 전용
  partner_id    TEXT,                        -- 네이버쇼핑 / 쿠팡 파트너 ID
  affiliate_url TEXT,                        -- 스마트스토어 URL

  -- 상태
  is_default    BOOLEAN DEFAULT false,
  is_active     BOOLEAN DEFAULT true,
  last_used_at  TIMESTAMPTZ,
  health_status TEXT DEFAULT 'unknown' CHECK (health_status IN (
    'unknown',
    'healthy',
    'cookie_expired',
    'token_expired',
    'banned',
    'error'
  )),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 동일 user + platform + alias 중복 방지
  CONSTRAINT accounts_user_platform_alias_unique UNIQUE (user_id, platform, alias)
);

-- 플랫폼별 기본 계정은 1개만 허용 (부분 유니크 인덱스)
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_default
  ON public.accounts (user_id, platform)
  WHERE is_default = true;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS accounts_updated_at ON public.accounts;
CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ────────────────────────────────────────────────────────────
-- 3. platform_cookies (계정별 독립 세션 쿠키)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_cookies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  cookies    JSONB NOT NULL,               -- Playwright context.cookies() 배열
  refreshed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,               -- 예상 만료 시각
  CONSTRAINT platform_cookies_account_unique UNIQUE (account_id)
);

-- ────────────────────────────────────────────────────────────
-- 4. proxy_pool (프록시 풀)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proxy_pool (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proxy_url  TEXT NOT NULL,               -- "http://user:pass@host:port"
  proxy_type TEXT DEFAULT 'http' CHECK (proxy_type IN ('http', 'https', 'socks5')),
  label      TEXT,
  is_active  BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  fail_count   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 5. RLS (Row Level Security)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_cookies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proxy_pool      ENABLE ROW LEVEL SECURITY;

-- users: 자신의 행만 접근
CREATE POLICY "users_self" ON public.users
  USING (auth.uid() = id);

-- accounts: 자신의 계정만 접근
CREATE POLICY "accounts_select_own" ON public.accounts FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert_own" ON public.accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update_own" ON public.accounts FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "accounts_delete_own" ON public.accounts FOR DELETE
  USING (auth.uid() = user_id);

-- platform_cookies: 계정 소유자만 접근
CREATE POLICY "cookies_own" ON public.platform_cookies
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = platform_cookies.account_id
        AND accounts.user_id = auth.uid()
    )
  );

-- proxy_pool: 자신의 프록시만 접근
CREATE POLICY "proxy_own" ON public.proxy_pool
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 완료 메시지
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  RAISE NOTICE '✅ Migration 001 완료: accounts, platform_cookies, proxy_pool, users 테이블 생성';
END $$;
