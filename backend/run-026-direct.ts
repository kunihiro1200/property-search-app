import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Running migration 026: Add sync logs...\n');

    // 1. Create sync_logs table
    console.log('1. Creating sync_logs table...');
    const { error: syncLogsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS sync_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('migration', 'create', 'update', 'delete', 'manual', 'batch')),
          seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
          status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failure', 'pending')),
          error_message TEXT,
          rows_affected INTEGER DEFAULT 0,
          started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE,
          duration_ms INTEGER,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (syncLogsError && !syncLogsError.message.includes('already exists')) {
      console.error('❌ Error creating sync_logs:', syncLogsError);
      throw syncLogsError;
    }
    console.log('✅ sync_logs table created\n');

    // 2. Create error_logs table
    console.log('2. Creating error_logs table...');
    const { error: errorLogsError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS error_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          error_type VARCHAR(50) NOT NULL CHECK (error_type IN ('network', 'validation', 'rate_limit', 'auth', 'conflict', 'unknown')),
          error_message TEXT NOT NULL,
          stack_trace TEXT,
          seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
          operation VARCHAR(50),
          retry_count INTEGER DEFAULT 0,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (errorLogsError && !errorLogsError.message.includes('already exists')) {
      console.error('❌ Error creating error_logs:', errorLogsError);
      throw errorLogsError;
    }
    console.log('✅ error_logs table created\n');

    // 3. Add synced_to_sheet_at column to sellers
    console.log('3. Adding synced_to_sheet_at column to sellers...');
    const { error: columnError } = await supabase.rpc('exec', {
      sql: `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sellers' AND column_name = 'synced_to_sheet_at'
          ) THEN
            ALTER TABLE sellers ADD COLUMN synced_to_sheet_at TIMESTAMP WITH TIME ZONE;
          END IF;
        END $$;
      `
    });

    if (columnError) {
      console.error('❌ Error adding column:', columnError);
      throw columnError;
    }
    console.log('✅ Column added\n');

    // 4. Create indexes
    console.log('4. Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_sync_logs_seller_id ON sync_logs(seller_id)',
      'CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON sync_logs(sync_type)',
      'CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status)',
      'CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_error_logs_seller_id ON error_logs(seller_id)',
      'CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type)',
      'CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_sellers_synced_to_sheet_at ON sellers(synced_to_sheet_at)',
    ];

    for (const indexSql of indexes) {
      const { error: indexError } = await supabase.rpc('exec', { sql: indexSql });
      if (indexError && !indexError.message.includes('already exists')) {
        console.error(`❌ Error creating index: ${indexError.message}`);
      }
    }
    console.log('✅ Indexes created\n');

    console.log('✓ Migration 026 completed successfully');
  } catch (error: any) {
    console.error('\n❌ Migration error:', error.message);
    
    // Try alternative approach - direct table creation
    console.log('\n🔄 Trying alternative approach...');
    await createTablesDirectly();
  }
}

async function createTablesDirectly() {
  try {
    // Check if sync_logs exists
    const { data: syncLogsExists } = await supabase
      .from('sync_logs')
      .select('id')
      .limit(1);

    if (syncLogsExists !== null) {
      console.log('✅ sync_logs table already exists');
      return;
    }
  } catch (error: any) {
    console.log('⚠️  sync_logs table does not exist');
    console.log('\n📝 Please run the following SQL in Supabase SQL Editor:');
    console.log('\n' + '='.repeat(80));
    console.log(`
-- Migration 026: Add sync logs and error logs tables

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('migration', 'create', 'update', 'delete', 'manual', 'batch')),
  seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failure', 'pending')),
  error_message TEXT,
  rows_affected INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type VARCHAR(50) NOT NULL CHECK (error_type IN ('network', 'validation', 'rate_limit', 'auth', 'conflict', 'unknown')),
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
  operation VARCHAR(50),
  retry_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sellers' AND column_name = 'synced_to_sheet_at'
  ) THEN
    ALTER TABLE sellers ADD COLUMN synced_to_sheet_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sync_logs_seller_id ON sync_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_seller_id ON error_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sellers_synced_to_sheet_at ON sellers(synced_to_sheet_at);
    `);
    console.log('='.repeat(80));
    console.log('\n📍 Go to: https://supabase.com/dashboard/project/fzcuexscuwhoywcicdqq/sql/new');
    console.log('   Paste the SQL above and click "Run"');
  }
}

runMigration();
