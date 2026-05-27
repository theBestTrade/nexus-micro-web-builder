-- ============================================================
-- Migration 003: scripts
-- NOMAD Short Factory — Phase 2 (AI 변환 파이프라인)
-- Run in: Supabase SQL Editor (002 이후 실행)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. scripts (AI 변환 결과 전체)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scripts (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,

  -- ── STT (Whisper) ───────────────────────────────────────
  raw_stt       TEXT,           -- Whisper 원문 (중국어)
  stt_segments  JSONB,          -- Whisper segments (타이밍 JSON)
  stt_task_id   TEXT,           -- Celery task ID

  -- ── 대본 각색 (Claude) ──────────────────────────────────
  adapted_script TEXT,          -- LLM 각색 결과 (한국어)
  adapt_task_id  TEXT,

  -- ── 오디오 분리 (demucs) ────────────────────────────────
  bgm_path       TEXT,          -- Supabase Storage: BGM(반주) 경로
  vocals_path    TEXT,          -- Supabase Storage: 원본 보컬 경로
  separate_task_id TEXT,
  bgm_preserved  BOOLEAN DEFAULT true,

  -- ── TTS (Edge-TTS / CLOVA) ──────────────────────────────
  tts_audio_path TEXT,          -- Supabase Storage: TTS 합성 오디오
  tts_voice_id   TEXT,          -- 사용된 TTS 보이스 ID
  tts_task_id    TEXT,

  -- ── 최종 렌더링 (FFmpeg) ────────────────────────────────
  final_video_path TEXT,        -- Supabase Storage: 최종 영상
  subtitle_style   JSONB,       -- 자막 스타일 옵션
  render_task_id   TEXT,

  -- ── 상태 ────────────────────────────────────────────────
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

-- updated_at 자동 갱신
DROP TRIGGER IF EXISTS scripts_updated_at ON public.scripts;
CREATE TRIGGER scripts_updated_at
  BEFORE UPDATE ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ────────────────────────────────────────────────────────────
-- 2. RLS
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scripts_select_own" ON public.scripts FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "scripts_insert_own" ON public.scripts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scripts_update_own" ON public.scripts FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "scripts_delete_own" ON public.scripts FOR DELETE
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 3. Supabase Storage 버킷 추가 안내
-- ────────────────────────────────────────────────────────────
-- 대시보드 Storage 탭에서 수동 생성:
--   버킷명: audio    (Private, 200MB)
--   버킷명: finals   (Private, 500MB)
--   (videos 버킷은 Migration 002에서 이미 생성)

DO $$ BEGIN
  RAISE NOTICE '✅ Migration 003 완료: scripts 테이블 생성';
  RAISE NOTICE '⚠️  Storage → New Bucket: "audio" (200MB, Private), "finals" (500MB, Private) 수동 생성 필요';
END $$;
