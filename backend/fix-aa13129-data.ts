// AA13129のデータを修正するスクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixAA13129() {
  console.log('=== AA13129のデータ修正 ===\n');

  // 1. 現在のデータを確認
  console.log('1. 現在のデータを確認中...');
  const { data: seller, error: fetchError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13129')
    .single();

  if (fetchError || !seller) {
    console.error('❌ 売主が見つかりません:', fetchError);
    return;
  }

  console.log('✅ 現在のデータ:');
  console.log('  - 売主番号:', seller.seller_number);
  console.log('  - 住所:', seller.address);
  console.log('  - 市:', seller.city || '(未設定)');
  console.log('  - Google Map URL:', seller.google_map_url || '(未設定)');
  console.log('');

  // 2. 住所から市を抽出
  let city = seller.city;
  if (!city && seller.address) {
    if (seller.address.includes('大分市')) {
      city = '大分市';
    } else if (seller.address.includes('別府市')) {
      city = '別府市';
    }
  }

  console.log('2. 修正内容:');
  console.log('  - 市:', city || '(抽出できませんでした)');
  console.log('');

  // 3. Google Map URLを設定（大分市田尻北3-14の座標）
  const googleMapUrl = 'https://www.google.com/maps/place/33.2394,131.6789';
  
  console.log('3. Google Map URLを設定:');
  console.log('  - URL:', googleMapUrl);
  console.log('  ⚠️  注意: これは仮のURLです。正確な座標を確認してください。');
  console.log('');

  // 4. データを更新
  console.log('4. データを更新中...');
  const { error: updateError } = await supabase
    .from('sellers')
    .update({
      city: city,
      google_map_url: googleMapUrl
    })
    .eq('id', seller.id);

  if (updateError) {
    console.error('❌ 更新に失敗しました:', updateError);
    return;
  }

  console.log('✅ データを更新しました');
  console.log('');

  // 5. 物件リスティングを作成または更新
  console.log('5. 物件リスティングを確認中...');
  const { data: listing, error: listingFetchError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('seller_id', seller.id)
    .single();

  if (listingFetchError && listingFetchError.code !== 'PGRST116') {
    console.error('❌ 物件リスティングの取得に失敗:', listingFetchError);
    return;
  }

  if (!listing) {
    console.log('⚠️  物件リスティングが存在しません。作成します...');
    
    const { error: insertError } = await supabase
      .from('property_listings')
      .insert({
        seller_id: seller.id,
        google_map_url: googleMapUrl,
        city: city,
        address: seller.address,
        property_type: seller.property_type,
        status: seller.status
      });

    if (insertError) {
      console.error('❌ 物件リスティングの作成に失敗:', insertError);
      return;
    }

    console.log('✅ 物件リスティングを作成しました');
  } else {
    console.log('✅ 物件リスティングが存在します');
    
    const { error: updateListingError } = await supabase
      .from('property_listings')
      .update({
        google_map_url: googleMapUrl,
        city: city
      })
      .eq('id', listing.id);

    if (updateListingError) {
      console.error('❌ 物件リスティングの更新に失敗:', updateListingError);
      return;
    }

    console.log('✅ 物件リスティングを更新しました');
  }
  console.log('');

  // 6. 配信エリアを再計算
  console.log('6. 配信エリアを再計算するには、UIで「再計算」ボタンをクリックしてください');
  console.log('');

  console.log('=== 修正完了 ===');
  console.log('');
  console.log('次のステップ:');
  console.log('1. 正確なGoogle Map URLを確認してください');
  console.log('2. area_map_configテーブルに★エリアの⑦の設定があるか確認してください');
  console.log('3. UIで配信エリアの「再計算」ボタンをクリックしてください');
}

fixAA13129()
  .then(() => {
    console.log('\n処理完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nエラー:', error);
    process.exit(1);
  });
