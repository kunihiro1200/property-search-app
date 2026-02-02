import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkCC100InGyomuList() {
  console.log('🔍 Checking if CC100 exists in Gyomu List...\n');
  
  // 認証情報を取得
  let credentials;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } else {
    const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
    credentials = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf-8'));
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  const gyomuListSpreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID;
  if (!gyomuListSpreadsheetId) {
    console.error('❌ GYOMU_LIST_SPREADSHEET_ID not found in environment');
    return;
  }
  
  console.log('📊 Spreadsheet ID:', gyomuListSpreadsheetId);
  console.log('📋 Sheet Name: 業務依頼\n');
  
  try {
    // 業務リストの「業務依頼」シートから物件番号で検索
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: gyomuListSpreadsheetId,
      range: '業務依頼!A:D', // A列（物件番号）からD列（スプシURL）まで
    });

    const rows = response.data.values || [];
    console.log(`✅ Found ${rows.length} rows in 業務依頼 sheet\n`);
    
    // CC100-CC105を検索
    const ccProperties = ['CC100', 'CC101', 'CC102', 'CC103', 'CC104', 'CC105'];
    
    console.log('🔍 Searching for CC properties...\n');
    
    for (const propertyNumber of ccProperties) {
      const found = rows.find(row => row[0] === propertyNumber);
      
      if (found) {
        const spreadsheetUrl = found[3]; // D列（スプシURL）
        console.log(`✅ ${propertyNumber}: Found`);
        console.log(`   スプシURL: ${spreadsheetUrl || '(empty)'}`);
      } else {
        console.log(`❌ ${propertyNumber}: Not found`);
      }
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkCC100InGyomuList().catch(console.error);
