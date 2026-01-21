import axios from 'axios';

async function testCC21CompleteAPI() {
  console.log('🔍 CC21の/completeエンドポイントをテスト...\n');

  try {
    const response = await axios.get('https://baikyaku-property-site3.vercel.app/api/public/properties/CC21/complete');
    const data = response.data;
    
    console.log('✅ APIレスポンス成功\n');
    console.log('📋 完全なレスポンス:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n🔍 キー確認:');
    console.log('   - favoriteComment:', data.favoriteComment ? '存在' : 'なし');
    console.log('   - recommendedComments:', data.recommendedComments ? '存在' : 'なし');
    console.log('   - propertyAbout:', data.propertyAbout ? '存在' : 'なし');
    console.log('   - panoramaUrl:', data.panoramaUrl ? '存在' : 'なし');
    
    if (data.recommendedComments) {
      console.log('\n📝 recommendedComments詳細:');
      console.log('   - 型:', typeof data.recommendedComments);
      console.log('   - 配列か:', Array.isArray(data.recommendedComments));
      console.log('   - 長さ:', data.recommendedComments.length);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testCC21CompleteAPI();
