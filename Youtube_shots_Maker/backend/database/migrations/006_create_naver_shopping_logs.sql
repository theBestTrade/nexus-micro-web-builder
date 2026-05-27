-- ============================================================
-- Migration 006: naver_shopping_logs
-- NOMAD Short Factory — Phase 5 (Track B: 네이버쇼핑 커넥트)
-- Run in: Supabase SQL Editor (005 이후 실행)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.naver_shopping_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commerce_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,

  product_id     TEXT,
  product_name   TEXT,
  tracking_url   TEXT,            -- 생성된 트래킹 URL

  commission_rate    NUMERIC(5,2)  DEFAULT 0,
  click_count        INTEGER       DEFAULT 0,
  conversion_count   INTEGER       DEFAULT 0,
  estimated_revenue  NUMERIC(12,2) DEFAULT 0,

  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.naver_shopping_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopping_logs_select_own" ON public.naver_shopping_logs FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "shopping_logs_insert_own" ON public.naver_shopping_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "shopping_logs_update_own" ON public.naver_shopping_logs FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "shopping_logs_delete_own" ON public.naver_shopping_logs FOR DELETE
  USING (auth.uid() = user_id);

DO $$ BEGIN
  RAISE NOTICE '✅ Migration 006 완료: naver_shopping_logs 테이블 생성';
END $$;
