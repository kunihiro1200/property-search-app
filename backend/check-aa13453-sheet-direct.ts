// AA13453のスプレッドシートデータを直接確認
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkAA13453InSheet() {
  console.log('🔍 Checking AA13453 in spreadsheet...\n');
  
  // Google Sheets APIクライアントを初期化
  const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
  
  console.log('📁 Service account key path:', serviceAccountKeyPath);
  
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
  
  // AA13453のシート名
  const sheetName = 'AA13453';
  
  try {
    // シートのヘッダー行を取得（1行目）
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`,
    });
    
    const headers = headerResponse.data.values?.[0] || [];
    console.log('📋 Sheet headers:');
    console.log(headers);
    console.log('---\n');
    
    // AA13453のデータを取得（2行目以降）
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:ZZ100`,
    });
    
    const data = dataResponse.data.values || [];
    
    if (data.length === 0) {
      console.log('❌ No data found in sheet');
      return;
    }
    
    console.log(`✅ Found ${data.length} rows in sheet\n`);
    
    // コメント関連の列を探す
    const commentColumns = [
      'お気に入り文言',
      'おすすめコメント',
      '内覧時伝達事項',
      'Athome公開フォルダ',
      'パノラマURL',
    ];
    
    console.log('🔍 Looking for comment-related columns...\n');
    
    commentColumns.forEach(columnName => {
      const columnIndex = headers.indexOf(columnName);
      if (columnIndex !== -1) {
        console.log(`✅ Found column: "${columnName}" at index ${columnIndex}`);
        
        // 最初の行のデータを表示
        if (data[0] && data[0][columnIndex]) {
          const value = data[0][columnIndex];
          // 長い値は省略して表示
          const displayValue = value.length > 100 ? value.substring(0, 100) + '...' : value;
          console.log(`   Value: ${displayValue}`);
        } else {
          console.log(`   Value: (empty)`);
        }
        console.log('---');
      } else {
        console.log(`❌ Column not found: "${columnName}"`);
      }
    });
    
    // 全てのヘッダーを表示（参考用）
    console.log('\n📋 All headers (first 50):');
    headers.slice(0, 50).forEach((header: string, index: number) => {
      console.log(`  [${index}] ${header}`);
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

checkAA13453InSheet().catch(console.error);
