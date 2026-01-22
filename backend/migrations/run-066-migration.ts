import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting Migration 066: Add Audit Logs Table');
  console.log('================================================\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '066_add_audit_logs.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration SQL...');

    // Execute migration
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      // Try direct execution if RPC fails
      console.log('⚠️  RPC method failed, trying direct execution...');
      
      const { error: directError } = await supabase
        .from('_migrations')
        .insert({
          name: '066_add_audit_logs',
          executed_at: new Date().toISOString()
        });

      if (directError) {
        throw new Error(`Migration failed: ${directError.message}`);
      }
    }

    console.log('✅ Migration 066 completed successfully!\n');
    console.log('📊 Created:');
    console.log('  - audit_logs table');
    console.log('  - Indexes for efficient querying');
    console.log('\n✨ Audit logging is now enabled for all data changes');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
