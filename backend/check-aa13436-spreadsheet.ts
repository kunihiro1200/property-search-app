import { GoogleSheetsClient } from './api/src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkAA13436Spreadsheet() {
  console.log('🔍 Checking AA13436 in property list spreadsheet...\n');
  
  const sheetsClient = new GoogleSheetsClient(
    process.env.GOOGLE_SHEETS_PROPERTY_LIST_SPREADSHEET_ID!,
    process.env.GOOGLE_SHEETS_PROPERTY_LIST_SHEET_NAME || '物件リスト'
  );
  
  // 認証
  await sheetsClient.authenticate();
  
  // 全データを取得
  const rows = await sheetsClient.readAll();
  
  // AA13436を検索
  const aa13436Row = rows.find(row => row['物件番号'] === 'AA13436');
  
  if (!aa13436Row) {
    console.error('❌ AA13436 not found in spreadsheet');
    return;
  }
  
  console.log('✅ Found AA13436 in spreadsheet:\n');
  console.log('物件番号:', aa13436Row['物件番号']);
  console.log('所在地:', aa13436Row['所在地']);
  console.log('GoogleMap:', aa13436Row['GoogleMap']);
  console.log('緯度:', aa13436Row['緯度']);
  console.log('経度:', aa13436Row['経度']);
  
  // GoogleMapURLの詳細
  const googleMapUrl = aa13436Row['GoogleMap'];
  if (googleMapUrl) {
    console.log('\n📍 GoogleMap URL details:');
    console.log('URL:', googleMapUrl);
    console.log('Type:', typeof googleMapUrl);
    console.log('Length:', googleMapUrl.length);
  } else {
    console.log('\n❌ GoogleMap URL is empty');
  }
}

checkAA13436Spreadsheet();
