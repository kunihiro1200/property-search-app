// AA9743の本番Complete APIをテスト（詳細ログ付き）
import dotenv from 'dotenv';

dotenv.config();

async function testProductionCompleteAPI() {
  console.log('=== AA9743 本番Complete APIテスト（詳細ログ付き） ===\n');
  
  const propertyId = 'd081edb5-363e-452a-805d-d7a59f621fbb';
  const apiUrl = `https://baikyaku-property-site3.vercel.app/api/public/properties/${propertyId}/complete`;
  
  console.log(`📡 APIリクエスト: ${apiUrl}\n`);
  
  try {
    const response = await fetch(apiUrl);
    
    console.log(`📊 ステータスコード: ${response.status}`);
    console.log(`📊 ステータステキスト: ${response.statusText}\n`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ APIエラー:', errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ APIレスポンス受信\n');
    console.log('📦 完全なレスポンス:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n📊 データ確認:');
    console.log(`  - property: ${data.property ? '✅' : '❌'}`);
    console.log(`  - favoriteComment: ${data.favoriteComment ? '✅' : '❌'}`);
    console.log(`  - recommendedComments: ${data.recommendedComments ? '✅' : '❌'}`);
    console.log(`  - athomeData: ${data.athomeData ? '✅' : '❌'}`);
    console.log(`  - propertyAbout: ${data.propertyAbout ? '✅' : '❌'}`);
    
    if (data.favoriteComment) {
      console.log(`\n💬 お気に入り文言: ${data.favoriteComment}`);
    }
    
    if (data.recommendedComments && Array.isArray(data.recommendedComments)) {
      console.log(`\n📝 おすすめコメント: ${data.recommendedComments.length}行`);
    }
    
    if (data.athomeData && Array.isArray(data.athomeData)) {
      console.log(`\n🏠 Athomeデータ: ${data.athomeData.length}件`);
      data.athomeData.forEach((item: string, index: number) => {
        const preview = item.length > 60 ? item.substring(0, 60) + '...' : item;
        console.log(`  ${index + 1}: ${preview}`);
      });
    }
    
    if (data.propertyAbout) {
      const preview = data.propertyAbout.length > 100 
        ? data.propertyAbout.substring(0, 100) + '...' 
        : data.propertyAbout;
      console.log(`\n📄 物件について: ${preview}`);
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

testProductionCompleteAPI();
