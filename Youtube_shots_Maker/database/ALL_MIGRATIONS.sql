-- ============================================================
-- NOMAD Short Factory — 전체 DB 마이그레이션 (통합본)
-- Supabase SQL Editor에 이 파일 전체를 붙여넣기 후 실행
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
-- 2. updated_at 자동 갱신 공통 함수
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 3. accounts (통합 멀티 계정)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounts (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ────────────────────────────────────────────────────────────
-- 4. platform_cookies (Playwright 세션 쿠키)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_cookies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  cookies    JSONB NOT NULL,
  refreshed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  CONSTRAINT platform_cookies_account_unique UNIQUE (account_id)
);

-- ────────────────────────────────────────────────────────────
-- 5. videos (소싱된 영상)
-- ────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────
-- 6. scripts (AI 변환 결과)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scripts (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,

  raw_stt       TEXT,
  stt_segments  JSONB,
  stt_task_id   TEXT,

  adapted_script TEXT,
  adapt_task_id  TEXT,

  bgm_path         TEXT,
  vocals_path      TEXT,
  separate_task_id TEXT,
  bgm_preserved    BOOLEAN DEFAULT true,

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

-- ────────────────────────────────────────────────────────────
-- 7. publish_jobs (영상 배포 작업)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.publish_jobs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id           UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  script_id          UUID REFERENCES public.scripts(id) ON DELETE SET NULL,
  publish_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,

  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,

  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'scheduled', 'uploading', 'published', 'failed'
  )),

  platform_video_id          TEXT,
  commerce_link              TEXT,
  naver_shopping_product_id  TEXT,
  geo_metadata               JSONB,
  error_msg                  TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 8. blog_posts (Track D: 네이버 블로그)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id           UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  script_id          UUID REFERENCES public.scripts(id) ON DELETE SET NULL,
  publish_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,

  title_ko  TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  thumbnail_path TEXT,
  tags           TEXT[],
  commerce_links JSONB,
  naver_post_url TEXT,

  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'generating', 'ready', 'publishing', 'published', 'failed'
  )),

  generate_task_id TEXT,
  publish_task_id  TEXT,
  error_msg        TEXT,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 9. proxy_pool (프록시 관리)
-- ────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────
-- 10. naver_shopping_logs (Track B: 커머스 수익 로그)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.naver_shopping_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commerce_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  video_id            UUID REFERENCES public.videos(id) ON DELETE SET NULL,

  product_id    TEXT,
  product_name  TEXT,
  tracking_url  TEXT,

  commission_rate   NUMERIC(5,2)  DEFAULT 0,
  click_count       INTEGER       DEFAULT 0,
  conversion_count  INTEGER       DEFAULT 0,
  estimated_revenue NUMERIC(12,2) DEFAULT 0,

  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 11. RLS (Row Level Security) — 전체 테이블
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_cookies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_jobs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proxy_pool           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.naver_shopping_logs  ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "users_self" ON public.users
  USING (auth.uid() = id);

-- accounts
CREATE POLICY "accounts_select_own" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert_own" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update_own" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "accounts_delete_own" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- platform_cookies
CREATE POLICY "cookies_own" ON public.platform_cookies
  USING (EXISTS (
    SELECT 1 FROM public.accounts
    WHERE accounts.id = platform_cookies.account_id
      AND accounts.user_id = auth.uid()
  ));

-- videos
CREATE POLICY "videos_select_own" ON public.videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "videos_insert_own" ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "videos_update_own" ON public.videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "videos_delete_own" ON public.videos FOR DELETE USING (auth.uid() = user_id);

-- scripts
CREATE POLICY "scripts_select_own" ON public.scripts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scripts_insert_own" ON public.scripts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scripts_update_own" ON public.scripts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "scripts_delete_own" ON public.scripts FOR DELETE USING (auth.uid() = user_id);

-- publish_jobs
CREATE POLICY "publish_jobs_select_own" ON public.publish_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "publish_jobs_insert_own" ON public.publish_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "publish_jobs_update_own" ON public.publish_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "publish_jobs_delete_own" ON public.publish_jobs FOR DELETE USING (auth.uid() = user_id);

-- blog_posts
CREATE POLICY "blog_posts_select_own" ON public.blog_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "blog_posts_insert_own" ON public.blog_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "blog_posts_update_own" ON public.blog_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "blog_posts_delete_own" ON public.blog_posts FOR DELETE USING (auth.uid() = user_id);

-- proxy_pool
CREATE POLICY "proxy_pool_select_own" ON public.proxy_pool FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "proxy_pool_insert_own" ON public.proxy_pool FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "proxy_pool_update_own" ON public.proxy_pool FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "proxy_pool_delete_own" ON public.proxy_pool FOR DELETE USING (auth.uid() = user_id);

-- naver_shopping_logs
CREATE POLICY "shopping_logs_select_own" ON public.naver_shopping_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "shopping_logs_insert_own" ON public.naver_shopping_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "shopping_logs_update_own" ON public.naver_shopping_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "shopping_logs_delete_own" ON public.naver_shopping_logs FOR DELETE USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 완료
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  RAISE NOTICE '✅ 전체 마이그레이션 완료!';
  RAISE NOTICE '테이블 생성: users, accounts, platform_cookies, videos, scripts, publish_jobs, blog_posts, proxy_pool, naver_shopping_logs';
  RAISE NOTICE '⚠️  Storage 버킷 수동 생성 필요: videos (500MB), audio (200MB), finals (500MB)';
END $$;
