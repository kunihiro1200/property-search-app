import { BeppuAreaMappingService } from './src/services/BeppuAreaMappingService';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

/**
 * エリア48(㊸)に含まれる住所のテスト
 */
async function testArea48Addresses() {
  console.log('=== Testing Area 48 (㊸) Addresses ===\n');

  const service = new BeppuAreaMappingService();

  // テスト対象の住所リスト
  const testAddresses = [
    '大分県別府市南立石二区1-1',
    '大分県別府市南立石八幡町1-1',
    '大分県別府市南荘園町1-1',
    '大分県別府市観海寺1-1',
    '大分県別府市鶴見園町1-1',
    '大分県別府市荘園1-1',
    '大分県別府市上野口町1-1',
    '大分県別府市天満町1-1',
    '大分県別府市駅前町1-1',
    '大分県別府市駅前本町1-1',
    '大分県別府市北浜1丁目1-1',
    '大分県別府市北浜2丁目1-1',
    '大分県別府市北浜3丁目1-1',
    '大分県別府市北的ヶ浜町1-1',
    '大分県別府市京町1-1',
    '大分県別府市幸町1-1',
    '大分県別府市新港町1-1',
    '大分県別府市野口中町1-1',
    '大分県別府市野口元町1-1',
    '大分県別府市富士見町1-1',
    '大分県別府市南的ヶ浜町1-1',
    '大分県別府市餅ヶ浜町1-1',
    '大分県別府市元町1-1',
    '大分県別府市弓ヶ浜町1-1',
    '大分県別府市若草町1-1',
    '大分県別府市亀川浜田町1-1',
    '大分県別府市古市町1-1',
    '大分県別府市関の江新町1-1',
    '大分県別府市内竈1-1',
    '大分県別府市平田町1-1',
    '大分県別府市照波園町1-1',
    '大分県別府市上平田町1-1',
    '大分県別府市大観山町1-1',
    '大分県別府市上人ケ浜町1-1',
    '大分県別府市上人仲町1-1',
    '大分県別府市上人西1-1',
    '大分県別府市新別府1-1',
    '大分県別府市北中1-1',
    '大分県別府市馬場1-1',
    '大分県別府市南須賀1-1',
    '大分県別府市上人南1-1',
    '大分県別府市桜ケ丘1-1',
    '大分県別府市中須賀元町1-1',
    '大分県別府市中須賀本町1-1',
    '大分県別府市中須賀東町1-1',
    '大分県別府市船小路町1-1',
    '大分県別府市汐見町1-1',
    '大分県別府市実相寺1-1',
    '大分県別府市光町1-1',
    '大分県別府市中島町1-1',
    '大分県別府市原町1-1',
    '大分県別府市乙原1-1',
    '大分県別府市田の湯町1-1',
    '大分県別府市上田の湯町1-1',
    '大分県別府市青山町1-1',
    '大分県別府市上原町1-1',
    '大分県別府市山の手町1-1',
    '大分県別府市西野口町1-1',
    '大分県別府市立田町1-1',
    '大分県別府市南町1-1',
    '大分県別府市松原町1-1',
    '大分県別府市浜町1-1',
    '大分県別府市千代町1-1',
    '大分県別府市末広町1-1',
    '大分県別府市秋葉町1-1',
    '大分県別府市楠町1-1',
    '大分県別府市浜脇1丁目1-1',
    '大分県別府市浜脇2丁目1-1',
    '大分県別府市浜脇3丁目1-1',
    '大分県別府市浦田1-1',
    '大分県別府市田の口1-1',
    '大分県別府市河内1-1',
    '大分県別府市山家1-1',
    '大分県別府市両郡橋1-1',
    '大分県別府市赤松1-1',
    '大分県別府市柳1-1',
    '大分県別府市鳥越1-1',
    '大分県別府市古賀原1-1',
    '大分県別府市内成1-1',
  ];

  let successCount = 0;
  let failCount = 0;
  const failedAddresses: string[] = [];

  for (const address of testAddresses) {
    const result = await service.getDistributionAreasForAddress(address);
    
    // エリア48(㊸)が含まれているかチェック
    if (result && result.includes('㊸')) {
      console.log(`✓ ${address}`);
      console.log(`  → ${result}\n`);
      successCount++;
    } else {
      console.log(`✗ ${address}`);
      console.log(`  → ${result || 'No mapping found'}\n`);
      failCount++;
      failedAddresses.push(address);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total tested: ${testAddresses.length}`);
  console.log(`Success (contains ㊸): ${successCount}`);
  console.log(`Failed: ${failCount}`);

  if (failedAddresses.length > 0) {
    console.log('\nFailed addresses:');
    failedAddresses.forEach(addr => console.log(`  - ${addr}`));
  }
}

testArea48Addresses().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
