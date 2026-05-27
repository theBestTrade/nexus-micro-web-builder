-- ============================================================
-- NOMAD Short Factory — 통합 마이그레이션 (001 ~ 006)
-- Supabase SQL Editor에 전체 내용을 붙여넣고 실행하세요.
-- 이미 생성된 테이블/정책은 건너뜁니다 (IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ─────────────────────────────────────────
-- 공통: updated_at 자동 갱신 함수
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────
-- 공통: 정책 중복 생성 방지 헬퍼
-- (이미 동일 이름 정책이 있으면 삭제 후 재생성)
-- ─────────────────────────────────────────

-- ════════════════════════════════════════════════════════════
-- 001: users, accounts, platform_cookies, proxy_pool
-- ════════════════════════════════════════════════════════════

-- ── users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  plan  TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_self" ON public.users;
CREATE POLICY "users_self" ON public.users
  USING (auth.uid() = id);

-- auth.users 가입 시 public.users 자동 생성
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

-- ── accounts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounts (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  platform TEXT NOT NULL CHECK (platform IN (
    'douyin', 'xiaohongshu',
    'youtube', 'instagram', 'tiktok', 'naver_blog',
    'naver_shopping_connect', 'coupang_partners', 'smartstore'
  )),

  alias               TEXT NOT NULL,
  display_name        TEXT,
  avatar_url          TEXT,
  platform_account_id TEXT,

  access_token     TEXT,
  refresh_token    TEXT,
  token_expires_at TIMESTAMPTZ,

  credentials_encrypted JSONB,

  partner_id    TEXT,
  affiliate_url TEXT,

  is_default    BOOLEAN DEFAULT false,
  is_active     BOOLEAN DEFAULT true,
  last_used_at  TIMESTAMPTZ,
  health_status TEXT DEFAULT 'unknown' CHECK (health_status IN (
    'unknown', 'healthy', 'cookie_expired', 'token_expired', 'banned', 'error'
  )),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT accounts_user_platform_alias_unique UNIQUE (user_id, platform, alias)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_default
  ON public.accounts (user_id, platform)
  WHERE is_default = true;

DROP TRIGGER IF EXISTS accounts_updated_at ON public.accounts;
CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounts_select_own" ON public.accounts;
DROP POLICY IF EXISTS "accounts_insert_own" ON public.accounts;
DROP POLICY IF EXISTS "accounts_update_own" ON public.accounts;
DROP POLICY IF EXISTS "accounts_delete_own" ON public.accounts;
CREATE POLICY "accounts_select_own" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert_own" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update_own" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "accounts_delete_own" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- ── platform_cookies ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_cookies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  cookies    JSONB NOT NULL,
  refreshed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  CONSTRAINT platform_cookies_account_unique UNIQUE (account_id)
);

ALTER TABLE public.platform_cookies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cookies_own" ON public.platform_cookies;
CREATE POLICY "cookies_own" ON public.platform_cookies
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = platform_cookies.account_id
        AND accounts.user_id = auth.uid()
    )
  );

-- ── proxy_pool ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proxy_pool (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proxy_url  TEXT NOT NULL,
  proxy_type TEXT DEFAULT 'http' CHECK (proxy_type IN ('http', 'https', 'socks5')),
  label      TEXT,
  is_active  BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  fail_count   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.proxy_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proxy_own"             ON public.proxy_pool;
DROP POLICY IF EXISTS "proxy_pool_select_own" ON public.proxy_pool;
DROP POLICY IF EXISTS "proxy_pool_insert_own" ON public.proxy_pool;
DROP POLICY IF EXISTS "proxy_pool_update_own" ON public.proxy_pool;
DROP POLICY IF EXISTS "proxy_pool_delete_own" ON public.proxy_pool;
CREATE POLICY "proxy_pool_select_own" ON public.proxy_pool FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "proxy_pool_insert_own" ON public.proxy_pool FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "proxy_pool_update_own" ON public.proxy_pool FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "proxy_pool_delete_own" ON public.proxy_pool FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN RAISE NOTICE '✅ 001 완료: users, accounts, platform_cookies, proxy_pool'; END $$;

-- ════════════════════════════════════════════════════════════
-- 002: videos
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.videos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sourcing_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,

  platform TEXT NOT NULL CHECK (platform IN ('douyin', 'xiaohongshu')),
  track    TEXT NOT NULL CHECK (track IN ('A', 'B', 'D')),

  original_url  TEXT NOT NULL,
  file_path     TEXT,
  thumbnail_url TEXT,

  title_cn     TEXT,
  viral_score  INTEGER DEFAULT 0,
  likes        INTEGER DEFAULT 0,
  shares       INTEGER DEFAULT 0,
  comments     INTEGER DEFAULT 0,
  duration_sec INTEGER,
  width        INTEGER,
  height       INTEGER,

  status TEXT DEFAULT 'sourced' CHECK (status IN (
    'sourced', 'downloading', 'downloaded', 'processing', 'ready', 'published'
  )),
  download_task_id TEXT,
  error_msg TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT videos_user_url_unique UNIQUE (user_id, original_url)
);

DROP TRIGGER IF EXISTS videos_updated_at ON public.videos;
CREATE TRIGGER videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "videos_select_own" ON public.videos;
DROP POLICY IF EXISTS "videos_insert_own" ON public.videos;
DROP POLICY IF EXISTS "videos_update_own" ON public.videos;
DROP POLICY IF EXISTS "videos_delete_own" ON public.videos;
CREATE POLICY "videos_select_own" ON public.videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "videos_insert_own" ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "videos_update_own" ON public.videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "videos_delete_own" ON public.videos FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN RAISE NOTICE '✅ 002 완료: videos'; END $$;

-- ════════════════════════════════════════════════════════════
-- 003: scripts
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.scripts (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,

  raw_stt       TEXT,
  stt_segments  JSONB,
  stt_task_id   TEXT,

  adapted_script TEXT,
  adapt_task_id  TEXT,

  bgm_path       TEXT,
  vocals_path    TEXT,
  separate_task_id TEXT,
  bgm_preserved  BOOLEAN DEFAULT true,

  tts_audio_path TEXT,
  tts_voice_id   TEXT,
  tts_task_id    TEXT,

  final_video_path TEXT,
  subtitle_style   JSONB,
  render_task_id   TEXT,

  status TEXT DEFAULT 'created' CHECK (status IN (
    'created',
    'transcribing', 'transcribed',
    'adapting',     'adapted',
    'separating',   'separated',
    'synthesizing', 'synthesized',
    'rendering',    'ready',
    'failed'
  )),
  error_msg TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS scripts_updated_at ON public.scripts;
CREATE TRIGGER scripts_updated_at
  BEFORE UPDATE ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scripts_select_own" ON public.scripts;
DROP POLICY IF EXISTS "scripts_insert_own" ON public.scripts;
DROP POLICY IF EXISTS "scripts_update_own" ON public.scripts;
DROP POLICY IF EXISTS "scripts_delete_own" ON public.scripts;
CREATE POLICY "scripts_select_own" ON public.scripts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scripts_insert_own" ON public.scripts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scripts_update_own" ON public.scripts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "scripts_delete_own" ON public.scripts FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN RAISE NOTICE '✅ 003 완료: scripts'; END $$;

-- ════════════════════════════════════════════════════════════
-- 004: publish_jobs, blog_posts
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.publish_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  script_id UUID REFERENCES public.scripts(id) ON DELETE SET NULL,
  publish_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,

  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,

  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'scheduled', 'uploading', 'published', 'failed'
  )),

  platform_video_id TEXT,
  commerce_link TEXT,
  naver_shopping_product_id TEXT,
  geo_metadata JSONB,
  error_msg TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.publish_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "publish_jobs_select_own" ON public.publish_jobs;
DROP POLICY IF EXISTS "publish_jobs_insert_own" ON public.publish_jobs;
DROP POLICY IF EXISTS "publish_jobs_update_own" ON public.publish_jobs;
DROP POLICY IF EXISTS "publish_jobs_delete_own" ON public.publish_jobs;
CREATE POLICY "publish_jobs_select_own" ON public.publish_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "publish_jobs_insert_own" ON public.publish_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "publish_jobs_update_own" ON public.publish_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "publish_jobs_delete_own" ON public.publish_jobs FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  script_id UUID REFERENCES public.scripts(id) ON DELETE SET NULL,
  publish_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,

  title_ko TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  thumbnail_path TEXT,
  tags TEXT[],
  commerce_links JSONB,
  naver_post_url TEXT,

  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'generating', 'ready', 'publishing', 'published', 'failed'
  )),

  generate_task_id TEXT,
  publish_task_id TEXT,
  error_msg TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_posts_select_own" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_insert_own" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_update_own" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_delete_own" ON public.blog_posts;
CREATE POLICY "blog_posts_select_own" ON public.blog_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "blog_posts_insert_own" ON public.blog_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "blog_posts_update_own" ON public.blog_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "blog_posts_delete_own" ON public.blog_posts FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN RAISE NOTICE '✅ 004 완료: publish_jobs, blog_posts'; END $$;

-- ════════════════════════════════════════════════════════════
-- 006: naver_shopping_logs
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.naver_shopping_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commerce_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,

  product_id     TEXT,
  product_name   TEXT,
  tracking_url   TEXT,

  commission_rate    NUMERIC(5,2)  DEFAULT 0,
  click_count        INTEGER       DEFAULT 0,
  conversion_count   INTEGER       DEFAULT 0,
  estimated_revenue  NUMERIC(12,2) DEFAULT 0,

  logged_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.naver_shopping_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shopping_logs_select_own" ON public.naver_shopping_logs;
DROP POLICY IF EXISTS "shopping_logs_insert_own" ON public.naver_shopping_logs;
DROP POLICY IF EXISTS "shopping_logs_update_own" ON public.naver_shopping_logs;
DROP POLICY IF EXISTS "shopping_logs_delete_own" ON public.naver_shopping_logs;
CREATE POLICY "shopping_logs_select_own" ON public.naver_shopping_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "shopping_logs_insert_own" ON public.naver_shopping_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "shopping_logs_update_own" ON public.naver_shopping_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "shopping_logs_delete_own" ON public.naver_shopping_logs FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN RAISE NOTICE '✅ 006 완료: naver_shopping_logs'; END $$;

-- ════════════════════════════════════════════════════════════
-- 최종 요약
-- ════════════════════════════════════════════════════════════
DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 NOMAD Short Factory 전체 마이그레이션 완료!';
  RAISE NOTICE '생성된 테이블: users, accounts, platform_cookies, proxy_pool,';
  RAISE NOTICE '  videos, scripts, publish_jobs, blog_posts, naver_shopping_logs';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Storage 버킷 수동 생성 필요 (대시보드 → Storage → New Bucket):';
  RAISE NOTICE '  - videos  (Private, 500MB)';
  RAISE NOTICE '  - audio   (Private, 200MB)';
  RAISE NOTICE '  - finals  (Private, 500MB)';
END $$;
