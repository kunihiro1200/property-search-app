import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function checkCC105InSpreadsheet() {
  try {
    console.log('🔍 Checking CC105 in spreadsheet...\n');
    
    // Google Sheets APIの認証
    const serviceAccountPath = path.join(__dirname, 'google-service-account.json');
    const credentials = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    const spreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID!;
    const sheetName = process.env.GYOMU_LIST_SHEET_NAME || '業務依頼';
    
    console.log(`📋 Reading from spreadsheet: ${spreadsheetId}`);
    console.log(`📄 Sheet name: ${sheetName}\n`);
    
    // スプレッドシートからデータを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`, // A列からZ列まで取得
    });
    
    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      console.log('⚠️ No data found in spreadsheet');
      return;
    }
    
    // ヘッダー行を取得
    const headers = rows[0];
    console.log('📋 Headers:', headers);
    console.log('');
    
    // 物件番号の列インデックスを探す
    const propertyNumberIndex = headers.findIndex((h: string) => 
      h && (h.includes('物件番号') || h.includes('物件No') || h === 'No')
    );
    
    if (propertyNumberIndex === -1) {
      console.log('❌ Could not find property number column');
      return;
    }
    
    console.log(`✅ Property number column found at index: ${propertyNumberIndex} (${headers[propertyNumberIndex]})`);
    console.log('');
    
    // CC105を検索
    console.log('🔍 Searching for CC105...\n');
    
    let found = false;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const propertyNumber = row[propertyNumberIndex];
      
      if (propertyNumber === 'CC105') {
        found = true;
        console.log(`✅ Found CC105 at row ${i + 1}`);
        console.log('');
        console.log('📋 Row data:');
        
        // 各列のデータを表示
        headers.forEach((header: string, index: number) => {
          const value = row[index] || '';
          if (value) {
            console.log(`   ${header}: ${value}`);
          }
        });
        
        console.log('');
        
        // atbb_statusの値を確認
        const atbbStatusIndex = headers.findIndex((h: string) => 
          h && (h.includes('atbb') || h.includes('ATBB') || h.includes('ステータス'))
        );
        
        if (atbbStatusIndex !== -1) {
          const atbbStatus = row[atbbStatusIndex] || '';
          console.log('🔍 atbb_status analysis:');
          console.log(`   Column: ${headers[atbbStatusIndex]}`);
          console.log(`   Value: "${atbbStatus}"`);
          console.log('');
          
          // 公開中の定義に該当するか確認
          const isPublic = atbbStatus.includes('公開中') || 
                          atbbStatus.includes('公開前') || 
                          atbbStatus.includes('非公開（配信メールのみ）');
          
          if (isPublic) {
            console.log('✅ This property SHOULD be synced (matches public definition)');
            console.log('   - Contains: 公開中, 公開前, or 非公開（配信メールのみ）');
          } else {
            console.log('❌ This property should NOT be synced (does not match public definition)');
            console.log(`   - Current value: "${atbbStatus}"`);
            console.log('   - Expected: 公開中, 公開前, or 非公開（配信メールのみ）');
          }
        }
        
        break;
      }
    }
    
    if (!found) {
      console.log('❌ CC105 not found in spreadsheet');
      console.log('');
      console.log('📝 Checked rows: ' + (rows.length - 1));
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkCC105InSpreadsheet();
