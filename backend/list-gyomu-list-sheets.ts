// 業務リストスプレッドシートのシート一覧を取得
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function listSheets() {
  console.log('🔍 Listing sheets in 業務リスト spreadsheet...\n');
  
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
  
  console.log('📊 Spreadsheet ID:', spreadsheetId);
  
  try {
    // スプレッドシートのメタデータを取得
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    const sheetList = response.data.sheets || [];
    
    console.log(`\n✅ Found ${sheetList.length} sheets:\n`);
    
    sheetList.forEach((sheet, index) => {
      const title = sheet.properties?.title || 'Untitled';
      const sheetId = sheet.properties?.sheetId || 'N/A';
      console.log(`  [${index + 1}] ${title} (ID: ${sheetId})`);
    });
    
    // AA13453を含むシート名を検索
    console.log('\n🔍 Searching for sheets containing "AA13453"...\n');
    const matchingSheets = sheetList.filter(sheet => 
      sheet.properties?.title?.includes('AA13453')
    );
    
    if (matchingSheets.length > 0) {
      console.log(`✅ Found ${matchingSheets.length} matching sheets:`);
      matchingSheets.forEach(sheet => {
        console.log(`  - ${sheet.properties?.title}`);
      });
    } else {
      console.log('❌ No sheets found containing "AA13453"');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

listSheets().catch(console.error);
