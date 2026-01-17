// AA5852のAPIフィルタリング結果をテスト
import dotenv from 'dotenv';
import path from 'path';
import { EnhancedBuyerDistributionService } from './src/services/EnhancedBuyerDistributionService';

dotenv.config({ path: path.join(__dirname, '.env') });

async function testAA5852APIFiltering() {
  console.log('\n=== AA5852 APIフィルタリングテスト ===\n');

  const service = new EnhancedBuyerDistributionService();

  try {
    const result = await service.getQualifiedBuyersWithAllCriteria({
      propertyNumber: 'AA5852'
    });

    console.log('【フィルタリング結果】');
    console.log(`適格買い主数: ${result.filteredBuyers.length}件`);
    console.log(`メールアドレス数: ${result.emails.length}件`);
    console.log(`総買い主数: ${result.totalBuyers}件\n`);

    // oscar.yag74@gmail.comが含まれているか確認
    const oscarIncluded = result.emails.includes('oscar.yag74@gmail.com');
    console.log(`oscar.yag74@gmail.com が含まれている: ${oscarIncluded ? '✓ はい' : '✗ いいえ'}\n`);

    if (oscarIncluded) {
      // 詳細を表示
      const oscarBuyer = result.filteredBuyers.find(b => b.email === 'oscar.yag74@gmail.com');
      if (oscarBuyer) {
        console.log('【oscar.yag74@gmail.com の詳細】');
        console.log(`買い主番号: ${oscarBuyer.buyer_number}`);
        console.log(`配信タイプ: ${oscarBuyer.distribution_type}`);
        console.log(`ステータス: ${oscarBuyer.latest_status}`);
        console.log(`希望エリア: ${oscarBuyer.desired_area}`);
        console.log(`フィルター結果:`);
        console.log(`  - 地理的マッチ: ${oscarBuyer.filterResults.geography ? '✓' : '✗'}`);
        console.log(`  - 配信タイプ: ${oscarBuyer.filterResults.distribution ? '✓' : '✗'}`);
        console.log(`  - ステータス: ${oscarBuyer.filterResults.status ? '✓' : '✗'}`);
        console.log(`  - 価格範囲: ${oscarBuyer.filterResults.priceRange ? '✓' : '✗'}`);
      }
    } else {
      console.log('【問題】oscar.yag74@gmail.com がフィルタリング結果に含まれていません');
      console.log('\n適格買い主リスト（最初の10件）:');
      result.filteredBuyers.slice(0, 10).forEach((buyer, i) => {
        console.log(`${i + 1}. ${buyer.email} (買い主${buyer.buyer_number})`);
      });
    }

    // 適用されたフィルターを表示
    console.log('\n【適用されたフィルター】');
    console.log(`地理的フィルター: ${result.appliedFilters.geographyFilter ? '有効' : '無効'}`);
    console.log(`配信タイプフィルター: ${result.appliedFilters.distributionFilter ? '有効' : '無効'}`);
    console.log(`ステータスフィルター: ${result.appliedFilters.statusFilter ? '有効' : '無効'}`);
    console.log(`価格範囲フィルター: ${result.appliedFilters.priceRangeFilter ? '有効' : '無効'}`);

  } catch (error: any) {
    console.error('エラー:', error.message);
    throw error;
  }
}

testAA5852APIFiltering().catch(console.error);
