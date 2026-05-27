-- ============================================================
-- Migration 005: proxy_pool
-- NOMAD Short Factory — Phase 3 (프록시 관리)
-- Run in: Supabase SQL Editor (004 이후 실행)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. proxy_pool
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proxy_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  proxy_url TEXT NOT NULL,           -- "http://user:pass@host:port"
  proxy_type TEXT DEFAULT 'http' CHECK (proxy_type IN ('http', 'https', 'socks5')),
  label TEXT,

  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  fail_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 2. RLS
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.proxy_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proxy_pool_select_own" ON public.proxy_pool FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "proxy_pool_insert_own" ON public.proxy_pool FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "proxy_pool_update_own" ON public.proxy_pool FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "proxy_pool_delete_own" ON public.proxy_pool FOR DELETE
  USING (auth.uid() = user_id);

DO $$ BEGIN
  RAISE NOTICE '✅ Migration 005 완료: proxy_pool 테이블 생성';
END $$;
