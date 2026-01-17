import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function countMissingProperties() {
  console.log('🔍 物件データが不足している売主を確認します\n');

  // 売主の総数を取得
  const { count: totalSellers, error: countError } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ エラー:', countError.message);
    return;
  }

  console.log(`📊 売主の総数: ${totalSellers}件`);

  // 全売主を取得して物件の有無を確認
  console.log('\n📊 詳細確認中...');
  const { data: allSellers, error: allSellersError } = await supabase
    .from('sellers')
    .select('id, seller_number');

  if (allSellersError) {
    console.error('❌ エラー:', allSellersError.message);
    return;
  }

  let missingCount = 0;
  const missingSellers: string[] = [];

  for (const seller of allSellers || []) {
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('seller_id', seller.id)
      .limit(1);

    if (!properties || properties.length === 0) {
      missingCount++;
      if (missingSellers.length < 20) {
        missingSellers.push(seller.seller_number);
      }
    }
  }

  console.log(`\n📊 結果:`);
  console.log(`   売主の総数: ${allSellers?.length}件`);
  console.log(`   物件データあり: ${(allSellers?.length || 0) - missingCount}件`);
  console.log(`   物件データなし: ${missingCount}件`);
  console.log(`\n最初の20件の売主番号:`);
  missingSellers.forEach((num) => console.log(`   - ${num}`));
}

countMissingProperties()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
