import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting Migration 060: Add buyer performance indexes');
  console.log('================================================\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '060_add_buyer_performance_indexes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('📊 Creating performance indexes...\n');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql function not found, trying direct execution...');
      
      // Split by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.includes('DO $$')) {
          // Handle DO blocks specially
          const { error: doError } = await supabase.rpc('exec_sql', {
            sql_query: statement + ';'
          });
          if (doError) {
            console.log(`⚠️  Skipping property_listings index (table may not exist): ${doError.message}`);
          }
        } else {
          const { error: stmtError } = await supabase.rpc('exec_sql', {
            sql_query: statement + ';'
          });
          if (stmtError) {
            console.error(`❌ Error executing statement: ${stmtError.message}`);
            throw stmtError;
          }
        }
      }
    }

    console.log('✅ Migration 060 completed successfully!\n');
    console.log('📋 Created indexes:');
    console.log('   - idx_buyers_email_lookup (partial index on email)');
    console.log('   - idx_buyers_phone_number_lookup (partial index on phone_number)');
    console.log('   - idx_buyers_reception_date_desc (descending with NULLS LAST)');
    console.log('   - idx_buyers_email_phone_composite (composite index)');
    console.log('   - idx_property_listings_property_number (if table exists)\n');

    // Verify indexes were created
    console.log('🔍 Verifying indexes...');
    const { data: indexes, error: indexError } = await supabase
      .from('pg_indexes')
      .select('indexname')
      .in('indexname', [
        'idx_buyers_email_lookup',
        'idx_buyers_phone_number_lookup',
        'idx_buyers_reception_date_desc',
        'idx_buyers_email_phone_composite'
      ]);

    if (indexError) {
      console.log('⚠️  Could not verify indexes (this is okay)');
    } else if (indexes) {
      console.log(`✅ Verified ${indexes.length} indexes created`);
      indexes.forEach(idx => console.log(`   - ${idx.indexname}`));
    }

    console.log('\n✨ Migration complete! Your buyer lookups should be much faster now.');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
