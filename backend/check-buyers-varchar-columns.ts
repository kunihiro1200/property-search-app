/**
 * Check which buyers table columns are still VARCHAR(50)
 * Run this BEFORE Migration 050 to see what needs fixing
 * Run this AFTER Migration 050 to verify all are TEXT
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

async function checkBuyersVarcharColumns() {
  console.log('🔍 Checking buyers table column types...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Query to get column information
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        column_name,
        data_type,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'buyers'
        AND table_schema = 'public'
      ORDER BY ordinal_position;
    `
  });

  if (error) {
    console.error('❌ Error querying column info:', error.message);
    console.log('\n💡 Try running this query directly in Supabase SQL Editor:');
    console.log(`
SELECT 
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'buyers'
  AND table_schema = 'public'
ORDER BY ordinal_position;
    `);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('❌ No columns found. Does the buyers table exist?');
    process.exit(1);
  }

  console.log(`✅ Found ${data.length} columns in buyers table\n`);

  // Filter VARCHAR columns
  const varcharColumns = data.filter((col: any) => 
    col.data_type === 'character varying' && col.character_maximum_length === 50
  );

  const textColumns = data.filter((col: any) => col.data_type === 'text');
  const otherColumns = data.filter((col: any) => 
    col.data_type !== 'character varying' && col.data_type !== 'text'
  );

  console.log('📊 Column Type Summary:');
  console.log(`   VARCHAR(50): ${varcharColumns.length} columns`);
  console.log(`   TEXT: ${textColumns.length} columns`);
  console.log(`   Other types: ${otherColumns.length} columns`);
  console.log('');

  if (varcharColumns.length > 0) {
    console.log('⚠️  VARCHAR(50) columns that need fixing:');
    console.log('   (These will cause "value too long" errors)\n');
    
    varcharColumns.forEach((col: any, index: number) => {
      console.log(`   ${index + 1}. ${col.column_name}`);
    });
    
    console.log('');
    console.log(`🚨 Action Required: Run Migration 050 to fix ${varcharColumns.length} VARCHAR(50) columns`);
    console.log('   File: backend/migrations/050_fix_remaining_buyer_varchar_fields.sql');
  } else {
    console.log('✅ No VARCHAR(50) columns found!');
    console.log('   All text columns are properly set to TEXT type.');
    console.log('   Migration 050 has been successfully applied! 🎉');
  }

  console.log('\n📋 Sample of TEXT columns (first 10):');
  textColumns.slice(0, 10).forEach((col: any) => {
    console.log(`   ✓ ${col.column_name}`);
  });
  if (textColumns.length > 10) {
    console.log(`   ... and ${textColumns.length - 10} more TEXT columns`);
  }

  console.log('\n🎯 Next Steps:');
  if (varcharColumns.length > 0) {
    console.log('   1. Run Migration 050 in Supabase SQL Editor');
    console.log('   2. Run this script again to verify');
    console.log('   3. Run: npx ts-node sync-buyers.ts');
    console.log('   4. Run: npx ts-node check-buyer-count-comparison.ts');
  } else {
    console.log('   1. Run: npx ts-node sync-buyers.ts');
    console.log('   2. Run: npx ts-node check-buyer-count-comparison.ts');
    console.log('   3. Verify all buyers are synced successfully!');
  }

  console.log('\n✨ Check complete!');
  process.exit(0);
}

checkBuyersVarcharColumns().catch(console.error);
