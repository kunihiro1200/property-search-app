import dotenv from 'dotenv';

dotenv.config();

async function testEE2ApiResponse() {
  console.log('🔍 EE2のAPI応答をテスト中...\n');

  try {
    const apiUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    // 物件番号検索でEE2を取得
    const searchUrl = `${apiUrl}/api/public/properties?propertyNumber=EE2`;
    console.log('📡 リクエスト:', searchUrl);

    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      console.error('❌ APIエラー:', response.status, response.statusText);
      return;
    }

    const data = await response.json();
    console.log('\n✅ API応答:');
    console.log('- 物件数:', data.properties?.length || 0);

    if (data.properties && data.properties.length > 0) {
      const ee2 = data.properties[0];
      console.log('\n📋 EE2の詳細:');
      console.log('- property_number:', ee2.property_number);
      console.log('- atbb_status:', ee2.atbb_status || '(null/空)');
      console.log('- badge_type:', ee2.badge_type);
      console.log('- is_clickable:', ee2.is_clickable);
      console.log('- latitude:', ee2.latitude);
      console.log('- longitude:', ee2.longitude);
      console.log('- images:', ee2.images?.length || 0, '枚');

      console.log('\n📋 判定結果:');
      console.log('- badge_typeが"none":', ee2.badge_type === 'none' ? '✅' : '❌');
      console.log('- is_clickableがtrue:', ee2.is_clickable === true ? '✅' : '❌');
      console.log('- 座標あり:', (ee2.latitude && ee2.longitude) ? '✅' : '❌');
    } else {
      console.error('❌ EE2が見つかりません');
    }

    // 地図ビュー用のAPI（座標ありのみ）もテスト
    console.log('\n🗺️ 地図ビュー用API（withCoordinates=true）をテスト中...');
    const mapUrl = `${apiUrl}/api/public/properties?withCoordinates=true&skipImages=true&limit=100`;
    console.log('📡 リクエスト:', mapUrl);

    const mapResponse = await fetch(mapUrl);
    
    if (!mapResponse.ok) {
      console.error('❌ 地図APIエラー:', mapResponse.status, mapResponse.statusText);
      return;
    }

    const mapData = await mapResponse.json();
    console.log('\n✅ 地図API応答:');
    console.log('- 物件数:', mapData.properties?.length || 0);

    const ee2InMap = mapData.properties?.find((p: any) => p.property_number === 'EE2');
    if (ee2InMap) {
      console.log('- EE2が含まれる: ✅');
      console.log('- badge_type:', ee2InMap.badge_type);
    } else {
      console.log('- EE2が含まれる: ❌');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

testEE2ApiResponse();
