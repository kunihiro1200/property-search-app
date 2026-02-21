// property_listingsテーブルのカラム名を確認するスクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkColumns() {
  console.log('='.repeat(80));
  console.log(`property_listingsテーブルのカラム名を確認`);
  console.log('='.repeat(80));
  console.log();
  
  // 1件のデータを取得してカラム名を確認
  const { data, error } = await supabase
    .from('property_listings')
    .select('*')
    .limit(1)
    .single();
  
  if (error) {
    console.log(`❌ エラー: ${error.message}`);
    return;
  }
  
  if (!data) {
    console.log(`❌ データが見つかりません`);
    return;
  }
  
  console.log('✅ カラム名一覧:');
  console.log();
  
  const columns = Object.keys(data);
  columns.sort();
  
  // 配信エリア関連のカラムを探す
  const distributionColumns = columns.filter(col => 
    col.toLowerCase().includes('distribution') || 
    col.toLowerCase().includes('area') ||
    col.toLowerCase().includes('配信') ||
    col.toLowerCase().includes('エリア')
  );
  
  console.log('配信エリア関連のカラム:');
  if (distributionColumns.length > 0) {
    distributionColumns.forEach(col => {
      console.log(`  - ${col}: ${data[col]}`);
    });
  } else {
    console.log('  (見つかりません)');
  }
  console.log();
  
  console.log('全カラム一覧:');
  columns.forEach((col, index) => {
    const value = data[col];
    const displayValue = value === null ? '(null)' : 
                        value === undefined ? '(undefined)' :
                        typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' :
                        typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' :
                        value;
    console.log(`  ${(index + 1).toString().padStart(2, ' ')}. ${col.padEnd(30, ' ')} : ${displayValue}`);
  });
  console.log();
  
  console.log('='.repeat(80));
}

checkColumns()
  .then(() => {
    console.log('確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  });
