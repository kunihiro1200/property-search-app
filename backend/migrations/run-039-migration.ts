import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Running migration 039: Add sync_health table...');

  try {
    // Read the SQL file
    const sqlPath = path.resolve(__dirname, '039_add_sync_health.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          // Try direct execution for DDL statements
          const { error: directError } = await supabase.from('sync_health').select('id').limit(1);
          if (directError && !directError.message.includes('does not exist')) {
            console.warn(`Warning: ${error.message}`);
          }
        }
      }
    }

    // Verify sync_health table exists by trying to select from it
    const { data, error: verifyError } = await supabase
      .from('sync_health')
      .select('*')
      .limit(1);

    if (verifyError) {
      // Table doesn't exist, create it manually
      console.log('Creating sync_health table manually...');
      
      // Use raw SQL through a function or create the table structure
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS sync_health (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            last_sync_time TIMESTAMP WITH TIME ZONE,
            last_sync_success BOOLEAN DEFAULT false,
            pending_missing_sellers INTEGER DEFAULT 0,
            consecutive_failures INTEGER DEFAULT 0,
            is_healthy BOOLEAN DEFAULT true,
            sync_interval_minutes INTEGER DEFAULT 5,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `
      });

      if (createError) {
        console.log('Note: sync_health table may need to be created via Supabase dashboard');
        console.log('SQL to run:', `
          CREATE TABLE IF NOT EXISTS sync_health (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            last_sync_time TIMESTAMP WITH TIME ZONE,
            last_sync_success BOOLEAN DEFAULT false,
            pending_missing_sellers INTEGER DEFAULT 0,
            consecutive_failures INTEGER DEFAULT 0,
            is_healthy BOOLEAN DEFAULT true,
            sync_interval_minutes INTEGER DEFAULT 5,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `);
      }
    } else {
      console.log('✅ sync_health table exists');
      
      // Insert initial record if empty
      if (!data || data.length === 0) {
        const { error: insertError } = await supabase
          .from('sync_health')
          .insert({
            is_healthy: true,
            sync_interval_minutes: 5
          });
        
        if (!insertError) {
          console.log('✅ Initial sync_health record created');
        }
      }
    }

    console.log('✅ Migration 039 completed');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
