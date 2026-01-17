/**
 * AA13226 スプレッドシートデータ確認
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

const SPREADSHEET_ID = '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g';
const SHEET_NAME = '業務依頼';

async function checkAA13226Spreadsheet() {
  console.log('=== AA13226 スプレッドシートデータ確認 ===\n');

  try {
    const sheetsClient = new GoogleSheetsClient(SPREADSHEET_ID, SHEET_NAME);
    
    // 認証
    await sheetsClient.authenticate();
    
    console.log('📊 スプレッドシートからAA13226を検索中...');
    const allRows = await sheetsClient.readAll();
    const aa13226Row = allRows.find(row => row['物件番号'] === 'AA13226');

    if (!aa13226Row) {
      console.log('❌ AA13226がスプレッドシートに見つかりません');
      return;
    }

    console.log('✅ AA13226が見つかりました\n');
    console.log('スプレッドシートのデータ:');
    console.log(`  物件番号: ${aa13226Row['物件番号']}`);
    console.log(`  物件所在: ${aa13226Row['物件所在']}`);
    console.log(`  売主: ${aa13226Row['売主']}`);
    console.log(`  格納先URL: ${aa13226Row['格納先URL'] || '(未設定)'}`);
    console.log(`  種別: ${aa13226Row['種別'] || '(未設定)'}`);

    // すべてのキーを表示（デバッグ用）
    console.log('\n利用可能なカラム:');
    Object.keys(aa13226Row).slice(0, 20).forEach(key => {
      console.log(`  - ${key}`);
    });

    if (!aa13226Row['格納先URL']) {
      console.log('\n❌ 格納先URLがスプレッドシートにも設定されていません');
      console.log('\n💡 解決策:');
      console.log('  1. スプレッドシートの「格納先URL」列（CO列）にGoogle DriveのフォルダURLを設定');
      console.log('  2. WorkTaskSyncServiceを実行してwork_tasksテーブルに同期');
      console.log('  3. property_listings.storage_locationにコピー');
    } else {
      console.log('\n✅ 格納先URLが設定されています');
      console.log(`  URL: ${aa13226Row['格納先URL']}`);
      console.log('\n次のステップ:');
      console.log('  1. WorkTaskSyncServiceを実行してwork_tasksテーブルに同期');
      console.log('  2. property_listings.storage_locationにコピー');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }

  console.log('\n' + '='.repeat(60));
  console.log('確認完了\n');
}

// 実行
checkAA13226Spreadsheet()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
