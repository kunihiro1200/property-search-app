import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function checkLatestBuyerInquiry() {
  try {
    console.log('買主リストの最新データを確認中...\n');

    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();

    // 全データを取得
    const allRows = await sheetsClient.readAll();

    // 最新の5件を表示
    const latestRows = allRows.slice(-5);

    console.log('最新の5件:');
    console.log('='.repeat(80));
    
    latestRows.forEach((row, index) => {
      console.log(`\n${index + 1}. 買主番号: ${row['買主番号']}`);
      console.log(`   氏名: ${row['●氏名・会社名']}`);
      console.log(`   電話番号: ${row['●電話番号\n（ハイフン不要）']}`);
      console.log(`   メールアドレス: ${row['●メアド']}`);
      console.log(`   問合せ元: ${row['●問合せ元']}`);
      console.log(`   物件番号: ${row['物件番号']}`);
      console.log(`   問合時ヒアリング: ${row['●問合時ヒアリング']}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n総件数: ${allRows.length}件`);

  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

checkLatestBuyerInquiry();
