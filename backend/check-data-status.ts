import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDataStatus() {
  console.log('=== データベース状況確認 ===\n');

  // 買主データの確認
  const { data: buyers, error: buyersError, count: buyersCount } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: false })
    .limit(5);

  console.log('【買主データ】');
  if (buyersError) {
    console.error('エラー:', buyersError.message);
  } else {
    console.log(`総件数: ${buyersCount}件`);
    console.log('最初の5件:');
    console.log(buyers);
  }

  console.log('\n');

  // 物件データの確認
  const { data: properties, error: propertiesError, count: propertiesCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: false })
    .limit(5);

  console.log('【物件データ】');
  if (propertiesError) {
    console.error('エラー:', propertiesError.message);
  } else {
    console.log(`総件数: ${propertiesCount}件`);
    console.log('最初の5件:');
    console.log(properties);
  }

  console.log('\n');

  // 売主データの確認
  const { data: sellers, error: sellersError, count: sellersCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: false })
    .limit(5);

  console.log('【売主データ】');
  if (sellersError) {
    console.error('エラー:', sellersError.message);
  } else {
    console.log(`総件数: ${sellersCount}件`);
    console.log('最初の5件:');
    console.log(sellers);
  }
}

checkDataStatus().catch(console.error);
