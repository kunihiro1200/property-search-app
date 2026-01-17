/**
 * 買主配信サービスのページネーション実装を検証するテストスクリプト
 * 
 * 目的:
 * - BuyerDistributionServiceが全ての買主データを取得できることを確認
 * - 1000行を超える買主データでも正しくフィルタリングできることを確認
 * - 「配信希望」も有効な配信タイプとして認識されることを確認
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { BuyerDistributionService } from './src/services/BuyerDistributionService';

// 環境変数を読み込む
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testPaginationImplementation() {
  console.log('='.repeat(80));
  console.log('買主配信サービス - ページネーション実装検証');
  console.log('='.repeat(80));
  console.log();

  // 1. データベース内の買主総数を確認
  console.log('1. データベース内の買主総数を確認');
  console.log('-'.repeat(80));
  
  const { count: totalBuyerCount, error: countError } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true })
    .not('email', 'is', null)
    .neq('email', '');

  if (countError) {
    console.error('❌ エラー:', countError.message);
    return;
  }

  console.log(`✓ 総買主数: ${totalBuyerCount}件`);
  console.log();

  // 2. 配信タイプの分布を確認
  console.log('2. 配信タイプの分布を確認');
  console.log('-'.repeat(80));
  
  const { data: distributionTypes, error: distError } = await supabase
    .from('buyers')
    .select('distribution_type')
    .not('email', 'is', null)
    .neq('email', '');

  if (distError) {
    console.error('❌ エラー:', distError.message);
    return;
  }

  const typeCount: { [key: string]: number } = {};
  distributionTypes?.forEach(row => {
    const type = row.distribution_type?.trim() || '(空白)';
    typeCount[type] = (typeCount[type] || 0) + 1;
  });

  console.log('配信タイプ別の件数:');
  Object.entries(typeCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}件`);
    });
  console.log();

  // 3. テスト物件でフィルタリングを実行
  console.log('3. テスト物件でフィルタリングを実行');
  console.log('-'.repeat(80));
  
  const testProperties = ['AA5852', 'AA4160', 'AA13129'];
  const service = new BuyerDistributionService();

  for (const propertyNumber of testProperties) {
    console.log(`\n物件番号: ${propertyNumber}`);
    console.log('-'.repeat(40));
    
    try {
      const result = await service.getQualifiedBuyers({
        propertyNumber,
        includeRadiusFilter: false
      });

      console.log(`✓ 配信対象買主数: ${result.count}件`);
      console.log(`✓ 適用フィルター:`);
      console.log(`  - エリアフィルター: ${result.appliedFilters.areaFilter ? '有効' : '無効'}`);
      console.log(`  - 配信フィルター: ${result.appliedFilters.distributionFilter ? '有効' : '無効'}`);
      console.log(`  - 半径フィルター: ${result.appliedFilters.radiusFilter ? '有効' : '無効'}`);
      
      // 最初の5件のメールアドレスを表示
      if (result.emails.length > 0) {
        console.log(`✓ 配信先メールアドレス（最初の5件）:`);
        result.emails.slice(0, 5).forEach((email, index) => {
          console.log(`  ${index + 1}. ${email}`);
        });
        if (result.emails.length > 5) {
          console.log(`  ... 他 ${result.emails.length - 5}件`);
        }
      }
    } catch (error: any) {
      console.error(`❌ エラー: ${error.message}`);
    }
  }

  console.log();
  console.log('='.repeat(80));
  console.log('検証完了');
  console.log('='.repeat(80));
}

// 4. 特定の買主が正しく取得されるか確認
async function testSpecificBuyer() {
  console.log();
  console.log('4. 特定の買主（oscar.yag74@gmail.com）の取得確認');
  console.log('-'.repeat(80));

  const { data: oscarBuyers, error } = await supabase
    .from('buyers')
    .select('buyer_number, email, desired_area, distribution_type')
    .eq('email', 'oscar.yag74@gmail.com');

  if (error) {
    console.error('❌ エラー:', error.message);
    return;
  }

  if (!oscarBuyers || oscarBuyers.length === 0) {
    console.log('❌ oscar.yag74@gmail.comが見つかりませんでした');
    return;
  }

  console.log(`✓ oscar.yag74@gmail.comの買主レコード: ${oscarBuyers.length}件`);
  oscarBuyers.forEach((buyer, index) => {
    console.log(`\n  レコード ${index + 1}:`);
    console.log(`    買主番号: ${buyer.buyer_number}`);
    console.log(`    ★エリア: ${buyer.desired_area || '(未設定)'}`);
    console.log(`    配信タイプ: ${buyer.distribution_type || '(未設定)'}`);
    
    // フィルター条件を満たすかチェック
    const hasCircleOne = buyer.desired_area?.includes('①') || false;
    const isDistributionRequired = buyer.distribution_type?.trim() === '要' || 
                                   buyer.distribution_type?.trim() === '配信希望';
    
    console.log(`    ①を含む: ${hasCircleOne ? 'はい' : 'いいえ'}`);
    console.log(`    配信対象: ${isDistributionRequired ? 'はい' : 'いいえ'}`);
    console.log(`    フィルター通過: ${hasCircleOne && isDistributionRequired ? '✓ はい' : '✗ いいえ'}`);
  });

  console.log();
}

// メイン実行
async function main() {
  try {
    await testPaginationImplementation();
    await testSpecificBuyer();
  } catch (error) {
    console.error('予期しないエラー:', error);
    process.exit(1);
  }
}

main();
