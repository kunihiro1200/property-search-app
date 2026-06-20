// 公開物件の/completeエンドポイントのパフォーマンステスト
import axios from 'axios';

const API_URL = 'https://property-site-frontend-kappa.vercel.app';

async function testCompleteApi(propertyId: string) {
  console.log(`\n🔍 Testing /complete API for property: ${propertyId}`);
  console.log(`URL: ${API_URL}/api/public/properties/${propertyId}/complete`);
  
  const startTime = Date.now();
  
  try {
    const response = await axios.get(`${API_URL}/api/public/properties/${propertyId}/complete`, {
      timeout: 120000, // 120秒タイムアウト
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`\n✅ Success! Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log(`\n📊 Response data:`);
    console.log(`  - Has property: ${!!response.data.property}`);
    console.log(`  - Has favoriteComment: ${!!response.data.favoriteComment}`);
    console.log(`  - Has recommendedComments: ${!!response.data.recommendedComments}`);
    console.log(`  - recommendedComments length: ${response.data.recommendedComments?.length || 0}`);
    console.log(`  - Has propertyAbout: ${!!response.data.propertyAbout}`);
    console.log(`  - Has athomeData: ${!!response.data.athomeData}`);
    console.log(`  - Has panoramaUrl: ${!!response.data.panoramaUrl}`);
    console.log(`  - Has settlementDate: ${!!response.data.settlementDate}`);
    
    if (duration > 5000) {
      console.log(`\n⚠️ WARNING: Response time is slow (${(duration / 1000).toFixed(2)}s)`);
    }
    
    return { success: true, duration, data: response.data };
  } catch (error: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error(`\n❌ Error! Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.error(`Error message: ${error.message}`);
    
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timed out');
    }
    
    return { success: false, duration, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting /complete API performance test...\n');
  
  // テスト対象の物件ID（複数テスト可能）
  const testProperties = [
    'CC23',    // コメントが多い物件
    'AA9743',  // 別の物件
    'AA13423', // 追加テスト
    'AA12903', // 追加テスト
    'CC5',     // 追加テスト
    'AA10424', // 追加テスト
  ];
  
  const results = [];
  
  for (const propertyId of testProperties) {
    const result = await testCompleteApi(propertyId);
    results.push({ propertyId, ...result });
    
    // 次のテストまで1秒待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // サマリー表示
  console.log('\n\n📊 Test Summary:');
  console.log('='.repeat(60));
  
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    const duration = (result.duration / 1000).toFixed(2);
    console.log(`${status} ${result.propertyId}: ${duration}s`);
  }
  
  console.log('='.repeat(60));
  
  // 平均時間を計算
  const successResults = results.filter(r => r.success);
  if (successResults.length > 0) {
    const avgDuration = successResults.reduce((sum, r) => sum + r.duration, 0) / successResults.length;
    console.log(`\n📈 Average response time: ${(avgDuration / 1000).toFixed(2)}s`);
    
    if (avgDuration > 5000) {
      console.log(`\n⚠️ Performance issue detected! Average response time is ${(avgDuration / 1000).toFixed(2)}s`);
      console.log(`\n💡 Recommendations:`);
      console.log(`  1. Check Vercel logs for backend processing time`);
      console.log(`  2. Check database query performance`);
      console.log(`  3. Check if there are multiple API calls from frontend`);
      console.log(`  4. Consider adding caching`);
    }
  }
}

main().catch(console.error);
