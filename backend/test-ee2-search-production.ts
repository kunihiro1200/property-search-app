import dotenv from 'dotenv';

dotenv.config();

async function testEE2SearchProduction() {
  console.log('🔍 本番環境でEE2検索をテスト中...\n');

  try {
    const apiUrl = 'https://baikyaku-property-site3.vercel.app';

    // 物件番号検索でEE2を取得（完全一致）
    const searchUrl = `${apiUrl}/api/public/properties?propertyNumber=EE2`;
    console.log('📡 リクエスト:', searchUrl);

    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      console.error('❌ APIエラー:', response.status, response.statusText);
      const text = await response.text();
      console.error('応答:', text);
      return;
    }

    const data = await response.json();
    console.log('\n✅ API応答:');
    console.log('- 物件数:', data.properties?.length || 0);
    console.log('- 総件数:', data.pagination?.total || 0);

    if (data.properties && data.properties.length > 0) {
      console.log('\n📋 返された物件:');
      data.properties.forEach((property: any, index: number) => {
        console.log(`${index + 1}. ${property.property_number}`);
        console.log(`   - atbb_status: ${property.atbb_status || '(null/空)'}`);
        console.log(`   - badge_type: ${property.badge_type}`);
        console.log(`   - price: ${property.price ? (property.price / 10000).toLocaleString() + '万円' : '価格応談'}`);
      });

      // EE2以外の物件が含まれているかチェック
      const nonEE2Properties = data.properties.filter((p: any) => p.property_number !== 'EE2');
      if (nonEE2Properties.length > 0) {
        console.log('\n⚠️ 警告: EE2以外の物件が含まれています！');
        console.log('EE2以外の物件:');
        nonEE2Properties.forEach((p: any) => {
          console.log(`- ${p.property_number}`);
        });
      } else {
        console.log('\n✅ 正しくEE2のみが返されています');
      }
    } else {
      console.error('❌ 物件が見つかりません');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

testEE2SearchProduction();
