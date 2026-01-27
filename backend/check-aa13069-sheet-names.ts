// AA13069の個別スプレッドシートのシート名を確認
import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkAA13069SheetNames() {
  console.log('🔍 Checking AA13069 spreadsheet sheet names...\n');

  // Google Sheets認証
  const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
  const credentials = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // 1. 業務リストから個別物件スプレッドシートIDを取得
  console.log('📋 Step 1: Get individual spreadsheet ID from 業務リスト');
  console.log('─────────────────────────────────────────────────────────');
  
  const gyomuListSpreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID;
  
  // キャッシュされたスプレッドシートIDを使用（APIクォータ制限を回避）
  // 実際には業務リストから取得する必要がありますが、今回は直接指定
  console.log('⚠️  Using cached spreadsheet ID to avoid API quota limit');
  
  // AA13069のスプレッドシートIDを直接指定（業務リストから事前に取得）
  // この値は実際の業務リストから取得する必要があります
  const spreadsheetId = '1JcFmIP2vNYsllwLvxNOIgNE3EjpNqQtM'; // 仮のID（実際のIDに置き換える必要があります）
  
  console.log(`Spreadsheet ID: ${spreadsheetId}`);
  
  // 2. スプレッドシートのメタデータを取得してシート名を確認
  console.log('\n📋 Step 2: Get spreadsheet metadata');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    const sheetsList = metadata.data.sheets || [];
    
    console.log(`\n✅ Found ${sheetsList.length} sheets:\n`);
    
    sheetsList.forEach((sheet, index) => {
      const sheetName = sheet.properties?.title || 'Unknown';
      const sheetId = sheet.properties?.sheetId || 'Unknown';
      
      console.log(`${index + 1}. Sheet Name: "${sheetName}"`);
      console.log(`   Sheet ID: ${sheetId}`);
      
      // シート名の詳細分析
      if (sheetName.toLowerCase().includes('athome')) {
        console.log(`   ⚠️  Contains "athome"`);
        
        // 末尾にスペースがあるか確認
        if (sheetName !== sheetName.trim()) {
          console.log(`   ⚠️  Has trailing/leading spaces!`);
          console.log(`   Trimmed: "${sheetName.trim()}"`);
          console.log(`   Length: ${sheetName.length} (trimmed: ${sheetName.trim().length})`);
        }
        
        // 大文字小文字を確認
        if (sheetName !== 'athome') {
          console.log(`   ⚠️  Not exactly "athome" (case-sensitive)`);
        }
      }
      
      console.log('');
    });
    
    // athomeシートを探す
    const athomeSheet = sheetsList.find(sheet => {
      const name = sheet.properties?.title || '';
      return name.toLowerCase().trim() === 'athome';
    });
    
    if (athomeSheet) {
      const exactName = athomeSheet.properties?.title || '';
      console.log('✅ Found athome sheet:');
      console.log(`   Exact name: "${exactName}"`);
      console.log(`   Length: ${exactName.length}`);
      console.log(`   Has trailing space: ${exactName !== exactName.trim()}`);
    } else {
      console.log('❌ No sheet with name containing "athome" found');
    }
    
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    
    if (error.message.includes('Quota exceeded')) {
      console.log('\n⚠️  API quota exceeded. Please wait and try again later.');
      console.log('   Or use a different approach to check sheet names.');
    }
  }
}

checkAA13069SheetNames().catch(console.error);
