/**
 * 日付シリアル値のテスト
 * 
 * スプレッドシートから日付がシリアル値として正しく取得されるか確認
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

async function testDateSerialValue() {
  console.log('=== 日付シリアル値テスト ===\n');
  
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: '売主リスト',
    serviceAccountKeyPath: './google-service-account.json',
  });
  
  await sheetsClient.authenticate();
  console.log('✅ Google Sheets認証成功\n');
  
  // 全データを取得
  const allRows = await sheetsClient.readAll();
  console.log(`📊 取得した行数: ${allRows.length}\n`);
  
  // AA13314を検索
  const aa13314 = allRows.find(row => row['売主番号'] === 'AA13314');
  
  if (aa13314) {
    console.log('=== AA13314のデータ ===');
    console.log('売主番号:', aa13314['売主番号']);
    console.log('次電日（生データ）:', aa13314['次電日']);
    console.log('次電日の型:', typeof aa13314['次電日']);
    
    // ColumnMapperでパース
    const columnMapper = new ColumnMapper();
    const mappedData = columnMapper.mapToDatabase(aa13314);
    
    console.log('\n=== マッピング後 ===');
    console.log('next_call_date:', mappedData.next_call_date);
    
    // シリアル値の場合、手動で計算して確認
    if (typeof aa13314['次電日'] === 'number') {
      const serialValue = aa13314['次電日'] as number;
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + serialValue * 24 * 60 * 60 * 1000);
      console.log('\n=== シリアル値からの計算 ===');
      console.log('シリアル値:', serialValue);
      console.log('計算結果:', date.toISOString().split('T')[0]);
    }
  } else {
    console.log('❌ AA13314が見つかりません');
  }
  
  // 他の売主の次電日も確認（サンプル）
  console.log('\n=== 他の売主の次電日サンプル ===');
  const sampleSellers = allRows.slice(0, 10).filter(row => row['次電日']);
  
  for (const seller of sampleSellers.slice(0, 5)) {
    console.log(`${seller['売主番号']}: 次電日=${seller['次電日']} (型: ${typeof seller['次電日']})`);
  }
}

testDateSerialValue().catch(console.error);
