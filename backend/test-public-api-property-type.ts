// 公開APIの物件タイプフィルターをテスト
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api/public';

async function testPublicApiPropertyType() {
  console.log('=== 公開API 物件タイプフィルターのテスト ===\n');

  const propertyTypes = [
    { english: 'land', japanese: '土地' },
    { english: 'detached_house', japanese: '戸建' },
    { english: 'apartment', japanese: 'マンション' },
    { english: 'other', japanese: 'その他' },
  ];

  for (const type of propertyTypes) {
    console.log(`\n--- ${type.english} (${type.japanese}) ---`);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/properties`, {
        params: {
          propertyType: type.english,
          limit: 5
        }
      });

      const { properties, total, filters } = response.data;
      
      console.log(`✓ APIレスポンス成功`);
      console.log(`  見つかった件数: ${total}件`);
      console.log(`  適用されたフィルター: ${JSON.stringify(filters.propertyType)}`);
      
      if (properties && properties.length > 0) {
        console.log(`  最初の3件:`);
        properties.slice(0, 3).forEach((p: any) => {
          const priceStr = p.price ? `${(p.price / 10000).toLocaleString()}万円` : '価格未設定';
          console.log(`    - ${p.property_number}: ${p.property_type} (${priceStr})`);
        });
      } else {
        console.log(`  ⚠ 物件が見つかりませんでした`);
      }
    } catch (error: any) {
      console.error(`✗ エラー:`, error.response?.data || error.message);
    }
  }

  // フィルターなしでも確認
  console.log(`\n\n--- フィルターなし（全物件） ---`);
  try {
    const response = await axios.get(`${API_BASE_URL}/properties`, {
      params: { limit: 5 }
    });

    const { properties, total } = response.data;
    console.log(`✓ 全物件数: ${total}件`);
    
    if (properties && properties.length > 0) {
      console.log(`  物件タイプの内訳:`);
      const typeCounts: Record<string, number> = {};
      properties.forEach((p: any) => {
        typeCounts[p.property_type] = (typeCounts[p.property_type] || 0) + 1;
      });
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`    ${type}: ${count}件`);
      });
    }
  } catch (error: any) {
    console.error(`✗ エラー:`, error.response?.data || error.message);
  }
}

testPublicApiPropertyType();
