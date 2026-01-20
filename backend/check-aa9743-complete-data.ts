import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAA9743CompleteData() {
  console.log('=== AA9743 完全データ確認 ===\n');

  const propertyNumber = 'AA9743';

  try {
    // 1. データベースの property_details を確認
    console.log('1️⃣ データベース (property_details) を確認中...\n');
    
    const { data: dbData, error: dbError } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_number', propertyNumber)
      .single();

    if (dbError || !dbData) {
      console.log('❌ データベースにデータが見つかりません');
      console.error(dbError);
    } else {
      console.log('✅ データベースにデータが存在します\n');
      
      console.log('📊 recommended_comments:');
      if (dbData.recommended_comments && Array.isArray(dbData.recommended_comments)) {
        console.log(`  ✅ ${dbData.recommended_comments.length}行`);
      } else {
        console.log('  ❌ なし');
      }

      console.log('\n📊 favorite_comment:');
      console.log(`  ${dbData.favorite_comment ? '✅ ' + dbData.favorite_comment : '❌ なし'}`);

      console.log('\n📊 athome_data (パノラマURL含む):');
      if (dbData.athome_data && Array.isArray(dbData.athome_data)) {
        console.log(`  ✅ ${dbData.athome_data.length}件`);
        dbData.athome_data.forEach((item: string, index: number) => {
          if (item.includes('vrpanorama')) {
            console.log(`    ${index + 1}: [パノラマURL] ${item.substring(0, 60)}...`);
          } else {
            console.log(`    ${index + 1}: ${item.substring(0, 60)}...`);
          }
        });
      } else {
        console.log('  ❌ なし');
      }

      console.log('\n📊 property_about:');
      if (dbData.property_about) {
        console.log(`  ✅ ${dbData.property_about.substring(0, 100)}...`);
      } else {
        console.log('  ❌ なし');
      }
    }

    // 2. property_listings から物件IDを取得
    console.log('\n\n2️⃣ property_listings から物件情報を取得中...\n');
    
    const { data: propertyData, error: propertyError } = await supabase
      .from('property_listings')
      .select('id, property_number, atbb_status')
      .eq('property_number', propertyNumber)
      .single();

    if (propertyError || !propertyData) {
      console.log('❌ property_listings にデータが見つかりません');
      console.error(propertyError);
      return;
    }

    console.log(`✅ 物件ID: ${propertyData.id}`);
    console.log(`   ATBB状態: ${propertyData.atbb_status}`);

    // 3. 本番環境のAPIをテスト
    console.log('\n\n3️⃣ 本番環境 Complete API をテスト中...\n');
    
    const productionUrl = 'https://baikyaku-property-site3.vercel.app';
    const completeApiUrl = `${productionUrl}/api/public/properties/${propertyData.id}/complete`;
    
    console.log(`   URL: ${completeApiUrl}\n`);

    try {
      const apiResponse = await axios.get(completeApiUrl);
      const apiData = apiResponse.data;

      console.log('✅ API レスポンス受信\n');

      console.log('📊 API - recommendedComments:');
      if (apiData.recommendedComments && Array.isArray(apiData.recommendedComments)) {
        console.log(`  ✅ ${apiData.recommendedComments.length}行`);
      } else {
        console.log('  ❌ なし');
      }

      console.log('\n📊 API - favoriteComment:');
      console.log(`  ${apiData.favoriteComment ? '✅ ' + apiData.favoriteComment : '❌ なし'}`);

      console.log('\n📊 API - athomeData:');
      if (apiData.athomeData && Array.isArray(apiData.athomeData)) {
        console.log(`  ✅ ${apiData.athomeData.length}件`);
        apiData.athomeData.forEach((item: string, index: number) => {
          if (item.includes('vrpanorama')) {
            console.log(`    ${index + 1}: [パノラマURL]`);
          }
        });
      } else {
        console.log('  ❌ なし');
      }

      console.log('\n📊 API - propertyAbout:');
      if (apiData.propertyAbout) {
        console.log(`  ✅ ${apiData.propertyAbout.substring(0, 100)}...`);
      } else {
        console.log('  ❌ なし');
      }

      // 4. 比較結果
      console.log('\n\n4️⃣ データベース vs API 比較:\n');
      
      const dbHasComments = dbData?.recommended_comments && dbData.recommended_comments.length > 0;
      const apiHasComments = apiData.recommendedComments && apiData.recommendedComments.length > 0;
      console.log(`   おすすめコメント: DB=${dbHasComments ? '✅' : '❌'} / API=${apiHasComments ? '✅' : '❌'}`);

      const dbHasFavorite = !!dbData?.favorite_comment;
      const apiHasFavorite = !!apiData.favoriteComment;
      console.log(`   お気に入り文言: DB=${dbHasFavorite ? '✅' : '❌'} / API=${apiHasFavorite ? '✅' : '❌'}`);

      const dbHasAthome = dbData?.athome_data && dbData.athome_data.length > 0;
      const apiHasAthome = apiData.athomeData && apiData.athomeData.length > 0;
      console.log(`   Athomeデータ: DB=${dbHasAthome ? '✅' : '❌'} / API=${apiHasAthome ? '✅' : '❌'}`);

      const dbHasAbout = !!dbData?.property_about;
      const apiHasAbout = !!apiData.propertyAbout;
      console.log(`   物件について: DB=${dbHasAbout ? '✅' : '❌'} / API=${apiHasAbout ? '✅' : '❌'}`);

      console.log('\n🌐 確認URL:');
      console.log(`   https://property-site-frontend-kappa.vercel.app/public/properties/${propertyNumber}`);

    } catch (apiError: any) {
      console.error('❌ API エラー:', apiError.message);
      if (apiError.response) {
        console.error('   ステータス:', apiError.response.status);
        console.error('   レスポンス:', apiError.response.data);
      }
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkAA9743CompleteData().catch(console.error);
