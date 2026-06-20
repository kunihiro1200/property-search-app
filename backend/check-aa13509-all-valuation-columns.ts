/**
 * AA13509の全ての査定額カラムを確認するスクリプト
 * 列80-82（手動入力）を含む
 */

import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '.env.local') });

async function getGoogleSheetsClient() {
  const keyPath = path.join(__dirname, 'google-service-account.json');
  const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  return google.sheets({ version: 'v4', auth });
}

async function checkAA13509AllColumns() {
  console.log('🔍 AA13509の全ての査定額カラムを確認します...\n');

  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  
  // より広い範囲を取得（列A〜列CZ）
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '売主リスト!A:CZ',
  });
  
  const rows = response.data.values || [];
  const headers = rows[0];
  
  console.log(`📋 総カラム数: ${headers.length}`);
  
  // 売主番号のインデックスを取得（B列 = インデックス1）
  const sellerNumberIndex = headers.indexOf('売主番号');
  console.log(`📋 売主番号のインデックス: ${sellerNumberIndex}`);
  
  // 全ての査定額関連カラムを検索
  console.log('\n📋 査定額関連のカラム（全て）:');
  headers.forEach((header: string, index: number) => {
    if (header && (header.includes('査定額') || header.includes('査定'))) {
      console.log(`  列${index} (${String.fromCharCode(65 + (index % 26))}${index >= 26 ? Math.floor(index / 26) : ''}): "${header}"`);
    }
  });
  
  // 列78-85の範囲を確認（手動入力査定額が列80-82にあるはず）
  console.log('\n📋 列78-85のヘッダー:');
  for (let i = 78; i <= 85 && i < headers.length; i++) {
    console.log(`  列${i}: "${headers[i] || '(空)'}"`);
  }
  
  // AA13509の行を検索
  console.log('\n📋 AA13509のデータ:');
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const sellerNumber = row[sellerNumberIndex];
    if (sellerNumber === 'AA13509') {
      console.log(`  行番号: ${i + 1}`);
      
      // 全ての査定額関連カラムの値を表示
      headers.forEach((header: string, index: number) => {
        if (header && (header.includes('査定額') || header.includes('査定'))) {
          const value = row[index] || '(空)';
          console.log(`  列${index} "${header}": ${value}`);
        }
      });
      
      // 列78-85の値も表示
      console.log('\n  列78-85の値:');
      for (let j = 78; j <= 85 && j < headers.length; j++) {
        const value = row[j] || '(空)';
        console.log(`    列${j} "${headers[j] || '(ヘッダーなし)'}": ${value}`);
      }
      
      break;
    }
  }
  
  console.log('\n📊 期待値: 3680万円 / 3980万円 / 4280万円');
}

checkAA13509AllColumns().catch(console.error);
