/**
 * 正確な範囲指定をテスト
 */

import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function testExactRange(): Promise<void> {
  try {
    const testSpreadsheetId = '1VKhzZnF2aOx6ZHcbMDv4nrmRMWMGpZSeJA_OmwofzTg';
    
    console.log('正確な範囲指定をテスト中...\n');
    console.log(`スプレッドシートID: ${testSpreadsheetId}\n`);
    
    const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
    
    const client = new GoogleSheetsClient({
      spreadsheetId: testSpreadsheetId,
      sheetName: 'athome ',
      serviceAccountKeyPath,
    });
    
    await client.authenticate();
    const sheets = (client as any).sheets;
    
    // まずシート名を確認
    const metaResponse = await sheets.spreadsheets.get({
      spreadsheetId: testSpreadsheetId,
    });
    
    console.log('利用可能なシート:');
    for (const sheet of metaResponse.data.sheets) {
      const title = sheet.properties.title;
      console.log(`  - "${title}" (長さ: ${title.length}文字)`);
      
      // 文字コードを表示
      if (title.toLowerCase().includes('athome')) {
        console.log(`    文字コード: ${Array.from(title).map(c => c.charCodeAt(0)).join(', ')}`);
      }
    }
    console.log('');
    
    // 異なる範囲指定方法をテスト
    const rangeFormats = [
      "'athome '!B53",
      "athome !B53",
      "'athome'!B53",
      "athome!B53",
      "'athome　'!B53", // 全角スペース
    ];
    
    console.log('='.repeat(80));
    console.log('範囲指定フォーマットのテスト (B53セル)');
    console.log('='.repeat(80));
    console.log('');
    
    for (const range of rangeFormats) {
      console.log(`テスト中: ${range}`);
      
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: testSpreadsheetId,
          range,
        });
        
        const values = response.data.values;
        console.log(`  ✅ 成功`);
        console.log(`  値: ${values && values[0] ? values[0][0] : 'なし'}`);
      } catch (error: any) {
        console.log(`  ❌ 失敗: ${error.message}`);
      }
      
      console.log('');
    }
    
  } catch (error: any) {
    console.error('エラーが発生しました:', error.message);
  }
}

testExactRange();
