/**
 * 大分市高崎のエリアマッピングテスト
 * 
 * 高崎が①エリアと㊵エリアに正しくマッピングされるかテスト
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込む
dotenv.config({ path: path.join(__dirname, '.env') });

import { PropertyDistributionAreaCalculator } from './src/services/PropertyDistributionAreaCalculator';

async function testOitaTakasakiArea() {
  console.log('=== 大分市高崎のエリアマッピングテスト ===\n');

  const calculator = new PropertyDistributionAreaCalculator();

  // テストケース1: 大分市高崎
  const testAddress1 = '大分市高崎1-1-1';
  console.log(`テストケース1: ${testAddress1}`);
  const result1 = await calculator.calculateDistributionAreas(null, '大分市', testAddress1);
  console.log(`結果オブジェクト:`, result1);
  const areas1 = result1.formatted;
  console.log(`結果: ${areas1}`);
  console.log(`期待値: ①,㊵`);
  console.log(`判定: ${areas1 === '①,㊵' ? '✅ 成功' : '❌ 失敗'}\n`);

  // テストケース2: 大分市高崎山
  const testAddress2 = '大分市高崎山1-1-1';
  console.log(`テストケース2: ${testAddress2}`);
  const result2 = await calculator.calculateDistributionAreas(null, '大分市', testAddress2);
  console.log(`結果オブジェクト:`, result2);
  const areas2 = result2.formatted;
  console.log(`結果: ${areas2}`);
  console.log(`期待値: ①,㊵`);
  console.log(`判定: ${areas2 === '①,㊵' ? '✅ 成功' : '❌ 失敗'}\n`);

  // テストケース3: 大分市大道町（既存の①エリア）
  const testAddress3 = '大分市大道町1-1-1';
  console.log(`テストケース3: ${testAddress3}`);
  const result3 = await calculator.calculateDistributionAreas(null, '大分市', testAddress3);
  console.log(`結果オブジェクト:`, result3);
  const areas3 = result3.formatted;
  console.log(`結果: ${areas3}`);
  console.log(`期待値: ①,㊵`);
  console.log(`判定: ${areas3 === '①,㊵' ? '✅ 成功' : '❌ 失敗'}\n`);

  console.log('=== テスト完了 ===');
}

testOitaTakasakiArea().catch(console.error);
