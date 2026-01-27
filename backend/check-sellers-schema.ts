/**
 * sellersテーブルのスキーマを確認
 */
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 環境変数を読み込む
dotenv.config({ path: '.env.local' });

async function checkSellersSchema() {
  try {
    console.log('🔍 Checking sellers table schema...\n');

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // sellersテーブルから1件取得してカラムを確認
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('📊 Sellers table columns:');
      console.log('='.repeat(80));
      
      columns.sort().forEach((col, index) => {
        console.log(`${(index + 1).toString().padStart(3, ' ')}. ${col}`);
      });

      console.log('\n' + '='.repeat(80));
      console.log(`Total columns: ${columns.length}`);

      // pinrichとnot_reachableの存在を確認
      console.log('\n' + '='.repeat(80));
      console.log('Checking for pinrich and not_reachable columns:');
      console.log('='.repeat(80));
      console.log(`  pinrich: ${columns.includes('pinrich') ? '✅ EXISTS' : '❌ NOT FOUND'}`);
      console.log(`  not_reachable: ${columns.includes('not_reachable') ? '✅ EXISTS' : '❌ NOT FOUND'}`);
      console.log(`  pinrich_status: ${columns.includes('pinrich_status') ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSellersSchema();
