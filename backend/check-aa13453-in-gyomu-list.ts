// 業務依頼シートからAA13453のデータを確認
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function checkAA13453InGyomuList() {
  console.log('🔍 Checking AA13453 in 業務依頼 sheet...\n');
  
  // Google Sheets APIクライアントを初期化
  const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
  
  const fs = await import('fs');
  const credentials = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  // 業務リストのスプレッドシートID
  const spreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID!;
  const sheetName = process.env.GYOMU_LIST_SHEET_NAME || '業務依頼';
  
  console.log('📊 Spreadsheet ID:', spreadsheetId);
  console.log('📋 Sheet name:', sheetName);
  
  try {
    // ヘッダー行を取得（1行目）
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`,
    });
    
    const headers = headerResponse.data.values?.[0] || [];
    console.log('\n📋 Headers (first 20):');
    headers.slice(0, 20).forEach((header: string, index: number) => {
      console.log(`  [${index}] ${header}`);
    });
    
    // 物件番号の列インデックスを探す
    const propertyNumberIndex = headers.indexOf('物件番号');
    if (propertyNumberIndex === -1) {
      console.error('\n❌ "物件番号" column not found');
      return;
    }
    
    console.log(`\n✅ "物件番号" column found at index ${propertyNumberIndex}`);
    
    // 全データを取得
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:ZZ10000`,
    });
    
    const data = dataResponse.data.values || [];
    console.log(`\n📊 Total rows: ${data.length}`);
    
    // AA13453の行を探す
    const aa13453Row = data.find(row => row[propertyNumberIndex] === 'AA13453');
    
    if (!aa13453Row) {
      console.log('\n❌ AA13453 not found in 業務依頼 sheet');
      return;
    }
    
    console.log('\n✅ Found AA13453 in 業務依頼 sheet\n');
    
    // コメント関連の列を探す
    const commentColumns = [
      'お気に入り文言',
      'おすすめコメント',
      '内覧時伝達事項',
      'Athome公開フォルダ',
      'パノラマURL',
      'スプシURL',
    ];
    
    console.log('🔍 Comment-related columns:\n');
    
    commentColumns.forEach(columnName => {
      const columnIndex = headers.indexOf(columnName);
      if (columnIndex !== -1) {
        const value = aa13453Row[columnIndex] || '(empty)';
        const displayValue = value.length > 100 ? value.substring(0, 100) + '...' : value;
        console.log(`✅ ${columnName} [${columnIndex}]:`);
        console.log(`   ${displayValue}`);
        console.log('---');
      } else {
        console.log(`❌ ${columnName}: not found`);
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

checkAA13453InGyomuList().catch(console.error);
