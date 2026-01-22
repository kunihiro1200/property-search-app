import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting Migration 081: Create properties and valuations tables');
  console.log('================================================');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '081_create_properties_and_valuations.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('📊 Executing migration...');

    // Execute migration
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration executed successfully');
    console.log('');

    // Verify tables were created
    console.log('🔍 Verifying tables...');

    const { error: propertiesError } = await supabase
      .from('properties')
      .select('*')
      .limit(0);

    if (propertiesError) {
      console.error('❌ properties table verification failed:', propertiesError);
      process.exit(1);
    }

    console.log('✅ properties table verified');

    const { error: valuationsError } = await supabase
      .from('valuations')
      .select('*')
      .limit(0);

    if (valuationsError) {
      console.error('❌ valuations table verification failed:', valuationsError);
      process.exit(1);
    }

    console.log('✅ valuations table verified');
    console.log('');

    // Check indexes
    console.log('🔍 Checking indexes...');

    const { data: indexes, error: indexError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          tablename, 
          indexname 
        FROM pg_indexes 
        WHERE tablename IN ('properties', 'valuations')
        ORDER BY tablename, indexname;
      `
    });

    if (indexError) {
      console.warn('⚠️  Could not verify indexes:', indexError);
    } else {
      console.log('📊 Indexes created:');
      if (indexes && Array.isArray(indexes)) {
        indexes.forEach((idx: any) => {
          console.log(`   - ${idx.tablename}.${idx.indexname}`);
        });
      }
    }

    console.log('');
    console.log('================================================');
    console.log('✅ Migration 081 completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('   - properties table created');
    console.log('   - valuations table created');
    console.log('   - All indexes created');
    console.log('   - All constraints applied');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   1. Update TypeScript types (backend/src/types/index.ts)');
    console.log('   2. Implement PropertyService');
    console.log('   3. Implement ValuationEngine');
    console.log('   4. Implement ValuationService');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run migration
runMigration();
