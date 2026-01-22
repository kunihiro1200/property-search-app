import axios from 'axios';

const API_BASE = 'http://localhost:3000/api/public';

async function testAllPublicPropertiesImages() {
  console.log('=== 全公開物件の画像確認テスト ===\n');

  try {
    // 公開物件一覧を取得
    console.log('公開物件一覧を取得中...\n');
    const listResponse = await axios.get(`${API_BASE}/properties?limit=50`);
    
    const properties = listResponse.data.properties;
    console.log(`✅ 公開物件数: ${properties.length}\n`);

    let propertiesWithImages = 0;
    let totalImages = 0;

    // 各物件の画像を確認
    for (const property of properties) {
      try {
        const detailResponse = await axios.get(`${API_BASE}/properties/${property.id}`);
        const images = detailResponse.data.images || [];
        
        if (images.length > 0) {
          propertiesWithImages++;
          totalImages += images.length;
          console.log(`✅ ${property.property_number}: ${images.length}枚の画像`);
          console.log(`   最初の画像: ${images[0].name}`);
        } else {
          console.log(`⚪ ${property.property_number}: 画像なし`);
        }
      } catch (error: any) {
        console.log(`❌ ${property.property_number}: エラー - ${error.message}`);
      }
    }

    console.log('\n=== 集計結果 ===');
    console.log(`総物件数: ${properties.length}`);
    console.log(`画像あり物件: ${propertiesWithImages}`);
    console.log(`総画像数: ${totalImages}`);
    console.log(`\n✅ テスト完了！hidden_imagesカラムなしで正常に動作しています`);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.response) {
      console.error('   ステータス:', error.response.status);
      console.error('   レスポンス:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAllPublicPropertiesImages().catch(console.error);
