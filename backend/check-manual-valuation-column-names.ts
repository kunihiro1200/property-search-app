import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function checkManualValuationColumnNames() {
  try {
    console.log('🔍 手動査定額のカラム名を確認中...\n');

    const serviceAccountPath = path.resolve(__dirname, 'google-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    // ヘッダー行（1行目）を取得
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '売主リスト!1:1',
    });

    const headers = headerResponse.data.values?.[0] || [];

    // 列80-82のカラム名を確認
    console.log('📋 手動査定額のカラム名:\n');
    console.log(`   列80（${String.fromCharCode(65 + 79)}列）: "${headers[79]}"`);
    console.log(`   列81（${String.fromCharCode(65 + 80)}列）: "${headers[80]}"`);
    console.log(`   列82（${String.fromCharCode(65 + 81)}列）: "${headers[81]}"`);

    console.log('\n📋 自動計算査定額のカラム名:\n');
    console.log(`   列55（${String.fromCharCode(65 + 54)}列）: "${headers[54]}"`);
    console.log(`   列56（${String.fromCharCode(65 + 55)}列）: "${headers[55]}"`);
    console.log(`   列57（${String.fromCharCode(65 + 56)}列）: "${headers[56]}"`);

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkManualValuationColumnNames();
