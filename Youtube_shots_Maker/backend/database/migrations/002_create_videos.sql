-- ============================================================
-- Migration 002: videos
-- NOMAD Short Factory — Phase 1 (소싱 엔진)
-- Run in: Supabase SQL Editor (001 이후 실행)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. videos (소싱된 영상)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.videos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sourcing_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,

  platform TEXT NOT NULL CHECK (platform IN ('douyin', 'xiaohongshu')),
  track    TEXT NOT NULL CHECK (track IN ('A', 'B', 'D')),

  original_url  TEXT NOT NULL,
  file_path     TEXT,           -- Supabase Storage 경로 (다운로드 완료 후)
  thumbnail_url TEXT,

  title_cn     TEXT,
  viral_score  INTEGER DEFAULT 0,
  likes        INTEGER DEFAULT 0,
  shares       INTEGER DEFAULT 0,
  comments     INTEGER DEFAULT 0,
  duration_sec INTEGER,         -- 영상 길이 (초)
  width        INTEGER,
  height       INTEGER,

  status TEXT DEFAULT 'sourced' CHECK (status IN (
    'sourced', 'downloading', 'downloaded', 'processing', 'ready', 'published'
  )),
  download_task_id TEXT,        -- Celery task ID
  error_msg TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 동일 user + URL 중복 방지 (upsert 기준)
  CONSTRAINT videos_user_url_unique UNIQUE (user_id, original_url)
);

-- updated_at 자동 갱신
DROP TRIGGER IF EXISTS videos_updated_at ON public.videos;
CREATE TRIGGER videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ────────────────────────────────────────────────────────────
-- 2. RLS
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "videos_select_own" ON public.videos FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "videos_insert_own" ON public.videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "videos_update_own" ON public.videos FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "videos_delete_own" ON public.videos FOR DELETE
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 3. Supabase Storage 버킷 생성 (SQL로 실행 가능한 경우)
-- ────────────────────────────────────────────────────────────
-- 대시보드 Storage 탭에서 수동 생성 권장:
--   버킷명: videos
--   Public: false (signed URL 사용)
--   파일크기 제한: 500MB
--
-- 또는 아래 SQL 실행 (storage 스키마 권한 있는 경우):
-- INSERT INTO storage.buckets (id, name, public, file_size_limit)
-- VALUES ('videos', 'videos', false, 524288000)
-- ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE '✅ Migration 002 완료: videos 테이블 생성';
  RAISE NOTICE '⚠️  Supabase 대시보드 → Storage → New Bucket: "videos" (500MB, Private) 수동 생성 필요';
END $$;
