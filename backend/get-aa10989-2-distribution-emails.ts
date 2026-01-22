/**
 * AA10989-2の配信メール宛先を取得するスクリプト
 */

import dotenv from 'dotenv';
import { EnhancedBuyerDistributionService } from './src/services/EnhancedBuyerDistributionService';

// 環境変数を読み込む
dotenv.config();

async function getDistributionEmails() {
  console.log('='.repeat(80));
  console.log('AA10989-2 配信メール宛先取得');
  console.log('='.repeat(80));
  console.log();

  const service = new EnhancedBuyerDistributionService();
  const propertyNumber = 'AA10989-2';

  try {
    console.log(`物件番号: ${propertyNumber}`);
    console.log('配信対象買主を取得中...');
    console.log();

    const result = await service.getQualifiedBuyersWithAllCriteria({
      propertyNumber
    });

    console.log('='.repeat(80));
    console.log('配信対象メールアドレス一覧');
    console.log('='.repeat(80));
    console.log();
    console.log(`配信対象数: ${result.count}件`);
    console.log();

    if (result.emails.length > 0) {
      console.log('メールアドレス:');
      console.log('-'.repeat(80));
      result.emails.forEach((email, index) => {
        console.log(`${index + 1}. ${email}`);
      });
    } else {
      console.log('配信対象のメールアドレスはありません。');
    }

    console.log();
    console.log('='.repeat(80));
    console.log('適用されたフィルター:');
    console.log(`  - 地理フィルター: ${result.appliedFilters.geographyFilter ? '有効' : '無効'}`);
    console.log(`  - 配信フィルター: ${result.appliedFilters.distributionFilter ? '有効' : '無効'}`);
    console.log(`  - ステータスフィルター: ${result.appliedFilters.statusFilter ? '有効' : '無効'}`);
    console.log(`  - 価格帯フィルター: ${result.appliedFilters.priceRangeFilter ? '有効' : '無効'}`);
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('エラーが発生しました:', error.message);
    if (error.code === 'PROPERTY_NOT_FOUND') {
      console.error(`物件番号 ${propertyNumber} が見つかりませんでした。`);
    }
  }
}

getDistributionEmails();
