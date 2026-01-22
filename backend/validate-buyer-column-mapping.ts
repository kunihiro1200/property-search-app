// 買主カラムマッピング検証スクリプト
import { ColumnMappingValidator } from './src/services/ColumnMappingValidator';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('=== 買主カラムマッピング検証 ===\n');

  const validator = new ColumnMappingValidator();

  try {
    const result = await validator.validatePropertyNumberMapping();

    console.log('スプレッドシートカラム:', result.spreadsheetColumn);
    console.log('データベースカラム:', result.databaseColumn);
    console.log('検証結果:', result.isValid ? '✓ 正常' : '✗ 問題あり');
    console.log();

    if (result.issues.length > 0) {
      console.log('問題点:');
      result.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
      console.log();
    }

    if (result.sampleValues.length > 0) {
      console.log(`サンプルデータ（${result.sampleValues.length}件）:`);
      result.sampleValues.forEach((value, index) => {
        const isValid = validator.validatePropertyNumberFormat(value);
        const status = value ? (isValid ? '✓' : '✗') : '(空)';
        console.log(`  ${index + 1}. ${status} ${value || '(空値)'}`);
      });
      console.log();
    }

    // 統計情報
    const validCount = result.sampleValues.filter(v => 
      v && validator.validatePropertyNumberFormat(v)
    ).length;
    const emptyCount = result.sampleValues.filter(v => !v || v.trim() === '').length;
    const invalidCount = result.sampleValues.filter(v => 
      v && !validator.validatePropertyNumberFormat(v)
    ).length;

    console.log('統計:');
    console.log(`  有効な物件番号: ${validCount}件`);
    console.log(`  空値: ${emptyCount}件`);
    console.log(`  無効なフォーマット: ${invalidCount}件`);
    console.log();

    if (result.isValid) {
      console.log('✓ カラムマッピングは正常です');
    } else {
      console.log('✗ カラムマッピングに問題があります');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    process.exit(1);
  }
}

main();
