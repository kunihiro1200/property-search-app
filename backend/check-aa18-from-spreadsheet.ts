// AA18のスプレッドシートデータを確認
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkAA18FromSpreadsheet() {
  console.log('=== AA18 のスプレッドシートデータを確認 ===\n');
  
  try {
    // 業務リスト（物件リスト）スプレッドシートに接続
    const client = new GoogleSheetsClient({
      spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID || '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g',
      sheetName: '物件リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });
    
    await client.authenticate();
    
    // すべての行を取得
    const rows = await client.readAll();
    
    // AA18を検索
    const aa18Row = rows.find((row: any) => row['物件番号'] === 'AA18');
    
    if (aa18Row) {
      console.log('AA18 のスプレッドシートデータ:');
      console.log('  - 物件番号:', aa18Row['物件番号']);
      console.log('  - 物件所在地:', aa18Row['物件所在地'] || '(空)');
      console.log('  - 配信日（公開）:', aa18Row['配信日（公開）'] || '(空)');
      console.log('  - atbb_status:', aa18Row['atbb_status'] || '(空)');
      console.log('  - 種別:', aa18Row['種別'] || '(空)');
      console.log('  - 価格:', aa18Row['価格'] || '(空)');
      console.log('  - 売出価格:', aa18Row['売出価格'] || '(空)');
      console.log('  - 掲載価格:', aa18Row['掲載価格'] || '(空)');
      
      // すべてのカラムを表示
      console.log('\n全カラム:');
      for (const [key, value] of Object.entries(aa18Row)) {
        if (value) {
          console.log(`  - ${key}: ${value}`);
        }
      }
    } else {
      console.log('AA18 はスプレッドシートに存在しません');
    }
    
  } catch (error: any) {
    console.error('エラー:', error.message);
  }
}

checkAA18FromSpreadsheet();
