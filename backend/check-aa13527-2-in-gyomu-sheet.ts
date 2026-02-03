import * as dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

const GYOMU_SPREADSHEET_ID = process.env.GYOMU_LIST_SPREADSHEET_ID;
const GYOMU_SHEET_NAME = '業務依頼';

async function checkAA13527_2InGyomuSheet() {
  console.log('🔍 業務依頼シートでAA13527-2を検索中...\n');

  if (!GYOMU_SPREADSHEET_ID) {
    console.error('❌ GYOMU_LIST_SPREADSHEET_ID not found in environment');
    return;
  }

  console.log('📋 業務依頼シートID:', GYOMU_SPREADSHEET_ID);
  console.log('');

  try {
    // Google Sheets API認証
    let credentials;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } else {
      const fs = require('fs');
      const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
      credentials = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf-8'));
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });

    // 業務依頼シートから全データを取得
    console.log('📥 業務依頼シートからデータを取得中...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GYOMU_SPREADSHEET_ID,
      range: `${GYOMU_SHEET_NAME}!A:E`,
    });

    const rows = response.data.values || [];

    if (!rows || rows.length === 0) {
      console.log('❌ 業務依頼シートにデータがありません');
      return;
    }

    console.log(`✅ ${rows.length}行のデータを取得しました\n`);

    // ヘッダー行を取得
    const headers = rows[0];
    console.log('📋 ヘッダー:', headers);
    console.log('');

    // AA13527-2を検索
    let found = false;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const propertyNumber = row[0]; // A列: 物件番号

      if (propertyNumber === 'AA13527-2') {
        found = true;
        console.log('✅ AA13527-2を発見しました！\n');
        console.log('   行番号:', i + 1);
        console.log('   A列 (物件番号):', row[0] || 'NULL');
        console.log('   B列:', row[1] || 'NULL');
        console.log('   C列:', row[2] || 'NULL');
        console.log('   D列 (スプレッドシートURL):', row[3] || 'NULL');
        console.log('   E列:', row[4] || 'NULL');
        console.log('');

        // スプレッドシートURLの有無を確認
        if (row[3]) {
          console.log('✅ スプレッドシートURLが存在します');
          console.log('   URL:', row[3]);
        } else {
          console.log('❌ スプレッドシートURLが空です');
        }
        break;
      }
    }

    if (!found) {
      console.log('❌ AA13527-2は業務依頼シートに存在しません');
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

checkAA13527_2InGyomuSheet().catch(console.error);
