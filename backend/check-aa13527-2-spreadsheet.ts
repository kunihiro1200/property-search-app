import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const GYOMU_LIST_SPREADSHEET_ID = process.env.GYOMU_LIST_SPREADSHEET_ID || '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g'; // 業務リストスプレッドシートID

async function checkAA13527_2Spreadsheet() {
  console.log('🔍 Checking if AA13527-2 has individual property spreadsheet...\n');
  
  // Google Sheets APIクライアントを初期化
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  try {
    // 業務リストスプレッドシートから「業務依頼」シートを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GYOMU_LIST_SPREADSHEET_ID,
      range: '業務依頼!A:D', // A列=物件番号, D列=スプレッドシートURL
    });
    
    const rows = response.data.values || [];
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    // AA13527-2を検索
    const aa13527_2Row = dataRows.find(row => row[0] === 'AA13527-2');
    
    if (!aa13527_2Row) {
      console.log('❌ AA13527-2 NOT FOUND in 業務依頼 sheet');
      return;
    }
    
    console.log('✅ AA13527-2 FOUND in 業務依頼 sheet\n');
    console.log('📊 Row Data:');
    console.log('   物件番号:', aa13527_2Row[0]);
    console.log('   スプレッドシートURL:', aa13527_2Row[3] || '❌ NULL');
    
    if (aa13527_2Row[3]) {
      console.log('\n✅ Individual property spreadsheet EXISTS');
      console.log('   URL:', aa13527_2Row[3]);
      
      // スプレッドシートIDを抽出
      const match = aa13527_2Row[3].match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        const spreadsheetId = match[1];
        console.log('   Spreadsheet ID:', spreadsheetId);
        
        // athomeシートが存在するか確認
        try {
          const sheetInfo = await sheets.spreadsheets.get({
            spreadsheetId: spreadsheetId,
          });
          
          const athomeSheet = sheetInfo.data.sheets?.find(s => s.properties?.title === 'athome');
          if (athomeSheet) {
            console.log('\n✅ athome sheet EXISTS in individual property spreadsheet');
            console.log('   → Comment sync SHOULD work for AA13527-2');
          } else {
            console.log('\n❌ athome sheet NOT FOUND in individual property spreadsheet');
            console.log('   Available sheets:', sheetInfo.data.sheets?.map(s => s.properties?.title).join(', '));
          }
        } catch (error: any) {
          console.error('\n❌ Error accessing individual property spreadsheet:', error.message);
        }
      }
    } else {
      console.log('\n❌ Individual property spreadsheet DOES NOT EXIST');
      console.log('   → Comment sync CANNOT work for AA13527-2');
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkAA13527_2Spreadsheet().catch(console.error);
