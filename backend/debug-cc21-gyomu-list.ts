// CC21の業務リストデータを確認
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function debugCC21GyomuList() {
  try {
    console.log(`\n========================================`);
    console.log(`CC21の業務リストデータを確認`);
    console.log(`========================================\n`);
    
    const propertyNumber = 'CC21';
    
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
      sheetName: '物件',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
    });
    
    await gyomuListClient.authenticate();
    console.log(`✅ 認証成功`);
    
    // 物件番号で行を検索
    console.log(`\n🔍 物件番号「${propertyNumber}」で検索中...`);
    const rowIndex = await gyomuListClient.findRowByColumn('物件番号', propertyNumber);
    
    if (!rowIndex) {
      console.log(`❌ 物件番号「${propertyNumber}」が見つかりませんでした`);
      return;
    }
    
    console.log(`✅ 行番号: ${rowIndex}`);
    
    // 全列のデータを取得
    console.log(`\n📊 全列のデータを取得中...`);
    const allData = await gyomuListClient.readRange(`A${rowIndex}:ZZ${rowIndex}`);
    
    if (allData.length === 0) {
      console.log(`❌ データが取得できませんでした`);
      return;
    }
    
    const rowData = allData[0];
    console.log(`✅ データ取得成功`);
    console.log(`\n📋 全列のキー:`);
    console.log(Object.keys(rowData));
    
    // 「スプシURL」列を探す
    console.log(`\n🔍 「スプシURL」列を探しています...`);
    const possibleSpreadsheetUrlKeys = [
      'スプシURL',
      'spreadsheet_url',
      'スプレッドシートURL',
      'スプシ URL',
      'スプシurl',
      'SPREADSHEET_URL',
    ];
    
    let foundKey: string | null = null;
    let spreadsheetUrl: string | null = null;
    
    for (const key of possibleSpreadsheetUrlKeys) {
      if (rowData[key]) {
        foundKey = key;
        spreadsheetUrl = String(rowData[key]);
        console.log(`✅ 「${key}」列が見つかりました: ${spreadsheetUrl}`);
        break;
      }
    }
    
    if (!foundKey) {
      console.log(`❌ 「スプシURL」列が見つかりませんでした`);
      console.log(`\n📋 利用可能な列（最初の20列）:`);
      const keys = Object.keys(rowData).slice(0, 20);
      keys.forEach((key, index) => {
        console.log(`  ${index + 1}. ${key}: ${rowData[key]}`);
      });
    }
    
    // スプレッドシートIDを抽出
    if (spreadsheetUrl) {
      console.log(`\n🔍 スプレッドシートIDを抽出中...`);
      const spreadsheetIdMatch = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (spreadsheetIdMatch) {
        const spreadsheetId = spreadsheetIdMatch[1];
        console.log(`✅ スプレッドシートID: ${spreadsheetId}`);
      } else {
        console.log(`❌ スプレッドシートIDを抽出できませんでした`);
        console.log(`URL形式: ${spreadsheetUrl}`);
      }
    }
    
  } catch (error: any) {
    console.error(`\n❌ エラーが発生しました:`, error);
    console.error(`エラー詳細:`, {
      message: error.message,
      stack: error.stack,
    });
  }
}

debugCC21GyomuList()
  .then(() => {
    console.log('\n✅ スクリプト実行完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ スクリプト実行エラー:', error);
    process.exit(1);
  });
