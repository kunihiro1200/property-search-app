import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBuyersColumns() {
  console.log('=== buyersテーブルのカラム確認 ===\n');

  // サンプルデータを1件取得してカラム名を確認
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.log('❌ エラー:', error.message);
    return;
  }

  if (data) {
    console.log('✅ カラム一覧:\n');
    const columns = Object.keys(data).sort();
    columns.forEach(col => {
      const value = data[col];
      const type = value === null ? 'null' : typeof value;
      console.log(`  - ${col}: ${type}`);
    });

    // 日付関連のカラムを探す
    console.log('\n日付関連のカラム:');
    const dateColumns = columns.filter(col => 
      col.includes('date') || col.includes('Date') || col.includes('_at')
    );
    dateColumns.forEach(col => {
      console.log(`  - ${col}: ${data[col]}`);
    });
  }
}

checkBuyersColumns().catch(console.error);
