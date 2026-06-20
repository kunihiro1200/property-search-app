import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function checkSpreadsheetRowCount() {
  console.log('=== 買主リストの行数を確認 ===\n');

  try {
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    console.log('Google Sheets認証中...');
    await sheetsClient.authenticate();
    console.log('✅ 認証成功\n');

    console.log('スプレッドシートのメタデータを取得中...');
    const metadata = await sheetsClient.getSpreadsheetMetadata();

    const sheet = metadata.sheets?.find(
      s => s.properties?.title === (process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト')
    );

    if (!sheet || !sheet.properties?.gridProperties?.rowCount) {
      console.log('❌ シートが見つかりません');
      return;
    }

    const rowCount = sheet.properties.gridProperties.rowCount;
    console.log('✅ シート情報:');
    console.log('シート名:', sheet.properties.title);
    console.log('行数:', rowCount);
    console.log('列数:', sheet.properties.gridProperties.columnCount);
    console.log('\n最後の行番号:', rowCount);
    console.log('データ行数（ヘッダー除く）:', rowCount - 1);

    // 最後の数行を取得して確認
    console.log('\n最後の3行を取得中...');
    const lastRows = await sheetsClient.readRange(`A${rowCount - 2}:E${rowCount}`);
    
    console.log('\n最後の3行:');
    for (const row of lastRows) {
      console.log('買主番号:', row['買主番号'], '| 氏名:', row['●氏名・会社名']);
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error('詳細:', error);
  }
}

checkSpreadsheetRowCount().catch(console.error);
