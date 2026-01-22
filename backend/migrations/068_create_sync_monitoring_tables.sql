-- Migration: 068_create_sync_monitoring_tables
-- Description: Create sync monitoring tables (sync_logs, error_logs, sync_health)
-- Date: 2024-12-30

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.error_logs CASCADE;
DROP TABLE IF EXISTS public.sync_logs CASCADE;
DROP TABLE IF EXISTS public.sync_health CASCADE;

-- Create sync_logs table
CREATE TABLE public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create error_logs table
CREATE TABLE public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_log_id UUID REFERENCES public.sync_logs(id) ON DELETE CASCADE,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create sync_health table
CREATE TABLE public.sync_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_successful_sync TIMESTAMPTZ,
  last_failed_sync TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,
  health_status TEXT NOT NULL CHECK (health_status IN ('healthy', 'degraded', 'unhealthy')),
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_sync_logs_status ON public.sync_logs(status);
CREATE INDEX idx_sync_logs_sync_type ON public.sync_logs(sync_type);
CREATE INDEX idx_sync_logs_created_at ON public.sync_logs(created_at DESC);
CREATE INDEX idx_error_logs_sync_log_id ON public.error_logs(sync_log_id);
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_sync_health_health_status ON public.sync_health(health_status);

-- Enable Row Level Security
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_health ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for authenticated users)
CREATE POLICY "Allow all operations for authenticated users" ON public.sync_logs
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON public.error_logs
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON public.sync_health
  FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.sync_logs TO authenticated;
GRANT ALL ON public.error_logs TO authenticated;
GRANT ALL ON public.sync_health TO authenticated;

-- Insert initial sync_health record
INSERT INTO public.sync_health (
  health_status,
  consecutive_failures,
  metadata
) VALUES (
  'healthy',
  0,
  '{"initialized": true}'::jsonb
);

COMMENT ON TABLE public.sync_logs IS 'Tracks synchronization operations between spreadsheet and database';
COMMENT ON TABLE public.error_logs IS 'Stores detailed error information for failed sync operations';
COMMENT ON TABLE public.sync_health IS 'Monitors overall health status of the sync system';
