import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function findLastBuyerNumber() {
  console.log('=== 買主リストの最後の買主番号を検索 ===\n');

  try {
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    console.log('Google Sheets認証中...');
    await sheetsClient.authenticate();
    console.log('✅ 認証成功\n');

    // 全データを取得（最後の100行のみ）
    console.log('最後の100行を取得中...');
    const allRows = await sheetsClient.readAll();
    
    console.log(`✅ ${allRows.length}行のデータを取得しました\n`);

    // 買主番号が数値の行を探す（最後から検索）
    let lastBuyerNumber = 0;
    for (let i = allRows.length - 1; i >= 0; i--) {
      const buyerNumber = allRows[i]['買主番号'];
      if (buyerNumber) {
        const num = parseInt(String(buyerNumber));
        if (!isNaN(num) && num > lastBuyerNumber) {
          lastBuyerNumber = num;
          console.log(`行${i + 2}: 買主番号 = ${buyerNumber}`);
          break;
        }
      }
    }

    if (lastBuyerNumber === 0) {
      console.log('❌ 買主番号が見つかりません');
      return;
    }

    console.log('\n✅ 最後の買主番号:', lastBuyerNumber);
    console.log('次の買主番号:', lastBuyerNumber + 1);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error('詳細:', error);
  }
}

findLastBuyerNumber().catch(console.error);
