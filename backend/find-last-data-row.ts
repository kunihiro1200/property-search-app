import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function findLastDataRow() {
  console.log('=== 買主リストの最後のデータ行を検索 ===\n');

  try {
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    console.log('Google Sheets認証中...');
    await sheetsClient.authenticate();
    console.log('✅ 認証成功\n');

    // E列（買主番号）の全データを取得
    console.log('E列（買主番号）のデータを取得中...');
    const rows = await sheetsClient.readRange('E2:E');
    
    console.log(`✅ ${rows.length}行のデータを取得しました\n`);

    // 最後の非空行を探す
    let lastDataRowIndex = -1;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i]['買主番号']) {
        lastDataRowIndex = i;
        break;
      }
    }

    if (lastDataRowIndex === -1) {
      console.log('❌ データが見つかりません');
      return;
    }

    const actualRowNumber = lastDataRowIndex + 2; // +2 because: +1 for header, +1 for 0-indexed to 1-indexed
    console.log('最後のデータ行番号:', actualRowNumber);
    console.log('データ行数（ヘッダー除く）:', lastDataRowIndex + 1);

    // 最後のデータ行を取得
    console.log('\n最後のデータ行を取得中...');
    const lastRow = await sheetsClient.readRange(`E${actualRowNumber}:M${actualRowNumber}`);
    
    if (lastRow.length > 0) {
      console.log('\n✅ 最後のデータ行:');
      console.log('買主番号:', lastRow[0]['買主番号']);
      console.log('作成日時:', lastRow[0]['作成日時']);
      console.log('氏名:', lastRow[0]['●氏名・会社名']);
      console.log('問合せ元:', lastRow[0]['●問合せ元']);
      console.log('\n次の買主番号:', parseInt(String(lastRow[0]['買主番号'])) + 1);
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error('詳細:', error);
  }
}

findLastDataRow().catch(console.error);
