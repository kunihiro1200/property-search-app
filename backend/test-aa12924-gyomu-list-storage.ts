import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function testAA12924GyomuListStorage() {
  try {
    console.log('Testing AA12914 storage_url from 業務リスト（業務依頼）...\n');
    
    // 業務リスト（業務依頼）スプレッドシートに接続
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g',
      sheetName: '業務依頼',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });
    
    await gyomuListClient.authenticate();
    console.log('✅ Authenticated with Google Sheets\n');
    
    // すべての行を取得
    const rows = await gyomuListClient.readAll();
    console.log(`📊 Total rows in 業務依頼: ${rows.length}\n`);
    
    // 最初の10件の物件番号を表示
    console.log('First 10 property numbers in 業務依頼:');
    rows.slice(0, 10).forEach((row, index) => {
      console.log(`${index + 1}. ${row['物件番号']}`);
    });
    console.log('\n');
    
    // AA12914を検索
    const targetRow = rows.find(row => row['物件番号'] === 'AA12914');
    
    if (!targetRow) {
      console.log('❌ AA12914 not found in 業務依頼 sheet');
      return;
    }
    
    console.log(`✅ Found AA12914 in 業務依頼 sheet\n`);
    console.log('Row data:');
    console.log('- 物件番号:', targetRow['物件番号']);
    console.log('- 格納先URL:', targetRow['格納先URL']);
    console.log('- スプシURL:', targetRow['スプシURL']);
    
    // 格納先URLが存在するか確認
    if (targetRow['格納先URL']) {
      console.log('\n✅ 格納先URL found!');
      console.log('URL:', targetRow['格納先URL']);
    } else {
      console.log('\n❌ 格納先URL is empty or null');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testAA12924GyomuListStorage();
