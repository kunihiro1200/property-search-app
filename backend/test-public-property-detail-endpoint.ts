// 公開物件詳細エンドポイントのテスト
import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function testPublicPropertyDetailEndpoint() {
  console.log('=== 公開物件詳細エンドポイントのテスト ===\n');

  try {
    // まず公開物件一覧を取得してIDを取得
    console.log('1. 公開物件一覧を取得...');
    const listResponse = await axios.get(`${API_BASE_URL}/api/public/properties`, {
      params: { limit: 1 }
    });

    if (!listResponse.data.properties || listResponse.data.properties.length === 0) {
      console.log('❌ テスト用の公開物件が見つかりません');
      console.log('   property_listingsテーブルにsite_display="サイト表示"の物件を追加してください');
      return;
    }

    const testPropertyId = listResponse.data.properties[0].id;
    console.log(`✅ テスト用物件ID: ${testPropertyId}\n`);

    // 2. 公開物件詳細を取得
    console.log('2. 公開物件詳細を取得...');
    const detailResponse = await axios.get(`${API_BASE_URL}/api/public/properties/${testPropertyId}`);
    
    console.log('✅ 詳細取得成功');
    console.log('   レスポンスデータ:');
    console.log(`   - ID: ${detailResponse.data.id}`);
    console.log(`   - 物件番号: ${detailResponse.data.property_number}`);
    console.log(`   - 種別: ${detailResponse.data.property_type}`);
    console.log(`   - 住所: ${detailResponse.data.address}`);
    console.log(`   - 価格: ${detailResponse.data.price}万円`);
    console.log(`   - 土地面積: ${detailResponse.data.land_area}㎡`);
    console.log(`   - 建物面積: ${detailResponse.data.building_area}㎡`);
    
    // キャッシュヘッダーの確認
    const cacheControl = detailResponse.headers['cache-control'];
    console.log(`   - Cache-Control: ${cacheControl}`);
    if (cacheControl && cacheControl.includes('max-age=600')) {
      console.log('   ✅ キャッシュヘッダーが正しく設定されています（10分）');
    } else {
      console.log('   ⚠️  キャッシュヘッダーが期待値と異なります');
    }

    // センシティブなフィールドが含まれていないことを確認
    console.log('\n3. データサニタイゼーションの確認...');
    const sensitiveFields = [
      'seller_name',
      'seller_phone',
      'seller_email',
      'sales_assignee',
      'internal_notes',
      'acquisition_price',
      'profit_margin'
    ];
    
    const foundSensitiveFields = sensitiveFields.filter(field => 
      detailResponse.data.hasOwnProperty(field)
    );
    
    if (foundSensitiveFields.length === 0) {
      console.log('✅ センシティブなフィールドは含まれていません');
    } else {
      console.log(`❌ センシティブなフィールドが含まれています: ${foundSensitiveFields.join(', ')}`);
    }

    // 4. 存在しない物件IDでテスト
    console.log('\n4. 存在しない物件IDでテスト...');
    try {
      await axios.get(`${API_BASE_URL}/api/public/properties/00000000-0000-0000-0000-000000000000`);
      console.log('❌ 404エラーが返されるべきです');
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        console.log('✅ 404エラーが正しく返されました');
      } else {
        console.log(`❌ 予期しないエラー: ${error.message}`);
      }
    }

    // 5. サイト表示でない物件でテスト（もしあれば）
    console.log('\n5. サイト表示でない物件のアクセステスト...');
    const allPropertiesResponse = await axios.get(`${API_BASE_URL}/api/property-listings`, {
      params: { limit: 100 }
    });
    
    const nonPublicProperty = allPropertiesResponse.data.data?.find(
      (p: any) => p.site_display !== 'サイト表示'
    );
    
    if (nonPublicProperty) {
      try {
        await axios.get(`${API_BASE_URL}/api/public/properties/${nonPublicProperty.id}`);
        console.log('❌ サイト表示でない物件が取得できてしまいました');
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          console.log('✅ サイト表示でない物件は404が返されました');
        } else {
          console.log(`❌ 予期しないエラー: ${error.message}`);
        }
      }
    } else {
      console.log('⚠️  サイト表示でない物件が見つかりませんでした（テストスキップ）');
    }

    console.log('\n=== テスト完了 ===');

  } catch (error: any) {
    console.error('❌ テスト中にエラーが発生しました:', error.message);
    if (error.response) {
      console.error('   ステータス:', error.response.status);
      console.error('   レスポンス:', error.response.data);
    }
  }
}

testPublicPropertyDetailEndpoint();
