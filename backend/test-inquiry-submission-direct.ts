import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config({ path: '.env' });

async function testInquirySubmission() {
  console.log('🧪 Testing inquiry submission to spreadsheet...\n');
  
  // 環境変数のデバッグ
  console.log('🔍 Environment variables check:');
  console.log('   GOOGLE_SERVICE_ACCOUNT_KEY_PATH:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || '(not set)');
  console.log('   GOOGLE_SERVICE_ACCOUNT_JSON:', process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? 'Set' : '(not set)');
  console.log('');
  
  try {
    // GoogleSheetsClient を初期化
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    });
    
    console.log('📊 Spreadsheet ID:', process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID);
    console.log('📄 Sheet Name:', process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト');
    console.log('');
    
    // 認証
    console.log('🔐 Authenticating...');
    await sheetsClient.authenticate();
    console.log('✅ Authentication successful\n');
    
    // 最後の行を取得
    console.log('📖 Getting last row...');
    const lastRow = await sheetsClient.getLastRow();
    
    if (lastRow) {
      console.log('✅ Last row found:');
      console.log('   Keys:', Object.keys(lastRow));
      console.log('   買主番号:', lastRow['買主番号']);
      console.log('');
      
      const lastBuyerNumber = lastRow['買主番号'];
      const nextBuyerNumber = lastBuyerNumber ? parseInt(String(lastBuyerNumber)) + 1 : 1;
      console.log('📊 Next buyer number:', nextBuyerNumber);
      console.log('');
      
      // テストデータを追加
      console.log('📝 Adding test inquiry...');
      
      const nowUtc = new Date();
      const jstDate = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000);
      const jstDateString = jstDate.toISOString().replace('T', ' ').substring(0, 19);
      const receptionDate = jstDate.toISOString().substring(0, 10).replace(/-/g, '/');
      
      const rowData = {
        '買主番号': nextBuyerNumber.toString(),
        '作成日時': jstDateString,
        '●氏名・会社名': 'テスト太郎',
        '●問合時ヒアリング': 'テスト送信です',
        '●電話番号\n（ハイフン不要）': '09012345678',
        '受付日': receptionDate,
        '●メアド': 'test@example.com',
        '●問合せ元': 'いふう独自サイト',
        '物件番号': 'TEST001',
        '【問合メール】電話対応': '未',
      };
      
      await sheetsClient.appendRow(rowData);
      console.log('✅ Test inquiry added successfully!');
      console.log('');
      console.log('📊 Added data:');
      console.log('   買主番号:', nextBuyerNumber);
      console.log('   氏名:', 'テスト太郎');
      console.log('   メール:', 'test@example.com');
      console.log('   電話:', '09012345678');
      console.log('');
      console.log('✅ Test completed successfully!');
      console.log('');
      console.log('📋 Please check the spreadsheet:');
      console.log(`   https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID}`);
      
    } else {
      console.log('❌ Last row is null');
      console.log('   This might indicate that the spreadsheet is empty or the range is incorrect.');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Stack trace:', error.stack);
  }
}

testInquirySubmission();
