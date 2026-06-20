// AA13069のスプレッドシートデータを確認
import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkAA13069SpreadsheetData() {
  console.log('🔍 Checking AA13069 spreadsheet data...\n');

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
  const gyomuResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: gyomuListSpreadsheetId,
    range: '業務依頼!A:D',
  });

  const rows = gyomuResponse.data.values || [];
  let spreadsheetId: string | null = null;

  for (const row of rows) {
    if (row[0] === 'AA13069') {
      const spreadsheetUrl = row[3];
      const match = spreadsheetUrl?.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        spreadsheetId = match[1];
        console.log(`✅ Found spreadsheet ID: ${spreadsheetId}`);
        console.log(`   URL: ${spreadsheetUrl}`);
        break;
      }
    }
  }

  if (!spreadsheetId) {
    console.error('❌ Spreadsheet ID not found for AA13069');
    return;
  }

  // 2. athomeシートからデータを確認
  console.log('\n📋 Step 2: Check athome sheet data');
  console.log('─────────────────────────────────────────────────────────');

  // 物件種別: 戸建て
  const propertyType = 'detached_house';
  const cellMapping = {
    favoriteComment: 'B142',
    recommendedComments: 'B152:L166',
  };

  // お気に入り文言を確認
  console.log('\n1️⃣ Favorite Comment (B142):');
  try {
    const favoriteResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `athome!${cellMapping.favoriteComment}`,
    });
    const favoriteComment = favoriteResponse.data.values?.[0]?.[0];
    if (favoriteComment) {
      console.log(`✅ EXISTS: ${favoriteComment.substring(0, 100)}...`);
    } else {
      console.log('❌ EMPTY or NULL');
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }

  // アピールポイントを確認
  console.log('\n2️⃣ Recommended Comments (B152:L166):');
  try {
    const recommendedResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `athome!${cellMapping.recommendedComments}`,
    });
    const recommendedRows = recommendedResponse.data.values || [];
    
    if (recommendedRows.length === 0) {
      console.log('❌ EMPTY - No data in range');
    } else {
      console.log(`✅ Found ${recommendedRows.length} rows`);
      
      const nonEmptyRows = recommendedRows.filter(row => {
        const text = row.join(' ').trim();
        return text.length > 0;
      });
      
      console.log(`   Non-empty rows: ${nonEmptyRows.length}`);
      
      if (nonEmptyRows.length > 0) {
        console.log('\n   Content:');
        nonEmptyRows.forEach((row, index) => {
          const text = row.join(' ').trim();
          console.log(`   ${index + 1}. ${text}`);
        });
      } else {
        console.log('   ⚠️  All rows are empty');
      }
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }

  // 3. 物件スプレッドシートからproperty_aboutを確認
  console.log('\n📋 Step 3: Check property_about from property spreadsheet');
  console.log('─────────────────────────────────────────────────────────');

  const propertySpreadsheetId = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
  
  try {
    // 物件番号で検索
    const propertyResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: propertySpreadsheetId,
      range: '物件!A:BQ',
    });

    const propertyRows = propertyResponse.data.values || [];
    const headers = propertyRows[0];
    const propertyNumberIndex = headers.indexOf('物件番号');
    const propertyAboutIndex = headers.indexOf('●内覧前伝達事項');

    console.log(`   物件番号 column index: ${propertyNumberIndex}`);
    console.log(`   ●内覧前伝達事項 column index: ${propertyAboutIndex}`);

    let found = false;
    for (let i = 1; i < propertyRows.length; i++) {
      const row = propertyRows[i];
      if (row[propertyNumberIndex] === 'AA13069') {
        found = true;
        const propertyAbout = row[propertyAboutIndex];
        
        console.log(`\n✅ Found AA13069 at row ${i + 1}`);
        
        if (propertyAbout) {
          console.log(`✅ property_about EXISTS:`);
          console.log(`   ${propertyAbout}`);
        } else {
          console.log('❌ property_about is EMPTY or NULL');
        }
        break;
      }
    }

    if (!found) {
      console.log('❌ AA13069 not found in property spreadsheet');
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }

  // 4. 結論
  console.log('\n📊 Conclusion:');
  console.log('─────────────────────────────────────────────────────────');
  console.log('This will help identify why recommended_comments and property_about are missing.');
}

checkAA13069SpreadsheetData().catch(console.error);
