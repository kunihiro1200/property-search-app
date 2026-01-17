import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixAA12766Sellers() {
  console.log('=== Fixing AA12766 in Sellers Table ===\n');

  // sellersテーブルを確認
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA12766')
    .single();

  if (sellerError) {
    console.log('sellersテーブルのエラー:', sellerError.message);
    return;
  }

  if (!seller) {
    console.log('sellersテーブルにAA12766が見つかりません');
    return;
  }

  console.log('sellersテーブルの現在のデータ:');
  console.log(`  売主番号: ${seller.seller_number}`);
  console.log(`  住所: ${seller.address}`);
  
  // distribution_areasカラムがあるか確認
  if ('distribution_areas' in seller) {
    console.log(`  現在の配信エリア: ${seller.distribution_areas}`);
  } else {
    console.log('  distribution_areasカラムは存在しません');
  }
  
  console.log();

  // 石垣東のマッピングを取得
  const { data: mapping } = await supabase
    .from('beppu_area_mapping')
    .select('*')
    .eq('region_name', '石垣東')
    .single();

  if (!mapping) {
    console.log('石垣東のマッピングが見つかりません');
    return;
  }

  console.log('石垣東のマッピング:');
  console.log(`  配信エリア: ${mapping.distribution_areas}`);
  console.log();

  // distribution_areasカラムがある場合のみ更新
  if ('distribution_areas' in seller) {
    const { error: updateError } = await supabase
      .from('sellers')
      .update({ distribution_areas: mapping.distribution_areas })
      .eq('seller_number', 'AA12766');

    if (updateError) {
      console.error('更新エラー:', updateError);
      return;
    }

    console.log('✓ sellersテーブルの配信エリアを更新しました');

    // 更新後のデータを確認
    const { data: updated } = await supabase
      .from('sellers')
      .select('seller_number, address, distribution_areas')
      .eq('seller_number', 'AA12766')
      .single();

    console.log('\n更新後のデータ:');
    console.log(`  売主番号: ${updated?.seller_number}`);
    console.log(`  住所: ${updated?.address}`);
    console.log(`  配信エリア: ${updated?.distribution_areas}`);
  }
}

fixAA12766Sellers().catch(console.error);
