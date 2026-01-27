import dotenv from 'dotenv';
import path from 'path';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function listAllSheets() {
  console.log('=== 業務リストスプレッドシートの全シート名を確認 ===\n');

  try {
    const spreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID || '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g';
    
    console.log(`スプレッドシートID: ${spreadsheetId}\n`);
    
    // サービスアカウント認証
    const fs = require('fs');
    const keyPath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json');
    
    if (!fs.existsSync(keyPath)) {
      throw new Error(`Service account key file not found: ${keyPath}`);
    }

    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

    const auth = new JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });
    
    console.log('✅ Google Sheets認証成功\n');

    // スプレッドシートのメタデータを取得
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetList = response.data.sheets || [];
    
    console.log(`📊 全シート数: ${sheetList.length}\n`);
    console.log('シート一覧:');
    
    for (const sheet of sheetList) {
      const title = sheet.properties?.title || '(名前なし)';
      const sheetId = sheet.properties?.sheetId || 'N/A';
      const rowCount = sheet.properties?.gridProperties?.rowCount || 0;
      const columnCount = sheet.properties?.gridProperties?.columnCount || 0;
      
      console.log(`  - ${title} (ID: ${sheetId}, 行数: ${rowCount}, 列数: ${columnCount})`);
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.message.includes('Quota exceeded')) {
      console.error('\n⚠️  Google Sheets APIのクォータを超過しました。');
      console.error('   5-10分待ってから再度実行してください。');
    }
  }
}

listAllSheets()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
