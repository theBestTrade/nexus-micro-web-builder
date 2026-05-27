-- ============================================================
-- Migration 004: publish_jobs, blog_posts
-- NOMAD Short Factory — Phase 3 (Publisher Matrix)
-- Run in: Supabase SQL Editor (003 이후 실행)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. publish_jobs (영상 배포 작업)
-- ────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────
-- 2. blog_posts (Track D: 네이버 블로그 포스트) — Phase 4 준비
-- ────────────────────────────────────────────────────────────
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
  commerce_links JSONB,     -- { coupang?, smartstore?, naver_shopping? }
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

-- ────────────────────────────────────────────────────────────
-- 3. RLS — publish_jobs
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.publish_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "publish_jobs_select_own" ON public.publish_jobs FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "publish_jobs_insert_own" ON public.publish_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "publish_jobs_update_own" ON public.publish_jobs FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "publish_jobs_delete_own" ON public.publish_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 4. RLS — blog_posts
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_posts_select_own" ON public.blog_posts FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "blog_posts_insert_own" ON public.blog_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "blog_posts_update_own" ON public.blog_posts FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "blog_posts_delete_own" ON public.blog_posts FOR DELETE
  USING (auth.uid() = user_id);

DO $$ BEGIN
  RAISE NOTICE '✅ Migration 004 완료: publish_jobs, blog_posts 테이블 생성';
END $$;
