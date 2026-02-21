// スプレッドシートから直接対象物件数をカウント
import dotenv from 'dotenv';
import { google } from 'googleapis';
import path from 'path';

dotenv.config();

async function countFromSheet() {
  console.log('🔍 Counting target properties from spreadsheet...\n');
  
  try {
    // Google Sheets認証
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '../../google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // スプレッドシートからデータを取得
    const spreadsheetId = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
    const sheetName = '物件';
    
    console.log('📊 Fetching data from spreadsheet...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:AA`,
    });
    
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('❌ No data found');
      process.exit(1);
    }
    
    console.log(`✅ Found ${rows.length - 1} rows (excluding header)\n`);
    
    // ヘッダー行を取得
    const headers = rows[0];
    const propertyNumberIndex = headers.indexOf('物件番号');
    const atbbStatusIndex = headers.indexOf('atbb成約済み/非公開');
    
    console.log(`📋 Column indexes:`);
    console.log(`   物件番号: ${propertyNumberIndex}`);
    console.log(`   atbb成約済み/非公開: ${atbbStatusIndex}\n`);
    
    if (propertyNumberIndex === -1 || atbbStatusIndex === -1) {
      console.log('❌ Required columns not found');
      process.exit(1);
    }
    
    let totalCount = 0;
    let soldCount = 0;
    let nonSoldCount = 0;
    
    // データ行を処理（ヘッダーをスキップ）
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const propertyNumber = row[propertyNumberIndex];
      const atbbStatus = row[atbbStatusIndex] || '';
      
      if (!propertyNumber) {
        continue;
      }
      
      totalCount++;
      
      // 成約済み判定: 「非公開」を含む かつ 「配信メール」を含まない
      const isSold = atbbStatus.includes('非公開') && !atbbStatus.includes('配信メール');
      
      if (isSold) {
        soldCount++;
      } else {
        nonSoldCount++;
      }
    }
    
    console.log('📊 Results:');
    console.log(`   Total properties: ${totalCount}`);
    console.log(`   成約済み: ${soldCount}`);
    console.log(`   成約済み以外 (対象): ${nonSoldCount}`);
    
    console.log('\n✅ Count complete!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

countFromSheet();
