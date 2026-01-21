import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { AthomeDataService } from './src/services/AthomeDataService';

dotenv.config();

async function getCC5PanoramaUrl() {
  console.log('=== Getting CC5 Panorama URL ===\n');
  
  const propertyNumber = 'CC5';
  
  try {
    // 1. 業務リストから個別物件スプレッドシートURLを取得
    console.log('📋 Fetching spreadsheet URL from 業務リスト...');
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID!,
      sheetName: '業務依頼',
      serviceAccountKeyPath: './google-service-account.json',
    });
    
    await gyomuListClient.authenticate();
    const gyomuData = await gyomuListClient.readAll();
    
    const cc5Row = gyomuData.find((row: any) => row['物件番号'] === propertyNumber);
    
    if (!cc5Row) {
      console.log('❌ CC5 not found in 業務リスト');
      return;
    }
    
    const spreadsheetUrl = cc5Row['スプシURL'];
    console.log('✅ Spreadsheet URL:', spreadsheetUrl);
    
    // 2. 個別物件スプレッドシートからパノラマURLを取得
    console.log('\n🌐 Fetching panorama URL from athome sheet...');
    const athomeDataService = new AthomeDataService();
    const athomeData = await athomeDataService.getAthomeData(propertyNumber, 'detached_house', spreadsheetUrl);
    
    console.log('\n=== Result ===');
    console.log('Panorama URL:', athomeData.panoramaUrl || 'なし');
    
    if (athomeData.panoramaUrl) {
      console.log('\n✅ Found panorama URL!');
      console.log('Copy this URL to insert-cc5-to-production.ts:');
      console.log(athomeData.panoramaUrl);
    } else {
      console.log('\n❌ No panorama URL found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

getCC5PanoramaUrl().catch(console.error);
