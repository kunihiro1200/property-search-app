import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function runMigration099() {
  console.log('🔄 Running migration 099: Add storage_location_manually_set column\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Read migration file
  const migrationPath = path.join(__dirname, 'migrations', '099_add_storage_location_manually_set.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📄 Migration SQL:');
  console.log(migrationSQL);
  console.log('\n');

  try {
    // Execute migration
    console.log('⚙️ Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Verification:');

    // Verify column was added
    const { data: columns, error: verifyError } = await supabase
      .from('property_listings')
      .select('storage_location_manually_set')
      .limit(1);

    if (verifyError) {
      console.error('⚠️ Verification failed:', verifyError);
      console.log('Note: Column might still be added. Check database manually.');
    } else {
      console.log('✅ Column storage_location_manually_set exists and is accessible');
    }

    // Check how many properties have the flag set
    const { count, error: countError } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .eq('storage_location_manually_set', true);

    if (!countError) {
      console.log(`📊 Properties with manually_set flag: ${count || 0}`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

runMigration099().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
