// AA13453のスプレッドシートデータを確認
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkAA13453InSheet() {
  console.log('🔍 Checking AA13453 in spreadsheet...\n');
  
  const sheetsClient = new GoogleSheetsClient();
  
  // 業務リストのスプレッドシートID
  const spreadsheetId = process.env.GOOGLE_SHEETS_GYOMU_LIST_SPREADSHEET_ID!;
  
  // AA13453のシート名を取得（物件番号がシート名）
  const sheetName = 'AA13453';
  
  try {
    // シートのヘッダー行を取得（1行目）
    const headers = await sheetsClient.getSheetData(spreadsheetId, `${sheetName}!1:1`);
    console.log('📋 Sheet headers:');
    console.log(headers[0]);
    console.log('---\n');
    
    // AA13453のデータを取得（2行目以降）
    const data = await sheetsClient.getSheetData(spreadsheetId, `${sheetName}!A2:ZZ100`);
    
    if (!data || data.length === 0) {
      console.log('❌ No data found in sheet');
      return;
    }
    
    console.log(`✅ Found ${data.length} rows in sheet\n`);
    
    // ヘッダーとデータを組み合わせて表示
    const headerRow = headers[0];
    
    // コメント関連の列を探す
    const commentColumns = [
      'お気に入り文言',
      'おすすめコメント',
      '内覧時伝達事項',
      'Athome公開フォルダ',
      'パノラマURL',
    ];
    
    console.log('🔍 Looking for comment-related columns...\n');
    
    commentColumns.forEach(columnName => {
      const columnIndex = headerRow.indexOf(columnName);
      if (columnIndex !== -1) {
        console.log(`✅ Found column: "${columnName}" at index ${columnIndex}`);
        
        // 最初の行のデータを表示
        if (data[0] && data[0][columnIndex]) {
          console.log(`   Value: ${data[0][columnIndex]}`);
        } else {
          console.log(`   Value: (empty)`);
        }
        console.log('---');
      } else {
        console.log(`❌ Column not found: "${columnName}"`);
      }
    });
    
    // 全てのヘッダーを表示（参考用）
    console.log('\n📋 All headers:');
    headerRow.forEach((header: string, index: number) => {
      console.log(`  [${index}] ${header}`);
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkAA13453InSheet().catch(console.error);
