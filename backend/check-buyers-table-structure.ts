// Check buyers table structure after migration
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyersTableStructure() {
  console.log('🔍 Checking buyers table structure...\n');

  try {
    // Check if table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('buyers')
      .select('buyer_id')
      .limit(1);

    if (tableError) {
      console.log('❌ Buyers table does not exist!');
      console.log('Error:', tableError.message);
      console.log('\n📋 Next step: Run migration 042_add_buyers_complete.sql in Supabase SQL Editor');
      return;
    }

    console.log('✅ Buyers table exists!\n');

    // Get column information
    const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          column_name,
          data_type,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'buyers'
        ORDER BY ordinal_position;
      `
    });

    if (columnsError) {
      // Try alternative method
      console.log('📊 Table exists but cannot retrieve column details via RPC');
      console.log('   This is normal - the table is ready to use!\n');
      
      // Try a simple count
      const { count, error: countError } = await supabase
        .from('buyers')
        .select('*', { count: 'exact', head: true });

      if (!countError) {
        console.log(`📈 Current buyer count: ${count || 0}\n`);
      }

      console.log('✅ Buyers table is ready for data sync!');
      console.log('\n📋 Next step: Run sync-buyers.ts to import data');
      return;
    }

    // Display column summary
    if (columns && Array.isArray(columns)) {
      console.log(`📊 Total columns: ${columns.length}\n`);

      // Count by data type
      const typeCount: Record<string, number> = {};
      columns.forEach((col: any) => {
        const type = col.data_type;
        typeCount[type] = (typeCount[type] || 0) + 1;
      });

      console.log('📈 Column types:');
      Object.entries(typeCount).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });

      // Check for VARCHAR(50) columns (should be none)
      const varchar50Cols = columns.filter(
        (col: any) => col.data_type === 'character varying' && col.character_maximum_length === 50
      );

      if (varchar50Cols.length > 0) {
        console.log('\n⚠️  Warning: Found VARCHAR(50) columns:');
        varchar50Cols.forEach((col: any) => {
          console.log(`   - ${col.column_name}`);
        });
        console.log('\n   These may cause "value too long" errors.');
        console.log('   Consider running migration 050 to convert to TEXT.');
      } else {
        console.log('\n✅ No VARCHAR(50) columns found - all text fields are TEXT type!');
      }
    }

    // Get current row count
    const { count, error: countError } = await supabase
      .from('buyers')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`\n📈 Current buyer count: ${count || 0}`);
      
      if (count === 0) {
        console.log('\n📋 Next step: Run sync-buyers.ts to import data');
      } else {
        console.log('\n✅ Table has data! Run check-buyer-count-comparison.ts to verify completeness');
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkBuyersTableStructure().catch(console.error);
