import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyer1811Detail() {
  console.log('=== 買主1811の詳細調査 ===\n');

  const { data: buyer, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '1811')
    .single();

  if (error) {
    console.error('エラー:', error);
    return;
  }

  console.log('買主1811の全データ:');
  console.log(JSON.stringify(buyer, null, 2));

  console.log('\n\n重要フィールド:');
  console.log('buyer_number:', buyer.buyer_number);
  console.log('email:', buyer.email);
  console.log('desired_area (希望エリア):', buyer.desired_area);
  console.log('distribution_areas (配信エリア):', buyer.distribution_areas);
  console.log('desired_property_type:', buyer.desired_property_type);
  console.log('distribution_type:', buyer.distribution_type);
  console.log('distribution_stopped:', buyer.distribution_stopped);
  console.log('pinrich:', buyer.pinrich);
  console.log('latest_status:', buyer.latest_status);

  // 買主テーブルのカラム情報を確認
  console.log('\n\n買主テーブルのカラム一覧:');
  const { data: columns, error: colError } = await supabase
    .rpc('get_table_columns', { table_name: 'buyers' })
    .limit(200);

  if (colError) {
    console.log('カラム情報取得エラー:', colError.message);
    
    // 代替方法: 1件のデータからカラム名を取得
    console.log('\nデータから取得したカラム名:');
    Object.keys(buyer).forEach(key => {
      const value = buyer[key];
      const type = Array.isArray(value) ? 'array' : typeof value;
      console.log(`  ${key}: ${type}`);
    });
  } else {
    columns?.forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
  }
}

checkBuyer1811Detail().catch(console.error);
