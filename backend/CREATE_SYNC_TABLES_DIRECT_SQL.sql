-- ============================================
-- 直接実行用SQL: sync_logsとsync_healthテーブル作成
-- ============================================
-- Supabase SQL Editorで直接実行してください
-- これでマイグレーション068/069をスキップできます
-- ============================================

-- 1. sync_logsテーブル
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. sync_healthテーブル
CREATE TABLE IF NOT EXISTS public.sync_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL UNIQUE,
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT CHECK (last_sync_status IN ('success', 'failed', 'partial')),
    total_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    last_error TEXT,
    consecutive_failures INTEGER DEFAULT 0,
    is_healthy BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. インデックス作成
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON public.sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON public.sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON public.sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_health_table_name ON public.sync_health(table_name);
CREATE INDEX IF NOT EXISTS idx_sync_health_is_healthy ON public.sync_health(is_healthy);

-- 4. RLS (Row Level Security) 有効化
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_health ENABLE ROW LEVEL SECURITY;

-- 5. RLSポリシー作成（認証済みユーザーのみアクセス可能）
CREATE POLICY "Allow authenticated users to read sync_logs"
    ON public.sync_logs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert sync_logs"
    ON public.sync_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update sync_logs"
    ON public.sync_logs FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to read sync_health"
    ON public.sync_health FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert sync_health"
    ON public.sync_health FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update sync_health"
    ON public.sync_health FOR UPDATE
    TO authenticated
    USING (true);

-- 完了メッセージ（コメントアウト - Supabaseでエラーになるため）
-- SELECT 'sync_logsとsync_healthテーブルが正常に作成されました' AS result;

-- ✅ テーブル作成完了
-- sync_logs と sync_health テーブルが正常に作成されました
