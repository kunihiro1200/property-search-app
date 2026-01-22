/**
 * シート名の範囲指定テストスクリプト
 */

import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function testSheetRange(): Promise<void> {
  try {
    const testSpreadsheetId = '1PUTQXeuvnfj17XPTzHOWI_oDDvoErMCNA31L3dAlSCI';
    
    console.log('シート名の範囲指定をテスト中...\n');
    
    const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
    
    const client = new GoogleSheetsClient({
      spreadsheetId: testSpreadsheetId,
      sheetName: 'athome ',
      serviceAccountKeyPath,
    });
    
    await client.authenticate();
    const sheets = (client as any).sheets;
    
    // 異なる範囲指定方法をテスト
    const rangeFormats = [
      "'athome '!B150",
      "athome !B150",
      "'athome'!B150",
      "athome!B150",
    ];
    
    console.log('='.repeat(80));
    console.log('範囲指定フォーマットのテスト');
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

testSheetRange();
