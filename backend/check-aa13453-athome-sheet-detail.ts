// AA13453のathomeシートを詳細確認
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function checkAA13453AthomeSheet() {
  console.log('🔍 Checking AA13453 athome sheet in detail...\n');
  
  // Google Sheets APIクライアントを初期化
  const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
  
  const fs = await import('fs');
  const credentials = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  // AA13453の個別スプレッドシートID
  const spreadsheetId = '1pS8MTQSceRZGlaWtup8aYBL2xfFpqJjkbFYnolFXShc';
  const sheetName = 'athome';
  
  console.log('📊 Spreadsheet ID:', spreadsheetId);
  console.log('📋 Sheet name:', sheetName);
  
  try {
    // 最初の10行を取得して構造を確認
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z10`,
    });
    
    const rows = response.data.values || [];
    
    console.log('\n📋 First 10 rows:\n');
    rows.forEach((row, rowIndex) => {
      console.log(`Row ${rowIndex + 1}:`);
      row.forEach((cell, cellIndex) => {
        if (cell && cell.trim()) {
          console.log(`  [${cellIndex}] ${cell}`);
        }
      });
      console.log('---');
    });
    
    // 「お気に入り文言」「おすすめコメント」「内覧時伝達事項」を含むセルを検索
    console.log('\n🔍 Searching for comment-related cells...\n');
    
    const searchTerms = [
      'お気に入り文言',
      'おすすめコメント',
      '内覧時伝達事項',
      'Athome公開フォルダ',
      'パノラマ',
    ];
    
    searchTerms.forEach(term => {
      console.log(`Searching for: "${term}"`);
      let found = false;
      
      rows.forEach((row, rowIndex) => {
        row.forEach((cell, cellIndex) => {
          if (cell && cell.includes(term)) {
            console.log(`  ✅ Found at Row ${rowIndex + 1}, Column ${cellIndex}: "${cell}"`);
            found = true;
          }
        });
      });
      
      if (!found) {
        console.log(`  ❌ Not found in first 10 rows`);
      }
      console.log('---');
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

checkAA13453AthomeSheet().catch(console.error);
