import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function checkSpreadsheetLastBuyer() {
  console.log('=== 買主リストの最後の行を確認 ===\n');

  try {
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    console.log('Google Sheets認証中...');
    await sheetsClient.authenticate();
    console.log('✅ 認証成功\n');

    console.log('最後の行を取得中...');
    const lastRow = await sheetsClient.getLastRow();

    if (!lastRow) {
      console.log('❌ 最後の行が見つかりません');
      return;
    }

    console.log('✅ 最後の行を取得しました:\n');
    console.log('買主番号:', lastRow['買主番号']);
    console.log('作成日時:', lastRow['作成日時']);
    console.log('氏名:', lastRow['●氏名・会社名']);
    console.log('問合せ元:', lastRow['●問合せ元']);
    console.log('物件番号:', lastRow['物件番号']);
    console.log('\n次の買主番号:', parseInt(String(lastRow['買主番号'])) + 1);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error('詳細:', error);
  }
}

checkSpreadsheetLastBuyer().catch(console.error);
