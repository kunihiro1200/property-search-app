import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkReceptionDateInDb() {
  console.log('=== データベースの受付日確認 ===\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 最新の10件を取得
  const { data: buyers, error } = await supabase
    .from('buyers')
    .select('buyer_number, reception_date, name')
    .order('buyer_number', { ascending: false })
    .limit(20);

  if (error) {
    console.error('エラー:', error);
    return;
  }

  console.log('最新20件の買主データ:');
  let hasReceptionDate = 0;
  let noReceptionDate = 0;

  buyers?.forEach(buyer => {
    const status = buyer.reception_date ? '✅' : '❌';
    console.log(`${status} 買主番号: ${buyer.buyer_number}, 受付日: ${buyer.reception_date || 'なし'}`);
    
    if (buyer.reception_date) {
      hasReceptionDate++;
    } else {
      noReceptionDate++;
    }
  });

  console.log(`\n統計:`);
  console.log(`  受付日あり: ${hasReceptionDate}件`);
  console.log(`  受付日なし: ${noReceptionDate}件`);

  // 特定の買主を確認
  console.log('\n買主番号6647の詳細:');
  const { data: buyer6647 } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6647')
    .single();

  if (buyer6647) {
    console.log('  買主番号:', buyer6647.buyer_number);
    console.log('  氏名:', buyer6647.name);
    console.log('  受付日:', buyer6647.reception_date);
  } else {
    console.log('  買主番号6647が見つかりません');
  }

  console.log('\n=== 確認完了 ===');
}

checkReceptionDateInDb().catch(console.error);
