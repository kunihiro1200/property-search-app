// AA13453の個別スプレッドシートを確認
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function checkAA13453IndividualSheet() {
  console.log('🔍 Checking AA13453 individual spreadsheet...\n');
  
  // Google Sheets APIクライアントを初期化
  const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
  
  const fs = await import('fs');
  const credentials = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  // AA13453の個別スプレッドシートURL
  const spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1pS8MTQSceRZGlaWtup8aYBL2xfFpqJjkbFYnolFXShc/edit?usp=drivesdk';
  
  // URLからスプレッドシートIDを抽出
  const match = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    console.error('❌ Could not extract spreadsheet ID from URL');
    return;
  }
  
  const spreadsheetId = match[1];
  console.log('📊 Spreadsheet ID:', spreadsheetId);
  
  try {
    // スプレッドシートのシート一覧を取得
    const metadataResponse = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    const sheetList = metadataResponse.data.sheets || [];
    console.log(`\n✅ Found ${sheetList.length} sheets:\n`);
    
    sheetList.forEach((sheet, index) => {
      const title = sheet.properties?.title || 'Untitled';
      console.log(`  [${index + 1}] ${title}`);
    });
    
    // 最初のシートを確認（通常は「N1」または物件番号）
    const firstSheetName = 'athome'; // athomeシートを確認
    console.log(`\n🔍 Checking sheet: "${firstSheetName}"\n`);
    
    // ヘッダー行を取得
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${firstSheetName}!A1:Z1`,
    });
    
    const headers = headerResponse.data.values?.[0] || [];
    console.log('📋 Headers:');
    headers.forEach((header: string, index: number) => {
      console.log(`  [${index}] ${header}`);
    });
    
    // データを取得（2行目以降）
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${firstSheetName}!A2:Z100`,
    });
    
    const data = dataResponse.data.values || [];
    console.log(`\n📊 Total rows: ${data.length}`);
    
    // コメント関連の列を探す
    const commentColumns = [
      'お気に入り文言',
      'おすすめコメント',
      '内覧時伝達事項',
      'Athome公開フォルダ',
      'パノラマURL',
    ];
    
    console.log('\n🔍 Comment-related columns:\n');
    
    commentColumns.forEach(columnName => {
      const columnIndex = headers.indexOf(columnName);
      if (columnIndex !== -1) {
        console.log(`✅ ${columnName} [${columnIndex}]:`);
        
        // 最初の行のデータを表示
        if (data[0] && data[0][columnIndex]) {
          const value = data[0][columnIndex];
          const displayValue = value.length > 100 ? value.substring(0, 100) + '...' : value;
          console.log(`   ${displayValue}`);
        } else {
          console.log(`   (empty)`);
        }
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

checkAA13453IndividualSheet().catch(console.error);
