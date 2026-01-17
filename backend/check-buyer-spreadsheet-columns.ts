/**
 * 買主スプレッドシートのカラム名を確認
 */
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { config } from 'dotenv';

config();

async function checkColumns() {
  console.log('=== 買主スプレッドシートのカラム名確認 ===\n');

  try {
    const sheetsConfig = {
      spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
      sheetName: '買主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    const allRows = await sheetsClient.readAll();
    
    if (allRows.length > 0) {
      console.log('最初の行のカラム名:');
      const firstRow = allRows[0];
      Object.keys(firstRow).forEach(key => {
        console.log(`  - "${key}": ${firstRow[key]}`);
      });
      
      // 6647を探す
      console.log('\n\n買主番号6647の行を探しています...');
      const row6647 = allRows.find((row: any) => {
        // すべてのキーをチェック
        for (const key of Object.keys(row)) {
          if (String(row[key]) === '6647') {
            return true;
          }
        }
        return false;
      });
      
      if (row6647) {
        console.log('\n✓ 買主6647が見つかりました:');
        Object.keys(row6647).forEach(key => {
          console.log(`  ${key}: ${row6647[key]}`);
        });
      } else {
        console.log('\n⚠️ 買主6647が見つかりません');
      }
      
      // 6648を探す
      console.log('\n\n買主番号6648の行を探しています...');
      const row6648 = allRows.find((row: any) => {
        for (const key of Object.keys(row)) {
          if (String(row[key]) === '6648') {
            return true;
          }
        }
        return false;
      });
      
      if (row6648) {
        console.log('\n✓ 買主6648が見つかりました:');
        Object.keys(row6648).forEach(key => {
          console.log(`  ${key}: ${row6648[key]}`);
        });
      } else {
        console.log('\n⚠️ 買主6648が見つかりません');
      }
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }

  console.log('\n✅ 確認完了');
  process.exit(0);
}

checkColumns().catch(console.error);
