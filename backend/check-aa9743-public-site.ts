import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAA9743() {
  console.log('=== AA9743 公開サイト表示状態チェック ===\n');

  // 1. property_listingsテーブルから物件情報を取得
  const { data: propertyListing, error: listingError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA9743')
    .single();

  if (listingError) {
    console.error('❌ property_listings取得エラー:', listingError);
    return;
  }

  console.log('📋 property_listings データ:');
  console.log('  物件番号:', propertyListing.property_number);
  console.log('  ATBB状態:', propertyListing.atbb_status);
  console.log('  価格:', propertyListing.price);
  console.log('  住所:', propertyListing.address);
  console.log('  物件種別:', propertyListing.property_type);
  console.log('  格納先URL:', propertyListing.storage_location);
  console.log('  作成日:', propertyListing.created_at);
  console.log('  更新日:', propertyListing.updated_at);
  console.log();

  // 2. property_detailsテーブルから詳細情報を取得
  const { data: propertyDetails, error: detailsError } = await supabase
    .from('property_details')
    .select('*')
    .eq('property_number', 'AA9743')
    .single();

  if (detailsError) {
    console.error('❌ property_details取得エラー:', detailsError);
  } else {
    console.log('📝 property_details データ:');
    console.log('  おすすめコメント:', propertyDetails.recommended_comment ? '✅ あり' : '❌ なし');
    console.log('  お気に入り文言:', propertyDetails.favorite_comment ? '✅ あり' : '❌ なし');
    console.log('  パノラマURL:', propertyDetails.panorama_url ? '✅ あり' : '❌ なし');
    console.log('  画像URL配列:', propertyDetails.image_urls ? `✅ ${propertyDetails.image_urls.length}枚` : '❌ なし');
    console.log();
  }

  // 3. 公開物件APIで取得できるか確認（正しいロジック：「公開中」を含む）
  const { data: publicProperties, error: publicError } = await supabase
    .from('property_listings')
    .select(`
      *,
      property_details (
        recommended_comments,
        favorite_comment,
        panorama_url,
        image_urls,
        hidden_images
      )
    `)
    .eq('property_number', 'AA9743')
    .not('atbb_status', 'is', null)
    .ilike('atbb_status', '%公開中%');

  console.log('🌐 公開物件APIでの取得結果:');
  if (publicError) {
    console.error('  ❌ エラー:', publicError);
  } else if (!publicProperties || publicProperties.length === 0) {
    console.log('  ❌ 取得できません');
  } else {
    console.log('  ✅ 取得できます');
    console.log('  取得件数:', publicProperties.length);
    if (publicProperties[0].property_details) {
      console.log('  property_details:', {
        recommended_comments: publicProperties[0].property_details.recommended_comments ? '✅ あり' : '❌ なし',
        favorite_comment: publicProperties[0].property_details.favorite_comment ? '✅ あり' : '❌ なし',
        panorama_url: publicProperties[0].property_details.panorama_url ? '✅ あり' : '❌ なし',
        image_urls: publicProperties[0].property_details.image_urls ? `✅ ${publicProperties[0].property_details.image_urls.length}枚` : '❌ なし',
      });
    }
  }
  console.log();

  // 4. 表示されない原因の診断
  console.log('🔍 診断結果:');
  
  const hasPublicStatus = propertyListing.atbb_status && propertyListing.atbb_status.includes('公開中');
  if (!hasPublicStatus) {
    console.log('  ❌ ATBB状態に「公開中」が含まれていません');
    console.log(`     現在の状態: ${propertyListing.atbb_status}`);
    console.log('     → 物件リストスプレッドシートで「atbb成約済み/非公開」列を「〇〇・公開中」に変更してください');
  } else {
    console.log('  ✅ ATBB状態に「公開中」が含まれています');
    console.log(`     現在の状態: ${propertyListing.atbb_status}`);
  }

  if (!propertyDetails) {
    console.log('  ❌ property_detailsにデータがありません');
    console.log('     → 同期処理を実行してください');
  } else {
    console.log('  ✅ property_detailsにデータがあります');
  }

  if (propertyDetails && !propertyDetails.image_urls) {
    console.log('  ⚠️  画像URLが設定されていません');
    console.log('     → 画像同期処理を実行してください');
  }

  if (propertyDetails && !propertyDetails.recommended_comment) {
    console.log('  ⚠️  おすすめコメントが設定されていません');
  }

  if (propertyDetails && !propertyDetails.favorite_comment) {
    console.log('  ⚠️  お気に入り文言が設定されていません');
  }
}

checkAA9743().catch(console.error);
