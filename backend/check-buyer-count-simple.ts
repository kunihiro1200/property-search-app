// データベースの買主数を確認
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyerCount() {
  console.log('=== データベースの買主数を確認 ===\n');

  // 総買主数
  const { count: totalCount, error: error1 } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true });

  if (error1) {
    console.error('Error:', error1);
    return;
  }

  console.log(`総買主数: ${totalCount}件`);

  // property_numberが設定されている買主数
  const { count: withPropertyCount, error: error2 } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true })
    .not('property_number', 'is', null);

  if (error2) {
    console.error('Error:', error2);
    return;
  }

  console.log(`property_number設定済み: ${withPropertyCount}件`);
  console.log(`property_number未設定: ${(totalCount || 0) - (withPropertyCount || 0)}件`);

  // 最新の買主番号を確認
  const { data: latestBuyers, error: error3 } = await supabase
    .from('buyers')
    .select('buyer_number, name, property_number, synced_at')
    .order('buyer_number', { ascending: false })
    .limit(10);

  if (error3) {
    console.error('Error:', error3);
    return;
  }

  console.log('\n最新の買主（買主番号降順、10件）:');
  latestBuyers?.forEach(b => {
    console.log(`  ${b.buyer_number} - ${b.name || '(名前なし)'} - property_number: ${b.property_number || '(未設定)'}`);
  });

  // 買主番号6000以降を確認
  const { count: after6000Count, error: error4 } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true })
    .gte('buyer_number', '6000');

  if (error4) {
    console.error('Error:', error4);
    return;
  }

  console.log(`\n買主番号6000以降: ${after6000Count}件`);
}

checkBuyerCount().then(() => {
  console.log('\n完了');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
