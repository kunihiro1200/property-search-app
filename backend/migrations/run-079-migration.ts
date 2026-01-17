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
  console.log('🚀 Starting migration 079: Enable pg_trgm Extension');
  console.log('================================================');
  console.log('');

  try {
    // Read migration file for reference
    const migrationPath = path.join(__dirname, '079_enable_pg_trgm_extension.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL:');
    console.log('---');
    console.log(migrationSQL);
    console.log('---');
    console.log('');

    console.log('⚠️  MANUAL EXECUTION REQUIRED');
    console.log('');
    console.log('This migration must be executed manually via Supabase Dashboard:');
    console.log('');
    console.log('Steps:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Create a new query');
    console.log('3. Copy and paste the SQL above');
    console.log('4. Click "Run" to execute');
    console.log('');
    console.log('After execution, verify with:');
    console.log('  SELECT * FROM pg_extension WHERE extname = \'pg_trgm\';');
    console.log('');
    console.log('================================================');
    console.log('');
    console.log('Press Ctrl+C to exit, or wait for automatic verification...');
    console.log('');

    // Wait a moment for user to read
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try to verify if extension is already enabled
    console.log('🔍 Checking if pg_trgm extension is already enabled...');
    
    // Use a simple query to check extensions
    const { data: extensions, error: queryError } = await supabase
      .rpc('get_extensions')
      .select('*');

    if (queryError) {
      console.log('⚠️  Could not query extensions automatically');
      console.log('   Error:', queryError.message);
      console.log('');
      console.log('Please verify manually in Supabase Dashboard:');
      console.log('  SQL Editor → Run: SELECT * FROM pg_extension WHERE extname = \'pg_trgm\';');
      console.log('');
      console.log('If the extension is not enabled, execute the SQL shown above.');
    } else {
      console.log('✅ Extension query successful');
      console.log('   Extensions found:', extensions);
    }

    console.log('');
    console.log('================================================');
    console.log('📋 Migration 079 preparation complete');
    console.log('');
    console.log('Next steps:');
    console.log('1. Execute the SQL in Supabase Dashboard (if not already done)');
    console.log('2. Verify extension is enabled');
    console.log('3. Run migration 080 to create search filter indexes');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('');
    console.log('Please execute the migration manually via Supabase Dashboard.');
    process.exit(1);
  }
}

// Run migration
runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
