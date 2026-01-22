/**
 * 複数の物件で買主配信フィルタリングをテストするスクリプト
 * 
 * 目的:
 * - AA5852以外の物件でも正しく動作することを確認
 * - ページネーション実装が全物件で機能することを確認
 */

import dotenv from 'dotenv';
import axios from 'axios';

// 環境変数を読み込む
dotenv.config();

const API_BASE_URL = 'http://localhost:3000';

async function testPropertyDistribution(propertyNumber: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`物件番号: ${propertyNumber}`);
  console.log('='.repeat(80));

  try {
    // 1. 物件情報を取得
    console.log('\n1. 物件情報を取得');
    console.log('-'.repeat(80));
    
    const propertyResponse = await axios.get(
      `${API_BASE_URL}/api/property-listings/${propertyNumber}`
    );
    
    const property = propertyResponse.data;
    console.log(`✓ 物件番号: ${property.property_number}`);
    console.log(`✓ 住所: ${property.address || '(未設定)'}`);
    console.log(`✓ 価格: ${property.price ? property.price.toLocaleString() + '円' : '(未設定)'}`);
    console.log(`✓ 物件種別: ${property.property_type || '(未設定)'}`);
    console.log(`✓ 配信エリア: ${property.distribution_areas || '(未設定)'}`);

    // 2. 買主配信フィルタリングを実行
    console.log('\n2. 買主配信フィルタリングを実行');
    console.log('-'.repeat(80));
    
    const filterResponse = await axios.post(
      `${API_BASE_URL}/api/buyers/filter`,
      {
        propertyNumber,
        includeRadiusFilter: false
      }
    );
    
    const result = filterResponse.data;
    console.log(`✓ 配信対象買主数: ${result.count}件`);
    console.log(`✓ 適用フィルター:`);
    console.log(`  - エリアフィルター: ${result.appliedFilters.areaFilter ? '有効' : '無効'}`);
    console.log(`  - 配信フィルター: ${result.appliedFilters.distributionFilter ? '有効' : '無効'}`);
    console.log(`  - 半径フィルター: ${result.appliedFilters.radiusFilter ? '有効' : '無効'}`);
    
    if (result.emails && result.emails.length > 0) {
      console.log(`\n✓ 配信先メールアドレス（最初の10件）:`);
      result.emails.slice(0, 10).forEach((email: string, index: number) => {
        console.log(`  ${index + 1}. ${email}`);
      });
      if (result.emails.length > 10) {
        console.log(`  ... 他 ${result.emails.length - 10}件`);
      }
      
      // oscar.yag74@gmail.comが含まれているか確認
      const hasOscar = result.emails.includes('oscar.yag74@gmail.com');
      if (hasOscar) {
        console.log(`\n✓ oscar.yag74@gmail.comが配信対象に含まれています`);
      }
    }

    return {
      propertyNumber,
      success: true,
      count: result.count
    };
  } catch (error: any) {
    console.error(`\n❌ エラー: ${error.message}`);
    if (error.response) {
      console.error(`   ステータス: ${error.response.status}`);
      console.error(`   詳細: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return {
      propertyNumber,
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('複数物件での買主配信フィルタリングテスト');
  console.log('='.repeat(80));
  console.log('\nテスト対象物件:');
  console.log('  - AA5852: 以前問題があった物件');
  console.log('  - AA4160: 別の物件');
  console.log('  - AA13129: さらに別の物件');
  console.log('  - AA12766: 別府市の物件');
  console.log();

  const testProperties = ['AA5852', 'AA4160', 'AA13129', 'AA12766'];
  const results = [];

  for (const propertyNumber of testProperties) {
    const result = await testPropertyDistribution(propertyNumber);
    results.push(result);
    
    // 次のテストまで少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // サマリーを表示
  console.log('\n' + '='.repeat(80));
  console.log('テスト結果サマリー');
  console.log('='.repeat(80));
  
  results.forEach(result => {
    if (result.success) {
      console.log(`✓ ${result.propertyNumber}: 成功 (配信対象: ${result.count}件)`);
    } else {
      console.log(`✗ ${result.propertyNumber}: 失敗 (${result.error})`);
    }
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`\n成功: ${successCount}/${results.length}件`);
  
  if (successCount === results.length) {
    console.log('\n✓ すべてのテストが成功しました！');
  } else {
    console.log('\n✗ 一部のテストが失敗しました');
  }
}

main().catch(error => {
  console.error('予期しないエラー:', error);
  process.exit(1);
});
