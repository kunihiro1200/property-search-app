import { BeppuAreaMappingService } from './src/services/BeppuAreaMappingService';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function testRegionExtraction() {
  console.log('=== 別府市地域名抽出テスト ===\n');

  const service = new BeppuAreaMappingService();

  // テストケース
  const testCases = [
    { address: '大分県別府市石垣東7丁目8-15', expected: '石垣東7丁目' },
    { address: '大分県別府市北浜2丁目', expected: '北浜2丁目' },
    { address: '大分県別府市東荘園4丁目', expected: '東荘園4丁目' },
    { address: '大分県別府市石垣西1丁目', expected: '石垣西1丁目' },
    { address: '大分県別府市朝見3丁目', expected: '朝見3丁目' },
    { address: '大分県別府市浜脇5丁目', expected: '浜脇5丁目' },
    { address: '大分県別府市荘園北町', expected: '荘園北町' },
    { address: '大分県別府市鶴見', expected: '鶴見' },
    { address: '大分県別府市観海寺', expected: '観海寺' },
    { address: '大分県別府市亀川中央町', expected: '亀川中央町' },
  ];

  for (const testCase of testCases) {
    console.log(`\n【テスト】 ${testCase.address}`);
    console.log(`期待値: ${testCase.expected}`);
    
    try {
      const areas = await service.getDistributionAreasForAddress(testCase.address);
      console.log(`結果: ${areas || '(見つかりません)'}`);
    } catch (error) {
      console.error(`エラー:`, error);
    }
  }

  console.log('\n=== テスト完了 ===');
}

testRegionExtraction().catch(console.error);
