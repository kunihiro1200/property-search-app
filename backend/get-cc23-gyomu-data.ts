// CC23の業務リストデータを取得
import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function getCC23GyomuData() {
  console.log('=== CC23の業務リストデータを取得 ===\n');
  
  const propertyNumber = 'CC23';
  
  try {
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID!,
      sheetName: '業務依頼',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });
    
    await gyomuListClient.authenticate();
    
    // ヘッダー行を取得
    const headers = await gyomuListClient.getHeaders();
    console.log('ヘッダー:', headers.slice(0, 10).join(', '), '...');
    
    // 物件番号のカラムインデックスを取得
    const propertyNumberIndex = headers.indexOf('物件番号');
    const spreadsheetUrlIndex = headers.indexOf('スプシURL');
    const storageUrlIndex = headers.indexOf('格納先URL');
    
    console.log('\nカラムインデックス:');
    console.log('  物件番号:', propertyNumberIndex);
    console.log('  スプシURL:', spreadsheetUrlIndex);
    console.log('  格納先URL:', storageUrlIndex);
    
    // 全データを取得
    const allData = await gyomuListClient.getAllData();
    
    // CC23の行を検索
    const cc23Row = allData.find(row => row[propertyNumberIndex] === propertyNumber);
    
    if (!cc23Row) {
      console.log('\n❌ CC23の行が見つかりませんでした');
      return;
    }
    
    console.log('\n✓ CC23の行が見つかりました');
    console.log('  物件番号:', cc23Row[propertyNumberIndex]);
    console.log('  スプシURL:', cc23Row[spreadsheetUrlIndex] || '（なし）');
    console.log('  格納先URL:', cc23Row[storageUrlIndex] || '（なし）');
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

getCC23GyomuData().catch(console.error);
