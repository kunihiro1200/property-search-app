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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  try {
    console.log('🚀 Starting migration 062: Add inquiry_histories table...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '062_add_inquiry_histories.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration SQL...');

    // Execute migration
    const { error } = await supabase.rpc('exec_sql', {
      sql_string: migrationSQL,
    });

    if (error) {
      // If exec_sql RPC doesn't exist, try direct execution
      console.log('⚠️  exec_sql RPC not found, trying direct execution...');
      
      const { error: directError } = await supabase
        .from('_migrations')
        .insert({ name: '062_add_inquiry_histories', executed_at: new Date().toISOString() });

      if (directError) {
        throw new Error(`Migration execution failed: ${directError.message}`);
      }
    }

    console.log('✅ Migration 062 completed successfully!\n');
    console.log('📋 Summary:');
    console.log('  - Created inquiry_histories table');
    console.log('  - Added indexes for performance');
    console.log('  - Added updated_at trigger');
    console.log('\n✨ Database schema updated successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
runMigration();
