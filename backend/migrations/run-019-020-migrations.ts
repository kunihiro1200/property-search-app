import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSqlFile(filename: string, description: string) {
  console.log(`\n📝 Executing ${filename}...`);
  const sqlPath = path.join(__dirname, filename);
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    // If exec_sql doesn't exist, try direct execution
    console.log('⚠️  exec_sql not available, trying direct execution...');
    
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      const { error: execError } = await (supabase as any).rpc('exec', {
        query: statement
      });
      
      if (execError) {
        console.error(`❌ Error executing statement in ${filename}:`, execError);
        throw execError;
      }
    }
  }

  console.log(`✅ ${description} completed successfully!`);
}

async function runMigrations() {
  try {
    console.log('🚀 Starting calendar webhook and sync migrations (019-020)...');
    console.log('');

    // Migration 019: calendar_webhook_channels
    await executeSqlFile(
      '019_add_calendar_webhook_channels.sql',
      'Migration 019 (calendar_webhook_channels table)'
    );

    // Migration 020: calendar_sync_tokens
    await executeSqlFile(
      '020_add_calendar_sync_tokens.sql',
      'Migration 020 (calendar_sync_tokens table)'
    );

    console.log('');
    console.log('✅ All migrations completed successfully!');
    console.log('');
    console.log('📋 Summary of changes:');
    console.log('  Migration 019:');
    console.log('    - Created calendar_webhook_channels table');
    console.log('    - Added indexes for efficient webhook lookups');
    console.log('    - Added foreign key constraint to employees');
    console.log('');
    console.log('  Migration 020:');
    console.log('    - Created calendar_sync_tokens table');
    console.log('    - Added UNIQUE constraint on employee_id');
    console.log('    - Added indexes for sync operations');
    console.log('');
    console.log('🎉 Database is now ready for Google Calendar webhook notifications and sync!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
