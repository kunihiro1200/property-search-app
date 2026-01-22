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
  try {
    console.log('🚀 Starting migration 080: Add Search Filter Indexes');
    console.log('📋 This migration creates indexes for:');
    console.log('   - Location (address) search with GIN trigram index');
    console.log('   - Building age filtering with B-tree index');
    console.log('   - Property number search with GIN trigram index');
    console.log('');

    // Read the migration file
    const migrationPath = path.join(__dirname, '080_add_search_filter_indexes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration SQL...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      // If RPC doesn't exist, try direct execution
      console.log('⚠️  RPC method not available, trying direct execution...');
      
      // Split SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const { error: execError } = await supabase.rpc('exec', {
          query: statement
        });
        
        if (execError) {
          throw execError;
        }
      }
    }

    console.log('✅ Migration 080 completed successfully!');
    console.log('');
    console.log('📊 Created indexes:');
    console.log('   ✓ idx_property_listings_address_gin (GIN trigram)');
    console.log('   ✓ idx_property_listings_construction_year_month (B-tree)');
    console.log('   ✓ idx_property_listings_property_number_gin (GIN trigram)');
    console.log('');
    console.log('🔍 To verify indexes, run in Supabase SQL Editor:');
    console.log('   SELECT indexname, indexdef FROM pg_indexes WHERE tablename = \'property_listings\';');
    console.log('');
    console.log('⚡ Performance improvements:');
    console.log('   - Location search: Fast partial text matching');
    console.log('   - Building age filter: Efficient range queries');
    console.log('   - Property number search: Fast partial text matching');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Ensure migration 079 (pg_trgm extension) was executed first');
    console.error('   2. Check that property_listings table exists');
    console.error('   3. Verify database connection settings');
    console.error('   4. Try running the SQL directly in Supabase Dashboard');
    process.exit(1);
  }
}

// Run the migration
runMigration();
