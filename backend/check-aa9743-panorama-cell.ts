import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config({ path: '.env' });

async function checkPanoramaCell() {
  console.log('🔍 AA9743のパノラマURLセル確認\n');

  const spreadsheetId = '1hSPAL72Y8AXAJvl3u6XkxxqUrjfpaXEv5PWBxo3p6ac';
  
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName: 'athome',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  try {
    await sheetsClient.authenticate();
    console.log('✅ 認証成功\n');

    // N1セルを取得
    const range = 'athome!N1';
    const values = await sheetsClient['sheets'].spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const cellValue = values.data.values?.[0]?.[0];
    
    console.log(`N1セルの値: ${cellValue || '(空)'}`);
    
    if (cellValue && cellValue.includes('http')) {
      console.log('✅ パノラマURLが設定されています');
    } else {
      console.log('❌ パノラマURLが設定されていません');
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkPanoramaCell().catch(console.error);
