/**
 * AA4885をすべてのシートから検索するスクリプト
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';

async function searchInAllSheets() {
  console.log('🔍 AA4885をスプレッドシート内で検索中...\n');

  // サービスアカウント認証
  const keyPath = path.resolve(process.cwd(), './google-service-account.json');
  const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

  const auth = new JWT({
    email: keyFile.client_email,
    key: keyFile.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

  try {
    // 1. すべてのシート名を取得
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetNames = spreadsheet.data.sheets?.map(sheet => sheet.properties?.title) || [];
    console.log(`📊 検索対象シート: ${sheetNames.length}個`);
    sheetNames.forEach(name => console.log(`   - ${name}`));
    console.log('');

    // 2. 各シートでAA4885を検索
    for (const sheetName of sheetNames) {
      if (!sheetName) continue;

      console.log(`🔍 "${sheetName}" を検索中...`);

      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A:Z`,
        });

        const rows = response.data.values || [];
        
        if (rows.length === 0) {
          console.log(`   ⚠️  データなし\n`);
          continue;
        }

        // ヘッダー行を取得
        const headers = rows[0];
        const propertyNumberIndex = headers.findIndex((h: any) => 
          String(h).includes('物件番号') || String(h).includes('番号')
        );

        if (propertyNumberIndex === -1) {
          console.log(`   ⚠️  物件番号列が見つかりません\n`);
          continue;
        }

        // AA4885を検索
        let found = false;
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const propertyNumber = String(row[propertyNumberIndex] || '').trim();
          
          if (propertyNumber === 'AA4885') {
            found = true;
            console.log(`   ✅ 発見！ 行番号: ${i + 1}`);
            console.log(`   データ:`);
            
            // 主要な列を表示
            headers.forEach((header: any, index: number) => {
              const value = row[index];
              if (value) {
                console.log(`      ${header}: ${value}`);
              }
            });
            console.log('');
            break;
          }
        }

        if (!found) {
          console.log(`   ❌ 見つかりませんでした\n`);
        }

      } catch (error: any) {
        console.log(`   ⚠️  エラー: ${error.message}\n`);
      }
    }

    console.log('✅ 検索完了');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

// 実行
searchInAllSheets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('検索失敗:', error);
    process.exit(1);
  });
