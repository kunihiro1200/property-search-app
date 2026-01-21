import dotenv from 'dotenv';

dotenv.config();

async function testEE2FrontendSearch() {
  console.log('🔍 フロントエンドの検索動作をテスト中...\n');

  try {
    const apiUrl = 'https://baikyaku-property-site3.vercel.app';

    // テスト1: 物件番号検索（EE2）
    console.log('📋 テスト1: 物件番号検索（EE2）');
    const ee2Url = `${apiUrl}/api/public/properties?propertyNumber=EE2&page=1&limit=12`;
    console.log('リクエスト:', ee2Url);

    const ee2Response = await fetch(ee2Url);
    const ee2Data = await ee2Response.json();
    
    console.log('結果:');
    console.log('- 物件数:', ee2Data.properties?.length || 0);
    console.log('- 総件数:', ee2Data.pagination?.total || 0);
    
    if (ee2Data.properties && ee2Data.properties.length > 0) {
      console.log('- 物件番号:', ee2Data.properties.map((p: any) => p.property_number).join(', '));
      
      if (ee2Data.properties.length === 1 && ee2Data.properties[0].property_number === 'EE2') {
        console.log('✅ 正しくEE2のみが返されています\n');
      } else {
        console.log('❌ EE2以外の物件が含まれています\n');
      }
    } else {
      console.log('❌ 物件が見つかりません\n');
    }

    // テスト2: 所在地検索（EE2が含まれる住所で検索）
    console.log('📋 テスト2: 所在地検索（EE2の住所で検索）');
    
    // まずEE2の住所を取得
    if (ee2Data.properties && ee2Data.properties.length > 0) {
      const ee2Address = ee2Data.properties[0].address;
      console.log('EE2の住所:', ee2Address);
      
      // 住所の一部で検索（例: 市区町村名）
      const addressPart = ee2Address.split('市')[0] + '市';
      const locationUrl = `${apiUrl}/api/public/properties?location=${encodeURIComponent(addressPart)}&page=1&limit=12`;
      console.log('リクエスト:', locationUrl);
      
      const locationResponse = await fetch(locationUrl);
      const locationData = await locationResponse.json();
      
      console.log('結果:');
      console.log('- 物件数:', locationData.properties?.length || 0);
      console.log('- 総件数:', locationData.pagination?.total || 0);
      
      if (locationData.properties && locationData.properties.length > 0) {
        const ee2Found = locationData.properties.some((p: any) => p.property_number === 'EE2');
        console.log('- EE2が含まれている:', ee2Found ? 'はい' : 'いいえ');
        
        if (ee2Found) {
          console.log('✅ 所在地検索でEE2が正しく表示されています\n');
        } else {
          console.log('⚠️ 所在地検索でEE2が表示されていません\n');
        }
      }
    }

    // テスト3: 検索なし（全物件取得）
    console.log('📋 テスト3: 検索なし（全物件取得）');
    const allUrl = `${apiUrl}/api/public/properties?page=1&limit=12`;
    console.log('リクエスト:', allUrl);
    
    const allResponse = await fetch(allUrl);
    const allData = await allResponse.json();
    
    console.log('結果:');
    console.log('- 物件数:', allData.properties?.length || 0);
    console.log('- 総件数:', allData.pagination?.total || 0);
    
    if (allData.properties && allData.properties.length > 0) {
      const ee2Found = allData.properties.some((p: any) => p.property_number === 'EE2');
      console.log('- EE2が含まれている:', ee2Found ? 'はい' : 'いいえ');
      
      if (ee2Found) {
        console.log('✅ 全物件リストにEE2が含まれています\n');
      } else {
        console.log('⚠️ 全物件リストにEE2が含まれていません（2ページ目以降の可能性）\n');
      }
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

testEE2FrontendSearch();
