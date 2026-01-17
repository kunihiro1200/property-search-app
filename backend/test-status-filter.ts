import { BuyerDistributionService } from './src/services/BuyerDistributionService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testStatusFilter() {
  console.log('=== ステータスフィルターテスト ===\n');

  const service = new BuyerDistributionService();

  // テスト対象の物件番号
  const testPropertyNumber = 'AA10989-2';

  console.log(`物件番号: ${testPropertyNumber}`);
  console.log('フィルター条件:');
  console.log('  - ★エリアに「①」を含む');
  console.log('  - 配信種別が「要」または「配信希望」');
  console.log('  - ★最新状況に「買」または「他決」を含まない\n');

  try {
    const result = await service.getQualifiedBuyers({
      propertyNumber: testPropertyNumber,
      includeRadiusFilter: false
    });

    console.log('=== フィルター結果 ===');
    console.log(`適用されたフィルター:`);
    console.log(`  - エリアフィルター: ${result.appliedFilters.areaFilter ? '✓' : '✗'}`);
    console.log(`  - 配信フィルター: ${result.appliedFilters.distributionFilter ? '✓' : '✗'}`);
    console.log(`  - ステータスフィルター: ${result.appliedFilters.statusFilter ? '✓' : '✗'}`);
    console.log(`  - 半径フィルター: ${result.appliedFilters.radiusFilter ? '✓' : '✗'}`);
    console.log(`\n配信対象メールアドレス数: ${result.count}件\n`);

    console.log('配信対象メールアドレス一覧:');
    result.emails.forEach((email, index) => {
      console.log(`${index + 1}. ${email}`);
    });

  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

testStatusFilter();
