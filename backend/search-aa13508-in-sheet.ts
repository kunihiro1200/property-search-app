import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function searchAA13508() {
  try {
    console.log('🔍 スプレッドシートでAA13508を検索中...\n');

    // サービスアカウントキーを読み込み
    const serviceAccountPath = path.resolve(__dirname, 'google-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    // B列（売主番号）全体を取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '売主リスト!B:B',
    });

    const rows = response.data.values || [];
    console.log(`📊 B列の総行数: ${rows.length}\n`);

    // AA13508を検索
    let found = false;
    for (let i = 0; i < rows.length; i++) {
      const sellerNumber = rows[i][0];
      if (sellerNumber === 'AA13508') {
        console.log(`✅ AA13508が見つかりました！`);
        console.log(`   行番号: ${i + 1}行目（B列）\n`);
        found = true;

        // その行の全データを取得
        const rowResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `売主リスト!${i + 1}:${i + 1}`,
        });

        const rowData = rowResponse.data.values?.[0] || [];
        console.log(`📋 AA13508の行データ（全${rowData.length}列）:`);
        for (let j = 0; j < rowData.length; j++) {
          const columnLetter = String.fromCharCode(65 + j); // A, B, C, ...
          console.log(`   ${columnLetter}列: ${rowData[j] || '(空)'}`);
        }
        break;
      }
    }

    if (!found) {
      console.log('❌ AA13508は見つかりませんでした\n');
      
      // AA135で始まる売主番号を検索
      console.log('🔍 AA135で始まる売主番号を検索中...\n');
      const aa135Sellers: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        const sellerNumber = rows[i][0];
        if (sellerNumber && sellerNumber.startsWith('AA135')) {
          aa135Sellers.push(`${i + 1}行目: ${sellerNumber}`);
        }
      }

      if (aa135Sellers.length > 0) {
        console.log(`📋 AA135で始まる売主番号（${aa135Sellers.length}件）:`);
        aa135Sellers.forEach(seller => console.log(`   ${seller}`));
      } else {
        console.log('❌ AA135で始まる売主番号は見つかりませんでした');
      }
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

searchAA13508();
