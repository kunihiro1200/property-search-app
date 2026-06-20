// AA13453のコメントデータを取得（戸建て）
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function getAA13453Comments() {
  console.log('🔍 Getting AA13453 comments (戸建て)...\n');
  
  const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
  
  const fs = await import('fs');
  const credentials = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  const spreadsheetId = '1pS8MTQSceRZGlaWtup8aYBL2xfFpqJjkbFYnolFXShc';
  const sheetName = 'athome';
  
  try {
    // お気に入り文言 (B142) - 戸建て
    const favoriteResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!B142`,
    });
    
    const favoriteComment = favoriteResponse.data.values?.[0]?.[0] || null;
    console.log('✅ お気に入り文言 (B142):');
    console.log(favoriteComment || '(empty)');
    console.log('---\n');
    
    // アピールポイント (B152:L166) - 戸建て
    const recommendedResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!B152:L166`,
    });
    
    const recommendedRows = recommendedResponse.data.values || [];
    console.log('✅ アピールポイント (B152:L166):');
    
    const recommendedComments: string[] = [];
    recommendedRows.forEach((row, index) => {
      const rowText = row.join(' ').trim();
      if (rowText) {
        recommendedComments.push(rowText);
        console.log(`  [${index + 1}] ${rowText}`);
      }
    });
    
    if (recommendedComments.length === 0) {
      console.log('  (empty)');
    }
    console.log('---\n');
    
    console.log('📊 Summary:');
    console.log('  Favorite comment:', favoriteComment ? 'YES' : 'NO');
    console.log('  Recommended comments:', recommendedComments.length, 'items');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

getAA13453Comments().catch(console.error);
