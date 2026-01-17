-- Migration 069: Create sync monitoring tables via function
-- This approach bypasses PostgREST cache issues by using a function

-- Drop function if exists
DROP FUNCTION IF EXISTS create_sync_monitoring_tables();

-- Create function to create all sync monitoring tables
CREATE OR REPLACE FUNCTION create_sync_monitoring_tables()
RETURNS TEXT AS $$
BEGIN
  -- Create sync_logs table if not exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sync_logs') THEN
    CREATE TABLE public.sync_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sync_type VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
      started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,
      records_processed INTEGER DEFAULT 0,
      records_failed INTEGER DEFAULT 0,
      error_message TEXT,
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX idx_sync_logs_status ON public.sync_logs(status);
    CREATE INDEX idx_sync_logs_sync_type ON public.sync_logs(sync_type);
    CREATE INDEX idx_sync_logs_started_at ON public.sync_logs(started_at DESC);
  END IF;

  -- Create error_logs table if not exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'error_logs') THEN
    CREATE TABLE public.error_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sync_log_id UUID REFERENCES public.sync_logs(id) ON DELETE CASCADE,
      error_type VARCHAR(100) NOT NULL,
      error_message TEXT NOT NULL,
      stack_trace TEXT,
      record_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX idx_error_logs_sync_log_id ON public.error_logs(sync_log_id);
    CREATE INDEX idx_error_logs_error_type ON public.error_logs(error_type);
    CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
  END IF;

  -- Create sync_health table if not exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sync_health') THEN
    CREATE TABLE public.sync_health (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sync_type VARCHAR(50) NOT NULL UNIQUE,
      last_successful_sync TIMESTAMP WITH TIME ZONE,
      last_failed_sync TIMESTAMP WITH TIME ZONE,
      consecutive_failures INTEGER DEFAULT 0,
      total_syncs INTEGER DEFAULT 0,
      total_failures INTEGER DEFAULT 0,
      average_duration_ms INTEGER,
      health_status VARCHAR(20) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX idx_sync_health_sync_type ON public.sync_health(sync_type);
    CREATE INDEX idx_sync_health_status ON public.sync_health(health_status);
  END IF;

  -- Create migrations table if not exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'migrations') THEN
    CREATE TABLE public.migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX idx_migrations_name ON public.migrations(name);
    CREATE INDEX idx_migrations_executed_at ON public.migrations(executed_at DESC);
  END IF;

  -- Add comments
  COMMENT ON TABLE public.sync_logs IS 'Tracks synchronization operations between spreadsheet and database';
  COMMENT ON TABLE public.error_logs IS 'Stores detailed error information for failed sync operations';
  COMMENT ON TABLE public.sync_health IS 'Monitors overall health status of the sync system';

  RETURN 'All sync monitoring tables created successfully';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_sync_monitoring_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION create_sync_monitoring_tables() TO anon;

-- Execute the function immediately
SELECT create_sync_monitoring_tables();
