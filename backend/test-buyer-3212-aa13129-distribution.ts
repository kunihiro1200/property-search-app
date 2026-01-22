import { EnhancedBuyerDistributionService } from './src/services/EnhancedBuyerDistributionService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testBuyer3212Distribution() {
  console.log('=== AA13129の配信対象買主テスト（買主3212を含むか確認） ===\n');

  const service = new EnhancedBuyerDistributionService();

  try {
    const result = await service.getQualifiedBuyersWithAllCriteria({
      propertyNumber: 'AA13129'
    });

    console.log('配信結果:');
    console.log(`  合格買主数: ${result.count}名`);
    console.log(`  総買主数: ${result.totalBuyers}名`);
    console.log('');

    // 買主3212が含まれているか確認
    const buyer3212 = result.filteredBuyers.find(b => b.buyer_number === '3212');
    
    if (buyer3212) {
      console.log('買主3212の詳細:');
      console.log(`  メールアドレス: ${buyer3212.email}`);
      console.log(`  フィルター結果:`);
      console.log(`    - 地理的マッチング: ${buyer3212.filterResults.geography ? '✓ 合格' : '✗ 不合格'}`);
      console.log(`    - 配信フラグ: ${buyer3212.filterResults.distribution ? '✓ 合格' : '✗ 不合格'}`);
      console.log(`    - ステータス: ${buyer3212.filterResults.status ? '✓ 合格' : '✗ 不合格'}`);
      console.log(`    - 価格帯: ${buyer3212.filterResults.priceRange ? '✓ 合格' : '✗ 不合格'}`);
      console.log('');

      const isQualified = result.emails.includes(buyer3212.email);
      console.log(`  総合判定: ${isQualified ? '✓ 配信対象' : '✗ 配信対象外'}`);
      
      if (!isQualified) {
        console.log('  不合格の理由:');
        if (!buyer3212.filterResults.geography) console.log('    - 地理的条件（エリアまたは問い合わせ履歴）が合わない');
        if (!buyer3212.filterResults.distribution) console.log('    - 配信フラグが「要」ではない');
        if (!buyer3212.filterResults.status) console.log('    - ステータスに「買付」または「D」が含まれる');
        if (!buyer3212.filterResults.priceRange) console.log('    - 価格帯が合わない');
      }
    } else {
      console.log('買主3212はデータベースに存在しません');
    }

    console.log('');
    console.log('=== 配信対象買主一覧 ===');
    if (result.count > 0) {
      result.filteredBuyers
        .filter(b => 
          b.filterResults.geography &&
          b.filterResults.distribution &&
          b.filterResults.status &&
          b.filterResults.priceRange
        )
        .forEach((buyer, index) => {
          console.log(`${index + 1}. 買主${buyer.buyer_number} (${buyer.email})`);
        });
    } else {
      console.log('配信対象の買主はいません');
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    if (error.code) {
      console.error('エラーコード:', error.code);
    }
  }
}

testBuyer3212Distribution().catch(console.error);
