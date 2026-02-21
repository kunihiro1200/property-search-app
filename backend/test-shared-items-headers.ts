/**
 * 共有スプレッドシートのヘッダー確認スクリプト
 */

import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testHeaders() {
  console.log('=== 共有スプレッドシートのヘッダー確認 ===\n');

  try {
    const client = new GoogleSheetsClient({
      spreadsheetId: '1BuvYd9cKOdgIAy0XhL-voVx1tiGA-cd6MCU_dYvbAQE',
      sheetName: '共有',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    });

    await client.authenticate();
    console.log('✅ 認証成功\n');

    const headers = await client.getHeaders();
    console.log(`📋 ヘッダー（${headers.length}列）:\n`);
    
    headers.forEach((header, index) => {
      const columnLetter = String.fromCharCode(65 + index); // A, B, C, ...
      console.log(`  ${columnLetter}列: ${header || '(空)'}`);
    });

    console.log('\n=== 完了 ===');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
  }
}

testHeaders();
