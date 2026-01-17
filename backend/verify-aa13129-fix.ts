import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('=== AA13129 修正確認 ===\n');

  // Check property_listings table with all relevant fields
  const { data: listing, error } = await supabase
    .from('property_listings')
    .select('property_number, address, google_map_url, distribution_areas, updated_at')
    .eq('property_number', 'AA13129')
    .maybeSingle();

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (!listing) {
    console.log('❌ AA13129が見つかりません');
    return;
  }

  console.log('✅ AA13129 データ:');
  console.log('  物件番号:', listing.property_number);
  console.log('  住所:', listing.address);
  console.log('  Google Map URL:', listing.google_map_url || '(未設定)');
  console.log('  配信エリア:', listing.distribution_areas || '(未設定)');
  console.log('  更新日時:', listing.updated_at);

  console.log('\n=== 判定 ===');
  if (listing.distribution_areas) {
    console.log('✅ 修正完了: 配信エリアが設定されています');
    console.log('   配信エリア:', listing.distribution_areas);
  } else {
    console.log('⚠️  配信エリアが未設定です');
  }
  
  // Also check sellers table for city
  const { data: seller } = await supabase
    .from('sellers')
    .select('seller_number, city')
    .eq('seller_number', 'AA13129')
    .maybeSingle();
    
  if (seller?.city) {
    console.log('✅ 売主テーブルの市区町村:', seller.city);
  }
}

main();
