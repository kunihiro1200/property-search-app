import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkCC21Status() {
  console.log('🔍 CC21の現在の状態を確認中...\n');

  // 1. property_listingsテーブルでCC21を確認
  console.log('1️⃣ property_listingsテーブルを確認:');
  const { data: propertyListing, error: listingError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'CC21')
    .single();

  if (listingError) {
    console.error('❌ property_listingsエラー:', listingError.message);
  } else if (propertyListing) {
    console.log('✅ property_listingsに存在:');
    console.log('   - UUID:', propertyListing.id);
    console.log('   - 物件番号:', propertyListing.property_number);
    console.log('   - ATBB状態:', propertyListing.atbb_status);
    console.log('   - 物件種別:', propertyListing.property_type);
  } else {
    console.log('❌ property_listingsに存在しない');
  }

  console.log('\n2️⃣ property_detailsテーブルを確認:');
  const { data: propertyDetails, error: detailsError } = await supabase
    .from('property_details')
    .select('*')
    .eq('property_number', 'CC21');

  if (detailsError) {
    console.error('❌ property_detailsエラー:', detailsError.message);
  } else if (propertyDetails && propertyDetails.length > 0) {
    console.log(`✅ property_detailsに${propertyDetails.length}件存在:`);
    propertyDetails.forEach((detail, index) => {
      console.log(`\n   [${index + 1}] おすすめコメント:`);
      console.log('   - ID:', detail.id);
      console.log('   - 物件番号:', detail.property_number);
      console.log('   - コメント:', detail.recommended_comment?.substring(0, 50) + '...');
      console.log('   - 作成日:', detail.created_at);
    });
  } else {
    console.log('❌ property_detailsに存在しない');
  }

  // 3. 本番環境のAPIをテスト
  console.log('\n3️⃣ 本番環境のAPIをテスト:');
  try {
    const response = await fetch('https://baikyaku-property-site3.vercel.app/api/public/properties/CC21');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ APIレスポンス成功:');
      console.log('   - 物件番号:', data.property_number);
      console.log('   - おすすめコメント件数:', data.recommended_comments?.length || 0);
      
      if (data.recommended_comments && data.recommended_comments.length > 0) {
        console.log('\n   おすすめコメント:');
        data.recommended_comments.forEach((comment: any, index: number) => {
          console.log(`   [${index + 1}] ${comment.substring(0, 50)}...`);
        });
      } else {
        console.log('   ⚠️ おすすめコメントが空です');
      }
    } else {
      console.error('❌ APIエラー:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ API接続エラー:', error);
  }

  console.log('\n✅ 確認完了');
}

checkCC21Status().catch(console.error);
