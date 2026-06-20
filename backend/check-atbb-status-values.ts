import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// backend/.envファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAtbbStatusValues() {
  console.log('🔍 atbb_statusの全ての値を確認中...\n');
  
  // 1. 全てのユニークなatbb_status値を取得
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('atbb_status')
    .not('atbb_status', 'is', null);
  
  if (error) {
    console.error('❌ エラー:', error);
    return;
  }
  
  if (!properties || properties.length === 0) {
    console.log('❌ データが見つかりません');
    return;
  }
  
  // ユニークな値をカウント
  const statusCounts = new Map<string, number>();
  
  properties.forEach((prop: any) => {
    const status = prop.atbb_status;
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  });
  
  // ソートして表示
  const sortedStatuses = Array.from(statusCounts.entries())
    .sort((a, b) => b[1] - a[1]); // 件数の多い順
  
  console.log('=== atbb_statusの全ての値 ===\n');
  console.log(`合計: ${properties.length}件\n`);
  
  sortedStatuses.forEach(([status, count]) => {
    const percentage = ((count / properties.length) * 100).toFixed(1);
    console.log(`${status}: ${count}件 (${percentage}%)`);
  });
  
  // 2. 「公開」に関連する値を抽出
  console.log('\n=== 「公開」に関連する値 ===\n');
  
  const publicRelated = sortedStatuses.filter(([status]) => 
    status.includes('公開')
  );
  
  publicRelated.forEach(([status, count]) => {
    console.log(`✅ ${status}: ${count}件`);
  });
  
  // 3. 「非公開」に関連する値を抽出
  console.log('\n=== 「非公開」に関連する値 ===\n');
  
  const privateRelated = sortedStatuses.filter(([status]) => 
    status.includes('非公開')
  );
  
  privateRelated.forEach(([status, count]) => {
    console.log(`❌ ${status}: ${count}件`);
  });
  
  // 4. その他の値
  console.log('\n=== その他の値 ===\n');
  
  const others = sortedStatuses.filter(([status]) => 
    !status.includes('公開')
  );
  
  others.forEach(([status, count]) => {
    console.log(`📋 ${status}: ${count}件`);
  });
}

checkAtbbStatusValues().catch(console.error);
