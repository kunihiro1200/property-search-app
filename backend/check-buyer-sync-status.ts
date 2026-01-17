import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyerSyncStatus() {
  console.log('=== 買主データの同期状況を確認 ===\n');

  // 1. buyersテーブルの総数
  const { count: totalBuyers, error: error1 } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true });

  if (error1) {
    console.error('Error:', error1);
    return;
  }

  console.log(`buyersテーブルの総数: ${totalBuyers || 0}件`);

  // 2. property_numberが設定されている買主の数
  const { count: withProperty, error: error2 } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true })
    .not('property_number', 'is', null)
    .neq('property_number', '');

  if (error2) {
    console.error('Error:', error2);
    return;
  }

  console.log(`property_numberが設定されている買主: ${withProperty || 0}件`);

  // 3. 最近作成された買主を確認
  const { data: recentBuyers, error: error3 } = await supabase
    .from('buyers')
    .select('buyer_number, name, property_number, db_created_at')
    .order('db_created_at', { ascending: false })
    .limit(10);

  if (error3) {
    console.error('Error:', error3);
    return;
  }

  console.log('\n最近作成された買主（最新10件）:');
  recentBuyers?.forEach(b => {
    console.log(`  ${b.buyer_number} - ${b.name} (物件: ${b.property_number || '未設定'}) - ${b.db_created_at}`);
  });

  // 4. synced_atが設定されている買主（スプレッドシートから同期された買主）
  const { count: syncedCount, error: error4 } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true })
    .not('synced_at', 'is', null);

  if (error4) {
    console.error('Error:', error4);
    return;
  }

  console.log(`\nスプレッドシートから同期された買主: ${syncedCount || 0}件`);

  // 5. 物件番号が設定されている買主のサンプル
  const { data: sampleBuyers, error: error5 } = await supabase
    .from('buyers')
    .select('buyer_number, name, property_number')
    .not('property_number', 'is', null)
    .neq('property_number', '')
    .limit(20);

  if (error5) {
    console.error('Error:', error5);
    return;
  }

  console.log('\n物件番号が設定されている買主のサンプル（20件）:');
  sampleBuyers?.forEach(b => {
    console.log(`  ${b.buyer_number} - ${b.name} - 物件: ${b.property_number}`);
  });
}

checkBuyerSyncStatus().then(() => {
  console.log('\n完了');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
