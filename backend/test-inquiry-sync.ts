import dotenv from 'dotenv';
import path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

// .envファイルのパスを明示的に指定
dotenv.config({ path: path.join(__dirname, '.env') });

async function testInquirySync() {
  console.log('🔍 問合せ同期処理をテスト中...\n');

  try {
    console.log('📊 環境変数を確認:');
    console.log(`  GOOGLE_SHEETS_BUYER_SPREADSHEET_ID: ${process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID ? '設定済み' : '未設定'}`);
    console.log(`  GOOGLE_SHEETS_BUYER_SHEET_NAME: ${process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト'}`);
    console.log(`  GOOGLE_SERVICE_ACCOUNT_KEY_PATH: ${process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json'}`);
    console.log('');

    // GoogleSheetsClientを初期化
    console.log('🔑 GoogleSheetsClientを初期化中...');
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
      serviceAccountKeyPath: './google-service-account.json',
    });

    console.log('✅ GoogleSheetsClient初期化成功');
    console.log('');

    // 認証
    console.log('🔐 認証中...');
    await sheetsClient.authenticate();
    console.log('✅ 認証成功');
    console.log('');

    // 全行を取得
    console.log('📖 買主リストを読み込み中...');
    const allRows = await sheetsClient.readAll();
    console.log(`✅ ${allRows.length} 行を読み込みました`);
    console.log('');

    // 買主番号を採番
    console.log('🔢 買主番号を採番中...');
    const columnEValues = allRows
      .map(row => row['買主番号'])
      .filter(value => value !== null && value !== undefined)
      .map(value => String(value));

    const maxNumber = columnEValues.length > 0
      ? Math.max(...columnEValues.map(v => parseInt(v) || 0))
      : 0;
    const buyerNumber = maxNumber + 1;

    console.log(`✅ 次の買主番号: ${buyerNumber}`);
    console.log('');

    // テストデータを追加
    console.log('📝 テストデータを追加中...');
    const testData = {
      '買主番号': buyerNumber.toString(),
      '●氏名・会社名': 'テスト太郎（同期テスト）',
      '●問合時ヒアリング': 'これは同期テストです',
      '●電話番号\n（ハイフン不要）': '09012345678',
      '●メアド': 'test@example.com',
      '●問合せ元': 'いふう独自サイト',
      '物件番号': 'AA9743',
      '【問合メール】電話対応': '未',
    };

    await sheetsClient.appendRow(testData);
    console.log('✅ テストデータを追加しました');
    console.log('');

    console.log('🎉 同期処理は正常に動作しています！');
    console.log('');
    console.log('⚠️ 注意: テストデータを買主リストに追加しました。');
    console.log(`   買主番号: ${buyerNumber}`);
    console.log('   必要に応じて手動で削除してください。');
  } catch (error: any) {
    console.error('❌ エラーが発生しました:');
    console.error('');
    console.error(`エラーメッセージ: ${error.message}`);
    console.error('');
    if (error.stack) {
      console.error('スタックトレース:');
      console.error(error.stack);
    }
  }
}

testInquirySync();
