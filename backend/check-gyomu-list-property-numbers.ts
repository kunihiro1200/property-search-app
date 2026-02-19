/**
 * 業務依頼シートの物件番号と格納先URLを確認
 */
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkGyomuListPropertyNumbers() {
  console.log('🔍 Checking property numbers in gyomu list...\n');

  const gyomuListConfig: any = {
    spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID!,
    sheetName: process.env.GYOMU_LIST_SHEET_NAME || '業務依頼',
  };
  
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
    gyomuListConfig.serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  }
  
  const client = new GoogleSheetsClient(gyomuListConfig);
  await client.authenticate();
  
  const rows = await client.readAll();
  
  console.log(`📊 Total rows: ${rows.length}\n`);
  
  // 最初の10件を表示
  console.log('📋 First 10 rows:');
  rows.slice(0, 10).forEach((row, index) => {
    const propertyNumber = row['物件番号'];
    const storageUrl = row['格納先URL'];
    console.log(`\n${index + 1}. 物件番号: ${propertyNumber || 'NULL'}`);
    console.log(`   格納先URL: ${storageUrl || 'NULL'}`);
  });
  
  // 格納先URLがある件数を確認
  const withStorageUrl = rows.filter(row => {
    const url = row['格納先URL'];
    return url && String(url).trim() !== '';
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`  Total rows: ${rows.length}`);
  console.log(`  With 格納先URL: ${withStorageUrl.length}`);
  console.log(`  Without 格納先URL: ${rows.length - withStorageUrl.length}`);
  
  // URL形式の格納先URLがある件数を確認
  const withValidUrl = withStorageUrl.filter(row => {
    const url = row['格納先URL'];
    return String(url).startsWith('https://drive.google.com/drive/folders/');
  });
  
  console.log(`  With valid URL format: ${withValidUrl.length}`);
  console.log(`  With invalid URL format: ${withStorageUrl.length - withValidUrl.length}`);
}

checkGyomuListPropertyNumbers().catch(console.error);
