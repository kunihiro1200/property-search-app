// /api/public/properties/:id/completeエンドポイントのパフォーマンステスト
import dotenv from 'dotenv';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';

dotenv.config();

async function testCompleteApiPerformance() {
  console.log('=== Complete API Performance Test ===\n');
  
  const testProperties = [
    { number: 'CC5', name: 'CC5（遅い）' },
    { number: 'CC21', name: 'CC21（15秒）' },
  ];
  
  for (const prop of testProperties) {
    console.log(`\n--- Testing ${prop.name} ---`);
    
    const startTime = Date.now();
    
    try {
      const service = new PropertyDetailsService();
      const details = await service.getPropertyDetails(prop.number);
      
      const elapsed = Date.now() - startTime;
      
      console.log(`✅ Success in ${elapsed}ms (${(elapsed / 1000).toFixed(2)}s)`);
      console.log(`   - favorite_comment: ${details.favorite_comment ? '✓' : '✗'}`);
      console.log(`   - recommended_comments: ${details.recommended_comments ? `✓ (${details.recommended_comments.length} rows)` : '✗'}`);
      console.log(`   - athome_data: ${details.athome_data ? `✓ (${details.athome_data.length} items)` : '✗'}`);
      console.log(`   - property_about: ${details.property_about ? '✓' : '✗'}`);
      
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ Error after ${elapsed}ms:`, error.message);
    }
  }
  
  console.log('\n=== Test Complete ===');
}

testCompleteApiPerformance().catch(console.error);
