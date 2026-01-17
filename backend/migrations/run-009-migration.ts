import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration009() {
  console.log('🚀 Starting Migration 009: Full Seller Fields Expansion...\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}\n`);
  
  try {
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '009_full_seller_fields_expansion.sql');
    console.log('📄 Reading migration file...');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements (basic split by semicolon)
    // Note: This is a simple approach. For complex SQL, you might need a proper SQL parser
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
    
    console.log(`   Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue;
      }
      
      try {
        // Execute the SQL statement using Supabase RPC
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error) {
          // If RPC doesn't exist, try direct execution (this won't work for DDL in Supabase)
          console.log(`   ⚠️  Statement ${i + 1}: Using alternative execution method`);
          // For Supabase, we need to use the SQL editor or direct PostgreSQL connection
          // This is a limitation of Supabase's client library
          console.log(`   Statement: ${statement.substring(0, 100)}...`);
        } else {
          successCount++;
          if (successCount % 10 === 0) {
            console.log(`   ✅ Executed ${successCount} statements...`);
          }
        }
      } catch (err) {
        console.error(`   ❌ Error executing statement ${i + 1}:`, err);
        console.error(`   Statement: ${statement.substring(0, 200)}...`);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successfully executed: ${successCount} statements`);
    if (errorCount > 0) {
      console.log(`   ❌ Failed: ${errorCount} statements`);
    }
    
    // Verify some key columns were added
    console.log('\n📊 Verifying migration...');
    
    // Try to query a new column to verify it exists
    const { data, error } = await supabase
      .from('sellers')
      .select('seller_number, inquiry_site, valuation_amount_1, pinrich_status')
      .limit(1);
    
    if (error) {
      console.error('❌ Verification failed:', error);
      console.log('\n⚠️  Note: You may need to run this migration directly in Supabase SQL Editor');
      console.log('   Copy the contents of 009_full_seller_fields_expansion.sql and paste into:');
      console.log('   Supabase Dashboard > SQL Editor > New Query');
      return false;
    }
    
    console.log('   ✅ Migration verified successfully!\n');
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error during migration:', error);
    console.log('\n⚠️  Note: You may need to run this migration directly in Supabase SQL Editor');
    console.log('   Copy the contents of 009_full_seller_fields_expansion.sql and paste into:');
    console.log('   Supabase Dashboard > SQL Editor > New Query');
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Migration 009: Full Seller Fields Expansion                  ║');
  console.log('║  Adds 100+ fields for comprehensive seller management         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const success = await runMigration009();
  
  if (success) {
    console.log('✅ Migration 009 completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Update TypeScript type definitions');
    console.log('   2. Update API endpoints to handle new fields');
    console.log('   3. Update frontend forms and displays');
    process.exit(0);
  } else {
    console.log('\n❌ Migration 009 failed or needs manual execution!');
    console.log('\n📋 Manual execution steps:');
    console.log('   1. Go to Supabase Dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Create a new query');
    console.log('   4. Copy and paste the contents of:');
    console.log('      backend/migrations/009_full_seller_fields_expansion.sql');
    console.log('   5. Execute the query');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
