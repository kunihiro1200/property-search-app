import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
  console.log('=== スタッフ管理スプレッドシート確認 ===\n');

  const SPREADSHEET_ID = '19yAuVYQRm-_zhjYX7M7zjiGbnBibkG77Mpz93sN1xxs';
  const SHEET_NAME = 'スタッフ';

  const client = new GoogleSheetsClient({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_NAME,
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH
  });

  await client.authenticate();
  const rows = await client.readAll();

  console.log(`取得した行数: ${rows.length}\n`);
  console.log('全スタッフデータ:\n');

  rows.forEach((row, index) => {
    const initials = row['イニシャル'] as string;
    const lastName = row['名字'] as string; // C列は「名字」
    const chatWebhook = row['Chat webhook'] as string;

    console.log(`${index + 1}. イニシャル: "${initials || '(空)'}", 名字: "${lastName || '(空)'}", Webhook: ${chatWebhook ? 'あり' : 'なし'}`);
    
    // 国広を含むデータを強調表示
    if (lastName && lastName.includes('国広')) {
      console.log('   ⭐ 国広を含むデータ！');
      console.log(`   Webhook URL: ${chatWebhook || '(未設定)'}`);
    }
  });

  console.log('\n=== 確認完了 ===');
}

main().catch(console.error);
