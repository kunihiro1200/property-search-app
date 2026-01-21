import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

/**
 * CC21のデータを確認
 */
async function checkCC21Data() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('🔍 CC21のデータを確認中...\n');

  try {
    // 1. property_listingsテーブルからCC21を取得
    const { data: property, error: propertyError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'CC21')
      .single();

    if (propertyError) {
      console.error('❌ Property error:', propertyError);
      return;
    }

    if (!property) {
      console.error('❌ CC21が見つかりません');
      return;
    }

    console.log('✅ CC21の基本情報:');
    console.log('   物件番号:', property.property_number);
    console.log('   住所:', property.address);
    console.log('   ATBB状態:', property.atbb_status);
    console.log('   storage_location:', property.storage_location);
    console.log('   athome_data:', property.athome_data);
    console.log('');

    // 2. property_detailsテーブルからCC21の詳細を取得（複数ある可能性）
    const { data: detailsList, error: detailsError } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_number', 'CC21');

    if (detailsError) {
      console.log('⚠️ property_detailsエラー:', detailsError.message);
    } else if (detailsList && detailsList.length > 0) {
      console.log(`✅ property_detailsの情報（${detailsList.length}件）:`);
      detailsList.forEach((details, index) => {
        console.log(`\n   [${index + 1}]`);
        console.log('   id:', details.id);
        console.log('   favorite_comment:', details.favorite_comment);
        console.log('   recommended_comments:', details.recommended_comments ? 'あり' : 'なし');
        console.log('   property_about:', details.property_about ? 'あり' : 'なし');
      });
      console.log('');
    } else {
      console.log('⚠️ property_detailsにCC21のデータがありません');
      console.log('');
    }

    // 3. Complete APIエンドポイントをテスト
    console.log('🧪 Complete APIエンドポイントをテスト...');
    const apiUrl = process.env.VERCEL_API_URL || 'https://baikyaku-property-site3.vercel.app';
    
    const axios = require('axios');
    const response = await axios.get(`${apiUrl}/api/public/properties/CC21/complete`);
    
    console.log('   ステータス:', response.status);
    console.log('   favoriteComment:', response.data.favoriteComment);
    console.log('   recommendedComments:', response.data.recommendedComments ? `あり（${response.data.recommendedComments.length}行）` : 'なし');
    console.log('   propertyAbout:', response.data.propertyAbout);
    console.log('');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkCC21Data();
