import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

async function testQuota() {
  console.log('🔍 Testing Google Sheets API quota...\n');
  
  try {
    const sheetsClient = new GoogleSheetsClient(
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      '物件リスト'
    );
    
    // 1行だけ読み取りを試みる
    const data = await sheetsClient.readRange('A1:B2');
    
    console.log('✅ Google Sheets API is accessible!');
    console.log('✅ Quota has been reset.');
    console.log('\n📊 Test data:', data);
    console.log('\n🚀 You can now run the full sync:');
    console.log('   npx ts-node backend/sync-all-property-comments.ts');
    
  } catch (error: any) {
    if (error.message && error.message.includes('Quota exceeded')) {
      console.log('❌ Quota still exceeded. Please wait longer.');
      console.log('⏱️  Recommended: Wait 1 hour or try tomorrow.');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testQuota().catch(console.error);
