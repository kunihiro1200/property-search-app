import { PropertyListingSyncService } from './api/src/services/PropertyListingSyncService';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkAA13436FromSync() {
  console.log('🔍 Checking AA13436 via PropertyListingSyncService...\n');
  
  const syncService = new PropertyListingSyncService();
  
  // 同期サービスを初期化
  await syncService.initialize();
  
  // スプレッドシートから全データを取得
  const rows = await syncService['propertyListSheetsClient'].readAll();
  
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
    
    // データベースのURLと比較
    console.log('\n🔄 Comparison with database:');
    console.log('Spreadsheet URL:', googleMapUrl);
    console.log('Database URL:   ', 'https://maps.app.goo.gl/XGhmyRareMYC9i189');
    console.log('Match:', googleMapUrl === 'https://maps.app.goo.gl/XGhmyRareMYC9i189');
  } else {
    console.log('\n❌ GoogleMap URL is empty');
  }
}

checkAA13436FromSync();
